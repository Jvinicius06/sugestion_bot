import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { queries } from '../database';
import { config } from '../config';
import { createVoteButtons, VoteCount } from '../utils/embed';

interface Suggestion {
  id: number;
  message_id: string;
  author_id: string;
  author_username: string;
  content: string;
}

/**
 * Sincroniza os nicknames nos embeds de sugestões recentes
 * Verifica sugestões dos últimos 7 dias
 */
export async function syncNicknames(client: Client): Promise<void> {
  try {
    const channel = await client.channels.fetch(config.suggestionsChannelId) as TextChannel;
    if (!channel) {
      console.error('❌ Canal de sugestões não encontrado');
      return;
    }

    const guild = channel.guild;

    // Buscar sugestões dos últimos 7 dias
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentSuggestions = queries.getRecentSuggestions.all(sevenDaysAgo) as Suggestion[];

    if (recentSuggestions.length === 0) {
      return;
    }

    let updatedCount = 0;

    for (const suggestion of recentSuggestions) {
      try {
        // Buscar o member atual
        const member = await guild.members.fetch(suggestion.author_id).catch(() => null);
        if (!member) continue;

        const currentDisplayName = member.displayName;

        // Verificar se o nickname mudou
        if (currentDisplayName === suggestion.author_username) {
          continue; // Sem mudanças
        }

        // Buscar a mensagem do embed
        const message = await channel.messages.fetch(suggestion.message_id).catch(() => null);
        if (!message || message.embeds.length === 0) continue;

        const currentEmbed = message.embeds[0];

        // Buscar votos atuais
        const votes = queries.countVotes.get(suggestion.id) as VoteCount;

        // Criar novo embed com nickname atualizado
        const user = await client.users.fetch(suggestion.author_id);
        const updatedEmbed = new EmbedBuilder()
          .setColor(currentEmbed.color || '#5865F2')
          .setAuthor({
            name: currentDisplayName,
            iconURL: user.displayAvatarURL()
          })
          .setTitle(currentEmbed.title || '💡 Nova Sugestão')
          .setDescription(currentEmbed.description || suggestion.content)
          .addFields({
            name: '📊 Votação',
            value: `👍 **${votes.upvotes}** votos a favor\n👎 **${votes.downvotes}** votos contra`,
            inline: false
          })
          .setFooter({ text: `ID: ${suggestion.id}` })
          .setTimestamp(currentEmbed.timestamp ? new Date(currentEmbed.timestamp) : null);

        // Atualizar a mensagem
        await message.edit({
          embeds: [updatedEmbed],
          components: [createVoteButtons()]
        });

        // Atualizar no banco de dados
        queries.updateAuthorUsername.run(currentDisplayName, suggestion.id);

        updatedCount++;
        console.log(`✅ Nickname atualizado: "${suggestion.author_username}" → "${currentDisplayName}" (Sugestão #${suggestion.id})`);

      } catch (error) {
        console.error(`❌ Erro ao sincronizar sugestão #${suggestion.id}:`, error);
      }
    }

    if (updatedCount > 0) {
      console.log(`🔄 ${updatedCount} nickname(s) atualizado(s)`);
    }

  } catch (error) {
    console.error('❌ Erro ao sincronizar nicknames:', error);
  }
}

/**
 * Inicia a sincronização periódica de nicknames
 * @param client Cliente do Discord
 * @param intervalMinutes Intervalo em minutos (padrão: 5)
 */
export function startNicknameSync(client: Client, intervalMinutes: number = 5): void {
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`🔄 Sincronização de nicknames iniciada (a cada ${intervalMinutes} minutos)`);

  // Executar imediatamente na primeira vez
  setTimeout(() => syncNicknames(client), 10000); // 10 segundos após iniciar

  // Depois executar periodicamente
  setInterval(() => {
    syncNicknames(client);
  }, intervalMs);
}
