# Adding guides (acharyas) and testimonials — maintainer handbook

`prototype/data/people.json` is **public**. It holds only what may be shown on the site. It ships empty; the site then shows an invitation, never placeholder faces, quotes or stars.

## Never commit
Consent forms, signatures, ID/certificate scans, phone numbers, emails, addresses, chat screenshots. Keep consent evidence in the team's private drive; reference it only by an internal id (`consent_ref`).

## Acharya record (shown only if every gate passes)
| Field | Rule |
|---|---|
| `id` | slug, e.g. `pandit-r-mishra` |
| `name`, `name_hi` | as the person wants it shown |
| `tradition`, `region`, `languages[]`, `bio_en`, `bio_hi` | short plain text (HTML is never rendered) |
| `photo` | `assets/people/<slug>.jpg|png|webp` only, file supplied by them; no SVG, no hot-linking |
| `video` | https link on youtube.com / youtu.be / vimeo.com; shown as an external link, never embedded |
| `consent.profile_public` | `true` only after written consent is filed |
| `consent.photo`, `consent.video` | separate `true` flags; missing = not shown |
| `consent_ref` | private-drive id (no personal data) |
| `verification.date` | `YYYY-MM-DD` when the team checked |
| `verification.method` | `in-person` / `video-call` / `reference-check` / `document-check` |
| `verification.checked[]` | what was checked, e.g. "lineage stated", "2 references" — shown publicly |
| `editorial.approved`, `editorial.approved_on`, `editorial.by` | set by a maintainer after review |
| `delisted` | `true` hides immediately |

A contributor or the person themselves cannot set verification or approval — only a maintainer, in a reviewed PR.

## Testimonial record
`quote_en` and/or `quote_hi` (their exact words, ≤400 chars), `source_type` = `product-use` (about using DharmaSetu) or `tradition-experience` (about a family practice — not an endorsement), `consent.quote_public: true`, `consent.credit` = `name` | `initials` | `anonymous`, `name`/`initials` only if that credit was chosen, `region` optional, `date`, `consent_ref`, `editorial.approved` + `approved_on`. No ratings, no outcome claims. A Sangam contribution never becomes a testimonial automatically — it needs a separate request and permission.

## Revoke / delist
Someone asks to be removed → set `delisted: true` (or delete the record) and remove any photo file in the same PR, deploy, then confirm back to them personally. Removal requests take priority over everything else.

## Sangam contributions
They arrive as drafts the contributor sends by hand (WhatsApp/download). Publish only if they ticked "may publish after review"; credit only as they chose; keep tradition/story separate from any science claim; strip anything private.
