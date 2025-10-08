import { SlashCommandBuilder } from 'discord.js';
import { pool, supabase } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('reclamarvalorant')
  .setDescription('Reclama un agente de Valorant')
  .addStringOption(option =>
    option.setName('nombre')
      .setDescription('Nombre del agente que quieres reclamar')
      .setRequired(true)
  );

export async function execute(interaction) {
  const nombre = interaction.options.getString('nombre');

  try {
    const res = await pool.query(
      'SELECT * FROM valorant_agents WHERE LOWER(name) = LOWER($1)',
      [nombre]
    );

    if (res.rowCount === 0) {
      return await interaction.reply({ content: `❌ El agente **${nombre}** no existe.`, ephemeral: true });
    }

    const agent = res.rows[0];

    if (agent.claimed_by) {
      return await interaction.reply({ content: `❌ El agente **${agent.name}** ya está reclamado.`, ephemeral: true });
    }

    // Checks passed, now we make the public reply
    await interaction.deferReply();

    await pool.query(
      'UPDATE valorant_agents SET claimed_by = $1, claimed_at = NOW() WHERE name = $2',
      [interaction.user.id, agent.name]
    );

    let nicknameWarning = '';
    try {
      await interaction.member.setNickname(`𓂃 ࣪˖${agent.name}ꪆৎ`);
    } catch (err) {
      console.warn('No se pudo cambiar el nickname:', err.message);
      nicknameWarning = `
⚠️ **Nota:** No pude cambiar tu apodo. Revisa que el rol del bot esté por encima del tuyo y que tenga el permiso de "Gestionar apodos".`;
    }

    const { error } = await supabase
      .from('reclamos')
      .insert([{
        user_id: interaction.user.id,
        nickname: interaction.member?.nickname || interaction.user.username,
        comando: 'reclamarvalorant',
        personaje: agent.name
      }]);

    if (error) {
      console.error('Error guardando en Supabase:', error);
    }

    await interaction.editReply({ content: `✅ **${interaction.user.username}** ha reclamado a **${agent.name}** (Valorant).` + nicknameWarning });

  } catch (error) {
    console.error('Error en /reclamarvalorant:', error.message);
    const replyOptions = { content: '❌ Ocurrió un error al intentar reclamar el agente.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(() => {});
    } else {
      await interaction.reply(replyOptions).catch(() => {});
    }
  }
}