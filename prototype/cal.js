(function () {
  function pad(n) { return String(n).padStart(2, "0"); }
  function toGCalStamp(d) {
    // d: Date local -> YYYYMMDDTHHMMSS (floating local, no Z)
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
      "T" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }
  function toICSStamp(d) {
    return toGCalStamp(d);
  }
  function googleCalendarUrl(opts) {
    var start = opts.start instanceof Date ? opts.start : new Date(opts.start);
    var end = opts.end instanceof Date ? opts.end : new Date(opts.end || (start.getTime() + 2 * 3600000));
    var params = new URLSearchParams({
      action: "TEMPLATE",
      text: opts.title || "DharmaSetu muhurat",
      dates: toGCalStamp(start) + "/" + toGCalStamp(end),
      details: opts.details || "From DharmaSetu — sample timing. Confirm with your kul-purohit or an acharya.",
      location: opts.location || ""
    });
    return "https://calendar.google.com/calendar/render?" + params.toString();
  }
  function downloadICS(opts) {
    var start = opts.start instanceof Date ? opts.start : new Date(opts.start);
    var end = opts.end instanceof Date ? opts.end : new Date(opts.end || (start.getTime() + 2 * 3600000));
    var uid = "ds-" + start.getTime() + "@dharmasetu";
    var ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//DharmaSetu//Prototype//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + toICSStamp(new Date()),
      "DTSTART:" + toICSStamp(start),
      "DTEND:" + toICSStamp(end),
      "SUMMARY:" + (opts.title || "DharmaSetu muhurat").replace(/\n/g, "\\n"),
      "DESCRIPTION:" + (opts.details || "Sample timing from DharmaSetu. Confirm with your kul-purohit.").replace(/\n/g, "\\n"),
      "LOCATION:" + (opts.location || ""),
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (opts.filename || "dharmasetu-muhurat") + ".ics";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function bindCalendarButtons(root) {
    root = root || document;
    root.querySelectorAll("[data-gcal]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        var url = googleCalendarUrl({
          title: el.getAttribute("data-title"),
          start: el.getAttribute("data-start"),
          end: el.getAttribute("data-end"),
          details: el.getAttribute("data-details"),
          location: el.getAttribute("data-location")
        });
        window.open(url, "_blank", "noopener");
      });
    });
    root.querySelectorAll("[data-ics]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        downloadICS({
          title: el.getAttribute("data-title"),
          start: el.getAttribute("data-start"),
          end: el.getAttribute("data-end"),
          details: el.getAttribute("data-details"),
          location: el.getAttribute("data-location"),
          filename: el.getAttribute("data-filename") || "dharmasetu-event"
        });
      });
    });
  }
  window.DSCal = { googleCalendarUrl: googleCalendarUrl, downloadICS: downloadICS, bind: bindCalendarButtons };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { bindCalendarButtons(); });
  } else {
    bindCalendarButtons();
  }
})();
