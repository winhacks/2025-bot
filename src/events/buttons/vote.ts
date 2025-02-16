import { ButtonInteraction, CacheType, GuildMember } from "discord.js";
import { Config } from "../../config";
import { ErrorMessage, SafeReply, SuccessMessage } from "../../helpers/responses";
import { ButtonAction } from "../../types";
import { activePollStore } from "../../commands/poll";

const voteAction: ButtonAction = {
    execute: async (intr: ButtonInteraction<CacheType>) => {
        if (!intr.inGuild()) return;

        const [_, pollId, optionIndex] = intr.customId.split(";");
        const poll = activePollStore.get(pollId);

        if (!poll) {
            return await SafeReply(intr, ErrorMessage({
                title: "Poll Not Found",
                message: "This poll no longer exists."
            }));
        }

        // Check if poll has ended
        if (Date.now() > poll.endTime) {
            return await SafeReply(intr, ErrorMessage({
                title: "Poll Ended",
                message: "This poll has already ended."
            }));
        }

        // Check if user has verified role
        const member = intr.member as GuildMember;
        const verifiedRole = member.roles.cache.find(
            role => role.name === Config.verify.verified_role_name
        );

        if (!verifiedRole) {
            return await SafeReply(intr, ErrorMessage({
                title: "Not Verified",
                message: "Only verified users can vote in polls."
            }));
        }

        const newVoteIndex = parseInt(optionIndex);
        const oldVote = poll.votes.get(intr.user.id);

        // Record vote
        poll.votes.set(intr.user.id, newVoteIndex);

        let message: string;
        if (oldVote !== undefined) {
            message = `Your vote has been changed from "${poll.options[oldVote]}" to "${poll.options[newVoteIndex]}"`;
        } else {
            message = `Your vote for "${poll.options[newVoteIndex]}" has been recorded`;
        }

        return await SafeReply(intr, SuccessMessage({
            message
        }));
    },
};

export { voteAction as action }; 