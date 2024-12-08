import { procMin, procMax } from "./procedural.js";

export default class DynamicScale {
  /**
   * @param {number} cutoff - The smallest value range of values.
   * For smaller ranges, NaN is always returned
   */
  constructor(cutoff) {
    this.cutoff = cutoff;
    this.start = NaN;
    this.range = NaN;
  }
  /**
   * Computes the scale based on the given values.
   *
   * @param {number[]} values - An array of numeric values to compute the scale from.
   * @returns {DynamicScale} The current instance of DynamicScale, allowing for method chaining.
   *                         If a valid range is found and it's greater than or equal to the cutoff,
   *                         the start and range properties are updated. Otherwise, they are set to NaN.
   */
  compute(values) {
    const foundMin = procMin(values);
    const foundMax = procMax(values);
    if (!isNaN(foundMin) && !isNaN(foundMax)) {
      const foundRange = foundMax - foundMin;
      if (foundRange < this.cutoff) {
        this.start = NaN;
        this.range = NaN;
        return this;
      }
      this.start = foundMin;
      this.range = foundMax - foundMin;
      return this;
    }
    this.start = NaN;
    this.range = NaN;
    return this;
  }

  /**
   * Resets the scale by clearing its start and range values.
   *
   * @returns {DynamicScale} The current instance of DynamicScale, allowing for method chaining.
   */
  clear() {
    this.start = NaN;
    this.range = NaN;
    return this;
  }
  /**
   * Calculates the normalized level of a given value within the scale's range.
   *
   * @param {number} value - The input value to calculate the level for.
   * @returns {number} The normalized level of the input value within the scale's range.
   *                   Returns NaN if the scale's start or range is not set (NaN).
   */
  getLevel(value) {
    if (isNaN(this.start) || isNaN(this.range)) {
      return NaN;
    }
    return (value - this.start) / this.range;
  }
  /**
   * Calculates the level for a given value or returns a default value if the result is NaN.
   *
   * @param {number} value - The input value to calculate the level for.
   * @param {number} defaultValue - The value to return if the calculated level is NaN.
   * @returns {number} The calculated level for the input value, or the default value if the result is NaN.
   */
  getLevelOrDefault(value, defaultValue) {
    const level = this.getLevel(value);
    if (isNaN(level)) {
      return defaultValue;
    }
    return level;
  }
  /**
   * Calculates a clamped level for a given value, ensuring the result is between 0 and 1.
   *
   * @param {number} value - The input value to calculate the level for.
   * @returns {number} The clamped level, which is guaranteed to be between 0 and 1.
   *                   Returns 0 if the calculated level is less than 0,
   *                   1 if it's greater than 1, or the actual calculated level otherwise.
   */
  getLevelClamped(value) {
    const level = this.getLevelOrDefault(value, 0);
    if (level < 0) {
      return 0;
    }
    if (level > 1) {
      return 1;
    }
    return level;
  }
  /**
   * Calculates a clamped level for a given value or returns a default value if the result is NaN.
   *
   * @param {number} value - The input value to calculate the level for.
   * @param {number} defaultValue - The value to return if the calculated level is NaN.
   * @returns {number} The clamped level (between 0 and 1) for the input value, or the default value if the result is NaN.
   */
  getLevelClampedOrDefault(value, defaultValue) {
    const level = this.getLevelClamped(value);
    if (isNaN(level)) {
      return defaultValue;
    }
    return level;
  }

  /**
   * Interpolate a value based on a color scale and the previously computed range
   *
   * @param {number} value
   * @param {[number, number, number]} startColor
   * @param {[number, number, number]} endColor
   * @param {[number, number, number]} defaultColor
   */
  interpolateLevelColor(value, startColor, endColor, defaultColor) {
    const level = this.getLevelClamped(value);
    if (isNaN(level)) {
      return defaultColor;
    }
    const red = Math.round(
      startColor[0] + (endColor[0] - startColor[0]) * level
    );
    const green = Math.round(
      startColor[1] + (endColor[1] - startColor[1]) * level
    );
    const blue = Math.round(
      startColor[2] + (endColor[2] - startColor[2]) * level
    );
    return [red, green, blue];
  }
}
