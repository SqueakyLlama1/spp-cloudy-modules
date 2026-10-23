import { Client } from "discord.js";

const rules = {
    "1.0": "All content must remain non-explicit and appropriate for minors. Sexual, fetish-oriented, or otherwise inappropriate content is prohibited, including in messages, jokes, media, audio, roleplay, profiles, and links.",

    "1.1": "Potentially triggering topics, including violence, drug use, abuse, and serious mental health discussions, belong in 🫂┆sensitive-topics when appropriate. Graphic or disturbing content is not permitted.",

    "1.2": "Age regression, baby talk, and regression-related behavior are welcome throughout general social spaces. Please avoid bringing baby talk or regression roleplay into special-purpose channels where it would be off-topic, such as media, support, or information channels.",

    "1.3": "Diaper and regression gear discussions must remain non-sexual and appropriate. Do not post images of yourself actively wearing diapers or similarly intimate personal content anywhere in the server.",

    "1.4": "Regression-related artwork must remain SFW and belong in its appropriate channel. Bodily waste, fetishistic content, gore, excessive blood, shock content, and NSFL material are prohibited.",

    "1.5": "Do not publicly share private DM screenshots or personal information without permission. If evidence is needed for a report, provide it privately to staff.",

    "2.0": "Respect other members' boundaries both in the server and in DMs. Do not pressure, harass, manipulate, or repeatedly contact someone after being asked to stop.",

    "2.1": "All interactions must remain strictly SFW and appropriate. Be mindful of age differences, especially when interacting with younger members. Sexual, exploitative, or grooming-related behavior results in immediate removal.",

    "2.2": "Treat others respectfully. Harassment, bullying, discrimination, targeted insults, ragebaiting, and deliberate conflict are not permitted. If a situation escalates, disengage and contact staff.",

    "2.3": "Political or religious debates, public accusations, and deliberately inflammatory discussions are not permitted in public channels. Personal disputes should be handled through tickets or staff.",

    "2.4": "This is an age regression community, not a matchmaking or relationship-seeking server. Do not use the server primarily to search for caregivers, littles, partners, or similar relationships.",

    "2.5": "Follow reasonable staff instructions and communicate respectfully. If you disagree with a decision, use the appropriate ticket or appeal process rather than creating public conflict.",

    "2.6": "Attempting to exploit loopholes or intentionally bypass the spirit of the rules may result in moderation action. Not every inappropriate behavior can be specifically listed—use reasonable judgment."
};

export async function init(client: Client) {
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        const contentLower = message.content.toLowerCase();
        
        if (!contentLower.includes('rule')) return;

        for (const ruleKey of Object.keys(rules) as Array<keyof typeof rules>) {
            const lowerRuleKey = ruleKey.toLowerCase();

            const regex = new RegExp(`\\b${lowerRuleKey}\\b`);
            
            if (regex.test(contentLower)) {
                const presetMessage = `${ruleKey} - ${rules[ruleKey]}`;
                await message.reply(presetMessage);
                return; 
            }
        }
    });
};