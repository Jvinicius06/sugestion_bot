import { Interaction, EmbedBuilder } from 'discord.js';
import { queries } from '../database';
import { updateEmbedVotes, createVoteButtons, VoteCount } from '../utils/embed';

export async function handleInteraction(interaction: Interaction): Promise<void> {
  // Verificar se é um botão
  if (!interaction.isButton()) return;

  // Verificar se é um botão de votação
  if (!interaction.customId.startsWith('vote_')) return;

  try {
    const voteType = interaction.customId === 'vote_up' ? 'up' : 'down';
    const messageId = interaction.message.id;
    const userId = interaction.user.id;

    // Buscar sugestão no banco de dados
    const suggestion = queries.getSuggestionByMessageId.get(messageId) as any;

    if (!suggestion) {
      await interaction.reply({
        content: '❌ Sugestão não encontrada no banco de dados.',
        ephemeral: true
      });
      return;
    }

    const suggestionId = suggestion.id;

    // Verificar voto atual do usuário
    const currentVote = queries.getUserVote.get(suggestionId, userId) as any;

    if (currentVote && currentVote.vote_type === voteType) {
      // Usuário clicou no mesmo botão - remover voto
      queries.removeVote.run(suggestionId, userId);
      await interaction.reply({
        content: `✅ Seu voto foi removido!`,
        ephemeral: true
      });
    } else {
      // Adicionar ou atualizar voto
      queries.upsertVote.run(suggestionId, userId, voteType, Date.now());

      const voteEmoji = voteType === 'up' ? '👍' : '👎';
      const voteText = voteType === 'up' ? 'a favor' : 'contra';

      if (currentVote) {
        await interaction.reply({
          content: `✅ Você alterou seu voto para ${voteEmoji} ${voteText}!`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `✅ Você votou ${voteEmoji} ${voteText}!`,
          ephemeral: true
        });
      }
    }

    // Contar votos atualizados
    const votes = queries.countVotes.get(suggestionId) as VoteCount;

    // Atualizar embed com nova contagem
    const currentEmbed = interaction.message.embeds[0];
    const updatedEmbed = updateEmbedVotes(
      EmbedBuilder.from(currentEmbed),
      votes
    );

    await interaction.message.edit({
      embeds: [updatedEmbed],
      components: [createVoteButtons()]
    });

    console.log(`📊 Voto registrado: usuário ${userId} votou ${voteType} na sugestão #${suggestionId}`);
  } catch (error) {
    console.error('❌ Erro ao processar voto:', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Ocorreu um erro ao processar seu voto. Tente novamente.',
        ephemeral: true
      }).catch(console.error);
    }
  }
}
