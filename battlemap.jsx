/* THE TABLE — battle map with draggable tokens, fog of war, measure, ping */
(function () {
  const { useState, useRef, useEffect, useCallback, useContext } = React;
  function lsGet(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch(e) { return fb; } }
  function lsSet(k, val) { try { localStorage.setItem(k, JSON.stringify(val)); } catch(e) {} }

  // Condition definitions (D&D 5e full set)
  const CONDITIONS = [
    { code: "Bl", label: "Blinded",      color: "#666" },
    { code: "Ch", label: "Charmed",      color: "#f472b6" },
    { code: "De", label: "Deafened",     color: "#888" },
    { code: "Ex", label: "Exhausted",    color: "#f97316" },
    { code: "Fr", label: "Frightened",   color: "#dc2626" },
    { code: "Gr", label: "Grappled",     color: "#65a30d" },
    { code: "In", label: "Incapacitated",color: "#eab308" },
    { code: "Iv", label: "Invisible",    color: "#e2e8f0" },
    { code: "Pa", label: "Paralyzed",    color: "#7c3aed" },
    { code: "Pe", label: "Petrified",    color: "#78716c" },
    { code: "Po", label: "Poisoned",     color: "#16a34a" },
    { code: "Pr", label: "Prone",        color: "#92400e" },
    { code: "Re", label: "Restrained",   color: "#b45309" },
    { code: "St", label: "Stunned",      color: "#0891b2" },
    { code: "Un", label: "Unconscious",  color: "#1e293b" },
  ];
  const Icon = window.Icon;
  const { Token, HPBar } = window.NZUI;

  // ---- procedural map backgrounds (no external art needed) ----
  function bgFor(type) {
    switch (type) {
      case "tavern": return {
        background: `
          repeating-linear-gradient(90deg, rgba(60,38,20,0.5) 0 3px, transparent 3px 64px),
          repeating-linear-gradient(0deg, rgba(30,18,8,0.45) 0 64px, rgba(70,44,22,0.25) 64px 67px),
          radial-gradient(120% 90% at 50% 30%, #6a4424, #2e1c0d)` };
      case "dungeon": return {
        background: `
          repeating-linear-gradient(90deg, rgba(0,0,0,0.35) 0 1px, transparent 1px 56px),
          repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0 1px, transparent 1px 56px),
          radial-gradient(120% 100% at 50% 20%, #3a3540, #1b1820)` };
      case "forest": return {
        background: `
          radial-gradient(40px 40px at 20% 30%, rgba(40,80,40,0.5), transparent 70%),
          radial-gradient(60px 60px at 70% 60%, rgba(30,70,40,0.5), transparent 70%),
          radial-gradient(50px 50px at 85% 20%, rgba(40,90,50,0.4), transparent 70%),
          radial-gradient(120% 100% at 50% 50%, #243a22, #11200f)` };
      case "cave": return {
        background: `
          radial-gradient(80px 80px at 30% 40%, rgba(50,60,80,0.4), transparent 70%),
          radial-gradient(120px 90px at 75% 65%, rgba(30,40,60,0.5), transparent 70%),
          radial-gradient(120% 110% at 50% 30%, #2a2f3c, #12141c)` };
      default: return { background: "#1b1820" };
    }
  }

  function BattleMap({ maps, party, bestiary, dm, initialMapId, riversideLink, setRiversideLink, worldBgImg, onWorldBgChange }) {
    const ctx = useContext(window.NZAuth.RoleContext);
    const canEdit = ctx.can("fog");        // DM / admin
    const canMove = ctx.can("moveTokens"); // DM / admin / player
    const [mapList, setMapList] = useState(() => {
      try {
        const custom = JSON.parse(localStorage.getItem("nz_custommaps") || "[]");
        const hiddenSeeded = lsGet("nz_hidden_seeded", []);
        const visibleSeeded = maps.filter((m) => !hiddenSeeded.includes(m.id));
        return visibleSeeded.length || custom.length ? [...visibleSeeded, ...custom] : maps;
      } catch(e) { return maps; }
    });
    const [activeMapId, setActiveMapId] = useState(initialMapId || maps[0].id);
    const map = mapList.find((m) => m.id === activeMapId) || mapList[0];
    useEffect(() => { if (initialMapId && mapList.some((m) => m.id === initialMapId)) setActiveMapId(initialMapId); }, [initialMapId]);

    const [tool, setTool] = useState("select"); // select | fog | measure | ping
    const [cell, setCell] = useState(46);
    const [showGrid, setShowGrid] = useState(true);

    // tokens keyed by map — load from localStorage, fall back to seed
    const [tokensByMap, setTokensByMap] = useState(() => {
      const saved = lsGet("nz_tokens", null);
      if (saved && Object.keys(saved).length > 0) {
        // Re-sync UIDC from saved tokens so new tokens get unique IDs
        Object.values(saved).flat().forEach((t) => {
          const n = parseInt((t.uid || "").replace("t", ""), 10);
          if (!isNaN(n) && n > UIDC) UIDC = n;
        });
        return saved;
      }
      const init = {};
      maps.forEach((m) => { init[m.id] = []; });
      init[maps[0].id] = [
        mkTok(party[0], 6, 7, "pc"), mkTok(party[1], 7, 8, "pc"),
        mkTok(party[2], 5, 9, "pc"), mkTok(party[3], 8, 6, "pc"),
        mkTok(party[4], 6, 9, "pc"),
        mkTok(bestiary[3], 15, 7, "enemy"), mkTok(bestiary[3], 16, 9, "enemy", "2"),
        mkTok(bestiary[1], 18, 8, "enemy"),
      ];
      init[maps[1].id] = [
        mkTok(party[0], 5, 8, "pc"), mkTok(party[1], 6, 9, "pc"),
        mkTok(bestiary[0], 20, 9, "enemy"),
      ];
      return init;
    });
    const tokens = tokensByMap[activeMapId] || [];
    const setTokens = (updater) => setTokensByMap((s) => ({ ...s, [activeMapId]: typeof updater === "function" ? updater(s[activeMapId] || []) : updater }));

    // fog: Set of "c,r" revealed cells, per map — persisted as arrays
    const [fogByMap, setFogByMap] = useState(() => {
      const savedRaw = lsGet("nz_fog", null);
      if (savedRaw && Object.keys(savedRaw).length > 0) {
        const result = {};
        Object.keys(savedRaw).forEach((k) => { result[k] = new Set(savedRaw[k]); });
        return result;
      }
      const reveal = (cols, rows, c0, c1, r0, r1) => {
        const s = new Set();
        for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) if (c >= 0 && c < cols && r >= 0 && r < rows) s.add(`${c},${r}`);
        return s;
      };
      return {
        [maps[0].id]: reveal(maps[0].cols, maps[0].rows, 2, 21, 3, 12),
        [maps[1].id]: reveal(maps[1].cols, maps[1].rows, 2, 9, 5, 12),
      };
    });
    const [fogEnabled, setFogEnabled] = useState(false); // default OFF — DM enables manually
    const revealed = fogByMap[activeMapId] || new Set();
    const setRevealed = (next) => setFogByMap((s) => ({ ...s, [activeMapId]: next }));

    const [selected, setSelected] = useState(null);
    const [pings, setPings] = useState([]);
    const [measure, setMeasure] = useState(null);
    const [diceOpen, setDiceOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [view3d, setView3d] = useState(false);
    const [hexMode, setHexMode] = useState(false);
    const [mapDice, setMapDice] = useState(null);
    // ---- new Phase 1 state ----
    const [timerSecs, setTimerSecs] = useState(60);
    const [timerLeft, setTimerLeft] = useState(60);
    const [timerOn, setTimerOn] = useState(false);
    const [combatLog, setCombatLog] = useState([]);
    const [mapLog, setMapLog] = useState([]);
    const [condPickerUid, setCondPickerUid] = useState(null); // uid of token showing condition picker
    const [noteEdit, setNoteEdit] = useState(false);
    const [encounters, setEncounters] = useState(() => lsGet("nz_encounters", []));
    const [prepOpen, setPrepOpen] = useState(false);
    const [prep, setPrep] = useState(() => lsGet("nz_prep", ["Place tokens","Set fog","Prep encounter","Cue music","Check initiative"].map((t, i) => ({ id: i, text: t, done: false }))));
    const [soundUrl, setSoundUrl] = useState("");
    const [soundOpen, setSoundOpen] = useState(false);
    // ---- Map objects (walls, pillars, etc.) ----
    const [objectsByMap, setObjectsByMap] = useState(() => lsGet("nz_objects", {}));
    const [placingObj, setPlacingObj] = useState(null);
    const [selectedObj, setSelectedObj] = useState(null); // selected object id for manipulation
    const [editingRiverside, setEditingRiverside] = useState(false);
    useEffect(() => { lsSet("nz_objects", objectsByMap); }, [objectsByMap]);
    const mapObjs = objectsByMap[activeMapId] || [];
    const setMapObjs = (updater) => setObjectsByMap((s) => ({ ...s, [activeMapId]: typeof updater === "function" ? updater(s[activeMapId] || []) : updater }));

    // ---- AoE templates ----
    const [aoeList, setAoeList] = useState([]); // per-session only (not persisted)
    const [placingAoe, setPlacingAoe] = useState(null); // { type, size, color }

    // ---- Session features: death saves, inspiration ----
    const [deathSaves, setDeathSaves] = useState({}); // { uid: { s: [f,f,f], f: [f,f,f] } }
    const [inspired, setInspired] = useState({}); // { uid: bool }
    const [tokenNotes, setTokenNotes] = useState({}); // { uid: string }
    const [roomCode, setRoomCode] = useState(null);
    const [roomInput, setRoomInput] = useState("");
    const [roomOpen, setRoomOpen] = useState(false);
    const [presence, setPresence] = useState({}); // { key: { name, role, ring } }
    const syncIncoming = useRef(false);

    // Persist fog and tokens on change
    useEffect(() => {
      const serial = {};
      Object.keys(fogByMap).forEach((k) => { serial[k] = [...fogByMap[k]]; });
      lsSet("nz_fog", serial);
    }, [fogByMap]);
    useEffect(() => { lsSet("nz_tokens", tokensByMap); }, [tokensByMap]);
    useEffect(() => { lsSet("nz_encounters", encounters); }, [encounters]);
    useEffect(() => { lsSet("nz_prep", prep); }, [prep]);

    // Timer countdown
    useEffect(() => {
      if (!timerOn || timerLeft <= 0) { if (timerLeft <= 0) setTimerOn(false); return; }
      const t = setTimeout(() => setTimerLeft((l) => l - 1), 1000);
      return () => clearTimeout(t);
    }, [timerOn, timerLeft]);

    // ---- Firebase real-time sync ----
    React.useEffect(() => {
      if (!roomCode || !window.NZFirebase) return;
      // joinRoom first (sets currentCode), then presence
      window.NZFirebase.joinRoom(roomCode, (data) => {
        syncIncoming.current = true;
        try {
          if (data.tokens) setTokensByMap(JSON.parse(data.tokens));
          if (data.fog) {
            const raw = JSON.parse(data.fog);
            const sets = {};
            Object.keys(raw).forEach((k) => { sets[k] = new Set(raw[k]); });
            setFogByMap(sets);
          }
          if (data.initiative) {
            setRound(data.initiative.round || 1);
            setTurnIdx(data.initiative.turnIdx || 0);
          }
          // Sync map list — update existing maps that are missing img, and add new ones
          if (data.maps) {
            const incoming = JSON.parse(data.maps);
            const incomingById = {};
            incoming.forEach(function(m) { incomingById[m.id] = m; });
            setMapList(function(current) {
              // Update any existing map that has no img but incoming has one
              const updated = current.map(function(m) {
                const inc = incomingById[m.id];
                if (inc && inc.img && !m.img) return Object.assign({}, m, { img: inc.img });
                return m;
              });
              const currentIds = new Set(current.map(function(m) { return m.id; }));
              const toAdd = incoming.filter(function(m) { return !currentIds.has(m.id); });
              return toAdd.length ? [...updated, ...toAdd] : updated;
            });
          }
          // World map background
          if (data.worldBg && onWorldBgChange) onWorldBgChange(data.worldBg);
          // DM switching active map — all players follow (set AFTER mapList so map is ready)
          if (data.activeMapId) setActiveMapId(data.activeMapId);
        } catch(e) {}
        setTimeout(() => { syncIncoming.current = false; }, 250);
      });
      // Set own presence AFTER joinRoom has set currentCode
      const presenceKey = ctx.user ? ctx.user.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() : "unknown";
      window.NZFirebase.setPresence(presenceKey, { name: ctx.user ? ctx.user.name : "Unknown", role: ctx.role, ring: ctx.user ? ctx.user.ring : "#9170f0", ts: Date.now() });
      window.NZFirebase.watchPresence((data) => { setPresence(data || {}); });
      return () => { if (window.NZFirebase) { window.NZFirebase.leaveRoom(); } setPresence({}); };
    }, [roomCode]);

    // Debounced Firebase writes when state changes
    React.useEffect(() => {
      if (!roomCode || !window.NZFirebase || syncIncoming.current) return;
      const fogSerial = {};
      Object.keys(fogByMap).forEach((k) => { fogSerial[k] = [...fogByMap[k]]; });
      // Include mapList (with custom map images so players see them)
      // and activeMapId so DM can switch maps for everyone
      const defaultIds = new Set(maps.map((m) => m.id));
      const sharedMaps = mapList.map((m) => ({
        id: m.id, name: m.name, cols: m.cols, rows: m.rows, bg: m.bg, note: m.note || "",
        img: defaultIds.has(m.id) ? null : (m.img || null) // share custom map images
      }));
      window.NZFirebase.push({
        tokens: JSON.stringify(tokensByMap),
        fog: JSON.stringify(fogSerial),
        initiative: { round, turnIdx },
        activeMapId: activeMapId,
        maps: JSON.stringify(sharedMaps),
        worldBg: worldBgImg || null,
      });
    }, [tokensByMap, fogByMap, round, turnIdx, roomCode, activeMapId, mapList, worldBgImg]);

    // Keyboard shortcut event listeners
    React.useEffect(() => {
      const onDice = () => setDiceOpen(true);
      const onNext = () => nextTurn();
      const onRoll = () => rollInitiative();
      const onFog = () => setTool((t) => t === "fog" ? "select" : "fog");
      window.addEventListener("nz:opendice", onDice);
      window.addEventListener("nz:nextturn", onNext);
      window.addEventListener("nz:rollinitiative", onRoll);
      window.addEventListener("nz:fogtoggle", onFog);
      return () => {
        window.removeEventListener("nz:opendice", onDice);
        window.removeEventListener("nz:nextturn", onNext);
        window.removeEventListener("nz:rollinitiative", onRoll);
        window.removeEventListener("nz:fogtoggle", onFog);
      };
    }, []);

    // listen for nz:dice + nz:addtoken events
    React.useEffect(() => {
      function handleDice(e) {
        const { result, die, theme, crit } = e.detail;
        const stage = stageRef.current;
        const rect = stage ? stage.getBoundingClientRect() : { width: 400, height: 300 };
        const margin = 80;
        const px = margin + Math.random() * Math.max(0, rect.width - margin * 2);
        const py = margin + Math.random() * Math.max(0, rect.height - margin * 2);
        setMapDice({ result, die, theme, crit, pos: { x: px, y: py }, id: Date.now() });
        setTimeout(() => setMapDice(null), 3200);
        const label = die + ": " + result + (crit === "nat20" ? " ★NAT 20!" : crit === "nat1" ? " ✗Nat 1" : "");
        setMapLog((l) => [{ id: Date.now(), text: "🎲 " + label, kind: crit || "normal" }, ...l].slice(0, 15));
      }
      function handleAddToken(e) {
        const src = e.detail;
        const kindFor = (src.side === "ally") ? "ally" : "enemy";
        const spot = freeSpot(tokensByMap[activeMapId] || [], map);
        setTokens((ts) => [...ts, mkTok(src, spot.c, spot.r, kindFor)]);
        addLog("➕ " + src.name + " added to map", "add");
      }
      window.addEventListener("nz:dice", handleDice);
      window.addEventListener("nz:addtoken", handleAddToken);
      return () => { window.removeEventListener("nz:dice", handleDice); window.removeEventListener("nz:addtoken", handleAddToken); };
    }, [activeMapId, map]);

    const stageRef = useRef(null);
    const drag = useRef(null);

    // ---- pointer handling on the grid ----
    function cellFromEvent(e) {
      if (!stageRef.current) return { c: 0, r: 0, x: 0, y: 0 };
      const r = stageRef.current.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      return { c: Math.floor(x / cell), r: Math.floor(y / cell), x, y };
    }

    function onStagePointerDown(e) {
      try {
        if (e.target.closest(".tok") || e.target.closest(".map-obj")) return;
        if (!stageRef.current) return;
        const pos = cellFromEvent(e);
        // Object placement mode
        if (tool === "object" && placingObj && canEdit) {
          setMapObjs((os) => [...os, { id: "o" + Date.now(), ...placingObj, c: pos.c, r: pos.r }]);
          return;
        }
        // AoE placement mode
        if (tool === "aoe" && placingAoe && canEdit) {
          setAoeList((as) => [...as, { id: "a" + Date.now(), ...placingAoe, c: pos.c, r: pos.r }]);
          return;
        }
        if (tool === "fog") { paintFog(pos, e.shiftKey); }
        else if (tool === "ping") { dropPing(pos); }
        else if (tool === "measure") { setMeasure({ from: { x: pos.x, y: pos.y }, to: { x: pos.x, y: pos.y } }); drag.current = { kind: "measure" }; }
        else if (tool === "select") { setSelected(null); setCondPickerUid(null); }
      } catch(err) { console.error("pointerdown", err); drag.current = null; }
    }
    function onStagePointerMove(e) {
      try {
        if (!stageRef.current) return;
        const d = drag.current;
        const kind = d ? d.kind : null;
        if (!kind && tool !== "fog") return;
        const pos = cellFromEvent(e);
        if (kind === "measure") {
          setMeasure((m) => m ? { ...m, to: { x: pos.x, y: pos.y } } : m);
        } else if (kind === "mapobj" && d) {
          setMapObjs((os) => os.map((o) => o.id === d.uid ? { ...o, c: clamp(pos.c, 0, map.cols - 1), r: clamp(pos.r, 0, map.rows - 1) } : o));
        } else if (kind === "token" && d) {
          const uid = d.uid;
          setTokens((ts) => ts.map((t) => t.uid === uid ? { ...t, c: clamp(pos.c, 0, map.cols - 1), r: clamp(pos.r, 0, map.rows - 1) } : t));
        } else if (tool === "fog" && (e.buttons & 1)) {
          paintFog(pos, e.shiftKey);
        }
      } catch(err) { console.error("pointermove", err); drag.current = null; }
    }
    function onStagePointerUp() { drag.current = null; }

    function paintFog(pos, hide) {
      const key = `${pos.c},${pos.r}`;
      const next = new Set(revealed);
      // brush 1-cell radius
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
        const k = `${pos.c + dc},${pos.r + dr}`;
        if (hide) next.delete(k); else next.add(k);
      }
      setRevealed(next);
    }
    function dropPing(pos) {
      const id = Date.now();
      setPings((p) => [...p, { id, x: pos.x, y: pos.y }]);
      setTimeout(() => setPings((p) => p.filter((x) => x.id !== id)), 1600);
    }
    function startTokenDrag(e, t) {
      try {
        if (tool !== "select" || !canMove) return;
        e.stopPropagation();
        setSelected(t.uid);
        drag.current = { kind: "token", uid: t.uid };
      } catch(err) { console.error("startTokenDrag", err); drag.current = null; }
    }

    // ---- combat log helper ----
    function addLog(text, kind) {
      setCombatLog((l) => [{ id: Date.now() + Math.random(), text, kind }, ...l].slice(0, 60));
    }

    // ---- initiative ----
    const [round, setRound] = useState(1);
    const [turnIdx, setTurnIdx] = useState(0);
    const order = [...tokens].sort((a, b) => b.init - a.init);
    const activeUid = order[turnIdx % Math.max(1, order.length)]?.uid;
    function nextTurn() {
      const ni = turnIdx + 1;
      const newRound = ni >= order.length;
      if (newRound) { setTurnIdx(0); setRound((r) => { addLog("🔁 Round " + (r + 1) + " begins", "round"); return r + 1; }); }
      else { setTurnIdx(ni); const next = order[ni]; if (next) addLog("⏩ " + next.name + "'s turn", "turn"); }
      if (timerSecs > 0) { setTimerLeft(timerSecs); setTimerOn(true); }
      if (window.NZSounds) window.NZSounds.play("turn");
    }
    function rollInitiative() {
      setTokens((ts) => ts.map((t) => ({ ...t, init: 1 + Math.floor(Math.random() * 20) + t.initMod })));
      setTurnIdx(0); setRound(1); addLog("🎲 Initiative rolled", "roll");
    }

    function damage(uid, amt) {
      setTokens((ts) => ts.map((t) => {
        if (t.uid !== uid) return t;
        const hp = clamp(t.hp + amt, 0, t.hpMax);
        const dead = hp === 0;
        if (dead && !t.dead) { addLog("💀 " + t.name + " defeated", "death"); if (window.NZSounds) window.NZSounds.play("death"); }
        else if (amt < 0) { addLog("⚔ " + Math.abs(amt) + " damage to " + t.name, "damage"); if (window.NZSounds) window.NZSounds.play("damage"); }
        else if (amt > 0) { addLog("💚 +" + amt + " HP to " + t.name, "heal"); }
        return { ...t, hp, bloodied: hp <= t.hpMax / 2 && hp > 0, dead };
      }));
    }
    function removeToken(uid) { setTokens((ts) => ts.filter((t) => t.uid !== uid)); if (selected === uid) setSelected(null); }

    function addToken(src, kind) {
      const spot = freeSpot(tokens, map);
      setTokens((ts) => [...ts, mkTok(src, spot.c, spot.r, kind, undefined, true)]);
      setAddOpen(false);
    }

    function handleUpload(newMap) {
      setMapList((l) => {
        const next = [...l, newMap];
        const defaultIds = new Set(maps.map((m) => m.id));
        try { localStorage.setItem("nz_custommaps", JSON.stringify(next.filter((m) => !defaultIds.has(m.id)))); } catch(e) {}
        return next;
      });
      setTokensByMap((s) => ({ ...s, [newMap.id]: [] }));
      setActiveMapId(newMap.id);
      setUploadOpen(false);
    }

    function removeMap(mapId) {
      if (mapList.length <= 1) { alert("Can't remove the last map."); return; }
      const defaultIds = new Set(maps.map((m) => m.id));
      // Track hidden seeded maps so they can be excluded from the list
      const hiddenSeeded = lsGet("nz_hidden_seeded", []);
      setMapList((l) => {
        const next = l.filter((m) => m.id !== mapId);
        try { localStorage.setItem("nz_custommaps", JSON.stringify(next.filter((m) => !defaultIds.has(m.id)))); } catch(e) {}
        if (defaultIds.has(mapId)) lsSet("nz_hidden_seeded", [...hiddenSeeded, mapId]);
        return next;
      });
      setTokensByMap((s) => { const n = { ...s }; delete n[mapId]; lsSet("nz_tokens", n); return n; });
      setFogByMap((s) => {
        const n = { ...s }; delete n[mapId];
        const serial = {}; Object.keys(n).forEach((k) => { serial[k] = [...n[k]]; }); lsSet("nz_fog", serial);
        return n;
      });
      if (activeMapId === mapId) setActiveMapId(mapList.find((m) => m.id !== mapId)?.id || maps[0].id);
    }

    function moveMap(mapId, dir) {
      setMapList((l) => {
        const idx = l.findIndex((m) => m.id === mapId);
        if (idx < 0) return l;
        const ni = idx + dir;
        if (ni < 0 || ni >= l.length) return l;
        const next = [...l];
        [next[idx], next[ni]] = [next[ni], next[idx]];
        // Persist updated custom maps order
        const defaultIds = new Set(maps.map((m) => m.id));
        try { localStorage.setItem("nz_custommaps", JSON.stringify(next.filter((m) => !defaultIds.has(m.id)))); } catch(e) {}
        return next;
      });
    }

    function resetMap(mapId) {
      // Clear all tokens and fog for a map, go back to blank state
      setTokens([]);
      setRevealed(new Set());
      addLog("🔄 Map reset to blank", "round");
    }

    const stageW = map.cols * cell, stageH = map.rows * cell;
    const sel = tokens.find((t) => t.uid === selected);

    return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 312px", gridTemplateRows: "1fr auto", height: "100%", minHeight: 0, overflow: "hidden" } },
      // ===== LEFT: stage area =====
      React.createElement("div", { style: { position: "relative", minWidth: 0, display: "flex", flexDirection: "column", background: "#0d0a14" } },
        // map tabs
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--hair)", background: "var(--bg-2)", overflowX: "auto", flex: "none" } },
          mapList.map((m, idx) => React.createElement("div", { key: m.id, style: { display: "flex", alignItems: "center", gap: 0, flex: "none" },
            draggable: !!canEdit,
            onDragStart: canEdit ? (e) => { e.dataTransfer.setData("mapId", m.id); } : undefined,
            onDragOver: canEdit ? (e) => e.preventDefault() : undefined,
            onDrop: canEdit ? (e) => { e.preventDefault(); const from = e.dataTransfer.getData("mapId"); if (from !== m.id) { const fi = mapList.findIndex((x) => x.id === from), ti = mapList.findIndex((x) => x.id === m.id); if (fi >= 0 && ti >= 0) { const next = [...mapList]; [next[fi], next[ti]] = [next[ti], next[fi]]; const defaultIds = new Set(maps.map((x) => x.id)); try { localStorage.setItem("nz_custommaps", JSON.stringify(next.filter((x) => !defaultIds.has(x.id)))); } catch(ex) {} setMapList(next); } } } : undefined },
            React.createElement("button", { onClick: () => setActiveMapId(m.id), style: { ...mapTab(m.id === activeMapId), cursor: canEdit ? "grab" : "pointer" } },
              React.createElement(Icon, { name: m.img ? "upload" : "map", size: 15 }),
              m.name),
            canEdit && React.createElement("button", { title: "Reset tokens & fog", onClick: () => { if (confirm("Clear all tokens and fog on \"" + m.name + "\"?")) resetMap(m.id); },
              style: { background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer", padding: "0 2px", fontSize: 12, lineHeight: 1, display: m.id === activeMapId ? "inline" : "none" } }, "↺"),
            canEdit && React.createElement("button", { title: "Remove this map", onClick: () => { if (confirm("Remove map \"" + m.name + "\"?")) removeMap(m.id); },
              style: { background: "none", border: "none", color: "var(--ink-dim)", cursor: "pointer", padding: "0 4px 0 2px", fontSize: 14, lineHeight: 1 } }, "✕"))),
          canEdit && React.createElement("button", { className: "btn sm ghost", style: { flex: "none" }, onClick: () => setUploadOpen(true) },
            React.createElement(Icon, { name: "upload", size: 15 }), "Upload map"),
          // ---- Session sync button ----
          window.NZFirebase && React.createElement("div", { style: { flex: "none", display: "flex", alignItems: "center", gap: 6, marginLeft: 8, position: "relative" } },
            roomCode
              ? React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, background: "rgba(79,185,138,0.15)", border: "1px solid var(--emerald)", borderRadius: 100, padding: "4px 12px", fontSize: 13 } },
                  React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: "var(--emerald)", animation: "glowpulse 1.6s ease-in-out infinite" } }),
                  React.createElement("span", { className: "mono", style: { fontWeight: 700, color: "var(--emerald)", letterSpacing: "0.1em" } }, roomCode),
                  React.createElement("button", { title: "Copy code", onClick: () => navigator.clipboard.writeText(roomCode), style: { background: "none", border: "none", color: "var(--emerald)", cursor: "pointer", fontSize: 13, padding: "0 2px" } }, "⧉"),
                  React.createElement("span", { style: { color: "var(--ink-dim)", fontSize: 12 } }, Object.keys(presence).length + " connected"),
                  React.createElement("button", { onClick: () => { if (window.NZFirebase) window.NZFirebase.leaveRoom(); setRoomCode(null); setPresence({}); }, style: { background: "none", border: "none", color: "var(--ink-dim)", cursor: "pointer", fontSize: 14, padding: 0, marginLeft: 2 } }, "✕"))
              : React.createElement("button", { className: "btn sm ghost", onClick: () => setRoomOpen((x) => !x) },
                  React.createElement(Icon, { name: "party", size: 15 }), canEdit ? "Create session" : "Join session"),
            roomOpen && !roomCode && React.createElement("div", { style: { position: "fixed", top: 120, right: 20, zIndex: 9999, background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: 16, boxShadow: "var(--shadow-3)", minWidth: 300, display: "flex", flexDirection: "column", gap: 10 } },
              React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 600, fontSize: 13, color: "var(--gold)" } }, canEdit ? "Create a Session" : "Join a Session"),
              React.createElement("div", { className: "muted", style: { fontSize: 12 } }, canEdit ? "Generate a code, share it with your players." : "Enter the code Callum shared with you."),
              // DM: generate code section
              canEdit && React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-2)", borderRadius: 8, padding: 10 } },
                React.createElement("div", { style: { fontSize: 11, color: "var(--ink-dim)", fontFamily: "var(--display)", letterSpacing: "0.1em" } }, "YOUR SESSION CODE"),
                React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
                  React.createElement("span", { className: "mono", style: { fontSize: 22, fontWeight: 900, letterSpacing: "0.18em", color: "var(--gold)", flex: 1 } }, roomInput || "—"),
                  roomInput && React.createElement("button", { className: "btn sm ghost", onClick: () => navigator.clipboard.writeText(roomInput), title: "Copy code" }, "⧉ Copy"),
                  React.createElement("button", { className: "btn sm primary", onClick: () => { const c = Math.random().toString(36).slice(2, 8).toUpperCase(); setRoomInput(c); } }, roomInput ? "↻ New" : "✨ Generate")),
                roomInput && React.createElement("div", { style: { fontSize: 11, color: "var(--ink-dim)" } }, "Share this code in Discord. Players can join immediately.")),
              // Join section (both DM and players)
              React.createElement("div", { style: { display: "flex", gap: 8 } },
                React.createElement("input", { className: "input", placeholder: "Paste code to join…", value: roomInput, onChange: (e) => setRoomInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)), style: { flex: 1, fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", fontSize: 15 }, maxLength: 6, autoFocus: !canEdit }),
                React.createElement("button", { className: "btn primary sm", disabled: roomInput.length < 4, onClick: () => { setRoomCode(roomInput); setRoomOpen(false); } }, "Connect")),
              React.createElement("button", { className: "btn ghost sm", onClick: () => setRoomOpen(false) }, "Cancel"))),
          React.createElement("div", { style: { flex: "none", display: "flex", gap: 4, marginLeft: 4, background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 100, padding: 3 } },
            React.createElement("button", { onClick: () => setView3d(false), style: dimToggle(!view3d) }, "2D"),
            React.createElement("button", { onClick: () => setView3d(true), style: dimToggle(view3d) }, React.createElement(Icon, { name: "layers", size: 14 }), "3D"))
        ),
        // toolbar + viewport
        React.createElement("div", { style: { position: "relative", flex: 1, minHeight: 0, overflow: "hidden" } },
          // floating toolbar \u2014 always shown (limited tools in 3D mode)
          canMove && React.createElement(Toolbar, { tool, setTool, cell, setCell, showGrid, setShowGrid, fogEnabled, setFogEnabled, canEdit, view3d,
            onReveal: () => { const all = new Set(); for (let c = 0; c < map.cols; c++) for (let r = 0; r < map.rows; r++) all.add(`${c},${r}`); setRevealed(all); },
            onResetFog: () => setRevealed(new Set()), onAdd: () => setAddOpen(true),
            placingObj, setPlacingObj, placingAoe, setPlacingAoe,
            onClearAoe: () => setAoeList([]), onClearObjects: () => setMapObjs([]) }),
          // 3D board
          view3d && React.createElement(window.Table3D, { map, tokens, party, bestiary, activeUid, hexMode, mapObjs,
            tool,
            onMoveToken: canMove ? (uid, c, r) => setTokens((ts) => ts.map((t) => t.uid === uid ? { ...t, c: clamp(c, 0, map.cols - 1), r: clamp(r, 0, map.rows - 1) } : t)) : null,
            onPlaceObject: (c, r) => { if (placingObj && canEdit) setMapObjs((os) => [...os, { id: "o" + Date.now(), ...placingObj, c, r }]); },
            onPlaceAoe:    (c, r) => { if (placingAoe) setAoeList((as) => [...as, { id: "a" + Date.now(), ...placingAoe, c, r }]); } }),
          view3d && React.createElement("div", { style: { position: "absolute", top: 14, left: 64, zIndex: 12, fontSize: 12, color: "var(--ink-dim)", background: "rgba(13,10,20,0.7)", border: "1px solid var(--hair)", borderRadius: 8, padding: "6px 12px", backdropFilter: "blur(6px)" } }, "Orbit: drag \u00b7 Zoom: scroll \u00b7 Hold figure to drag"),
          // map note
          React.createElement("div", { style: { position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 12, background: "rgba(13,10,20,0.8)", border: "1px solid var(--hair)", borderRadius: 100, padding: "6px 16px", fontSize: 13, color: "var(--ink-soft)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", gap: 8 } },
            React.createElement("span", { style: { color: "var(--gold)", fontFamily: "var(--display)" } }, "\u2727"),
            canEdit && noteEdit
              ? React.createElement("input", { autoFocus: true, className: "input", defaultValue: map.note, style: { height: 24, padding: "0 8px", fontSize: 13, minWidth: 220, borderRadius: 100 },
                  onBlur: (e) => { setMapList((l) => l.map((m) => m.id === activeMapId ? { ...m, note: e.target.value } : m)); setNoteEdit(false); },
                  onKeyDown: (e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setNoteEdit(false); } })
              : React.createElement("span", { onClick: canEdit ? () => setNoteEdit(true) : undefined, title: canEdit ? "Click to edit note" : undefined, style: { cursor: canEdit ? "text" : "default" } }, map.note)),
          // scrollable stage
          !view3d && React.createElement("div", { style: { position: "absolute", inset: 0, overflow: "auto", display: "grid", placeItems: "center", padding: 30 } },
            React.createElement("div", {
              ref: stageRef,
              onPointerDown: onStagePointerDown, onPointerMove: onStagePointerMove, onPointerUp: onStagePointerUp, onPointerLeave: onStagePointerUp,
              style: Object.assign({
                position: "relative", width: stageW, height: stageH, flex: "none",
                borderRadius: 10, boxShadow: "var(--shadow-3), 0 0 0 1px rgba(232,181,74,0.15)",
                cursor: tool === "fog" ? "cell" : tool === "measure" ? "crosshair" : tool === "ping" ? "pointer" : "default",
                overflow: "hidden",
              }, map.img ? { backgroundImage: `url(${map.img})`, backgroundSize: "cover", backgroundPosition: "center" } : bgFor(map.bg)),
            },
              // grid lines (square or hex)
              showGrid && !hexMode && React.createElement("div", { style: { position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: `linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)`,
                backgroundSize: `${cell}px ${cell}px` } }),
              showGrid && hexMode && React.createElement(HexGridOverlay, { cols: map.cols, rows: map.rows, cell }),
              // ---- Map objects (walls, pillars, crates, etc.) ----
              mapObjs.map((obj) => {
                const OBJ_STYLES = {
                  wall:   { background: "#3a2a1a", border: "2px solid #6b4423", borderRadius: 3 },
                  pillar: { background: "#2a2230", border: "2px solid #9170f0", borderRadius: "50%" },
                  crate:  { background: "#5c3a1e", border: "2px solid #b07f30", borderRadius: 4 },
                  barrel: { background: "#4a2e14", border: "2px solid #9a6a32", borderRadius: "50%" },
                  rock:   { background: "#3a3540", border: "2px solid #666", borderRadius: "30%" },
                  tree:   { background: "#1a3216", border: "2px solid #2c5a1e", borderRadius: "50%" },
                  door:   { background: "#6b4423", border: "2px solid #e8b54a", borderRadius: 2 },
                  table:  { background: "#5c3010", border: "2px solid #9a6030", borderRadius: 4 },
                };
                const s = OBJ_STYLES[obj.type] || OBJ_STYLES.crate;
                const w = (obj.w || 1) * cell - 4, h = (obj.h || 1) * cell - 4;
                const isSel = selectedObj === obj.id;
                const rot = obj.rotation || 0;
                return React.createElement("div", { key: obj.id, className: "map-obj",
                  onClick: canEdit ? (e) => { e.stopPropagation(); setSelectedObj(isSel ? null : obj.id); } : undefined,
                  onContextMenu: canEdit ? (e) => { e.preventDefault(); e.stopPropagation(); setMapObjs((os) => os.filter((o) => o.id !== obj.id)); setSelectedObj(null); } : undefined,
                  style: { position: "absolute", left: obj.c * cell + 2, top: obj.r * cell + 2, width: w, height: h, zIndex: isSel ? 12 : 8, cursor: canEdit ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", userSelect: "none", transform: "rotate(" + rot + "deg)", outline: isSel ? "2px solid var(--gold)" : "none", outlineOffset: 2, ...s } },
                  // Object manipulation toolbar (when selected)
                  isSel && canEdit && React.createElement("div", { style: { position: "absolute", top: -36, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", gap: 3, background: "rgba(24,18,34,0.95)", border: "1px solid var(--hair)", borderRadius: 8, padding: "3px 6px", whiteSpace: "nowrap" }, onClick: (e) => e.stopPropagation() },
                    React.createElement("button", { title: "Rotate left", onClick: (e) => { e.stopPropagation(); setMapObjs((os) => os.map((o) => o.id === obj.id ? { ...o, rotation: (o.rotation || 0) - 45 } : o)); }, style: { background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", fontSize: 14, padding: "1px 4px" } }, "↺"),
                    React.createElement("button", { title: "Rotate right", onClick: (e) => { e.stopPropagation(); setMapObjs((os) => os.map((o) => o.id === obj.id ? { ...o, rotation: (o.rotation || 0) + 45 } : o)); }, style: { background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", fontSize: 14, padding: "1px 4px" } }, "↻"),
                    React.createElement("button", { title: "Wider", onClick: (e) => { e.stopPropagation(); setMapObjs((os) => os.map((o) => o.id === obj.id ? { ...o, w: Math.min(12, (o.w || 1) + 1) } : o)); }, style: { background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", fontSize: 13, padding: "1px 4px" } }, "→"),
                    React.createElement("button", { title: "Narrower", onClick: (e) => { e.stopPropagation(); setMapObjs((os) => os.map((o) => o.id === obj.id ? { ...o, w: Math.max(1, (o.w || 1) - 1) } : o)); }, style: { background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", fontSize: 13, padding: "1px 4px" } }, "←"),
                    React.createElement("button", { title: "Move (click new cell with Select tool)", onClick: (e) => { e.stopPropagation(); drag.current = { kind: "mapobj", uid: obj.id }; }, style: { background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: 13, padding: "1px 4px" } }, "✥"),
                    React.createElement("button", { title: "Delete", onClick: (e) => { e.stopPropagation(); setMapObjs((os) => os.filter((o) => o.id !== obj.id)); setSelectedObj(null); }, style: { background: "none", border: "none", color: "var(--red-bright)", cursor: "pointer", fontSize: 14, padding: "1px 4px" } }, "✕")));
              }),
              // ---- AoE templates ----
              aoeList.map((aoe) => {
                const r = (aoe.size || 3) * cell / 2;
                const AOE_COLORS = { circle: "#4444ff33", cone: "#ff880033", line: "#ff444433", square: "#44ff4433" };
                const borderColor = { circle: "#4444ff", cone: "#ff8800", line: "#ff4444", square: "#44ff44" };
                if (aoe.type === "circle") return React.createElement("div", { key: aoe.id, style: { position: "absolute", left: aoe.c * cell - r + cell / 2, top: aoe.r * cell - r + cell / 2, width: r * 2, height: r * 2, borderRadius: "50%", background: AOE_COLORS.circle, border: "2px solid " + borderColor.circle, zIndex: 9, pointerEvents: "none" } });
                if (aoe.type === "square") return React.createElement("div", { key: aoe.id, style: { position: "absolute", left: aoe.c * cell, top: aoe.r * cell, width: (aoe.size || 3) * cell, height: (aoe.size || 3) * cell, background: AOE_COLORS.square, border: "2px solid " + borderColor.square, zIndex: 9, pointerEvents: "none" } });
                if (aoe.type === "line") return React.createElement("div", { key: aoe.id, style: { position: "absolute", left: aoe.c * cell, top: aoe.r * cell + cell / 2 - 4, width: (aoe.size || 6) * cell, height: 8, background: AOE_COLORS.line, border: "2px solid " + borderColor.line, zIndex: 9, pointerEvents: "none" } });
                return null;
              }).filter(Boolean),
              // tokens (with size span, condition badge, right-click condition picker)
              tokens.map((t) => {
                const span = t.cellSpan || 1;
                const condDef = CONDITIONS.find((c) => c.code === t.condition);
                return React.createElement("div", {
                  key: t.uid, className: "tok",
                  onPointerDown: (e) => startTokenDrag(e, t),
                  onClick: (e) => { e.stopPropagation(); setSelected(t.uid); setCondPickerUid(null); },
                  onContextMenu: (e) => { e.preventDefault(); e.stopPropagation(); if (canMove) setCondPickerUid(t.uid === condPickerUid ? null : t.uid); },
                  style: { position: "absolute", left: t.c * cell, top: t.r * cell, width: cell * span, height: cell * span, display: "grid", placeItems: "center",
                    zIndex: selected === t.uid ? 20 : 10, cursor: tool === "select" ? "grab" : "inherit",
                    outline: selected === t.uid ? "2px solid var(--gold)" : "none", outlineOffset: -2, borderRadius: 8,
                    transition: drag.current && drag.current.uid === t.uid ? "none" : "left .18s ease, top .18s ease" },
                },
                  t.uid === activeUid && React.createElement("div", { style: { position: "absolute", inset: 1, borderRadius: "50%", boxShadow: "0 0 0 3px var(--gold), 0 0 18px var(--gold)", animation: "glowpulse 1.6s ease-in-out infinite", pointerEvents: "none" } }),
                  React.createElement(Token, { name: t.name, ring: t.ring, size: (cell * span) - 8, bloodied: t.bloodied, dead: t.dead }),
                  // Inspiration star
                  inspired[t.uid] && React.createElement("div", { style: { position: "absolute", top: 1, left: 1, fontSize: 12, pointerEvents: "none", zIndex: 6, filter: "drop-shadow(0 0 4px gold)" } }, "⭐"),
                  // Condition badge
                  condDef && React.createElement("div", { style: { position: "absolute", top: 2, right: 2, background: condDef.color, color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 4, zIndex: 6, fontFamily: "var(--mono)", pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,0.6)" } }, condDef.code),
                  // Note indicator
                  tokenNotes[t.uid] && React.createElement("div", { style: { position: "absolute", bottom: 6, left: 2, fontSize: 11, pointerEvents: "none", zIndex: 6 } }, "📝"),
                  // Condition picker (right-click)
                  condPickerUid === t.uid && React.createElement("div", { style: { position: "absolute", top: "100%", left: 0, zIndex: 40, background: "var(--bg-2)", border: "1px solid var(--hair)", borderRadius: 10, padding: 8, display: "flex", flexWrap: "wrap", gap: 4, width: 200, boxShadow: "var(--shadow-3)" } },
                    React.createElement("div", { style: { width: "100%", fontSize: 10, color: "var(--ink-dim)", fontFamily: "var(--display)", letterSpacing: "0.1em", marginBottom: 2 } }, "CONDITION"),
                    React.createElement("button", { onClick: (e) => { e.stopPropagation(); setTokens((ts) => ts.map((x) => x.uid === t.uid ? { ...x, condition: null } : x)); setCondPickerUid(null); }, style: { fontSize: 11, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--hair)", background: !t.condition ? "var(--gold)" : "var(--surface)", color: !t.condition ? "#000" : "var(--ink-soft)", cursor: "pointer" } }, "None"),
                    CONDITIONS.map((c) => React.createElement("button", { key: c.code, onClick: (e) => { e.stopPropagation(); setTokens((ts) => ts.map((x) => x.uid === t.uid ? { ...x, condition: x.condition === c.code ? null : c.code } : x)); setCondPickerUid(null); }, style: { fontSize: 11, padding: "2px 6px", borderRadius: 4, border: "1px solid " + c.color + "88", background: t.condition === c.code ? c.color : "var(--surface)", color: t.condition === c.code ? "#fff" : "var(--ink-soft)", cursor: "pointer" } }, c.code))),
                  React.createElement("div", { style: { position: "absolute", bottom: -3, left: 4, right: 4, height: 4, borderRadius: 4, background: "rgba(0,0,0,0.5)", overflow: "hidden", pointerEvents: "none" } },
                    React.createElement("div", { style: { width: (t.hpMax > 0 ? (t.hp / t.hpMax) * 100 : 0) + "%", height: "100%", background: t.hp > t.hpMax / 2 ? "var(--emerald)" : t.hp > t.hpMax / 4 ? "var(--gold)" : "var(--red)" } }))
                );
              }),
              // fog overlay
              fogEnabled && React.createElement("div", { style: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 15,
                display: "grid", gridTemplateColumns: `repeat(${map.cols}, ${cell}px)`, gridTemplateRows: `repeat(${map.rows}, ${cell}px)` } },
                Array.from({ length: map.cols * map.rows }).map((_, i) => {
                  const c = i % map.cols, r = Math.floor(i / map.cols);
                  const vis = revealed.has(`${c},${r}`);
                  return React.createElement("div", { key: i, style: { background: vis ? "transparent" : "rgba(7,5,12,0.93)", transition: "background .3s", boxShadow: vis ? "none" : "inset 0 0 0 0.5px rgba(0,0,0,0.3)" } });
                })),
              // measure line
              measure && React.createElement(MeasureOverlay, { measure, cell }),
              // pings
              pings.map((p) => React.createElement("div", { key: p.id, style: { position: "absolute", left: p.x, top: p.y, zIndex: 30, pointerEvents: "none", transform: "translate(-50%,-50%)" } },
                React.createElement("div", { style: { width: 8, height: 8, borderRadius: "50%", background: "var(--gold-bright)", boxShadow: "0 0 12px var(--gold)" } }),
                [0, 1, 2].map((k) => React.createElement("div", { key: k, style: { position: "absolute", inset: 0, margin: "auto", width: 8, height: 8, borderRadius: "50%", border: "2px solid var(--gold-bright)", animation: `pingRipple 1.5s ease-out ${k * 0.25}s infinite` } }))
              ))
            )
          ),
          // selected token quick-actions
          !view3d && sel && React.createElement(TokenHUD, { sel, damage, removeToken,
            addCondition: (c) => setTokens((ts) => ts.map((t) => t.uid === sel.uid ? { ...t, condition: t.condition === c ? null : c } : t)),
            onClose: () => setSelected(null),
            deathSaves: deathSaves[sel.uid] || { s: [false,false,false], f: [false,false,false] },
            onDeathSave: (kind, idx) => setDeathSaves((d) => { const cur = d[sel.uid] || { s:[false,false,false], f:[false,false,false] }; const arr = [...cur[kind]]; arr[idx] = !arr[idx]; return { ...d, [sel.uid]: { ...cur, [kind]: arr } }; }),
            inspired: !!inspired[sel.uid],
            onInspire: () => setInspired((x) => ({ ...x, [sel.uid]: !x[sel.uid] })),
            note: tokenNotes[sel.uid] || "",
            onNote: (v) => setTokenNotes((n) => ({ ...n, [sel.uid]: v })) }),
          // CSS 3D dice overlay on map
          mapDice && !view3d && React.createElement(MapDiceOverlay, { key: mapDice.id, dice: mapDice }),
          // dice toggle button
          React.createElement("button", { className: "btn primary", style: { position: "absolute", right: 18, bottom: 18, zIndex: 35, padding: "11px 16px", display: diceOpen ? "none" : "inline-flex" }, onClick: () => setDiceOpen(true) },
            React.createElement(Icon, { name: "dice", size: 18 }), "Roll dice"),
          React.createElement(window.DiceTray, { open: diceOpen, onClose: () => setDiceOpen(false) }),
          // ---- In Party panel (bottom left) ----
          roomCode && React.createElement("div", { style: { position: "absolute", left: 14, bottom: 18, zIndex: 30, background: "rgba(24,18,34,0.95)", border: "1px solid var(--emerald)", borderRadius: 12, padding: "10px 14px", backdropFilter: "blur(8px)", minWidth: 160 } },
            React.createElement("div", { style: { fontSize: 10, fontFamily: "var(--display)", letterSpacing: "0.18em", color: "var(--emerald)", marginBottom: 8 } }, "IN PARTY"),
            Object.keys(presence).length === 0
              ? React.createElement("div", { className: "muted", style: { fontSize: 12, fontStyle: "italic" } }, "Waiting for players…")
              : React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 5 } },
                  Object.entries(presence).map(([key, p]) => React.createElement("div", { key, style: { display: "flex", alignItems: "center", gap: 8 } },
                    React.createElement("div", { style: { width: 22, height: 22, borderRadius: "50%", background: p.ring || "#9170f0", border: "2px solid rgba(255,255,255,0.25)", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700, color: "#fff", fontFamily: "var(--mono)", flexShrink: 0 } },
                      (p.name || "?").slice(0, 2).toUpperCase()),
                    React.createElement("div", { className: "col", style: { minWidth: 0 } },
                      React.createElement("div", { style: { fontSize: 12.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, p.name || "Unknown"),
                      React.createElement("div", { style: { fontSize: 10, color: "var(--ink-dim)" } }, p.role || "")),
                    React.createElement("div", { style: { width: 7, height: 7, borderRadius: "50%", background: "var(--emerald)", flexShrink: 0 } })))))
        )
      ),
      // ===== RIGHT: initiative panel =====
      React.createElement(InitiativePanel, { order, activeUid, round, turnIdx, nextTurn, rollInitiative, selected, setSelected, damage,
        timerLeft, timerSecs, setTimerSecs, timerOn, combatLog, mapLog }),
      // modals
      React.createElement(UploadMapModal, { open: uploadOpen, onClose: () => setUploadOpen(false), onUpload: handleUpload }),
      React.createElement(AddTokenModal, { open: addOpen, onClose: () => setAddOpen(false), party, bestiary, onAdd: addToken }),
      // ---- Riverside Link bar ----
      React.createElement(RiversideBar, { link: riversideLink || "", canEdit, editing: editingRiverside, setEditing: setEditingRiverside, onSave: (v) => { setRiversideLink && setRiversideLink(v); setEditingRiverside(false); } })
    );
  }

  function RiversideBar({ link, canEdit, editing, setEditing, onSave }) {
    const [val, setVal] = React.useState(link);
    const [collapsed, setCollapsed] = React.useState(false);
    const [copied, setCopied] = React.useState(false);
    React.useEffect(() => { setVal(link); }, [link]);
    function copy() { navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => { setCopied(false); setCollapsed(true); }, 1400); }); }
    if (!link && !canEdit) return null;

    // Collapsed: small floating button at bottom-left, takes no grid space
    if (collapsed) {
      return React.createElement("div", { style: { gridColumn: "1 / -1", height: 0, overflow: "visible", position: "relative", zIndex: 60 } },
        React.createElement("button", { onClick: () => setCollapsed(false), title: "Show Riverside Link",
          style: { position: "absolute", bottom: 8, left: 14, background: "rgba(13,10,20,0.92)", border: "1px solid var(--gold-deep)", borderRadius: 8, color: "var(--gold-deep)", cursor: "pointer", fontSize: 11, fontFamily: "var(--display)", letterSpacing: "0.12em", padding: "5px 10px", whiteSpace: "nowrap" } },
          "🏰"));
    }

    return React.createElement("div", { style: { gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, padding: "7px 18px", borderTop: "1px solid var(--hair)", background: "rgba(13,10,20,0.85)", backdropFilter: "blur(6px)", zIndex: 20 } },
      React.createElement("button", { onClick: () => setCollapsed(true), title: "Minimise", style: { background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 } }, "▼"),
      React.createElement("span", { style: { fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.18em", color: "var(--gold-deep)", whiteSpace: "nowrap" } }, "🏰 RIVERSIDE"),
      editing
        ? React.createElement(React.Fragment, null,
            React.createElement("input", { autoFocus: true, className: "input", value: val, onChange: (e) => setVal(e.target.value), style: { flex: 1, fontSize: 13 }, placeholder: "Paste a URL or type a note…" }),
            React.createElement("button", { className: "btn primary sm", onClick: () => onSave(val) }, "Save"),
            React.createElement("button", { className: "btn ghost sm", onClick: () => setEditing(false) }, "Cancel"))
        : React.createElement(React.Fragment, null,
            link
              ? React.createElement("a", { href: link.startsWith("http") ? link : undefined, target: "_blank", rel: "noopener", style: { flex: 1, fontSize: 13, color: "var(--gold)", textDecoration: link.startsWith("http") ? "underline" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, link)
              : React.createElement("span", { className: "muted", style: { flex: 1, fontSize: 13, fontStyle: "italic" } }, "No link set — click Edit to add one"),
            link && React.createElement("button", { className: "btn sm ghost", onClick: copy }, copied ? "✓ Copied!" : "⧉ Copy"),
            canEdit && React.createElement("button", { className: "btn sm ghost", onClick: () => setEditing(true) }, React.createElement(Icon, { name: "settings", size: 13 }), "Edit")));
  }

  const OBJECT_TYPES = [
    { id: "wall",   label: "Wall",    icon: "▬", w: 3, h: 1, color: "#3a2a1a" },
    { id: "pillar", label: "Pillar",  icon: "●", w: 1, h: 1, color: "#2a2230" },
    { id: "crate",  label: "Crate",   icon: "■", w: 1, h: 1, color: "#5c3a1e" },
    { id: "barrel", label: "Barrel",  icon: "⊙", w: 1, h: 1, color: "#4a2e14" },
    { id: "rock",   label: "Rock",    icon: "◆", w: 1, h: 1, color: "#3a3540" },
    { id: "tree",   label: "Tree",    icon: "❋", w: 1, h: 1, color: "#1a3216" },
    { id: "door",   label: "Door",    icon: "┃", w: 1, h: 1, color: "#6b4423" },
    { id: "table",  label: "Table",   icon: "⊞", w: 2, h: 1, color: "#5c3010" },
  ];
  const AOE_TYPES = [
    { id: "circle", label: "Circle",  icon: "◯", size: 4 },
    { id: "square", label: "Square",  icon: "□", size: 4 },
    { id: "line",   label: "Line",    icon: "━", size: 6 },
  ];

  // ---------- Toolbar ----------
  function Toolbar({ tool, setTool, cell, setCell, showGrid, setShowGrid, fogEnabled, setFogEnabled, onReveal, onResetFog, onAdd, canEdit, view3d, placingObj, setPlacingObj, placingAoe, setPlacingAoe, onClearAoe, onClearObjects }) {
    const [showObjects, setShowObjects] = useState(false);
    const [showAoe, setShowAoe] = useState(false);
    const tools = [
      { id: "select", icon: "move", label: "Select & move (S)" },
      { id: "fog", icon: "fog", label: "Fog of war — drag reveal, Shift hide (F)", dm: true },
      { id: "measure", icon: "ruler", label: "Measure distance" },
      { id: "ping", icon: "ping", label: "Ping location" },
    ].filter((t) => canEdit || !t.dm);
    return React.createElement("div", { style: { position: "absolute", top: 14, left: 14, zIndex: 14, display: "flex", flexDirection: "column", gap: 8 } },
      // Standard tools (in 2D: full set; in 3D: just add-token)
      React.createElement("div", { className: "panel", style: { padding: 6, display: "flex", flexDirection: "column", gap: 4, background: "rgba(24,18,34,0.92)", backdropFilter: "blur(8px)" } },
        !view3d && tools.map((t) => React.createElement("button", { key: t.id, title: t.label, onClick: () => { setTool(t.id); setShowObjects(false); setShowAoe(false); }, style: toolBtn(tool === t.id) },
          React.createElement(Icon, { name: t.icon, size: 19 }))),
        canEdit && React.createElement("div", { style: { height: 1, background: "var(--hair)", margin: "2px 4px" } }),
        canEdit && React.createElement("button", { title: "Add token", onClick: onAdd, style: toolBtn(false) }, React.createElement(Icon, { name: "plus", size: 19 })),
        // Objects + AoE — work in both 2D and 3D
        canEdit && React.createElement("button", { title: "Place objects — walls, pillars, crates", onClick: () => { setShowObjects((x) => !x); setShowAoe(false); setTool("object"); }, style: toolBtn(tool === "object") },
          React.createElement("span", { style: { fontSize: 16, lineHeight: 1 } }, "▬")),
        React.createElement("button", { title: "Place AoE template", onClick: () => { setShowAoe((x) => !x); setShowObjects(false); setTool("aoe"); }, style: toolBtn(tool === "aoe") },
          React.createElement("span", { style: { fontSize: 16, lineHeight: 1 } }, "◯"))
      ),
      // Object palette
      showObjects && canEdit && React.createElement("div", { className: "panel", style: { padding: 8, background: "rgba(24,18,34,0.96)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", gap: 6, minWidth: 130 } },
        React.createElement("div", { style: { fontSize: 10, color: "var(--ink-dim)", fontFamily: "var(--display)", letterSpacing: "0.1em", marginBottom: 2 } }, "PLACE OBJECT"),
        OBJECT_TYPES.map((o) => React.createElement("button", { key: o.id, title: o.label,
          onClick: () => { setPlacingObj({ type: o.id, w: o.w, h: o.h, color: o.color }); },
          style: { display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 7, border: "1px solid " + ((placingObj && placingObj.type === o.id) ? "var(--gold)" : "var(--hair)"), background: (placingObj && placingObj.type === o.id) ? "rgba(232,181,74,0.16)" : "var(--surface)", color: "var(--ink-soft)", cursor: "pointer", fontSize: 12.5 } },
          React.createElement("span", { style: { fontSize: 15, color: o.color } }, o.icon), o.label)),
        React.createElement("div", { style: { height: 1, background: "var(--hair)", margin: "2px 0" } }),
        React.createElement("button", { onClick: onClearObjects, style: { fontSize: 11, color: "var(--red-bright)", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "2px 4px" } }, "✕ Clear all objects")),
      // AoE palette
      showAoe && React.createElement("div", { className: "panel", style: { padding: 8, background: "rgba(24,18,34,0.96)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", gap: 6, minWidth: 130 } },
        React.createElement("div", { style: { fontSize: 10, color: "var(--ink-dim)", fontFamily: "var(--display)", letterSpacing: "0.1em", marginBottom: 2 } }, "AOE TEMPLATE"),
        AOE_TYPES.map((a) => React.createElement("button", { key: a.id,
          onClick: () => setPlacingAoe({ type: a.id, size: a.size }),
          style: { display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 7, border: "1px solid " + ((placingAoe && placingAoe.type === a.id) ? "var(--gold)" : "var(--hair)"), background: (placingAoe && placingAoe.type === a.id) ? "rgba(232,181,74,0.16)" : "var(--surface)", color: "var(--ink-soft)", cursor: "pointer", fontSize: 12.5 } },
          React.createElement("span", { style: { fontSize: 17 } }, a.icon), a.label)),
        React.createElement("div", { style: { height: 1, background: "var(--hair)", margin: "2px 0" } }),
        React.createElement("button", { onClick: onClearAoe, style: { fontSize: 11, color: "var(--red-bright)", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "2px 4px" } }, "✕ Clear all AoE")),
      React.createElement("div", { className: "panel", style: { padding: 6, display: "flex", flexDirection: "column", gap: 4, background: "rgba(24,18,34,0.92)", backdropFilter: "blur(8px)" } },
        React.createElement("button", { title: "Toggle grid", onClick: () => setShowGrid((s) => !s), style: toolBtn(showGrid) }, React.createElement(Icon, { name: "grid", size: 19 })),
        canEdit && React.createElement("button", { title: fogEnabled ? "Fog on" : "Fog off", onClick: () => setFogEnabled((s) => !s), style: toolBtn(fogEnabled) }, React.createElement(Icon, { name: fogEnabled ? "eyeOff" : "eye", size: 19 })),
        canEdit && React.createElement("button", { title: "Reveal all", onClick: onReveal, style: toolBtn(false) }, React.createElement(Icon, { name: "eye", size: 19 })),
        canEdit && React.createElement("button", { title: "Reset fog", onClick: onResetFog, style: toolBtn(false) }, React.createElement(Icon, { name: "x", size: 19 }))
      ),
      React.createElement("div", { className: "panel", style: { padding: 6, display: "flex", flexDirection: "column", gap: 4, background: "rgba(24,18,34,0.92)", backdropFilter: "blur(8px)", alignItems: "center" } },
        React.createElement("button", { title: "Zoom in", onClick: () => setCell((c) => Math.min(72, c + 8)), style: toolBtn(false) }, React.createElement(Icon, { name: "plus", size: 18 })),
        React.createElement("div", { className: "mono", style: { fontSize: 10, color: "var(--ink-dim)" } }, Math.round((cell / 46) * 100) + "%"),
        React.createElement("button", { title: "Zoom out", onClick: () => setCell((c) => Math.max(28, c - 8)), style: toolBtn(false) }, React.createElement("div", { style: { width: 14, height: 2, background: "currentColor", borderRadius: 2 } }))
      )
    );
  }

  // ---------- Token HUD ----------
  function TokenHUD({ sel, damage, removeToken, addCondition, onClose, deathSaves, onDeathSave, inspired, onInspire, note, onNote }) {
    const [customAmt, setCustomAmt] = React.useState("");
    const [showNote, setShowNote] = React.useState(false);
    return React.createElement("div", { className: "panel rise", style: { position: "absolute", bottom: 18, left: 14, zIndex: 35, width: 310, background: "rgba(24,18,34,0.96)", backdropFilter: "blur(8px)" } },
      React.createElement("div", { className: "panel-h", style: { padding: "11px 14px" } },
        React.createElement(window.NZUI.Token, { name: sel.name, ring: sel.ring, size: 30 }),
        React.createElement("div", { className: "col", style: { minWidth: 0 } },
          React.createElement("h3", { style: { fontSize: 13, color: "var(--ink)", textTransform: "none", letterSpacing: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 170 } }, sel.name),
          React.createElement("span", { className: "muted", style: { fontSize: 11 } }, sel.kind === "pc" ? "Player Character" : sel.kind === "ally" ? "Ally" : "Enemy")),
        React.createElement("div", { className: "spacer" }),
        React.createElement("button", { className: "icon-btn", style: { width: 28, height: 28 }, onClick: onClose }, React.createElement(Icon, { name: "x", size: 15 }))),
      React.createElement("div", { style: { padding: 14, display: "flex", flexDirection: "column", gap: 10 } },
        React.createElement(HPBar, { hp: sel.hp, max: sel.hpMax }),
        React.createElement("div", { className: "row", style: { gap: 6 } },
          React.createElement("button", { className: "btn danger sm", style: { flex: 1 }, onClick: () => damage(sel.uid, -10) }, "\u221210"),
          React.createElement("button", { className: "btn danger sm", style: { flex: 1 }, onClick: () => damage(sel.uid, -5) }, "\u22125"),
          React.createElement("button", { className: "btn danger sm", style: { flex: 1 }, onClick: () => damage(sel.uid, -1) }, "\u22121"),
          React.createElement("button", { className: "btn sm", style: { flex: 1, color: "var(--emerald)" }, onClick: () => damage(sel.uid, 1) }, "+1"),
          React.createElement("button", { className: "btn sm", style: { flex: 1, color: "var(--emerald)" }, onClick: () => damage(sel.uid, 5) }, "+5")),
        React.createElement("div", { className: "row", style: { gap: 6 } },
          React.createElement("input", { className: "input", type: "number", placeholder: "Custom dmg/heal", value: customAmt, onChange: (e) => setCustomAmt(e.target.value), style: { flex: 1, height: 32, fontSize: 13 } }),
          React.createElement("button", { className: "btn danger sm", onClick: () => { if (customAmt) { damage(sel.uid, -Math.abs(+customAmt)); setCustomAmt(""); } } }, "Dmg"),
          React.createElement("button", { className: "btn sm", style: { color: "var(--emerald)" }, onClick: () => { if (customAmt) { damage(sel.uid, Math.abs(+customAmt)); setCustomAmt(""); } } }, "Heal")),
        React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } },
          CONDITIONS.map((c) => React.createElement("button", { key: c.code, title: c.label, onClick: () => addCondition(c.code),
            style: { fontSize: 10, padding: "2px 5px", borderRadius: 4, border: "1px solid " + c.color + "88", background: sel.condition === c.code ? c.color : "var(--surface-2)", color: sel.condition === c.code ? "#fff" : "var(--ink-dim)", cursor: "pointer", fontWeight: 600 } }, c.code))),
        // Death saving throws (show when dead/unconscious)
        sel.dead && React.createElement("div", { style: { marginTop: 4 } },
          React.createElement("div", { style: { fontSize: 10, color: "var(--ink-dim)", fontFamily: "var(--display)", letterSpacing: "0.1em", marginBottom: 4 } }, "DEATH SAVING THROWS"),
          React.createElement("div", { style: { display: "flex", gap: 12 } },
            ["s", "f"].map((kind) => React.createElement("div", { key: kind, style: { display: "flex", alignItems: "center", gap: 4 } },
              React.createElement("span", { style: { fontSize: 11, color: kind === "s" ? "var(--emerald)" : "var(--red-bright)", minWidth: 16 } }, kind === "s" ? "✓" : "✕"),
              deathSaves[kind].map((v, i) => React.createElement("button", { key: i, onClick: () => onDeathSave(kind, i),
                style: { width: 16, height: 16, borderRadius: "50%", border: "2px solid " + (kind === "s" ? "var(--emerald)" : "var(--red-bright)"), background: v ? (kind === "s" ? "var(--emerald)" : "var(--red-bright)") : "transparent", cursor: "pointer" } })))))),
        // Inspiration + Notes row
        React.createElement("div", { className: "row", style: { gap: 8 } },
          React.createElement("button", { onClick: onInspire, title: "Toggle Inspiration", style: { flex: "none", fontSize: 18, background: "none", border: "none", cursor: "pointer", filter: inspired ? "none" : "grayscale(1) opacity(0.4)" } }, "⭐"),
          React.createElement("button", { onClick: () => setShowNote((x) => !x), style: { fontSize: 11, color: "var(--ink-dim)", background: "none", border: "1px solid var(--hair)", borderRadius: 6, padding: "3px 8px", cursor: "pointer" } }, note ? "📝 " + note.slice(0, 20) + (note.length > 20 ? "…" : "") : "Add note"),
          React.createElement("div", { className: "spacer" }),
          React.createElement("button", { className: "btn ghost sm", style: { color: "var(--red-bright)" }, onClick: () => removeToken(sel.uid) },
            React.createElement(Icon, { name: "skull", size: 15 }), "Remove")),
        showNote && React.createElement("input", { className: "input", autoFocus: true, placeholder: "e.g. Concentrating on Hold Person…", value: note, onChange: (e) => onNote(e.target.value), style: { fontSize: 12 } }))
    );
  }

  // ---------- Initiative panel ----------
  function InitiativePanel({ order, activeUid, round, turnIdx, nextTurn, rollInitiative, selected, setSelected, damage,
      timerLeft, timerSecs, setTimerSecs, timerOn, combatLog, mapLog }) {
    const pct = timerSecs > 0 ? (timerLeft / timerSecs) * 100 : 0;
    const timerColor = pct > 50 ? "var(--emerald)" : pct > 20 ? "var(--gold)" : "var(--red)";
    const [logTab, setLogTab] = React.useState("combat"); // "combat" | "dice"
    return React.createElement("div", { style: { borderLeft: "1px solid var(--hair)", background: "var(--bg-2)", display: "flex", flexDirection: "column", minHeight: 0 } },
      // Header
      React.createElement("div", { className: "panel-h", style: { borderRadius: 0, borderBottom: "1px solid var(--hair)" } },
        React.createElement(Icon, { name: "swords", size: 18, style: { color: "var(--gold-bright)" } }),
        React.createElement("h3", null, "Initiative"),
        React.createElement("div", { className: "spacer" }),
        React.createElement("span", { className: "tag gold" }, "Round " + round)),
      // Action buttons + timer
      React.createElement("div", { style: { padding: "10px 12px", borderBottom: "1px solid var(--hair)" } },
        React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 8 } },
          React.createElement("button", { className: "btn primary", style: { flex: 1 }, onClick: nextTurn }, React.createElement(Icon, { name: "play", size: 16 }), "Next turn"),
          React.createElement("button", { className: "btn", title: "Roll initiative", onClick: rollInitiative }, React.createElement(Icon, { name: "dice", size: 16 }))),
        // Timer bar
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
          React.createElement("div", { style: { flex: 1, height: 6, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden" } },
            React.createElement("div", { style: { width: pct + "%", height: "100%", background: timerColor, transition: "width 1s linear, background 0.3s", borderRadius: 4 } })),
          React.createElement("span", { className: "mono", style: { fontSize: 11, color: pct < 20 && timerOn ? "var(--red-bright)" : "var(--ink-dim)", minWidth: 24, textAlign: "right" } }, timerLeft + "s"),
          React.createElement("select", { value: timerSecs, onChange: (e) => setTimerSecs(+e.target.value), style: { background: "var(--surface-2)", border: "1px solid var(--hair)", color: "var(--ink-soft)", borderRadius: 6, fontSize: 11, padding: "1px 4px", cursor: "pointer" } },
            [0, 30, 45, 60, 90, 120].map((s) => React.createElement("option", { key: s, value: s }, s === 0 ? "Off" : s + "s"))))),
      // Initiative order list
      React.createElement("div", { style: { flex: 1, overflow: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 6 } },
        order.length === 0 && React.createElement("div", { className: "muted", style: { textAlign: "center", padding: 20, fontSize: 13 } }, "No combatants yet."),
        order.map((t) => React.createElement("div", {
          key: t.uid, onClick: () => setSelected(t.uid),
          style: initRow(t.uid === activeUid, t.uid === selected),
        },
          React.createElement("div", { className: "mono", style: { width: 26, textAlign: "center", fontSize: 16, fontWeight: 700, color: t.uid === activeUid ? "var(--gold-bright)" : "var(--ink-dim)" } }, t.init),
          React.createElement(window.NZUI.Token, { name: t.name, ring: t.ring, size: 34, bloodied: t.bloodied, dead: t.dead }),
          React.createElement("div", { className: "col", style: { flex: 1, minWidth: 0 } },
            React.createElement("div", { style: { fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: t.dead ? "var(--ink-faint)" : "var(--ink)", textDecoration: t.dead ? "line-through" : "none" } }, t.name),
            t.condition && React.createElement("div", { style: { fontSize: 10, color: (CONDITIONS.find((c) => c.code === t.condition) || {}).color || "var(--ink-dim)" } },
              (CONDITIONS.find((c) => c.code === t.condition) || {}).label),
            React.createElement("div", { style: { height: 4, borderRadius: 4, background: "rgba(0,0,0,0.4)", overflow: "hidden", marginTop: 3 } },
              React.createElement("div", { style: { width: (t.hpMax > 0 ? (t.hp / t.hpMax) * 100 : 0) + "%", height: "100%", background: t.hp > t.hpMax / 2 ? "var(--emerald)" : t.hp > t.hpMax / 4 ? "var(--gold)" : "var(--red)" } }))),
          React.createElement("span", { className: "tag", style: { fontSize: 10, padding: "2px 6px", color: t.kind === "enemy" ? "var(--red-bright)" : "var(--emerald)", borderColor: "transparent", background: "transparent" } }, t.kind === "pc" ? "PC" : t.kind === "ally" ? "ALLY" : "NPC")
        ))),
      // Combat / Dice log at the bottom
      React.createElement("div", { style: { borderTop: "1px solid var(--hair)", maxHeight: 160, display: "flex", flexDirection: "column" } },
        React.createElement("div", { style: { display: "flex", gap: 0 } },
          [["combat","⚔ Log"], ["dice","🎲 Rolls"]].map(([tab, label]) =>
            React.createElement("button", { key: tab, onClick: () => setLogTab(tab),
              style: { flex: 1, padding: "6px 4px", fontSize: 11, fontWeight: 600, border: "none", borderBottom: "2px solid " + (logTab === tab ? "var(--gold)" : "transparent"), background: "transparent", color: logTab === tab ? "var(--gold-bright)" : "var(--ink-dim)", cursor: "pointer" } }, label))),
        React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "4px 10px 8px" } },
          (logTab === "combat" ? combatLog : mapLog).length === 0
            ? React.createElement("div", { style: { fontSize: 11.5, color: "var(--ink-faint)", textAlign: "center", padding: 12, fontStyle: "italic" } }, "Nothing logged yet")
            : (logTab === "combat" ? combatLog : mapLog).map((e) =>
                React.createElement("div", { key: e.id, style: { fontSize: 11.5, color: e.kind === "death" ? "var(--red-bright)" : e.kind === "heal" ? "var(--emerald)" : e.kind === "round" ? "var(--gold)" : "var(--ink-soft)", padding: "2px 0", borderBottom: "1px solid var(--hair)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, e.text)))));
  }

  // ---- Map dice overlay (CSS 3D die flying onto the map) ----
  function MapDiceOverlay({ dice }) {
    const t = (window.NZDICE_THEMES || {})[dice.theme] || { bg: "linear-gradient(145deg,#2e2448,#16112a)", border: "#e8b54a", text: "#f7d278", shadow: "0 0 18px rgba(232,181,74,0.35)", emoji: "🎲" };
    const [phase, setPhase] = React.useState("roll");
    React.useEffect(() => {
      const t1 = setTimeout(() => setPhase("settle"), 1100);
      const t2 = setTimeout(() => setPhase("fade"), 2200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);
    if (phase === "fade") return null;
    const faceNums = [1, 6, 2, 5, 3, 4];
    const faceStyle = { position: "absolute", width: 72, height: 72, display: "grid", placeItems: "center", borderRadius: 12,
      background: t.bg, border: `2px solid ${t.border}`, color: t.text,
      fontFamily: "var(--display)", fontWeight: 900, fontSize: 22,
      boxShadow: `inset 0 0 20px rgba(0,0,0,0.4)` };
    const faceT = ["translateZ(36px)", "rotateY(180deg) translateZ(36px)", "rotateY(90deg) translateZ(36px)", "rotateY(-90deg) translateZ(36px)", "rotateX(-90deg) translateZ(36px)", "rotateX(90deg) translateZ(36px)"];
    const result = dice.result;
    const faceIdx = ((result - 1) % 6);
    const offsets = [[0,0],[0,180],[0,-90],[0,90],[90,0],[-90,0]];
    const [rx, ry] = offsets[faceIdx] || [0,0];
    const wrapStyle = {
      position: "absolute", left: dice.pos.x - 36, top: dice.pos.y - 36,
      width: 72, height: 72, zIndex: 55, perspective: 500, pointerEvents: "none",
    };
    const dieStyle = {
      width: 72, height: 72, transformStyle: "preserve-3d", position: "relative",
      "--dx": "-100px", "--dy": "-80px",
      "--ex": `${900 + rx}deg`, "--ey": `${600 + ry}deg`, "--ez": "300deg",
      animation: phase === "roll" ? "diceThrow 1.1s cubic-bezier(0.2,1,0.35,1) forwards" : "none",
      transform: phase === "settle" ? `rotateX(${900 + rx}deg) rotateY(${600 + ry}deg) rotateZ(300deg)` : undefined,
      boxShadow: t.shadow, borderRadius: 12,
    };
    // nat20/nat1 label
    const labelStyle = {
      position: "absolute", top: -28, left: "50%", transform: "translateX(-50%)",
      fontFamily: "var(--display)", fontWeight: 700, fontSize: 14,
      color: dice.crit === "nat20" ? "var(--gold-bright)" : dice.crit === "nat1" ? "var(--red-bright)" : "var(--ink)",
      textShadow: dice.crit ? `0 0 12px currentColor` : "none",
      whiteSpace: "nowrap", pointerEvents: "none",
      background: "rgba(13,10,20,0.82)", padding: "2px 8px", borderRadius: 100, border: "1px solid var(--hair)",
    };
    return React.createElement("div", { style: wrapStyle },
      dice.crit && phase === "settle" && React.createElement("div", { style: labelStyle }, dice.crit === "nat20" ? "NAT 20!" : "NAT 1…"),
      React.createElement("div", { style: dieStyle },
        faceT.map((tf, i) => React.createElement("div", { key: i, style: Object.assign({}, faceStyle, { transform: tf }) }, faceNums[i]))));
  }

  // ---- Hex grid overlay (SVG hexagons) ----
  function HexGridOverlay({ cols, rows, cell }) {
    const hexH = cell, hexW = cell;
    const hexPoints = (cx, cy) => {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts.push(`${cx + hexW * 0.5 * Math.cos(angle)},${cy + hexH * 0.5 * Math.sin(angle)}`);
      }
      return pts.join(" ");
    };
    const hexes = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = (c + 0.5) * hexW + (r % 2 === 0 ? 0 : hexW * 0.5);
        const cy = (r + 0.5) * hexH * 0.866;
        hexes.push(React.createElement("polygon", { key: `${c},${r}`, points: hexPoints(cx, cy), fill: "none", stroke: "rgba(255,255,255,0.09)", strokeWidth: 1 }));
      }
    }
    return React.createElement("svg", { style: { position: "absolute", inset: 0, pointerEvents: "none", width: "100%", height: "100%", overflow: "visible" } }, ...hexes);
  }

  function MeasureOverlay({ measure, cell }) {
    const { from, to } = measure;
    const dx = to.x - from.x, dy = to.y - from.y;
    const dist = Math.round(Math.max(Math.abs(dx), Math.abs(dy)) / cell) * 5; // D&D 5ft chebyshev
    const len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    return React.createElement("div", { style: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 25 } },
      React.createElement("div", { style: { position: "absolute", left: from.x, top: from.y, width: len, height: 2, background: "var(--gold-bright)", transformOrigin: "0 50%", transform: `rotate(${ang}deg)`, boxShadow: "0 0 8px var(--gold)" } }),
      React.createElement("div", { style: { position: "absolute", left: to.x + 8, top: to.y - 10, background: "rgba(13,10,20,0.9)", border: "1px solid var(--gold-deep)", borderRadius: 6, padding: "2px 8px", fontFamily: "var(--mono)", fontSize: 12, color: "var(--gold-bright)" } }, dist + " ft"));
  }

  // ---------- Upload map modal ----------
  function UploadMapModal({ open, onClose, onUpload }) {
    const [name, setName] = useState("");
    const [preset, setPreset] = useState("dungeon");
    const [img, setImg] = useState(null);
    const [cols, setCols] = useState(26), [rows, setRows] = useState(16);
    const fileRef = useRef();
    useEffect(() => { if (open) { setName(""); setImg(null); setPreset("dungeon"); } }, [open]);
    function pickFile(e) {
      const f = e.target.files?.[0]; if (!f) return;
      if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
      const reader = new FileReader();
      reader.onload = (ev) => {
        const raw = ev.target.result;
        const img2 = new Image();
        img2.onload = function() {
          const scale = Math.min(1, 1400 / Math.max(img2.width, img2.height));
          const w = Math.round(img2.width * scale), h = Math.round(img2.height * scale);
          const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
          cv.getContext("2d").drawImage(img2, 0, 0, w, h);
          setImg(cv.toDataURL("image/jpeg", 0.84));
        };
        img2.src = raw;
      };
      reader.readAsDataURL(f);
    }
    function create() {
      onUpload({ id: "m" + Date.now(), name: name || "Untitled Map", bg: preset, img, cols, rows, grid: 28, note: "Freshly conjured" });
    }
    return React.createElement(window.NZUI.Modal, { open, onClose, title: "Upload a Battle Map", sub: "Drop in your own map art, or start from a preset texture.", w: 560 },
      React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 16 } },
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Map name"),
          React.createElement("input", { className: "input", value: name, onChange: (e) => setName(e.target.value), placeholder: "e.g. The Drowned Crypt" })),
        // dropzone
        React.createElement("div", { onClick: () => fileRef.current.click(), style: dropzone(img) },
          React.createElement("input", { ref: fileRef, type: "file", accept: "image/*", hidden: true, onChange: pickFile }),
          img
            ? React.createElement("img", { src: img, style: { maxWidth: "100%", maxHeight: 180, borderRadius: 8, objectFit: "cover" } })
            : React.createElement(React.Fragment, null,
              React.createElement(Icon, { name: "upload", size: 30, style: { color: "var(--gold)" } }),
              React.createElement("div", { style: { color: "var(--ink-soft)", fontWeight: 600, marginTop: 8 } }, "Click to upload map image"),
              React.createElement("div", { className: "muted", style: { fontSize: 12.5, marginTop: 2 } }, "PNG / JPG \u2014 or pick a preset below"))),
        React.createElement("div", { className: "field" }, React.createElement("label", null, "Or start from a preset"),
          React.createElement("div", { className: "row", style: { gap: 8 } },
            [["tavern", "Tavern"], ["dungeon", "Dungeon"], ["forest", "Forest"], ["cave", "Cavern"]].map(([k, l]) =>
              React.createElement("button", { key: k, onClick: () => { setPreset(k); setImg(null); }, style: presetBtn(preset === k && !img, k) }, l)))),
        React.createElement("div", { className: "row", style: { gap: 12 } },
          React.createElement("div", { className: "field", style: { flex: 1 } }, React.createElement("label", null, "Grid columns"),
            React.createElement("input", { className: "input", type: "number", value: cols, onChange: (e) => setCols(+e.target.value || 1) })),
          React.createElement("div", { className: "field", style: { flex: 1 } }, React.createElement("label", null, "Grid rows"),
            React.createElement("input", { className: "input", type: "number", value: rows, onChange: (e) => setRows(+e.target.value || 1) }))),
        React.createElement("div", { className: "row", style: { justifyContent: "flex-end", gap: 10, marginTop: 4 } },
          React.createElement("button", { className: "btn ghost", onClick: onClose }, "Cancel"),
          React.createElement("button", { className: "btn primary", onClick: create }, React.createElement(Icon, { name: "check", size: 16 }), "Add map")))
    );
  }

  // ---------- Add token modal ----------
  function AddTokenModal({ open, onClose, party, bestiary, onAdd }) {
    const [tab, setTab] = useState("party");
    const enemies = bestiary.filter((e) => (e.side || "enemy") === "enemy");
    const allies = bestiary.filter((e) => e.side === "ally");
    const list = tab === "party" ? party : tab === "ally" ? allies : enemies;
    const kindFor = tab === "party" ? "pc" : tab === "ally" ? "ally" : "enemy";
    return React.createElement(window.NZUI.Modal, { open, onClose, title: "Add a Token", sub: "Drop a hero, an ally, or a horror onto the table.", w: 520 },
      React.createElement("div", { style: { padding: 20 } },
        React.createElement("div", { className: "row", style: { gap: 8, marginBottom: 16 } },
          React.createElement("button", { className: "btn sm" + (tab === "party" ? " primary" : " ghost"), onClick: () => setTab("party") }, React.createElement(Icon, { name: "party", size: 15 }), "Party"),
          React.createElement("button", { className: "btn sm" + (tab === "ally" ? " primary" : " ghost"), onClick: () => setTab("ally") }, React.createElement(Icon, { name: "shield", size: 15 }), "Allies"),
          React.createElement("button", { className: "btn sm" + (tab === "enemy" ? " primary" : " ghost"), onClick: () => setTab("enemy") }, React.createElement(Icon, { name: "skull", size: 15 }), "Enemies")),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 340, overflow: "auto" } },
          list.map((m) => React.createElement("button", { key: m.id, onClick: () => onAdd(m, kindFor), style: addCard },
            React.createElement(window.NZUI.Token, { name: m.name, ring: m.ring, size: 38 }),
            React.createElement("div", { className: "col", style: { minWidth: 0, alignItems: "flex-start" } },
              React.createElement("div", { style: { fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 } }, m.name),
              React.createElement("div", { className: "muted", style: { fontSize: 11.5 } }, tab === "party" ? `${m.cls} \u00b7 Lv ${m.level}` : `CR ${m.cr} \u00b7 ${m.type}`))))))
    );
  }

  // ---- helpers / styles ----
  let UIDC = 0;
  function mkTok(src, c, r, kind, suffix, fresh) {
    return { uid: "t" + (++UIDC), id: src.id, name: src.name + (suffix ? " " + suffix : ""), ring: src.ring,
      c, r, hp: src.hp, hpMax: src.hpMax, init: src.init != null ? src.init : (1 + Math.floor(Math.random() * 20)),
      initMod: src.init != null ? src.init : 0,
      kind, bloodied: src.hp <= src.hpMax / 2, dead: false, condition: null, cellSpan: sizeToSpan(src.size) };
  }
  function sizeToSpan(size) {
    if (!size) return 1;
    const s = size.toLowerCase();
    if (s === "large") return 2;
    if (s === "huge") return 3;
    if (s === "gargantuan") return 4;
    return 1;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function freeSpot(tokens, map) {
    for (let r = 1; r < map.rows; r++) for (let c = 1; c < map.cols; c++) {
      if (!tokens.some((t) => t.c === c && t.r === r)) return { c, r };
    }
    return { c: 1, r: 1 };
  }
  function mapTab(active) {
    return { display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 100, cursor: "pointer", flex: "none", fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap",
      border: `1px solid ${active ? "var(--gold-deep)" : "var(--hair)"}`, background: active ? "linear-gradient(180deg, rgba(232,181,74,0.18), rgba(232,181,74,0.05))" : "var(--surface)", color: active ? "var(--gold-bright)" : "var(--ink-soft)" };
  }
  function toolBtn(active) {
    return { width: 38, height: 38, borderRadius: 8, display: "grid", placeItems: "center", cursor: "pointer",
      border: `1px solid ${active ? "var(--gold-deep)" : "transparent"}`, background: active ? "rgba(232,181,74,0.16)" : "transparent", color: active ? "var(--gold-bright)" : "var(--ink-soft)" };
  }
  function dimToggle(active) {
    return { display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 13px", borderRadius: 100, cursor: "pointer", fontSize: 12.5, fontWeight: 700, border: "none",
      background: active ? "linear-gradient(180deg, var(--gold-bright), var(--gold-deep))" : "transparent", color: active ? "#2a1d05" : "var(--ink-dim)" };
  }
  function initRow(active, sel) {
    return { display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: 10, cursor: "pointer",
      border: `1px solid ${active ? "var(--gold-deep)" : sel ? "var(--hair-2)" : "transparent"}`,
      background: active ? "linear-gradient(90deg, rgba(232,181,74,0.16), rgba(232,181,74,0.03))" : sel ? "var(--surface)" : "transparent" };
  }
  function condBtn(active) {
    return { width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontFamily: "var(--display)", fontWeight: 700, fontSize: 13,
      border: `1px solid ${active ? "var(--amethyst)" : "var(--hair)"}`, background: active ? "rgba(145,112,240,0.2)" : "var(--surface-2)", color: active ? "#b59dff" : "var(--ink-dim)" };
  }
  function dropzone(has) {
    return { border: `1.5px dashed ${has ? "var(--gold-deep)" : "var(--hair-2)"}`, borderRadius: 12, padding: 24, textAlign: "center", cursor: "pointer", background: "var(--bg)", transition: "border-color .15s" };
  }
  function presetBtn(active, k) {
    return { flex: 1, padding: "10px 4px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
      border: `1px solid ${active ? "var(--gold-deep)" : "var(--hair)"}`, background: active ? "rgba(232,181,74,0.14)" : "var(--surface-2)", color: active ? "var(--gold-bright)" : "var(--ink-soft)" };
  }
  const addCard = { display: "flex", alignItems: "center", gap: 11, padding: 11, borderRadius: 10, cursor: "pointer", textAlign: "left",
    border: "1px solid var(--hair)", background: "var(--surface)", color: "var(--ink)" };

  window.BattleMap = BattleMap;
})();
