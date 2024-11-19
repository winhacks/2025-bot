import {hyperlink, SlashCommandBuilder} from "@discordjs/builders";
import {CacheType, ChatInputCommandInteraction} from "discord.js";
import {Config} from "../config";
import {ErrorMessage, ResponseEmbed, SafeReply} from "../helpers/responses";
import {CommandType} from "../types";
import {NotInGuildResponse} from "./team/team-shared";

const socialsModule: CommandType = {
    data: new SlashCommandBuilder() //
        .setName("socials")
        .setDescription("View the WinHacks socials."),
    deferMode: "NO-DEFER",
    execute: async (intr: ChatInputCommandInteraction<CacheType>): Promise<any> => {
        if (!intr.inGuild()) {
            return await SafeReply(intr, NotInGuildResponse());
        }

        if (!Config.socials || Config.socials.length === 0) {
            return await SafeReply(
                intr,
                ErrorMessage({
                    emote: ":face_with_monocle:",
                    title: "No Socials",
                    message: "There are no socials. It's not you, its me.",
                })
            );
        }

        const embed = ResponseEmbed().setTitle(":computer: Socials");
        if (Config.bot_info.thumbnail) {
            embed.setThumbnail(Config.bot_info.thumbnail);
        }

        const lines = [];
        for (const {displayName, link} of Config.socials) {
            lines.push(hyperlink(displayName, link));
        }

        embed.setDescription(lines.join("\n"));
        return await SafeReply(intr, {embeds: [embed]});
    },
};

export {socialsModule as command};
