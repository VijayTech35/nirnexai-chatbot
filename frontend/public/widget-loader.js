/**
 * NirnexAI Chat Widget loader.
 *
 * Paste one line on any site:
 *   <script data-nirnex-widget="https://nirnexai-chatbot.onrender.com" async src="https://nirnexai-chatbot.onrender.com/widget-loader.js"></script>
 *
 * Options (data-* attributes on that script tag):
 *   data-nirnex-widget  -> base URL of the chatbot app (required)
 *   data-auto           -> delay in seconds before auto-opening (default 10, set 0 to disable)
 *   data-once           -> "1" to only auto-open on the first visit per browser
 *   data-accent         -> brand hex color, e.g. #6366f1
 *   data-greeting       -> custom first message
 *   data-name           -> assistant display name
 *
 * It injects a bottom-right bubble + an iframe chat panel powered by the
 * app's /widget route. All chat traffic stays inside the app origin.
 */
(function () {
  if (window.__nirnexWidgetLoaded) return;
  window.__nirnexWidgetLoaded = true;

  var script = document.currentScript;
  function attr(name, fallback) {
    if (!script) return fallback;
    return script.getAttribute(name) || fallback;
  }
  var base = (attr("data-nirnex-widget") || "").replace(/\/+$/, "");
  if (!base) {
    console.warn("[NirnexAI] missing data-nirnex-widget base URL.");
    return;
  }

  var autoDelay = parseFloat(attr("data-auto", "10"));
  // data-auto="0" means never auto-open
  var once = attr("data-once", "0") === "1";
  var accent = attr("data-accent", "");
  var greeting = attr("data-greeting", "");
  var name = attr("data-name", "");

  function qs() {
    var parts = [];
    if (accent) parts.push("accent=" + encodeURIComponent(accent));
    if (greeting) parts.push("greeting=" + encodeURIComponent(greeting));
    if (name) parts.push("name=" + encodeURIComponent(name));
    return parts.length ? "?" + parts.join("&") : "";
  }

  // ---- styles ----
  var style = document.createElement("style");
  style.textContent =
    "#nirnex-widget-root{position:fixed;z-index:999999;right:20px;bottom:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
    "#nirnex-widget-bubble{display:flex;align-items:center;justify-content:center;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;box-shadow:0 8px 28px rgba(0,0,0,.28);transition:transform .18s ease;position:relative}" +
    "#nirnex-widget-bubble:hover{transform:scale(1.06)}" +
    "#nirnex-widget-bubble svg{width:28px;height:28px}" +
    "#nirnex-widget-bubble .closer{width:18px;height:18px;stroke-width:2.5}" +
    "#nirnex-widget-badge{position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:none;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3)}" +
    "#nirnex-widget-frame{position:fixed;z-index:999998;right:20px;bottom:86px;width:400px;max-width:calc(100vw - 24px);height:600px;max-height:calc(100dvh - 120px);border:none;border-radius:18px;box-shadow:0 24px 70px -18px rgba(0,0,0,.45);opacity:0;visibility:hidden;transform:translateY(16px) scale(.97);transition:opacity .2s ease,transform .2s ease,visibility .2s ease;background:#ffffff}" +
    "#nirnex-widget-frame.open{opacity:1;visibility:visible;transform:none}" +
    "@media (max-width:540px){#nirnex-widget-root{right:12px;bottom:12px}#nirnex-widget-frame{right:0;bottom:0;left:0;top:0;width:100%;max-width:100%;height:100dvh;max-height:100dvh;border-radius:0}}";

  // ---- DOM ----
  var root = document.createElement("div");
  root.id = "nirnex-widget-root";
  root.innerHTML =
    '<div id="nirnex-widget-frame" role="dialog" aria-label="Chat"></div>' +
    '<button id="nirnex-widget-bubble" aria-label="Open chat" aria-expanded="false">' +
    '<span id="nirnex-widget-badge">1</span>' +
    "</button>";

  document.body.appendChild(style);
  document.body.appendChild(root);

  var bubble = document.getElementById("nirnex-widget-bubble");
  var badge = document.getElementById("nirnex-widget-badge");
  var frame = document.getElementById("nirnex-widget-frame");
  var open = false;
  var chatInited = false;

  function bubbleSvg(cross) {
    if (cross) {
      bubble.innerHTML =
        '<svg class="closer" viewBox="0 0 24 24" fill="none" stroke="' +
        bubbleAccentStroke() +
        '" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      return;
    }
    bubble.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="' +
      bubbleAccentStroke() +
      '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  }
  function bubbleAccentStroke() {
    return "white";
  }
  function applyAccent() {
    if (!accent) return;
    bubble.style.background = accent;
    frame.style.background = "#ffffff";
  }
  applyAccent();
  bubbleSvg(false);

  function openChat() {
    open = true;
    frame.classList.add("open");
    bubble.setAttribute("aria-expanded", "true");
    bubbleSvg(true);
    badge.style.display = "none";
    if (!chatInited) {
      chatInited = true;
      frame.src = base + "/widget" + qs();
    }
  }
  function closeChat() {
    open = false;
    frame.classList.remove("open");
    bubble.setAttribute("aria-expanded", "false");
    bubbleSvg(false);
  }

  bubble.addEventListener("click", function () {
    if (open) closeChat();
    else openChat();
  });

  window.addEventListener("message", function (e) {
    try {
      var d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      if (d && d.type === "nirnex-close") closeChat();
      if (d && d.type === "nirnex-unread" && !open) {
        var n = parseInt(badge.textContent || "0", 10);
        badge.textContent = n + 1;
        badge.style.display = "flex";
      }
    } catch (err) {}
  });

  // ---- auto-open ----
  if (autoDelay > 0) {
    var shouldAuto = true;
    if (once) {
      try {
        if (sessionStorage.getItem("nirnex_widget_seen")) shouldAuto = false;
        else sessionStorage.setItem("nirnex_widget_seen", "1");
      } catch (e) {}
    }
    if (shouldAuto) {
      setTimeout(function () {
        // don't auto-open if the user already opened/closed it
        if (window.__nirnexWidgetDismissed) return;
        openChat();
      }, autoDelay * 1000);
    }
  }
  // respect prior dismissal (user clicked X) within this session
  window.addEventListener("message", function (e) {
    try {
      var d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      if (d && d.type === "nirnex-close") window.__nirnexWidgetDismissed = true;
    } catch (err) {}
  });

  window.nirnexWidget = { open: openChat, close: closeChat };
})();
