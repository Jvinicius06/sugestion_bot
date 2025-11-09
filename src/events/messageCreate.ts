import { Message, TextChannel, ChannelType } from 'discord.js';
import { config } from '../config';
import { queries } from '../database';
import { createSuggestionEmbed, createVoteButtons } from '../utils/embed';

export async function handleMessage(message: Message): Promise<void> {
  // Ignorar mensagens de bots
  if (message.author.bot) return;

  // Verificar se é o canal de sugestões
  if (message.channelId !== config.suggestionsChannelId) return;

  // Verificar se a mensagem tem conteúdo
  if (!message.content || message.content.trim().length === 0) {
    await message.delete().catch(() => {});
    return;
  }

  try {
    const channel = message.channel as TextChannel;
    const author = message.author;
    const content = message.content;

    // Buscar o member para pegar o nickname
    const member = message.member || await message.guild?.members.fetch(author.id);
    const displayName = member?.displayName || author.username;

    // Criar embed inicial com 0 votos
    const embed = createSuggestionEmbed(author, displayName, content, { upvotes: 0, downvotes: 0 }, 0);
    const buttons = createVoteButtons();

    // Enviar mensagem com embed e botões
    const suggestionMessage = await channel.send({
      embeds: [embed],
      components: [buttons]
    });

    // Salvar sugestão no banco de dados
    const result = queries.createSuggestion.run(
      suggestionMessage.id,
      null, // thread_id será adicionado depois
      author.id,
      displayName,
      content,
      Date.now()
    );

    const suggestionId = result.lastInsertRowid as number;

    // Atualizar embed com ID correto
    const updatedEmbed = createSuggestionEmbed(
      author,
      displayName,
      content,
      { upvotes: 0, downvotes: 0 },
      suggestionId
    );

    await suggestionMessage.edit({ embeds: [updatedEmbed] });

    // Criar thread para discussão
    const threadName = content.length > 100
      ? content.substring(0, 97) + '...'
      : content;

    const thread = await suggestionMessage.startThread({
      name: threadName,
      autoArchiveDuration: 10080, // 7 dias
      reason: 'Thread de discussão para sugestão'
    });

    // Atualizar thread_id no banco de dados
    queries.updateThreadId.run(thread.id, suggestionId);

    // Mensagem inicial na thread
    await thread.send(`💬 Use esta thread para discutir sobre esta sugestão!\n\n**Autor:** ${member || author}\n**Sugestão:** ${content}`);

    // Deletar mensagem original
    await message.delete().catch(console.error);

    console.log(`✅ Sugestão #${suggestionId} criada por ${displayName}`);
  } catch (error) {
    console.error('❌ Erro ao processar sugestão:', error);
    // Tentar deletar a mensagem mesmo se houver erro
    await message.delete().catch(() => {});
  }
}
