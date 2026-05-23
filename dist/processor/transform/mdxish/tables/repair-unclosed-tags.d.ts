import { type RepairResult } from './utils';
/**
 * Rewrites `html` so every open tag has a matching close. Returns the input
 * unchanged when nothing needed repair, so callers can cheaply detect no-ops.
 *
 * Detection runs through htmlparser2: any close event flagged `implicit` is
 * a tag the user opened but didn't explicitly close. We pair it with the
 * matching opener (popped from a stack we maintain) and insert `</name>` at
 * the end of the opener's line, or at the trigger if they're on the same line.
 */
export declare const repairUnclosedTags: (html: string) => RepairResult;
