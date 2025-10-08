import { SlashCommandBuilder } from 'discord.js';
import { pool, supabase } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('forzar_liberar')
  .setDescription('Libera forzosamente un campeón (solo moderadores)')
  .addStringOption(option =>
    option.setName('campeon')
      .setDescription('Nombre del campeón a liberar')
      .setRequired(true)
  );

export async function execute(interaction) {
  try {
    // Check if user has administrator permission
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: '❌ Solo los moderadores pueden usar este comando.', ephemeral: true });
    }

    const championName = interaction.options.getString('campeon');

    const res = await pool.query(
      'SELECT * FROM champions WHERE name ILIKE $1',
      [championName]
    );

    if (res.rowCount === 0) {
      return interaction.reply({ content: `❌ No se encontró un campeón con el nombre "${championName}".`, ephemeral: true });
    }

    const champion = res.rows[0];

    if (!champion.claimed_by) {
      return interaction.reply({ content: `❌ El campeón **${champion.name}** no está reclamado por nadie.`, ephemeral: true });
    }

    // Checks passed, now we make the public reply
    await interaction.deferReply();

    const previousOwnerId = champion.claimed_by;

    await pool.query(
      'UPDATE champions SET claimed_by = NULL, claimed_at = NULL WHERE name = $1',
      [champion.name]
    );

    const { error } = await supabase
      .from('reclamos')
      .insert([{
        user_id: interaction.user.id,
        nickname: interaction.member?.nickname || interaction.user.username,
        comando: 'forzar_liberar',
        personaje: champion.name
      }]);

    if (error) {
      console.error('Error guardando en Supabase:', error);
    }

    await interaction.editReply({ content: `✅ **${interaction.user.username}** ha liberado forzosamente a **${champion.name}** de <@${previousOwnerId}>.` });

  } catch (error) {
    console.error('Error en /forzar_liberar:', error.message);
    const replyOptions = { content: '❌ Ocurrió un error al intentar liberar el campeón.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(() => {});
    } else {
      await interaction.reply(replyOptions).catch(() => {});
    }
  }
}