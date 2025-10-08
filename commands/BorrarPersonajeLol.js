import { SlashCommandBuilder } from 'discord.js';
import { pool } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('borrarpersonajelol')
  .setDescription('Borra un campeón de League of Legends de la lista')
  .addStringOption(opt =>
    opt.setName('nombre')
      .setDescription('Nombre del campeón a borrar')
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
      'DELETE FROM champions WHERE LOWER(name) = LOWER($1)',
      [nombre]
    );

    if (result.rowCount > 0) {
      await interaction.editReply({ content: `✅ Campeón "${nombre}" borrado correctamente.` });
    } else {
      await interaction.editReply({ content: `❌ El campeón "${nombre}" no se encontró en la lista.` });
    }

  } catch (error) {
    console.error('Error en /borrarpersonajelol:', error);
    const replyOptions = { content: '❌ Ocurrió un error al borrar el campeón.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(console.error);
    } else {
      await interaction.reply(replyOptions).catch(console.error);
    }
  }
}