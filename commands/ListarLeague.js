import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
} from 'discord.js';
import { pool } from '../db.js';

// Definición del comando
export const data = new SlashCommandBuilder()
  .setName('listarleague')
  .setDescription('🏆 Lista gloriosa de campeones de League of Legends');

const LOGO_URL =
  'https://www.leagueoflegends.com/static/logo-1200-589b3ef693ce8a750fa4b4704a95058b.png';

const makeEmbed = (content, pageIndex, totalPages, stats) => {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: '🏆 Summoner\'s Rift - Lista de Campeones'
    })
    .setColor('#C8AA6E') // League gold color
    .setDescription(content)
    .setFooter({
      text: `Página ${pageIndex + 1} de ${totalPages} • ${stats.total} campeones totales`
    })
    .setTimestamp();

  // Add stats as fields if we have them
  if (stats) {
    embed.addFields(
      { name: '⚔️ Reclamados', value: `${stats.claimed}`, inline: true },
      { name: '🆓 Libres', value: `${stats.free}`, inline: true },
      { name: '📊 Porcentaje', value: `${Math.round((stats.claimed / stats.total) * 100)}%`, inline: true }
    );
  }

  return embed;
};

const makeRow = (pageIndex, totalPages) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('list_prev')
      .setLabel('⬅️ Anterior')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageIndex === 0),
    new ButtonBuilder()
      .setCustomId('list_next')
      .setLabel('Siguiente ➡️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageIndex >= totalPages - 1)
  );

// Función de ejecución
export async function execute(interaction) {
  try {
    await interaction.deferReply();

    const res = await pool.query(
      'SELECT name, claimed_by FROM champions ORDER BY name ASC'
    );

    if (res.rowCount === 0) {
      await interaction.editReply({ content: 'No hay campeones registrados en la base de datos.' });
      return;
    }

    // Calculate statistics
    const stats = {
      total: res.rowCount,
      claimed: res.rows.filter(row => row.claimed_by).length,
      free: res.rows.filter(row => !row.claimed_by).length
    };

    const lista = res.rows.map(row => {
      if (row.claimed_by) {
        return `⚔️ **${row.name}** — <@${row.claimed_by}>`;
      } else {
        return `🆓 **${row.name}** — *Disponible*`;
      }
    });

    // Construcción de páginas
    const MAX_EMBED_chars = 2000;
    const pages = [];
    let current = '';

    for (const line of lista) {
      if (!current) {
        current = line;
      } else if (current.length + 1 + line.length <= MAX_EMBED_chars) {
        current += `\n${line}`;
      } else {
        pages.push(current);
        current = line;
      }
    }
    if (current) pages.push(current);

    if (pages.length === 0) {
      await interaction.editReply({ content: 'No hay datos para mostrar.' });
      return;
    }

    const initialEmbed = makeEmbed(pages[0], 0, pages.length, stats);
    const components = pages.length > 1 ? [makeRow(0, pages.length)] : [];

    const message = await interaction.editReply({
      embeds: [initialEmbed],
      components: components,
    });

    if (pages.length <= 1) return; // No need for a collector if only one page

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      idle: 900000, // 15 minutes of inactivity
    });

    collector.on('collect', async i => {
      try {
        if (i.user.id !== interaction.user.id) {
          await i.reply({
            content: 'Solo el usuario que ejecutó el comando puede usar estos botones.',
            ephemeral: true
          });
          return;
        }

        const footerText = i.message.embeds[0].footer.text;
        const match = footerText.match(/Página (\d+) de (\d+)/);
        if (!match) return; // Should not happen

        let currentPage = parseInt(match[1], 10) - 1;
        const totalPages = parseInt(match[2], 10);

        if (i.customId === 'list_prev') {
          currentPage = Math.max(0, currentPage - 1);
        } else if (i.customId === 'list_next') {
          currentPage = Math.min(totalPages - 1, currentPage + 1);
        }

        const newEmbed = makeEmbed(pages[currentPage], currentPage, totalPages, stats);
        const newRow = makeRow(currentPage, totalPages);

        await i.update({ embeds: [newEmbed], components: [newRow] });
      } catch (err) {
        console.error('Error processing pagination interaction:', err);
        await i.followUp({ content: 'Hubo un error al cambiar de página.', ephemeral: true }).catch(() => {});
      }
    });

    collector.on('end', async () => {
      try {
        const lastEmbed = message.embeds[0];
        const disabledRow = new ActionRowBuilder().addComponents(
          ButtonBuilder.from(message.components[0].components[0]).setDisabled(true),
          ButtonBuilder.from(message.components[0].components[1]).setDisabled(true)
        );
        await message.edit({ embeds: [lastEmbed], components: [disabledRow] });
      } catch (err) {
        // Ignore errors editing the message after the collector expires
      }
    });

  } catch (error) {
    console.error('Error in /listar command:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: '❌ No se pudo obtener la lista de campeones.', flags: 64 }).catch(() => {});
    } else {
      await interaction.reply({ content: '❌ No se pudo obtener la lista de campeones.', flags: 64 }).catch(() => {});
    }
  }
}