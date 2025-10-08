import { SlashCommandBuilder } from 'discord.js';
import { pool, supabase } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('liberargenshin')
  .setDescription('Libera tu personaje de Genshin Impact reclamado');

export async function execute(interaction) {
  try {
    const res = await pool.query(
      'SELECT * FROM genshin_characters WHERE claimed_by = $1',
      [interaction.user.id]
    );

    if (res.rowCount === 0) {
      return interaction.reply({ content: '❌ No tienes ningún personaje de Genshin Impact reclamado.', ephemeral: true });
    }

    // Checks passed, now we make the public reply
    await interaction.deferReply();

    const characterName = res.rows[0].name;

    await pool.query(
      'UPDATE genshin_characters SET claimed_by = NULL, claimed_at = NULL WHERE claimed_by = $1',
      [interaction.user.id]
    );

    let nicknameWarning = '';
    try {
      if (interaction.member.nickname === characterName) {
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
        comando: 'liberargenshin',
        personaje: characterName
      }]);

    if (error) {
      console.error('Error guardando en Supabase:', error);
    }

    await interaction.editReply({ content: `✅ **${interaction.user.username}** ha liberado a **${characterName}** (Genshin Impact). ` + nicknameWarning });

  } catch (error) {
    console.error('Error en /liberargenshin:', error.message);
    const replyOptions = { content: '❌ Ocurrió un error al intentar liberar el personaje.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(() => {});
    } else {
      await interaction.reply(replyOptions).catch(() => {});
    }
  }
}