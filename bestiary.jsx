/* BESTIARY — custom enemies, stat blocks, create form */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const { Token, StatGrid, Modal } = window.NZUI;

  function Bestiary({ bestiary }) {
    const [list, setList] = useState(bestiary);
    const [side, setSide] = useState("enemy");
    const [filter, setFilter] = useState("all");
    const [q, setQ] = useState("");
    const [detail, setDetail] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);

    const sideList = list.filter((e) => (e.side || "enemy") === side);
    const shown = sideList.filter((e) =>
      (filter === "all" || (filter === "custom" && e.custom) || (filter === "srd" && !e.custom)) &&
      e.name.toLowerCase().includes(q.toLowerCase()));
    const isAlly = side === "ally";

    return React.createElement("div", { className: "view-pad" },
      // header bar
      React.createElement("div", { className: "row", style: { marginBottom: 18, gap: 12, flexWrap: "wrap" } },
        React.createElement("div", { className: "col", style: { flex: 1, minWidth: 200 } },
          React.createElement("p", { className: "muted", style: { margin: 0, maxWidth: 560 } }, isAlly
            ? "Friendly faces, hired swords and questionable mushroom-witches. Drop them on the table to fight alongside the party."
            : "Your homebrew horrors and the usual suspects. Click any creature for its stat block \u2014 or send it straight to the table.")),
        React.createElement("div", { style: { position: "relative" } },
          React.createElement(Icon, { name: "search", size: 17, style: { position: "absolute", left: 11, top: 11, color: "var(--ink-dim)" } }),
          React.createElement("input", { className: "input", style: { width: 220, paddingLeft: 36 }, placeholder: "Search\u2026", value: q, onChange: (e) => setQ(e.target.value) })),
        React.createElement("button", { className: "btn primary", onClick: () => setCreateOpen(true) }, React.createElement(Icon, { name: "plus", size: 17 }), isAlly ? "Create ally" : "Create enemy")),
      // side switch
      React.createElement("div", { className: "row", style: { gap: 8, marginBottom: 16 } },
        React.createElement("button", { onClick: () => { setSide("enemy"); setFilter("all"); }, style: sideTab(side === "enemy", "var(--red)") }, React.createElement(Icon, { name: "skull", size: 16 }), "Enemies", React.createElement("span", { className: "mono", style: { opacity: 0.6 } }, list.filter((e) => (e.side || "enemy") === "enemy").length)),
        React.createElement("button", { onClick: () => { setSide("ally"); setFilter("all"); }, style: sideTab(side === "ally", "var(--emerald)") }, React.createElement(Icon, { name: "shield", size: 16 }), "Allies", React.createElement("span", { className: "mono", style: { opacity: 0.6 } }, list.filter((e) => e.side === "ally").length))),
      // filters
      React.createElement("div", { className: "row", style: { gap: 8, marginBottom: 18 } },
        [["all", "All", sideList.length], ["custom", "Homebrew", sideList.filter((e) => e.custom).length], ["srd", "Standard", sideList.filter((e) => !e.custom).length]].map(([k, l, n]) =>
          React.createElement("button", { key: k, onClick: () => setFilter(k), style: pill(filter === k) }, l, React.createElement("span", { className: "mono", style: { marginLeft: 7, opacity: 0.6 } }, n)))),
      // grid
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 } },
        shown.map((e) => React.createElement(EnemyCard, { key: e.id, e, onOpen: () => setDetail(e) }))),
      shown.length === 0 && React.createElement("div", { className: "muted", style: { textAlign: "center", padding: 60 } }, "Nothing here yet. " + (isAlly ? "Recruit someone!" : "Even the monsters are hiding.")),
      // detail + create
      React.createElement(EnemyDetail, { e: detail, onClose: () => setDetail(null) }),
      React.createElement(CreateEnemy, { open: createOpen, side, onClose: () => setCreateOpen(false), onCreate: (e) => { setList((l) => [e, ...l]); setCreateOpen(false); setDetail(e); } })
    );
  }

  function EnemyCard({ e, onOpen }) {
    return React.createElement("div", { className: "panel", onClick: onOpen, style: { cursor: "pointer", overflow: "hidden", transition: "transform .15s, border-color .15s" },
      onMouseEnter: (ev) => { ev.currentTarget.style.transform = "translateY(-3px)"; ev.currentTarget.style.borderColor = "var(--panel-edge)"; },
      onMouseLeave: (ev) => { ev.currentTarget.style.transform = "none"; ev.currentTarget.style.borderColor = "var(--hair)"; } },
      // banner
      React.createElement("div", { style: { height: 76, position: "relative", background: `radial-gradient(120% 140% at 80% -10%, ${e.color}44, transparent 60%), linear-gradient(180deg, var(--surface-2), var(--bg-2))`, borderBottom: "1px solid var(--hair)", display: "flex", alignItems: "center", gap: 12, padding: "0 16px" } },
        React.createElement(Token, { name: e.name, ring: e.ring, size: 48, bloodied: false }),
        React.createElement("div", { className: "col", style: { minWidth: 0 } },
          React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 600, fontSize: 15.5, lineHeight: 1.15, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis" } }, e.name),
          React.createElement("div", { className: "muted", style: { fontSize: 12, marginTop: 2 } }, `${e.size} ${e.type}`)),
        e.custom && React.createElement("span", { className: "tag gold", style: { position: "absolute", top: 12, right: 12, fontSize: 10 } }, "Homebrew")),
      React.createElement("div", { style: { padding: 16 } },
        React.createElement("div", { className: "row", style: { gap: 7, marginBottom: 12, flexWrap: "wrap" } },
          React.createElement("span", { className: "tag red" }, "CR " + e.cr),
          React.createElement("span", { className: "tag" }, React.createElement(Icon, { name: "heart", size: 12 }), e.hpMax + " HP"),
          React.createElement("span", { className: "tag" }, React.createElement(Icon, { name: "shield", size: 12 }), "AC " + e.ac)),
        React.createElement("p", { style: { margin: 0, fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5, minHeight: 40 } }, e.blurb),
        React.createElement("div", { className: "row", style: { gap: 6, marginTop: 12, flexWrap: "wrap" } },
          e.tags.map((t) => React.createElement("span", { key: t, style: { fontSize: 11, color: "var(--ink-dim)", fontFamily: "var(--mono)" } }, "#" + t.toLowerCase().replace(/\s/g, "")))))
    );
  }

  function EnemyDetail({ e, onClose }) {
    const [hp, setHp] = useState(e?.hp || 0);
    React.useEffect(() => { if (e) setHp(e.hp); }, [e]);
    if (!e) return null;
    return React.createElement(Modal, { open: !!e, onClose, title: e.name, sub: `${e.size} ${e.type} \u00b7 CR ${e.cr}`, w: 560 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 18 } },
        React.createElement("div", { className: "row", style: { gap: 14 } },
          React.createElement(Token, { name: e.name, ring: e.ring, size: 64 }),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, flex: 1 } },
            stat("HP", e.hpMax, "heart"), stat("AC", e.ac, "shield"), stat("Speed", e.speed + "ft", "move"))),
        React.createElement(StatGrid, { stats: e.stats }),
        React.createElement("div", null,
          React.createElement("div", { className: "section-title", style: { marginBottom: 10 } }, "Actions"),
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 7 } },
            e.actions.map((a) => React.createElement("div", { key: a, className: "row", style: { gap: 9, fontSize: 14, color: "var(--ink-soft)" } },
              React.createElement(Icon, { name: "swords", size: 14, style: { color: "var(--red)" } }), a)))),
        React.createElement("p", { style: { margin: 0, fontStyle: "italic", color: "var(--ink-dim)", fontSize: 13.5, lineHeight: 1.5 } }, "\u201c" + e.blurb + "\u201d"),
        React.createElement("div", { className: "row", style: { gap: 10, justifyContent: "flex-end" } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Close"),
          React.createElement("button", { className: "btn primary", onClick: () => { window.dispatchEvent(new CustomEvent("nz:addtoken", { detail: e })); onClose(); } }, React.createElement(Icon, { name: "plus", size: 16 }), "Add to map")))
    );
  }

  function stat(label, val, icon) {
    return React.createElement("div", { style: { background: "var(--bg)", border: "1px solid var(--hair)", borderRadius: 10, padding: "10px 12px", textAlign: "center" } },
      React.createElement("div", { className: "row", style: { justifyContent: "center", gap: 5, color: "var(--gold)", marginBottom: 3 } },
        React.createElement(Icon, { name: icon, size: 14 }),
        React.createElement("span", { style: { fontFamily: "var(--display)", fontSize: 10, letterSpacing: "0.1em" } }, label)),
      React.createElement("div", { className: "mono", style: { fontSize: 18, fontWeight: 700 } }, val));
  }

  function CreateEnemy({ open, side, onClose, onCreate }) {
    const isAlly = side === "ally";
    const blank = { name: "", type: isAlly ? "Humanoid" : "Monstrosity", size: "Medium", cr: "1", hpMax: 20, ac: 12, speed: 30, blurb: "", color: isAlly ? "#4fb98a" : "#e8412e" };
    const [f, setF] = useState(blank);
    React.useEffect(() => { if (open) setF(blank); }, [open]);
    const colors = ["#e8412e", "#e8b54a", "#9170f0", "#4fb98a", "#4ea7e8", "#cabfa8"];
    function up(k, v) { setF((s) => ({ ...s, [k]: v })); }
    function submit() {
      onCreate({ id: (isAlly ? "a" : "e") + Date.now(), custom: true, side, init: 0, hp: +f.hpMax, ring: f.color, tags: [isAlly ? "Ally" : "Homebrew"],
        stats: { STR: 12, DEX: 12, CON: 12, INT: 10, WIS: 10, CHA: 10 }, actions: ["Attack"], ...f, hpMax: +f.hpMax, ac: +f.ac, speed: +f.speed });
    }
    return React.createElement(Modal, { open, onClose, title: isAlly ? "Create a Custom Ally" : "Create a Custom Enemy", sub: isAlly ? "Recruit a friendly NPC. They'll be ready to fight alongside the party." : "Homebrew your own horror. It'll be ready to drop on the table.", w: 560 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 16 } },
        React.createElement("div", { className: "row", style: { gap: 14 } },
          React.createElement(Token, { name: f.name || "??", ring: f.color, size: 56 }),
          React.createElement("div", { className: "field", style: { flex: 1 } }, React.createElement("label", null, "Creature name"),
            React.createElement("input", { className: "input", autoFocus: true, value: f.name, onChange: (e) => up("name", e.target.value), placeholder: "e.g. Gloomfang, the Tax Collector" }))),
        React.createElement("div", { className: "row", style: { gap: 12 } },
          field("Size", React.createElement("select", { className: "select", value: f.size, onChange: (e) => up("size", e.target.value) }, ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"].map((s) => React.createElement("option", { key: s }, s)))),
          field("Type", React.createElement("input", { className: "input", value: f.type, onChange: (e) => up("type", e.target.value) })),
          field("CR", React.createElement("input", { className: "input", value: f.cr, onChange: (e) => up("cr", e.target.value) }))),
        React.createElement("div", { className: "row", style: { gap: 12 } },
          field("Max HP", React.createElement("input", { className: "input", type: "number", value: f.hpMax, onChange: (e) => up("hpMax", e.target.value) })),
          field("AC", React.createElement("input", { className: "input", type: "number", value: f.ac, onChange: (e) => up("ac", e.target.value) })),
          field("Speed (ft)", React.createElement("input", { className: "input", type: "number", value: f.speed, onChange: (e) => up("speed", e.target.value) }))),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Token colour"),
          React.createElement("div", { className: "row", style: { gap: 8 } }, colors.map((c) => React.createElement("button", { key: c, onClick: () => up("color", c), style: { width: 34, height: 34, borderRadius: 8, background: c, cursor: "pointer", border: f.color === c ? "2px solid var(--ink)" : "2px solid transparent", boxShadow: f.color === c ? `0 0 12px ${c}` : "none" } })))),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Description / flavour"),
          React.createElement("textarea", { className: "input", rows: 2, value: f.blurb, onChange: (e) => up("blurb", e.target.value), placeholder: "What makes this creature memorable (or annoying)?" })),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary", disabled: !f.name, onClick: submit }, React.createElement(Icon, { name: "save", size: 16 }), "Save to bestiary")))
    );
  }

  function field(label, control) {
    return React.createElement("div", { className: "field", style: { flex: 1 } }, React.createElement("label", null, label), control);
  }
  function pill(active) {
    return { display: "inline-flex", alignItems: "center", padding: "8px 15px", borderRadius: 100, cursor: "pointer", fontSize: 13.5, fontWeight: 600,
      border: `1px solid ${active ? "var(--gold-deep)" : "var(--hair)"}`, background: active ? "rgba(232,181,74,0.14)" : "var(--surface)", color: active ? "var(--gold-bright)" : "var(--ink-soft)" };
  }
  function sideTab(active, color) {
    return { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontSize: 15, fontWeight: 700, fontFamily: "var(--display)", letterSpacing: "0.02em",
      border: `1px solid ${active ? color : "var(--hair)"}`, background: active ? color + "1c" : "var(--surface)", color: active ? color : "var(--ink-dim)" };
  }

  window.Bestiary = Bestiary;
})();
