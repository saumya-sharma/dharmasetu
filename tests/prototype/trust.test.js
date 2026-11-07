// Sangam composer + consented-records gates. All records below are SYNTHETIC test fixtures, not real people.
const test = require("node:test"), assert = require("node:assert");
const path = require("path"), fs = require("fs");
const P = path.join(__dirname, "../../prototype");
const T = require(path.join(P, "trust-core.js"));

const good = { type: "story", text: "My grandmother lit a diya by the tulsi every evening in Kartik.", ownConsent: true };
test("contribution: defaults are private and anonymous; consent required", () => {
  const b = T.blank();
  assert.strictEqual(b.publishOk, false); assert.strictEqual(b.resourceInterest, false); assert.strictEqual(b.ownConsent, false); assert.strictEqual(b.attribution, "anonymous");
  assert.strictEqual(T.validateContribution(Object.assign({}, good, { ownConsent: false })).errors.ownConsent, "required");
  assert.deepStrictEqual(T.validateContribution(good).errors, {});
  assert.strictEqual(T.validateContribution({ ...good, ownConsent: "true" }).errors.ownConsent, "required");
});
test("contribution: validation of type, length, URL, contact details, display name", () => {
  assert.strictEqual(T.validateContribution({ ...good, type: "<x>" }).errors.type, "required");
  assert.strictEqual(T.validateContribution({ ...good, text: "short" }).errors.text, "short");
  assert.strictEqual(T.validateContribution({ ...good, text: "a".repeat(1501) }).errors.text, "long");
  assert.strictEqual(T.validateContribution({ ...good, text: good.text + " call 98765 43210" }).errors.text, "contact");
  assert.strictEqual(T.validateContribution({ ...good, text: good.text + " me@x.com" }).errors.text, "contact");
  for (const u of ["javascript:alert(1)", "http://x.org", "data:text/html,1", "https://u:p@x.org", "notaurl"]) assert.strictEqual(T.validateContribution({ ...good, source: u }).errors.source, "url", u);
  assert.strictEqual(T.validateContribution({ ...good, source: "https://example.org/a b" }).value.source, "https://example.org/a%20b");
  assert.strictEqual(T.validateContribution({ ...good, attribution: "name" }).errors.displayName, "required");
  const anon = T.validateContribution({ ...good, displayName: "Should vanish" }).value;
  assert.strictEqual(anon.displayName, "");
});
test("draft: says not submitted; WhatsApp link is encoded, size-limited, team number only", () => {
  const v = T.validateContribution({ ...good, title: "A&B <script>alert(1)</script> #x?y=1", attribution: "name", displayName: "Meera", publishOk: true }).value;
  const txt = T.draftText(v);
  assert.match(txt, /DRAFT \(not yet reviewed\)/); assert.match(txt, /Credit: Meera/); assert.match(txt, /May be published after review: yes/);
  const url = T.whatsappDraftUrl(txt);
  assert.ok(url.startsWith("https://wa.me/917239062622?text="));
  assert.strictEqual(decodeURIComponent(url.split("?text=")[1]), txt);
  assert.ok(!/[<>#&\s]/.test(url.split("?text=")[1]));
  assert.strictEqual(T.whatsappDraftUrl("x".repeat(T.WA_MAX_TEXT + 1)), null);
  const j = JSON.parse(T.draftJSON(v)); assert.strictEqual(j.status, "draft-not-submitted"); assert.strictEqual(j.permissions.resourceInterest, false);
  const priv = T.draftText(T.validateContribution(good).value);
  assert.match(priv, /no — for the team only/); assert.match(priv, /Credit: Anonymous/);
});

const SYN_A = { id: "synthetic-guide", name: "SYNTHETIC Test Guide", tradition: "Test", languages: ["Hindi"], bio_en: "<img src=x onerror=alert(1)>",
  photo: "assets/people/synthetic-guide.jpg", video: "https://www.youtube.com/watch?v=test",
  consent: { profile_public: true, photo: true, video: true }, verification: { date: "2026-11-01", method: "video-call", checked: ["lineage stated"] },
  editorial: { approved: true, approved_on: "2026-11-02" } };
test("acharya gates: consent + editorial approval + documented verification all required", () => {
  assert.strictEqual(T.publicAcharyas([SYN_A]).length, 1);
  const drop = (patch) => T.publicAcharyas([Object.assign(JSON.parse(JSON.stringify(SYN_A)), patch)]).length;
  assert.strictEqual(drop({ consent: { profile_public: false } }), 0);
  assert.strictEqual(drop({ editorial: { approved: true } }), 0);
  assert.strictEqual(drop({ verification: { date: "2026-11-01", method: "trust-me", checked: ["x"] } }), 0);
  assert.strictEqual(drop({ verification: { date: "2026-11-01", method: "video-call", checked: [] } }), 0);
  assert.strictEqual(drop({ delisted: true }), 0);
  assert.strictEqual(drop({ consent: { profile_public: "true" } }), 0);
});
test("acharya media: photo/video need their own consent and safe sources", () => {
  const one = (patch) => T.publicAcharyas([Object.assign(JSON.parse(JSON.stringify(SYN_A)), patch)])[0];
  assert.strictEqual(one({}).photo, "assets/people/synthetic-guide.jpg");
  assert.strictEqual(one({ consent: { profile_public: true, photo: false, video: false } }).photo, null);
  for (const p of ["assets/people/x.svg", "https://evil.example/x.jpg", "../x.jpg", "javascript:alert(1)"]) assert.strictEqual(one({ photo: p }).photo, null, p);
  for (const v of ["https://evil.example/v", "javascript:alert(1)", "http://youtube.com/x"]) assert.strictEqual(one({ video: v }).video, null, v);
});
const SYN_Q = { id: "synthetic-q", quote_en: "SYNTHETIC <script>alert(1)</script> quote", source_type: "product-use", consent: { quote_public: true, credit: "initials" }, initials: "S.T.", editorial: { approved: true, approved_on: "2026-11-02" } };
test("testimonial gates: quote consent, editorial approval, valid source type, chosen credit only", () => {
  assert.strictEqual(T.publicTestimonials([SYN_Q])[0].credit, "S.T.");
  const n = (patch) => T.publicTestimonials([Object.assign(JSON.parse(JSON.stringify(SYN_Q)), patch)]);
  assert.strictEqual(n({ consent: { quote_public: false } }).length, 0);
  assert.strictEqual(n({ editorial: { approved: false } }).length, 0);
  assert.strictEqual(n({ source_type: "review" }).length, 0);
  assert.strictEqual(n({ consent: { quote_public: true, credit: "anonymous" }, name: "Real Name" })[0].credit, "");
  assert.ok(!("rating" in n({ rating: 5 })[0]));
});
test("public people.json ships empty and holds no private fields", () => {
  const d = JSON.parse(fs.readFileSync(path.join(P, "data/people.json"), "utf8"));
  assert.deepStrictEqual(d.acharyas, []); assert.deepStrictEqual(d.testimonials, []);
  const all = fs.readFileSync(path.join(P, "data/people.json"), "utf8");
  assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}|\+91\d|consent_form|signature/i.test(all));
  assert.ok(!fs.existsSync(path.join(P, "assets/people")) || fs.readdirSync(path.join(P, "assets/people")).every(f => /\.(jpg|jpeg|png|webp)$/.test(f)));
});
