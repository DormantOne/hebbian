import { MapUtil } from "../utils/collections.js";
import { visSettings } from "../visualization/constants.js";
import { getVisCtx, VisCoord } from "../visualization/coordinates.js";

/**
 * @typedef {import('./Simulation.js').SimulationParams} SimulationParams
 */

/**
 * @typedef {import('./NetworkNode.js').default} NetworkNode
 */

const networkEdgeVisSettings = visSettings.networkEdge;

export default class NetworkEdge {
  /**
   * @param {number} strength
   * @param {SimulationParams} simParams
   * @param {Map<string, NetworkNode>} nodes
   */
  constructor(
    sourceNodeId,
    targetNodeId,
    strength,
    simParams,
    nodes,
    edgeVisStrengthScale
  ) {
    this.sourceNodeId = sourceNodeId;
    this.targetNodeId = targetNodeId;
    this.strength = strength;
    this.simParams = simParams;
    this.active = true;
    this.remainingLifetime = simParams.edgeInactiveLifetime;
    this.nodes = nodes;
    this.edgeVisStrengthScale = edgeVisStrengthScale;
  }

  getSourceNode() {
    if (this.sourceNodeId === null) {
      return null;
    }
    return new MapUtil(this.nodes).getOrThrow(this.sourceNodeId);
  }

  getTargetNode() {
    if (this.targetNodeId === null) {
      return null;
    }
    return new MapUtil(this.nodes).getOrThrow(this.targetNodeId);
  }

  draw() {
    const [x1, y1] = VisCoord.pointToPixel(this.getSourceNode().visLoc);
    const [x2, y2] = VisCoord.pointToPixel(this.getTargetNode().visLoc);
    const thickness =
      networkEdgeVisSettings.minThickness +
      (networkEdgeVisSettings.maxThickness -
        networkEdgeVisSettings.minThickness) *
        this.edgeVisStrengthScale.getLevelOrDefault(this.strength, 0);

    const ctx = getVisCtx();
    ctx.lineWidth = thickness;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}
