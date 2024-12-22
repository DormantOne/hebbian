import { randomUniformInclusive } from "../math/random.js";
import DebugConsole from "../ui/DebugConsole.js";
import { MapUtil } from "../utils/collections.js";
import { VisCoord } from "../visualization/coordinates.js";
import NetworkNode, { NetworkNodeRole } from "./NetworkNode.js";
import NetworkEdge from "./NetworkEdge.js";
import { randomChoice } from "../utils/collections.js";

/**
 * @typedef {import('./Simulation.js').SimulationParams} SimulationParams
 */
/**
 * @typedef {import('./NetworkNode.js').default} NetworkNode
 */

export default class NetworkProcessor {
  /**
   *
   * @param {SimulationParams} params
   * @param {Map<string,NetworkNode>} nodes
   */
  constructor(params, nodes, edges, nodeVisValueScale, edgeVisStrengthScale) {
    this.params = params;
    this.nodes = nodes;
    this.edges = edges;
    this.nodeVisValueScale = nodeVisValueScale;
    this.edgeVisStrengthScale = edgeVisStrengthScale;
  }

  spawnNode() {
    if (this.nodes.size >= this.params.maxNodes) {
      DebugConsole.error("Maximum number of nodes reached");
      return;
    }
    DebugConsole.log("Spawning new node...");
    const [ncExtentW, ncExtentH] = VisCoord.getNCExtent();
    const smallerNCExtent = Math.min(ncExtentW, ncExtentH);
    const newNode = new NetworkNode(
      NetworkNodeRole.NORMAL,
      [
        randomUniformInclusive(-1, 1) * smallerNCExtent,
        randomUniformInclusive(-1, 1) * smallerNCExtent,
      ],
      this.params,
      this.nodeVisValueScale,
      {
        visualScale: 2,
      },
      this.nodes,
      this.edges
    );
    new MapUtil(this.nodes).addWithUniqueKey(newNode);
  }

  connectWithEdge(sourceNodeId, targetNodeId) {
    const newEdge =  new NetworkEdge(
      sourceNodeId,
      targetNodeId,
      1.0,
      this.params,
      this.nodes,
      this.edgeVisStrengthScale
    )
    new MapUtil(this.edges).setOrAddWithUniqueKey(
      `${sourceNodeId}_${targetNodeId}`,
      newEdge
    )
    newEdge.registerWithConnectedNodes()
  }

  spawnEdge(sourceNodeId) {
    const allIdsSet = new Set(this.nodes.keys());
    allIdsSet.delete(sourceNodeId);
    for(let [id,value] of this.nodes.entries()) {
      if(value.role === NetworkNodeRole.VISUAL) {
        allIdsSet.delete(id);
      }
    }
    let targetNodeId = randomChoice(Array.from(allIdsSet));

    this.connectWithEdge(sourceNodeId, targetNodeId);
  }

  /**
   * @param {number} deltaTime - Time (in seconds) since the last update.
   * @param {number} fitness  - Current fitness of the brain.
   */
  __update(deltaTime, fitness) {
    // Traverse in random order to avoid traversal order effects
    // Using a buffer based approach is more accurate but more difficult to implement as well as doubling the memory requirement
    const numNodes = this.nodes.size;
    new MapUtil(this.nodes).forEachEntryFisherYates(([id, node]) => {
      node.process(deltaTime)
      if (Math.random() < deltaTime * this.params.edgeSpawnRate / numNodes) {
        if (this.edges.size < this.params.maxEdges) {
          DebugConsole.log("Spawning new edge...");
          this.spawnEdge(id);
        } else {
          DebugConsole.error("Maximum number of edges reached");
        }
      }
    });

    if (Math.random() < deltaTime * this.params.nodeSpawnRate) {
      this.spawnNode();
    }
  }
}
