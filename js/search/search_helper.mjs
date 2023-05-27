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

function createEvent(type, cur, max, results) {
  const progress = (cur / max) * 100;
  return new CustomEvent(type, {
    detail: {
      count: max,
      index: cur,
      results,
      progress,
      humanReadable: () => {
        return `Found ${results} in ${cur} entries (${progress.toFixed(1)}%)`;
      },
    },
  });
}

/**
 * Search query helper
 * @class
 * @property {string} query the query to use
 */
class SearchHelper extends EventTarget {
  /**
   * @param {number} [limit=500] Limit of results per calculation
   * @param {number} [frames=1] Amount of frames to wait before continuing search
   */
  constructor(limit = 99, frames = 5) {
    super();
    this.limit = limit;
    this.frames = frames;
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

  async *findInValuesOf(array) {
    const query = this.query;
    let results = 0;
    this.dispatchEvent(createEvent("start", 0, array.length, results));

    const searchAborted = (i) => {
      this.dispatchEvent(createEvent("cancel", i, array.length, results));
    };

    // Simple search that just finds entries in string[]
    for (let i = 0; i < array.length; i++) {
      const entry = array[i];
      if (query !== this.query) return searchAborted(i);
      if (check(entry, query)) {
        if (results % this.limit === 0) {
          await nextFrame(this.frames);
          if (query !== this.query) return searchAborted(i);

          this.dispatchEvent(createEvent("progress", i, array.length, results));
        }
        if (query !== this.query) return searchAborted(i);

        results++;
        yield entry;
      }
    }

    this.dispatchEvent(createEvent("end", array.length, array.length, results));
  }
}

export { SearchHelper };
