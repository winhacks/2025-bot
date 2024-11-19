import {ActivityType, GuildMember} from "discord.js";
import {SelectPlural} from "../helpers/misc";
import {ClientType, EventType} from "../types";
import {DeleteHacker, GetHackerCount} from "../helpers/database";

const userUnverifiedModule: EventType = {
    eventName: "userUnverified",
    once: false,
    execute: async (client: ClientType, member: GuildMember) => {
        await DeleteHacker(member.id);

        // update presence to reflect 1 less verified hacker
        const registeredCount = await GetHackerCount();
        const message = SelectPlural(
            registeredCount,
            "nobody 😦",
            "1 verified hacker",
            `${registeredCount} verified hackers`
        );

        client.user?.setPresence({
            status: "online",
            activities: [{type: ActivityType.Watching, name: message}],
        });
    },
};

export {userUnverifiedModule as event};
