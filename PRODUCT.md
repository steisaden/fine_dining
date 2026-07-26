# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are prospective luxury-residential clients, interior-design collaborators, and studio decision makers evaluating what an interior designer's digital portfolio could become. They are expected to browse on desktop first, with a deliberately simplified but complete mobile experience.

## Product Purpose

The Gallery House is a demonstrator portfolio: a visitor scrolls through a real-time architectural exhibition in which interior photography is mounted, revealed, illuminated, and assembled as part of the space. Success means the visitor feels that they travelled through a coherent place, understands the quality and range of the work, and reaches a clear invitation to start a project.

## Positioning

Instead of presenting projects in a conventional grid or using video playback, the site turns deterministic page scroll into camera movement through a physically composed Three.js gallery. Architecture, light, photography, and camera direction form one portfolio system.

## Operating Context

- One continuous, desktop-first scroll journey with nine spatial chapters.
- Stock interior photography is demonstration content and is replaceable through one manifest.
- The final contact action is the commercial destination.
- The site is explicitly a demo for an interior-designer client, not a real design firm.

## Capabilities and Constraints

- No `<video>` element and no frame-scrubbed reference-video recreation.
- Vanilla Three.js, GSAP/ScrollTrigger, Lenis, Vite, semantic HTML, and modern CSS.
- Camera position and target use separate deterministic spline paths mapped to normalized scroll.
- Approximately 8–12 physical photography moments using a reusable reveal vocabulary.
- Multiple actual architectural turns, occlusion-led reveals, a fragmented assembly, and a final salon.
- Mobile, reduced-motion, non-WebGL, loading-error, and screen-reader fallbacks preserve the content.
- Performance targets: strong-desktop 60 FPS, capped device pixel ratio, bounded shadows and draw calls, compressed images, and no per-frame allocation churn.

## Brand Commitments

- Working concept name: The Gallery House.
- Voice: quiet, precise, editorial, architectural, and materially literate.
- Base materials: warm plaster, limestone, bone, shadow brown, charcoal, walnut, bronze, muted stone, warm white light.
- The visual world avoids neon, glassmorphism, sci-fi gloss, chrome-heavy futurism, videogame language, and generic WebGL spectacle.

## Evidence on Hand

The supplied build brief is the only authoritative content source. There are no real client projects, testimonials, metrics, logos, or licensed studio assets on hand. The prototype must not fabricate them. Project titles and locations are clearly fictional demonstration metadata, and all photography is credited stock imagery.

## Product Principles

1. The architecture is the interface.
2. Movement resolves into stillness.
3. Light directs attention; it does not decorate.
4. Every frozen viewport must read as an intentional architectural composition.
5. Demonstration content stays honest, replaceable, and accessible.

## Accessibility & Inclusion

The canvas is never the sole content source. A semantic Selected Work section exposes every project title, description, alt text, stock credit, CTA, and demo disclaimer. Keyboard focus is visible, reduced motion is respected, touch targets meet mobile sizing requirements, and WebGL failure produces a complete static fallback.
