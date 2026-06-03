/* APP SHELL — nav, routing, roles, account switching */
(function () {
  const { useState, useContext, useEffect } = React;

  function lsGet(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } }
  function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }

  // IndexedDB helpers for large blobs (images) — no size limit unlike localStorage
  function dbSave(key, val) {
    try {
      const req = indexedDB.open("nzdb", 1);
      req.onupgradeneeded = (e) => { try { e.target.result.createObjectStore("kv"); } catch(e2) {} };
      req.onsuccess = (e) => {
        try { const tx = e.target.result.transaction("kv", "readwrite"); tx.objectStore("kv").put(val, key); } catch(e2) {}
      };
    } catch(e) {}
  }
  function dbLoad(key, cb) {
    try {
      const req = indexedDB.open("nzdb", 1);
      req.onupgradeneeded = (e) => { try { e.target.result.createObjectStore("kv"); } catch(e2) {} };
      req.onsuccess = (e) => {
        try {
          const r = e.target.result.transaction("kv", "readonly").objectStore("kv").get(key);
          r.onsuccess = () => cb(r.result || null);
          r.onerror = () => cb(null);
        } catch(e2) { cb(null); }
      };
      req.onerror = () => cb(null);
    } catch(e) { cb(null); }
  }

  // Error boundary — uses position:fixed so it's visible regardless of parent CSS
  class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { err: null }; }
    static getDerivedStateFromError(e) { return { err: e }; }
    componentDidCatch(e, info) { console.error("[NZ Error]", e, info); }
    render() {
      if (this.state.err) {
        return React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, background: "var(--bg)", color: "var(--ink)" } },
          React.createElement("div", { style: { fontSize: 48 } }, "💀"),
          React.createElement("h2", { style: { fontFamily: "var(--display)", color: "var(--gold)" } }, "A critical fail"),
          React.createElement("p", { style: { color: "var(--ink-soft)", maxWidth: 400, textAlign: "center" } }, String((this.state.err && this.state.err.message) || "Something broke.")),
          React.createElement("button", { className: "btn primary", onClick: () => this.setState({ err: null }) }, "Try again"));
      }
      return this.props.children;
    }
  }
  const Icon = window.Icon;
  const { Avatar } = window.NZUI;
  const D = window.NZ;
  const Auth = window.NZAuth;

  const NAV = [
    { id: "home", label: "Home", icon: "home", title: "Campaign Home", eyebrow: "The Nat Zeroes" },
    { id: "map", label: "The Table", icon: "map", title: "The Table", eyebrow: "Virtual Tabletop" },
    { id: "world", label: "World Map", icon: "pin", title: "World Map", eyebrow: "The Realm of Aldermoor" },
    { id: "crew", label: "Crew & Lore", icon: "party", title: "Crew & Lore", eyebrow: "Party · NPCs · Compendium" },
    { id: "creator", label: "Creator", icon: "user", title: "Character Creator", eyebrow: "Forge a Hero" },
    { id: "scheduler", label: "Schedule", icon: "scheduler", title: "Scheduler", eyebrow: "Plan Sessions" },
    { id: "recaps", label: "Recaps", icon: "recap", title: "Recaps", eyebrow: "Campaign Log" },
    { id: "chatzeros", label: "Chat Zeroes", icon: "sparkle", title: "The Chat Zeroes", eyebrow: "Aftershow · Podcast" },
    { id: "extras", label: "Extras", icon: "flame", title: "Fan Extras", eyebrow: "Bonus Content" },
    { id: "accounts", label: "Accounts", icon: "shield", title: "Accounts & Roles", eyebrow: "Who's Who" },
  ];

  function App() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState("home");
    const [collapsed, setCollapsed] = useState(false);
    const [mobileRailOpen, setMobileRailOpen] = useState(false);
    const [switchOpen, setSwitchOpen] = useState(false);
    const [pendingMap, setPendingMap] = useState(null);
    const [recaps, setRecaps]       = useState(() => lsGet("nz_recaps",    D.recaps));
    const [campaign, setCampaign]   = useState(() => lsGet("nz_campaign",  D.campaign));
    const [chatStats, setChatStats] = useState(() => lsGet("nz_chatstats", D.chatStats));
    const [awards, setAwards]       = useState(() => lsGet("nz_awards",    D.awards));
    const [quotes, setQuotes]       = useState(() => lsGet("nz_quotes",    []));
    const [loot, setLoot]           = useState(() => lsGet("nz_loot",      { gold: 0, items: [] }));
    const [npcs, setNpcs]           = useState(() => lsGet("nz_npcs",      []));
    const [timeline, setTimeline]   = useState(() => lsGet("nz_timeline",  []));
    const [deaths, setDeaths]       = useState(() => lsGet("nz_deaths",    []));
    const [predictions, setPredictions] = useState(() => lsGet("nz_predictions", []));
    const [gags, setGags]           = useState(() => lsGet("nz_gags",      []));
    const [shoutouts, setShoutouts]     = useState(() => lsGet("nz_shoutouts",    []));
    const [customPaths, setCustomPaths] = useState(() => lsGet("nz_worldpaths",  []));
    const [riversideLink, setRiversideLink] = useState(() => lsGet("nz_riverside", ""));
    const [worldBgImg, setWorldBgImg] = useState(null);
    useEffect(() => { dbLoad("nz_worldbg", (img) => { if (img) setWorldBgImg(img); }); }, []);
    function saveWorldBg(img) { setWorldBgImg(img); dbSave("nz_worldbg", img || null); }

    useEffect(() => { lsSet("nz_recaps",    recaps);    }, [recaps]);
    useEffect(() => { lsSet("nz_campaign",  campaign);  }, [campaign]);
    useEffect(() => { lsSet("nz_chatstats", chatStats); }, [chatStats]);
    useEffect(() => { lsSet("nz_awards",    awards);    }, [awards]);
    useEffect(() => { lsSet("nz_quotes",    quotes);    }, [quotes]);
    useEffect(() => { lsSet("nz_loot",      loot);      }, [loot]);
    useEffect(() => { lsSet("nz_npcs",      npcs);      }, [npcs]);
    useEffect(() => { lsSet("nz_timeline",  timeline);  }, [timeline]);
    useEffect(() => { lsSet("nz_deaths",    deaths);    }, [deaths]);
    useEffect(() => { lsSet("nz_predictions", predictions); }, [predictions]);
    useEffect(() => { lsSet("nz_gags",      gags);      }, [gags]);
    useEffect(() => { lsSet("nz_shoutouts",   shoutouts);    }, [shoutouts]);
    useEffect(() => { lsSet("nz_worldpaths",  customPaths);  }, [customPaths]);
    useEffect(() => { lsSet("nz_riverside",   riversideLink);}, [riversideLink]);

    const role = user ? user.role : null;
    const allowed = role ? Auth.VIEW_ACCESS[role] : [];
    useEffect(() => { if (role && !allowed.includes(view)) setView("home"); }, [role]);

    // Global keyboard shortcuts — must be before early return to obey Rules of Hooks
    useEffect(() => {
      if (!user) return; // no shortcuts when logged out
      function onKey(e) {
        const tag = (e.target || {}).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (e.key === "Escape") { document.querySelectorAll("[data-modal-close]").forEach((el) => el.click()); }
        if (e.key === "d" || e.key === "D") { if (view === "map") window.dispatchEvent(new CustomEvent("nz:opendice")); }
        if (e.key === " " && view === "map") { e.preventDefault(); window.dispatchEvent(new CustomEvent("nz:nextturn")); }
        if (e.key === "r" || e.key === "R") { if (view === "map") window.dispatchEvent(new CustomEvent("nz:rollinitiative")); }
        if (e.key === "f" || e.key === "F") { if (view === "map") window.dispatchEvent(new CustomEvent("nz:fogtoggle")); }
      }
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [user, view]);

    if (!user) return React.createElement(Auth.LoginScreen, { onLogin: setUser });

    const navItems = NAV.filter((n) => allowed.includes(n.id));

    const go = (v) => { if (allowed.includes(v)) setView(v); };
    const openMap = (mapId) => { setPendingMap(mapId); setView("map"); };
    const meta = NAV.find((n) => n.id === view) || NAV[0];
    const roleInfo = Auth.ROLES[role];
    const ctxVal = { user, role, can: (c) => Auth.can(role, c) };

    return React.createElement(Auth.RoleContext.Provider, { value: ctxVal },
      React.createElement("div", { className: "app" + (collapsed ? " rail-collapsed" : "") },
        // ===== rail =====
        React.createElement("aside", { className: "rail" + (collapsed ? " collapsed" : "") + (mobileRailOpen ? " mobile-open" : "") },
          React.createElement("div", { className: "rail-brand", onClick: () => go("home") },
            React.createElement("img", { src: "assets/logo.png", alt: "The Nat Zeroes" }),
            React.createElement("div", { className: "wm" },
              React.createElement("span", { className: "top" }, "THE"),
              React.createElement("span", { className: "big" }, "NAT ZEROES"))),
          React.createElement("nav", { className: "nav" },
            navItems.map((n) => React.createElement("div", { key: n.id, className: "nav-item" + (view === n.id ? " active" : ""), onClick: () => go(n.id) },
              React.createElement("span", { className: "ic" }, React.createElement(Icon, { name: n.icon })),
              React.createElement("span", { className: "lbl" }, n.label)))),
          React.createElement("div", { className: "rail-foot" },
            React.createElement("div", { className: "party-chip", onClick: () => setSwitchOpen(true), title: "Switch account" },
              React.createElement(Avatar, { name: user.name, ring: user.ring, size: 34 }),
              React.createElement("div", { className: "meta" },
                React.createElement("span", { className: "n" }, user.name),
                React.createElement("span", { className: "s" }, roleInfo.label)),
              React.createElement(Icon, { name: "chevD", size: 16, style: { color: "var(--ink-dim)" } })))),

        // ===== main =====
        React.createElement("div", { className: "main" },
          React.createElement("div", { className: "topbar" },
            React.createElement("button", { className: "icon-btn", onClick: () => { setCollapsed((c) => !c); setMobileRailOpen((x) => !x); }, title: "Toggle menu" }, React.createElement(Icon, { name: "menu", size: 18 })),
            React.createElement("div", { className: "crumb" },
              React.createElement("span", { className: "eyebrow" }, meta.eyebrow),
              React.createElement("h1", null, meta.title)),
            React.createElement("div", { className: "spacer" }),
            allowed.includes("map") && view !== "map" && React.createElement("button", { className: "btn", onClick: () => go("map") }, React.createElement(Icon, { name: "dice", size: 16 }), "Game on"),
            React.createElement("button", { className: "acct-pill", onClick: () => setSwitchOpen(true), title: "Switch account" },
              React.createElement(Avatar, { name: user.name, ring: user.ring, size: 28 }),
              React.createElement("span", { className: "tag", style: { fontSize: 10, color: roleInfo.color, borderColor: roleInfo.color + "55", background: roleInfo.color + "1a" } }, roleInfo.short)),
            React.createElement("button", { className: "icon-btn", title: "Notifications" }, React.createElement(Icon, { name: "bell", size: 18 }))),

          React.createElement(ErrorBoundary, { key: view },
          React.createElement("div", { className: "view" },
            view === "home" && React.createElement(window.Dashboard, { data: Object.assign({}, D, { recaps, campaign }), go, user, onCampaignSave: setCampaign, timeline, setTimeline }),
            view === "map" && React.createElement(window.BattleMap, { maps: D.maps, party: D.party, bestiary: D.bestiary, dm: D.dm, initialMapId: pendingMap, riversideLink, setRiversideLink }),
            view === "world" && React.createElement(window.World, { locations: D.locations, maps: D.maps, onOpenMap: openMap, bgImg: worldBgImg, onBgImgChange: saveWorldBg, customPaths, setCustomPaths }),
            view === "crew" && React.createElement(window.CrewLore, { party: D.party, dm: D.dm, loot, setLoot, npcs, setNpcs, bestiary: D.bestiary }),
            view === "creator" && React.createElement(window.Creator, { party: D.party }),
            view === "scheduler" && React.createElement(window.Scheduler, { members: D.members, pollOptions: D.pollOptions, sessions: D.sessions, weeklySchedule: D.weeklySchedule }),
            view === "recaps" && React.createElement(Recaps, { recaps, setRecaps, stats: D.stats }),
            view === "chatzeros" && React.createElement(window.ChatZeroes, { chatStats, setChatStats, awards, setAwards, quotes, setQuotes, deaths, setDeaths, predictions, setPredictions, gags, setGags, shoutouts, setShoutouts, party: D.party }),
            view === "extras" && React.createElement(Extras, { recaps, stats: D.stats, go }),
            view === "accounts" && React.createElement(Auth.AccountsView)))),

        React.createElement(Auth.AccountSwitcher, { open: switchOpen, onClose: () => setSwitchOpen(false), current: user, onSwitch: setUser }),
        window.NZTweaks && React.createElement(window.NZTweaks)));
  }

  function Recaps({ recaps, setRecaps, stats }) {
    const ctx = useContext(Auth.RoleContext);
    const canEdit = Auth.can(ctx.role, "editWorld");
    const [editing, setEditing] = useState(null);

    function saveRecap(r) {
      if (r.id) { setRecaps((rs) => rs.map((x) => x.id === r.id ? r : x)); }
      else { setRecaps((rs) => [{ ...r, id: "r" + Date.now(), num: rs.length + 1 }, ...rs]); }
      setEditing(null);
    }
    function deleteRecap(id) { if (confirm("Delete this recap?")) setRecaps((rs) => rs.filter((r) => r.id !== id)); }

    return React.createElement("div", { className: "view-pad", style: { maxWidth: 820 } },
      React.createElement("div", { className: "row", style: { marginBottom: 20, gap: 12, alignItems: "center" } },
        React.createElement("p", { className: "muted", style: { margin: 0, flex: 1, maxWidth: 560 } }, "The official record of poor decisions. ", stats.sessionsPlayed, " sessions, ", stats.nat1s, " natural ones, and zero (0) total party kills \u2014 somehow."),
        React.createElement("button", { className: "btn ghost", onClick: () => {
          const text = recaps.map((r) => "=== Ep " + r.num + ": " + r.title + " (" + r.date + ") ===\n" + r.body + "\nTags: " + r.tags.join(", ") + "\n").join("\n");
          const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = "nat-zeroes-recaps.txt"; a.click();
        } }, React.createElement(Icon, { name: "upload", size: 16 }), "Export"),
        canEdit && React.createElement("button", { className: "btn primary", onClick: () => setEditing(false) },
          React.createElement(Icon, { name: "plus", size: 16 }), "New Recap")),
      React.createElement("div", { style: { position: "relative", paddingLeft: 28 } },
        React.createElement("div", { style: { position: "absolute", left: 7, top: 8, bottom: 8, width: 2, background: "linear-gradient(var(--gold-deep), transparent)" } }),
        recaps.map((r) => React.createElement("div", { key: r.id, style: { position: "relative", marginBottom: 22 } },
          React.createElement("div", { style: { position: "absolute", left: -28, top: 6, width: 16, height: 16, borderRadius: "50%", background: "var(--gold)", border: "3px solid var(--bg)", boxShadow: "var(--glow-gold)" } }),
          React.createElement("div", { className: "panel", style: { padding: 20 } },
            React.createElement("div", { className: "row", style: { gap: 10, marginBottom: 8 } },
              React.createElement("span", { className: "tag gold" }, "Episode " + r.num),
              React.createElement("span", { className: "spacer" }),
              React.createElement("span", { className: "muted", style: { fontSize: 12.5 } }, r.date),
              canEdit && React.createElement("button", { className: "btn sm ghost", onClick: () => setEditing(r), style: { padding: "3px 8px", fontSize: 11 } }, React.createElement(Icon, { name: "settings", size: 12 }), "Edit"),
              canEdit && React.createElement("button", { className: "btn sm ghost", onClick: () => deleteRecap(r.id), style: { padding: "3px 8px", fontSize: 11, color: "var(--red-bright)" } }, React.createElement(Icon, { name: "skull", size: 12 }), "Delete")),
            React.createElement("h2", { style: { fontSize: 21, marginBottom: 10, color: "var(--ink)" } }, r.title),
            React.createElement("p", { style: { margin: "0 0 12px", fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.6 } }, r.body),
            React.createElement("div", { className: "row", style: { gap: 7, flexWrap: "wrap" } }, r.tags.map((t) => React.createElement("span", { key: t, className: "tag", style: { fontSize: 11 } }, t))))))),
      React.createElement(RecapModal, { open: editing !== null, initial: editing || null, onClose: () => setEditing(null), onSave: saveRecap }));
  }

  function RecapModal({ open, initial, onClose, onSave }) {
    const Modal = window.NZUI.Modal;
    const [title, setTitle] = useState(initial?.title || "");
    const [body, setBody] = useState(initial?.body || "");
    const [date, setDate] = useState(initial?.date || "");
    const [tags, setTags] = useState((initial?.tags || []).join(", "));
    useEffect(() => {
      if (open) { setTitle(initial?.title || ""); setBody(initial?.body || ""); setDate(initial?.date || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })); setTags((initial?.tags || []).join(", ")); }
    }, [open]);
    function save() { onSave({ ...initial, title, body, date, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) }); }
    return React.createElement(Modal, { open, onClose, title: initial?.id ? "Edit Recap" : "New Recap", w: 580 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Episode title"),
          React.createElement("input", { className: "input", value: title, onChange: (e) => setTitle(e.target.value), placeholder: "e.g. A Heist, a Ghost, and a Debt" })),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Date"),
          React.createElement("input", { className: "input", value: date, onChange: (e) => setDate(e.target.value), placeholder: "e.g. 2 Jun 2026" })),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Recap text"),
          React.createElement("textarea", { className: "input", rows: 6, value: body, onChange: (e) => setBody(e.target.value), style: { resize: "vertical" }, placeholder: "What happened this session..." })),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Tags (comma-separated)"),
          React.createElement("input", { className: "input", value: tags, onChange: (e) => setTags(e.target.value), placeholder: "Combat, Roleplay, Big reveal" })),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary", onClick: save }, React.createElement(Icon, { name: "save", size: 16 }), initial?.id ? "Save changes" : "Add recap"))));
  }

  function Extras({ recaps, stats, go }) {
    const cards = [
      { icon: "play", t: "Bonus Episodes", s: "Drunk one-shots, listener games & the infamous holiday special." },
      { icon: "party", t: "Meet the Cast", s: "The five disasters and one DM behind the chaos." },
      { icon: "map", t: "Watch the Live Table", s: "Follow along on the battle map during a live session.", action: () => go("map") },
      { icon: "flame", t: "Merch & Memes", s: "Nat 1 enamel pins. A mug that says 'I apologised mid-rage.'" },
    ];
    return React.createElement("div", { className: "view-pad", style: { maxWidth: 980 } },
      React.createElement("p", { className: "muted", style: { marginTop: 0, marginBottom: 22, maxWidth: 560 } }, "Welcome, listener! Bonus bits for fans of The Nat Zeroes. (More coming soon \u2014 this corner's still being built.)"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 16, marginBottom: 28 } },
        cards.map((c) => React.createElement("button", { key: c.t, onClick: c.action || (() => {}), style: { textAlign: "left", cursor: c.action ? "pointer" : "default", border: "1px solid var(--hair)", background: "linear-gradient(180deg, var(--surface), var(--bg-2))", borderRadius: "var(--r-lg)", padding: 20 } },
          React.createElement("div", { style: { color: "var(--gold)", marginBottom: 12 } }, React.createElement(Icon, { name: c.icon, size: 24 })),
          React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 600, fontSize: 16, marginBottom: 6 } }, c.t),
          React.createElement("div", { className: "muted", style: { fontSize: 13, lineHeight: 1.5 } }, c.s)))),
      React.createElement("div", { className: "section-title" }, "Latest Recap"),
      React.createElement("div", { className: "panel", style: { padding: 20, maxWidth: 620 } },
        React.createElement("div", { className: "row", style: { gap: 10, marginBottom: 8 } }, React.createElement("span", { className: "tag gold" }, "Episode " + recaps[0].num), React.createElement("span", { className: "spacer" }), React.createElement("span", { className: "muted", style: { fontSize: 12.5 } }, recaps[0].date)),
        React.createElement("h2", { style: { fontSize: 20, marginBottom: 10 } }, recaps[0].title),
        React.createElement("p", { style: { margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6 } }, recaps[0].body)));
  }

  ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
})();
