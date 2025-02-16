import {
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandIntegerOption,
} from "@discordjs/builders";
import {
    CacheType,
    ChatInputCommandInteraction,
    GuildMember,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    Client,
    ButtonInteraction,
} from "discord.js";
import { Config } from "../config";
import { ErrorMessage, ResponseEmbed, SafeReply } from "../helpers/responses";
import { CommandType } from "../types";
import { NotInGuildResponse } from "./team/team-shared";

const pollModule: CommandType = {
    data: new SlashCommandBuilder()
        .setName("poll")
        .setDescription("Create a poll")
        .addStringOption(
            new SlashCommandStringOption()
                .setName("question")
                .setDescription("The question to ask")
                .setRequired(true)
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setName("mode")
                .setDescription("Poll mode - public results mention everyone, private DMs results to you")
                .setRequired(true)
                .addChoices(
                    { name: 'Public', value: 'public' },
                    { name: 'Private', value: 'private' }
                )
        )
        .addBooleanOption(option =>
            option.setName("ping")
                .setDescription("Should @everyone be notified about this poll?")
                .setRequired(true)
        )
        .addIntegerOption(
            new SlashCommandIntegerOption()
                .setName("minutes")
                .setDescription("How many minutes should the poll run for?")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1440) // Max 24 hours
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setName("option1")
                .setDescription("First option")
                .setRequired(true)
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setName("option2")
                .setDescription("Second option")
                .setRequired(true)
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setName("option3")
                .setDescription("Third option")
                .setRequired(false)
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setName("option4")
                .setDescription("Fourth option")
                .setRequired(false)
        ),
    deferMode: "NO-DEFER",
    execute: async (intr: ChatInputCommandInteraction<CacheType>) => {
        if (!intr.inGuild()) {
            return await SafeReply(intr, NotInGuildResponse());
        }

        // Check if user has moderator role
        const member = intr.member as GuildMember;
        const hasModRole = member.roles.cache.some(role => 
            Config.teams.moderator_roles.includes(role.name)
        );

        if (!hasModRole) {
            return await SafeReply(intr, ErrorMessage({
                title: "Permission Denied",
                message: "Only moderators can create polls."
            }));
        }

        const question = intr.options.getString("question", true);
        const mode = intr.options.getString("mode") ?? 'public';
        const shouldPing = intr.options.getBoolean("ping", true);
        const options = [
            intr.options.getString("option1", true),
            intr.options.getString("option2", true),
            intr.options.getString("option3", false),
            intr.options.getString("option4", false),
        ].filter((opt): opt is string => opt !== null);

        const minutes = intr.options.getInteger("minutes", true);
        const endTime = Date.now() + minutes * 60 * 1000;

        // Create buttons for voting
        const row = new ActionRowBuilder<ButtonBuilder>();
        const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];
        
        options.forEach((option, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`vote;${intr.id};${index}`)
                    .setLabel(option)
                    .setEmoji(emojis[index])
                    .setStyle(ButtonStyle.Primary)
            );
        });

        // Create embed for poll
        const embed = ResponseEmbed()
            .setTitle("📊 " + question)
            .setDescription(
                options.map((opt, i) => `${emojis[i]} ${opt}`).join("\n\n") +
                `\n\nPoll ends <t:${Math.floor(endTime / 1000)}:R>`
            );

        const message = await intr.reply({
            content: shouldPing ? "@everyone" : undefined,
            embeds: [embed],
            components: [row],
            allowedMentions: shouldPing ? { parse: ['everyone'] } : { parse: [] }
        }).then(response => response.fetch());

        // Store poll data
        activePollStore.set(intr.id, {
            messageId: message.id,
            channelId: message.channelId,
            endTime,
            options,
            votes: new Map(),
            question,
            mode,
            creatorId: intr.user.id,
            shouldPing
        });

        // Set timeout to end poll
        setTimeout(() => endPoll(intr.client as Client, intr.id), minutes * 60 * 1000);
    },
};

// Store active polls
export const activePollStore = new Map<string, {
    messageId: string;
    channelId: string;
    endTime: number;
    options: string[];
    votes: Map<string, number>;
    question: string;
    mode: string;
    creatorId: string;
    shouldPing: boolean;
}>();

async function endPoll(client: Client, pollId: string) {
    const poll = activePollStore.get(pollId);
    if (!poll) return;

    const channel = client.channels.cache.get(poll.channelId);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    // Count votes
    const voteCounts = poll.options.map((_, index) => 
        Array.from(poll.votes.values()).filter(vote => vote === index).length
    );

    // Find winner(s)
    const maxVotes = Math.max(...voteCounts);
    const winners = poll.options.filter((_, i) => voteCounts[i] === maxVotes);

    // Create results embed
    const resultsEmbed = new EmbedBuilder()
        .setColor(Config.bot_info.color)
        .setTitle("📊 Poll Results: " + poll.question)
        .setDescription(
            poll.options.map((opt, i) => 
                `${opt}: ${voteCounts[i]} votes`
            ).join("\n\n") +
            "\n\n" +
            (winners.length === 1
                ? `🎉 Winner: ${winners[0]}`
                : `🎉 Tie between: ${winners.join(", ")}`)
        );

    // Try to update original message, but don't let it block the rest of the function
    try {
        const message = await channel.messages.fetch(poll.messageId);
        await message.edit({ components: [] });
    } catch (error) {
        // Original message might have been deleted, continue anyway
    }

    // Handle results based on mode
    if (poll.mode === 'public') {
        // Send results to channel with @everyone
        try {
            await channel.send({
                content: "@everyone The poll has ended!",
                embeds: [resultsEmbed]
            });
        } catch {
            // If sending fails, try without @everyone
            try {
                await channel.send({
                    content: "The poll has ended!",
                    embeds: [resultsEmbed]
                });
            } catch {
                // If all sending attempts fail, just log and continue
                console.error("Failed to send poll results to channel");
            }
        }
    } else {
        // Send results privately to poll creator
        try {
            const creator = await client.users.fetch(poll.creatorId);
            await creator.send({
                content: "Your poll has ended! Here are the results:",
                embeds: [resultsEmbed]
            });

            // Send a message in the channel that the poll has ended
            await channel.send({
                content: "The poll has ended!",
            });
        } catch (error) {
            console.error("Failed to DM results to poll creator:", error);
        }
    }

    // Clean up
    activePollStore.delete(pollId);
}

// Add this function to handle vote button clicks
export async function handlePollVote(interaction: ButtonInteraction) {
    const [_, pollId, optionIndex] = interaction.customId.split(";");
    const poll = activePollStore.get(pollId);
    
    if (!poll) {
        return await interaction.reply({
            content: "This poll has ended or is no longer valid.",
            ephemeral: true
        });
    }

    const userId = interaction.user.id;
    const newVote = parseInt(optionIndex);
    const oldVote = poll.votes.get(userId);

    // Update the vote
    poll.votes.set(userId, newVote);

    // Create response message
    let response = `You voted for: ${poll.options[newVote]}`;
    if (oldVote !== undefined && oldVote !== newVote) {
        response += `\n(Changed from: ${poll.options[oldVote]})`;
    }

    // Update the interaction
    await interaction.reply({
        content: response,
        ephemeral: true
    });
}

export { pollModule as command }; 