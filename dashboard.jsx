/* DASHBOARD — campaign home */
(function () {
  const { useState, useEffect, useContext } = React;
  const Icon = window.Icon;
  const { Avatar, Modal } = window.NZUI;

  const GREETINGS = [
    (p, c) => `Hi ${p} — ${c} is ready to cause chaos. Let's go.`,
    (p, c) => `Welcome back, ${p}! ${c} survived another session. Somehow.`,
    (p, c) => `${c} needs you, ${p}. The dungeon won't clear itself.`,
    (p, c) => `Ah, ${p}. ${c} has been waiting. The dice are warm.`,
    (p, c) => `${p} has entered the chat. ${c} immediately rolls a Nat 1.`,
    (p, c) => `Good to see you, ${p}. ${c} is already in trouble.`,
    (p, c) => `${c} lives another day. Nice work, ${p}.`,
    (p, c) => `${p} aka ${c} — let's dungeon some dragons.`,
    (p, c) => `The party grows restless, ${p}. ${c} sharpens their weapon.`,
    (p, c) => `Roll for initiative, ${p}. ${c} is already bleeding slightly.`,
  ];

  function Dashboard({ data, go, user, onCampaignSave, timeline, setTimeline }) {
    const ctx = useContext(window.NZAuth.RoleContext);
    const isDM = ctx.role === "dm";
    const { party, dm, recaps, stats, sessions, campaign } = data;
    const next = sessions.find((s) => s.confirmed) || sessions[0];
    const [editCampaign, setEditCampaign] = useState(false);

    // Personal greeting
    const char = party.find((p) => p.player === user?.name);
    const playerName = user?.name || "Adventurer";
    const charName = char?.name || "your character";
    const greetIdx = Math.floor(Date.now() / 86400000) % GREETINGS.length;
    const greeting = GREETINGS[greetIdx](playerName, charName);

    return React.createElement("div", { className: "view-pad", style: { maxWidth: 1180 } },
      // Greeting banner
      React.createElement("div", { style: { marginBottom: 18, padding: "12px 18px", background: "linear-gradient(90deg, rgba(145,112,240,0.12), transparent)", border: "1px solid rgba(145,112,240,0.2)", borderRadius: 12, fontSize: 14.5, color: "var(--ink-soft)", fontStyle: "italic" } },
        React.createElement("span", { style: { color: "var(--gold)", marginRight: 8, fontStyle: "normal" } }, "✦"),
        greeting),

      // Hero card
      React.createElement("div", { className: "panel", style: { padding: 0, overflow: "hidden", marginBottom: 20, position: "relative" } },
        React.createElement("div", { style: { position: "absolute", inset: 0, background: "radial-gradient(90% 130% at 88% -10%, rgba(145,112,240,0.2), transparent 55%), radial-gradient(60% 120% at 10% 120%, rgba(232,65,46,0.14), transparent 55%)", pointerEvents: "none" } }),
        React.createElement("div", { style: { display: "flex", gap: 24, padding: "30px 32px", alignItems: "center", flexWrap: "wrap", position: "relative" } },
          React.createElement("img", { src: "assets/logo.png", style: { width: 116, height: 116, objectFit: "contain", filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.6))" } }),
          React.createElement("div", { style: { flex: 1, minWidth: 260 } },
            React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.28em", color: "var(--ink-dim)", marginBottom: 8 } }, (campaign?.eyebrow || "A Chaotic Comedy D&D Podcast").toUpperCase()),
            React.createElement("h1", { style: { fontSize: 34, lineHeight: 1.05, marginBottom: 10 } },
              React.createElement("span", { style: { color: "var(--ink)" } }, (campaign?.prefix || "Campaign II:") + " "),
              React.createElement("span", { style: { background: "linear-gradient(180deg, var(--gold-bright), var(--gold-deep))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } }, campaign?.title || "Debts & Dragons")),
            React.createElement("p", { className: "muted", style: { margin: "0 0 18px", fontSize: 15, maxWidth: 560, lineHeight: 1.5 } }, campaign?.desc || ""),
            React.createElement("div", { className: "row", style: { gap: 10, flexWrap: "wrap" } },
              React.createElement("button", { className: "btn primary", onClick: () => go("map") }, React.createElement(Icon, { name: "map", size: 17 }), "Open the Table"),
              React.createElement("button", { className: "btn", onClick: () => go("scheduler") }, React.createElement(Icon, { name: "scheduler", size: 16 }), "Plan next session"),
              isDM && React.createElement("button", { className: "btn sm ghost", onClick: () => setEditCampaign(true), style: { marginLeft: "auto" } }, React.createElement(Icon, { name: "settings", size: 14 }), "Edit campaign"))))),

      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, alignItems: "start" } },
        // LEFT column
        React.createElement("div", { className: "col", style: { gap: 20 } },
          // stats
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 } },
            statCard(stats.sessionsPlayed, "Sessions", "recap", "var(--gold)"),
            statCard(stats.nat20s, "Nat 20s", "sparkle", "var(--emerald)"),
            statCard(stats.nat1s, "Nat 1s", "dice", "var(--red)"),
            statCard(stats.inJokes, "In-jokes", "flame", "var(--amethyst)")),
          // recaps
          React.createElement("div", { className: "panel" },
            React.createElement("div", { className: "panel-h" }, React.createElement(Icon, { name: "recap", size: 18, style: { color: "var(--gold-bright)" } }), React.createElement("h3", null, "Recaps"), React.createElement("div", { className: "spacer" }), React.createElement("button", { className: "btn sm ghost", onClick: () => go("recaps") }, "All recaps", React.createElement(Icon, { name: "arrowR", size: 14 }))),
            React.createElement("div", null, recaps.slice(0, 3).map((r, i) => React.createElement("div", { key: r.id, style: { padding: "16px 20px", borderBottom: i < Math.min(recaps.length, 3) - 1 ? "1px solid var(--hair)" : "none" } },
              React.createElement("div", { className: "row", style: { gap: 10, marginBottom: 6 } },
                React.createElement("span", { className: "tag gold", style: { fontSize: 10 } }, "Ep " + r.num),
                React.createElement("span", { style: { fontFamily: "var(--display)", fontWeight: 600, fontSize: 15.5 } }, r.title),
                React.createElement("span", { className: "spacer" }),
                React.createElement("span", { className: "muted", style: { fontSize: 12 } }, r.date)),
              React.createElement("p", { style: { margin: "0 0 8px", fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 } }, r.body),
              React.createElement("div", { className: "row", style: { gap: 6, flexWrap: "wrap" } }, r.tags.map((t) => React.createElement("span", { key: t, style: { fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-dim)" } }, "#" + t.toLowerCase().replace(/[^a-z0-9]+/g, ""))))))))),

        // RIGHT column
        React.createElement("div", { className: "col", style: { gap: 20 } },
          React.createElement(NextSessionMini, { session: next, go }),
          React.createElement("div", { className: "panel" },
            React.createElement("div", { className: "panel-h" }, React.createElement(Icon, { name: "party", size: 18, style: { color: "var(--gold-bright)" } }), React.createElement("h3", null, "The Party"), React.createElement("div", { className: "spacer" }), React.createElement("button", { className: "btn sm ghost", onClick: () => go("party") }, React.createElement(Icon, { name: "arrowR", size: 14 }))),
            React.createElement("div", { style: { padding: 10 } },
              party.map((p) => React.createElement("div", { key: p.id, onClick: () => go("party"), style: { display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 10, cursor: "pointer" }, onMouseEnter: (e) => e.currentTarget.style.background = "var(--surface)", onMouseLeave: (e) => e.currentTarget.style.background = "transparent" },
                React.createElement(Avatar, { name: p.name, ring: p.ring, size: 38 }),
                React.createElement("div", { className: "col", style: { flex: 1, minWidth: 0 } },
                  React.createElement("span", { style: { fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, p.name),
                  React.createElement("span", { className: "muted", style: { fontSize: 12 } }, `${p.cls} · ${p.player}`)),
                React.createElement("div", { style: { width: 44, height: 5, borderRadius: 4, background: "rgba(0,0,0,0.4)", overflow: "hidden" } },
                  React.createElement("div", { style: { width: `${(p.hp / p.hpMax) * 100}%`, height: "100%", background: p.hp > p.hpMax / 2 ? "var(--emerald)" : "var(--gold)" } })))),
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderTop: "1px solid var(--hair)", marginTop: 4 } },
                React.createElement(Avatar, { name: dm.name, ring: dm.ring, size: 38, glow: true }),
                React.createElement("div", { className: "col", style: { flex: 1 } }, React.createElement("span", { style: { fontSize: 14, fontWeight: 600 } }, dm.name), React.createElement("span", { className: "muted", style: { fontSize: 12 } }, "Dungeon Master")),
                React.createElement("span", { className: "tag gold", style: { fontSize: 10 } }, "DM")))),
          React.createElement("div", { className: "panel", style: { padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
            quickLink("map", "The Table", "Battle map", () => go("map")),
            quickLink("bestiary", "Bestiary", "Custom enemies", () => go("bestiary")),
            quickLink("sparkle", "Chat Zeroes", "Aftershow", () => go("chatzeros")),
            quickLink("scheduler", "Schedule", "Book sessions", () => go("scheduler")),
            quickLink("pin", "Lore & NPCs", "World knowledge", () => go("lore"))))),

      // Campaign timeline (collapsible below left column)
      timeline && React.createElement(CampaignTimeline, { timeline, setTimeline, isDM }),

      // Campaign edit modal (DM only)
      React.createElement(CampaignModal, { open: editCampaign, initial: campaign, onClose: () => setEditCampaign(false), onSave: (c) => { onCampaignSave && onCampaignSave(c); setEditCampaign(false); } })
    );
  }

  function CampaignModal({ open, initial, onClose, onSave }) {
    const [eyebrow, setEyebrow] = useState(initial?.eyebrow || "");
    const [prefix, setPrefix] = useState(initial?.prefix || "");
    const [title, setTitle] = useState(initial?.title || "");
    const [desc, setDesc] = useState(initial?.desc || "");
    useEffect(() => { if (open) { setEyebrow(initial?.eyebrow || ""); setPrefix(initial?.prefix || ""); setTitle(initial?.title || ""); setDesc(initial?.desc || ""); } }, [open]);
    return React.createElement(Modal, { open, onClose, title: "Edit Campaign Info", w: 520 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Eyebrow text (small text above title)"),
          React.createElement("input", { className: "input", value: eyebrow, onChange: (e) => setEyebrow(e.target.value), placeholder: "A Chaotic Comedy D&D Podcast" })),
        React.createElement("div", { className: "row", style: { gap: 12 } },
          React.createElement("div", { className: "field", style: { flex: "0 0 140px" } }, React.createElement("label", null, "Prefix"),
            React.createElement("input", { className: "input", value: prefix, onChange: (e) => setPrefix(e.target.value), placeholder: "Campaign II:" })),
          React.createElement("div", { className: "field", style: { flex: 1 } }, React.createElement("label", null, "Campaign title"),
            React.createElement("input", { className: "input", value: title, onChange: (e) => setTitle(e.target.value), placeholder: "Debts & Dragons" }))),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Description"),
          React.createElement("textarea", { className: "input", rows: 4, value: desc, onChange: (e) => setDesc(e.target.value), style: { resize: "vertical" } })),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary", onClick: () => onSave({ eyebrow, prefix, title, desc }) }, React.createElement(Icon, { name: "save", size: 16 }), "Save"))));
  }

  function NextSessionMini({ session, go }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
    const target = new Date(session.date + "T19:00:00").getTime();
    const diff = Math.max(0, target - now);
    const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60;
    return React.createElement("div", { className: "panel", style: { padding: 20, position: "relative", overflow: "hidden" } },
      React.createElement("div", { style: { position: "absolute", inset: 0, background: "radial-gradient(110% 100% at 100% 0%, rgba(232,181,74,0.14), transparent 55%)", pointerEvents: "none" } }),
      React.createElement("div", { className: "row", style: { marginBottom: 10 } }, React.createElement("span", { className: "tag gold" }, "Next Session"), React.createElement("div", { className: "spacer" }), session.confirmed && React.createElement("span", { className: "tag emerald", style: { fontSize: 10 } }, "Confirmed")),
      React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 700, fontSize: 17, color: "var(--ink)" } }, `Session ${session.num}`),
      React.createElement("div", { style: { fontSize: 14, color: "var(--gold-bright)", marginBottom: 14 } }, session.title),
      React.createElement("div", { className: "row", style: { gap: 14 } },
        [[d, "days"], [h, "hrs"], [m, "min"]].map(([v, l]) => React.createElement("div", { key: l, style: { textAlign: "center" } },
          React.createElement("div", { className: "mono", style: { fontSize: 26, fontWeight: 700, color: "var(--ink)", lineHeight: 1 } }, String(v).padStart(2, "0")),
          React.createElement("div", { className: "muted", style: { fontSize: 10, letterSpacing: "0.1em", marginTop: 4, textTransform: "uppercase" } }, l)))),
      React.createElement("button", { className: "btn sm", style: { width: "100%", justifyContent: "center", marginTop: 16 }, onClick: () => go("scheduler") }, "View schedule"));
  }

  function statCard(val, label, icon, color) {
    return React.createElement("div", { className: "panel", style: { padding: "16px 14px", textAlign: "center" } },
      React.createElement("div", { className: "center", style: { color, marginBottom: 6 } }, React.createElement(Icon, { name: icon, size: 20 })),
      React.createElement("div", { className: "mono", style: { fontSize: 26, fontWeight: 700, color: "var(--ink)", lineHeight: 1 } }, val),
      React.createElement("div", { className: "muted", style: { fontSize: 11.5, marginTop: 5, letterSpacing: "0.04em" } }, label));
  }
  function quickLink(icon, title, sub, onClick) {
    return React.createElement("button", { onClick, style: { display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", borderRadius: 10, cursor: "pointer", textAlign: "left", border: "1px solid var(--hair)", background: "var(--surface)", color: "var(--ink)" },
      onMouseEnter: (e) => { e.currentTarget.style.borderColor = "var(--panel-edge)"; e.currentTarget.style.background = "var(--surface-2)"; },
      onMouseLeave: (e) => { e.currentTarget.style.borderColor = "var(--hair)"; e.currentTarget.style.background = "var(--surface)"; } },
      React.createElement("div", { style: { color: "var(--gold)" } }, React.createElement(Icon, { name: icon, size: 19 })),
      React.createElement("div", { className: "col" }, React.createElement("span", { style: { fontSize: 13.5, fontWeight: 600 } }, title), React.createElement("span", { className: "muted", style: { fontSize: 11.5 } }, sub)));
  }

  function CampaignTimeline({ timeline, setTimeline, isDM }) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState(""), [sess, setSess] = useState(""), [date, setDate] = useState("");
    function add() {
      if (!text.trim()) return;
      setTimeline((t) => [{ id: "tl" + Date.now(), session: sess, date, text }, ...t]);
      setText(""); setSess(""); setDate("");
    }
    return React.createElement("div", { style: { maxWidth: 820, marginTop: 28 } },
      React.createElement("div", { className: "row", style: { marginBottom: 12, gap: 10 } },
        React.createElement("div", { className: "section-title", style: { margin: 0 } }, "📅 Campaign Timeline"),
        React.createElement("div", { className: "spacer" }),
        isDM && React.createElement("button", { className: "btn sm ghost", onClick: () => setOpen((x) => !x) }, open ? "▲ Hide add" : "▼ Add event")),
      open && isDM && React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" } },
        React.createElement("input", { className: "input", placeholder: "Ep/Session", value: sess, onChange: (e) => setSess(e.target.value), style: { width: 90 }, autoFocus: true }),
        React.createElement("input", { className: "input", placeholder: "Date", value: date, onChange: (e) => setDate(e.target.value), style: { width: 120 } }),
        React.createElement("input", { className: "input", placeholder: "What happened?", value: text, onChange: (e) => setText(e.target.value), style: { flex: 1, minWidth: 200 }, onKeyDown: (e) => e.key === "Enter" && add() }),
        React.createElement("button", { className: "btn primary sm", onClick: add }, "Add")),
      timeline.length === 0 && React.createElement("div", { className: "muted", style: { fontSize: 13, fontStyle: "italic" } }, "No events logged yet."),
      React.createElement("div", { style: { position: "relative", paddingLeft: 22 } },
        React.createElement("div", { style: { position: "absolute", left: 6, top: 6, bottom: 6, width: 2, background: "linear-gradient(var(--gold-deep), transparent)" } }),
        timeline.map((ev) => React.createElement("div", { key: ev.id, style: { position: "relative", marginBottom: 14, paddingLeft: 6 } },
          React.createElement("div", { style: { position: "absolute", left: -16, top: 4, width: 12, height: 12, borderRadius: "50%", background: "var(--gold)", border: "2px solid var(--bg)" } }),
          React.createElement("div", { className: "row", style: { gap: 8, marginBottom: 3 } },
            ev.session && React.createElement("span", { className: "tag gold", style: { fontSize: 10 } }, "Ep " + ev.session),
            ev.date && React.createElement("span", { className: "muted", style: { fontSize: 12 } }, ev.date),
            isDM && React.createElement("button", { onClick: () => setTimeline((t) => t.filter((x) => x.id !== ev.id)), style: { background: "none", border: "none", color: "var(--red-bright)", cursor: "pointer", fontSize: 12, marginLeft: "auto" } }, "✕")),
          React.createElement("div", { style: { fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5 } }, ev.text)))));
  }

  window.Dashboard = Dashboard;
})();
