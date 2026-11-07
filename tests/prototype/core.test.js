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
    const dups = uids.filter((x, i) => uids.indexOf(x) !== i);
    assert.deepStrictEqual(dups, [], f + " dup uid");
    const re = /DTSTART;VALUE=DATE:(\d{8})\r\nDTEND;VALUE=DATE:(\d{8})/g; let m, n = 0;
    while ((m = re.exec(u))) { n++; const s = m[1], e = m[2]; const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6) + 1)).toISOString().slice(0, 10).replace(/-/g, ""); assert.strictEqual(e, d, f); }
    assert.strictEqual(n, uids.length, f);
  }
});

test("data: ids and uids unique; every row appears once in the full feed with the same date", () => {
  const ids = data.events.map(e => e.id), uids = data.events.map(e => e.uid);
  assert.strictEqual(new Set(ids).size, ids.length); assert.strictEqual(new Set(uids).size, uids.length);
  const full = unfold(fs.readFileSync(path.join(P, "dharmasetu.ics"), "utf8"));
  const pairs = [...full.matchAll(/DTSTART;VALUE=DATE:(\d{8})\r\nDTEND[^\r]*\r\nDTSTAMP:[^\r]*\r\n(?:LAST-MODIFIED:[^\r]*\r\nSEQUENCE:\d+\r\n)?UID:(\S+)/g)].map(m => m[2] + "|" + m[1]);
  assert.strictEqual(pairs.length, data.events.length);
  for (const e of data.events) assert.ok(pairs.includes(e.uid + "|" + e.date.replace(/-/g, "")), e.uid);
  for (const e of data.events) for (const c of e.categories) {
    const f = unfold(fs.readFileSync(path.join(P, "dharmasetu-" + c + ".ics"), "utf8"));
    assert.ok(f.includes("UID:" + e.uid + "\r\n"), c + " missing " + e.uid);
  }
});

test("Ekadashi rows match the Drik Panchang New Delhi audit (7 Nov 2026)", () => {
  // Primary dates from drikpanchang.com/vrats/ekadashidates.html?geoname-id=1261481 (2026, 2027); Gauna/Vaishnava second days excluded.
  const DRIK = ["2026-11-05","2026-11-20","2026-12-04","2026-12-20","2027-01-03","2027-01-18","2027-02-02","2027-02-17","2027-03-04","2027-03-18","2027-04-02","2027-04-17","2027-05-02","2027-05-16","2027-06-01","2027-06-14","2027-06-30","2027-07-14","2027-07-29","2027-08-12","2027-08-28","2027-09-11","2027-09-26","2027-10-11","2027-10-25","2027-11-10","2027-11-24","2027-12-09","2027-12-23"];
  // 2027-11-10 has both the generic Ekadashi row and the named Dev Uthani row (same observance; reported, not removed).
  const ours = [...new Set(data.events.filter(e => e.categories.includes("ekadashi")).map(e => e.date))].sort();
  assert.deepStrictEqual(ours, DRIK);
  const PURNIMA_2027 = ["2027-01-22","2027-02-20","2027-03-22","2027-04-20","2027-05-20","2027-06-18","2027-07-18","2027-08-17","2027-09-15","2027-10-15","2027-11-14","2027-12-13"];
  const op = data.events.filter(e => /^purnima-/.test(e.uid) && e.date.startsWith("2027")).map(e => e.date).sort();
  assert.deepStrictEqual(op, PURNIMA_2027);
});

test("corrected event keeps its UID and carries SEQUENCE/LAST-MODIFIED in the public feed", () => {
  const e = data.events.find(x => x.uid === "ekadashi-2027-01-19@dharmasetu");
  assert.strictEqual(e.date, "2027-01-18"); assert.strictEqual(e.sequence, 1);
  const f = unfold(fs.readFileSync(path.join(P, "dharmasetu-ekadashi.ics"), "utf8"));
  assert.ok(/DTSTART;VALUE=DATE:20270118\r\nDTEND;VALUE=DATE:20270119\r\nDTSTAMP:\S+\r\nLAST-MODIFIED:\S+\r\nSEQUENCE:1\r\nUID:ekadashi-2027-01-19@dharmasetu/.test(f));
  const snap = unfold(C.buildICS([e], C.defaults(), {}));
  assert.ok(snap.includes("UID:ekadashi-2027-01-19@dharmasetu\r\n") && snap.includes("SEQUENCE:1"));
});

test("snapshot UID does not depend on the (mutable) date", () => {
  const e = data.events[5], moved = Object.assign({}, e, { date: "2027-12-30" });
  const a = unfold(C.buildICS([e], C.defaults(), {})), b = unfold(C.buildICS([moved], C.defaults(), {}));
  assert.strictEqual(a.match(/^UID:.*$/m)[0], b.match(/^UID:.*$/m)[0]);
});

test("alarm trigger is device-local and independent of the chosen time zone/city", () => {
  const e = data.events.find(x => x.date >= "2026-11-07");
  const mk = (tz, city) => unfold(C.buildICS([e], Object.assign(C.defaults(), { tz, city, remind: { lead: "day-before", time: "19:00" } }), { now: new Date(0) }));
  assert.strictEqual(mk("Asia/Kolkata", "Pune"), mk("America/New_York", "Boston"));
  assert.ok(!/TZID|Pune|Boston/.test(mk("Asia/Kolkata", "Pune")));
});

test("no user text or crafted data can inject ICS lines", () => {
  const evil = Object.assign({}, data.events[0], { title_en: "X\r\nBEGIN:VEVENT\nUID:evil", why_en: "a;b,c\\" });
  const p = C.validatePrefs({ v: 1, practices: ["fast\nBEGIN:VALARM"], city: "Pune\r\nATTENDEE:x", remind: { lead: "same-day", time: "07:00" } }).prefs;
  assert.deepStrictEqual(p.practices, []);
  const u = unfold(C.buildICS([evil], p, {}));
  assert.strictEqual((u.match(/^BEGIN:VEVENT/gm) || []).length, 1);
  assert.ok(!/^UID:evil/m.test(u) && !/ATTENDEE/.test(u));
  assert.ok(u.includes("SUMMARY:X\\nBEGIN:VEVENT\\nUID:evil"));
});

test("default export = source-checked rows only; reference rows need explicit opt-in; verify:true never", () => {
  const base = data.events[0];
  const checked = Object.assign({}, base, { id: "a1", uid: "a1@x", date: "2027-01-01", audit: { status: "source-checked" } });
  const ref = Object.assign({}, base, { id: "a2", uid: "a2@x", date: "2027-01-02", audit: { status: "reference" } });
  const bad = Object.assign({}, base, { id: "a3", uid: "a3@x", date: "2027-01-03", verify: true, audit: { status: "source-checked" } });
  const p = Object.assign(C.defaults(), { cats: base.categories });
  assert.deepStrictEqual(C.selectEvents([checked, ref, bad], p, "2026-11-07").map(e => e.id), ["a1"]);
  assert.deepStrictEqual(C.selectEvents([checked, ref, bad], Object.assign({}, p, { includeRef: true }), "2026-11-07").map(e => e.id), ["a1", "a2"]);
  assert.strictEqual(C.validatePrefs({ v: 1, includeRef: "yes" }).prefs.includeRef, false);
});

test("every event has an explicit audit status; checked rows name a source and date", () => {
  for (const e of data.events) {
    assert.ok(e.audit && ["source-checked", "reference"].includes(e.audit.status), e.uid);
    if (e.audit.status === "source-checked") assert.ok(e.audit.url && /^\d{4}-\d{2}-\d{2}$/.test(e.audit.checked), e.uid);
  }
  assert.strictEqual(data.events.length, 88);
});

test("no two reminder entries for the same observance/date (Ekadashi merge)", () => {
  for (const c of C.CATEGORY_IDS) {
    const dates = data.events.filter(e => e.categories.includes(c) && c === "ekadashi").map(e => e.date);
    assert.strictEqual(new Set(dates).size, dates.length, c);
  }
  const p = Object.assign(C.defaults(), { cats: C.CATEGORY_IDS.slice(), includeRef: true });
  const sel = C.selectEvents(data.events, p, "2026-11-07");
  assert.strictEqual(sel.filter(e => e.date === "2027-11-10").length, 1);
  const dv = data.events.find(e => e.uid === "dev_uthani-2027-11-10@dharmasetu");
  assert.deepStrictEqual(dv.categories, ["festivals", "ekadashi"]);
  assert.deepStrictEqual(dv.merged_uids, ["ekadashi-2027-11-10@dharmasetu"]);
  assert.ok(dv.story_en && dv.reasoning_id);
  const ek = unfold(fs.readFileSync(path.join(P, "dharmasetu-ekadashi.ics"), "utf8"));
  assert.ok(!ek.includes("UID:ekadashi-2027-11-10@dharmasetu") && ek.includes("UID:dev_uthani-2027-11-10@dharmasetu"));
});
