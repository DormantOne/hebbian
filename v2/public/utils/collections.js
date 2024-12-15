import fisherYatesShuffled from '../third-party/npm/fisher-yates.js'

/**
 * @param {number} N 
 */
export function iota(N){
    return new Array(N).fill(null).map((_, i) => i)
}

/**
 * Traverses through an array in a randomized order and performs a callback on each element.
 * 
 * @param {Array<any>} arr 
 * @param {(value?: any, traversalIndex?: number)=>any|void} callback 
 */
export function forEachFisherYates(arr, callback){
    const indices = iota(arr.length)
    const shuffledIndices = fisherYatesShuffled(indices)
    shuffledIndices.forEach((index, i) => callback(arr[index], i))
}

export function randomChoice(arr){
    return arr[Math.floor(Math.random() * arr.length)]
}

export function randomChar(str){
    return str[Math.floor(Math.random() * str.length)]
}

export function randomCharSequence(charset,length){
    return iota(length).map(() => randomChoice(charset)).join('')
}


/**
 * A wrapper around a Map used to implement any useful operations we may encounter while developing this project
 */
export class MapUtil {
    static DEFAULT_OPTIONS = {
        idCodeCharset:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        idCodeLength:10,
    }
    constructor(map, options={}){
        this.map = map
        this.options ={...MapUtil.DEFAULT_OPTIONS,...options} 
    }

    randomUniqueKey(){
        const existingKeys = new Set(this.map.keys())
        let key
        do {
            key = randomCharSequence(this.options.idCodeCharset, this.options.idCodeLength)
        } while(existingKeys.has(key))
        return key
    }

    getOrThrow(key){
        const value = this.map.get(key)
        if(value === undefined){
            throw new Error(`Key "${key}" not found in map`)
        }
        return value
    }

    addWithUniqueKey(value){
        const key = this.randomUniqueKey()
        this.map.set(key, value)
        return this.getOrThrow(key)
    }

    getOrAddWithUniqueKey(value){
        if(this.map.has(key)){
            return this.getOrThrow(key)
        }
        return this.addWithUniqueKey(value)
    }

    setOrAddWithUniqueKey(key, value){
        this.map.set(key, value)
        return this.getOrThrow(key)
    }

    has(key){
        return this.map.has(key)
    }

    forEachEntryFisherYates(callback){
        const keys = Array.from(this.map.keys())
        const shuffledKeys = fisherYatesShuffled(keys)
        shuffledKeys.forEach((key, i) => callback([key, this.getOrThrow(key)],i))
    }

}