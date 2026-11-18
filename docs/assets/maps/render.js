// Draws a map from window.MAPS as an SVG string. Every colour, line weight and font comes
// from the theme, so one data set can be shown in any style.
(function () {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const P = pts => "M" + pts.map(p => +p[0].toFixed(3) + " " + +p[1].toFixed(3)).join("L") + "Z";
  const text = (x, y, t, fill, T, size) =>
    `<text x="${x}" y="${y}" fill="${fill}" text-anchor="middle" dominant-baseline="central" style="font:${T.font};font-size:${size}px">${esc(t)}</text>`;

  const base = {
    grid: "rgba(0,0,0,.10)", edge: "rgba(0,0,0,.28)",
    font: "700 1px Inter, Arial, sans-serif",
  };
  const THEMES = {
    faithful: { ...base,
      name: "Faithful", note: "Close to the source maps",
      zones: { dzTop: "#a4a5a9", midTop: "#c1c0c5", midBottom: "#e9ccba", dzBottom: "#e39d79" },
      zonesBySet: {
        "volkus-2024": { dzTop: "#b0a8a3", midTop: "#d2cbc4", midBottom: "#ecd6ca", dzBottom: "#efae94" },
        "wtc-itd": { dzTop: "#8693a0", midTop: "#d4d9de", midBottom: "#fbd4bd", dzBottom: "#f38343" },
      },
      border: "#4f565e", ruin: "#66766d", ruinDark: "#2e4539", ruinStroke: "none", dashed: "#ffffff",
      wall: "#15171b", post: "#15171b", postDiag: "#ffffff", doorA: "#ffffff", doorB: "#000000",
      pillar: "#3e3a36", barricade: "#ec1c24", block: "#000000", blockText: "#ffffff",
      console: "#77797b", consoleStroke: "#1d1d1d", vent: "#56684f", lightA: "#ec1c24", lightB: "#ffffff",
      label: "#4f555a", labelText: "#ffffff", wallLabel: "#5b5c5e", wallLabelText: "#ffffff", redLabel: "#ec1c24", redLabelText: "#ffffff",
      obj: { top: "#ffffff", center: "#000000", bottom: "#f65a29", neutral: "#f05a22" }, objRing: "#000000",
      objIcon: { top: "#7b7b7e", center: "#ffffff", bottom: "#ffffff", neutral: "#111111" },
      accent: "#e2572a", green: "#3fae49", midline: "#000000", centerline: "#7a7a7a", measure: "#000000",
    },
    brand: { ...base,
      name: "Brand", note: "Logo orange, off-white and ink",
      zones: { dzTop: "#3b3b3b", midTop: "#ececec", midBottom: "#f7f2ee", dzBottom: "#F26522" },
      grid: "rgba(0,0,0,.07)", edge: "rgba(0,0,0,.18)", border: "#151515",
      ruin: "#a3aca7", ruinDark: "#5b6762", ruinStroke: "#151515", dashed: "#151515",
      wall: "#151515", post: "#151515", postDiag: "#F26522", doorA: "#F26522", doorB: "#151515",
      pillar: "#5b6762", barricade: "#F26522", block: "#151515", blockText: "#F26522",
      console: "#a3aca7", consoleStroke: "#151515", vent: "#F26522", lightA: "#F26522", lightB: "#151515",
      label: "#151515", labelText: "#ffffff", wallLabel: "#ffffff", wallLabelText: "#151515", redLabel: "#F26522", redLabelText: "#151515",
      obj: { top: "#ececec", center: "#151515", bottom: "#F26522", neutral: "#F26522" }, objRing: "#151515",
      objIcon: { top: "#151515", center: "#F26522", bottom: "#151515", neutral: "#151515" },
      accent: "#F26522", green: "#151515", midline: "#151515", centerline: "rgba(0,0,0,.25)", measure: "#151515",
      font: "700 1px Oswald, 'Arial Narrow', sans-serif",
    },
    usa: { ...base,
      name: "USA Pairing", note: "Same colours as the USA pairing stream board",
      // tokens from USAWTCCAL/docs/assets/brand.css and the pairing simulator --tv-* set
      zones: { dzTop: "#b8c6dc", midTop: "#e2e8ea", midBottom: "#fbf7f0", dzBottom: "#e7b4c0" },
      zoneEdge: { dzTop: "#0a3161", dzBottom: "#b31942" },
      grid: "rgba(22,32,38,.07)", edge: "rgba(22,32,38,.14)", border: "#162026",
      ruin: "#a9b7be", ruinDark: "#51606a", ruinStroke: "#162026", dashed: "#162026",
      wall: "#162026", post: "#162026", postDiag: "#f0b735", doorA: "#f0b735", doorB: "#162026",
      pillar: "#51606a", barricade: "#d0543f", block: "#162026", blockText: "#f0b735",
      console: "#cfd9dc", consoleStroke: "#162026", vent: "#2b9aa6", lightA: "#d0543f", lightB: "#fbf7f0",
      label: "#162026", labelText: "#ffffff", wallLabel: "#fbf7f0", wallLabelText: "#162026", redLabel: "#b24133", redLabelText: "#ffffff",
      obj: { top: "#0a3161", center: "#162026", bottom: "#b31942", neutral: "#f0b735" }, objRing: "#162026",
      objIcon: { top: "#ffffff", center: "#f0b735", bottom: "#ffffff", neutral: "#162026" },
      accent: "#b24133", green: "#2b9aa6", midline: "#162026", centerline: "rgba(22,32,38,.22)", measure: "#162026",
      font: "800 1px Nunito, 'Arial Rounded MT Bold', Inter, sans-serif",
    },
    dark: { ...base,
      name: "Broadcast Dark", note: "Built for dark overlays",
      zones: { dzTop: "#2b3644", midTop: "#1b2027", midBottom: "#26211e", dzBottom: "#6e3417" },
      grid: "rgba(255,255,255,.06)", edge: "rgba(255,255,255,.12)", border: "#F26522",
      ruin: "#4a5a54", ruinDark: "#2d3a35", ruinStroke: "#8a9d96", dashed: "#cfd8d4",
      wall: "#e9e9e9", post: "#e9e9e9", postDiag: "#F26522", doorA: "#F26522", doorB: "#e9e9e9",
      pillar: "#8a9d96", barricade: "#F26522", block: "#0b0d10", blockText: "#F26522",
      console: "#4a5a54", consoleStroke: "#e9e9e9", vent: "#F26522", lightA: "#F26522", lightB: "#e9e9e9",
      label: "#F26522", labelText: "#111111", wallLabel: "#e9e9e9", wallLabelText: "#111111", redLabel: "#F26522", redLabelText: "#111111",
      obj: { top: "#7fb0e0", center: "#ffffff", bottom: "#F26522", neutral: "#F26522" }, objRing: "#0b0d10",
      objIcon: { top: "#0b0d10", center: "#0b0d10", bottom: "#0b0d10", neutral: "#0b0d10" },
      accent: "#F26522", green: "rgba(255,255,255,.35)", midline: "rgba(255,255,255,.55)", centerline: "rgba(255,255,255,.18)", measure: "rgba(255,255,255,.6)",
      font: "700 1px Oswald, 'Arial Narrow', sans-serif",
    },
    blueprint: { ...base,
      name: "Blueprint", note: "Line-only technical look",
      zones: { dzTop: "#14406d", midTop: "#0f2f52", midBottom: "#0f2f52", dzBottom: "#1b5185" },
      grid: "rgba(255,255,255,.10)", edge: "rgba(255,255,255,.14)", border: "#cfe3ff",
      ruin: "rgba(207,227,255,.14)", ruinDark: "rgba(207,227,255,.32)", ruinStroke: "#cfe3ff", dashed: "#cfe3ff",
      wall: "#ffffff", post: "#ffffff", postDiag: "#0f2f52", doorA: "#F26522", doorB: "#ffffff",
      pillar: "rgba(207,227,255,.45)", barricade: "#F26522", block: "rgba(207,227,255,.3)", blockText: "#ffffff",
      console: "rgba(207,227,255,.2)", consoleStroke: "#cfe3ff", vent: "#F26522", lightA: "#F26522", lightB: "#ffffff",
      label: "#cfe3ff", labelText: "#0f2f52", wallLabel: "#0f2f52", wallLabelText: "#cfe3ff", redLabel: "#F26522", redLabelText: "#0f2f52",
      obj: { top: "#cfe3ff", center: "#ffffff", bottom: "#F26522", neutral: "#F26522" }, objRing: "#0f2f52",
      objIcon: { top: "#0f2f52", center: "#0f2f52", bottom: "#0f2f52", neutral: "#0f2f52" },
      accent: "#F26522", green: "#cfe3ff", midline: "#cfe3ff", centerline: "rgba(207,227,255,.3)", measure: "#cfe3ff",
      font: "500 1px 'JetBrains Mono', Consolas, monospace",
    },
  };

  function lozenge({ x, y, l, t, v }) {
    const a = l / 2, b = t / 2, c = Math.min(b, a * 0.5);
    return v ? `M${x - b} ${y - a + c}L${x} ${y - a}L${x + b} ${y - a + c}L${x + b} ${y + a - c}L${x} ${y + a}L${x - b} ${y + a - c}Z`
             : `M${x - a + c} ${y - b}L${x + a - c} ${y - b}L${x + a} ${y}L${x + a - c} ${y + b}L${x - a + c} ${y + b}L${x - a} ${y}Z`;
  }
  const skull = (fill, eyes) =>
    `<path d="M-0.42 -0.05a0.42 0.42 0 1 1 0.84 0v0.18h-0.16v0.2h-0.52v-0.2h-0.16z" fill="${fill}"/>` +
    `<circle cx="-0.16" cy="-0.04" r="0.11" fill="${eyes}"/><circle cx="0.16" cy="-0.04" r="0.11" fill="${eyes}"/>`;

  function renderMap(map, theme, opt = {}) {
    const T = typeof theme === "string" ? THEMES[theme] : theme;
    const [W, H] = map.size, o = [], sw = Math.min(W, H) / 100;
    const mk = k => map.markers.filter(m => m.kind === k);

    const Z = (T.zonesBySet && T.zonesBySet[map.set]) || T.zones;
    for (const z of map.zones) o.push(`<rect x="0" y="${z.y0}" width="${W}" height="${z.y1 - z.y0}" fill="${Z[z.kind]}"/>`);
    // optional solid line on the inner edge of each deployment zone
    const edges = [];
    if (T.zoneEdge) for (const z of map.zones) if (T.zoneEdge[z.kind]) {
      const y = z.kind === "dzTop" ? z.y1 : z.y0;
      edges.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${T.zoneEdge[z.kind]}" stroke-width="${sw * 0.9}"/>`);
      edges.push(`<rect x="0" y="${z.kind === "dzTop" ? 0 : H - sw * 1.6}" width="${W}" height="${sw * 1.6}" fill="${T.zoneEdge[z.kind]}"/>`);
    }
    if (T.grid && map.grid) {
      const g = typeof map.grid === "number" ? { step: map.grid, ox: 0, oy: 0 } : map.grid;
      let d = "";
      for (let x = g.ox; x < W - 1e-6; x += g.step) if (x > 1e-6) d += `M${+x.toFixed(3)} 0V${H}`;
      for (let y = g.oy; y < H - 1e-6; y += g.step) if (y > 1e-6) d += `M0 ${+y.toFixed(3)}H${W}`;
      o.push(`<path d="${d}" stroke="${T.grid}" stroke-width="${sw * 0.35}" fill="none"/>`);
    }
    o.push(...edges);
    for (const k of mk("edge")) o.push(`<rect x="${k.x - k.s / 2}" y="${k.y - k.s / 2}" width="${k.s}" height="${k.s}" fill="${T.edge}"/>`);
    for (const l of map.lines) {
      const c = l.accent ? T.accent : l.green ? T.green : l.kind === "midline" ? T.midline : T.centerline;
      const dashed = l.kind === "midline" || l.green;
      o.push(`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${c}" stroke-width="${sw * (dashed ? 0.9 : 0.6)}"${dashed ? ` stroke-dasharray="${sw * 2.2} ${sw * 1.4}"` : ""}/>`);
    }
    // objective range rings sit under terrain, as in the source maps
    for (const ob of map.objectives) if (ob.ring)
      o.push(`<circle cx="${ob.x}" cy="${ob.y}" r="${ob.ring}" fill="none" stroke="${T.obj[ob.kind]}" stroke-width="${sw * 1.1}"/>`);
    for (const t of map.terrain) {
      const d = P(t.pts);
      if (t.kind === "dashed")
        o.push(`<path d="${d}" fill="${T.ruin}" stroke="${T.dashed}" stroke-width="${sw * 0.8}" stroke-dasharray="${sw * 1.4} ${sw * 0.9}"/>`);
      else
        o.push(`<path d="${d}" fill="${t.kind === "ruinDark" ? T.ruinDark : T.ruin}"${T.ruinStroke !== "none" ? ` stroke="${T.ruinStroke}" stroke-width="${sw * 0.5}"` : ""} stroke-linejoin="round"/>`);
    }
    for (const k of mk("vent")) o.push(`<rect x="${k.x - k.w / 2}" y="${k.y - k.h / 2}" width="${k.w}" height="${k.h}" fill="${T.vent}"/>`);
    for (const w of map.walls) o.push(`<path d="${w.map(P).join("")}" fill="${T.wall}" fill-rule="evenodd"/>`);
    for (const d of map.doors) {
      const t = map.wallT || 0.25, len = d.e - d.s, n = Math.max(2, Math.round(len / 0.75)), seg = len / (2 * n + 1);
      const [x, y, w, h] = d.v ? [d.line - t / 2, d.s, t, len] : [d.s, d.line - t / 2, len, t];
      o.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${T.doorB}"/>`);
      for (let i = 0; i < n; i++) {
        const s = d.s + seg * (2 * i + 1);
        o.push(d.v ? `<rect x="${x}" y="${s}" width="${w}" height="${seg}" fill="${T.doorA}"/>` : `<rect x="${s}" y="${y}" width="${seg}" height="${h}" fill="${T.doorA}"/>`);
      }
    }
    for (const k of mk("lightLine")) {
      const len = Math.hypot(k.x2 - k.x1, k.y2 - k.y1), seg = len / 7;
      o.push(`<line x1="${k.x1}" y1="${k.y1}" x2="${k.x2}" y2="${k.y2}" stroke="${T.lightB}" stroke-width="${map.wallT * 0.9}"/>`);
      o.push(`<line x1="${k.x1}" y1="${k.y1}" x2="${k.x2}" y2="${k.y2}" stroke="${T.lightA}" stroke-width="${map.wallT * 0.9}" stroke-dasharray="${seg} ${seg * 2}"/>`);
    }
    for (const k of mk("insigLine")) {
      const len = Math.hypot(k.x2 - k.x1, k.y2 - k.y1), seg = len / 7;
      o.push(`<line x1="${k.x1}" y1="${k.y1}" x2="${k.x2}" y2="${k.y2}" stroke="${T.wall}" stroke-width="${map.wallT * 0.9}"/>`);
      o.push(`<line x1="${k.x1}" y1="${k.y1}" x2="${k.x2}" y2="${k.y2}" stroke="${T.lightB}" stroke-width="${map.wallT * 0.9}" stroke-dasharray="${seg} ${seg}" stroke-dashoffset="${-seg}"/>`);
    }
    for (const k of mk("post")) {
      const h = k.s / 2;
      o.push(`<rect x="${k.x - h}" y="${k.y - h}" width="${k.s}" height="${k.s}" fill="${T.post}"/>`);
      if (k.diag) {
        const f = k.diag === "f", i = h * 0.92;
        o.push(`<line x1="${k.x - i}" y1="${f ? k.y + i : k.y - i}" x2="${k.x + i}" y2="${f ? k.y - i : k.y + i}" stroke="${T.postDiag}" stroke-width="${sw * 0.45}"/>`);
      }
    }
    for (const k of mk("cross")) {
      const h = k.s / 2, i = h * 0.8;
      o.push(`<rect x="${k.x - h}" y="${k.y - h}" width="${k.s}" height="${k.s}" fill="${T.post}"/><path d="M${k.x - i} ${k.y - i}L${k.x + i} ${k.y + i}M${k.x + i} ${k.y - i}L${k.x - i} ${k.y + i}" stroke="${T.zones.midTop}" stroke-width="${sw * .4}"/>`);
    }
    for (const k of mk("console"))
      o.push(`<rect x="${k.x - k.w / 2}" y="${k.y - k.h / 2}" width="${k.w}" height="${k.h}" fill="${T.console}" stroke="${T.consoleStroke}" stroke-width="${sw * 0.9}"/>`);
    for (const k of mk("pillar")) o.push(`<path d="${lozenge(k)}" fill="${T.pillar}"/>`);
    for (const k of mk("barricade")) o.push(`<path d="${lozenge(k)}" fill="${T.barricade}"/>`);
    for (const k of mk("block")) {
      o.push(`<rect x="${k.x - k.w / 2}" y="${k.y - k.h / 2}" width="${k.w}" height="${k.h}" fill="${T.block}"/>`);
      o.push(text(k.x, k.y, k.t, T.blockText, T, Math.min(k.w, k.h) * 0.42));
    }
    for (const k of mk("octagon")) {
      const a = k.w / 2, b = k.h / 2, c = k.c;
      o.push(`<path d="M${k.x - a + c} ${k.y - b}H${k.x + a - c}L${k.x + a} ${k.y - b + c}V${k.y + b - c}L${k.x + a - c} ${k.y + b}H${k.x - a + c}L${k.x - a} ${k.y + b - c}V${k.y - b + c}Z" fill="${T.block}"/>`);
      o.push(text(k.x, k.y, k.t, T.blockText, T, k.h * 0.32));
    }
    for (const k of mk("token")) {
      o.push(`<circle cx="${k.x}" cy="${k.y}" r="${k.r}" fill="${T.block}"/>`);
      o.push(text(k.x, k.y, k.t, T.blockText, T, k.r * 0.75));
    }
    for (const k of mk("tri")) {
      const s = k.s || 0.45, [dx, dy] = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[k.d], px = -dy, py = dx;
      o.push(`<path d="M${k.x + dx * s} ${k.y + dy * s}L${k.x - dx * s * .3 + px * s * .8} ${k.y - dy * s * .3 + py * s * .8}L${k.x - dx * s * .3 - px * s * .8} ${k.y - dy * s * .3 - py * s * .8}Z" fill="${T.accent}"/>`);
    }
    for (const k of mk("x")) {
      const s = k.s || 0.35;
      o.push(`<path d="M${k.x - s} ${k.y - s}L${k.x + s} ${k.y + s}M${k.x + s} ${k.y - s}L${k.x - s} ${k.y + s}" stroke="${T.accent}" stroke-width="${sw * .7}"/>`);
    }
    if (opt.measures !== false) for (const m of map.measures) {
      const dir = Math.sign(m.y2 - m.y1), a = 0.35;
      o.push(`<line x1="${m.x}" y1="${m.y1}" x2="${m.x}" y2="${m.y2 - dir * a}" stroke="${T.measure}" stroke-width="${sw * 0.35}"/>`);
      o.push(`<path d="M${m.x - a * 0.5} ${m.y2 - dir * a}L${m.x + a * 0.5} ${m.y2 - dir * a}L${m.x} ${m.y2}Z" fill="${T.measure}"/>`);
      o.push(`<text x="${m.x + 0.3}" y="${(m.y1 + m.y2) / 2}" fill="${T.measure}" dominant-baseline="middle" style="font:${T.font};font-size:0.55px">${esc(m.t)}</text>`);
    }
    for (const ob of map.objectives) {
      const r = ob.r || 0.8, c = T.obj[ob.kind];
      o.push(`<circle cx="${ob.x}" cy="${ob.y}" r="${r}" fill="${c}" stroke="${T.objRing}" stroke-width="${sw * 0.45}"/>`);
      o.push(`<g transform="translate(${ob.x} ${ob.y}) scale(${r / 0.8})">${skull(T.objIcon[ob.kind], c)}</g>`);
      if (ob.barrels) {
        const s = r * 0.62;
        o.push(`<rect x="${ob.x - s * 1.25}" y="${ob.y - s * 0.55}" width="${s * 1.3}" height="${s * 0.75}" fill="${T.barricade}" stroke="${T.objRing}" stroke-width="${sw * 0.25}"/>`);
        o.push(`<rect x="${ob.x - s * 0.05}" y="${ob.y - s * 0.3}" width="${s * 1.3}" height="${s * 0.75}" fill="${T.barricade}" stroke="${T.objRing}" stroke-width="${sw * 0.25}"/>`);
      }
    }
    for (const l of map.labels) {
      const s = l.size || 0.82, w = l.w || Math.max(s, l.t.length * s * 0.5 + s * 0.35);
      const [bg, fg] = l.kind === "wall" ? [T.wallLabel, T.wallLabelText] : l.kind === "red" ? [T.redLabel, T.redLabelText] : [T.label, T.labelText];
      o.push(`<rect x="${l.x - w / 2}" y="${l.y - s / 2}" width="${w}" height="${s}" rx="${s * 0.06}" fill="${bg}"/>`);
      o.push(text(l.x, l.y, l.t, fg, T, s * 0.62));
    }
    o.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${T.border}" stroke-width="${sw * 0.8}"/>`);
    const vb = opt.tight ? `0 0 ${W} ${H}` : `${-sw * 0.4} ${-sw * 0.4} ${W + sw * 0.8} ${H + sw * 0.8}`;
    const cls = opt.className ? ` class="${opt.className}"` : "";
    return `<svg${cls} viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(opt.title || map.id)}">${o.join("")}</svg>`;
  }

  // Logos: traced paths from logo-paths.js, drawn in any two colours.
  const LOGO_STYLES = {
    original: { name: "Original", fg: "#F26522", bg: "#ececec" },
    usaRed: { name: "USA red", fg: "#b24133", bg: "#fbf7f0" },
    usaNavy: { name: "USA navy", fg: "#162026", bg: "#fbf7f0" },
    usaReverse: { name: "USA reversed", fg: "#fbf7f0", bg: "#162026" },
  };
  function renderLogo(name, style = "usaRed", opt = {}) {
    const s = typeof style === "string" ? LOGO_STYLES[style] : style;
    const d = (window.LOGO_PATHS || {})[name];
    if (!d) return "";
    const cls = opt.className ? ` class="${opt.className}"` : "";
    return `<svg${cls} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(opt.title || name)}"><rect width="100" height="100" fill="${s.bg}"/><path d="${d}" fill="${s.fg}" fill-rule="evenodd"/></svg>`;
  }

  window.MapRender = { renderMap, THEMES, renderLogo, LOGO_STYLES };
})();
