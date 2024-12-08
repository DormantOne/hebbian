export function getVisCtx() {
  if (window.visCanvasCtx) {
    return window.visCanvasCtx;
  }
  throw new Error(
    "No visCanvasCtx found. Page may not have initialized properly"
  );
}

export function getVisCanvasSize() {
  if (typeof window.visCanvasSize === "number") {
    return window.visCanvasSize;
  }
  throw new Error(
    "No visCanvasSize found. Page may not have initialized properly"
  );
}

export function normCartPointToPixel([ncX, ncY]) {
  const size = getVisCanvasSize();
  return [size / 2 + (ncX * size) / 2, size / 2 - (ncY * size) / 2];
}

export function normCartSizeToPixel([nsW, nsH]) {
  const size = getVisCanvasSize();
  return [(nsW * size) / 2, (nsH * size) / 2];
}

export function normCartDistToPixel(value) {
  const size = getVisCanvasSize();
  return (value * size) / 2;
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
}
