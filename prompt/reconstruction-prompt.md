# Esker — complete reconstruction prompt

Build a complete production-quality fine-dining chef website using semantic HTML5, HTMX 2.x, Go `net/http` and `html/template`, modern tokenized CSS, minimal native JavaScript, native HTML video, and GSAP/ScrollTrigger only for synchronized HTML choreography.

## Source film

- Original: `/Volumes/toshiba/downloads/website_videos/fine_dining_60fps.mp4`
- Browser: `/media/fine_dining_60fps.mp4`
- MP4; H.264; 1920×1080; 60fps; yuv420p; AAC; 10.026667 seconds; 60,140,193 bytes.
- Public-copy SHA-256: `abb2293aecad9e0f58a325ac28e0b09bc8c2afbda1c91673c408e2fce8842808`.
- Preserve the original byte-for-byte. Copy once to `public/media/`.
- Use one muted, playsinline, preloaded, picture-in-picture-disabled decorative `<video>`.
- Principal playback is page-scroll controlled. Read runtime from `loadedmetadata`.

## Brand and direction

Create a fictional chef brand called Esker. It offers seasonal tasting, intimate private dining, chef’s-table evenings, bespoke celebrations, culinary collaborations/residencies, and availability inquiries. Do not fabricate awards, Michelin recognition, press, testimonials, prices, years, counts, or confirmation.

Creative direction: **THE FINAL MILLIMETER**. The film is the physical world of the website. Interface marks feel derived from sauce lines, porcelain, blackened steel, linen, oxidized silver, dark wine, and sorrel. The result is precise, intimate, sensory, quietly theatrical, editorial, and usable. Avoid black-and-gold luxury, centered hero copy, glass panels, repeated cards, fake proof, ornamental excess, generic gradients, carousels, and oversized booking controls.

Use exact design tokens. Pair an upright editorial display face with restrained text and true measurement monospace. All interactive elements are real links, buttons, or form controls.

Core tokens: bone `#f0ece2`; linen `#d8d1c3`; charcoal `#171815`; steel `#383b37`; silver `#a9ada4`; wine `#651f2a`; sorrel `#66724b`; ink `#0e100e`; error text `#8b1223`; error field `#fff8f5`; error surface `#f7e1df`. Display stack: `"Bodoni 72", "Didot", "Iowan Old Style", serif`. Text stack: `"Avenir Next", "Avenir", "Helvetica Neue", Arial, sans-serif`. Measurement stack: `"SFMono-Regular", "Cascadia Mono", "Consolas", monospace`. Spacing follows a 4px-derived scale from `.25rem` through `9rem`; motion durations are 160ms, 520ms, and 900ms with `cubic-bezier(.22,1,.36,1)`.

## Routes

Server render:

- `GET /`
- `GET /menu`
- `GET /private-dining`
- `GET /journal`
- `GET /reservations`
- `GET /prompt/`

HTMX:

- `GET /fragments/menu/:course`
- `GET /fragments/private-dining/:service`
- `GET /fragments/reservation-form`
- `POST /inquiries/reservation`
- `POST /inquiries/private-dining`
- `POST /newsletter`

Navigation uses real URLs. Essential information and conventional POST submissions work without JavaScript. HTMX owns partial requests and swaps; GSAP or CSS owns visual choreography; native modules own menu/focus/video state.

## Homepage structure

Build an editorial progression: Threshold → Composition → The Menu → At Your Table → The Chef’s Practice → Service and Inquiry → Colophon. Desktop scroll sequence is about 550vh with a fixed full-viewport film. After the film resolves, enter quieter document flow.

Use these footage-derived chapters:

1. Surface, 0–17%: sauce brushstroke; restrained mark and opening statement.
2. Gesture, 17–39%: plating tool and sauce placement; ingredient annotation and a fine rule.
3. Composition, 39–64%: central pastry/protein and garnish resolve; course number, ingredient hierarchy, menu link.
4. At your table, 64–82%: plate rotation and handoff; private dining language and link.
5. Finished course, 82–100%: calm overhead plate; availability language and discreet real links.

All text stays HTML. Keep the central food and hands clear. Motion is deterministic and reversible.

## ScrollVideo engine

Map normalized scroll progress to `video.currentTime = progress × loaded video.duration`. Keep target and rendered time separate. Use one RAF, frame-rate-independent exponential damping, a minimum seek threshold, safe clamping, and only the newest queued target while the decoder seeks. Flush only a non-stale target after `seeked`. Pause while the document is hidden and resume safely. Recalculate geometry on meaningful viewport/content changes, never refresh ScrollTrigger during scrolling, and provide cleanup safe for repeated HTMX swaps.

Centralize lifecycle handling for `htmx:beforeSwap`, `htmx:afterSwap`, `htmx:historyRestore`, and `htmx:beforeCleanupElement`. Destroy associated RAFs, observers, listeners, focus traps, GSAP contexts, and triggers before replacement; initialize only the new region after.

## Menu and private dining

The menu is an editorial course index with course numbers, dish names, primary ingredients, dietary markers, seasonal language, and accessible HTMX-loaded preparation notes. Selected, loading, error, and focus states are explicit. Do not use a mobile carousel or invent prices.

Private dining explains intimate dinners, chef’s-table evenings, celebrations, collaborations, menu development, dietary/access needs, and before/during/after service through an asymmetric editorial layout and HTMX detail reveals.

## Forms

Collect name, email, optional telephone, preferred/alternate dates, guest count, service type, location, dietary requirements, accessibility requirements, occasion notes, message, and consent. Provide visible labels, descriptions, server validation, inline errors, error summary, retained input, loading/disabled states, focus-managed swaps, honeypot and elapsed-time mitigation, and a real received response. Persist validated records before returning success; if the durable sink is unavailable, retain the entries and fail closed. Never claim confirmation; state that the request is subject to availability.

## Responsive, accessibility, and performance

Desktop uses full-viewport cover video and negative-space annotations. Tablet reduces density. Mobile deliberately crops the film to 56svh and moves copy into a solid adjacent region; test 320, 375, 414, 768, 1024, and 1440px with no overflow and 44×44 minimum targets.

Respect reduced motion: no scrubbing or decorative transforms; seek a stable representative frame and expose all five chapters in document flow. Include landmarks, skip link, logical headings, keyboard menu with Escape/focus return/background blocking, visible focus, sufficient contrast, accessible error/status messages, correct ARIA states, and no animation-only information.

The roughly 60 MB master is a performance constraint: load it only on the homepage; no duplicate decoders; reserve space; initialize after metadata; keep scripts modular; cache static assets; never load video on `/prompt/`. Document the future need for web-optimized variants without altering the master.

## Validation

Run the Impeccable pre-emit critique and detector. Format and vet Go. Build successfully. Verify all full routes, fragment routes, HTMX and conventional form validation/success, browser history, cleanup, reverse seeking, reduced motion, keyboard focus, target viewport widths, no overflow, no console errors, exact media checksum, no prompt-page video request, no fabricated claims, and coherent authorship across every page.
