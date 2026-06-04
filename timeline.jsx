/* CAMPAIGN LOG — horizontal timeline + session recaps merged */
(function () {
  var useState = React.useState;
  var useContext = React.useContext;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var Icon = window.Icon;
  var Modal = window.NZUI.Modal;

  // ── Colours ──────────────────────────────────────────────────────────────
  var GOLD  = "var(--gold)";
  var GOLD2 = "var(--gold-bright)";
  var DIM   = "var(--ink-dim)";
  var SOFT  = "var(--ink-soft)";

  // ── Helper: blank gap template ────────────────────────────────────────────
  function blankGap() { return { time: "", events: [] }; }

  // ── RecapModal (add/edit a session) ──────────────────────────────────────
  function RecapModal(props) {
    var open = props.open, initial = props.initial, onClose = props.onClose, onSave = props.onSave;
    var fState = useState(initial || { title: "", date: "", body: "", tags: "" });
    var f = fState[0], setF = fState[1];
    useEffect(function() { if (open) setF(initial ? Object.assign({}, initial, { tags: (initial.tags || []).join(", ") }) : { title: "", date: "", body: "", tags: "" }); }, [open]);
    function up(k, v) { setF(function(x) { return Object.assign({}, x, { [k]: v }); }); }
    var isEdit = initial && initial.id;
    return React.createElement(Modal, { open: open, onClose: onClose, title: isEdit ? "Edit Session" : "Add Session", w: 560 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Session title"), React.createElement("input", { className: "input", value: f.title, onChange: function(e) { up("title", e.target.value); }, placeholder: "e.g. The Counting House Heist", autoFocus: true })),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Date"), React.createElement("input", { className: "input", value: f.date, onChange: function(e) { up("date", e.target.value); }, placeholder: "e.g. 13 Jun 2026" })),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Recap"), React.createElement("textarea", { className: "input", rows: 5, value: f.body, onChange: function(e) { up("body", e.target.value); }, style: { resize: "vertical" }, placeholder: "What happened this session..." })),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Tags (comma-separated)"), React.createElement("input", { className: "input", value: f.tags, onChange: function(e) { up("tags", e.target.value); }, placeholder: "Combat, TPK avoided, Nat 1 of the night" })),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary", disabled: !f.title, onClick: function() { onSave(Object.assign({}, initial, { title: f.title, date: f.date, body: f.body, tags: f.tags.split(",").map(function(t) { return t.trim(); }).filter(Boolean) })); } }, isEdit ? "Save" : "Add session"))));
  }

  // ── GapModal (add/edit gap between two sessions) ─────────────────────────
  function GapModal(props) {
    var open = props.open, initial = props.initial, onClose = props.onClose, onSave = props.onSave;
    var timeState = useState(initial && initial.time ? initial.time : "");
    var time = timeState[0], setTime = timeState[1];
    var evtsState = useState(initial && initial.events ? initial.events : []);
    var evts = evtsState[0], setEvts = evtsState[1];
    var newEvtState = useState(""); var newEvt = newEvtState[0], setNewEvt = newEvtState[1];
    useEffect(function() { if (open) { setTime(initial && initial.time ? initial.time : ""); setEvts(initial && initial.events ? initial.events : []); setNewEvt(""); } }, [open]);
    function addEvt() { if (!newEvt.trim()) return; setEvts(function(e) { return e.concat([{ id: "ev" + Date.now(), title: newEvt.trim() }]); }); setNewEvt(""); }
    function delEvt(id) { setEvts(function(e) { return e.filter(function(x) { return x.id !== id; }); }); }
    return React.createElement(Modal, { open: open, onClose: onClose, title: "Time Gap & Events", sub: "What happened between sessions?", w: 480 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Time elapsed"), React.createElement("input", { className: "input", value: time, onChange: function(e) { setTime(e.target.value); }, placeholder: "e.g. 3 days · 1 week · same evening", autoFocus: true })),
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Events between sessions"),
          React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 8 } },
            React.createElement("input", { className: "input", value: newEvt, onChange: function(e) { setNewEvt(e.target.value); }, placeholder: "Travel to Counting House…", onKeyDown: function(e) { if (e.key === "Enter") addEvt(); }, style: { flex: 1 } }),
            React.createElement("button", { className: "btn primary sm", onClick: addEvt }, "+")),
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 5 } },
            evts.map(function(ev) { return React.createElement("div", { key: ev.id, style: { display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", borderRadius: 7, padding: "6px 10px" } },
              React.createElement("span", { style: { fontSize: 12, color: SOFT, flex: 1 } }, ev.title),
              React.createElement("button", { onClick: function() { delEvt(ev.id); }, style: { background: "none", border: "none", color: "var(--red-bright)", cursor: "pointer", fontSize: 13 } }, "✕")); }))),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary", onClick: function() { onSave({ time: time, events: evts }); } }, "Save"))));
  }

  // ── SessionNode (individual session on the timeline) ─────────────────────
  function SessionNode(props) {
    var recap = props.recap, num = props.num, isDM = props.isDM;
    var onEdit = props.onEdit, onDelete = props.onDelete, onEditGap = props.onEditGap;
    var gap = props.gap; // { time, events } for gap BEFORE this session
    var expandState = useState(false); var expanded = expandState[0], setExpanded = expandState[1];
    var isFirst = props.isFirst;
    return React.createElement("div", { style: { display: "flex", alignItems: "stretch", flex: "none" } },
      // Gap connector (between sessions)
      !isFirst && React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80, paddingTop: 28 } },
        // Timeline line segment
        React.createElement("div", { style: { width: "100%", height: 3, background: "linear-gradient(90deg, var(--gold-deep), var(--gold-bright), var(--gold-deep))", position: "relative", top: 22 } }),
        // Gap label + events below the line
        React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, marginTop: 8, zIndex: 2 } },
          gap && gap.time && React.createElement("div", { style: { fontSize: 10, fontFamily: "var(--mono)", color: DIM, background: "var(--bg-2)", border: "1px solid var(--hair)", borderRadius: 100, padding: "2px 8px", whiteSpace: "nowrap" } }, gap.time),
          gap && (gap.events || []).map(function(ev) { return React.createElement("div", { key: ev.id, style: { fontSize: 10, color: SOFT, background: "var(--surface)", borderRadius: 5, padding: "2px 6px", whiteSpace: "nowrap", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis" } }, "· " + ev.title); }),
          isDM && React.createElement("button", { onClick: onEditGap, title: "Edit gap/events", style: { background: "none", border: "none", cursor: "pointer", color: DIM, fontSize: 12, marginTop: 2 } }, "✎"))),
      // Session node
      React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", width: 200, flex: "none" } },
        // Circle marker on the timeline line
        React.createElement("div", { style: { position: "relative", zIndex: 2, marginTop: isFirst ? 18 : 18 } },
          React.createElement("button", { onClick: function() { setExpanded(function(x) { return !x; }); },
            style: { width: 44, height: 44, borderRadius: "50%", border: "3px solid var(--gold)", background: "radial-gradient(circle at 35% 30%, var(--gold-bright), var(--gold-deep))", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: expanded ? "0 0 0 4px rgba(232,181,74,0.35), 0 4px 14px rgba(0,0,0,0.4)" : "0 4px 14px rgba(0,0,0,0.4)",
              fontFamily: "var(--display)", fontWeight: 900, fontSize: 15, color: "#2a1d05" } },
            num),
          // Edit/delete hover controls for DM
          isDM && React.createElement("div", { style: { position: "absolute", top: -8, right: -8, display: "flex", gap: 2 } },
            React.createElement("button", { onClick: onEdit, style: { width: 20, height: 20, borderRadius: "50%", border: "1px solid var(--hair)", background: "var(--surface-2)", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", color: DIM } }, "✏"),
            React.createElement("button", { onClick: onDelete, style: { width: 20, height: 20, borderRadius: "50%", border: "1px solid var(--hair)", background: "var(--surface-2)", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--red-bright)" } }, "✕"))),
        // Session info below marker
        React.createElement("div", { style: { padding: "10px 8px 0", textAlign: "center" } },
          React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 700, fontSize: 14, color: GOLD2, lineHeight: 1.2, marginBottom: 4, cursor: "pointer" }, onClick: function() { setExpanded(function(x) { return !x; }); } }, recap.title || "Untitled"),
          recap.date && React.createElement("div", { style: { fontSize: 11, color: DIM, marginBottom: 4 } }, recap.date),
          React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" } },
            (recap.tags || []).slice(0, 2).map(function(t) { return React.createElement("span", { key: t, style: { fontSize: 9, background: "rgba(232,181,74,0.12)", border: "1px solid rgba(232,181,74,0.25)", borderRadius: 100, padding: "1px 6px", color: "var(--gold-deep)", whiteSpace: "nowrap" } }, t); }))),
        // Expanded recap body
        expanded && recap.body && React.createElement("div", { style: { margin: "10px 8px 0", padding: 12, background: "var(--surface)", borderRadius: 10, fontSize: 12.5, color: SOFT, lineHeight: 1.6, textAlign: "left", maxWidth: 190, border: "1px solid var(--hair)" } }, recap.body)));
  }

  // ── Main CampaignLog component ────────────────────────────────────────────
  function CampaignLog(props) {
    var recaps = props.recaps || [];
    var setRecaps = props.setRecaps;
    var timeline = props.timeline || []; // gap data per recap id: { [recapId]: { time, events } }
    var setTimeline = props.setTimeline;
    var stats = props.stats || {};
    var ctx = useContext(window.NZAuth.RoleContext);
    var isDM = ctx.role === "dm";
    var canEdit = window.NZAuth.can(ctx.role, "editWorld");

    var editingRecap = useState(null); var editR = editingRecap[0], setEditR = editingRecap[1];
    var editingGap = useState(null); // { recapId } or null
    var editG = editingGap[0], setEditG = editingGap[1];

    // Sort recaps by num ascending
    var sorted = recaps.slice().sort(function(a, b) { return (a.num || 0) - (b.num || 0); });

    function getGap(recapId) {
      var entry = timeline.find(function(t) { return t.id === recapId; });
      return entry ? { time: entry.gapBefore || "", events: entry.eventsBefore || [] } : null;
    }
    function saveGap(recapId, gapData) {
      setTimeline(function(tl) {
        var existing = tl.find(function(t) { return t.id === recapId; });
        if (existing) return tl.map(function(t) { return t.id === recapId ? Object.assign({}, t, { gapBefore: gapData.time, eventsBefore: gapData.events }) : t; });
        return tl.concat([{ id: recapId, gapBefore: gapData.time, eventsBefore: gapData.events }]);
      });
      setEditG(null);
    }
    function saveRecap(r) {
      if (r.id) { setRecaps(function(rs) { return rs.map(function(x) { return x.id === r.id ? r : x; }); }); }
      else { setRecaps(function(rs) { return [Object.assign({}, r, { id: "r" + Date.now(), num: rs.length + 1 })].concat(rs); }); }
      setEditR(null);
    }
    function deleteRecap(id) { if (confirm("Delete this session?")) { setRecaps(function(rs) { return rs.filter(function(r) { return r.id !== id; }); }); } }

    function downloadRecaps() {
      var text = sorted.map(function(r) { return "=== Ep " + r.num + ": " + r.title + " (" + (r.date || "") + ") ===\n" + (r.body || "") + "\nTags: " + (r.tags || []).join(", "); }).join("\n\n");
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = "campaign-log.txt"; a.click();
    }

    var currentGap = editG ? getGap(editG) || blankGap() : null;

    return React.createElement("div", { style: { height: "100%", minHeight: 0, display: "flex", flexDirection: "column" } },
      // Header bar
      React.createElement("div", { style: { padding: "16px 24px 12px", borderBottom: "1px solid var(--hair)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, background: "var(--bg-2)" } },
        React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 16, fontWeight: 700, color: GOLD2 } }, "Campaign Log"),
        React.createElement("div", { className: "muted", style: { fontSize: 13 } }, sorted.length + " sessions recorded"),
        React.createElement("div", { className: "spacer" }),
        React.createElement("button", { className: "btn ghost sm", onClick: downloadRecaps }, React.createElement(Icon, { name: "upload", size: 14 }), "Export"),
        canEdit && React.createElement("button", { className: "btn primary sm", onClick: function() { setEditR(false); } }, React.createElement(Icon, { name: "plus", size: 14 }), "Add session")),

      // Quick stats
      React.createElement("div", { style: { padding: "10px 24px", borderBottom: "1px solid var(--hair)", display: "flex", gap: 20, flexShrink: 0 } },
        [["Sessions", sorted.length, "recap", GOLD], ["Nat 20s", stats.nat20s, "sparkle", "var(--emerald)"], ["Nat 1s", stats.nat1s, "dice", "var(--red)"], ["In-jokes", stats.inJokes, "flame", "var(--amethyst)"]].map(function(item) {
          return React.createElement("div", { key: item[0], className: "row", style: { gap: 6 } },
            React.createElement(Icon, { name: item[2], size: 14, style: { color: item[3] } }),
            React.createElement("span", { style: { fontFamily: "var(--mono)", fontWeight: 700, fontSize: 14, color: item[3] } }, item[1]),
            React.createElement("span", { className: "muted", style: { fontSize: 11 } }, item[0]));
        })),

      // Horizontal timeline scroll
      React.createElement("div", { style: { flex: 1, overflowX: "auto", overflowY: "auto", padding: "24px 24px 40px", minHeight: 0 } },
        sorted.length === 0
          ? React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 14 } },
              React.createElement(Icon, { name: "recap", size: 40, style: { color: DIM } }),
              React.createElement("div", { className: "muted", style: { fontStyle: "italic" } }, "No sessions logged yet."),
              canEdit && React.createElement("button", { className: "btn primary", onClick: function() { setEditR(false); } }, React.createElement(Icon, { name: "plus", size: 15 }), "Add first session"))
          : React.createElement("div", { style: { display: "flex", alignItems: "flex-start", minWidth: "max-content", paddingBottom: 24 } },
              // Continuous background timeline line
              React.createElement("div", { style: { position: "absolute", height: 3, background: "linear-gradient(90deg, var(--gold-deep), var(--gold-bright), var(--gold-deep))", top: 0, left: 0, right: 0, marginTop: 44, pointerEvents: "none" } }),
              sorted.map(function(recap, i) {
                return React.createElement(SessionNode, { key: recap.id, recap: recap, num: recap.num || (i + 1), isDM: isDM,
                  gap: getGap(recap.id), isFirst: i === 0,
                  onEdit: function() { setEditR(recap); },
                  onDelete: function() { deleteRecap(recap.id); },
                  onEditGap: function() { setEditG(recap.id); } });
              }),
              // "Add session" button at the end of timeline
              canEdit && React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", width: 100, paddingTop: 18, flex: "none" } },
                React.createElement("div", { style: { width: "50%", height: 3, background: "linear-gradient(90deg, var(--gold-deep), transparent)" } }),
                React.createElement("button", { onClick: function() { setEditR(false); },
                  style: { width: 36, height: 36, borderRadius: "50%", border: "2px dashed var(--gold-deep)", background: "var(--bg-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold-deep)", fontSize: 22, marginTop: 4 } }, "+"))),

      // Modals
      React.createElement(RecapModal, { open: editR !== null, initial: editR || null, onClose: function() { setEditR(null); }, onSave: saveRecap }),
      React.createElement(GapModal, { open: !!editG, initial: currentGap, onClose: function() { setEditG(null); }, onSave: function(gd) { saveGap(editG, gd); } }));
  }

  window.CampaignLog = CampaignLog;
})();
