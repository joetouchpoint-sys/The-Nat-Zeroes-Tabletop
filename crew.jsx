/* CREW & LORE — Party, NPCs, and Compendium merged into one tab */
(function () {
  const { useState, useContext } = React;
  const Icon = window.Icon;
  const { Avatar, HPBar, StatGrid, Modal, Token } = window.NZUI;

  function lsGet(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch(e) { return fb; } }
  function lsSave(k, val) { try { localStorage.setItem(k, JSON.stringify(val)); } catch(e) {} }

  const RELATIONSHIPS = [
    { id: "friendly", label: "Friendly", emoji: "🟢", color: "var(--emerald)" },
    { id: "neutral",  label: "Neutral",  emoji: "🟡", color: "var(--gold)" },
    { id: "hostile",  label: "Hostile",  emoji: "🔴", color: "var(--red-bright)" },
    { id: "unknown",  label: "Unknown",  emoji: "⬜", color: "var(--ink-dim)" },
  ];

  function CrewLore({ party, dm, loot, setLoot, npcs, setNpcs, bestiary }) {
    const ctx = useContext(window.NZAuth.RoleContext);
    const isDM = ctx.role === "dm";
    const canEditAll = isDM || ctx.role === "admin";
    const [section, setSection] = useState("party"); // party | npcs | compendium
    const [dndbLinks, setDndbLinks] = useState(() => lsGet("nz_dndblinks", {}));
    const [charDetail, setCharDetail] = useState(null);
    const [lootOpen, setLootOpen] = useState(false);
    const [addItemOpen, setAddItemOpen] = useState(false);
    const [npcEdit, setNpcEdit] = useState(null);
    const [beastDetail, setBeastDetail] = useState(null);
    const [bSearch, setBSearch] = useState("");
    const [bSide, setBSide] = useState("all");

    function saveLink(charId, url) {
      const next = { ...dndbLinks, [charId]: url };
      setDndbLinks(next); lsSave("nz_dndblinks", next);
    }
    function getLink(p) { return dndbLinks[p.id] || p.dndb || ""; }

    function addLootItem(item) { setLoot && setLoot((l) => ({ ...l, items: [...(l.items || []), { id: "li" + Date.now(), ...item }] })); setAddItemOpen(false); }
    function removeLootItem(id) { setLoot && setLoot((l) => ({ ...l, items: (l.items || []).filter((x) => x.id !== id) })); }
    function setGold(g) { setLoot && setLoot((l) => ({ ...l, gold: +g || 0 })); }

    function saveNpc(n) {
      if (n.id) { setNpcs((ns) => ns.map((x) => x.id === n.id ? n : x)); }
      else { setNpcs((ns) => ns.concat([Object.assign({}, n, { id: "npc" + Date.now() })])); }
      setNpcEdit(null);
    }
    function deleteNpc(id) { if (confirm("Remove NPC?")) setNpcs((ns) => ns.filter((n) => n.id !== id)); }

    const sections = [
      { id: "party", label: "The Party" },
      { id: "npcs", label: "NPCs" },
      { id: "compendium", label: "Compendium" },
    ];

    return React.createElement("div", { className: "view-pad", style: { maxWidth: 1200 } },
      // Section tabs
      React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 24, borderBottom: "1px solid var(--hair)", paddingBottom: 12 } },
        sections.map((s) => React.createElement("button", { key: s.id, onClick: () => setSection(s.id),
          style: { padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontFamily: "var(--display)", fontWeight: 600, fontSize: 13, letterSpacing: "0.06em",
            border: "1px solid " + (section === s.id ? "var(--gold-deep)" : "var(--hair)"),
            background: section === s.id ? "rgba(232,181,74,0.14)" : "transparent",
            color: section === s.id ? "var(--gold-bright)" : "var(--ink-dim)" } }, s.label))),

      // ===== PARTY =====
      section === "party" && React.createElement(React.Fragment, null,
        React.createElement("div", { className: "row", style: { marginBottom: 20, gap: 12 } },
          React.createElement("p", { className: "muted", style: { margin: 0, flex: 1 } }, "Click any card for full stats. Right-click tokens on the map to set conditions."),
          React.createElement("button", { className: "btn", onClick: () => setLootOpen((x) => !x) }, "💰 " + (lootOpen ? "Hide Loot" : "Show Loot"))),
        lootOpen && loot && React.createElement(LootPanel, { loot, setGold, addItem: () => setAddItemOpen(true), removeItem: removeLootItem, canEdit: canEditAll, party,
          addItemOpen, setAddItemOpen, onAddItem: addLootItem }),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 } },
          party.map((p) => React.createElement(CharCard, { key: p.id, p, dndbUrl: getLink(p), onOpen: () => setCharDetail(p),
            canEditLink: canEditAll || (ctx.user && ctx.user.name === p.player), onSaveLink: (url) => saveLink(p.id, url) }))),
        React.createElement("div", { className: "section-title", style: { marginTop: 28 } }, "Dungeon Master"),
        React.createElement("div", { className: "panel", style: { padding: 18, display: "flex", alignItems: "center", gap: 16, maxWidth: 520 } },
          React.createElement(Avatar, { name: dm.name, ring: dm.ring, size: 52, glow: true }),
          React.createElement("div", { className: "col", style: { flex: 1 } },
            React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 600, fontSize: 16 } }, dm.name),
            React.createElement("div", { className: "muted", style: { fontSize: 13 } }, "Dungeon Master · Keeper of the chaos")),
          React.createElement("span", { className: "tag gold" }, "DM")),
        React.createElement(CharDetail, { p: charDetail, dndbUrl: charDetail ? getLink(charDetail) : "", onClose: () => setCharDetail(null) })),

      // ===== NPCs =====
      section === "npcs" && React.createElement(React.Fragment, null,
        React.createElement("div", { className: "row", style: { marginBottom: 20, gap: 12 } },
          React.createElement("p", { className: "muted", style: { margin: 0, flex: 1 } }, "Named characters the party has encountered."),
          canEditAll && React.createElement("button", { className: "btn primary", onClick: () => setNpcEdit(false) }, React.createElement(Icon, { name: "plus", size: 16 }), "Add NPC")),
        (npcs || []).length === 0 && React.createElement("div", { className: "muted", style: { textAlign: "center", padding: "40px 20px", fontStyle: "italic" } }, "No NPCs yet."),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 } },
          (npcs || []).map((n) => {
            const rel = RELATIONSHIPS.find((r) => r.id === n.relationship) || RELATIONSHIPS[1];
            return React.createElement("div", { key: n.id, className: "panel", style: { padding: 16, borderLeft: "4px solid " + rel.color, position: "relative" } },
              canEditAll && React.createElement("div", { style: { position: "absolute", top: 10, right: 10, display: "flex", gap: 4 } },
                React.createElement("button", { onClick: () => setNpcEdit(n), style: { background: "none", border: "none", color: "var(--ink-dim)", cursor: "pointer", fontSize: 14 } }, "✏️"),
                React.createElement("button", { onClick: () => deleteNpc(n.id), style: { background: "none", border: "none", color: "var(--red-bright)", cursor: "pointer", fontSize: 14 } }, "🗑️")),
              React.createElement("div", { style: { display: "flex", gap: 10, marginBottom: 8 } },
                React.createElement("span", { style: { fontSize: 18 } }, rel.emoji),
                React.createElement("div", null,
                  React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 700, fontSize: 15 } }, n.name),
                  React.createElement("div", { style: { fontSize: 11, color: rel.color, fontWeight: 600 } }, rel.label))),
              n.location && React.createElement("div", { style: { fontSize: 12, color: "var(--ink-dim)", marginBottom: 6 } }, "📍 " + n.location),
              n.note && React.createElement("p", { style: { margin: 0, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 } }, n.note));
          })),
        npcEdit !== null && React.createElement(NpcModal, { open: true, initial: npcEdit || null, onClose: () => setNpcEdit(null), onSave: saveNpc })),

      // ===== COMPENDIUM =====
      section === "compendium" && React.createElement(React.Fragment, null,
        React.createElement("div", { className: "row", style: { marginBottom: 16, gap: 10 } },
          React.createElement("input", { className: "input", placeholder: "Search creatures…", value: bSearch, onChange: (e) => setBSearch(e.target.value), style: { flex: "1 1 200px", maxWidth: 260 } }),
          React.createElement("div", { className: "row", style: { gap: 6 } },
            [["all","All"], ["enemy","Enemies"], ["ally","Allies"]].map(([k, l]) =>
              React.createElement("button", { key: k, className: "btn sm" + (bSide === k ? " primary" : " ghost"), onClick: () => setBSide(k) }, l)))),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 } },
          bestiary.filter((e) => {
            const matchSide = bSide === "all" || (bSide === "ally" ? e.side === "ally" : (e.side || "enemy") === "enemy");
            const matchSearch = !bSearch || e.name.toLowerCase().includes(bSearch.toLowerCase());
            return matchSide && matchSearch;
          }).map((e) => React.createElement("div", { key: e.id, className: "panel", style: { overflow: "hidden", cursor: "pointer" }, onClick: () => setBeastDetail(e) },
            React.createElement("div", { style: { padding: "14px 16px 10px", borderBottom: "1px solid var(--hair)", display: "flex", alignItems: "center", gap: 10 } },
              React.createElement(Token, { name: e.name, ring: e.ring, size: 36 }),
              React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 600, fontSize: 15 } }, e.name),
                React.createElement("div", { className: "muted", style: { fontSize: 11.5 } }, e.type + " · CR " + e.cr))),
            React.createElement("div", { style: { display: "flex", gap: 6, padding: "8px 16px", flexWrap: "wrap" } },
              [["HP", e.hp], ["AC", e.ac], ["Spd", e.speed]].map(([l, v]) => React.createElement("span", { key: l, className: "tag", style: { fontSize: 10 } }, l + " " + v)))))),
        beastDetail && React.createElement(BeastModal, { e: beastDetail, onClose: () => setBeastDetail(null) })));
  }

  function CharCard({ p, dndbUrl, onOpen, canEditLink, onSaveLink }) {
    const [editingLink, setEditingLink] = useState(false);
    const [linkVal, setLinkVal] = useState(dndbUrl);
    return React.createElement("div", { className: "panel", style: { overflow: "hidden", display: "flex", flexDirection: "column" } },
      React.createElement("div", { style: { padding: "16px 16px 12px", display: "flex", gap: 14, alignItems: "center" } },
        React.createElement(Avatar, { name: p.name, ring: p.ring, size: 56, glow: true }),
        React.createElement("div", { className: "col", style: { flex: 1, minWidth: 0 } },
          React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 600, fontSize: 16 } }, p.name),
          React.createElement("div", { className: "muted", style: { fontSize: 12, marginTop: 2 } }, p.race + " " + p.cls + " · " + p.subclass),
          React.createElement("div", { className: "row", style: { gap: 6, marginTop: 6 } },
            React.createElement("span", { className: "tag gold", style: { fontSize: 10 } }, "Lv " + p.level),
            React.createElement("span", { className: "tag", style: { fontSize: 10 } }, p.player)))),
      React.createElement("div", { style: { padding: "0 16px" } }, React.createElement(HPBar, { hp: p.hp, max: p.hpMax })),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, padding: "10px 16px" } },
        [["AC", p.ac, "shield"], ["Init", (p.init >= 0 ? "+" : "") + p.init, "swords"], ["Spd", p.speed, "move"], ["PP", p.passive, "eye"]].map(([l, v, ic]) =>
          React.createElement("div", { key: l, style: { background: "var(--bg)", border: "1px solid var(--hair)", borderRadius: 8, padding: "6px 4px", textAlign: "center" } },
            React.createElement("div", { style: { color: "var(--gold)", fontSize: 9, fontFamily: "var(--display)" } }, l),
            React.createElement("div", { className: "mono", style: { fontSize: 14, fontWeight: 700 } }, v)))),
      React.createElement("p", { style: { margin: "0 16px 12px", fontSize: 12, fontStyle: "italic", color: "var(--ink-dim)", lineHeight: 1.5 } }, '"' + p.blurb + '"'),
      editingLink
        ? React.createElement("div", { style: { padding: "0 16px 12px", display: "flex", gap: 6 } },
            React.createElement("input", { className: "input", value: linkVal, onChange: (e) => setLinkVal(e.target.value), placeholder: "D&D Beyond URL…", style: { flex: 1, fontSize: 12 }, autoFocus: true }),
            React.createElement("button", { className: "btn primary sm", onClick: () => { onSaveLink(linkVal); setEditingLink(false); } }, "Save"),
            React.createElement("button", { className: "btn ghost sm", onClick: () => setEditingLink(false) }, "✕"))
        : React.createElement("div", { className: "row", style: { gap: 8, padding: "0 16px 14px", marginTop: "auto" } },
            React.createElement("button", { className: "btn ghost grow", onClick: onOpen }, React.createElement(Icon, { name: "user", size: 15 }), "Stats"),
            dndbUrl && React.createElement("a", { className: "btn primary grow", href: dndbUrl, target: "_blank", rel: "noopener", style: { textDecoration: "none" } }, React.createElement(Icon, { name: "link", size: 15 }), "Sheet"),
            canEditLink && React.createElement("button", { className: "btn ghost", onClick: () => { setLinkVal(dndbUrl); setEditingLink(true); } }, React.createElement(Icon, { name: "settings", size: 14 })))
    );
  }

  function CharDetail({ p, dndbUrl, onClose }) {
    if (!p) return null;
    return React.createElement(Modal, { open: !!p, onClose, title: p.name, sub: p.race + " " + p.cls + " · Level " + p.level, w: 540 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 16 } },
        React.createElement("div", { className: "row", style: { gap: 16 } },
          React.createElement(Avatar, { name: p.name, ring: p.ring, size: 64, glow: true }),
          React.createElement("div", { style: { flex: 1 } }, React.createElement(HPBar, { hp: p.hp, max: p.hpMax, height: 10 }))),
        React.createElement(StatGrid, { stats: p.stats }),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 } },
          [["AC", p.ac, "shield"], ["Init", (p.init >= 0 ? "+" : "") + p.init, "swords"], ["Speed", p.speed + "ft", "move"], ["Passive", p.passive, "eye"]].map(([l, v]) =>
            React.createElement("div", { key: l, style: { background: "var(--bg)", border: "1px solid var(--hair)", borderRadius: 8, padding: "8px 4px", textAlign: "center" } },
              React.createElement("div", { style: { color: "var(--gold)", fontFamily: "var(--display)", fontSize: 9 } }, l),
              React.createElement("div", { className: "mono", style: { fontSize: 15, fontWeight: 700 } }, v)))),
        React.createElement("p", { style: { margin: 0, fontStyle: "italic", color: "var(--ink-soft)", lineHeight: 1.5 } }, '"' + p.blurb + '"'),
        dndbUrl && React.createElement("a", { className: "btn primary", href: dndbUrl, target: "_blank", rel: "noopener", style: { justifyContent: "center", textDecoration: "none" } },
          React.createElement(Icon, { name: "link", size: 16 }), "Open sheet on D&D Beyond")));
  }

  function BeastModal({ e, onClose }) {
    const [hp, setHp] = useState(e?.hp || 0);
    React.useEffect(() => { if (e) setHp(e.hp); }, [e]);
    if (!e) return null;
    return React.createElement(Modal, { open: !!e, onClose, title: e.name, sub: e.type + " · CR " + e.cr + " · " + e.size, w: 520 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 } },
          [["HP", e.hp], ["AC", e.ac], ["Speed", e.speed]].map(([l, v]) =>
            React.createElement("div", { key: l, style: { background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 8, padding: "8px 6px", textAlign: "center" } },
              React.createElement("div", { style: { color: "var(--gold)", fontSize: 10, fontFamily: "var(--display)" } }, l),
              React.createElement("div", { className: "mono", style: { fontSize: 16, fontWeight: 700 } }, v)))),
        e.stats && React.createElement(StatGrid, { stats: e.stats }),
        React.createElement("p", { style: { margin: 0, fontStyle: "italic", color: "var(--ink-dim)", lineHeight: 1.5 } }, '"' + e.blurb + '"'),
        e.actions && e.actions.length > 0 && React.createElement("div", null,
          React.createElement("div", { className: "section-title" }, "Actions"),
          e.actions.map((a, i) => React.createElement("div", { key: i, style: { padding: "6px 0", borderBottom: "1px solid var(--hair)", fontSize: 13.5, color: "var(--ink-soft)" } }, a))),
        React.createElement("div", { className: "row", style: { gap: 10, justifyContent: "flex-end" } },
          React.createElement("button", { className: "btn primary", onClick: () => { window.dispatchEvent(new CustomEvent("nz:addtoken", { detail: e })); onClose(); } },
            React.createElement(Icon, { name: "plus", size: 15 }), "Add to map"))));
  }

  function NpcModal(props) {
    var open = props.open, initial = props.initial, onClose = props.onClose, onSave = props.onSave;
    var nameS = useState(initial ? initial.name : ""); var name = nameS[0], setName = nameS[1];
    var relS = useState(initial ? initial.relationship : "neutral"); var rel = relS[0], setRel = relS[1];
    var locS = useState(initial ? initial.location : ""); var loc = locS[0], setLoc = locS[1];
    var noteS = useState(initial ? initial.note : ""); var note = noteS[0], setNote = noteS[1];
    React.useEffect(function() { if (open) { setName(initial ? initial.name : ""); setRel(initial ? initial.relationship : "neutral"); setLoc(initial ? initial.location : ""); setNote(initial ? initial.note : ""); } }, [open]);
    return React.createElement(Modal, { open: open, onClose: onClose, title: (initial && initial.id) ? "Edit NPC" : "Add NPC", w: 440 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 12 } },
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Name"), React.createElement("input", { className: "input", value: name, onChange: function(e) { setName(e.target.value); }, autoFocus: true })),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Relationship"),
          React.createElement("div", { style: { display: "flex", gap: 6 } },
            RELATIONSHIPS.map(function(r) { return React.createElement("button", { key: r.id, onClick: function() { setRel(r.id); },
              style: { flex: 1, padding: "6px 4px", borderRadius: 7, cursor: "pointer", fontSize: 12, border: "1px solid " + (rel === r.id ? r.color : "var(--hair)"), background: rel === r.id ? r.color + "22" : "var(--surface-2)", color: rel === r.id ? r.color : "var(--ink-dim)" } },
              r.emoji + " " + r.label); }))),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Location"), React.createElement("input", { className: "input", value: loc, onChange: function(e) { setLoc(e.target.value); } })),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Notes"), React.createElement("textarea", { className: "input", rows: 2, value: note, onChange: function(e) { setNote(e.target.value); }, style: { resize: "vertical" } })),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary", disabled: !name, onClick: function() { onSave(Object.assign({}, initial, { name: name, relationship: rel, location: loc, note: note })); } }, "Save"))));
  }

  function LootPanel({ loot, setGold, addItem, removeItem, canEdit, party, addItemOpen, setAddItemOpen, onAddItem }) {
    const [newItem, setNewItem] = useState({ name: "", qty: 1, holder: "" });
    const players = party ? party.map((p) => p.player) : [];
    return React.createElement("div", { className: "panel", style: { marginBottom: 20, padding: 16 } },
      React.createElement("div", { className: "panel-h", style: { marginBottom: 12 } },
        React.createElement("h3", null, "💰 Party Treasury"),
        React.createElement("div", { className: "spacer" }),
        canEdit && React.createElement("button", { className: "btn sm primary", onClick: addItem }, React.createElement(Icon, { name: "plus", size: 14 }), "Add item")),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 } },
        React.createElement("span", { style: { fontFamily: "var(--display)", fontSize: 14, color: "var(--gold)" } }, "Gold"),
        canEdit
          ? React.createElement("input", { type: "number", value: loot.gold || 0, onChange: (e) => setGold(e.target.value), style: { width: 90, background: "var(--surface-2)", border: "1px solid var(--hair)", borderRadius: 8, color: "var(--ink)", padding: "3px 8px", fontSize: 14 } })
          : React.createElement("span", { className: "mono", style: { fontSize: 18, fontWeight: 700, color: "var(--gold)" } }, (loot.gold || 0).toLocaleString()),
        React.createElement("span", { className: "muted", style: { fontSize: 12 } }, "gp")),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
        (loot.items || []).map((item) => React.createElement("div", { key: item.id, style: { display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", borderRadius: 7, padding: "7px 12px" } },
          React.createElement("div", { style: { flex: 1, fontWeight: 600, fontSize: 13.5 } }, item.name),
          item.qty > 1 && React.createElement("span", { className: "tag", style: { fontSize: 10 } }, "×" + item.qty),
          item.holder && React.createElement("span", { className: "tag gold", style: { fontSize: 10 } }, item.holder),
          canEdit && React.createElement("button", { onClick: () => removeItem(item.id), style: { background: "none", border: "none", color: "var(--red-bright)", cursor: "pointer", fontSize: 15, padding: 0 } }, "×")))),
      addItemOpen && React.createElement("div", { style: { marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" } },
        React.createElement("input", { className: "input", placeholder: "Item name", value: newItem.name, onChange: (e) => setNewItem((x) => ({ ...x, name: e.target.value })), style: { flex: "1 1 140px" }, autoFocus: true }),
        React.createElement("input", { className: "input", type: "number", placeholder: "Qty", value: newItem.qty, onChange: (e) => setNewItem((x) => ({ ...x, qty: +e.target.value || 1 })), style: { width: 56 } }),
        React.createElement("select", { className: "input", value: newItem.holder, onChange: (e) => setNewItem((x) => ({ ...x, holder: e.target.value })), style: { flex: "0 0 auto" } },
          React.createElement("option", { value: "" }, "Who has it?"),
          ["Party"].concat(players).map((n) => React.createElement("option", { key: n, value: n }, n))),
        React.createElement("button", { className: "btn primary sm", onClick: () => { if (newItem.name) { onAddItem(newItem); setNewItem({ name: "", qty: 1, holder: "" }); } } }, "Add"),
        React.createElement("button", { className: "btn ghost sm", onClick: () => setAddItemOpen(false) }, "Cancel")));
  }

  window.CrewLore = CrewLore;
})();
