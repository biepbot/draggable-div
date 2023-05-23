import { dot } from "../debug/dot.mjs";

class HoverDivElement extends HTMLElement {
  static get observedAttributes() {
    return ["top", "left", "size"];
  }

  constructor() {
    super();
  }

  get color() {
    return this.getAttribute("color") || "fff";
  }

  isIntersecting(element) {
    // get location of element and check if within bounds
    const boundaries = this.getBoundingClientRect();
    const elementBoundaries = element.getBoundingClientRect();

    function isWithin(val, min, max) {
      return val >= min && val <= max;
    }

    // x must be between left and right
    if (
      !isWithin(elementBoundaries.left, boundaries.left, boundaries.right) &&
      !isWithin(elementBoundaries.right, boundaries.left, boundaries.right)
    )
      return false;

    // y must be between top and bottom
    if (
      !isWithin(elementBoundaries.top, boundaries.top, boundaries.bottom) &&
      !isWithin(elementBoundaries.bottom, boundaries.top, boundaries.bottom)
    )
      return false;
    return true;
  }

  setColorOnIntersect(element) {
    if (this.isIntersecting(element)) {
      element.style.background = this.color;
      return true;
    } else {
      element.style.background = null;
      return false;
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;

    switch (name) {
      case "left":
        this.style.left = `${newVal}px`;
        break;
      case "top":
        this.style.top = `${newVal}px`;
        break;
      case "size":
        this.style.width = `${newVal}px`;
        this.style.height = `${newVal}px`;
        break;
    }
  }
}

customElements.define("hover-div", HoverDivElement);
export default HoverDivElement;
