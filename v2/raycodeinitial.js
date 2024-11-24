// Import necessary modules
import SAT from 'sat';
import Icicle from './game/Icicle.js';
import { METER_TO_PIXEL } from './constants.js';

// Helper function for ray and polygon intersection
function getRayPolygonIntersection(ray, polygon) {
  const { start, end } = ray;
  let minDistance = Infinity;

  // Check each edge of the polygon
  for (let i = 0; i < polygon.points.length; i++) {
    const pointA = polygon.points[i];
    const pointB = polygon.points[(i + 1) % polygon.points.length];
    const segmentStart = new SAT.Vector(pointA.x + polygon.pos.x, pointA.y + polygon.pos.y);
    const segmentEnd = new SAT.Vector(pointB.x + polygon.pos.x, pointB.y + polygon.pos.y);

    const intersection = SAT.testSegmentSegment(
      start.x, start.y,
      end.x, end.y,
      segmentStart.x, segmentStart.y,
      segmentEnd.x, segmentEnd.y
    );

    if (intersection) {
      const distance = start.distanceTo(intersection);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
  }

  return minDistance === Infinity ? null : minDistance;
}

export default class Simulation {
  constructor(updateUIForSimulationState) {
    this.updateUIForSimulationState = updateUIForSimulationState;
    this.state = "stopped";
    this.sensorDistances = []; // Array to store detected distances
  }

  __updateGame(deltaTime) {
    // Existing update logic...

    // Update sensor distances
    this.__updateSensors();
  }

  __updateSensors() {
    const { player, icicles, params } = this;
    const maxDistance = params.sensorMaxDistance;

    const sensorRays = [];
    const numRays = params.numSensorRays;
    const fov = (params.sensorFOV * Math.PI) / 180; // Convert FOV to radians
    const startAngle = -fov / 2;
    const angleIncrement = fov / (numRays - 1);

    // Create sensor rays
    for (let i = 0; i < numRays; i++) {
      const angle = startAngle + i * angleIncrement;
      const rayStart = new SAT.Vector(player.x, player.y);
      const rayEnd = new SAT.Vector(
        player.x + maxDistance * Math.cos(angle),
        player.y + maxDistance * Math.sin(angle)
      );
      sensorRays.push({ start: rayStart, end: rayEnd });
    }

    // Detect distances
    this.sensorDistances = sensorRays.map((ray) => {
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
        { start: new SAT.Vector(0, 0), end: new SAT.Vector(params.playfieldWidth, 0) },
        // Bottom wall
        { start: new SAT.Vector(0, params.playfieldHeight), end: new SAT.Vector(params.playfieldWidth, params.playfieldHeight) },
        // Left wall
        { start: new SAT.Vector(0, 0), end: new SAT.Vector(0, params.playfieldHeight) },
        // Right wall
        { start: new SAT.Vector(params.playfieldWidth, 0), end: new SAT.Vector(params.playfieldWidth, params.playfieldHeight) },
      ];

      for (const wall of playfieldWalls) {
        const intersection = SAT.testSegmentSegment(
          ray.start.x, ray.start.y,
          ray.end.x, ray.end.y,
          wall.start.x, wall.start.y,
          wall.end.x, wall.end.y
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
  }

  __renderGame() {
    const ctx = this.ctx;

    // Existing render logic...

    // Draw sensor rays
    this.__renderSensors(ctx);
  }

  __renderSensors(ctx) {
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;

    const playerPos = new SAT.Vector(this.player.x, this.player.y);

    this.sensorDistances.forEach((distance, index) => {
      const angle = (-this.params.sensorFOV / 2 + index * (this.params.sensorFOV / this.params.numSensorRays)) * (Math.PI / 180);
      const endX = playerPos.x + distance * Math.cos(angle);
      const endY = playerPos.y + distance * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(playerPos.x * METER_TO_PIXEL, playerPos.y * METER_TO_PIXEL);
      ctx.lineTo(endX * METER_TO_PIXEL, endY * METER_TO_PIXEL);
      ctx.stroke();
    });
  }
}
