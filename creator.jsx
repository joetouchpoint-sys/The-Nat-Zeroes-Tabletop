/* CHARACTER CREATOR v2 — smooth 3D avatar, categorized customization */
(function () {
  const { useState, useRef, useEffect } = React;
  const Icon = window.Icon;
  const A = window.Avatar3D;

  const COLORLIST = {
    skin: "skin", hairColor: "hairColor", facialHairColor: "hairColor", eyeColor: "eyeColor",
    primary: "primary", secondary: "secondary", trim: "trim", capeColor: "secondary",
  };

  function lsGet(key, fb) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch(e) { return fb; } }
  function lsSave(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }

  function Creator({ party, onSave }) {
    const [roster, setRoster] = useState(() => {
      const base = party.map((p) => ({ id: p.id, name: p.name, ring: p.ring, avatar: Object.assign({}, A.DEFAULT, p.avatar) }));
      const saved = lsGet("nz_avatars", {});
      // Restore NZAVATARS global on load
      window.NZAVATARS = window.NZAVATARS || {};
      base.forEach((r) => {
        if (saved[r.id]) {
          r.avatar = saved[r.id].avatar || r.avatar;
          r.name = saved[r.id].name || r.name;
          window.NZAVATARS[r.id] = r.avatar;
        }
      });
      return base;
    });
    const [activeId, setActiveId] = useState(party[0].id);
    const active = roster.find((r) => r.id === activeId);
    const [cfg, setCfg] = useState(active.avatar);
    const [name, setName] = useState(active.name);
    const [tab, setTab] = useState("body");
    const [saved, setSaved] = useState(false);

    const mountRef = useRef(null);
    const viewerRef = useRef(null);

    useEffect(() => {
      if (!window.THREE) return;
      const v = A.makeViewer(mountRef.current, cfg, { spin: false });
      viewerRef.current = v;
      return () => v.dispose();
    }, []);
    useEffect(() => { viewerRef.current && viewerRef.current.update(cfg); }, [cfg]);

    function selectChar(r) { setActiveId(r.id); setCfg(r.avatar); setName(r.name); setSaved(false); }
    function set(k, v) { setCfg((c) => ({ ...c, [k]: v })); setSaved(false); }
    function randomize() { setCfg(A.randomConfig()); setSaved(false); }
    function resetToDefault() { if (confirm("Reset this character to a blank default?")) { setCfg({ ...A.DEFAULT }); setSaved(false); } }
    function save() {
      const updated = roster.map((r) => r.id === activeId ? { ...r, name, avatar: cfg } : r);
      setRoster(updated);
      window.NZAVATARS = window.NZAVATARS || {};
      window.NZAVATARS[activeId] = cfg;
      // Persist all avatar configs to localStorage
      const toStore = {};
      updated.forEach((r) => { toStore[r.id] = { name: r.name, avatar: r.avatar }; });
      lsSave("nz_avatars", toStore);
      setSaved(true); onSave && onSave({ id: activeId, name, avatar: cfg });
      setTimeout(() => setSaved(false), 2200);
    }
    function newChar() {
      const id = "c" + Date.now();
      const fresh = { id, name: "New Hero", ring: "#9170f0", avatar: A.randomConfig() };
      setRoster((rs) => [...rs, fresh]); setActiveId(id); setCfg(fresh.avatar); setName(fresh.name); setSaved(false);
    }

    const group = A.GROUPS.find((g) => g.id === tab);
    const noThree = !window.THREE;

    return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 388px", height: "100%", minHeight: 0 } },
      // ===== stage =====
      React.createElement("div", { style: { position: "relative", minWidth: 0, background: "radial-gradient(120% 100% at 50% 0%, #241b38, #0d0a14)", display: "flex", flexDirection: "column" } },
        React.createElement("div", { style: { position: "absolute", top: 16, left: 20, zIndex: 3 } },
          React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.22em", color: "var(--ink-dim)" } }, "LIVE 3D PREVIEW"),
          React.createElement("div", { className: "muted", style: { fontSize: 12, marginTop: 3 } }, "Drag to rotate \u00b7 scroll to zoom")),
        noThree
          ? React.createElement("div", { className: "center muted", style: { flex: 1, flexDirection: "column", gap: 10 } }, React.createElement(Icon, { name: "user", size: 40 }), "3D engine failed to load.")
          : React.createElement("div", { ref: mountRef, style: { flex: 1, minHeight: 0 } }),
        React.createElement("div", { style: { position: "absolute", bottom: 78, left: "50%", transform: "translateX(-50%)", zIndex: 3, display: "flex", gap: 10 } },
          React.createElement("button", { className: "btn", onClick: randomize }, React.createElement(Icon, { name: "dice", size: 16 }), "Randomize"),
          React.createElement("button", { className: "btn ghost", onClick: resetToDefault }, "↺ Reset"),
          React.createElement("button", { className: "btn", onClick: () => viewerRef.current && viewerRef.current.resetView() }, React.createElement(Icon, { name: "settings", size: 16 }), "Camera"),
          React.createElement("button", { className: "btn", onClick: () => {
            if (!viewerRef.current) return;
            const canvas = viewerRef.current.getCanvas && viewerRef.current.getCanvas();
            const renderer = viewerRef.current._renderer;
            const target = canvas || (renderer && renderer.domElement);
            if (!target) return;
            const a = document.createElement("a");
            a.href = target.toDataURL("image/png");
            a.download = (name || "avatar") + ".png";
            a.click();
          } }, React.createElement(Icon, { name: "upload", size: 16 }), "Save PNG")),
        React.createElement("div", { style: { borderTop: "1px solid var(--hair)", background: "rgba(13,10,20,0.7)", display: "flex", gap: 10, padding: 12, overflowX: "auto", alignItems: "center" } },
          roster.map((r) => React.createElement("button", { key: r.id, onClick: () => selectChar(r), style: rosterChip(r.id === activeId, r.ring) },
            React.createElement(window.NZUI.Token, { name: r.name, ring: r.ring, size: 30 }),
            React.createElement("span", { style: { fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" } }, r.name.split(" ")[0]))),
          React.createElement("button", { className: "btn sm ghost", style: { flex: "none" }, onClick: newChar }, React.createElement(Icon, { name: "plus", size: 15 }), "New"))),

      // ===== controls =====
      React.createElement("div", { style: { borderLeft: "1px solid var(--hair)", background: "var(--bg-2)", display: "flex", flexDirection: "column", minHeight: 0 } },
        React.createElement("div", { style: { padding: "16px 18px 12px", borderBottom: "1px solid var(--hair)" } },
          React.createElement("div", { className: "field" }, React.createElement("label", null, "Character name"),
            React.createElement("input", { className: "input", value: name, onChange: (e) => { setName(e.target.value); setSaved(false); } }))),
        // category tabs
        React.createElement("div", { style: { display: "flex", gap: 4, padding: "10px 12px", borderBottom: "1px solid var(--hair)", overflowX: "auto" } },
          A.GROUPS.map((gr) => React.createElement("button", { key: gr.id, onClick: () => setTab(gr.id), style: catTab(tab === gr.id) }, gr.label))),
        // controls
        React.createElement("div", { style: { flex: 1, overflow: "auto", padding: "16px 18px" } },
          group.controls.map(([key, label, type]) => renderControl(key, label, type, cfg, set))),
        React.createElement("div", { style: { padding: 16, borderTop: "1px solid var(--hair)", background: "var(--bg-2)" } },
          React.createElement("button", { className: "btn primary", style: { width: "100%", justifyContent: "center" }, onClick: save },
            React.createElement(Icon, { name: saved ? "check" : "save", size: 17 }), saved ? "Saved to roster!" : "Save character")))
    );
  }

  function renderControl(key, label, type, cfg, set) {
    if (type === "chips") return chips(key, label, A.OPTIONS[key], cfg[key], (v) => set(key, v));
    if (type === "color") return colors(key, label, A.OPTIONS[COLORLIST[key]], cfg[key], (v) => set(key, v));
    if (type === "slider") return slider(key, label, cfg[key], 0.82, 1.18, (v) => set(key, v));
    if (type === "toggle") return toggle(key, label, cfg[key], (v) => set(key, v));
    return null;
  }

  function chips(key, label, options, value, onChange) {
    return React.createElement("div", { key, className: "field", style: { marginBottom: 16 } },
      React.createElement("label", null, label),
      React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
        (options || []).map((o) => React.createElement("button", { key: o.id, onClick: () => onChange(o.id), style: chipStyle(value === o.id) }, o.label))));
  }
  function colors(key, label, list, value, onChange) {
    return React.createElement("div", { key, className: "field", style: { marginBottom: 16 } },
      React.createElement("label", null, label),
      React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 7 } },
        (list || []).map((c) => React.createElement("button", { key: c, onClick: () => onChange(c), title: c,
          style: { width: 30, height: 30, borderRadius: 8, background: c, cursor: "pointer", border: value === c ? "2px solid var(--ink)" : "2px solid rgba(255,255,255,0.12)", boxShadow: value === c ? `0 0 10px ${c}` : "none" } }))));
  }
  function slider(key, label, value, min, max, onChange) {
    return React.createElement("div", { key, className: "field", style: { marginBottom: 16 } },
      React.createElement("div", { className: "row", style: { justifyContent: "space-between" } },
        React.createElement("label", null, label), React.createElement("span", { className: "mono", style: { fontSize: 12, color: "var(--gold)" } }, Math.round(value * 100) + "%")),
      React.createElement("input", { type: "range", min, max, step: 0.01, value, onChange: (e) => onChange(+e.target.value), style: { width: "100%", accentColor: "var(--gold)" } }));
  }
  function toggle(key, label, value, onChange) {
    return React.createElement("div", { key, className: "row", style: { justifyContent: "space-between", marginBottom: 16, cursor: "pointer" }, onClick: () => onChange(!value) },
      React.createElement("label", { style: { cursor: "pointer", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-dim)", fontFamily: "var(--display)" } }, label),
      React.createElement("div", { style: { width: 44, height: 24, borderRadius: 100, background: value ? "var(--gold)" : "var(--surface-3)", position: "relative", transition: "background .15s" } },
        React.createElement("div", { style: { position: "absolute", top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .15s" } })));
  }
  function chipStyle(active) {
    return { padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
      border: `1px solid ${active ? "var(--gold-deep)" : "var(--hair)"}`, background: active ? "rgba(232,181,74,0.16)" : "var(--surface-2)", color: active ? "var(--gold-bright)" : "var(--ink-soft)" };
  }
  function catTab(active) {
    return { padding: "8px 13px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", flex: "none",
      border: "1px solid " + (active ? "var(--gold-deep)" : "transparent"), background: active ? "rgba(232,181,74,0.14)" : "transparent", color: active ? "var(--gold-bright)" : "var(--ink-dim)" };
  }
  function rosterChip(active, ring) {
    return { display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px", borderRadius: 100, cursor: "pointer", flex: "none",
      border: `1px solid ${active ? "var(--gold-deep)" : "var(--hair)"}`, background: active ? "rgba(232,181,74,0.12)" : "var(--surface)", color: active ? "var(--gold-bright)" : "var(--ink-soft)" };
  }

  window.Creator = Creator;
})();
