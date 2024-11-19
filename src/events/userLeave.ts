import {GuildMember} from "discord.js";
import {logger} from "../logger";
import {ClientType, EventType} from "../types";
import {DeleteHacker, GetHacker} from "../helpers/database";

const memberLeaveModule: EventType = {
    eventName: "guildMemberRemove",
    once: false,
    execute: async (client: ClientType, member: GuildMember) => {
        const existingHacker = await GetHacker(member.id);
        if (!existingHacker) {
            logger.info(`User ${member.id} left.`);
            return;
        }

        await DeleteHacker(member.id);
        logger.info(`User ${member.id} left and was unverified.`);
        client.emit("userUnverified", member);
    },
};

export {memberLeaveModule as event};
