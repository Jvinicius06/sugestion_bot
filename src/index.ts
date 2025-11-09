import { Client, GatewayIntentBits, Events } from 'discord.js';
import { config, validateConfig } from './config';
import { handleMessage } from './events/messageCreate';
import { handleInteraction } from './events/interactionCreate';
import { startNicknameSync } from './services/syncNicknames';
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

// Event: Bot pronto
client.on(Events.ClientReady, () => {
  console.log(`✅ Bot conectado como ${client.user?.tag}`);
  console.log(`📝 Canal de sugestões: ${config.suggestionsChannelId}`);
  console.log('🚀 Bot está pronto para receber sugestões!');

  // Iniciar sincronização automática de nicknames (a cada 5 minutos)
  startNicknameSync(client, 5);
});

// Event: Nova mensagem
client.on(Events.MessageCreate, handleMessage);

// Event: Interação (botões)
client.on(Events.InteractionCreate, handleInteraction);

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
