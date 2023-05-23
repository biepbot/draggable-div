import {
  ContextMenuBuilder,
  removeContextMenu,
} from "../context_menu_builder.mjs";
import { addDoubleClickListener } from "../dblclick/double_click.mjs";
import { clamp } from "../free_draggable_div.mjs";

// Set up board
const boardInput = document.getElementById("board-task-add");
const board = document.getElementById("board");

addDoubleClickListener(board, (evt) => {
  const rect = board.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;

  let item = { value: "", x, y };
  const note = addBoardItem(item);

  // Move item to be centered to mouse
  const noteRect = note.getBoundingClientRect();
  item.x -= noteRect.width / 2;
  item.y -= noteRect.height / 2;

  item.x = clamp(item.x, 0, rect.width - noteRect.width);
  item.y = clamp(item.y, 0, rect.height - noteRect.height);
  note.style.left = `${item.x}px`;
  note.style.top = `${item.y}px`;
  saveBoard();
});

boardInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    boardInputCallback();
  }
});

let boardItems = [];

function boardInputCallback() {
  let value = boardInput.value.trim();
  boardInput.value = "";
  addBoardItem({ value, x: 5, y: 5 });
  saveBoard();
}

function addBoardItem(item) {
  let contextMenu = new ContextMenuBuilder();
  const note = document.createElement("div");
  note.classList.add("sticky-note");
  note.style.top = `${item.y}px`;
  note.style.left = `${item.x}px`;
  const p = document.createElement("p");
  p.contentEditable = true;
  p.innerText = item.value || "";

  note.addEventListener("input", () => {
    // Update to new
    item.value = p.innerText || "";
    saveBoard();
  });

  note.addEventListener("pointerdown", (evt) => {
    if (!contextMenu.isConnected && !evt.composedPath().includes(contextMenu)) {
      // Not clicking on context menu, so display context menu
      contextMenu._contextMenu(evt);
    }
  });

  note.appendChild(p);
  board.appendChild(note);
  item.note = note;

  // Add to items
  boardItems.push(item);

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
        for (let i = 0; i < boardItems.length; i++) {
          const item = boardItems[i];
          if (item.note === note) {
            boardItems.splice(i, 1);
            break;
          }
        }
        note.remove();
        removeContextMenu(contextMenu);
        saveBoard();
      },
    },
  ];

  return note;
}

function saveBoard() {
  // This will cause an empty 'note' in the stringified json
  // so we have to clean those up
  let text = JSON.stringify(boardItems);
  let content = JSON.parse(text);
  for (let i = 0; i < content.length; i++) {
    delete content[i].note;
  }

  localStorage.setItem("boardList", JSON.stringify(content));
}

function loadBoard() {
  let rawItems = localStorage.getItem("boardList");
  if (rawItems) {
    let items = JSON.parse(rawItems);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      addBoardItem(item);
    }
  }
}

window.addEventListener("load", loadBoard);
board.addEventListener("change", (evt) => {
  const element = evt.detail;
  for (let i = 0; i < boardItems.length; i++) {
    const item = boardItems[i];

    if (item.note === element) {
      item.x = parseFloat(element.style.left);
      item.y = parseFloat(element.style.top);
      break;
    }
  }
  saveBoard();
});

export { boardInputCallback };
