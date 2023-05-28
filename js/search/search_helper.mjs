/**
 * Generator function that allows to wait for a set amount of frames
 * @param {number} frames Frames to wait for to pass
 * @returns {Promise} Promise resolving when x frames have passed
 * @private
 */
function nextFrame(frames) {
  let remainderFrames = frames;
  const framePromise = (r) => {
    if (remainderFrames-- <= 0) {
      r();
      return;
    }
    return requestAnimationFrame(() => {
      framePromise(r);
    });
  };

  return new Promise((r) => framePromise(r));
}

/**
 * Checks if this entity contains a given regex
 * @param {any} obj Entity to validate for regex
 * @param {RegExp} regExp Regex to browse the entity for
 * @returns {boolean} Wether the entity or its children values matched the regex
 * @private
 */
function check(obj, regExp) {
  if (obj !== null && typeof obj === "object") {
    return Object.values(obj).some(check);
  }

  if (Array.isArray(obj)) {
    return obj.some(check);
  }

  return (
    (typeof obj === "string" || typeof obj === "number") && regExp.test(obj)
  );
}

/**
 * Search query helper
 * @class
 * @property {string} query the query to use
 * @property {number} matchSpeed from options: amount of matches to process before pausing
 * @property {number} matchFrames from options: amount of frames to pause when match block has been reached
 * @property {number} nonMatchSpeed from options: amount of non-matches to process before pausing
 * @property {number} nonMatchFrames from options: amount of frames to pause when total match block has been reached
 */
class SearchHelper {
  constructor(options = {}) {
    this.options = options;
  }

  set matchSpeed(newVal) {
    this.options.matchSpeed = newVal;
  }
  get matchSpeed() {
    return "matchSpeed" in this.options ? this.options.matchSpeed : 500;
  }

  set matchFrames(newVal) {
    this.options.matchFrames = newVal;
  }
  get matchFrames() {
    return "matchFrames" in this.options ? this.options.matchFrames : 1;
  }

  set nonMatchSpeed(newVal) {
    this.options.nonMatchSpeed = newVal;
  }
  get nonMatchSpeed() {
    return "nonMatchSpeed" in this.options ? this.options.nonMatchSpeed : 500;
  }

  set nonMatchFrames(newVal) {
    this.options.nonMatchFrames = newVal;
  }
  get nonMatchFrames() {
    return "nonMatchFrames" in this.options ? this.options.nonMatchFrames : 1;
  }

  set query(newVal) {
    this._query = new RegExp(newVal, "i");
  }

  get query() {
    return (
      this._query || {
        test() {
          return true;
        },
      }
    );
  }

  /**
   * Finds values within a deep nested array of any entries. Stops when query changes
   * @generator
   * @param {any[]} array Array of any entries to find a value within
   * @param {object} options. Supports ignoreNonMatch and ignoreMatch
   * @yields {{done: boolean, value: any, match: boolean, processed: number, matches: number}}
   * @returns {{done: boolean, value: any, match: boolean, processed: number, matches: number}}
   */
  async *findInValuesOf(array, options = {}) {
    const query = this.query;
    let matches = 0;

    // Simple search that just finds entries in string[]
    for (let i = 0; i < array.length; i++) {
      const value = array[i];
      if (query !== this.query) return;

      let match = false;
      if (check(value, query)) {
        matches++;
        match = true;
        // Skip if match yields are ignored
        if (!options.ignoreMatch) {
          if (i % this.matchSpeed === 0) {
            await nextFrame(this.matchFrames);
          }
          if (query !== this.query) return;

          yield { done: false, value, match, processed: i + 1, matches };
        }
      } else {
        // Skip if non-match yields are ignored
        if (!options.ignoreNonMatch) {
          if (i % this.nonMatchSpeed === 0) {
            await nextFrame(this.nonMatchFrames);
          }
          if (query !== this.query) return;

          yield { done: false, value, match, processed: i + 1, matches };
        }
      }
    }

    // Final yield
    yield { done: true, match: false, processed: array.length, matches };
  }
}

export { SearchHelper };
