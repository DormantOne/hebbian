 /**
  * @typedef {import('./Simulation.js').SimulationParams} SimulationParams
  */
 /**
  * @typedef {import('./NetworkNode.js').default} NetworkNode
  */


import { MapUtil } from '../utils/collections.js';
import SimulationError from './SimulationError'

export default class Brain {
    /**
     * 
     * @param {SimulationParams} params 
     * @param {Map<string,NetworkNode>} nodes 
     */
    constructor(params, nodes, edges) {
        this.params = params;
        this.nodes = nodes;
        this.edges = edges;
    }

    /**
     * @param {number} deltaTime - Time (in seconds) since the last update.
     * @param {number} fitness  - Current fitness of the brain.
     */
    __update(deltaTime,fitness){
        // Traverse in random order to avoid traversal order effects
        // Using a buffer based approach is more accurate but more difficult to implement as well as doubling the memory requirement
        new MapUtil(this.nodes).forEachEntryFisherYates((node, i) => {
            // todo
        })
    }
}
