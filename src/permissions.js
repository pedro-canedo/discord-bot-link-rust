const fs = require('fs-extra');
const path = require('path');

const PERMISSIONS_FILE = process.env.OXIDE_PERMISSIONS_PATH || '/data/oxide/users.json';
const LINKED_ACCOUNTS_FILE = path.join(__dirname, '../data/linked-accounts.json');

// Garantir que o diretório de dados existe
async function ensureDataDir() {
    await fs.ensureDir(path.dirname(LINKED_ACCOUNTS_FILE));
    await fs.ensureFile(LINKED_ACCOUNTS_FILE);
}

// Linkar conta Discord com Steam ID
async function linkAccount(discordId, steamId) {
    try {
        await ensureDataDir();
        
        const data = await fs.readJSON(LINKED_ACCOUNTS_FILE).catch(() => ({}));
        
        // Verificar se já existe linkagem
        if (data[discordId]) {
            return { success: false, error: 'Conta já está linkada' };
        }

        // Verificar se Steam ID já está linkado
        const existingLink = Object.values(data).find(account => account.steamId === steamId);
        if (existingLink) {
            return { success: false, error: 'Este Steam ID já está linkado a outra conta Discord' };
        }

        // Salvar linkagem
        data[discordId] = {
            steamId: steamId,
            linkedAt: new Date().toISOString(),
            permissionGranted: false
        };

        await fs.writeJSON(LINKED_ACCOUNTS_FILE, data, { spaces: 2 });
        
        return { success: true };
    } catch (error) {
        console.error('Erro ao linkar conta:', error);
        return { success: false, error: error.message };
    }
}

// Conceder permissão no Oxide
async function grantPermission(steamId, permissionName) {
    try {
        // Ler arquivo de permissões do Oxide
        let permissionsData = {};
        
        if (await fs.pathExists(PERMISSIONS_FILE)) {
            permissionsData = await fs.readJSON(PERMISSIONS_FILE);
        }

        // Garantir que o usuário existe no arquivo
        if (!permissionsData[steamId]) {
            permissionsData[steamId] = {
                perms: [],
                groups: []
            };
        }

        // Adicionar permissão se não existir
        if (!permissionsData[steamId].perms) {
            permissionsData[steamId].perms = [];
        }

        if (!permissionsData[steamId].perms.includes(permissionName)) {
            permissionsData[steamId].perms.push(permissionName);
            
            // Salvar arquivo
            await fs.writeJSON(PERMISSIONS_FILE, permissionsData, { spaces: 2 });
            
            // Atualizar arquivo de linkagem
            await updateLinkedAccountPermission(steamId, true);
            
            console.log(`✅ Permissão ${permissionName} concedida para Steam ID: ${steamId}`);
            return { success: true };
        } else {
            console.log(`ℹ️ Permissão ${permissionName} já existe para Steam ID: ${steamId}`);
            return { success: true, alreadyExists: true };
        }
    } catch (error) {
        console.error('Erro ao conceder permissão:', error);
        return { success: false, error: error.message };
    }
}

// Revogar permissão
async function revokePermission(steamId, permissionName) {
    try {
        if (!await fs.pathExists(PERMISSIONS_FILE)) {
            return { success: false, error: 'Arquivo de permissões não encontrado' };
        }

        const permissionsData = await fs.readJSON(PERMISSIONS_FILE);

        if (permissionsData[steamId] && permissionsData[steamId].perms) {
            permissionsData[steamId].perms = permissionsData[steamId].perms.filter(
                perm => perm !== permissionName
            );

            await fs.writeJSON(PERMISSIONS_FILE, permissionsData, { spaces: 2 });
            console.log(`✅ Permissão ${permissionName} revogada para Steam ID: ${steamId}`);
            return { success: true };
        }

        return { success: false, error: 'Usuário não encontrado' };
    } catch (error) {
        console.error('Erro ao revogar permissão:', error);
        return { success: false, error: error.message };
    }
}

// Atualizar status de permissão no arquivo de linkagem
async function updateLinkedAccountPermission(steamId, granted) {
    try {
        const data = await fs.readJSON(LINKED_ACCOUNTS_FILE).catch(() => ({}));
        
        const account = Object.values(data).find(acc => acc.steamId === steamId);
        if (account) {
            account.permissionGranted = granted;
            account.permissionGrantedAt = new Date().toISOString();
            await fs.writeJSON(LINKED_ACCOUNTS_FILE, data, { spaces: 2 });
        }
    } catch (error) {
        console.error('Erro ao atualizar status de permissão:', error);
    }
}

// Verificar se tem permissão
async function hasPermission(steamId, permissionName) {
    try {
        if (!await fs.pathExists(PERMISSIONS_FILE)) {
            return false;
        }

        const permissionsData = await fs.readJSON(PERMISSIONS_FILE);
        
        if (permissionsData[steamId] && permissionsData[steamId].perms) {
            return permissionsData[steamId].perms.includes(permissionName);
        }

        return false;
    } catch (error) {
        console.error('Erro ao verificar permissão:', error);
        return false;
    }
}

module.exports = {
    linkAccount,
    grantPermission,
    revokePermission,
    hasPermission
};

