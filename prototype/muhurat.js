(function () {
  "use strict";
  var P = {
    naming: { en: "Baby’s naming", hi: "शिशु का नामकरण",
      prac: [["Mother’s and baby’s rest and health come first — the date can move.", "माँ और शिशु का विश्राम व स्वास्थ्य पहले — तिथि आगे-पीछे हो सकती है।"],
             ["Ask elders which naming customs your family keeps.", "बड़ों से पूछें कि परिवार में नामकरण की कौन-सी रीति है।"],
             ["Shortlist two or three names before the day.", "दिन से पहले दो-तीन नाम चुन लें।"]],
      trad: [["Many families hold Namakaran around the 11th or 12th day, or later — customs vary.", "कई परिवार ११वें-१२वें दिन या बाद में नामकरण करते हैं — रीतियाँ भिन्न हैं।"],
             ["Some choose a first syllable linked to the birth nakshatra.", "कुछ लोग जन्म-नक्षत्र से जुड़ा पहला अक्षर चुनते हैं।"]],
      guide: "namakaran.html" },
    griha: { en: "New home", hi: "गृह प्रवेश",
      prac: [["Possession, registration and loan dates fix your real window.", "कब्ज़ा, रजिस्ट्री और ऋण की तिथियाँ असली समय-सीमा तय करती हैं।"],
             ["Keep a weekend option so family can attend.", "सप्ताहांत का विकल्प रखें ताकि परिवार आ सके।"]],
      trad: [["Families often prefer a calm morning and avoid certain lunar days; your purohit will name them.", "परिवार अक्सर शांत सुबह चुनते हैं और कुछ तिथियाँ टालते हैं; पुरोहित बताएँगे।"],
             ["A small puja and sharing food with neighbours is common.", "छोटी पूजा और पड़ोसियों के साथ भोजन बाँटना आम है।"]] },
    job: { en: "New job", hi: "नई नौकरी",
      prac: [["Your offer letter and notice period decide the joining date — never risk them for timing.", "ऑफ़र लेटर और नोटिस अवधि ही जॉइनिंग तय करते हैं — समय के लिए इन्हें जोखिम में न डालें।"],
             ["If you have flexibility, pick a day you can arrive rested.", "छूट हो तो ऐसा दिन चुनें जब आप विश्राम करके पहुँचें।"]],
      trad: [["Some families mark the first day with a short prayer at home — it fits any date.", "कुछ परिवार पहले दिन घर पर छोटी प्रार्थना करते हैं — यह किसी भी तिथि पर हो सकती है।"]] },
    marriage: { en: "Wedding", hi: "विवाह",
      prac: [["Venue, travel and family availability narrow the dates first.", "स्थल, यात्रा और परिवार की उपलब्धता पहले तिथियाँ तय करते हैं।"],
             ["Book early around popular wedding seasons.", "लोकप्रिय विवाह-मौसम में जल्दी बुकिंग करें।"]],
      trad: [["Wedding muhurats are chosen by a purohit using both families’ details — this site does not do that.", "विवाह मुहूर्त पुरोहित दोनों परिवारों के विवरण से चुनते हैं — यह साइट ऐसा नहीं करती।"],
             ["Many families avoid weddings in Pitru Paksha and certain months.", "कई परिवार पितृ पक्ष और कुछ महीनों में विवाह नहीं करते।"]] },
    travel: { en: "Travel / visa", hi: "यात्रा / वीज़ा",
      prac: [["Visa appointments, fares and leave come first — take the slot you get.", "वीज़ा अपॉइंटमेंट, किराया और छुट्टी पहले — जो स्लॉट मिले, ले लें।"],
             ["Keep documents ready a week ahead.", "एक सप्ताह पहले दस्तावेज़ तैयार रखें।"]],
      trad: [["Some families say a short prayer before setting out — it works on any day.", "कुछ परिवार निकलने से पहले छोटी प्रार्थना करते हैं — यह किसी भी दिन हो सकती है।"]] }
  };
  var events = [];
  function lang() { return document.documentElement.lang === "hi" ? "hi" : "en"; }
  function t(en, hi) { return lang() === "hi" ? hi : en; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function mlabel(ym) { return new Date(ym + "-15T12:00:00Z").toLocaleDateString(lang() === "hi" ? "hi-IN" : "en-IN", { month: "long", year: "numeric", timeZone: "UTC" }); }
  var today = (window.DSCore ? DSCore.todayISO(new Date()) : new Date().toISOString().slice(0, 10));
  function months() {
    var out = [], y = +today.slice(0, 4), m = +today.slice(5, 7);
    for (var i = 0; i < 6; i++) { var mm = ((m - 1 + i) % 12) + 1, yy = y + Math.floor((m - 1 + i) / 12); var k = yy + "-" + (mm < 10 ? "0" : "") + mm; if (k <= "2027-12") out.push(k); }
    return out;
  }
  function fillMonths() {
    var s = document.getElementById("month"), cur = s.value; s.textContent = "";
    months().forEach(function (k) { var o = el("option", null, mlabel(k)); o.value = k; s.appendChild(o); });
    if (cur) s.value = cur;
  }
  function list(title, rows) {
    var w = el("div"); w.appendChild(el("h3", null, title)); var ul = el("ul");
    rows.forEach(function (r) { ul.appendChild(el("li", null, t(r[0], r[1]))); }); w.appendChild(ul); return w;
  }
  function render() {
    var key = (document.querySelector("input[name=moment]:checked") || {}).value || "naming", p = P[key];
    var ym = document.getElementById("month").value, box = document.getElementById("plan"); box.textContent = "";
    box.appendChild(el("h2", null, t("2 · Your plan — ", "२ · आपकी योजना — ") + t(p.en, p.hi) + " · " + (ym ? mlabel(ym) : "")));
    box.appendChild(list(t("Practical first", "पहले व्यावहारिक बातें"), p.prac));
    box.appendChild(list(t("What tradition usually looks at", "परंपरा आमतौर पर क्या देखती है"), p.trad));
    var inMonth = events.filter(function (e) { return e.date.slice(0, 7) === ym && e.date >= today && e.categories.some(function (c) { return c === "festivals" || c === "ancestral" || c === "ekadashi"; }); });
    var w = el("div"); w.appendChild(el("h3", null, t("Days in this month worth knowing", "इस महीने के जानने योग्य दिन")));
    w.appendChild(el("p", "note", t("From our New Delhi reference calendar — to plan around, not a personal muhurat.", "हमारे नई दिल्ली संदर्भ पंचांग से — योजना के लिए, व्यक्तिगत मुहूर्त नहीं।")));
    var ul = el("ul");
    inMonth.slice(0, 8).forEach(function (e) {
      var li = el("li"), a = el("a", null, new Date(e.date + "T12:00:00Z").toLocaleDateString(lang() === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) + " — " + (lang() === "hi" ? e.title_hi : e.title_en));
      a.href = "calendar.html#" + e.id; li.appendChild(a); ul.appendChild(li);
    });
    if (!inMonth.length) ul.appendChild(el("li", null, t("No major observances listed for this month.", "इस महीने कोई प्रमुख पर्व सूचीबद्ध नहीं।")));
    w.appendChild(ul); box.appendChild(w);
    var row = el("div", "rm-actions");
    if (p.guide) { var g = el("a", "btn btn-primary", t("Read the Namakaran guide", "नामकरण मार्गदर्शिका पढ़ें")); g.href = p.guide; row.appendChild(g); }
    var msg = "Namaste, I'm planning: " + p.en + " (" + (ym || "") + "). Could your team help me?";
    var wa = el("a", "btn " + (p.guide ? "btn-ghost" : "btn-primary"), t("Ask our team on WhatsApp", "व्हाट्सऐप पर हमारी टीम से पूछें"));
    wa.href = "https://wa.me/917239062622?text=" + encodeURIComponent(msg); wa.target = "_blank"; wa.rel = "noopener"; row.appendChild(wa);
    var rm = el("a", "btn btn-ghost", t("Remember key days", "मुख्य दिन याद रखें")); rm.href = "remember.html"; row.appendChild(rm);
    box.appendChild(row);
    box.appendChild(el("p", "note", t("Our team replies personally and can suggest a purohit; we don’t book or charge through this site yet.", "हमारी टीम स्वयं उत्तर देती है और पुरोहित सुझा सकती है; अभी इस साइट से बुकिंग या भुगतान नहीं होता।")));
  }
  document.getElementById("moment-box").addEventListener("change", render);
  document.getElementById("month").addEventListener("change", render);
  document.addEventListener("ds:lang", function () { fillMonths(); render(); });
  fillMonths(); render();
  fetch("calendar-data.json").then(function (r) { return r.json(); }).then(function (d) { events = d.events || []; render(); window.__dsReady = true; }).catch(function () {});
})();
