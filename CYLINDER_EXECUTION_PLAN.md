# Cylinder Execution Plan (Immediate Fix)

## Goal
Make the 3D cylinder unmistakably visible and scroll-reactive right now.

## Plan
1. **Baseline visibility**
   - Add a real `THREE.CylinderGeometry` body mesh at the center so a cylinder is always visible.
   - Add a wireframe edge overlay for silhouette clarity.
2. **Panel ring support**
   - Keep rotating panel cards around the cylinder body for depth context.
3. **Scroll + momentum control**
   - Keep scroll-driven rotation and wheel momentum damping.
4. **Lighting pass**
   - Increase contrast with ambient + directional + point lights for obvious form.
5. **Validation**
   - Syntax check script and confirm no missing dependency guard regressions.

## Success Criteria
- A vertical 3D cylinder body is visible immediately on load.
- Scrolling rotates the cylinder smoothly.
- Mouse wheel introduces inertial momentum.
- Scene no longer appears like a flat/blank page.
