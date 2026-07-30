---
name: Esker
description: A precise editorial service ledger shaped by the last gestures of plating.
colors:
  bone: "#F0ECE2"
  linen: "#D8D1C3"
  charcoal: "#171815"
  steel: "#383B37"
  silver: "#A9ADA4"
  wine: "#651F2A"
  sorrel: "#66724B"
  ink: "#0E100E"
  error-text: "#8B1223"
  error-field: "#FFF8F5"
  error-surface: "#F7E1DF"
typography:
  display: "Bodoni 72, Didot, serif"
  text: "Avenir Next, Avenir, Helvetica Neue, sans-serif"
  measure: "SFMono-Regular, Consolas, monospace"
shape:
  square: "0"
  soft: "2px"
motion:
  quick: "160ms"
  measured: "520ms"
  long: "900ms"
---

# Design System: Esker — The Final Millimeter

## Direction contract

**THESIS:** The last millimeter of plating becomes the navigation and reading system; the familiar centered restaurant hero is refused.
**OWN-WORLD:** Bone porcelain fields, blackened steel, dark wine, sorrel green, oxidized rules, square controls, ledger indices, and upright display type.
**STORY:** Watch composition resolve, understand a season-led practice, inspect courses and services, then send an availability inquiry.
**FIRST VIEWPORT:** Film fills the frame; a narrow wordmark and chapter ledger sit at the perimeter; the opening sentence occupies upper-right negative space, clear of the brush and sauce line.
**FORM:** A chef’s pass/service ledger, first choice from the brief’s pinned world; no stochastic staging was used because the user supplied a complete direction and prohibited follow-up questions.

## Visual philosophy

“The Final Millimeter” treats interface marks as the controlled residue of service: a rule drawn like sauce, a number aligned like a docket, a chapter change that settles like linen. Luxury comes from composition, accuracy, and restraint rather than gold, gloss, or ornament.

## Typography

Bodoni 72/Didot is used upright and sparingly for threshold statements. Avenir Next carries reading and controls. System monospace is reserved for actual measures, temperatures, course numbers, and service annotations. Display type never becomes italic, tracked-out, or decorative wallpaper.

## Layout and materials

The cinematic sequence is 550vh on desktop. Annotations occupy genuine negative space and avoid the center of the plate. Below it, an asymmetric document grid shifts between wide copy, narrow service notes, and ruled indexes. Mobile relocates narrative copy below a 56svh film stage when the crop would obscure hands or food.

## Accessibility and responsive rules

Body contrast meets 4.5:1. All controls have visible labels and focus rings; mobile targets are at least 44px. The menu is a controlled modal navigation with Escape and focus return. At 768px and below, annotation density drops and document order becomes linear. Reduced motion disables scrubbing and exposes all five chapters in normal flow beside a stable poster frame.

## Motion and performance

Motion is deterministic and reversible. One damped RAF owns video seeking; GSAP only sequences HTML annotations. No smooth-scroll hijack, perpetual motion, generic fade-up cascade, or decorative blur. The master is loaded only on the homepage, never duplicated, and never loaded by `/prompt/`. A later delivery pass should add web-optimized variants without altering the supplied master.

Validation uses a dedicated wine-derived error ramp: `#8B1223` text, `#FFF8F5` invalid field, and `#F7E1DF` summary surface. Film text shadows use the ink token at 40% opacity.

## Anti-patterns deliberately avoided

No centered headline over darkened film, black-and-gold palette, repeated service cards, fake proof, glass panels, horizontal carousels, rounded-rectangle sprawl, oversized persistent booking control, or generic restaurant footer.
