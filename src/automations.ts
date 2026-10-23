import cron from 'node-cron';
import type { GuildMember, Client, Guild } from 'discord.js';

export async function init(client: Client, config: any, serverConfig: any) {
    // 1. Automatically assign the join role when a member joins
    client.on('guildMemberAdd', async (member: GuildMember) => {
        const joinRoleConfig = config?.joinRole;

        if (!joinRoleConfig?.enabled) return;

        try {
            const roleId = joinRoleConfig.role;
            if (!roleId) return;

            const freshMember = await member.fetch();
            if (freshMember.roles.cache.has(roleId)) return;

            const joinRole = await member.guild.roles.fetch(roleId);
            if (joinRole) {
                await freshMember.roles.add(joinRole);
            }
        } catch (error) {
            console.error('Failed to assign join role on member join:', error);
        }
    });

    // 2. Scheduled Cron Job for Unverified Pruning
    const autoPruneConfig = config?.autoUnverifiedPrune;
    const cronSchedule = autoPruneConfig?.["check-interval"] || '0 */6 * * *'; // Defaults to every 6 hours

    cron.schedule(cronSchedule, async () => {
        if (!autoPruneConfig?.enabled) return;

        console.log('Running scheduled unverified member prune task...');

        try {
            const guild = await client.guilds.fetch(serverConfig.serverId);
            if (guild) {
                await pruneUnverifiedMembers(guild, config);
            }
        } catch (error) {
            console.error('Scheduled prune task failed:', error);
        }
    });
}

export const pruneUnverifiedMembers = async (guild: Guild, config: any) => {
    try {
        const pruneConfig = config?.prune;
        const autoPruneConfig = pruneConfig?.['auto-prune'];

        const unverifiedId = pruneConfig?.unverifiedRole;
        const verifiedId = pruneConfig?.verifiedRole;
        const pendingId = pruneConfig?.pendingRole;
        const deniedId = pruneConfig?.deniedRole;
        const bypassId = config?.moderation?.revokeMembership?.bypassRole;

        const maxAgeDays = autoPruneConfig?.['joined-after-days'] ?? 3;
        const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
        const now = Date.now();

        const members = await guild.members.cache;
        let kickedCount = 0;

        for (const [memberId] of members) {
            try {
                const member = await guild.members.fetch({ user: memberId, force: true });

                const hasUnverified = unverifiedId ? member.roles.cache.has(unverifiedId) : false;
                const hasVerified = verifiedId ? member.roles.cache.has(verifiedId) : false;
                const hasPending = pendingId ? member.roles.cache.has(pendingId) : false;
                const hasDenied = deniedId ? member.roles.cache.has(deniedId) : false;
                const hasBypass = bypassId ? member.roles.cache.has(bypassId) : false;

                const joinedAt = member.joinedTimestamp;
                const isOlderThanMaxAge = joinedAt && (now - joinedAt) >= maxAgeMs;

                if (hasVerified && hasUnverified) {
                    await member.roles.remove(unverifiedId);
                }

                if (!hasBypass && (hasDenied || (hasUnverified && !hasPending && isOlderThanMaxAge))) {
                    await member.kick(`Auto-pruned unverified or denied member after ${maxAgeDays} day(s).`);
                    kickedCount++;
                    console.log(`Pruned member: ${member.user.tag}`);
                }
            } catch (err: any) {
                if (err.status === 429) {
                    const retryAfter = err.data?.retry_after ? Math.ceil(err.data.retry_after * 1000) : 5000;
                    console.warn(`Rate limited during prune loop. Pausing for ${retryAfter}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter));
                } else {
                    console.error(`Failed to process member ${memberId}:`, err.message);
                }
            }
        }

        console.log(`Completed prune operation. Total kicked: ${kickedCount}`);
        return kickedCount;
    } catch (error) {
        console.error('Error during live unverified prune operation:', error);
        return 0;
    }
};