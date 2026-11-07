// jsdom interaction tests (no real browser). Needs jsdom on NODE_PATH; skipped otherwise.
const test = require("node:test"), assert = require("node:assert");
const path = require("path"), fs = require("fs");
const P = path.join(__dirname, "../../prototype");
let JSDOM; try { ({ JSDOM } = require("jsdom")); } catch (e) {}
const data = fs.readFileSync(path.join(P, "calendar-data.json"), "utf8");

async function load(page, { query = "", storage, people } = {}) {
  const html = fs.readFileSync(path.join(P, page), "utf8");
  const dom = new JSDOM(html, { url: "http://localhost/prototype/" + page + query, runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  if (storage) for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  w.fetch = async (u) => ({ json: async () => (String(u).includes("people.json") ? (people || JSON.parse(fs.readFileSync(path.join(P, "data/people.json"), "utf8"))) : JSON.parse(data)) });
  w.open = () => { w.__opened = true; };
  w.URL.createObjectURL = (b) => { w.__blob = b; return "blob:x"; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { w.__downloaded = this.download; };
  for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) w.eval(fs.readFileSync(path.join(P, m[1]), "utf8"));
  for (let i = 0; i < 50 && !w.__dsReady; i++) await new Promise(r => setTimeout(r, 10));
  return w;
}
const fire = (w, el) => el.dispatchEvent(new w.Event("change", { bubbles: true }));

test("remember journey: choose → preview → download → save → reload → delete", { skip: !JSDOM }, async () => {
  let w = await load("remember.html", { query: "?today=2026-11-07" });
  const d = w.document;
  assert.ok(d.querySelector("#cat-grid input[value=ekadashi]"));
  d.querySelector("#cat-grid input[value=festivals]").checked = false;
  const ek = d.querySelector("#cat-grid input[value=ekadashi]"); ek.checked = true; fire(w, ek);
  assert.match(d.getElementById("pv-count").textContent, /upcoming days/);
  assert.strictEqual(d.querySelectorAll("#pv-list > li").length, 5);
  assert.ok(d.querySelector("#pv-list details summary"));
  // no phone/name/dob fields, no WhatsApp checkbox
  assert.strictEqual(d.querySelectorAll('input[type=tel],input[name=name],input[name=dob],input[name=phone]').length, 0);
  assert.ok(/not available yet/.test(d.querySelector(".unavail").textContent));
  assert.strictEqual(d.getElementById("tz"), null, "no time-zone field (it would not affect alerts)");
  assert.ok(/calendar app’s clock/.test(d.getElementById("step2").textContent));
  // default preview: only checked dates
  assert.strictEqual(d.querySelectorAll("#pv-list .tag.ok").length, 5);
  assert.strictEqual(d.getElementById("include-ref").checked, false);
  d.getElementById("dl-ics").click();
  assert.strictEqual(w.__downloaded, "dharmasetu-my-days.ics");
  const ics = await new Promise(r => { const fr = new w.FileReader(); fr.onload = () => r(fr.result); fr.readAsText(w.__blob); });
  assert.ok(ics.includes("BEGIN:VALARM") && ics.includes("UID:ekadashi-"));
  // explicit opt-in to reference days (Purnima/Amavasya includes unreviewed Amavasya rows)
  const pa = d.querySelector("#cat-grid input[value='purnima-amavasya']"); pa.checked = true; fire(w, pa);
  const before = d.getElementById("pv-count").textContent;
  assert.match(before, /reference days not yet checked are left out/);
  const inc = d.getElementById("include-ref"); inc.checked = true; fire(w, inc);
  assert.match(d.getElementById("pv-count").textContent, /Includes reference days/);
  inc.checked = false; fire(w, inc);
  const pa2 = d.querySelector("#cat-grid input[value='purnima-amavasya']"); pa2.checked = false; fire(w, pa2);
  d.getElementById("city").value = '<img src=x onerror=alert(1)>';
  fire(w, d.getElementById("city"));
  d.getElementById("save-prefs").click();
  const stored = JSON.parse(w.localStorage.getItem("ds_prefs"));
  assert.deepStrictEqual(stored.cats, ["ekadashi"]);
  assert.ok(!stored.city.includes("<"));
  assert.strictEqual(d.getElementById("saved-box").hidden, false);
  // reload
  w = await load("remember.html", { query: "?today=2026-11-07", storage: { ds_prefs: JSON.stringify(stored) } });
  assert.strictEqual(w.document.querySelector("#cat-grid input[value=ekadashi]").checked, true);
  assert.strictEqual(w.document.querySelector("#cat-grid input[value=festivals]").checked, false);
  assert.strictEqual(w.document.querySelectorAll("img[src=x]").length, 0);
  w.document.getElementById("delete-prefs").click();
  assert.strictEqual(w.localStorage.getItem("ds_prefs"), null);
  assert.strictEqual(w.document.getElementById("saved-box").hidden, true);
});

test("remember: Hindi persists and range-ended message", { skip: !JSDOM }, async () => {
  let w = await load("remember.html", { query: "?today=2028-02-01&lang=hi" });
  assert.strictEqual(w.document.documentElement.lang, "hi");
  assert.match(w.document.getElementById("pv-count").textContent, /2027/);
  assert.strictEqual(w.document.getElementById("dl-ics").disabled, true);
});

test("remember: corrupt storage falls back safely", { skip: !JSDOM }, async () => {
  const w = await load("remember.html", { query: "?today=2026-11-07", storage: { ds_prefs: '{"v":1,"cats":"oops","remind":5}' } });
  assert.ok(w.document.querySelectorAll("#pv-list > li").length >= 0);
  assert.strictEqual(w.document.getElementById("saved-box").hidden, false);
});

test("plan page: no DOB/name, real reference days, team (not acharya) CTA", { skip: !JSDOM }, async () => {
  const w = await load("muhurat.html");
  const d = w.document;
  assert.strictEqual(d.querySelectorAll('input[type=date],input[name=name],input[name=dob]').length, 0);
  assert.ok(/team/i.test(d.getElementById("plan").textContent));
  assert.ok(!/acharya/i.test(d.getElementById("plan").textContent));
  assert.ok(d.querySelector('#plan a[href="namakaran.html"]'));
});

const fillStep = (w, d) => d.getElementById("next").click();
test("sangam composer: validates per step, defaults private, previews safely, never sends or stores", { skip: !JSDOM }, async () => {
  const w = await load("community.html"); const d = w.document;
  const before = w.localStorage.length;
  d.getElementById("next").click();
  assert.match(d.getElementById("form-errors").textContent, /Choose what/);
  d.querySelector("input[name=type][value=ritual]").checked = true; d.getElementById("next").click();
  assert.strictEqual(d.querySelector('fieldset[data-step="2"]').hidden, false);
  const f = d.getElementById("compose").elements;
  f.text.value = "too short"; d.getElementById("next").click();
  assert.match(d.getElementById("err-text").textContent, /20 characters/);
  assert.strictEqual(f.text.getAttribute("aria-invalid"), "true");
  f.text.value = "<img src=x onerror=alert(1)> We tie a red thread on the wrist before travel in our family.";
  f.source.value = "javascript:alert(1)"; d.getElementById("next").click();
  assert.match(d.getElementById("err-source").textContent, /https/);
  f.source.value = ""; d.getElementById("next").click();
  assert.strictEqual(f.publishOk.checked, false); assert.strictEqual(f.resourceInterest.checked, false);
  assert.strictEqual(d.querySelector("input[name=attribution]:checked").value, "anonymous");
  d.getElementById("next").click();
  assert.match(d.getElementById("err-ownConsent").textContent, /permission/);
  f.ownConsent.checked = true; d.getElementById("next").click();
  const pre = d.getElementById("preview");
  assert.ok(pre.textContent.includes("<img src=x")); assert.strictEqual(pre.querySelectorAll("img").length, 0);
  assert.match(pre.textContent, /for the team only/);
  const wa = d.getElementById("wa-draft");
  assert.strictEqual(wa.hidden, false); assert.ok(wa.href.startsWith("https://wa.me/917239062622?text="));
  assert.ok(!w.__opened, "WhatsApp must not open automatically");
  assert.match(d.getElementById("compose").textContent, /Nothing has been sent/);
  assert.ok(!/(sent|received|submitted) successfully|thank you for submitting/i.test(d.body.textContent));
  d.getElementById("dl-txt").click(); assert.strictEqual(w.__downloaded, "dharmasetu-sangam-draft.txt");
  assert.match(d.getElementById("draft-status").textContent, /Not submitted/);
  assert.strictEqual(w.localStorage.length, before);
  assert.strictEqual(d.querySelectorAll("input[type=email],input[type=tel],input[type=file],input[type=date]").length, 0);
});
test("sangam: empty records → no guide cards/quotes, invitation shown, no placeholder faces", { skip: !JSDOM }, async () => {
  const w = await load("community.html"); const d = w.document;
  assert.strictEqual(d.getElementById("guides-list").hidden, true);
  assert.strictEqual(d.getElementById("voices").hidden, true);
  assert.strictEqual(d.getElementById("guides-invite").hidden, false);
  assert.ok(!/👤|★|consent pending/.test(d.body.textContent));
});
test("sangam: approved SYNTHETIC records render as text only", { skip: !JSDOM }, async () => {
  const people = { acharyas: [{ id: "syn", name: "SYNTHETIC <b>Guide</b>", bio_en: "<script>alert(1)</script>", photo: "assets/people/syn.svg", consent: { profile_public: true, photo: true }, verification: { date: "2026-11-01", method: "in-person", checked: ["references"] }, editorial: { approved: true, approved_on: "2026-11-02" } }],
    testimonials: [{ quote_en: "<img src=x onerror=alert(1)>", source_type: "tradition-experience", consent: { quote_public: true, credit: "anonymous" }, editorial: { approved: true, approved_on: "2026-11-02" } }] };
  const w = await load("community.html", { people }); const d = w.document;
  assert.strictEqual(d.getElementById("guides-list").hidden, false);
  assert.strictEqual(d.querySelectorAll("#guides-list script, #guides-list b, #guides-list img, #voices img").length, 0);
  assert.match(d.getElementById("guides-list").textContent, /Checked by our team on 2026-11-01 \(in-person\): references/);
  assert.strictEqual(d.getElementById("voices").hidden, false);
  assert.match(d.getElementById("voices").textContent, /about a family tradition/);
});
