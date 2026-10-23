import { Events } from 'discord.js';
import type { Client } from 'discord.js';

function wait(ms: number) { 
    return new Promise(resolve => setTimeout(resolve, ms)); 
}

export async function init(client: Client, config: any, serverConfig: any) {
    client.on(Events.InteractionCreate, async (interaction) => {
        // Enforce server boundary check using serverConfig
        if (serverConfig?.serverId && interaction.guildId !== serverConfig.serverId) return;
        if (!interaction.isChatInputCommand()) return;
        
        const { commandName } = interaction;
        
        // /willowmode Slash Command
        if (commandName === 'willowmode') {
            await interaction.reply("willow is sooo cool");
            await wait(1000);
            await interaction.followUp("and theyre NOT tiny");
            return;
        }
        
        // /squeakymode Slash Command
        if (commandName === 'squeakymode') {
            await interaction.reply("squeaky is soo itty bitty and tiny");
            await wait(1000);
            await interaction.followUp("vewy smol");
            return;
        }
    });
    
    client.on(Events.MessageCreate, async (message) => {
        // Enforce server boundary check using serverConfig
        if (serverConfig?.serverId && message.guild?.id !== serverConfig.serverId) return;
        if (message.author.bot) return;
        
        const botPinged = client.user ? message.mentions.has(client.user.id) : false;
        const textMessage = message.content.toLowerCase();
        const emojiMessage = message.content;
        
        // -------- Emoji Easter Eggs --------
        
        // Bite
        if (botPinged && emojiMessage.includes("<:bite:1465757765426348187>")) {
            await message.reply("HEY! That hurt!! Please don't bite me :c");
            return;
        }
        
        // -------- Keyword Easter Eggs --------
        
        // Vibe Coded Easter Egg
        if (botPinged && textMessage.includes('vibe') && textMessage.includes('coded')) {
            await message.reply("Yesn't");
            return;
        }
        
        // Funny (Im big)
        const bigRegex = /\b(i|im|i'm)\s+(am\s+)?big\b/i;
        if (bigRegex.test(textMessage)) {
            await message.reply(`hey ${message.author}! lying is bad, tiny <:accuse_baby:1473496890627592353>`);
            return;
        }
    });
}