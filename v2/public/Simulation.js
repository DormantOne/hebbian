import Icicle from "./game/Icicle.js";
import { METER_TO_PIXEL } from './constants.js';
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

    if (controlledBy !== "human" && controlledBy !== "ai") {
      throw new SimulationError("Invalid control selection. Choose 'Human' or 'AI'.");
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

    // Store references for later use
    this.gameCanvas = gameCanvas;
    this.gameCanvasContainer = gameCanvasContainer;
    this.ctx = ctx;
    this.params = params;

    // Bind the canvas resize function to the instance
    this.sizeAndClearCanvas = this.__sizeAndClearCanvas.bind(this);
    this.sizeAndClearCanvas();

    window.addEventListener("resize", this.sizeAndClearCanvas);

    // Initialize game variables
    this.player = {
      x: params.playfieldWidth / 2, // Meters
      y: params.playfieldHeight, // Slightly above the bottom (meters)
      radius: params.playerRadius, // Meters
      speed: params.playerMovementSpeed, // Meters per second
      // Create a SAT.js Circle for collision detection
      circle: new SAT.Circle(
        new SAT.Vector(
          params.playfieldWidth / 2,
          params.playfieldHeight
        ),
        params.playerRadius
      ),
    };

    this.icicles = []; // Array to hold icicles
    this.lastIcicleSpawnTime = 0; // Time since last icicle spawned

    // Initialize time tracking variables
    this.lastPerformanceTime = performance.now();
    this.totalElapsedTime = 0;

    // For now, we only implement human control
    if (controlledBy === 'human') {
      this.__addPlayerInputListeners();
    } else if (controlledBy === 'ai') {
      // Placeholder for AI control
      DebugConsole.info('AI control is not implemented yet.');
    }

    this.controlledBy = controlledBy;

    // Start the game loop
    requestAnimationFrame(this.__processFrame.bind(this));
  }

  __updateUIForSimulationState() {
    this.updateUIForSimulationState(this.state);
  }

  __sizeAndClearCanvas() {
    const { gameCanvas, gameCanvasContainer, ctx, params } = this;

    gameCanvas.style.display = "none";

    const gameCanvasContainerAspect =
      gameCanvasContainer.clientWidth / gameCanvasContainer.clientHeight;

    const playfieldWidth = params.playfieldWidth * METER_TO_PIXEL; // Convert to pixels
    const playfieldHeight = params.playfieldHeight * METER_TO_PIXEL; // Convert to pixels
    const playfieldAspect = playfieldWidth / playfieldHeight;

    gameCanvas.width = playfieldWidth;
    gameCanvas.height = playfieldHeight;

    if (playfieldAspect >= gameCanvasContainerAspect) {
      gameCanvas.style.width = gameCanvasContainer.clientWidth - 8 + "px";
      gameCanvas.style.height =
        (gameCanvasContainer.clientWidth / playfieldAspect) - 8 + "px";
    } else {
      gameCanvas.style.width =
        (gameCanvasContainer.clientHeight * playfieldAspect) - 8 + "px";
      gameCanvas.style.height = gameCanvasContainer.clientHeight - 8 + "px";
    }

    ctx.clearRect(0, 0, playfieldWidth, playfieldHeight);

    gameCanvas.style.display = "block";
  }

  __processFrame() {
    if (this.state === 'starting' || this.state === 'resuming') {
      this.state = 'running';
      this.__updateUIForSimulationState();
    }

    const currentPerformanceTime = performance.now();
    const deltaTimeMillis = currentPerformanceTime - this.lastPerformanceTime;
    this.lastPerformanceTime = currentPerformanceTime;
    const deltaTime = deltaTimeMillis / 1000;

    if (this.state === 'running') {
      // Update game logic
      this.__updateGame(deltaTime);
      // Render the game
      this.__renderGame();
    }

    if (
      this.state === 'running' ||
      this.state === 'starting' ||
      this.state === 'resuming'
    ) {
      requestAnimationFrame(this.__processFrame.bind(this));
    } else if (this.state === 'stopping') {
      this.state = 'stopped';
      this.__updateUIForSimulationState();
      return;
    } else if (this.state === 'pausing') {
      this.state = 'paused';
      this.__updateUIForSimulationState();
      return;
    }
  }

  __updateGame(deltaTime) {
    // Update player position
    if (this.controlledBy === 'human') {
      this.__updatePlayerPosition(deltaTime);
    } else if (this.controlledBy === 'ai') {
      // AI control is not implemented yet
    }

    // Spawn new icicles based on the spawn rate
    this.lastIcicleSpawnTime += deltaTime;
    const spawnInterval = 1 / this.params.icicleAverageSpawnRate;
    if (this.lastIcicleSpawnTime >= spawnInterval) {
      this.__spawnIcicle();
      this.lastIcicleSpawnTime = 0;
    }

    // Update icicles
    this.icicles.forEach((icicle) => icicle.update(deltaTime));

    // Remove icicles that have moved off the bottom of the playfield
    this.icicles = this.icicles.filter(
      (icicle) => !icicle.isOffScreen(this.params.playfieldHeight)
    );

    // Update player's SAT.js circle position
    this.player.circle.pos.x = this.player.x;
    this.player.circle.pos.y = this.player.y;

    // Check for collisions
    this.__checkCollisions();
  }

  __updatePlayerPosition(deltaTime) {
    const speed = this.player.speed;
    let dx = 0;

    if (this.keyState['ArrowLeft'] || this.keyState['KeyA']) {
      dx -= speed * deltaTime;
    }
    if (this.keyState['ArrowRight'] || this.keyState['KeyD']) {
      dx += speed * deltaTime;
    }

    // Update player's x position
    this.player.x += dx;

    // Prevent player from moving outside the playfield
    const radius = this.player.radius;
    const minX = radius;
    const maxX = this.params.playfieldWidth - radius;
    if (this.player.x < minX) this.player.x = minX;
    if (this.player.x > maxX) this.player.x = maxX;
  }

  __spawnIcicle() {
    const { icicleWidth, icicleHeight, playfieldWidth } = this.params;

    const width = icicleWidth;
    const height = icicleHeight;
  
    // Random x-position for the icicle within the playfield
    const x = Math.random() * (playfieldWidth - width);
    const y = -height; // Start above the playfield
  
    const speed = this.__getIcicleSpeed();
  
    const icicle = new Icicle(x, y, width, height, speed);
  
    this.icicles.push(icicle);
  }

  __getIcicleSpeed() {
    // Adjust the speed as needed, in meters per second
    return 5; // For example, 5 meters per second
  }

  __drawCollisionShapes() {
    const ctx = this.ctx;
  
    // Draw player's collision circle
    ctx.strokeStyle = 'lime'; // Use a bright color for visibility
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(
      this.player.circle.pos.x * METER_TO_PIXEL,
      this.player.circle.pos.y * METER_TO_PIXEL,
      this.player.circle.r * METER_TO_PIXEL,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  
    // Draw icicles' collision polygons
    ctx.strokeStyle = 'magenta'; // Another bright color
    this.icicles.forEach((icicle) => {
      ctx.beginPath();
      const points = icicle.polygon.calcPoints;
      const pos = icicle.polygon.pos;
      points.forEach((point, index) => {
        const x = (point.x + pos.x) * METER_TO_PIXEL;
        const y = (point.y + pos.y) * METER_TO_PIXEL;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.stroke();
    });
  }

  __checkCollisions() {
    for (const icicle of this.icicles) {
      if (SAT.testPolygonCircle(icicle.polygon, this.player.circle)) {
        console.log(icicle.polygon.pos,icicle.polygon)
        this.__handleCollision();
        break;
      }
    }
  }

  __handleCollision() {
    DebugConsole.info('Collision detected! Game Over.');
    // Stop the simulation on collision
    this.__stop();
  }

  __renderGame() {
    const ctx = this.ctx;
    const params = this.params;

    const playfieldWidth = params.playfieldWidth * METER_TO_PIXEL;
    const playfieldHeight = params.playfieldHeight * METER_TO_PIXEL;

    // Clear the canvas
    ctx.clearRect(0, 0, playfieldWidth, playfieldHeight);

    // Draw the player
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(
      this.player.x * METER_TO_PIXEL,
      this.player.y * METER_TO_PIXEL,
      this.player.radius * METER_TO_PIXEL,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw icicles
    this.icicles.forEach((icicle) => icicle.draw(ctx));

    this.__drawCollisionShapes()

  }

  __addPlayerInputListeners() {
    this.keyState = {};

    const keyDownHandler = (e) => {
      this.keyState[e.code] = true;
    };

    const keyUpHandler = (e) => {
      this.keyState[e.code] = false;
    };

    window.addEventListener('keydown', keyDownHandler);
    window.addEventListener('keyup', keyUpHandler);

    // Store the handlers to remove them later
    this.keyDownHandler = keyDownHandler;
    this.keyUpHandler = keyUpHandler;
  }

  __removePlayerInputListeners() {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
  }

  __stop() {
    this.state = "stopping";
    this.__updateUIForSimulationState();

    if (this.controlledBy === 'human') {
      this.__removePlayerInputListeners();
    }

    // Remove the resize event listener
    window.removeEventListener("resize", this.sizeAndClearCanvas);
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
