/* LORE — NPC tracker and world knowledge */
(function () {
  var useState = React.useState;
  var useContext = React.useContext;
  var useEffect = React.useEffect;
  var Icon = window.Icon;
  var Modal = window.NZUI.Modal;

  var RELATIONSHIPS = [
    { id: "friendly",  label: "Friendly",  emoji: "🟢", color: "var(--emerald)" },
    { id: "neutral",   label: "Neutral",   emoji: "🟡", color: "var(--gold)" },
    { id: "hostile",   label: "Hostile",   emoji: "🔴", color: "var(--red-bright)" },
    { id: "unknown",   label: "Unknown",   emoji: "⬜", color: "var(--ink-dim)" },
  ];

  function NPCModal(props) {
    var open = props.open, initial = props.initial, onClose = props.onClose, onSave = props.onSave;
    var nameState = useState(initial ? initial.name : "");
    var name = nameState[0], setName = nameState[1];
    var relState = useState(initial ? initial.relationship : "neutral");
    var rel = relState[0], setRel = relState[1];
    var locState = useState(initial ? initial.location : "");
    var loc = locState[0], setLoc = locState[1];
    var noteState = useState(initial ? initial.note : "");
    var note = noteState[0], setNote = noteState[1];

    useEffect(function() {
      if (open) {
        setName(initial ? initial.name : "");
        setRel(initial ? initial.relationship : "neutral");
        setLoc(initial ? initial.location : "");
        setNote(initial ? initial.note : "");
      }
    }, [open]);

    var isEdit = initial && initial.id;
    return React.createElement(Modal, { open: open, onClose: onClose, title: isEdit ? "Edit NPC" : "Add NPC", w: 480 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Name"),
          React.createElement("input", { className: "input", value: name, onChange: function(e) { setName(e.target.value); }, placeholder: "e.g. Gloomfang", autoFocus: true })),
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Relationship to the party"),
          React.createElement("div", { style: { display: "flex", gap: 8 } },
            RELATIONSHIPS.map(function(r) {
              return React.createElement("button", { key: r.id, onClick: function() { setRel(r.id); },
                style: { flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  border: "1px solid " + (rel === r.id ? r.color : "var(--hair)"),
                  background: rel === r.id ? r.color + "22" : "var(--surface-2)", color: rel === r.id ? r.color : "var(--ink-dim)" } },
                r.emoji + " " + r.label);
            }))),
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Last known location"),
          React.createElement("input", { className: "input", value: loc, onChange: function(e) { setLoc(e.target.value); }, placeholder: "e.g. The Soggy Tankard" })),
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Notes"),
          React.createElement("textarea", { className: "input", rows: 3, value: note, onChange: function(e) { setNote(e.target.value); }, style: { resize: "vertical" }, placeholder: "What does the party know about them?" })),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary", disabled: !name,
            onClick: function() { onSave(Object.assign({}, initial, { name: name, relationship: rel, location: loc, note: note })); }
          }, isEdit ? "Save" : "Add NPC"))));
  }

  function Lore(props) {
    var npcs = props.npcs || [];
    var setNpcs = props.setNpcs;
    var ctx = useContext(window.NZAuth.RoleContext);
    var canEdit = window.NZAuth.can(ctx.role, "editWorld");

    var editState = useState(null);
    var editing = editState[0], setEditing = editState[1];
    var searchState = useState("");
    var search = searchState[0], setSearch = searchState[1];
    var relFilterState = useState("all");
    var relFilter = relFilterState[0], setRelFilter = relFilterState[1];

    function saveNpc(n) {
      if (n.id) {
        setNpcs(function(ns) { return ns.map(function(x) { return x.id === n.id ? n : x; }); });
      } else {
        setNpcs(function(ns) { return ns.concat([Object.assign({}, n, { id: "npc" + Date.now() })]); });
      }
      setEditing(null);
    }
    function deleteNpc(id) {
      if (confirm("Remove this NPC?")) setNpcs(function(ns) { return ns.filter(function(n) { return n.id !== id; }); });
    }

    var filtered = npcs.filter(function(n) {
      var matchSearch = !search || n.name.toLowerCase().indexOf(search.toLowerCase()) >= 0 || (n.note || "").toLowerCase().indexOf(search.toLowerCase()) >= 0;
      var matchRel = relFilter === "all" || n.relationship === relFilter;
      return matchSearch && matchRel;
    });

    return React.createElement("div", { className: "view-pad", style: { maxWidth: 1100 } },
      React.createElement("div", { className: "row", style: { marginBottom: 20, gap: 12, flexWrap: "wrap" } },
        React.createElement("p", { className: "muted", style: { margin: 0, flex: 1, maxWidth: 560 } },
          "Named characters the party has encountered. DM manages entries — everyone can read."),
        canEdit && React.createElement("button", { className: "btn primary", onClick: function() { setEditing(false); } },
          React.createElement(Icon, { name: "plus", size: 16 }), "Add NPC")),

      // Filters
      React.createElement("div", { style: { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" } },
        React.createElement("input", { className: "input", placeholder: "Search NPCs...", value: search, onChange: function(e) { setSearch(e.target.value); }, style: { flex: "1 1 200px", maxWidth: 260 } }),
        React.createElement("div", { className: "row", style: { gap: 6 } },
          React.createElement("button", { className: "btn sm" + (relFilter === "all" ? " primary" : " ghost"), onClick: function() { setRelFilter("all"); } }, "All"),
          RELATIONSHIPS.map(function(r) {
            return React.createElement("button", { key: r.id, className: "btn sm" + (relFilter === r.id ? " primary" : " ghost"), onClick: function() { setRelFilter(r.id); } },
              r.emoji + " " + r.label);
          }))),

      // NPC grid
      filtered.length === 0 && React.createElement("div", { className: "muted", style: { textAlign: "center", padding: "60px 20px", fontSize: 14, fontStyle: "italic" } },
        npcs.length === 0 ? "No NPCs yet. Add your first one." : "No results for that filter."),

      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 } },
        filtered.map(function(n) {
          var relDef = RELATIONSHIPS.find(function(r) { return r.id === n.relationship; }) || RELATIONSHIPS[1];
          return React.createElement("div", { key: n.id, className: "panel", style: { padding: 18, borderLeft: "4px solid " + relDef.color, position: "relative" } },
            canEdit && React.createElement("div", { style: { position: "absolute", top: 12, right: 12, display: "flex", gap: 4 } },
              React.createElement("button", { onClick: function() { setEditing(n); }, style: { background: "none", border: "none", color: "var(--ink-dim)", cursor: "pointer", fontSize: 15 } }, "✏️"),
              React.createElement("button", { onClick: function() { deleteNpc(n.id); }, style: { background: "none", border: "none", color: "var(--red-bright)", cursor: "pointer", fontSize: 15 } }, "🗑️")),
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 } },
              React.createElement("span", { style: { fontSize: 20 } }, relDef.emoji),
              React.createElement("div", null,
                React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 700, fontSize: 16, color: "var(--ink)" } }, n.name),
                React.createElement("div", { style: { fontSize: 12, color: relDef.color, fontWeight: 600 } }, relDef.label))),
            n.location && React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13, color: "var(--ink-dim)" } },
              React.createElement(Icon, { name: "pin", size: 13 }), n.location),
            n.note && React.createElement("p", { style: { margin: 0, fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 } }, n.note));
        })),

      React.createElement(NPCModal, { open: editing !== null, initial: editing || null, onClose: function() { setEditing(null); }, onSave: saveNpc }));
  }

  window.Lore = Lore;
})();
