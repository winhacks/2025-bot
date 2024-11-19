import { ActivityType } from "discord.js";
import {GetHackerCount} from "../helpers/database";
import {SelectPlural} from "../helpers/misc";
import {logger} from "../logger";
import {ClientType, EventType} from "../types";

const readyEventModule: EventType = {
    eventName: "ready",
    once: true,
    execute: async (client: ClientType) => {
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

        logger.info("Bot is ready.");
    },
};

export {readyEventModule as event};
