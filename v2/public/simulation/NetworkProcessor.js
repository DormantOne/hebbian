import { randomUniformInclusive } from "../math/random.js";
import DebugConsole from "../ui/DebugConsole.js";
import { MapUtil } from "../utils/collections.js";
import { VisCoord } from "../visualization/coordinates.js";
import NetworkNode, { NetworkNodeRole } from "./NetworkNode.js";
import NetworkEdge from "./NetworkEdge.js";
import { randomChoice } from "../utils/collections.js";
import shuffled from "../third-party/npm/fisher-yates.js";

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
      return;
    }
    const [ncExtentW, ncExtentH] = VisCoord.getNCExtent();
    const smallerNCExtent = Math.min(ncExtentW, ncExtentH);

    const k = new MapUtil(this.nodes).randomUniqueKey();
    const newNode = new NetworkNode(
      NetworkNodeRole.NORMAL,
      [
        randomUniformInclusive(-1, 1) * smallerNCExtent,
        randomUniformInclusive(-1, 1) * smallerNCExtent,
      ],
      this.params,
      this.nodeVisValueScale,
      this.nodes,
      this.edges,
      k,
      {
        visualScale: 2,
      }
    );
    this.nodes.set(k, newNode);
    DebugConsole.log(`Spawned new node ${k}.`);
  }

  connectWithEdge(sourceNodeId, targetNodeId, strength) {
    const newEdge = new NetworkEdge(
      sourceNodeId,
      targetNodeId,
      strength,
      this.params,
      this.nodes,
      this.edges,
      this.edgeVisStrengthScale
    );
    new MapUtil(this.edges).setOrAddWithUniqueKey(
      `${sourceNodeId}_${targetNodeId}`,
      newEdge
    );
    newEdge.registerWithConnectedNodes();
    DebugConsole.log(`Created edge ${newEdge.getId()}.`);
  }

  spawnEdge() {
    const validSources = new Set(this.nodes.keys());
    const validTargets = new Set(this.nodes.keys());
    for (let [id, node] of this.nodes.entries()) {
      if (node.role === NetworkNodeRole.VISUAL) {
        validTargets.delete(id);
      }
      if (node.role === NetworkNodeRole.MOVEMENT) {
        validSources.delete(id);
      }
      if (this.params.controlledBy === "human") {
        if (node.role === NetworkNodeRole.MOVEMENT) {
          validTargets.delete(id);
        }
      }
    }

    if (validSources.size === 0 || validTargets.size <= 2) {
      DebugConsole.info("Need at least one valid source choice and at least 3 valid target node choice to spawn edge.");
      return
    }

    let sourceNodeId = randomChoice(Array.from(validSources));
    let targetNodeId = randomChoice(Array.from(validTargets));

    while(sourceNodeId === targetNodeId || (
      this.nodes.get(sourceNodeId).role === NetworkNodeRole.VISUAL &&
      this.nodes.get(targetNodeId).role === NetworkNodeRole.MOVEMENT
    )) {
      sourceNodeId = randomChoice(Array.from(validSources));
      targetNodeId = randomChoice(Array.from(validTargets));
    }

    this.connectWithEdge(
      sourceNodeId,
      targetNodeId,
      randomUniformInclusive(-1, 1)
    );
  }

  /**
   * @param {number} deltaTime - Time (in seconds) since the last update.
   * @param {number} deltaFitness  - Delta fitness of the brain.
   */
  __update(deltaTime, deltaFitness) {
    // Traverse in random order to avoid traversal order effects
    // Using a buffer based approach is more accurate but more difficult to implement as well as doubling the memory requirement
    const numNodes = this.nodes.size;

    const allEdgeKeys = Array.from(this.edges.keys());
    const shuffledEdgeKeys = shuffled(allEdgeKeys);
    const edgeQueue = [...shuffledEdgeKeys];
    while (edgeQueue.length > 0) {
      const edgeId = edgeQueue.pop();
      if (this.edges.has(edgeId)) {
        const edge = this.edges.get(edgeId);
        edge.process(deltaTime);
      }
    }

    const allKeys = Array.from(this.nodes.keys());
    const shuffledKeys = shuffled(allKeys);
    const queue = [...shuffledKeys];
    while (queue.length > 0) {
      const id = queue.pop();
      if (this.nodes.has(id)) {
        const node = this.nodes.get(id);
        node.process(deltaTime);
      }
    }

    if (Math.random() < deltaTime * this.params.nodeSpawnRate) {
      this.spawnNode();
    }

    if (Math.random() < deltaTime * this.params.edgeSpawnRate) {
      this.spawnEdge();
    }

    // Learning does not affect state
    // until next frame so it is okay
    // to process in same order
    for (const edge of this.edges.values()) {
      edge.learn(deltaTime, deltaFitness);
    }
  }
}
