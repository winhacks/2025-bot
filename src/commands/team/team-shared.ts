import {
    Guild,
    GuildTextBasedChannel,
    OverwriteResolvable,
    PermissionOverwriteOptions,
    PermissionsBitField,
    TextChannel,
    User,
    VoiceChannel,
    ChannelType,
    OverwriteType,
} from "discord.js";
import {Config} from "../../config";
import {
    RemoveHackerFromTeam,
    GetMembersOfTeam,
    WithTransaction,
    CreateCategory,
    GetAllCategories,
    GetHackerTeam,
} from "../../helpers/database";
import {ErrorMessage, ResponseEmbed, SuccessMessage} from "../../helpers/responses";
import {logger} from "../../logger";
import {channelMention, userMention} from "@discordjs/builders";
import {DiscordCategory, Team} from "@prisma/client";

// PERMISSIONS ----------------------------------------------------------------

export const TEAM_MEMBER_PERMS: PermissionOverwriteOptions = {
    ViewChannel: true,
    Connect: true,
    Speak: true,
    SendMessages: true,
};
export const NOT_TEAM_MEMBER_PERMS: PermissionOverwriteOptions = {
    ViewChannel: false,
    Connect: false,
    Speak: false,
    SendMessages: false,
};

const FLAG_SET = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
];

// RESPONSES ------------------------------------------------------------------

export const NotVerifiedResponse = (ephemeral: boolean = false) => {
    return {
        ephemeral: true,
        embeds: [
            ResponseEmbed()
                .setTitle(":x: Not Verified")
                .setDescription(
                    `You must verify first. Head over to ${channelMention(
                        Config.verify.channel_id
                    )} to verify!`
                ),
        ],
    };
};

export const InvalidNameResponse = (ephemeral: boolean = false) => {
    return {
        ephemeral: ephemeral,
        embeds: [
            ResponseEmbed().setTitle(":x: Invalid Team Name").setDescription(
                `Team names must be shorter than ${
                    Config.teams.max_name_length //
                } characters, consist only of spaces and English alphanumeric characters, and not already be taken.`
            ),
        ],
    };
};

export const NameTakenResponse = (ephemeral: boolean = false) => {
    return {
        ephemeral: ephemeral,
        embeds: [
            ResponseEmbed()
                .setTitle(":x: Name Taken")
                .setDescription("That name is already taken, sorry."),
        ],
    };
};

export const NotTeamLeaderResponse = (ephemeral: boolean = false) => {
    return {
        ephemeral: ephemeral,
        embeds: [
            ResponseEmbed()
                .setTitle(":x: Not a Team Leader")
                .setDescription("This command may only be used by team leaders."),
        ],
    };
};

export const AlreadyInTeamResponse = (ephemeral: boolean = false) => {
    return {
        ephemeral: ephemeral,
        embeds: [
            ResponseEmbed()
                .setTitle(":x: Already in a Team")
                .setDescription(
                    "You're already in a team. You can leave your team with `/team leave`."
                ),
        ],
    };
};

export const NotInTeamResponse = (ephemeral: boolean = false) => {
    return {
        ephemeral: ephemeral,
        embeds: [
            ResponseEmbed()
                .setTitle(":x: Not in a Team")
                .setDescription(
                    "You're not in a team yet. Ask your team leader for an invite, or create your own with `/team create`."
                ),
        ],
    };
};

export const NotInGuildResponse = (ephemeral: boolean = false) => {
    return {
        ephemeral: ephemeral,
        embeds: [
            ResponseEmbed()
                .setTitle(":x: Not in a Server")
                .setDescription("This command must be used inside a server."),
        ],
    };
};

export const TeamFullResponse = (ephemeral: boolean = false) => {
    return {
        ephemeral: ephemeral,
        embeds: [
            ResponseEmbed()
                .setTitle(":x: Team Full")
                .setDescription(
                    `Teams can only have up to ${Config.teams.max_team_size} members.`
                ),
        ],
    };
};

export const InTeamChannelResponse = (
    textChannelID: string,
    ephemeral: boolean = false
) => {
    return {
        ephemeral: ephemeral,
        embeds: [
            ResponseEmbed()
                .setTitle("Wrong Channel")
                .setDescription(
                    `You cannot use this command in your team text channel, ${channelMention(
                        textChannelID
                    )}.`
                ),
        ],
    };
};

export const NotInTeamChannelResponse = (
    textChannelID: string,
    ephemeral: boolean = false
) => {
    return {
        ephemeral: ephemeral,
        embeds: [
            ResponseEmbed()
                .setTitle("Wrong Channel")
                .setDescription(
                    `You can only use this command in your team text channel, ${channelMention(
                        textChannelID
                    )}.`
                ),
        ],
    };
};

// FIXME: once magic is no longer needed, this should be removed and downgraded to a single member use case
export const MakeTeamPermissions = (
    guild: Guild,
    teamName: string,
    forMembers: string[]
): OverwriteResolvable[] => {
    const overwrites: OverwriteResolvable[] = [
        {id: guild.roles.everyone, type: OverwriteType.Role, deny: FLAG_SET},
    ];

    for (const member of forMembers) {
        overwrites.push({id: member, type: OverwriteType.Member, allow: FLAG_SET});
    }

    for (const name of Config.teams.moderator_roles) {
        const roleId = guild.roles.cache.findKey((r) => r.name === name);
        if (!roleId) {
            const warning = [
                `Can't give role ${name} access to`,
                `${teamName}'s channels: role not found`,
            ].join(" ");

            logger.warn(warning);
            continue;
        }

        overwrites.push({
            id: roleId,
            type: OverwriteType.Role,
            allow: FLAG_SET,
        });
    }

    return overwrites;
};

export const MakeTeamChannels = async (
    guild: Guild,
    teamName: string,
    forMember: string
): Promise<[TextChannel, VoiceChannel] | null> => {
    const category = await GetUnfilledTeamCategory(guild);

    const overwrites = MakeTeamPermissions(guild, teamName, [forMember]);
    const channelName = Discordify(teamName);
    return Promise.all([
        guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.categoryId,
            permissionOverwrites: overwrites,
        }),
        guild.channels.create({
            name: channelName + "-voice",
            type: ChannelType.GuildVoice,
            parent: category.categoryId,
            permissionOverwrites: overwrites,
        }),
    ]);
};

export const ValidateTeamName = (rawName: string): boolean => {
    const discordified = Discordify(rawName);

    const length = rawName.length <= Config.teams.max_name_length;
    const rawCharset = !!rawName.match(/^[a-z0-9\- ]+$/i);
    const channelNameSafe = !!discordified.match(/^(?:[a-z0-9]+(?:-[a-z0-9]+)*)$/);

    return length && rawCharset && channelNameSafe;
};

export const GetUnfilledTeamCategory = async (guild: Guild): Promise<DiscordCategory> => {
    const discordCategories = await GetAllCategories();
    const openCategories = discordCategories.filter(
        (cat) => cat._count.teams < Config.teams.teams_per_category
    );
    if (openCategories.length > 0) {
        return openCategories[0];
    }

    // no free category, need to create
    const categoryCount = discordCategories.length;
    const newCategoryName = `${Config.teams.category_base_name} ${categoryCount + 1}`;
    const newCategory = await guild.channels.create({
        name: newCategoryName,
        type: ChannelType.GuildCategory,
    });

    // insert new category group in database
    return await CreateCategory(newCategory.id);
};

export const HandleLeaveTeam = async (
    guild: Guild,
    user: User,
    team?: Team
): Promise<string> => {
    team ??= (await GetHackerTeam(user.id)) ?? undefined;
    if (!team) {
        return "Could not find user's team";
    }

    return HandleMemberLeave(guild, user, team);
};

const HandleMemberLeave = async (
    guild: Guild,
    user: User,
    team: Team
): Promise<string> => {
    let error: string = "";

    await WithTransaction(async () => {
        /**
         * When a member leaves a team, we need to:
         * 1. Unlink the member from the team
         * 2. Remove the member's permissions to view the team channels
         * 3. Check if the team has become empty or not. If it has, the message
         *    indicating someone left should also indicate the team is now abandoned.
         */

        if ((await RemoveHackerFromTeam(user.id)) === null) {
            error = "Couldn't remove member from their team in the database";
            return false;
        }

        // Resolve team channels
        const text = await guild!.channels.fetch(team.textChannelId) as TextChannel;
        const voice = await guild!.channels.fetch(team.voiceChannelId) as VoiceChannel;
        if (!text || !voice) {
            error = "Failed to get team channels";
            return false;
        }

        try {
            // revoke user permissions
            text.permissionOverwrites.delete(user.id, "Member left team");
            voice.permissionOverwrites.delete(user.id, "Member left team");
        } catch {
            error = "Failed to revoke permissions";
            return false;
        }

        const teamMembers = await GetMembersOfTeam(team.stdName);
        const extra = teamMembers.length <= 0 ? "**This team is now abandoned.**" : "";

        try {
            // send leave message
            await (text as GuildTextBasedChannel).send(
                SuccessMessage({
                    emote: ":frowning:",
                    title: "Member Left",
                    message: `${user} has left the team. ${extra}`,
                })
            );
        } catch (err) {
            error = `${err}`;
        }

        return true;
    });

    return error;
};

export const HandleMemberJoin = async (guild: Guild, team: Team, userId: string) => {
    const [text, voice] = await Promise.all([
        (await guild.channels.fetch(team.textChannelId)) as TextChannel | null,
        (await guild.channels.fetch(team.voiceChannelId)) as VoiceChannel | null,
    ]);

    await Promise.all([
        text!.permissionOverwrites.edit(userId, TEAM_MEMBER_PERMS),
        voice!.permissionOverwrites.edit(userId, TEAM_MEMBER_PERMS),
    ]);

    await text!.send(
        SuccessMessage({
            title: "Members++",
            message: `${userMention(userId)} has joined the team!`,
        })
    );
};

export const HandleMemberDecline = async (guild: Guild, team: Team, userId: string) => {
    const text = (await guild.channels.fetch(team.textChannelId)) as TextChannel | null;
    await text!.send(
        ErrorMessage({
            emote: ":slight_frown:",
            title: "Invite Declined",
            message: `${userMention(userId)} declined to join your team.`,
        })
    );
};

export const Discordify = (raw: string): string => {
    return raw.replaceAll(" ", "-").toLowerCase();
};
