import {CacheType, Collection, Interaction} from "discord.js";
import {ErrorMessage} from "../helpers/responses";
import {logger} from "../logger";
import {ButtonAction, ClientType, EventType} from "../types";
import { action as voteAction } from "./buttons/vote";

const handlers = new Collection<string, ButtonAction>();
handlers.set("vote", voteAction);

const buttonHandlerModule: EventType = {
    eventName: "interactionCreate",
    once: false,
    execute: async (_: ClientType, intr: Interaction<CacheType>) => {
        if (!intr.isButton()) return;

        const prefix = intr.customId.split(";")[0];
        const handler = handlers.get(prefix);

        if (!handler) {
            logger.error(`No handler found for button ${prefix}`);
            return intr.reply(ErrorMessage({ephemeral: true}));
        }

        try {
            return await handler.execute(intr);
        } catch (err) {
            logger.error(`Button Action ${prefix} failed: ${err}`);
            return intr.reply(ErrorMessage({ephemeral: true}));
        }
    },
};

export { buttonHandlerModule as event };
