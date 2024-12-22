import { visSettings } from "../visualization/constants.js";
import { getVisCtx, VisCoord } from "../visualization/coordinates.js";
import { MapUtil } from "../utils/collections.js";

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
  constructor(role, visLoc, simParams, valueScale, simNodes, simEdges, options ) {
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
  }

  computeOutputLevel() {
    if(this.isFiring){
      if(this.lastFire){
        return Math.exp(-this.simParams.spikeActivationLevel / this.simParams.spikeDecayTimeConstant)
      }
    }
    return 0
  }

  process(deltaTime) {
    this.refractoryTimer -= deltaTime;
    if (this.refractoryTimer < 0) {
      this.refractoryTimer = 0;
    }

    if(this.role === NetworkNodeRole.NORMAL) {
      if (this.isFiring) {
        const now = performance.now() / 1000;
        if (
          this.lastFire &&
          now - this.lastFire >= 5 * this.simParams.spikeDecayTimeConstant
        ) {
          this.isFiring = false;
        }
      }
  
  
  
      if(this.isFiring){
        for(let edgeId of this.edgeIdCacheOut){
          const edge = new MapUtil(this.simEdges).getOrThrow(edgeId);
          const edgeTarget = edge.getTargetNode();
          edgeTarget.stimulate(this.computeOutputLevel()*edge.strength)
        }
      }
    }
    if(this.role === NetworkNodeRole.VISUAL) {
      for(let edgeId of this.edgeIdCacheOut){
        const edge = new MapUtil(this.simEdges).getOrThrow(edgeId);
        const edgeTarget = edge.getTargetNode();
        edgeTarget.stimulate(this.value*edge.strength) 
      }
      
    }

  }

  /**
   * A way to explicitly set the value of a node
   * Useful mainly for the visual receptors
   */
  setValue(value) {
    this.value = value;
    return this;
  }

  getValue() {
    return this.value;
  }

  stimulate(value) {
    this.value += value;
    if (this.value >= this.simParams.firingThreshold) {
      this.tryFire();
    }
  }

  tryFire() {
    if (this.refractoryTimer > 0) {
      return;
    }
    // Remember, even if it is already firing it can fire again
    // As long as it is not during the refractory period
    // When it fires again we need to reset the decay time
    // Be registering a new value for lastFire
    this.value = 0;
    this.outputLevel = this.simParams.spikeActivationLevel;
    this.lastFire = performance.now() / 1000;
    this.isFiring = true;
  }

  draw() {
    const ctx = getVisCtx();
    const radiusPixels =
      VisCoord.distToPixel(nnVisSettings.radius) * this.options.visualScale;
    const color = this.valueScale.interpolateLevelColor(
      this.value,
      [0, 0, 255],
      [255, 0, 0],
      [128, 128, 128]
    );
    const locPixels = VisCoord.pointToPixel(this.visLoc);

    ctx.beginPath();
    ctx.arc(locPixels[0], locPixels[1], radiusPixels, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
    ctx.fill();
    ctx.closePath();
  }
}
