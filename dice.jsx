/* Dice tray — 3D CSS dice with per-player themes, Nat20/Nat1 flair */
(function () {
  const { useState, useRef, useEffect } = React;
  const Icon = window.Icon;

  const DICE = [20, 12, 10, 8, 6, 4, 100];

  // ---- dice themes ----
  const THEMES = {
    standard:  { label: "Standard",   emoji: "🎲", bg: "linear-gradient(145deg,#2e2448,#16112a)", border: "#e8b54a", text: "#f7d278", shadow: "0 0 18px rgba(232,181,74,0.35)" },
    fuzzy:     { label: "Fuzzy Pink", emoji: "🩷", bg: "radial-gradient(circle at 36% 32%,#ffaed9,#d94490)", border: "#ff80c8", text: "#fff", shadow: "0 0 24px rgba(255,80,180,0.6)" },
    fiery:     { label: "Fiery",      emoji: "🔥", bg: "radial-gradient(circle at 40% 28%,#ff7020,#8a1400)", border: "#ff9944", text: "#fff0c0", shadow: "0 0 28px rgba(255,80,0,0.7)" },
    crystal:   { label: "Crystal",    emoji: "💎", bg: "linear-gradient(145deg,rgba(80,170,255,0.22),rgba(40,100,200,0.12))", border: "rgba(160,220,255,0.85)", text: "#c8f0ff", shadow: "0 0 24px rgba(60,160,255,0.55)", glass: true },
    bone:      { label: "Bone",       emoji: "🦴", bg: "radial-gradient(circle at 38% 30%,#f4e8cc,#c8a870)", border: "#a07838", text: "#2a1a08", shadow: "0 0 14px rgba(180,140,60,0.3)" },
    amethyst:  { label: "Amethyst",   emoji: "💜", bg: "radial-gradient(circle at 36% 30%,#a070ff,#520090)", border: "#c090ff", text: "#f0e0ff", shadow: "0 0 26px rgba(160,80,255,0.65)" },
    shadow:    { label: "Shadow",     emoji: "🌑", bg: "radial-gradient(circle at 38% 32%,#3a3060,#0a0810)", border: "rgba(180,160,255,0.25)", text: "rgba(200,180,255,0.85)", shadow: "0 0 20px rgba(80,60,180,0.5)" },
    acid:      { label: "Acid",       emoji: "☣️",  bg: "radial-gradient(circle at 40% 30%,#90ff40,#2a5a00)", border: "#80ef30", text: "#1a2a08", shadow: "0 0 26px rgba(120,240,40,0.6)" },
  };

  function roll(sides) { return 1 + Math.floor(Math.random() * sides); }

  // face transforms for CSS 3D cube
  const FACE_CLS = ["f1","f2","f3","f4","f5","f6"];
  // Final rotations to show result face (base + added to animation end)
  // animation ends at roughly rotateX(900deg) rotateY(600deg)
  // To show face N up: add offsets (in multiples of 90 mod 360 effective)
  const FACE_OFFSETS = [
    { rx: 0,   ry: 0   }, // face 1 = front (z+)
    { rx: 0,   ry: 180 }, // face 2 = back
    { rx: 0,   ry: -90 }, // face 3 = right (x+)
    { rx: 0,   ry: 90  }, // face 4 = left
    { rx: 90,  ry: 0   }, // face 5 = bottom (y-)
    { rx: -90, ry: 0   }, // face 6 = top (y+)
  ];
  // Numbers on a standard die (opposite faces sum to 7)
  const FACE_NUMS = [1, 6, 2, 5, 3, 4];

  // Map any die result (mod 6, 1-indexed) to a face
  function resultToFace(result, sides) {
    const n = ((result - 1) % 6) + 1;
    return FACE_NUMS.indexOf(n);
  }

  // ---- Die3D component ----
  function Die3D({ theme, result, sides, rolling, onDone }) {
    const t = THEMES[theme] || THEMES.standard;
    const [phase, setPhase] = useState("rolling"); // rolling | settling | done

    useEffect(() => {
      if (!rolling) return;
      setPhase("rolling");
      const t1 = setTimeout(() => setPhase("settling"), 1100);
      const t2 = setTimeout(() => { setPhase("done"); onDone && onDone(); }, 2600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [rolling]);

    if (phase === "done") return null;

    const faceIdx = resultToFace(result, sides);
    const off = FACE_OFFSETS[faceIdx] || FACE_OFFSETS[0];
    // final rotation ends with these values applied over animation base
    const exRot = `rotateX(${900 + off.rx}deg) rotateY(${600 + off.ry}deg) rotateZ(300deg)`;
    const faceStyle = (i) => Object.assign({
      background: t.bg, border: `2px solid ${t.border}`,
      color: t.text, fontFamily: "var(--display)", fontWeight: 900, fontSize: 22,
      backdropFilter: t.glass ? "blur(8px)" : "none",
      boxShadow: `inset 0 0 20px rgba(0,0,0,0.4), inset 0 2px 6px rgba(255,255,255,0.08)`,
    }, {});

    const dieAnimStyle = {
      "--dx": "-100px", "--dy": "-60px",
      "--ex": `${900 + off.rx}deg`, "--ey": `${600 + off.ry}deg`, "--ez": "300deg",
      animation: phase === "rolling" ? "diceThrow 1.1s cubic-bezier(0.2,1,0.35,1) forwards" : "none",
      transform: phase === "settling" ? `rotateX(${900 + off.rx}deg) rotateY(${600 + off.ry}deg) rotateZ(300deg)` : undefined,
      boxShadow: t.shadow,
      borderRadius: 12,
    };

    return React.createElement("div", { className: "die-wrap" },
      React.createElement("div", { className: "die-3d", style: dieAnimStyle },
        FACE_CLS.map((cls, i) =>
          React.createElement("div", { key: cls, className: `die-face ${cls}`, style: faceStyle(i) },
            FACE_NUMS[i]))));
  }

  // ---- Theme picker ----
  function ThemePicker({ current, onChange, onClose }) {
    return React.createElement("div", { style: { padding: "12px 14px", borderTop: "1px solid var(--hair)", background: "var(--bg-2)" } },
      React.createElement("div", { className: "row", style: { justifyContent: "space-between", marginBottom: 10 } },
        React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-dim)", textTransform: "uppercase" } }, "Your Dice Theme"),
        React.createElement("button", { className: "icon-btn", style: { width: 26, height: 26 }, onClick: onClose }, React.createElement(Icon, { name: "x", size: 13 }))),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 } },
        Object.entries(THEMES).map(([id, t]) =>
          React.createElement("button", { key: id, onClick: () => onChange(id),
            style: { padding: "8px 4px", borderRadius: 10, cursor: "pointer", textAlign: "center",
              border: `1px solid ${current === id ? t.border : "var(--hair)"}`,
              background: current === id ? t.bg : "var(--surface-2)",
              boxShadow: current === id ? t.shadow : "none",
              transition: "all .15s" } },
            React.createElement("div", { style: { fontSize: 16, marginBottom: 3 } }, t.emoji),
            React.createElement("div", { style: { fontSize: 10.5, fontWeight: 600, color: current === id ? t.text : "var(--ink-dim)", fontFamily: "var(--display)" } }, t.label)))));
  }

  // ---- Main DiceTray ----
  function DiceTray({ open, onClose }) {
    const [die, setDie] = useState(20);
    const [count, setCount] = useState(1);
    const [mod, setMod] = useState(0);
    const [mode, setMode] = useState("normal");
    const [log, setLog] = useState(() => { try { const v = localStorage.getItem("nz_dicelog"); return v ? JSON.parse(v) : []; } catch(e) { return []; } });
    const [rolling, setRolling] = useState(false);
    const [flash, setFlash] = useState(null);
    const [showThemes, setShowThemes] = useState(false);
    const [theme, setTheme] = useState(() => window.NZDICE?.theme || "standard");
    const [lastResult, setLastResult] = useState({ value: 20, sides: 20 });
    const [dieRolling, setDieRolling] = useState(false);
    const idRef = useRef(0);

    // persist theme choice
    useEffect(() => { window.NZDICE = window.NZDICE || {}; window.NZDICE.theme = theme; }, [theme]);

    function doRoll() {
      setRolling(true);
      setDieRolling(false);
      setTimeout(() => {
        let rolls = [], total = 0, crit = null;
        if (die === 20 && mode !== "normal") {
          const a = roll(20), b = roll(20);
          const pick = mode === "adv" ? Math.max(a, b) : Math.min(a, b);
          rolls = [{ v: a, used: mode === "adv" ? a >= b : a <= b }, { v: b, used: mode === "adv" ? b > a : b < a }];
          total = pick + mod;
          if (pick === 20) crit = "nat20"; if (pick === 1) crit = "nat1";
          setLastResult({ value: pick, sides: 20 });
        } else {
          for (let i = 0; i < count; i++) { const v = roll(die); rolls.push({ v, used: true }); total += v; }
          total += mod;
          if (die === 20 && count === 1) { if (rolls[0].v === 20) crit = "nat20"; if (rolls[0].v === 1) crit = "nat1"; }
          setLastResult({ value: rolls[0].v, sides: die });
        }
        const entry = {
          id: ++idRef.current,
          label: `${mode !== "normal" && die === 20 ? (mode === "adv" ? "ADV " : "DIS ") : count + ""}d${die}${mod ? (mod > 0 ? " +" + mod : " " + mod) : ""}`,
          rolls, total, crit, who: "You", t: "just now",
        };
        setLog((l) => { const next = [entry, ...l].slice(0, 30); try { localStorage.setItem("nz_dicelog", JSON.stringify(next)); } catch(e) {} return next; });
        if (crit) { setFlash(crit); setTimeout(() => setFlash(null), 1400); }
        setRolling(false);
        setDieRolling(true);
        if (window.NZSounds) window.NZSounds.play(crit === "nat20" ? "crit" : crit === "nat1" ? "nat1" : "dice");
        window.dispatchEvent(new CustomEvent("nz:dice", { detail: { result: entry.total, die, theme, crit, rolls: rolls.map(r=>r.v) } }));
      }, 480);
    }

    const t = THEMES[theme] || THEMES.standard;

    if (!open) return null;

    return React.createElement("div", { className: "dice-tray panel rise", style: trayStyle },
      // header
      React.createElement("div", { className: "panel-h", style: { padding: "13px 16px" } },
        React.createElement("div", { style: { width: 28, height: 28, borderRadius: 8, background: t.bg, border: `1px solid ${t.border}`, boxShadow: t.shadow, display: "grid", placeItems: "center", fontSize: 14, flexShrink: 0 } }, t.emoji),
        React.createElement("h3", { style: { fontSize: 14 } }, "Dice Tray"),
        React.createElement("div", { className: "spacer" }),
        React.createElement("button", { title: "Customise dice skin", className: "icon-btn", style: { width: 32, height: 32, marginRight: 4 }, onClick: () => setShowThemes((s) => !s) }, React.createElement(Icon, { name: "sparkle", size: 15 })),
        React.createElement("button", { className: "icon-btn", style: { width: 32, height: 32 }, onClick: onClose }, React.createElement(Icon, { name: "x", size: 16 }))),

      // theme picker (collapsible)
      showThemes && React.createElement(ThemePicker, { current: theme, onChange: (id) => { setTheme(id); setShowThemes(false); }, onClose: () => setShowThemes(false) }),

      // 3D die preview inside tray (shown after roll)
      dieRolling && React.createElement("div", { style: { position: "relative", height: 90, display: "grid", placeItems: "center", overflow: "hidden", borderTop: "1px solid var(--hair)", background: "rgba(13,10,20,0.6)" } },
        React.createElement("div", { style: { position: "absolute", inset: 0, background: `radial-gradient(80% 100% at 50% 100%, ${t.border}18, transparent)` } }),
        React.createElement("div", { style: { transform: "scale(1.15)" } },
          React.createElement(Die3D, { theme, result: lastResult.value, sides: lastResult.sides, rolling: dieRolling, onDone: () => setDieRolling(false) }))),

      // dice picker
      React.createElement("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7 } },
          DICE.map((d) => React.createElement("button", { key: d, onClick: () => setDie(d), style: dieBtn(die === d, t) }, "d" + d))),
        // count + mod + mode
        React.createElement("div", { className: "row", style: { gap: 10 } },
          React.createElement(Stepper, { label: "Dice", value: count, set: (v) => setCount(Math.max(1, Math.min(12, v))), disabled: mode !== "normal" && die === 20 }),
          React.createElement(Stepper, { label: "Modifier", value: mod, set: setMod, signed: true })),
        React.createElement("div", { className: "row", style: { gap: 6 } },
          ["normal","adv","dis"].map((m) => React.createElement("button", { key: m, onClick: () => setMode(m), style: modeBtn(mode === m, m) },
            m === "normal" ? "Normal" : m === "adv" ? "Advantage" : "Disadvantage"))),
        React.createElement("button", { className: "btn primary", style: { width: "100%", justifyContent: "center", padding: "12px", boxShadow: t.shadow }, onClick: doRoll, disabled: rolling },
          React.createElement(Icon, { name: rolling ? "settings" : "dice", size: 18, style: rolling ? { animation: "spin360 .5s linear infinite" } : null }),
          rolling ? "Rolling…" : "Roll")),
      // result flash
      flash && React.createElement("div", { style: flashStyle(flash, t) }, flash === "nat20" ? "NAT 20!" : "NAT 1…"),
      // log
      React.createElement("div", { style: { borderTop: "1px solid var(--hair)", maxHeight: 230, overflow: "auto" } },
        log.length === 0 && React.createElement("div", { className: "muted", style: { padding: 20, textAlign: "center", fontSize: 13 } }, "No rolls yet. May the odds ignore you."),
        log.map((e) => React.createElement(LogRow, { key: e.id, e }))));
  }

  function LogRow({ e }) {
    const col = e.crit === "nat20" ? "var(--gold-bright)" : e.crit === "nat1" ? "var(--red-bright)" : "var(--ink)";
    return React.createElement("div", { className: "rise", style: { padding: "10px 16px", borderBottom: "1px solid var(--hair)", display: "flex", alignItems: "center", gap: 10 } },
      React.createElement("div", { className: "col", style: { flex: 1, minWidth: 0 } },
        React.createElement("div", { className: "mono", style: { fontSize: 12, color: "var(--ink-dim)" } }, e.label),
        React.createElement("div", { className: "row", style: { gap: 5, marginTop: 3, flexWrap: "wrap" } },
          e.rolls.map((r, i) => React.createElement("span", { key: i, className: "mono",
            style: { fontSize: 12, padding: "1px 6px", borderRadius: 5, background: r.used ? "var(--surface-2)" : "transparent",
              color: r.used ? "var(--ink-soft)" : "var(--ink-faint)", textDecoration: r.used ? "none" : "line-through", border: "1px solid var(--hair)" } }, r.v)))),
      React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 700, fontSize: 22, color: col, textShadow: e.crit ? `0 0 14px ${col}` : "none", minWidth: 38, textAlign: "right" } }, e.total));
  }

  function Stepper({ label, value, set, signed, disabled }) {
    return React.createElement("div", { className: "field", style: { flex: 1, opacity: disabled ? 0.4 : 1 } },
      React.createElement("label", null, label),
      React.createElement("div", { className: "row", style: { gap: 0, border: "1px solid var(--hair-2)", borderRadius: "var(--r)", overflow: "hidden", background: "var(--bg)" } },
        React.createElement("button", { onClick: () => !disabled && set(value - 1), style: stepBtn }, "−"),
        React.createElement("div", { className: "mono", style: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: 700, color: "var(--ink)" } }, signed && value >= 0 ? "+" + value : value),
        React.createElement("button", { onClick: () => !disabled && set(value + 1), style: stepBtn }, "+")));
  }

  const trayStyle = { position: "absolute", right: 18, bottom: 18, width: 330, zIndex: 40, boxShadow: "var(--shadow-3)" };
  const stepBtn = { width: 34, height: 38, border: "none", background: "var(--surface-2)", color: "var(--ink-soft)", cursor: "pointer", fontSize: 18, fontWeight: 700 };
  function dieBtn(active, t) {
    return { padding: "11px 0", borderRadius: 9, cursor: "pointer", fontFamily: "var(--display)", fontWeight: 700, fontSize: 15,
      border: `1px solid ${active ? t.border : "var(--hair-2)"}`,
      background: active ? t.bg : "var(--surface-2)",
      color: active ? t.text : "var(--ink-soft)",
      boxShadow: active ? t.shadow : "none",
      transition: "all .15s" };
  }
  function modeBtn(active, m) {
    const c = m === "adv" ? "var(--emerald)" : m === "dis" ? "var(--red-bright)" : "var(--gold)";
    return { flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
      border: `1px solid ${active ? c : "var(--hair)"}`, background: active ? `${c}1c` : "transparent", color: active ? c : "var(--ink-dim)" };
  }
  function flashStyle(kind, t) {
    const c = kind === "nat20" ? t.text || "var(--gold-bright)" : "var(--red-bright)";
    const shadow = kind === "nat20" ? `0 0 30px ${t.border}, 0 0 10px ${t.border}` : "0 0 30px var(--red), 0 0 10px var(--red)";
    return { position: "absolute", top: "44%", left: 0, right: 0, textAlign: "center", pointerEvents: "none",
      fontFamily: "var(--display)", fontWeight: 700, fontSize: 40, color: c,
      textShadow: shadow, animation: "pop-in .3s ease both", zIndex: 50 };
  }

  window.DiceTray = DiceTray;
  window.NZDICE_THEMES = THEMES;
})();
