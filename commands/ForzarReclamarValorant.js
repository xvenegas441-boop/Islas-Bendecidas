import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { pool, supabase } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('forzarreclamarvalorant')
  .setDescription('[MOD] Asigna forzosamente un agente de Valorant a un usuario.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers) // Solo para moderadores
  .addStringOption(option =>
    option.setName('agente')
      .setDescription('Nombre del agente a reclamar')
      .setRequired(true)
  )
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('El usuario al que se le asignará el agente')
      .setRequired(true)
  );

export async function execute(interaction) {
  const agentName = interaction.options.getString('agente');
  const targetUser = interaction.options.getUser('usuario');

  try {
    const res = await pool.query(
      'SELECT * FROM valorant_agents WHERE LOWER(name) = LOWER($1)',
      [agentName]
    );

    if (res.rowCount === 0) {
      return await interaction.reply({ content: `❌ El agente **${agentName}** no existe.`, ephemeral: true });
    }

    const agent = res.rows[0];

    if (agent.claimed_by && agent.claimed_by !== targetUser.id) {
        return await interaction.reply({ content: `❌ El agente **${agent.name}** ya está reclamado por <@${agent.claimed_by}>.`, ephemeral: true });
    } else if (agent.claimed_by === targetUser.id) {
        return await interaction.reply({ content: `❌ **${targetUser.username}** ya tiene reclamado a **${agent.name}**.`, ephemeral: true });
    }

    await interaction.deferReply();

    await pool.query(
      'UPDATE valorant_agents SET claimed_by = $1, claimed_at = NOW() WHERE name = $2',
      [targetUser.id, agent.name]
    );

    let nicknameWarning = '';
    try {
      const member = await interaction.guild.members.fetch(targetUser.id);
      await member.setNickname(`𓂃 ࣪˖${agent.name}ꪆৎ`);
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
                    comando: 'forzarreclamarvalorant',
                    personaje: agent.name
                }
            ]);

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('Error guardando en Supabase en /forzarreclamarvalorant:', error);
        supabaseWarning = `\n⚠️ **Aviso:** La acción se completó, pero no se pudo guardar el registro en la base de datos de Supabase.`;
    }

    await interaction.editReply({ content: `✅ **${interaction.user.username}** ha asignado **${agent.name}** (Valorant) a **${targetUser.username}**.` + nicknameWarning + supabaseWarning });

  } catch (error) {
    console.error('Error en /forzarreclamarvalorant:', error.message);
    const replyOptions = { content: '❌ Ocurrió un error al ejecutar el comando.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(() => {});
    } else {
      await interaction.reply(replyOptions).catch(() => {});
    }
  }
}