// Icicle.js

import { METER_TO_PIXEL } from './constants.js';

export default class Icicle {
  constructor(x, y, width, height, speed) {
    this.speed = speed; // Meters per second
    this.position = new SAT.Vector(x, y);

    // Define the vertices relative to (0, 0)
    const vertices = [
      new SAT.Vector(width, 0),           // Right point at the top

      new SAT.Vector(width / 2, height),  // Middle point at the bottom
      new SAT.Vector(0, 0),               // Left point at the top

    ];

    // Create the polygon with the position set to this.position
    this.polygon = new SAT.Polygon(this.position.clone(), vertices);
  }

  update(deltaTime) {

    // apply gravitational acceleration
    this.speed += deltaTime * 9.8


    // Move the icicle downwards
    const dy = this.speed * deltaTime; // Meters
    this.position.y += dy;
    this.polygon.pos.y = this.position.y;
  }

  draw(ctx) {
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    const points = this.polygon.calcPoints;
    const pos = this.polygon.pos;
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
    ctx.fill();
  }

  isOffScreen(playfieldHeight) {
    // Check if the icicle is entirely below the playfield
    return this.position.y - this.polygon.points[1].y > playfieldHeight;
  }
}
