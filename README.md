# DharmaSetu

Thin static marketing site for **DharmaSetu** — guided Hindu ritual & ancestral services.

**Tagline:** Your family's traditions. Guided, understood, fulfilled.

## Scope (Week-2 wedge)

- Digital ritual guidance + personalised roadmap (form → WhatsApp)
- Verified priest referral (handoff, not booking checkout)
- Annual reminders — mentioned, not built

Practices vary by community and family. No spiritual-outcome claims.

## Configure WhatsApp

Edit `config.js` and set `WHATSAPP_E164` to digits only with country code (e.g. `9198XXXXXXXX`).  
Until then the roadmap form shows a visible note and will not open WhatsApp.

## Local preview

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080 --directory .
```

## Deploy

GitHub Pages from the `main` branch root.
