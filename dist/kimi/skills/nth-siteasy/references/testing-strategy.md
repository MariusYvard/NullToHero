---
name: testing-strategy
description: "Test posture for a shipped front-end: unit, end-to-end, visual regression, cross-browser, accessibility and contract testing."
version: 1.22.0
---

# Testing strategy

An audit reads the page as it is now. Tests keep it correct as it changes. A front-end with no test posture regresses silently on the next deploy. Cover these layers in proportion to risk.

## Unit and component

Test pure logic and component states in isolation: formatting, validation, reducers, and the empty, loading and error states of a component. Fast, run on every commit.

## End-to-end

Drive the real critical paths in a real browser (signup, checkout, search) with a tool such as Playwright or Cypress. Keep the set small and stable, aimed at the flows that lose money when they break.

## Visual regression

Snapshot key screens and diff them on each change so an unintended layout or colour shift is caught before release. Pin the viewport and mask volatile regions (dates, avatars) to avoid noise.

## Cross-browser and device

Verify the layout and interactions on the browser and device mix your analytics show, not just the one on the developer machine. Safari, Chrome, Firefox and one real mobile is a sensible floor.

## Accessibility testing

Run an automated axe pass in CI to catch the machine-detectable half (contrast, names, roles), then keyboard-only and screen-reader spot checks for the half a machine cannot judge.

## Contract testing

When the front-end depends on an API, assert the response shape it relies on so a backend change that drops or renames a field fails a test rather than the live page.

## What to automate first

Start with the paths whose failure is most expensive, add a visual snapshot of the landing page and a11y in CI, then grow coverage toward the flakiest areas.
