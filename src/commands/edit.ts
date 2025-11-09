import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ModalSubmitInteraction,
  EmbedBuilder
} from 'discord.js';
import { queries } from '../database';
import { createVoteButtons, VoteCount } from '../utils/embed';

export const data = new SlashCommandBuilder()
  .setName('edit')
  .setDescription('Editar sua sugestão');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Verificar se está em uma thread
    if (!interaction.channel?.isThread()) {
      await interaction.reply({
        content: '❌ Este comando só pode ser usado dentro de uma thread de sugestão.',
        ephemeral: true
      });
      return;
    }

    const threadId = interaction.channel.id;

    // Buscar sugestão no banco de dados
    const suggestion = queries.getSuggestionByThreadId.get(threadId) as any;

    if (!suggestion) {
      await interaction.reply({
        content: '❌ Esta thread não está associada a nenhuma sugestão.',
        ephemeral: true
      });
      return;
    }

    // Verificar permissões: autor OU admin
    const isAuthor = interaction.user.id === suggestion.author_id;
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    if (!isAuthor && !isAdmin) {
      await interaction.reply({
        content: '❌ Apenas o autor da sugestão ou administradores podem editá-la.',
        ephemeral: true
      });
      return;
    }

    // Criar modal para edição
    const modal = new ModalBuilder()
      .setCustomId(`edit_suggestion_${suggestion.id}`)
      .setTitle('Editar Sugestão');

    const textInput = new TextInputBuilder()
      .setCustomId('new_content')
      .setLabel('Nova descrição da sugestão')
      .setStyle(TextInputStyle.Paragraph)
      .setValue(suggestion.content)
      .setRequired(true)
      .setMaxLength(2000);

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);

  } catch (error) {
    console.error('❌ Erro ao executar comando /edit:', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Ocorreu um erro ao executar o comando.',
        ephemeral: true
      }).catch(console.error);
    }
  }
}

export async function handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  try {
    // Extrair suggestion_id do customId
    const suggestionId = parseInt(interaction.customId.split('_')[2]);
    const newContent = interaction.fields.getTextInputValue('new_content').trim();

    // Buscar sugestão
    const suggestion = queries.getSuggestionByThreadId.get(interaction.channelId) as any;

    if (!suggestion || suggestion.id !== suggestionId) {
      await interaction.reply({
        content: '❌ Sugestão não encontrada.',
        ephemeral: true
      });
      return;
    }

    // Validar tamanho mínimo
    if (newContent.length < 10) {
      await interaction.reply({
        content: '❌ A sugestão deve ter pelo menos 10 caracteres.',
        ephemeral: true
      });
      return;
    }

    // Verificar se o conteúdo mudou
    if (newContent === suggestion.content) {
      await interaction.reply({
        content: '⚠️ Nenhuma alteração foi feita.',
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    // Buscar GuildMember para obter displayName
    let displayName = interaction.user.username;
    if (interaction.guild) {
      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        displayName = member.displayName;
      } catch {
        // Fallback para username se falhar
      }
    }

    // Salvar histórico de edição
    queries.saveEditHistory.run(
      suggestionId,
      suggestion.content,
      newContent,
      interaction.user.id,
      displayName,
      Date.now()
    );

    // Atualizar conteúdo no banco
    queries.updateSuggestionContent.run(newContent, suggestionId);

    // Buscar embed original e atualizar
    if (!interaction.channel?.isThread()) {
      throw new Error('Canal não é uma thread');
    }

    const channel = await interaction.client.channels.fetch(interaction.channel.parentId!) as any;
    const message = await channel.messages.fetch(suggestion.message_id);

    const votes = queries.countVotes.get(suggestionId) as VoteCount;
    const user = await interaction.client.users.fetch(suggestion.author_id);

    const updatedEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setAuthor({
        name: suggestion.author_username,
        iconURL: user.displayAvatarURL()
      })
      .setTitle('💡 Nova Sugestão')
      .setDescription(newContent)
      .addFields({
        name: '📊 Votação',
        value: `👍 **${votes.upvotes}** votos a favor\n👎 **${votes.downvotes}** votos contra`,
        inline: false
      })
      .setFooter({ text: `ID: ${suggestionId} • ✏️ Editada` })
      .setTimestamp();

    await message.edit({
      embeds: [updatedEmbed],
      components: [createVoteButtons()]
    });

    // Atualizar mensagem de auditoria
    await updateAuditMessage(interaction, suggestionId, suggestion.audit_message_id);

    await interaction.editReply({
      content: '✅ Sugestão editada com sucesso!'
    });

    console.log(`✏️ Sugestão #${suggestionId} editada por ${displayName}`);

  } catch (error) {
    console.error('❌ Erro ao processar edição:', error);

    if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ Ocorreu um erro ao editar a sugestão.'
      }).catch(console.error);
    }
  }
}

async function updateAuditMessage(
  interaction: ModalSubmitInteraction,
  suggestionId: number,
  auditMessageId: string | null
): Promise<void> {
  if (!auditMessageId) return;

  try {
    const thread = interaction.channel;
    if (!thread?.isThread()) return;

    // Buscar todo o histórico
    const history = queries.getEditHistory.all(suggestionId) as any[];

    if (history.length === 0) return;

    // Construir mensagem de auditoria
    let auditContent = '📝 **Histórico de Edições**\n\n';

    for (let i = 0; i < history.length; i++) {
      const edit = history[i];
      const date = new Date(edit.edited_at);
      const formattedDate = date.toLocaleString('pt-BR');

      auditContent += `**Versão ${i + 1}** (${formattedDate}) - ${edit.edited_by_username}\n`;
      auditContent += `**De:** ${edit.old_content.substring(0, 100)}${edit.old_content.length > 100 ? '...' : ''}\n`;
      auditContent += `**Para:** ${edit.new_content.substring(0, 100)}${edit.new_content.length > 100 ? '...' : ''}\n\n`;
    }

    // Atualizar mensagem
    const auditMessage = await thread.messages.fetch(auditMessageId);
    await auditMessage.edit(auditContent);

  } catch (error) {
    console.error('❌ Erro ao atualizar mensagem de auditoria:', error);
  }
}
