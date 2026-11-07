/* DharmaSetu trust + community core (pure; browser window.DSTrust, Node module). */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api; else root.DSTrust = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var TEAM_WA = "917239062622"; // existing site-wide WhatsApp CTA
  var TYPES = ["story", "ritual", "term", "experience", "resource"];
  var LIMITS = { title: 80, text: 1500, region: 60, language: 40, name: 40, url: 300 };
  var WA_MAX_TEXT = 1500; // keep the prefilled draft comfortably short; longer → copy/download fallback
  var VIDEO_HOSTS = ["www.youtube.com", "youtube.com", "youtu.be", "vimeo.com", "player.vimeo.com"];
  var PHONE_RE = /(?:\+?\d[\s-]?){10,}/;
  var EMAIL_RE = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;

  function str(v) { return typeof v === "string" ? v : ""; }
  function clean(s, max) { return str(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max); }
  function httpsUrl(u, hosts) {
    u = str(u).trim(); if (!u || u.length > LIMITS.url) return null;
    var p; try { p = new URL(u); } catch (e) { return null; }
    if (p.protocol !== "https:" || p.username || p.password) return null;
    if (hosts && hosts.indexOf(p.hostname.toLowerCase()) === -1) return null;
    return p.href;
  }
  /* Local photo only: relative path under assets/people/, raster formats (no SVG: could carry script). */
  function safePhoto(p) {
    p = str(p); return /^assets\/people\/[a-z0-9-]{1,60}\.(jpg|jpeg|png|webp)$/.test(p) ? p : null;
  }
  function blank() {
    return { type: "", title: "", text: "", region: "", language: "", source: "", attribution: "anonymous", displayName: "",
      ownConsent: false, publishOk: false, resourceInterest: false };
  }
  /* Returns { value, errors: {field: code} }. Errors are codes; UI translates. */
  function validateContribution(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    var v = {
      type: TYPES.indexOf(raw.type) !== -1 ? raw.type : "",
      title: clean(raw.title, LIMITS.title), text: clean(raw.text, LIMITS.text + 1),
      region: clean(raw.region, LIMITS.region), language: clean(raw.language, LIMITS.language),
      source: str(raw.source).trim(),
      attribution: raw.attribution === "name" ? "name" : "anonymous",
      displayName: clean(raw.displayName, LIMITS.name + 1),
      ownConsent: raw.ownConsent === true, publishOk: raw.publishOk === true, resourceInterest: raw.resourceInterest === true
    };
    var e = {};
    if (!v.type) e.type = "required";
    if (v.text.length < 20) e.text = "short"; else if (v.text.length > LIMITS.text) e.text = "long";
    var all = [v.title, v.text, v.region, v.language, v.displayName].join(" ");
    if (PHONE_RE.test(all) || EMAIL_RE.test(all)) e.text = e.text || "contact";
    if (v.source) { var s = httpsUrl(v.source); if (!s) e.source = "url"; else v.source = s; }
    if (v.attribution === "name") {
      if (!v.displayName) e.displayName = "required";
      else if (v.displayName.length > LIMITS.name) e.displayName = "long";
      else if (PHONE_RE.test(v.displayName) || EMAIL_RE.test(v.displayName)) e.displayName = "contact";
    } else v.displayName = "";
    if (!v.ownConsent) e.ownConsent = "required";
    return { value: v, errors: e };
  }
  var TYPE_LABEL = { story: "Story", ritual: "Ritual", term: "Local term", experience: "Experience", resource: "Resource" };
  function draftText(v) {
    return [
      "DharmaSetu Sangam — contribution DRAFT (not yet reviewed)",
      "Type: " + TYPE_LABEL[v.type],
      v.title ? "Title: " + v.title : "",
      v.region ? "Region: " + v.region : "",
      v.language ? "Language: " + v.language : "",
      v.source ? "Source: " + v.source : "",
      "", v.text, "",
      "Credit: " + (v.attribution === "name" ? v.displayName : "Anonymous"),
      "I have permission to share this and it has no one else's private details: yes",
      "May be published after review: " + (v.publishOk ? "yes" : "no — for the team only"),
      "Interested in being a resource person later: " + (v.resourceInterest ? "yes" : "no")
    ].filter(function (x, i, a) { return x !== "" || (a[i - 1] !== "" && i > 0); }).join("\n");
  }
  function draftJSON(v) {
    return JSON.stringify({ kind: "dharmasetu-sangam-draft", schema: 1, status: "draft-not-submitted",
      type: v.type, title: v.title, text: v.text, region: v.region, language: v.language, source: v.source,
      attribution: v.attribution, displayName: v.displayName,
      permissions: { ownConsent: v.ownConsent, publishOk: v.publishOk, resourceInterest: v.resourceInterest } }, null, 2);
  }
  /* null when too long → UI offers copy/download instead. */
  function whatsappDraftUrl(text) {
    if (str(text).length > WA_MAX_TEXT) return null;
    return "https://wa.me/" + TEAM_WA + "?text=" + encodeURIComponent(text);
  }

  /* ---------- public trust records ---------- */
  var VERIFY_METHODS = ["in-person", "video-call", "reference-check", "document-check"];
  function isDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(str(s)); }
  function publicAcharyas(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (a) {
      if (!a || typeof a !== "object") return null;
      var c = a.consent || {}, ed = a.editorial || {}, vf = a.verification || {};
      if (c.profile_public !== true || ed.approved !== true || !isDate(ed.approved_on)) return null;
      if (!isDate(vf.date) || VERIFY_METHODS.indexOf(vf.method) === -1 || !Array.isArray(vf.checked) || !vf.checked.length) return null;
      if (a.delisted === true) return null;
      var name = clean(a.name, 80); if (!name) return null;
      return {
        id: clean(a.id, 40), name: name, name_hi: clean(a.name_hi, 80),
        tradition: clean(a.tradition, 80), region: clean(a.region, 60), languages: (Array.isArray(a.languages) ? a.languages : []).map(function (x) { return clean(x, 30); }).filter(Boolean).slice(0, 6),
        bio_en: clean(a.bio_en, 400), bio_hi: clean(a.bio_hi, 400),
        photo: c.photo === true ? safePhoto(a.photo) : null,
        video: c.video === true ? httpsUrl(a.video, VIDEO_HOSTS) : null,
        verification: { date: vf.date, method: vf.method, checked: vf.checked.map(function (x) { return clean(x, 60); }).filter(Boolean).slice(0, 6) }
      };
    }).filter(Boolean);
  }
  var SOURCE_TYPES = ["product-use", "tradition-experience"];
  function publicTestimonials(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (t) {
      if (!t || typeof t !== "object") return null;
      var c = t.consent || {}, ed = t.editorial || {};
      if (c.quote_public !== true || ed.approved !== true || !isDate(ed.approved_on) || t.delisted === true) return null;
      if (SOURCE_TYPES.indexOf(t.source_type) === -1) return null;
      var quote = clean(t.quote_en || t.quote_hi, 400); if (!quote) return null;
      var credit = c.credit === "name" && clean(t.name, 60) ? clean(t.name, 60) : (c.credit === "initials" && clean(t.initials, 6) ? clean(t.initials, 6) : "");
      return { id: clean(t.id, 40), quote_en: clean(t.quote_en, 400), quote_hi: clean(t.quote_hi, 400), credit: credit,
        region: clean(t.region, 60), source_type: t.source_type, date: isDate(t.date) ? t.date : "" };
    }).filter(Boolean);
  }
  return { TEAM_WA: TEAM_WA, TYPES: TYPES, LIMITS: LIMITS, WA_MAX_TEXT: WA_MAX_TEXT, VIDEO_HOSTS: VIDEO_HOSTS,
    blank: blank, validateContribution: validateContribution, draftText: draftText, draftJSON: draftJSON,
    whatsappDraftUrl: whatsappDraftUrl, httpsUrl: httpsUrl, safePhoto: safePhoto,
    publicAcharyas: publicAcharyas, publicTestimonials: publicTestimonials };
});
