import { SlashCommandBuilder } from 'discord.js';
import { pool, supabase } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('forzarliberargenshin')
  .setDescription('[MOD] Libera forzosamente un personaje de Genshin Impact')
  .addStringOption(option =>
    option.setName('personaje')
      .setDescription('Nombre del personaje a liberar')
      .setRequired(true)
  );

export async function execute(interaction) {
  try {
    // Check if user has administrator permission
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: '❌ Solo los moderadores pueden usar este comando.', ephemeral: true });
    }

    const characterName = interaction.options.getString('personaje');

    const res = await pool.query(
      'SELECT * FROM genshin_characters WHERE name ILIKE $1',
      [characterName]
    );

    if (res.rowCount === 0) {
      return interaction.reply({ content: `❌ No se encontró un personaje con el nombre "${characterName}".`, ephemeral: true });
    }

    const character = res.rows[0];

    if (!character.claimed_by) {
      return interaction.reply({ content: `❌ El personaje **${character.name}** no está reclamado por nadie.`, ephemeral: true });
    }

    // Checks passed, now we make the public reply
    await interaction.deferReply();

    const previousOwnerId = character.claimed_by;

    await pool.query(
      'UPDATE genshin_characters SET claimed_by = NULL, claimed_at = NULL WHERE name = $1',
      [character.name]
    );

    const { error } = await supabase
      .from('reclamos')
      .insert([{
        user_id: interaction.user.id,
        nickname: interaction.member?.nickname || interaction.user.username,
        comando: 'forzarliberargenshin',
        personaje: character.name
      }]);

    if (error) {
      console.error('Error guardando en Supabase:', error);
    }

    await interaction.editReply({ content: `✅ **${interaction.user.username}** ha liberado forzosamente a **${character.name}** (Genshin Impact) de <@${previousOwnerId}>.` });

  } catch (error) {
    console.error('Error en /forzarliberargenshin:', error.message);
    const replyOptions = { content: '❌ Ocurrió un error al intentar liberar el personaje.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(() => {});
    } else {
      await interaction.reply(replyOptions).catch(() => {});
    }
  }
}