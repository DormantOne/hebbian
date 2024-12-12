export function getVisCtx() {
  if (window.visCanvasCtx) {
    return window.visCanvasCtx;
  }
  throw new Error(
    "No visCanvasCtx found. Page may not have initialized properly"
  );
}

export function getVisCanvasWidth() {
  if (typeof window.visCanvasWidth === "number") {
    return window.visCanvasWidth;
  }
  throw new Error(
    "No visCanvasWidth found. Page may not have initialized properly"
  );
}

export function getVisCanvasHeight() {
  if (typeof window.visCanvasHeight === "number") {
    return window.visCanvasHeight;
  }
  throw new Error(
    "No visCanvasHeight found. Page may not have initialized properly"
  );
}

export function normCartPointToPixel([ncX, ncY]) {
  const [width, height] =[ 
    getVisCanvasWidth(),
    getVisCanvasHeight()
  ]
  const smallest = Math.min(width, height);
  return [width / 2 + (ncX * smallest) / 2, height / 2 - (ncY * smallest) / 2];
}

export function normCartSizeToPixel([nsW, nsH]) {
  const [width, height] =[ 
    getVisCanvasWidth(),
    getVisCanvasHeight()
  ]
  const smallest = Math.min(width, height);
  return [(nsW * smallest) / 2, (nsH * smallest) / 2];
}

export function normCartDistToPixel(value) {
  const [width, height] =[ 
    getVisCanvasWidth(),
    getVisCanvasHeight()
  ]
  const smallest = Math.min(width, height);
  return (value * smallest) / 2;
}

export function getNCExtent() {
  const [width, height] =[ 
    getVisCanvasWidth(),
    getVisCanvasHeight()
  ]
  const smallest = Math.min(width, height);
  return [width/smallest, height/smallest];
}

export class VisCoord {
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
