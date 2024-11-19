import {
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    SlashCommandUserOption,
} from "@discordjs/builders";
import {CacheType, ChatInputCommandInteraction} from "discord.js";
import {ErrorMessage, SafeReply} from "../helpers/responses";
import {CommandType} from "../types";
import {CreateTeamSubcommand} from "./team/create";
import {TeamInfo} from "./team/info";
import {InviteToTeam} from "./team/invite";
import {LeaveTeam} from "./team/leave";
import {NotInTeamResponse} from "./team/team-shared";
import {GetHackerTeam} from "../helpers/database";

const teamModule: CommandType = {
    data: new SlashCommandBuilder() //
        .setName("team")
        .setDescription("test")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("create")
                .setDescription("Create a new team.")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("name")
                        .setDescription("Name of the team to create")
                        .setRequired(true)
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("invite")
                .setDescription("Invite a user to your team.")
                .addUserOption(
                    new SlashCommandUserOption()
                        .setName("user")
                        .setDescription("The user to invite")
                        .setRequired(true)
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("info")
                .setDescription("See information about the team you're currently in.")
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("leave")
                .setDescription("Leave your current team.")
        ),
    deferMode: "NO-DEFER",
    execute: async (intr: ChatInputCommandInteraction<CacheType>): Promise<any> => {
        const subcommand = intr.options.getSubcommand();

        // user wants to create a new team
        if (subcommand === "create") {
            return CreateTeamSubcommand(intr);
        }

        // team should exist for the rest, so look it up
        const team = await GetHackerTeam(intr.user.id);
        if (!team) {
            return await SafeReply(intr, NotInTeamResponse(true));
        }

        // info/leave command can be used anywhere
        if (subcommand === "info") {
            return TeamInfo(intr, team);
        } else if (subcommand === "leave") {
            return LeaveTeam(intr, team);
        } else if (subcommand === "invite") {
            return InviteToTeam(intr, team);
        }

        return await SafeReply(intr, ErrorMessage());
    },
};

export {teamModule as command};
