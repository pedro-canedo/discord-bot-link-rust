# Guia de Deploy no Coolify

## 📋 Passo a Passo

### 1. Preparar Repositório

1. Faça push do código para seu repositório GitHub
2. Certifique-se de que todos os arquivos estão commitados

### 2. Configurar no Coolify

1. **Criar Novo Projeto**
   - Acesse seu Coolify
   - Clique em "New Resource"
   - Selecione "Docker Compose" ou "Dockerfile"

2. **Conectar Repositório**
   - Selecione seu repositório GitHub
   - Branch: `main` ou `master`
   - Build Pack: `Dockerfile`

3. **Configurar Variáveis de Ambiente**

   Adicione as seguintes variáveis:

   ```
   DISCORD_BOT_TOKEN=seu_token_do_bot
   PORT=3000
   OXIDE_PERMISSIONS_PATH=/data/oxide/users.json
   PERMISSION_NAME=kits.linkdiscord
   ```

4. **Configurar Volumes**

   Se o arquivo de permissões estiver em outro servidor:

   **Opção A: Volume Local (se mesmo servidor)**
   ```
   Host: /caminho/completo/para/data/oxide/users.json
   Container: /data/oxide/users.json
   ```

   **Opção B: Volume NFS/Network (se servidor diferente)**
   - Configure um volume de rede
   - Monte no caminho `/data/oxide/users.json`

   **Opção C: API/Webhook (recomendado para servidores remotos)**
   - Configure um webhook no Oxide
   - O bot pode atualizar via API HTTP

5. **Configurar Porta**

   - Porta do Container: `3000`
   - Porta Pública: `3000` (ou outra de sua escolha)

6. **Deploy**

   - Clique em "Deploy"
   - Aguarde o build e start

### 3. Verificar Funcionamento

1. **Logs do Container**
   ```bash
   # No Coolify, vá em Logs
   # Deve aparecer:
   ✅ Bot conectado como NomeDoBot#1234
   ✅ Comandos registrados
   🚀 Servidor rodando na porta 3000
   ```

2. **Testar API**
   ```bash
   curl http://seu-servidor:3000/health
   # Deve retornar: {"status":"ok","timestamp":"..."}
   ```

3. **Testar no Discord**
   - Use `/link` no servidor Discord
   - Deve gerar um código

### 4. Configurar Plugin Rust

1. Copie `DiscordLink.cs` para `plugins/`
2. Configure `config/DiscordLink.json`:
   ```json
   {
     "ApiUrl": "http://ip-do-coolify:3000",
     "PermissionName": "kits.linkdiscord",
     "CodeExpireMinutes": 10
   }
   ```
3. Recarregue o plugin: `oxide.reload DiscordLink`

## 🔧 Troubleshooting

### Bot não conecta
- Verifique se `DISCORD_BOT_TOKEN` está correto
- Verifique se o bot foi adicionado ao servidor Discord

### Erro ao escrever permissões
- Verifique se o volume está montado corretamente
- Verifique permissões do arquivo
- Verifique se o caminho está correto

### API não responde
- Verifique se a porta está exposta
- Verifique firewall
- Verifique logs do container

### Código não funciona
- Verifique se o plugin Rust está configurado com a URL correta
- Verifique conectividade entre servidores
- Verifique logs do bot e do plugin

## 📞 Suporte

Para mais ajuda, verifique os logs no Coolify ou abra uma issue.

