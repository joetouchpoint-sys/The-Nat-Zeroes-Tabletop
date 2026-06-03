﻿/* CHAT ZEROES — aftershow tab */
(function () {
  var useState = React.useState;
  var useContext = React.useContext;
  var useEffect = React.useEffect;
  var Icon = window.Icon;
  var Modal = window.NZUI.Modal;

  var CZ_BG      = "#12101e";
  var CZ_SURFACE = "#1c1830";
  var CZ_POP     = "#ff4ecd";
  var CZ_TEAL    = "#00e5cc";
  var CZ_GOLD    = "#ffe066";
  var CZ_MUTED   = "#8a82aa";
  var CZ_INK     = "#f0ebff";

  function czBtn(color) {
    return { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px",
      borderRadius: 8, border: "1px solid " + color + "55", background: color + "18",
      color: color, cursor: "pointer", fontSize: 13, fontWeight: 600,
      width: "100%", justifyContent: "center" };
  }

  function statEmoji(icon) {
    var map = { sparkle: "✨", dice: "🎲", flame: "🔥", recap: "📖", shield: "🛡️", skull: "💀", party: "🎉", map: "🗺️" };
    return map[icon] || "✨";
  }

  // ---- Stat card — neon glow style ----
  function StatCard(props) {
    var s = props.s;
    var isDM = props.isDM;
    var onEdit = props.onEdit;
    var onDelete = props.onDelete;
    var col = s.color || CZ_GOLD;
    return React.createElement("div", {
      style: { background: "linear-gradient(135deg, " + CZ_SURFACE + " 60%, " + col + "0a 100%)",
        borderRadius: 16, padding: "22px 16px", textAlign: "center",
        border: "1px solid " + col + "44",
        boxShadow: "0 0 20px " + col + "18, inset 0 0 20px rgba(0,0,0,0.2)",
        position: "relative" }
    },
      isDM && React.createElement("div", { style: { position: "absolute", top: 8, right: 8, display: "flex", gap: 4 } },
        React.createElement("button", { onClick: onEdit, style: { background: "none", border: "none", color: CZ_MUTED, cursor: "pointer", padding: 2, fontSize: 13 } }, "✏️"),
        React.createElement("button", { onClick: onDelete, style: { background: "none", border: "none", color: "#ff6060", cursor: "pointer", padding: 2, fontSize: 13 } }, "🗑️")),
      React.createElement("div", { style: { fontSize: 28, marginBottom: 6, filter: "drop-shadow(0 0 6px " + col + ")" } }, statEmoji(s.icon)),
      React.createElement("div", { style: { fontFamily: "var(--mono)", fontSize: 44, fontWeight: 900, color: col, lineHeight: 1,
        textShadow: "0 0 20px " + col + "88" } }, s.value),
      React.createElement("div", { style: { fontSize: 12, color: CZ_MUTED, marginTop: 8, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--display)" } }, s.label)
    );
  }

  // ---- Award card ----
  function AwardCard(props) {
    var award = props.award;
    var isDM = props.isDM;
    var party = props.party;
    var onEdit = props.onEdit;
    var onDelete = props.onDelete;
    var onAddWinner = props.onAddWinner;
    var onRemoveWinner = props.onRemoveWinner;

    var winners = award.winners || [];
    var recent = winners.slice(-3).reverse();
    var tally = {};
    winners.forEach(function(w) { tally[w.player] = (tally[w.player] || 0) + 1; });
    var sorted = Object.entries(tally).sort(function(a, b) { return b[1] - a[1]; });

    var medals = ["🥇","🥈","🥉"];

    return React.createElement("div", {
      style: { background: "linear-gradient(135deg, " + CZ_SURFACE + ", rgba(255,78,205,0.06))",
        borderRadius: 18, padding: 22,
        border: "1px solid " + CZ_POP + "44",
        boxShadow: "0 4px 24px rgba(255,78,205,0.08)",
        display: "grid", gridTemplateColumns: "1fr auto", gap: 20 }
    },
      React.createElement("div", null,
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 } },
          React.createElement("span", { style: { fontSize: 28 } }, award.emoji),
          React.createElement("div", null,
            React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, color: CZ_INK } }, award.name),
            React.createElement("div", { style: { fontSize: 13, color: CZ_MUTED, marginTop: 2 } }, award.desc))),
        winners.length > 0
          ? React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 } },
              recent.map(function(w, i) {
                return React.createElement("div", { key: i,
                  style: { display: "flex", alignItems: "center", gap: 6, background: CZ_BG,
                    border: "1px solid " + CZ_POP + "44", borderRadius: 100,
                    padding: "4px 12px 4px 8px", fontSize: 12.5 }
                },
                  React.createElement("span", { style: { fontSize: 16 } }, award.emoji),
                  React.createElement("span", { style: { color: CZ_GOLD, fontWeight: 600 } }, w.player),
                  React.createElement("span", { style: { color: CZ_MUTED } }, " Ep " + w.session),
                  isDM && React.createElement("button", {
                    onClick: function() { onRemoveWinner(winners.length - 1 - i); },
                    style: { background: "none", border: "none", color: "#ff6060", cursor: "pointer", fontSize: 11, padding: "0 0 0 4px" }
                  }, "✕"));
              }))
          : React.createElement("div", { style: { fontSize: 13, color: CZ_MUTED, fontStyle: "italic", marginTop: 8 } }, "No winners recorded yet.")),

      React.createElement("div", { style: { minWidth: 160 } },
        sorted.length > 0 && React.createElement("div", { style: { marginBottom: 12 } },
          React.createElement("div", { style: { fontSize: 11, color: CZ_TEAL, letterSpacing: "0.12em", marginBottom: 6, textTransform: "uppercase", fontFamily: "var(--display)" } }, "All-time"),
          sorted.slice(0, 5).map(function(entry, i) {
            var player = entry[0], count = entry[1];
            return React.createElement("div", { key: player,
              style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 13 }
            },
              React.createElement("span", { style: { color: i === 0 ? CZ_GOLD : CZ_MUTED, minWidth: 16 } }, medals[i] || (i + 1) + "."),
              React.createElement("span", { style: { color: CZ_INK, flex: 1 } }, player),
              React.createElement("span", { style: { color: CZ_POP, fontFamily: "var(--mono)", fontWeight: 700 } }, count));
          })),
        isDM && React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
          React.createElement("button", { onClick: onAddWinner, style: czBtn(CZ_POP) }, award.emoji + " Record winner"),
          React.createElement("button", { onClick: onEdit, style: czBtn(CZ_MUTED) }, "✏️ Edit"),
          React.createElement("button", { onClick: onDelete,
            style: Object.assign({}, czBtn("#ff6060"), { marginTop: 2 }) }, "🗑️ Delete")))
    );
  }

  // ---- Stat modal ----
  function StatModal(props) {
    var open = props.open, initial = props.initial, onClose = props.onClose, onSave = props.onSave;
    var labelState = useState(initial ? initial.label : "");
    var label = labelState[0], setLabel = labelState[1];
    var valueState = useState(initial ? initial.value : 0);
    var value = valueState[0], setValue = valueState[1];
    var iconState = useState(initial ? initial.icon : "sparkle");
    var icon = iconState[0], setIcon = iconState[1];

    useEffect(function() {
      if (open) {
        setLabel(initial ? initial.label : "");
        setValue(initial ? initial.value : 0);
        setIcon(initial ? initial.icon : "sparkle");
      }
    }, [open]);

    var icons = [["sparkle","✨"],["dice","🎲"],["flame","🔥"],["recap","📖"],["skull","💀"],["party","🎉"],["map","🗺️"]];
    var isEdit = initial && initial.id;

    return React.createElement(Modal, { open: open, onClose: onClose, title: isEdit ? "Edit Stat" : "New Stat", w: 400 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Label"),
          React.createElement("input", { className: "input", value: label, onChange: function(e) { setLabel(e.target.value); }, placeholder: "e.g. Drinks consumed" })),
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Value"),
          React.createElement("input", { className: "input", type: "number", value: value, onChange: function(e) { setValue(+e.target.value); } })),
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Icon"),
          React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            icons.map(function(pair) {
              var id = pair[0], em = pair[1];
              return React.createElement("button", { key: id, onClick: function() { setIcon(id); },
                style: { fontSize: 22, padding: "4px 8px", borderRadius: 8, cursor: "pointer",
                  border: "2px solid " + (icon === id ? "var(--gold)" : "var(--hair)"),
                  background: icon === id ? "rgba(232,181,74,0.15)" : "var(--surface-2)" } }, em);
            }))),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary",
            onClick: function() { onSave(Object.assign({}, initial, { label: label, value: value, icon: icon })); }
          }, isEdit ? "Save" : "Add stat"))));
  }

  // ---- Award modal ----
  function AwardModal(props) {
    var open = props.open, initial = props.initial, onClose = props.onClose, onSave = props.onSave;
    var nameState = useState(initial ? initial.name : "");
    var name = nameState[0], setName = nameState[1];
    var emojiState = useState(initial ? initial.emoji : "🏆");
    var emoji = emojiState[0], setEmoji = emojiState[1];
    var descState = useState(initial ? initial.desc : "");
    var desc = descState[0], setDesc = descState[1];

    useEffect(function() {
      if (open) {
        setName(initial ? initial.name : "");
        setEmoji(initial ? initial.emoji : "🏆");
        setDesc(initial ? initial.desc : "");
      }
    }, [open]);

    var isEdit = initial && initial.id;
    return React.createElement(Modal, { open: open, onClose: onClose, title: isEdit ? "Edit Award" : "New Award", w: 440 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Award name"),
          React.createElement("input", { className: "input", value: name, onChange: function(e) { setName(e.target.value); }, placeholder: "e.g. Richard of the Recording" })),
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Emoji"),
          React.createElement("input", { className: "input", value: emoji, onChange: function(e) { setEmoji(e.target.value); }, style: { fontSize: 22, maxWidth: 80 } })),
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Description"),
          React.createElement("input", { className: "input", value: desc, onChange: function(e) { setDesc(e.target.value); }, placeholder: "What is this award for?" })),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary", disabled: !name,
            onClick: function() { onSave(Object.assign({}, initial, { name: name, emoji: emoji, desc: desc })); }
          }, isEdit ? "Save" : "Create award"))));
  }

  // ---- Winner modal ----
  function WinnerModal(props) {
    var open = props.open, award = props.award, party = props.party, onClose = props.onClose, onSave = props.onSave;
    var playerState = useState("");
    var player = playerState[0], setPlayer = playerState[1];

    useEffect(function() {
      if (open && party && party.length > 0) setPlayer(party[0].player || "");
    }, [open]);

    var players = [];
    if (party) {
      var seen = {};
      party.forEach(function(p) { if (!seen[p.player]) { seen[p.player] = true; players.push(p.player); } });
    }

    return React.createElement(Modal, { open: open, onClose: onClose, title: award ? award.name : "Record Winner", w: 380 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement("div", { style: { fontSize: 32, textAlign: "center", marginBottom: 4 } }, award ? award.emoji : ""),
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Who won this session?"),
          React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 } },
            players.map(function(p) {
              return React.createElement("button", { key: p, onClick: function() { setPlayer(p); },
                style: { padding: "8px 14px", borderRadius: 100, cursor: "pointer", fontSize: 13.5, fontWeight: 600,
                  border: "1px solid " + (player === p ? "#ff4ecd" : "var(--hair)"),
                  background: player === p ? "rgba(255,78,205,0.15)" : "var(--surface-2)",
                  color: player === p ? "#ff4ecd" : "var(--ink-soft)" }
              }, p);
            }))),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary", disabled: !player,
            onClick: function() { onSave(award ? award.id : null, player); }
          }, (award ? award.emoji + " " : "") + "Award it!"))));
  }

  // ---- Quote modal ----
  function QuoteModal(props) {
    var open = props.open, initial = props.initial, party = props.party, onClose = props.onClose, onSave = props.onSave;
    var textState = useState(""); var quoteText = textState[0], setQuoteText = textState[1];
    var speakerState = useState(""); var speaker = speakerState[0], setSpeaker = speakerState[1];
    var sessionState = useState(""); var session = sessionState[0], setSession = sessionState[1];

    useEffect(function() {
      if (open) {
        setQuoteText(initial ? initial.text : "");
        setSpeaker(initial ? initial.speaker : (party && party[0] ? party[0].player : ""));
        setSession(initial ? initial.session : "");
      }
    }, [open]);

    var players = [];
    if (party) { var seen = {}; party.forEach(function(p) { if (!seen[p.player]) { seen[p.player] = true; players.push(p.player); } }); }
    players.push("Callum (DM)");

    return React.createElement(Modal, { open: open, onClose: onClose, title: (initial && initial.id) ? "Edit Quote" : "Add a Quote", w: 480 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Quote"),
          React.createElement("textarea", { className: "input", rows: 3, value: quoteText, onChange: function(e) { setQuoteText(e.target.value); },
            placeholder: '"I check for traps." "There are no traps." "I check for traps again."', style: { resize: "vertical" } })),
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Who said it?"),
          React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            players.map(function(p) {
              return React.createElement("button", { key: p, onClick: function() { setSpeaker(p); },
                style: { padding: "6px 12px", borderRadius: 100, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  border: "1px solid " + (speaker === p ? CZ_POP : "var(--hair)"),
                  background: speaker === p ? "rgba(255,78,205,0.15)" : "var(--surface-2)",
                  color: speaker === p ? CZ_POP : "var(--ink-soft)" } }, p);
            }))),
        React.createElement("div", { className: "field" },
          React.createElement("label", null, "Session / context (optional)"),
          React.createElement("input", { className: "input", value: session, onChange: function(e) { setSession(e.target.value); }, placeholder: "e.g. Session 12, or 'The bar fight'" })),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary", disabled: !quoteText.trim(),
            onClick: function() { onSave(Object.assign({}, initial, { text: quoteText, speaker: speaker, session: session })); }
          }, "💬 Save quote"))));
  }

  // ---- Death memorial ----
  function DeathsSection(props) {
    var deaths = props.deaths || [];
    var setDeaths = props.setDeaths;
    var isDM = props.isDM;
    var editState = useState(null);
    var editing = editState[0], setEditing = editState[1];
    function saveDeath(d) {
      if (d.id) { setDeaths(function(ds) { return ds.map(function(x) { return x.id === d.id ? d : x; }); }); }
      else { setDeaths(function(ds) { return ds.concat([Object.assign({}, d, { id: "d" + Date.now() })]); }); }
      setEditing(null);
    }
    return React.createElement("div", { style: { marginTop: 40 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 } },
        React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 13, letterSpacing: "0.2em", color: "#888", textTransform: "uppercase" } }, "☠️ Deaths & Knockouts"),
        React.createElement("div", { style: { flex: 1, height: 1, background: "#88888833" } }),
        isDM && React.createElement("button", { onClick: function() { setEditing(false); }, style: czBtn("#888") }, React.createElement(Icon, { name: "plus", size: 14 }), " Add")),
      deaths.length === 0 && React.createElement("div", { style: { textAlign: "center", padding: "30px 20px", color: CZ_MUTED, fontStyle: "italic", fontSize: 14 } }, "No deaths yet. A miracle."),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 } },
        deaths.map(function(d) {
          return React.createElement("div", { key: d.id, style: { background: CZ_SURFACE, borderRadius: 14, padding: 18, border: "1px solid #88888833", textAlign: "center", position: "relative" } },
            isDM && React.createElement("div", { style: { position: "absolute", top: 8, right: 8, display: "flex", gap: 4 } },
              React.createElement("button", { onClick: function() { setEditing(d); }, style: { background: "none", border: "none", color: CZ_MUTED, cursor: "pointer", fontSize: 13 } }, "✏️"),
              React.createElement("button", { onClick: function() { setDeaths(function(ds) { return ds.filter(function(x) { return x.id !== d.id; }); }); }, style: { background: "none", border: "none", color: "#ff6060", cursor: "pointer", fontSize: 13 } }, "🗑️")),
            React.createElement("div", { style: { fontSize: 36, marginBottom: 8 } }, d.dramatic ? "⚰️" : "💀"),
            React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 16, fontWeight: 700, color: CZ_INK } }, d.character),
            React.createElement("div", { style: { fontSize: 12, color: CZ_MUTED, marginTop: 4 } }, d.player + (d.session ? " · Ep " + d.session : "")),
            d.cause && React.createElement("div", { style: { fontSize: 13, color: CZ_INK, marginTop: 8, fontStyle: "italic" } }, d.cause),
            d.culprit && React.createElement("div", { style: { fontSize: 12, color: "#ff9090", marginTop: 4 } }, "Responsible: " + d.culprit));
        })),
      editing !== null && React.createElement(DeathModal, { open: true, initial: editing || null, onClose: function() { setEditing(null); }, onSave: saveDeath }));
  }

  function DeathModal(props) {
    var open = props.open, initial = props.initial, onClose = props.onClose, onSave = props.onSave;
    var charState = useState(initial ? initial.character : ""); var char = charState[0], setChar = charState[1];
    var playerState = useState(initial ? initial.player : ""); var player = playerState[0], setPlayer = playerState[1];
    var sessState = useState(initial ? initial.session : ""); var sess = sessState[0], setSess = sessState[1];
    var causeState = useState(initial ? initial.cause : ""); var cause = causeState[0], setCause = causeState[1];
    var culpritState = useState(initial ? initial.culprit : ""); var culprit = culpritState[0], setCulprit = culpritState[1];
    var dramState = useState(initial ? !!initial.dramatic : false); var dramatic = dramState[0], setDramatic = dramState[1];
    useEffect(function() { if (open) { setChar(initial ? initial.character : ""); setPlayer(initial ? initial.player : ""); setSess(initial ? initial.session : ""); setCause(initial ? initial.cause : ""); setCulprit(initial ? initial.culprit : ""); setDramatic(initial ? !!initial.dramatic : false); } }, [open]);
    return React.createElement(Modal, { open: open, onClose: onClose, title: (initial && initial.id) ? "Edit Death" : "Record Death/KO", w: 460 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 12 } },
        React.createElement("div", { className: "row", style: { gap: 12 } },
          React.createElement("div", { className: "field", style: { flex: 1 } }, React.createElement("label", null, "Character"), React.createElement("input", { className: "input", value: char, onChange: function(e) { setChar(e.target.value); }, placeholder: "Krunk the Considerate" })),
          React.createElement("div", { className: "field", style: { flex: 1 } }, React.createElement("label", null, "Player"), React.createElement("input", { className: "input", value: player, onChange: function(e) { setPlayer(e.target.value); }, placeholder: "Milo" }))),
        React.createElement("div", { className: "row", style: { gap: 12 } },
          React.createElement("div", { className: "field", style: { flex: 1 } }, React.createElement("label", null, "Session"), React.createElement("input", { className: "input", value: sess, onChange: function(e) { setSess(e.target.value); }, placeholder: "12" })),
          React.createElement("div", { className: "field", style: { flex: 1 } }, React.createElement("label", null, "Culprit"), React.createElement("input", { className: "input", value: culprit, onChange: function(e) { setCulprit(e.target.value); }, placeholder: "Who's fault?" }))),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Cause of death"), React.createElement("input", { className: "input", value: cause, onChange: function(e) { setCause(e.target.value); }, placeholder: "Tax-related head trauma" })),
        React.createElement("label", { className: "row", style: { gap: 8, cursor: "pointer" } }, React.createElement("input", { type: "checkbox", checked: dramatic, onChange: function(e) { setDramatic(e.target.checked); } }), "Dramatically cool death (⚰️) vs embarrassing (💀)"),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary", disabled: !char, onClick: function() { onSave(Object.assign({}, initial, { character: char, player: player, session: sess, cause: cause, culprit: culprit, dramatic: dramatic })); } }, "Save"))));
  }

  // ---- Predictions board ----
  function PredictionsSection(props) {
    var predictions = props.predictions || [];
    var setPredictions = props.setPredictions;
    var isDM = props.isDM;
    var party = props.party;
    var addState = useState(false); var addOpen = addState[0], setAddOpen = addState[1];
    var textState = useState(""); var text = textState[0], setText = textState[1];
    var authorState = useState(""); var author = authorState[0], setAuthor = authorState[1];
    var sessState = useState(""); var sess = sessState[0], setSess = sessState[1];

    var players = [];
    if (party) { var seen = {}; party.forEach(function(p) { if (!seen[p.player]) { seen[p.player] = true; players.push(p.player); } }); }

    function addPred() {
      if (!text.trim() || !author) return;
      setPredictions(function(ps) { return ps.concat([{ id: "pr" + Date.now(), text: text, author: author, session: sess, result: null }]); });
      setText(""); setAddOpen(false);
    }
    function score(id, result) { setPredictions(function(ps) { return ps.map(function(p) { return p.id === id ? Object.assign({}, p, { result: result }) : p; }); }); }
    function del(id) { setPredictions(function(ps) { return ps.filter(function(p) { return p.id !== id; }); }); }

    var resultColors = { correct: CZ_TEAL, wrong: "#ff6060", partial: CZ_GOLD };
    var resultEmoji = { correct: "✅", wrong: "❌", partial: "🟡" };

    // Leaderboard
    var tally = {};
    predictions.forEach(function(p) {
      if (!tally[p.author]) tally[p.author] = { correct: 0, wrong: 0, partial: 0 };
      if (p.result) tally[p.author][p.result] = (tally[p.author][p.result] || 0) + 1;
    });
    var leaders = Object.entries(tally).sort(function(a, b) { return (b[1].correct * 3 + b[1].partial) - (a[1].correct * 3 + a[1].partial); });

    return React.createElement("div", { style: { marginTop: 40 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 } },
        React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 13, letterSpacing: "0.2em", color: CZ_TEAL, textTransform: "uppercase" } }, "🎯 Session Predictions"),
        React.createElement("div", { style: { flex: 1, height: 1, background: CZ_TEAL + "33" } }),
        React.createElement("button", { onClick: function() { setAddOpen(true); }, style: czBtn(CZ_TEAL) }, React.createElement(Icon, { name: "plus", size: 14 }), " Add prediction")),
      addOpen && React.createElement("div", { style: { background: CZ_SURFACE, borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 } },
        React.createElement("textarea", { className: "input", rows: 2, value: text, onChange: function(e) { setText(e.target.value); }, placeholder: '"Krunk will rage at least once and apologise immediately after"', style: { resize: "none" }, autoFocus: true }),
        React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          React.createElement("input", { className: "input", placeholder: "Session #", value: sess, onChange: function(e) { setSess(e.target.value); }, style: { width: 100 } }),
          React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
            ["Callum (DM)"].concat(players).map(function(p) {
              return React.createElement("button", { key: p, onClick: function() { setAuthor(p); },
                style: { padding: "6px 12px", borderRadius: 100, cursor: "pointer", fontSize: 13, border: "1px solid " + (author === p ? CZ_TEAL : "var(--hair)"), background: author === p ? CZ_TEAL + "22" : "var(--surface-2)", color: author === p ? CZ_TEAL : "var(--ink-dim)" } }, p);
            })),
          React.createElement("button", { className: "btn primary sm", onClick: addPred, disabled: !text.trim() || !author }, "Add"),
          React.createElement("button", { className: "btn ghost sm", onClick: function() { setAddOpen(false); } }, "Cancel"))),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "start" } },
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
          predictions.length === 0 && React.createElement("div", { style: { color: CZ_MUTED, fontStyle: "italic", fontSize: 14, padding: "20px 0" } }, "No predictions yet."),
          predictions.map(function(p) {
            return React.createElement("div", { key: p.id, style: { background: CZ_SURFACE, borderRadius: 12, padding: 14, border: "1px solid " + (p.result ? resultColors[p.result] + "55" : "var(--hair)") } },
              React.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: 10 } },
                React.createElement("div", { style: { flex: 1, fontSize: 14, color: CZ_INK, lineHeight: 1.5 } }, p.text),
                p.result && React.createElement("span", { style: { fontSize: 20 } }, resultEmoji[p.result])),
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 8 } },
                React.createElement("span", { style: { fontSize: 12, color: CZ_POP, fontWeight: 600 } }, p.author),
                p.session && React.createElement("span", { style: { fontSize: 12, color: CZ_MUTED } }, "· Ep " + p.session),
                React.createElement("div", { style: { flex: 1 } }),
                isDM && !p.result && React.createElement("div", { style: { display: "flex", gap: 4 } },
                  ["correct","partial","wrong"].map(function(r) {
                    return React.createElement("button", { key: r, onClick: function() { score(p.id, r); }, style: { fontSize: 14, padding: "2px 6px", cursor: "pointer", border: "1px solid var(--hair)", background: "var(--surface-3)", borderRadius: 6 } }, resultEmoji[r]);
                  })),
                isDM && React.createElement("button", { onClick: function() { del(p.id); }, style: { background: "none", border: "none", color: "#ff6060", cursor: "pointer", fontSize: 13 } }, "✕")));
          })),
        leaders.length > 0 && React.createElement("div", { style: { background: CZ_SURFACE, borderRadius: 14, padding: 16 } },
          React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.2em", color: CZ_GOLD, marginBottom: 12 } }, "LEADERBOARD"),
          leaders.map(function(entry, i) {
            var p = entry[0], counts = entry[1];
            return React.createElement("div", { key: p, style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13 } },
              React.createElement("span", { style: { color: i === 0 ? CZ_GOLD : CZ_MUTED, minWidth: 20 } }, i === 0 ? "🥇" : i === 1 ? "🥈" : i + 1 + "."),
              React.createElement("span", { style: { flex: 1, color: CZ_INK } }, p),
              React.createElement("span", { style: { color: CZ_TEAL, fontFamily: "var(--mono)", fontWeight: 700 } }, counts.correct + "✓"));
          }))));
  }

  // ---- Running gags ----
  function GagsSection(props) {
    var gags = props.gags || [];
    var setGags = props.setGags;
    var isDM = props.isDM;
    var addState = useState(false); var addOpen = addState[0], setAddOpen = addState[1];
    var textState = useState(""); var text = textState[0], setText = textState[1];

    function addGag() {
      if (!text.trim()) return;
      setGags(function(gs) { return gs.concat([{ id: "g" + Date.now(), text: text, count: 0 }]); });
      setText(""); setAddOpen(false);
    }
    function increment(id) { setGags(function(gs) { return gs.map(function(g) { return g.id === id ? Object.assign({}, g, { count: g.count + 1 }) : g; }); }); }

    var sorted = gags.slice().sort(function(a, b) { return b.count - a.count; });

    return React.createElement("div", { style: { marginTop: 40 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 } },
        React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 13, letterSpacing: "0.2em", color: CZ_POP, textTransform: "uppercase" } }, "🎭 Running Gags"),
        React.createElement("div", { style: { flex: 1, height: 1, background: CZ_POP + "33" } }),
        isDM && React.createElement("button", { onClick: function() { setAddOpen(true); }, style: czBtn(CZ_POP) }, React.createElement(Icon, { name: "plus", size: 14 }), " New gag")),
      addOpen && isDM && React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 14 } },
        React.createElement("input", { className: "input", value: text, onChange: function(e) { setText(e.target.value); }, placeholder: '"Krunk apologises mid-rage"', style: { flex: 1 }, autoFocus: true, onKeyDown: function(e) { if (e.key === "Enter") addGag(); } }),
        React.createElement("button", { className: "btn primary sm", onClick: addGag }, "Add"),
        React.createElement("button", { className: "btn ghost sm", onClick: function() { setAddOpen(false); } }, "✕")),
      sorted.length === 0 && React.createElement("div", { style: { color: CZ_MUTED, fontStyle: "italic", fontSize: 14, padding: "20px 0" } }, "No running gags yet."),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 } },
        sorted.map(function(g) {
          return React.createElement("div", { key: g.id, style: { background: CZ_SURFACE, borderRadius: 14, padding: 18, border: "1px solid " + CZ_POP + "22", position: "relative" } },
            isDM && React.createElement("button", { onClick: function() { setGags(function(gs) { return gs.filter(function(x) { return x.id !== g.id; }); }); }, style: { position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "#ff6060", cursor: "pointer", fontSize: 13 } }, "🗑️"),
            React.createElement("div", { style: { fontFamily: "var(--mono)", fontSize: 48, fontWeight: 900, color: CZ_POP, lineHeight: 1, marginBottom: 8 } }, g.count),
            React.createElement("div", { style: { fontSize: 13.5, color: CZ_INK, marginBottom: 14, lineHeight: 1.4 } }, g.text),
            React.createElement("button", { onClick: function() { increment(g.id); }, style: { width: "100%", padding: "10px 0", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, border: "1px solid " + CZ_POP + "55", background: CZ_POP + "15", color: CZ_POP } }, "▲ Count it!"));
        })));
  }

  // ---- Shoutouts / listener questions ----
  function ShoutoutsSection(props) {
    var shoutouts = props.shoutouts || [];
    var setShoutouts = props.setShoutouts;
    var isDM = props.isDM;
    var addState = useState(false); var addOpen = addState[0], setAddOpen = addState[1];
    var textState = useState(""); var text = textState[0], setText = textState[1];

    function add() {
      if (!text.trim()) return;
      setShoutouts(function(ss) { return ss.concat([{ id: "s" + Date.now(), text: text, answered: false }]); });
      setText(""); setAddOpen(false);
    }
    function toggle(id) { setShoutouts(function(ss) { return ss.map(function(s) { return s.id === id ? Object.assign({}, s, { answered: !s.answered }) : s; }); }); }
    function del(id) { setShoutouts(function(ss) { return ss.filter(function(s) { return s.id !== id; }); }); }

    return React.createElement("div", { style: { marginTop: 40, marginBottom: 40 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 } },
        React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 13, letterSpacing: "0.2em", color: CZ_TEAL, textTransform: "uppercase" } }, "📣 Listener Shoutouts & Questions"),
        React.createElement("div", { style: { flex: 1, height: 1, background: CZ_TEAL + "33" } }),
        isDM && React.createElement("button", { onClick: function() { setAddOpen(true); }, style: czBtn(CZ_TEAL) }, React.createElement(Icon, { name: "plus", size: 14 }), " Add")),
      addOpen && isDM && React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 14 } },
        React.createElement("input", { className: "input", value: text, onChange: function(e) { setText(e.target.value); }, placeholder: "Listener question or shoutout...", style: { flex: 1 }, autoFocus: true, onKeyDown: function(e) { if (e.key === "Enter") add(); } }),
        React.createElement("button", { className: "btn primary sm", onClick: add }, "Add"),
        React.createElement("button", { className: "btn ghost sm", onClick: function() { setAddOpen(false); } }, "✕")),
      shoutouts.length === 0 && React.createElement("div", { style: { color: CZ_MUTED, fontStyle: "italic", fontSize: 14 } }, "Nothing to shout out yet."),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
        shoutouts.map(function(s) {
          return React.createElement("div", { key: s.id, style: { display: "flex", alignItems: "center", gap: 12, background: CZ_SURFACE, borderRadius: 10, padding: "12px 16px", opacity: s.answered ? 0.5 : 1 } },
            React.createElement("button", { onClick: function() { toggle(s.id); }, style: { width: 24, height: 24, borderRadius: "50%", border: "2px solid " + (s.answered ? CZ_TEAL : "var(--hair)"), background: s.answered ? CZ_TEAL : "transparent", cursor: "pointer", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14 } }, s.answered ? "✓" : ""),
            React.createElement("span", { style: { flex: 1, fontSize: 14, color: CZ_INK, textDecoration: s.answered ? "line-through" : "none" } }, s.text),
            isDM && React.createElement("button", { onClick: function() { del(s.id); }, style: { background: "none", border: "none", color: "#ff6060", cursor: "pointer", fontSize: 14 } }, "✕"));
        })));
  }

  // ---- Main component ----
  function ChatZeroes(props) {
    var chatStats = props.chatStats;
    var setChatStats = props.setChatStats;
    var awards = props.awards;
    var setAwards = props.setAwards;
    var quotes = props.quotes || [];
    var setQuotes = props.setQuotes;
    var deaths = props.deaths || [];
    var setDeaths = props.setDeaths;
    var predictions = props.predictions || [];
    var setPredictions = props.setPredictions;
    var gags = props.gags || [];
    var setGags = props.setGags;
    var shoutouts = props.shoutouts || [];
    var setShoutouts = props.setShoutouts;
    var party = props.party;

    var ctx = useContext(window.NZAuth.RoleContext);
    var isDM = ctx.role === "dm";

    var statEditState = useState(null);
    var statEdit = statEditState[0], setStatEdit = statEditState[1];

    var awardEditState = useState(null);
    var awardEdit = awardEditState[0], setAwardEdit = awardEditState[1];

    var winnerEditState = useState(null);
    var winnerEdit = winnerEditState[0], setWinnerEdit = winnerEditState[1];

    var quoteEditState = useState(null);
    var quoteEdit = quoteEditState[0], setQuoteEdit = quoteEditState[1];

    function saveQuote(q) {
      if (q.id) {
        setQuotes(function(qs) { return qs.map(function(x) { return x.id === q.id ? q : x; }); });
      } else {
        setQuotes(function(qs) { return [Object.assign({}, q, { id: "q" + Date.now() })].concat(qs); });
      }
      setQuoteEdit(null);
    }
    function deleteQuote(id) { setQuotes(function(qs) { return qs.filter(function(q) { return q.id !== id; }); }); }

    function saveStat(s) {
      if (s.id) {
        setChatStats(function(ss) { return ss.map(function(x) { return x.id === s.id ? s : x; }); });
      } else {
        setChatStats(function(ss) { return ss.concat([Object.assign({}, s, { id: "cs" + Date.now() })]); });
      }
      setStatEdit(null);
    }
    function deleteStat(id) {
      if (confirm("Remove this stat?")) {
        setChatStats(function(ss) { return ss.filter(function(s) { return s.id !== id; }); });
      }
    }
    function saveAward(a) {
      if (a.id) {
        setAwards(function(as) { return as.map(function(x) { return x.id === a.id ? Object.assign({}, x, a) : x; }); });
      } else {
        setAwards(function(as) { return as.concat([Object.assign({}, a, { id: "aw" + Date.now(), winners: [] })]); });
      }
      setAwardEdit(null);
    }
    function deleteAward(id) {
      if (confirm("Remove this award?")) {
        setAwards(function(as) { return as.filter(function(a) { return a.id !== id; }); });
      }
    }
    function addWinner(awardId, player) {
      var found = awards.find(function(a) { return a.id === awardId; });
      var session = found && found.winners ? found.winners.length + 1 : 1;
      setAwards(function(as) {
        return as.map(function(a) {
          if (a.id !== awardId) return a;
          return Object.assign({}, a, { winners: a.winners.concat([{ session: session, player: player }]) });
        });
      });
      setWinnerEdit(null);
    }
    function removeWinner(awardId, idx) {
      setAwards(function(as) {
        return as.map(function(a) {
          if (a.id !== awardId) return a;
          return Object.assign({}, a, { winners: a.winners.filter(function(_, i) { return i !== idx; }) });
        });
      });
    }

    return React.createElement("div", {
      style: { height: "100%", minHeight: 0, overflowY: "auto",
        background: "radial-gradient(ellipse 120% 60% at 50% -10%, rgba(255,78,205,0.18), transparent 60%), radial-gradient(ellipse 80% 50% at 80% 100%, rgba(0,229,204,0.12), transparent 60%), " + CZ_BG }
    },
      React.createElement("div", { style: { maxWidth: 1100, margin: "0 auto", padding: "28px 28px 60px" } },

        // ===== Animated hero header =====
        React.createElement("div", { style: { textAlign: "center", marginBottom: 36, position: "relative" } },
          // Big glowing ring behind title
          React.createElement("div", { style: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,78,205,0.12) 0%, transparent 70%)", pointerEvents: "none" } }),
          React.createElement("div", { style: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.45em", color: CZ_POP, marginBottom: 10, opacity: 0.85 } }, "✦  AFTERSHOW  ✦"),
          React.createElement("h1", { style: { fontFamily: "var(--display)", fontSize: 52, fontWeight: 700, margin: "0 0 4px",
            background: "linear-gradient(135deg, " + CZ_GOLD + " 0%, " + CZ_POP + " 45%, " + CZ_TEAL + " 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            textShadow: "none", letterSpacing: "0.04em", lineHeight: 1.05 } }, "THE CHAT ZEROES"),
          React.createElement("div", { style: { fontFamily: "var(--mono)", fontSize: 13, color: CZ_MUTED, marginTop: 10, letterSpacing: "0.06em" } },
            "Post-session chaos · bad takes · award ceremonies"),
          // Animated divider
          React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "16px auto 0", maxWidth: 320 } },
            React.createElement("div", { style: { flex: 1, height: 1, background: "linear-gradient(90deg, transparent, " + CZ_POP + "88)" } }),
            React.createElement("span", { style: { fontSize: 18, filter: "drop-shadow(0 0 8px " + CZ_POP + ")" } }, "🎙️"),
            React.createElement("div", { style: { flex: 1, height: 1, background: "linear-gradient(90deg, " + CZ_POP + "88, transparent)" } }))),

        React.createElement("div", { style: { marginBottom: 32 } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 } },
            React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 13, letterSpacing: "0.2em", color: CZ_TEAL, textTransform: "uppercase" } }, "Campaign Stats"),
            isDM && React.createElement("button", { onClick: function() { setStatEdit(false); }, style: czBtn(CZ_TEAL) },
              React.createElement(Icon, { name: "plus", size: 14 }), " Add stat")),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 } },
            chatStats.map(function(s) {
              return React.createElement(StatCard, { key: s.id, s: s, isDM: isDM,
                onEdit: function() { setStatEdit(s); },
                onDelete: function() { deleteStat(s.id); } });
            }))),

        React.createElement("div", null,
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 } },
            React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 13, letterSpacing: "0.2em", color: CZ_POP, textTransform: "uppercase" } }, "Awards & Honours"),
            isDM && React.createElement("button", { onClick: function() { setAwardEdit(false); }, style: czBtn(CZ_POP) },
              React.createElement(Icon, { name: "plus", size: 14 }), " New award")),
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
            awards.map(function(a) {
              return React.createElement(AwardCard, { key: a.id, award: a, isDM: isDM, party: party,
                onEdit: function() { setAwardEdit(a); },
                onDelete: function() { deleteAward(a.id); },
                onAddWinner: function() { setWinnerEdit(a); },
                onRemoveWinner: function(idx) { removeWinner(a.id, idx); } });
            }))),

        // ===== Quote Wall =====
        React.createElement("div", { style: { marginTop: 40 } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 } },
            React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 13, letterSpacing: "0.2em", color: CZ_GOLD, textTransform: "uppercase" } }, "💬 Quote Wall"),
            React.createElement("div", { style: { flex: 1, height: 1, background: CZ_GOLD + "33" } }),
            React.createElement("button", { onClick: function() { setQuoteEdit(false); }, style: czBtn(CZ_GOLD) },
              React.createElement(Icon, { name: "plus", size: 14 }), " Add quote")),
          quotes.length === 0
            ? React.createElement("div", { style: { textAlign: "center", padding: "40px 20px", color: CZ_MUTED, fontStyle: "italic", fontSize: 14 } },
                "No quotes yet. Add the first one — somebody definitely said something ridiculous this session.")
            : React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 } },
                quotes.map(function(q) {
                  return React.createElement("div", { key: q.id,
                    style: { background: CZ_SURFACE, borderRadius: 14, padding: 20,
                      border: "1px solid " + CZ_GOLD + "22",
                      borderLeft: "4px solid " + CZ_GOLD + "88",
                      position: "relative" }
                  },
                    isDM && React.createElement("div", { style: { position: "absolute", top: 10, right: 10, display: "flex", gap: 4 } },
                      React.createElement("button", { onClick: function() { setQuoteEdit(q); },
                        style: { background: "none", border: "none", color: CZ_MUTED, cursor: "pointer", fontSize: 14 } }, "✏️"),
                      React.createElement("button", { onClick: function() { deleteQuote(q.id); },
                        style: { background: "none", border: "none", color: "#ff6060", cursor: "pointer", fontSize: 14 } }, "🗑️")),
                    React.createElement("div", { style: { fontSize: 28, color: CZ_GOLD + "55", marginBottom: 6, fontFamily: "Georgia, serif", lineHeight: 1 } }, '"'),
                    React.createElement("div", { style: { fontSize: 14.5, color: CZ_INK, lineHeight: 1.55, fontStyle: "italic", marginBottom: 12 } }, q.text),
                    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                      React.createElement("span", { style: { color: CZ_POP, fontWeight: 700, fontSize: 13 } }, "— " + (q.speaker || "Unknown")),
                      q.session && React.createElement("span", { style: { color: CZ_MUTED, fontSize: 12 } }, q.session)));
                }))),

        React.createElement(DeathsSection, { deaths: deaths, setDeaths: setDeaths, isDM: isDM }),
        React.createElement(PredictionsSection, { predictions: predictions, setPredictions: setPredictions, isDM: isDM, party: party }),
        React.createElement(GagsSection, { gags: gags, setGags: setGags, isDM: isDM }),
        React.createElement(ShoutoutsSection, { shoutouts: shoutouts, setShoutouts: setShoutouts, isDM: isDM }),

        React.createElement(StatModal, {
          open: statEdit !== null, initial: statEdit || null,
          onClose: function() { setStatEdit(null); }, onSave: saveStat }),
        React.createElement(AwardModal, {
          open: awardEdit !== null, initial: awardEdit || null,
          onClose: function() { setAwardEdit(null); }, onSave: saveAward }),
        React.createElement(WinnerModal, {
          open: !!winnerEdit, award: winnerEdit, party: party,
          onClose: function() { setWinnerEdit(null); }, onSave: addWinner }),
        React.createElement(QuoteModal, {
          open: quoteEdit !== null, initial: quoteEdit || null, party: party,
          onClose: function() { setQuoteEdit(null); }, onSave: saveQuote })
      )
    );
  }

  window.ChatZeroes = ChatZeroes;
})();
