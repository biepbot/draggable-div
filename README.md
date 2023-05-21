# draggable-div

A div that knows how to drag! Example styling included.

## How to use

Embed the script in your page as a module:

```html
<script type="module" src="./js/draggable_div.mjs"></script>
<script type="module" src="./js/free_draggable_div.mjs"></script>
```

This will register itself in the custom component registy, meaning you can then on your page refer to the new tag name `draggable-div`.

There is a similar set up for `free-draggable-div`, which does not rely on elements to drag into.

### How does it work?

Positioning relies purely on CSS rules. Setting positioning might conflict.

### Demo

Working page: https://biepbot.github.io/draggable-div/

### Additional resources

- ContextMenuBuilder (page to be set up)
- DoubleClick polyfill
