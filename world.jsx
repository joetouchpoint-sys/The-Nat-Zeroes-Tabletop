/* WORLD MAP — discovered locations, draggable pins, custom background */
(function () {
  const { useState, useContext, useRef } = React;

  function compressImage(dataUrl, maxPx, quality, cb) {
    const img = new Image();
    img.onload = function() {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      cv.getContext("2d").drawImage(img, 0, 0, w, h);
      cb(cv.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  }
  const Icon = window.Icon;
  const { Modal } = window.NZUI;

  const TYPES = {
    town:     { label: "Town", icon: "home", color: "#e8b54a" },
    dungeon:  { label: "Dungeon", icon: "skull", color: "#e8412e" },
    wild:     { label: "Wilds", icon: "hex", color: "#4fb98a" },
    ruin:     { label: "Ruin", icon: "layers", color: "#9170f0" },
    landmark: { label: "Landmark", icon: "pin", color: "#4ea7e8" },
  };

  function World({ locations: initLocs, maps, onOpenMap, bgImg, onBgImgChange }) {
    const ctx = useContext(window.NZAuth.RoleContext);
    const canEdit = window.NZAuth.can(ctx.role, "editWorld");
    const [locs, setLocs] = useState(initLocs);
    const [sel, setSel] = useState(null);
    const [addOpen, setAddOpen] = useState(false);
    const [editLoc, setEditLoc] = useState(null);
    const bgInputRef = useRef(null);
    const mapContainerRef = useRef(null);
    const dragRef = useRef(null);

    const discovered = locs.filter((l) => l.discovered);
    const visible = canEdit ? locs : discovered;

    function toggleDiscovered(id) { setLocs((ls) => ls.map((l) => l.id === id ? { ...l, discovered: !l.discovered } : l)); }
    function saveLoc(loc) {
      setLocs((ls) => ls.some((l) => l.id === loc.id) ? ls.map((l) => l.id === loc.id ? loc : l) : [...ls, loc]);
      setAddOpen(false); setEditLoc(null);
    }
    function deleteLoc(id) { setLocs((ls) => ls.filter((l) => l.id !== id)); setSel(null); }

    function handleBgUpload(e) {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        // Compress to max 1200px JPEG so it fits in localStorage (~300KB)
        compressImage(ev.target.result, 1200, 0.82, (compressed) => {
          onBgImgChange && onBgImgChange(compressed);
        });
      };
      reader.readAsDataURL(file);
    }

    // Pin drag handlers
    function onPinPointerDown(e, loc) {
      if (!canEdit) return;
      e.preventDefault(); e.stopPropagation();
      const rect = mapContainerRef.current.getBoundingClientRect();
      dragRef.current = { id: loc.id, startX: e.clientX, startY: e.clientY, origX: loc.x, origY: loc.y, rectW: rect.width, rectH: rect.height };
      window.addEventListener("pointermove", onMapPointerMove);
      window.addEventListener("pointerup", onMapPointerUp);
    }
    function onMapPointerMove(e) {
      if (!dragRef.current) return;
      const d = dragRef.current;
      const dx = (e.clientX - d.startX) / d.rectW * 100;
      const dy = (e.clientY - d.startY) / d.rectH * 100;
      const nx = Math.max(2, Math.min(98, d.origX + dx));
      const ny = Math.max(2, Math.min(98, d.origY + dy));
      setLocs((ls) => ls.map((l) => l.id === d.id ? { ...l, x: nx, y: ny } : l));
    }
    function onMapPointerUp() {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMapPointerMove);
      window.removeEventListener("pointerup", onMapPointerUp);
    }

    const selLoc = locs.find((l) => l.id === sel);

    return React.createElement("div", { style: { display: "grid", gridTemplateColumns: selLoc ? "1fr 360px" : "1fr", height: "100%", minHeight: 0 } },
      // ===== map stage =====
      React.createElement("div", { ref: mapContainerRef, style: { position: "relative", minWidth: 0, overflow: "hidden", background: "#0c1418" } },
        React.createElement(WorldCanvas, { bgImg }),
        // top bar
        React.createElement("div", { style: { position: "absolute", top: 16, left: 20, right: 20, zIndex: 5, display: "flex", alignItems: "center", gap: 12 } },
          React.createElement("div", { className: "col" },
            React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.22em", color: "var(--ink-dim)" } }, "THE REALM OF"),
            React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 22, fontWeight: 700, background: "linear-gradient(180deg, var(--gold-bright), var(--gold-deep))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } }, "Aldermoor")),
          React.createElement("div", { className: "grow" }),
          React.createElement("span", { className: "tag gold" }, discovered.length + " / " + locs.length + " discovered"),
          canEdit && React.createElement(React.Fragment, null,
            React.createElement("input", { ref: bgInputRef, type: "file", accept: "image/*", hidden: true, onChange: handleBgUpload }),
            React.createElement("button", { className: "btn sm ghost", onClick: () => bgInputRef.current.click() }, React.createElement(Icon, { name: "upload", size: 15 }), "Map image"),
            React.createElement("button", { className: "btn sm primary", onClick: () => setAddOpen(true) }, React.createElement(Icon, { name: "plus", size: 15 }), "Add location"))),
        // routes
        React.createElement("svg", { style: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 } },
          routePairs(discovered).map(([a, b], i) => React.createElement("line", { key: i, x1: a.x + "%", y1: a.y + "%", x2: b.x + "%", y2: b.y + "%",
            stroke: "rgba(232,181,74,0.35)", strokeWidth: 1.5, strokeDasharray: "5 6" }))),
        // pins
        visible.map((l) => React.createElement(Pin, { key: l.id, loc: l, active: sel === l.id,
          onClick: () => setSel(l.id === sel ? null : l.id),
          onPointerDown: canEdit ? (e) => onPinPointerDown(e, l) : null })),
        // drag hint
        canEdit && React.createElement("div", { style: { position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)", zIndex: 5, fontSize: 11.5, color: "var(--ink-dim)", background: "rgba(12,20,24,0.7)", border: "1px solid var(--hair)", borderRadius: 100, padding: "5px 14px", backdropFilter: "blur(6px)", pointerEvents: "none" } }, "Drag pins to reposition"),
        // legend
        React.createElement("div", { style: { position: "absolute", bottom: 16, left: 20, zIndex: 5, display: "flex", gap: 14, flexWrap: "wrap", background: "rgba(12,20,24,0.7)", border: "1px solid var(--hair)", borderRadius: 10, padding: "8px 14px", backdropFilter: "blur(6px)" } },
          Object.entries(TYPES).map(([k, t]) => React.createElement("div", { key: k, className: "row", style: { gap: 6, fontSize: 12, color: "var(--ink-soft)" } },
            React.createElement("span", { style: { width: 9, height: 9, borderRadius: "50%", background: t.color } }), t.label)))),

      // ===== detail panel =====
      selLoc && React.createElement(LocationPanel, { loc: selLoc, maps, canEdit, onClose: () => setSel(null), onOpenMap,
        onToggleDiscovered: () => toggleDiscovered(selLoc.id),
        onEdit: () => setEditLoc(selLoc),
        onDelete: () => deleteLoc(selLoc.id) }),

      // modals
      React.createElement(LocationForm, { open: addOpen || !!editLoc, loc: editLoc, maps, onClose: () => { setAddOpen(false); setEditLoc(null); }, onSave: saveLoc })
    );
  }

  function WorldCanvas({ bgImg }) {
    return React.createElement("div", { style: { position: "absolute", inset: 0, zIndex: 1,
      background: bgImg
        ? `url(${bgImg}) center/cover no-repeat`
        : `radial-gradient(60% 50% at 38% 64%, rgba(58,74,46,0.95), transparent 70%),
           radial-gradient(45% 42% at 64% 42%, rgba(74,66,44,0.9), transparent 72%),
           radial-gradient(30% 34% at 78% 64%, rgba(50,60,52,0.85), transparent 70%),
           radial-gradient(26% 30% at 22% 26%, rgba(70,80,96,0.7), transparent 72%),
           radial-gradient(120% 120% at 50% 50%, #16323a, #0b171c)` } },
      !bgImg && React.createElement("div", { style: { position: "absolute", inset: 0, opacity: 0.5,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "64px 64px" } }),
      React.createElement("div", { style: { position: "absolute", inset: 0, boxShadow: "inset 0 0 200px rgba(0,0,0,0.7)" } }));
  }

  function Pin({ loc, active, onClick, onPointerDown }) {
    const t = TYPES[loc.type] || TYPES.landmark;
    const undiscovered = !loc.discovered;
    return React.createElement("button", { onClick, onPointerDown,
      style: { position: "absolute", left: loc.x + "%", top: loc.y + "%", transform: "translate(-50%,-100%)", zIndex: active ? 8 : 6,
        background: "none", border: "none", cursor: onPointerDown ? "grab" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        touchAction: "none" } },
      React.createElement("div", { style: { display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)",
        background: undiscovered ? "rgba(40,40,50,0.85)" : `radial-gradient(circle at 40% 35%, ${t.color}, ${t.color}99)`,
        border: `2px solid ${undiscovered ? "var(--ink-faint)" : "#fff8"}`,
        boxShadow: active ? `0 0 0 4px ${t.color}55, 0 4px 14px rgba(0,0,0,0.6)` : "0 4px 14px rgba(0,0,0,0.6)" } },
        React.createElement("div", { style: { transform: "rotate(45deg)", color: undiscovered ? "var(--ink-dim)" : "#fff", display: "grid", placeItems: "center" } },
          React.createElement(Icon, { name: undiscovered ? "search" : t.icon, size: 18 }))),
      React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 12.5, fontWeight: 600, color: undiscovered ? "var(--ink-dim)" : "var(--ink)", background: "rgba(12,20,24,0.75)", padding: "2px 9px", borderRadius: 100, whiteSpace: "nowrap", border: "1px solid var(--hair)" } },
        undiscovered ? "Undiscovered" : loc.name));
  }

  function LocationPanel({ loc, maps, canEdit, onClose, onOpenMap, onToggleDiscovered, onEdit, onDelete }) {
    const t = TYPES[loc.type] || TYPES.landmark;
    // Include custom maps when looking up linked map objects
    const allMapsForPanel = maps.concat((function() { try { return JSON.parse(localStorage.getItem("nz_custommaps") || "[]"); } catch(e) { return []; } })());
    const locMaps = loc.maps.map((id) => allMapsForPanel.find((m) => m.id === id)).filter(Boolean);
    return React.createElement("div", { style: { borderLeft: "1px solid var(--hair)", background: "var(--bg-2)", display: "flex", flexDirection: "column", minHeight: 0, overflow: "auto" } },
      React.createElement("div", { className: "panel-h", style: { borderRadius: 0 } },
        React.createElement("span", { style: { color: t.color } }, React.createElement(Icon, { name: t.icon, size: 18 })),
        React.createElement("h3", { style: { color: t.color } }, t.label),
        React.createElement("div", { className: "spacer" }),
        React.createElement("button", { className: "icon-btn", style: { width: 30, height: 30 }, onClick: onClose }, React.createElement(Icon, { name: "x", size: 15 }))),
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 16 } },
        React.createElement("h2", { style: { fontSize: 22, color: "var(--ink)" } }, loc.name),
        !loc.discovered && React.createElement("span", { className: "tag", style: { alignSelf: "flex-start" } }, "Undiscovered · hidden from players"),
        React.createElement("p", { className: "muted", style: { margin: 0, fontSize: 14, lineHeight: 1.6 } }, loc.desc),
        React.createElement("div", { className: "section-title", style: { margin: "4px 0 0" } }, "Saved maps · " + locMaps.length),
        locMaps.length === 0 && React.createElement("div", { className: "muted", style: { fontSize: 13 } }, "No maps saved here yet."),
        locMaps.map((m) => React.createElement("div", { key: m.id, className: "panel", style: { overflow: "hidden" } },
          React.createElement(MapThumb, { bg: m.bg, img: m.img }),
          React.createElement("div", { style: { padding: 12 } },
            React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 600, fontSize: 14.5 } }, m.name),
            React.createElement("div", { className: "muted", style: { fontSize: 12, marginTop: 2 } }, `${m.cols}×${m.rows} grid`),
            React.createElement("div", { className: "row", style: { gap: 8, marginTop: 12 } },
              React.createElement("button", { className: "btn primary sm grow", onClick: () => onOpenMap && onOpenMap(m.id) }, React.createElement(Icon, { name: "play", size: 14 }), "Open at table"))))),
        canEdit && React.createElement("div", { className: "row", style: { gap: 8, marginTop: 4, flexWrap: "wrap" } },
          React.createElement("button", { className: "btn grow", onClick: onEdit }, React.createElement(Icon, { name: "settings", size: 15 }), "Edit"),
          React.createElement("button", { className: "btn", onClick: onToggleDiscovered }, React.createElement(Icon, { name: loc.discovered ? "eyeOff" : "eye", size: 15 }), loc.discovered ? "Hide" : "Reveal"),
          React.createElement("button", { className: "btn ghost", onClick: () => confirm("Delete this location?") && onDelete(), style: { color: "var(--red-bright)" } }, React.createElement(Icon, { name: "skull", size: 15 }), "Delete")))
    );
  }

  function MapThumb({ bg, img }) {
    const bgs = {
      tavern: "repeating-linear-gradient(0deg,#3a2410 0 10px,#4a2e14 10px 20px)",
      dungeon: "repeating-linear-gradient(90deg,#2a2530 0 1px,transparent 1px 14px),repeating-linear-gradient(0deg,#2a2530 0 1px,transparent 1px 14px),#1b1820",
      forest: "radial-gradient(20px 20px at 30% 40%,#2a5a30,transparent),radial-gradient(28px 28px at 70% 60%,#1e4a28,transparent),#16280f",
      cave: "radial-gradient(40px at 40% 50%,#36465f,transparent),#12141c",
    };
    return React.createElement("div", { style: { height: 90, background: img ? `url(${img}) center/cover` : (bgs[bg] || "#1b1820"), borderBottom: "1px solid var(--hair)" } });
  }

  function LocationForm({ open, loc, maps, onClose, onSave }) {
    // Include custom uploaded maps from localStorage so they can be linked to locations
    const allMaps = maps.concat((function() { try { return JSON.parse(localStorage.getItem("nz_custommaps") || "[]"); } catch(e) { return []; } })());
    const blank = { id: "loc" + Date.now(), name: "", type: "town", discovered: true, x: 50, y: 50, maps: [], desc: "" };
    const [f, setF] = useState(blank);
    React.useEffect(() => { if (open) setF(loc ? { ...loc } : { ...blank, id: "loc" + Date.now() }); }, [open]);
    function up(k, v) { setF((s) => ({ ...s, [k]: v })); }
    function toggleMap(id) { setF((s) => ({ ...s, maps: s.maps.includes(id) ? s.maps.filter((m) => m !== id) : [...s.maps, id] })); }
    return React.createElement(Modal, { open, onClose, title: loc ? "Edit Location" : "Add a Location", sub: "The pin will appear in the map centre — drag it into position after saving.", w: 520 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 16 } },
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Name"),
          React.createElement("input", { className: "input", value: f.name, onChange: (e) => up("name", e.target.value), placeholder: "e.g. Port Marrow", autoFocus: true })),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Type"),
          React.createElement("div", { className: "row", style: { gap: 6, flexWrap: "wrap" } },
            Object.entries(TYPES).map(([k, t]) => React.createElement("button", { key: k, onClick: () => up("type", k), style: typeChip(f.type === k, t.color) }, React.createElement(Icon, { name: t.icon, size: 14 }), t.label)))),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Linked battle maps"),
          React.createElement("div", { className: "row", style: { gap: 6, flexWrap: "wrap" } },
            allMaps.map((m) => React.createElement("button", { key: m.id, onClick: () => toggleMap(m.id), style: typeChip(f.maps.includes(m.id), "var(--gold)") }, m.name)))),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Description"),
          React.createElement("textarea", { className: "input", rows: 3, value: f.desc, onChange: (e) => up("desc", e.target.value) })),
        React.createElement("label", { className: "row", style: { gap: 8, cursor: "pointer", fontSize: 14 } },
          React.createElement("input", { type: "checkbox", checked: f.discovered, onChange: (e) => up("discovered", e.target.checked) }), "Discovered (visible to players)"),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary", disabled: !f.name, onClick: () => onSave(f) }, React.createElement(Icon, { name: "check", size: 16 }), loc ? "Save changes" : "Add location")))
    );
  }

  function routePairs(locs) {
    const pairs = [];
    for (let i = 0; i < locs.length - 1; i++) pairs.push([locs[i], locs[i + 1]]);
    return pairs;
  }
  function typeChip(active, color) {
    return { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
      border: `1px solid ${active ? color : "var(--hair)"}`, background: active ? color + "1e" : "var(--surface-2)", color: active ? color : "var(--ink-soft)" };
  }

  window.World = World;
})();
