import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { pool, supabase } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('forzarreclamar')
  .setDescription('[MOD] Asigna forzosamente un campeón a un usuario.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers) // Solo para moderadores
  .addStringOption(option =>
    option.setName('campeon')
      .setDescription('Nombre del campeón a reclamar')
      .setRequired(true)
  )
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('El usuario al que se le asignará el campeón')
      .setRequired(true)
  );

export async function execute(interaction) {
  const championName = interaction.options.getString('campeon');
  const targetUser = interaction.options.getUser('usuario');

  try {
    const res = await pool.query(
      'SELECT * FROM champions WHERE LOWER(name) = LOWER($1)',
      [championName]
    );

    if (res.rowCount === 0) {
      return await interaction.reply({ content: `❌ El campeón **${championName}** no existe.`, ephemeral: true });
    }

    const champ = res.rows[0];

    if (champ.claimed_by && champ.claimed_by !== targetUser.id) {
        return await interaction.reply({ content: `❌ El campeón **${champ.name}** ya está reclamado por <@${champ.claimed_by}>.`, ephemeral: true });
    } else if (champ.claimed_by === targetUser.id) {
        return await interaction.reply({ content: `❌ **${targetUser.username}** ya tiene reclamado a **${champ.name}**.`, ephemeral: true });
    }

    await interaction.deferReply();

    await pool.query(
      'UPDATE champions SET claimed_by = $1, claimed_at = NOW() WHERE name = $2',
      [targetUser.id, champ.name]
    );

    let nicknameWarning = '';
    try {
      const member = await interaction.guild.members.fetch(targetUser.id);
      await member.setNickname(`𓂃 ࣪˖${champ.name}ꪆৎ`);
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
                    comando: 'forzarreclamar',
                    personaje: champ.name
                }
            ]);

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('Error guardando en Supabase en /forzarreclamar:', error);
        supabaseWarning = `\n⚠️ **Aviso:** La acción se completó, pero no se pudo guardar el registro en la base de datos de Supabase.`;
    }

    await interaction.editReply({ content: `✅ **${interaction.user.username}** ha asignado **${champ.name}** a **${targetUser.username}**.` + nicknameWarning + supabaseWarning });

  } catch (error) {
    console.error('Error en /forzarreclamar:', error.message);
    const replyOptions = { content: '❌ Ocurrió un error al ejecutar el comando.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(() => {});
    } else {
      await interaction.reply(replyOptions).catch(() => {});
    }
  }
}
