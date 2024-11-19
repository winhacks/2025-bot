import {
    CacheType,
    CommandInteraction,
    InteractionReplyOptions,
    ActionRowBuilder,
    MessageComponentInteraction,
    EmbedBuilder,
    MessagePayload,
} from "discord.js";
import {Config} from "../config";
import {logger} from "../logger";

// UTILITIES ------------------------------------------------------------------

/**
 * Responds to an interaction, safely. Will not crash in the
 * event of an already-replied interaction.
 * @param intr The interaction to reply to
 * @param reply The reply to send
 * @returns A promise to the reply, just as if `intr.reply` had been used.
 */
export const SafeReply = async (
    intr: CommandInteraction<CacheType> | MessageComponentInteraction,
    reply: string | MessagePayload | InteractionReplyOptions
) => {
    try {
        if (intr.replied) {
            return await intr.followUp(reply);
        } else if (intr.deferred) {
            return await intr.editReply(reply);
        } else {
            return await intr.reply(reply);
        }
    } catch (err) {
        logger.error(`Reply failed: ${err}`);
    }
    return null;
};

/**
 * @param intr The interaction to defer responding to
 * @param ephemeral Whether or not the deferral should be ephemeral (default false)
 * @returns a promise that resolves either on error (which is caught and logged) or on success
 */
export const SafeDeferReply = async (
    intr: CommandInteraction<CacheType>,
    ephemeral: boolean = false
) => {
    try {
        if (!intr.deferred && !intr.replied) {
            return await intr.deferReply({ephemeral: ephemeral});
        }
    } catch (err) {
        logger.error(`Deferral failed: ${err}`);
    }
};

/**
 * Base builder for embed responses.
 * @returns A EmbedBuilder with default styling
 */
export const ResponseEmbed = () => {
    return new EmbedBuilder().setColor(Config.bot_info.color);
};

// SHARED RESPONSES -----------------------------------------------------------
type BotEmbedOptions = Partial<{
    emote: string;
    title: string;
    message: string;
    ephemeral: boolean;
    components: ActionRowBuilder<any>[];
}>;

/**
 * A ready-made response representing an error. Default:
 *
 * @param options Customize the error message.
 * @returns A `MessagePayload` containing an error message embed.
 */
export const ErrorMessage = (options?: BotEmbedOptions) => {
    const defaultEmote = ":x:";
    const defaultTitle = "Oops!";
    const defaultMessage = "Something unexpected happened. Please try again shortly.";

    const {emote, title, message, ephemeral, components} = options ?? {};
    return BuildMessage(
        emote ?? defaultEmote,
        title ?? defaultTitle,
        message ?? defaultMessage,
        ephemeral ?? true,
        components ?? []
    );
};

/**
 * A ready-made response representing a success.
 * @param options Customize the error message.
 * @returns A `MessagePayload` containing an error message embed.
 */
export const SuccessMessage = (options?: BotEmbedOptions) => {
    const defaultEmote = ":partying_face:";
    const defaultTitle = "Success!";
    const defaultMessage = "";

    const {emote, title, message, ephemeral, components} = options ?? {};
    return BuildMessage(
        emote ?? defaultEmote,
        title ?? defaultTitle,
        message ?? defaultMessage,
        ephemeral ?? true,
        components ?? []
    );
};

const BuildMessage = (
    emote: string,
    title: string,
    message: string,
    ephemeral: boolean,
    components: ActionRowBuilder<any>[]
) => {
    return {
        embeds: [ResponseEmbed().setTitle(`${emote} ${title}`).setDescription(message)],
        ephemeral: ephemeral,
        components: components,
    };
};
