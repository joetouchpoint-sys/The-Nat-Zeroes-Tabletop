/* ============================================================
   Avatar3D v2 — smooth stylized humanoid (Three.js)
   Capsule limbs, lathe torso, faces, hair, beards, capes, armor.
   window.Avatar3D = { OPTIONS, GROUPS, DEFAULT, build(cfg), makeViewer(...), randomConfig() }
   ============================================================ */
(function () {
  const T = window.THREE;

  // ---------------- option metadata ----------------
  const OPTIONS = {
    race: [
      { id: "human", label: "Human" }, { id: "elf", label: "Elf" }, { id: "halfelf", label: "Half-Elf" },
      { id: "halforc", label: "Half-Orc" }, { id: "tiefling", label: "Tiefling" }, { id: "dragonborn", label: "Dragonborn" },
      { id: "dwarf", label: "Dwarf" }, { id: "gnome", label: "Gnome" }, { id: "halfling", label: "Halfling" },
    ],
    bodyType: [{ id: "slim", label: "Slim" }, { id: "average", label: "Average" }, { id: "athletic", label: "Athletic" }, { id: "broad", label: "Broad" }],
    hair: [
      { id: "bald", label: "Bald" }, { id: "buzz", label: "Buzz" }, { id: "short", label: "Short" }, { id: "swept", label: "Swept" },
      { id: "messy", label: "Messy" }, { id: "long", label: "Long" }, { id: "ponytail", label: "Ponytail" }, { id: "bun", label: "Top knot" },
      { id: "braids", label: "Braids" }, { id: "mohawk", label: "Mohawk" }, { id: "afro", label: "Afro" }, { id: "twin", label: "Twin tails" },
    ],
    facialHair: [
      { id: "none", label: "Clean" }, { id: "stubble", label: "Stubble" }, { id: "mustache", label: "Mustache" },
      { id: "goatee", label: "Goatee" }, { id: "full", label: "Full beard" }, { id: "long", label: "Long beard" },
    ],
    horns: [
      { id: "none", label: "None" }, { id: "curved", label: "Curved" }, { id: "straight", label: "Straight" },
      { id: "ram", label: "Ram" }, { id: "antlers", label: "Antlers" }, { id: "crown", label: "Crown" },
    ],
    outfit: [
      { id: "tunic", label: "Tunic" }, { id: "leather", label: "Leather armor" }, { id: "plate", label: "Plate armor" },
      { id: "robe", label: "Mage robe" }, { id: "noble", label: "Noble coat" }, { id: "ranger", label: "Ranger garb" }, { id: "barbarian", label: "Furs" },
    ],
    cape: [{ id: "none", label: "None" }, { id: "short", label: "Short" }, { id: "long", label: "Long" }, { id: "hooded", label: "Hooded cloak" }, { id: "tattered", label: "Tattered" }],
    headgear: [
      { id: "none", label: "None" }, { id: "circlet", label: "Circlet" }, { id: "wizard", label: "Wizard hat" }, { id: "hood", label: "Hood" },
      { id: "helmOpen", label: "Open helm" }, { id: "helmFull", label: "Great helm" }, { id: "crown", label: "Crown" }, { id: "cap", label: "Cap" }, { id: "bandana", label: "Bandana" },
    ],
    weapon: [
      { id: "none", label: "None" }, { id: "sword", label: "Sword" }, { id: "greatsword", label: "Greatsword" }, { id: "staff", label: "Staff" },
      { id: "bow", label: "Bow" }, { id: "axe", label: "Axe" }, { id: "dagger", label: "Dagger" }, { id: "mace", label: "Mace" }, { id: "spear", label: "Spear" }, { id: "wand", label: "Wand" },
    ],
    offhand: [{ id: "none", label: "None" }, { id: "shield", label: "Shield" }, { id: "roundshield", label: "Round shield" }, { id: "torch", label: "Torch" }, { id: "book", label: "Spellbook" }, { id: "lantern", label: "Lantern" }],
    skin: ["#f6d3b0", "#eebd96", "#d99e6f", "#b87a47", "#8a5a32", "#5e3a1f", "#9fb89a", "#7fae8a", "#c98a8a", "#b97fc0", "#8a93c0", "#cfd3da"],
    hairColor: ["#1c140e", "#3a2418", "#6b4423", "#9a6a32", "#c9a24a", "#e3d6b0", "#9a9a9a", "#e6e0d2", "#2a2440", "#3a2a4a", "#7a2e2e", "#2e5a6a"],
    eyeColor: ["#3a2a1a", "#6b4a22", "#4a7d4a", "#2f6d8a", "#4a4a9a", "#7a4a9a", "#b08a3a", "#9a3a3a", "#d0a020"],
    primary: ["#3b3a8c", "#7d8896", "#9c3b6e", "#3c5a36", "#c9a84a", "#6e4a2f", "#2e3a36", "#3a4d8c", "#8a2f2f", "#2f6d6a", "#5a3a7a", "#b0763a"],
    secondary: ["#221f5a", "#3a4350", "#5e2342", "#243a20", "#7d6320", "#42291a", "#1c2420", "#222a44", "#561d1d", "#1d4442", "#371f52", "#6e4520"],
    trim: ["#e8c35a", "#cdd3da", "#d9a23a", "#8a909a", "#caa46a", "#e3d6b0", "#2a2228", "#b07f30"],
  };

  // creator grouping for tabbed UI
  const GROUPS = [
    { id: "body", label: "Body", controls: [["race", "Race", "chips"], ["bodyType", "Build", "chips"], ["height", "Height", "slider"], ["skin", "Skin tone", "color"]] },
    { id: "head", label: "Head & Face", controls: [["eyeColor", "Eye colour", "color"], ["brows", "Eyebrows", "toggle"], ["facialHair", "Facial hair", "chips"], ["facialHairColor", "Beard colour", "color"], ["horns", "Horns / antlers", "chips"]] },
    { id: "hair", label: "Hair", controls: [["hair", "Hairstyle", "chips"], ["hairColor", "Hair colour", "color"]] },
    { id: "outfit", label: "Outfit", controls: [["outfit", "Outfit", "chips"], ["primary", "Primary", "color"], ["secondary", "Secondary", "color"], ["trim", "Trim", "color"], ["shoulders", "Shoulder pads", "toggle"], ["gloves", "Gloves", "toggle"]] },
    { id: "extras", label: "Cloak & Gear", controls: [["cape", "Cape / cloak", "chips"], ["capeColor", "Cloak colour", "color"], ["headgear", "Headgear", "chips"], ["weapon", "Main hand", "chips"], ["offhand", "Off hand", "chips"]] },
    { id: "pose", label: "Pose", controls: [
      ["poseArmLRaise", "Left arm raise", "poseslider"],
      ["poseArmRRaise", "Right arm raise", "poseslider"],
      ["poseArmLOut", "Left arm out", "poseslider"],
      ["poseArmROut", "Right arm out", "poseslider"],
      ["poseHeadTilt", "Head tilt", "poseslider"],
      ["poseBodyLean", "Body lean", "poseslider"],
      ["poseWeaponX", "Weapon forward/back", "poseslider"],
      ["poseWeaponRot", "Weapon angle", "poseslider"],
    ]},
  ];

  const DEFAULT = {
    race: "human", bodyType: "average", height: 1,
    skin: "#eebd96", hair: "short", hairColor: "#3a2418",
    brows: true, eyeColor: "#4a4a9a", facialHair: "none", facialHairColor: "#3a2418", horns: "none",
    outfit: "leather", primary: "#3c5a36", secondary: "#243a20", trim: "#caa46a",
    shoulders: true, gloves: true, cape: "none", capeColor: "#5e2342",
    headgear: "none", weapon: "sword", offhand: "none",
    // Pose overrides (0 = default position)
    poseArmLRaise: 0, poseArmRRaise: 0, poseArmLOut: 0, poseArmROut: 0,
    poseHeadTilt: 0, poseBodyLean: 0, poseWeaponX: 0, poseWeaponRot: 0,
  };

  // ---------------- materials ----------------
  function smat(color, o) { return new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.0 }, o || {})); }
  function metal(color, rough) { return new T.MeshStandardMaterial({ color, roughness: rough !== undefined ? rough : 0.28, metalness: 0.92 }); }
  function cloth(color) { return new T.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0 }); }

  // ---------------- geometry helpers ----------------
  function capsuleGeo(r, len, radial) {
    radial = radial || 28; const seg = 10, h = len / 2, pts = [];
    for (let i = 0; i <= seg; i++) { const a = -Math.PI / 2 + (i / seg) * (Math.PI / 2); pts.push(new T.Vector2(Math.cos(a) * r, -h + Math.sin(a) * r)); }
    for (let i = 0; i <= seg; i++) { const a = (i / seg) * (Math.PI / 2); pts.push(new T.Vector2(Math.cos(a) * r, h + Math.sin(a) * r)); }
    const g = new T.LatheGeometry(pts, radial); g.computeVertexNormals(); return g;
  }
  function limb(r, len, mat) { const m = new T.Mesh(capsuleGeo(r, len), mat); return m; }
  function sphere(r, mat, seg) { return new T.Mesh(new T.SphereGeometry(r, seg || 32, seg || 28), mat); }

  // torso as a smooth lathe (waist->chest->shoulders) revolved, then flattened in Z
  function torsoGeo(profileScale) {
    const p = [
      [0.02, 0.0], [0.21, 0.02], [0.235, 0.18], [0.265, 0.36], [0.285, 0.5], [0.255, 0.6], [0.16, 0.66], [0.1, 0.7], [0.02, 0.71],
    ].map(([x, y]) => new T.Vector2(x * profileScale, y));
    const g = new T.LatheGeometry(p, 36); g.computeVertexNormals(); return g;
  }

  // ---------------- main build ----------------
  function build(cfgIn) {
    const c = Object.assign({}, DEFAULT, cfgIn);
    const g = new T.Group(); g.userData.config = c;

    const skinMat = smat(c.skin);
    const primMat = c.outfit === "plate" ? metal(c.primary, 0.4) : c.outfit === "leather" ? smat(c.primary, { roughness: 0.7 }) : cloth(c.primary);
    const secMat = c.outfit === "plate" ? metal(c.secondary, 0.45) : cloth(c.secondary);
    const trimMat = metal(c.trim, 0.4);
    const hairMat = smat(c.hairColor, { roughness: 0.72 });
    const beardMat = smat(c.facialHairColor, { roughness: 0.78 });
    const bootMat = smat(shade(c.secondary, -0.08), { roughness: 0.7 });

    const widths = { slim: 0.86, average: 1, athletic: 1.06, broad: 1.22 };
    const bw = widths[c.bodyType] || 1;
    const raceScale = c.race === "gnome" ? 0.72 : c.race === "halfling" ? 0.78 : c.race === "dwarf" ? 0.84 : c.race === "elf" ? 1.03 : 1;
    const headScale = (c.race === "gnome" || c.race === "halfling") ? 1.22 : c.race === "dwarf" ? 1.08 : 1;
    const isDragon = c.race === "dragonborn";

    const add = (m, x, y, z) => { if (x !== undefined) m.position.set(x, y || 0, z || 0); m.castShadow = true; m.receiveShadow = false; g.add(m); return m; };

    // ---- legs ----
    const legMat = c.outfit === "robe" ? cloth(c.secondary) : smat(shade(c.primary, -0.12), { roughness: 0.7 });
    if (c.outfit !== "robe") {
      [-1, 1].forEach((s) => {
        add(limb(0.13 * bw, 0.46, legMat), s * 0.15 * bw, 0.56, 0);
        // Shin shortened so it doesn't poke below the boot
        add(limb(0.105 * bw, 0.28, skinMat.clone()), s * 0.15 * bw, 0.27, 0.01);
        const boot = add(sphere(0.15 * bw, bootMat), s * 0.15 * bw, 0.15, 0.045); boot.scale.set(1, 0.85, 1.5);
      });
    }

    // ---- pelvis ----
    const pelvis = add(sphere(0.24 * bw, primMat), 0, 0.92, 0); pelvis.scale.set(1, 0.7, 0.8);

    // ---- robe skirt (for robe outfit) ----
    if (c.outfit === "robe") {
      add(new T.Mesh(robeGeo(0.24 * bw, 0.44 * bw, 1.05), cloth(c.primary)), 0, 0.44, 0);
      // Boots still show beneath robe hem
      [-1, 1].forEach((s) => {
        const boot = add(sphere(0.15 * bw, bootMat), s * 0.15 * bw, 0.15, 0.045); boot.scale.set(1, 0.85, 1.5);
      });
    }

    // ---- torso ----
    const torso = add(new T.Mesh(torsoGeo(bw), primMat), 0, 0.9, 0);
    torso.scale.z = 0.74;
    // chest overlay (armor plate / tunic front)
    if (c.outfit === "plate") { const chest = add(new T.Mesh(torsoGeo(bw * 1.04), metal(c.primary, 0.38)), 0, 0.91, 0.02); chest.scale.z = 0.6; }
    // belt
    add(new T.Mesh(new T.TorusGeometry(0.22 * bw, 0.035, 10, 28), trimMat), 0, 0.96, 0).scale.set(1, 1, 0.78);

    // ---- shoulders / arms — Group-based so all segments move together ----
    const armMat = c.outfit === "plate" ? metal(c.primary, 0.4) : (c.outfit === "robe" ? cloth(c.primary) : primMat);
    const shoulderX = 0.30 * bw;
    [-1, 1].forEach((s) => {
      // Shoulder cap (stays on body)
      add(sphere(0.115 * bw, armMat), s * shoulderX, 1.46, 0.02);
      if (c.shoulders) { const pad = add(sphere(0.15 * bw, c.outfit === "plate" ? trimMat : secMat), s * shoulderX, 1.5, 0); pad.scale.set(1.1, 0.8, 1.1); }

      // Pose values
      const armRaise = s < 0 ? (c.poseArmLRaise || 0) : (c.poseArmRRaise || 0);
      const armOut   = s < 0 ? (c.poseArmLOut  || 0) : (c.poseArmROut  || 0);

      // Shoulder joint Group — pivot at shoulder so whole arm swings together
      const armGroup = new T.Group();
      armGroup.position.set(s * shoulderX, 1.50, 0.02);
      armGroup.rotation.x = armRaise * -1.4;    // negative = raise arm up
      armGroup.rotation.z = s * armOut * 1.4;   // spread sideways
      g.add(armGroup);

      // Upper arm hangs from shoulder joint
      const upper = new T.Mesh(capsuleGeo(0.082 * bw, 0.34, 28), armMat);
      upper.position.set(s * 0.04, -0.23, 0.02);
      upper.rotation.z = s * 0.12; upper.rotation.x = 0.08;
      upper.castShadow = true; upper.name = s < 0 ? "armL" : "armR";
      armGroup.add(upper);

      // Forearm (lower segment)
      const fMat = c.gloves ? secMat : skinMat.clone();
      const fore = new T.Mesh(capsuleGeo(0.072 * bw, 0.32, 28), fMat);
      fore.position.set(s * 0.08, -0.57, 0.08);
      fore.rotation.z = s * 0.14; fore.rotation.x = 0.18;
      fore.castShadow = true;
      armGroup.add(fore);

      // Hand
      const hMat = c.gloves ? smat(shade(c.secondary, -0.05)) : skinMat.clone();
      const handMesh = new T.Mesh(new T.SphereGeometry(0.082, 32, 28), hMat);
      handMesh.position.set(s * 0.10, -0.80, 0.16);
      handMesh.castShadow = true;
      armGroup.add(handMesh);

      // Compute hand world position after pose rotation (for weapon/offhand attachment)
      const hLocal = handMesh.position.clone().applyEuler(armGroup.rotation);
      g.userData[s < 0 ? "handL" : "handR"] = new T.Vector3(
        armGroup.position.x + hLocal.x,
        armGroup.position.y + hLocal.y,
        armGroup.position.z + hLocal.z
      );
    });

    // ---- neck + head — everything head-related in a Group so head tilt moves it all ----
    add(limb(0.075, 0.1, skinMat.clone()), 0, 1.58, 0); // neck stays on body

    const headGroup = new T.Group();
    headGroup.position.set(0, 1.65, 0); // pivot at neck-top
    g.add(headGroup);

    // addH: helper that places meshes in headGroup using WORLD y coords (converts to local)
    const HY = 1.65; // headGroup world y
    const addH = (m, x, y, z) => {
      const ly = (y !== undefined) ? y - HY : 0;
      if (x !== undefined) m.position.set(x || 0, ly, z || 0);
      m.castShadow = true; headGroup.add(m); return m;
    };

    const headR = 0.2 * headScale;
    const head = addH(sphere(headR, skinMat.clone(), 40), 0, 1.78, 0); head.scale.set(0.96, 1.04, 0.96); head.name = "headMesh";
    if (isDragon) { const snout = addH(sphere(headR * 0.6, smat(c.skin), 18), 0, 1.74, headR * 0.8); snout.scale.set(0.8, 0.6, 1.1); }
    // ears
    if (c.race === "elf" || c.race === "halfelf") [-1, 1].forEach((s) => { const e = addH(new T.Mesh(new T.ConeGeometry(0.045, 0.16, 10), skinMat.clone()), s * headR * 0.95, 1.84, -0.02); e.rotation.z = s * -0.6; e.rotation.x = -0.3; });
    else [-1, 1].forEach((s) => { const e = addH(sphere(0.05, skinMat.clone(), 12), s * headR * 0.98, 1.78, 0); e.scale.set(0.5, 1, 0.7); });

    // eyes
    [-1, 1].forEach((s) => {
      const white = addH(sphere(0.062, smat("#f8f4f0"), 20), s * 0.076, 1.798, headR * 1.08); white.scale.set(1, 1.22, 0.58);
      addH(sphere(0.040, smat(c.eyeColor, { roughness: 0.18, metalness: 0.05 }), 20), s * 0.076, 1.791, headR * 1.13);
      addH(sphere(0.022, smat("#080604"), 14), s * 0.076, 1.792, headR * 1.17);
      addH(sphere(0.009, smat("#ffffff", { roughness: 0.05 }), 8), s * 0.083, 1.800, headR * 1.19);
      addH(sphere(0.005, smat("#ffffff", { roughness: 0.05 }), 6), s * 0.070, 1.796, headR * 1.19);
      if (c.brows) {
        const b = addH(new T.Mesh(new T.BoxGeometry(0.082, 0.022, 0.030), hairMat), s * 0.076, 1.868, headR * 1.10);
        b.rotation.z = s * -0.14;
      }
    });
    // nose + mouth
    const nose = addH(sphere(0.026, skinMat.clone(), 18), 0, 1.757, headR * 1.14); nose.scale.set(0.85, 0.78, 0.9);
    [-1, 1].forEach((s) => { const n = addH(sphere(0.012, smat(shade(c.skin, -0.07)), 10), s * 0.021, 1.744, headR * 1.15); n.scale.set(1, 0.65, 0.75); });
    [-1, 1].forEach((s) => { const ul = addH(sphere(0.022, smat("#9a5050"), 14), s * 0.025, 1.706, headR * 1.13); ul.scale.set(0.9, 0.38, 0.55); });
    const ll = addH(sphere(0.028, smat(shade(c.skin, -0.04)), 14), 0, 1.692, headR * 1.125); ll.scale.set(1.55, 0.42, 0.6);
    if (c.race === "halforc") [-1, 1].forEach((s) => { const t = addH(new T.Mesh(new T.ConeGeometry(0.024, 0.1, 8), smat("#efe9d6")), s * 0.05, 1.7, headR * 1.0); t.rotation.x = 0.25; t.rotation.z = Math.PI; });

    // ---- facial hair, hair, horns, headgear — all in headGroup via addH ----
    buildBeard(addH, c, headR, beardMat);
    buildHair(addH, c, headR, hairMat);
    let horns = c.horns; if ((c.race === "tiefling" || isDragon) && horns === "none") horns = "curved";
    buildHorns(addH, horns, headR, smat("#2a2228", { roughness: 0.5 }), trimMat);
    buildHeadgear(addH, c.headgear, headR, secMat, primMat, trimMat, hairMat);

    // ---- cape ----
    buildCape(g, c, bw, headGroup);
    // ---- weapon / offhand ----
    buildWeapon(g, c.weapon, g.userData.handR, c);
    buildOffhand(g, c.offhand, g.userData.handL, c);

    // dragonborn / tiefling tail
    if (isDragon || c.race === "tiefling") {
      const tail = add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 0.85, -0.18), new T.Vector3(0.12, 0.6, -0.4), new T.Vector3(0.05, 0.35, -0.55), new T.Vector3(-0.1, 0.2, -0.42)]), 20, 0.05, 8), smat(c.skin)));
    }

    g.scale.setScalar(raceScale * (c.height || 1));
    // Apply pose overrides
    headGroup.rotation.z = (c.poseHeadTilt || 0) * 0.55; // tilt whole head group (hair+headgear+all)
    if (c.poseBodyLean) g.rotation.x = (c.poseBodyLean || 0) * 0.3;
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    return g;
  }

  // robe / cape geometry: a flared open cylinder (lathe)
  function robeGeo(rTop, rBot, h) {
    const p = [new T.Vector2(rTop, h), new T.Vector2((rTop + rBot) / 2, h * 0.5), new T.Vector2(rBot, 0.02), new T.Vector2(rBot * 0.92, 0)];
    const g = new T.LatheGeometry(p, 24, 0, Math.PI * 2); g.computeVertexNormals(); return g;
  }

  function buildHair(add, c, headR, hairMat) {
    // Cap: tight to head (1.01×), raised to y=1.83 so the open bottom sits inside the head sphere
    const cap = (tl, sy, yo, zo) => {
      const R = headR * 1.01, theta = tl + 0.05;
      const capY = 1.83 + (yo || 0), capZ = zo || -0.01;
      const m = add(new T.Mesh(new T.SphereGeometry(R, 32, 24, 0, Math.PI * 2, 0, theta), hairMat), 0, capY, capZ);
      if (sy) m.scale.y = sy;
      // Closing disc to seal the open bottom
      const discR = Math.sin(theta) * R;
      const discY = capY + Math.cos(theta) * R;
      const disc = add(new T.Mesh(new T.CircleGeometry(discR, 28), hairMat), 0, discY, capZ);
      disc.rotation.x = Math.PI / 2;
      return m;
    };
    const strand = (x, y, z, r, h, rot) => { const m = add(limb(r, h, hairMat), x, y, z); if (rot) m.rotation.z = rot; return m; };
    switch (c.hair) {
      case "bald": break;
      case "buzz": { const m = cap(Math.PI * 0.5); m.material = smat(c.hairColor, { roughness: 0.9 }); m.scale.setScalar(0.99); break; }
      case "short": cap(Math.PI * 0.56); break;
      case "swept": { const m = cap(Math.PI * 0.55); m.scale.set(1.05, 1, 1.1); m.position.z += 0.03; break; }
      case "messy": { cap(Math.PI * 0.58); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add(sphere(0.05, hairMat, 8), Math.cos(a) * headR * 0.7, 1.96 + Math.random() * 0.04, Math.sin(a) * headR * 0.7 - 0.01); } break; }
      case "afro": { add(sphere(headR * 1.12, smat(c.hairColor, { roughness: 0.95 }), 24), 0, 1.92, -0.01); break; }
      case "mohawk": { for (let i = 0; i < 6; i++) { const m = add(new T.Mesh(new T.BoxGeometry(0.07, 0.16 - i * 0.008, 0.11), hairMat), 0, 2.0, headR * 0.62 - i * (headR * 0.26)); m.rotation.x = -0.05; } break; }
      case "long": cap(Math.PI * 0.6); { const b = add(new T.Mesh(robeGeo(headR * 0.85, headR * 0.65, 0.45), hairMat), 0, 1.32, -0.06); b.scale.z = 0.7; } break;
      case "ponytail": cap(Math.PI * 0.52); strand(0, 1.6, -headR * 0.95, 0.055, 0.42); break;
      case "bun": cap(Math.PI * 0.52); add(sphere(0.1, hairMat, 16), 0, 2.0, -0.05); break;
      case "braids": cap(Math.PI * 0.55); [-1, 1].forEach((s) => strand(s * headR * 0.7, 1.5, -0.05, 0.045, 0.5)); break;
      case "twin": cap(Math.PI * 0.53); [-1, 1].forEach((s) => { const m = strand(s * headR * 1.0, 1.55, -0.02, 0.05, 0.46, s * 0.2); }); break;
      default: cap(Math.PI * 0.56);
    }
  }

  function buildBeard(add, c, headR, beardMat) {
    switch (c.facialHair) {
      case "none": break;
      case "stubble": { const m = add(new T.Mesh(new T.SphereGeometry(headR * 1.0, 20, 16, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.4), smat(c.facialHairColor, { roughness: 0.95 })), 0, 1.78, 0.01); m.scale.set(1, 0.9, 1.02); break; }
      case "mustache": add(new T.Mesh(new T.TorusGeometry(0.05, 0.018, 8, 16, Math.PI), beardMat), 0, 1.715, headR * 0.9).rotation.z = Math.PI; break;
      case "goatee": { const m = add(sphere(0.06, beardMat, 14), 0, 1.66, headR * 0.78); m.scale.set(0.8, 1.2, 0.7); break; }
      case "full": { const m = add(new T.Mesh(new T.SphereGeometry(headR * 1.04, 20, 16, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.55), beardMat), 0, 1.76, 0.02); m.scale.set(1, 1.3, 1.05); break; }
      case "long": { const m = add(new T.Mesh(robeGeo(headR * 0.75, headR * 0.4, 0.4), beardMat), 0, 1.3, 0.06); m.scale.z = 0.8; const u = add(new T.Mesh(new T.SphereGeometry(headR * 1.02, 20, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.5), beardMat), 0, 1.74, 0.03); u.scale.set(1, 1.2, 1.05); break; }
    }
  }

  function buildHorns(add, horns, headR, hornMat, goldMat) {
    if (horns === "none") return;
    const pair = (fn) => [-1, 1].forEach((s) => fn(s));
    switch (horns) {
      case "curved": pair((s) => { const h = add(new T.Mesh(new T.TorusGeometry(0.1, 0.03, 8, 16, Math.PI * 0.9), hornMat), s * 0.12, 1.95, -0.02); h.rotation.y = Math.PI / 2; h.rotation.z = s * 0.4 - (s < 0 ? 0 : 0); h.rotation.x = -0.4; }); break;
      case "straight": pair((s) => { const h = add(new T.Mesh(new T.ConeGeometry(0.045, 0.32, 10), hornMat), s * 0.12, 2.06, -0.02); h.rotation.z = s * 0.35; h.rotation.x = -0.25; }); break;
      case "ram": pair((s) => { const h = add(new T.Mesh(new T.TorusGeometry(0.11, 0.04, 10, 20, Math.PI * 1.4), hornMat), s * 0.14, 1.9, 0); h.rotation.y = Math.PI / 2; h.rotation.x = -0.2; h.rotation.z = s * 0.2; }); break;
      case "antlers": pair((s) => { const base = add(new T.Mesh(new T.ConeGeometry(0.03, 0.3, 8), hornMat), s * 0.1, 2.05, -0.02); base.rotation.z = s * 0.4; for (let i = 0; i < 2; i++) { const br = add(new T.Mesh(new T.ConeGeometry(0.018, 0.14, 6), hornMat), s * (0.16 + i * 0.05), 2.12 + i * 0.05, -0.02); br.rotation.z = s * 0.9; } }); break;
      case "crown": for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI - Math.PI / 2; add(new T.Mesh(new T.ConeGeometry(0.025, 0.12, 8), hornMat), Math.sin(a) * headR, 2.02, Math.cos(a) * headR * 0.5 - 0.05).rotation.x = -0.1; } break;
    }
  }

  function buildHeadgear(add, hg, headR, secMat, primMat, trimMat, hairMat) {
    switch (hg) {
      case "none": break;
      case "circlet": { const c = add(new T.Mesh(new T.TorusGeometry(headR * 0.96, 0.022, 10, 28), trimMat), 0, 1.92, 0); c.rotation.x = Math.PI / 2; add(sphere(0.035, metal("#7fd0ff", 0.2), 14), 0, 1.97, headR * 0.92); break; }
      case "wizard": { add(new T.Mesh(new T.CylinderGeometry(headR * 1.5, headR * 1.5, 0.035, 24), secMat), 0, 2.0, 0); const cone = add(new T.Mesh(new T.ConeGeometry(headR * 1.05, 0.62, 24), primMat), 0, 2.32, 0); cone.rotation.x = 0.08; add(sphere(0.05, new T.MeshStandardMaterial({ color: "#f7d278", emissive: "#7a5a10", emissiveIntensity: 0.7 }), 14), 0, 2.62, 0.05); break; }
      case "hood": {
        // Crown dome — tight cap, closed at bottom so no open-edge ring
        const hR = headR * 1.06, hTh = Math.PI * 0.5;
        add(new T.Mesh(new T.SphereGeometry(hR, 28, 20, 0, Math.PI * 2, 0, hTh), primMat), 0, 1.88, -0.03);
        // Closing disc for the dome bottom
        const hdR = Math.sin(hTh) * hR, hdY = 1.88 + Math.cos(hTh) * hR;
        const hd = add(new T.Mesh(new T.CircleGeometry(hdR, 24), primMat), 0, hdY, -0.03); hd.rotation.x = Math.PI / 2;
        // Side draping (wide flat plane behind head)
        const drape = add(new T.Mesh(robeGeo(headR * 1.03, headR * 0.82, 0.52), primMat), 0, 1.44, -0.1);
        drape.scale.z = 0.65; drape.scale.x = 1.15;
        break;
      }
      case "helmOpen": { const dome = add(new T.Mesh(new T.SphereGeometry(headR * 1.12, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), metal("#9aa3b0", 0.4)), 0, 1.8, 0); add(new T.Mesh(new T.BoxGeometry(0.045, 0.32, 0.06), metal("#9aa3b0", 0.4)), 0, 1.78, headR * 1.05); break; }
      case "helmFull": {
        const hm = metal("#8a929e", 0.4);
        // Upper dome (top hemisphere only — no open bottom on skull area)
        const dR = headR * 1.17, dTh = Math.PI * 0.5;
        add(new T.Mesh(new T.SphereGeometry(dR, 28, 20, 0, Math.PI * 2, 0, dTh), hm), 0, 1.88, 0);
        const ddR = Math.sin(dTh) * dR, ddY = 1.88 + Math.cos(dTh) * dR;
        const dd = add(new T.Mesh(new T.CircleGeometry(ddR, 24), hm), 0, ddY, 0); dd.rotation.x = Math.PI / 2;
        // Lower face guard (open cylinder — faces/neck area, no endcaps needed)
        add(new T.Mesh(new T.CylinderGeometry(headR * 1.16, headR * 1.14, 0.28, 28, 1, true), hm), 0, 1.69, 0);
        // Horizontal eye slit
        add(new T.Mesh(new T.BoxGeometry(headR * 2.2, 0.038, 0.045), metal("#2a2e36", 0.6)), 0, 1.79, headR * 1.15);
        // Nose guard
        add(new T.Mesh(new T.BoxGeometry(0.038, 0.1, 0.055), hm), 0, 1.75, headR * 1.13);
        // Top crest
        add(new T.Mesh(new T.BoxGeometry(0.04, 0.2, 0.4), metal(trimMat.color.getStyle(), 0.35)), 0, 2.08, -0.02);
        // Trim ring where dome meets guard
        add(new T.Mesh(new T.TorusGeometry(dR, 0.016, 8, 28), metal(trimMat.color.getStyle(), 0.38)), 0, ddY, 0).rotation.x = Math.PI / 2;
        break;
      }
      case "crown": { add(new T.Mesh(new T.CylinderGeometry(headR * 1.05, headR * 1.05, 0.1, 24, 1, true), trimMat), 0, 1.98, 0); for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; add(new T.Mesh(new T.ConeGeometry(0.025, 0.1, 8), trimMat), Math.cos(a) * headR * 1.02, 2.06, Math.sin(a) * headR * 1.02); } break; }
      case "cap": { const cp = add(new T.Mesh(new T.SphereGeometry(headR * 1.08, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), primMat), 0, 1.82, 0); add(new T.Mesh(new T.CylinderGeometry(headR * 0.5, headR * 0.7, 0.03, 16, 1, false, 0, Math.PI), primMat), 0, 1.86, headR * 0.9).rotation.x = 0.2; break; }
      case "bandana": { add(new T.Mesh(new T.CylinderGeometry(headR * 1.04, headR * 1.04, 0.12, 22, 1, true), secMat), 0, 1.9, 0); add(new T.Mesh(new T.ConeGeometry(0.05, 0.18, 8), secMat), -headR * 0.9, 1.86, -0.06).rotation.z = 0.9; break; }
    }
  }

  function buildCape(g, c, bw, headGroup) {
    if (!c.cape || c.cape === "none") return;
    const len = c.cape === "long" || c.cape === "hooded" ? 1.05 : c.cape === "tattered" ? 0.9 : 0.65;
    const geo = new T.PlaneGeometry(0.64 * bw, len, 8, 14);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, -Math.cos(x * 3.0) * 0.07 - (0.5 - (y / len + 0.5)) * 0.22);
      if (c.cape === "tattered" && y < -len * 0.2) pos.setX(i, x * (1 - (0.4 + 0.3 * Math.sin(x * 20))));
    }
    geo.computeVertexNormals();
    const mat = new T.MeshStandardMaterial({ color: c.capeColor, roughness: 0.86, metalness: 0, side: T.DoubleSide });
    // Lowered so cape top (y≈1.65) stays at neck, doesn't cut through head
    const cape = new T.Mesh(geo, mat);
    cape.position.set(0, 1.16, -0.17 * bw); cape.rotation.x = 0.08; cape.castShadow = true; g.add(cape);
    if (c.cape === "hooded") {
      const hR = 0.24, hTh = Math.PI * 0.52;
      // Hood goes in headGroup if available so it follows head tilt
      const addTo = headGroup || g;
      const hood = new T.Mesh(new T.SphereGeometry(hR, 24, 18, 0, Math.PI * 2, 0, hTh), mat);
      const hoodLocalY = headGroup ? 1.80 - 1.65 : 1.80;
      hood.position.set(0, hoodLocalY, -0.13); hood.scale.set(1.12, 1.18, 1.24); hood.castShadow = true; addTo.add(hood);
      const dR = Math.sin(hTh) * hR, dY = hoodLocalY + Math.cos(hTh) * hR;
      const hd = new T.Mesh(new T.CircleGeometry(dR * 1.1, 22), mat);
      hd.rotation.x = Math.PI / 2; hd.position.set(0, dY, -0.13); addTo.add(hd);
    }
  }

  function meshAt(geo, m, x, y, z) { const me = new T.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; return me; }

  function buildWeapon(g, weapon, hand, c) {
    if (!weapon || weapon === "none" || !hand) return;
    const grp = new T.Group(); grp.position.copy(hand);
    const steel = metal("#cdd3da", 0.28), gold = metal(c.trim, 0.35), wood = smat("#6b4423", { roughness: 0.8 });
    switch (weapon) {
      case "sword": grp.add(meshAt(capsuleGeo(0.022, 0.2), wood, 0, -0.02, 0)); grp.add(meshAt(new T.BoxGeometry(0.22, 0.04, 0.045), gold, 0, 0.11, 0)); grp.add(meshAt(bladeGeo(0.048, 0.72), steel, 0, 0.50, 0)); break;
      case "greatsword": grp.add(meshAt(capsuleGeo(0.026, 0.32), wood, 0, -0.04, 0)); grp.add(meshAt(new T.BoxGeometry(0.30, 0.04, 0.048), gold, 0, 0.15, 0)); grp.add(meshAt(bladeGeo(0.07, 1.15), steel, 0, 0.78, 0)); break;
      case "staff": grp.add(meshAt(capsuleGeo(0.03, 1.4), wood, 0, 0.35, 0)); grp.add(meshAt(new T.IcosahedronGeometry(0.09, 0), new T.MeshStandardMaterial({ color: "#7fd0ff", emissive: "#2a7dd0", emissiveIntensity: 0.9, roughness: 0.15 }), 0, 1.12, 0)); break;
      case "wand": grp.add(meshAt(capsuleGeo(0.018, 0.34), wood, 0, 0.12, 0)); grp.add(meshAt(sphereGeo(0.045), new T.MeshStandardMaterial({ color: "#e89cff", emissive: "#9a2ad0", emissiveIntensity: 0.9 }), 0, 0.32, 0)); break;
      case "axe":
        grp.add(meshAt(capsuleGeo(0.028, 0.85), wood, 0, 0.3, 0));
        { // Blade: wide arc at the top of the handle
          const blade = new T.Mesh(new T.CylinderGeometry(0.20, 0.16, 0.05, 20, 1, false, -1.1, 2.2), metal("#aab0ba", 0.28));
          blade.rotation.x = Math.PI / 2; blade.rotation.z = 0.1;
          blade.position.set(0.1, 0.73, 0); grp.add(blade);
          // Back edge of axe head
          const back = new T.Mesh(new T.CylinderGeometry(0.06, 0.05, 0.04, 10, 1, false, 1.1, 1.3), metal("#9aa0ac", 0.35));
          back.rotation.x = Math.PI / 2; back.position.set(-0.06, 0.73, 0); grp.add(back);
        }
        break;
      case "dagger": grp.add(meshAt(capsuleGeo(0.02, 0.12), wood, 0, 0, 0)); grp.add(meshAt(bladeGeo(0.05, 0.28), steel, 0, 0.2, 0)); break;
      case "mace": grp.add(meshAt(capsuleGeo(0.026, 0.55), wood, 0, 0.18, 0)); grp.add(meshAt(new T.IcosahedronGeometry(0.1, 0), metal("#8a909a", 0.35), 0, 0.52, 0)); break;
      case "spear": grp.add(meshAt(capsuleGeo(0.024, 1.5), wood, 0, 0.4, 0)); grp.add(meshAt(new T.ConeGeometry(0.06, 0.26, 10), steel, 0, 1.2, 0)); break;
    }
    grp.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    grp.rotation.x = (c.poseWeaponRot || 0) * Math.PI; // full 360° over -1..1 slider
    grp.position.z += (c.poseWeaponX || 0) * 0.28;
    g.add(grp);
  }
  function buildOffhand(g, off, hand, c) {
    if (!off || off === "none" || !hand) return;
    const grp = new T.Group(); grp.position.copy(hand);
    const steel = metal("#aab0ba", 0.3), wood = smat("#6b4423", { roughness: 0.8 });
    switch (off) {
      case "shield": { const s = meshAt(new T.BoxGeometry(0.04, 0.46, 0.34), metal(c.primary, 0.4), -0.08, 0.05, 0); grp.add(s); grp.add(meshAt(new T.BoxGeometry(0.05, 0.4, 0.28), metal(c.trim, 0.4), -0.06, 0.05, 0)); break; }
      case "roundshield": { const s = new T.Mesh(new T.CylinderGeometry(0.26, 0.26, 0.04, 28), metal(c.primary, 0.4)); s.rotation.z = Math.PI / 2; s.position.set(-0.08, 0.05, 0); grp.add(s); grp.add(meshAt(sphereGeo(0.05), metal(c.trim, 0.35), -0.1, 0.05, 0)); break; }
      case "torch": grp.add(meshAt(capsuleGeo(0.022, 0.4), wood, 0, 0.1, 0)); grp.add(meshAt(sphereGeo(0.08), new T.MeshStandardMaterial({ color: "#ff8a2a", emissive: "#ff5a10", emissiveIntensity: 1.1, roughness: 0.4 }), 0, 0.34, 0)); break;
      case "book": grp.add(meshAt(new T.BoxGeometry(0.04, 0.26, 0.2), smat(c.secondary), -0.05, 0.05, 0)); grp.add(meshAt(new T.BoxGeometry(0.05, 0.22, 0.02), smat("#f4eddd"), -0.03, 0.05, 0.1)); break;
      case "lantern": grp.add(meshAt(new T.BoxGeometry(0.12, 0.16, 0.12), metal(c.trim, 0.4), 0, 0.12, 0)); grp.add(meshAt(sphereGeo(0.05), new T.MeshStandardMaterial({ color: "#ffd27a", emissive: "#ffb020", emissiveIntensity: 1 }), 0, 0.12, 0)); break;
    }
    grp.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    g.add(grp);
  }
  function bladeGeo(w, len) {
    // Tapered blade: wide at base, pointed at tip
    const g = new T.BufferGeometry();
    const h = len / 2, t = 0.014;
    const verts = new Float32Array([
      -w/2, -h, t/2,   w/2, -h, t/2,   0, h, 0,   // front face
      w/2, -h, t/2,   w/2, -h, -t/2,  0, h, 0,    // right bevel
      w/2, -h, -t/2, -w/2, -h, -t/2,  0, h, 0,    // back face
      -w/2, -h, -t/2, -w/2, -h, t/2,  0, h, 0,    // left bevel
      -w/2, -h, t/2,  w/2, -h, t/2,  w/2,-h,-t/2, // base
      -w/2, -h, t/2,  w/2,-h,-t/2, -w/2,-h,-t/2,  // base
    ]);
    g.setAttribute("position", new T.BufferAttribute(verts, 3));
    g.computeVertexNormals();
    return g;
  }
  function sphereGeo(r) { return new T.SphereGeometry(r, 16, 14); }

  function shade(hex, amt) { const c = new T.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt))); return "#" + c.getHexString(); }

  // ---------------- viewer ----------------
  function makeViewer(container, config, opts) {
    opts = opts || {};
    const w = container.clientWidth || 360, h = container.clientHeight || 460;
    const scene = new T.Scene();
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputEncoding = T.sRGBEncoding;
    container.appendChild(renderer.domElement);

    const camera = new T.PerspectiveCamera(36, w / h, 0.1, 100);

    scene.add(new T.HemisphereLight(0xa090cc, 0x1a1024, 0.6));
    const key = new T.DirectionalLight(0xfff5e8, 1.5); key.position.set(2.5, 7, 5);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 0.5; key.shadow.camera.far = 24;
    key.shadow.camera.left = -2.5; key.shadow.camera.right = 2.5; key.shadow.camera.top = 4; key.shadow.camera.bottom = -0.5; key.shadow.bias = -0.0003;
    scene.add(key);
    const rim = new T.DirectionalLight(0xe8623e, 0.7); rim.position.set(-4, 2, -3); scene.add(rim);
    const fillL = new T.DirectionalLight(0x7050d0, 0.4); fillL.position.set(4, 1, 2); scene.add(fillL);
    const fill = new T.PointLight(0x9170f0, 0.6, 18); fill.position.set(-2.5, 2.5, 3); scene.add(fill);

    if (opts.ground !== false) {
      scene.fog = new T.FogExp2(0x0b0910, 0.06);

      // Canvas stone tile texture for floor
      function stoneTexture(size, tileSize, baseHex, darkHex) {
        const cv = document.createElement("canvas"); cv.width = size; cv.height = size;
        const x = cv.getContext("2d");
        x.fillStyle = baseHex; x.fillRect(0, 0, size, size);
        const rows = Math.ceil(size / tileSize);
        for (let r = 0; r < rows; r++) {
          const offset = (r % 2) * (tileSize * 0.52);
          const cols = Math.ceil((size + tileSize) / tileSize);
          for (let c = 0; c < cols; c++) {
            const lum = 0.88 + Math.random() * 0.18;
            const col = new T.Color(baseHex); col.offsetHSL(0, 0, -(1 - lum) * 0.12);
            x.fillStyle = "#" + col.getHexString();
            x.fillRect(c * tileSize + offset + 1, r * tileSize + 1, tileSize - 3, tileSize - 3);
          }
          x.strokeStyle = darkHex; x.lineWidth = 2;
          x.beginPath(); x.moveTo(0, r * tileSize); x.lineTo(size, r * tileSize); x.stroke();
        }
        const tex = new T.CanvasTexture(cv); tex.wrapS = T.RepeatWrapping; tex.wrapT = T.RepeatWrapping; return tex;
      }

      // ---- Raised platform ----
      const floorTex = stoneTexture(512, 64, "#1d1624", "#0d0b12");
      floorTex.repeat.set(3, 3);
      const platMat = new T.MeshStandardMaterial({ map: floorTex, roughness: 0.92, metalness: 0.04 });
      const plat = new T.Mesh(new T.CylinderGeometry(2.2, 2.4, 0.22, 48), platMat);
      plat.position.y = -0.12; plat.receiveShadow = true; scene.add(plat);
      // Rim glow
      const rimGlow = new T.Mesh(new T.TorusGeometry(2.38, 0.026, 8, 72), new T.MeshStandardMaterial({ color: "#b07f30", emissive: "#b07f30", emissiveIntensity: 0.45, roughness: 0.3 }));
      rimGlow.rotation.x = Math.PI / 2; rimGlow.position.y = -0.01; scene.add(rimGlow);
      // Inner glyph ring
      for (let i = 0; i < 2; i++) {
        const r = [0.72, 1.28][i], col = ["#9170f0","#e8b54a"][i];
        const ring = new T.Mesh(new T.TorusGeometry(r, 0.012, 6, 64), new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.55, roughness: 0.3 }));
        ring.rotation.x = Math.PI / 2; ring.position.y = -0.01; scene.add(ring);
      }
      // Glyph radial lines (8 spokes)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spoke = new T.Mesh(new T.BoxGeometry(0.008, 0.006, 0.56), new T.MeshStandardMaterial({ color: "#e8b54a", emissive: "#e8b54a", emissiveIntensity: 0.35 }));
        spoke.position.set(Math.cos(a) * 1.0, -0.01, Math.sin(a) * 1.0);
        spoke.rotation.y = a; scene.add(spoke);
      }
      // Floor below platform
      const groundTex = stoneTexture(512, 80, "#130f1a", "#090810");
      groundTex.repeat.set(6, 6);
      const ground = new T.Mesh(new T.PlaneGeometry(20, 20), new T.MeshStandardMaterial({ map: groundTex, roughness: 0.97, metalness: 0 }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = -0.24; ground.receiveShadow = true; scene.add(ground);

      // ---- Back wall with stone texture ----
      const wallTex = stoneTexture(512, 52, "#1b1620", "#0d0b12");
      wallTex.repeat.set(4, 4);
      const wallMat = new T.MeshStandardMaterial({ map: wallTex, roughness: 0.94, metalness: 0 });
      const backWall = new T.Mesh(new T.PlaneGeometry(9, 7), wallMat);
      backWall.position.set(0, 3.2, -3.6); backWall.receiveShadow = true; scene.add(backWall);
      // Side walls
      const lWall = new T.Mesh(new T.PlaneGeometry(4, 7), wallMat);
      lWall.position.set(-4, 3.2, -1.8); lWall.rotation.y = Math.PI / 2; scene.add(lWall);
      const rWall = new T.Mesh(new T.PlaneGeometry(4, 7), wallMat);
      rWall.position.set(4, 3.2, -1.8); rWall.rotation.y = -Math.PI / 2; scene.add(rWall);
      // Ceiling
      const ceil = new T.Mesh(new T.PlaneGeometry(9, 4), new T.MeshStandardMaterial({ color: 0x0d0a14, roughness: 1 }));
      ceil.rotation.x = Math.PI / 2; ceil.position.y = 6.8; scene.add(ceil);

      // ---- Arch pillars ----
      const archMat = new T.MeshStandardMaterial({ color: 0x26203a, roughness: 0.86 });
      const trimGold = new T.MeshStandardMaterial({ color: "#8a6020", emissive: "#5a3a10", emissiveIntensity: 0.2, roughness: 0.5 });
      [-1.18, 1.18].forEach((sx) => {
        // Main pillar body
        const pillar = new T.Mesh(new T.CylinderGeometry(0.17, 0.19, 4.0, 14), archMat);
        pillar.position.set(sx, 1.8, -3.5); scene.add(pillar);
        // Capital (top block)
        const cap = new T.Mesh(new T.BoxGeometry(0.46, 0.22, 0.46), new T.MeshStandardMaterial({ color: 0x1e1a2c, roughness: 0.85 }));
        cap.position.set(sx, 3.9, -3.5); scene.add(cap);
        // Base
        const base = new T.Mesh(new T.BoxGeometry(0.44, 0.2, 0.44), new T.MeshStandardMaterial({ color: 0x1e1a2c, roughness: 0.85 }));
        base.position.set(sx, -0.2, -3.5); scene.add(base);
        // Gold trim ring on pillar
        const pr = new T.Mesh(new T.TorusGeometry(0.175, 0.015, 6, 24), trimGold);
        pr.rotation.x = Math.PI / 2; pr.position.set(sx, 3.7, -3.5); scene.add(pr);
      });
      // Arch lintel (top beam)
      const lintel = new T.Mesh(new T.BoxGeometry(2.82, 0.28, 0.38), new T.MeshStandardMaterial({ color: 0x201c30, roughness: 0.88 }));
      lintel.position.set(0, 4.02, -3.5); scene.add(lintel);
      // Arch curved top (half-torus)
      const archTop = new T.Mesh(new T.TorusGeometry(1.0, 0.18, 12, 28, Math.PI), archMat);
      archTop.position.set(0, 3.1, -3.48); archTop.rotation.z = Math.PI; scene.add(archTop);

      // ---- Wall torches ----
      const torchWood = new T.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.88 });
      const flameMat = new T.MeshStandardMaterial({ color: 0xff9030, emissive: 0xff5010, emissiveIntensity: 1.6, roughness: 0.4 });
      [[-2.2, 2.6, -3.4], [2.2, 2.6, -3.4]].forEach(([tx, ty, tz]) => {
        // Bracket
        const bracket = new T.Mesh(new T.BoxGeometry(0.06, 0.06, 0.28), torchWood);
        bracket.position.set(tx, ty, tz + 0.1); scene.add(bracket);
        // Torch body
        const torch = new T.Mesh(new T.CylinderGeometry(0.038, 0.045, 0.36, 8), torchWood);
        torch.position.set(tx, ty + 0.02, tz + 0.06); torch.rotation.z = 0.18 * Math.sign(tx); scene.add(torch);
        // Flame glow sphere
        const flame = new T.Mesh(new T.SphereGeometry(0.1, 12, 10), flameMat);
        flame.position.set(tx, ty + 0.22, tz + 0.06); flame.scale.set(0.9, 1.4, 0.9); scene.add(flame);
        // Inner bright core
        const core = new T.Mesh(new T.SphereGeometry(0.045, 8, 8), new T.MeshStandardMaterial({ color: "#fff8e0", emissive: "#fff8e0", emissiveIntensity: 2.0 }));
        core.position.set(tx, ty + 0.22, tz + 0.06); scene.add(core);
        const pl = new T.PointLight(0xff7020, 2.6, 7); pl.position.set(tx, ty + 0.3, tz + 0.1); scene.add(pl);
      });

      // ---- Side braziers on platform ----
      const brazierMat = new T.MeshStandardMaterial({ color: "#4a3a20", roughness: 0.7, metalness: 0.5 });
      [[-1.85, 0.14, 0.4], [1.85, 0.14, 0.4]].forEach(([bx, by, bz]) => {
        const bowl = new T.Mesh(new T.CylinderGeometry(0.16, 0.09, 0.28, 14, 1, true), brazierMat);
        bowl.position.set(bx, by, bz); scene.add(bowl);
        const base = new T.Mesh(new T.CylinderGeometry(0.05, 0.08, 0.18, 8), brazierMat);
        base.position.set(bx, by - 0.23, bz); scene.add(base);
        const fire = new T.Mesh(new T.SphereGeometry(0.11, 10, 8), flameMat);
        fire.position.set(bx, by + 0.18, bz); fire.scale.set(0.8, 1.2, 0.8); scene.add(fire);
        const bpl = new T.PointLight(0xff6010, 1.4, 4); bpl.position.set(bx, by + 0.3, bz); scene.add(bpl);
      });

      // Uplight from glyph floor
      const upLight = new T.PointLight(0x9170f0, 0.5, 5); upLight.position.set(0, -0.1, 0); scene.add(upLight);
    }

    const pivot = new T.Group(); scene.add(pivot);
    let figure = build(config); pivot.add(figure);

    let spin = opts.spin !== false, dragging = false, px = 0, targetRotY = 0, rotY = 0, dist = 4.4;
    const dom = renderer.domElement; dom.style.cursor = "grab";
    const down = (e) => { dragging = true; spin = false; px = (e.touches ? e.touches[0].clientX : e.clientX); dom.style.cursor = "grabbing"; };
    const move = (e) => { if (!dragging) return; const x = (e.touches ? e.touches[0].clientX : e.clientX); targetRotY += (x - px) * 0.01; px = x; };
    const up = () => { dragging = false; dom.style.cursor = "grab"; };
    dom.addEventListener("pointerdown", down); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    const wheel = (e) => { e.preventDefault(); dist = Math.max(2.6, Math.min(7, dist + e.deltaY * 0.002)); };
    dom.addEventListener("wheel", wheel, { passive: false });

    let raf;
    function loop() {
      raf = requestAnimationFrame(loop);
      if (spin) targetRotY += 0.0035;
      rotY += (targetRotY - rotY) * 0.1; pivot.rotation.y = rotY;

      // Breathing / idle animation — chest, head bob, arm sway
      const t = performance.now() * 0.001;
      const breathe = Math.sin(t * 0.55);
      const sway = Math.sin(t * 0.28);
      const headBob = Math.sin(t * 0.4);
      // Chest rise
      pivot.scale.y = 1 + breathe * 0.012;
      pivot.position.y = breathe * 0.008;
      // Gentle side sway
      pivot.rotation.z = sway * 0.012;
      // Slight forward lean cycle
      pivot.rotation.x = headBob * 0.006;
      // Animate arm meshes if available (tagged as armL/armR during build)
      const armL = pivot.getObjectByName("armL");
      const armR = pivot.getObjectByName("armR");
      if (armL) armL.rotation.x = breathe * 0.04;
      if (armR) armR.rotation.x = -breathe * 0.04;


      camera.position.set(0, 1.45, dist); camera.lookAt(0, 1.02, 0);
      renderer.render(scene, camera);
    }
    loop();
    function resize() { const W = container.clientWidth, H = container.clientHeight; if (!W || !H) return; renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); }
    const ro = new ResizeObserver(resize); ro.observe(container); setTimeout(resize, 0);

    return {
      update(cfg) { pivot.remove(figure); disposeObj(figure); figure = build(cfg); pivot.add(figure); },
      setSpin(v) { spin = v; }, resetView() { targetRotY = 0; dist = 4.4; },
      getCanvas() { return renderer.domElement; },
      dispose() { cancelAnimationFrame(raf); ro.disconnect(); dom.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); dom.removeEventListener("wheel", wheel); disposeObj(scene); renderer.dispose(); if (dom.parentNode) dom.parentNode.removeChild(dom); },
    };
  }
  function disposeObj(obj) { obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); }); }

  function randomConfig() {
    const p = (a) => a[Math.floor(Math.random() * a.length)];
    return { race: p(OPTIONS.race).id, bodyType: p(OPTIONS.bodyType).id, height: 0.9 + Math.random() * 0.22,
      skin: p(OPTIONS.skin), hair: p(OPTIONS.hair).id, hairColor: p(OPTIONS.hairColor),
      brows: Math.random() > 0.15, eyeColor: p(OPTIONS.eyeColor), facialHair: p(OPTIONS.facialHair).id, facialHairColor: p(OPTIONS.hairColor), horns: p(OPTIONS.horns).id,
      outfit: p(OPTIONS.outfit).id, primary: p(OPTIONS.primary), secondary: p(OPTIONS.secondary), trim: p(OPTIONS.trim),
      shoulders: Math.random() > 0.4, gloves: Math.random() > 0.3, cape: p(OPTIONS.cape).id, capeColor: p(OPTIONS.secondary),
      headgear: p(OPTIONS.headgear).id, weapon: p(OPTIONS.weapon).id, offhand: p(OPTIONS.offhand).id };
  }

  window.Avatar3D = { OPTIONS, GROUPS, DEFAULT, build, makeViewer, randomConfig, disposeObj };
})();
