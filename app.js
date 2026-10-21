(function () {
  "use strict";
  var G = window.GUIDE;
  var state = { method: null, evDay: null, tab: "statewide" };
  /* where the person votes; saved only in this browser */
  function load(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var profile = load("uvg-profile-v1") || {};
  profile.picks = profile.picks || {};
  var marks = load("uvg-marks-v1") || {};
  function saveProfile() { save("uvg-profile-v1", profile); }

  /* ---------- icons (simple line drawings) ---------- */
  function icon(name, size) {
    var s = size || 20, p = {
      statewide: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
      federal: '<path d="M3 21h18"/><path d="M5 21v-7h14v7"/><path d="M8.5 14v7M12 14v7M15.5 14v7"/><path d="M5 14a7 7 0 0 1 14 0"/><path d="M12 7V3.5"/>',
      stateHouse: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
      county: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
      home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
      plan: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 12l2 2 4-4"/>',
      ballot: '<path d="M4 9h16v11H4z"/><path d="M8 9V4h8v5"/><path d="M9 14h6"/>',
      help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.4"/><path d="M12 17h.01"/>',
      next: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
      school: '<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h7"/>',
      questions: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12l3 3 5-6"/>',
      pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
      check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
      cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
      share: '<path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
      news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
      print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
      back: '<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>'
    }[name] || "";
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>";
  }

  /* ---------- date helpers (South Carolina time) ---------- */
  var MONTHS = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DAYS3 = ["Sun.", "Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat."];
  function parts(iso) { var p = iso.split("-").map(Number); return { y: p[0], m: p[1], d: p[2] }; }
  function dow(iso) { var p = parts(iso); return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); }
  function md(iso) { var p = parts(iso); return MONTHS[p.m - 1] + " " + p.d; }
  function fmt(iso) { return DAYS3[dow(iso)] + " " + md(iso); }
  function fmtLong(iso) { return DAYS[dow(iso)] + ", " + md(iso); }
  function todaySC() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function daysBetween(a, b) {
    var A = parts(a), B = parts(b);
    return Math.round((Date.UTC(B.y, B.m - 1, B.d) - Date.UTC(A.y, A.m - 1, A.d)) / 864e5);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function link(url, text) { return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(text) + "</a>"; }
  function $(id) { return document.getElementById(id); }
  function countyList() {
    var n = Object.keys(G.counties).map(function (k) { return G.counties[k].name; });
    return n.length < 3 ? n.join(" and ") : n.slice(0, -1).join(", ") + ", and " + n[n.length - 1];
  }

  /* ---------- header status ---------- */
  function renderStatus() {
    var t = todaySC(), ev = G.earlyVoting, ed = G.election.date, left = daysBetween(t, ed), msg;
    if (left < 0) msg = "Election Day has passed. Results are at " + link("https://scvotes.gov", "scVOTES.gov") + ".";
    else if (left === 0) msg = "<strong>Today is Election Day.</strong> Polls are open " + esc(G.election.hours) + " In line by 7? You can still vote.";
    else if (t < ev.start) msg = "<strong>" + left + " days to go.</strong> Early voting opens " + esc(fmtLong(ev.start)) + ".";
    else if (t <= ev.end) {
      var open = ev.days.indexOf(t) !== -1;
      msg = "<strong>" + (open ? "You can vote early today." : "Early voting is going on now.") + "</strong> It ends " + esc(fmtLong(ev.end)) + ".";
    } else msg = "<strong>Early voting is over.</strong> Vote " + esc(fmtLong(ed)) + ", " + esc(G.election.hours);
    $("status").innerHTML = msg;
  }

  /* ---------- key dates timeline ---------- */
  function renderTimeline() {
    var t = todaySC(), nextFound = false, ol = $("timeline");
    ol.style.setProperty("--n", G.timeline.length);
    ol.innerHTML = G.timeline.map(function (e) {
      var cls = "tl", tag = "";
      if (e.date < t) cls += " past";
      else if (e.date === t) { cls += " today-row next"; tag = '<span class="tag">Today</span>'; nextFound = true; }
      else if (!nextFound) { cls += " next"; nextFound = true; var n = daysBetween(t, e.date); tag = '<span class="tag">' + (n === 1 ? "Tomorrow" : "In " + n + " days") + "</span>"; }
      return '<li class="' + cls + '"><span class="dot" aria-hidden="true"></span><div><span class="when">' + esc(fmtLong(e.date)) + tag + '</span><span class="what">' + esc(e.label) + "</span></div></li>";
    }).join("");
  }

  /* ---------- bubble choices ---------- */
  function ovals(containerId, name, options, onPick) {
    var box = $(containerId);
    box.innerHTML = options.map(function (o) {
      return '<label class="oval"><input type="radio" name="' + name + '" value="' + esc(o.value) + '">' +
        '<span class="bubble" aria-hidden="true"></span><span class="label">' + esc(o.label) +
        (o.hint ? "<small>" + esc(o.hint) + "</small>" : "") + "</span></label>";
    }).join("");
    box.addEventListener("change", function (e) { if (e.target.name === name) onPick(e.target.value); });
  }
  function countyOptions() {
    var o = Object.keys(G.counties).map(function (k) { return { value: k, label: G.counties[k].name + " County" }; });
    o.push({ value: "other", label: "Somewhere else in South Carolina" });
    return o;
  }
  function methodOptions() {
    var t = todaySC(), ev = G.earlyVoting, ab = G.absentee, out = [];
    if (t <= ev.end) out.push({ value: "early", label: "Vote early, in person", hint: "Now through " + fmtLong(ev.end) + ". Anyone can." });
    out.push({ value: "eday", label: "Vote on Election Day", hint: fmtLong(G.election.date) + ", " + G.election.hours });
    out.push({ value: "absentee", label: "Vote by mail", hint: "Only for some voters. " + (t <= ab.applyBy ? "Ask for a ballot by " + fmtLong(ab.applyBy) + "." : "It's too late to ask for one.") });
    return out;
  }

  /* ---------- plan card ---------- */
  function sitesHTML(c) {
    if (!c) return "<p>" + link(G.links.earlyVoting, "Find early voting sites in your county") + "</p>";
    return c.sites.map(function (s) {
      return '<div class="site">' + icon("pin", 18) + '<div><b>' + esc(s.name) + '</b><a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.address) + '" target="_blank" rel="noopener">' + esc(s.address) + "</a></div></div>";
    }).join("") + (c.sitesUrl ? '<p class="fine">' + link(c.sitesUrl, "Official list from " + c.name + " County") + "</p>" : "");
  }
  function officeHTML(c) {
    var o = c && c.office; if (!o) return "<p>" + link(G.links.countyOffices, "Find your county election office") + "</p>";
    return '<div class="site">' + icon("pin", 18) + "<div><b>" + esc(o.name) + "</b>" + esc(o.address) +
      (o.phone ? '<span> · <a href="tel:' + esc(o.phone.replace(/[^0-9]/g, "")) + '">' + esc(o.phone) + "</a></span>" : "") + "</div></div>";
  }
  function renderPlan(animate) {
    var card = $("plan-card");
    if (!profile.county || profile.county === "all" || !state.method) { card.hidden = true; return; }
    var c = G.counties[profile.county] || null, L = G.links, t = todaySC(), steps = [], title, sub;
    var reg = { h: "Make sure you're registered", b: "<p>It takes about a minute, and it also shows your polling place. " + link(L.myVoterInfo, "Check my registration") + "</p>" };

    if (state.method === "early") {
      var ev = G.earlyVoting;
      title = "Vote early" + (c ? " in " + c.name + " County" : "");
      sub = "Now through " + fmtLong(ev.end) + ", " + ev.hours;
      var btns = ev.days.map(function (d) {
        var past = d < t, lbl = d === t ? "Today" : (daysBetween(t, d) === 1 ? "Tomorrow" : "");
        return '<button type="button" class="day" data-day="' + d + '" aria-pressed="' + (state.evDay === d) + '"' + (past ? " disabled" : "") + ">" +
          (lbl ? '<span class="t">' + lbl + "</span>" : "") + esc(fmt(d)) + "</button>";
      }).join("");
      steps.push(reg);
      steps.push({ h: "Pick a day", b: "<p>" + esc(ev.note) + '</p><div class="days" id="ev-days">' + btns + "</div>" });
      steps.push({ h: "Go to any early voting site in your county", b: sitesHTML(c) });
    } else if (state.method === "eday") {
      title = "Vote on Election Day";
      sub = fmtLong(G.election.date) + ", " + G.election.hours;
      steps.push(reg);
      steps.push({ h: "Go to your own polling place", b: "<p>On Election Day you have to vote at your assigned spot. " + link(L.pollingPlace, "Find my polling place") + "</p>" });
      steps.push({ h: "Get in line by " + G.election.close, b: "<p>Polls are open " + esc(G.election.hours) + " If you're in line when they close, stay. You still get to vote.</p>" });
    } else {
      var ab = G.absentee, late = t > ab.applyBy;
      title = "Vote by mail";
      sub = late ? "The deadline to ask for a mail ballot has passed" : "Ask for your ballot by " + fmtLong(ab.applyBy) + ", " + ab.applyTime;
      steps.push({ h: "Check that you qualify", b: "<p>In South Carolina, only some people can vote by mail, like:</p><ul>" + ab.reasons.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul><p>" + link(ab.reasonsUrl, "See the full list") + "</p>" });
      if (late) steps.push({ h: "It's too late to ask by mail", b: "<p>The deadline was " + esc(fmtLong(ab.applyBy)) + ". You can still vote " + (t <= G.earlyVoting.end ? "early in person through " + esc(fmtLong(G.earlyVoting.end)) + ", or " : "") + "on Election Day.</p><p>" + esc(ab.lateNote) + "</p>" });
      else steps.push({ h: "Ask for your ballot by " + fmtLong(ab.applyBy), b: "<p>" + esc(ab.request) + " They need your request by " + esc(ab.applyTime) + " on " + esc(fmtLong(ab.applyBy)) + ".</p>" + officeHTML(c) });
      steps.push({ h: "Fill it out and get a witness", b: "<p>" + esc(ab.witness) + "</p>" });
      steps.push({ h: "Get it back by " + ab.returnTime + " on " + md(ab.returnBy), b: "<p>" + esc(ab.returnHow) + "</p>" });
    }
    if (state.method !== "absentee") {
      steps.push({ h: "Bring a photo ID", b: "<p>Any one of these:</p><ul>" + G.photoId.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + '</ul><p class="fine">' + esc(G.noIdNote) + "</p>" });
    }
    steps.push({ h: "Look at your ballot before you go", b: '<p><a href="#my-ballot">Make my sample ballot</a> to see just your races and mark your picks. You can also check your ' + link(L.sampleBallot, "official sample ballot") + ".</p>" });

    card.innerHTML = '<header><span class="check">' + icon("check", 22) + "</span><div><h3>" + esc(title) + "</h3><p>" + esc(sub) + "</p></div></header>" +
      '<div class="plan-body">' + steps.map(function (s, i) {
        return '<div class="step"><span class="n" aria-hidden="true">' + (i + 1) + "</span><div><h4>" + esc(s.h) + "</h4>" + s.b + "</div></div>";
      }).join("") +
      '<div class="actions"><button type="button" class="btn" id="cal-btn">' + icon("cal", 18) + "Add to my calendar</button>" +
      '<button type="button" class="btn ghost" id="share-btn">' + icon("share", 18) + "Send my plan</button></div>" +
      '<p class="toast" id="toast" role="status"></p></div>';
    card.hidden = false;
    if (animate) { card.classList.remove("enter"); void card.offsetWidth; card.classList.add("enter"); }

    var days = $("ev-days");
    if (days) days.addEventListener("click", function (e) {
      var b = e.target.closest(".day"); if (!b || b.disabled) return;
      state.evDay = b.getAttribute("data-day");
      Array.prototype.forEach.call(days.querySelectorAll(".day"), function (x) { x.setAttribute("aria-pressed", x === b); });
      say("Nice. " + fmtLong(state.evDay) + " it is. Add it to your calendar so you don't forget.");
    });
    $("cal-btn").addEventListener("click", downloadICS);
    $("share-btn").addEventListener("click", sharePlan);
  }
  function say(msg) { var t = $("toast"); if (t) t.textContent = msg; }

  /* ---------- calendar file ---------- */
  function offsetFor(iso) { return iso < G.dstEnds ? 4 : 5; }
  function stamp(iso, hhmm) {
    var p = parts(iso), h = +hhmm.split(":")[0] + offsetFor(iso), m = +hhmm.split(":")[1];
    return new Date(Date.UTC(p.y, p.m - 1, p.d, h, m)).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }
  function icsText(s) { return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); }
  function vevent(uid, day, start, end, summary, desc, loc) {
    return ["BEGIN:VEVENT", "UID:" + uid + "@upstatevoterguide2026", "DTSTAMP:" + stamp(todaySC(), "12:00"),
      "DTSTART:" + stamp(day, start), "DTEND:" + stamp(day, end), "SUMMARY:" + icsText(summary),
      "DESCRIPTION:" + icsText(desc), loc ? "LOCATION:" + icsText(loc) : "",
      "BEGIN:VALARM", "TRIGGER:-PT12H", "ACTION:DISPLAY", "DESCRIPTION:" + icsText(summary), "END:VALARM", "END:VEVENT"].filter(Boolean).join("\r\n");
  }
  function downloadICS() {
    var ev = [], idTxt = "Bring a photo ID: " + G.photoId.join(", ") + ".";
    if (state.method === "early") {
      if (!state.evDay) { say("Pick a day first, then tap Add to my calendar."); var f = document.querySelector(".day:not(:disabled)"); if (f) f.focus(); return; }
      var c = G.counties[profile.county];
      ev.push(vevent("early-" + state.evDay, state.evDay, G.earlyVoting.calStart, G.earlyVoting.calEnd, "Vote early (open 8:30 a.m. to 6 p.m.)",
        "Go to any early voting site in your county.\n" + idTxt + "\nSample ballot: " + G.links.sampleBallot, c && c.sites ? c.sites[0].address : ""));
    } else if (state.method === "eday") {
      ev.push(vevent("eday", G.election.date, G.election.calStart, G.election.calEnd, "Vote today (polls open 7 a.m. to 7 p.m.)",
        "Go to your own polling place: " + G.links.pollingPlace + "\n" + idTxt, ""));
    } else {
      var ab = G.absentee;
      if (todaySC() <= ab.applyBy) ev.push(vevent("ab-apply", ab.applyBy, "09:00", "09:30", "Mail ballot request due by 5 p.m.", ab.request, ""));
      if (todaySC() <= "2026-10-27") ev.push(vevent("ab-mail", "2026-10-27", "09:00", "09:30", "Mail your ballot today", "It has to arrive by 7 p.m. on Nov. 3. Mailing a week early is safest.", ""));
      ev.push(vevent("ab-return", ab.returnBy, "09:00", "09:30", "Mail ballot must arrive by 7 p.m.", ab.returnHow, ""));
    }
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Upstate Voter Guide 2026//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"].concat(ev, ["END:VCALENDAR"]).join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    a.download = "my-voting-plan.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    say("Done. Open the file to add it to your calendar.");
  }
  function planText() {
    var m = state.method, c = G.counties[profile.county], s;
    if (m === "early") s = "I'm voting early" + (state.evDay ? " on " + fmtLong(state.evDay) : "") + (c ? " in " + c.name + " County" : "") + ". Early voting is open through " + fmtLong(G.earlyVoting.end) + ", 8:30 a.m. to 6 p.m.";
    else if (m === "eday") s = "I'm voting on Election Day, " + fmtLong(G.election.date) + ". Polls are open " + G.election.hours;
    else s = "I'm voting by mail. Ballots have to arrive by " + G.absentee.returnTime + " on " + md(G.absentee.returnBy) + ".";
    return s + " Bring a photo ID. Make your own plan here: " + location.href.split("#")[0];
  }
  function sharePlan() {
    var text = planText();
    if (navigator.share) { navigator.share({ title: "My voting plan", text: text }).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { say("Copied. Paste it into a text or message."); }, function () { say(text); });
    else say(text);
  }

  /* ---------- ballot ---------- */
  var TABS = [
    { id: "statewide", label: "Statewide" }, { id: "federal", label: "Congress" }, { id: "stateHouse", label: "SC House" },
    { id: "county", label: "County" }, { id: "school", label: "School board" }, { id: "questions", label: "Yes/No votes" }
  ];
  /* does this race or question show up on this person's ballot? "yes", "maybe" (depends on where they live), or "no" */
  function fit(it) {
    var P = profile, maybe = false;
    if (!P.county || P.county === "all") return "yes";
    if (it.cong != null && P.cong != null) return it.cong === P.cong ? "yes" : "no";
    if (it.hd != null && P.hd != null) return it.hd === P.hd ? "yes" : "no";
    if (it.counties && it.counties.indexOf(P.county) === -1) return "no";
    if (it.cong != null || it.hd != null) maybe = true;
    if (it.sd != null) { if (!P.sd) maybe = true; else if (P.sd !== it.sd) return "no"; }
    if (it.place != null) { if (P.place == null) maybe = true; else if (P.place !== it.place) return "no"; }
    if (it.pickKey) { var pk = P.picks[it.pickKey]; if (!pk) maybe = true; else if (pk !== it.sub) return "no"; }
    if (it.maybeNote) maybe = true;
    return maybe ? "maybe" : "yes";
  }
  function itemsFor(tab) {
    var list = tab === "questions" ? G.questions : G.races.filter(function (r) { return r.level === tab; });
    return list.filter(function (x) { return fit(x) !== "no"; });
  }
  function renderTabs() {
    $("ballot-tabs").innerHTML = TABS.map(function (t) {
      var n = itemsFor(t.id).length;
      return '<button type="button" class="tab" role="tab" id="tab-' + t.id + '" aria-selected="' + (state.tab === t.id) + '" aria-controls="ballot-panel" tabindex="' + (state.tab === t.id ? 0 : -1) + '">' +
        icon(t.id, 18) + '<span class="tl-label">' + esc(t.label) + "</span>" + '<span class="count">' + n + "</span></button>";
    }).join("");
  }
  function maybeTag(x) {
    return profile.county && profile.county !== "all" && fit(x) === "maybe" ? '<p class="maybe-tag">On some ballots, depending on where you live</p>' : "";
  }

  /* ---------- where you vote: county switch, address finder, districts by hand ---------- */
  var SEG = [{ v: "anderson", l: "Anderson" }, { v: "greenville", l: "Greenville" }, { v: "spartanburg", l: "Spartanburg" }, { v: "all", l: "All" }];
  function setCounty(v, fromPlan) {
    if (profile.county !== v) { profile = { county: v, picks: {} }; saveProfile(); }
    if (!fromPlan) {
      Array.prototype.forEach.call(document.querySelectorAll('input[name="county"]'), function (i) { i.checked = i.value === v; });
      renderPlan(false);
    }
    renderWhere(); renderBallot(); renderMyBallot();
  }
  function districtChips() {
    var P = profile, out = [];
    if (P.county && G.counties[P.county]) out.push(G.counties[P.county].name + " County");
    else if (P.county === "other") out.push(P.countyName ? P.countyName : "Another SC county");
    if (P.cong) out.push("U.S. House District " + P.cong);
    if (P.hd) out.push("SC House District " + P.hd);
    if (P.sd && G.sdLabels[P.sd]) out.push(G.sdLabels[P.sd]);
    if (P.place && P.place !== "__other__") out.push("City of " + P.place);
    Object.keys(P.picks).forEach(function (k) { var v = P.picks[k]; if (v && v !== "__none__" && G.pickLabels[k]) out.push(G.pickLabels[k].replace(/ district$| board area$/, "") + ", " + v); });
    return out;
  }
  function selectHTML(id, label, opts, cur) {
    return '<label class="pick"><span>' + esc(label) + '</span><select data-k="' + esc(id) + '"><option value="">Not sure</option>' +
      opts.map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(cur == null ? "" : cur) === String(o.v) ? " selected" : "") + ">" + esc(o.l) + "</option>"; }).join("") + "</select></label>";
  }
  function handPickers() {
    var P = profile, co = P.county, h = "";
    if (!co || co === "all" || co === "other") return "";
    var cong = G.races.filter(function (r) { return r.cong && r.counties.indexOf(co) !== -1; }).map(function (r) { return { v: r.cong, l: "District " + r.cong }; });
    if (!P.located) {
    h += selectHTML("cong", "U.S. House", cong, P.cong);
    var hd = G.races.filter(function (r) { return r.hd && r.counties.indexOf(co) !== -1; }).sort(function (a, b) { return a.hd - b.hd; }).map(function (r) { return { v: r.hd, l: "District " + r.hd }; });
    h += selectHTML("hd", "SC House", hd, P.hd);
    var sds = (G.sdByCounty[co] || []).map(function (k) { return { v: k, l: G.sdLabels[k] }; });
    if (sds.length) h += selectHTML("sd", "School district", sds.concat([{ v: "__other__", l: "A different school district" }]), P.sd);
    var pl = G.placesByCounty[co];
    if (pl) h += selectHTML("place", "City or town", pl.map(function (p) { return { v: p, l: p }; }).concat([{ v: "__other__", l: "A different city or town" }, { v: "__none__", l: "Not inside a city or town" }]), P.place === "" ? "__none__" : P.place);
    }
    var groups = {};
    G.races.forEach(function (r) {
      if (!r.pickKey || r.counties.indexOf(co) === -1) return;
      if (r.sd && P.sd && P.sd !== r.sd) return;
      (groups[r.pickKey] = groups[r.pickKey] || []).push(r.sub);
    });
    Object.keys(groups).forEach(function (k) {
      var subs = groups[k].sort(function (a, b) { return parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10); });
      h += selectHTML("pick:" + k, G.pickLabels[k] || k, subs.map(function (x) { return { v: x, l: x }; }).concat([{ v: "__none__", l: "Mine isn't listed (not on my ballot this year)" }]), P.picks[k]);
    });
    return h;
  }
  function renderWhere(msg) {
    var P = profile, chips = districtChips(), co = P.county;
    var seg = '<div class="seg" role="radiogroup" aria-label="Show races for">' + SEG.map(function (o) {
      var on = (co || "all") === o.v || (o.v === "all" && co === "other");
      return '<button type="button" role="radio" aria-checked="' + on + '" data-county="' + o.v + '">' + esc(o.l) + "</button>";
    }).join("") + "</div>";
    var status = co && co !== "all"
      ? '<p class="where-now">Showing races for: <b>' + esc(chips[0] || "") + "</b>" + (chips.length > 1 ? '</p><ul class="dchips">' + chips.slice(1).map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ul>" : "</p>")
      : '<p class="where-now">Showing races in <b>all three counties</b>. Pick your county, or find your districts below, to see only your races.</p>';
    if (co === "other") status += '<p class="fine">This guide covers ' + esc(countyList()) + " counties, so it shows only the statewide races" + (P.cong ? " and your U.S. House race" : "") + (P.hd ? " and your SC House race" : "") + ". " + link(G.links.sampleBallot, "See your full official sample ballot") + ".</p>";
    var picks = handPickers();
    var needs = co && co !== "all" && co !== "other" && /value="" selected|<option value="">Not sure<\/option><option/.test(picks) && P.located;
    $("where").innerHTML =
      '<h3 class="where-h">Whose ballot are you looking at?</h3>' + seg + status +
      '<form class="finder" id="finder" autocomplete="on"><label for="addr">Find my exact districts by address</label>' +
      '<div class="finder-row"><input id="addr" name="street-address" autocomplete="street-address" type="text" inputmode="text" placeholder="123 Main St, Greer, SC 29651" required>' +
      '<button class="btn" type="submit">' + icon("search", 18) + "Find</button></div>" +
      '<p class="finder-msg" id="finder-msg" role="status">' + (msg || "") + "</p>" +
      '<p class="fine">Your address goes to the U.S. Census Bureau\'s free address lookup to match your districts. This guide doesn\'t save or see it.</p></form>' +
      (picks ? '<details class="byhand"' + (needs ? " open" : "") + "><summary>" + (P.located ? "A few districts the address lookup can't tell" : "Or set your districts by hand") + "</summary>" +
        '<p class="fine">Not sure? ' + link(G.links.myVoterInfo, "Look up your districts on scVOTES") + " (it lists every district you're in).</p>" + '<div class="picks">' + picks + "</div></details>" : "") +
      '<a class="btn mb-open" href="#my-ballot">' + icon("ballot", 18) + "See my sample ballot</a>";
  }
  function onWhereClick(e) {
    var b = e.target.closest("[data-county]"); if (!b) return;
    setCounty(b.getAttribute("data-county"));
  }
  function onWhereChange(e) {
    var sel = e.target.closest("select[data-k]"); if (!sel) return;
    var k = sel.getAttribute("data-k"), v = sel.value;
    if (k.indexOf("pick:") === 0) { var pk = k.slice(5); if (v) profile.picks[pk] = v; else delete profile.picks[pk]; }
    else if (k === "cong" || k === "hd") profile[k] = v ? parseInt(v, 10) : null;
    else if (k === "place") profile.place = v === "__none__" ? "" : (v || null);
    else { profile[k] = v || null; if (k === "sd") Object.keys(profile.picks).forEach(function (p) { if (p.indexOf("area-") === 0) delete profile.picks[p]; }); }
    saveProfile(); renderWhere(); var d = document.querySelector(".byhand"); if (d) d.open = true; renderBallot(); renderMyBallot();
  }

  /* address lookup through the Census Bureau geocoder (JSONP is the format it offers to web pages) */
  function geocode(addr) {
    return new Promise(function (resolve, reject) {
      var cb = "uvgGeo" + Date.now(), s = document.createElement("script"), done = false;
      var t = setTimeout(function () { finish(); reject(new Error("timeout")); }, 20000);
      function finish() { done = true; clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = function (j) { if (done) return; finish(); resolve(j); };
      s.onerror = function () { if (done) return; finish(); reject(new Error("network")); };
      s.src = "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=" + encodeURIComponent(addr) +
        "&benchmark=Public_AR_Current&vintage=Current_Current&layers=all&format=jsonp&callback=" + cb;
      document.head.appendChild(s);
    });
  }
  function first(g, re) { for (var k in g) { if (re.test(k) && g[k] && g[k][0]) return g[k][0]; } return null; }
  function num(x) { var m = x && String(x.NAME || x.BASENAME || "").match(/(\d+)/); return m ? parseInt(m[1], 10) : null; }
  function onFind(e) {
    e.preventDefault();
    var addr = $("addr").value.trim(), msg = $("finder-msg");
    if (addr.length < 6) { msg.textContent = "Type your street address, city, and ZIP code."; return; }
    msg.textContent = "Looking it up…";
    geocode(addr).then(function (j) {
      var m = j && j.result && j.result.addressMatches && j.result.addressMatches[0];
      if (!m) { msg.textContent = "We couldn't find that address. Add your city and ZIP code, or set your districts by hand below."; return; }
      var g = m.geographies || {}, st = first(g, /^States$/);
      if ((st && st.STUSAB && st.STUSAB !== "SC") || !/, SC,/.test(m.matchedAddress || "")) { msg.textContent = "That address isn't in South Carolina."; return; }
      var co = first(g, /^Counties$/), coName = co ? co.NAME.replace(/ County$/, "") : "", key = coName.toLowerCase();
      var usd = first(g, /Unified School Districts/), usdN = usd ? usd.NAME : "", sd = "__other__", mm;
      if ((mm = usdN.match(/Anderson School District (\d)/))) sd = "anderson-" + mm[1];
      else if (/Greenville County School District/.test(usdN)) sd = "greenville";
      else if ((mm = usdN.match(/Spartanburg School District (\d)/))) sd = "spartanburg-" + mm[1];
      var pl = first(g, /Incorporated Places/), place = pl ? pl.NAME.replace(/ (city|town)$/, "") : "";
      var known = G.placesByCounty[key] || [];
      profile = {
        county: G.counties[key] ? key : "other", countyName: coName ? coName + " County" : null,
        cong: num(first(g, /Congressional Districts/)), hd: num(first(g, /Legislative Districts - Lower/)),
        sd: sd, place: place ? (known.indexOf(place) !== -1 ? place : "__other__") : "", picks: {}, located: true
      };
      saveProfile();
      Array.prototype.forEach.call(document.querySelectorAll('input[name="county"]'), function (i) { i.checked = i.value === profile.county; });
      renderPlan(false); renderBallot(); renderMyBallot();
      var pretty = m.matchedAddress.replace(/, SC, (\d{5})$/, "").toLowerCase().replace(/\b([a-z])/g, function (c) { return c.toUpperCase(); });
      renderWhere("Found: " + pretty + ". Lookups can be off right at a district line, so double-check on scVOTES if something looks wrong.");
    }).catch(function () { msg.textContent = "The address lookup isn't answering right now. Set your districts by hand below, or try again in a minute."; });
  }

  function initials(n) {
    var w = n.replace(/["“”].*?["“”]/g, "").replace(/\b(Jr|Sr|II|III|IV)\.?$/i, "").trim().split(/\s+/).filter(function (x) { return x.length > 1 || /[A-Z]/.test(x); });
    return ((w[0] || "")[0] || "") + ((w.length > 1 ? w[w.length - 1][0] : "") || "");
  }
  function face(name, img, pos) {
    return '<span class="face">' + (img ? '<img src="' + esc(img) + '" alt="Photo of ' + esc(name) + '" loading="lazy" referrerpolicy="no-referrer"' + (pos ? ' style="object-position:' + esc(pos) + '"' : "") + ">" : "") +
      '<span class="ini" aria-hidden="true">' + esc(initials(name)) + "</span></span>";
  }
  function lastName(n) { var p = n.replace(/,? (Jr\.|Sr\.|II|III|IV)$/, "").trim().split(" "); return p[p.length - 1].toLowerCase(); }
  function raceHTML(r) {
    var cands = (r.candidates || []).slice().sort(function (a, b) { return lastName(a.name) < lastName(b.name) ? -1 : 1; });
    /* fairness rule: show photos in a race only if every candidate in it has one */
    var showImg = cands.length > 0 && cands.every(function (c) { return !!c.img; });
    var mates = cands.filter(function (c) { return c.running; });
    var showMateImg = showImg && mates.every(function (c) { return !!c.runningImg; });
    var list = cands.length ? '<ul class="people">' + cands.map(function (c) {
      var chips = (c.party ? '<span class="chip">' + esc(c.party) + "</span>" : "") + (c.incumbent ? '<span class="chip now">Holds this job now</span>' : "");
      return '<li class="person">' + face(c.name, showImg ? c.img : null, c.imgPos) + '<div><span class="name">' + esc(c.name) + "</span>" +
        (chips ? '<span class="chips">' + chips + "</span>" : "") +
        (c.role ? '<span class="role">' + esc(c.role) + "</span>" : "") +
        (c.running ? '<span class="mate">' + face(c.running, showMateImg ? c.runningImg : null) + "<span>Running mate: <b>" + esc(c.running) + "</b></span></span>" : "") +
        (c.url ? '<a class="site-link" href="' + esc(c.url) + '" target="_blank" rel="noopener">Campaign website</a>' : "") +
        "</div></li>";
    }).join("") + "</ul>" : '<p class="empty">We couldn\'t confirm the names yet. Check your sample ballot.</p>';
    return '<article class="race"><h3>' + esc(r.title) + "</h3>" + maybeTag(r) +
      (r.about ? '<p class="about">' + esc(r.about) + "</p>" : "") +
      (r.where ? '<p class="where">' + esc(r.where) + "</p>" : "") + list +
      (r.note ? '<p class="note">' + esc(r.note) + "</p>" : "") +
      (r.coverage ? '<a class="coverage-link" href="' + esc(r.coverage) + '" target="_blank" rel="noopener">' + icon("news", 16) + "Compare news coverage on Ground News</a>" : "") + "</article>";
  }
  function questionHTML(q) {
    return '<article class="qcard"><h3>' + esc(q.title) + "</h3>" + maybeTag(q) +
      (q.where ? '<p class="where">' + esc(q.where) + "</p>" : "") + "<p>" + esc(q.plain) + "</p>" +
      '<div class="yn"><div class="yes"><b><span class="mark" aria-hidden="true"></span>If you vote Yes</b>' + esc(q.yes) +
      '</div><div class="no"><b><span class="mark" aria-hidden="true"></span>If you vote No</b>' + esc(q.no) + "</div></div></article>";
  }
  function renderBallot(fromTab) {
    renderTabs();
    var panel = $("ballot-panel"), html = "", items = itemsFor(state.tab);
    panel.setAttribute("aria-labelledby", "tab-" + state.tab);
    if (state.tab === "questions") {
      if (G.noStatewideQuestions) html += '<p class="fine">There are no statewide questions this year. These local ones only show up for people in the area listed.</p>';
      html += items.length ? items.map(questionHTML).join("") : '<p class="empty">No local questions found for your area.</p>';
    } else {
      if (state.tab === "stateHouse") items.sort(function (x, y) { return x.num - y.num; });
      html += items.length ? items.map(raceHTML).join("") : '<p class="empty">Nothing to show here for your area. Your sample ballot has the full list.</p>';
      if (state.tab === "county" || state.tab === "school") {
        Object.keys(G.counties).forEach(function (k) {
          if (G.counties[k].localNote && (!profile.county || profile.county === "all" || profile.county === k)) html += '<p class="fine">' + esc(G.counties[k].localNote) + "</p>";
        });
      }
    }
    var idx = TABS.findIndex(function (t) { return t.id === state.tab; });
    if (idx < TABS.length - 1) {
      var nx = TABS[idx + 1];
      html += '<button type="button" class="next-tab" data-next="' + nx.id + '">Next: ' + esc(nx.label) + icon("next", 18) + "</button>";
    } else {
      html += '<a class="next-tab" href="#control">Next: Why Congress matters' + icon("next", 18) + "</a>";
    }
    panel.innerHTML = html;
    if (fromTab) { panel.classList.remove("swap"); void panel.offsetWidth; panel.classList.add("swap"); }
  }

  /* ---------- my sample ballot ---------- */
  var MB_SECTIONS = [
    { lvl: "federal", t: "U.S. Senate and U.S. House" }, { lvl: "statewide", t: "Statewide offices" }, { lvl: "stateHouse", t: "SC House of Representatives" },
    { lvl: "county", t: "County" }, { lvl: "school", t: "School board (no party labels)" }, { lvl: "questions", t: "Yes/No questions" }
  ];
  function saveMarks() { save("uvg-marks-v1", marks); }
  function optHTML(raceId, val, label, sub, max) {
    var on = (marks[raceId] || []).indexOf(val) !== -1;
    return '<button type="button" class="mb-opt" aria-pressed="' + on + '" data-race="' + esc(raceId) + '" data-val="' + esc(val) + '" data-max="' + max + '">' +
      '<span class="mb-oval" aria-hidden="true"></span><span class="mb-nm">' + esc(label) + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</span></button>";
  }
  function mbRace(r, f) {
    var max = r.maxPicks || 1;
    var cands = (r.candidates || []).slice().sort(function (a, b) { return lastName(a.name) < lastName(b.name) ? -1 : 1; });
    return '<div class="mb-race' + (f === "maybe" ? " mb-maybe" : "") + '"><div class="mb-title"><b>' + esc(r.title) + "</b><span>" + (max > 1 ? "Pick up to " + max : "Pick 1") + "</span></div>" +
      (f === "maybe" ? '<p class="mb-why">Might be on your ballot. ' + esc(r.where || "") + "</p>" : "") +
      cands.map(function (c) { return optHTML(r.id, c.name, c.name, [c.party, c.running ? "with " + c.running : ""].filter(Boolean).join(", "), max); }).join("") + "</div>";
  }
  function mbQuestion(q, f) {
    return '<div class="mb-race' + (f === "maybe" ? " mb-maybe" : "") + '"><div class="mb-title"><b>' + esc(q.title) + "</b><span>Yes or No</span></div>" +
      (f === "maybe" ? '<p class="mb-why">Might be on your ballot. ' + esc(q.where || "") + "</p>" : "") +
      '<p class="mb-q">' + esc(q.plain) + "</p>" + optHTML(q.id, "Yes", "Yes", q.yes, 1) + optHTML(q.id, "No", "No", q.no, 1) + "</div>";
  }
  function renderMyBallot() {
    var box = $("mb-body"); if (!box) return;
    var P = profile;
    if (!P.county || P.county === "all") {
      box.innerHTML = '<div class="mb-empty"><p><b>First, tell us where you vote.</b> Pick your county or type your address, and we\'ll build a ballot with just your races.</p><a class="btn" href="#where">' + icon("search", 18) + "Find my districts</a></div>";
      $("mb-chips").innerHTML = ""; $("mb-count").textContent = ""; return;
    }
    var yes = 0, maybe = 0, html = "";
    MB_SECTIONS.forEach(function (sec) {
      var list = sec.lvl === "questions" ? G.questions : G.races.filter(function (r) { return r.level === sec.lvl; });
      var rows = list.map(function (x) { return { x: x, f: fit(x) }; }).filter(function (o) { return o.f !== "no"; });
      if (sec.lvl === "stateHouse") rows.sort(function (a, b) { return a.x.num - b.x.num; });
      rows.sort(function (a, b) { return (a.f === "maybe") - (b.f === "maybe"); });
      if (!rows.length) return;
      rows.forEach(function (o) { if (o.f === "yes") yes++; else maybe++; });
      html += '<section class="mb-sec"><h3>' + esc(sec.t) + "</h3>" + rows.map(function (o) { return sec.lvl === "questions" ? mbQuestion(o.x, o.f) : mbRace(o.x, o.f); }).join("") + "</section>";
    });
    box.innerHTML = html;
    $("mb-chips").innerHTML = districtChips().map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("");
    $("mb-count").innerHTML = esc(yes + (yes === 1 ? " item is" : " items are") + " on your ballot.") + (maybe ? " " + maybe + ' more might be, depending on where you live. <a href="#where">Set your districts</a> to narrow it down.' : "");
  }
  function onMarkClick(e) {
    var b = e.target.closest(".mb-opt"); if (!b) return;
    var id = b.getAttribute("data-race"), v = b.getAttribute("data-val"), max = +b.getAttribute("data-max") || 1;
    var cur = (marks[id] || []).slice(), i = cur.indexOf(v);
    if (i !== -1) cur.splice(i, 1); else if (max === 1) cur = [v]; else { if (cur.length >= max) cur.shift(); cur.push(v); }
    if (cur.length) marks[id] = cur; else delete marks[id];
    saveMarks();
    Array.prototype.forEach.call(document.querySelectorAll('.mb-opt[data-race="' + id.replace(/"/g, '\\"') + '"]'), function (x) { x.setAttribute("aria-pressed", cur.indexOf(x.getAttribute("data-val")) !== -1); });
  }
  function route() {
    var on = location.hash === "#my-ballot";
    document.body.classList.toggle("mb-mode", on);
    $("my-ballot").hidden = !on;
    if (on) { renderMyBallot(); window.scrollTo(0, 0); var h = $("mb-h"); if (h) h.focus({ preventScroll: true }); }
    else if (location.hash.length > 1) { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 0); }
    window.dispatchEvent(new Event("scroll"));
  }

  /* photos: fade in when loaded, fall back to initials if a link breaks */
  document.addEventListener("load", function (e) { if (e.target.tagName === "IMG" && e.target.parentNode.classList.contains("face")) e.target.classList.add("loaded"); }, true);
  document.addEventListener("error", function (e) {
    var img = e.target;
    if (img.tagName !== "IMG" || !img.parentNode || !img.parentNode.classList.contains("face")) return;
    /* keep it fair: if one photo in a race fails, show initials for everyone in that race */
    var race = img.closest(".race");
    var scope = img.closest(".mate") ? race && race.querySelectorAll(".mate .face img") : race && race.querySelectorAll(".person > .face img");
    if (scope) Array.prototype.forEach.call(scope, function (x) { x.remove(); }); else img.remove();
  }, true);

  /* ---------- Congress, FAQ, footer ---------- */
  function renderControl() {
    var C = G.control; if (!C) { $("control").hidden = true; return; }
    $("control-lede").textContent = C.lede;
    $("control-sides").innerHTML = C.sides.map(function (s) {
      return '<div class="side"><h3>' + esc(s.title) + '</h3><p class="who">' + esc(s.who) + "</p><ul>" +
        s.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + '</ul><p class="reads">' +
        s.links.map(function (l) { return link(l.url, l.title); }).join("") + "</p></div>";
    }).join("");
  }
  function renderNews() {
    var GN = G.groundNews, C = G.control;
    if (!GN) { $("news").hidden = true; return; }
    $("gn").innerHTML = '<p class="lede gn-sub">' + esc(GN.title) + "</p>" +
      '<div class="gn-card">' + GN.blurb.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") +
      '<a class="btn gn-btn" href="' + esc(GN.url) + '" target="_blank" rel="noopener">Open Ground News' + icon("next", 18) + "</a>" +
      (C && C.coverage && C.coverage.length ? '<p class="gn-topics">Or jump straight to a topic:</p><ul class="gn-list">' + C.coverage.map(function (l) { return "<li>" + link(l.url, l.title) + "</li>"; }).join("") + "</ul>" : "") +
      '<p class="fine">' + esc(GN.note) + "</p></div>";
  }
  function renderFAQ() {
    $("faq").innerHTML = G.faq.map(function (f) { return "<details><summary>" + esc(f.q) + "</summary><div>" + f.a + "</div></details>"; }).join("");
    var ig = G.instagram;
    $("byline").innerHTML = esc(G.byline).replace("@" + ig, '<a href="https://instagram.com/' + esc(ig) + '" target="_blank" rel="noopener">@' + esc(ig) + "</a>");
    $("updated").textContent = "last updated " + md(G.updated) + ", 2026";
    $("sample-link").href = G.links.sampleBallot;
    $("source-list").innerHTML = G.sources.map(function (s) { return "<li>" + link(s.url, s.title) + "</li>"; }).join("");
  }

  /* ---------- navigation dock: bottom bar on phones, top bar on wide screens ---------- */
  function setupNav() {
    var items = [
      { id: "top", label: "Home", ic: "home" }, { id: "plan", label: "My plan", ic: "plan" },
      { id: "ballot", label: "Ballot", ic: "ballot" }, { id: "control", label: "Congress", ic: "federal" },
      { id: "news", label: "News", long: "Ground News", ic: "news" }, { id: "help", label: "Help", ic: "help" }
    ];
    var dock = $("dock"), inner = $("dock-inner");
    inner.innerHTML = items.map(function (it) {
      return '<a href="#' + it.id + '" data-sec="' + it.id + '"' + (it.long ? ' aria-label="' + esc(it.long) + '"' : "") + ">" + icon(it.ic, 22) + (it.long ? '<span class="lbl-short">' + esc(it.label) + '</span><span class="lbl-long">' + esc(it.long) + "</span>" : "<span>" + esc(it.label) + "</span>") + "</a>";
    }).join("");
    var links = inner.querySelectorAll("a"), secs = items.map(function (it) { return $(it.id); }), header = $("top");
    inner.addEventListener("click", function (e) {
      var a = e.target.closest("a"); if (!a) return;
      if (a.getAttribute("data-sec") === "top") { e.preventDefault(); history.replaceState(null, "", location.pathname + location.search); route(); window.scrollTo({ top: 0 }); }
    });
    var ticking = false;
    function update() {
      ticking = false;
      dock.classList.toggle("show", document.body.classList.contains("mb-mode") || window.scrollY > header.offsetHeight - 80);
      var line = window.innerHeight * 0.35, cur = "top";
      if (document.body.classList.contains("mb-mode")) cur = "ballot";
      else {
        secs.forEach(function (el, i) { if (el && el.getBoundingClientRect().top <= line) cur = items[i].id; });
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = "help";
      }
      Array.prototype.forEach.call(links, function (a) {
        var on = a.getAttribute("data-sec") === cur;
        a.classList.toggle("on", on);
        if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- start ---------- */
  renderStatus();
  renderTimeline();
  ovals("county-choices", "county", countyOptions(), function (v) { setCounty(v, true); renderPlan(!!state.method); });
  if (profile.county) Array.prototype.forEach.call(document.querySelectorAll('input[name="county"]'), function (i) { i.checked = i.value === profile.county; });
  var whereEl = $("where");
  whereEl.addEventListener("click", onWhereClick);
  whereEl.addEventListener("change", onWhereChange);
  whereEl.addEventListener("submit", onFind);
  $("my-ballot").addEventListener("click", function (e) {
    onMarkClick(e);
    if (e.target.closest("#mb-print")) window.print();
    if (e.target.closest("#mb-clear")) { marks = {}; saveMarks(); renderMyBallot(); }
  });
  renderWhere();
  ovals("method-choices", "method", methodOptions(), function (v) { var first = !state.method; state.method = v; state.evDay = null; renderPlan(true); if (first && state.county) setTimeout(function () { $("plan-card").scrollIntoView({ block: "nearest" }); }, 60); });
  var tabsEl = $("ballot-tabs");
  function goTab(id, scroll) {
    state.tab = id; renderBallot(true);
    var btn = $("tab-" + id);
    if (scroll || tabsEl.getBoundingClientRect().top < 0) tabsEl.scrollIntoView({ block: "start" });
    btn.focus({ preventScroll: true });
    if (btn.scrollIntoView && tabsEl.scrollWidth > tabsEl.clientWidth) btn.scrollIntoView({ block: "nearest", inline: "center" });
  }
  tabsEl.addEventListener("click", function (e) {
    var b = e.target.closest(".tab"); if (!b) return;
    goTab(b.id.replace("tab-", ""), false);
  });
  $("ballot-panel").addEventListener("click", function (e) {
    var b = e.target.closest("button.next-tab"); if (!b) return;
    goTab(b.getAttribute("data-next"), true);
  });
  tabsEl.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var i = TABS.findIndex(function (t) { return t.id === state.tab; });
    i = (i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    goTab(TABS[i].id, false);
  });
  renderBallot();
  renderControl();
  renderNews();
  renderFAQ();
  setupNav();
  window.addEventListener("hashchange", route);
  route();
})();
