/**
 * Clamps a value between two other values.
 *
 * This function takes a value `v` and clamps it between `a` and `b`.
 * If `v` is less than `a`, it returns `a`. If `v` is greater than `b`, it returns `b`.
 * Otherwise, it returns `v` as is.
 *
 * @param {number} v - The value to be clamped.
 * @param {number} a - The lower bound of the clamping range.
 * @param {number} b - The upper bound of the clamping range.
 * @returns {number} The clamped value.
 */
export function clamp(v, a, b){
    return Math.min(Math.max(v, a), b)
}