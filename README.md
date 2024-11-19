# WinHacks 2025 Discord Bot

Bot for WinHacks 2025, written in Typescript with Discord.JS. Uses a SQLite database to store team information and the Google Sheets API to verify users based on the results of an application form.

## Configuration

To start, copy `config.json5.example` to `config.json5`.

```bash
# Mac/Linux:
cp config.json5.example config.json5

# Windows:
copy config.json5.example config.json5
```

**Reminder:** do not under _any_ circumstances commit the `config.json5` file to version control. It more than likely contains secret information that you _really_ should keep secret.

### Discord API Configuration

The Discord API configuration has two "modes" or "groups": **production**, which is the application for the production bot, and **development**, which is the application for the bot "beta" or "in development".

The `dev_mode` option is a boolean which selects between the **production** and **development** modes.

Each mode has the same configuration:

-   `app_id`: Your application ID. It is located on the "general information" tab of [your application's page](https://discord.com/developers/applications)
-   `api_token`: Your bot's token. You can find it [here](https://discord.com/developers/applications), under your application > Bot > Token.
-   `api_version`: usually `"9"`. The bot will probably break with any other version.
-   `bot_uid`: the "permission integer" for the bot. You can simply use `8` (Administrator).

### Google Sheets API Configuration

To configure the bot to work with the Google Sheets API, you will need a Google Cloud Platform project with the Google Sheets API enabled and a Service Account.

Once you have a service account, you want to add a JSON key for it. Copy the `private_key` and `client_email` fields into the respective fields in the bot config. Newlines are important. You can use `\n` instead of actually breaking the string across lines, if you wish.

`scopes` is an array of scopes you wish to have for the bot. Currently, all you need is `https://www.googleapis.com/auth/spreadsheets.readonly`.

Helpful links:

-   [Creating a GCP Project](https://developers.google.com/workspace/guides/create-project)
-   [Enabling the Google Sheets API](https://developers.google.com/workspace/guides/enable-apis)
-   [Creating a Service Account & Keys](https://developers.google.com/workspace/guides/create-credentials#service-account)
-   [Google Sheets API Scopes](https://developers.google.com/identity/protocols/oauth2/scopes#sheets)

### Command Specific Configuration

#### Bot Info

-   `name`: the name to appear on the embed.
-   `color` (optional): a hexadecimal number (such as `0x14c3a2`) representing the color of all embeds the bot sends.
-   `event_name`: the name of the event the bot is being used for. The bot will use this when referring to the event.
-   `title_url` (optional): a URL the embed title should link to. Can be anything, such as the bot's GitHub/GitLab repository, or your event's homepage.
-   `thumbnail` (optional): An external image link to place in the embed thumbnail.
-   `description`: the text content to place in the embed description. Markdown-style inline links are supported.

#### Verify

-   `registration_url`: the URL to register for the event.
-   `target_sheet_id`: the ID of the spreadsheet to use for verification. It will need to be shared with the service worker account. You can find the ID in the sheet URL: `https://docs.google.com/spreadsheets/d/**SHEET_ID_HERE**/edit`.
-   `target_sheet`: the name of the sheet to use for verification data.
-   `first_name_column`: the column in the `target_sheet` that contains a user's first name. Must be a single letter.
-   `last_name_column`: the column in the `target_sheet` that contains a user's last name. Must be a single letter.
-   `email_column`: the column in the `target_sheet` that contains emails to verify users against. Must be a single letter.
-   `verified_role_name`: the display name of the role to give verified users.
-   `channel_id`: the id of the channel which is used for verification. **Users are not restricted to using the command in this channel, but rather linked to it when they use `/apply`**.

#### Teams

-   `max_name_length`: the number of characters which is considered too long fora team name. Discord limits this to 100.
-   `max_team_size`: the maximum number of members in a team.
-   `teams_per_category`: the number of teams that can be in one channel category. Each team has 2 channels, and Discord doesn't allow more than 50 channels per category, so this should be no more than 25.
-   `category_base_name`: the base name of a team category. The category number is appended to this. For example, base name `Teams` would become `Teams 1` when the first category is created.
-   `moderator_roles`: the names of any additional roles that should be allowed to view all team channels.

#### Socials

The socials item is an array of key-value pairs (`displayName: link`) that tells the bot how to display and link to each social media account. For example: `socials: [{displayName: "Twitter", link: "https://twitter.com/YourOrganization"}]` would show as `Twitter` and link to `https://twitter.com/YourOrganization`.

## Running the Bot

Now that you've configured everything, you need to start it up. We use Docker to make that very simple.

For hosting, its as simple as `yarn docker:host`. Similarly, for development, is as simple as `yarn dev`. You can also install `pino-pretty` with `yarn global add pino-pretty` and use `yarn dev-pretty` for nicer looking logs.
