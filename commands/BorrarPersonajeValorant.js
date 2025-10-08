import { SlashCommandBuilder } from 'discord.js';
import { pool } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('borrarpersonajevalorant')
  .setDescription('Borra un agente de Valorant de la lista')
  .addStringOption(opt =>
    opt.setName('nombre')
      .setDescription('Nombre del agente a borrar')
      .setRequired(true)
  );

export async function execute(interaction) {
  const nombre = interaction.options.getString('nombre').trim();

  if (!nombre) {
    return await interaction.reply({ content: 'Debes especificar un nombre válido.', ephemeral: true });
  }

  try {
    await interaction.deferReply();

    const result = await pool.query(
      'DELETE FROM valorant_agents WHERE LOWER(name) = LOWER($1)',
      [nombre]
    );

    if (result.rowCount > 0) {
      await interaction.editReply({ content: `✅ Agente "${nombre}" borrado correctamente.` });
    } else {
      await interaction.editReply({ content: `❌ El agente "${nombre}" no se encontró en la lista.` });
    }

  } catch (error) {
    console.error('Error en /borrarpersonajevalorant:', error);
    const replyOptions = { content: '❌ Ocurrió un error al borrar el agente.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(console.error);
    } else {
      await interaction.reply(replyOptions).catch(console.error);
    }
  }
}