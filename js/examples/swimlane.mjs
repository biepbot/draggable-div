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
  let contextMenu = new ContextMenuBuilder();
  contextMenu.for = div;
  contextMenu.builder = [
    {
      label: "Delete",
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
