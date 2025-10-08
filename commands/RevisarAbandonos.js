import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { pool } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('revisar-abandonos')
  .setDescription('Revisa y libera campeones de usuarios que abandonaron el servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  try {
    await interaction.deferReply();

    // Fetch all members of the guild
    const members = await interaction.guild.members.fetch();
    const memberIds = new Set(members.map(m => m.id));

    // Get all claimed champions
    const res = await pool.query(
      'SELECT name, claimed_by FROM champions WHERE claimed_by IS NOT NULL'
    );

    let freedCount = 0;

    for (const row of res.rows) {
      if (!memberIds.has(row.claimed_by)) {
        // User left, free the champion
        await pool.query(
          'UPDATE champions SET claimed_by = NULL, claimed_at = NULL WHERE name = $1',
          [row.name]
        );
        freedCount++;
      }
    }

    await interaction.editReply({ content: `✅ Revisión completada. Se liberaron ${freedCount} campeones de usuarios que abandonaron el servidor.` });

  } catch (error) {
    console.error('Error en /revisar-abandonos:', error);
    const replyOptions = { content: '❌ Ocurrió un error al revisar abandonos.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(() => {});
    } else {
      await interaction.reply(replyOptions).catch(() => {});
    }
  }
}