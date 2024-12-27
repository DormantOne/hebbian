/**
 * A collection of helper functions implemented procedurally
 * to avoid the slowdown and stack overflows due to the recursive nature
 * of built in JavaScript functions such as Math.min and Math.max when
 * accepting variadic arguments (usually spread arrays)
 */

/**
 * Finds the minimum value in an array of numbers.
 *
 * @param {number[]} values - The array of numbers to search through.
 * @returns {number} The minimum value in the array. Returns NaN if the array is empty.
 */
export function procMin(values){
    if(values.length === 0){
        return NaN
    }
    let min = values[0]
    for(let i = 1; i < values.length; i++){
        if(values[i] < min){
            min = values[i]
        }
    }
    return min
}

/**
 * Finds the maximum value in an array of numbers.
 *
 * @param {number[]} values - The array of numbers to search through.
 * @returns {number} The maximum value in the array. Returns NaN if the array is empty.
 */
export function procMax(values){
    if(values.length === 0){
        return NaN
    }
    let max = values[0]
    for(let i = 1; i < values.length; i++){
        if(values[i] > max){
            max = values[i]
        }
    }
    return max
}

export function procMean(values){
    if(values.length === 0){
        return NaN
    }
    let sum = 0
    for(let i = 0; i < values.length; i++){
        sum += values[i]
    }
    return sum / values.length
}