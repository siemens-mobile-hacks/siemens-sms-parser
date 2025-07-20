/**
 * Takes an iMelody string (including BEGIN … END).
 * Parses header and MELODY field.
 * Expands repeats, interprets rests, dotted / double-dotted / ⅔ notes, styles and volume changes.
 * Schedules audio with the Web Audio API.
 *
 * @param imelodyString - The iMelody string to play
 * @returns A promise that resolves when the melody finishes playing
 */
export function playIMelody(imelodyString: string): Promise<void>;
