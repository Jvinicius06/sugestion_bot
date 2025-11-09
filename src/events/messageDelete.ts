import { Message, PartialMessage } from 'discord.js';
import { queries } from '../database';

export async function handleMessageDelete(message: Message | PartialMessage): Promise<void> {
  try {
    // Ignorar mensagens parciais sem ID
    if (!message.id) return;

    // Buscar sugestão no banco de dados
    const suggestion = queries.getSuggestionByMessageId.get(message.id) as any;

    if (!suggestion) {
      // Não é uma sugestão, ignorar
      return;
    }

    console.log(`🗑️  Sugestão #${suggestion.id} foi deletada por um administrador`);

    // Deletar a thread se existir
    if (suggestion.thread_id && message.guild) {
      try {
        const thread = await message.guild.channels.fetch(suggestion.thread_id);

        if (thread && thread.isThread()) {
          await thread.delete('Sugestão original foi deletada');
          console.log(`🗑️  Thread da sugestão #${suggestion.id} deletada`);
        }
      } catch (error) {
        console.error(`❌ Erro ao deletar thread da sugestão #${suggestion.id}:`, error);
      }
    }

    // Remover sugestão do banco de dados (CASCADE vai remover os votos automaticamente)
    queries.deleteSuggestion.run(suggestion.id);
    console.log(`✅ Sugestão #${suggestion.id} removida do banco de dados`);

  } catch (error) {
    console.error('❌ Erro ao processar deleção de mensagem:', error);
  }
}
