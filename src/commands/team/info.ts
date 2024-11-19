import {CacheType, ChatInputCommandInteraction} from "discord.js";
import {ResponseEmbed, SafeReply} from "../../helpers/responses";
import {NotInGuildResponse} from "./team-shared";
import {Team} from "@prisma/client";
import {GetMembersOfTeam} from "../../helpers/database";
import {channelMention, userMention} from "@discordjs/builders";

export const TeamInfo = async (
    intr: ChatInputCommandInteraction<CacheType>,
    team: Team
): Promise<any> => {
    if (!intr.inGuild()) {
        return await SafeReply(intr, NotInGuildResponse());
    }

    const members = (await GetMembersOfTeam(team.stdName))
        .map((member) => member.discordId)
        .map(userMention);
    const channels = [
        channelMention(team.textChannelId),
        channelMention(team.voiceChannelId),
    ];

    const embed = ResponseEmbed()
        .setTitle(team.displayName)
        .addFields([
            {name: "Team Members:", value: members.join("\n")},
            {name: "Team Channels", value: channels.join("\n")},
        ]);

    return await SafeReply(intr, {embeds: [embed]});
};
