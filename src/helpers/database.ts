import {PrismaClient} from "@prisma/client";
import {Discordify} from "../commands/team/team-shared";

const prisma = new PrismaClient();

export const DisconnectDatabase = async () => {
    await prisma.$disconnect();
};

export const GetStandardizedTeamName = (displayName: string): string => {
    return Discordify(displayName).toLowerCase();
};

/**
 * Determines how many (un)verified hackers the bot knows about. The bot knows
 * about a hacker if they have ever successfully ran `/verify`, even if they
 * have since used `/unverify`.
 *
 * @param includeUnverified whether or not to include unverified hackers.
 * @returns the number of hackers, optionally including unverified ones.
 */
export const GetHackerCount = async (): Promise<number> => {
    return await prisma.hacker.count();
};

export const UpsertHacker = async (
    discordId: string,
    firstName: string,
    lastName: string,
    email: string
) => {
    return await prisma.hacker.upsert({
        create: {discordId, firstName, lastName, email},
        update: {discordId, firstName, lastName, email},
        where: {discordId},
    });
};

export const GetHacker = async (discordId: string) => {
    return await prisma.hacker.findUnique({where: {discordId}, include: {team: true}});
};

export const DeleteHacker = async (discordId: string) => {
    return await prisma.hacker.delete({where: {discordId}});
};

export const IsEmailVerified = async (email: string): Promise<boolean> => {
    const hackerUsingEmail = await prisma.hacker.findFirst({
        where: {email: email},
    });
    return hackerUsingEmail !== null;
};

export const GetTeam = async (standardName: string) => {
    return await prisma.team.findUnique({where: {stdName: standardName}});
};

export const GetMembersOfTeam = async (standardName: string) => {
    return await prisma.hacker.findMany({where: {teamStdName: standardName}});
};

export const CreateTeam = async (
    displayName: string,
    categoryId: string,
    textChannelId: string,
    voiceChannelId: string
) => {
    try {
        const stdName = GetStandardizedTeamName(displayName);
        return await prisma.team.create({
            data: {stdName, displayName, categoryId, textChannelId, voiceChannelId},
        });
    } catch {
        return null;
    }
};

export const DeleteTeam = async (standardName: string) => {
    try {
        return await prisma.team.delete({where: {stdName: standardName}});
    } catch {
        return null;
    }
};

export const AddHackerToTeam = async (teamStdName: string, discordId: string) => {
    return await prisma.hacker.update({
        where: {discordId},
        data: {teamStdName},
    });
};

export const RemoveHackerFromTeam = async (discordId: string) => {
    try {
        return await prisma.hacker.update({
            where: {discordId},
            data: {teamStdName: null},
        });
    } catch {
        return null;
    }
};

export const UpsertInvite = async (inviteeId: string, teamStdName: string) => {
    try {
        return await prisma.invite.upsert({
            create: {teamStdName, inviteeId},
            update: {},
            where: {
                inviteeId_teamStdName: {inviteeId, teamStdName},
            },
        });
    } catch {
        return null;
    }
};

export const DeleteInvite = async (inviteeId: string, teamStdName: string) => {
    return await prisma.invite.delete({
        where: {inviteeId_teamStdName: {inviteeId, teamStdName}},
    });
};

export const GetHackerInvites = async (discordId: string) => {
    return await prisma.invite.findMany({where: {inviteeId: discordId}});
};

export const GetInvite = async (inviteeId: string, teamStdName: string) => {
    return await prisma.invite.findUnique({
        where: {
            inviteeId_teamStdName: {inviteeId, teamStdName},
        },
        include: {
            Team: true,
        },
    });
};

/**
 * Finds and returns the team a Discord user belongs to, if one exists.
 *
 * @param discordId the discord snowflake identifying the user
 * @returns the team that the discord user belongs to, or null if
 * they are not in a team.
 */
export const GetHackerTeam = async (discordId: string) => {
    const hacker = await GetHacker(discordId);
    if (!hacker?.teamStdName) {
        return null;
    }

    return await GetTeam(hacker.teamStdName);
};

export const CreateCategory = async (id: string) => {
    return await prisma.discordCategory.create({data: {categoryId: id}});
};

export const GetAllCategories = async () => {
    return await prisma.discordCategory.findMany({
        include: {
            _count: {
                select: {
                    teams: true,
                },
            },
        },
    });
};

/**
 * Runs a given function within the context of a database transaction. The function
 * return `false` or throw an error to abort the transaction. If the function
 * completes returning `true`, the transaction is committed.
 * @param callback the function to run
 * @returns whether or not the transaction completed
 */
export const WithTransaction = async (callback: () => Promise<boolean>) => {
    let result: boolean = true;

    await prisma.$transaction(async (tx) => {
        try {
            result = await callback();
            if (!result) {
                throw Error("Aborting transaction");
            }
        } catch (e) {
            result = false;
            throw e;
        }
    });

    return result;
};
