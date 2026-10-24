# ezytrip visual direction

## Reference synthesis — Basecamp × LottieFiles × Figma Trip Planner (2026-10-24)

- Keep the Basecamp clarity and LottieFiles friendliness already described below, then use the selected Figma mobile Trip Planner frame (`e4XCgnL83tw2OlHvpf2fQ4`, node `5:2`) for the mobile screen order: day selector, map, then a grouped daily itinerary.
- Use a warm off-white canvas, white itinerary surface, dark readable text, muted gray-green supporting copy, teal for route/navigation controls, rust for small emphasis, and lavender for a short helper note. Keep ezytrip's yellow and purple character in selected controls and supporting details.
- Keep the map interactive and data-honest. The Figma schematic is a layout reference only; preserve MapLibre, map attribution, route mode choices, bus/rail labels, and explicit approximate-route labels from the existing product behavior.
- Ensure the day selector scrolls horizontally on small phones, the map remains prominent, and itinerary actions remain reachable with touch-sized controls.

## Reference synthesis — Basecamp × LottieFiles (2026-10-23)

- **Use the references as supporting principles, not replacement brands.** Keep ezytrip's established Ponpon Mania inspired palette, mobile-first trip-planning hierarchy, and map-led daily plan as the product identity.
- From **Basecamp**, borrow clear typographic hierarchy, confident high-contrast accents, and a readable feature-by-feature narrative. Use a composed lead panel with a clear action; avoid reproducing its marketing artwork, colors, or page layout.
- From **LottieFiles**, borrow airy spacing, friendly rounded details, and small purposeful moments of motion. Keep the interface calm enough for planning; avoid neon overload, decorative animation clutter, and oversized marketing typography.
- **Combined tone:** lively and optimistic, with calm utility underneath. Let one expressive visual lead each view; group related controls clearly and keep supporting content quieter.
- **Color application:** retain the existing yellow-orange, purple, and deep-orange roles. Use light neutral/white surfaces and restrained muted fills to make the bright colors legible. Do not import either reference's palette as ezytrip tokens.
- **Typography:** retain the system Thai font stack and existing scale. Use a strong but compact heading, readable body copy, and concise control labels; do not add remote fonts.
- **Shape and spacing:** retain the purposeful `0`, `30px`, and `42px` corner roles and 4/8/16 rhythm. Use softer rounding selectively on supportive controls or illustrations, without rounding every container.
- **Motion:** use brief, optional transitions only to clarify selection, feedback, or map-pin focus. Respect reduced-motion settings and keep all core interactions understandable without animation.
- **Homepage and planner:** the trip and daily plan stay primary; the illustrative map remains prominent and explicitly labeled as a demo; stays remain a secondary shortcut. Use Basecamp-like clarity to expose the next useful action, and LottieFiles-like lightness in small details.
- **Adapt, don't copy:** no copied artwork, characters, layouts, distinctive brand marks, or unlicensed assets from either reference.

## Point of view

- **Reference:** Ponpon Mania interactive comic design system.
- **Use as inspiration only:** adapt the playful rhythm and expressive composition; do not copy its artwork, characters, layouts, or assets.
- **Personality:** playful, energetic, expressive, and maximal, while remaining easy to use on a phone.
- **Surface mode:** Operate. Visual expression must support quick trip-planning decisions and readable controls.

## Composition

- Use a mobile-first Bento Grid with panel sizes and silhouettes reflecting priority, not a uniform dashboard of equal cards.
- The current trip and daily plan are the homepage's primary panels. Keep the map and day-by-day itinerary visually dominant in Trip Planner.
- Make the map the visual focus, followed by a compact, editable activity list.
- Keep stays optional: show them only as a small secondary shortcut on the homepage and navigation.

## Visual system

- Reference colors: `#FBAC15` yellow-orange for primary emphasis; `#7C7CFB` purple for supporting surfaces; `#CA5E15` deep orange for accents; `#A98663` brown for secondary elements; `#A8ACA1` muted.
- Pair bright surfaces with dark, readable text. Use muted colors for quiet decoration or backgrounds rather than low-contrast body copy.
- Keep the existing system Thai font stack for readability and zero font cost. Use Arial or Libre Franklin for English-only labels when appropriate. Do not add remote fonts.
- Use radii `0`, `30px`, and `42px` with purpose: crisp utility controls, secondary panels, and the lead trip feature respectively. Do not turn every element into a card.
- Use a 4/8/16 spacing rhythm and multiples of that base for larger gaps.

## Interaction and trust

- Design for 390px first, then verify 360px and 1280px. Keep touch targets at least 44px, keyboard focus visible, reduced motion respected, and prevent horizontal overflow.
- Keep day selection, map-pin detail, activity add/edit, and localStorage persistence functional.
- Label maps, pins, routes, prices, weather, and other synthetic content as demonstrations; never imply verified coordinates, routes, or live travel data.
- Preserve the existing React, Vite, plain CSS, dependency set, and relevant search-to-stay flows. Do not add paid services, map providers, remote fonts, or generated imagery.
