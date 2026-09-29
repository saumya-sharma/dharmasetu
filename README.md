# DharmaSetu

Static marketing site for **DharmaSetu** — guided Hindu ritual & ancestral services.

**Positioning:** Guided ritual understanding + personalised roadmap + verified priest referral. Traditions vary.

## Scope (Week-2 wedge)

- Digital ritual guidance + personalised roadmap (form → WhatsApp)
- Verified priest referral (handoff, not booking checkout)
- Annual reminders — mentioned, not built

Practices vary by community and family. No spiritual-outcome claims.

## Configure WhatsApp

Edit `config.js` and set `WHATSAPP_E164` to digits only with country code (e.g. `9198XXXXXXXX`).

## Local preview

```bash
python3 -m http.server 8080 --directory .
```

## Design notes

Calm premium editorial: Fraunces + Source Sans 3, warm paper/cream palette, Unsplash photography in `/assets/` (see `assets/CREDITS.txt`). Subtle scroll fades only.

## Deploy

GitHub Pages from the `main` branch root — https://saumya-sharma.github.io/dharmasetu/
