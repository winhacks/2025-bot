import {Client, Collection, GatewayIntentBits} from "discord.js";
import {ClientType, CommandType, EventType} from "./types";
import {Config, LoadConfig} from "./config";
import {RegisterCommands} from "./helpers/commandManager";
import {logger} from "./logger";
import {readdir} from "fs/promises";
import {AuthenticateGoogleAPI} from "./helpers/sheetsAPI";
import path from "path";

let client: ClientType;

const start = async (): Promise<void> => {
    /*
     * Config loading
     */
    logger.info("Loading config...");
    LoadConfig("config.json5");

    const discordApiInfo = Config.dev_mode ? Config.development : Config.production;

    /*
     * Bot API authentications
     */
    logger.info("Authenticating with APIs...");
    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.DirectMessages,
        ],
    }) as ClientType;
    client.commands = new Collection<string, CommandType>();

    await AuthenticateGoogleAPI().then(() => logger.info("Google: OK"));

    /*
     * Command loading
     */
    const commandDir = path.join(__dirname, "commands");
    const commandModules = (await readdir(commandDir)) //
        .filter((file) => file.endsWith(".ts") || file.endsWith(".js"))
        .map((name) => name.slice(0, -path.extname(name).length))
        .filter((name) => name !== "index")
        .map((name) => path.resolve(commandDir, name));

    logger.info(`Loading ${commandModules.length} commands...`);

    const commandsToRegister = [];
    for (const path of commandModules) {
        logger.debug(`Loading ${path} as Command`);
        const {command} = require(path) as {command: CommandType};
        client.commands.set(command.data.name, command);
        commandsToRegister.push(command);
    }

    await RegisterCommands(commandsToRegister, discordApiInfo);

    /*
     * Event loading
     */
    const eventDir = path.join(__dirname, "events");
    const eventModules = (await readdir(eventDir)) //
        .filter((file) => file.endsWith(".ts") || file.endsWith(".js"))
        .map((name) => name.slice(0, -path.extname(name).length))
        .filter((name) => name !== "index")
        .map((name) => require(path.resolve(eventDir, name)) as {event: EventType});

    logger.info(`Loading ${eventModules.length} events...`);
    for (const {event} of eventModules) {
        const eventCallback = (...args: any[]) => event.execute(client, ...args);

        if (event.once) {
            client.once(event.eventName, eventCallback);
        } else {
            client.on(event.eventName, eventCallback);
        }
    }

    if (Config.dev_mode) {
        client.on("error", logger.error);
        client.on("warn", logger.warn);
    }

    await client.login(discordApiInfo.api_token);
};

// graceful exit handler
require("shutdown-handler").on("exit", (event: Event) => {
    event.preventDefault(); // delay process closing

    client.emit("shutdown");

    logger.info("Graceful shutdown completed. Exiting...");
    process.exit();
});

// start bot
start();
