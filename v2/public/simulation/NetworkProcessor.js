import { randomUniformInclusive } from "../math/random.js";
import DebugConsole from "../ui/DebugConsole.js";
import { MapUtil } from "../utils/collections.js";
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

    if (
      validSources.size === 0 ||
      validTargets.size <= this.params.numMotorNodes * 2
    ) {
      DebugConsole.info(
        "Need at least one valid source choice and at least 3 valid target node choice to spawn edge."
      );
      return;
    }

    let sourceNodeId = null;
    let targetNodeId = null;

    const allMotorNodes = Array.from(this.nodes.values()).filter(
      (node) => node.role === NetworkNodeRole.MOVEMENT
    );
    const freeMotorNodes = allMotorNodes.filter(
      (node) => node.edgeIdCacheIn.size === 0
    );
    const allVisualNodes = Array.from(this.nodes.values()).filter(
      (node) => node.role === NetworkNodeRole.VISUAL
    );
    const freeSensorNodes = allVisualNodes.filter(
      (node) => node.edgeIdCacheOut.size === 0
    );
    const allDataNodes = Array.from(this.nodes.values()).filter(
      (node) => node.role === NetworkNodeRole.NORMAL
    );

    while (
      !sourceNodeId ||
      !targetNodeId ||
      sourceNodeId === targetNodeId ||
      (this.nodes.get(sourceNodeId).role === NetworkNodeRole.VISUAL &&
        this.nodes.get(targetNodeId).role === NetworkNodeRole.MOVEMENT)
    ) {
      targetNodeId = randomChoice(Array.from(validTargets));
      sourceNodeId = randomChoice(Array.from(validSources));
      if (this.nodes.get(sourceNodeId).role === NetworkNodeRole.NORMAL) {
        if (freeMotorNodes.length > 0) {
          targetNodeId = randomChoice(freeMotorNodes).id;
        } else {
          const freeDataNodes = allDataNodes.filter(
            (node) =>
              node.role === NetworkNodeRole.NORMAL &&
              node.edgeIdCacheIn.size === 0 &&
              node.id !== sourceNodeId
          );
          if (freeDataNodes.length > 0) {
            targetNodeId = randomChoice(freeDataNodes).id;
          }
        }
      }
      if (this.nodes.get(targetNodeId).role === NetworkNodeRole.NORMAL) {
        if (freeSensorNodes.length > 0) {
          sourceNodeId = randomChoice(freeSensorNodes).id;
        } else {
          const freeDataNodes = allDataNodes.filter(
            (node) =>
              node.role === NetworkNodeRole.NORMAL &&
              node.edgeIdCacheIn.size === 0 &&
              node.id !== sourceNodeId
          );
          if (freeDataNodes.length > 0) {
            targetNodeId = randomChoice(freeDataNodes).id;
          }
        }
      }
    }

    this.connectWithEdge(
      sourceNodeId,
      targetNodeId,
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
      (1 -
        Math.exp(
          -(
            ((numDataNodes - this.params.targetDataNodeCount) /
              this.params.targetDataNodeCount) **
            2
          )
        ));

    if (Math.random() < rSpawnNode) {
      this.spawnNode();
    }

    const rSpawnEdge =
      deltaTime *
      this.params.edgeSpawnRate *
      (1 -
        Math.exp(
          -(
            ((this.edges.size - this.params.targetEdgeCount) /
              this.params.targetEdgeCount) **
            2
          )
        ));

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
