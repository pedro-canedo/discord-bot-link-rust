require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const { handleAuthCallback, generateAuthUrl } = require('./auth');
const { linkAccount, grantPermission } = require('./permissions');
const { createBugModal, handleBugModalSubmit, handleBacklogButton, setupBoardInChannel } = require('./backlog');

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Armazenar códigos de verificação temporários
const verificationCodes = new Map();

// Comando /link
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'link') {
        const steamId = interaction.options.getString('steamid');
        
        if (!steamId || !/^\d{17}$/.test(steamId)) {
            return interaction.reply({
                content: '❌ Steam ID inválido! Use um Steam ID de 17 dígitos.',
                ephemeral: true
            });
        }

        // Gerar código de verificação único
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        verificationCodes.set(interaction.user.id, {
            steamId: steamId,
            discordId: interaction.user.id,
            timestamp: Date.now(),
            code: code
        });

        // Limpar códigos antigos (mais de 10 minutos)
        setTimeout(() => {
            verificationCodes.delete(interaction.user.id);
        }, 600000);

        const embed = new EmbedBuilder()
            .setTitle('🔗 Linkar Conta')
            .setDescription(`**Steam ID:** \`${steamId}\`\n**Código de Verificação:** \`${code}\``)
            .addFields(
                { name: '📋 Instruções', value: '1. Entre no servidor Rust\n2. Digite no chat: `/linkdiscord ' + code + '`\n3. Aguarde a confirmação!' }
            )
            .setColor(0x00AE86)
            .setFooter({ text: 'Código válido por 10 minutos' })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    if (interaction.commandName === 'status') {
        const linked = await checkIfLinked(interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Status da Conta')
            .setColor(linked ? 0x00FF00 : 0xFF0000)
            .setDescription(linked 
                ? '✅ Sua conta está linkada e você tem acesso ao kit!'
                : '❌ Sua conta não está linkada. Use `/link` para linkar.'
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    if (interaction.commandName === 'bug') {
        const modal = createBugModal();
        await interaction.showModal(modal);
    }

    if (interaction.commandName === 'backlog-board') {
        await interaction.deferReply({ ephemeral: true });
        await setupBoardInChannel(interaction, client);
        await interaction.editReply({ content: '✅ Quadro de backlog criado/atualizado neste canal.', ephemeral: true });
    }
});

// Modal submit (formulário de BUG) e botões do backlog
client.on('interactionCreate', async interaction => {
    if (interaction.isModalSubmit()) {
        const handled = await handleBugModalSubmit(interaction, client);
        if (handled) return;
    }
    if (interaction.isButton()) {
        const handled = await handleBacklogButton(interaction, client);
        if (handled) return;
    }
});

// Quando o bot está pronto
client.once('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    
    // Registrar comandos
    const commands = [
        {
            name: 'link',
            description: 'Linka sua conta Discord com o servidor Rust',
            options: [
                {
                    name: 'steamid',
                    type: 3,
                    description: 'Seu Steam ID (17 dígitos)',
                    required: true
                }
            ]
        },
        {
            name: 'status',
            description: 'Verifica o status da linkagem da sua conta'
        },
        {
            name: 'bug',
            description: 'Abre um BUG / atividade de backlog (formulários Scrum + lista todo)'
        },
        {
            name: 'backlog-board',
            description: 'Cria ou atualiza a mensagem de lista (To Do / In Progress / Completed) neste canal'
        }
    ];

    client.application.commands.set(commands);
    console.log('✅ Comandos registrados');
});

// API Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint para verificar código do jogo
app.post('/api/verify', async (req, res) => {
    try {
        const { code, steamId } = req.body;

        if (!code || !steamId) {
            return res.status(400).json({ error: 'Código e Steam ID são obrigatórios' });
        }

        // Encontrar código correspondente
        let foundEntry = null;
        for (const [discordId, entry] of verificationCodes.entries()) {
            if (entry.code === code.toUpperCase() && entry.steamId === steamId) {
                foundEntry = entry;
                foundEntry.discordId = discordId;
                break;
            }
        }

        if (!foundEntry) {
            return res.status(404).json({ error: 'Código inválido ou expirado' });
        }

        // Verificar se não expirou (10 minutos)
        if (Date.now() - foundEntry.timestamp > 600000) {
            verificationCodes.delete(foundEntry.discordId);
            return res.status(410).json({ error: 'Código expirado' });
        }

        // Linkar conta e conceder permissão
        const result = await linkAccount(foundEntry.discordId, steamId);
        
        if (result.success) {
            await grantPermission(steamId, process.env.PERMISSION_NAME || 'kits.linkdiscord');
            
            // Remover código usado
            verificationCodes.delete(foundEntry.discordId);
            
            // Notificar no Discord
            try {
                const user = await client.users.fetch(foundEntry.discordId);
                const embed = new EmbedBuilder()
                    .setTitle('✅ Conta Linkada!')
                    .setDescription('Sua conta Discord foi linkada com sucesso ao servidor Rust!')
                    .addFields(
                        { name: 'Steam ID', value: `\`${steamId}\``, inline: true },
                        { name: 'Permissão', value: `\`${process.env.PERMISSION_NAME || 'kits.linkdiscord'}\``, inline: true }
                    )
                    .setColor(0x00FF00)
                    .setTimestamp();

                await user.send({ embeds: [embed] }).catch(() => {});
            } catch (err) {
                console.error('Erro ao enviar DM:', err);
            }

            return res.json({ 
                success: true, 
                message: 'Conta linkada com sucesso!',
                discordId: foundEntry.discordId
            });
        } else {
            return res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Erro ao verificar código:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Endpoint para verificar se está linkado
app.get('/api/check/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        const linked = await checkIfLinkedBySteam(steamId);
        res.json({ linked, steamId });
    } catch (error) {
        console.error('Erro ao verificar linkagem:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// Conectar bot
client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
    console.error('❌ Erro ao conectar bot:', err);
    process.exit(1);
});

// Funções auxiliares
async function checkIfLinked(discordId) {
    try {
        const data = await fs.readJSON(path.join(__dirname, '../data/linked-accounts.json')).catch(() => ({}));
        return data[discordId] !== undefined;
    } catch {
        return false;
    }
}

async function checkIfLinkedBySteam(steamId) {
    try {
        const data = await fs.readJSON(path.join(__dirname, '../data/linked-accounts.json')).catch(() => ({}));
        return Object.values(data).some(account => account.steamId === steamId);
    } catch {
        return false;
    }
}

