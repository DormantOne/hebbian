import { visSettings } from "../visualization/constants.js";
import { getVisCtx, VisCoord } from "../visualization/coordinates.js";

/**
 * @typedef {import('./Simulation').SimulationParams} SimulationParams
 */

/**
 * @typedef {import('../math/DynamicScale').default} DynamicScale
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
   * @param {DynamicScale} valueScale -
   * A dynamic scale, updated once per frame,
   * computed from the values of all neurons
   * in the simulation (including the current)
   */
  constructor(role, visLoc, simParams, valueScale, options) {
    this.role = role;
    this.visLoc = visLoc;
    this.value = 0;
    this.simParams = simParams;
    this.valueScale = valueScale;
    this.options = options || {
      visualScale: 1,
    };
  }

  /**
   * A way to explicitly set the value of a node
   * Useful mainly for the visual receptors
   */
  setValue(value) {
    this.value = value;
    return this;
  }

  draw() {
    const ctx = getVisCtx();
    const radiusPixels =
      VisCoord.distToPixel(nnVisSettings.radius) * this.options.visualScale
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
