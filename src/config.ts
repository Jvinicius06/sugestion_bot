import dotenv from 'dotenv';

dotenv.config();

export const config = {
  token: process.env.DISCORD_TOKEN || '',
  suggestionsChannelId: process.env.SUGGESTIONS_CHANNEL_ID || '',
  guildId: process.env.GUILD_ID || '',
};

// Validar configurações
export function validateConfig(): boolean {
  if (!config.token) {
    console.error('❌ DISCORD_TOKEN não encontrado no arquivo .env');
    return false;
  }

  if (!config.suggestionsChannelId) {
    console.error('❌ SUGGESTIONS_CHANNEL_ID não encontrado no arquivo .env');
    return false;
  }

  if (!config.guildId) {
    console.error('❌ GUILD_ID não encontrado no arquivo .env');
    return false;
  }

  return true;
}
