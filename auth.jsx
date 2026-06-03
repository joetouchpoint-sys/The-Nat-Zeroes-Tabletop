/* ACCOUNTS & ROLES — DM / Admin / Player / Fan with access gating */
(function () {
  const { useState, useContext } = React;
  const Icon = window.Icon;
  const { Avatar, Modal } = window.NZUI;

  const ROLES = {
    dm:     { label: "Dungeon Master", short: "DM", color: "#e8b54a", rank: 4, desc: "Super admin \u00b7 full control of the table, world, accounts & combat." },
    admin:  { label: "Admin", short: "Admin", color: "#9170f0", rank: 3, desc: "Co-host \u00b7 manage maps, creatures & sessions. No account control." },
    player: { label: "Player", short: "Player", color: "#4fb98a", rank: 2, desc: "Move your token, build characters, vote on sessions." },
    fan:    { label: "Fan", short: "Fan", color: "#4ea7e8", rank: 1, desc: "Watch the live table, read recaps & extras." },
  };

  // capability matrix
  const CAPS = {
    dm:     { moveTokens: 1, fog: 1, upload: 1, manageCombat: 1, createCreature: 1, editWorld: 1, editParty: 1, vote: 1, useCreator: 1, manageAccounts: 1 },
    admin:  { moveTokens: 1, fog: 1, upload: 1, manageCombat: 1, createCreature: 1, editWorld: 1, editParty: 1, vote: 1, useCreator: 1, manageAccounts: 0 },
    player: { moveTokens: 1, fog: 0, upload: 0, manageCombat: 0, createCreature: 0, editWorld: 0, editParty: 0, vote: 1, useCreator: 1, manageAccounts: 0 },
    fan:    { moveTokens: 0, fog: 0, upload: 0, manageCombat: 0, createCreature: 0, editWorld: 0, editParty: 0, vote: 0, useCreator: 0, manageAccounts: 0 },
  };
  const can = (role, cap) => !!(CAPS[role] && CAPS[role][cap]);

  // views allowed per role
  const VIEW_ACCESS = {
    dm:     ["home", "map", "world", "crew", "creator", "scheduler", "recaps", "chatzeros", "accounts"],
    admin:  ["home", "map", "world", "crew", "creator", "scheduler", "recaps", "chatzeros", "accounts"],
    player: ["home", "map", "world", "crew", "creator", "scheduler", "recaps", "chatzeros"],
    fan:    ["home", "map", "recaps", "extras"],
  };

  const ACCOUNTS = [
    { id: "u_callum", name: "Callum", handle: "@callum", role: "dm", ring: "#e8b54a", char: "The whole world" },
    { id: "u_joe", name: "Joe", handle: "@joe", role: "admin", ring: "#9170f0", char: "Fizzwick Vane" },
    { id: "u_amelie", name: "Amelie", handle: "@amelie", role: "player", ring: "#4fb98a", char: "Bramblewick Thorne" },
    { id: "u_milo", name: "Milo", handle: "@milo", role: "player", ring: "#e8412e", char: "Krunk the Considerate" },
    { id: "u_lewis", name: "Lewis", handle: "@lewis", role: "player", ring: "#4ea7e8", char: "Sister Maribel" },
    { id: "u_fan", name: "Pat (Listener)", handle: "@superfan_pat", role: "fan", ring: "#9170f0", char: "\u2014" },
  ];

  const RoleContext = React.createContext({ user: ACCOUNTS[1], role: "player", can: () => false });

  // ---- prototype credentials ----
  const CREDENTIALS = {
    u_callum: "callum", u_joe: "joe", u_amelie: "amelie",
    u_milo: "milo", u_lewis: "lewis", u_fan: "natzeroes",
  };

  function LoginScreen({ onLogin }) {
    const [handle, setHandle] = useState("");
    const [pass, setPass] = useState("");
    const [err, setErr] = useState(null);
    const [showHints, setShowHints] = useState(false);

    function attempt() {
      const h = handle.trim().toLowerCase().replace("@", "");
      const acct = ACCOUNTS.find((a) =>
        a.name.toLowerCase() === h ||
        a.handle.slice(1).toLowerCase() === h ||
        a.id === "u_" + h
      );
      if (!acct || CREDENTIALS[acct.id] !== pass.trim()) {
        setErr("Username or password doesn't match. Try your first name as username."); return;
      }
      setErr(null); onLogin(acct);
    }

    return React.createElement("div", { className: "login-screen" },
      React.createElement("div", { className: "login-card" },
        React.createElement("div", { style: { textAlign: "center", marginBottom: 30 } },
          React.createElement("img", { src: "assets/logo.png", alt: "logo", style: { width: 72, height: 72, objectFit: "contain", marginBottom: 14, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.6))" } }),
          React.createElement("div", { style: { fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.3em", color: "var(--ink-dim)" } }, "THE"),
          React.createElement("div", { style: { fontFamily: "var(--display)", fontWeight: 700, fontSize: 28, background: "linear-gradient(180deg, var(--gold-bright), var(--gold-deep))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", lineHeight: 1.1, margin: "4px 0 10px" } }, "NAT ZEROES"),
          React.createElement("div", { style: { color: "var(--ink-dim)", fontSize: 13, letterSpacing: "0.04em" } }, "Virtual Tabletop — Sign in")),
        React.createElement("div", { className: "field", style: { marginBottom: 14 } },
          React.createElement("label", null, "Username"),
          React.createElement("input", { className: "input", placeholder: "your name (e.g. marcus, jess, …)", value: handle, onChange: (e) => setHandle(e.target.value), onKeyDown: (e) => e.key === "Enter" && attempt(), autoFocus: true })),
        React.createElement("div", { className: "field", style: { marginBottom: 8 } },
          React.createElement("label", null, "Password"),
          React.createElement("input", { className: "input", type: "password", placeholder: "••••••••", value: pass, onChange: (e) => setPass(e.target.value), onKeyDown: (e) => e.key === "Enter" && attempt() })),
        err && React.createElement("div", { style: { color: "var(--red-bright)", fontSize: 12.5, marginTop: 6, lineHeight: 1.4 } }, err),
        React.createElement("button", { className: "btn primary", style: { width: "100%", justifyContent: "center", marginTop: 20, padding: "13px" }, onClick: attempt },
          "Enter the table", React.createElement(Icon, { name: "arrowR", size: 17 })),
        React.createElement("div", { style: { marginTop: 18, textAlign: "center" } },
          React.createElement("button", { style: { background: "none", border: "none", color: "var(--gold)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }, onClick: () => setShowHints((s) => !s) },
            showHints ? "Hide login hints" : "Need login help?")),
        showHints && React.createElement("div", { style: { marginTop: 12, background: "var(--bg)", border: "1px solid var(--hair)", borderRadius: 10, padding: 14 } },
          React.createElement("div", { className: "muted", style: { fontSize: 12, marginBottom: 8, fontFamily: "var(--display)", letterSpacing: "0.08em", textTransform: "uppercase" } }, "Prototype Credentials"),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 } },
            [["callum", "callum", "DM"], ["joe", "joe", "Admin"], ["amelie", "amelie", "Player"], ["milo", "milo", "Player"], ["lewis", "lewis", "Player"], ["fan", "natzeroes", "Fan"]].map(([u, p, r]) =>
              React.createElement("div", { key: u, style: { fontSize: 11, color: "var(--ink-soft)" } },
                React.createElement("span", { style: { color: "var(--gold)", fontFamily: "var(--mono)" } }, u),
                " / ",
                React.createElement("span", { className: "mono", style: { color: "var(--ink-dim)" } }, p),
                " ",
                React.createElement("span", { style: { color: "var(--amethyst)", fontSize: 10 } }, r)
              )
            )
          )
        )
      )
    );
  }

  // ---- account switcher modal ----
  function AccountSwitcher({ open, onClose, current, onSwitch }) {
    return React.createElement(Modal, { open, onClose, title: "Switch Account", sub: "Prototype: hop between accounts to see each role's access.", w: 460 },
      React.createElement("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 8 } },
        ACCOUNTS.map((a) => {
          const r = ROLES[a.role], active = a.id === current.id;
          return React.createElement("button", { key: a.id, onClick: () => { onSwitch(a); onClose(); }, style: acctRow(active) },
            React.createElement(Avatar, { name: a.name, ring: a.ring, size: 40 }),
            React.createElement("div", { className: "col", style: { flex: 1, minWidth: 0, alignItems: "flex-start" } },
              React.createElement("div", { className: "row", style: { gap: 8 } },
                React.createElement("span", { style: { fontWeight: 600, fontSize: 14.5 } }, a.name),
                React.createElement("span", { className: "tag", style: { fontSize: 10, color: r.color, borderColor: r.color + "55", background: r.color + "1a" } }, r.short)),
              React.createElement("span", { className: "muted", style: { fontSize: 12 } }, a.char)),
            active && React.createElement(Icon, { name: "check", size: 18, style: { color: "var(--gold)" } }));
        }))
    );
  }

  // ---- Accounts admin view ----
  function AccountsView() {
    const ctx = useContext(RoleContext);
    const [accts, setAccts] = useState(ACCOUNTS);
    const manage = can(ctx.role, "manageAccounts");
    function setRole(id, role) { if (manage) setAccts((a) => a.map((x) => x.id === id ? { ...x, role } : x)); }
    return React.createElement("div", { className: "view-pad", style: { maxWidth: 920 } },
      React.createElement("p", { className: "muted", style: { marginTop: 0, marginBottom: 18, maxWidth: 600 } },
        manage ? "Manage who can do what. As DM you have super-admin control over every account and role."
               : "You can view the roster, but only the Dungeon Master can change roles."),
      // role legend
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 24 } },
        Object.entries(ROLES).map(([k, r]) => React.createElement("div", { key: k, className: "panel", style: { padding: 14, borderLeft: `3px solid ${r.color}` } },
          React.createElement("div", { className: "row", style: { gap: 8, marginBottom: 6 } }, React.createElement("span", { style: { fontFamily: "var(--display)", fontWeight: 600, color: r.color } }, r.label)),
          React.createElement("p", { className: "muted", style: { margin: 0, fontSize: 12.5, lineHeight: 1.5 } }, r.desc)))),
      React.createElement("div", { className: "section-title" }, "Accounts \u00b7 " + accts.length),
      React.createElement("div", { className: "panel", style: { overflow: "hidden" } },
        accts.map((a, i) => {
          const r = ROLES[a.role];
          return React.createElement("div", { key: a.id, style: { display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i ? "1px solid var(--hair)" : "none" } },
            React.createElement(Avatar, { name: a.name, ring: a.ring, size: 42 }),
            React.createElement("div", { className: "col", style: { flex: 1, minWidth: 0 } },
              React.createElement("span", { style: { fontWeight: 600, fontSize: 15 } }, a.name),
              React.createElement("span", { className: "muted", style: { fontSize: 12.5 } }, a.handle + "  \u00b7  " + a.char)),
            manage
              ? React.createElement("select", { className: "select", style: { width: 150 }, value: a.role, onChange: (e) => setRole(a.id, e.target.value) },
                  Object.entries(ROLES).map(([k, rr]) => React.createElement("option", { key: k, value: k }, rr.label)))
              : React.createElement("span", { className: "tag", style: { color: r.color, borderColor: r.color + "55", background: r.color + "1a" } }, r.label));
        }))
    );
  }

  function acctRow(active) {
    return { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left",
      border: `1px solid ${active ? "var(--gold-deep)" : "var(--hair)"}`, background: active ? "rgba(232,181,74,0.1)" : "var(--surface)", color: "var(--ink)" };
  }

  window.NZAuth = { ROLES, CAPS, can, VIEW_ACCESS, ACCOUNTS, RoleContext, AccountSwitcher, AccountsView, LoginScreen };
})();
