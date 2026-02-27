# Discord Rust Link Bot

Bot Discord para linkar contas Discord com servidores Rust e conceder permissões automaticamente.

## 🚀 Funcionalidades

- Linkagem de contas Discord com Steam ID
- Concessão automática de permissões no Oxide
- Comandos Discord (`/link`, `/status`, `/bug`)
- **Backlog / BUG**: abertura de atividades no formato Scrum com perguntas padrão e refinamento via LLM (OpenAI)
- API REST para integração
- Sistema de verificação por código

## 📋 Pré-requisitos

- Node.js 18+
- Bot Discord criado no [Discord Developer Portal](https://discord.com/developers/applications)
- Acesso ao servidor Rust com Oxide/Carbon
- Coolify (para deploy)

## 🔧 Configuração

### 1. Criar Bot no Discord

1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Crie uma nova aplicação
3. Vá em "Bot" e crie um bot
4. Copie o **Token**
5. Em "OAuth2 > URL Generator":
   - Selecione escopos: `bot`, `applications.commands`
   - Selecione permissões: `Send Messages`, `Use Slash Commands`
   - Copie a URL e adicione o bot ao servidor

### 2. Configurar Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```env
DISCORD_BOT_TOKEN=seu_token_aqui
PORT=3000
OXIDE_PERMISSIONS_PATH=/data/oxide/users.json
PERMISSION_NAME=kits.linkdiscord

# Backlog / BUG (opcional)
OPEN_API_KEY=sk-...          # Chave da API OpenAI para refinar textos
OPEN_API_URL=https://api.openai.com/v1
BACKLOG_CHANNEL_ID=           # ID do canal onde as atividades de backlog serão publicadas (vazio = mesmo canal do comando)
BACKLOG_WEBHOOK_URL=          # URL do webhook do Discord para enviar backlog para um canal (lista + novos bugs)
```

### 3. Deploy no Coolify

1. Crie um novo projeto no Coolify
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente
4. Configure o volume para o arquivo de permissões:
   - Host: `/caminho/para/seu/servidor/data/oxide/users.json`
   - Container: `/data/oxide/users.json`
5. Deploy!

## 📝 Uso

### No Discord

1. Use `/link <steamid>` para gerar um código
2. Entre no servidor Rust
3. Digite no chat: `/linkdiscord <código>`
4. Pronto! Você receberá a permissão automaticamente

### Comandos Disponíveis

- `/link <steamid>` - Gera código para linkar conta
- `/status` - Verifica status da linkagem
- `/bug` - Abre formulário para registrar um BUG / atividade de backlog (perguntas padrão Scrum; texto refinado por IA se `OPEN_API_KEY` estiver configurada). Cada atividade aparece com botões **Em progresso** e **Concluído** para mover na lista.
- `/backlog-board` - Cria ou atualiza a mensagem de **lista todo** neste canal (To Do → In Progress → Completed). A lista é atualizada automaticamente ao abrir bugs ou ao clicar nos botões.

## 🔌 API Endpoints

### POST `/api/verify`
Verifica código e linka conta

```json
{
  "code": "ABC123",
  "steamId": "76561198825712608"
}
```

### GET `/api/check/:steamId`
Verifica se Steam ID está linkado

### GET `/health`
Health check

## 📁 Estrutura de Arquivos

```
discord-link-bot/
├── src/
│   ├── index.js          # Bot principal
│   ├── backlog.js        # Backlog / BUG (modal + LLM)
│   ├── permissions.js    # Gerenciamento de permissões
│   └── auth.js           # Autenticação (futuro)
├── data/
│   └── linked-accounts.json  # Contas linkadas
├── Dockerfile
├── package.json
└── README.md
```

## 🔒 Segurança

- Códigos de verificação expiram em 10 minutos
- Validação de Steam ID (17 dígitos)
- Verificação de duplicatas
- Logs de todas as operações

## 🛠️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Desenvolvimento com hot-reload
npm run dev

# Produção
npm start
```

## 📞 Suporte

Para problemas ou dúvidas, abra uma issue no repositório.

## 📄 Licença

MIT

