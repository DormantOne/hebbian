import { visSettings } from "../visualization/constants.js";
import { getVisCtx, VisCoord } from "../visualization/coordinates.js";
import { MapUtil } from "../utils/collections.js";
import DebugConsole from "../ui/DebugConsole.js";
import { formatRGBACss, interpolateRGBA } from "../visualization/color.js";
import DynamicScale from "../math/DynamicScale.js";
import { procMax, procMin } from "../math/procedural.js";
import { clamp } from "../math/numeric.js";
import lerp from "../math/lerp.js";

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
  }

  computeOutputLevel() {
    if (this.isFiring) {
      if (this.lastFire) {
        return (
          this.simParams.spikeActivationLevel *
          Math.exp(
            -(performance.now() / 1000 - this.lastFire) /
              this.simParams.spikeDecayTimeConstant
          )
        );
      }
    }
    return 0;
  }

  die() {
    DebugConsole.warn(`Node ${this.id} died`);
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

    if (this.role !== NetworkNodeRole.VISUAL) {
      if (this.value > 0) {
        this.value *=
          1 -
          deltaTime *
            (this.isFiring
              ? this.simParams.dischargeRate
              : this.simParams.leakRate);
      }
    }

    if (this.role !== NetworkNodeRole.VISUAL) {
      if (this.value >= this.simParams.firingThreshold) {
        if (this.refractoryTimer <= 0) {
          this.lastFire = performance.now() / 1000;
          this.isFiring = true;
          this.refractoryTimer = this.simParams.spikeRefractoryPeriod;
        }
      }
    }
    if (this.isFiring) {
      this.refractoryTimer -= deltaTime;
      if (this.refractoryTimer < 0) {
        this.refractoryTimer = 0;
      }
    }
    if (this.isFiring || this.role === NetworkNodeRole.VISUAL) {
      for (let edgeId of this.edgeIdCacheOut) {
        const edge = new MapUtil(this.simEdges).getOrThrow(edgeId);
        const edgeTarget = edge.getTargetNode();
        if (this.role === NetworkNodeRole.VISUAL) {
          edgeTarget.stimulate(this.value * edge.strength * deltaTime);
        } else {
          edgeTarget.stimulate(
            this.computeOutputLevel() * edge.strength * deltaTime
          );
        }
      }
    }
    if (this.isFiring) {
      this.lifetime = this.simParams.nodeInactiveLifetime;
      for (let edgeId of this.edgeIdCacheIn) {
        const edge = new MapUtil(this.simEdges).getOrThrow(edgeId);
        const edgeSourceNode = edge.getSourceNode();
        if (edgeSourceNode) {
          if (edgeSourceNode.role === NetworkNodeRole.VISUAL) {
            edge.resetLifetime();
          }
        }
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
        this.refractoryTimer = 0
      }
    }
    this.adjustVisLoc(deltaTime);
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

    let fillColor = null;
    let strokeColor = null;
    let strokeWidth = null;

    if (this.role === NetworkNodeRole.VISUAL) {
      fillColor = formatRGBACss(
        interpolateRGBA(this.value, [0, 0, 0, 1], [255, 255, 255, 1])
      );
    } else {
      const allNonVisualNodeValues = Array.from(this.simNodes.values()).filter(
        (node) => node.role !== NetworkNodeRole.VISUAL
      );
      if (allNonVisualNodeValues.length < 2) {
        fillColor = "rgba(128, 128, 128, 1)";
      }

      const zeroPoint = (0 - this.valueScale.start) / this.valueScale.range;

      if (this.value == 0) {
        fillColor = "rgba(128, 128, 128, 1)";
      } else if (this.value > 0) {
        const unboundT = this.valueScale.getLevel(this.value) - zeroPoint;
        fillColor =
          !isNaN(unboundT) && isFinite(unboundT)
            ? formatRGBACss(
                this.valueScale.interpolateLevelColor(
                  clamp(unboundT * 2, 0, 1),
                  [128, 128, 128],
                  [255, 255, 0],
                  [128, 128, 128]
                )
              )
            : "rgba(128, 128, 128, 1)";
      } else {
        const unboundT = zeroPoint - this.valueScale.getLevel(this.value);
        fillColor =
          !isNaN(unboundT) && isFinite(unboundT)
            ? formatRGBACss(
                this.valueScale.interpolateLevelColor(
                  clamp(unboundT * 2, 0, 1),
                  [128, 128, 128],
                  [255, 0, 255],
                  [128, 128, 128]
                )
              )
            : "rgba(128, 128, 128, 1)";
      }
    }

    if (this.isFiring) {
      strokeColor = visSettings.networkNode.firingBorderColor;
      strokeWidth =
        this.options.visualScale *
        visSettings.networkNode.firingBorderThickness *
        Math.exp(
          -(performance.now() / 1000 - this.lastFire) /
            this.simParams.spikeDecayTimeConstant
        );
    }

    const locPixels = VisCoord.pointToPixel(this.visLoc);

    ctx.beginPath();
    ctx.arc(locPixels[0], locPixels[1], radiusPixels, 0, Math.PI * 2);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    if (strokeWidth) {
      ctx.lineWidth = strokeWidth;
    }
    if (strokeColor && strokeWidth) {
      ctx.stroke();
    }
    ctx.fill();
  }

  adjustVisLoc(deltaTime) {
    const allEdgeIds = [...this.edgeIdCacheIn, ...this.edgeIdCacheOut];
    const allCompleteEdgeIds = allEdgeIds.filter((edgeId) => {
      const edge = new MapUtil(this.simEdges).getOrThrow(edgeId);
      return (
        edge.getSourceNode() &&
        edge.getTargetNode() &&
        edge.getSourceNode().role === NetworkNodeRole.NORMAL &&
        edge.getTargetNode().role === NetworkNodeRole.NORMAL
      );
    });
    if (allCompleteEdgeIds.length >= 2) {
      const allCompleteEdgeStrengthValues = allCompleteEdgeIds.map((edgeId) => {
        const edge = new MapUtil(this.simEdges).getOrThrow(edgeId);
        return edge.strength;
      });
      const ds = new DynamicScale();
      ds.compute(allCompleteEdgeStrengthValues);
      const weights = allCompleteEdgeStrengthValues.map((s) => {
        return ds.getLevelOrDefault(s, 0);
      });
      const denom = weights.reduce((a, b) => a + b, 0);
      if (denom > ds.cutoff) {
        let xTotal = 0;
        let yTotal = 0;
        for (const edgeId of allCompleteEdgeIds) {
          const edge = new MapUtil(this.simEdges).getOrThrow(edgeId);
          const sourceNode = edge.getSourceNode();
          const targetNode = edge.getTargetNode();
          if (sourceNode.id !== this.id && targetNode.id !== this.id) {
            throw new Error("Incomplete edge found in node drawing");
          }
          const other = sourceNode.id === this.id ? targetNode : sourceNode;
          const [otherX, otherY] = other.visLoc;

          const normalizedWeight =
            ds.getLevelOrDefault(edge.strength, 0) / denom;
          xTotal += otherX * normalizedWeight;
          yTotal += otherY * normalizedWeight;
        }
        const lastX = this.visLoc[0];
        const lastY = this.visLoc[1];
        const newX = lerp(lastX, xTotal, deltaTime);
        const newY = lerp(lastY, yTotal, deltaTime);
        this.visLoc = [newX, newY];
      }
    }
  }
}
