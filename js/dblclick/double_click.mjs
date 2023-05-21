/// time before a click is considered double click
const intervalTime = 300;

/// Pixel range before it is not considered the same
const clickRange = 10;

function addDoubleClickListener(element, fn) {
  let lastClicks = {};
  element.addEventListener("pointerdown", (evt) => {
    const last = lastClicks[evt.pointerId];
    if (last) {
      // Click of this pointer happened before and hasn't expired
      // Check if distance isn't too far away from last click

      const prevLoc = {
        x: last.evt.clientX,
        y: last.evt.clientY,
      };

      const newLoc = {
        x: evt.clientX,
        y: evt.clientY,
      };

      const distance = Math.sqrt(
        Math.pow(newLoc.x - prevLoc.x, 2) + Math.pow(newLoc.y - prevLoc.y, 2)
      );

      // Event must fire
      if (distance <= clickRange) {
        fn(evt);
        return;
      }
    }

    lastClicks[evt.pointerId] = {
      lastClickTimer: setTimeout(() => {
        delete lastClicks[evt.pointerId];
      }, intervalTime),
      evt,
    };
  });
}

export { addDoubleClickListener };
