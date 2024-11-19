import {channelMention, hyperlink, SlashCommandBuilder} from "@discordjs/builders";
import {CacheType, ChatInputCommandInteraction} from "discord.js";
import {Config} from "../config";
import {ResponseEmbed, SafeReply} from "../helpers/responses";
import {CommandType} from "../types";

const applyModule: CommandType = {
    data: new SlashCommandBuilder()
        .setName("apply")
        .setDescription("Instructions for how to apply."),
    deferMode: "NO-DEFER",
    execute: async (intr: ChatInputCommandInteraction<CacheType>) => {
        const verifyChannelId = Config.verify.channel_id;

        let onlineLink = hyperlink("online", Config.verify.registration_url);
        let applyInstructions = `To apply, first register ${onlineLink}`;

        let verifyInstructions = verifyChannelId
            ? `head over to ${channelMention(verifyChannelId)} and`
            : "";
        verifyInstructions += " use `/verify` to verify your Discord account";

        const embed = ResponseEmbed()
            .setTitle(":question: How to Apply")
            .setDescription(
                `Welcome to WinHacks!\n\n${applyInstructions}. Then ${verifyInstructions}.`
            );

        return await SafeReply(intr, {embeds: [embed], ephemeral: true});
    },
};

export {applyModule as command};
