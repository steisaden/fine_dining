# Prompt archive

## Inferred brand brief

Esker is a fictional chef-led practice for seasonal tasting and private tables. Its promise is attentive composition rather than status. The commercial action is an availability inquiry; the response never implies confirmation.

## Visual philosophy

The service ledger meets the chef’s pass. Bone, steel, dark wine, and sorrel create a restrained material field. Upright display type describes thresholds; clean sans-serif carries hospitality; monospace records real measures and course indices. The plate remains the chromatic center.

## Token system

The authoritative color, typography, spacing, border, and motion tokens are in `public/css/tokens.css` and documented in `DESIGN.md`. Components do not introduce raw colors.

## Homepage chapter map

Footage inspection established five boundaries based on visible action:

- 0–17%: brushstroke/surface.
- 17–39%: tool gesture and sauce placement.
- 39–64%: central course and garnish resolve.
- 64–82%: plate rotation/presentation.
- 82–100%: still, finished course.

Runtime still comes from `loadedmetadata`.

## Architecture

Go owns full pages, fragments, conventional forms, validation, and an append-only mode-0600 inquiry store. HTMX enhances fragments and submission. Native JavaScript owns menu/focus/lifecycle and the scroll-video decoder queue. CSS owns responsive composition. The deployment adapter serves Go-generated pages, mirrors form endpoints, and writes accepted records through its required `INQUIRIES` binding. Both runtimes fail closed before showing success if persistence is unavailable.

## Accessibility

The build includes a skip link, landmarks, semantic controls, 44px targets, visible focus, modal-menu focus containment and return, error summary plus inline messages, status announcements, and equivalent reduced-motion document content.

## Responsive and reduced motion

Desktop keeps the film full-viewport. At 800px and below the film occupies the upper 56svh and chapter copy uses the lower solid field. Reduced motion disables the 550vh scrub and reveals a stable frame plus five normal-flow chapter summaries.

## Performance

The original master is preserved. It is requested only on `/`; `/prompt/` has no video element. A future production media pass should add smaller, bandwidth-aware delivery variants while retaining the original master.

## Impeccable influence

Impeccable established the committed service-ledger form, the first-viewport thesis, exact hierarchy and material tokens, asymmetric pacing, state completeness, responsive recomposition, contrast/focus requirements, and the refusal of centered hero copy, cards, generic fade-ups, glass panels, and unsupported proof.

## Setup

Run `go run ./cmd/server`, then open `http://localhost:8080`. Use `go test ./...`, `go vet ./...`, and `npm run build` for validation. The `/prompt/` route contains the functioning copy control and a link back to the experience.
