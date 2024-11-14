import SimulationError from "./SimulationError.js";
import {
  getNearestLabelContents,
  getNumberParamById,
  getStringRadioByName,
} from "./ui/parameter-input.js";
import { formatBulletedListEntry } from "./text.js";
import DebugConsole from "./ui/DebugConsole.js";

export default class Simulation {
  constructor(updateSimulationControlButtons) {
    this.updateSimulationControlButtons = updateSimulationControlButtons
    this.running = false
    this.paused = false
    this.stopping = false
    this.pausing
  }
  getState(){
    // Pause requested but a frame needs to finish
    if(this.pausing){
      return "pausing"
    }
    // Stop requested but a frame needs to finish
    if(this.stopping){
      return "stopping"
    }
    if(this.running){
      if(this.paused){
        return "paused"
      }
      return "running"
    }
    return "stopped"
  }
  __processFrame(){
    const currentPerformanceTime = performance.now();

    const deltaTieMillis = currentPerformanceTime - this.lastPerformanceTime;

    this.lastPerformanceTime = currentPerformanceTime;

    const deltaTime = deltaTieMillis / 1000;





    if(this.running &&!this.paused){
      // For the purposes of metrics
      // We used this method to
      // track the exact amount of time which the 
      //  physics engine has processed
      // as opposed to real world time
      //
      // This is a better reflection of 
      // what actually occurred in-game
      // and how well the player/AI performed
    this.totalElapsedTime += deltaTime
      requestAnimationFrame(this.__processFrame.bind(this))
    }
  }
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


    const gameCanvasContainer = document.querySelector(
      ".GameCanvasContainer"
    );
      
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


    this.running = true;
    this.paused = false;
    this.params = params;
    this.ctx 
    this.totalElapsedTime = 0
    this.previousFramePerformanceTime = performance.now()
    requestAnimationFrame(this.__processFrame.bind(this));
    return this;
  }
  pause() {
    this.paused = true;
    return this;
  }
  stop() {
    this.running = false;
    return this;
  }
  resume() {
    this.paused = false;
    this.previousFramePerformanceTime = performance.now();
    requestAnimationFrame(this.__processFrame.bind(this));
    return this;
  }
}
