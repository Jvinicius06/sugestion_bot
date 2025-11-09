import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, User } from 'discord.js';

export interface VoteCount {
  upvotes: number;
  downvotes: number;
}

export function createSuggestionEmbed(
  author: User,
  displayName: string,
  content: string,
  votes: VoteCount,
  suggestionId: number
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#5865F2') // Discord Blurple
    .setAuthor({
      name: displayName,
      iconURL: author.displayAvatarURL()
    })
    .setTitle('💡 Nova Sugestão')
    .setDescription(content)
    .addFields({
      name: '📊 Votação',
      value: `👍 **${votes.upvotes}** votos a favor\n👎 **${votes.downvotes}** votos contra`,
      inline: false
    })
    .setFooter({ text: `ID: ${suggestionId}` })
    .setTimestamp();
}

export function createVoteButtons(): ActionRowBuilder<ButtonBuilder> {
  const upvoteButton = new ButtonBuilder()
    .setCustomId('vote_up')
    .setLabel('👍 Votar a Favor')
    .setStyle(ButtonStyle.Success);

  const downvoteButton = new ButtonBuilder()
    .setCustomId('vote_down')
    .setLabel('👎 Votar Contra')
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(upvoteButton, downvoteButton);
}

export function updateEmbedVotes(
  embed: EmbedBuilder,
  votes: VoteCount
): EmbedBuilder {
  // Clonar o embed e atualizar apenas o campo de votação
  const newEmbed = EmbedBuilder.from(embed);

  newEmbed.spliceFields(0, 1, {
    name: '📊 Votação',
    value: `👍 **${votes.upvotes}** votos a favor\n👎 **${votes.downvotes}** votos contra`,
    inline: false
  });

  return newEmbed;
}
