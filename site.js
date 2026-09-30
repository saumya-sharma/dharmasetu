(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Scroll reveals */
  var nodes = document.querySelectorAll(".reveal");
  if (reduce) {
    nodes.forEach(function (el) { el.classList.add("is-visible"); });
  } else if (nodes.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    nodes.forEach(function (el) { io.observe(el); });
  } else {
    nodes.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Keyword tiles — expand inline */
  var tiles = document.querySelectorAll(".tile");
  var panels = document.querySelectorAll(".tile-panel");
  function closeAllTiles() {
    tiles.forEach(function (t) { t.setAttribute("aria-expanded", "false"); });
    panels.forEach(function (p) { p.hidden = true; });
  }
  tiles.forEach(function (tile) {
    tile.addEventListener("click", function () {
      var id = tile.getAttribute("data-tile");
      var panel = document.getElementById("tile-panel-" + id);
      if (!panel) return;
      var open = tile.getAttribute("aria-expanded") === "true";
      closeAllTiles();
      if (!open) {
        tile.setAttribute("aria-expanded", "true");
        panel.hidden = false;
        if (!reduce) {
          panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    });
  });

  /* Orient → Record → Observe flow activation on scroll */
  var track = document.getElementById("flow-track");
  if (track) {
    if (reduce) {
      track.classList.add("is-active");
      track.querySelectorAll(".flow-step").forEach(function (s) {
        s.classList.add("is-lit");
      });
    } else if ("IntersectionObserver" in window) {
      var fio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              track.classList.add("is-active");
              fio.unobserve(track);
            }
          });
        },
        { threshold: 0.35 }
      );
      fio.observe(track);
    } else {
      track.classList.add("is-active");
    }
  }
})();
