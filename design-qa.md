# ezytrip V1 design QA

final result: passed

Scope: visual and interaction acceptance of a mobile-first local prototype. This is an intentional travel-utility adaptation of the supplied reference, not a faithful clone or a claim that the user selected one of the rejected desktop mocks.

## Source and comparison evidence

- Source URL: https://fastwork.com/th, observed redirect /th/selling.
- Source visual truth: `verification/reference-fastwork-mobile.png`, 390 × 844 pixels.
- Implementation: `verification/home-mobile.png`, 390 × 844 pixels; same CSS viewport and density 1. Additional five-screen mobile captures and `home-desktop.png` are in the same folder.
- Both source and implementation were opened together in the same image-comparison input. The source's promotional heading/countdown/portfolio flow is deliberately replaced by trip utilities; their content state is not equivalent, and no pixel match is asserted. Reference photography/branding was not copied into the product.
- All target controls, captions and typography were readable in the full-size mobile captures. An additional crop was not required for the observed caption-wrap issue; that region was inspected again in the full-size corrected capture.

## Findings and iteration history

1. [P2, fixed] Mobile route shortcut caption wrapped an orphaned word onto a third line. Shortened the caption to “เลือกวิธีเดินทาง”; recaptured the homepage and compared source and updated implementation together at 390 × 844. Tool labels now have a consistent compact rhythm.
2. [P2, fixed] Search budget filtering originally depended on display currency. Record the budget's currency, convert form values on swap and filter against the recorded currency. Fresh preview re-test: HKD 500 becomes THB 2,150; Mong Kok Little Stay remains the sole match after switching display back to HKD. This is a behavior correction, not evidence of pixel fidelity.

## Required fidelity surfaces

- Typography: Thai system-font hierarchy, compact headings, readable labels; source's oversized promotional headline intentionally omitted. Supporting metadata remains small and is a possible next-round polish area.
- Spacing/layout: 20px mobile side padding, common field/button rhythm, responsive hotel layout, bottom navigation and sheets. Browser measurements found no document-level horizontal overflow on any of the five routes at 360, 390 or 1280px.
- Colors/tokens: warm white, ink, teal primary, restrained accent tints; differs intentionally from the reference's black primary action. Focus ring is visible. This is not a WCAG conformance audit.
- Assets: three local free-license Unsplash photographs, no image generation. Zero broken-image results in viewport checks. Hotel photos are explicitly illustrative. Lucide library icons; no hand-drawn icon replacements.
- Copy: Thai travel tasks, explicit demo data and no live price/forecast claims. Guest and invitation limitations are explained. Source marketing copy is not reused.

## Interactions checked in the in-app browser

Search → results → hotel detail → save → trip; sort by price; empty filter results and reset; HKD/THB totals; currency-preserving budget; meal split; invalid empty participant selection; ledger save and partial repayment; itinerary day/add-place; local persistence after reload; permission selection; route preference and full-day demo view; weather unavailable state. Browser warning/error log was empty at the final inspected state. Clipboard copying and actual third-party search/booking results were not verified.

## Follow-up polish and gaps

- [P3] User preference on palette, content density and imagery still needs real feedback; “passed” is a QA result, not user approval of aesthetics.
- [P3] Support text can be enlarged in a later accessibility pass; run real-device and screen-reader checks before release.
- No actual-device Safari/Android testing, collaboration, server permissions, live data, paid accounts or public hosting was exercised.

## Implementation checklist

- Required five screens exist and main prototype controls work: checked.
- No actionable P0/P1/P2 from this limited prototype review remains.
- Build/tests and limitations recorded in VERIFICATION.th.md.
- Keep local preview running; collect user feedback before service integration.
