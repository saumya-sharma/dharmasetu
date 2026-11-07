/* Sangam composer + consented trust records. No storage, no network sends; WhatsApp only via a link the user presses. */
(function () {
  "use strict";
  var T = window.DSTrust, form = document.getElementById("compose"), step = 1, MAX = 4;
  function lang() { return document.documentElement.lang === "hi" ? "hi" : "en"; }
  function t(en, hi) { return lang() === "hi" ? hi : en; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var MSG = {
    "type.required": ["Choose what you’d like to share.", "चुनें कि आप क्या साझा करना चाहते हैं।"],
    "text.short": ["Please write at least 20 characters.", "कृपया कम से कम 20 अक्षर लिखें।"],
    "text.long": ["Please keep it under 1500 characters.", "कृपया 1500 अक्षरों से कम रखें।"],
    "text.contact": ["Please remove phone numbers or email addresses.", "कृपया फ़ोन नंबर या ईमेल हटाएँ।"],
    "source.url": ["Source must be a full https:// link.", "स्रोत पूरा https:// लिंक होना चाहिए।"],
    "displayName.required": ["Add a display name, or choose anonymous.", "प्रदर्शित नाम लिखें, या गुमनाम चुनें।"],
    "displayName.long": ["Keep the display name under 40 characters.", "प्रदर्शित नाम 40 अक्षरों से कम रखें।"],
    "displayName.contact": ["A display name can’t contain contact details.", "प्रदर्शित नाम में संपर्क विवरण नहीं हो सकता।"],
    "ownConsent.required": ["Please confirm you have permission to share this.", "कृपया पुष्टि करें कि आपको साझा करने की अनुमति है।"]
  };
  var STEP_FIELDS = { 1: ["type"], 2: ["text", "source"], 3: ["displayName", "ownConsent"], 4: [] };
  function read() {
    var f = form.elements, r = form.querySelector("input[name=type]:checked"), a = form.querySelector("input[name=attribution]:checked");
    return { type: r ? r.value : "", title: f.title.value, text: f.text.value, region: f.region.value, language: f.language.value,
      source: f.source.value, attribution: a ? a.value : "anonymous", displayName: f.displayName.value,
      ownConsent: f.ownConsent.checked, publishOk: f.publishOk.checked, resourceInterest: f.resourceInterest.checked };
  }
  function showErrors(errors, fields) {
    var first = null, msgs = [];
    ["type", "text", "source", "displayName", "ownConsent"].forEach(function (k) {
      var box = document.getElementById("err-" + k), on = fields.indexOf(k) !== -1 && errors[k];
      var m = on ? MSG[k + "." + errors[k]] : null;
      if (box) box.textContent = m ? t(m[0], m[1]) : "";
      var input = k === "type" ? form.querySelector("input[name=type]") : form.elements[k];
      if (input && input.setAttribute) input.setAttribute("aria-invalid", m ? "true" : "false");
      if (m) { msgs.push(t(m[0], m[1])); if (!first) first = input; }
    });
    document.getElementById("form-errors").textContent = msgs.join(" ");
    if (first && first.focus) first.focus();
    return !msgs.length;
  }
  function render() {
    form.querySelectorAll("fieldset[data-step]").forEach(function (fs) { fs.hidden = Number(fs.getAttribute("data-step")) !== step; });
    document.getElementById("back").hidden = step === 1;
    document.getElementById("next").hidden = step === MAX;
    document.getElementById("step-label").textContent = t("Step " + step + " of " + MAX, "चरण " + step + " / " + MAX);
    document.getElementById("name-field").hidden = (form.querySelector("input[name=attribution]:checked") || {}).value !== "name";
    document.getElementById("text-count").textContent = "(" + form.elements.text.value.length + "/1500)";
    if (step === MAX) buildPreview();
  }
  var current = "";
  function buildPreview() {
    var r = T.validateContribution(read());
    current = T.draftText(r.value);
    document.getElementById("preview").textContent = current; // textContent: never parsed as HTML
    var url = T.whatsappDraftUrl(current), wa = document.getElementById("wa-draft");
    wa.hidden = !url; if (url) wa.href = url; else wa.removeAttribute("href");
    document.getElementById("wa-too-long").hidden = !!url;
    document.getElementById("draft-status").textContent = "";
  }
  function download(name, text, type) {
    var a = el("a"); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  function status(m) { document.getElementById("draft-status").textContent = m; }

  document.getElementById("next").addEventListener("click", function () {
    var r = T.validateContribution(read());
    if (!showErrors(r.errors, STEP_FIELDS[step])) return;
    // final gate before review: everything must be valid
    if (step === 3 && !showErrors(r.errors, ["type", "text", "source", "displayName", "ownConsent"])) return;
    step = Math.min(MAX, step + 1); render();
    var fs = form.querySelector('fieldset[data-step="' + step + '"] legend'); if (fs) { fs.setAttribute("tabindex", "-1"); fs.focus(); }
  });
  document.getElementById("back").addEventListener("click", function () { step = Math.max(1, step - 1); showErrors({}, []); render(); });
  document.getElementById("clear").addEventListener("click", function () { form.reset(); step = 1; showErrors({}, []); render(); form.focus(); });
  form.addEventListener("input", function () { if (step !== MAX) render(); });
  form.addEventListener("change", function () { if (step !== MAX) render(); });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  document.getElementById("dl-txt").addEventListener("click", function () { download("dharmasetu-sangam-draft.txt", current, "text/plain;charset=utf-8"); status(t("Downloaded. Not submitted — share it with our team when you’re ready.", "डाउनलोड हुआ। जमा नहीं हुआ — तैयार हों तब टीम से साझा करें।")); });
  document.getElementById("dl-json").addEventListener("click", function () { download("dharmasetu-sangam-draft.json", T.draftJSON(T.validateContribution(read()).value), "application/json"); status(t("Downloaded. Not submitted.", "डाउनलोड हुआ। जमा नहीं हुआ।")); });
  document.getElementById("copy-draft").addEventListener("click", function () {
    var ok = function () { status(t("Copied. Not submitted — paste it into WhatsApp or email when ready.", "कॉपी हुआ। जमा नहीं हुआ — तैयार हों तब व्हाट्सऐप या ईमेल में चिपकाएँ।")); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(current).then(ok, function () { status(t("Couldn’t copy — please use Download.", "कॉपी नहीं हुआ — कृपया डाउनलोड करें।")); });
    else status(t("Copy isn’t available here — please use Download.", "यहाँ कॉपी उपलब्ध नहीं — कृपया डाउनलोड करें।"));
  });
  document.addEventListener("ds:lang", function () { render(); });
  render();

  /* ---------- consented records (empty until real, approved content is added) ---------- */
  function renderPeople(d) {
    var A = T.publicAcharyas(d.acharyas), Q = T.publicTestimonials(d.testimonials), hi = lang() === "hi";
    var gl = document.getElementById("guides-list"); gl.textContent = "";
    A.forEach(function (a) {
      var c = el("article", "card rm-step");
      if (a.photo) { var img = el("img"); img.src = a.photo; img.alt = a.name; img.width = 96; img.height = 96; img.loading = "lazy"; img.style.borderRadius = "12px"; c.appendChild(img); }
      c.appendChild(el("h3", null, hi && a.name_hi ? a.name_hi : a.name));
      var meta = [a.tradition, a.region, a.languages.join(", ")].filter(Boolean).join(" · "); if (meta) c.appendChild(el("p", "note", meta));
      var bio = hi && a.bio_hi ? a.bio_hi : a.bio_en; if (bio) c.appendChild(el("p", null, bio));
      c.appendChild(el("p", "note", t("Checked by our team on ", "हमारी टीम द्वारा जाँचा गया: ") + a.verification.date + " (" + a.verification.method + "): " + a.verification.checked.join(", ")));
      if (a.video) { var v = el("a", null, t("Watch introduction (opens external site)", "परिचय देखें (बाहरी साइट)")); v.href = a.video; v.target = "_blank"; v.rel = "noopener noreferrer"; c.appendChild(v); }
      gl.appendChild(c);
    });
    gl.hidden = !A.length;
    var vl = document.getElementById("voices-list"); vl.textContent = "";
    Q.forEach(function (q) {
      var f = el("figure", "card rm-step"); f.style.margin = "0";
      f.appendChild(el("blockquote", null, "“" + (hi && q.quote_hi ? q.quote_hi : (q.quote_en || q.quote_hi)) + "”"));
      var cap = [q.credit || t("Shared anonymously", "गुमनाम रूप से साझा"), q.region,
        q.source_type === "product-use" ? t("about using DharmaSetu", "धर्मसेतु के उपयोग पर") : t("about a family tradition", "पारिवारिक परंपरा पर")].filter(Boolean).join(" · ");
      f.appendChild(el("figcaption", "note", cap)); vl.appendChild(f);
    });
    document.getElementById("voices").hidden = !Q.length;
  }
  var people = { acharyas: [], testimonials: [] };
  fetch("data/people.json").then(function (r) { return r.json(); }).then(function (d) { people = d || people; renderPeople(people); window.__dsReady = true; })
    .catch(function () { renderPeople(people); window.__dsReady = true; });
  document.addEventListener("ds:lang", function () { renderPeople(people); });
})();
