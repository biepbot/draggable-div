import { DraggableDivElement } from "./draggable_div.mjs";

class FreeDraggableDivElement extends DraggableDivElement {
  constructor() {
    super();
  }

  updatePosition(dragger, x, y) {
    // TODO:
    // Check if position would be out of bounds of lane given, then clamp

    super.updatePosition(dragger, x, y);
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
