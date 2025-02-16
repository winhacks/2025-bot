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
        
        options.forEach((_, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`vote;${intr.id};${index}`)
                    .setLabel(`Option ${index + 1}`)
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
            embeds: [embed],
            components: [row],
        }).then(response => response.fetch());

        // Store poll data
        activePollStore.set(intr.id, {
            messageId: message.id,
            channelId: message.channelId,
            endTime,
            options,
            votes: new Map(),
            question
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

    // Update original message and send results
    const message = await channel.messages.fetch(poll.messageId);
    await message.edit({ components: [] });
    await channel.send({
        content: "@everyone The poll has ended!",
        embeds: [resultsEmbed]
    });

    // Clean up
    activePollStore.delete(pollId);
}

export { pollModule as command }; 