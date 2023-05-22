function distanceTo(element, x, y, xAxis) {
  // Heuristicly speaking, looking at center point
  // suffices UNLESS elements overlap.
  let rect = element.getBoundingClientRect();
  let center = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };

  if (xAxis) return x - center.x;
  else return y - center.y;
}

function closestsElementTo(arr, x, y, xAxis) {
  let info = {
    element: null,
    distance: Infinity,
    before: null,
  };
  arr.forEach((element) => {
    // Find closest distance to
    let realDistance = distanceTo(element, x, y, xAxis);
    let distance = Math.abs(realDistance);
    if (distance < info.distance) {
      info.element = element;
      info.distance = distance;
      info.before = realDistance < 0;
    }
  });
  return info;
}

// Workaround for touch-action: none not always working
document.addEventListener(
  "touchmove",
  (evt) => {
    if (document.querySelector("*[dragging]")) {
      evt.preventDefault();
    }
  },
  { passive: false }
);

/**
 * DraggableDivElement
 * @class
 * @property {number} Amount of currently active, dragged elements
 */
class DraggableDivElement extends HTMLElement {
  static get observedAttributes() {
    return ["draggable", "into"];
  }

  /**
   * Draggable element query
   * @readonly
   * @returns {string?} The query for the draggable components
   */
  get draggable() {
    return this.getAttribute("draggable");
  }

  /**
   * Queried draggable elements or own children
   * @readonly
   * @returns {NodeList<HTMLElement>} All the draggable elements
   */
  get draggables() {
    if (this.draggable) {
      return this.querySelectorAll(this.draggable);
    } else {
      return Array.from(this.children);
    }
  }

  /**
   * Draggable element query which they can be moved into
   * @readonly
   * @returns {string?} The query for the parents of which the draggable elements can be moved into
   */
  get into() {
    return this.getAttribute("into");
  }

  /**
   * Queried draggable element parent list or list of self
   * @readonly
   * @returns {NodeList<HTMLElement>} All the lane elements
   */
  get lanes() {
    if (this.into) {
      return this.querySelectorAll(this.into);
    } else {
      return [this];
    }
  }

  /**
   * Amount of currently active, dragged elements
   * @returns {number} Drag amount
   */
  get dragging() {
    return Number(this.getAttribute("drag-count") || 0);
  }

  set dragging(newVal) {
    if (newVal > 0) {
      this.setAttribute("drag-count", newVal);
    } else {
      this.removeAttribute("drag-count");
    }
  }

  /**
   * Indicator if lanes are horizontal or vertical
   * @returns {boolean} Wether this parent drag elements are to be handled horizontally or vertically
   */
  get laneHorizontal() {
    return this.hasAttribute("lane-horizontal");
  }

  /**
   * Indicator if dragged elements are horizontal or vertical
   * @returns {boolean} Wether the drag elements are to be handled horizontally or vertically
   */
  get draggableHorizontal() {
    return this.hasAttribute("draggable-horizontal");
  }

  constructor() {
    super();
    this._draggableList = [];
    this._detachedList = [];

    // Add a mutation observer to check if children are added
    this._watcher = new MutationObserver(() => {
      this._refreshDraggables();
    });
    this._watcher.observe(this, { childList: true, subtree: true });
  }

  /**
   * Refreshes the draggable response
   * @private
   */
  _refreshDraggables() {
    let weakThis = new WeakRef(this);

    // Update all lanes to be position relative
    this.lanes.forEach((lane) => {
      lane.style.position = "relative";
    });

    this.draggables.forEach((draggable) => {
      // Only add listener if not already added
      if (this._draggableList.includes(draggable)) return;
      if (draggable.hasAttribute("dragging")) return;
      this._draggableList.push(draggable);

      // Add event listener on drag
      let dragger = {};
      this._detachedList.push(dragger);

      if (!dragger.dragCopy) {
        dragger.dragCopy = draggable.cloneNode(true);
        dragger.dragCopy.setAttribute("dragging", "");
      }

      // On start drag, add a ghost
      draggable.addEventListener("pointerdown", (evt) => {
        let me = weakThis.deref();
        if (!me) return;
        if (dragger.dragCopy.hasPointerCapture(evt.pointerId)) return;
        if (!Array.from(me.draggables).includes(draggable)) return;
        me._watcher.disconnect();

        me.dragging++;

        const rect = draggable.getBoundingClientRect();
        // Preserve dimensions
        dragger.startLocation = {
          top: draggable.offsetTop,
          left: draggable.offsetLeft,
          clientTop: rect.top,
          clientLeft: rect.left,
          mouseOffsetX: rect.left - evt.clientX,
          mouseOffsetY: rect.top - evt.clientY,
        };

        // Create copies (of to-move and moving)
        dragger.ghost = me.requestGhostFor(draggable, dragger);
        dragger.dragCopy.style.width = rect.width + "px";
        dragger.dragCopy.style.height = rect.height + "px";
        draggable.after(dragger.dragCopy);
        dragger.dragCopy.setPointerCapture(evt.pointerId);

        me.updatePosition(dragger, evt);

        // Make our element float to cursor
        me.setDraggableStyling(dragger);
        me.dispatchEvent(new CustomEvent("drag", { detail: draggable }));

        me._watcher.observe(me, { childList: true, subtree: true });
      });

      // On drag, add ghost inbetween elements (unless one is already present)
      dragger.dragCopy.addEventListener("pointermove", (evt) => {
        let me = weakThis.deref();
        if (!me) return;
        if (!dragger.dragCopy.hasPointerCapture(evt.pointerId)) return;
        me._watcher.disconnect();

        // Mark original element as busy dragging
        draggable.setAttribute("dragging", "");

        me.updatePosition(dragger, evt);
        me._watcher.observe(me, { childList: true, subtree: true });

        // Prevent select
        evt.preventDefault();
        return false;
      });

      // On stop drag, remove ghost, move element
      const dragDone = (evt) => {
        let me = weakThis.deref();
        if (!me) return;
        if (!dragger.dragCopy.hasPointerCapture(evt.pointerId)) return;
        dragger.dragCopy.releasePointerCapture(evt.pointerId);
        me._watcher.disconnect();

        // Clean up ghosts / copies
        dragger.dragCopy.remove();
        me.removeGhostFor(draggable, dragger);
        delete dragger.startLocation;

        me.dragging--;

        // If order changed, call change event
        me.dispatchEvent(new CustomEvent("change", { detail: draggable }));
        me._watcher.observe(me, { childList: true, subtree: true });
      };
      dragger.dragCopy.addEventListener("pointerup", dragDone);
      dragger.dragCopy.addEventListener("pointercancel", dragDone);
    });
  }

  /**
   * Call to request the position of a dragger
   * @param {*} dragger Dragger containing information of copies, ghosts, start location
   * @param {PointerEvent} evt the original event
   */
  updatePosition(dragger, evt) {
    const rect = dragger.startLocation;
    const offsetX = evt.clientX - rect.clientLeft;
    const offsetY = evt.clientY - rect.clientTop;

    dragger.dragCopy.style.top = rect.top + offsetY + rect.mouseOffsetY + "px";
    dragger.dragCopy.style.left =
      rect.left + offsetX + rect.mouseOffsetX + "px";

    // Check which lane we have moved to
    let lane = closestsElementTo(
      this.lanes,
      evt.clientX,
      evt.clientY,
      this.laneHorizontal
    ).element;

    // Check which draggable we are between
    let draggables = [];

    if (this.draggable) draggables = lane.querySelectorAll(this.draggable);
    else draggables = lane.children;

    // Filter out ghosts and ghost-original elements
    draggables = Array.from(draggables).filter((ele) => {
      return !ele.hasAttribute("dragging") && !ele.classList.contains("ghost");
    });
    let newDraggable = closestsElementTo(
      draggables,
      evt.clientX,
      evt.clientY,
      this.draggableHorizontal
    );

    // Move ghost to draggable
    dragger.ghost.remove();
    if (!newDraggable.element) {
      // First element into lane
      lane.appendChild(dragger.ghost);
    } else {
      if (newDraggable.before) {
        newDraggable.element.before(dragger.ghost);
      } else {
        newDraggable.element.after(dragger.ghost);
      }
    }
  }

  /**
   * Sets the further styling for a dragger (position, zIndex, etc)
   * @param {*} dragger Dragger containing information of copies, ghosts, start location
   */
  setDraggableStyling(dragger) {
    // Rely on CSS styling for positioning
    const drag = dragger.dragCopy;
    drag.style.position = "absolute";
    drag.style.zIndex = "100";
  }

  /**
   * Requests a ghost for the element that is being dragged
   * @param {HTMLElement} ele Element being dragged
   * @param {*} dragger Dragger containing information of copies, ghosts, start location
   * @returns {HTMLElement} Element to placehold the dragged element
   */
  requestGhostFor(ele, dragger) {
    ele.classList.add("ghost");

    // update drag copy
    dragger.dragCopy.innerHTML = ele.cloneNode(true).innerHTML;

    return ele;
  }

  /**
   * Removes a ghost for a dragged element
   * @param {HTMLElement} ele The dragged element
   * @param {HTMLElement} ghost The ghost left in the lanes
   * @returns {HTMLElement} The original element
   */
  removeGhostFor(ele, dragger) {
    ele.classList.remove("ghost");
    ele.removeAttribute("dragging");
    dragger.ghost.classList.remove("ghost");
    dragger.ghost.removeAttribute("dragging");
    delete dragger.ghost;
    return ele;
  }

  connectedCallback() {
    this._refreshDraggables();
  }

  attributeCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case "draggable":
      case "into":
        this._refreshDraggables();
        break;
    }
  }
}

customElements.define("draggable-div", DraggableDivElement);
export { DraggableDivElement };
