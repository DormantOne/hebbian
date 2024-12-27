import { randomUniformInclusive } from "../math/random.js";
import DebugConsole from "../ui/DebugConsole.js";
import { MapUtil } from "../utils/collections.js";
import NetworkNode, { NetworkNodeRole } from "./NetworkNode.js";
import NetworkEdge from "./NetworkEdge.js";
import { randomChoice } from "../utils/collections.js";
import shuffled from "../third-party/npm/fisher-yates.js";
import { evalBellCurveShelf } from "../math/stats.js";

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
   * @param {Map<string, NetworkEdge>} edges
   * @param {DynamicScale} nodeVisValueScale
   * @param {DynamicScale} edgeVisStrengthScale
   */
  constructor(params, nodes, edges, nodeVisValueScale, edgeVisStrengthScale) {
    this.params = params;
    this.nodes = nodes;
    this.edges = edges;
    this.nodeVisValueScale = nodeVisValueScale;
    this.edgeVisStrengthScale = edgeVisStrengthScale;
  }

  spawnNode() {
    const k = new MapUtil(this.nodes).randomUniqueKey();
    const safeXmin = -0.9;
    const safeXmax = 0.9;
    const safeYmin = -0.7;
    const safeYmax =
      -0.1 +
      Math.sin(Math.PI / 2 - ((this.params.sensorFOV / 2) * Math.PI) / 180) *
        0.85;
    const newNode = new NetworkNode(
      NetworkNodeRole.NORMAL,
      [
        randomUniformInclusive(safeXmin, safeXmax),
        randomUniformInclusive(safeYmin, safeYmax),
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
    const edgeExcToInhSpawnRatio = this.params.edgeExcToInhSpawnRatio;

    let sourceNode = null;
    let targetNode = null;

    const allNodes = Array.from(this.nodes.values());

    const dataNodes = allNodes.filter((n) => n.role === NetworkNodeRole.NORMAL);

    if (dataNodes.length === 0) {
      DebugConsole.log(
        "No data nodes yet. Cannot directly connect visual to motor."
      );
      return;
    }

    const sensorNodes = allNodes.filter(
      (n) => n.role === NetworkNodeRole.VISUAL
    );
    const motorNodes = allNodes.filter(
      (n) => n.role === NetworkNodeRole.MOVEMENT
    );

    const freeSensorNodes = sensorNodes.filter(
      (n) => n.edgeIdCacheOut.size === 0
    );
    const freeMotorNodes = motorNodes.filter((n) => n.edgeIdCacheIn.size === 0);
    const nonSinkingNodes = dataNodes.filter((n) => n.edgeIdCacheIn.size === 0);
    const nonSendingNodes = dataNodes.filter(
      (n) => n.edgeIdCacheOut.size === 0
    );

    // Over-represent nodes with little or no connectivity
    const sourceNodeChoices = [
      // ...freeSensorNodes,
      // ...nonSendingNodes,
      ...sensorNodes,
      ...dataNodes,
    ];
    // Over-represent nodes with little or no connectivity

    const targetNodeChoices = [
      // ...freeMotorNodes,
      // ...nonSinkingNodes,
      ...dataNodes,
      ...motorNodes,

    ];

    if (sourceNodeChoices.length === 0 || targetNodeChoices.length === 0) {
      DebugConsole.error(
        "No source or target options. This should not occur. Check the code."
      );
      return;
    }

    while (!sourceNode || !targetNode || sourceNode.id === targetNode.id) {
      sourceNode = randomChoice(sourceNodeChoices);
      targetNode = randomChoice(targetNodeChoices);
    }

    this.connectWithEdge(
      sourceNode.id,
      targetNode.id,
      Math.random() < edgeExcToInhSpawnRatio ? 1 : -1
    );
  }

  /**
   * @param {number} deltaTime - Time (in seconds) since the last update.
   * @param {number} deltaFitness  - Delta fitness of the brain.
   */
  __update(deltaTime, deltaFitness) {
    // Traverse in random order to avoid traversal order effects
    // Using a buffer based approach is more accurate but more difficult to implement as well as doubling the memory requirement

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

    const numDataNodes = Array.from(this.nodes.values()).filter(
      (n) => n.role === NetworkNodeRole.NORMAL
    ).length;

    const rSpawnNode =
      deltaTime *
      this.params.nodeSpawnRate *
      evalBellCurveShelf(
        this.params.targetDataNodeCount,
        this.params.targetDataNodeCountSigma,
        numDataNodes
      );

    if (Math.random() < rSpawnNode) {
      this.spawnNode();
    }

    const numEdges = this.edges.size;

    const rSpawnEdge =
      deltaTime *
      this.params.edgeSpawnRate *
      evalBellCurveShelf(
        this.params.targetEdgeCount,
        this.params.targetEdgeCountSigma,
        numEdges
      );

    if (Math.random() < rSpawnEdge) {
      this.spawnEdge();
    }

    // Learning does not affect state
    // until next frame so it is okay
    // to process in same order
    for (const edge of this.edges.values()) {
      edge.learn(deltaFitness);
    }
  }
}
