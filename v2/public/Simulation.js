import SimulationError from "./SimulationError.js";
import {
  getNearestLabelContents,
  getNumberParamById,
  getStringRadioByName,
} from "./ui/parameter-input.js";
import { formatBulletedListEntry } from "./text.js";
import DebugConsole from "./ui/DebugConsole.js";

export default class Simulation {
  constructor(updateUIForSimulationState) {
    this.updateUIForSimulationState = updateUIForSimulationState;
    this.state = "stopped";
  }
  getState() {
    return this.state;
  }

  __start() {
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

    this.state = "starting";
    this.__updateUIForSimulationState();

    const gameCanvasContainer = document.querySelector(".GameCanvasContainer");

    const gameCanvas = document.querySelector(".GameCanvas");

    const ctx = gameCanvas.getContext("2d");

    function sizeAndClearCanvas() {
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

      ctx.clearRect(0, 0, playfieldWidth, playfieldHeight);

      gameCanvas.style.display = "block";
    }

    sizeAndClearCanvas();

    window.addEventListener("resize", sizeAndClearCanvas);

    this.params = params;
    this.ctx = ctx;

    requestAnimationFrame(this.__processFrame.bind(this));
  }

  __updateUIForSimulationState() {
    this.updateUIForSimulationState(this.state);
  }

  __processFrame() {
    if (this.state === "starting" || this.state === "resuming") {
      this.state = "running";
      this.__updateUIForSimulationState();
    }
    const currentPerformanceTime = performance.now();

    const deltaTimeMillis = currentPerformanceTime - this.lastPerformanceTime;

    this.lastPerformanceTime = currentPerformanceTime;

    const deltaTime = deltaTimeMillis / 1000;

    this.totalElapsedTime += deltaTime;
    if (
      this.state === "starting" ||
      this.state === "resuming" ||
      this.state === "running"
    ) {
      requestAnimationFrame(this.__processFrame.bind(this));
    } else {
      if (this.state === "stopping") {
        this.state = "stopped";
        this.__updateUIForSimulationState();
        return;
      }
      if (this.state === "pausing") {
        this.state = "paused";
        this.__updateUIForSimulationState();
        return;
      }
    }
  }

  __stop() {
    this.state = "stopping";
    this.__updateUIForSimulationState();
  }

  __pause() {
    this.state = "pausing";
    this.__updateUIForSimulationState();
  }

  __resume() {
    this.state = "resuming";
    this.__updateUIForSimulationState();
    requestAnimationFrame(this.__processFrame.bind(this));
  }

  /**
   * Handles the Start/Stop button being pressed
   */
  handleStartStopButton() {
    if (this.state === "stopped") {
      this.__start();
    } else if (this.state === "running") {
      this.__stop();
    } else {
      throw new SimulationError(
        `Simulation is not ready to start or stop. Simulation is currently "${this.state}".`
      );
    }
  }

  /**
   * Handles the Pause/Resume button being pressed
   */
  handlePauseResumeButton() {
    if (this.state === "paused") {
      this.__resume();
    } else if (this.state === "running") {
      this.__pause();
    } else {
      throw new SimulationError(
        `Simulation is not ready to pause or resume. Simulation is currently "${this.state}".`
      );
    }
  }
}
