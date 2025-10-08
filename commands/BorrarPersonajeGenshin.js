import { SlashCommandBuilder } from 'discord.js';
import { pool } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('borrarpersonajegenshin')
  .setDescription('Borra un personaje de Genshin Impact de la lista')
  .addStringOption(opt =>
    opt.setName('nombre')
      .setDescription('Nombre del personaje a borrar')
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
      'DELETE FROM genshin_characters WHERE LOWER(name) = LOWER($1)',
      [nombre]
    );

    if (result.rowCount > 0) {
      await interaction.editReply({ content: `✅ Personaje "${nombre}" borrado correctamente.` });
    } else {
      await interaction.editReply({ content: `❌ El personaje "${nombre}" no se encontró en la lista.` });
    }

  } catch (error) {
    console.error('Error en /borrarpersonajegenshin:', error);
    const replyOptions = { content: '❌ Ocurrió un error al borrar el personaje.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(console.error);
    } else {
      await interaction.reply(replyOptions).catch(console.error);
    }
  }
}