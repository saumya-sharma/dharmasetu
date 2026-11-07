/* Remember-a-day journey. All user text rendered via textContent; nothing leaves the device. */
(function () {
  "use strict";
  var C = window.DSCore, form = document.getElementById("rm-form");
  var CAT_INFO = {
    "festivals": ["Festivals", "त्योहार", "Diwali, Holi, Navratri and more", "दिवाली, होली, नवरात्रि आदि"],
    "ekadashi": ["Ekadashi", "एकादशी", "Twice a month — for a fast, a food choice or prayer", "महीने में दो बार — व्रत, भोजन-चुनाव या प्रार्थना हेतु"],
    "purnima-amavasya": ["Full & new moon", "पूर्णिमा व अमावस्या", "Purnima and Amavasya each month", "हर महीने पूर्णिमा और अमावस्या"],
    "sankranti": ["Sankranti", "संक्रांति", "The sun’s monthly move, incl. Makar Sankranti", "सूर्य का मासिक संक्रमण, मकर संक्रांति सहित"],
    "ancestral": ["Ancestral days", "पितृ-दिवस", "Pitru Paksha and days for remembering family", "पितृ पक्ष और पूर्वजों को याद करने के दिन"],
    "birth-auspicious": ["Birth-rite days", "जन्म-संस्कार दिवस", "Days families often look at for naming and early rites", "नामकरण व आरंभिक संस्कारों हेतु परिवार अक्सर देखते हैं"]
  };
  var EVID = { "Established": ["Evidence: established", "प्रमाण: स्थापित"], "Plausible": ["Evidence: plausible", "प्रमाण: संभावित"], "Cultural/psychological": ["Cultural meaning", "सांस्कृतिक अर्थ"] };
  var events = [], state = C.defaults(), saved = false;
  var params = new URLSearchParams(location.search);
  var today = /^\d{4}-\d{2}-\d{2}$/.test(params.get("today") || "") ? params.get("today") : null;

  function lang() { return document.documentElement.lang === "hi" ? "hi" : "en"; }
  function t(en, hi) { return lang() === "hi" ? hi : en; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmtDate(iso) {
    return new Date(iso + "T12:00:00Z").toLocaleDateString(lang() === "hi" ? "hi-IN" : "en-IN",
      { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }
  function nowISO() { return today || C.todayISO(new Date(), state.tz); }
  function upcoming() { var d = nowISO(); return events.filter(function (e) { return e.date >= d; }); }
  function status(msg, err) { var s = document.getElementById("status"); s.textContent = msg; s.className = "status" + (err ? " err" : ""); }

  function renderCats() {
    var g = document.getElementById("cat-grid"), up = upcoming(); g.textContent = "";
    C.CATEGORY_IDS.forEach(function (id) {
      var info = CAT_INFO[id], n = up.filter(function (e) { return e.categories.indexOf(id) !== -1 && e.verify !== true && (state.includeRef || C.isChecked(e)); }).length;
      var lab = el("label", "opt"), cb = el("input"); cb.type = "checkbox"; cb.name = "cat"; cb.value = id;
      cb.checked = state.cats.indexOf(id) !== -1;
      var txt = el("span"); txt.appendChild(document.createTextNode(t(info[0], info[1]) + " "));
      txt.appendChild(el("span", "tag", String(n)));
      txt.appendChild(el("small", null, t(info[2], info[3])));
      lab.appendChild(cb); lab.appendChild(txt); g.appendChild(lab);
    });
  }
  function renderPicks() {
    var box = document.getElementById("ev-pick"), month = ""; box.textContent = "";
    var up = upcoming().filter(function (e) { return e.verify !== true && (state.includeRef || C.isChecked(e)); });
    if (!up.length) { box.appendChild(el("p", "note", t("No upcoming days left in this calendar range.", "इस पंचांग अवधि में आगे कोई दिन नहीं।"))); return; }
    up.forEach(function (e) {
      var m = new Date(e.date + "T12:00:00Z").toLocaleDateString(lang() === "hi" ? "hi-IN" : "en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
      if (m !== month) { month = m; box.appendChild(el("h3", null, m)); }
      var lab = el("label", "opt"), cb = el("input"); cb.type = "checkbox"; cb.name = "pick"; cb.value = e.id;
      cb.checked = state.picks.indexOf(e.id) !== -1;
      lab.appendChild(cb); lab.appendChild(el("span", null, fmtDate(e.date) + " — " + (lang() === "hi" ? e.title_hi : e.title_en)));
      box.appendChild(lab);
    });
  }
  function renderPreview() {
    var list = C.selectEvents(events, state, nowISO()), ul = document.getElementById("pv-list"); ul.textContent = "";
    var count = document.getElementById("pv-count");
    if (!list.length) {
      var ended = upcoming().length === 0;
      count.textContent = ended ? t("This reference calendar ends on 31 Dec 2027 — no upcoming days left.", "यह संदर्भ पंचांग 31 दिसंबर 2027 तक है — आगे कोई दिन नहीं।")
        : t("Nothing chosen yet — pick at least one kind of day or date above.", "अभी कुछ नहीं चुना — ऊपर कम से कम एक प्रकार या दिन चुनें।");
    } else {
      count.textContent = t(list.length + " upcoming days. Your next ones:", "आगे " + list.length + " दिन। अगले कुछ:");
    }
    var held = C.selectEvents(events, state, nowISO(), { includeRef: true }).length - list.length;
    if (held > 0) count.textContent += " " + t("(" + held + " reference days not yet checked are left out.)", "(" + held + " अजाँचे संदर्भ दिन शामिल नहीं।)");
    if (state.includeRef) count.textContent += " " + t("Includes reference days not yet checked.", "अजाँचे संदर्भ दिन शामिल हैं।");
    document.getElementById("dl-ics").disabled = !list.length;
    list.slice(0, 5).forEach(function (e) {
      var hi = lang() === "hi", li = el("li");
      var top = el("div"); top.appendChild(el("span", "pv-date", fmtDate(e.date))); li.appendChild(top);
      var title = el("div", "pv-title", hi ? e.title_hi : e.title_en);
      if (C.isChecked(e)) title.appendChild(el("span", "tag ok", t("Date checked: Drik Panchang", "तिथि जाँची: दृक पंचांग")));
      else title.appendChild(el("span", "tag", t("Reference — not yet checked", "संदर्भ — अभी जाँचा नहीं")));
      li.appendChild(title);
      li.appendChild(el("p", "note", hi ? e.why_hi : e.why_en));
      if (e.variant_note_en) li.appendChild(el("p", "note", hi ? e.variant_note_hi : e.variant_note_en));
      var d = el("details", "more"), s = el("summary", null, t("Story & reasoning", "कथा और कारण")); d.appendChild(s);
      if (e.story_en) d.appendChild(el("p", "note", hi ? e.story_hi : e.story_en));
      if (e.story_source) d.appendChild(el("p", "note", t("Source: ", "स्रोत: ") + e.story_source));
      if (e.modern_en) d.appendChild(el("p", "note", hi ? e.modern_hi : e.modern_en));
      if (EVID[e.evidence]) { var ev = el("p", "note"); ev.appendChild(el("span", "tag", EVID[e.evidence][hi ? 1 : 0])); d.appendChild(ev); }
      if (e.reasoning_id && /^[a-z0-9-]+$/.test(e.reasoning_id)) { var a = el("a", null, t("Read in the reasoning library →", "कारण-पुस्तकालय में पढ़ें →")); a.href = "reasoning.html#" + e.reasoning_id; d.appendChild(a); }
      li.appendChild(d); ul.appendChild(li);
    });
    var sub = document.getElementById("sub-links"); sub.textContent = "";
    if (state.mode === "categories" && state.cats.length) {
      sub.appendChild(document.createTextNode(t("Want dates that stay corrected automatically? Subscribe to a public feed instead: ", "अपने-आप सुधरने वाली तिथियाँ चाहिए? सार्वजनिक फ़ीड सब्सक्राइब करें: ")));
      state.cats.forEach(function (c, i) {
        var a = el("a", null, t(CAT_INFO[c][0], CAT_INFO[c][1]));
        a.href = "https://calendar.google.com/calendar/r?cid=webcal://saumya-sharma.github.io/dharmasetu/review/dharmasetu-" + c + ".ics";
        a.target = "_blank"; a.rel = "noopener";
        if (i) sub.appendChild(document.createTextNode(" · ")); sub.appendChild(a);
      });
    }
  }
  function writeForm() {
    form.querySelectorAll("input[name=mode]").forEach(function (r) { r.checked = r.value === state.mode; });
    form.querySelectorAll("input[name=lang]").forEach(function (r) { r.checked = r.value === state.lang; });
    form.querySelectorAll("input[name=practice]").forEach(function (c) { c.checked = state.practices.indexOf(c.value) !== -1; });
    document.getElementById("lead").value = state.remind.lead;
    document.getElementById("time").value = state.remind.time;
    document.getElementById("include-ref").checked = state.includeRef;
    document.getElementById("city").value = state.city;
    document.getElementById("tradition").value = state.tradition;
    syncMode(); renderCats(); renderPicks(); renderPreview();
  }
  function readForm() {
    var g = function (sel) { return Array.prototype.map.call(form.querySelectorAll(sel), function (x) { return x.value; }); };
    state = C.validatePrefs({
      v: C.SCHEMA_VERSION, lang: (form.querySelector("input[name=lang]:checked") || {}).value,
      mode: (form.querySelector("input[name=mode]:checked") || {}).value,
      cats: g("input[name=cat]:checked"), picks: g("input[name=pick]:checked").concat(state.picks.filter(function (id) { return !form.querySelector('input[name=pick][value="' + id + '"]'); })),
      practices: g("input[name=practice]:checked"),
      tz: state.tz, includeRef: document.getElementById("include-ref").checked, city: document.getElementById("city").value,
      tradition: document.getElementById("tradition").value,
      remind: { lead: document.getElementById("lead").value, time: document.getElementById("time").value }
    }).prefs;
  }
  function syncMode() {
    var ev = state.mode === "events";
    document.getElementById("cats-box").hidden = ev; document.getElementById("events-box").hidden = !ev;
    var t2 = document.getElementById("time"); t2.disabled = state.remind.lead === "none";
  }
  function showSaved() { document.getElementById("saved-box").hidden = !saved; }

  // time options 05:00–22:00 every 30 min
  var ts = document.getElementById("time");
  for (var h = 5; h <= 22; h++) ["00", "30"].forEach(function (m) {
    var v = (h < 10 ? "0" : "") + h + ":" + m, o = el("option", null, v); o.value = v; ts.appendChild(o);
  });

  form.addEventListener("change", function (e) {
    var wasLang = state.lang; readForm();
    if (e.target.name === "lang" && state.lang !== wasLang && window.DSLang) { window.DSLang.set(state.lang); return; }
    syncMode(); if (e.target.name === "mode" || e.target.name === "includeRef") { renderCats(); renderPicks(); }
    renderPreview();
    if (saved) status(t("Changed — press “Save on this device” to keep it.", "बदला — रखने के लिए “इस डिवाइस पर सहेजें” दबाएँ।"));
  });
  document.addEventListener("ds:lang", function (e) {
    if (!events.length) return;
    state.lang = e.detail.lang; writeForm();
  });
  document.getElementById("dl-ics").addEventListener("click", function () {
    readForm();
    var list = C.selectEvents(events, state, nowISO());
    if (!list.length) return status(t("Choose at least one day first.", "पहले कम से कम एक दिन चुनें।"), true);
    var blob = new Blob([C.buildICS(list, state, {})], { type: "text/calendar;charset=utf-8" });
    var a = el("a"); a.href = URL.createObjectURL(blob); a.download = "dharmasetu-my-days.ics";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    status(t("Downloaded " + list.length + " days. Open the file to add them to your calendar.", list.length + " दिन डाउनलोड हुए। कैलेंडर में जोड़ने के लिए फ़ाइल खोलें।"));
  });
  document.getElementById("save-prefs").addEventListener("click", function () {
    readForm();
    try { state = C.savePrefs(localStorage, state); saved = true; showSaved(); status(t("Saved on this device only.", "केवल इस डिवाइस पर सहेजा गया।")); }
    catch (e) { status(t("Couldn’t save — this browser may block storage.", "सहेज नहीं सके — ब्राउज़र स्टोरेज रोक रहा हो सकता है।"), true); }
  });
  document.getElementById("delete-prefs").addEventListener("click", function () {
    C.deletePrefs(localStorage); saved = false; state = C.defaults(); state.lang = lang(); showSaved(); writeForm();
    status(t("Saved choices deleted from this device.", "सहेजे चुनाव इस डिवाइस से मिटा दिए गए।"));
  });
  document.getElementById("reset-form").addEventListener("click", function () {
    state = C.defaults(); state.lang = lang(); writeForm(); status(t("Back to the start. Saved choices (if any) are unchanged.", "शुरुआत पर वापस। सहेजे चुनाव (यदि हों) वैसे ही हैं।"));
    document.getElementById("step1").focus();
  });
  document.getElementById("export-prefs").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify(C.validatePrefs(state).prefs, null, 2)], { type: "application/json" });
    var a = el("a"); a.href = URL.createObjectURL(blob); a.download = "dharmasetu-settings.json";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  });

  var stored = null; try { stored = C.loadPrefs(localStorage); } catch (e) {}
  if (stored) { state = stored; saved = true; if (window.DSLang && !params.get("lang")) window.DSLang.set(state.lang); }
  state.lang = lang();
  var preset = params.get("cat"); if (!stored && preset && C.CATEGORY_IDS.indexOf(preset) !== -1) state.cats = [preset];
  showSaved();
  fetch("calendar-data.json").then(function (r) { return r.json(); }).then(function (d) {
    events = d.events || []; writeForm();
    window.__dsReady = true;
  }).catch(function () { status(t("Couldn’t load the calendar. Please refresh.", "पंचांग लोड नहीं हुआ। कृपया रीफ़्रेश करें।"), true); });
})();
