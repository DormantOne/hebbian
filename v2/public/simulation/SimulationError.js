export default class SimulationError extends Error {
    constructor(message) {
        super(message);
        this.name = "SimulationError";
    }
}   