/**
 * A context menu item
 * @typedef {Object} ContextMenuItem
 * @property {string?} icon The icon to display with the label (must be a valid src)
 * @property {string?} alt The icon alt to display with the label (can be any text)
 * @property {string} label The label to display
 * @property {boolean | function(): boolean} active Wether the button should be marked/treated as active
 * @property {boolean} selected Wether the item is marked / selected
 * @property {boolean} divider If a divider is present
 * @property {null | Array<ContextMenuItem> | function(): Array<ContextMenuItem>} subset Subset of items if it is expandable into more entries
 * @property {null | string | function(ContextMenuItem): void} clickHandler Click execution handler OR event fired on this component
 */

let contextMenus = [];

function cleanUp(evt) {
  for (let i = 0; i < contextMenus.length; i++) {
    const cm = contextMenus[i];
    cm._checkToRemove(evt);
  }
}

function removeContextMenu(menu) {
  for (let i = 0; i < contextMenus.length; i++) {
    const cm = contextMenus[i];
    if (cm === menu) {
      contextMenus.splice(i, 1);
      cm.builder = {};
      break;
    }
  }
}

window.addEventListener("pointerdown", cleanUp, true);
window.addEventListener("blur", cleanUp);
window.addEventListener("contextmenu", cleanUp);

/**
 * Class to generate context menus
 * @class ContextMenuBuilder
 * @property {Array<ContextMenuItem>} builder The schema to build
 */
class ContextMenuBuilder extends HTMLElement {
  constructor() {
    super();
    this._shouldDisplay = false;
    contextMenus.push(this);
  }

  set for(val) {
    val.addEventListener("contextmenu", (evt) => {
      this._contextMenu(evt);
      evt.preventDefault();
    });
  }
  get for() {
    return this._root || document.querySelector(this.getAttribute("for"));
  }

  set builder(val) {
    this._builder = val;
  }
  get builder() {
    return this._builder || [];
  }

  connectedCallback() {
    if (!this._shouldDisplay) {
      // Should not display. Remove self
      this.remove();
    }
  }

  _checkToRemove(evt) {
    if (evt.source === this) return;

    if (evt.type === "pointerdown") {
      // Hide the menu if clicked outside
      let path = evt.composedPath();
      if (!path.includes(this)) {
        this.remove();
      }
    } else {
      this._shouldDisplay = false;
      this.remove();
    }
  }

  _contextMenu(evt) {
    if (this.isConnected) this.remove();
    // Clear the menu
    this.innerHTML = "";

    // Build the menu
    this._build();

    // Display the menu
    this._shouldDisplay = true;
    document.body.lastChild.after(this);

    // Set to cursor location
    this.style.position = "fixed";
    this.style.zIndex = "300";
    this.style.top = `${evt.clientY}px`;
    this.style.left = `${evt.clientX}px`;

    evt.source = this;

    this.dispatchEvent(new CustomEvent("contextmenu-init", { detail: this }));
  }

  _build(ptr = this.builder, parent = this) {
    ptr.forEach((entry) => {
      let container = document.createElement("button");

      // Create the icon when present
      if (entry.icon) {
        let img = document.createElement("img");
        img.src = entry.icon;
        container.appendChild(img);
      } else if (entry.alt) {
        let alt = document.createElement("span");
        alt.innerText = entry.alt;
        alt.classList.add("alt-label");
        container.appendChild(alt);
      }

      // Create the label
      if ("label" in entry) {
        let label = document.createElement("span");
        label.classList.add("text-label");
        label.innerText = entry.label;
        container.appendChild(label);
      }

      let active = true;
      if (entry.active !== undefined) {
        if (typeof entry.active === "function") {
          active = entry.active();
        } else {
          active = entry.active;
        }
        if (!active) {
          container.setAttribute("disabled", "");
        }
      }

      // Attach click handler
      if (entry.clickHandler && active) {
        if (typeof entry.clickHandler === "string") {
          // Fire event
          container.addEventListener("pointerdown", (evt) => {
            this.dispatchEvent(
              new CustomEvent(entry.clickHandler, { bubbles: true })
            );
            this.remove();
          });
        } else {
          // Fire function
          container.addEventListener("pointerdown", (evt) => {
            entry.clickHandler(evt);
            this.remove();
          });
        }
      }

      // Display as clickable when click handler has been added
      if (entry.clickHandler) {
        container.setAttribute("clickable", "");
      }

      // Create subset
      if (entry.subset) {
        let subset;
        if (typeof entry.subset === "function") {
          // Run function, then build with result
          subset = entry.subset();
        } else {
          // Array
          subset = entry.subset;
        }

        if (subset.length > 0) {
          // Create a child container
          let childContainer = document.createElement("div");

          this._build(subset, childContainer);

          childContainer.classList.add("submenu");
          container.classList.add("with-submenu");
          container.appendChild(childContainer);
        }
      }

      // Add class for selection if requested
      if (entry.selected) {
        container.classList.add("selected");
      }

      // Add class for divider if requested
      if (entry.divider) {
        container.classList.add("divider");
      }

      // Attach to parent
      container.classList.add("item");
      parent.appendChild(container);
    });
  }
}

customElements.define("context-menu", ContextMenuBuilder);
export { ContextMenuBuilder, removeContextMenu };
