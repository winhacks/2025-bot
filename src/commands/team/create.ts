import {CacheType, ChatInputCommandInteraction} from "discord.js";
import {Config} from "../../config";
import {
    CreateTeam,
    GetTeam,
    GetHacker,
    AddHackerToTeam,
    WithTransaction,
} from "../../helpers/database";
import {
    ErrorMessage,
    SafeDeferReply,
    SafeReply,
    SuccessMessage,
} from "../../helpers/responses";
import {logger} from "../../logger";
import {
    AlreadyInTeamResponse,
    InvalidNameResponse,
    MakeTeamChannels,
    NameTakenResponse,
    NotInGuildResponse,
    NotVerifiedResponse,
    ValidateTeamName,
} from "./team-shared";

export const CreateTeamSubcommand = async (
    intr: ChatInputCommandInteraction<CacheType>
): Promise<any> => {
    if (!intr.guild) {
        return await SafeReply(intr, NotInGuildResponse());
    }

    await SafeDeferReply(intr, true);

    const teamName = intr.options
        .getString("name", true)
        .trim()
        .replaceAll(/\s\s+/g, " ");
    if (!ValidateTeamName(teamName)) {
        return await SafeReply(intr, InvalidNameResponse());
    }

    /**
     * The requirements to create a team are:
     * 1. The team name must not already exist (based on a standardized format),
     * 2. The user must be verified, and
     * 3. The user must not already be in a team.
     */

    const existingTeam = await GetTeam(teamName);
    if (existingTeam) {
        return await SafeReply(intr, NameTakenResponse());
    }

    const hacker = await GetHacker(intr.user.id);
    if (!hacker) {
        return await SafeReply(intr, NotVerifiedResponse());
    } else if (hacker!.teamStdName != null) {
        return await SafeReply(intr, AlreadyInTeamResponse());
    }

    // Create Text and Voice channels
    const newChannels = await MakeTeamChannels(intr.guild!, teamName, intr.user.id);
    if (!newChannels) {
        logger.error("Failed to make team channels");
        return await SafeReply(intr, ErrorMessage());
    }

    const [teamText, teamVoice] = newChannels;

    // attempt to make and insert team
    let success = await WithTransaction(async () => {
        const newTeam = await CreateTeam(
            teamName,
            teamText.parentId!, // team channels will always have a category.
            teamText.id,
            teamVoice.id
        );

        if (!newTeam) {
            return false;
        }

        const addResult = await AddHackerToTeam(newTeam?.stdName, intr.user.id);
        if (!addResult) {
            return false;
        }

        return true;
    });

    if (!success) {
        return await SafeReply(intr, ErrorMessage());
    }

    const remainingTeamCapacity = Config.teams.max_team_size - 1;
    return await SafeReply(
        intr,
        SuccessMessage({
            message: [
                `Team ${teamName} has been created. Your channels are`,
                `${teamText} and ${teamVoice}. Invite up to ${remainingTeamCapacity}`,
                "others with `/team invite`.",
            ].join(" "),
        })
    );
};
