import SimulationError from './SimulationError.js'

export default class Simulation{
    constructor(){

    }
    start(){
        throw new SimulationError("Simulation not yet implemented. Stay tuned!")
        return this
    }
    pause(){
        return this
    }
    resume(){
        return this
    }
}