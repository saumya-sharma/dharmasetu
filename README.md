# DharmaSetu

Static marketing site for **DharmaSetu** — premium heritage care for Hindu families.

**Positioning:** Post-rites annual care for gotra, lineage, family stories, and observances (Śrāddha, Pitṛ Pakṣa, Pind Daan yātrā) with verified priest referral via WhatsApp. Temple-quiet premium. Hindi + English. No funeral / 13-day / cremation focus.

## Configure WhatsApp

`config.js` → `WHATSAPP_E164` (digits only, country code). Current: `917239062622`.

## Local preview

```bash
python3 -m http.server 8080 --directory .
```

## Design

Scroll-story homepage: ancient continuity → modern drift → DharmaSetu bridge → outcomes.
Custom SVG motifs (yantra / sutra / mandala / bridge). Keyword tiles (Gotra, Pitṛ Pakṣa, Śrāddha, Yātrā, Vaṃśa, NRI). Animated Orient → Record → Observe (CSS/SVG; respects `prefers-reduced-motion`). Place personas: New Jersey, Delhi, Bengaluru, Banaras/Kashi. Visual roadmap on homepage + WhatsApp form.

## Deploy

GitHub Pages from `main` — https://saumya-sharma.github.io/dharmasetu/
