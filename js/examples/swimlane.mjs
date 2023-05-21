import {
  ContextMenuBuilder,
  removeContextMenu,
} from "../context_menu_builder.mjs";

const drag = document.getElementById("drag-div");
const input = document.getElementById("task-add");
input.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    swimLaneInputCallback();
  }
});

let items = {};

function swimLaneInputCallback() {
  let value = input.value.trim();
  input.value = "";
  if (value in items) return;
  addSwimLaneItem({ value, lane: "TO DO" });
  saveSwimLane();
}

function addSwimLaneItem(item) {
  let contextMenu = new ContextMenuBuilder();
  const laneWrapper = drag.querySelector(`[lane='${item.lane}'] .wrapper`);

  // <div class="draggable">Eat bread</div>
  const div = document.createElement("div");
  div.classList.add("draggable");

  // Add text
  const p = document.createElement("p");
  p.innerText = item.value;
  p.classList.add("text");
  div.appendChild(p);

  // Create a context menu to use for deleting the tickets
  div.addEventListener("pointerdown", (evt) => {
    if (!contextMenu.isConnected && !evt.composedPath().includes(contextMenu)) {
      // Not clicking on context menu, so display context menu
      contextMenu._contextMenu(evt);
    }
  });
  contextMenu.addEventListener("contextmenu-init", (evt) => {
    const menu = evt.detail;
    // Move menu to inside element
    menu.remove();
    div.appendChild(menu);
    // Revert all the styling
    menu.style.position = null;
    menu.style.top = null;
    menu.style.left = null;
  });
  contextMenu.for = div;
  contextMenu.builder = [
    {
      label: "delete",
      alt: "x",
      clickHandler: () => {
        // Remove self
        div.remove();

        // Remove item
        delete items[item.value];
        removeContextMenu(contextMenu);

        // Save
        saveSwimLane();
      },
    },
  ];

  laneWrapper.appendChild(div);

  // Add to items
  items[item.value] = item.lane;
}

function saveSwimLane() {
  localStorage.setItem("taskList", JSON.stringify(items));
}

function loadSwimLane() {
  let rawItems = localStorage.getItem("taskList");
  if (rawItems) {
    let items = JSON.parse(rawItems);
    for (const item in items) {
      addSwimLaneItem({ value: item, lane: items[item] });
    }
  }
}

window.addEventListener("load", loadSwimLane);
drag.addEventListener("change", (evt) => {
  const element = evt.detail;
  let value = element.querySelector("p.text").innerText;

  let newLane = element.parentElement.parentElement.getAttribute("lane");
  if (!newLane) {
    console.error("Swimlane structure has changed?");
    return;
  }

  items[value] = newLane;
  saveSwimLane();
});

export { swimLaneInputCallback };
