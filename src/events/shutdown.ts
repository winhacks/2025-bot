import {DisconnectDatabase} from "../helpers/database";
import {logger} from "../logger";
import {ClientType, EventType} from "../types";

const shutdownModule: EventType = {
    eventName: "shutdown",
    once: false,
    execute: async (client: ClientType) => {
        try {
            client.user?.setPresence({status: "invisible", activities: []});
            await DisconnectDatabase();
        } catch (err) {
            logger.warn("Failed to set bot as offline while exiting");
        }
    },
};

export {shutdownModule as event};
