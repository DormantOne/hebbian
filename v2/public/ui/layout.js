/**
 * Computes the size of an element as a fraction of `window.innerWidth` and `window.innerHeight`
 * Then, adjusts the element's CSS `width` and `height` properties to maintain this fraction
 * Using `vw` and `vh` units for width and height.
 *
 * @remarks
 * This is useful in highly interactive applications, such as simulations and games
 * where we may want to ensure that the size of an element remains consistent
 * and begins to scroll when its enclosed content overflows
 *
 * Initially, I though using display: grid would fix the problem automatically
 * but turns out `1fr` will grow to fit content instead of constraining content
 *
 * To apply detailed constratins in dynamic layouts, we need to use Javascript to
 * measure and apply explict units (px, rem, vw, vh, etc.)
 */
export function constrainElementFractionOfWindowSize(element) {
  const fractionW = element.clientWidth / window.innerWidth;
  const fractionH = element.clientHeight / window.innerHeight;
  element.style.width = `${fractionW*100}vw`;
  element.style.height = `${fractionH*100}vh`;
}
