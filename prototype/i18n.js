(function () {
  var KEY = "ds_lang";
  function getLang() {
    try {
      var q = new URLSearchParams(location.search).get("lang");
      if (q === "hi" || q === "en") return q;
      return localStorage.getItem(KEY) || "en";
    } catch (e) { return "en"; }
  }
  function setLang(lang) {
    lang = lang === "hi" ? "hi" : "en";
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    document.documentElement.lang = lang;
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });
  }
  function initLang() {
    setLang(getLang());
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(btn.getAttribute("data-lang"));
      });
    });
    var burger = document.getElementById("burger");
    var mobile = document.getElementById("mobile-nav");
    if (burger && mobile) {
      burger.addEventListener("click", function () {
        mobile.classList.toggle("open");
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLang);
  } else {
    initLang();
  }
  window.DSLang = { get: getLang, set: setLang };
})();
