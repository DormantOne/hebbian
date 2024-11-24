/**
 * Tests if two line segments intersect and returns the intersection point as an SAT.Vector.
 * @param {number} x1 - x-coordinate of the first point of segment A.
 * @param {number} y1 - y-coordinate of the first point of segment A.
 * @param {number} x2 - x-coordinate of the second point of segment A.
 * @param {number} y2 - y-coordinate of the second point of segment A.
 * @param {number} x3 - x-coordinate of the first point of segment B.
 * @param {number} y3 - y-coordinate of the first point of segment B.
 * @param {number} x4 - x-coordinate of the second point of segment B.
 * @param {number} y4 - y-coordinate of the second point of segment B.
 * @returns {SAT.Vector|null} The intersection point as an SAT.Vector or `null` if no intersection.
 */
function testSegmentSegment(x1, y1, x2, y2, x3, y3, x4, y4) {
  // Calculate the vectors for the segments
  const ABx = x2 - x1;
  const ABy = y2 - y1;
  const CDx = x4 - x3;
  const CDy = y4 - y3;

  // Calculate the determinant
  const det = ABx * CDy - ABy * CDx;

  // If the determinant is zero, the lines are parallel or collinear
  if (Math.abs(det) < 1e-10) {
    return null;
  }

  // Calculate t and u (parameters of intersection)
  const diffX = x3 - x1;
  const diffY = y3 - y1;

  const t = (diffX * CDy - diffY * CDx) / det;
  const u = (diffX * ABy - diffY * ABx) / det;

  // Check if the intersection lies within both segments
  if (t < 0 || t > 1 || u < 0 || u > 1) {
    return null;
  }

  // Calculate the intersection point
  const intersectX = x1 + t * ABx;
  const intersectY = y1 + t * ABy;

  // Return the intersection point as an SAT.Vector
  return new SAT.Vector(intersectX, intersectY);
}

SAT.testSegmentSegment = testSegmentSegment;

// Extend the SAT.Vector class to add a distanceTo method
SAT.Vector.prototype.distanceTo = function (B) {
    if (!(B instanceof SAT.Vector)) {
      throw new TypeError("Argument must be an instance of SAT.Vector");
    }
  
    const dx = B.x - this.x;
    const dy = B.y - this.y;
  
    // Return the Euclidean distance
    return Math.sqrt(dx * dx + dy * dy);
  };