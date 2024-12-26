import lerp from "../math/lerp.js";
import {clamp} from "../math/numeric.js";

/**
 * Interpolates between two RGBA color values based on a given interpolation factor.
 *
 * @param {number} t - The interpolation factor (between 0 and 1).
 * @param {Array} [start=[0, 0, 0, 1]] - The starting RGBA color value as an array [R, G, B, A].
 * @param {Array} [end=[255, 255, 255, 1]] - The ending RGBA color value as an array [R, G, B, A].
 * @returns {Array} - The interpolated RGBA color value as an array [R, G, B, A].
 */
export function interpolateRGBA(
  t,
  start = [0, 0, 0, 1],
  end = [255, 255, 255, 1],
) {
  const startCopy = [...start];
  if (startCopy.length < 4) {
    startCopy.push(1);
  }
  const endCopy = [...end];
  if (endCopy.length < 4) {
    endCopy.push(1);
  }
  const R = lerp(startCopy[0], endCopy[0], t);
  const G = lerp(startCopy[1], endCopy[1], t);
  const B = lerp(startCopy[2], endCopy[2], t);
  const A = lerp(startCopy[3], endCopy[3], t);
  return [R, G, B, A];
}

/**
 * Formats RGBA color values into a CSS-compatible string.
 * Non integer RGB values are rounded to the nearest integer.
 * RGB values are clamped to the range [0, 255].
 * A values are clamped to the range [0, 1].
 *
 * @param {number[]|number} rgbaArrayOrR - Either an array of RGBA values [R, G, B, A] or the red component value.
 * @param {number} [g] - The green component value (when not using an array).
 * @param {number} [b] - The blue component value (when not using an array).
 * @param {number} [a=1] - The alpha component value (when not using an array), defaults to 1.
 * @returns {string} A CSS-compatible rgba() string representation of the color.
 * @throws {Error} If the arguments are not in the correct format.
 */
export function formatRGBACss(rgbaArrayOrR, g, b, a = 1) {
  if (Array.isArray(rgbaArrayOrR)) {
    if ((typeof g !== "undefined" && typeof b !== "undefined") || a !== 1) {
      throw new Error(
        "Incorrect arguments expected either a single array or individual RGB(A?) values."
      );
    }
  }
  const R = clamp(Math.round(rgbaArrayOrR[0]), 0, 255);
  const G = clamp(Math.round(rgbaArrayOrR[1]), 0, 255);
  const B = clamp(Math.round(rgbaArrayOrR[2]), 0, 255);
  const A = clamp(rgbaArrayOrR[3] || a, 0, 1);
  return `rgba(${R}, ${G}, ${B}, ${A})`;
}
