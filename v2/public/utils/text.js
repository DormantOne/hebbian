/**
 *     • Trims a string
 *       Splits it over its lines
 *       Adds leading whitespace to each line
 *       On the first line, some of the leading whitespace is replace by a utf8 bullet
 * 
 * First line:  4 spaces, bullet, space
 * Other Lines: 6 spaces
 */
export function formatBulletedListEntry(text) {
    // Trim the input text
    const trimmedText = text.trim();

    // Split the text into lines
    const lines = trimmedText.split('\n');

    // Process each line
    const formattedLines = lines.map((line, index) => {
        if (index === 0) {
            // First line: 4 spaces, bullet, space
            return `    • ${line.trim()}`;
        } else {
            // Other lines: 6 spaces
            return `      ${line.trim()}`;
        }
    });

    // Join the lines back together
    return formattedLines.join('\n');
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} str - The input string to capitalize.
 * @returns {string} The input string with its first letter capitalized.
 * @throws {TypeError} If the input is not a string.
 */
export function capitalizeFirstLetter(str) {
    if (typeof str !== 'string') {
        throw new TypeError('Input must be a string');
    }

    if (str.length === 0) {
        return str;
    }

    return str.charAt(0).toUpperCase() + str.slice(1);
}