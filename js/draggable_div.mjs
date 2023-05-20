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

/**
 * DraggableDivElement
 * @class
 * @property {number} Amount of currently active, dragged elements
 */
class DraggableDivElement extends HTMLElement {
  static get observedAttributes() {
    return ["draggable"];
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
  }

  /**
   * Refreshes the draggable response
   * @private
   */
  _refreshDraggables() {
    let weakThis = new WeakRef(this);

    this.draggables.forEach((draggable) => {
      // Only add listener if not already added
      if (this._draggableList.includes(draggable)) return;
      this._draggableList.push(draggable);

      // Add event listener on drag
      let dragger = {};
      this._detachedList.push(dragger);

      // On start drag, add a ghost
      draggable.addEventListener("pointerdown", (evt) => {
        let me = weakThis.deref();
        if (!me) return;
        if (draggable.hasPointerCapture(evt.pointerId)) return;
        if (!Array.from(me.draggables).includes(draggable)) return;
        draggable.setPointerCapture(evt.pointerId);

        me.dragging++;

        const rect = draggable.getBoundingClientRect();
        // Preserve dimensions
        dragger.startLocation = { top: rect.top, left: rect.left };
        dragger.startLocation.top -= evt.pageY;
        dragger.startLocation.left -= evt.pageX;

        // Create copies (of to-move and moving)
        dragger.ghost = me.requestGhostFor(draggable);
        draggable.setAttribute("dragging", "");
        dragger.dragCopy = draggable.cloneNode(true);
        dragger.dragCopy.style.width = rect.width + "px";
        dragger.dragCopy.style.height = rect.height + "px";
        draggable.after(dragger.dragCopy);
        dragger.dragCopy.style.top =
          dragger.startLocation.top + evt.pageY + "px";
        dragger.dragCopy.style.left =
          dragger.startLocation.left + evt.pageX + "px";

        // Make our element float to cursor
        dragger.dragCopy.style.position = "fixed";
        dragger.dragCopy.style.zIndex = "100";

        // Hide original
        draggable.style.display = "none";
        draggable.classList.add("ghost", "ghost-original");

        me.dispatchEvent(new CustomEvent("drag", { detail: draggable }));
      });

      // On drag, add ghost inbetween elements (unless one is already present)
      draggable.addEventListener("pointermove", (evt) => {
        let me = weakThis.deref();
        if (!me) return;
        if (!draggable.hasPointerCapture(evt.pointerId)) return;

        dragger.dragCopy.style.top =
          dragger.startLocation.top + evt.pageY + "px";
        dragger.dragCopy.style.left =
          dragger.startLocation.left + evt.pageX + "px";

        // Check which lane we have moved to
        let lane = me.positionToLane(evt.pageX, evt.pageY).element;

        // Check which draggable we are between
        let newDraggable = me.positionToDraggable(lane, evt.pageX, evt.pageY);

        // If this would mean that it would be added to the exact same location, ignore
        if (newDraggable.element) {
          if (
            // If set to before and this space is already occupied by us, then ignore
            (newDraggable.before &&
              newDraggable.element.previousSibling === dragger.dragCopy) ||
            // If set to after and this space is already occupied by us, then ignore
            (!newDraggable.before &&
              newDraggable.element.nextSibling === dragger.dragCopy)
          ) {
            return;
          }
        }

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
      });

      // On stop drag, remove ghost, move element
      const dragDone = (evt) => {
        let me = weakThis.deref();
        if (!me) return;
        if (!draggable.hasPointerCapture(evt.pointerId)) return;
        draggable.releasePointerCapture(evt.pointerId);

        // Move element to location
        draggable.remove();
        dragger.ghost.after(draggable);

        // Clean up ghosts
        dragger.dragCopy.remove();
        dragger.ghost.remove();
        delete dragger.ghost;
        delete dragger.dragCopy;
        delete dragger.startLocation;
        draggable.removeAttribute("dragging");

        // Reset style
        draggable.style.display = null;
        draggable.classList.remove("ghost", "ghost-original");

        me.dragging--;

        // If order changed, call change event
        me.dispatchEvent(new CustomEvent("change", { detail: draggable }));
      };
      draggable.addEventListener("pointerup", dragDone);
      draggable.addEventListener("pointercancel", dragDone);
    });
  }

  /**
   * Function to determine which lane is closest to element being dragged
   * @param {number} x page x mouse coordinate
   * @param {number} y page y mouse coordinate
   * @returns {{element: HTMLElement?, distance: number, before: boolean?}}
   */
  positionToLane(x, y) {
    return closestsElementTo(this.lanes, x, y, this.laneHorizontal);
  }

  /**
   * Function to determine in which lane the closest draggable is found
   * @param {HTMLElement} lane The lane of the element
   * @param {number} x page x mouse coordinate
   * @param {number} y page y mouse coordinate
   * @returns {{element: HTMLElement?, distance: number, before: boolean?}}
   */
  positionToDraggable(lane, x, y) {
    let draggables = [];

    if (this.draggable) draggables = lane.querySelectorAll(this.draggable);
    else draggables = lane.children;

    // Filter out ghosts and ghost-original elements
    draggables = Array.from(draggables).filter((ele) => {
      return !(
        ele.classList.contains("ghost") ||
        ele.classList.contains("ghost-original") ||
        ele.hasAttribute("dragging")
      );
    });
    return closestsElementTo(draggables, x, y, this.draggableHorizontal);
  }

  /**
   * Requests a ghost for the element that is being dragged
   * @param {HTMLElement} ele Element being dragged
   * @returns {HTMLElement} Element to placehold the dragged element
   */
  requestGhostFor(ele) {
    let ghost = ele.cloneNode(true);
    ghost.classList.add("ghost");
    ele.after(ghost);
    return ghost;
  }

  connectedCallback() {
    this._refreshDraggables();
  }

  attributeCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case "draggable":
        this._refreshDraggables();
        break;
    }
  }
}

customElements.define("draggable-div", DraggableDivElement);
