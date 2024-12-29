import { MapUtil } from "../utils/collections.js";
import { visSettings } from "../visualization/constants.js";
import { getVisCtx, VisCoord } from "../visualization/coordinates.js";
import DebugConsole from "../ui/DebugConsole.js";
import { NetworkNodeRole } from "./NetworkNode.js";

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
    edges,
    edgeVisStrengthScale
  ) {
    this.sourceNodeId = sourceNodeId;
    this.targetNodeId = targetNodeId;
    this.strength = strength;
    this.simParams = simParams;
    this.nodes = nodes;
    this.edges = edges;
    this.edgeVisStrengthScale = edgeVisStrengthScale;
    this.lifetime = simParams.edgeInactiveLifetime;
  }

  constrainStrength() {
    const minStrength = -this.simParams.maxAbsoluteEdgeStrength;
    const maxStrength = this.simParams.maxAbsoluteEdgeStrength;
    if (this.strength < minStrength) {
      this.strength = minStrength;
    }
    if (this.strength > maxStrength) {
      this.strength = maxStrength;
    }
  }

  resetLifetime() {
    this.lifetime = this.simParams.edgeInactiveLifetime;
  }

  die() {
    DebugConsole.info(`Edge ${this.getId()} died`);
    this.unregisterWithConnectedNodes();
    this.edges.delete(this.getId());
    this.sourceNodeId = null;
    this.targetNodeId = null;
    // Will be destroyed on next garbage collection
  }

  process(deltaTime) {
    this.remainingLifetime -= deltaTime;
    if (this.remainingLifetime <= 0) {
      this.die();
    }
  }

  getId() {
    return `${this.sourceNodeId}_${this.targetNodeId}`;
  }

  getSourceNode() {
    if (this.sourceNodeId === null) {
      return null;
    }
    if (!this.nodes.has(this.sourceNodeId)) {
      return null;
    }
    return new MapUtil(this.nodes).getOrThrow(this.sourceNodeId);
  }

  getTargetNode() {
    if (this.targetNodeId === null) {
      return null;
    }
    if (!this.nodes.has(this.targetNodeId)) {
      return null;
    }
    return new MapUtil(this.nodes).getOrThrow(this.targetNodeId);
  }

  registerWithConnectedNodes() {
    this.getSourceNode().edgeIdCacheOut.add(this.getId());
    this.getTargetNode().edgeIdCacheIn.add(this.getId());
  }

  unregisterWithConnectedNodes() {
    if (this.getSourceNode() !== null) {
      this.getSourceNode().edgeIdCacheOut.delete(this.getId());
    }
    if (this.getTargetNode() !== null) {
      this.getTargetNode().edgeIdCacheIn.delete(this.getId());
    }
  }

  draw() {
    if (this.getSourceNode() === null || this.getTargetNode() === null) {
      return;
    }
    const [x1, y1] = VisCoord.pointToPixel(this.getSourceNode().visLoc);
    const [x2, y2] = VisCoord.pointToPixel(this.getTargetNode().visLoc);
    const thickness =
      networkEdgeVisSettings.minThickness +
      (networkEdgeVisSettings.maxThickness -
        networkEdgeVisSettings.minThickness) *
        this.edgeVisStrengthScale.getLevelOrDefault(this.strength, 0);
    const sn = this.getSourceNode();
    const dn = this.getTargetNode();
    const getDegree = (n) => {
      return n.edgeIdCacheIn.size + n.edgeIdCacheOut.size;
    };

    let opacity = 0;
    if (
      sn &&
      dn &&
      typeof window.maxDegree === "number" &&
      !isNaN(window.maxDegree) &&
      window.maxDegree > this.edgeVisStrengthScale.cutoff
    ) {
      const meanDeg = (getDegree(sn) + getDegree(dn)) / 2;
      opacity = meanDeg / window.maxDegree;
    }

    const ctx = getVisCtx();
    ctx.lineWidth = thickness;
    ctx.strokeStyle =
      this.strength === 0
        ? "rgba(128,128,128,${opacity})"
        : this.strength < 0
        ? `rgba(255,0,255,${opacity})`
        : `rgba(255,255,0,${opacity})`;
    if (Math.abs(this.strength) >= this.simParams.maxAbsoluteEdgeStrength) {
      ctx.strokeStyle = this.strength > 0 ? "white" : "black";
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  learn(deltaFitness) {
    if (!this.getSourceNode() || !this.getTargetNode()) {
      console.error(`Bad edge: missing source or target node: ${this.getId()}`);
      return;
    }
    if (this.getSourceNode().isFiring && this.getTargetNode().isFiring) {
      const timeDelta =
        this.getTargetNode().lastFire - this.getSourceNode().lastFire;
      const proximityFactor = Math.exp(
        -Math.pow(
          -timeDelta / this.simParams.hebbianReinforcementTimeConstant,
          2
        )
      );
      const sign = Math.sign(this.strength);
      this.strength += sign * deltaFitness * proximityFactor;
      this.constrainStrength();
    } else {
      this.strength *= 1 - this.simParams.edgeStrengthLeakFactor;
    }
  }
}
