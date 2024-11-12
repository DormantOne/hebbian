import SimulationError from './SimulationError.js'

export default class Simulation{
    constructor(){

    }
    start(){
        throw new SimulationError("This is a test error message")
        return this
    }
    pause(){
        return this
    }
    resume(){
        return this
    }
}