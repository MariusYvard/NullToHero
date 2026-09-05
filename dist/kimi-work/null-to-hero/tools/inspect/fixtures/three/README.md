# three.js probe fixtures

These pages do not import three.js. They reproduce the three parts of its
contract the probe actually reads, and nothing else:

1. `canvas[data-engine="three.js r186"]`, set by the WebGLRenderer constructor.
2. A dispatch of an `observe` CustomEvent carrying the renderer to
   `window.__THREE_DEVTOOLS__`, which is the last thing that constructor does.
3. A `renderer.info` shaped like `WebGLInfo`: `{ memory: {geometries, textures},
   render: {frame, calls, triangles}, programs, autoReset, reset() }`, with
   `reset()` clearing the render counters and never touching `memory`.

Pinning the real library would test three.js. What needs testing is whether the
probe reads that contract correctly, including the two traps it exists to handle:
`autoReset` clearing the counter at the start of every render, and the pixel
ratio living on the renderer rather than in `info`.
