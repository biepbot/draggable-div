let dotHolder = {};
let lineHolder = {};
const dotSize = 6;

// DOT
function dot(color, x, y) {
  if (!(color in dotHolder)) {
    let dot = document.createElement("div");

    dot.style.height = `${dotSize}px`;
    dot.style.width = `${dotSize}px`;
    dot.style.borderRadius = `${dotSize / 2}px`;
    dot.style.position = "fixed";
    dot.style.pointerEvents = "none";
    dot.style.background = color;
    dot.style.zIndex = "100";
    document.body.appendChild(dot);
    dotHolder[color] = dot;
  }
  let dot = dotHolder[color];
  dot.style.top = `${y - dotSize / 2}px`;
  dot.style.left = `${x - dotSize / 2}px`;
}

function undot(color) {
  if (color in dotHolder) {
    dotHolder[color].remove();
    delete dotHolder[color];
  }
}

// LINE
function line(color, x, y, horizontal) {
  if (!(color in lineHolder)) {
    let line = document.createElement("div");
    line.style.position = "fixed";
    line.style.pointerEvents = "none";
    line.style.background = color;
    line.style.zIndex = "100";
    document.body.appendChild(line);
    lineHolder[color] = line;
  }

  let line = lineHolder[color];
  if (horizontal) {
    line.style.top = `${y}px`;
    line.style.height = "1px";
    line.style.bottom = `initial`;
    line.style.width = `initial`;
    line.style.left = 0;
    line.style.right = 0;
  } else {
    line.style.left = `${x}px`;
    line.style.right = "initial";
    line.style.height = `initial`;
    line.style.width = "1px";
    line.style.top = 0;
    line.style.bottom = 0;
  }
}

function unline(color) {
  if (color in lineHolder) {
    lineHolder[color].remove();
    delete lineHolder[color];
  }
}

export { dot, undot, line, unline };
