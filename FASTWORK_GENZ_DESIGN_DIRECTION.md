# ezytrip · Mobile design direction (draft for review)

Reference inspected: `https://fastwork.com/th/selling` on 2026-10-23. Its visible page uses a spacious white canvas, oversized dark Thai heading, floating photo cards, pill buttons, soft gray surfaces, and a restrained accent. DOM classes such as `svelte-1p2vpne` and scoped CSS rules indicate Svelte styling on the inspected page. No Tailwind utility classes or `--tw-` rules were observed there; this does not prove Tailwind is absent throughout Fastwork.

This is an original ezytrip direction, borrowing the visual rhythm rather than copying Fastwork's content, artwork, or code. The existing ezytrip app uses React and plain CSS. Tailwind is optional for implementation and adds no user-visible benefit by itself.

## Visual system

- Canvas `#FFFFFF`; primary ink `#191D23`; muted ink `#626A73`; quiet surface `#F3F5F5`; borders `#E6E9E9`.
- One travel-specific accent: vivid harbor blue `#246BFF`, used on the main trip action and selected navigation. Small citrus `#DFFF77` highlights can identify live travel tools, never whole backgrounds.
- Thai text: keep the installed system Thai font stack for reliable rendering and zero font cost. Increase mobile hero headline to about 31–34 px, body to 14–15 px, supporting labels to at least 12 px. Use tighter headline tracking only where Thai glyphs remain legible.
- Pill buttons for primary actions and filter chips; softer 18–24 px corners for photo and utility surfaces. Avoid making every content block an identical card.
- Photo treatment: one strong Hong Kong image in the trip feature, compact editorial cropping for hotel listings. Existing local licensed photos are enough; do not imply that fictional hotels match those photos.

## Mobile flow at 390 px

```text
ezytrip.                      HKD ↔ THB   avatar

ทริปฮ่องกงของเรา
28 พ.ย. – 1 ธ.ค. · 4 วัน 3 คืน
┌─────────────────────────────────────┐
│ Hong Kong photo                    │
│                   เปิดแผนทริป   ↗  │
└─────────────────────────────────────┘

ใช้ระหว่างเที่ยว
[แปลงเงิน] [หารค่าอาหาร] [หาเส้นทาง] [ดูอากาศ]

ค้นหาที่พักที่ไปไหนก็สะดวก               ↗

ที่พักเข้ากับแผนเที่ยว         ดูทั้งหมด
[photo + key reason + price] → scroll

[หน้าแรก]          [ค้นหา]          [ทริปของฉัน]
```

The photo and title give the page character, while the four tools stay visible near the first screen. Keep the current search → listing → detail → save → dashboard journey and the bottom sheets.

## Route treatment

- **Search:** a bold, short heading, large destination field, date and guest controls with generous tap targets, one blue pill search action. Keep budget unit/currency clear.
- **Listing:** a concise trip summary and editable search pill; horizontal filter chips; hotel rows pair large imagery with area, verified-as-demo rating, reason, and a prominent price. Retain sort and empty state.
- **Detail:** edge-to-edge hero photo on mobile, clear name/location/rating, a distinct "why it fits" panel, and provider links separated from demo information. Keep save accessible.
- **Dashboard:** day selectors as pills, editorial itinerary timeline, and clear tabs for plan/expenses/stays/weather. Preserve labels showing local-only collaboration and sample data.
- **Desktop:** centered content with breathing room and a wider photo/utility composition; avoid huge decorative sections that bury the tools.

## Review checks before implementation

Check the mobile home, listing, and detail at 360 and 390 px; desktop at 1280 px. Confirm no horizontal overflow, readable Thai, 44 px interactive targets, visible keyboard focus, reduced-motion support, and every existing demo action still works. Do not present synthetic exchange rates, routes, weather, prices or reviews as live data.

Status: visual direction only. Superdesign canvas generation and code changes have not run. CLI preflight could not reach the npm registry (`ENOTFOUND`), and the project's free-first rule requires confirming that generation uses no paid credits before invoking it.
