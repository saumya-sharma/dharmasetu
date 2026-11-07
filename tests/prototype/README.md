# Prototype v2.2 — "Remember a day" journey: rationale, tests, limits

## What changed (prototype/ only)
- `home.html`: one-sentence offer + three actions — Remember a day / Understand a tradition / Plan a life moment.
- `remember.html` + `remember.js` + `ds-core.js` (new): preferences-first calendar. Choose kinds of days or individual days, optional "how I mark it" (wording only, never dietary instruction), reminder lead/time, language, optional time zone/city/family tradition, preview of next 5 with story/source/evidence, `.ics` snapshot download, explicit "Save on this device" (versioned `localStorage` key `ds_prefs`, validated on load), export settings JSON, start over, delete.
- `muhurat.html` → "Plan a life moment": no name/DOB; replaced invented sample muhurat windows with practical-first plan + general tradition notes + real days from the reference calendar; WhatsApp CTA says "our team" (no acharya claim).
- `namakaran.html` (new): bounded educational birth guide; no mandated timing.
- `calendar.html`: link to the guided flow; "Download selected" now uses the shared RFC 5545 builder; `#id` deep links resolve.
- Logo: Material Symbols `temple_hindu` on terracotta tile (`assets/logo-temple.svg`, Apache-2.0 notice kept) replaces the Om glyph in headers.
- A11y: skip link, 44px targets, `:focus-visible`, `prefers-reduced-motion`, `aria-pressed` on language, `aria-expanded` on menu.
- Data: two genuine UID collisions fixed (Jan 3 Ekadashi and Jan 7 Amavasya 2027 shared UIDs with Dec 23/27 events, so subscribers only saw one). Dec events keep their UID; Jan events get new date-matching UIDs. No festival dates changed.

## ICS semantics
All-day `DTSTART;VALUE=DATE` + exclusive `DTEND`; CRLF; UTF-8-safe folding at 75 octets; TEXT escaping; UID = the same published identity key as the public feeds (frozen; not regenerated on corrections); `SEQUENCE:0`; one optional `VALARM` per event with a relative trigger (e.g. `-PT300M` = 19:00 the evening before, device-local). No RRULE for lunar dates. Snapshot is labelled as non-updating; category subscriptions are offered for auto-updating dates.

## Persona hypotheses (design checks, not research)
| Lens | Need assumed | How the build answers | Test idea with real users |
|---|---|---|---|
| 25 | Relevance, speed | 3 actions, 3 steps, no sign-up | Time to first download < 60s |
| 35 parent | Time-poor | Defaults pre-set; Namakaran checklist | Can finish on phone one-handed |
| 45 organiser | Whole family's days | Kinds-of-days + festivals/ancestral; export | Shares the .ics with family? |
| 55 observer | Ekadashi accuracy | "Checked vs Drik Panchang"/"needs confirmation" tags, story optional | Trusts dates? asks for tradition variant? |
| 65 | Readability, trust | Larger type, 44px targets, Hindi throughout, kul-purohit respected | Reads Hindi comfortably, no confusion on WhatsApp |

## Run tests
```
# optional, for DOM tests (installed outside the repo):  mkdir -p /tmp/dsdeps && cd /tmp/dsdeps && npm i jsdom@24
NODE_PATH=/tmp/dsdeps/node_modules node --test tests/prototype/*.test.js
python3 -m http.server 8765   # then open http://localhost:8765/prototype/home.html
```

## Not built / launch blockers
- WhatsApp reminders: needs a backend (preferences store + scheduler), Meta WhatsApp Business account, approved templates, explicit opt-in/opt-out flow, cost limits. UI says "not available yet".
- Personal auto-updating feed URLs: need a server; only public category feeds exist.
- Dates are New Delhi reference for all locations; no Smarta/Vaishnava variants.
- Two consecutive-day pairs share a UID in the public feeds (Ekadashi 3/4 Mar 2027, Purnima 18/19 Jun 2027) — marked "needs confirmation"; verify against a panchang, then drop the wrong one.
- Ekadashi dates as a set are not fully audited; Hindi copy needs native review.
- No pricing, booking or payments; acharya presence pending consent.
