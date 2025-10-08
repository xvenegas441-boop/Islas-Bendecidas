import { SlashCommandBuilder } from 'discord.js';
import { pool, supabase } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('liberarvalorant')
  .setDescription('Libera tu agente de Valorant reclamado');

export async function execute(interaction) {
  try {
    const res = await pool.query(
      'SELECT * FROM valorant_agents WHERE claimed_by = $1',
      [interaction.user.id]
    );

    if (res.rowCount === 0) {
      return interaction.reply({ content: '❌ No tienes ningún agente de Valorant reclamado.', ephemeral: true });
    }

    // Checks passed, now we make the public reply
    await interaction.deferReply();

    const agentName = res.rows[0].name;

    await pool.query(
      'UPDATE valorant_agents SET claimed_by = NULL, claimed_at = NULL WHERE claimed_by = $1',
      [interaction.user.id]
    );

    let nicknameWarning = '';
    try {
      if (interaction.member.nickname === agentName) {
        await interaction.member.setNickname(null);
      }
    } catch (err) {
      console.warn('No se pudo restaurar el nickname:', err.message);
      nicknameWarning = `
⚠️ **Nota:** No pude restaurar tu apodo. Revisa los permisos del bot.`;
    }

    const { error } = await supabase
      .from('reclamos')
      .insert([{
        user_id: interaction.user.id,
        nickname: interaction.member?.nickname || interaction.user.username,
        comando: 'liberarvalorant',
        personaje: agentName
      }]);

    if (error) {
      console.error('Error guardando en Supabase:', error);
    }

    await interaction.editReply({ content: `✅ **${interaction.user.username}** ha liberado a **${agentName}** (Valorant). ` + nicknameWarning });

  } catch (error) {
    console.error('Error en /liberarvalorant:', error.message);
    const replyOptions = { content: '❌ Ocurrió un error al intentar liberar el agente.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(() => {});
    } else {
      await interaction.reply(replyOptions).catch(() => {});
    }
  }
}