(function () {
  "use strict";
  var G = window.GUIDE;
  var state = { county: null, method: null, evDay: null, tab: "statewide", house: "all" };

  /* ---------- icons (simple line drawings) ---------- */
  function icon(name, size) {
    var s = size || 20, p = {
      statewide: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
      federal: '<path d="M3 21h18"/><path d="M5 21v-7h14v7"/><path d="M8.5 14v7M12 14v7M15.5 14v7"/><path d="M5 14a7 7 0 0 1 14 0"/><path d="M12 7V3.5"/>',
      stateHouse: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
      county: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
      school: '<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h7"/>',
      questions: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12l3 3 5-6"/>',
      pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
      check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
      cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
      share: '<path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
      news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>'
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

  /* ---------- header status ---------- */
  function renderStatus() {
    var t = todaySC(), ev = G.earlyVoting, ed = G.election.date, left = daysBetween(t, ed), msg;
    if (left < 0) msg = "Election Day has passed. Results are at " + link("https://scvotes.gov", "scVOTES.gov") + ".";
    else if (left === 0) msg = "<strong>Today is Election Day.</strong> Polls are open " + esc(G.election.hours) + ". In line by 7? You can still vote.";
    else if (t < ev.start) msg = "<strong>" + left + " days to go.</strong> Early voting opens " + esc(fmtLong(ev.start)) + ".";
    else if (t <= ev.end) {
      var open = ev.days.indexOf(t) !== -1;
      msg = "<strong>" + (open ? "You can vote early today." : "Early voting is going on now.") + "</strong> It ends " + esc(fmtLong(ev.end)) + ".";
    } else msg = "<strong>Early voting is over.</strong> Vote " + esc(fmtLong(ed)) + ", " + esc(G.election.hours) + ".";
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
    out.push({ value: "eday", label: "Vote on Election Day", hint: fmtLong(G.election.date) + ", " + G.election.hours + "." });
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
    if (!state.county || !state.method) { card.hidden = true; return; }
    var c = G.counties[state.county] || null, L = G.links, t = todaySC(), steps = [], title, sub;
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
      steps.push({ h: "Get in line by " + G.election.close, b: "<p>Polls are open " + esc(G.election.hours) + ". If you're in line when they close, stay. You still get to vote.</p>" });
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
    steps.push({ h: "Look at your ballot before you go", b: "<p>" + link(L.sampleBallot, "See my sample ballot") + ' or <a href="#ballot">look through the races below</a>, so nothing surprises you.</p>' });

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
      var c = G.counties[state.county];
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
    var m = state.method, c = G.counties[state.county], s;
    if (m === "early") s = "I'm voting early" + (state.evDay ? " on " + fmtLong(state.evDay) : "") + (c ? " in " + c.name + " County" : "") + ". Early voting is open through " + fmtLong(G.earlyVoting.end) + ", 8:30 a.m. to 6 p.m.";
    else if (m === "eday") s = "I'm voting on Election Day, " + fmtLong(G.election.date) + ". Polls are open " + G.election.hours + ".";
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
    { id: "county", label: "County" }, { id: "school", label: "School boards" }, { id: "questions", label: "Yes/No questions" }
  ];
  function inCounty(item) {
    if (!item.counties || item.counties === "all") return true;
    if (!state.county || state.county === "other") return true;
    return item.counties.indexOf(state.county) !== -1;
  }
  function itemsFor(tab) {
    if (tab === "questions") return G.questions.filter(inCounty);
    return G.races.filter(function (r) { return r.level === tab && inCounty(r); });
  }
  function renderTabs() {
    $("ballot-tabs").innerHTML = TABS.map(function (t) {
      var n = itemsFor(t.id).length;
      return '<button type="button" class="tab" role="tab" id="tab-' + t.id + '" aria-selected="' + (state.tab === t.id) + '" aria-controls="ballot-panel" tabindex="' + (state.tab === t.id ? 0 : -1) + '">' +
        icon(t.id, 18) + esc(t.label) + (n ? ' <span class="count">' + n + "</span>" : "") + "</button>";
    }).join("");
    var hint = $("county-hint"), co = G.counties[state.county];
    hint.innerHTML = co ? "Showing races for <b>" + esc(co.name + " County") + "</b>. " + '<a href="#plan">Change</a>' :
      'Showing Anderson and Spartanburg counties. <a href="#plan">Pick your county</a> to narrow it down.';
  }
  function initials(n) {
    var w = n.replace(/["“”].*?["“”]/g, "").replace(/\b(Jr|Sr|II|III|IV)\.?$/i, "").trim().split(/\s+/).filter(function (x) { return x.length > 1 || /[A-Z]/.test(x); });
    return ((w[0] || "")[0] || "") + ((w.length > 1 ? w[w.length - 1][0] : "") || "");
  }
  function face(name, img) {
    return '<span class="face">' + (img ? '<img src="' + esc(img) + '" alt="Photo of ' + esc(name) + '" loading="lazy" referrerpolicy="no-referrer">' : "") +
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
      return '<li class="person">' + face(c.name, showImg ? c.img : null) + '<div><span class="name">' + esc(c.name) + "</span>" +
        (chips ? '<span class="chips">' + chips + "</span>" : "") +
        (c.role ? '<span class="role">' + esc(c.role) + "</span>" : "") +
        (c.running ? '<span class="mate">' + face(c.running, showMateImg ? c.runningImg : null) + "<span>Running mate: <b>" + esc(c.running) + "</b></span></span>" : "") +
        (c.url ? '<a class="site-link" href="' + esc(c.url) + '" target="_blank" rel="noopener">Campaign website</a>' : "") +
        "</div></li>";
    }).join("") + "</ul>" : '<p class="empty">We couldn\'t confirm the names yet. Check your sample ballot.</p>';
    return '<article class="race"><h3>' + esc(r.title) + "</h3>" +
      (r.about ? '<p class="about">' + esc(r.about) + "</p>" : "") +
      (r.where ? '<p class="where">' + esc(r.where) + "</p>" : "") + list +
      (r.note ? '<p class="note">' + esc(r.note) + "</p>" : "") +
      (r.coverage ? '<a class="coverage-link" href="' + esc(r.coverage) + '" target="_blank" rel="noopener">' + icon("news", 16) + "Compare news coverage on Ground News</a>" : "") + "</article>";
  }
  function questionHTML(q) {
    return '<article class="qcard"><h3>' + esc(q.title) + "</h3>" +
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
      if (state.tab === "stateHouse") {
        items.sort(function (x, y) { return x.num - y.num; });
        var opts = items.map(function (r) { return '<option value="' + esc(r.id) + '"' + (state.house === r.id ? " selected" : "") + ">" + esc(r.title) + "</option>"; }).join("");
        html += '<div class="filter"><label for="house-sel">My district</label><select id="house-sel"><option value="all">Show all</option>' + opts + "</select>" +
          link(G.links.myVoterInfo, "Don't know your district? Look it up") + "</div>";
        if (state.house !== "all") items = items.filter(function (r) { return r.id === state.house; });
      }
      html += items.length ? items.map(raceHTML).join("") : '<p class="empty">Nothing to show here for your area. Your sample ballot has the full list.</p>';
      if (state.tab === "county" || state.tab === "school") {
        Object.keys(G.counties).forEach(function (k) {
          if (G.counties[k].localNote && (!state.county || state.county === "other" || state.county === k)) html += '<p class="fine">' + esc(G.counties[k].localNote) + "</p>";
        });
      }
    }
    panel.innerHTML = html;
    if (fromTab) { panel.classList.remove("swap"); void panel.offsetWidth; panel.classList.add("swap"); }
    var sel = $("house-sel");
    if (sel) sel.addEventListener("change", function () { state.house = sel.value; renderBallot(true); });
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
    if (C.coverage && C.coverage.length) {
      $("coverage").innerHTML = '<div class="coverage"><h3>See how different news outlets cover it</h3>' +
        "<p>Ground News puts stories from left, center, and right news sources side by side, so you can compare.</p><ul>" +
        C.coverage.map(function (l) { return "<li>" + link(l.url, l.title) + "</li>"; }).join("") + "</ul></div>";
    }
  }
  function renderFAQ() {
    $("faq").innerHTML = G.faq.map(function (f) { return "<details><summary>" + esc(f.q) + "</summary><div>" + f.a + "</div></details>"; }).join("");
    var ig = G.instagram;
    $("byline").innerHTML = esc(G.byline).replace("@" + ig, '<a href="https://instagram.com/' + esc(ig) + '" target="_blank" rel="noopener">@' + esc(ig) + "</a>");
    $("updated").textContent = "last updated " + md(G.updated) + ", 2026";
    $("sample-link").href = G.links.sampleBallot;
    $("source-list").innerHTML = G.sources.map(function (s) { return "<li>" + link(s.url, s.title) + "</li>"; }).join("");
  }

  /* ---------- sticky jump bar ---------- */
  function setupJump() {
    var bar = $("jump"), top = $("top"), links = bar.querySelectorAll("a");
    if (!("IntersectionObserver" in window)) { bar.classList.add("show"); return; }
    new IntersectionObserver(function (es) { bar.classList.toggle("show", !es[0].isIntersecting); }, { threshold: 0 }).observe(top);
    var secs = ["plan", "ballot", "control", "help"].map($);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) Array.prototype.forEach.call(links, function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secs.forEach(function (s) { io.observe(s); });
  }

  /* ---------- start ---------- */
  renderStatus();
  renderTimeline();
  ovals("county-choices", "county", countyOptions(), function (v) { state.county = v; state.house = "all"; renderPlan(!state.method ? false : true); renderBallot(); });
  ovals("method-choices", "method", methodOptions(), function (v) { var first = !state.method; state.method = v; state.evDay = null; renderPlan(true); if (first && state.county) setTimeout(function () { $("plan-card").scrollIntoView({ block: "nearest" }); }, 60); });
  var tabsEl = $("ballot-tabs");
  tabsEl.addEventListener("click", function (e) {
    var b = e.target.closest(".tab"); if (!b) return;
    state.tab = b.id.replace("tab-", ""); renderBallot(true); $(b.id).focus();
  });
  tabsEl.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var i = TABS.findIndex(function (t) { return t.id === state.tab; });
    i = (i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    state.tab = TABS[i].id; renderBallot(true); $("tab-" + state.tab).focus();
  });
  renderBallot();
  renderControl();
  renderFAQ();
  setupJump();
})();
