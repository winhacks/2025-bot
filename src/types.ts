import {
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from "@discordjs/builders";
import {
    ButtonInteraction,
    CacheType,
    ChatInputCommandInteraction,
    Client,
    Collection
} from "discord.js";

export interface CommandType {
    data:
        | SlashCommandBuilder
        | SlashCommandSubcommandsOnlyBuilder
        | SlashCommandOptionsOnlyBuilder
        | Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">;
    deferMode: "NORMAL" | "EPHEMERAL" | "NO-DEFER";
    execute: (interaction: ChatInputCommandInteraction<CacheType>) => Promise<any>;
}

export interface EventType {
    eventName: string;
    once: boolean;
    execute: (client: ClientType, ...args: any[]) => Promise<any>;
}

export interface ButtonAction {
    execute: (interaction: ButtonInteraction<CacheType>) => Promise<any>;
}

export interface ClientType extends Client {
    commands: Collection<string, CommandType>;
}

export enum TeamAvailability {
    "NAME_EXISTS",
    "ALREADY_IN_TEAM",
    "AVAILABLE",
}
