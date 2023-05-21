import { DraggableDivElement } from "./draggable_div.mjs";

class FreeDraggableDivElement extends DraggableDivElement {
  constructor() {
    super();
  }

  updatePosition(dragger, x, y) {
    // Check if position would be out of bounds of lane given

    dragger.dragCopy.style.top = dragger.startLocation.top + y + "px";
    dragger.dragCopy.style.left = dragger.startLocation.left + x + "px";
  }
}

customElements.define("free-draggable-div", FreeDraggableDivElement);
