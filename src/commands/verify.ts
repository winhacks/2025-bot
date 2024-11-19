import {
    hyperlink,
    SlashCommandBuilder,
    SlashCommandStringOption,
} from "@discordjs/builders";
import {CacheType, ChatInputCommandInteraction, GuildMember} from "discord.js";
import {Config} from "../config";
import {PrettyUser} from "../helpers/misc";
import {ErrorMessage, SafeReply, SuccessMessage} from "../helpers/responses";
import {GetUserData} from "../helpers/sheetsAPI";
import {GiveUserRole, RenameUser} from "../helpers/userManagement";
import {logger} from "../logger";
import {CommandType} from "../types";
import {NotInGuildResponse} from "./team/team-shared";
import {UpsertHacker, GetHacker, IsEmailVerified} from "../helpers/database";

// source: https://www.emailregex.com/ (apparently 99.99% accurate)
const emailRegex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const verifyModule: CommandType = {
    data: new SlashCommandBuilder() //
        .setName("verify")
        .setDescription("Verify yourself.")
        .addStringOption(
            new SlashCommandStringOption()
                .setName("email")
                .setDescription("The email you registered with")
                .setRequired(true)
        ),
    deferMode: "EPHEMERAL",
    execute: async (intr: ChatInputCommandInteraction<CacheType>): Promise<any> => {
        // ensure command running in guild
        if (!intr.inGuild()) {
            return await SafeReply(intr, NotInGuildResponse());
        }

        const email = intr.options.getString("email", true).toLowerCase();

        // ensure email is valid
        if (!email.match(emailRegex)) {
            return await SafeReply(
                intr,
                ErrorMessage({
                    title: "Invalid Email",
                    message: "That doesn't appear to be a valid email address.",
                })
            );
        }

        /**
         * Assuming a valid email is given, the following checks must be made:
         * 1. The user cannot already be verified
         * 2. The email must not be used for another user's verification
         * 3. The email must be present in the application form results.
         *    This check is passed inherently if it is possible to fetch the
         *    user's data.
         */

        const existingHacker = await GetHacker(intr.user.id);
        if (existingHacker) {
            // if they appear to be changing their email, we can provide them with some help :)
            if (existingHacker.email !== email) {
                return await SafeReply(
                    intr,
                    ErrorMessage({
                        emote: ":confused:",
                        title: "Already Verified With Other Email",
                        message: [
                            "You already verified with another email address. If you want",
                            "to change your email, use `/unverify` first, then `/verify` again",
                            "with the new email.",
                        ].join(" "),
                    })
                );
            }

            return await SafeReply(
                intr,
                ErrorMessage({
                    emote: ":fire:",
                    title: "Already Verified",
                    message: "You're already verified, no need to verify again.",
                })
            );
        }

        if (await IsEmailVerified(email)) {
            return await SafeReply(
                intr,
                ErrorMessage({
                    emote: ":fire:",
                    title: "Email Already Used",
                    message: [
                        "It looks like someone is already registered with that email.",
                        "If this is a mistake, please reach out to a Lead or Admin.",
                    ].join(" "),
                })
            );
        }

        const userData = await GetUserData(email);
        if (!userData) {
            const registerLink = Config.verify.registration_url;
            return await SafeReply(
                intr,
                ErrorMessage({
                    title: "Verification Failed",
                    message: [
                        "I couldn't verify that email address. If you haven't registered,",
                        `you can ${hyperlink("register here", registerLink)}.`,
                    ].join(" "),
                })
            );
        }

        // HOTFIX: Discord prevents nicknames over 32 characters, lets give a nice error for that
        const nickname = `${userData.firstName} ${userData.lastName}`;
        if (nickname.length > 32) {
            return await SafeReply(
                intr,
                ErrorMessage({
                    message: [
                        "Discord requires your name be 32 characters or less.",
                        "Please re-register with a shorter version of your real",
                        "name and try again.",
                    ].join(" "),
                })
            );
        }

        // verify user
        const guild = intr.guild!;
        const member = intr.member as GuildMember;

        // give the verified role if such a role is configured
        if (Config.verify.verified_role_name) {
            const verifiedRoleName = Config.verify.verified_role_name;
            const verifiedRole = guild.roles.cache.findKey(
                (r) => r.name === verifiedRoleName
            );

            if (!verifiedRole) {
                return await SafeReply(intr, ErrorMessage());
            }

            const giveRoleError = await GiveUserRole(member, verifiedRole);
            if (giveRoleError) {
                return await SafeReply(intr, ErrorMessage());
            }
        }

        // insert user into database
        const user = await UpsertHacker(
            member.user.id,
            userData.firstName,
            userData.lastName,
            userData.email
        );

        if (!user) {
            return await SafeReply(intr, ErrorMessage());
        }

        const isGuildOwner = member.id === guild!.ownerId;
        if (!isGuildOwner) {
            await RenameUser(member, nickname);
        }

        intr.client.emit("userVerified", member);
        logger.info(`Verified "${PrettyUser(intr.user)}" with ${email}`);

        if (!isGuildOwner) {
            return await SafeReply(intr, SuccessMessage({message: "You are now verified."}));
        } else {
            logger.warn(
                `${PrettyUser(
                    intr.user
                )} is the guild owner, asking them to update their nick manually.`
            );
            return await SafeReply(
                intr,
                SuccessMessage({
                    message: [
                        "You are now verified. As the guild owner, you'll need",
                        "to change your nickname to your real name manually. Ask",
                        "the Discord developers why, not me.",
                    ].join(" "),
                })
            );
        }
    },
};

export {verifyModule as command};
