/* @ds-bundle: {"format":4,"namespace":"PeterPersonalDesignSystem_77c09f","components":[],"sourceHashes":{"slides/deck-stage.js":"d8d952171670","ui_kits/personal-os/CommandPalette.jsx":"b790dae1495c","ui_kits/personal-os/Icon.jsx":"3a2dec6a52f8","ui_kits/personal-os/NotesView.jsx":"b0193a0627f3","ui_kits/personal-os/OverviewView.jsx":"6812552cc7ed","ui_kits/personal-os/Sidebar.jsx":"d1f2f4435d11","ui_kits/personal-os/TasksView.jsx":"489abcdcd404","ui_kits/personal-os/TopBar.jsx":"5990cf0eaf71","ui_kits/personal-os/app.jsx":"51ecc54b2eef"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PeterPersonalDesignSystem_77c09f = window.PeterPersonalDesignSystem_77c09f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// slides/deck-stage.js
try { (() => {
/**
 * <deck-stage> — reusable web component for HTML decks.
 *
 * Handles:
 *  (a) speaker notes — reads <script type="application/json" id="speaker-notes">
 *      and posts {slideIndexChanged: N} to the parent window on nav.
 *  (b) keyboard navigation — ←/→, PgUp/PgDn, Space, Home/End, number keys.
 *  (c) press R to reset to slide 0 (with a tasteful keyboard hint).
 *  (d) bottom-center overlay showing slide count + hints, fades out on idle.
 *  (e) auto-scaling — inner canvas is a fixed design size (default 1920×1080)
 *      scaled with `transform: scale()` to fit the viewport, letterboxed.
 *      Set the `noscale` attribute to render at authored size (1:1) — the
 *      PPTX exporter sets this so its DOM capture sees unscaled geometry.
 *  (f) print — `@media print` lays every slide out as its own page at the
 *      design size, so the browser's Print → Save as PDF produces a clean
 *      one-page-per-slide PDF with no extra setup.
 *  (g) thumbnail rail — resizable left-hand column of per-slide thumbnails
 *      (static clones). Click to navigate; ↑/↓ with a thumbnail focused to
 *      step between slides; drag to reorder; right-click for
 *      Skip / Move up / Move down / Delete (opens a Cancel/Delete confirm
 *      dialog). Drag the rail's right edge to resize; width persists to
 *      localStorage. Skipped slides carry `data-deck-skip`, are dimmed in
 *      the rail, omitted from prev/next navigation, and hidden at print.
 *      The rail is suppressed in presenting mode, in the host's Preview
 *      mode (ViewerMode='none'), on `noscale`, and via the `no-rail`
 *      attribute. Rail mutations dispatch a `deckchange`
 *      CustomEvent on the element: detail = {action, from, to, slide}.
 *
 * Slides are HIDDEN, not unmounted. Non-active slides stay in the DOM with
 * `visibility: hidden` + `opacity: 0`, so their state (videos, iframes,
 * form inputs, React trees) is preserved across navigation.
 *
 * Lifecycle event — the component dispatches a `slidechange` CustomEvent on
 * itself whenever the active slide changes (including the initial mount).
 * The event bubbles and composes out of shadow DOM, so you can listen on
 * the <deck-stage> element or on document:
 *
 *   document.querySelector('deck-stage').addEventListener('slidechange', (e) => {
 *     e.detail.index         // new 0-based index
 *     e.detail.previousIndex // previous index, or -1 on init
 *     e.detail.total         // total slide count
 *     e.detail.slide         // the new active slide element
 *     e.detail.previousSlide // the prior slide element, or null on init
 *     e.detail.reason        // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
 *   });
 *
 * Persistence: none at the deck level. The host app keeps the current slide
 * in its own URL (?slide=) and re-delivers it via location.hash on load, so a
 * bare load with no hash always starts at slide 1.
 *
 * Usage:
 *   <style>deck-stage:not(:defined){visibility:hidden}</style>
 *   <deck-stage width="1920" height="1080">
 *     <section data-label="Title">...</section>
 *     <section data-label="Agenda">...</section>
 *   </deck-stage>
 *   <script src="deck-stage.js"></script>
 *
 * The :not(:defined) rule prevents a flash of the first slide at its
 * authored styles before this script runs and attaches the shadow root.
 *
 * Slides are the direct element children of <deck-stage>. Each slide is
 * automatically tagged with:
 *   - data-screen-label="NN Label"   (1-indexed, for comment flow)
 *   - data-om-validate="no_overflowing_text,no_overlapping_text,slide_sized_text"
 */

(() => {
  const DESIGN_W_DEFAULT = 1920;
  const DESIGN_H_DEFAULT = 1080;
  const OVERLAY_HIDE_MS = 1800;
  const VALIDATE_ATTR = 'no_overflowing_text,no_overlapping_text,slide_sized_text';
  const pad2 = n => String(n).padStart(2, '0');

  // Label precedence: data-label → data-screen-label (number stripped) → first heading → "Slide".
  const getSlideLabel = el => {
    const explicit = el.getAttribute('data-label');
    if (explicit) return explicit;
    const existing = el.getAttribute('data-screen-label');
    if (existing) return existing.replace(/^\s*\d+\s*/, '').trim() || existing;
    const h = el.querySelector('h1, h2, h3, [data-title]');
    const t = h && (h.textContent || '').trim().slice(0, 40);
    if (t) return t;
    return 'Slide';
  };
  const stylesheet = `
    :host {
      position: fixed;
      inset: 0;
      display: block;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      overflow: hidden;
    }
    /* connectedCallback holds this until document.fonts.ready (capped 2s) so
     * the first visible paint has the deck's real typography + final rail
     * layout. opacity (not visibility) so the active slide can't un-hide
     * itself via the ::slotted([data-deck-active]) visibility:visible rule.
     * Only the stage/rail hide — the black :host background stays, so the
     * iframe doesn't flash the page's default white. */
    :host([data-fonts-pending]) .stage,
    :host([data-fonts-pending]) .rail { opacity: 0; pointer-events: none; }

    .stage {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .canvas {
      position: relative;
      transform-origin: center center;
      flex-shrink: 0;
      background: #fff;
      will-change: transform;
    }

    /* Slides live in light DOM (via <slot>) so authored CSS still applies.
       We absolutely position each slotted child to stack them. */
    ::slotted(*) {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }
    ::slotted([data-deck-active]) {
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
    }

    /* Tap zones for mobile — back/forward thirds like Stories.
       Transparent, no visible UI, don't block the overlay. */
    .tapzones {
      position: fixed;
      inset: 0;
      display: flex;
      z-index: 2147482000;
      pointer-events: none;
    }
    .tapzone {
      flex: 1;
      pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
    }
    /* Only activate tap zones on coarse pointers (touch devices). */
    @media (hover: hover) and (pointer: fine) {
      .tapzones { display: none; }
    }

    .overlay {
      position: fixed;
      left: 50%;
      bottom: 22px;
      transform: translate(-50%, 6px) scale(0.92);
      filter: blur(6px);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: #000;
      color: #fff;
      border-radius: 999px;
      font-size: 12px;
      font-feature-settings: "tnum" 1;
      letter-spacing: 0.01em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 260ms ease, transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease;
      transform-origin: center bottom;
      z-index: 2147483000;
      user-select: none;
    }
    .overlay[data-visible] {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0) scale(1);
      filter: blur(0);
    }

    .btn {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      margin: 0;
      padding: 0;
      color: inherit;
      font: inherit;
      cursor: default;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 28px;
      min-width: 28px;
      border-radius: 999px;
      color: rgba(255,255,255,0.72);
      transition: background 140ms ease, color 140ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .btn:active { background: rgba(255,255,255,0.18); }
    .btn:focus { outline: none; }
    .btn:focus-visible { outline: none; }
    .btn::-moz-focus-inner { border: 0; }
    .btn svg { width: 14px; height: 14px; display: block; }
    .btn.reset {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      padding: 0 10px 0 12px;
      gap: 6px;
      color: rgba(255,255,255,0.72);
    }
    .btn.reset .kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 10px;
      line-height: 1;
      color: rgba(255,255,255,0.88);
      background: rgba(255,255,255,0.12);
      border-radius: 4px;
    }

    .count {
      font-variant-numeric: tabular-nums;
      color: #fff;
      font-weight: 500;
      padding: 0 8px;
      min-width: 42px;
      text-align: center;
      font-size: 12px;
    }
    .count .sep { color: rgba(255,255,255,0.45); margin: 0 3px; font-weight: 400; }
    .count .total { color: rgba(255,255,255,0.55); }

    .divider {
      width: 1px;
      height: 14px;
      background: rgba(255,255,255,0.18);
      margin: 0 2px;
    }

    /* ── Thumbnail rail ──────────────────────────────────────────────────
       Fixed column on the left; each thumbnail is a static deep-clone of
       the light-DOM slide scaled into a 16:9 (or design-aspect) frame. The
       stage re-fits around it (see _fit); hidden during present / noscale
       / print so capture geometry and fullscreen output are unchanged. */
    .rail {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: var(--deck-rail-w, 188px);
      background: #141414;
      border-right: 1px solid rgba(255,255,255,0.08);
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px 10px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 2147482500;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.18) transparent;
    }
    .rail::-webkit-scrollbar { width: 8px; }
    .rail::-webkit-scrollbar-track { background: transparent; margin: 2px; }
    .rail::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.18);
      border-radius: 4px;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    .rail::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.28);
      border: 2px solid transparent;
      background-clip: content-box;
    }
    :host([no-rail]) .rail,
    :host([noscale]) .rail { display: none; }
    .rail[data-presenting] { display: none; }
    /* User-driven show/hide (the TweaksPanel toggle) slides instead of
       popping. Transitions are gated on :host([data-rail-anim]) — set only
       for the 200ms around the toggle — so window-resize and rail-width
       drag (which also call _fit) don't lag behind the cursor. */
    .rail[data-user-hidden] { transform: translateX(-100%); }
    :host([data-rail-anim]) .rail { transition: transform 200ms cubic-bezier(.3,.7,.4,1); }
    :host([data-rail-anim]) .stage { transition: left 200ms cubic-bezier(.3,.7,.4,1); }
    :host([data-rail-anim]) .canvas { transition: transform 200ms cubic-bezier(.3,.7,.4,1); }
    /* transition shorthand replaces rather than merges — repeat the base
       .overlay opacity/transform/filter transitions so visibility changes
       during the 200ms toggle window still fade instead of popping. */
    :host([data-rail-anim]) .overlay {
      transition: margin-left 200ms cubic-bezier(.3,.7,.4,1),
                  opacity 260ms ease,
                  transform 260ms cubic-bezier(.2,.8,.2,1),
                  filter 260ms ease;
    }
    :host([data-rail-anim]) .tapzones { transition: left 200ms cubic-bezier(.3,.7,.4,1); }

    .thumb {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .thumb .num {
      width: 16px;
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 500;
      text-align: right;
      color: rgba(255,255,255,0.55);
      padding-top: 2px;
      font-variant-numeric: tabular-nums;
    }
    .thumb .frame {
      position: relative;
      flex: 1;
      min-width: 0;
      aspect-ratio: var(--deck-aspect);
      background: #fff;
      border-radius: 4px;
      outline: 2px solid transparent;
      outline-offset: 0;
      overflow: hidden;
      transition: outline-color 120ms ease;
    }
    .thumb:hover .frame { outline-color: rgba(255,255,255,0.25); }
    .thumb { outline: none; }
    .thumb:focus-visible .frame { outline-color: rgba(255,255,255,0.5); }
    .thumb[data-current] .num { color: #fff; }
    .thumb[data-current] .frame { outline-color: #D97757; }
    .thumb[data-dragging] { opacity: 0.35; }
    .thumb::before {
      content: '';
      position: absolute;
      left: 24px;
      right: 0;
      height: 3px;
      border-radius: 2px;
      background: #D97757;
      opacity: 0;
      pointer-events: none;
    }
    .thumb[data-drop="before"]::before { top: -8px; opacity: 1; }
    .thumb[data-drop="after"]::before { bottom: -8px; opacity: 1; }
    .thumb[data-skip] .frame { opacity: 0.35; }
    .thumb[data-skip] .frame::after {
      content: 'Skipped';
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.45);
      color: #fff;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.04em;
    }

    .ctxmenu {
      position: fixed;
      min-width: 150px;
      padding: 4px;
      background: #242424;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 7px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      z-index: 2147483100;
      display: none;
      font-size: 12px;
    }
    .ctxmenu[data-open] { display: block; }
    .ctxmenu button {
      display: block;
      width: 100%;
      appearance: none;
      border: 0;
      background: transparent;
      color: #e8e8e8;
      font: inherit;
      text-align: left;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
    }
    .ctxmenu button:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
    .ctxmenu button:disabled { opacity: 0.35; cursor: default; }
    .ctxmenu hr {
      border: 0;
      border-top: 1px solid rgba(255,255,255,0.1);
      margin: 4px 2px;
    }

    .rail-resize {
      position: fixed;
      left: calc(var(--deck-rail-w, 188px) - 3px);
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
      z-index: 2147482600;
      touch-action: none;
    }
    .rail-resize:hover,
    .rail-resize[data-dragging] { background: rgba(255,255,255,0.12); }
    :host([no-rail]) .rail-resize,
    :host([noscale]) .rail-resize,
    .rail[data-presenting] + .rail-resize,
    .rail[data-user-hidden] + .rail-resize { display: none; }

    /* Delete-confirm popup — matches the SPA's ConfirmDialog layout
       (title + message body, depressed footer with Cancel / Delete). */
    .confirm-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 2147483200;
      display: none;
      align-items: center;
      justify-content: center;
    }
    .confirm-backdrop[data-open] { display: flex; }
    .confirm {
      width: 320px;
      max-width: calc(100vw - 32px);
      background: #2a2a2a;
      color: #e8e8e8;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
      overflow: hidden;
      font-family: inherit;
      animation: deck-confirm-in 0.18s ease;
    }
    @keyframes deck-confirm-in {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .confirm .body { padding: 20px 20px 16px; }
    .confirm .title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .confirm .msg { font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.65); }
    .confirm .footer {
      padding: 14px 20px;
      background: #1f1f1f;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .confirm button {
      appearance: none;
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
    }
    .confirm .cancel {
      background: transparent;
      border: 0;
      color: rgba(255,255,255,0.8);
    }
    .confirm .cancel:hover { background: rgba(255,255,255,0.08); }
    .confirm .danger {
      background: #c96442;
      border: 1px solid rgba(0,0,0,0.15);
      color: #fff;
      box-shadow: 0 1px 3px rgba(166,50,68,0.3), 0 2px 6px rgba(166,50,68,0.18);
    }
    .confirm .danger:hover { background: #b5563a; }

    /* ── Print: one page per slide, no chrome ────────────────────────────
       The screen layout stacks every slide at inset:0 inside a scaled
       canvas; for print we want them in document flow at the authored
       design size so the browser paginates one slide per sheet. The
       @page size is set from the width/height attributes via the inline
       <style id="deck-stage-print-page"> that connectedCallback injects
       into <head> (the @page at-rule has no effect inside shadow DOM). */
    @media print {
      :host {
        position: static;
        inset: auto;
        background: none;
        overflow: visible;
        color: inherit;
      }
      .stage { position: static; display: block; }
      .canvas {
        transform: none !important;
        width: auto !important;
        height: auto !important;
        background: none;
        will-change: auto;
      }
      ::slotted(*) {
        position: relative !important;
        inset: auto !important;
        width: var(--deck-design-w) !important;
        height: var(--deck-design-h) !important;
        box-sizing: border-box !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto;
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
        overflow: hidden;
      }
      /* :last-child alone isn't enough once data-deck-skip hides the
         trailing slide(s) — the last *visible* slide still carries
         break-after:page and prints a blank sheet. _markLastVisible()
         maintains data-deck-last-visible on the last non-skipped slide. */
      ::slotted(*:last-child),
      ::slotted([data-deck-last-visible]) {
        break-after: auto;
        page-break-after: auto;
      }
      ::slotted([data-deck-skip]) { display: none !important; }
      .overlay, .tapzones, .rail, .rail-resize, .ctxmenu, .confirm-backdrop { display: none !important; }
    }
  `;
  class DeckStage extends HTMLElement {
    static get observedAttributes() {
      return ['width', 'height', 'noscale', 'no-rail'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._index = 0;
      this._slides = [];
      this._notes = [];
      this._hideTimer = null;
      this._mouseIdleTimer = null;
      this._menuIndex = -1;
      this._onKey = this._onKey.bind(this);
      this._onResize = this._onResize.bind(this);
      this._onSlotChange = this._onSlotChange.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onTapBack = this._onTapBack.bind(this);
      this._onTapForward = this._onTapForward.bind(this);
      this._onMessage = this._onMessage.bind(this);
      // Capture-phase close so a click anywhere dismisses the menu, but
      // ignore clicks that land inside the menu itself — otherwise the
      // capture handler runs before the menu's own (bubble) handler and
      // clears _menuIndex out from under it.
      this._onDocClick = e => {
        if (this._menu && e.composedPath && e.composedPath().includes(this._menu)) return;
        this._closeMenu();
      };
    }
    get designWidth() {
      return parseInt(this.getAttribute('width'), 10) || DESIGN_W_DEFAULT;
    }
    get designHeight() {
      return parseInt(this.getAttribute('height'), 10) || DESIGN_H_DEFAULT;
    }
    connectedCallback() {
      // Presenter-view popup loads deckUrl?_snthumb=...#N for its prev/cur/
      // next thumbnails — the rail has no business rendering inside those
      // (wrong scale, and it offsets the stage so the thumb shows a gutter).
      if (/[?&]_snthumb=/.test(location.search)) this.setAttribute('no-rail', '');
      this._render();
      this._loadNotes();
      this._syncPrintPageRule();
      window.addEventListener('keydown', this._onKey);
      window.addEventListener('resize', this._onResize);
      window.addEventListener('mousemove', this._onMouseMove, {
        passive: true
      });
      window.addEventListener('message', this._onMessage);
      window.addEventListener('click', this._onDocClick, true);
      // Initial collection + layout happens via slotchange, which fires on mount.
      this._enableRail();
      // Hold the stage hidden until webfonts are ready so the first visible
      // paint has the deck's real typography — the :not(:defined) guard in
      // the page HTML only covers custom-element upgrade, not font load.
      // Capped so a 404'd font URL can't blank the deck indefinitely.
      this.setAttribute('data-fonts-pending', '');
      const reveal = () => this.removeAttribute('data-fonts-pending');
      // rAF first: fonts.ready is a pre-resolved promise until layout has
      // resolved the slotted text's font-family and pushed a FontFace into
      // 'loading'. Reading it here in connectedCallback (parse-time) would
      // settle the race in a microtask before any font fetch starts.
      requestAnimationFrame(() => {
        Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 2000))]).then(reveal, reveal);
      });
    }
    _enableRail() {
      // Idempotent — older host builds still post __omelette_rail_enabled.
      // no-rail guard keeps the observers/stylesheet walk off the cheap path
      // for presenter-popup thumbnail iframes (up to 9 per view).
      if (this._railEnabled || this.hasAttribute('no-rail')) return;
      this._railEnabled = true;
      // Per-viewer preference — restored alongside rail width. Default on;
      // only a stored '0' (from the TweaksPanel toggle) hides it.
      this._railVisible = true;
      try {
        if (localStorage.getItem('deck-stage.railVisible') === '0') this._railVisible = false;
      } catch (e) {}
      // Live thumbnail updates: watch the light-DOM slides for content
      // edits and re-clone just the affected thumb(s), debounced. Ignore
      // the data-deck-* / data-screen-label / data-om-validate attributes
      // this component itself writes so nav and skip don't trigger
      // spurious refreshes.
      const OWN_ATTRS = /^data-(deck-|screen-label$|om-validate$)/;
      this._liveDirty = new Set();
      this._liveObserver = new MutationObserver(records => {
        for (const r of records) {
          if (r.type === 'attributes' && OWN_ATTRS.test(r.attributeName || '')) continue;
          let n = r.target;
          while (n && n.parentElement !== this) n = n.parentElement;
          if (n && this._slideSet && this._slideSet.has(n)) this._liveDirty.add(n);
        }
        if (this._liveDirty.size && !this._liveTimer) {
          this._liveTimer = setTimeout(() => {
            this._liveTimer = null;
            this._liveDirty.forEach(s => this._refreshThumb(s));
            this._liveDirty.clear();
          }, 200);
        }
      });
      this._liveObserver.observe(this, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });
      // Lazy thumbnail materialization — clone the slide only when its
      // frame scrolls into (or near) the rail viewport. rootMargin gives
      // ~4 thumbs of pre-load so fast scrolling doesn't flash blanks.
      this._railObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && e.target.__deckThumb) {
            this._materialize(e.target.__deckThumb);
          }
        });
      }, {
        root: this._rail,
        rootMargin: '400px 0px'
      });
      // Tweaks typically change CSS vars / attrs OUTSIDE <deck-stage>
      // (on <html>, <body>, a wrapper div, or a <style> tag), which
      // _liveObserver can't see. Re-snapshot author CSS (constructable
      // sheet is shared by reference, so one replaceSync updates every
      // thumb shadow root) and re-sync each thumb host's attrs + custom
      // properties. In-slide DOM mutations are _liveObserver's job.
      // Debounced so slider drags don't thrash.
      this._onTweakChange = () => {
        clearTimeout(this._tweakTimer);
        this._tweakTimer = setTimeout(() => {
          this._snapshotAuthorCss();
          // One getComputedStyle for the whole batch — each
          // getPropertyValue read below reuses the same computed style
          // as long as nothing invalidates layout between thumbs.
          const cs = getComputedStyle(this);
          (this._thumbs || []).forEach(t => {
            if (t.host) this._syncThumbHostAttrs(t.host, cs);
          });
        }, 120);
      };
      window.addEventListener('tweakchange', this._onTweakChange);
      this._snapshotAuthorCss();
      // Build the rail now that it's enabled — slotchange already fired,
      // so _renderRail's early-return skipped the initial build.
      this._syncRailHidden();
      this._renderRail();
      this._fit();
    }

    /** Snapshot document stylesheets into a constructable sheet that each
     *  thumbnail's nested shadow root adopts — so author CSS styles the
     *  cloned slide content without touching this component's chrome.
     *  Cross-origin sheets throw on .cssRules — skip them. Re-callable:
     *  the existing constructable sheet is reused via replaceSync so every
     *  already-adopted shadow root picks up the fresh CSS without re-adopt. */
    _snapshotAuthorCss() {
      // :root in an adopted sheet inside a shadow root matches nothing
      // (only the document root qualifies), so author rules like
      // `:root[data-voice="modern"] .serif` never reach the clones.
      // Rewrite :root → :host and mirror <html>'s data-*/class/lang onto
      // each thumb host (see _syncThumbHostAttrs) so the same selectors
      // match inside the thumbnail's shadow tree.
      const authorCss = Array.from(document.styleSheets).map(sh => {
        try {
          return Array.from(sh.cssRules).map(r => r.cssText).join('\n');
        } catch (e) {
          return '';
        }
      }).join('\n')
      // The shadow host is featureless outside the functional :host(...)
      // form, so any compound on :root — [attr], .class, #id, :pseudo —
      // must become :host(<compound>) not :host<compound>. Same for the
      // html type selector (Tailwind class-strategy dark mode emits
      // html.dark; Pico uses html[data-theme]), which has nothing to
      // match inside the thumb's shadow tree.
      .replace(/:root((?:\[[^\]]*\]|[.#][-\w]+|:[-\w]+(?:\([^)]*\))?)+)/g, ':host($1)').replace(/:root\b/g, ':host').replace(/(^|[\s,>~+(}])html((?:\[[^\]]*\]|[.#][-\w]+|:[-\w]+(?:\([^)]*\))?)+)(?![-\w])/g, '$1:host($2)').replace(/(^|[\s,>~+(}])html(?![-\w])/g, '$1:host');
      // Every custom property the author references. _syncThumbHostAttrs
      // mirrors each one's *computed* value at <deck-stage> onto the
      // thumb host so the live value wins over the :host default above
      // regardless of which ancestor the tweak wrote to (<html>, <body>,
      // a wrapper div, or the deck-stage element itself all inherit
      // down to getComputedStyle(this)).
      this._authorVars = new Set(authorCss.match(/--[\w-]+/g) || []);
      try {
        if (!this._adoptedSheet) this._adoptedSheet = new CSSStyleSheet();
        this._adoptedSheet.replaceSync(authorCss);
      } catch (e) {
        this._adoptedSheet = null;
        this._authorCss = authorCss;
      }
    }
    _syncThumbHostAttrs(host, cs) {
      const de = document.documentElement;
      // setAttribute overwrites but can't delete — an attr removed from
      // <html> (toggleAttribute off, classList emptied) would linger on
      // the host and :host([data-*]) / :host(.foo) rules would keep
      // matching. Remove stale mirrored attrs first; iterate backward
      // because removeAttribute mutates the live NamedNodeMap.
      for (let i = host.attributes.length - 1; i >= 0; i--) {
        const n = host.attributes[i].name;
        if ((n.startsWith('data-') || n === 'class' || n === 'lang') && !de.hasAttribute(n)) {
          host.removeAttribute(n);
        }
      }
      for (const a of de.attributes) {
        if (a.name.startsWith('data-') || a.name === 'class' || a.name === 'lang') {
          host.setAttribute(a.name, a.value);
        }
      }
      // The :root→:host rewrite in _snapshotAuthorCss pins each custom
      // property to its stylesheet default on the thumb host, shadowing
      // the live value that would otherwise inherit. Tweaks can write the
      // live value on any ancestor — <html>, <body>, a wrapper div, the
      // deck-stage element — so read it as the *computed* value at
      // <deck-stage> (which sees the whole inheritance chain) rather than
      // trying to guess which element the author wrote to. Inline on the
      // host beats the :host{} rule. remove-stale covers vars dropped
      // from the stylesheet between snapshots.
      const vars = this._authorVars || new Set();
      for (let i = host.style.length - 1; i >= 0; i--) {
        const p = host.style[i];
        if (p.startsWith('--') && !vars.has(p)) host.style.removeProperty(p);
      }
      const live = cs || getComputedStyle(this);
      vars.forEach(p => {
        const v = live.getPropertyValue(p);
        if (v) host.style.setProperty(p, v.trim());else host.style.removeProperty(p);
      });
    }
    disconnectedCallback() {
      window.removeEventListener('keydown', this._onKey);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('mousemove', this._onMouseMove);
      window.removeEventListener('message', this._onMessage);
      window.removeEventListener('click', this._onDocClick, true);
      if (this._hideTimer) clearTimeout(this._hideTimer);
      if (this._mouseIdleTimer) clearTimeout(this._mouseIdleTimer);
      if (this._liveTimer) clearTimeout(this._liveTimer);
      if (this._tweakTimer) clearTimeout(this._tweakTimer);
      if (this._railAnimTimer) clearTimeout(this._railAnimTimer);
      if (this._scaleRaf) cancelAnimationFrame(this._scaleRaf);
      if (this._liveObserver) this._liveObserver.disconnect();
      if (this._railObserver) this._railObserver.disconnect();
      if (this._onTweakChange) window.removeEventListener('tweakchange', this._onTweakChange);
    }
    attributeChangedCallback() {
      if (this._canvas) {
        this._canvas.style.width = this.designWidth + 'px';
        this._canvas.style.height = this.designHeight + 'px';
        this._canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
        this._canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
        if (this._rail) {
          this._rail.style.setProperty('--deck-aspect', this.designWidth + '/' + this.designHeight);
        }
        this._fit();
        this._scaleThumbs();
        this._syncPrintPageRule();
      }
    }
    _render() {
      const style = document.createElement('style');
      style.textContent = stylesheet;
      const stage = document.createElement('div');
      stage.className = 'stage';
      const canvas = document.createElement('div');
      canvas.className = 'canvas';
      canvas.style.width = this.designWidth + 'px';
      canvas.style.height = this.designHeight + 'px';
      canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
      canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
      const slot = document.createElement('slot');
      slot.addEventListener('slotchange', this._onSlotChange);
      canvas.appendChild(slot);
      stage.appendChild(canvas);

      // Tap zones (mobile): left third = back, right third = forward.
      const tapzones = document.createElement('div');
      tapzones.className = 'tapzones export-hidden';
      tapzones.setAttribute('aria-hidden', 'true');
      tapzones.setAttribute('data-noncommentable', '');
      const tzBack = document.createElement('div');
      tzBack.className = 'tapzone tapzone--back';
      const tzMid = document.createElement('div');
      tzMid.className = 'tapzone tapzone--mid';
      tzMid.style.pointerEvents = 'none';
      const tzFwd = document.createElement('div');
      tzFwd.className = 'tapzone tapzone--fwd';
      tzBack.addEventListener('click', this._onTapBack);
      tzFwd.addEventListener('click', this._onTapForward);
      tapzones.append(tzBack, tzMid, tzFwd);

      // Overlay: compact, solid black, with clickable controls.
      const overlay = document.createElement('div');
      overlay.className = 'overlay export-hidden';
      overlay.setAttribute('role', 'toolbar');
      overlay.setAttribute('aria-label', 'Deck controls');
      overlay.setAttribute('data-noncommentable', '');
      overlay.innerHTML = `
        <button class="btn prev" type="button" aria-label="Previous slide" title="Previous (←)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
        </button>
        <span class="count" aria-live="polite"><span class="current">1</span><span class="sep">/</span><span class="total">1</span></span>
        <button class="btn next" type="button" aria-label="Next slide" title="Next (→)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
        </button>
        <span class="divider"></span>
        <button class="btn reset" type="button" aria-label="Reset to first slide" title="Reset (R)">Reset<span class="kbd">R</span></button>
      `;
      overlay.querySelector('.prev').addEventListener('click', () => this._advance(-1, 'click'));
      overlay.querySelector('.next').addEventListener('click', () => this._advance(1, 'click'));
      overlay.querySelector('.reset').addEventListener('click', () => this._go(0, 'click'));

      // Thumbnail rail + context menu. Thumbnails are populated in
      // _renderRail() after _collectSlides().
      const rail = document.createElement('div');
      rail.className = 'rail export-hidden';
      rail.setAttribute('data-noncommentable', '');
      rail.style.setProperty('--deck-aspect', this.designWidth + '/' + this.designHeight);
      // Edge auto-scroll while dragging a thumb near the rail's top/bottom
      // so off-screen drop targets are reachable. Native dragover fires
      // continuously while the pointer is stationary, so a per-event nudge
      // (ramped by edge proximity) is enough — no rAF loop needed.
      rail.addEventListener('dragover', e => {
        if (this._dragFrom == null) return;
        const r = rail.getBoundingClientRect();
        const EDGE = 40;
        const dt = e.clientY - r.top;
        const db = r.bottom - e.clientY;
        if (dt < EDGE) rail.scrollTop -= Math.ceil((EDGE - dt) / 3);else if (db < EDGE) rail.scrollTop += Math.ceil((EDGE - db) / 3);
      });
      const menu = document.createElement('div');
      menu.className = 'ctxmenu export-hidden';
      menu.setAttribute('data-noncommentable', '');
      menu.innerHTML = `
        <button type="button" data-act="skip">Skip slide</button>
        <button type="button" data-act="up">Move up</button>
        <button type="button" data-act="down">Move down</button>
        <hr>
        <button type="button" data-act="delete">Delete slide</button>
      `;
      menu.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (!act) return;
        const i = this._menuIndex;
        this._closeMenu();
        if (act === 'skip') this._toggleSkip(i);else if (act === 'up') this._moveSlide(i, i - 1);else if (act === 'down') this._moveSlide(i, i + 1);else if (act === 'delete') this._openConfirm(i);
      });
      menu.addEventListener('contextmenu', e => e.preventDefault());

      // Rail resize handle — drag to set --deck-rail-w, persisted to
      // localStorage so the width survives reloads.
      const resize = document.createElement('div');
      resize.className = 'rail-resize export-hidden';
      resize.setAttribute('data-noncommentable', '');
      resize.addEventListener('pointerdown', e => {
        e.preventDefault();
        resize.setPointerCapture(e.pointerId);
        resize.setAttribute('data-dragging', '');
        const move = ev => this._setRailWidth(ev.clientX);
        const up = () => {
          resize.removeEventListener('pointermove', move);
          resize.removeEventListener('pointerup', up);
          resize.removeEventListener('pointercancel', up);
          resize.removeAttribute('data-dragging');
          try {
            localStorage.setItem('deck-stage.railWidth', String(this._railPx));
          } catch (err) {}
        };
        resize.addEventListener('pointermove', move);
        resize.addEventListener('pointerup', up);
        resize.addEventListener('pointercancel', up);
      });

      // Delete-confirm dialog — mirrors the SPA's ConfirmDialog layout.
      const confirm = document.createElement('div');
      confirm.className = 'confirm-backdrop export-hidden';
      confirm.setAttribute('data-noncommentable', '');
      confirm.innerHTML = `
        <div class="confirm" role="dialog" aria-modal="true">
          <div class="body">
            <div class="title">Delete slide?</div>
            <div class="msg">This slide will be removed from the deck.</div>
          </div>
          <div class="footer">
            <button type="button" class="cancel">Cancel</button>
            <button type="button" class="danger">Delete</button>
          </div>
        </div>
      `;
      confirm.addEventListener('click', e => {
        if (e.target === confirm) this._closeConfirm();
      });
      confirm.querySelector('.cancel').addEventListener('click', () => this._closeConfirm());
      confirm.querySelector('.danger').addEventListener('click', () => {
        const i = this._confirmIndex;
        this._closeConfirm();
        this._deleteSlide(i);
      });
      this._root.append(style, rail, resize, stage, tapzones, overlay, menu, confirm);
      this._canvas = canvas;
      this._slot = slot;
      this._overlay = overlay;
      this._tapzones = tapzones;
      this._rail = rail;
      this._resize = resize;
      this._menu = menu;
      this._confirm = confirm;
      this._countEl = overlay.querySelector('.current');
      this._totalEl = overlay.querySelector('.total');

      // Restore persisted rail width.
      let rw = 188;
      try {
        const s = localStorage.getItem('deck-stage.railWidth');
        if (s) rw = parseInt(s, 10) || rw;
      } catch (err) {}
      this._setRailWidth(rw);
      this._syncRailHidden();
    }
    _setRailWidth(px) {
      const w = Math.max(120, Math.min(360, Math.round(px)));
      this._railPx = w;
      this.style.setProperty('--deck-rail-w', w + 'px');
      this._fit();
      // _scaleThumbs forces a sync layout (frame.offsetWidth) then writes
      // N transforms. During a resize drag this runs per-pointermove;
      // coalesce to one per frame.
      if (!this._scaleRaf) {
        this._scaleRaf = requestAnimationFrame(() => {
          this._scaleRaf = null;
          this._scaleThumbs();
        });
      }
    }

    /** @page must live in the document stylesheet — it's a no-op inside
     *  shadow DOM. Inject/update a single <head> style tag so the print
     *  sheet matches the design size and Save-as-PDF yields one slide per
     *  page with no margins. */
    _syncPrintPageRule() {
      const id = 'deck-stage-print-page';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
        document.head.appendChild(tag);
      }
      tag.textContent = '@page { size: ' + this.designWidth + 'px ' + this.designHeight + 'px; margin: 0; } ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; overflow: visible !important; height: auto !important; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }';
    }
    _onSlotChange() {
      // Rail mutations (delete/move) already reconcile synchronously and
      // emit slidechange with reason 'api'; skip the async slotchange that
      // would otherwise re-broadcast with reason 'init'.
      if (this._squelchSlotChange) {
        this._squelchSlotChange = false;
        return;
      }
      this._collectSlides();
      this._restoreIndex();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'init'
      });
      this._fit();
    }
    _collectSlides() {
      const assigned = this._slot.assignedElements({
        flatten: true
      });
      this._slides = assigned.filter(el => {
        // Skip template/style/script nodes even if someone slots them.
        const tag = el.tagName;
        return tag !== 'TEMPLATE' && tag !== 'SCRIPT' && tag !== 'STYLE';
      });
      this._slideSet = new Set(this._slides);
      this._slides.forEach((slide, i) => {
        const n = i + 1;
        slide.setAttribute('data-screen-label', `${pad2(n)} ${getSlideLabel(slide)}`);

        // Validation attribute for comment flow / auto-checks.
        if (!slide.hasAttribute('data-om-validate')) {
          slide.setAttribute('data-om-validate', VALIDATE_ATTR);
        }
        slide.setAttribute('data-deck-slide', String(i));
      });
      if (this._totalEl) this._totalEl.textContent = String(this._slides.length || 1);
      if (this._index >= this._slides.length) this._index = Math.max(0, this._slides.length - 1);
      this._markLastVisible();
      this._renderRail();
    }

    /** Tag the last non-skipped slide so print CSS can drop its
     *  break-after (see the @media print comment above — :last-child
     *  alone matches a hidden skipped slide). */
    _markLastVisible() {
      let last = null;
      this._slides.forEach(s => {
        s.removeAttribute('data-deck-last-visible');
        if (!s.hasAttribute('data-deck-skip')) last = s;
      });
      if (last) last.setAttribute('data-deck-last-visible', '');
    }
    _loadNotes() {
      const tag = document.getElementById('speaker-notes');
      if (!tag) {
        this._notes = [];
        return;
      }
      try {
        const parsed = JSON.parse(tag.textContent || '[]');
        if (Array.isArray(parsed)) this._notes = parsed;
      } catch (e) {
        console.warn('[deck-stage] Failed to parse #speaker-notes JSON:', e);
        this._notes = [];
      }
    }
    _restoreIndex() {
      // The host's ?slide= param is delivered as a #<int> hash (1-indexed) on
      // the iframe src. No hash → slide 1; the deck itself keeps no position
      // state across loads.
      const h = (location.hash || '').match(/^#(\d+)$/);
      if (h) {
        const n = parseInt(h[1], 10) - 1;
        if (n >= 0 && n < this._slides.length) this._index = n;
      }
    }
    _applyIndex({
      showOverlay = true,
      broadcast = true,
      reason = 'init'
    } = {}) {
      if (!this._slides.length) return;
      const prev = this._prevIndex == null ? -1 : this._prevIndex;
      const curr = this._index;
      // Keep the iframe's own hash in sync so an in-iframe location.reload()
      // (reload banner path in viewer-handle.ts) lands on the current slide,
      // not the stale deep-link hash from initial load.
      try {
        history.replaceState(null, '', '#' + (curr + 1));
      } catch (e) {}
      this._slides.forEach((s, i) => {
        if (i === curr) s.setAttribute('data-deck-active', '');else s.removeAttribute('data-deck-active');
      });
      if (this._countEl) this._countEl.textContent = String(curr + 1);
      // Follow-scroll on every navigation (init deep-link, keyboard, click,
      // tap, external goTo) — the only time we *don't* want the rail to
      // track current is after a rail-internal mutation, where _renderRail
      // has already restored the user's scroll position and yanking back to
      // current would undo it.
      this._syncRail(reason !== 'mutation');
      if (broadcast) {
        // (1) Legacy: host-window postMessage for speaker-notes renderers.
        try {
          window.postMessage({
            slideIndexChanged: curr,
            deckTotal: this._slides.length,
            deckSkipped: this._skippedIndices()
          }, '*');
        } catch (e) {}

        // (2) In-page CustomEvent on the <deck-stage> element itself.
        //     Bubbles and composes out of shadow DOM so slide code can listen:
        //       document.querySelector('deck-stage').addEventListener('slidechange', e => {
        //         e.detail.index, e.detail.previousIndex, e.detail.total, e.detail.slide, e.detail.reason
        //       });
        const detail = {
          index: curr,
          previousIndex: prev,
          total: this._slides.length,
          slide: this._slides[curr] || null,
          previousSlide: prev >= 0 ? this._slides[prev] || null : null,
          reason: reason // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
        };
        this.dispatchEvent(new CustomEvent('slidechange', {
          detail,
          bubbles: true,
          composed: true
        }));
      }
      this._prevIndex = curr;
      if (showOverlay) this._flashOverlay();
    }
    _flashOverlay() {
      // Host posts __omelette_presenting while in fullscreen/tab presentation
      // mode — suppress the nav footer entirely (both hover and slide-change
      // flash) so the audience sees clean slides.
      if (!this._overlay || this._presenting) return;
      this._overlay.setAttribute('data-visible', '');
      if (this._hideTimer) clearTimeout(this._hideTimer);
      this._hideTimer = setTimeout(() => {
        this._overlay.removeAttribute('data-visible');
      }, OVERLAY_HIDE_MS);
    }
    _railWidth() {
      // State-based, no offsetWidth: the first _fit() can run before the
      // rail has had layout on some load paths, and a 0 there paints the
      // slide full-width for one frame before the post-slotchange _fit()
      // corrects it.
      if (!this._railEnabled || !this._railVisible || this.hasAttribute('no-rail') || this.hasAttribute('noscale') || this._presenting || this._previewMode) return 0;
      return this._railPx || 0;
    }
    _fit() {
      if (!this._canvas) return;
      const stage = this._canvas.parentElement;
      // PPTX export sets noscale so the DOM capture sees authored-size
      // geometry — the scaled canvas is in shadow DOM, so the exporter's
      // resetTransformSelector can't reach .canvas.style.transform directly.
      if (this.hasAttribute('noscale')) {
        this._canvas.style.transform = 'none';
        if (stage) stage.style.left = '0';
        if (this._overlay) this._overlay.style.marginLeft = '0';
        if (this._tapzones) this._tapzones.style.left = '0';
        return;
      }
      const rw = this._railWidth();
      if (stage) stage.style.left = rw + 'px';
      // Overlay is centred on the viewport via left:50% + translate(-50%);
      // marginLeft shifts the centre by rw/2 so it lands in the middle of
      // the [rw, innerWidth] stage region. Tapzones just inset from rw.
      if (this._overlay) this._overlay.style.marginLeft = rw / 2 + 'px';
      if (this._tapzones) this._tapzones.style.left = rw + 'px';
      const vw = window.innerWidth - rw;
      const vh = window.innerHeight;
      const s = Math.min(vw / this.designWidth, vh / this.designHeight);
      this._canvas.style.transform = `scale(${s})`;
    }
    _onResize() {
      this._fit();
    }
    _onMouseMove() {
      // Keep overlay visible while mouse moves; hide after idle.
      this._flashOverlay();
    }
    _onMessage(e) {
      const d = e.data;
      if (d && typeof d.__omelette_presenting === 'boolean') {
        this._presenting = d.__omelette_presenting;
        if (this._presenting && this._overlay) {
          this._overlay.removeAttribute('data-visible');
          if (this._hideTimer) clearTimeout(this._hideTimer);
        }
        this._syncRailHidden();
        this._closeMenu();
        this._closeConfirm();
        this._fit();
        this._scaleThumbs();
      }
      // Host's Preview segment (ViewerMode='none'): the rail's drag-reorder /
      // right-click skip-delete affordances are editing chrome, so hide it
      // while the user is just looking at the deck. Same hard-hide path as
      // presenting; independent of the user's _railVisible preference so
      // returning to Edit restores whatever they had.
      if (d && typeof d.__omelette_preview_mode === 'boolean') {
        if (d.__omelette_preview_mode === this._previewMode) return;
        this._previewMode = d.__omelette_preview_mode;
        this._syncRailHidden();
        this._closeMenu();
        this._closeConfirm();
        this._fit();
        this._scaleThumbs();
      }
      // Per-viewer show/hide, driven by the TweaksPanel's auto-injected
      // "Thumbnail rail" toggle (or any author script). Independent of
      // whether the Tweaks panel itself is open — closing the panel
      // doesn't change rail visibility. Persists alongside rail width.
      if (d && d.type === '__deck_rail_visible' && typeof d.on === 'boolean') {
        if (d.on === this._railVisible) return;
        this._railVisible = d.on;
        try {
          localStorage.setItem('deck-stage.railVisible', d.on ? '1' : '0');
        } catch (e) {}
        // Arm the transition, commit it, then flip state — otherwise the
        // browser coalesces both writes and nothing animates on show.
        this.setAttribute('data-rail-anim', '');
        void (this._rail && this._rail.offsetHeight);
        this._syncRailHidden();
        this._fit();
        this._scaleThumbs();
        clearTimeout(this._railAnimTimer);
        this._railAnimTimer = setTimeout(() => this.removeAttribute('data-rail-anim'), 220);
      }
      if (d && d.type === '__omelette_rail_enabled') this._enableRail();
    }
    _syncRailHidden() {
      if (!this._rail) return;
      // data-presenting is the hard hide (display:none) for flag-off,
      // presentation mode, and the host's Preview segment — instant, no
      // transition. data-user-hidden is the soft hide (translateX(-100%))
      // for the viewer's rail toggle, so show/hide slides under
      // :host([data-rail-anim]).
      const hard = !this._railEnabled || this._presenting || this._previewMode;
      if (hard) this._rail.setAttribute('data-presenting', '');else this._rail.removeAttribute('data-presenting');
      if (!this._railVisible) this._rail.setAttribute('data-user-hidden', '');else this._rail.removeAttribute('data-user-hidden');
      // translateX hide leaves thumbs (tabIndex=0) in the tab order —
      // inert keeps them unfocusable while the rail is off-screen.
      this._rail.inert = hard || !this._railVisible;
    }
    _onTapBack(e) {
      e.preventDefault();
      this._advance(-1, 'tap');
    }
    _onTapForward(e) {
      e.preventDefault();
      this._advance(1, 'tap');
    }
    _onKey(e) {
      // Ignore when the user is typing.
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // Confirm dialog swallows nav keys while open; Escape cancels. Enter
      // is left to the focused button's native activation so Tab→Cancel
      // →Enter activates Cancel, not the window-level confirm path.
      if (this._confirm && this._confirm.hasAttribute('data-open')) {
        if (e.key === 'Escape') {
          this._closeConfirm();
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'Escape' && this._menu && this._menu.hasAttribute('data-open')) {
        this._closeMenu();
        e.preventDefault();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      let handled = true;
      if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || key === 'Spacebar') {
        this._advance(1, 'keyboard');
      } else if (key === 'ArrowLeft' || key === 'PageUp') {
        this._advance(-1, 'keyboard');
      } else if (key === 'Home') {
        this._go(0, 'keyboard');
      } else if (key === 'End') {
        this._go(this._slides.length - 1, 'keyboard');
      } else if (key === 'r' || key === 'R') {
        this._go(0, 'keyboard');
      } else if (/^[0-9]$/.test(key)) {
        // 1..9 jump to that slide; 0 jumps to 10.
        const n = key === '0' ? 9 : parseInt(key, 10) - 1;
        if (n < this._slides.length) this._go(n, 'keyboard');
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        this._flashOverlay();
      }
    }
    _go(i, reason = 'api') {
      if (!this._slides.length) return;
      const clamped = Math.max(0, Math.min(this._slides.length - 1, i));
      if (clamped === this._index) {
        this._flashOverlay();
        return;
      }
      this._index = clamped;
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason
      });
    }

    /** Step forward/back skipping any slide marked data-deck-skip. Falls
     *  back to _go's clamp-at-ends behaviour (flash overlay) when there's
     *  nothing further in that direction. */
    _advance(dir, reason) {
      if (!this._slides.length) return;
      let i = this._index + dir;
      while (i >= 0 && i < this._slides.length && this._slides[i].hasAttribute('data-deck-skip')) {
        i += dir;
      }
      if (i < 0 || i >= this._slides.length) {
        this._flashOverlay();
        return;
      }
      this._go(i, reason);
    }

    // ── Thumbnail rail ────────────────────────────────────────────────────
    //
    // Thumbs are keyed by slide element and reused across _renderRail()
    // calls, so a reorder/delete is an O(changed) DOM shuffle instead of an
    // O(N) teardown-and-re-clone. Each thumb starts as a lightweight shell
    // (num + empty frame); the clone is materialized lazily by an
    // IntersectionObserver when the frame scrolls into (or near) view, so
    // only visible-ish slides pay the clone + image-decode cost.

    _renderRail() {
      if (!this._rail || !this._railEnabled) {
        this._thumbs = [];
        return;
      }
      // FLIP: record each *materialized* thumb's top before the reconcile.
      // Off-screen (non-materialized) thumbs don't need the animation and
      // skipping their getBoundingClientRect saves a forced layout per
      // off-screen thumb on large decks.
      const prevTops = new Map();
      (this._thumbs || []).forEach(({
        thumb,
        slide,
        host
      }) => {
        if (host) prevTops.set(slide, thumb.getBoundingClientRect().top);
      });
      const st = this._rail.scrollTop;

      // Reconcile: reuse thumbs that already exist for a slide, create
      // shells for new slides, drop thumbs for removed slides.
      const bySlide = new Map();
      (this._thumbs || []).forEach(t => bySlide.set(t.slide, t));
      const next = [];
      this._slides.forEach(slide => {
        let t = bySlide.get(slide);
        if (t) bySlide.delete(slide);else t = this._makeThumb(slide);
        next.push(t);
      });
      // Orphans — slides removed since last render.
      bySlide.forEach(t => {
        if (this._railObserver) this._railObserver.unobserve(t.frame);
        t.thumb.remove();
      });
      // Put thumbs into document order to match _slides. insertBefore on
      // an already-correctly-placed node is a no-op, so this is cheap
      // when nothing moved.
      next.forEach((t, i) => {
        const want = t.thumb;
        const at = this._rail.children[i];
        if (at !== want) this._rail.insertBefore(want, at || null);
        t.i = i;
        t.num.textContent = String(i + 1);
        if (t.slide.hasAttribute('data-deck-skip')) t.thumb.setAttribute('data-skip', '');else t.thumb.removeAttribute('data-skip');
      });
      this._thumbs = next;
      this._rail.scrollTop = st;
      if (prevTops.size) {
        const moved = [];
        this._thumbs.forEach(({
          thumb,
          slide
        }) => {
          const old = prevTops.get(slide);
          if (old == null) return;
          const dy = old - thumb.getBoundingClientRect().top;
          if (Math.abs(dy) < 1) return;
          thumb.style.transition = 'none';
          thumb.style.transform = `translateY(${dy}px)`;
          moved.push(thumb);
        });
        if (moved.length) {
          // Commit the inverted positions before flipping the transition
          // on — otherwise the browser coalesces both style writes and
          // nothing animates.
          void this._rail.offsetHeight;
          moved.forEach(t => {
            t.style.transition = 'transform 180ms cubic-bezier(.2,.7,.3,1)';
            t.style.transform = '';
          });
          setTimeout(() => moved.forEach(t => {
            t.style.transition = '';
          }), 220);
        }
      }
      requestAnimationFrame(() => this._scaleThumbs());
      this._syncRail(false);
    }

    /** Create a lightweight thumb shell for one slide. The clone is
     *  materialized later by the IntersectionObserver. Event handlers
     *  look up the thumb's *current* index (via _thumbs.indexOf) so the
     *  same element can be reused across reorders. */
    _makeThumb(slide) {
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.tabIndex = 0;
      const num = document.createElement('div');
      num.className = 'num';
      const frame = document.createElement('div');
      frame.className = 'frame';
      thumb.append(num, frame);
      const entry = {
        thumb,
        num,
        frame,
        slide,
        clone: null,
        host: null,
        i: -1
      };
      // entry.i is refreshed on every _renderRail reconcile pass, so
      // handlers read the thumb's current position without an O(N) scan.
      const idx = () => entry.i;
      thumb.addEventListener('click', () => this._go(idx(), 'click'));
      // ↑/↓ step through the rail when a thumb has focus. _go clamps at the
      // ends and _applyIndex→_syncRail scrolls the new current thumb into
      // view; we move focus to it (preventScroll — _syncRail already
      // scrolled) so a held key walks the whole list. stopPropagation keeps
      // this out of the window-level _onKey nav handler.
      thumb.addEventListener('keydown', e => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        e.stopPropagation();
        this._go(idx() + (e.key === 'ArrowDown' ? 1 : -1), 'keyboard');
        const cur = this._thumbs && this._thumbs[this._index];
        if (cur) cur.thumb.focus({
          preventScroll: true
        });
      });
      thumb.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._openMenu(idx(), e.clientX, e.clientY);
      });
      thumb.draggable = true;
      thumb.addEventListener('dragstart', e => {
        this._dragFrom = idx();
        thumb.setAttribute('data-dragging', '');
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', String(this._dragFrom));
        } catch (err) {}
      });
      thumb.addEventListener('dragend', () => {
        thumb.removeAttribute('data-dragging');
        this._clearDrop();
        this._dragFrom = null;
      });
      thumb.addEventListener('dragover', e => {
        if (this._dragFrom == null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const r = thumb.getBoundingClientRect();
        this._setDrop(idx(), e.clientY < r.top + r.height / 2 ? 'before' : 'after');
      });
      thumb.addEventListener('drop', e => {
        if (this._dragFrom == null) return;
        e.preventDefault();
        const i = idx();
        const r = thumb.getBoundingClientRect();
        let to = e.clientY >= r.top + r.height / 2 ? i + 1 : i;
        if (this._dragFrom < to) to--;
        const from = this._dragFrom;
        this._clearDrop();
        this._dragFrom = null;
        if (to !== from) this._moveSlide(from, to);
      });
      if (this._railObserver) this._railObserver.observe(frame);
      frame.__deckThumb = entry;
      return entry;
    }

    /** Lazily build the clone for a thumb that has scrolled into view. */
    _materialize(entry) {
      if (entry.host) return;
      const dw = this.designWidth,
        dh = this.designHeight;
      let clone = entry.slide.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('data-deck-active');
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      // Neuter heavy media; replace <video> with its poster so the box
      // keeps a visual. <iframe>/<audio> become empty placeholders.
      clone.querySelectorAll('iframe, audio, object, embed').forEach(el => {
        el.removeAttribute('src');
        el.removeAttribute('srcdoc');
        el.removeAttribute('data');
        el.innerHTML = '';
      });
      clone.querySelectorAll('video').forEach(el => {
        if (!el.poster) {
          el.removeAttribute('src');
          el.innerHTML = '';
          return;
        }
        const img = document.createElement('img');
        img.src = el.poster;
        img.alt = '';
        img.style.cssText = el.style.cssText + ';object-fit:cover;width:100%;height:100%;';
        img.className = el.className;
        el.replaceWith(img);
      });
      // Images: defer decode and let the browser pick the smallest
      // srcset candidate for the ~140px thumb. Same-URL clones reuse the
      // slide's decoded bitmap (URL-keyed cache), so the remaining cost
      // is paint/composite — lazy+async keeps that off the main thread.
      clone.querySelectorAll('img').forEach(el => {
        el.loading = 'lazy';
        el.decoding = 'async';
        if (el.srcset) el.sizes = (this._railPx || 188) + 'px';
      });
      // Custom elements inside the slide would have their
      // connectedCallback fire when the clone is appended. Replace them
      // with inert boxes so a component-heavy deck doesn't run N copies
      // of each component's mount logic in the rail. Children are
      // preserved so layout-wrapper elements (<my-column><h2>…</h2>)
      // still show their authored content; the querySelectorAll NodeList
      // is static, so nested custom elements in the moved subtree are
      // still visited on later iterations.
      const neuter = el => {
        const box = document.createElement('div');
        box.style.cssText = (el.getAttribute('style') || '') + ';background:rgba(0,0,0,0.06);border:1px dashed rgba(0,0,0,0.15);';
        box.className = el.className;
        // Preserve theming/i18n hooks so [data-*] / :lang() / [dir]
        // descendant selectors still match the neutered root.
        for (const a of el.attributes) {
          const n = a.name;
          if (n.startsWith('data-') || n.startsWith('aria-') || n === 'lang' || n === 'dir' || n === 'role' || n === 'title') {
            box.setAttribute(n, a.value);
          }
        }
        while (el.firstChild) box.appendChild(el.firstChild);
        return box;
      };
      // querySelectorAll('*') returns descendants only — a custom-element
      // slide root (<my-slide>…</my-slide>) would slip through and upgrade
      // on append. Swap the root first.
      if (clone.tagName.includes('-')) clone = neuter(clone);
      clone.querySelectorAll('*').forEach(el => {
        if (el.tagName.includes('-')) el.replaceWith(neuter(el));
      });
      clone.style.cssText += ';position:absolute;top:0;left:0;transform-origin:0 0;' + 'pointer-events:none;width:' + dw + 'px;height:' + dh + 'px;' + 'box-sizing:border-box;overflow:hidden;visibility:visible;opacity:1;';
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;inset:0;';
      this._syncThumbHostAttrs(host);
      const sr = host.attachShadow({
        mode: 'open'
      });
      if (this._adoptedSheet) sr.adoptedStyleSheets = [this._adoptedSheet];else {
        const st = document.createElement('style');
        st.textContent = this._authorCss || '';
        sr.appendChild(st);
      }
      sr.appendChild(clone);
      entry.frame.appendChild(host);
      entry.host = host;
      entry.clone = clone;
      if (this._thumbScale) clone.style.transform = 'scale(' + this._thumbScale + ')';
      // Once materialized the IO callback is a no-op early-return —
      // unobserve so scroll doesn't keep firing it.
      if (this._railObserver) this._railObserver.unobserve(entry.frame);
    }

    /** Re-clone a single thumb (live-update path). No-op if the thumb
     *  hasn't been materialized yet — it'll pick up current content when
     *  it scrolls into view. */
    _refreshThumb(slide) {
      const entry = (this._thumbs || []).find(t => t.slide === slide);
      if (!entry || !entry.host) return;
      entry.host.remove();
      entry.host = entry.clone = null;
      this._materialize(entry);
    }
    _scaleThumbs() {
      if (!this._thumbs || !this._thumbs.length) return;
      // Every frame is the same width; if it reads 0 the rail is
      // display:none (noscale / no-rail / presenting / print) — leave the
      // clones as-is and re-run when the rail is revealed.
      const fw = this._thumbs[0].frame.offsetWidth;
      if (!fw) return;
      this._thumbScale = fw / this.designWidth;
      this._thumbs.forEach(({
        clone
      }) => {
        if (clone) clone.style.transform = 'scale(' + this._thumbScale + ')';
      });
    }
    _setDrop(i, where) {
      // dragover fires at pointer-event rate; touch only the previous
      // and new target rather than sweeping all N thumbs.
      const t = this._thumbs && this._thumbs[i];
      if (this._dropOn && this._dropOn !== t) {
        this._dropOn.thumb.removeAttribute('data-drop');
      }
      if (t) t.thumb.setAttribute('data-drop', where);
      this._dropOn = t || null;
    }
    _clearDrop() {
      if (this._dropOn) this._dropOn.thumb.removeAttribute('data-drop');
      this._dropOn = null;
    }
    _syncRail(follow) {
      if (!this._thumbs) return;
      this._thumbs.forEach(({
        thumb
      }, i) => {
        if (i === this._index) {
          thumb.setAttribute('data-current', '');
          if (follow && typeof thumb.scrollIntoView === 'function') {
            thumb.scrollIntoView({
              block: 'nearest'
            });
          }
        } else {
          thumb.removeAttribute('data-current');
        }
      });
    }
    _openMenu(i, x, y) {
      if (!this._menu) return;
      this._menuIndex = i;
      const slide = this._slides[i];
      const skip = slide && slide.hasAttribute('data-deck-skip');
      this._menu.querySelector('[data-act="skip"]').textContent = skip ? 'Unskip slide' : 'Skip slide';
      this._menu.querySelector('[data-act="up"]').disabled = i <= 0;
      this._menu.querySelector('[data-act="down"]').disabled = i >= this._slides.length - 1;
      this._menu.querySelector('[data-act="delete"]').disabled = this._slides.length <= 1;
      // Place, then clamp to viewport after it's measurable.
      this._menu.style.left = x + 'px';
      this._menu.style.top = y + 'px';
      this._menu.setAttribute('data-open', '');
      const r = this._menu.getBoundingClientRect();
      const nx = Math.min(x, window.innerWidth - r.width - 4);
      const ny = Math.min(y, window.innerHeight - r.height - 4);
      this._menu.style.left = Math.max(4, nx) + 'px';
      this._menu.style.top = Math.max(4, ny) + 'px';
    }
    _closeMenu() {
      if (this._menu) this._menu.removeAttribute('data-open');
      this._menuIndex = -1;
    }
    _openConfirm(i) {
      if (!this._confirm) return;
      this._confirmIndex = i;
      this._confirm.querySelector('.title').textContent = 'Delete slide ' + (i + 1) + '?';
      this._confirm.setAttribute('data-open', '');
      const btn = this._confirm.querySelector('.danger');
      if (btn && btn.focus) btn.focus();
    }
    _closeConfirm() {
      if (this._confirm) this._confirm.removeAttribute('data-open');
      this._confirmIndex = -1;
    }
    _emitDeckChange(detail) {
      this.dispatchEvent(new CustomEvent('deckchange', {
        detail,
        bubbles: true,
        composed: true
      }));
    }
    _deleteSlide(i) {
      const slide = this._slides[i];
      if (!slide || this._slides.length <= 1) return;
      const wasCurrent = i === this._index;
      if (i < this._index || wasCurrent && i === this._slides.length - 1) this._index--;
      this._squelchSlotChange = true;
      slide.remove();
      this._emitDeckChange({
        action: 'delete',
        from: i,
        slide
      });
      this._collectSlides();
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason: 'mutation'
      });
    }
    _toggleSkip(i) {
      const slide = this._slides[i];
      if (!slide) return;
      const on = !slide.hasAttribute('data-deck-skip');
      if (on) slide.setAttribute('data-deck-skip', '');else slide.removeAttribute('data-deck-skip');
      if (this._thumbs && this._thumbs[i]) {
        if (on) this._thumbs[i].thumb.setAttribute('data-skip', '');else this._thumbs[i].thumb.removeAttribute('data-skip');
      }
      this._markLastVisible();
      this._emitDeckChange({
        action: on ? 'skip' : 'unskip',
        from: i,
        slide
      });
      // Re-broadcast so the presenter popup's prev/next thumbnails re-pick
      // the nearest non-skipped slide without waiting for a nav event.
      try {
        window.postMessage({
          slideIndexChanged: this._index,
          deckTotal: this._slides.length,
          deckSkipped: this._skippedIndices()
        }, '*');
      } catch (e) {}
    }
    _skippedIndices() {
      const out = [];
      for (let i = 0; i < this._slides.length; i++) {
        if (this._slides[i].hasAttribute('data-deck-skip')) out.push(i);
      }
      return out;
    }
    _moveSlide(i, j) {
      if (j < 0 || j >= this._slides.length || j === i) return;
      const slide = this._slides[i];
      const ref = j < i ? this._slides[j] : this._slides[j].nextSibling;
      // Track the active slide across the reorder so the same content
      // stays on screen.
      const cur = this._index;
      if (cur === i) this._index = j;else if (i < cur && j >= cur) this._index = cur - 1;else if (i > cur && j <= cur) this._index = cur + 1;
      this._squelchSlotChange = true;
      this.insertBefore(slide, ref);
      this._emitDeckChange({
        action: 'move',
        from: i,
        to: j,
        slide
      });
      this._collectSlides();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'mutation'
      });
    }

    // Public API ------------------------------------------------------------

    /** Current slide index (0-based). */
    get index() {
      return this._index;
    }
    /** Total slide count. */
    get length() {
      return this._slides.length;
    }
    /** Programmatically navigate. */
    goTo(i) {
      this._go(i, 'api');
    }
    next() {
      this._advance(1, 'api');
    }
    prev() {
      this._advance(-1, 'api');
    }
    reset() {
      this._go(0, 'api');
    }
  }
  if (!customElements.get('deck-stage')) {
    customElements.define('deck-stage', DeckStage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "slides/deck-stage.js", error: String((e && e.message) || e) }); }

// ui_kits/personal-os/CommandPalette.jsx
try { (() => {
/* CommandPalette — ⌘K modal. ESC or click backdrop to close. */

const palStyles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,17,21,0.32)",
    backdropFilter: "blur(2px)",
    zIndex: 100,
    display: "grid",
    placeItems: "start center",
    paddingTop: "12vh"
  },
  modal: {
    width: "min(560px, 92vw)",
    background: "var(--surface)",
    border: "1px solid var(--border-1)",
    borderRadius: 16,
    boxShadow: "var(--shadow-xl)",
    overflow: "hidden"
  },
  searchRow: {
    display: "grid",
    gridTemplateColumns: "20px 1fr auto",
    gap: 12,
    alignItems: "center",
    padding: "14px 16px",
    borderBottom: "1px solid var(--border-1)"
  },
  input: {
    border: 0,
    outline: 0,
    background: "transparent",
    fontFamily: "var(--font-sans)",
    fontSize: 15,
    color: "var(--fg-1)",
    letterSpacing: "-0.01em",
    width: "100%"
  },
  esc: {
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
    color: "var(--fg-3)",
    border: "1px solid var(--border-1)",
    borderRadius: 4,
    padding: "2px 6px"
  },
  body: {
    maxHeight: 380,
    overflowY: "auto",
    padding: 6
  },
  groupHead: {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    color: "var(--fg-3)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "10px 12px 4px"
  },
  item: active => ({
    display: "grid",
    gridTemplateColumns: "18px 1fr auto",
    gap: 12,
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 7,
    fontSize: 13,
    color: active ? "var(--accent-fg)" : "var(--fg-1)",
    background: active ? "var(--accent-soft)" : "transparent",
    cursor: "pointer",
    letterSpacing: "-0.005em"
  }),
  kbd: {
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
    color: "var(--fg-3)"
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 14px",
    borderTop: "1px solid var(--border-1)",
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
    color: "var(--fg-3)"
  }
};
function CommandPalette({
  onClose
}) {
  const groups = [{
    name: "actions",
    items: [{
      icon: "plus",
      label: "New task",
      kbd: "T"
    }, {
      icon: "file",
      label: "New note",
      kbd: "N"
    }, {
      icon: "folder",
      label: "New project",
      kbd: "P"
    }]
  }, {
    name: "jump to",
    items: [{
      icon: "home",
      label: "Overview",
      kbd: "1"
    }, {
      icon: "list",
      label: "Tasks",
      kbd: "2"
    }, {
      icon: "notebook",
      label: "Notes",
      kbd: "3"
    }, {
      icon: "calendar",
      label: "Calendar",
      kbd: "4"
    }, {
      icon: "inbox",
      label: "Inbox",
      kbd: "5"
    }]
  }, {
    name: "settings",
    items: [{
      icon: "moon",
      label: "Toggle dark mode",
      kbd: "⇧D"
    }, {
      icon: "settings",
      label: "Open settings",
      kbd: "⌘,"
    }]
  }];
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const flat = groups.flatMap(g => g.items);
  const filtered = q ? flat.filter(i => i.label.toLowerCase().includes(q.toLowerCase())) : flat;
  React.useEffect(() => {
    const onKey = e => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(a => Math.min(a + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(a => Math.max(a - 1, 0));
      }
      if (e.key === "Enter") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered.length, onClose]);
  return /*#__PURE__*/React.createElement("div", {
    style: palStyles.backdrop,
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: palStyles.modal,
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: palStyles.searchRow
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16,
    style: {
      color: "var(--fg-3)"
    }
  }), /*#__PURE__*/React.createElement("input", {
    autoFocus: true,
    style: palStyles.input,
    placeholder: "Type a command or search\u2026",
    value: q,
    onChange: e => {
      setQ(e.target.value);
      setActive(0);
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: palStyles.esc
  }, "esc")), /*#__PURE__*/React.createElement("div", {
    style: palStyles.body
  }, q ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: palStyles.groupHead
  }, filtered.length, " result", filtered.length === 1 ? "" : "s"), filtered.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: palStyles.item(i === active),
    onMouseEnter: () => setActive(i),
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: it.icon,
    size: 14
  }), /*#__PURE__*/React.createElement("span", null, it.label), /*#__PURE__*/React.createElement("span", {
    style: palStyles.kbd
  }, it.kbd)))) : groups.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.name
  }, /*#__PURE__*/React.createElement("div", {
    style: palStyles.groupHead
  }, g.name), g.items.map((it, i) => {
    const idx = flat.indexOf(it);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: palStyles.item(idx === active),
      onMouseEnter: () => setActive(idx),
      onClick: onClose
    }, /*#__PURE__*/React.createElement(Icon, {
      name: it.icon,
      size: 14
    }), /*#__PURE__*/React.createElement("span", null, it.label), /*#__PURE__*/React.createElement("span", {
      style: palStyles.kbd
    }, it.kbd));
  })))), /*#__PURE__*/React.createElement("div", {
    style: palStyles.footer
  }, /*#__PURE__*/React.createElement("span", null, "\u2191 \u2193 to navigate"), /*#__PURE__*/React.createElement("span", null, "\u21B5 to select  \xB7  esc to close"))));
}
window.CommandPalette = CommandPalette;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/personal-os/CommandPalette.jsx", error: String((e && e.message) || e) }); }

// ui_kits/personal-os/Icon.jsx
try { (() => {
/* Lucide-style inline icons used across the kit.
   Pass `name` and optional size. Color inherits from currentColor. */
const ICONS = {
  search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })),
  bell: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.3 21a1.94 1.94 0 0 0 3.4 0"
  })),
  settings: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
  })),
  home: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "9 22 9 12 15 12 15 22"
  })),
  check: /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }),
  x: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m6 6 12 12"
  })),
  plus: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M5 12h14"
  })),
  more: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "5",
    cy: "12",
    r: "1"
  })),
  sun: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 2v2M12 20v2M5 5l1.4 1.4M17.6 17.6 19 19M2 12h2M20 12h2M5 19l1.4-1.4M17.6 6.4 19 5"
  })),
  moon: /*#__PURE__*/React.createElement("path", {
    d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
  }),
  file: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 2v6h6"
  })),
  folder: /*#__PURE__*/React.createElement("path", {
    d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
  }),
  inbox: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("polyline", {
    points: "22 12 16 12 14 15 10 15 8 12 2 12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
  })),
  list: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "6",
    x2: "21",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "12",
    x2: "21",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "18",
    x2: "21",
    y2: "18"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "4",
    cy: "6",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "4",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "4",
    cy: "18",
    r: "1"
  })),
  notebook: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M2 6h4M2 10h4M2 14h4M2 18h4"
  }), /*#__PURE__*/React.createElement("rect", {
    width: "16",
    height: "20",
    x: "6",
    y: "2",
    rx: "2"
  })),
  calendar: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    width: "18",
    height: "18",
    x: "3",
    y: "4",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 2v4M8 2v4M3 10h18"
  })),
  arrowUp: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 19V5M5 12l7-7 7 7"
  })),
  arrowDown: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M19 12l-7 7-7-7"
  })),
  grip: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "6",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "18",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "6",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "18",
    r: "1"
  })),
  command: /*#__PURE__*/React.createElement("path", {
    d: "M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"
  }),
  bolt: /*#__PURE__*/React.createElement("path", {
    d: "M13 2 3 14h9l-1 8 10-12h-9l1-8z"
  }),
  bookmark: /*#__PURE__*/React.createElement("path", {
    d: "m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
  })
};
function Icon({
  name,
  size = 16,
  stroke = 2,
  style
}) {
  const path = ICONS[name];
  if (!path) return null;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flexShrink: 0,
      ...(style || {})
    },
    "aria-hidden": "true"
  }, path);
}
window.Icon = Icon;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/personal-os/Icon.jsx", error: String((e && e.message) || e) }); }

// ui_kits/personal-os/NotesView.jsx
try { (() => {
/* NotesView — two-pane: note list + editor (read-only sample) */

const notesStyles = {
  root: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: 0,
    flex: 1,
    minHeight: 0
  },
  list: {
    borderRight: "1px solid var(--border-1)",
    background: "var(--surface)",
    overflowY: "auto"
  },
  listHead: {
    padding: "16px 18px 10px",
    borderBottom: "1px solid var(--border-1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  listTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: 16,
    letterSpacing: "-0.01em"
  },
  listCount: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--fg-3)"
  },
  noteRow: active => ({
    padding: "11px 16px",
    borderBottom: "1px solid var(--border-1)",
    background: active ? "var(--surface-2)" : "transparent",
    borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
    cursor: "pointer"
  }),
  noteTitle: {
    fontSize: 13.5,
    color: "var(--fg-1)",
    fontWeight: 500,
    marginBottom: 3,
    letterSpacing: "-0.005em"
  },
  notePreview: {
    fontSize: 12,
    color: "var(--fg-3)",
    lineHeight: 1.4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical"
  },
  noteMeta: {
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
    color: "var(--fg-4)",
    marginTop: 6
  },
  editor: {
    padding: "32px 48px",
    overflowY: "auto",
    background: "var(--bg)",
    flex: 1,
    maxWidth: 760
  },
  editorTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: 36,
    letterSpacing: "-0.025em",
    color: "var(--fg-1)",
    lineHeight: 1.1,
    marginBottom: 8
  },
  editorMeta: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--fg-3)",
    marginBottom: 28
  },
  para: {
    fontSize: 15,
    color: "var(--fg-2)",
    lineHeight: 1.65,
    marginBottom: 16,
    maxWidth: "65ch",
    letterSpacing: "-0.005em"
  },
  h3: {
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: 20,
    color: "var(--fg-1)",
    marginTop: 28,
    marginBottom: 10,
    letterSpacing: "-0.015em"
  },
  ul: {
    paddingLeft: 18,
    margin: "8px 0 16px"
  },
  li: {
    fontSize: 15,
    color: "var(--fg-2)",
    lineHeight: 1.65,
    marginBottom: 4,
    letterSpacing: "-0.005em"
  }
};
const NOTES = [{
  id: "n1",
  title: "Color systems that don't fail",
  preview: "Wong's 8-color palette was developed for scientific publications. It's distinguishable…",
  date: "today · 09:42",
  body: {
    meta: "today · 09:42 · atlas",
    paragraphs: ["Wong's 8-color palette was developed for scientific publications. It's distinguishable under all three common types of colorblindness (protan, deutan, tritan), and it ages well — no fashion colors, no muddy mid-tones.", "The trick is what you assign to what. Green for 'success' and red for 'danger' is a trap. They collapse under deuteranopia. Use blue for primary action, green and vermillion for the two extremes, orange in between."],
    lists: [{
      heading: "Rules I'm trying",
      items: ["Color only for state, never decoration.", "Soft tints behind text; saturated hues only for the chip itself.", "Order by lightness so the palette still reads as a sequence in grayscale."]
    }]
  }
}, {
  id: "n2",
  title: "Hanken > Bricolage",
  preview: "swapped the display font. fewer notches at h1/h2 sizes. quieter at body. same warmth…",
  date: "yesterday",
  body: null
}, {
  id: "n3",
  title: "Build log — week of 5/18",
  preview: "Shipped colors_and_type.css. Started on UI kit. Spent 90 minutes deciding…",
  date: "3 days ago",
  body: null
}, {
  id: "n4",
  title: "Things I keep saying yes to",
  preview: "Calls that should be emails. Threads about whether to add a feature. Meetings that…",
  date: "last week",
  body: null
}];
function NotesView() {
  const [active, setActive] = React.useState("n1");
  const note = NOTES.find(n => n.id === active);
  return /*#__PURE__*/React.createElement("div", {
    style: notesStyles.root
  }, /*#__PURE__*/React.createElement("div", {
    style: notesStyles.list
  }, /*#__PURE__*/React.createElement("div", {
    style: notesStyles.listHead
  }, /*#__PURE__*/React.createElement("div", {
    style: notesStyles.listTitle
  }, "Notes"), /*#__PURE__*/React.createElement("div", {
    style: notesStyles.listCount
  }, NOTES.length)), NOTES.map(n => /*#__PURE__*/React.createElement("div", {
    key: n.id,
    style: notesStyles.noteRow(n.id === active),
    onClick: () => setActive(n.id)
  }, /*#__PURE__*/React.createElement("div", {
    style: notesStyles.noteTitle
  }, n.title), /*#__PURE__*/React.createElement("div", {
    style: notesStyles.notePreview
  }, n.preview), /*#__PURE__*/React.createElement("div", {
    style: notesStyles.noteMeta
  }, n.date)))), /*#__PURE__*/React.createElement("div", {
    style: notesStyles.editor
  }, /*#__PURE__*/React.createElement("div", {
    style: notesStyles.editorTitle
  }, note.title), /*#__PURE__*/React.createElement("div", {
    style: notesStyles.editorMeta
  }, note.body && note.body.meta || note.date), note.body ? /*#__PURE__*/React.createElement(React.Fragment, null, note.body.paragraphs.map((p, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    style: notesStyles.para
  }, p)), note.body.lists && note.body.lists.map((l, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, /*#__PURE__*/React.createElement("h3", {
    style: notesStyles.h3
  }, l.heading), /*#__PURE__*/React.createElement("ul", {
    style: notesStyles.ul
  }, l.items.map((it, j) => /*#__PURE__*/React.createElement("li", {
    key: j,
    style: notesStyles.li
  }, it)))))) : /*#__PURE__*/React.createElement("p", {
    style: {
      ...notesStyles.para,
      color: "var(--fg-3)",
      fontStyle: "italic"
    }
  }, "nothing here yet.")));
}
window.NotesView = NotesView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/personal-os/NotesView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/personal-os/OverviewView.jsx
try { (() => {
/* OverviewView — KPI tiles, activity feed, today panel */

const overviewStyles = {
  root: {
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 24
  },
  hero: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 24
  },
  greeting: {
    fontFamily: "var(--font-display)",
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    color: "var(--fg-1)"
  },
  greetingSub: {
    fontSize: 14,
    color: "var(--fg-3)",
    marginTop: 2
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14
  },
  kpi: {
    background: "var(--surface)",
    border: "1px solid var(--border-1)",
    borderRadius: 14,
    padding: 16,
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  kpiLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
    color: "var(--fg-3)",
    letterSpacing: "0.06em",
    textTransform: "uppercase"
  },
  kpiVal: {
    fontFamily: "var(--font-display)",
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    color: "var(--fg-1)"
  },
  kpiTrend: positive => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: positive ? "var(--success-fg)" : "var(--danger-fg)",
    fontFamily: "var(--font-mono)"
  }),
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr",
    gap: 14
  },
  panel: {
    background: "var(--surface)",
    border: "1px solid var(--border-1)",
    borderRadius: 14,
    overflow: "hidden"
  },
  panelHead: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--border-1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  panelTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: 14,
    color: "var(--fg-1)",
    letterSpacing: "-0.01em"
  },
  panelBody: {
    padding: 6
  },
  activity: {
    display: "grid",
    gridTemplateColumns: "24px 1fr auto",
    gap: 12,
    alignItems: "center",
    padding: "9px 10px",
    borderRadius: 8
  },
  activityIcon: color => ({
    width: 24,
    height: 24,
    borderRadius: 999,
    background: color,
    color: "#fff",
    display: "grid",
    placeItems: "center",
    flexShrink: 0
  }),
  activityText: {
    fontSize: 13,
    color: "var(--fg-1)",
    lineHeight: 1.4,
    letterSpacing: "-0.005em"
  },
  activitySub: {
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
    color: "var(--fg-3)"
  },
  todayItem: {
    display: "grid",
    gridTemplateColumns: "56px 1fr",
    gap: 12,
    alignItems: "start",
    padding: "9px 12px",
    borderRadius: 8
  },
  todayTime: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--fg-3)"
  },
  todayTitle: {
    fontSize: 13,
    color: "var(--fg-1)",
    fontWeight: 500,
    letterSpacing: "-0.005em"
  },
  todaySub: {
    fontSize: 12,
    color: "var(--fg-3)",
    marginTop: 1
  },
  bar: {
    height: 8,
    background: "var(--surface-2)",
    borderRadius: 999,
    overflow: "hidden"
  },
  barFill: (pct, color) => ({
    width: `${pct}%`,
    height: "100%",
    background: color,
    borderRadius: 999
  })
};
function Kpi({
  label,
  value,
  delta,
  positive
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.kpi
  }, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.kpiLabel
  }, label), /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.kpiVal
  }, value), /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.kpiTrend(positive)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: positive ? "arrowUp" : "arrowDown",
    size: 12
  }), /*#__PURE__*/React.createElement("span", null, delta)));
}
function OverviewView() {
  const activities = [{
    color: "#009E73",
    icon: "check",
    text: "Finished color system card",
    sub: "8m ago"
  }, {
    color: "#0072B2",
    icon: "file",
    text: "Created Atlas → README",
    sub: "26m ago"
  }, {
    color: "#E69F00",
    icon: "bookmark",
    text: "Saved 3 references in Drift",
    sub: "1h ago"
  }, {
    color: "#CC79A7",
    icon: "bolt",
    text: "Pushed prototype build to staging",
    sub: "3h ago"
  }, {
    color: "#56B4E9",
    icon: "inbox",
    text: "12 messages reviewed in Inbox",
    sub: "yesterday"
  }];
  const today = [{
    time: "09:30",
    title: "Color system review",
    sub: "Solo · 30m"
  }, {
    time: "11:00",
    title: "Atlas planning",
    sub: "with Sam · 45m"
  }, {
    time: "14:00",
    title: "Drift design crit",
    sub: "with team · 1h"
  }, {
    time: "16:30",
    title: "Walk",
    sub: "outside"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.root
  }, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.hero
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.greeting
  }, "Good afternoon, Peter."), /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.greetingSub
  }, "Quiet day. 4 things scheduled. Nothing on fire."))), /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.kpiGrid
  }, /*#__PURE__*/React.createElement(Kpi, {
    label: "Tasks done",
    value: "14",
    delta: "+3 today",
    positive: true
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "Hours focused",
    value: "5.2h",
    delta: "+0.8h vs avg",
    positive: true
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "Notes added",
    value: "9",
    delta: "+2 today",
    positive: true
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "Inbox",
    value: "3",
    delta: "-7 cleared",
    positive: true
  })), /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.twoCol
  }, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.panel
  }, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.panelHead
  }, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.panelTitle
  }, "Activity"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, "today")), /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.panelBody
  }, activities.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: overviewStyles.activity
  }, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.activityIcon(a.color)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: a.icon,
    size: 12
  })), /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.activityText
  }, a.text), /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.activitySub
  }, a.sub))))), /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.panel
  }, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.panelHead
  }, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.panelTitle
  }, "Today"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, "4")), /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.panelBody
  }, today.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: overviewStyles.todayItem
  }, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.todayTime
  }, t.time), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.todayTitle
  }, t.title), /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.todaySub
  }, t.sub))))))), /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.panel
  }, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.panelHead
  }, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.panelTitle
  }, "This week"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, "62% of goal")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, [{
    label: "Atlas",
    pct: 78,
    color: "#0072B2"
  }, {
    label: "Drift",
    pct: 42,
    color: "#E69F00"
  }, {
    label: "Onyx",
    pct: 63,
    color: "#009E73"
  }, {
    label: "Harbor",
    pct: 21,
    color: "#CC79A7"
  }].map(p => /*#__PURE__*/React.createElement("div", {
    key: p.label
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)",
      fontWeight: 500
    }
  }, p.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, p.pct, "%")), /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.bar
  }, /*#__PURE__*/React.createElement("div", {
    style: overviewStyles.barFill(p.pct, p.color)
  })))))));
}
window.OverviewView = OverviewView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/personal-os/OverviewView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/personal-os/Sidebar.jsx
try { (() => {
/* Sidebar — left nav with workspace, sections, footer.
   Receives current view name and a setter. */

const navSidebarStyles = {
  root: {
    width: 240,
    background: "var(--surface)",
    borderRight: "1px solid var(--border-1)",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    height: "100%"
  },
  brand: {
    padding: "18px 20px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: "1px solid var(--border-1)"
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "var(--fg-1)",
    color: "var(--bg)",
    display: "grid",
    placeItems: "center",
    flexShrink: 0
  },
  brandText: {
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: 15,
    color: "var(--fg-1)",
    letterSpacing: "-0.01em"
  },
  brandDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    background: "var(--accent)",
    marginTop: 9,
    marginLeft: -3
  },
  section: {
    padding: "14px 12px 6px",
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
    color: "var(--fg-3)",
    letterSpacing: "0.08em",
    textTransform: "uppercase"
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    padding: "0 8px"
  },
  item: active => ({
    display: "grid",
    gridTemplateColumns: "18px 1fr auto",
    gap: 10,
    alignItems: "center",
    padding: "7px 10px",
    borderRadius: 7,
    fontSize: 13.5,
    fontWeight: active ? 500 : 400,
    color: active ? "var(--fg-1)" : "var(--fg-2)",
    background: active ? "var(--surface-2)" : "transparent",
    border: "0",
    width: "100%",
    cursor: "pointer",
    textAlign: "left",
    letterSpacing: "-0.005em",
    transition: "background 120ms var(--ease-out)"
  }),
  count: {
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
    color: "var(--fg-3)",
    padding: "1px 6px",
    borderRadius: 999,
    background: "var(--surface-2)"
  },
  spacer: {
    flex: 1
  },
  footer: {
    padding: 14,
    borderTop: "1px solid var(--border-1)",
    display: "flex",
    alignItems: "center",
    gap: 10
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "linear-gradient(135deg, #0072B2, #56B4E9)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: 12
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    flex: 1,
    minWidth: 0
  },
  userName: {
    fontSize: 13,
    color: "var(--fg-1)",
    fontWeight: 500,
    letterSpacing: "-0.005em"
  },
  userMail: {
    fontSize: 11,
    color: "var(--fg-3)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  }
};
function Sidebar({
  view,
  setView
}) {
  const items = [{
    key: "overview",
    label: "Overview",
    icon: "home"
  }, {
    key: "tasks",
    label: "Tasks",
    icon: "list",
    count: 7
  }, {
    key: "notes",
    label: "Notes",
    icon: "notebook"
  }, {
    key: "calendar",
    label: "Calendar",
    icon: "calendar"
  }, {
    key: "inbox",
    label: "Inbox",
    icon: "inbox",
    count: 3
  }];
  const projects = [{
    key: "atlas",
    label: "Atlas",
    color: "#0072B2"
  }, {
    key: "drift",
    label: "Drift",
    color: "#E69F00"
  }, {
    key: "onyx",
    label: "Onyx",
    color: "#009E73"
  }, {
    key: "harbor",
    label: "Harbor",
    color: "#CC79A7"
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: navSidebarStyles.root
  }, /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.brand
  }, /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.brandMark,
    "aria-label": "Wunjo"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 120 120",
    width: "18",
    height: "18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "10",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M48 26 L48 94"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M48 26 L92 50 L48 70"
  }))), /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.brandText
  }, "peter"), /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.brandDot
  })), /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.section
  }, "workspace"), /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.nav
  }, items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.key,
    style: navSidebarStyles.item(view === it.key),
    onClick: () => setView(it.key)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: it.icon
  }), /*#__PURE__*/React.createElement("span", null, it.label), it.count ? /*#__PURE__*/React.createElement("span", {
    style: navSidebarStyles.count
  }, it.count) : /*#__PURE__*/React.createElement("span", null)))), /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.section
  }, "projects"), /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.nav
  }, projects.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.key,
    style: navSidebarStyles.item(false)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: p.color,
      marginLeft: 5
    }
  }), /*#__PURE__*/React.createElement("span", null, p.label), /*#__PURE__*/React.createElement("span", null))), /*#__PURE__*/React.createElement("button", {
    style: {
      ...navSidebarStyles.item(false),
      color: "var(--fg-3)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), /*#__PURE__*/React.createElement("span", null, "New project"), /*#__PURE__*/React.createElement("span", null))), /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.spacer
  }), /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.footer
  }, /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.avatar
  }, "p"), /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.userInfo
  }, /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.userName
  }, "Peter"), /*#__PURE__*/React.createElement("div", {
    style: navSidebarStyles.userMail
  }, "peter@example.com")), /*#__PURE__*/React.createElement("button", {
    style: {
      background: "transparent",
      border: 0,
      color: "var(--fg-3)",
      cursor: "pointer",
      padding: 4
    },
    "aria-label": "Settings"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings"
  }))));
}
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/personal-os/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/personal-os/TasksView.jsx
try { (() => {
/* TasksView — list of tasks; click to toggle done; grouped by status */

const tasksStyles = {
  root: {
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 20,
    maxWidth: 880
  },
  head: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 24
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    color: "var(--fg-1)"
  },
  sub: {
    fontSize: 14,
    color: "var(--fg-3)",
    marginTop: 2
  },
  filter: {
    display: "inline-flex",
    background: "var(--surface-2)",
    border: "1px solid var(--border-1)",
    borderRadius: 10,
    padding: 3
  },
  filterBtn: on => ({
    border: 0,
    background: on ? "var(--surface)" : "transparent",
    color: on ? "var(--fg-1)" : "var(--fg-2)",
    padding: "5px 12px",
    fontFamily: "var(--font-sans)",
    fontSize: 12.5,
    fontWeight: 500,
    borderRadius: 7,
    cursor: "pointer",
    boxShadow: on ? "var(--shadow-xs)" : "none"
  }),
  group: {
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  groupHead: {
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
    color: "var(--fg-3)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "8px 4px 4px"
  },
  row: done => ({
    display: "grid",
    gridTemplateColumns: "20px 18px 1fr auto auto",
    gap: 14,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 10,
    background: "var(--surface)",
    border: "1px solid var(--border-1)",
    opacity: done ? 0.6 : 1
  }),
  grip: {
    color: "var(--fg-4)",
    cursor: "grab",
    display: "flex"
  },
  check: done => ({
    width: 16,
    height: 16,
    borderRadius: 5,
    border: done ? "1px solid var(--accent)" : "1px solid var(--border-2)",
    background: done ? "var(--accent)" : "var(--surface)",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    cursor: "pointer",
    padding: 0
  }),
  text: done => ({
    fontSize: 13.5,
    color: "var(--fg-1)",
    textDecoration: done ? "line-through" : "none",
    letterSpacing: "-0.005em",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  }),
  proj: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    background: "var(--surface-2)",
    border: "1px solid var(--border-1)"
  },
  due: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--fg-3)"
  },
  dueWarn: {
    color: "var(--warning-fg)"
  }
};
function TasksView() {
  const initial = [{
    id: 1,
    text: "Wire the colorblind preview card",
    proj: "atlas",
    projColor: "#0072B2",
    due: "today",
    done: true
  }, {
    id: 2,
    text: "Write voice + tone in README",
    proj: "atlas",
    projColor: "#0072B2",
    due: "today",
    done: true
  }, {
    id: 3,
    text: "Pick fonts; flag substitution",
    proj: "atlas",
    projColor: "#0072B2",
    due: "today",
    done: false,
    warn: true
  }, {
    id: 4,
    text: "Build TasksView with drag handles",
    proj: "drift",
    projColor: "#E69F00",
    due: "thu",
    done: false
  }, {
    id: 5,
    text: "Audit dark theme contrast",
    proj: "drift",
    projColor: "#E69F00",
    due: "fri",
    done: false
  }, {
    id: 6,
    text: "Write SKILL.md",
    proj: "atlas",
    projColor: "#0072B2",
    due: "fri",
    done: false
  }, {
    id: 7,
    text: "Sketch CommandPalette interactions",
    proj: "onyx",
    projColor: "#009E73",
    due: "next week",
    done: false
  }];
  const [tasks, setTasks] = React.useState(initial);
  const [filter, setFilter] = React.useState("all");
  const toggle = id => setTasks(t => t.map(x => x.id === id ? {
    ...x,
    done: !x.done
  } : x));
  const visible = tasks.filter(t => filter === "all" || (filter === "open" ? !t.done : t.done));
  const open = visible.filter(t => !t.done);
  const done = visible.filter(t => t.done);
  const Row = ({
    t
  }) => /*#__PURE__*/React.createElement("div", {
    style: tasksStyles.row(t.done)
  }, /*#__PURE__*/React.createElement("span", {
    style: tasksStyles.grip
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "grip",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    style: tasksStyles.check(t.done),
    onClick: () => toggle(t.id),
    "aria-label": "toggle"
  }, t.done ? /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 11,
    stroke: 3
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: tasksStyles.text(t.done)
  }, t.text), /*#__PURE__*/React.createElement("span", {
    style: tasksStyles.proj
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      width: 6,
      height: 6,
      borderRadius: 999,
      background: t.projColor,
      marginRight: 6,
      verticalAlign: "middle"
    }
  }), t.proj), /*#__PURE__*/React.createElement("span", {
    style: {
      ...tasksStyles.due,
      ...(t.warn ? tasksStyles.dueWarn : {})
    }
  }, t.due));
  return /*#__PURE__*/React.createElement("div", {
    style: tasksStyles.root
  }, /*#__PURE__*/React.createElement("div", {
    style: tasksStyles.head
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: tasksStyles.title
  }, "Tasks"), /*#__PURE__*/React.createElement("div", {
    style: tasksStyles.sub
  }, open.length, " open \xB7 ", done.length, " done today")), /*#__PURE__*/React.createElement("div", {
    style: tasksStyles.filter
  }, /*#__PURE__*/React.createElement("button", {
    style: tasksStyles.filterBtn(filter === "all"),
    onClick: () => setFilter("all")
  }, "All"), /*#__PURE__*/React.createElement("button", {
    style: tasksStyles.filterBtn(filter === "open"),
    onClick: () => setFilter("open")
  }, "Open"), /*#__PURE__*/React.createElement("button", {
    style: tasksStyles.filterBtn(filter === "done"),
    onClick: () => setFilter("done")
  }, "Done"))), open.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: tasksStyles.group
  }, /*#__PURE__*/React.createElement("div", {
    style: tasksStyles.groupHead
  }, "open \xB7 ", open.length), open.map(t => /*#__PURE__*/React.createElement(Row, {
    key: t.id,
    t: t
  }))), done.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: tasksStyles.group
  }, /*#__PURE__*/React.createElement("div", {
    style: tasksStyles.groupHead
  }, "done"), done.map(t => /*#__PURE__*/React.createElement(Row, {
    key: t.id,
    t: t
  }))));
}
window.TasksView = TasksView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/personal-os/TasksView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/personal-os/TopBar.jsx
try { (() => {
/* TopBar — title (current view), search, ⌘K trigger, theme toggle */

const topBarStyles = {
  root: {
    height: 56,
    borderBottom: "1px solid var(--border-1)",
    background: "color-mix(in oklab, var(--bg) 80%, transparent)",
    backdropFilter: "blur(12px) saturate(140%)",
    WebkitBackdropFilter: "blur(12px) saturate(140%)",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    gap: 14,
    position: "sticky",
    top: 0,
    zIndex: 10
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: "-0.015em",
    color: "var(--fg-1)"
  },
  crumb: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--fg-3)",
    letterSpacing: "0.04em",
    textTransform: "uppercase"
  },
  search: {
    flex: 1,
    maxWidth: 360,
    marginLeft: "auto",
    position: "relative"
  },
  searchInput: {
    width: "100%",
    height: 32,
    background: "var(--surface)",
    border: "1px solid var(--border-1)",
    borderRadius: 8,
    padding: "0 78px 0 32px",
    fontFamily: "var(--font-sans)",
    fontSize: 13,
    color: "var(--fg-1)",
    outline: "none",
    letterSpacing: "-0.005em"
  },
  searchIcon: {
    position: "absolute",
    left: 10,
    top: 9,
    color: "var(--fg-3)"
  },
  searchKbd: {
    position: "absolute",
    right: 8,
    top: 6,
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
    color: "var(--fg-3)",
    background: "var(--surface-2)",
    border: "1px solid var(--border-1)",
    borderRadius: 4,
    padding: "2px 6px"
  },
  iconBtn: {
    width: 32,
    height: 32,
    border: "1px solid var(--border-1)",
    background: "var(--surface)",
    borderRadius: 8,
    color: "var(--fg-2)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center"
  }
};
function TopBar({
  title,
  onOpenPalette,
  dark,
  setDark
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: topBarStyles.root
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: topBarStyles.crumb
  }, "workspace"), /*#__PURE__*/React.createElement("div", {
    style: topBarStyles.title
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: topBarStyles.search
  }, /*#__PURE__*/React.createElement("span", {
    style: topBarStyles.searchIcon
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  })), /*#__PURE__*/React.createElement("input", {
    style: topBarStyles.searchInput,
    placeholder: "Search anything",
    onFocus: onOpenPalette,
    readOnly: true
  }), /*#__PURE__*/React.createElement("span", {
    style: topBarStyles.searchKbd
  }, "\u2318 K")), /*#__PURE__*/React.createElement("button", {
    style: topBarStyles.iconBtn,
    onClick: () => setDark(!dark),
    "aria-label": dark ? "Light mode" : "Dark mode",
    title: dark ? "Switch to light" : "Switch to dark"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: dark ? "sun" : "moon",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    style: topBarStyles.iconBtn,
    "aria-label": "Notifications"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 14
  })));
}
window.TopBar = TopBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/personal-os/TopBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/personal-os/app.jsx
try { (() => {
/* App shell — composes Sidebar + TopBar + active view + ⌘K palette */

const appStyles = {
  shell: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    height: "100vh",
    width: "100vw",
    background: "var(--bg)",
    color: "var(--fg-1)",
    fontFamily: "var(--font-sans)",
    overflow: "hidden"
  },
  main: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    minHeight: 0
  },
  content: {
    flex: 1,
    overflowY: "auto",
    minHeight: 0,
    display: "flex",
    flexDirection: "column"
  }
};
const TITLES = {
  overview: "Overview",
  tasks: "Tasks",
  notes: "Notes",
  calendar: "Calendar",
  inbox: "Inbox"
};
function App() {
  const [view, setView] = React.useState("overview");
  const [palette, setPalette] = React.useState(false);
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);
  React.useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(p => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: appStyles.shell
  }, /*#__PURE__*/React.createElement(Sidebar, {
    view: view,
    setView: setView
  }), /*#__PURE__*/React.createElement("div", {
    style: appStyles.main
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: TITLES[view] || "Workspace",
    onOpenPalette: () => setPalette(true),
    dark: dark,
    setDark: setDark
  }), /*#__PURE__*/React.createElement("div", {
    style: appStyles.content
  }, view === "overview" && /*#__PURE__*/React.createElement(OverviewView, null), view === "tasks" && /*#__PURE__*/React.createElement(TasksView, null), view === "notes" && /*#__PURE__*/React.createElement(NotesView, null), view === "calendar" && /*#__PURE__*/React.createElement(Placeholder, {
    name: "Calendar"
  }), view === "inbox" && /*#__PURE__*/React.createElement(Placeholder, {
    name: "Inbox"
  }))), palette && /*#__PURE__*/React.createElement(CommandPalette, {
    onClose: () => setPalette(false)
  }));
}
function Placeholder({
  name
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "grid",
      placeItems: "center",
      padding: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      color: "var(--fg-3)",
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 22,
      fontWeight: 600,
      color: "var(--fg-2)",
      letterSpacing: "-0.015em",
      marginBottom: 6
    }
  }, "nothing here yet."), /*#__PURE__*/React.createElement("div", null, name, " is intentionally blank in this reference kit.")));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/personal-os/app.jsx", error: String((e && e.message) || e) }); }

})();
