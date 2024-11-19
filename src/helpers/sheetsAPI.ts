import {google} from "googleapis";
import {Config} from "../config";
import {logger} from "../logger";

export type MajorDimension = "ROWS" | "COLUMNS";

const sheets = google.sheets("v4").spreadsheets;

export const AuthenticateGoogleAPI = async () => {
    const client = await google.auth.getClient({
        scopes: Config.sheets_api.scopes,
        credentials: {
            client_email: Config.sheets_api.client_email,
            private_key: Config.sheets_api.private_key,
        },
    });
    google.options({auth: client});
};

export const BuildRange = (sheet: string, startCell: string, endCell: string) => {
    return `${sheet}!${startCell}:${endCell}`;
};

export const BuildSingleCellRange = (sheet: string, cell: string) => {
    return BuildRange(sheet, cell, cell);
};

/**
 * Gets data from `target`
 * @param target_id the ID of the sheet to read from
 * @param range the range of cells to read
 * @param major the major dimension. When ROWS, the data is returned as an array of rows (cols => array of cols)
 * @returns a response from the Sheets API containing the data
 */
export const GetRange = async (
    target_id: string,
    range: string,
    major: MajorDimension = "ROWS"
) => {
    return sheets.values.get({
        spreadsheetId: target_id,
        range: range,
        majorDimension: major,
    });
};

/**
 * Returns the data in a single column of `targetSheet` on page `sheetNumber` in column-major form
 * @param target the ID of the sheet to read data from
 * @param col a single letter, identifying the column read from
 * @param target_sheet an optional number, specifying the page number of the `target` to read from
 * @returns a string array of the data in column `col` of `target`'s page `page`
 */
export const GetColumn = async (
    target_id: string,
    target_sheet: string = "Sheet1",
    col: string
): Promise<string[]> => {
    const range = BuildRange(target_sheet, col, col);
    return (await GetRange(target_id, range, "COLUMNS")).data.values![0];
};

/**
 * Returns the data in a single row of `target` on page `page` in row-major form
 * @param target_id the ID of the sheet to read data from
 * @param row a single number, identifying the row to get data from. First row is `1`.
 * @param page an optional number, specifying the page number of the `target` to read from
 * @returns a string array of the data in row `row` of `target`'s page `page`
 */
export const GetRow = async (
    target_id: string,
    target_sheet: string = "Sheet1",
    row: number | string
): Promise<string[]> => {
    const range = BuildRange(target_sheet, `${row}`, `${row}`);
    return (await GetRange(target_id, range, "ROWS")).data.values![0];
};

export const GetUserData = async (email: string) => {
    // get data from sheets API
    const emailColumn = await GetColumn(
        Config.verify.target_sheet_id,
        Config.verify.target_sheet,
        Config.verify.email_column
    );

    const lowerCaseEmailColumn = emailColumn.map((e) => e.toLowerCase());
    const emailIndex = lowerCaseEmailColumn.lastIndexOf(email);
    logger.info(`Found ${email} in row ${emailIndex}`);

    // email not in column, this user should not be verified
    if (emailIndex === -1) {
        return null;
    }

    const emailRowNumber = emailIndex + 1;
    const ranges = await sheets.values.batchGet({
        spreadsheetId: Config.verify.target_sheet_id,
        majorDimension: "ROWS",
        ranges: [
            BuildSingleCellRange(
                Config.verify.target_sheet,
                `${Config.verify.first_name_column}${emailRowNumber}`
            ),
            BuildSingleCellRange(
                Config.verify.target_sheet,
                `${Config.verify.last_name_column}${emailRowNumber}`
            ),
            BuildSingleCellRange(
                Config.verify.target_sheet,
                `${Config.verify.email_column}${emailRowNumber}`
            ),
        ],
    });

    if (ranges.status !== 200) {
        return null;
    }

    const [firstNameValues, lastNameValues, emailValues] = ranges.data.valueRanges!;
    return {
        firstName: firstNameValues.values![0][0],
        lastName: lastNameValues.values![0][0],
        email: emailValues.values![0][0],
    };
};
