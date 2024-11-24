import Icicle from "./game/Icicle.js";
import { METER_TO_PIXEL } from "./constants.js";
import SimulationError from "./SimulationError.js";
import {
  getNearestLabelContents,
  getNumberParamById,
  getStringRadioByName,
} from "./ui/parameter-input.js";
import { formatBulletedListEntry } from "./text.js";
import DebugConsole from "./ui/DebugConsole.js";
import getRayPolygonIntersection from "./geo/getRayPolygonIntersection.js";

export default class Simulation {
  constructor(updateUIForSimulationState) {
    this.updateUIForSimulationState = updateUIForSimulationState;
    this.state = "stopped";
    this.sensorDistances = []; // Array to store detected distances
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

        // network Parameters,
        "numSensorRays",
        "sensorFOV",
        "sensorMaxDistance",
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
      throw new SimulationError(
        "Invalid control selection. Choose 'Human' or 'AI'."
      );
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

    this.sensorDistances = new Array(params.numSensorRays).fill(NaN);

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
        new SAT.Vector(params.playfieldWidth / 2, params.playfieldHeight),
        params.playerRadius
      ),
    };

    this.icicles = []; // Array to hold icicles
    this.lastIcicleSpawnTime = 0; // Time since last icicle spawned

    // Initialize time tracking variables
    this.lastPerformanceTime = performance.now();
    this.totalElapsedTime = 0;

    // For now, we only implement human control
    if (controlledBy === "human") {
      this.__addPlayerInputListeners();
    } else if (controlledBy === "ai") {
      // Placeholder for AI control
      DebugConsole.info("AI control is not implemented yet.");
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
        gameCanvasContainer.clientWidth / playfieldAspect - 8 + "px";
    } else {
      gameCanvas.style.width =
        gameCanvasContainer.clientHeight * playfieldAspect - 8 + "px";
      gameCanvas.style.height = gameCanvasContainer.clientHeight - 8 + "px";
    }

    ctx.clearRect(0, 0, playfieldWidth, playfieldHeight);

    gameCanvas.style.display = "block";
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

    if (this.state === "running") {
      // Update game logic
      this.__updateGame(deltaTime);
      // Render the game
      this.__renderGame();
    }

    if (
      this.state === "running" ||
      this.state === "starting" ||
      this.state === "resuming"
    ) {
      requestAnimationFrame(this.__processFrame.bind(this));
    } else if (this.state === "stopping") {
      this.state = "stopped";
      this.__updateUIForSimulationState();
    } else if (this.state === "pausing") {
      this.state = "paused";
      this.__updateUIForSimulationState();
    }
  }

  __updateGame(deltaTime) {
    // Update player position
    if (this.controlledBy === "human") {
      this.__updatePlayerPosition(deltaTime);
    } else if (this.controlledBy === "ai") {
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

    this.__updateSensors();
  }

  __updatePlayerPosition(deltaTime) {
    const speed = this.player.speed;
    let dx = 0;

    if (this.keyState["ArrowLeft"] || this.keyState["KeyA"]) {
      dx -= speed * deltaTime;
    }
    if (this.keyState["ArrowRight"] || this.keyState["KeyD"]) {
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

  __updateSensors() {
    const { player, icicles, params } = this;
    const maxDistance = params.sensorMaxDistance;

    const sensorRays = [];
    const numRays = params.numSensorRays;
    const fov = (params.sensorFOV * Math.PI) / 180; // Convert FOV to radians
    const startAngle = Math.PI / 2 - fov / 2;
    const angleIncrement = fov / (numRays - 1);

    // Create sensor rays
    for (let i = 0; i < numRays; i++) {
      const angle = startAngle + i * angleIncrement;
      const rayStart = new SAT.Vector(player.x, player.y);
      const rayEnd = new SAT.Vector(
        player.x + maxDistance * Math.cos(angle),
        player.y - maxDistance * Math.sin(angle)
      );
      sensorRays.push({ start: rayStart, end: rayEnd });
    }

    // Detect distances
    const sensorDistances = sensorRays.map((ray) => {
      let minDistance = maxDistance;

      // Check intersections with icicles
      for (const icicle of icicles) {
        const distance = getRayPolygonIntersection(ray, icicle.polygon);
        if (distance !== null && distance < minDistance) {
          minDistance = distance;
        }
      }

      // Check intersections with walls (hardcoded as rectangular boundaries)
      const playfieldWalls = [
        // Top wall
        {
          start: new SAT.Vector(0, 0),
          end: new SAT.Vector(params.playfieldWidth, 0),
        },
        // Bottom wall
        // {
        //   start: new SAT.Vector(0, params.playfieldHeight),
        //   end: new SAT.Vector(params.playfieldWidth, params.playfieldHeight),
        // },
        // Left wall
        {
          start: new SAT.Vector(0, 0),
          end: new SAT.Vector(0, params.playfieldHeight),
        },
        // Right wall
        {
          start: new SAT.Vector(params.playfieldWidth, 0),
          end: new SAT.Vector(params.playfieldWidth, params.playfieldHeight),
        },
      ];

      for (const wall of playfieldWalls) {
        const intersection = SAT.testSegmentSegment(
          ray.start.x,
          ray.start.y,
          ray.end.x,
          ray.end.y,
          wall.start.x,
          wall.start.y,
          wall.end.x,
          wall.end.y
        );

        if (intersection) {
          const distance = ray.start.distanceTo(intersection);

          if (distance < minDistance) {
            minDistance = distance;
          }
        }
      }
      return minDistance;
    });

    this.sensorDistances = sensorDistances;
  }

  __spawnIcicle() {
    const { icicleWidth, icicleHeight, playfieldWidth } = this.params;

    const width = icicleWidth;
    const height = icicleHeight;

    // Random x-position for the icicle within the playfield
    const x = Math.random() * (playfieldWidth - width);
    const y = -height; // Start above the playfield

    const icicle = new Icicle(x, y, width, height, 0);

    this.icicles.push(icicle);
  }

  __drawCollisionShapes() {
    const ctx = this.ctx;

    // Draw player's collision circle
    ctx.strokeStyle = "lime"; // Use a bright color for visibility
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
    ctx.strokeStyle = "magenta"; // Another bright color
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
        this.__handleCollision();
        break;
      }
    }
  }

  __handleCollision() {
    DebugConsole.info("Collision detected! Game Over.");
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
    ctx.fillStyle = "red";
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

    // this.__drawCollisionShapes()

    this.__renderSensors(ctx);
  }

  __renderSensors(ctx) {
    const playerPos = new SAT.Vector(this.player.x, this.player.y);
    const numSensorRays = this.params.numSensorRays;
    const sensorFOV = this.params.sensorFOV;
  
    // Begin drawing the triangle fan
    ctx.fillStyle = "rgba(180, 180, 180, 0.5)"; // Faint grayish color for maximum range
    ctx.beginPath();
  
    // Start at the player's position (center of the triangle fan)
    ctx.moveTo(playerPos.x * METER_TO_PIXEL, playerPos.y * METER_TO_PIXEL);
  
    // Loop through the sensor rays
    for (let i = 0; i < numSensorRays; i++) {
      const angle =
        Math.PI / 2 + // Adjust orientation to ensure correct alignment
        (-sensorFOV / 2 + (i * sensorFOV) / (numSensorRays - 1)) * (Math.PI / 180);
  
      const distance = this.sensorDistances[i]

      const endX = playerPos.x + distance * Math.cos(angle);
      const endY = playerPos.y - distance * Math.sin(angle);
  
      // Draw a line to the current ray's endpoint
      ctx.lineTo(endX * METER_TO_PIXEL, endY * METER_TO_PIXEL);
    }
  
    // Close the triangle fan by connecting the last ray to the center
    ctx.closePath();
  
    // Fill the triangle fan
    ctx.fill();
  
  
  }
  

  __addPlayerInputListeners() {
    this.keyState = {};

    const keyDownHandler = (e) => {
      this.keyState[e.code] = true;
    };

    const keyUpHandler = (e) => {
      this.keyState[e.code] = false;
    };

    window.addEventListener("keydown", keyDownHandler);
    window.addEventListener("keyup", keyUpHandler);

    // Store the handlers to remove them later
    this.keyDownHandler = keyDownHandler;
    this.keyUpHandler = keyUpHandler;
  }

  __removePlayerInputListeners() {
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keyup", this.keyUpHandler);
  }

  __stop() {
    this.state = "stopping";
    this.__updateUIForSimulationState();

    if (this.controlledBy === "human") {
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
    this.lastPerformanceTime = performance.now();
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
