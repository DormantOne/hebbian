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

    function sizeAndClearCanvas() {
      const gameCanvasContainer = document.querySelector(
        ".GameCanvasContainer"
      );

      const gameCanvas = document.querySelector(".GameCanvas");

      gameCanvas.style.display = "none";

      const gameCanvasContainerAspect =
        gameCanvasContainer.clientWidth / gameCanvasContainer.clientHeight;

      const playfieldWidth = params.playfieldWidth;
      const playfieldHeight = params.playfieldHeight;
      const playfieldAspect = playfieldWidth / playfieldHeight;

      gameCanvas.width = playfieldWidth;
      gameCanvas.height = playfieldHeight;

      if (playfieldAspect >= gameCanvasContainerAspect) {
        gameCanvas.style.width = gameCanvasContainer.clientWidth - 8 + "px";
        gameCanvas.style.height =
          gameCanvasContainer.clientWidth / playfieldAspect - 8 + "px";
      } else {
        gameCanvas.style.width =
          gameCanvasContainer.clientHeight * playfieldAspect - 8 + "px";
        gameCanvas.style.height = gameCanvasContainer.clientHeight - 8 + "px";
      }

      const ctx = gameCanvas.getContext("2d");
      ctx.clearRect(0, 0, playfieldWidth, playfieldHeight);

      gameCanvas.style.display = "block";
    }

    sizeAndClearCanvas();

    window.addEventListener("resize", sizeAndClearCanvas);
    return this;
  }
  pause() {
    return this;
  }
  resume() {
    return this;
  }
}
