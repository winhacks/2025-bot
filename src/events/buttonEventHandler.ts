import {CacheType, Collection, Interaction} from "discord.js";
import {readdirSync} from "fs";
import {format as formatPath} from "path";
import {ErrorMessage} from "../helpers/responses";
import {logger} from "../logger";
import {ButtonAction, ClientType, EventType} from "../types";

const handlers = new Collection<string, ButtonAction>();

const buttonHandlerModule: EventType = {
    eventName: "interactionCreate",
    once: false,
    execute: async (_: ClientType, intr: Interaction<CacheType>) => {
        if (!intr.isButton()) {
            return;
        }

        const prefix = intr.customId.split(";")[0];

        try {
            const action = await GetHandler(prefix);
            return await action!.execute(intr);
        } catch (err) {
            logger.error(`Button Action ${prefix} failed: ${err}`);
            return intr.reply(ErrorMessage({ephemeral: true}));
        }
    },
};

const GetHandler = async (prefix: string): Promise<ButtonAction | null> => {
    const existing = handlers.get(prefix);
    if (existing) {
        return existing;
    }

    const extensions = [".ts", ".js"];

    const actionFiles = readdirSync(`${__dirname}/buttons`)
        .filter((file) => extensions.some(ext => file.endsWith(ext)))
        .map((file) => file.replace(/\.(ts|js)$/, ""));

    if (actionFiles.includes(prefix)) {
        logger.debug(`First-time loading ${prefix} ButtonAction...`);

        const matchingFiles = readdirSync(`${__dirname}/buttons`)
            .filter((file) => file.startsWith(prefix) && extensions.some(ext => file.endsWith(ext)));

        if (matchingFiles.length === 0) {
            return null;
        }

        const selectedFile = matchingFiles[0]; 
        const extension = selectedFile.slice(-3); 

        const path = formatPath({
            dir: `${__dirname}/buttons`,
            name: prefix,
            ext: extension,
        });

        const { action } = (await import(path)) as { action: ButtonAction };

        handlers.set(prefix, action); // cache for future calls
        return action;
    }

    return null;
};

export {buttonHandlerModule as event};
