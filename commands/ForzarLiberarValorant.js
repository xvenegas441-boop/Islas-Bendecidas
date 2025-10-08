import { SlashCommandBuilder } from 'discord.js';
import { pool, supabase } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('forzarliberarvalorant')
  .setDescription('[MOD] Libera forzosamente un agente de Valorant')
  .addStringOption(option =>
    option.setName('agente')
      .setDescription('Nombre del agente a liberar')
      .setRequired(true)
  );

export async function execute(interaction) {
  try {
    // Check if user has administrator permission
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: '❌ Solo los moderadores pueden usar este comando.', ephemeral: true });
    }

    const agentName = interaction.options.getString('agente');

    const res = await pool.query(
      'SELECT * FROM valorant_agents WHERE name ILIKE $1',
      [agentName]
    );

    if (res.rowCount === 0) {
      return interaction.reply({ content: `❌ No se encontró un agente con el nombre "${agentName}".`, ephemeral: true });
    }

    const agent = res.rows[0];

    if (!agent.claimed_by) {
      return interaction.reply({ content: `❌ El agente **${agent.name}** no está reclamado por nadie.`, ephemeral: true });
    }

    // Checks passed, now we make the public reply
    await interaction.deferReply();

    const previousOwnerId = agent.claimed_by;

    await pool.query(
      'UPDATE valorant_agents SET claimed_by = NULL, claimed_at = NULL WHERE name = $1',
      [agent.name]
    );

    const { error } = await supabase
      .from('reclamos')
      .insert([{
        user_id: interaction.user.id,
        nickname: interaction.member?.nickname || interaction.user.username,
        comando: 'forzarliberarvalorant',
        personaje: agent.name
      }]);

    if (error) {
      console.error('Error guardando en Supabase:', error);
    }

    await interaction.editReply({ content: `✅ **${interaction.user.username}** ha liberado forzosamente a **${agent.name}** (Valorant) de <@${previousOwnerId}>.` });

  } catch (error) {
    console.error('Error en /forzarliberarvalorant:', error.message);
    const replyOptions = { content: '❌ Ocurrió un error al intentar liberar el agente.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(() => {});
    } else {
      await interaction.reply(replyOptions).catch(() => {});
    }
  }
}