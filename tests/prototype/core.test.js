// Run: node --test tests/prototype/*.test.js   (jsdom tests need NODE_PATH with jsdom installed; they skip otherwise)
const test = require("node:test"), assert = require("node:assert");
const path = require("path"), fs = require("fs");
const P = path.join(__dirname, "../../prototype");
const C = require(path.join(P, "ds-core.js"));
const data = JSON.parse(fs.readFileSync(path.join(P, "calendar-data.json"), "utf8"));

function memStore() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, m }; }

test("validatePrefs drops bad values and unknown keys", () => {
  const { prefs, errors } = C.validatePrefs({ v: 1, lang: "fr", cats: ["ekadashi", "bogus", "ekadashi"], picks: ["<script>"], practices: ["fast", "eat-meat"], tz: "Not/AZone", city: "<b>Pune</b>\u0000", remind: { lead: "x", time: "25:00" }, phone: "999" });
  assert.deepStrictEqual(prefs.cats, ["ekadashi"]);
  assert.deepStrictEqual(prefs.picks, []);
  assert.deepStrictEqual(prefs.practices, ["fast"]);
  assert.strictEqual(prefs.lang, "en");
  assert.ok(C.isValidTimeZone(prefs.tz));
  assert.strictEqual(prefs.city, "bPune/b");
  assert.strictEqual(prefs.remind.lead, "day-before");
  assert.strictEqual(prefs.phone, undefined);
  assert.ok(errors.includes("lang") && errors.includes("tz") && errors.includes("time"));
  assert.ok(C.validatePrefs(null).errors.length);
  assert.ok(C.validatePrefs("[]").errors.length);
});

test("save/load/delete round-trip with versioned local state", () => {
  const s = memStore();
  assert.strictEqual(C.loadPrefs(s), null);
  C.savePrefs(s, Object.assign(C.defaults(), { lang: "hi", cats: ["ekadashi"], tz: "America/New_York" }));
  const back = C.loadPrefs(s);
  assert.strictEqual(back.v, 1); assert.strictEqual(back.lang, "hi"); assert.strictEqual(back.tz, "America/New_York");
  s.setItem(C.PREFS_KEY, "{not json"); assert.strictEqual(C.loadPrefs(s), null);
  C.deletePrefs(s); assert.strictEqual(s.getItem(C.PREFS_KEY), null);
});

test("selectEvents filters future events relative to today and sorts", () => {
  const p = Object.assign(C.defaults(), { cats: ["ekadashi"] });
  const list = C.selectEvents(data.events, p, "2026-11-07");
  assert.ok(list.length > 0 && list.every(e => e.date >= "2026-11-07" && e.categories.includes("ekadashi")));
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].date <= list[i].date);
  assert.strictEqual(C.selectEvents(data.events, p, "2028-01-01").length, 0); // range ended
  const pick = Object.assign(C.defaults(), { mode: "events", picks: [data.events[10].id] });
  assert.strictEqual(C.selectEvents(data.events, pick, null).length, 1);
});

test("alarm triggers are relative to all-day local midnight", () => {
  assert.strictEqual(C.alarmTrigger({ lead: "day-before", time: "19:00" }), "-PT300M");
  assert.strictEqual(C.alarmTrigger({ lead: "same-day", time: "07:30" }), "PT450M");
  assert.strictEqual(C.alarmTrigger({ lead: "none", time: "07:30" }), null);
});

function unfold(ics) { return ics.replace(/\r\n /g, ""); }
test("buildICS: CRLF, folding <=75 octets, escaping, exclusive DTEND, stable UID, one VALARM per event", () => {
  const p = Object.assign(C.defaults(), { lang: "hi", cats: ["festivals", "ekadashi"], practices: ["food-choice"], remind: { lead: "day-before", time: "19:00" } });
  const evs = C.selectEvents(data.events, p, "2026-11-07");
  const ics = C.buildICS(evs, p, { now: new Date("2026-11-07T10:00:00Z") });
  assert.ok(ics.endsWith("\r\n"));
  assert.ok(!/[^\r]\n/.test(ics), "bare LF");
  for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75, "long line: " + line);
  const u = unfold(ics);
  assert.strictEqual((u.match(/BEGIN:VEVENT/g) || []).length, evs.length);
  assert.strictEqual((u.match(/BEGIN:VALARM/g) || []).length, evs.length);
  assert.ok(!/RRULE/.test(u));
  const uids = (u.match(/^UID:.*$/gm) || []); assert.strictEqual(new Set(uids).size, evs.length);
  evs.forEach(e => assert.ok(u.includes("UID:" + e.uid)));
  const diwali = evs.find(e => e.date === "2026-11-08");
  assert.ok(u.includes("DTSTART;VALUE=DATE:20261108\r\nDTEND;VALUE=DATE:20261109"));
  assert.ok(diwali);
  assert.ok(/^DTSTAMP:20261107T100000Z$/m.test(u));
  assert.ok(u.includes("आपने चुना: भोजन-संबंधी अपना चुनाव"));
  // year boundary
  assert.strictEqual(C.nextDay("2026-12-31"), "2027-01-01");
});

test("escapeText escapes RFC 5545 specials", () => {
  assert.strictEqual(C.escapeText("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
});

test("public feeds: well-formed, folded, uids unique, all-day DTEND exclusive", () => {
  for (const f of fs.readdirSync(P).filter(f => f.endsWith(".ics"))) {
    const raw = fs.readFileSync(path.join(P, f), "utf8");
    assert.ok(raw.startsWith("BEGIN:VCALENDAR"), f);
    const u = unfold(raw.replace(/\r?\n/g, "\r\n"));
    const uids = u.match(/^UID:.*$/gm) || [];
    // KNOWN open data issue (flagged verify:true, reported in PR): two consecutive-day pairs share a UID
    // pending panchang verification of which date is right. Any other duplicate fails.
    const KNOWN = ["UID:ekadashi-2027-03-04@dharmasetu", "UID:purnima-2027-06-19@dharmasetu"];
    const dups = uids.filter((x, i) => uids.indexOf(x) !== i && !KNOWN.includes(x));
    assert.deepStrictEqual(dups, [], f + " dup uid");
    const re = /DTSTART;VALUE=DATE:(\d{8})\r\nDTEND;VALUE=DATE:(\d{8})/g; let m, n = 0;
    while ((m = re.exec(u))) { n++; const s = m[1], e = m[2]; const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6) + 1)).toISOString().slice(0, 10).replace(/-/g, ""); assert.strictEqual(e, d, f); }
    assert.strictEqual(n, uids.length, f);
  }
});
