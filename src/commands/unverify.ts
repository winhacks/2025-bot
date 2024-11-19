import {SlashCommandBuilder} from "@discordjs/builders";
import {CacheType, ChatInputCommandInteraction, Guild, GuildMember} from "discord.js";
import {Config} from "../config";
import {GetHacker, GetHackerTeam} from "../helpers/database";
import {PrettyUser} from "../helpers/misc";
import {ErrorMessage, SafeReply, SuccessMessage} from "../helpers/responses";
import {TakeUserRole} from "../helpers/userManagement";
import {logger} from "../logger";
import {CommandType} from "../types";
import {NotInGuildResponse} from "./team/team-shared";

const unverifyModule: CommandType = {
    data: new SlashCommandBuilder()
        .setName("unverify")
        .setDescription("Unverify yourself. You'll need to /verify again."),
    deferMode: "EPHEMERAL",
    execute: async (intr: ChatInputCommandInteraction<CacheType>): Promise<any> => {
        if (!intr.inGuild()) {
            return await SafeReply(intr, NotInGuildResponse());
        }

        // check for existing user
        const existingHacker = await GetHacker(intr.user.id);
        if (!existingHacker) {
            return await SafeReply(
                intr,
                ErrorMessage({
                    title: "Not Verified",
                    message: "You're not verified yet. Did you mean to use `/verify`?",
                })
            );
        }

        // check if user is in team
        const userTeam = await GetHackerTeam(intr.user.id);
        if (userTeam !== null) {
            return await SafeReply(
                intr,
                ErrorMessage({
                    title: "Already In A Team",
                    message:
                        "You cannot unverify while in a team. Use `/team leave` first.",
                })
            );
        }

        const guild = intr.guild!;
        const member = intr.member! as GuildMember;

        try {
            await HandleUnverify(guild, member);
        } catch {
            return await SafeReply(intr, ErrorMessage());
        }

        intr.client.emit("userUnverified", member);
        logger.info(`Un-verified ${PrettyUser(intr.user)}`);
        return await SafeReply(intr, SuccessMessage({message: "You're no longer verified."}));
    },
};

const HandleUnverify = async (guild: Guild, member: GuildMember): Promise<void> => {
    if (Config.verify.verified_role_name) {
        const verifiedRole = guild.roles.cache.findKey(
            (r) => r.name === Config.verify.verified_role_name
        );

        if (!verifiedRole) {
            throw Error(`Failed to find the ${Config.verify.verified_role_name} role`);
        }

        const takeUserRoleErr = await TakeUserRole(member, verifiedRole);
        if (takeUserRoleErr) {
            throw Error(takeUserRoleErr);
        }

        if (member.user.id !== guild.ownerId) {
            await member.setNickname(null, "User unverified");
        }
    }
};
export {unverifyModule as command};
