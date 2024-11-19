import {Collection, User} from "discord.js";

export const Remove = <T>(collection: Array<T>, element: T): Array<T> => {
    return collection.filter((e) => e !== element);
};

export const PrettyUser = (usr: User) => {
    return `${usr.username}#${usr.discriminator}`;
};

export const GetDefault = <K, V>(col: Collection<K, V>, key: K, defaultValue: V): V => {
    if (col.has(key)) {
        return col.get(key)!;
    } else {
        return defaultValue;
    }
};

export const AllResolve = async (promises: readonly any[]) => {
    const res = await Promise.allSettled(promises);
    if (res.map((e) => e.status).includes("rejected")) {
        return false;
    } else {
        return true;
    }
};

export const SelectPlural = (
    n: number,
    zero: string,
    singular: string,
    plural: string
) => {
    switch (n) {
        case 0:
            return zero;
        case 1:
            return singular;
        default:
            return plural;
    }
};
