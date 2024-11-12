import SimulationError from "./SimulationError.js";
import {
  getNearestLabelContents,
  getNumberParamById,
  getStringRadioByName,
} from "./ui/parameter-input.js";
import { formatBulletedListEntry } from "./text.js";
import DebugConsole from "./ui/DebugConsole.js";

export default class Simulation {
  constructor() {}
  start() {
    const paramErrorMessages = [];

    const controlledBy = (
      getStringRadioByName("controlledBy", paramErrorMessages) || ""
    ).toLowerCase();

    const params = Object.fromEntries(
      [
        // Game Parameters
        "playfieldWidth",
        "playfieldHeight",
        "icicleWidth",
        "icicleHeight",
        "icicleAverageSpawnRate",
        "playerRadius",
        "playerMovementSpeed",

        // Network Parameters
        "numSensorRays",
        "sensorFOV",
        "sensorMaxDistance",
        "maxNodes",
        "maxEdges",
        "maxAbsoluteNodeValue",
        "maxAbsoluteEdgeStrength",

        // Learning Parameters
        "spikeActivationLevel",
        "spikeDecayTimeConstant",
        "spikeRefractoryPeriod",
        "survivalReward",
        "deathPunishment",
        "threatBonusProximity",
      ].map((id) => {
        return [id, getNumberParamById(id, paramErrorMessages)];
      })
    );

    if (paramErrorMessages.length > 0) {
      throw new SimulationError(`
Cannot start simulation, one or more parameters are missing or invalid:

${paramErrorMessages.map(formatBulletedListEntry).join("\n\n")}
                `);
    }

    DebugConsole.info(`
Beginning simulation with the following parameters:


    • Controlled By: ${controlledBy === "human" ? "Human" : "AI"}
${Object.entries(params)
  .map(([id, value]) => {
    return `    • ${getNearestLabelContents(`#${id}`)}: ${value}`;
  })
  .join("\n")}
            `);

    return this;
  }
  pause() {
    return this;
  }
  resume() {
    return this;
  }
}
