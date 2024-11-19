import {CacheType, ChatInputCommandInteraction} from "discord.js";
import {ErrorMessage, SafeReply, SuccessMessage} from "../../helpers/responses";
import {logger} from "../../logger";
import {HandleLeaveTeam, NotInGuildResponse} from "./team-shared";
import {Team} from "@prisma/client";

export const LeaveTeam = async (intr: ChatInputCommandInteraction<CacheType>, team: Team) => {
    if (!intr.inGuild()) {
        return await SafeReply(intr, NotInGuildResponse());
    }

    const leaveError = await HandleLeaveTeam(intr.guild!, intr.user, team);
    if (leaveError) {
        logger.error(leaveError);
        return await SafeReply(intr, ErrorMessage({ephemeral: true}));
    } else {
        return await await SafeReply(
            intr,
            SuccessMessage({
                message: `You left Team ${team.displayName} successfully.`,
            })
        );
    }
};
