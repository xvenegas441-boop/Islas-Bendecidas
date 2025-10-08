import { SlashCommandBuilder } from 'discord.js';
import { pool, supabase } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('liberar')
  .setDescription('Libera tu campeón reclamado');

export async function execute(interaction) {
  try {
    const res = await pool.query(
      'SELECT * FROM champions WHERE claimed_by = $1',
      [interaction.user.id]
    );

    if (res.rowCount === 0) {
      return interaction.reply({ content: '❌ No tienes ningún campeón reclamado.', ephemeral: true });
    }

    // Checks passed, now we make the public reply
    await interaction.deferReply();

    const championName = res.rows[0].name;

    await pool.query(
      'UPDATE champions SET claimed_by = NULL, claimed_at = NULL WHERE claimed_by = $1',
      [interaction.user.id]
    );

    let nicknameWarning = '';
    try {
      if (interaction.member.nickname === championName) {
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
        comando: 'liberar',
        personaje: championName
      }]);

    if (error) {
      console.error('Error guardando en Supabase:', error);
    }

    await interaction.editReply({ content: `✅ **${interaction.user.username}** ha liberado a **${championName}**. ` + nicknameWarning });

  } catch (error) {
    console.error('Error en /liberar:', error.message);
    const replyOptions = { content: '❌ Ocurrió un error al intentar liberar el campeón.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(() => {});
    } else {
      await interaction.reply(replyOptions).catch(() => {});
    }
  }
}