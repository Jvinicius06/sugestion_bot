import { Client, GatewayIntentBits, Events, REST, Routes } from 'discord.js';
import { config, validateConfig } from './config';
import { handleMessage } from './events/messageCreate';
import { handleInteraction } from './events/interactionCreate';
import { handleMessageDelete } from './events/messageDelete';
import { startNicknameSync } from './services/syncNicknames';
import * as editCommand from './commands/edit';
import './database'; // Inicializar banco de dados

// Validar configurações
if (!validateConfig()) {
  console.error('❌ Configuração inválida. Verifique o arquivo .env');
  process.exit(1);
}

// Criar cliente do Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // Necessário para buscar nicknames
  ]
});

// Função para registrar comandos slash
async function deployCommands(clientId: string): Promise<void> {
  const commands = [editCommand.data.toJSON()];
  const rest = new REST().setToken(config.token);

  try {
    console.log('🔄 Registrando comandos slash...');

    await rest.put(
      Routes.applicationGuildCommands(clientId, config.guildId),
      { body: commands }
    );

    console.log(`✅ ${commands.length} comando(s) registrado(s)!`);
  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
  }
}

// Event: Bot pronto
client.on(Events.ClientReady, async () => {
  console.log(`✅ Bot conectado como ${client.user?.tag}`);
  console.log(`📝 Canal de sugestões: ${config.suggestionsChannelId}`);

  // Registrar comandos automaticamente
  if (client.user) {
    await deployCommands(client.user.id);
  }

  console.log('🚀 Bot está pronto para receber sugestões!');

  // Iniciar sincronização automática de nicknames (a cada 5 minutos)
  startNicknameSync(client, 5);
});

// Event: Nova mensagem
client.on(Events.MessageCreate, handleMessage);

// Event: Mensagem deletada
client.on(Events.MessageDelete, handleMessageDelete);

// Event: Interações (slash commands, modals, botões)
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'edit') {
        await editCommand.execute(interaction);
      }
      return;
    }

    // Modals
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('edit_suggestion_')) {
        await editCommand.handleModalSubmit(interaction);
      }
      return;
    }

    // Botões de votação
    if (interaction.isButton()) {
      await handleInteraction(interaction);
    }
  } catch (error) {
    console.error('❌ Erro ao processar interação:', error);
  }
});

// Event: Erro
client.on(Events.Error, (error) => {
  console.error('❌ Erro no cliente Discord:', error);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada:', error);
  process.exit(1);
});

// Login
client.login(config.token).catch((error) => {
  console.error('❌ Erro ao fazer login:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Desligando bot...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Desligando bot...');
  client.destroy();
  process.exit(0);
});
