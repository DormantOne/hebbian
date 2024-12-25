import { visSettings } from "../visualization/constants.js";
import { getVisCtx, VisCoord } from "../visualization/coordinates.js";
import { MapUtil } from "../utils/collections.js";
import DebugConsole from "../ui/DebugConsole.js";

/**
 * @typedef {import('./Simulation').SimulationParams} SimulationParams
 */

/**
 * @typedef {import('../math/DynamicScale').default} DynamicScale
 */

/**
 * @typedef {import('./NetworkEdge.js').default} NetworkEdge
 */

/**
 * @enum {number}
 */
export const NetworkNodeRole = Object.freeze({
  NORMAL: 0,
  VISUAL: 1,
  MOVEMENT: 2,
});

const nnVisSettings = visSettings.networkNode;

export default class NetworkNode {
  /**
   *
   * @param {NetworkNodeRole} role
   * @param {[number,number]} visLoc
   * @param {SimulationParams} simParams
   * @param {Map<string, NetworkNode>} simNodes - Allows interaction between this and other nodes
   * @param {Map<string, NetworkEdge>} simEdges - Allows interaction between this and edges
   * @param {DynamicScale} valueScale -
   * A dynamic scale, updated once per frame,
   * computed from the values of all neurons
   * in the simulation (including the current)
   */
  constructor(
    role,
    visLoc,
    simParams,
    valueScale,
    simNodes,
    simEdges,
    id,
    options
  ) {
    this.id = id;
    this.role = role;
    this.visLoc = visLoc;
    this.value = 0;
    this.simParams = simParams;
    this.valueScale = valueScale;
    this.simNodes = simNodes;
    this.simEdges = simEdges;
    this.options = options || {
      visualScale: 1,
    };
    /**
     * @type {<Map<string, NetworkEdge>>} - A cache of the IDs of all edge objects that point towards this node
     *
     * Note: The source of truth is the full Map object of the edges stored in the Simulation object
     * Technically, this could be recreated from the central Map
     * But that is slow
     *
     * The drawback of caching is that it has to be kept in sync with changes to the central Map,
     * but such is the trade-off made in any caching endeavor
     */
    this.edgeIdCacheIn = new Set();
    /**
     * @type {<Map<string, NetworkEdge>>} - A cache of the IDs of all edge objects that point away from this node
     *
     * Similar idea to edgeIdCacheIn, but points away from this node
     *
     * Remember, in our model, each node is a many-in-many-out system
     */
    this.edgeIdCacheOut = new Set();

    this.refractoryTimer = 0;

    this.lastFire = null;

    this.isFiring = false;

    this.simNodes = simNodes;

    this.simEdges = simEdges;

    this.lifetime = this.simParams.nodeInactiveLifetime;

    this.autofireRate = null;
  }

  computeOutputLevel() {
    if (this.isFiring) {
      if (this.lastFire) {
        return Math.exp(
          -this.simParams.spikeActivationLevel /
            this.simParams.spikeDecayTimeConstant
        );
      }
    }
    return 0;
  }

  die() {
    DebugConsole.info(`Node ${this.id} died`);
    for (let edgeId of this.edgeIdCacheIn) {
      const edge = new MapUtil(this.simEdges).getOrThrow(edgeId);
      edge.die();
    }
    for (let edgeId of this.edgeIdCacheOut) {
      const edge = new MapUtil(this.simEdges).getOrThrow(edgeId);
      edge.die();
    }
    this.simNodes.delete(this.id);
  }

  process(deltaTime) {
    if (this.role === NetworkNodeRole.NORMAL) {
      this.lifetime -= deltaTime;
    }
    if (this.lifetime <= 0) {
      this.die();
    }

    if (this.role === NetworkNodeRole.VISUAL) {
      if (this.autofireRate) {
        if (Math.random() < this.autofireRate) {
          this.isFiring = true;
          this.lastFire = performance.now() / 1000;
        } else {
          this.isFiring = false;
          this.lastFire = null;
        }
      }
    } else {
      if (this.value >= this.simParams.firingThreshold * deltaTime) {
        if (this.refractoryTimer <= 0) {
          this.lastFire = performance.now() / 1000;
          this.isFiring = true;
        }
      }
    }
    if (this.isFiring) {
      this.refractoryTimer -= deltaTime;
      if (this.refractoryTimer < 0) {
        this.refractoryTimer = 0;
      }
    }
    if (this.isFiring) {
      for (let edgeId of this.edgeIdCacheOut) {
        const edge = new MapUtil(this.simEdges).getOrThrow(edgeId);
        const edgeTarget = edge.getTargetNode();
        edgeTarget.stimulate(
          this.computeOutputLevel() * edge.strength * deltaTime
        );
      }
    }
    if (this.isFiring) {
      this.lifetime = this.simParams.nodeInactiveLifetime;
      for (let edgeId of this.edgeIdCacheIn) {
        const edge = new MapUtil(this.simEdges).getOrThrow(edgeId);
        edge.resetLifetime();
      }
      for (let edgeId of this.edgeIdCacheOut) {
        const edge = new MapUtil(this.simEdges).getOrThrow(edgeId);
        edge.resetLifetime();
      }
    }
    if (this.isFiring) {
      const now = performance.now() / 1000;
      if (
        this.lastFire &&
        now - this.lastFire >= 5 * this.simParams.spikeDecayTimeConstant
      ) {
        this.isFiring = false;
        this.lastFire = null;
      }
    }
  }

  constrainValue() {
    const minValue = -this.simParams.maxAbsoluteNodeValue;
    const maxValue = -minValue;
    this.value =
      this.value > maxValue
        ? maxValue
        : this.value < minValue
        ? minValue
        : this.value;
  }

  /**
   * A way to explicitly set the value of a node
   * Useful mainly for the visual receptors
   */
  setValue(value) {
    this.value = value;
    this.constrainValue();
    return this;
  }

  getValue() {
    return this.value;
  }

  stimulate(value) {
    this.value += value;
    this.constrainValue();
  }

  draw() {
    const ctx = getVisCtx();
    const radiusPixels =
      VisCoord.distToPixel(nnVisSettings.radius) * this.options.visualScale;
    const color =
      this.role !== NetworkNodeRole.VISUAL
        ? this.valueScale.interpolateLevelColor(
            this.value,
            [0, 0, 255],
            [255, 0, 0],
            [128, 128, 128]
          )
        : visSettings.networkNode.firingBorderColor;
    const locPixels = VisCoord.pointToPixel(this.visLoc);

    ctx.beginPath();
    ctx.arc(locPixels[0], locPixels[1], radiusPixels, 0, Math.PI * 2);
    ctx.fillStyle =
      this.role !== NetworkNodeRole.VISUAL
        ? `rgb(${color[0]},${color[1]},${color[2]})`
        : color;
    ctx.strokeStyle = this.isFiring
      ? visSettings.networkNode.firingBorderColor
      : "none";
    ctx.lineWidth = this.isFiring
      ? visSettings.networkNode.firingBorderThickness *
        Math.exp(
          -(performance.now() / 1000 - this.lastFire) /
            this.simParams.spikeDecayTimeConstant
        )
      : 0;
    ctx.closePath();

    if (this.isFiring) {
      ctx.stroke();
    }
    ctx.fill();
  }
}
