# DharmaSetu

Static marketing site for **DharmaSetu** — premium heritage care for Hindu families.

**Positioning:** Annual care for gotra, lineage, family stories, and observances (Shraddha, Pitra Paksha, Pind Daan yatra) with verified priest referral via WhatsApp. Premium annual care via WhatsApp — not free-content SaaS.

Practices vary by community and family. No spiritual-outcome claims.

## Configure WhatsApp

`config.js` → `WHATSAPP_E164` (digits only, country code). Current: `917239062622`.

## Local preview

```bash
python3 -m http.server 8080 --directory .
```

## Design

Temple-quiet editorial: Fraunces + Source Sans 3, warm paper palette, typography-led layouts, curated Unsplash photography (`assets/CREDITS.txt`). Subtle scroll reveals; respects `prefers-reduced-motion`.

## Deploy

GitHub Pages from `main` — https://saumya-sharma.github.io/dharmasetu/
