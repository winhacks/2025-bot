import {CacheType, ChatInputCommandInteraction} from "discord.js";
import {ErrorMessage, SafeDeferReply, SafeReply} from "../helpers/responses";
import {logger} from "../logger";
import {ClientType, EventType} from "../types";

const interactionHandlerModule: EventType = {
    eventName: "interactionCreate",
    once: false,
    execute: async (client: ClientType, intr: ChatInputCommandInteraction<CacheType>) => {
        if (!intr.isCommand()) {
            return;
        }

        const command = client.commands.get(intr.commandName);
        if (!command) {
            await SafeReply(intr, ErrorMessage());
            return;
        }

        try {
            if (command.deferMode !== "NO-DEFER") {
                await SafeDeferReply(intr, command.deferMode === "EPHEMERAL");
            }

            await command.execute(intr);
        } catch (err) {
            logger.error(err);
            await SafeReply(intr, ErrorMessage());
        }
    },
};

export {interactionHandlerModule as event};
