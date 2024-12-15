/**
 * @typedef {import('./Simulation.js').SimulationParams} SimulationParams
 */
/**
 * @typedef {import('./NetworkNode.js').default} NetworkNode
 */

import { randomUniformInclusive } from "../math/random.js";
import DebugConsole from "../ui/DebugConsole.js";
import { MapUtil } from "../utils/collections.js";
import { VisCoord } from "../visualization/coordinates.js";
import NetworkNode, { NetworkNodeRole } from "./NetworkNode.js";

export default class NetworkProcessor {
  /**
   *
   * @param {SimulationParams} params
   * @param {Map<string,NetworkNode>} nodes
   */
  constructor(params, nodes, edges, nodeVisValueScale) {
    this.params = params;
    this.nodes = nodes;
    this.nodeVisValueScale = nodeVisValueScale;
  }

  spawnNode() {
    if (this.nodes.size >= this.params.maxNodes) {
      DebugConsole.error("Maximum number of nodes reached");
      return;
    }
    DebugConsole.log("Spawning new node...");
    const [ncExtentW, ncExtentH] = VisCoord.getNCExtent();
    const newNode = new NetworkNode(
      NetworkNodeRole.NORMAL,
      [
        randomUniformInclusive(-1, 1) * ncExtentW,
        randomUniformInclusive(-1, 1) * ncExtentH,
      ],
      this.params,
      this.nodeVisValueScale,
      {
        visualScale: 2,
      }
    );
    new MapUtil(this.nodes).addWithUniqueKey(newNode);

  }

  /**
   * @param {number} deltaTime - Time (in seconds) since the last update.
   * @param {number} fitness  - Current fitness of the brain.
   */
  __update(deltaTime, fitness) {
    // Traverse in random order to avoid traversal order effects
    // Using a buffer based approach is more accurate but more difficult to implement as well as doubling the memory requirement
    new MapUtil(this.nodes).forEachEntryFisherYates((node, i) => {
      // todo
    });

    if (Math.random() < deltaTime * this.params.nodeSpawnRate) {
      this.spawnNode();
    }
  }
}
