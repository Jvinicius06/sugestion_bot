import { REST, Routes, Client, GatewayIntentBits } from 'discord.js';
import { config, validateConfig } from './config';
import * as editCommand from './commands/edit';

// Validar configurações
if (!validateConfig()) {
  console.error('❌ Configuração inválida. Verifique o arquivo .env');
  process.exit(1);
}

const commands = [
  editCommand.data.toJSON()
];

// Criar cliente temporário só para obter o ID
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

(async () => {
  try {
    console.log('🔄 Conectando ao Discord...');
    await client.login(config.token);

    const clientId = client.user!.id;
    console.log(`✅ Conectado como ${client.user!.tag}`);
    console.log(`🔄 Registrando ${commands.length} comando(s)...`);

    const rest = new REST().setToken(config.token);

    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, config.guildId),
      { body: commands },
    ) as any[];

    console.log(`✅ ${data.length} comando(s) registrado(s) com sucesso!`);
    console.log('📝 Comandos:', data.map((cmd: any) => `/${cmd.name}`).join(', '));

    client.destroy();
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
    process.exit(1);
  }
})();
