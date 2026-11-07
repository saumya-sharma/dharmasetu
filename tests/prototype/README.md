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
- Hindi copy needs native review. Amavasya, Sankranti, ancestral-only and birth-rite rows are not yet audited; `verify:false` alone does not mean independently verified.
- Gauna/Vaishnava second-day Ekadashi variants (21 Nov 2026, 19 Jan 2027, 30 Jul 2027, 26 Oct 2027) are not separate events; mentioned in notes where we changed a row.
- No pricing, booking or payments; acharya presence pending consent.

## Date audit, 7 Nov 2026 (Drik Panchang, New Delhi, geoname-id 1261481)
Sources: drikpanchang.com/vrats/ekadashidates.html?geoname-id=1261481&year=2026 and &year=2027; drikpanchang.com/calendars/purnima/purnima-calendar.html?lang=en&year=2026 and &year=2027.
- Removed duplicate row 2027-03-03 Ekadashi (shared UID `ekadashi-2027-03-04`; Drik lists Vijaya Ekadashi on 4 Mar only).
- Removed duplicate row 2027-06-19 Purnima (shared UID `purnima-2027-06-19`; Drik: Jyeshtha Purnima / Vat Purnima 18 Jun). The 18 Jun row keeps that UID.
- Moved Pausha Putrada Ekadashi 19 → 18 Jan 2027 (UID kept, `SEQUENCE:1`, `LAST-MODIFIED`); Gauna variant on 19 Jan noted in the description.
- Added missing rows: Kamika Ekadashi 29 Jul 2027; Purnima 23 Dec 2026 and 20 Feb 2027.
- Result: all 29 distinct Ekadashi dates and all 12 Purnima 2027 dates match; every UID unique across data and feeds (tested).

## Feed update semantics (no guarantees)
Policy: a published UID is never reused for a different observance and never regenerated when its date is corrected. Changed events keep their UID and get a higher `SEQUENCE` + `LAST-MODIFIED`. Duplicates are removed by dropping the extra VEVENT (the surviving row keeps its UID; merged UIDs are listed in `merged_uids`).
How removals are handled is client-dependent: most subscription clients drop events missing from a refreshed feed, on their own schedule (Google Calendar can take many hours); some may keep a stale copy. We do not currently publish tombstones (`STATUS:CANCELLED`); adding them later is possible but would not guarantee removal either. Downloaded snapshots never update.
Merge on 7 Nov 2026: `ekadashi-2027-11-10` (generic) merged into `dev_uthani-2027-11-10` (categories festivals + ekadashi, story kept), so Ekadashi subscribers get one entry that day.

## Alerts and time zones
Events are all-day floating dates (the New Delhi reference date shown as-is everywhere). The optional VALARM is relative to local midnight of that date, so “19:00 the evening before” fires at 19:00 on the calendar app's/device clock wherever it is. There is no time-zone field in the UI (it would not affect alerts); the browser zone is used only to work out “today” for the preview. City is a note for later and changes nothing. Many clients (incl. Google Calendar imports) ignore alarms in imported files, so alert timing is never guaranteed.

## Audit status semantics
Each event has `audit.status`: `source-checked` (date compared against the named source on the given day — Ekadashi and Purnima rows 7 Nov 2026; festivals in the 3 Nov cross-check) or `reference` (computed, not compared). `verify:true` is a separate flag for known-problem rows and is never exported. The Remember flow exports only `source-checked` rows unless the user ticks “Also include reference days not yet checked”; each preview item is tagged accordingly. After the merge: 88 events, 60 source-checked, 28 reference (mostly Amavasya, Sankranti, ancestral).
