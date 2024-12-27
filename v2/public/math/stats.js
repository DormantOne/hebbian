/**
 * Evaluates a modified bell curve function that forms a "shelf" shape.
 * This function returns 1 for all values less than the mean, and follows
 * a Gaussian curve for values greater than or equal to the mean.
 *
 * @param {number} mu - The mean (μ) of the distribution, which marks the start of the curve.
 * @param {number} sigma - The standard deviation (σ) of the distribution, which affects the width of the curve.
 * @param {number} x - The input value to evaluate on the curve.
 * @returns {number} The y-value on the curve, ranging from 0 to 1. Returns 1 for all x < μ.
 */
export function evalBellCurveShelf(mu, sigma, x) {
    if (x < mu) {
        return 1
    }
    return Math.exp(-(((x-mu)/sigma)**2))
}