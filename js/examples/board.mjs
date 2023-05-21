const boardInput = document.getElementById("board-task-add");
const board = document.getElementById("board");
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
  const note = document.createElement("p");
  note.classList.add("sticky-note");
  note.style.top = `${item.y}px`;
  note.style.left = `${item.x}px`;
  note.contentEditable = true;
  note.innerText = item.value;

  note.addEventListener("input", () => {
    // Update to new
    item.value = note.innerText || "";
    saveBoard();
  });

  board.appendChild(note);
  item.note = note;

  // Add to items
  boardItems.push(item);
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
