import {
  ContextMenuBuilder,
  removeContextMenu,
} from "../context_menu_builder.mjs";
import { addDoubleClickListener } from "../dblclick/double_click.mjs";
import { FreeDraggableDivElement } from "../free_draggable_div.mjs";

function addScaleListener(element, fn) {
  // TODO: this does NOT work on Safari (touches, targetTouches are not supported)
  let hypo = undefined;

  element.addEventListener("touchmove", (evt) => {
    if (evt.touches.length === 2) {
      let hypo1 = Math.hypot(
        evt.touches[0].clientX - evt.touches[1].clientX,
        evt.touches[0].clientY - evt.touches[1].clientY
      );
      if (hypo === undefined) {
        hypo = hypo1;
      } else {
        let pow = Math.sqrt(hypo1 / hypo);
        pow = Math.pow(pow, 2);
        fn({
          strength: pow,
          x: (evt.touches[0].clientX + evt.touches[1].clientX) / 2,
          y: (evt.touches[0].clientY + evt.touches[1].clientY) / 2,
        });
        hypo = undefined;
      }
    }
  });

  element.addEventListener("touchend", () => {
    hypo = undefined;
  });
}

function calculateSize(element) {
  // get total size for all children
  let min = {
    x: Infinity,
    y: Infinity,
  };
  let max = {
    x: -Infinity,
    y: -Infinity,
  };

  Array.from(element.children).forEach((child) => {
    const size = child.getBoundingClientRect();
    if (size.left < min.x) min.x = size.left;
    if (size.right > max.x) max.x = size.right;

    if (size.top < min.y) min.y = size.top;
    if (size.bottom > max.y) max.y = size.bottom;
  });

  return {
    width: max.x - min.x,
    height: max.y - min.y,
  };
}

class RetroBoardElement extends FreeDraggableDivElement {
  constructor() {
    super();

    this._scale = 1;
    this._x = 0;
    this._y = 0;

    // Add double click listener
    addDoubleClickListener(this, (evt) => {
      const rect = this.getBoundingClientRect();
      let x = evt.clientX - rect.left;
      let y = evt.clientY - rect.top;

      // Translate screen coordinates to element coordinates
      x /= this.scale;
      y /= this.scale;

      x -= this.x;
      y -= this.y;

      let item = { value: "", x, y };
      const note = this.addBoardItem(item);

      // Move item to be centered to mouse
      const noteRect = note.getBoundingClientRect();
      // Move x, y by half width, height upped by scale
      item.x -= noteRect.width / 2 / this.scale;
      item.y -= noteRect.height / 2 / this.scale;

      note.style.left = `${item.x}px`;
      note.style.top = `${item.y}px`;
      this.updateColors(note);
    });

    // Add move listener
    let ptrCache = {};
    this.addEventListener("pointerdown", (evt) => {
      let path = evt.composedPath();
      for (let i = 0; i < path.length; i++) {
        const element = path[i];
        if (element.classList && element.classList.contains("sticky-note")) {
          return;
        }
      }

      this.setPointerCapture(evt.pointerId);
      this.style.cursor = "grab";
      ptrCache[evt.pointerId] = {
        x: evt.clientX,
        y: evt.clientY,
      };
    });

    this.addEventListener("pointermove", (evt) => {
      if (!this.hasPointerCapture(evt.pointerId)) return;
      this.style.cursor = "grabbing";
      const starter = ptrCache[evt.pointerId];

      // Move screen with pointer
      this.x += (evt.clientX - starter.x) / this.scale;
      this.y += (evt.clientY - starter.y) / this.scale;
      ptrCache[evt.pointerId] = {
        x: evt.clientX,
        y: evt.clientY,
      };

      evt.preventDefault();
    });

    this.addEventListener("lostpointercapture", (evt) => {
      delete ptrCache[evt.pointerId];
      if (Object.keys(ptrCache).length === 0) {
        // No more grab
        this.style.cursor = null;
      }
    });

    this.addEventListener("wheel", (evt) => {
      // User is scrolling
      const strength = 1.5;
      if (evt.deltaY > 0) {
        this.scale /= strength;
      } else {
        this.scale *= strength;
      }

      // Scale around middle point
    });

    addScaleListener(this, (evt) => {
      this.scale *= evt.strength;

      // Scale around x,y
    });
  }

  set scale(val) {
    this._scale = Math.max(val, 0.4);
    this.refresh();
  }

  get scale() {
    return this._scale;
  }

  set x(val) {
    this._x = val;
    this.refresh();
  }

  get x() {
    return this._x;
  }

  set y(val) {
    this._y = val;
    this.refresh();
  }

  get y() {
    return this._y;
  }

  get into() {
    return ".holder";
  }

  get draggable() {
    return ".sticky-note";
  }

  refresh() {
    this.holder.style.transform = `scale(${this.scale}) translate(${this.x}px, ${this.y}px)`;
  }

  connectedCallback() {
    this.holder = this.querySelector(this.into);
    const size = calculateSize(this.holder);
    const elementSize = {
      width: this.clientWidth,
      height: this.clientHeight,
    };

    //TODO: Calculate scale to fit size on screen
  }

  setDraggableStyling(dragger) {
    // Preserve initial w/h
    dragger.dragCopy.style.width = null;
    dragger.dragCopy.style.height = null;
  }

  addBoardItem(item) {
    let contextMenu = new ContextMenuBuilder();
    const note = document.createElement("div");
    note.classList.add("sticky-note");
    const p = document.createElement("p");
    p.contentEditable = true;
    p.innerText = item.value || "";

    note.addEventListener("input", () => {
      // Update to new
      item.value = p.innerText || "";
    });

    note.addEventListener("pointerdown", (evt) => {
      if (
        !contextMenu.isConnected &&
        !evt.composedPath().includes(contextMenu)
      ) {
        // Not clicking on context menu, so display context menu
        contextMenu._contextMenu(evt);
      }
    });

    note.appendChild(p);
    this.holder.appendChild(note);
    item.note = note;

    // Create a context menu to use for deleting the notes
    contextMenu.addEventListener("contextmenu-init", (evt) => {
      const menu = evt.detail;
      // Move menu to inside element
      menu.remove();
      note.appendChild(menu);
      // Revert all the styling
      menu.style.position = null;
      menu.style.top = null;
      menu.style.left = null;
    });
    contextMenu.for = note;
    contextMenu.builder = [
      {
        alt: "x",
        clickHandler: () => {
          note.remove();
          removeContextMenu(contextMenu);
        },
      },
    ];

    // Translate in accordance to scale and x,y
    note.style.top = `${item.y}px`;
    note.style.left = `${item.x}px`;
    return note;
  }

  updateColors(note) {
    // Check if dragger.dragCopy is touching any of the hover-divs
    let hoverDivs = this.querySelectorAll("hover-div");
    for (let i = 0; i < hoverDivs.length; i++) {
      const element = hoverDivs[i];
      if (element.setColorOnIntersect(note)) break;
    }
  }

  updatePosition(dragger, evt) {
    const rect = dragger.startLocation;
    dragger.dragCopy.style.top =
      (evt.clientY + rect.mouseOffsetY) / this.scale - this.y + "px";

    dragger.dragCopy.style.left =
      (evt.clientX + rect.mouseOffsetX) / this.scale - this.x + "px";

    this.updateColors(dragger.dragCopy);
  }

  removeGhostFor(ele, dragger) {
    super.removeGhostFor(ele, dragger);

    // Carry over color styling
    ele.style.background = dragger.dragCopy.style.background;
  }
}

customElements.define("retro-board", RetroBoardElement);
