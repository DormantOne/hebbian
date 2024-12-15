export function randomUniformInclusive(min=-1, max=1, resolution=1_000_000){
    const t = Math.floor(Math.random() * resolution)/(resolution-1)
    return min + t * (max - min)
}