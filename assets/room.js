// The pixel study: Thomas, the ginger cat and the black cat, drawn at 320x180 and scaled up 6x.
// Copied from ~/Projects/presence/overlays/room.js (the OBS "Joining in a moment" scene), with
// three site changes: window.ROOM sets the canvas id and colours, and the loop pauses off screen.
(function () {
  "use strict";
  const W = 320, H = 180, S = 6, STEP = 1 / 15;
  const R = window.ROOM || {};
  const q = new URLSearchParams(location.search);
  const ACT = R.act || "working";
  const FROZEN = q.has("t") ? parseFloat(q.get("t")) : null;

  const view = document.getElementById(R.canvas || "room");
  if (!view) return;
  view.width = W * S; view.height = H * S;
  const out = view.getContext("2d");
  out.imageSmoothingEnabled = false;
  const buf = document.createElement("canvas");
  buf.width = W; buf.height = H;
  const g = buf.getContext("2d");

  let MX = null; // when set, drawing is mirrored around this x (Thomas walking left)
  const P = (x, y, w, h, c) => { g.fillStyle = c; if (MX !== null) x = 2 * MX - x - w; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const A = a => { g.globalAlpha = Math.max(0, Math.min(1, a)); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const prog = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const blinkAt = (t, period, offset) => ((t + offset) % period) < 0.14;

  // ---------- colours: walls, sky, rug and code follow the Omarchy theme; wood, skin and cats stay put
  const cs = getComputedStyle(document.documentElement);
  const tv = (n, d) => (R.theme && R.theme[n]) || cs.getPropertyValue(n).trim() || d;
  const T = {
    bg: tv("--bg", "#1a1b26"), panel: tv("--panel", "#24283b"), fg: tv("--fg", "#a9b1d6"),
    bright: tv("--bright", "#c0caf5"), dim: tv("--dim", "#565f89"), accent: tv("--accent", "#7aa2f7"),
    hot: tv("--hot", "#ad8ee6"), good: tv("--good", "#9ece6a"), warn: tv("--warn", "#e0af68"),
    bad: tv("--bad", "#f7768e"), cyan: tv("--cyan", "#449dab"),
  };
  function rgb(c) {
    c = c.replace("#", "");
    if (c.length === 3) c = c.split("").map(x => x + x).join("");
    return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) || 0);
  }
  function mix(a, b, t) {
    const x = rgb(a), y = rgb(b);
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }
  const C = {};
  C.wall = mix(T.panel, T.hot, 0.2);
  C.stripe = mix(C.wall, T.bg, 0.14);
  C.skirt = mix(C.wall, T.bg, 0.5);
  C.floor = mix(T.bg, "#6b4632", 0.5);
  C.plank = mix(C.floor, T.bg, 0.4);
  C.frame = mix(C.wall, T.bg, 0.45);
  C.sky = mix(T.bg, "#05060f", 0.35);
  C.skyHi = mix(C.sky, T.hot, 0.14);
  C.roof = mix(T.bg, "#000000", 0.45);
  C.curtain = mix(T.accent, T.bg, 0.58);
  C.curtainS = mix(C.curtain, T.bg, 0.3);
  C.rug = mix(T.hot, T.bg, 0.62);
  C.rugIn = mix(T.hot, T.bg, 0.52);
  C.scr = mix(T.bg, "#000000", 0.3);
  C.chair = mix(T.bg, "#000000", 0.2);
  C.chairIn = mix(T.panel, T.fg, 0.1);

  const F = {
    wood: "#6b4632", woodTop: "#83593e", woodEdge: "#4f3323",
    hair: "#c9a36a", hairS: "#9a7746", hairH: "#e8cc96",
    skin: "#f0bc94", skinS: "#d99c74", skinD: "#bf805f", eye: "#3f8f99", eyeH: "#e2f7f8", brow: "#a9823f",
    mouth: "#b5675a", blush: "#ea8f80",
    ph: "#24242c", phH: "#43434f",
    hood: "#9a958a", hoodS: "#837f76", hoodD: "#6e6b64", str: "#e8e2d4",
    jeans: "#46506a", jeansS: "#363e55", shoe: "#e4dfd5", sole: "#a49e93",
    shade: "#ffcaa0", bulb: "#ffeacb", glow: "#ffb35c", metal: "#4a4552", metalHi: "#625b6c",
    pot: "#b5654a", potHi: "#c97a5b", leaf: "#5aa06a", leafHi: "#79bd85", leafD: "#3f7a52",
    mug: "#e0a06a", mugHi: "#f1bd8b", mugS: "#a85f38", steam: "#f3e9dd",
    keys: "#d3c7da", keysS: "#a99cb2", bezel: "#221a2b", moon: "#f5e6b0", star: "#fff3da", lit: "#ffcf8a",
    clock: "#efe6d6", nose: "#e8999b",
  };
  const BULBS = ["#ff9d5c", "#ffd36b", "#ff7a6b", "#ffb35c", "#ffcf8a"];
  const CATS = {
    black: { base: "#211d28", shade: "#141118", hi: "#383142", tail: "#2a2532", chest: "#efe9dd", paw: "#efe9dd",
      belly: null, stripe: null, eye: "#9be07a", inner: "#6a4a58", closed: "#6f6680", tux: true },
    ginger: { base: "#e8915a", shade: "#c4733f", hi: "#f3a66e", tail: "#d27e48", chest: "#f6e9da", paw: "#f6e9da",
      belly: "#f6e9da", stripe: "#c4733f", line: "#8e4724", eye: "#3a2a26", eyeOpen: "#c9b23a", inner: "#f0a8a0", closed: "#7a3f22", tux: false },
  };

  // ---------- 3x5 pixel font for the monitor and the Zs
  const FONT = {
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
    F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
    K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
    P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
    U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
    Z: "111001010100111", 0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110",
    4: "101101111001001", 5: "111100110001110", 6: "011100111101111", 7: "111001010010010", 8: "111101111101111",
    9: "111101111001110", "(": "010100100100010", ")": "010001001001010", ":": "000010000010000", ";": "000010000010100",
    "=": "000111000111000", ".": "000000000000010", ",": "000000000010100", _: "000000000000111", "'": "010010000000000",
    '"': "101101000000000", "[": "110100100100110", "]": "011001001001011", "<": "001010100010001", ">": "100010001010100",
    "+": "000010111010000", "-": "000000111000000", "*": "000101010101000", "/": "001001010100100", "!": "010010010000010",
    "?": "110001010000010", "#": "101111101111101", "{": "011010110010011", "}": "110010011010110", $: "011110010011110",
  };
  function text(x, y, s, col) {
    for (let i = 0; i < s.length; i++) {
      const gl = FONT[s[i].toUpperCase()];
      if (!gl) continue;
      g.fillStyle = typeof col === "function" ? col(i) : col;
      for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (gl[r * 3 + k] === "1") g.fillRect(x + i * 4 + k, y + r, 1, 1);
    }
  }
  const KEYWORDS = /^(def|for|in|if|return|while|const|let|import|from|else|not|and)$/;
  function syntax(line) {
    const cols = new Array(line.length).fill(T.bright);
    const re = /(#.*|\/\/.*)|('[^']*'?|"[^"]*"?)|(\d+)|([A-Za-z_]+)|(\S)/g;
    let m;
    while ((m = re.exec(line))) {
      let c = T.fg;
      if (m[1]) c = T.dim;
      else if (m[2]) c = T.good;
      else if (m[3]) c = T.warn;
      else if (m[4]) c = KEYWORDS.test(m[4]) ? T.hot : line[m.index + m[4].length] === "(" ? T.accent : T.bright;
      else c = T.cyan;
      for (let i = m.index; i < m.index + m[0].length; i++) cols[i] = c;
    }
    return cols;
  }

  // ---------- the room
  const STARS = [[22, 29], [28, 40], [37, 27], [44, 46], [24, 52], [55, 38], [70, 47], [62, 56], [33, 58], [74, 28], [50, 30], [41, 36]];
  function circle(cx, cy, r, c) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) P(cx + x, cy + y, 1, 1, c);
  }
  function line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) P(Math.round(lerp(x0, x1, i / n)), Math.round(lerp(y0, y1, i / n)), 1, 1, c);
  }

  function room(t) {
    P(0, 0, W, 136, C.wall);
    for (let x = 6; x < W; x += 26) P(x, 0, 13, 134, C.stripe);
    P(0, 133, W, 3, C.skirt);
    P(0, 136, W, 44, C.floor);
    [[143, 0], [151, 31], [161, 12], [172, 44]].forEach(([y, off]) => {
      P(0, y, W, 1, C.plank);
      for (let x = off; x < W; x += 58) P(x, y - (y === 143 ? 7 : y === 151 ? 8 : y === 161 ? 10 : 11), 1, y === 143 ? 7 : y === 151 ? 8 : y === 161 ? 10 : 11, C.plank);
    });

    // window with curtains
    P(8, 18, 80, 1, F.metal);
    P(16, 22, 64, 64, C.frame);
    P(19, 25, 58, 58, C.sky);
    P(19, 25, 58, 14, C.skyHi);
    A(0.5); P(19, 39, 58, 8, C.skyHi); A(1);
    STARS.forEach((s, i) => { A(0.25 + 0.65 * Math.abs(Math.sin(t * 0.9 + i * 1.7))); P(s[0], s[1], 1, 1, F.star); });
    A(0.25); circle(66, 33, 5, F.moon); A(1);
    circle(66, 33, 3, F.moon);
    P(65, 32, 1, 1, "#e0cf98"); P(67, 34, 1, 1, "#e0cf98");
    [[19, 71, 11, 12], [30, 65, 10, 18], [40, 73, 9, 10], [49, 68, 14, 15], [63, 62, 14, 21]].forEach(r => P(r[0], r[1], r[2], r[3], C.roof));
    [[33, 69], [36, 74], [53, 72], [56, 77], [67, 66], [71, 71], [70, 76]].forEach((p, i) => {
      A(Math.sin(t * 0.3 + i * 2.1) > -0.6 ? 0.9 : 0.15); P(p[0], p[1], 1, 1, F.lit);
    });
    A(1);
    P(47, 25, 2, 58, C.frame); P(19, 53, 58, 2, C.frame);
    P(9, 19, 8, 70, C.curtain); P(79, 19, 8, 70, C.curtain);
    P(11, 19, 1, 70, C.curtainS); P(14, 19, 1, 70, C.curtainS); P(82, 19, 1, 70, C.curtainS); P(85, 19, 1, 70, C.curtainS);
    P(12, 86, 72, 3, F.wood); P(12, 89, 72, 1, F.woodEdge);

    lights(t);

    // wall clock showing the real time
    const KX = 111, KY = 37;
    circle(KX, KY, 9, C.frame);
    circle(KX, KY, 8, F.clock);
    P(KX, KY - 7, 1, 2, F.metal); P(KX, KY + 6, 1, 2, F.metal); P(KX - 7, KY, 2, 1, F.metal); P(KX + 6, KY, 2, 1, F.metal);
    const now = new Date(), mins = now.getMinutes() + now.getSeconds() / 60, hrs = (now.getHours() % 12) + mins / 60;
    const ha = hrs / 6 * Math.PI, ma = mins / 30 * Math.PI;
    // hour hand: short and two pixels thick; minute hand: long and thin
    for (let r = 0; r <= 4; r += 0.5) {
      const x = Math.round(KX + r * Math.sin(ha)), y = Math.round(KY - r * Math.cos(ha));
      P(x, y, 1, 1, F.bezel); P(x + (Math.abs(Math.cos(ha)) > 0.7 ? 1 : 0), y + (Math.abs(Math.cos(ha)) > 0.7 ? 0 : 1), 1, 1, F.bezel);
    }
    line(KX, KY, Math.round(KX + 6.5 * Math.sin(ma)), Math.round(KY - 6.5 * Math.cos(ma)), F.mugS);
    P(KX, KY, 1, 1, F.bezel);

    // framed print: the moon over hills
    P(132, 26, 30, 22, C.frame); P(134, 28, 26, 18, mix(T.bg, T.accent, 0.25));
    P(134, 38, 26, 8, mix(T.bg, T.good, 0.3)); P(140, 35, 10, 4, mix(T.bg, T.good, 0.3));
    P(153, 30, 3, 3, F.moon);

    // rug and floor plant
    P(108, 148, 184, 12, C.rug); P(112, 150, 176, 8, C.rugIn);
    // monstera: big split leaves on long stems
    // a heart-shaped leaf with splits running from the edge in towards the centre vein
    const MONSTERA = [];
    for (let y = -5; y <= 5; y++) {
      let row = "";
      for (let x = -6; x <= 6; x++) {
        let on = (x / 6.6) ** 2 + ((y + (y < 0 ? 0.6 : 0)) / 5.6) ** 2 <= 1;
        if (y === -5 && Math.abs(x) < 1) on = false;                          // notch at the top of the heart
        for (const y0 of [-3.4, -0.6, 2.2]) {
          if (Math.abs(x) >= 2 && Math.abs((y - y0) - 0.45 * (Math.abs(x) - 2)) < 0.5) on = false;
        }
        row += on ? "#" : ".";
      }
      MONSTERA.push(row);
    }
    const leaves = [[289, 101, 0], [302, 90, 1], [308, 108, 2], [290, 118, 3], [306, 123, 4]];
    leaves.forEach(([lx, ly, i]) => {
      const sw = Math.round(Math.sin(t * 0.6 + i * 1.4) * 0.6);
      line(308, 137, lx + 6 + sw, ly + 10, F.leafD);        // stem from the pot to the leaf's base
    });
    leaves.forEach(([lx, ly, i]) => {
      const sw = Math.round(Math.sin(t * 0.6 + i * 1.4) * 0.6), c = i % 2 ? F.leaf : F.leafD;
      MONSTERA.forEach((row, r) => {
        for (let k = 0; k < row.length; k++) if (row[k] === "#") P(lx + k + sw, ly + r, 1, 1, k === 6 && r > 0 && r < 10 ? F.leafHi : c);
      });
      P(lx + 3 + sw, ly + 1, 2, 1, F.leafHi);
    });
    P(299, 136, 18, 3, F.potHi); P(300, 139, 16, 14, F.pot); P(300, 151, 16, 2, "#93503a"); P(301, 140, 2, 10, "#c98a6a");
  }

  function lights(t) {
    for (let x = 92; x < W; x++) P(x, 5 + Math.round(3 * Math.sin(((x - 92) / 228) * Math.PI)), 1, 1, "#5a4a58");
    for (let i = 0; i < 14; i++) {
      const lx = 98 + i * 16, ly = 6 + Math.round(3 * Math.sin(((lx - 92) / 228) * Math.PI));
      P(lx + 1, ly, 1, 2, "#5a4a58");
      A(0.18); P(lx - 1, ly + 1, 5, 6, BULBS[i % 5]);
      A(0.6 + 0.4 * Math.abs(Math.sin(t * 1.3 + i * 0.8))); P(lx, ly + 2, 3, 4, BULBS[i % 5]);
      A(1);
    }

  }

  function chair(occupied) {
    const cx = 178;
    P(cx - 17, 69, 34, 42, C.chair);
    P(cx - 15, 71, 30, 40, C.chairIn);
    P(cx - 15, 80, 30, 1, C.chair);
    P(cx - 16, 117, 32, 3, C.chair);
    P(cx - 1, 120, 3, 29, F.metal);
    P(cx - 13, 149, 26, 2, C.chair);
    P(cx - 14, 151, 3, 2, "#121318"); P(cx - 1, 151, 3, 2, "#121318"); P(cx + 11, 151, 3, 2, "#121318");
    if (!occupied) P(cx - 15, 112, 30, 5, C.chairIn);
  }

  function desk() {
    P(94, 110, 206, 2, F.woodTop);
    P(94, 112, 206, 5, F.wood);
    P(94, 117, 206, 1, F.woodEdge);
    P(99, 118, 4, 40, F.woodEdge); P(291, 118, 4, 40, F.woodEdge);
    P(100, 118, 1, 40, F.wood); P(292, 118, 1, 40, F.wood);
  }

  function deskItems(t, steam, mugOnDesk, lamp) {
    // lamp
    P(100, 108, 12, 2, F.metal); P(101, 107, 10, 1, F.metalHi);
    P(105, 92, 2, 15, F.metal);
    const on = lamp !== 0;
    P(98, 86, 16, 6, on ? F.shade : "#b08f7c"); P(100, 85, 12, 1, on ? F.shade : "#b08f7c"); P(98, 91, 16, 1, on ? "#e9a983" : "#8d7264");
    P(100, 92, 12, 1, on ? F.bulb : "#6f5d58");
    // pothos: leaves on top, a long vine from the soil over the rim, down the pot and over the desk edge
    const sway = Math.sin(t * 1.1);
    const leafAt = (x, y, c) => { P(x, y, 3, 2, c); P(x + 1, y + 2, 1, 1, c); P(x, y, 1, 1, F.leafHi); };
    const vine = [[121, 101], [122, 100], [123, 100], [124, 101], [124, 102]];         // out of the soil and over the front rim
    for (let y = 103; y <= 117; y++) vine.push([124 + (y > 106 ? 1 : 0) + (y > 112 ? 1 : 0), y]); // down the pot, across the desk top and edge
    for (let y = 118; y <= 129; y++) vine.push([126 + Math.round(sway * (y - 117) / 9), y]);       // hanging free, swaying
    // a short second vine curling over the left rim
    const vine2 = [[119, 101], [118, 100], [117, 100], [116, 101], [115, 102], [115, 103], [114, 104], [114, 105]];
    P(117, 104, 9, 6, F.pot); P(116, 102, 11, 2, F.potHi); P(117, 102, 9, 1, "#5a3a2a"); P(118, 104, 1, 5, "#c98a6a");
    P(121, 96, 1, 6, F.leafD); P(119, 98, 1, 4, F.leafD); P(123, 97, 1, 5, F.leafD);
    leafAt(119, 93, F.leaf); leafAt(122, 91 + (sway > 0.5 ? 1 : 0), F.leafD); leafAt(123, 94, F.leaf); leafAt(117, 96, F.leafD);
    vine.forEach(([x, y]) => P(x, y, 1, 1, F.leafD));
    vine2.forEach(([x, y]) => P(x, y, 1, 1, F.leafD));
    // leaves alternate sides along the vine
    vine.forEach(([x, y], i) => { if (i > 3 && i % 4 === 0) leafAt(i % 8 ? x + 1 : x - 3, y - 1, i % 8 ? F.leaf : F.leafD); });
    const end = vine[vine.length - 1];
    leafAt(end[0] - 1, end[1], F.leaf);
    leafAt(112, 103, F.leaf); leafAt(115, 99, F.leafD); leafAt(112, 105, F.leafD);
    // mug and steam
    if (mugOnDesk !== false) {
    P(130, 103, 8, 7, F.mug); P(131, 103, 6, 1, F.mugHi); P(130, 103, 1, 7, F.mugS);
    P(138, 104, 1, 4, F.mugS); P(137, 104, 1, 1, F.mugS); P(137, 107, 1, 1, F.mugS);
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.45 + i / 3) % 1;
      A(steam * (1 - p) * 0.55);
      P(132 + i + Math.round(Math.sin(t * 2.5 + i * 2) * 1.2), 101 - p * 14, 1, 2, F.steam);
    }
    A(1);
    }
    // keyboard and mouse
    P(165, 107, 26, 3, F.keys); P(165, 109, 26, 1, F.keysS);
    for (let x = 167; x < 189; x += 2) P(x, 108, 1, 1, F.keysS);
    P(196, 107, 5, 3, F.keys); P(198, 107, 1, 1, F.keysS);
  }

  function monitor(screen, t) {
    if (screen.on) {
      const c = rgb(T.accent), gr = g.createRadialGradient(258, 83, 10, 258, 83, 62);
      gr.addColorStop(0, `rgba(${c},0.14)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(190, 20, 136, 116);
    }
    P(254, 104, 8, 6, F.metal); P(247, 108, 22, 2, F.metal); P(248, 108, 20, 1, F.metalHi);
    P(222, 60, 72, 46, F.bezel);
    P(224, 62, 68, 42, screen.on ? C.scr : "#0e0c13");
    if (screen.on) {
      const lines = screen.lines.slice(-7);
      lines.forEach((ln, i) => {
        const cols = screen.plain ? null : syntax(ln);
        text(226, 63 + i * 6, ln.slice(0, 16), cols ? k => cols[k] : (screen.colour || T.bright));
      });
      if (screen.cursor && Math.floor(t * 2) % 2 === 0) {
        const last = lines[lines.length - 1] || "";
        P(226 + Math.min(last.length, 15) * 4, 63 + Math.max(0, lines.length - 1) * 6, 3, 5, T.bright);
      }
    }
    P(289, 104, 2, 1, screen.on ? T.good : T.warn);
  }

  function cable(t, chew) {
    const c = "#1b1820";
    P(287, 105, 2, 5, c); P(288, 110, 2, 8, c);                // down the back of the desk
    for (let x = 289; x <= 296; x++) P(x, 118 + Math.round((x - 289) * 0.4), 1, 1, c);
    // a loop sagging to the floor, then off to the wall socket
    for (let x = 262; x <= 296; x++) P(x, Math.round(151 + 9 * Math.sin(((x - 262) / 34) * Math.PI)), 1, 1, c);
    P(296, 121, 1, 30, c);
    P(262, 127, 1, 24, c);                                      // up the wall to the socket
    P(259, 120, 7, 8, "#e6dfd2"); P(260, 122, 1, 2, "#5a5560"); P(264, 122, 1, 2, "#5a5560"); P(261, 126, 3, 1, c);
    if (chew && Math.sin(t * 9) > 0.7) { P(266, 155, 1, 1, F.lit); P(268, 153, 1, 1, "#fff6c2"); P(264, 152, 1, 1, F.lit); }
  }
  function lampGlow(t) {
    const gr = g.createRadialGradient(106, 96, 2, 106, 100, 70);
    const a = 0.16 + 0.015 * Math.sin(t * 3);
    gr.addColorStop(0, `rgba(255,180,100,${a})`);
    gr.addColorStop(1, "rgba(255,180,100,0)");
    g.fillStyle = gr; g.fillRect(30, 30, 160, 140);
  }

  // ---------- Thomas
  const CX = 178;
  function thomasSit(st, t) {
    const cx = CX, y = Math.round(st.dy || 0);
    // torso
    P(cx - 10, 82 + y, 20, 1, F.hood); P(cx - 11, 83 + y, 22, 30 - y, F.hood);
    P(cx - 11, 83 + y, 2, 30 - y, F.hoodS); P(cx + 9, 83 + y, 2, 30 - y, F.hoodS);
    P(cx - 6, 79 + y, 12, 4, F.hoodS); P(cx - 4, 80 + y, 8, 2, F.hoodD);
    P(cx - 3, 82 + y, 1, 10, F.str); P(cx + 2, 82 + y, 1, 10, F.str);
    P(cx - 3, 92 + y, 1, 1, F.sole); P(cx + 2, 92 + y, 1, 1, F.sole);
    P(cx - 7, 101 + y, 14, 1, F.hoodS);
    // arms
    if (st.pose === "stretch") {
      // cheering: arms up and out in a V, fists closed
      arm([[-14, 81, 4, 5], [-15, 77, 4, 5], [-16, 73, 4, 5], [-17, 69, 4, 5], [-18, 65, 4, 5], [-19, 61, 4, 5], [-20, 57, 4, 5]], cx, y);
      arm([[10, 81, 4, 5], [11, 77, 4, 5], [12, 73, 4, 5], [13, 69, 4, 5], [14, 65, 4, 5], [15, 61, 4, 5], [16, 57, 4, 5]], cx, y);
      [[-21, 51], [16, 51]].forEach(([dx, dy]) => {
        P(cx + dx, dy + y, 5, 6, F.skinD); P(cx + dx, dy + y, 5, 5, F.skin);
        P(cx + dx + 1, dy + y + 1, 3, 1, F.skinS); P(cx + dx, dy + y, 5, 1, F.skinS);
      });
      const sp = Math.floor(t * 6) % 3;
      A(0.9);
      [[-26, 47], [-23, 42], [22, 44], [25, 49]].forEach(([dx, dy], i) => {
        if ((i + sp) % 3 === 0) return;
        P(cx + dx, dy + y, 1, 3, F.lit); P(cx + dx - 1, dy + y + 1, 3, 1, F.lit);
      });
      A(1);
    } else {
      // arms: shoulder, elbow out, forearm angled in to the keyboard, outlined so they read against the hoodie
      if (st.pose === "reach") arm([[-14, 84, 4, 5], [-17, 88, 5, 4], [-22, 92, 5, 4], [-27, 95, 5, 4], [-32, 98, 5, 4], [-37, 101, 5, 4]], cx, y);
      else if (st.pose === "sip" || st.pose === "peer") arm([[-14, 84, 4, 5], [-15, 89, 4, 5], [-16, 94, 4, 4], [-15, 91, 4, 4], [-13, 87, 4, 4], [-11, 84, 4, 4]], cx, y);
      else arm([[-14, 84, 4, 6], [-15, 89, 4, 6], [-16, 94, 4, 5], [-15, 98, 4, 3], [-13, 100, 4, 3], [-11, 102, 4, 3]], cx, y);
      if (st.pose === "scratch") {
        const w = Math.floor(t * 6) % 2;
        arm([[10, 81, 4, 5], [11, 77, 4, 5], [12, 73, 4, 5], [12, 69, 4, 4], [10, 65, 4, 4], [8, 62, 4, 4]], cx, y);
        P(cx + 4, 57 + y + w, 6, 6, F.skinD); P(cx + 4, 57 + y + w, 6, 5, F.skin); P(cx + 5, 58 + y + w, 4, 1, F.skinS);
      } else if (st.pose === "wave") {
        const w = Math.floor(t * 5) % 2;
        arm([[10, 81, 4, 5], [11, 77, 4, 5], [12, 73, 4, 5], [13, 69, 4, 5], [13, 65, 4, 5], [14, 61, 4, 5], [14, 57, 4, 5]], cx, y);
        const hx = cx + 13 + w, hy = 50 + y;               // hand overlaps the cuff so it stays attached
        P(hx, hy, 6, 9, F.skinD); P(hx, hy, 6, 8, F.skin);
        P(hx, hy - 2, 1, 2, F.skin); P(hx + 2, hy - 3, 1, 3, F.skin); P(hx + 4, hy - 2, 1, 2, F.skin);
        P(hx - 1, hy + 3, 1, 3, F.skin); P(hx + 1, hy + 6, 4, 1, F.skinS);
      } else {
        arm([[10, 84, 4, 6], [11, 89, 4, 6], [12, 94, 4, 5], [11, 98, 4, 3], [9, 100, 4, 3], [7, 102, 4, 3]], cx, y);
      }
    }
    // neck and face
    P(cx - 2, 76 + y, 4, 4, F.skinS);
    P(cx - 6, 64 + y, 12, 13, F.skin); P(cx - 5, 77 + y, 10, 1, F.skin);
    // hair: loose curls with volume on top, and a receding hairline that leaves a high forehead
    P(cx - 5, 59 + y, 10, 5, F.skin); P(cx - 4, 58 + y, 8, 1, F.skin);
    hairMask(HAIR_FRONT, cx - 10, 50 + y);
    // headphones
    P(cx - 6, 57 + y, 12, 1, F.ph); P(cx - 8, 58 + y, 2, 2, F.ph); P(cx + 6, 58 + y, 2, 2, F.ph);
    P(cx - 9, 60 + y, 2, 6, F.ph); P(cx + 7, 60 + y, 2, 6, F.ph);
    P(cx - 10, 66 + y, 4, 6, F.ph); P(cx + 6, 66 + y, 4, 6, F.ph);
    P(cx - 10, 67 + y, 1, 4, F.phH); P(cx + 9, 67 + y, 1, 4, F.phH);
    // face
    const ey = 69 + y, lx = st.look || 0;
    P(cx - 4, ey - 2 - (st.lookUp ? 1 : 0), 3, 1, F.brow); P(cx + 1, ey - 2 - (st.lookUp ? 1 : 0), 3, 1, F.brow);
    if (st.pose === "stretch") {
      [cx - 5, cx + 1].forEach(ex => { P(ex, ey + 1, 1, 1, F.brow); P(ex + 1, ey, 2, 1, F.brow); P(ex + 3, ey + 1, 1, 1, F.brow); });
    } else if (st.blink) {
      P(cx - 4, ey + 1, 2, 1, F.skinD); P(cx + 2, ey + 1, 2, 1, F.skinD);
    } else {
      P(cx - 4, ey, 2, 2, F.eye); P(cx + 2, ey, 2, 2, F.eye);
      P(cx - 4 + lx, ey - (st.lookUp ? 0 : 0), 1, 1, F.eyeH); P(cx + 2 + lx, ey, 1, 1, F.eyeH);
    }
    P(cx - 1, ey + 3, 2, 1, F.skinS);
    if (st.pose === "stretch") {
      P(cx - 3, ey + 5, 6, 3, F.mouth); P(cx - 2, ey + 8, 4, 1, F.mouth); P(cx - 2, ey + 5, 4, 1, "#f6f1ea");
      P(cx - 1, ey + 7, 2, 1, "#e07a7a");
      A(0.5); P(cx - 6, ey + 3, 2, 1, F.blush); P(cx + 4, ey + 3, 2, 1, F.blush); A(1);
    } else if (st.pose === "scratch") {
      P(cx - 2, ey + 6, 1, 1, F.skinD); P(cx - 1, ey + 5, 1, 1, F.skinD); P(cx, ey + 6, 1, 1, F.skinD); P(cx + 1, ey + 5, 1, 1, F.skinD);
    } else if (st.pose === "peer") {
      P(cx - 2, ey + 6, 4, 1, F.skinD); P(cx - 3, ey + 7, 1, 1, F.skinD); P(cx + 2, ey + 7, 1, 1, F.skinD);
    } else if (st.smile) {
      P(cx - 2, ey + 6, 4, 1, F.mouth); P(cx - 3, ey + 5, 1, 1, F.mouth); P(cx + 2, ey + 5, 1, 1, F.mouth);
      A(0.45); P(cx - 5, ey + 3, 2, 1, F.blush); P(cx + 3, ey + 3, 2, 1, F.blush); A(1);
    } else {
      P(cx - 2, ey + 6, 4, 1, F.skinD);
    }
  }
  function heldMug(x, y, full, t, tilted) {
    P(x, y, 9, 8, F.mug); P(x + 1, y, 7, 1, F.mugHi); P(x, y, 1, 8, F.mugS); P(x + 1, y + 7, 8, 1, "#c98a58");
    P(x + 9, y + 1, 2, 1, F.mugS); P(x + 10, y + 1, 1, 5, F.mugS); P(x + 9, y + 5, 2, 1, F.mugS);
    if (tilted) { P(x + 1, y, 7, 2, "#3a2418"); P(x + 1, y, 7, 1, "#5a3826"); }             // looking in: an empty, dark bottom
    if (full) for (let i = 0; i < 3; i++) {
      const p = (t * 0.5 + i / 3) % 1;
      A((1 - p) * 0.6); P(x + 2 + i + Math.round(Math.sin(t * 2.5 + i * 2)), y - 2 - p * 12, 1, 2, F.steam);
    }
    A(1);
  }
  function bubble(x, y, t) {
    const ink = F.bezel, paper = "#f4efe6";
    P(x - 1, y + 1, 30, 15, ink); P(x, y, 28, 17, ink);
    P(x, y + 1, 28, 15, paper); P(x + 1, y, 26, 17, paper);
    P(x - 4, y + 18, 4, 3, ink); P(x - 3, y + 19, 2, 1, paper);
    P(x - 8, y + 23, 2, 2, ink);
    // an empty mug and a question mark
    P(x + 5, y + 4, 9, 1, F.mugS); P(x + 5, y + 4, 1, 9, F.mugS); P(x + 13, y + 4, 1, 9, F.mugS); P(x + 5, y + 12, 9, 1, F.mugS);
    P(x + 14, y + 6, 2, 1, F.mugS); P(x + 15, y + 6, 1, 4, F.mugS); P(x + 14, y + 9, 2, 1, F.mugS);
    if (Math.floor(t * 3) % 2 === 0) text(x + 19, y + 6, "?", F.mugS); else text(x + 19, y + 5, "?", F.mugS);
  }
  function arm(segs, cx, y) {
    segs.forEach(r => P(cx + r[0] - 1, r[1] + y, r[2] + 2, r[3] + 1, F.hoodD));
    segs.forEach(r => P(cx + r[0], r[1] + y, r[2], r[3], F.hood));
    const c = segs[segs.length - 1];
    P(cx + c[0], c[1] + y + 1, c[2], 2, F.hoodS);
  }
  function thomasLegs(dy) {
    const cx = CX;
    if (dy < -5) { // standing up: straight legs
      A(0.28); P(cx - 16, 150, 32, 3, "#000000"); A(1);
      [-1, 1].forEach(side => {
        const x = side < 0 ? cx - 9 : cx + 2;
        P(x, 117, 7, 28, F.jeans); P(side < 0 ? x : x + 6, 117, 1, 28, F.jeansS); P(x - 1, 143, 8, 2, F.jeansS);
        P(x - 2, 145, 10, 1, F.shoe); P(x - 2, 146, 10, 3, F.shoe); P(x - 2, 149, 10, 1, F.sole); P(x - 1, 150, 8, 1, "#6f6a62");
      });
      return;
    }
    // soft shadow on the floor under the chair
    A(0.28); P(cx - 22, 150, 44, 3, "#000000"); P(cx - 17, 153, 34, 1, "#000000"); A(1);
    [-1, 1].forEach(side => {
      // knees apart, shins angling in to the ankles; x values are mirrored for the right leg
      const X = (dx, w) => (side < 0 ? cx + dx : cx - dx - w);
      P(X(-16, 9), 118, 9, 5, F.jeans); P(X(-15, 7), 117, 7, 1, F.jeans);
      P(X(-14, 5), 118, 5, 2, "#5b6788");                   // light on top of the knee
      [[-15, 123, 7], [-14, 128, 7], [-13, 133, 7], [-12, 138, 6]].forEach(([dx, y, w]) => {
        P(X(dx, w), y, w, 5, F.jeans);
        P(X(dx, 1), y, 1, 5, F.jeansS);                      // outer edge in shadow
      });
      P(X(-13, 8), 143, 8, 2, F.jeansS);                     // hem
      const sx = X(-14, 10);
      P(sx + 1, 145, 8, 1, F.shoe); P(sx, 146, 10, 3, F.shoe);
      P(sx + 3, 145, 4, 1, "#c9c3b8"); P(sx + 4, 146, 2, 1, "#9a948a");
      P(sx, 149, 10, 1, F.sole); P(sx + 1, 150, 8, 1, "#6f6a62");
    });
  }
  function thomasHands(st, t) {
    if (st.pose === "stretch") return;
    const cx = CX, y = Math.round(st.dy || 0);
    if (st.pose === "reach") {
      P(cx - 42, 102, 5, 4, F.skin); P(cx - 42, 105, 5, 1, F.skinS);
    } else if (st.pose === "sip" || st.pose === "peer") {
      const mx = st.pose === "sip" ? cx - 9 : cx - 14, my = (st.pose === "sip" ? 71 : 78) + y;
      heldMug(mx, my, false, t, st.pose === "peer");
      P(mx - 1, my + 6, 7, 4, F.skin); P(mx - 1, my + 9, 7, 1, F.skinS);
    }
    if (st.pose === "reach" || st.pose === "sip" || st.pose === "peer") {
      if (st.pose !== "wave") { P(cx + 5, 104 + y, 5, 3, F.skin); P(cx + 5, 106 + y, 5, 1, F.skinS); }
      return;
    }
    const a = st.typing ? Math.floor(t * 11) % 2 : 0;
    P(cx - 10, 104 + y - a, 5, 3, F.skin); P(cx - 10, 106 + y - a, 5, 1, F.skinS);
    if (st.pose !== "wave" && st.pose !== "scratch") {
      const b = st.typing ? 1 - a : 0;
      P(cx + 5, 104 + y - b, 5, 3, F.skin); P(cx + 5, 106 + y - b, 5, 1, F.skinS);
    }
  }
  function thomasWalk(bx, ph, dir, mug, t) {
    bx = Math.round(bx);
    if (dir < 0) MX = bx;
    const s = Math.round(Math.sin(ph) * 5), sw = Math.round(Math.sin(ph) * 4);
    const y = Math.abs(Math.cos(ph)) > 0.75 ? 0 : 1;
    const half = v => Math.round(v / 2);
    // far leg and far arm
    P(bx - 5 - half(s), 102 + y, 8, 24, F.jeansS); P(bx - 5 - s, 124 + y, 8, 23 - y, F.jeansS);
    P(bx - 5 - s, 146, 11, 4, F.sole); P(bx - 5 - s, 150, 11, 1, "#7f796f");
    P(bx - 2 - half(sw), 66 + y, 5, 16, F.hoodD); P(bx - 2 - sw, 81 + y, 5, 13, F.hoodD); P(bx - 2 - sw, 94 + y, 5, 4, F.skinS);
    // hoodie: chest at the front, hood bunched at the back
    P(bx - 4, 64 + y, 9, 1, F.hood); P(bx - 5, 65 + y, 11, 39, F.hood);
    P(bx - 5, 65 + y, 2, 39, F.hoodS); P(bx - 7, 64 + y, 3, 8, F.hoodS);
    P(bx + 4, 66 + y, 1, 10, F.str); P(bx + 4, 76 + y, 1, 1, F.sole);
    P(bx, 92 + y, 6, 1, F.hoodS); P(bx - 5, 101 + y, 11, 3, F.hoodS);
    P(bx - 5, 103 + y, 11, 3, F.jeans);
    // head
    P(bx - 1, 60 + y, 5, 5, F.skinS);
    P(bx - 3, 46 + y, 10, 15, F.skin); P(bx + 7, 52 + y, 1, 3, F.skin); P(bx + 7, 55 + y, 1, 1, F.skinS);
    P(bx - 2, 61 + y, 8, 1, F.skin);
    P(bx, 44 + y, 6, 2, F.skin); P(bx + 1, 43 + y, 4, 1, F.skin);
    hairMask(HAIR_SIDE, bx - 10, 38 + y);
    P(bx - 3, 41 + y, 2, 10, F.ph); P(bx - 4, 50 + y, 5, 7, F.ph); P(bx - 4, 51 + y, 1, 5, F.phH);
    P(bx + 3, 49 + y, 3, 1, F.brow); P(bx + 4, 51 + y, 1, 2, F.eye); P(bx + 3, 57 + y, 3, 1, F.skinD);
    // near leg and near arm
    P(bx - 4 + half(s), 102 + y, 8, 24, F.jeans); P(bx - 4 + s, 124 + y, 8, 23 - y, F.jeans);
    P(bx - 4 + s, 124 + y, 1, 23 - y, F.jeansS);
    P(bx - 4 + s, 146, 11, 4, F.shoe); P(bx - 4 + s, 150, 11, 1, F.sole);
    if (mug) {
      // near arm bent, carrying the mug in front of the chest
      P(bx - 3, 65 + y, 6, 15, F.hoodD); P(bx - 3, 78 + y, 13, 6, F.hoodD);
      P(bx - 2, 66 + y, 4, 14, F.hood); P(bx - 2, 79 + y, 11, 4, F.hood); P(bx + 7, 79 + y, 2, 4, F.hoodS);
      const mx = bx + 8, my = 73 + y;
      MX = null;                                            // mug and steam are drawn the right way round
      heldMug(dir < 0 ? 2 * bx - mx - 9 : mx, my, mug === "full", t, false);
      if (dir < 0) MX = bx;
      P(bx + 8, 79 + y, 4, 4, F.skin); P(bx + 8, 82 + y, 4, 1, F.skinS);
    } else {
      P(bx - 3 + half(sw), 65 + y, 6, 17, F.hoodD); P(bx - 3 + sw, 81 + y, 6, 14, F.hoodD);
      P(bx - 2 + half(sw), 66 + y, 4, 16, F.hood); P(bx - 2 + sw, 81 + y, 4, 13, F.hood);
      P(bx - 2 + sw, 92 + y, 4, 2, F.hoodS); P(bx - 2 + sw, 94 + y, 4, 4, F.skin);
    }
    MX = null;
  }

  // ---------- Thomas's hair, as pixel masks: # hair, h highlight, s shadow (curl edges), . none
  const HAIR_FRONT = [
    "......h.....h.......",
    "....#hh#..#hh#.h....",
    "..h#h###h####h#hs...",
    "..##s###h##s####s#..",
    ".s#h###s####h##s##h.",
    ".h##s##h##s###h###s.",
    "s#h##s######s##h##s#",
    ".##s#h##s##h###s###s",
    "h#s##s###h####s#s##.",
    ".s##hs#s##.s##h#s#h.",
    "..#s#...##s...s##s..",
    "...#s....hs....#s...",
    "...##.....s....##...",
    "...#s..........s#...",
    "...##..........##...",
    "....s...........s...",
  ];
  const HAIR_SIDE = [
    "....hh..h.h.....",
    "..#h##s#hh#h....",
    ".#s###h###s##h..",
    "h#h#s####h##s##.",
    "##s#h##s###h##s#",
    "#s##s#h##s####s.",
    "s#h###s##h#s#...",
    "#s##h#s###s#s...",
    "h#s##s#h##s.....",
    "##h#s##s#s......",
    "s##s#h#s#.......",
    ".#s##s#s........",
    "..#s#s#.........",
    "...ss#..........",
  ];
  function hairMask(rows, x, y) {
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) {
      const c = row[i]; if (c !== ".") P(x + i, y + j, 1, 1, c === "h" ? F.hairH : c === "s" ? F.hairS : F.hair);
    } });
  }

  // ---------- cats. x is the left edge of the cat's box, y the surface its paws stand on.
  function mirror(x, y, dir, box) {
    return (dx, dy, w, h, c) => P(dir > 0 ? x + dx : x + box - dx - w, y + dy, w, h, c);
  }
  function outline(L, K, x, y, w, h) { // edges only, so the corners stay round
    if (!K.line) return;
    L(x, y - 1, w, 1, K.line); L(x, y + h, w, 1, K.line); L(x - 1, y, 1, h, K.line); L(x + w, y, 1, h, K.line);
  }
  function catWalk(K, s) {
    const L = mirror(s.x, s.y, s.dir, 24);
    const o = s.air ? 0 : Math.round(Math.sin(s.ph) * 1.5);
    const sw = Math.round(Math.sin(s.ph * 0.5 + 1));
    // far legs
    if (s.air) { L(1, -6, 4, 2, K.shade); L(19, -9, 4, 2, K.shade); }
    else { L(7 - o, -4, 2, 4, K.shade); L(16 + o, -4, 2, 4, K.shade); }
    // tail
    L(2, -14, 2, 4, K.tail); L(1 + sw, -17, 2, 3, K.tail); L(2 + sw, -18, 1, 1, K.tail);
    // body
    L(4, -12, 12, 1, K.base); L(3, -11, 15, 7, K.base);
    if (K.hi) L(5, -11, 10, 1, K.hi);
    if (K.belly) L(5, -5, 11, 1, K.belly);
    if (K.stripe) { L(7, -11, 1, 3, K.stripe); L(10, -12, 1, 3, K.stripe); L(13, -11, 1, 3, K.stripe); }
    // near legs: a round haunch over the hind leg, which tapers to the paw
    L(3, -10, 5, 1, K.base); L(2, -9, 7, 5, K.base); L(3, -4, 5, 1, K.base);
    L(8, -8, 1, 1, K.shade); L(9, -7, 1, 2, K.shade); L(8, -5, 1, 1, K.shade);
    if (s.air) { L(1, -5, 5, 2, K.base); L(19, -7, 4, 2, K.base); L(0, -5, 1, 2, K.paw); L(22, -7, 1, 2, K.paw); }
    else {
      L(4 + o, -4, 3, 3, K.base); L(5 + o, -1, 2, 1, K.base); L(15 - o, -4, 2, 4, K.base);
      L(4 + o, -1, 3, 1, K.paw); L(15 - o, -1, 2, 1, K.paw);
    }
    // head
    outline(L, K, 17, -16, 7, 6);
    if (K.line) { L(16, -18, 1, 2, K.line); L(17, -19, 2, 1, K.line); L(21, -19, 2, 1, K.line); L(23, -18, 1, 2, K.line); }
    L(16, -13, 1, 3, K.base);
    L(17, -16, 7, 6, K.base);
    L(17, -18, 2, 2, K.base); L(21, -18, 2, 2, K.base); L(21, -17, 1, 1, K.inner);
    L(21, -14, 1, 1, s.blink ? K.closed : K.eye);
    if (K.stripe) L(19, -16, 2, 1, K.stripe);
    if (K.tux) { L(17, -10, 3, 4, K.chest); L(21, -12, 3, 2, K.chest); }
    else L(22, -11, 2, 1, K.chest);
    L(23, -13, 1, 1, F.nose);
  }
  function catStretch(K, s) {
    const L = mirror(s.x, s.y, s.dir, 24);
    const sw = Math.round(Math.sin(s.ph * 2));
    L(3, -9, 4, 3, K.shade); L(4, -6, 3, 5, K.shade); L(4, -1, 3, 1, K.shade); L(15, -3, 8, 2, K.shade);
    L(2, -19, 2, 6, K.tail); L(1 + sw, -22, 2, 3, K.tail);
    L(3, -14, 8, 6, K.base); L(9, -12, 6, 5, K.base); L(13, -9, 5, 4, K.base);
    if (K.hi) L(4, -14, 6, 1, K.hi);
    if (K.belly) L(10, -8, 6, 1, K.belly);
    if (K.stripe) { L(6, -14, 1, 3, K.stripe); L(9, -13, 1, 3, K.stripe); L(12, -11, 1, 3, K.stripe); }
    // near hind leg: a round thigh under the raised rump, tapering to the paw
    L(5, -10, 6, 1, K.base); L(4, -9, 8, 3, K.base); L(5, -6, 6, 1, K.base); L(6, -5, 4, 1, K.base);
    L(11, -8, 1, 1, K.shade); L(10, -6, 1, 1, K.shade); L(9, -5, 1, 1, K.shade);
    L(6, -4, 3, 3, K.base); L(6, -1, 3, 1, K.paw);
    L(12, -6, 4, 4, K.shade); L(13, -3, 3, 1, K.shade);
    L(14, -6, 3, 5, K.base); L(15, -2, 2, 2, K.base);
    L(16, -2, 8, 2, K.base); L(22, -2, 2, 2, K.paw);
    outline(L, K, 16, -11, 7, 6);
    if (K.line) { L(15, -13, 1, 2, K.line); L(16, -14, 2, 1, K.line); L(20, -14, 2, 1, K.line); L(22, -13, 1, 2, K.line); }
    L(16, -11, 7, 6, K.base);
    L(16, -13, 2, 2, K.base); L(20, -13, 2, 2, K.base); L(20, -12, 1, 1, K.inner);
    L(19, -9, 2, 1, K.closed);
    if (s.yawn) { L(21, -7, 2, 2, "#b84a5e"); L(21, -7, 1, 1, "#f2f2f2"); }
    else if (K.tux) L(20, -7, 3, 2, K.chest);
    L(23, -8, 1, 1, F.nose);
  }
  function catCurl(K, s) {
    const L = mirror(s.x, s.y, s.dir, 20);
    L(2, -8, 14, 1, K.base); L(1, -7, 16, 6, K.base); L(2, -1, 14, 1, K.base);
    if (s.breath) L(4, -9, 9, 1, K.base);
    if (K.hi) L(4, -7, 8, 1, K.hi);
    if (K.stripe) { L(5, -7, 1, 2, K.stripe); L(8, -8, 1, 2, K.stripe); L(11, -7, 1, 2, K.stripe); }
    L(2, -2, 13, 2, K.tail); L(14, -3, 3, 1, K.tail);
    if (K.stripe) { L(5, -2, 1, 2, K.stripe); L(9, -2, 1, 2, K.stripe); }
    if (s.up) {
      L(13, -7, 5, 3, K.base);
      outline(L, K, 12, -13, 8, 7);
      if (K.line) { L(11, -15, 1, 2, K.line); L(12, -16, 2, 1, K.line); L(18, -16, 2, 1, K.line); L(20, -15, 1, 2, K.line); }
      L(13, -6, 5, 1, K.base);
      L(12, -13, 8, 7, K.base);
      if (!s.ear) { L(12, -15, 2, 2, K.base); L(13, -14, 1, 1, K.inner); } else L(12, -14, 2, 1, K.base);
      L(18, -15, 2, 2, K.base); L(18, -14, 1, 1, K.inner);
      if (K.stripe) { L(15, -13, 2, 1, K.stripe); L(15, -12, 1, 1, K.stripe); }
      if (s.blink) { L(13, -10, 2, 1, K.closed); L(17, -10, 2, 1, K.closed); }
      else { L(13, -11, 2, 2, K.eyeOpen || K.eye); L(17, -11, 2, 2, K.eyeOpen || K.eye); L(14, -11, 1, 2, "#101010"); L(17, -11, 1, 2, "#101010"); }
      L(14, -8, 4, 2, K.chest); L(15, -8, 2, 1, F.nose);
    } else {
      outline(L, K, 12, -7, 8, 6);
      if (K.line) { L(11, -9, 1, 2, K.line); L(12, -10, 2, 1, K.line); L(18, -10, 2, 1, K.line); L(20, -9, 1, 2, K.line); }
      L(12, -7, 8, 6, K.base);
      if (!s.ear) { L(12, -9, 2, 2, K.base); L(13, -8, 1, 1, K.inner); } else L(12, -8, 2, 1, K.base);
      L(18, -9, 2, 2, K.base); L(18, -8, 1, 1, K.inner);
      if (K.stripe) { L(15, -7, 2, 1, K.stripe); L(15, -6, 1, 1, K.stripe); }
      L(13, -4, 2, 1, K.closed); L(17, -4, 2, 1, K.closed);
      L(14, -3, 4, 2, K.chest); L(15, -3, 2, 1, F.nose);
      L(10, -2, 3, 1, K.paw);
    }
  }
  function catSit(K, s, t) {
    const cx = s.x + 7, y = s.y;
    const sw = Math.round(Math.sin(t * 2.1) * 1.4);
    P(cx + 5, y - 3, 3, 3, K.tail); P(cx + 7 + sw, y - 7, 2, 5, K.tail); P(cx + 7 + sw, y - 8, 2, 1, K.tail);
    P(cx - 5, y - 12, 10, 1, K.base); P(cx - 6, y - 11, 12, 11, K.base);
    if (K.hi) P(cx - 5, y - 11, 2, 7, K.hi);
    P(cx - 2, y - 11, 4, 5, K.chest); P(cx - 1, y - 6, 2, 2, K.chest);
    P(cx - 4, y - 2, 3, 2, K.paw); P(cx + 1, y - 2, 3, 2, K.paw);
    P(cx - 5, y - 19, 10, 8, K.base); P(cx - 6, y - 16, 12, 4, K.base);
    P(cx - 5, y - 21, 3, 2, K.base); P(cx + 2, y - 21, 3, 2, K.base);
    P(cx - 4, y - 20, 1, 1, K.inner); P(cx + 3, y - 20, 1, 1, K.inner);
    if (s.blink) { P(cx - 3, y - 16, 2, 1, K.closed); P(cx + 1, y - 16, 2, 1, K.closed); }
    else {
      P(cx - 3, y - 17, 2, 2, K.eye); P(cx + 1, y - 17, 2, 2, K.eye);
      const l = s.look ? 1 : 0;
      P(cx - 3 + l, y - 17, 1, 2, "#101010"); P(cx + 1 + l, y - 17, 1, 2, "#101010");
    }
    if (K.tux) P(cx - 2, y - 14, 4, 2, K.chest);
    P(cx - 1, y - 15, 2, 1, F.nose);
  }
  function drawCat(name, s, t) {
    const K = CATS[name];
    if (s.pose === "walk") catWalk(K, s);
    else if (s.pose === "stretch") catStretch(K, s);
    else if (s.pose === "sit") catSit(K, s, t);
    else catCurl(K, s);
  }
  function zzz(x, y, t, seed) {
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.35 + i / 3 + seed) % 1;
      A(Math.sin(p * Math.PI) * 0.85);
      text(Math.round(x + p * 7 + i), Math.round(y - p * 16), "z", T.bright);
    }
    A(1);
  }

  // ---------- one frame
  function draw(s, t) {
    g.globalAlpha = 1;
    room(t);
    const cats = Object.entries(s.cats);
    cats.forEach(([n, c]) => c.layer === "sill" && drawCat(n, c, t));
    const th = s.thomas;
    chair(th && th.mode === "sit");
    if (th && th.mode === "sit") { thomasSit(th, t); thomasLegs(th.dy || 0); }
    cats.forEach(([n, c]) => c.layer === "chair" && drawCat(n, c, t));
    if (th && th.mode === "walk") thomasWalk(th.x, th.ph, th.dir || 1, th.mug, t);
    desk();
    deskItems(t, s.steam, s.mug !== "held", s.lamp);
    if (s.cable) cable(t, s.cable);
    monitor(s.screen, t);
    if (th && th.mode === "sit") thomasHands(th, t);
    cats.forEach(([n, c]) => c.layer !== "sill" && c.layer !== "chair" && drawCat(n, c, t));
    (s.zs || []).forEach(z => zzz(z[0], z[1], t, z[2]));
    if (s.bubble) bubble(CX + 14, 30, t);
    if (s.lamp !== 0) lampGlow(t);
    else { A(0.38); P(0, 0, W, H, "#070815"); A(1); lights(t); }
    out.drawImage(buf, 0, 0, W * S, H * S);
  }

  // ---------- working: typing code, cats keeping him company
  const SNIPPETS = [
    { code: ["def teach(t):", " ideas=read(t)", " for i in ideas:", "  say(i)", "  if lost():", "   draw(i)", " return qs"],
      out: ["> run teach.py", "", "ok  42 tests", "all good :)"] },
    { code: ["cats = 2", "while awake():", " code()", " if cats > 0:", "  pet(cats)", " coffee += 1", "# todo: sleep"],
      out: ["> run day.py", "", "cats: happy", "coffee: low"] },
    { code: ["const mug = {}", "mug.fill('tea')", "setTimeout(()=>", " sip(mug), 900)", "// or coffee?"],
      out: ["> node mug.js", "", "sip... ahh", "ok"] },
  ];
  const SCRIPT = (function () {
    const steps = [];
    let t = 0.4, seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    SNIPPETS.forEach((sn, si) => {
      sn.code.forEach((ln, li) => {
        for (let c = 0; c <= ln.length; c++) {
          steps.push({ t, si, li, c, mode: c === ln.length ? "pause" : "type" });
          t += c === ln.length ? 0.35 + rnd() * 0.5 : 0.07 + rnd() * 0.08;
        }
        if (li === 2) { steps.push({ t, si, li, c: ln.length, mode: "think" }); t += 1.6; }
      });
      steps.push({ t, si, li: sn.code.length - 1, c: Infinity, mode: "think" }); t += 1.2;
      steps.push({ t, si, mode: "run" }); t += 4.2;
    });
    return { steps, total: t };
  })();
  function scriptAt(t) {
    const tt = t % SCRIPT.total;
    let lo = 0, hi = SCRIPT.steps.length - 1;
    if (tt < SCRIPT.steps[0].t) return { step: { si: 0, li: 0, c: 0, mode: "pause" }, since: tt };
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (SCRIPT.steps[mid].t <= tt) lo = mid; else hi = mid - 1; }
    return { step: SCRIPT.steps[lo], since: tt - SCRIPT.steps[lo].t };
  }
  function codeLines(step) {
    const sn = SNIPPETS[step.si];
    if (step.mode === "run") return null;
    return sn.code.slice(0, step.li).concat([sn.code[step.li].slice(0, step.c)]);
  }

  const acts = {};
  acts.working = {
    init() {},
    update() {},
    pose(sim) {
      const t = sim.t, { step, since } = scriptAt(t);
      const sn = SNIPPETS[step.si];
      let screen, pose = "type", typing = false, lookUp = false, smile = false;
      if (step.mode === "run") {
        const shown = Math.min(sn.out.length, 1 + Math.floor(since / 0.5));
        screen = { on: true, lines: sn.out.slice(0, shown), plain: true, colour: T.good, cursor: false };
        pose = since < 2.2 ? "stretch" : "type";
        smile = since >= 2.2;
      } else {
        screen = { on: true, lines: codeLines(step), cursor: true };
        typing = step.mode === "type";
        lookUp = step.mode === "think";
      }
      const lookTimer = t % 13;
      return {
        thomas: { mode: "sit", pose, typing, lookUp, smile, blink: blinkAt(t, 3.7, 0.3), look: lookUp ? 1 : 0, dy: pose === "stretch" ? -(Math.floor(t * 4) % 2) : 0 },
        cats: {
          ginger: { layer: "sill", pose: "curl", x: 32, y: 86, dir: 1, breath: Math.sin(t * 1.6) > 0, ear: (t % 9) < 0.25 },
          black: { layer: "desk", pose: "sit", x: 142, y: 110, blink: blinkAt(t, 4.3, 1.1), look: lookTimer > 9 && lookTimer < 11.5 },
        },
        screen, steam: 1,
      };
    },
  };

  // ---------- away: he's gone, the cats walk across the keyboard and fall asleep on the desk
  const KEYROW = "asdfghjkl;'";
  function press(sim, ch) {
    const lines = sim.lines;
    if (lines[lines.length - 1].length >= 16) lines.push("");
    lines[lines.length - 1] += ch;
  }
  function keyUnder(x) { // x: centre of the cat
    if (x < 165 || x > 191) return null;
    return KEYROW[clamp(Math.floor((x - 165) / 26 * KEYROW.length), 0, KEYROW.length - 1)];
  }
  const AWAY_CODE = ["cats = 2", "while awake():", " code()", " if cats > 0:", "  "];
  function walkX(t, t0, t1, x0, x1) { return lerp(x0, x1, prog(t, t0, t1)); }
  function jump(t, t0, t1, x0, y0, x1, y1, h) {
    const p = prog(t, t0, t1);
    return { x: lerp(x0, x1, p), y: lerp(y0, y1, p) - Math.sin(p * Math.PI) * h };
  }
  const LEAVE = 6.4; // seconds of Thomas finding the mug empty and wandering off before the cats move
  function awayCats(t) {
    let black, ginger;
    if (t < LEAVE) return {
      black: { layer: "desk", pose: "sit", x: 142, y: 110, blink: blinkAt(t, 4, 0.5), look: t > 2.4 },
      ginger: { layer: "sill", pose: "curl", x: 32, y: 86, dir: 1, breath: Math.sin(t * 1.6) > 0, ear: t > 4.4 && t < 4.6 },
    };
    t -= LEAVE;
    if (t < 1.2) black = { pose: "sit", x: 142, y: 110, blink: blinkAt(t, 4, 0), look: t > 0.6 };
    else if (t < 3.6) black = { pose: "walk", x: walkX(t, 1.2, 3.6, 136, 190), y: 110, dir: 1, ph: t * 11 };
    else if (t < 3.8) black = { pose: "walk", x: 190, y: 110, dir: -1, ph: 0 };
    else if (t < 4.6) black = { pose: "walk", x: walkX(t, 3.8, 4.6, 190, 166), y: 110, dir: -1, ph: t * 11 };
    else black = { pose: "curl", x: 168, y: 110, dir: -1, up: t < 5.6, breath: Math.sin(t * 1.5) > 0, blink: t > 5.1, ear: t > 6 && (t % 7.3) < 0.25 };
    black.layer = "desk";

    if (t < 3.0) ginger = { layer: "sill", pose: "curl", x: 32, y: 86, dir: 1, breath: Math.sin(t * 1.6) > 0 };
    else if (t < 4.0) ginger = { layer: "sill", pose: "curl", x: 32, y: 86, dir: 1, up: true, blink: blinkAt(t, 1.5, 0) };
    else if (t < 5.0) ginger = { layer: "sill", pose: "stretch", x: 30, y: 86, dir: 1, ph: t, yawn: t > 4.4 && t < 4.9 };
    else if (t < 5.3) ginger = { layer: "sill", pose: "walk", x: 32, y: 86, dir: 1, ph: 0 };
    else if (t < 5.9) ginger = Object.assign({ layer: "front", pose: "walk", dir: 1, air: true }, jump(t, 5.3, 5.9, 36, 86, 58, 162, 8));
    else if (t < 8.2) ginger = { layer: "front", pose: "walk", x: walkX(t, 5.9, 8.2, 58, 200), y: 162, dir: 1, ph: t * 10 };
    else if (t < 8.4) ginger = { layer: "front", pose: "walk", x: 200, y: 162, dir: 1, ph: 0 };
    else if (t < 8.9) ginger = Object.assign({ layer: "front", pose: "walk", dir: -1, air: true }, jump(t, 8.4, 8.9, 200, 162, 196, 110, 16));
    else if (t < 9.4) ginger = { layer: "desk", pose: "walk", x: walkX(t, 8.9, 9.4, 196, 190), y: 110, dir: -1, ph: t * 10 };
    else ginger = { layer: "desk", pose: "curl", x: 190, y: 110, dir: -1, up: t < 10.3, breath: Math.sin(t * 1.3 + 1) > 0, blink: t > 9.9, ear: t > 11 && (t % 8.1) < 0.25 };
    return { black, ginger };
  }
  acts.away = {
    init(sim) { sim.lines = AWAY_CODE.slice(); sim.nextKey = 0; },
    update(sim) {
      const t = sim.t, cats = awayCats(t), b = cats.black;
      if (t >= sim.nextKey) {
        let ch = null;
        if (b.pose === "walk" && b.ph) ch = keyUnder(b.x + 12);
        else if (b.pose === "curl" && t < LEAVE + 7.5) ch = "l";
        if (ch) { press(sim, ch); sim.nextKey = t + (b.pose === "curl" ? 0.06 : 0.09); }
      }
    },
    pose(sim) {
      const t = sim.t, cats = awayCats(t);
      const zs = [];
      if (t > LEAVE + 6.5) zs.push([168, 98, 0]);
      if (t > LEAVE + 11) zs.push([206, 98, 0.5]);
      let thomas = null, mug = "desk";
      if (t < 1.2) thomas = { mode: "sit", pose: "type", typing: true, blink: blinkAt(t, 3.7, 0.3) };
      else if (t < 1.7) thomas = { mode: "sit", pose: "reach", look: 0, blink: false };
      else if (t < 2.5) { thomas = { mode: "sit", pose: "sip", blink: true }; mug = "held"; }
      else if (t < 3.9) { thomas = { mode: "sit", pose: "peer", lookUp: true, blink: blinkAt(t, 1.3, 0.2) }; mug = "held"; }
      else if (t < 4.3) { thomas = { mode: "sit", pose: "peer", lookUp: true, dy: lerp(0, -12, ease(prog(t, 3.9, 4.3))) }; mug = "held"; }
      else if (t < LEAVE) { thomas = { mode: "walk", dir: -1, x: walkX(t, 4.3, LEAVE, CX, -24), ph: t * 7.5, mug: "empty" }; mug = "held"; }
      else mug = "held";
      return {
        thomas, cats, mug, bubble: t > 2.7 && t < 4.6,
        screen: { on: t < LEAVE + 18, lines: sim.lines, cursor: true, plain: false },
        steam: mug === "desk" ? 1 : 0, zs,
      };
    },
  };

  // ---------- back: the cats wake, stretch and wander off; Thomas walks in, tidies up and waves
  function backCats(t) {
    let black, ginger;
    if (t < 1.6) black = { pose: "curl", x: 168, y: 110, dir: -1, up: t > 0.5, blink: t < 0.5 || blinkAt(t, 1.2, 0), breath: Math.sin(t * 1.5) > 0, ear: t > 0.25 && t < 0.45 };
    else if (t < 2.5) black = { pose: "stretch", x: 162, y: 110, dir: 1, ph: t, yawn: t > 1.9 && t < 2.4 };
    else if (t < 4.2) black = { pose: "walk", x: walkX(t, 2.5, 4.2, 162, 270), y: 110, dir: 1, ph: t * 11 };
    else if (t < 4.6) black = Object.assign({ pose: "walk", dir: 1, air: true }, jump(t, 4.2, 4.6, 272, 110, 292, 162, 6));
    else black = { pose: "walk", x: walkX(t, 4.6, 5.3, 292, 340), y: 162, dir: 1, ph: t * 11 };
    black.layer = black.y > 140 || black.air ? "front" : "desk";

    if (t < 1.0) ginger = { pose: "curl", x: 190, y: 110, dir: -1, up: t > 0.8, breath: Math.sin(t * 1.3 + 1) > 0 };
    else if (t < 1.9) ginger = { pose: "stretch", x: 188, y: 110, dir: 1, ph: t, yawn: t > 1.3 && t < 1.8 };
    else if (t < 3.4) ginger = { pose: "walk", x: walkX(t, 1.9, 3.4, 188, 270), y: 110, dir: 1, ph: t * 10 };
    else if (t < 3.8) ginger = Object.assign({ pose: "walk", dir: 1, air: true }, jump(t, 3.4, 3.8, 272, 110, 292, 162, 6));
    else ginger = { pose: "walk", x: walkX(t, 3.8, 4.5, 292, 340), y: 162, dir: 1, ph: t * 10 };
    ginger.layer = ginger.y > 140 || ginger.air ? "front" : "desk";
    return { black, ginger };
  }
  acts.back = {
    init(sim) {
      // Replay the away scene quietly so the screen holds what the cats typed.
      const ghost = { t: 0 };
      acts.away.init(ghost);
      while (ghost.t < LEAVE + 12) { ghost.t += STEP; acts.away.update(ghost); }
      sim.lines = ghost.lines;
      sim.awake = false; sim.nextKey = 0;
    },
    update(sim) {
      const t = sim.t, cats = backCats(t);
      if (t >= sim.nextKey) {
        const b = cats.black;
        let ch = null;
        if (b.pose === "stretch" && t > 1.7 && t < 2.4) ch = "d";
        else if (b.pose === "walk" && b.y === 110) ch = keyUnder(b.x + 12);
        if (ch) { press(sim, ch); sim.awake = true; sim.nextKey = t + 0.08; }
      }
      if (t > 7.2 && t < 8.0) {
        // Thomas deletes what the cats typed, back to his own code
        const target = AWAY_CODE.join("\n"), now = sim.lines.join("\n");
        if (now.length > target.length) {
          const per = Math.ceil((now.length - target.length) * STEP / Math.max(STEP, 7.9 - t));
          const keep = now.slice(0, Math.max(target.length, now.length - per));
          sim.lines = keep.split("\n");
        }
      }
    },
    pose(sim) {
      const t = sim.t;
      let thomas = null;
      if (t > 4.6 && t < 6.8) thomas = { mode: "walk", x: walkX(t, 4.6, 6.8, -16, CX), ph: t * 7.5, mug: "full" };
      else if (t >= 6.8) {
        const sit = ease(prog(t, 6.8, 7.2));
        const pose = t > 8.0 && t < 9.6 ? "wave" : "type";
        thomas = { mode: "sit", dy: lerp(-12, 0, sit), pose, typing: t > 7.2 && t < 8.0, smile: t > 7.9, blink: blinkAt(t, 3.1, 0.4) };
      }
      return {
        thomas, cats: backCats(t),
        screen: { on: sim.awake, lines: sim.lines, cursor: true },
        mug: t < 6.9 ? "held" : "desk", steam: 1, zs: t < 0.6 ? [[168, 98, 0], [206, 98, 0.5]] : [],
      };
    },
  };

  // ---------- outro: a wave goodbye, shut down, lamp off; the ginger cat takes the warm chair
  const OUTRO_TEXT = ["", "> bye for now!", "> logout"];
  acts.outro = {
    init() {},
    update() {},
    pose(sim) {
      const t = sim.t;
      let thomas = null;
      if (t < 3.2) thomas = { mode: "sit", pose: "wave", smile: true, blink: blinkAt(t, 3, 0.5) };
      else if (t < 4.8) thomas = { mode: "sit", pose: "type", typing: t < 4.4, smile: true, blink: blinkAt(t, 3, 0.5) };
      else if (t < 5.2) thomas = { mode: "sit", pose: "type", smile: true, dy: lerp(0, -12, ease(prog(t, 4.8, 5.2))) };
      else if (t < 6.4) thomas = { mode: "walk", dir: -1, x: walkX(t, 5.2, 6.4, CX, 112), ph: t * 7.5 };
      else if (t < 6.9) thomas = { mode: "walk", dir: -1, x: 112, ph: 0 };
      else if (t < 8.0) thomas = { mode: "walk", dir: -1, x: walkX(t, 6.9, 8.0, 112, -24), ph: t * 7.5 };
      const typed = Math.floor(prog(t, 3.3, 4.4) * 24);
      const lines = ["cats = 2", OUTRO_TEXT[1].slice(0, typed), typed > 14 ? OUTRO_TEXT[2].slice(0, typed - 14) : ""].filter((l, i) => i < 2 || l);

      let ginger, black;
      if (t < 8.5) ginger = { layer: "sill", pose: "curl", x: 32, y: 86, dir: 1, breath: Math.sin(t * 1.6) > 0 };
      else if (t < 9.3) ginger = { layer: "sill", pose: "curl", x: 32, y: 86, dir: 1, up: true, blink: blinkAt(t, 1.4, 0) };
      else if (t < 9.8) ginger = Object.assign({ layer: "front", pose: "walk", dir: 1, air: true }, jump(t, 9.3, 9.8, 36, 86, 58, 162, 8));
      else if (t < 11.4) ginger = { layer: "front", pose: "walk", x: walkX(t, 9.8, 11.4, 58, 150), y: 162, dir: 1, ph: t * 10 };
      else if (t < 11.9) ginger = Object.assign({ layer: "front", pose: "walk", dir: 1, air: true }, jump(t, 11.4, 11.9, 150, 162, 166, 112, 14));
      else ginger = { layer: "chair", pose: "curl", x: 168, y: 112, dir: -1, up: t < 12.8, blink: t > 12.4, breath: Math.sin(t * 1.3) > 0, ear: t > 14 && (t % 7.7) < 0.25 };
      if (t < 9.6) black = { layer: "desk", pose: "sit", x: 142, y: 110, blink: blinkAt(t, 4, 0.2), look: t > 4.8 && t < 8 };
      else black = { layer: "desk", pose: "curl", x: 136, y: 110, dir: 1, up: t < 10.6, blink: t > 10.1, breath: Math.sin(t * 1.5) > 0, ear: t > 12 && (t % 6.9) < 0.25 };
      const zs = [];
      if (t > 11.5) zs.push([150, 98, 0.2]);
      if (t > 13.5) zs.push([176, 100, 0.6]);
      return {
        thomas, cats: { ginger, black }, lamp: t < 6.7 ? 1 : 0,
        screen: { on: t < 4.6, lines, cursor: true, plain: true, colour: T.good },
        steam: t < 6 ? 1 : clamp(1 - (t - 6) / 20, 0, 1), zs,
      };
    },
  };

  // ---------- technical difficulties: a cat on the keyboard, the other one chewing the cable
  acts.difficulties = {
    init() {},
    update() {},
    pose(sim) {
      const t = sim.t, loop = t % 10;
      const pose = loop < 2.6 || loop > 7.4 ? "type" : "scratch";
      const err = ["ERROR 418", "", "CAT ON KEYBOARD", "CABLE: CHEWED", "", Math.floor(t * 2) % 2 ? "PLEASE STAND BY" : ""];
      return {
        thomas: { mode: "sit", pose, typing: pose === "type", lookUp: pose === "scratch", blink: blinkAt(t, 2.9, 0.4) },
        cats: {
          black: { layer: "desk", pose: "sit", x: 171, y: 108, blink: blinkAt(t, 3.6, 1.0), look: Math.floor(t / 2.3) % 2 === 0 },
          ginger: { layer: "front", pose: "stretch", x: 238, y: 162, dir: 1, ph: t, yawn: Math.sin(t * 9) > 0 },
        },
        cable: true,
        screen: { on: true, lines: err, cursor: false, plain: true, colour: T.bad },
        steam: 1,
      };
    },
  };

  // ---------- run
  let act = acts[ACT] || acts.working;
  let sim = { t: 0 };
  act.init(sim);
  function advance(to) { while (sim.t + STEP <= to) { sim.t += STEP; act.update(sim); } }
  if (FROZEN !== null) { advance(FROZEN); draw(act.pose(sim), sim.t); return; }
  let start = performance.now();
  let last = -1;
  // Switch to another act without reloading, so a scene change in OBS doesn't flash.
  window.roomSetAct = function (name) {
    if (!acts[name] || acts[name] === act) return;
    act = acts[name]; sim = { t: 0 }; act.init(sim); start = performance.now(); last = -1;
  };
  // Only animate while the canvas is on screen; the story resumes where it left off.
  let visible = true, pausedAt = null;
  if ("IntersectionObserver" in window) new IntersectionObserver(es => {
    visible = es[0].isIntersecting;
    if (!visible) pausedAt = performance.now();
    else if (pausedAt !== null) { start += performance.now() - pausedAt; pausedAt = null; }
  }).observe(view);
  (function loop() {
    if (visible) {
      advance((performance.now() - start) / 1000);
      if (sim.t !== last) { last = sim.t; draw(act.pose(sim), sim.t); }
    }
    requestAnimationFrame(loop);
  })();
})();
