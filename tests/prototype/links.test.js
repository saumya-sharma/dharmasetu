// Static link crawl over prototype pages: every local href/src must exist; root homepage untouched is checked by git in CI notes.
const test = require("node:test"), assert = require("node:assert");
const path = require("path"), fs = require("fs");
const P = path.join(__dirname, "../../prototype");
test("all local links and assets resolve", () => {
  const bad = [];
  for (const f of fs.readdirSync(P).filter(f => f.endsWith(".html"))) {
    const s = fs.readFileSync(path.join(P, f), "utf8");
    for (const m of s.matchAll(/(?:href|src)="([^"#]+)(#[^"]*)?"/g)) {
      const u = m[1];
      if (/^(https?:|webcal:|mailto:|tel:|data:|\/\/)/.test(u) || u.includes("'")) continue;
      const target = path.join(P, u.split("?")[0]);
      if (!fs.existsSync(target)) bad.push(f + " -> " + u);
    }
  }
  assert.deepStrictEqual(bad, []);
});
test("every page has EN+HI pairs and a 'Celebrating lives' line", () => {
  for (const f of fs.readdirSync(P).filter(f => f.endsWith(".html") && f !== "index.html")) {
    const s = fs.readFileSync(path.join(P, f), "utf8");
    const en = (s.match(/data-i18n-en>/g) || []).length, hi = (s.match(/data-i18n-hi>/g) || []).length;
    assert.strictEqual(en, hi, f + " EN/HI count mismatch " + en + "/" + hi);
    assert.ok(s.includes("Celebrating lives"), f);
  }
});
test("every page declares a local favicon that exists (avoids /favicon.ico 404)", () => {
  for (const f of fs.readdirSync(P).filter(f => f.endsWith(".html"))) {
    const s = fs.readFileSync(path.join(P, f), "utf8");
    const m = s.match(/<link rel="icon" type="image\/svg\+xml" href="([^"]+)"\/>/);
    assert.ok(m, f); assert.ok(fs.existsSync(path.join(P, m[1])), f + " -> " + m[1]);
  }
  const css = fs.readFileSync(path.join(P, "common.css"), "utf8");
  assert.ok(/@media \(max-width: 640px\)[^}]*\.brand-sub \{ white-space: normal;[^}]*-webkit-line-clamp: 2/.test(css), "mobile tagline wraps (2 lines)");
});
