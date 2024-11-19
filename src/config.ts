import {readFileSync} from "fs";
import {logger} from "./logger";
import {parse as parseJSON5} from "json5";

interface ModeType {
    api_token: string;
    app_id: string;
    bot_uid: number;
    guild: string;
}

interface ConfigType {
    // discord API config
    production: ModeType;
    development: ModeType;

    dev_mode: boolean;

    // Google Sheets API config
    sheets_api: {
        scopes: string[];
        private_key: string;
        client_email: string;
    };

    // MongoDB API config
    mongo_db: {
        database_url: string;
        certificate: string;
        private_key: string;
    };

    // verify command config
    verify: {
        registration_url: string;
        target_sheet_id: string;
        target_sheet: string;
        first_name_column: string;
        last_name_column: string;
        email_column: string;
        verified_role_name: string;
        channel_id: string;
    };

    // teams command group config
    teams: {
        max_name_length: number;
        max_team_size: number;
        teams_per_category: number;
        category_base_name: string;
        moderator_roles: string[];
    };

    // info command config
    bot_info: {
        name: string;
        color: number; // a hex literal is preferred
        event_name: string;
        title_url?: string;
        thumbnail?: string;
        description: string;
    };

    socials: Array<{
        displayName: string;
        link: string;
    }>;
}

let Config: ConfigType;

const LoadConfig = (file: string) => {
    const data = readFileSync(file, "utf-8");
    Config = parseJSON5(data) as ConfigType;

    logger.level = Config.dev_mode ? "debug" : "info";
};

export {Config, LoadConfig, ConfigType};
