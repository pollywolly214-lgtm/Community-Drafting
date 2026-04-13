# 3D Cylinder Scroll Rebuild Plan (Framer-style target)

## Objective
Deliver a premium, scroll-pinned, upright 3D cylinder section that feels close to the Framer reference while **never** showing a blank section.

## Current Gap Summary
- Visual language is still too flat (section shells/cards look static instead of cinematic).
- 3D reveal/emphasis is not yet commanding enough at first glance.
- Fallback is robust, but enhancement mode needs stronger “wow” factor and polish.

---

## Phase 0 — Guardrails (do first)
1. Keep fallback-first rendering so users always see content immediately.
2. Keep enhancement gated by runtime checks (deps, WebGL, dimensions, reduced motion).
3. Add a small in-page debug flag to toggle diagnostics quickly during tuning.

**Acceptance**
- No blank section under any failure mode.
- Console warnings explain failure reason.

---

## Phase 1 — Visual direction upgrade (non-3D shell)
1. Replace flat shells with cinematic backdrop layers:
   - radial light bloom behind cylinder area
   - subtle grain/noise overlay
   - stronger contrast hierarchy
2. Improve typography and spacing rhythm to match premium product sites.
3. Reduce static card prominence in enhanced mode so 3D becomes the hero.

**Acceptance**
- Even before interaction, section reads as premium and intentional.
- The page no longer feels like “cards in a container.”

---

## Phase 2 — Cylinder geometry and camera tuning
1. Increase panel count and tighten angular spacing for a continuous wrap feel.
2. Tune cylinder radius + camera FOV/Z + vertical framing for immediate depth.
3. Ensure one panel is front-facing on load (no edge-on first frame).
4. Add subtle vertical stagger/parallax to avoid a “flat ring” appearance.

**Acceptance**
- At first paint of enhanced mode, cylinder looks unmistakably 3D.
- Side/back panels are visible and naturally de-emphasized.

---

## Phase 3 — Material, lighting, and depth polish
1. Improve card materials:
   - slight roughness variance
   - controlled clearcoat/highlight
   - optional edge rim accent
2. Add a balanced 3-light setup + ambient fill.
3. Add optional soft shadow plane/fog for depth separation.

**Acceptance**
- Front panel reads crisp, side panels read dimensional, back panels recede smoothly.

---

## Phase 4 — Scroll choreography (Framer-like pacing)
1. Rework ScrollTrigger timing:
   - cleaner pin start/end
  - longer rotation travel without feeling slow
2. Map scroll progress to smooth rotational easing (still scrubbed, but refined).
3. Prevent abrupt jumps on refresh/resizes.

**Acceptance**
- Scroll feels controlled and premium, not mechanical.
- Reverse scrolling is stable and smooth.

---

## Phase 5 — Active state & content synchronization
1. Improve active panel detection (frontness metric + hysteresis).
2. Animate detail card updates with subtle transitions (opacity/y/blur).
3. Sync CTA/theme accents to active panel.

**Acceptance**
- Active content update feels intentional and never flickers.
- CTA always matches visible front-facing panel.

---

## Phase 6 — Responsive strategy
1. Desktop: full effect (largest radius/panel dimensions).
2. Tablet: reduced radius, simplified spacing, preserved pin interaction.
3. Mobile:
   - keep concept, but reduce panel count and travel distance
   - maintain readability/performance
4. Reduced motion: static fallback only.

**Acceptance**
- All breakpoints preserve clarity and usability.
- Mobile performance remains smooth on average hardware.

---

## Phase 7 — Reliability & performance hardening
1. Cap renderer pixel ratio.
2. Reuse vectors/objects in render loop to reduce GC churn.
3. Dispose geometries/materials/textures reliably on teardown.
4. Protect against library timeout and failed image loads.

**Acceptance**
- No memory leaks during repeated navigation/refresh.
- No console errors in normal flow.

---

## Phase 8 — Final QA checklist
- [ ] Section is never blank.
- [ ] Enhanced 3D mode clearly resembles Framer-style vertical cylinder behavior.
- [ ] Pin + scrub + reverse scroll all stable.
- [ ] Front panel emphasis is obvious and readable.
- [ ] Tablet/mobile/reduced-motion paths verified.
- [ ] Visual style matches premium modern direction.

---

## Implementation order (next execution pass)
1. Phase 1 + Phase 2 (biggest perceived change)
2. Phase 3 + Phase 4 (polish motion and depth)
3. Phase 5 + Phase 6 (content sync and responsive)
4. Phase 7 + Phase 8 (hardening and final QA)

## Estimated effort
- Core visual/motion rebuild: medium
- Reliability/performance hardening: medium
- Final QA pass: small-medium
