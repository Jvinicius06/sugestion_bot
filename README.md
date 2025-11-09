# Bot de Sugestões Discord

Bot completo para gerenciar sugestões em servidores Discord com sistema de votação e discussão em threads.

## Funcionalidades

- **Captura automática de mensagens**: Transforma mensagens em embeds formatados
- **Sistema de votação**: Botões de upvote/downvote com contagem em tempo real
- **Threads de discussão**: Cria automaticamente threads para cada sugestão
- **Banco de dados persistente**: Todos os votos são salvos em SQLite
- **Votos flexíveis**: Usuários podem mudar ou remover seus votos
- **Sincronização automática de nicknames**: Atualiza automaticamente os embeds quando o nickname de um usuário mudar (a cada 5 minutos)

## Requisitos

- Node.js 18+
- npm ou yarn
- Bot do Discord criado no [Discord Developer Portal](https://discord.com/developers/applications)

## Instalação

### 1. Clone ou baixe o projeto

```bash
cd sujestion_bot
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o bot no Discord

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em "New Application" e dê um nome ao bot
3. Vá em "Bot" no menu lateral
4. Clique em "Reset Token" e copie o token (guarde em local seguro)
5. Em "Privileged Gateway Intents", ative:
   - `MESSAGE CONTENT INTENT` (obrigatório)
   - `SERVER MEMBERS INTENT` (obrigatório - necessário para sincronização de nicknames)
   - `PRESENCE INTENT` (opcional)
6. Vá em "OAuth2" > "URL Generator"
7. Selecione os scopes:
   - `bot`
8. Selecione as permissões:
   - `Send Messages`
   - `Manage Messages` (para deletar mensagens originais)
   - `Embed Links`
   - `Create Public Threads`
   - `Send Messages in Threads`
   - `Read Message History`
9. Copie o URL gerado e adicione o bot ao seu servidor

### 4. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e preencha com suas informações:

```env
DISCORD_TOKEN=seu_token_do_bot_aqui
SUGGESTIONS_CHANNEL_ID=id_do_canal_de_sugestoes
GUILD_ID=id_do_seu_servidor
```

**Como obter os IDs:**
1. Ative o "Modo Desenvolvedor" no Discord (Configurações > Avançado > Modo Desenvolvedor)
2. Clique com botão direito no canal/servidor e selecione "Copiar ID"

### 5. Compile o projeto

```bash
npm run build
```

### 6. Execute o bot

**Modo desenvolvimento (com hot reload):**
```bash
npm run dev
```

**Modo produção:**
```bash
npm start
```

## Instalação com Docker (Recomendado para Servidores)

### Pré-requisitos
- Docker instalado
- Docker Compose instalado

### 1. Configure as variáveis de ambiente

Crie o arquivo `.env` com suas credenciais:

```bash
cp .env.example .env
```

Edite o `.env` com suas informações (mesmo processo da instalação manual).

### 2. Inicie o bot com Docker Compose

```bash
# Construir e iniciar o container
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f

# Parar o bot
docker-compose down

# Reiniciar o bot
docker-compose restart

# Reconstruir após mudanças no código
docker-compose up -d --build
```

### 3. Gerenciamento

**Ver status:**
```bash
docker-compose ps
```

**Ver logs:**
```bash
docker-compose logs -f suggestion-bot
```

**Atualizar o bot:**
```bash
# Parar o container
docker-compose down

# Puxar alterações do código (se usar git)
git pull

# Reconstruir e iniciar
docker-compose up -d --build
```

### Vantagens do Docker

- Isolamento completo do ambiente
- Reinício automático em caso de falhas
- Fácil deploy em servidores
- Banco de dados persistente em volume
- Gerenciamento de recursos (CPU/memória)

## Estrutura do Projeto

```
sujestion_bot/
├── src/
│   ├── events/
│   │   ├── messageCreate.ts      # Handler para novas mensagens
│   │   └── interactionCreate.ts  # Handler para botões de votação
│   ├── services/
│   │   └── syncNicknames.ts      # Sincronização automática de nicknames
│   ├── utils/
│   │   └── embed.ts              # Criação e atualização de embeds
│   ├── config.ts                 # Configurações do bot
│   ├── database.ts               # Setup do SQLite
│   └── index.ts                  # Arquivo principal
├── .env                          # Variáveis de ambiente (não commitado)
├── .env.example                  # Exemplo de configuração
├── Dockerfile                    # Configuração Docker
├── docker-compose.yml            # Orquestração Docker
├── .dockerignore                 # Arquivos ignorados pelo Docker
├── package.json
├── tsconfig.json
└── README.md
```

## Como Usar

1. **Postar uma sugestão**: Qualquer membro pode enviar uma mensagem no canal de sugestões
2. **Votação**: Clique nos botões 👍 ou 👎 para votar
3. **Mudar voto**: Clique no outro botão para trocar seu voto
4. **Remover voto**: Clique no mesmo botão para remover seu voto
5. **Discussão**: Use a thread criada automaticamente para discutir a sugestão

## Sincronização de Nicknames

O bot atualiza automaticamente os nicknames nos embeds de sugestões:

- **Quando**: A cada 5 minutos (configurável)
- **O que verifica**: Sugestões dos últimos 7 dias
- **Como funciona**: Busca o nickname atual do membro e atualiza o embed se houver mudança
- **Útil para**: Servidores com bots de roleplay que alteram nicknames frequentemente

Para alterar o intervalo de sincronização, edite o arquivo `src/index.ts:30`:
```typescript
startNicknameSync(client, 5); // Altere 5 para o intervalo desejado em minutos
```

## Banco de Dados

O bot usa SQLite para armazenar:
- **suggestions**: Informações sobre cada sugestão (autor, conteúdo, IDs)
- **votes**: Votos dos usuários (tipo de voto, timestamp)

O arquivo `suggestions.db` é criado automaticamente na primeira execução.

## Scripts Disponíveis

- `npm run build` - Compila TypeScript para JavaScript
- `npm start` - Executa o bot compilado
- `npm run dev` - Executa em modo desenvolvimento
- `npm run watch` - Compila TypeScript em modo watch

## Solução de Problemas

### Bot não está online
- Verifique se o token está correto no arquivo `.env`
- Certifique-se de que os intents estão ativados no Discord Developer Portal

### Mensagens não são capturadas
- Verifique se o `SUGGESTIONS_CHANNEL_ID` está correto
- Confirme que o bot tem permissão `MESSAGE CONTENT INTENT`

### Botões não funcionam
- Verifique se o bot tem permissões de `Send Messages` e `Embed Links`

### Thread não é criada
- Confirme que o bot tem permissão `Create Public Threads`
- Verifique se o canal é um canal de texto (não funciona em threads ou fóruns)

### Nicknames não são atualizados
- Verifique se o `SERVER MEMBERS INTENT` está ativado no Discord Developer Portal
- Confira os logs do console para ver se há erros de sincronização
- A sincronização verifica apenas sugestões dos últimos 7 dias

### Problemas com Docker

**Container não inicia:**
```bash
# Verificar logs
docker-compose logs

# Verificar se o .env existe e está configurado
ls -la .env
```

**Banco de dados não persiste:**
```bash
# Verificar se o volume foi criado
docker-compose down
docker-compose up -d

# O arquivo suggestions.db deve estar no diretório raiz
ls -la suggestions.db
```

**Recriar do zero:**
```bash
# Parar e remover tudo
docker-compose down -v

# Reconstruir
docker-compose up -d --build
```

## Licença

MIT

## Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.
