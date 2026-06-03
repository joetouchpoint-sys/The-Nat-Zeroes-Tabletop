/* PARTY — character roster, D&D Beyond links, loot tracker */
(function () {
  const { useState, useContext } = React;
  const Icon = window.Icon;
  const { Avatar, HPBar, StatGrid, Modal } = window.NZUI;

  function lsGet(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch(e) { return fb; } }
  function lsSave(k, val) { try { localStorage.setItem(k, JSON.stringify(val)); } catch(e) {} }

  function Party({ party, dm, loot, setLoot }) {
    const ctx = useContext(window.NZAuth.RoleContext);
    const isDM = ctx.role === "dm";
    const isAdmin = ctx.role === "admin";
    const canEditAll = isDM || isAdmin;
    const [detail, setDetail] = useState(null);
    const [dndbLinks, setDndbLinks] = useState(() => lsGet("nz_dndblinks", {}));
    const [lootOpen, setLootOpen] = useState(false);
    const [addItemOpen, setAddItemOpen] = useState(false);

    function saveLink(charId, url) {
      const next = { ...dndbLinks, [charId]: url };
      setDndbLinks(next); lsSave("nz_dndblinks", next);
    }
    function getLink(p) { return dndbLinks[p.id] || p.dndb || ""; }

    function addLootItem(item) {
      setLoot && setLoot((l) => ({ ...l, items: [...(l.items || []), { id: "li" + Date.now(), ...item }] }));
      setAddItemOpen(false);
    }
    function removeLootItem(id) { setLoot && setLoot((l) => ({ ...l, items: (l.items || []).filter((x) => x.id !== id) })); }
    function setGold(g) { setLoot && setLoot((l) => ({ ...l, gold: +g || 0 })); }

    return React.createElement("div", { className: "view-pad" },
      React.createElement("div", { className: "row", style: { marginBottom: 22, gap: 12, flexWrap: "wrap", alignItems: "flex-start" } },
        React.createElement("p", { className: "muted", style: { margin: 0, maxWidth: 540, flex: 1 } },
          "The heroes of the realm. Right-click tokens on the map to set conditions. Click a card for full stats."),
        React.createElement("button", { className: "btn", onClick: () => setLootOpen((x) => !x) },
          React.createElement(Icon, { name: "sparkle", size: 16 }), "💰 Loot & Treasure")),

      // Loot panel (collapsible)
      lootOpen && loot && React.createElement(LootPanel, { loot, setGold, addItem: () => setAddItemOpen(true), removeItem: removeLootItem, canEdit: canEditAll, party,
        addItemOpen, setAddItemOpen, onAddItem: addLootItem }),

      React.createElement("div", { className: "section-title" }, "The Party · Level 7"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 16 } },
        party.map((p) => React.createElement(CharCard, { key: p.id, p, dndbUrl: getLink(p), onOpen: () => setDetail(p),
          canEditLink: canEditAll || ctx.user?.name === p.player,
          onSaveLink: (url) => saveLink(p.id, url) }))),

      React.createElement("div", { className: "section-title", style: { marginTop: 30 } }, "Behind the Screen"),
      React.createElement("div", { className: "panel", style: { padding: 18, display: "flex", alignItems: "center", gap: 16, maxWidth: 520 } },
        React.createElement(Avatar, { name: dm.name, ring: dm.ring, size: 52, glow: true }),
        React.createElement("div", { className: "col", style: { flex: 1 } },
          React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 600, fontSize: 16 } }, dm.name),
          React.createElement("div", { className: "muted", style: { fontSize: 13 } }, "Dungeon Master · Keeper of the chaos")),
        React.createElement("span", { className: "tag gold" }, "DM")),

      React.createElement(CharDetail, { p: detail, dndbUrl: detail ? getLink(detail) : "", onClose: () => setDetail(null) })
    );
  }

  function CharCard({ p, dndbUrl, onOpen, canEditLink, onSaveLink }) {
    const [editingLink, setEditingLink] = useState(false);
    const [linkVal, setLinkVal] = useState(dndbUrl);
    return React.createElement("div", { className: "panel", style: { overflow: "hidden", display: "flex", flexDirection: "column" } },
      React.createElement("div", { style: { padding: "18px 18px 14px", display: "flex", gap: 14, alignItems: "center" } },
        React.createElement(Avatar, { name: p.name, ring: p.ring, size: 60, glow: true }),
        React.createElement("div", { className: "col", style: { flex: 1, minWidth: 0 } },
          React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 600, fontSize: 17, color: "var(--ink)", lineHeight: 1.15 } }, p.name),
          React.createElement("div", { className: "muted", style: { fontSize: 13, marginTop: 3 } }, p.race + " " + p.cls + " · " + p.subclass),
          React.createElement("div", { className: "row", style: { gap: 6, marginTop: 7 } },
            React.createElement("span", { className: "tag gold", style: { fontSize: 10 } }, "Lv " + p.level),
            React.createElement("span", { className: "tag", style: { fontSize: 10 } }, "Played by " + p.player)))),
      React.createElement("div", { style: { padding: "0 18px" } }, React.createElement(HPBar, { hp: p.hp, max: p.hpMax })),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, padding: 18 } },
        mini("AC", p.ac, "shield"), mini("Init", (p.init >= 0 ? "+" : "") + p.init, "swords"), mini("Speed", p.speed, "move"), mini("Pass", p.passive, "eye")),
      React.createElement("p", { style: { margin: "0 18px 16px", fontSize: 13, fontStyle: "italic", color: "var(--ink-dim)", lineHeight: 1.5 } }, ““” + p.blurb + “””),
      // D&D Beyond link row
      editingLink
        ? React.createElement("div", { style: { padding: "0 18px 14px", display: "flex", gap: 6 } },
            React.createElement("input", { className: "input", value: linkVal, onChange: (e) => setLinkVal(e.target.value),
              placeholder: "https://www.dndbeyond.com/characters/...", style: { flex: 1, fontSize: 12 }, autoFocus: true }),
            React.createElement("button", { className: "btn primary sm", onClick: () => { onSaveLink(linkVal); setEditingLink(false); } }, "Save"),
            React.createElement("button", { className: "btn ghost sm", onClick: () => setEditingLink(false) }, "✕"))
        : React.createElement("div", { className: "row", style: { gap: 9, padding: "0 18px 18px", marginTop: "auto" } },
            React.createElement("button", { className: "btn ghost grow", onClick: onOpen }, React.createElement(Icon, { name: "user", size: 16 }), "Details"),
            dndbUrl && React.createElement("a", { className: "btn primary grow", href: dndbUrl, target: "_blank", rel: "noopener", style: { textDecoration: "none" } }, React.createElement(Icon, { name: "link", size: 16 }), "Sheet"),
            canEditLink && React.createElement("button", { className: "btn ghost", title: "Edit D&D Beyond link", onClick: () => { setLinkVal(dndbUrl); setEditingLink(true); } }, React.createElement(Icon, { name: "settings", size: 15 })))
    );
  }

  function LootPanel({ loot, setGold, addItem, removeItem, canEdit, party, addItemOpen, setAddItemOpen, onAddItem }) {
    const [newItem, setNewItem] = useState({ name: "", qty: 1, holder: "" });
    const players = party ? party.map((p) => p.player) : [];
    return React.createElement("div", { className: "panel", style: { marginBottom: 24, padding: 18 } },
      React.createElement("div", { className: "panel-h", style: { marginBottom: 14 } },
        React.createElement("h3", null, "💰 Party Treasury"),
        React.createElement("div", { className: "spacer" }),
        canEdit && React.createElement("button", { className: "btn sm primary", onClick: addItem },
          React.createElement(Icon, { name: "plus", size: 14 }), "Add item")),
      // Gold
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 } },
        React.createElement("span", { style: { fontFamily: "var(--display)", fontSize: 15, color: "var(--gold)" } }, "Gold"),
        canEdit
          ? React.createElement("input", { type: "number", value: loot.gold || 0, onChange: (e) => setGold(e.target.value),
              style: { width: 100, background: "var(--surface-2)", border: "1px solid var(--hair)", borderRadius: 8, color: "var(--ink)", padding: "4px 8px", fontSize: 14 } })
          : React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700, color: "var(--gold)" } }, (loot.gold || 0).toLocaleString()),
        React.createElement("span", { className: "muted", style: { fontSize: 13 } }, "gp")),
      // Items
      (loot.items || []).length === 0 && React.createElement("div", { className: "muted", style: { fontSize: 13, fontStyle: "italic" } }, "No items yet."),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
        (loot.items || []).map((item) =>
          React.createElement("div", { key: item.id, style: { display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", borderRadius: 8, padding: "8px 12px" } },
            React.createElement("div", { style: { flex: 1, fontWeight: 600, fontSize: 14 } }, item.name),
            item.qty > 1 && React.createElement("span", { className: "tag", style: { fontSize: 11 } }, "×" + item.qty),
            item.holder && React.createElement("span", { className: "tag gold", style: { fontSize: 11 } }, item.holder),
            canEdit && React.createElement("button", { onClick: () => removeItem(item.id), style: { background: "none", border: "none", color: "var(--red-bright)", cursor: "pointer", fontSize: 16, padding: 0 } }, "×")))),
      // Add item form inline
      addItemOpen && React.createElement("div", { style: { marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" } },
        React.createElement("input", { className: "input", placeholder: "Item name", value: newItem.name, onChange: (e) => setNewItem((x) => ({ ...x, name: e.target.value })), style: { flex: "1 1 160px" }, autoFocus: true }),
        React.createElement("input", { className: "input", type: "number", placeholder: "Qty", value: newItem.qty, onChange: (e) => setNewItem((x) => ({ ...x, qty: +e.target.value || 1 })), style: { width: 60 } }),
        React.createElement("select", { className: "input", value: newItem.holder, onChange: (e) => setNewItem((x) => ({ ...x, holder: e.target.value })), style: { flex: "0 0 auto" } },
          React.createElement("option", { value: "" }, "Who has it?"),
          ["Party"].concat(players).map((n) => React.createElement("option", { key: n, value: n }, n))),
        React.createElement("button", { className: "btn primary sm", onClick: () => { if (newItem.name) { onAddItem(newItem); setNewItem({ name: "", qty: 1, holder: "" }); } } }, "Add"),
        React.createElement("button", { className: "btn ghost sm", onClick: () => setAddItemOpen(false) }, "Cancel"))
    );
  }

  function mini(label, val, icon) {
    return React.createElement("div", { style: { background: "var(--bg)", border: "1px solid var(--hair)", borderRadius: 9, padding: "8px 4px", textAlign: "center" } },
      React.createElement("div", { className: "row", style: { justifyContent: "center", gap: 4, color: "var(--gold)" } },
        React.createElement(Icon, { name: icon, size: 12 }),
        React.createElement("span", { style: { fontFamily: "var(--display)", fontSize: 9, letterSpacing: "0.08em" } }, label)),
      React.createElement("div", { className: "mono", style: { fontSize: 15, fontWeight: 700, marginTop: 2 } }, val));
  }

  function CharDetail({ p, dndbUrl, onClose }) {
    if (!p) return null;
    return React.createElement(Modal, { open: !!p, onClose, title: p.name, sub: p.race + " " + p.cls + " (" + p.subclass + ") · Level " + p.level, w: 540 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 18 } },
        React.createElement("div", { className: "row", style: { gap: 16 } },
          React.createElement(Avatar, { name: p.name, ring: p.ring, size: 70, glow: true }),
          React.createElement("div", { style: { flex: 1 } }, React.createElement(HPBar, { hp: p.hp, max: p.hpMax, height: 10 }))),
        React.createElement(StatGrid, { stats: p.stats }),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 } },
          mini("AC", p.ac, "shield"), mini("Init", (p.init >= 0 ? "+" : "") + p.init, "swords"), mini("Speed", p.speed + "ft", "move"), mini("Passive", p.passive, "eye")),
        React.createElement("p", { style: { margin: 0, fontStyle: "italic", color: "var(--ink-soft)", lineHeight: 1.5 } }, ““” + p.blurb + “””),
        dndbUrl && React.createElement("a", { className: "btn primary", href: dndbUrl, target: "_blank", rel: "noopener", style: { justifyContent: "center", textDecoration: "none" } },
          React.createElement(Icon, { name: "link", size: 16 }), "Open full sheet on D&D Beyond"))
    );
  }

  window.Party = Party;
})();
