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

        // Check if user has already voted
        if (poll.votes.has(intr.user.id)) {
            return await SafeReply(intr, ErrorMessage({
                title: "Already Voted",
                message: "You have already voted in this poll."
            }));
        }

        // Record vote
        poll.votes.set(intr.user.id, parseInt(optionIndex));

        return await SafeReply(intr, SuccessMessage({
            message: `Your vote for "${poll.options[parseInt(optionIndex)]}" has been recorded.`
        }));
    },
};

export { voteAction as action }; 