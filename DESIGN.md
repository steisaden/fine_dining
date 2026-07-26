---
name: The Gallery House
description: A scroll-driven architectural exhibition for an interior-design portfolio.
colors:
  warm-plaster: "#E8E1D7"
  soft-limestone: "#D3C7B8"
  bone: "#F1ECE5"
  shadow-brown: "#29241F"
  architectural-charcoal: "#171716"
  walnut: "#372B23"
  bronze: "#75614D"
  muted-stone: "#A89D90"
  warm-light: "#FFF1DC"
typography:
  display:
    fontFamily: "Bodoni Moda, Didot, serif"
    fontSize: "clamp(2.8rem, 5vw + 0.8rem, 5.25rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  none: "0"
  soft: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "32px"
  xl: "64px"
components:
  cta-primary:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.architectural-charcoal}"
    rounded: "{rounded.none}"
    padding: "16px 24px"
  cta-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    rounded: "{rounded.none}"
    padding: "12px 0"
---

# Design System: The Gallery House

## Overview

**Creative North Star: "The Gallery House"**

The website behaves like a private architectural exhibition after hours: spatially quiet, materially warm, and composed through alternating compression and release. The interface recedes so limestone openings, controlled pools of light, and physically mounted photography carry the narrative.

The system rejects conventional web-section rhythm. Its durable language is monolithic geometry, edge-aligned editorial type, architectural occlusion, and camera movement that always resolves into a stable view.

**Key Characteristics:**

- restrained warm-mineral palette with darkness that retains material detail;
- full-viewport photographic compositions with small museum-like annotations;
- one continuous spatial route with real corners, thresholds, and ceiling changes;
- near-zero decorative interface chrome;
- weighted motion with no bounce, wobble, particles, or novelty rotation.

## Colors

Warm mineral neutrals carry almost the entire world; bronze is a rare material accent, while photography supplies natural chroma.

- **Warm Plaster** (`#E8E1D7`): dominant wall and ceiling family.
- **Soft Limestone** (`#D3C7B8`): structural planes and portals.
- **Bone** (`#F1ECE5`): highest-value text and lit plaster, never pure white.
- **Shadow Brown** (`#29241F`): warm recesses and dark transitions.
- **Architectural Charcoal** (`#171716`): deepest field, never pure black.
- **Walnut** (`#372B23`): compression-corridor material.
- **Bronze** (`#75614D`): sparse trim and illuminated control detail.
- **Muted Stone** (`#A89D90`): secondary type and lower-contrast planes.
- **Warm Light** (`#FFF1DC`): emissive architectural light.

**The Photography Rule.** Interface accents stay below five percent of the viewport. The work, not UI color, is the chromatic event.

## Typography

**Display Font:** Bodoni Moda (with Didot fallback)  
**Body Font:** Hanken Grotesk  

The pairing echoes high-end interiors publishing without leaning on italicized luxury clichés. Display type is upright, sharply contrasted, and used only at arrival and invitation. Metadata is quiet, tracked, and sans-serif.

- **Display** (400, `clamp(2.8rem, 6vw, 5.25rem)`, 0.98): opening and final statements only.
- **Headline** (400, `clamp(2rem, 3.8vw, 3.8rem)`, 1.04): accessible fallback section titles.
- **Body** (400, `1rem`, 1.55): explanatory and fallback content, max 68ch.
- **Label** (500, `0.6875rem`, `0.14em`, uppercase): project metadata and chapter indicator.

**The Two-Register Rule.** Upright serif speaks only at key emotional thresholds; restrained grotesk handles every navigational or informational role.

## Layout

The primary layout is a fixed full-viewport WebGL scene driven by a long semantic scroll document. DOM content is limited to an edge-aligned wordmark, chapter/progress rail, momentary project captions, arrival copy, final invitation, and an accessible Selected Work fallback.

Desktop camera compositions preserve a three-depth structure: foreground threshold, midground artwork, background destination. Mobile retains the same spatial story with a shorter scroll document, a capped device-pixel ratio, a wider portrait view, simplified shadows, and the same linear project archive rather than attempting to shrink a desktop page layout.

## Elevation & Depth

Depth is physical. Geometry occludes geometry, artwork casts restrained shadows, wall recesses create contact, and lighting changes by room. DOM shadows are avoided. Bloom and vignette, if present, remain barely visible and never replace lighting design.

**The Still-Frame Rule.** Every major scroll position must remain visually intentional when motion stops.

## Shapes

Architecture is rectilinear with one controlled curved turn. Corners are square or nearly square; portals, recesses, slabs, reveals, and hairline bronze trims replace rounded cards or pills. Photographs may be framed, edge-to-edge, suspended, segmented, or partially occluded, but never presented as repeating UI cards.

## Components

### Navigation

An N9 edge-aligned minimal pattern: wordmark hard-left, one quiet destination hard-right, with no central link cluster. It remains legible over light and dark chapters through controlled color modes.

### Project Metadata

Small uppercase grotesk, stacked title and location/year, revealed only near the associated work. No glass panel or pill container.

### Calls to Action

The primary action is a square-edged high-contrast text block that settles into the final salon. The secondary action is a typographic link with a single underline. Hover and active motion is limited to one-to-two-pixel translation or line growth; focus appears instantly.

### Progress

A narrow chapter rail exposes current chapter and normalized progress without behaving like conventional navigation. It is informational, non-interactive, and hidden or simplified on small screens.

## Do's and Don'ts

### Do:

- **Do** use walls, openings, corners, and light spill as transition devices.
- **Do** let future rooms remain partially concealed.
- **Do** use real three-dimensional parallax and occlusion where possible.
- **Do** keep motion damped, deterministic, and resolute.
- **Do** keep all stock imagery replaceable through one manifest.

### Don't:

- **Don't** use video, carousel, grid-portfolio, or SaaS-section conventions.
- **Don't** use neon, chrome-heavy reflections, glassmorphism, particles, lens-flare spectacle, or glowing orbs.
- **Don't** spin, bounce, wobble, or perpetually float artwork.
- **Don't** illuminate the whole building evenly.
- **Don't** let the canvas become the only accessible source of project information.
