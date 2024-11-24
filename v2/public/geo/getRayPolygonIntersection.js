// Helper function for ray and polygon intersection
export default function getRayPolygonIntersection(ray, polygon) {
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
  