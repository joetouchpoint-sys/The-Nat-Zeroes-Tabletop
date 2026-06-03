/* WORLD MAP — zoom, 3D tilt, parchment border, clouds, custom paths */
(function () {
  const { useState, useContext, useRef, useEffect } = React;

  // Inject cloud animation CSS
  if (!document.getElementById("nz-world-css")) {
    const s = document.createElement("style"); s.id = "nz-world-css";
    s.textContent = "@keyframes wdrift1{0%,100%{transform:translateX(0) scaleX(1)}50%{transform:translateX(4%) scaleX(1.04)}} @keyframes wdrift2{0%,100%{transform:translateX(0) translateY(0)}50%{transform:translateX(-3%) translateY(1%)}} @keyframes wdrift3{0%,100%{transform:translateX(0)}50%{transform:translateX(5%)}}";
    document.head.appendChild(s);
  }

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
    town:     { label: "Town",    icon: "home",    color: "#e8b54a" },
    dungeon:  { label: "Dungeon", icon: "skull",   color: "#e8412e" },
    wild:     { label: "Wilds",   icon: "hex",     color: "#4fb98a" },
    ruin:     { label: "Ruin",    icon: "layers",  color: "#9170f0" },
    landmark: { label: "Landmark",icon: "pin",     color: "#4ea7e8" },
  };

  const PATH_COLORS = ["#e8b54a", "#4ea7e8", "#e8412e", "#4fb98a", "#9170f0", "#f4eddd"];

  function World({ locations: initLocs, maps, onOpenMap, bgImg, onBgImgChange, customPaths, setCustomPaths, worldMapName, setWorldMapName }) {
    const ctx = useContext(window.NZAuth.RoleContext);
    const canEdit = window.NZAuth.can(ctx.role, "editWorld");
    const [editingName, setEditingName] = useState(false);
    const [hoveredPath, setHoveredPath] = useState(null); // path id currently hovered
    const [locs, setLocs] = useState(initLocs);
    const [sel, setSel] = useState(null);
    const [addOpen, setAddOpen] = useState(false);
    const [editLoc, setEditLoc] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [is3d, setIs3d] = useState(false);
    const [pathingFrom, setPathingFrom] = useState(null);
    const [pathColor, setPathColor] = useState("#e8b54a");
    const [drawingPath, setDrawingPath] = useState(false);
    const waypointDragRef = useRef(null); // {pathId, idx, startX, startY, origX, origY, rectW, rectH}
    const segmentDragRef = useRef(null);  // {pathId, segIdx, startX, startY, rectW, rectH} — drag segment to add bend
    const bgInputRef = useRef(null);
    const mapContainerRef = useRef(null);
    const dragRef = useRef(null);

    const discovered = locs.filter((l) => l.discovered);
    const visible = canEdit ? locs : discovered;
    const paths = customPaths || [];

    function toggleDiscovered(id) { setLocs((ls) => ls.map((l) => l.id === id ? { ...l, discovered: !l.discovered } : l)); }
    function saveLoc(loc) {
      setLocs((ls) => ls.some((l) => l.id === loc.id) ? ls.map((l) => l.id === loc.id ? loc : l) : [...ls, loc]);
      setAddOpen(false); setEditLoc(null);
    }
    function deleteLoc(id) { setLocs((ls) => ls.filter((l) => l.id !== id)); setSel(null); }

    function handleBgUpload(e) {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { compressImage(ev.target.result, 1200, 0.82, (c) => { onBgImgChange && onBgImgChange(c); }); };
      reader.readAsDataURL(file);
    }

    // Mouse wheel zoom
    useEffect(() => {
      const el = mapContainerRef.current;
      if (!el) return;
      function onWheel(e) { e.preventDefault(); setZoom((z) => Math.max(0.4, Math.min(3, z - e.deltaY * 0.001))); }
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    }, []);

    // Pin drag (adjust for zoom)
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
      // Divide by zoom so drag distance maps correctly to percentage space
      const dx = (e.clientX - d.startX) / (d.rectW * zoom) * 100;
      const dy = (e.clientY - d.startY) / (d.rectH * zoom) * 100;
      const nx = Math.max(2, Math.min(98, d.origX + dx));
      const ny = Math.max(2, Math.min(98, d.origY + dy));
      setLocs((ls) => ls.map((l) => l.id === d.id ? { ...l, x: nx, y: ny } : l));
    }
    function onMapPointerUp() {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMapPointerMove);
      window.removeEventListener("pointerup", onMapPointerUp);
    }

    // Path drawing: click first pin, then click second pin → instant straight path
    function handlePinClick(locId) {
      if (drawingPath && canEdit) {
        if (!pathingFrom) { setPathingFrom(locId); return; }
        if (pathingFrom === locId) { setPathingFrom(null); return; } // cancel
        // Create path immediately (no waypoints — user drags segments to add bends)
        setCustomPaths && setCustomPaths((ps) => [...ps, { id: "p" + Date.now(), from: pathingFrom, to: locId, color: pathColor, waypoints: [] }]);
        setPathingFrom(null);
        return;
      }
      setSel(locId === sel ? null : locId);
    }

    // Drag an existing WAYPOINT to reposition it
    function onWaypointPointerDown(e, pathId, idx) {
      if (!canEdit) return;
      e.preventDefault(); e.stopPropagation();
      const rect = mapContainerRef.current.getBoundingClientRect();
      const path = paths.find((p) => p.id === pathId);
      const wp = path && path.waypoints && path.waypoints[idx];
      if (!wp) return;
      waypointDragRef.current = { pathId, idx, startX: e.clientX, startY: e.clientY, origX: wp.x, origY: wp.y, rectW: rect.width, rectH: rect.height };
      window.addEventListener("pointermove", onWaypointMove);
      window.addEventListener("pointerup", onWaypointUp);
    }
    function onWaypointMove(e) {
      const d = waypointDragRef.current; if (!d) return;
      const cx = d.rectW / 2, cy = d.rectH / 2;
      const dx = (e.clientX - d.startX) / (d.rectW * zoom) * 100;
      const dy = (e.clientY - d.startY) / (d.rectH * zoom) * 100;
      const nx = Math.max(1, Math.min(99, d.origX + dx));
      const ny = Math.max(1, Math.min(99, d.origY + dy));
      setCustomPaths && setCustomPaths((ps) => ps.map((p) => {
        if (p.id !== d.pathId) return p;
        const wps = [...(p.waypoints || [])]; wps[d.idx] = { x: nx, y: ny };
        return { ...p, waypoints: wps };
      }));
    }
    function onWaypointUp() { waypointDragRef.current = null; window.removeEventListener("pointermove", onWaypointMove); window.removeEventListener("pointerup", onWaypointUp); }

    // Drag a PATH SEGMENT to insert a new waypoint (bend the path)
    function onSegmentPointerDown(e, pathId, segIdx, midX, midY) {
      if (!canEdit) return;
      e.preventDefault(); e.stopPropagation();
      const rect = mapContainerRef.current.getBoundingClientRect();
      // Insert a new waypoint at the midpoint of the dragged segment
      setCustomPaths && setCustomPaths((ps) => ps.map((p) => {
        if (p.id !== pathId) return p;
        const wps = [...(p.waypoints || [])];
        wps.splice(segIdx, 0, { x: midX, y: midY });
        return { ...p, waypoints: wps };
      }));
      // Now drag this new waypoint (it's at segIdx in the updated array)
      waypointDragRef.current = { pathId, idx: segIdx, startX: e.clientX, startY: e.clientY, origX: midX, origY: midY, rectW: rect.width, rectH: rect.height };
      window.addEventListener("pointermove", onWaypointMove);
      window.addEventListener("pointerup", onWaypointUp);
    }

    function deletePath(id) { setCustomPaths && setCustomPaths((ps) => ps.filter((p) => p.id !== id)); }

    const selLoc = locs.find((l) => l.id === sel);

    // Map inner style (zoom + 3D)
    const innerStyle = {
      // In 3D mode: the WHOLE map card (background + content) tilts together as one unit
      // Scaled down to 80% so the tilted card fits within the container
      ...(is3d ? {
        position: "absolute", inset: 0, zIndex: 1,
        transform: `scale(${zoom * 0.80}) perspective(1000px) rotateX(36deg)`,
        transformOrigin: "center 58%",
        transition: "transform 0.35s ease",
        border: "10px solid #5c3a1e",
        borderRadius: 8,
        boxShadow: "0 -30px 80px rgba(0,0,0,0.5), 0 0 0 12px #3d2210, 0 30px 60px rgba(0,0,0,0.6)",
        overflow: "hidden",
      } : {
        position: "absolute", inset: 0, zIndex: 1,
        transform: `scale(${zoom})`,
        transformOrigin: "center center",
        transition: "transform 0.35s ease",
      })
    };

    return React.createElement("div", { style: { display: "grid", gridTemplateColumns: selLoc ? "1fr 360px" : "1fr", height: "100%", minHeight: 0 } },
      // ===== Map stage =====
      // Outer container: shows "table" around the tilted map card in 3D
      React.createElement("div", { ref: mapContainerRef, style: { position: "relative", minWidth: 0, overflow: "hidden",
        background: is3d
          ? "radial-gradient(ellipse 80% 60% at 50% 70%, #1e1008, #080504)"
          : "#0c1418" } },
        // The map card — in 3D mode tilts as one unit (WorldCanvas + content together)
        React.createElement("div", { style: innerStyle },
          // WorldCanvas: background of the map card
          React.createElement(WorldCanvas, { bgImg, is3d }),
          // Ambient cloud layer
          React.createElement(CloudLayer, null),
          // Routes (auto + custom) — viewBox 0-100 coordinate space
          React.createElement("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none",
            style: { position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 2, overflow: "visible" } },
            // Auto routes — road-like double stroke
            routePairs(discovered).map(([a, b], i) => React.createElement(React.Fragment, { key: "auto" + i },
              React.createElement("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: "#3a2810", strokeWidth: 1.0, vectorEffect: "non-scaling-stroke" }),
              React.createElement("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: "#c4a060", strokeWidth: 0.45, vectorEffect: "non-scaling-stroke" }))),
            // Preview while selecting second pin
            pathingFrom && (function() {
              const fromLoc = locs.find((l) => l.id === pathingFrom);
              if (!fromLoc) return null;
              return React.createElement("circle", { cx: fromLoc.x, cy: fromLoc.y, r: 2, fill: pathColor, opacity: 0.9, vectorEffect: "non-scaling-stroke" });
            })(),
            // Custom paths — road-like double stroke, solid
            paths.map((p) => {
              const fromLoc = locs.find((l) => l.id === p.from);
              const toLoc = locs.find((l) => l.id === p.to);
              if (!fromLoc || !toLoc) return null;
              const wps = p.waypoints || [];
              const allPts = [[fromLoc.x, fromLoc.y], ...wps.map((w) => [w.x, w.y]), [toLoc.x, toLoc.y]];
              const midIdx = Math.floor(allPts.length / 2);
              const [mx, my] = allPts[midIdx];
              const col = p.color || "#c4a060";
              const ptStr = allPts.map(([x, y]) => x + " " + y).join(" ");
              return React.createElement(React.Fragment, { key: p.id },
                // Invisible wider hit area for hovering
                canEdit && React.createElement("polyline", { points: ptStr, fill: "none", stroke: "transparent", strokeWidth: 4, style: { cursor: "pointer" },
                  onMouseEnter: () => setHoveredPath(p.id), onMouseLeave: () => setHoveredPath(null) }),
                // Dark outline (road edge)
                React.createElement("polyline", { points: ptStr, fill: "none", stroke: "#1a0e04", strokeWidth: 2.2, strokeLinejoin: "round", vectorEffect: "non-scaling-stroke",
                  onMouseEnter: canEdit ? () => setHoveredPath(p.id) : undefined, onMouseLeave: canEdit ? () => setHoveredPath(null) : undefined }),
                // Light fill (road surface — earthy tan)
                React.createElement("polyline", { points: ptStr, fill: "none", stroke: col, strokeWidth: 1.1, strokeLinejoin: "round", vectorEffect: "non-scaling-stroke" }),
                // Delete × at midpoint (always visible)
                canEdit && React.createElement("circle", { cx: mx, cy: my, r: 2, fill: "rgba(20,14,28,0.92)", stroke: col, strokeWidth: 0.4, style: { cursor: "pointer" }, onClick: (e) => { e.stopPropagation(); deletePath(p.id); } }),
                canEdit && React.createElement("text", { x: mx, y: my + 0.35, textAnchor: "middle", dominantBaseline: "middle", fontSize: 2.6, fill: "#fff", style: { cursor: "pointer", userSelect: "none" }, onClick: (e) => { e.stopPropagation(); deletePath(p.id); } }, "×"),
                // Segment bend handles — ONLY when hovering this path
                canEdit && hoveredPath === p.id && allPts.slice(0, -1).map(([ax, ay], si) => {
                  const [bx, by] = allPts[si + 1];
                  const smx = (ax + bx) / 2, smy = (ay + by) / 2;
                  return React.createElement("circle", { key: "s" + si, cx: smx, cy: smy, r: 0.7, fill: col, stroke: "rgba(255,255,255,0.6)", strokeWidth: 0.25, style: { cursor: "grab" }, onPointerDown: (e) => onSegmentPointerDown(e, p.id, si, smx, smy) });
                }),
                // Waypoint handles — ONLY when hovering this path
                canEdit && hoveredPath === p.id && wps.map((wp, i) => React.createElement("circle", { key: "w" + i, cx: wp.x, cy: wp.y, r: 1.1, fill: col, stroke: "#fff", strokeWidth: 0.35, style: { cursor: "grab" }, onPointerDown: (e) => onWaypointPointerDown(e, p.id, i) })));
            }).filter(Boolean)),
          // Parchment border overlay
          React.createElement(ParchmentBorder, null),
          // Pins
          visible.map((l) => React.createElement(Pin, { key: l.id, loc: l,
            active: sel === l.id || pathingFrom === l.id,
            isPathingFrom: pathingFrom === l.id,
            onClick: () => handlePinClick(l.id),
            onPointerDown: canEdit && !drawingPath ? (e) => onPinPointerDown(e, l) : null }))),

        // ===== Top controls bar =====
        React.createElement("div", { style: { position: "absolute", top: 16, left: 20, right: 20, zIndex: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
          React.createElement("div", { className: "col" },
            React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.22em", color: "var(--ink-dim)" } }, "THE REALM OF"),
            editingName && canEdit
              ? React.createElement("input", { autoFocus: true, className: "input", defaultValue: worldMapName || "Aldermoor",
                  style: { fontFamily: "var(--display)", fontSize: 20, fontWeight: 700, height: 34, padding: "0 8px", maxWidth: 200, background: "rgba(13,10,20,0.8)" },
                  onBlur: (e) => { if (setWorldMapName) setWorldMapName(e.target.value || "Aldermoor"); setEditingName(false); },
                  onKeyDown: (e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingName(false); } })
              : React.createElement("div", { onClick: canEdit ? () => setEditingName(true) : undefined,
                  title: canEdit ? "Click to rename" : undefined,
                  style: { fontFamily: "var(--display)", fontSize: 22, fontWeight: 700, background: "linear-gradient(180deg, var(--gold-bright), var(--gold-deep))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", cursor: canEdit ? "text" : "default" } },
                  worldMapName || "Aldermoor")),
          React.createElement("div", { className: "grow" }),
          // Zoom controls
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4, background: "rgba(13,10,20,0.8)", border: "1px solid var(--hair)", borderRadius: 100, padding: "4px 8px", backdropFilter: "blur(6px)" } },
            React.createElement("button", { onClick: () => setZoom((z) => Math.max(0.4, z - 0.2)), style: { background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px" } }, "−"),
            React.createElement("span", { style: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-dim)", minWidth: 32, textAlign: "center" } }, Math.round(zoom * 100) + "%"),
            React.createElement("button", { onClick: () => setZoom((z) => Math.min(3, z + 0.2)), style: { background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px" } }, "+"),
            React.createElement("button", { onClick: () => setZoom(1), style: { background: "none", border: "none", color: "var(--ink-dim)", cursor: "pointer", fontSize: 10, padding: "0 4px" } }, "↺")),
          // 3D toggle
          React.createElement("button", { className: "btn sm" + (is3d ? " primary" : " ghost"), onClick: () => setIs3d((x) => !x) },
            React.createElement(Icon, { name: "layers", size: 14 }), is3d ? "2D" : "3D"),
          React.createElement("span", { className: "tag gold" }, discovered.length + " / " + locs.length + " discovered"),
          canEdit && React.createElement(React.Fragment, null,
            React.createElement("input", { ref: bgInputRef, type: "file", accept: "image/*", hidden: true, onChange: handleBgUpload }),
            bgImg && React.createElement("button", { className: "btn sm ghost", onClick: () => onBgImgChange && onBgImgChange(null), title: "Clear custom background" },
              React.createElement(Icon, { name: "x", size: 13 }), "Clear bg"),
            React.createElement("button", { className: "btn sm ghost", onClick: () => bgInputRef.current.click() },
              React.createElement(Icon, { name: "upload", size: 14 }), "Map image"),
            // Path drawing mode
            React.createElement("button", { className: "btn sm" + (drawingPath ? " primary" : " ghost"),
              title: drawingPath ? "Click first pin, then click second pin to draw path. After creating, drag midpoint dots on the path to bend it." : "Draw a path between locations",
              onClick: () => { setDrawingPath((x) => !x); setPathingFrom(null); } },
              "〜 " + (drawingPath ? (pathingFrom ? "click end pin…" : "click start pin…") : "Draw path")),
            drawingPath && React.createElement("div", { style: { display: "flex", gap: 4 } },
              PATH_COLORS.map((c) => React.createElement("button", { key: c, onClick: () => setPathColor(c),
                style: { width: 18, height: 18, borderRadius: "50%", background: c, border: "2px solid " + (pathColor === c ? "#fff" : "transparent"), cursor: "pointer" } }))),
            React.createElement("button", { className: "btn sm primary", onClick: () => setAddOpen(true) },
              React.createElement(Icon, { name: "plus", size: 14 }), "Add location"))),

        // ===== Legend =====
        React.createElement("div", { style: { position: "absolute", bottom: 16, left: 20, zIndex: 10, display: "flex", gap: 12, flexWrap: "wrap", background: "rgba(12,20,24,0.7)", border: "1px solid var(--hair)", borderRadius: 10, padding: "7px 14px", backdropFilter: "blur(6px)" } },
          Object.entries(TYPES).map(([k, t]) => React.createElement("div", { key: k, className: "row", style: { gap: 5, fontSize: 11.5, color: "var(--ink-soft)" } },
            React.createElement("span", { style: { width: 9, height: 9, borderRadius: "50%", background: t.color } }), t.label)))),

      // ===== Detail panel =====
      selLoc && React.createElement(LocationPanel, { loc: selLoc, maps, canEdit, onClose: () => setSel(null), onOpenMap,
        onToggleDiscovered: () => toggleDiscovered(selLoc.id),
        onEdit: () => setEditLoc(selLoc),
        onDelete: () => deleteLoc(selLoc.id) }),

      // Modals
      React.createElement(LocationForm, { open: addOpen || !!editLoc, loc: editLoc, maps, onClose: () => { setAddOpen(false); setEditLoc(null); }, onSave: saveLoc })
    );
  }

  // Parchment border overlay
  function ParchmentBorder() {
    return React.createElement("div", { style: {
      position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none",
      boxShadow: "inset 0 0 0 12px #8a6030, inset 0 0 0 14px #c9a060, inset 0 0 60px rgba(100,65,20,0.85), inset 0 0 140px rgba(80,50,15,0.6)",
      borderRadius: 4,
    } },
      // Torn/rough inner edge using radial gradient
      React.createElement("div", { style: {
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 90% 85% at 50% 50%, transparent 70%, rgba(100,65,20,0.55) 85%, rgba(70,40,10,0.8) 100%)",
        pointerEvents: "none",
      } }),
      // Corner decorations
      ["top-left","top-right","bottom-left","bottom-right"].map((pos, i) => React.createElement("div", { key: pos, style: {
        position: "absolute",
        top: pos.includes("top") ? 6 : "auto", bottom: pos.includes("bottom") ? 6 : "auto",
        left: pos.includes("left") ? 6 : "auto", right: pos.includes("right") ? 6 : "auto",
        width: 28, height: 28, borderRadius: "50%",
        background: "radial-gradient(circle, #c9a06088 0%, #8a603066 60%, transparent 100%)",
        border: "1px solid #c9a06055",
      } })));
  }

  // Ambient cloud layer
  function CloudLayer() {
    const clouds = [
      { top: "12%", left: "8%",  w: 140, h: 45, op: 0.12, dur: "22s", anim: "wdrift1" },
      { top: "28%", left: "55%", w: 180, h: 55, op: 0.09, dur: "30s", anim: "wdrift2" },
      { top: "65%", left: "20%", w: 120, h: 38, op: 0.1,  dur: "18s", anim: "wdrift3" },
      { top: "72%", left: "68%", w: 160, h: 50, op: 0.08, dur: "25s", anim: "wdrift1" },
      { top: "45%", left: "3%",  w: 100, h: 35, op: 0.11, dur: "20s", anim: "wdrift2" },
      { top: "15%", left: "75%", w: 130, h: 42, op: 0.09, dur: "28s", anim: "wdrift3" },
    ];
    return React.createElement("div", { style: { position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" } },
      clouds.map((c, i) => React.createElement("div", { key: i, style: {
        position: "absolute", top: c.top, left: c.left,
        width: c.w, height: c.h, borderRadius: "50%",
        background: "rgba(255,255,255," + c.op + ")",
        filter: "blur(18px)",
        animation: c.anim + " " + c.dur + " ease-in-out infinite",
        animationDelay: (i * 3) + "s",
      } })));
  }

  // World background canvas
  function WorldCanvas({ bgImg, is3d }) {
    // Outdoor fantasy camp background for 3D mode
    const outdoorBg = [
      "radial-gradient(circle at 50% 90%, rgba(180,90,20,0.55) 0%, transparent 35%)", // campfire glow on ground
      "radial-gradient(ellipse 80% 40% at 50% 95%, rgba(100,55,10,0.5) 0%, transparent 60%)", // ground
      "radial-gradient(ellipse 12% 70% at 5% 60%, rgba(20,50,10,0.9) 0%, transparent 100%)",  // tree left
      "radial-gradient(ellipse 10% 60% at 95% 55%, rgba(20,50,10,0.9) 0%, transparent 100%)", // tree right
      "radial-gradient(ellipse 8% 50% at 15% 70%, rgba(15,40,8,0.85) 0%, transparent 100%)",  // tree mid-left
      "radial-gradient(ellipse 7% 45% at 82% 68%, rgba(15,40,8,0.85) 0%, transparent 100%)",  // tree mid-right
      "radial-gradient(ellipse 20% 25% at 50% 100%, rgba(80,45,10,0.6) 0%, transparent 100%)", // path/earth
      "linear-gradient(180deg, #06080a 0%, #0a1008 25%, #0d1a0a 50%, #142808 75%, #1a3010 100%)", // sky+forest
    ].join(", ");
    return React.createElement("div", { style: { position: "absolute", inset: 0, zIndex: 1,
      background: bgImg
        ? "url(" + bgImg + ") center/cover no-repeat"
        : (is3d ? outdoorBg : "radial-gradient(60% 50% at 38% 64%, rgba(58,74,46,0.95), transparent 70%), radial-gradient(45% 42% at 64% 42%, rgba(74,66,44,0.9), transparent 72%), radial-gradient(120% 120% at 50% 50%, #16323a, #0b171c)") } },
      !bgImg && React.createElement("div", { style: { position: "absolute", inset: 0, opacity: 0.45,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "64px 64px" } }),
      React.createElement("div", { style: { position: "absolute", inset: 0, boxShadow: "inset 0 0 120px rgba(0,0,0,0.5)" } }));
  }

  function Pin({ loc, active, isPathingFrom, onClick, onPointerDown }) {
    const t = TYPES[loc.type] || TYPES.landmark;
    const undiscovered = !loc.discovered;
    return React.createElement("button", { onClick, onPointerDown,
      style: { position: "absolute", left: loc.x + "%", top: loc.y + "%", transform: "translate(-50%,-100%)", zIndex: active ? 8 : 6,
        background: "none", border: "none", cursor: onPointerDown ? "grab" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        touchAction: "none", filter: isPathingFrom ? "drop-shadow(0 0 8px " + t.color + ")" : "none" } },
      React.createElement("div", { style: { display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)",
        background: undiscovered ? "rgba(40,40,50,0.85)" : "radial-gradient(circle at 40% 35%, " + t.color + ", " + t.color + "99)",
        border: "2px solid " + (undiscovered ? "var(--ink-faint)" : "#fff8"),
        boxShadow: active ? "0 0 0 4px " + t.color + "55, 0 4px 14px rgba(0,0,0,0.6)" : "0 4px 14px rgba(0,0,0,0.6)" } },
        React.createElement("div", { style: { transform: "rotate(45deg)", color: undiscovered ? "var(--ink-dim)" : "#fff", display: "grid", placeItems: "center" } },
          React.createElement(Icon, { name: undiscovered ? "search" : t.icon, size: 18 }))),
      React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 12.5, fontWeight: 600, color: undiscovered ? "var(--ink-dim)" : "var(--ink)", background: "rgba(12,20,24,0.75)", padding: "2px 9px", borderRadius: 100, whiteSpace: "nowrap", border: "1px solid var(--hair)" } },
        undiscovered ? "Undiscovered" : loc.name));
  }

  function LocationPanel({ loc, maps, canEdit, onClose, onOpenMap, onToggleDiscovered, onEdit, onDelete }) {
    const t = TYPES[loc.type] || TYPES.landmark;
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
          React.createElement("div", { style: { height: 80, background: m.img ? "url(" + m.img + ") center/cover" : "#1b1820", borderBottom: "1px solid var(--hair)" } }),
          React.createElement("div", { style: { padding: 12 } },
            React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 600, fontSize: 14.5 } }, m.name),
            React.createElement("div", { className: "muted", style: { fontSize: 12, marginTop: 2 } }, m.cols + "×" + m.rows + " grid"),
            React.createElement("div", { className: "row", style: { gap: 8, marginTop: 12 } },
              React.createElement("button", { className: "btn primary sm grow", onClick: () => onOpenMap && onOpenMap(m.id) }, React.createElement(Icon, { name: "play", size: 14 }), "Open at table"))))),
        canEdit && React.createElement("div", { className: "row", style: { gap: 8, marginTop: 4, flexWrap: "wrap" } },
          React.createElement("button", { className: "btn grow", onClick: onEdit }, React.createElement(Icon, { name: "settings", size: 15 }), "Edit"),
          React.createElement("button", { className: "btn", onClick: onToggleDiscovered }, React.createElement(Icon, { name: loc.discovered ? "eyeOff" : "eye", size: 15 }), loc.discovered ? "Hide" : "Reveal"),
          React.createElement("button", { className: "btn ghost", onClick: () => confirm("Delete this location?") && onDelete(), style: { color: "var(--red-bright)" } }, React.createElement(Icon, { name: "skull", size: 15 }), "Delete")))
    );
  }

  function LocationForm({ open, loc, maps, onClose, onSave }) {
    const allMaps = maps.concat((function() { try { return JSON.parse(localStorage.getItem("nz_custommaps") || "[]"); } catch(e) { return []; } })());
    const blank = { id: "loc" + Date.now(), name: "", type: "town", discovered: true, x: 50, y: 50, maps: [], desc: "" };
    const [f, setF] = useState(blank);
    React.useEffect(() => { if (open) setF(loc ? { ...loc } : { ...blank, id: "loc" + Date.now() }); }, [open]);
    function up(k, v) { setF((s) => ({ ...s, [k]: v })); }
    function toggleMap(id) { setF((s) => ({ ...s, maps: s.maps.includes(id) ? s.maps.filter((m) => m !== id) : [...s.maps, id] })); }
    return React.createElement(Modal, { open, onClose, title: loc ? "Edit Location" : "Add a Location", sub: "Pin appears at map centre — drag it into position after saving.", w: 520 },
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
      border: "1px solid " + (active ? color : "var(--hair)"), background: active ? color + "1e" : "var(--surface-2)", color: active ? color : "var(--ink-soft)" };
  }

  window.World = World;
})();
