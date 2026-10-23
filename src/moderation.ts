import { Events, PermissionFlagsBits, GuildMember } from 'discord.js';
import { pruneUnverifiedMembers } from './automations.js';
import type { Client, ChatInputCommandInteraction } from 'discord.js';

export async function init(client: Client, config: any, serverConfig: any) {
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        // Enforce server boundary check using serverConfig
        if (serverConfig?.serverId && interaction.guildId !== serverConfig.serverId) return;

        // Ensure we are in a cached guild so member permissions and roles are fully available
        if (!interaction.inCachedGuild()) {
            return interaction.reply({
                content: 'This command can only be used within a server.',
                ephemeral: true
            });
        }

        const { commandName } = interaction;

        // Helper flags for feature toggles
        const isPruneEnabled = config?.prune?.enabled === true;
        const isFixUnverifiedEnabled = config?.fixUnverified?.enabled === true;
        const isRevokeMembershipEnabled = config?.revokeMembership?.enabled === true;

        // 1. Fix Unverified Role Command
        if (commandName === 'fixunverifiedrole') {
            if (!isFixUnverifiedEnabled) {
                return interaction.reply({
                    content: 'This command is disabled.',
                    ephemeral: true
                });
            }

            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.reply({
                    content: 'You do not have permission to use this command.',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            try {
                const roleId = config?.fixUnverified?.unverifiedRole;
                if (!roleId) {
                    return interaction.editReply('The unverified role ID is not configured.');
                }

                const unverifiedRole = await interaction.guild.roles.fetch(roleId);
                if (!unverifiedRole) {
                    return interaction.editReply('The unverified role could not be found on the server.');
                }

                const members = await interaction.guild.members.fetch();
                const rolelessMembers = members.filter(member => member.roles.cache.size === 1);

                if (rolelessMembers.size === 0) {
                    return interaction.editReply('No members found without roles.');
                }

                let successCount = 0;
                for (const [, member] of rolelessMembers) {
                    try {
                        await member.roles.add(unverifiedRole);
                        successCount++;
                    } catch (err) {
                        console.error(`Failed to assign role to ${member.user.tag}:`, err);
                    }
                }

                await interaction.editReply(`Successfully applied the unverified role to ${successCount} member(s).`);
            } catch (error) {
                await handleCommandError(interaction, error);
            }
        }

        // 2. Prune Unverified Members Command
        else if (commandName === 'pruneunverifiedmembers') {
            if (!isPruneEnabled) {
                return interaction.reply({
                    content: 'This command is disabled.',
                    ephemeral: true
                });
            }

            if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
                return interaction.reply({
                    content: 'You do not have permission to use this command.',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            try {
                const count = await pruneUnverifiedMembers(interaction.guild, config);
                await interaction.editReply(`Prune complete. Successfully kicked ${count ?? 0} unverified member(s).`);
            } catch (error) {
                await handleCommandError(interaction, error);
            }
        }

        // 3. Revoke Membership Command
        else if (commandName === 'revokemembership') {
            if (!isRevokeMembershipEnabled) {
                return interaction.reply({
                    content: 'This command is disabled.',
                    ephemeral: true
                });
            }

            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.reply({
                    content: 'You do not have permission to use this command.',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            try {
                const revokeConfig = config?.revokeMembership;
                const verifiedRoleId = revokeConfig?.verifiedRole;

                if (!verifiedRoleId) {
                    return interaction.editReply('The verified role ID is not configured.');
                }

                const targetMember = interaction.options.getMember('target');
                if (!targetMember || !(targetMember instanceof GuildMember)) {
                    return interaction.editReply('Could not find that member in this server.');
                }

                // Remove the verified role
                await targetMember.roles.remove(verifiedRoleId);

                const rolesToAdd: string[] = [];
                const deniedRoleId = revokeConfig?.deniedRole;
                const bypassRoleId = revokeConfig?.bypassRole;

                // Safely append optional roles only if defined
                if (deniedRoleId) rolesToAdd.push(deniedRoleId);
                if (bypassRoleId) rolesToAdd.push(bypassRoleId);

                if (rolesToAdd.length > 0) {
                    await targetMember.roles.add(rolesToAdd);
                }

                await interaction.editReply(`Successfully revoked membership for ${targetMember.user.tag}.`);
            } catch (error) {
                await handleCommandError(interaction, error);
            }
        }
    });
}

async function handleCommandError(interaction: ChatInputCommandInteraction, error: unknown) {
    console.error(`Error during /${interaction.commandName}:`, error);

    const err = error as any;
    if (err?.name === 'GatewayRateLimitError' || err?.data?.retry_after) {
        const retryAfterSeconds = Math.ceil(err.data.retry_after);
        const readyTimestamp = Math.floor((Date.now() + (retryAfterSeconds * 1000)) / 1000);

        return await interaction.editReply(
            `This command is currently rate-linked by Discord. You can try again <t:${readyTimestamp}:R>.`
        );
    }

    const message = 'An unexpected error occurred while processing this command.';
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(message);
    } else {
        await interaction.reply({ content: message, ephemeral: true });
    }
}