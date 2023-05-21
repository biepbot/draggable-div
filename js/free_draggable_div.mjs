import { DraggableDivElement } from "./draggable_div.mjs";

function clamp(input, min, max) {
  if (input > max) return max;
  if (input < min) return min;
  return input;
}

/**
 * Calculates a clamp to fix box within box
 * @param {DOMRect} box Box to limit within other box
 * @param {DOMRect} boxLimit Box limit
 * @returns {{x: number, y: number}}
 */
function clampBoxWithinBox(box, boxLimit) {
  // If we can't fit in any way, then return original
  if (box.width > boxLimit.width) return box;
  if (box.height > boxLimit.height) return box;

  return {
    x: clamp(box.x, boxLimit.x, boxLimit.x + boxLimit.width - box.width),
    y: clamp(box.y, boxLimit.y, boxLimit.y + boxLimit.height - box.height),
  };
}

class FreeDraggableDivElement extends DraggableDivElement {
  constructor() {
    super();
  }

  updatePosition(dragger, evt) {
    // Check if position would be out of bounds of lane given, then clamp
    const boundaries = this.getBoundingClientRect();
    const sizes = dragger.dragCopy.getBoundingClientRect();

    const rect = dragger.startLocation;
    const offsetX = evt.clientX - rect.clientLeft;
    const offsetY = evt.clientY - rect.clientTop;
    const calculatedRect = {
      width: sizes.width,
      height: sizes.height,
      x: rect.left + offsetX + rect.mouseOffsetX,
      y: rect.top + offsetY + rect.mouseOffsetY,
    };

    // Recalculate boundaries to be on a relative scale
    const calculatedBoundaries = {
      width: boundaries.width,
      height: boundaries.height,
      x: 0,
      y: 0,
    };

    const updatedVals = clampBoxWithinBox(calculatedRect, calculatedBoundaries);

    dragger.dragCopy.style.top = updatedVals.y + "px";
    dragger.dragCopy.style.left = updatedVals.x + "px";
  }

  removeGhostFor(ele, dragger) {
    // take over position of dragger.dragCopy
    const drag = dragger.dragCopy;
    ele.style.top = drag.style.top;
    ele.style.left = drag.style.left;

    return super.removeGhostFor(ele, dragger);
  }
}

customElements.define("free-draggable-div", FreeDraggableDivElement);
