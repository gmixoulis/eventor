---
name: maplibre-venue-maps
description: Use when a MapLibre map opens wrong, a Map tab crashes, or venue outlines draw wrong.
category: maps
---

Venue maps must open on the venue area and must never crash a tab. Set the first view in the map constructor, and gate every native map on its token with a list fallback.

## WebView MapLibre: first view
- Pass the center and zoom (or bounds) into the constructor. Never rely on `fitBounds` or `jumpTo` called right after creation: the style applies its own world view when it loads and overwrites the earlier call.
- Add venue pins after the style loads, then confirm both pins fall inside the first view.
- Verify the generated page in Chromium on localhost by reading the screenshot and the console errors. The CSP must allow the tile, style, and worker hosts the page uses.
- A CDN-loaded script or stylesheet needs an SRI hash computed from the file the publisher serves, compared with the publisher's published value.
- Test the constructor call with `expect.objectContaining` on the fields that matter. An exact match fails when the code adds defaults.
- Editing the inline WebView script changes its bytes: recompute the SHA-256 (base64 of the exact script string) into the CSP constant, or the SRI/CSP hash test fails.
- Adding a field to the page data (for example `overlay: null`) breaks any test that `toEqual`s the whole data object. Update that expectation in the same change.
- Adding an import from a module (for example `getEventSlug` from `tenant-assets`) breaks every `jest.mock` factory of that module that lacks the export, with `is not a function`. Grep `__tests__/` for `jest.mock("<module>"` and add the new export to each mock that renders the component.
- Festival-only map layers are gated by event slug in the component; other event builds keep plain pins.
- A browser pass is not a device pass. The in-app WebView map stays unchecked until it runs on a phone or emulator.
- Reference: builds 0.3.1 and 0.3.2 opened on the whole world; 0.3.3 fixed it by moving the view into the constructor.

## Venue outlines from OpenStreetMap
- A venue is often several closed ways, not one ring. Build a MultiPolygon from every closed way that makes up the venue; a single ring draws the wrong outline. Agora Modiano was three separate blocks.
- A venue may carry no building tag, or be tagged as a market, so a name search can return nothing. Query footprints in a small box around the venue's coordinates and keep the ones that contain the point.
- Check the outline on the map in the first view, not only in the generated JSON.

## Native map without a token
- Gate every native map view on its token. With no token, render a plain venue list with an "Open in Maps" action per venue, so the tab still works.
- The crash happens at mount: the map SDK throws without an access token, which fails the whole screen even though the app launched fine.
- Decide the branch once, from the build flag, not per screen.
- Venue rows use only the name and coordinates the venues endpoint returns. Show nothing for a missing value; never invent one.
- Cover the fallback with a jest test in `__tests__/`.
- Verify on a device by tapping the Map tab, not by launching the app.
- A real map needs the token supplied through the build environment. Without it, the list is the correct state, not a bug.
