import Icicle from "../game/Icicle.js";
import { METER_TO_PIXEL } from "../game/constants.js";
import SimulationError from "./SimulationError.js";
import {
  getNumberParamById,
  getStringRadioByName,
} from "../ui/parameter-input.js";
import { formatBulletedListEntry } from "../utils/text.js";
import DebugConsole from "../ui/DebugConsole.js";
import getRayPolygonIntersection from "../geo/getRayPolygonIntersection.js";
import NetworkNode, { NetworkNodeRole } from "./NetworkNode.js";
import DynamicScale from "../math/DynamicScale.js";
import * as visCanvasUtils from "../visualization/coordinates.js";
import * as fitnessCanvasUtils from "../metrics/fitness/coordinates.js";
import { FITNESS_PLOT_NUM_FRAMES } from "../metrics/fitness/constants.js";
import FixedSizeDeque from "../data-structures/CircularFixedSizeArray.js";
import lerp from "../math/lerp.js";
import { procMin, procMax } from "../math/procedural.js";
import { MapUtil } from "../utils/collections.js";
import NetworkProcessor from "./NetworkProcessor.js";

/**
 * @typedef {Object} SimulationParams
 * @property {number} playfieldWidth - Width of the playfield
 * @property {number} playfieldHeight - Height of the playfield
 * @property {number} icicleWidth - Width of icicles
 * @property {number} icicleHeight - Height of icicles
 * @property {number} icicleAverageSpawnRate - Average spawn rate of icicles
 * @property {number} playerRadius - Radius of the player
 * @property {number} playerMovementSpeed - Movement speed of the player
 * @property {number} numSensorRays - Number of sensor rays
 * @property {number} sensorFOV - Field of view for sensors
 * @property {number} sensorMaxDistance - Maximum distance for sensors
 * @property {number} maxNodes - Maximum number of nodes
 * @property {number} maxEdges - Maximum number of edges
 * @property {number} maxAbsoluteNodeValue - Maximum absolute value for nodes
 * @property {number} maxAbsoluteEdgeStrength - Maximum absolute strength for edges
 * @property {number} spikeActivationLevel - Activation level for spikes
 * @property {number} spikeDecayTimeConstant - Time constant for spike decay
 * @property {number} spikeRefractoryPeriod - Refractory period for spikes
 * @property {number} survivalReward - Reward for survival
 * @property {number} deathPunishment - Punishment for death
 * @property {number} threatBonusProximity - Proximity bonus for threats
 * @property {number} fitnessDecayRatio - Decay ratio for fitness
 * @property {number} hebbianReinforcementTimeConstant - Time constant for Hebbian reinforcement
 * @property {number} hebbianStrengthFactor - Strength factor for Hebbian learning
 * @property {number} nodeInactiveLifetime - Lifetime for inactive nodes
 * @property {number} edgeInactiveLifetime - Lifetime for inactive edges
 * @property {number} nodeSpawnRate - Spawn rate for nodes
 * @property {number} edgeSpawnRate - Spawn rate for edges
 */

/**
 * Enum for sensor kinds.
 * Represents the type of object detected by a sensor.
 *
 * @enum {number}
 */
const SensorDetectionKind = Object.freeze({
  WALL: 0,
  ICICLE: 1,
});

export default class Simulation {
  constructor(updateUIForSimulationState) {
    this.updateUIForSimulationState = updateUIForSimulationState;
    this.state = "stopped";
    this.sensorDistances = []; // Array to store detected distances
    this.sensorDetectionKinds = []; // Array to store detected kinds
    this.sensorNodes = [];
    this.motorNodes = [];
    /** @type {Map<string,NetworkNode>} */
    this.brainNodes = new Map();
    this.brainEdges = new Map();
    this.threatRayCount = 0;
    this.networkNodeValueScale = new DynamicScale();
    this.networkEdgeStrengthScale = new DynamicScale();
    this.fitnessPlotScale = new DynamicScale();
    this.fitnessHistory = new FixedSizeDeque(FITNESS_PLOT_NUM_FRAMES, 0);
    this.fitness = 0;
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
        "fitnessDecayRatio",
        "hebbianReinforcementTimeConstant",
        "hebbianStrengthFactor",
        "nodeInactiveLifetime",
        "edgeInactiveLifetime",
        "nodeSpawnRate",
        "edgeSpawnRate",
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

    DebugConsole.info("Beginning simulation...");

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

    this.sensorDistances = new Array(params.numSensorRays).fill(null);
    this.sensorDetectionKinds = new Array(params.numSensorRays).fill(null);
    this.sensorNodes = [];

    this.simMinFitness = 0;
    this.simMaxFitness = 0;

    window.fitnessPlotBounds.perSim.high.set(0);
    window.fitnessPlotBounds.perSim.low.set(0);
    window.fitnessPlotBounds.perPlot.high.set(0);
    window.fitnessPlotBounds.perPlot.low.set(0);

    for (let i = 0; i < params.numSensorRays; i++) {
      const theta =
        Math.PI / 2 +
        ((-this.params.sensorFOV / 2 +
          ((i + 1) * this.params.sensorFOV) / params.numSensorRays) *
          Math.PI) /
          180;
      this.sensorNodes.push(
        new NetworkNode(
          NetworkNodeRole.VISUAL,
          [Math.cos(theta) * 0.85, Math.sin(theta) * 0.85],
          this.params,
          this.networkNodeValueScale
        )
      );
    }
    this.motorNodes = [
      new NetworkNode(
        NetworkNodeRole.MOVEMENT,
        [
          -0.85 * Math.cos(((90 - this.params.sensorFOV / 2) * Math.PI) / 180),
          0,
        ],
        this.params,
        this.networkNodeValueScale,
        {
          visualScale: 3,
        }
      ),
      new NetworkNode(
        NetworkNodeRole.MOVEMENT,
        [
          0.85 * Math.cos(((90 - this.params.sensorFOV / 2) * Math.PI) / 180),
          0,
        ],
        this.params,
        this.networkNodeValueScale,
        {
          visualScale: 3,
        }
      ),
    ];

    this.brainNodes = new Map();

    // Add references to visual and motor nodes to the brain under reserved ids
    for (let i = 0; i < this.sensorNodes.length; i++) {
      this.brainNodes.set(`sensor${i}`, this.sensorNodes[i]);
    }

    this.brainNodes.set("motorLeft", this.motorNodes[0]);
    this.brainNodes.set("motorRight", this.motorNodes[1]);

    this.brainEdges = new Map();

    this.networkProcessor = new NetworkProcessor(
      params,
      this.brainNodes,
      this.brainEdges,
      this.networkNodeValueScale,
      this.networkEdgeStrengthScale
    )

    this.fitness = 0;
    this.fitnessHistory.reset();

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

    this.threatRayCount = 0;

    // For now, we only implement human control
    if (controlledBy === "human") {
      this.__addPlayerInputListeners();
    } else if (controlledBy === "ai") {
      // Placeholder for AI control
      // DebugConsole.info("AI control is not implemented yet.");
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
      this.networkProcessor.__update(deltaTime, this.fitness);
      this.__updateGame(deltaTime);
      // Render the game
      this.__renderGame();
      this.__renderVisualization();
      this.__renderFitnessPlot();
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
    // Update player position according to human or AI control
    this.__updatePlayerPosition(deltaTime);

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

    this.__updateThreatRayCount();

    this.__reward(deltaTime);

    this.__updateFitness(deltaTime);
  }

  __updateFitness(deltaTime) {
    this.fitnessHistory.unshift(this.fitness);

    const nextFitness =
      this.fitness * (1 - this.params.fitnessDecayRatio * deltaTime);

    this.fitness = nextFitness;

    if (this.fitness < this.simMinFitness) {
      window.fitnessPlotBounds.perSim.low.set(this.fitness);
      this.simMinFitness = this.fitness;
    }

    if (this.fitness > this.simMaxFitness) {
      window.fitnessPlotBounds.perSim.high.set(this.fitness);
      this.simMaxFitness = this.fitness;
    }

    const minOfPlot = procMin(this.fitnessHistory.buffer);
    const maxOfPlot = procMax(this.fitnessHistory.buffer);

    window.fitnessPlotBounds.perPlot.high.set(maxOfPlot);
    window.fitnessPlotBounds.perPlot.low.set(minOfPlot);
  }

  __reward(deltaTime) {
    const threatBonus = 1 + this.threatRayCount / this.params.numSensorRays;
    this.fitness += this.params.survivalReward * threatBonus * deltaTime;
  }

  __punish() {
    this.fitness -= this.params.deathPunishment;
  }

  __updatePlayerPosition(deltaTime) {
    const speed = this.player.speed;
    let dx = 0;

    const leftMotor = this.motorNodes[0];
    const rightMotor = this.motorNodes[1];

    if (this.controlledBy === "human") {
      leftMotor.setValue(0);
      rightMotor.setValue(0);

      if (this.keyState["ArrowLeft"] || this.keyState["KeyA"]) {
        leftMotor.setValue(1);
        rightMotor.setValue(0);
      }
      if (this.keyState["ArrowRight"] || this.keyState["KeyD"]) {
        leftMotor.setValue(0);
        rightMotor.setValue(1);
      }
    }

    const spikeActivationLevel = this.params.spikeActivationLevel;

    const differential = rightMotor.getValue() - leftMotor.getValue();

    dx = (differential / spikeActivationLevel) * speed * deltaTime;

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

    for (let i = 0; i < numRays; i++) {
      const angle = startAngle + i * angleIncrement;
      const rayStart = new SAT.Vector(player.x, player.y);
      const rayEnd = new SAT.Vector(
        player.x + maxDistance * Math.cos(angle),
        player.y - maxDistance * Math.sin(angle)
      );
      sensorRays.push({ start: rayStart, end: rayEnd });
    }

    sensorRays.forEach((ray, rayIndex) => {
      let minDistance = maxDistance;
      this.sensorDetectionKinds[rayIndex] = null;

      const playfieldWalls = [
        {
          start: new SAT.Vector(0, 0),
          end: new SAT.Vector(params.playfieldWidth, 0),
        },
        {
          start: new SAT.Vector(0, 0),
          end: new SAT.Vector(0, params.playfieldHeight),
        },

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
            this.sensorDetectionKinds[rayIndex] = null;
          }
        }
      }

      for (const icicle of icicles) {
        const distance = getRayPolygonIntersection(ray, icicle.polygon);
        if (distance !== null) {
          if (distance < minDistance) {
            this.sensorDetectionKinds[rayIndex] = SensorDetectionKind.ICICLE;
            minDistance = distance;
          }
        }
      }

      this.sensorDistances[rayIndex] = minDistance;
    });
    for (let i = 0; i < this.sensorDistances.length; i++) {
      const sensorNode = this.sensorNodes[i];
      const sensorDistance = this.sensorDistances[i];
      if (typeof sensorDistance === "number" || !isNaN(sensorDistance)) {
        sensorNode.setValue(1 - sensorDistance / this.params.sensorMaxDistance);
      } else {
        sensorNode.setValue(0);
      }
    }
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

  __resetGame() {
    // Reset player position
    this.player.x = this.params.playfieldWidth / 2;
    this.player.y = this.params.playfieldHeight;
    this.player.circle.pos.x = this.player.x;
    this.player.circle.pos.y = this.player.y;

    // Reset motor neuron value
    if (this.controlledBy === "ai") {
      this.motorNodes.forEach((motorNode) => {
        motorNode.setValue(0);
      });
    }

    // Clear all icicles
    this.icicles = [];

    // Reset last time (but keep totalElapsedTime)
    this.lastPerformanceTime = performance.now();

    // Reset icicle spawn timer
    this.lastIcicleSpawnTime = 0;

    // Reset sensor data
    this.sensorDistances = new Array(this.params.numSensorRays).fill(null);
    this.sensorDetectionKinds = new Array(this.params.numSensorRays).fill(null);

    // Reset threat ray count
    this.threatRayCount = 0;

    // Update UI metrics
    window.prettyUpdateMetric("threatRayCount", {
      widget: "fraction-bar",
      getColor(value) {
        const r = 127 + Math.floor((255 - 127) * value);
        const g = 127;
        const b = 127;
        return `rgb(${r}, ${g}, ${b})`;
      },
      value: 0,
    });
    DebugConsole.info("Died! Respawning...");
  }

  __handleCollision() {
    this.__punish();
    this.__resetGame();
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

    this.__renderSensors(ctx);
  }

  __renderVisualization() {
    this.networkNodeValueScale.clear();
    const allNodeValues = Array.from(this.brainNodes
      .values()
      .map((node) => node.getValue()));
    const allEdgeStrengths = Array.from(this.brainEdges.values()).map((edge) => edge.strength);
    this.networkNodeValueScale.compute(allNodeValues);
    this.networkEdgeStrengthScale.compute(allEdgeStrengths);
    const ctx = visCanvasUtils.getVisCtx();
    const [ctxWidth, ctxHeight] = [
      visCanvasUtils.getVisCanvasWidth(),
      visCanvasUtils.getVisCanvasHeight(),
    ];
    ctx.clearRect(0, 0, ctxWidth, ctxHeight);
    new MapUtil(this.brainNodes).forEachEntryFisherYates(([, node]) => {
      node.draw();
    });
    new MapUtil(this.brainEdges).forEachEntryFisherYates(([, edge]) => {
      edge.draw();
    });
  }

  __renderFitnessPlot() {
    const [width, height] = [
      fitnessCanvasUtils.getFitnessCanvasWidth(),
      fitnessCanvasUtils.getFitnessCanvasHeight(),
    ];
    const fitnessCtx = fitnessCanvasUtils.getFitnessCtx();
    fitnessCtx.clearRect(0, 0, width, height);
    const [ncExtentW, ncExtentH] = fitnessCanvasUtils.getNCExtent();
    this.fitnessPlotScale.compute(this.fitnessHistory.buffer);
    const pixelCoords = [];
    for (let i = 0; i < FITNESS_PLOT_NUM_FRAMES; i++) {
      const arrayIndex = FITNESS_PLOT_NUM_FRAMES - 1 - i; // Reverse the array to get the oldest frame first
      const fitness = this.fitnessHistory.get(arrayIndex);

      const ncX = lerp(
        -ncExtentW,
        ncExtentW,
        i / (FITNESS_PLOT_NUM_FRAMES - 1)
      );

      const ncY =
        ncExtentH *
        (2 * (-0.5 + this.fitnessPlotScale.getLevelOrDefault(fitness, 0)));
      pixelCoords.push(
        fitnessCanvasUtils.FitnessCoord.pointToPixel([ncX, ncY])
      );
    }

    fitnessCtx.beginPath();
    fitnessCtx.strokeStyle = this.fitness < 0 ? "red" : "green";
    fitnessCtx.lineWidth = 4;

    for (let i = 0; i < pixelCoords.length - 1; i++) {
      const coord1 = pixelCoords[i];
      const coord2 = pixelCoords[i + 1];
      fitnessCtx.moveTo(coord1[0], coord1[1]);
      fitnessCtx.lineTo(coord2[0], coord2[1]);
    }
    fitnessCtx.stroke();
  }

  __updateThreatRayCount() {
    let total = 0;
    for (let i = 0; i < this.params.numSensorRays; i++) {
      const distance = this.sensorDistances[i];
      const isThreat =
        this.sensorDetectionKinds[i] === SensorDetectionKind.ICICLE &&
        distance / this.params.sensorMaxDistance <
          this.params.threatBonusProximity;
      if (isThreat) {
        total += 1;
      }
    }
    this.threatRayCount = total;
    window.prettyUpdateMetric("threatRayCount", {
      widget: "fraction-bar",
      getColor(value) {
        const r = 127 + Math.floor((255 - 127) * value);
        const g = 127;
        const b = 127;
        return `rgb(${r}, ${g}, ${b})`;
      },
      value: this.threatRayCount / this.params.numSensorRays,
    });
  }

  __renderSensors(ctx) {
    const playerPos = new SAT.Vector(this.player.x, this.player.y);
    const numSensorRays = this.params.numSensorRays;
    const sensorFOV = this.params.sensorFOV;

    // Compute the base increment for visual interpolation
    const angleIncrement = (sensorFOV * Math.PI) / 180 / numSensorRays;
    const startAngle = Math.PI / 2 - (sensorFOV / 2) * (Math.PI / 180);

    // Loop through each ray and draw a triangle for its visualization
    for (let i = 0; i < numSensorRays; i++) {
      // Compute the center angle for the current ray
      const sensorAngle = startAngle + i * angleIncrement;

      // Visual triangle angles (left and right of the ray)
      const visLeftAngle = sensorAngle - angleIncrement / 2;
      const visRightAngle = sensorAngle + angleIncrement / 2;

      // Use the distance measurement for this ray
      const distance = this.sensorDistances[i] || this.params.sensorMaxDistance;

      // Apply the Pythagorean adjustment to the distance for the visual points
      const scaleFactor = Math.cos(angleIncrement / 2); // Adjust for angle offset
      const adjustedDistance = distance * scaleFactor;

      // Points for the triangle (player, left point, right point)
      const visLeftPoint = {
        x: playerPos.x + adjustedDistance * Math.cos(visLeftAngle),
        y: playerPos.y - adjustedDistance * Math.sin(visLeftAngle),
      };

      const visRightPoint = {
        x: playerPos.x + adjustedDistance * Math.cos(visRightAngle),
        y: playerPos.y - adjustedDistance * Math.sin(visRightAngle),
      };

      const isThreat =
        this.sensorDetectionKinds[i] === SensorDetectionKind.ICICLE &&
        distance / this.params.sensorMaxDistance <
          this.params.threatBonusProximity;

      // Draw the triangle
      ctx.fillStyle = isThreat
        ? "rgba(180, 0, 0, 0.5)"
        : "rgba(180, 180, 180, 0.5)";
      ctx.beginPath();
      ctx.moveTo(playerPos.x * METER_TO_PIXEL, playerPos.y * METER_TO_PIXEL); // Player position
      ctx.lineTo(
        visLeftPoint.x * METER_TO_PIXEL,
        visLeftPoint.y * METER_TO_PIXEL
      );
      ctx.lineTo(
        visRightPoint.x * METER_TO_PIXEL,
        visRightPoint.y * METER_TO_PIXEL
      );
      ctx.closePath();
      ctx.fill();
    }
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
