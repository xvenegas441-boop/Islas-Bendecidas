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
  .setName('listarvalorant')
  .setDescription('🔫 Lista de agentes de Valorant');

const LOGO_URL =
  'https://static.wikia.nocookie.net/valorant/images/6/6f/Valorant_logo.png';

const makeEmbed = (content, pageIndex, totalPages, stats) => {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: '🔫 Valorant - Lista de Agentes'
    })
    .setColor('#FF4655') // Valorant red color
    .setDescription(content)
    .setFooter({
      text: `Página ${pageIndex + 1} de ${totalPages} • ${stats.total} agentes totales`
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
      .setCustomId('valorant_prev')
      .setLabel('⬅️ Anterior')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageIndex === 0),
    new ButtonBuilder()
      .setCustomId('valorant_next')
      .setLabel('Siguiente ➡️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageIndex >= totalPages - 1)
  );

// Función de ejecución
export async function execute(interaction) {
  try {
    await interaction.deferReply();

    const res = await pool.query(
      'SELECT name, claimed_by FROM valorant_agents ORDER BY name ASC'
    );

    if (res.rowCount === 0) {
      await interaction.editReply({ content: 'No hay agentes registrados en la base de datos.' });
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

    // Construcción de páginas fijas (3 páginas)
    const itemsPerPage = Math.ceil(lista.length / 3);
    const pages = [];
    for (let i = 0; i < 3; i++) {
      const start = i * itemsPerPage;
      const end = Math.min(start + itemsPerPage, lista.length);
      const pageItems = lista.slice(start, end);
      pages.push(pageItems.join('\n'));
    }

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

        if (i.customId === 'valorant_prev') {
          currentPage = Math.max(0, currentPage - 1);
        } else if (i.customId === 'valorant_next') {
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
    console.error('Error in /listarvalorant command:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: '❌ No se pudo obtener la lista de agentes.', flags: 64 }).catch(() => {});
    } else {
      await interaction.reply({ content: '❌ No se pudo obtener la lista de agentes.', flags: 64 }).catch(() => {});
    }
  }
}