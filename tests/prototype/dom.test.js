// jsdom interaction tests (no real browser). Needs jsdom on NODE_PATH; skipped otherwise.
const test = require("node:test"), assert = require("node:assert");
const path = require("path"), fs = require("fs");
const P = path.join(__dirname, "../../prototype");
let JSDOM; try { ({ JSDOM } = require("jsdom")); } catch (e) {}
const data = fs.readFileSync(path.join(P, "calendar-data.json"), "utf8");

async function load(page, { query = "", storage } = {}) {
  const html = fs.readFileSync(path.join(P, page), "utf8");
  const dom = new JSDOM(html, { url: "http://localhost/prototype/" + page + query, runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  if (storage) for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  w.fetch = async () => ({ json: async () => JSON.parse(data) });
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
