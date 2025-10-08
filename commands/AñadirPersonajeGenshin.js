import { SlashCommandBuilder } from 'discord.js';
import { pool } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('añadirpersonajegenshin')
  .setDescription('Añade un personaje de Genshin Impact a la lista')
  .addStringOption(opt =>
    opt.setName('nombre')
      .setDescription('Nombre del personaje a añadir')
      .setRequired(true)
  )
  .addUserOption(opt =>
    opt.setName('reclamado')
      .setDescription('Usuario que lo reclama (opcional)')
  );

export async function execute(interaction) {
  const nombre = interaction.options.getString('nombre').trim();
  const user = interaction.options.getUser('reclamado');

  const claimedBy = user ? user.id : null;

  if (!nombre) {
    return await interaction.reply({ content: 'Debes especificar un nombre válido.', ephemeral: true });
  }

  try {
    // Comprobar existencia (case-insensitive) ANTES de deferir
    const exists = await pool.query(
      'SELECT 1 FROM genshin_characters WHERE LOWER(name) = LOWER($1)',
      [nombre]
    );

    if (exists.rowCount > 0) {
      return await interaction.reply({ content: `El personaje "${nombre}" ya existe en la lista.`, ephemeral: true });
    }

     // Validar el nombre del personaje (ejemplo: solo letras y espacios)
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(nombre)) {
      return await interaction.reply({ content: 'Nombre de personaje inválido. Solo se permiten letras y espacios.', ephemeral: true });
    }
    // Ahora que sabemos que es una acción válida, hacemos la respuesta pública
    await interaction.deferReply();

    await pool.query(
      'INSERT INTO genshin_characters (name, claimed_by) VALUES ($1, $2)',
      [nombre, claimedBy]
    );


    const byText = claimedBy ? ` — reclamado por <@${claimedBy}>` : '';
    await interaction.editReply({ content: `✅ Personaje "${nombre}" añadido correctamente${byText}.` });

  } catch (error) {
    console.error('Error en /añadirpersonajegenshin:', error);
    const replyOptions = { content: '❌ Ocurrió un error al añadir el personaje.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch((followUpError) => {
        console.error('Error al enviar followUp:', followUpError);
        // Considerar enviar el error a un canal de registro o a un servicio de monitoreo
      });




    } else {
      await interaction.reply(replyOptions).catch(() => {});
    }
  }
}