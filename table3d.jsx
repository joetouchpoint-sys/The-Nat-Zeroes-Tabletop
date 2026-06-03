/* TABLE 3D — battle map as a physical table inside a room, with 3D token dragging */
(function () {
  const { useRef, useEffect } = React;
  const T = window.THREE;
  const A = window.Avatar3D;

  function fallbackAvatar(tok) {
    const weapon = /boar|beast|dire/i.test(tok.name) ? "none" : /ghost|witch|mage/i.test(tok.name) ? "staff" : /goblin/i.test(tok.name) ? "dagger" : "sword";
    return { race: "human", bodyType: "broad", height: 1.0,
      skin: tok.ring, hair: "bald", hairColor: "#1a1a1a", brows: true, eyeColor: "#e8412e", facialHair: "none", horns: "straight",
      outfit: "leather", primary: tok.ring, secondary: shade(tok.ring, -0.35), trim: "#2a2228",
      shoulders: true, gloves: true, cape: "none", capeColor: "#2a2228", headgear: "none", weapon, offhand: "none" };
  }
  function shade(hex, amt) {
    const c = new T.Color(hex); c.offsetHSL(0, 0, amt); return "#" + c.getHexString();
  }

  function groundTexture(map, hexMode) {
    const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 1024;
    const x = cv.getContext("2d");
    const palettes = {
      tavern: ["#4a2e14", "#3a2410", "#5a3a1c"], dungeon: ["#2b2630", "#211d28", "#352f3e"],
      forest: ["#23401d", "#1a3216", "#2c4f24"], cave: ["#2a3340", "#1d2530", "#36435a"],
    };
    const pal = palettes[map.bg] || palettes.dungeon;
    x.fillStyle = pal[0]; x.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 1400; i++) { x.fillStyle = pal[1 + (i % 2)]; x.globalAlpha = 0.25; const r = 6 + Math.random() * 26; x.beginPath(); x.arc(Math.random() * 1024, Math.random() * 1024, r, 0, 7); x.fill(); }
    x.globalAlpha = 1;
    x.strokeStyle = "rgba(255,255,255,0.10)"; x.lineWidth = 2;
    if (hexMode) {
      const cw = 1024 / map.cols, ch = 1024 / map.rows;
      const hexR = Math.min(cw, ch) * 0.5;
      for (let r = 0; r <= map.rows; r++) {
        for (let c = 0; c <= map.cols; c++) {
          const cx = (c + 0.5) * cw + (r % 2 === 0 ? 0 : cw * 0.5);
          const cy = (r + 0.5) * ch * 0.866;
          x.beginPath();
          for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 6; const px = cx + hexR * Math.cos(a), py = cy + hexR * Math.sin(a); i === 0 ? x.moveTo(px, py) : x.lineTo(px, py); }
          x.closePath(); x.stroke();
        }
      }
    } else {
      const cw = 1024 / map.cols, ch = 1024 / map.rows;
      for (let c = 0; c <= map.cols; c++) { x.beginPath(); x.moveTo(c * cw, 0); x.lineTo(c * cw, 1024); x.stroke(); }
      for (let r = 0; r <= map.rows; r++) { x.beginPath(); x.moveTo(0, r * ch); x.lineTo(1024, r * ch); x.stroke(); }
    }
    const tex = new T.CanvasTexture(cv); tex.anisotropy = 8; return tex;
  }

  function wallTexture() {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 512;
    const x = cv.getContext("2d");
    x.fillStyle = "#1a1520"; x.fillRect(0, 0, 512, 512);
    const brickH = 40, brickW = 90, mortar = 4;
    for (let row = 0; row < 14; row++) {
      const offset = (row % 2) * (brickW / 2);
      for (let col = -1; col < 7; col++) {
        const bx = col * brickW + offset, by = row * brickH;
        const shade = 0.85 + Math.random() * 0.15;
        x.fillStyle = `rgb(${Math.floor(38 * shade)},${Math.floor(30 * shade)},${Math.floor(48 * shade)})`;
        x.fillRect(bx + mortar, by + mortar, brickW - mortar * 2, brickH - mortar * 2);
      }
    }
    const tex = new T.CanvasTexture(cv); tex.wrapS = T.RepeatWrapping; tex.wrapT = T.RepeatWrapping; tex.repeat.set(3, 3);
    return tex;
  }

  function woodTexture() {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 256;
    const x = cv.getContext("2d");
    x.fillStyle = "#4a2e12"; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) {
      x.strokeStyle = `rgba(${30 + Math.floor(Math.random()*20)},${18 + Math.floor(Math.random()*10)},${8},${0.18 + Math.random()*0.22})`;
      x.lineWidth = 1 + Math.random() * 2;
      x.beginPath(); x.moveTo(Math.random() * 256, 0); x.lineTo(Math.random() * 256, 256); x.stroke();
    }
    const tex = new T.CanvasTexture(cv); tex.wrapS = T.RepeatWrapping; tex.wrapT = T.RepeatWrapping; tex.repeat.set(4, 2);
    return tex;
  }

  function labelSprite(text, color) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 64;
    const x = cv.getContext("2d");
    x.fillStyle = "rgba(12,10,20,0.82)"; roundRect(x, 4, 14, 248, 36, 12); x.fill();
    x.strokeStyle = color; x.lineWidth = 2; roundRect(x, 4, 14, 248, 36, 12); x.stroke();
    x.fillStyle = "#f4eddd"; x.font = "bold 22px Georgia"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(text.length > 16 ? text.slice(0, 15) + "…" : text, 128, 33);
    const tex = new T.CanvasTexture(cv);
    const spr = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    spr.scale.set(1.6, 0.4, 1); return spr;
  }
  function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  function Table3D({ map, tokens, party, bestiary, activeUid, hexMode, onMoveToken, mapObjs, tool, onPlaceObject, onPlaceAoe, onSelectObject3D }) {
    const mountRef = useRef(null);
    const state = useRef({});
    const onMoveRef = useRef(onMoveToken);
    useEffect(() => { onMoveRef.current = onMoveToken; });
    const onPlaceObjRef = useRef(onPlaceObject);
    useEffect(() => { onPlaceObjRef.current = onPlaceObject; });
    const onPlaceAoeRef = useRef(onPlaceAoe);
    useEffect(() => { onPlaceAoeRef.current = onPlaceAoe; });
    const onSelectObjRef = useRef(onSelectObject3D);
    useEffect(() => { onSelectObjRef.current = onSelectObject3D; });
    const toolRef = useRef(tool);
    useEffect(() => { toolRef.current = tool; });

    useEffect(() => {
      if (!T) return;
      const cont = mountRef.current;
      const w = cont.clientWidth, h = cont.clientHeight;
      const scene = new T.Scene();
      scene.fog = new T.FogExp2(0x0d0a14, 0.012);
      const renderer = new T.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.setClearColor(0x0d0a14, 1);
      cont.appendChild(renderer.domElement);

      const camera = new T.PerspectiveCamera(42, w / h, 0.1, 500);

      scene.add(new T.HemisphereLight(0x9a8aaa, 0x1a1020, 0.5));
      const key = new T.DirectionalLight(0xfff0d8, 1.05); key.position.set(8, 18, 10);
      key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
      const d = 28; key.shadow.camera.left = -d; key.shadow.camera.right = d; key.shadow.camera.top = d; key.shadow.camera.bottom = -d; key.shadow.camera.far = 60;
      scene.add(key);
      const fillD = new T.DirectionalLight(0x9170f0, 0.3); fillD.position.set(-10, 6, -8); scene.add(fillD);

      const boardGroup = new T.Group(); scene.add(boardGroup);
      const figGroup = new T.Group(); scene.add(figGroup);
      const objGroup = new T.Group(); scene.add(objGroup);

      // Orbit state
      const cam = { az: 0.6, pol: 0.88, dist: Math.max(map.cols, map.rows) * 0.95, tAz: 0.6, tPol: 0.88, tDist: Math.max(map.cols, map.rows) * 0.95, cx: 0, cz: 0 };
      let dragging = false, px = 0, py = 0;
      const dom = renderer.domElement; dom.style.cursor = "grab";

      // Raycaster for 3D token drag-and-drop
      const raycaster = new T.Raycaster();
      const mouseNDC = new T.Vector2();
      const groundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
      let tokenDrag = null; // { uid, figObj, shadowDisc, downX, downY, lastC, lastR }

      function pickFigureAt(e) {
        const rect = dom.getBoundingClientRect();
        mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouseNDC, camera);
        const figs = state.current.figureObjects || [];
        let best = null, bestDist = Infinity;
        figs.forEach(({ uid, obj }) => {
          const box = new T.Box3().setFromObject(obj);
          const center = new T.Vector3(); box.getCenter(center);
          const size = new T.Vector3(); box.getSize(size);
          const sph = new T.Sphere(center, Math.max(size.x, size.z) * 0.7);
          if (raycaster.ray.intersectsSphere(sph)) {
            const d = camera.position.distanceTo(center);
            if (d < bestDist) { bestDist = d; best = { uid, obj }; }
          }
        });
        return best;
      }

      function groundPosAt(e) {
        const rect = dom.getBoundingClientRect();
        mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouseNDC, camera);
        const pt = new T.Vector3();
        return raycaster.ray.intersectPlane(groundPlane, pt) ? pt : null;
      }

      const DRAG_THRESHOLD = 6;
      const down = (e) => {
        if (e.button !== 0) { dragging = true; px = e.clientX; py = e.clientY; return; }
        const currentTool = toolRef.current;
        // Object/AoE placement: raycast to ground plane, get grid cell
        if (currentTool === "object" || currentTool === "aoe") {
          const pt = groundPosAt(e);
          if (pt) {
            const W = state.current.boardW || map.cols, H = state.current.boardH || map.rows;
            const c = Math.max(0, Math.min(W - 1, Math.floor(pt.x + W / 2)));
            const r = Math.max(0, Math.min(H - 1, Math.floor(pt.z + H / 2)));
            if (currentTool === "object" && onPlaceObjRef.current) onPlaceObjRef.current(c, r);
            if (currentTool === "aoe" && onPlaceAoeRef.current) onPlaceAoeRef.current(c, r);
          }
          return;
        }
        // Raycast against placed objects (select for 3D manipulation)
        const objMeshes = (state.current.objectMeshes || []).map(function(o) { return o.mesh; });
        if (objMeshes.length > 0 && onSelectObjRef.current) {
          raycaster.setFromCamera(mouseNDC, camera);
          const hits = raycaster.intersectObjects(objMeshes, false);
          if (hits.length > 0) {
            const hit = hits[0].object;
            const entry = (state.current.objectMeshes || []).find(function(o) { return o.mesh === hit; });
            if (entry) { onSelectObjRef.current(entry.id); return; }
          }
        }
        const fig = pickFigureAt(e);
        if (fig && onMoveRef.current) {
          tokenDrag = { uid: fig.uid, figObj: fig.obj, downX: e.clientX, downY: e.clientY, started: false, lastC: -1, lastR: -1, shadowDisc: null };
          dom.style.cursor = "grabbing";
          return;
        }
        dragging = true; px = e.clientX; py = e.clientY; dom.style.cursor = "grabbing";
      };

      const move = (e) => {
        if (tokenDrag) {
          const dx = e.clientX - tokenDrag.downX, dy = e.clientY - tokenDrag.downY;
          if (!tokenDrag.started && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          if (!tokenDrag.started) {
            // Lift the figure
            tokenDrag.started = true;
            tokenDrag.figObj.position.y = 2.2;
            // Shadow disc
            const sd = new T.Mesh(new T.CircleGeometry(0.5, 24), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, side: T.DoubleSide }));
            sd.rotation.x = -Math.PI / 2; sd.position.y = 0.05;
            state.current.figGroup.add(sd); tokenDrag.shadowDisc = sd;
          }
          const pt = groundPosAt(e);
          if (pt) {
            const W = state.current.boardW, H = state.current.boardH;
            const c = Math.max(0, Math.min(W - 1, Math.floor(pt.x + W / 2)));
            const r = Math.max(0, Math.min(H - 1, Math.floor(pt.z + H / 2)));
            const wx = c - W / 2 + 0.5, wz = r - H / 2 + 0.5;
            tokenDrag.figObj.position.set(wx, 2.2, wz);
            if (tokenDrag.shadowDisc) tokenDrag.shadowDisc.position.set(wx, 0.05, wz);
            tokenDrag.lastC = c; tokenDrag.lastR = r;
          }
          return;
        }
        if (!dragging) return;
        cam.tAz -= (e.clientX - px) * 0.008;
        cam.tPol = Math.max(0.25, Math.min(1.35, cam.tPol - (e.clientY - py) * 0.006));
        px = e.clientX; py = e.clientY;
      };

      const up = () => {
        if (tokenDrag) {
          if (tokenDrag.started && tokenDrag.lastC >= 0) {
            onMoveRef.current && onMoveRef.current(tokenDrag.uid, tokenDrag.lastC, tokenDrag.lastR);
          } else if (!tokenDrag.started) {
            // Was a click not a drag — no-op
          }
          if (tokenDrag.shadowDisc) { state.current.figGroup.remove(tokenDrag.shadowDisc); A.disposeObj(tokenDrag.shadowDisc); }
          tokenDrag = null;
        }
        dragging = false; dom.style.cursor = "grab";
      };
      dom.addEventListener("pointerdown", down); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
      const wheel = (e) => { e.preventDefault(); cam.tDist = Math.max(6, Math.min(80, cam.tDist + e.deltaY * 0.02)); };
      dom.addEventListener("wheel", wheel, { passive: false });

      let raf;
      function loop() {
        raf = requestAnimationFrame(loop);
        cam.az += (cam.tAz - cam.az) * 0.12; cam.pol += (cam.tPol - cam.pol) * 0.12; cam.dist += (cam.tDist - cam.dist) * 0.12;
        const r = cam.dist;
        camera.position.set(cam.cx + r * Math.sin(cam.pol) * Math.sin(cam.az), r * Math.cos(cam.pol), cam.cz + r * Math.sin(cam.pol) * Math.cos(cam.az));
        camera.lookAt(cam.cx, 0, cam.cz);
        if (state.current.activeRing) { const s = 1 + Math.sin(performance.now() * 0.005) * 0.08; state.current.activeRing.scale.set(s, 1, s); }
        // Pulse selection glow
        if (state.current.selGlow) { const s = 1 + Math.sin(performance.now() * 0.008) * 0.12; state.current.selGlow.scale.set(s, 1, s); }
        renderer.render(scene, camera);
      }
      loop();
      function resize() { const W = cont.clientWidth, H = cont.clientHeight; if (!W || !H) return; renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); }
      const ro = new ResizeObserver(resize); ro.observe(cont);

      function handleDice(e) { throwDice3D(e.detail.result, e.detail.theme); }
      window.addEventListener("nz:dice", handleDice);

      state.current = { scene, renderer, camera, boardGroup, figGroup, objGroup, cam,
        figureObjects: [], activeRing: null,
        boardW: map.cols, boardH: map.rows,
        dispose() {
          cancelAnimationFrame(raf); ro.disconnect();
          dom.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); dom.removeEventListener("wheel", wheel);
          window.removeEventListener("nz:dice", handleDice);
          A.disposeObj(scene); renderer.dispose(); if (dom.parentNode) dom.parentNode.removeChild(dom);
        }
      };
      buildBoard(); syncFigures();
      setTimeout(resize, 0); requestAnimationFrame(resize);
      return () => state.current.dispose && state.current.dispose();

      function throwDice3D(result, theme) {
        const s = state.current; if (!s.scene) return;
        const THEMES = window.NZDICE_THEMES || {};
        const t = THEMES[theme] || THEMES.standard || {};
        const dieColor = t.border ? new T.Color(t.border) : new T.Color("#e8b54a");
        const dieEmit = new T.Color(t.border || "#e8b54a");
        const mat = new T.MeshStandardMaterial({ color: dieColor, emissive: dieEmit, emissiveIntensity: 0.35, roughness: 0.45, metalness: 0.2 });
        const geo = new T.IcosahedronGeometry(0.55, 0);
        const dieMesh = new T.Mesh(geo, mat); dieMesh.castShadow = true;
        const lbl = labelSprite(String(result), "#" + dieColor.getHexString());
        lbl.scale.set(1.2, 0.3, 1);
        const W = map.cols, H = map.rows;
        const lx = (Math.random() - 0.5) * W * 0.5, lz = (Math.random() - 0.5) * H * 0.5;
        s.scene.add(dieMesh); s.scene.add(lbl);
        const startY = 8 + Math.random() * 4;
        const startX = lx + (Math.random() - 0.5) * 4, startZ = lz + (Math.random() - 0.5) * 4;
        dieMesh.position.set(startX, startY, startZ);
        const spinX = (Math.random() - 0.5) * 20, spinY = (Math.random() - 0.5) * 20, spinZ = (Math.random() - 0.5) * 20;
        let t0 = null, phase = "fall";
        const bounceY = [0.6, 0.28, 0.1, 0]; let bounceIdx = 0;
        function animDie(now) {
          if (t0 === null) t0 = now;
          const dt = (now - t0) / 1000;
          if (phase === "fall") {
            const p = Math.min(1, dt / 0.7); const ep = 1 - Math.pow(1 - p, 3);
            dieMesh.position.set(startX + (lx - startX) * ep, startY + (0 - startY) * ep + bounceY[0] * (1 - ep), startZ + (lz - startZ) * ep);
            dieMesh.rotation.set(spinX * dt, spinY * dt, spinZ * dt);
            if (p >= 1) { phase = "bounce"; t0 = now; bounceIdx = 0; }
          } else if (phase === "bounce") {
            const p = Math.min(1, dt / 0.25); const ep = Math.sin(p * Math.PI);
            dieMesh.position.set(lx, ep * (bounceY[bounceIdx] || 0.1), lz);
            if (p >= 1) { bounceIdx++; t0 = now; if (bounceIdx >= bounceY.length - 1) phase = "settle"; }
          } else if (phase === "settle") {
            dieMesh.position.set(lx, 0.55, lz); lbl.position.set(lx, 2.1, lz);
            if (dt > 1.5) { phase = "fade"; t0 = now; }
          } else if (phase === "fade") {
            const p = Math.min(1, dt / 0.7);
            dieMesh.material.opacity = 1 - p; dieMesh.material.transparent = true; dieMesh.material.needsUpdate = true;
            if (lbl.material) { lbl.material.opacity = 1 - p; lbl.material.needsUpdate = true; }
            if (p >= 1) { s.scene.remove(dieMesh); s.scene.remove(lbl); A.disposeObj(dieMesh); return; }
          }
          lbl.position.set(lx, phase === "settle" || phase === "fade" ? 2.1 : dieMesh.position.y + 1.5, lz);
          requestAnimationFrame(animDie);
        }
        requestAnimationFrame(animDie);
      }
    }, []);

    useEffect(() => { if (state.current.boardGroup) { buildBoard(); syncFigures(); syncObjects(); } }, [map.id, hexMode]);
    useEffect(() => { if (state.current.figGroup) syncFigures(); }, [tokens, activeUid]);
    useEffect(() => { if (state.current.objGroup) syncObjects(); }, [mapObjs]);

    function buildBoard() {
      const s = state.current; const g = s.boardGroup;
      while (g.children.length) { const c = g.children.pop(); A.disposeObj(c); }
      const W = map.cols, H = map.rows;

      // ---- Battle-map surface (the grid) ----
      const planeMat = new T.MeshStandardMaterial({ map: groundTexture(map, hexMode), roughness: 0.95, metalness: 0 });
      // If the map has a custom uploaded image, swap in that texture once loaded
      if (map.img) {
        new T.TextureLoader().load(map.img, function(imgTex) {
          imgTex.anisotropy = 8;
          // Composite: draw image + grid overlay onto canvas
          const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 1024;
          const ctx = cv.getContext("2d");
          ctx.drawImage(imgTex.image, 0, 0, 1024, 1024);
          ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1.5;
          const cw = 1024 / W, ch = 1024 / H;
          for (let c = 0; c <= W; c++) { ctx.beginPath(); ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, 1024); ctx.stroke(); }
          for (let r = 0; r <= H; r++) { ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(1024, r * ch); ctx.stroke(); }
          const combined = new T.CanvasTexture(cv); combined.anisotropy = 8;
          planeMat.map = combined; planeMat.needsUpdate = true;
        });
      }
      const plane = new T.Mesh(new T.BoxGeometry(W, 0.5, H), planeMat);
      plane.position.y = -0.25; plane.receiveShadow = true; g.add(plane);

      // ---- Table top (wooden slab the board sits on) ----
      const wTex = woodTexture();
      const tableMat = new T.MeshStandardMaterial({ map: wTex, roughness: 0.82, metalness: 0.02 });
      const tableTop = new T.Mesh(new T.BoxGeometry(W + 1.8, 0.7, H + 1.8), tableMat);
      tableTop.position.y = -0.62; tableTop.receiveShadow = true; tableTop.castShadow = true; g.add(tableTop);

      // ---- Table legs ----
      const legMat = new T.MeshStandardMaterial({ color: 0x3d2210, roughness: 0.9 });
      const legH = 3.0, legY = -0.95 - legH / 2;
      const lx = W / 2 + 0.5, lz = H / 2 + 0.5;
      [[lx, lz], [-lx, lz], [lx, -lz], [-lx, -lz]].forEach(([x, z]) => {
        const leg = new T.Mesh(new T.BoxGeometry(0.55, legH, 0.55), legMat);
        leg.position.set(x, legY, z); leg.castShadow = true; leg.receiveShadow = true; g.add(leg);
        // Foot pad
        const foot = new T.Mesh(new T.BoxGeometry(0.75, 0.12, 0.75), legMat);
        foot.position.set(x, legY - legH / 2 + 0.06, z); g.add(foot);
      });

      const floorY = -0.95 - legH;

      // ---- Room floor ----
      const floorCanvas = document.createElement("canvas"); floorCanvas.width = 512; floorCanvas.height = 512;
      const fc = floorCanvas.getContext("2d");
      fc.fillStyle = "#1e1828"; fc.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 600; i++) { fc.fillStyle = `rgba(${20 + Math.floor(Math.random()*15)},${14 + Math.floor(Math.random()*10)},${28 + Math.floor(Math.random()*10)},0.4)`; const r = 4 + Math.random() * 20; fc.beginPath(); fc.arc(Math.random() * 512, Math.random() * 512, r, 0, 7); fc.fill(); }
      // Stone tile lines
      fc.strokeStyle = "rgba(255,255,255,0.05)"; fc.lineWidth = 2;
      for (let i = 0; i < 512; i += 64) { fc.beginPath(); fc.moveTo(i, 0); fc.lineTo(i, 512); fc.stroke(); fc.beginPath(); fc.moveTo(0, i); fc.lineTo(512, i); fc.stroke(); }
      const floorTex = new T.CanvasTexture(floorCanvas); floorTex.wrapS = T.RepeatWrapping; floorTex.wrapT = T.RepeatWrapping; floorTex.repeat.set(8, 8);
      const floor = new T.Mesh(new T.PlaneGeometry(80, 80), new T.MeshStandardMaterial({ map: floorTex, roughness: 0.95, metalness: 0.02 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = floorY; floor.receiveShadow = true; g.add(floor);

      // ---- Room walls ----
      const wTx = wallTexture();
      const wallMat = new T.MeshStandardMaterial({ map: wTx, roughness: 0.92, metalness: 0 });
      const wallH = 10, wallDist = Math.max(W, H) / 2 + 9;
      const wallY = floorY + wallH / 2;
      [
        [0, wallDist, 0, W + 22, wallH, 0.5, 0],
        [0, -wallDist, 0, W + 22, wallH, 0.5, Math.PI],
        [wallDist, 0, 0, 0.5, wallH, H + 22, Math.PI / 2],
        [-wallDist, 0, 0, 0.5, wallH, H + 22, -Math.PI / 2],
      ].forEach(([x, z, unused, bw, bh, bd, ry]) => {
        const wall = new T.Mesh(new T.BoxGeometry(bw, bh, bd), wallMat);
        wall.position.set(x, wallY, z); wall.receiveShadow = true; g.add(wall);
      });

      // Ceiling
      const ceil = new T.Mesh(new T.PlaneGeometry(80, 80), new T.MeshStandardMaterial({ color: 0x120e1a, roughness: 1.0 }));
      ceil.rotation.x = Math.PI / 2; ceil.position.y = floorY + wallH; g.add(ceil);

      // No ceiling beams (removed — they obscured the table view)

      // ---- Wall torches ----
      const torchMat = new T.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.88 });
      const flameMat = new T.MeshStandardMaterial({ color: 0xff9030, emissive: 0xff5010, emissiveIntensity: 1.4, roughness: 0.5 });
      [
        [-wallDist + 0.6, floorY + 5.5, 0],
        [wallDist - 0.6, floorY + 5.5, 0],
        [0, floorY + 5.5, wallDist - 0.6],
        [0, floorY + 5.5, -wallDist + 0.6],
      ].forEach(([tx, ty, tz]) => {
        const stick = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.5, 8), torchMat);
        stick.position.set(tx, ty, tz); g.add(stick);
        const flame = new T.Mesh(new T.SphereGeometry(0.14, 10, 10), flameMat);
        flame.position.set(tx, ty + 0.32, tz); flame.scale.set(1, 1.3, 1); g.add(flame);
        const pl = new T.PointLight(0xff7020, 2.2, 18);
        pl.position.set(tx, ty + 0.4, tz); pl.castShadow = false; g.add(pl);
      });

      s.cam.cx = 0; s.cam.cz = 0;
      s.boardW = W; s.boardH = H;
    }

    function syncFigures() {
      const s = state.current; const g = s.figGroup;
      while (g.children.length) { const c = g.children.pop(); A.disposeObj(c); }
      s.activeRing = null;
      s.figureObjects = [];
      const W = map.cols, H = map.rows;
      tokens.forEach((tok) => {
        let cfg;
        if (window.NZAVATARS && window.NZAVATARS[tok.id]) cfg = window.NZAVATARS[tok.id];
        else if (tok.kind === "pc") cfg = (party.find((p) => p.id === tok.id) || {}).avatar;
        else {
          const b = bestiary.find((e) => e.id === tok.id);
          // Check beast-specific avatar saved by DM in Compendium editor
          try { const ba = JSON.parse(localStorage.getItem("nz_beastavatars") || "{}"); if (ba[tok.id]) { cfg = ba[tok.id]; } else { cfg = b && b.avatar; } } catch(e2) { cfg = b && b.avatar; }
        }
        if (!cfg) cfg = fallbackAvatar(tok);
        const fig = A.build(cfg);
        const sc = 0.55 * (tok.kind === "enemy" ? 1.0 : 0.92);
        fig.scale.setScalar(sc);
        const wx = tok.c - W / 2 + 0.5, wz = tok.r - H / 2 + 0.5;
        fig.position.set(wx, 0, wz);
        fig.rotation.y = tok.kind === "enemy" ? 0 : Math.PI;
        if (tok.dead) { fig.rotation.x = Math.PI / 2; fig.position.y = 0.1; }
        g.add(fig);
        s.figureObjects.push({ uid: tok.uid, obj: fig });

        const ringColor = tok.kind === "pc" ? 0x4fb98a : tok.kind === "ally" ? 0x4ea7e8 : 0xe8412e;
        const ring = new T.Mesh(new T.TorusGeometry(0.42, 0.05, 8, 28), new T.MeshStandardMaterial({ color: ringColor, emissive: ringColor, emissiveIntensity: 0.4, roughness: 0.4 }));
        ring.rotation.x = Math.PI / 2; ring.position.set(wx, 0.03, wz); g.add(ring);

        if (tok.uid === activeUid) {
          const glow = new T.Mesh(new T.RingGeometry(0.5, 0.66, 32), new T.MeshBasicMaterial({ color: 0xf7d278, transparent: true, opacity: 0.8, side: T.DoubleSide }));
          glow.rotation.x = -Math.PI / 2; glow.position.set(wx, 0.04, wz); g.add(glow); s.activeRing = glow;
        }

        const lbl = labelSprite(tok.name, "#" + ringColor.toString(16).padStart(6, "0"));
        lbl.position.set(wx, 1.5, wz); g.add(lbl);
      });
    }

    function syncObjects() {
      const s = state.current; if (!s.objGroup) return;
      const g = s.objGroup;
      while (g.children.length) { const c = g.children.pop(); A.disposeObj(c); }
      const W = map.cols, H = map.rows;
      const objs = mapObjs || [];
      s.objectMeshes = []; // track id→mesh for raycasting
      const OBJ_COLORS = { wall: 0x3a2a1a, pillar: 0x2a2230, crate: 0x5c3a1e, barrel: 0x4a2e14, rock: 0x3a3540, tree: 0x1a3216, door: 0x6b4423, table: 0x5c3010 };
      const mats = {};
      Object.entries(OBJ_COLORS).forEach(([k, c]) => { mats[k] = new T.MeshStandardMaterial({ color: c, roughness: 0.88 }); });
      objs.forEach((obj) => {
        const wx = obj.c - W / 2 + (obj.w || 1) / 2, wz = obj.r - H / 2 + (obj.h || 1) / 2;
        const mat = mats[obj.type] || mats.crate;
        let mesh;
        if (obj.type === "pillar" || obj.type === "barrel" || obj.type === "tree") {
          mesh = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, obj.type === "pillar" ? 2.0 : 0.9, 12), mat);
        } else if (obj.type === "rock") {
          mesh = new T.Mesh(new T.IcosahedronGeometry(0.42, 0), mat);
        } else {
          const h3d = obj.type === "door" ? 2.2 : obj.type === "wall" ? 1.6 : obj.type === "table" ? 0.7 : 0.85;
          mesh = new T.Mesh(new T.BoxGeometry((obj.w || 1) * 0.96, h3d, (obj.h || 1) * 0.96), mat);
        }
        const baseY = obj.type === "wall" ? 0.8 : obj.type === "table" ? 0.35 : 0.425;
        mesh.position.set(wx, baseY, wz);
        if (obj.rotation) mesh.rotation.y = obj.rotation * Math.PI / 180;
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.userData.objId = obj.id; // tag for raycasting
        g.add(mesh);
        s.objectMeshes.push({ id: obj.id, mesh });
      });
    }

    return React.createElement("div", { ref: mountRef, style: { position: "absolute", inset: 0 },
      onContextMenu: (e) => e.preventDefault() });
  }

  window.Table3D = Table3D;
})();
