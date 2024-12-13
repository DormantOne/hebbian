export function getFitnessCtx() {
  if (window.fitnessCanvasCtx) {
    return window.fitnessCanvasCtx;
  }
  throw new Error(
    "No fitnessCanvasCtx found. Page may not have initialized properly"
  );
}

export function getFitnessCanvasWidth() {
  if (typeof window.fitnessCanvasWidth === "number") {
    return window.fitnessCanvasWidth;
  }
  throw new Error(
    "No fitnessCanvasWidth found. Page may not have initialized properly"
  );
}

export function getFitnessCanvasHeight() {
  if (typeof window.fitnessCanvasHeight === "number") {
    return window.fitnessCanvasHeight;
  }
  throw new Error(
    "No fitnessCanvasHeight found. Page may not have initialized properly"
  );
}

export function normCartPointToPixel([ncX, ncY]) {
  const [width, height] =[ 
    getFitnessCanvasWidth(),
    getFitnessCanvasHeight()
  ]
  const smallest = Math.min(width, height);
  return [width / 2 + (ncX * smallest) / 2, height / 2 - (ncY * smallest) / 2];
}

export function normCartSizeToPixel([nsW, nsH]) {
  const [width, height] =[ 
    getFitnessCanvasWidth(),
    getFitnessCanvasHeight()
  ]
  const smallest = Math.min(width, height);
  return [(nsW * smallest) / 2, (nsH * smallest) / 2];
}

export function normCartDistToPixel(value) {
  const [width, height] =[ 
    getFitnessCanvasWidth(),
    getFitnessCanvasHeight()
  ]
  const smallest = Math.min(width, height);
  return (value * smallest) / 2;
}

export function getNCExtent() {
  const [width, height] =[ 
    getFitnessCanvasWidth(),
    getFitnessCanvasHeight()
  ]
  const smallest = Math.min(width, height);
  return [width/smallest, height/smallest];
}

export class FitnessCoord {
    static pointToPixel([ncX, ncY]) {
        return normCartPointToPixel([ncX, ncY]);
    }
    static sizeToPixel([nsW, nsH]) {
        return normCartSizeToPixel([nsW, nsH]);
    }
    static distToPixel(value) {
        return normCartDistToPixel(value)
    }
    static getNCExtent() {
      return getNCExtent()
    }
}
