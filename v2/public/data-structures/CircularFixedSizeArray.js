export default class CircularFixedSizeArray {
    constructor(size, defaultValue = 0) {
      this.size = size;
      this.defaultValue = defaultValue;
      this.buffer = new Array(size).fill(defaultValue);
      this.head = 0; // Points to the next position to overwrite when inserting left
    }
  
    /**
     * Inserts a value from the left, shifting the buffer to the right.
     * The oldest value on the right is discarded.
     * @param {number} value - The value to insert.
     */
    unshift(value) {
      // Overwrite at the current head position
      this.buffer[this.head] = value;
      // Move the head forward (increment) and wrap around using modulo
      this.head = (this.head + 1) % this.size;
    }
  
    /**
     * Retrieves the value at a logical index.
     * Logical index 0 = most recent insertion (left), size - 1 = oldest value.
     * @param {number} i - Logical index (0 = most recent).
     * @returns {number} - The value at the specified logical index.
     */
    get(i) {
      // Direct mapping as data shifts logically left to right
      const physicalIndex = (this.head - 1 - i + this.size) % this.size;
      return this.buffer[physicalIndex];
    }
  
    /**
     * Sets the value at a logical index.
     * Logical index 0 = most recent insertion (left), size - 1 = oldest value.
     * @param {number} i - Logical index (0 = most recent).
     * @param {number} value - The value to set at the specified logical index.
     */
    set(i, value) {
      const physicalIndex = (this.head - 1 - i + this.size) % this.size;
      this.buffer[physicalIndex] = value;
    }
  
    /**
     * Returns the buffer's current state as an ordered array.
     * Starts from the most recent insertion on the left.
     * @returns {Array} - The ordered contents of the buffer.
     */
    getContents() {
      const recentToOldest = [];
      for (let i = 0; i < this.size; i++) {
        recentToOldest.push(this.get(i));
      }
      return recentToOldest;
    }
  
    /**
     * Resets the buffer to the default value.
     */
    reset() {
      this.buffer.fill(this.defaultValue);
      this.head = 0;
    }

  }