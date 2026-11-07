/* DharmaSetu prototype core: preferences (local only), event selection, RFC 5545 export.
   Pure functions; works in browsers (window.DSCore) and Node (module.exports) for tests. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DSCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var PREFS_KEY = "ds_prefs";
  var SCHEMA_VERSION = 1;
  var CATEGORY_IDS = ["festivals", "ekadashi", "purnima-amavasya", "sankranti", "ancestral", "birth-auspicious"];
  var PRACTICES = ["fast", "food-choice", "puja", "aware"];
  var LEADS = ["none", "day-before", "same-day"];
  var TRADITIONS = ["", "family", "not-sure"];
  var TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
  var ID_RE = /^[a-z0-9_-]{1,40}$/i;

  function isValidTimeZone(tz) {
    if (typeof tz !== "string" || !tz || tz.length > 64) return false;
    try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch (e) { return false; }
  }
  function detectTimeZone() {
    try { var tz = Intl.DateTimeFormat().resolvedOptions().timeZone; return isValidTimeZone(tz) ? tz : "Asia/Kolkata"; }
    catch (e) { return "Asia/Kolkata"; }
  }
  function defaults() {
    return { v: SCHEMA_VERSION, lang: "en", mode: "categories", cats: ["festivals"], picks: [],
      practices: [], tz: detectTimeZone(), city: "", tradition: "",
      remind: { lead: "day-before", time: "19:00" } };
  }
  function uniqFiltered(arr, ok, max) {
    var out = [];
    if (!Array.isArray(arr)) return out;
    for (var i = 0; i < arr.length && out.length < max; i++) {
      if (ok(arr[i]) && out.indexOf(arr[i]) === -1) out.push(arr[i]);
    }
    return out;
  }
  function cleanCity(s) {
    if (typeof s !== "string") return "";
    // Display-only text; strip control chars and angle brackets, cap length. Always rendered via textContent.
    return s.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 60);
  }
  /* Returns {prefs, errors}. Unknown keys dropped; bad values replaced with defaults. */
  function validatePrefs(raw) {
    var d = defaults(), errors = [];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { prefs: d, errors: ["not-object"] };
    if (raw.v !== SCHEMA_VERSION) errors.push("version");
    var p = {
      v: SCHEMA_VERSION,
      lang: raw.lang === "hi" ? "hi" : (raw.lang === "en" ? "en" : (errors.push("lang"), d.lang)),
      mode: raw.mode === "events" ? "events" : "categories",
      cats: uniqFiltered(raw.cats, function (c) { return CATEGORY_IDS.indexOf(c) !== -1; }, CATEGORY_IDS.length),
      picks: uniqFiltered(raw.picks, function (x) { return typeof x === "string" && ID_RE.test(x); }, 500),
      practices: uniqFiltered(raw.practices, function (x) { return PRACTICES.indexOf(x) !== -1; }, PRACTICES.length),
      tz: isValidTimeZone(raw.tz) ? raw.tz : (errors.push("tz"), d.tz),
      city: cleanCity(raw.city),
      tradition: TRADITIONS.indexOf(raw.tradition) !== -1 ? raw.tradition : "",
      remind: { lead: d.remind.lead, time: d.remind.time }
    };
    var r = raw.remind && typeof raw.remind === "object" ? raw.remind : {};
    if (LEADS.indexOf(r.lead) !== -1) p.remind.lead = r.lead; else errors.push("lead");
    if (typeof r.time === "string" && TIME_RE.test(r.time)) p.remind.time = r.time; else errors.push("time");
    return { prefs: p, errors: errors };
  }
  function loadPrefs(storage) {
    try {
      var s = storage.getItem(PREFS_KEY);
      if (!s) return null;
      return validatePrefs(JSON.parse(s)).prefs;
    } catch (e) { return null; }
  }
  function savePrefs(storage, prefs) {
    var p = validatePrefs(prefs).prefs;
    storage.setItem(PREFS_KEY, JSON.stringify(p));
    return p;
  }
  function deletePrefs(storage) { try { storage.removeItem(PREFS_KEY); } catch (e) {} }

  /* Events chosen by prefs, sorted, on/after `today` (YYYY-MM-DD). */
  /* Rows flagged verify:true are held back from exports/reminders until reviewed (shown as reference only). */
  function selectEvents(events, prefs, today, opts) {
    var includeUnverified = !!(opts && opts.includeUnverified);
    var list = events.filter(function (e) {
      if (e.verify === true && !includeUnverified) return false;
      if (prefs.mode === "events") return prefs.picks.indexOf(e.id) !== -1;
      return e.categories.some(function (c) { return prefs.cats.indexOf(c) !== -1; });
    });
    if (today) list = list.filter(function (e) { return e.date >= today; });
    return list.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id < b.id ? -1 : 1); });
  }
  function todayISO(date, tz) {
    var d = date || new Date();
    try {
      var parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz || undefined, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      return o.year + "-" + o.month + "-" + o.day;
    } catch (e) { return d.toISOString().slice(0, 10); }
  }

  /* ---------- RFC 5545 ---------- */
  function escapeText(s) {
    return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
  }
  function utf8Len(ch) { var c = ch.codePointAt(0); return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; }
  /* Fold to <=75 octets per physical line, never splitting a UTF-8 sequence. */
  function foldLine(line) {
    var out = [], cur = "", len = 0, limit = 75;
    for (var _i = 0, chars = Array.from(line); _i < chars.length; _i++) {
      var ch = chars[_i], n = utf8Len(ch);
      if (len + n > limit) { out.push(cur); cur = " "; len = 1; limit = 75; }
      cur += ch; len += n;
    }
    out.push(cur);
    return out.join("\r\n");
  }
  function ymd(iso) { return iso.replace(/-/g, ""); }
  function nextDay(iso) {
    var p = iso.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + 1));
    return d.toISOString().slice(0, 10);
  }
  function utcStamp(d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
  /* All-day DTSTART is a floating local date: the alarm fires at device-local time on that date. */
  function alarmTrigger(remind) {
    if (!remind || remind.lead === "none") return null;
    var m = TIME_RE.exec(remind.time); if (!m) return null;
    var mins = Number(m[1]) * 60 + Number(m[2]);
    if (remind.lead === "same-day") return mins === 0 ? "PT0M" : "PT" + mins + "M";
    var before = 24 * 60 - mins; // evening/day before at chosen time
    return "-PT" + before + "M";
  }
  var PRACTICE_TEXT = {
    en: { fast: "a fast", "food-choice": "a food choice", puja: "puja / prayer", aware: "just being aware" },
    hi: { fast: "व्रत", "food-choice": "भोजन-संबंधी अपना चुनाव", puja: "पूजा / प्रार्थना", aware: "केवल जानकारी" }
  };
  function buildICS(events, prefs, opts) {
    opts = opts || {};
    var lang = prefs.lang === "hi" ? "hi" : "en";
    var now = opts.now || new Date();
    var base = opts.baseUrl || "https://saumya-sharma.github.io/dharmasetu/prototype/";
    var trig = alarmTrigger(prefs.remind);
    var practiceNote = prefs.practices.length
      ? (lang === "hi" ? "आपने चुना: " : "You chose to mark this for: ") + prefs.practices.map(function (p) { return PRACTICE_TEXT[lang][p]; }).join(", ")
      : "";
    var L = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//DharmaSetu//Personal snapshot//" + lang.toUpperCase(),
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "X-WR-CALNAME:" + escapeText(lang === "hi" ? "धर्मसेतु — मेरे चुने दिन" : "DharmaSetu — my chosen days"),
      "X-WR-CALDESC:" + escapeText(lang === "hi"
        ? "एक बार का स्नैपशॉट; अपने-आप अपडेट नहीं होता। तिथियाँ नई दिल्ली संदर्भ पर।"
        : "One-time snapshot; does not update itself. Dates use the New Delhi reference.")
    ];
    var seen = {};
    events.forEach(function (e) {
      // Guard: never emit two VEVENTs with one UID in a file (a data collision would make clients drop one).
      var uid = seen[e.uid] ? e.uid.replace("@", "-" + e.date + "@") : e.uid; seen[e.uid] = true;
      var title = lang === "hi" ? (e.title_hi || e.title_en) : e.title_en;
      var why = lang === "hi" ? (e.why_hi || e.why_en) : e.why_en;
      var story = lang === "hi" ? (e.story_hi || e.story_en) : e.story_en;
      var desc = [why, story ? (lang === "hi" ? "कथा: " : "Story: ") + story : "", practiceNote,
        lang === "hi" ? "संदर्भ: नई दिल्ली पंचांग। अपने कुल-पुरोहित या स्थानीय पंचांग से पुष्टि करें।"
                      : "Reference: New Delhi panchang. Confirm with your kul-purohit or local panchang.",
        base + "calendar.html#" + e.id].filter(Boolean).join("\n");
      L.push("BEGIN:VEVENT",
        // Same identity key as the public feeds (frozen once published; never regenerated when a date is corrected).
        "UID:" + uid,
        "DTSTAMP:" + utcStamp(now),
        "SEQUENCE:" + (Number.isInteger(e.sequence) ? e.sequence : 0),
        "DTSTART;VALUE=DATE:" + ymd(e.date),
        "DTEND;VALUE=DATE:" + ymd(nextDay(e.date)),
        "SUMMARY:" + escapeText(title),
        "DESCRIPTION:" + escapeText(desc),
        "CATEGORIES:" + e.categories.map(escapeText).join(","),
        "TRANSP:TRANSPARENT",
        "URL:" + base + "calendar.html#" + e.id);
      if (trig) {
        L.push("BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:" + trig,
          "DESCRIPTION:" + escapeText(title), "END:VALARM");
      }
      L.push("END:VEVENT");
    });
    L.push("END:VCALENDAR");
    return L.map(foldLine).join("\r\n") + "\r\n";
  }
  return { PREFS_KEY: PREFS_KEY, SCHEMA_VERSION: SCHEMA_VERSION, CATEGORY_IDS: CATEGORY_IDS, PRACTICES: PRACTICES,
    defaults: defaults, validatePrefs: validatePrefs, loadPrefs: loadPrefs, savePrefs: savePrefs, deletePrefs: deletePrefs,
    isValidTimeZone: isValidTimeZone, detectTimeZone: detectTimeZone, selectEvents: selectEvents, todayISO: todayISO,
    escapeText: escapeText, foldLine: foldLine, nextDay: nextDay, alarmTrigger: alarmTrigger, buildICS: buildICS };
});
