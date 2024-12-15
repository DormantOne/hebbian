/**
 * @typedef {import('./Simulation.js').SimulationParams} SimulationParams
 */

export default class NetworkEdge {
  /**
   * @param {number} strength
   * @param {SimulationParams} simParams 
   */
  constructor(strength, simParams) {
    this.sourceNodeId = null;
    this.targetNodeId = null;
    this.strength = strength;
    this.simParams = simParams;
    this.active = true;
    this.remainingLifetime = simParams.edgeInactiveLifetime;
  }
}