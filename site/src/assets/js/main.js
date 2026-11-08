/* Small, dependency-free progressive enhancement. The site works without it:
   phone links, content and native form validation all function with JS off. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // Forms backend: the Google Apps Script URL from config.json (formsEndpoint), or empty for our own /api.
  const API = (document.body.dataset.api || "").trim();

  /* ---------- navigation ---------- */
  const toggle = $(".nav-toggle");
  const nav = $("#site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("open", !open);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); toggle.focus(); }
    });
  }
  const clean = (p) => p.replace(/index\.html$/, "");
  const here = clean(location.pathname);
  $$(".site-nav a").forEach((a) => { if (clean(new URL(a.getAttribute("href"), location.href).pathname) === here) a.setAttribute("aria-current", "page"); });

  /* ---------- cookie consent (GDPR / ePrivacy) ---------- */
  const KEY = "cookie-consent-v1";
  const banner = $("#cookie-banner");
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
  const save = (analytics) => {
    const v = { analytics, at: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode: ask again next visit */ }
    apply(v); if (banner) banner.hidden = true;
  };
  function apply(v) {
    if (!v || !v.analytics || window.__analyticsLoaded) return;
    window.__analyticsLoaded = true;
    // Analytics only after opt-in. Swap in your GA4 ID or a cookieless tool (e.g. Plausible) at launch.
    const id = document.documentElement.dataset.ga;
    if (!id) return;
    const s = document.createElement("script");
    s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag("js", new Date()); gtag("config", id, { anonymize_ip: true });
  }
  const consent = read();
  if (banner) {
    if (!consent) banner.hidden = false; else apply(consent);
    banner.addEventListener("click", (e) => {
      const act = e.target.dataset.cookie;
      if (act === "accept") save(true);
      else if (act === "reject") save(false);
      else if (act === "prefs") {
        const p = $(".cookie-prefs", banner);
        if (p.hidden) { p.hidden = false; e.target.textContent = "Save choices"; }
        else save($("#consent-analytics").checked);
      }
    });
    $$("[data-cookie-open]").forEach((b) => b.addEventListener("click", () => { banner.hidden = false; $("button", banner).focus(); }));
  }
  // Track key actions (only fires if analytics consented and loaded)
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='tel:']");
    if (a && window.gtag) gtag("event", "click_to_call", { link_url: a.href, page: location.pathname });
  });

  /* ---------- map: load only on request (third-party cookies) ---------- */
  $$("[data-map]").forEach((box) => {
    const btn = $("button", box);
    btn && btn.addEventListener("click", () => {
      const [lat, lng] = box.dataset.map.split(",").map(Number);
      const d = 0.006;
      const f = document.createElement("iframe");
      f.title = box.dataset.title || "Map";
      f.loading = "lazy";
      f.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
      box.replaceChildren(f);
    });
  });

  /* ---------- forms ---------- */
  $$("form[data-form]").forEach((form) => {
    const ts = form.querySelector("[name=_ts]");
    if (ts) ts.value = String(Date.now());
    form.setAttribute("novalidate", "");
    const status = document.createElement("div");
    status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite"); status.tabIndex = -1;
    form.prepend(status);

    const showError = (el, msg) => {
      const id = `${el.id || el.name}-err`;
      let p = document.getElementById(id);
      if (!msg) { el.removeAttribute("aria-invalid"); p && p.remove(); return; }
      el.setAttribute("aria-invalid", "true");
      if (!p) { p = document.createElement("p"); p.id = id; p.className = "field-error"; (el.closest(".field, .choice, fieldset") || el).after(p); }
      p.textContent = msg;
      el.setAttribute("aria-describedby", [el.dataset.hintId, id].filter(Boolean).join(" "));
    };
    const message = (el) => {
      const v = el.validity;
      const label = (el.labels && el.labels[0] ? el.labels[0].textContent : el.name).replace(/\(optional\)|\*/gi, "").trim();
      if (v.valueMissing) return el.type === "checkbox" ? "Please tick this box to continue." : `Please enter ${label.toLowerCase()}.`;
      if (v.typeMismatch && el.type === "email") return "Please enter an email address like name@example.ie.";
      if (v.patternMismatch) return el.dataset.patternMsg || "Please check the format.";
      if (v.tooLong) return `Please keep this under ${el.maxLength} characters.`;
      if (v.rangeUnderflow || v.rangeOverflow) return el.dataset.rangeMsg || "Please choose a date in the allowed range.";
      return "";
    };
    // Errors are added on blur (only for fields the person has typed in) and cleared as soon as the
    // field becomes valid. Never remove an error on blur: that shifts the layout under the pointer
    // and can swallow the click on the submit button.
    $$("input, select, textarea", form).forEach((el) => {
      if (el.name === "website" || el.type === "hidden") return;
      el.addEventListener("blur", () => { const m = message(el); if (m && el.dataset.touched) showError(el, m); });
      const fix = () => { el.dataset.touched = "1"; if (el.getAttribute("aria-invalid") === "true" && !message(el)) showError(el, ""); };
      el.addEventListener("input", fix); el.addEventListener("change", fix);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let first = null;
      $$("input, select, textarea", form).forEach((el) => {
        if (el.name === "website" || el.type === "hidden") return;
        const m = message(el); showError(el, m); if (m && !first) first = el;
      });
      if (first) {
        status.className = "form-status err"; status.textContent = "Please check the highlighted fields.";
        first.focus(); return;
      }
      if (location.protocol === "file:" && !API) {
        status.className = "form-status err";
        status.textContent = "This is an offline preview, so forms can't be sent. Run the site with “npm start” to test forms. On the live website they go straight to the funeral home.";
        status.focus(); return;
      }
      const btn = $("button[type=submit]", form);
      btn.disabled = true; const label = btn.textContent; btn.textContent = "Sending…";
      const data = {};
      new FormData(form).forEach((v, k) => { if (k in data) data[k] = [].concat(data[k], v); else data[k] = v; });
      try {
        // With formsEndpoint set (Google Sheets backend) post there as text/plain: a "simple" request,
        // so the browser needs no CORS preflight, which Apps Script cannot answer. Otherwise use our own /api.
        const r = API
          ? await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ form: form.dataset.form, ...data }) })
          : await fetch(`/api/forms/${form.dataset.form}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.error) throw Object.assign(new Error(j.error || "Something went wrong."), { fields: j.fields });
        status.className = "form-status ok";
        status.textContent = form.dataset.success || j.message || "Thank you. We have received your message.";
        form.reset(); if (ts) ts.value = String(Date.now());
        if (window.gtag) gtag("event", "form_submit", { form_id: form.dataset.form });
      } catch (err) {
        status.className = "form-status err";
        status.textContent = `${err.message} If it is urgent, please call us day or night on ${document.body.dataset.phone || "our 24-hour number"}.`;
        if (err.fields) Object.entries(err.fields).forEach(([n, m]) => { const el = form.elements[n]; el && showError(el.length && !el.tagName ? el[0] : el, m); });
      } finally { btn.disabled = false; btn.textContent = label; status.focus({ preventScroll: true }); status.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
    });
  });

  // Dates: no future dates for a date of death
  $$("input[data-no-future]").forEach((i) => (i.max = new Date().toISOString().slice(0, 10)));
  $$("input[data-future]").forEach((i) => { const d = new Date(); d.setDate(d.getDate() + 1); i.min = d.toISOString().slice(0, 10); });

  /* ---------- notices: approved condolences + quick filter ---------- */
  const box = $("#condolences");
  if (box) {
    const n = encodeURIComponent(box.dataset.notice);
    fetch(API ? `${API}?action=condolences&notice=${n}` : `/api/condolences?notice=${n}`).then((r) => (r.ok ? r.json() : [])).then((items) => {
      if (!Array.isArray(items) || !items.length) return;
      box.replaceChildren(...items.map((c) => {
        const d = document.createElement("div"); d.className = "condolence";
        const p = document.createElement("p"); p.textContent = c.message; // textContent: never inject HTML
        const m = document.createElement("p"); m.className = "small muted"; m.textContent = `${c.name}${c.town ? ", " + c.town : ""} · ${c.date}`;
        d.append(p, m); return d;
      }));
    }).catch(() => {});
  }
  const q = $("#q");
  if (q) {
    const cards = $$(".notice-card");
    const filter = () => { const t = q.value.trim().toLowerCase(); cards.forEach((c) => (c.hidden = !!t && !c.textContent.toLowerCase().includes(t))); };
    q.value = new URLSearchParams(location.search).get("q") || ""; filter();
    q.addEventListener("input", filter);
  }

  /* ---------- pre-planning cost calculator ---------- */
  const calc = $("#calculator");
  if (calc) {
    const out = $("#calc-total"), list = $("#calc-lines"), hidden = $("#estimate-field");
    const fmt = (n) => "€" + n.toLocaleString("en-IE");
    const run = () => {
      let lo = 0, hi = 0; const lines = [];
      $$("[data-price]", calc).forEach((el) => {
        if (el.disabled || el.tagName === "OPTION") return;
        const on = el.type === "checkbox" || el.type === "radio" ? el.checked : true;
        let val = el.tagName === "SELECT" ? el.selectedOptions[0] : el;
        if (!on || !val.dataset.price) return;
        const [a, b] = val.dataset.price.split("-").map(Number);
        lo += a; hi += b ?? a;
        lines.push(`${val.dataset.label || val.textContent.trim()}: ${b ? fmt(a) + "–" + fmt(b) : fmt(a)}`);
      });
      out.textContent = lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`;
      list.replaceChildren(...lines.map((t) => Object.assign(document.createElement("li"), { textContent: t })));
      if (hidden) hidden.value = `${out.textContent} | ${lines.join("; ")}`;
    };
    // burial vs cremation shows the relevant third-party options
    const syncType = () => {
      const type = ($("input[name=calc_type]:checked", calc) || {}).value;
      $$("[data-for]", calc).forEach((g) => {
        const show = g.dataset.for.split(" ").includes(type);
        g.hidden = !show;
        $$("input,select", g).forEach((i) => { i.disabled = !show; if (!show && i.type === "checkbox") i.checked = false; });
      });
    };
    calc.addEventListener("change", () => { syncType(); run(); });
    calc.addEventListener("submit", (e) => e.preventDefault());
    syncType(); run();
  }
})();
