---
name: data-viz
description: "Accessible data visualization. Choosing a chart type, the accessibility grade of each common type, the mandatory non-color fallback (data table, direct labels, patterns), and render thresholds by data volume."
version: 1.16.0
---

# Data Visualization

A chart is an interface, not decoration. It must be readable by someone who cannot tell red from green, someone using a screen reader, and someone on a slow connection. Pick the encoding that survives all three, then add the fallback the encoding needs.

## Core rule: never encode by color alone

WCAG 1.4.1 applies to charts. A series distinguished only by hue is invisible to roughly 1 in 12 men. Every series must carry a second cue: a direct label on the line or slice, a shape or pattern, or a position. Color is the redundant cue, never the only one.

Non-text chart elements (bars, lines, points, axis rules) hold meaning, so they fall under WCAG 1.4.11 and need 3:1 contrast against their background and against each other.

## Chart accessibility grades

Grade is the chart's baseline accessibility, A best to D worst. The fallback column is not optional for low grades: it is the second representation that makes the data reachable.

| Chart | Best for | Grade | Mandatory fallback |
|---|---|---|---|
| Bar (vertical or horizontal) | Comparing discrete categories | AAA | Value labels on each bar |
| Bullet | A single value against a target and ranges | AAA | Values and thresholds shown as text, not color bands |
| KPI / big number | One headline figure | AAA | None; it is already text |
| Grouped or stacked bar | Part-to-whole across categories | AA | Legend plus patterns; data table for exact values |
| Line | Trend over a continuous axis | AA | Direct-label each series at its end, not a legend alone |
| Area | Cumulative trend, one or two series | A | Limit overlap; provide a data table |
| Gauge | One bounded value | B | The value printed as text beside the dial |
| Scatter | Correlation between two variables | B | Dual-encode (shape plus color); summarize the trend in text |
| Sparkline | An inline trend, decorative | B | Always pair with the current value as text |
| Bubble | Three variables (x, y, size) | C | Label key points; size is hard to read precisely |
| Pie | Part-to-whole, five slices or fewer | C | Stacked bar alternative plus a percentage table |
| Donut | Same as pie, with a center KPI | C | Center value as text; same table fallback as pie |
| Heatmap | Density across two dimensions | C | Numeric value in each cell; a sortable table |
| Choropleth map | A metric across regions | C | Ranked data table (color and area both mislead) |
| Treemap | Hierarchical part-to-whole | C | Data table; area is read imprecisely |
| Radar | A profile across many axes | C | Data table; overlapping polygons are hard to read |
| Network graph | Relationships between nodes | D | Never the sole representation; provide a relationship table |

Read the grades as a default, not a ban. A pie with four well-labeled slices and a table is fine. A pie with eleven slices is unreadable at any grade.

## Render thresholds by data volume

Past a point, the rendering technology, not the chart type, decides whether the page stays responsive. Choose by point count.

- Under 1000 points: SVG. Every element is in the DOM, so it is inspectable, stylable and individually labelable.
- 1000 to 10000 points: Canvas, with downsampling for the line or area case (largest-triangle-three-buckets keeps the visual shape with a fraction of the points).
- Over 10000 points: aggregate before drawing. Bin to intervals, or move the aggregation server-side and send summaries. Plotting 50000 raw points is a layout and memory cost the user pays for nothing they can perceive.

A dense scatter that must show every point is the exception: use Canvas or WebGL and provide a binned heatmap as the readable summary.

## Animated and streaming charts

Motion in a chart is a WCAG 2.2.2 concern when it updates on its own.

- A live or streaming chart needs a visible pause and resume control.
- The current value must appear as large text (a KPI), so the reading does not depend on catching the animation at the right moment.
- Under `prefers-reduced-motion: reduce`, freeze the animation and show the latest state. Do not merely slow it.
- Transitions between states should be ease-out and under 300ms, the same ceiling as the rest of the interface. A 2 second morphing pie is a distraction, not an insight.

## Text alternative

Every chart needs a programmatic alternative, not just a visual one.

- Give the chart an accessible name and a short description (`aria-label` or a `<figure>` with `<figcaption>`).
- Provide the underlying numbers as a real table, either always visible or behind a clearly labeled toggle. A table is the most accessible chart that exists.
- Title, axis labels and units are mandatory. A number without a unit is a guess.
- A strong chart alt text names four things: the chart type, the data, why the chart is here, and where the underlying source lives ([Amy Cesal's formula](https://medium.com/nightingale/writing-alt-text-for-data-visualization-2a218ef43f81)).

## Narrative charts

Rules for charts that carry a story (posts, reports, scrollytelling steps):

- The title states the message, not the variables. "Agreement rose sharply during 2024" beats "Survey agreement, 2020-2025" for comprehension and recall; keep the variable phrasing for the axis labels.
- Direct-label series at the line's end instead of a detached legend whenever the series are few; the legend round-trip is a tax on every read.
- Against spaghetti lines, prefer small multiples with the other series kept as grey context in each panel: one panel, one highlighted series.
- One highlight color, used only to point. When several series need their own hue, use a colorblind-safe palette (Okabe-Ito) and check the chart in greyscale: default palettes of equal luminance become indistinguishable once desaturated.
- In a scrollytelling step the chart transformation IS the narration: one change per step, announced by the step text. See [parallax.md](parallax.md), Scrollytelling Architecture.

## Auditing a chart

Run this pass on any chart in the build:

1. Remove color. Is every series still distinguishable by label, shape or position? If not, the encoding is color-only and fails.
2. Find the data table. If there is none, add one.
3. Check the grade. If it is C or D, confirm the mandatory fallback is present and reachable, or change the chart type.
4. Check non-text contrast. Bars, lines and points need 3:1 against the background.
5. Check units and titles. Each axis labeled, each value carrying its unit.
6. If it moves, check for a pause control and a reduced-motion path.

A chart that passes this pass is usually a bar chart with labels and a table. That is not a failure of imagination. It is the most common right answer.

For sites to source this from at build time, see [resource-recommendations.md](resource-recommendations.md).
