import {hyperlink, inlineCode, time} from "@discordjs/builders";
import {ButtonInteraction, CacheType} from "discord.js";
import {HandleMemberDecline, HandleMemberJoin} from "../../commands/team/team-shared";
import {Config} from "../../config";
import {ErrorMessage, SafeReply, SuccessMessage} from "../../helpers/responses";
import {ButtonAction} from "../../types";
import {
    AddHackerToTeam,
    DeleteInvite,
    GetHacker,
    GetHackerTeam,
    GetInvite,
    WithTransaction,
} from "../../helpers/database";
import {Invite, Team} from "@prisma/client";

export enum InviteAction {
    Accept = "accept",
    Decline = "decline",
}

export const BuildInviteButtonId = (action: InviteAction, invite: Invite) => {
    return `invite;${action};${invite.inviteeId};${invite.teamStdName}`;
};

export const ParseInviteButtonId = (buttonId: string) => {
    const segments = buttonId.split(";");
    return {
        action: segments[1],
        inviteeId: segments[2],
        teamStdName: segments[3],
    };
};

const inviteAction: ButtonAction = {
    execute: async (intr: ButtonInteraction<CacheType>) => {
        const existingHacker = await GetHacker(intr.user.id);
        if (!existingHacker) {
            const joinLink = hyperlink(
                `${Config.bot_info.event_name} Discord server`,
                "https://discord.com/invite/xUV9yBqjH4"
            );
            return await SafeReply(
                intr,
                ErrorMessage({
                    title: "Not Verified",
                    message: [
                        "Only verified users can join teams. You need to join",
                        `the ${joinLink} Discord server and use ${inlineCode(
                            "verify your-email"
                        )}`,
                    ].join(" "),
                })
            );
        }
        const {action, inviteeId, teamStdName} = ParseInviteButtonId(intr.customId);

        // check if user is already on a team
        if (action === InviteAction.Accept) {
            const existingTeam = await GetHackerTeam(intr.user.id);
            if (existingTeam) {
                return await SafeReply(
                    intr,
                    ErrorMessage({
                        title: "Already on a team",
                        message: `You're already a member of ${existingTeam.displayName}.`,
                    })
                );
            }
        }

        const invite = await GetInvite(inviteeId, teamStdName);
        if (!invite?.Team) {
            return intr.update(
                ErrorMessage({
                    title: "Team Deleted",
                    message: "It appears the team this invite is for was deleted.",
                })
            );
        }

        let response: {response?: string; error?: string};
        if (action === InviteAction.Accept) {
            response = await HandleOfferAccept(invite.Team, invite, intr);
        } else if (action === InviteAction.Decline) {
            response = await HandleOfferDecline(invite.Team, invite, intr);
        } else {
            response = {error: "This invite is malformed. Ask for a new invite."};
        }

        if (!response.error) {
            return intr.update(
                SuccessMessage({
                    emote: ":partying_face:",
                    title: "Success",
                    message: response.response,
                })
            );
        } else {
            return intr.update(
                ErrorMessage({
                    emote: ":x:",
                    title: "Oops!",
                    message: response.error,
                })
            );
        }
    },
};

const HandleOfferAccept = async (
    team: Team,
    invite: Invite,
    intr: ButtonInteraction<CacheType>
): Promise<{response?: string; error?: string}> => {
    const guildId = Config.dev_mode ? Config.development.guild : Config.production.guild;
    const guild = await intr.client.guilds.fetch(guildId);

    await HandleMemberJoin(guild, team, intr.user.id);
    await WithTransaction(async () => {
        await DeleteInvite(invite.inviteeId, invite.teamStdName);
        await AddHackerToTeam(team.stdName, intr.user.id);
        return true;
    });

    return {response: `You joined ${team.displayName} ${time(Date.now())}`};
};

const HandleOfferDecline = async (
    team: Team,
    invite: Invite,
    intr: ButtonInteraction<CacheType>
): Promise<{error?: string; response?: string}> => {
    const guildId = Config.dev_mode ? Config.development.guild : Config.production.guild;
    const guild = await intr.client.guilds.fetch(guildId);

    await HandleMemberDecline(guild, team, intr.user.id);
    await DeleteInvite(invite.inviteeId, invite.teamStdName);

    return {
        response: `You declined to join ${team.displayName} ${time(Date.now())}.`,
    };
};

export {inviteAction as action};
