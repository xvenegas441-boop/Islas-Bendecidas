import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { pool, supabase } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('forzarreclamargenshin')
  .setDescription('[MOD] Asigna forzosamente un personaje de Genshin Impact a un usuario.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers) // Solo para moderadores
  .addStringOption(option =>
    option.setName('personaje')
      .setDescription('Nombre del personaje a reclamar')
      .setRequired(true)
  )
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('El usuario al que se le asignará el personaje')
      .setRequired(true)
  );

export async function execute(interaction) {
  const characterName = interaction.options.getString('personaje');
  const targetUser = interaction.options.getUser('usuario');

  try {
    const res = await pool.query(
      'SELECT * FROM genshin_characters WHERE LOWER(name) = LOWER($1)',
      [characterName]
    );

    if (res.rowCount === 0) {
      return await interaction.reply({ content: `❌ El personaje **${characterName}** no existe.`, ephemeral: true });
    }

    const character = res.rows[0];

    if (character.claimed_by && character.claimed_by !== targetUser.id) {
        return await interaction.reply({ content: `❌ El personaje **${character.name}** ya está reclamado por <@${character.claimed_by}>.`, ephemeral: true });
    } else if (character.claimed_by === targetUser.id) {
        return await interaction.reply({ content: `❌ **${targetUser.username}** ya tiene reclamado a **${character.name}**.`, ephemeral: true });
    }

    await interaction.deferReply();

    await pool.query(
      'UPDATE genshin_characters SET claimed_by = $1, claimed_at = NOW() WHERE name = $2',
      [targetUser.id, character.name]
    );

    let nicknameWarning = '';
    try {
      const member = await interaction.guild.members.fetch(targetUser.id);
      await member.setNickname(`𓂃 ࣪˖${character.name}ꪆৎ`);
    } catch (err) {
      console.warn('No se pudo cambiar el nickname del usuario objetivo:', err.message);
      nicknameWarning = `\n⚠️ **Nota:** No pude cambiar el apodo de ${targetUser.username}. Revisa los permisos del bot.`;
    }

    let supabaseWarning = '';
    try {
        const member = await interaction.guild.members.fetch(targetUser.id);
        const { error } = await supabase
            .from('reclamos')
            .insert([
                {
                    user_id: targetUser.id,
                    nickname: member.nickname || targetUser.username,
                    comando: 'forzarreclamargenshin',
                    personaje: character.name
                }
            ]);

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('Error guardando en Supabase en /forzarreclamargenshin:', error);
        supabaseWarning = `\n⚠️ **Aviso:** La acción se completó, pero no se pudo guardar el registro en la base de datos de Supabase.`;
    }

    await interaction.editReply({ content: `✅ **${interaction.user.username}** ha asignado **${character.name}** (Genshin Impact) a **${targetUser.username}**.` + nicknameWarning + supabaseWarning });

  } catch (error) {
    console.error('Error en /forzarreclamargenshin:', error.message);
    const replyOptions = { content: '❌ Ocurrió un error al ejecutar el comando.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(() => {});
    } else {
      await interaction.reply(replyOptions).catch(() => {});
    }
  }
}