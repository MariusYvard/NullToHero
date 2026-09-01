---
name: three
description: "Measure a live three.js scene's real cost from the page, instead of inferring it from source text."
version: 1.0.0
---

# Measuring a three.js scene

`L-WEBGL-1` (a few hundred draw calls, 1000 ceiling) and `L-WEBGL-2` (pixel ratio
capped at 2) were written as laws and had no executor. They lived in
[overdrive.md](../../siteasy/references/overdrive.md) as prose, which is the same
as not having them. `tools/inspect/three.mjs` measures both, plus the colour-space
defect that is the most common visible fault on a three.js page.

## Why this is measurable at all

three.js hands out everything the probe needs, without the site doing anything.

| Mechanism | What it gives |
|---|---|
| `canvas[data-engine="three.js r186"]`, set in the renderer constructor | presence, exact revision, and `webgpu` when that is the backend |
| a dispatch to `window.__THREE_DEVTOOLS__` at the end of that constructor | a live reference to every renderer instance |
| `renderer.info` | draw calls, geometry and texture counts, compiled program count |

The second one is the whole reason this file exists, and it has one condition: the
global must be an `EventTarget` **before** the page's three.js module evaluates.
Installed afterwards it receives nothing, and the probe then reports
`installed: false` and says cost was not measured, rather than returning a short
list of findings that would read as a light scene.

## Running it

Playwright, where the init script is a first-class feature:

```bash
node tools/inspect/three.mjs https://example.com --json
```

a connected browser, where it is two steps and a reload:

```bash
node tools/inspect/three.mjs --install   # paste, then reload the page
node tools/inspect/three.mjs --source    # paste once the scene has settled
```

Getting the order wrong is not silent. The result carries `installed`, and the
report says which findings were and were not possible.

## Three traps in renderer.info, all silent

**`memory` counts objects, never bytes.** Forty 64px icons and four 4096px albedo
maps read as 40 against 4, while the byte truth is the other way round. The probe
reports the counts as context and never gates on them.

**`autoReset` is true by default and resets at the start of `render()`.** A
post-hoc read of `render.calls` on a page with a post-processing chain reports the
last pass only. The probe turns it off, lets two frames go by, divides by the
frames it saw, and puts it back. This is why the probe is async and why its
fixture runs a render loop rather than setting a static number.

**On WebGPU, `render.calls` is cumulative since start.** Per-frame draws are
`render.drawCalls`. Reading `.calls` there gives a figure that only ever grows,
and a page audited that way looks worse the longer you leave it open.

## What it decides

| Rule | What it measures |
|---|---|
| 79 | Pixel ratio against the cap, and more than one live renderer on the page |
| 80 | Draw calls per frame against the target and the ceiling, and how many meshes share one geometry and one material |
| 81 | Colour maps with no colour space, data maps wrongly tagged sRGB, and a revision older than r152 |

Rule 80's second half is the difference between a threshold and an action. Saying
1400 is over 1000 tells the reader a number is too big. Saying 400 of the 402
meshes share one geometry and one material tells them the group is one
`InstancedMesh` away from a single call.

Rule 81 exempts nothing automatically, but the defect is almost entirely in
hand-loaded textures: `GLTFLoader` assigns `SRGBColorSpace` to base-colour,
sheen-colour and specular-colour maps and leaves normal, roughness, metalness and
occlusion linear, so a glTF-only scene is usually correct by construction.

## What it deliberately does not do

**No leak detection.** A leak is `memory.geometries` climbing across repeated
mount and unmount cycles without a plateau, which needs a driver and N cycles, not
one probe pass. `renderer.dispose()` frees renderer caches and no geometry,
texture or material memory at all, so the leak is common and worth chasing by
hand with the numbers this probe prints.

**No triangle threshold.** It is the figure everyone quotes and the one that
correlates least with jank on a real page. A 500k-triangle model in one draw is
routinely faster than 2000 cubes.

**No advice to move to WebGPU.** three.js's own guidance still names
`WebGLRenderer` the default for compatibility, and `WebGPURenderer` throws if
`init()` was not awaited. The probe handles both and recommends neither.

**No scene when the page does not expose one.** The material and instancing checks
need a reachable `Scene`. When none is found the probe says which checks did not
run instead of reporting them clean.

## CROSS-SKILL REFERENCES

| Need | Reference |
|---|---|
| The budgets and the render-on-demand doctrine behind the numbers | [overdrive.md](../../siteasy/references/overdrive.md) |
| The other seven rules that need a laid-out page | [rendered.md](rendered.md) |
| Where a finding routes for a fix | `tools/data/remediation-map.csv` |
