/* Prince 365 vintage movie-palace curtain intro: canvas crimson velvet with spring-physics folds. Shown once per session. */
(() => {
  'use strict';
  const KEY = 'p365_curtain_seen';
  try { if (sessionStorage.getItem(KEY)) return; } catch {}
  if (/[?&]nocurtain\b/.test(location.search)) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ov = document.createElement('div'); ov.className = 'curtain'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Prince 365: tap to enter');
  const cv = document.createElement('canvas'); cv.className = 'curtain-cv'; cv.setAttribute('aria-hidden', 'true');
  const logo = document.createElement('button'); logo.type = 'button'; logo.className = 'curtain-logo'; logo.setAttribute('aria-label', 'Enter the Prince 365 site');
  const img = new Image(); img.src = 'assets/p365-studios-logo.png';   // drawn onto the fabric, not shown as an element
  const hit = document.createElement('span'); hit.className = 'curtain-hit';
  const hint = document.createElement('span'); hint.className = 'curtain-hint'; hint.textContent = 'Tap to enter';
  logo.append(hit, hint);
  const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'curtain-skip'; skip.textContent = 'Skip intro';
  ov.append(cv, logo, skip); document.body.append(ov);
  document.documentElement.classList.add('curtain-lock');
  const ctx = cv.getContext('2d');

  /* ---- spring field: per-half fold columns ---- */
  const N = 36;                                   // folds per half
  const mk = () => ({ x: new Float32Array(N), v: new Float32Array(N) });
  const halves = [mk(), mk()];
  let W = 0, H = 0, DPR = 1;
  function size() { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  size(); addEventListener('resize', size);

  let holdAt = null, still = false, open = 0, opening = false, t0 = 0, last = performance.now(), ptr = null, idle = 0;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;


  // cloth ripple: push folds near the pointer away from it, scaled by pointer speed; springs + coupling spread it outward
  function poke(px, py, vx, vy = 0) {
    const R = Math.max(70, W * 0.14), sp = Math.min(60, Math.hypot(vx, vy)), depth = 0.6 + (py / H) * 0.7;
    for (let s = 0; s < 2; s++) {
      const x0 = s === 0 ? 0 : W / 2, fw = (W / 2) / N, h = halves[s];
      for (let i = 0; i < N; i++) {
        const cx = x0 + (i + .5) * fw, d = Math.abs(cx - px);
        if (d < R) { const f = Math.pow(1 - d / R, 1.5); h.v[i] += (vx * 5 + (cx < px ? -1 : 1) * (40 + sp * 6)) * f * depth; }
      }
    }
  }

  function step(dt) {
    const k = 55, damp = 4.2, couple = 46;
    for (const h of halves) for (let i = 0; i < N; i++) {
      const l = i ? h.x[i - 1] : 0, r = i < N - 1 ? h.x[i + 1] : 0;
      const a = -k * h.x[i] - damp * h.v[i] + couple * (l + r - 2 * h.x[i]);
      h.v[i] += a * dt; h.x[i] += h.v[i] * dt; h.x[i] = Math.max(-30, Math.min(30, h.x[i])); h.v[i] = Math.max(-520, Math.min(520, h.v[i]));
    }
    idle += dt;                                  // gentle ambient sway
    if (!reduce && !still) { const j = Math.floor(idle * 1.3) % N, f = Math.sin(idle * 2.1) * 0.04; halves[0].v[j] += f; halves[1].v[N - 1 - j] -= f; }
  }

  /* ---- vintage movie-palace look: crimson velvet travelers, swagged valance, tied-back legs, gilded proscenium ---- */
  const TOPF = () => Math.min(116, Math.max(70, H * 0.13));
  const FR = () => (W < 600 ? 7 : 12);                         // proscenium frame thickness
  const mkPat = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return ctx.createPattern(c, 'repeat'); };
  const nap = mkPat(64, 64, (c, w, h) => { const d = c.createImageData(w, h); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 40; } c.putImageData(d, 0, 0); });
  const velvet = (g, lit, dk) => {   // crimson velvet fold: shadow, body, soft sheen, body, shadow
    const k = 1 - dk;
    g.addColorStop(0, `rgb(${26 * k | 0},0,${5 * k | 0})`);
    g.addColorStop(0.24, `rgb(${(96 + 20 * lit) * k | 0},${6 * k | 0},${16 * k | 0})`);
    g.addColorStop(0.5, `rgb(${(170 + 45 * lit) * k | 0},${(26 + 18 * lit) * k | 0},${(40 + 14 * lit) * k | 0})`);
    g.addColorStop(0.64, `rgb(${(128 + 20 * lit) * k | 0},${12 * k | 0},${24 * k | 0})`);
    g.addColorStop(1, `rgb(${22 * k | 0},0,${5 * k | 0})`);
    return g;
  };
  // broad, glossy satin-velvet folds: continuous shading across the panel (k+0.5 folds so the meeting edge is a dark fold)
  const FOLDS = () => (W < 600 ? 3.5 : W < 1100 ? 5.5 : 6.5);
  const foldRGB = (u, F, sw, dk) => {
    const c = Math.cos(2 * Math.PI * F * u + sw * 0.04), d = 0.5 + 0.5 * c, sp = Math.pow(d, 10), k = 1 - dk;
    return `rgb(${Math.min(255, (34 + 178 * Math.pow(d, .8) + 70 * sp) * k) | 0},${(2 + 14 * d + 70 * sp) * k | 0},${(8 + 22 * d + 60 * sp) * k | 0})`;
  };
  const foldGrad = (xa, xb, u0, u1, F, sw, dk) => { const g = ctx.createLinearGradient(xa, 0, xb, 0); for (let j = 0; j <= 4; j++) g.addColorStop(j / 4, foldRGB(u0 + (u1 - u0) * j / 4, F, sw, dk)); return g; };
  const goldH = (x0, x1) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#7a5410'); g.addColorStop(.5, '#ffe08a'); g.addColorStop(1, '#7a5410'); return g; };
  const goldV = (y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#5c3d06'); g.addColorStop(.35, '#ffe39a'); g.addColorStop(.6, '#c9971f'); g.addColorStop(1, '#5c3d06'); return g; };
  function tassel(x, y, sc) {
    ctx.fillStyle = goldV(y - 4 * sc, y + 4 * sc); ctx.beginPath(); ctx.arc(x, y, 4 * sc, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + 9 * sc, 4.5 * sc, 6 * sc, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d8a93a'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = -5; k <= 5; k++) { ctx.moveTo(x + k * .8 * sc, y + 13 * sc); ctx.lineTo(x + k * 1.25 * sc, y + 28 * sc); }
    ctx.stroke(); ctx.fillStyle = '#8a6410'; ctx.fillRect(x - 5 * sc, y + 13 * sc, 10 * sc, 2 * sc);
  }
  // panel geometry (left-half coords, outer edge at x=0): folds bunch toward the side; the hem trails the top while travelling
  const geo = () => { const e = ease(open), hw = W / 2; return { e, hw, w: hw * (1 - 0.8 * e), L: hw * 0.12 * Math.sin(Math.PI * e) }; };
  const xAt = (u, yy, sw, G) => u * (G.w + G.L * yy * yy) + sw * (0.6 + 0.4 * yy);

  function drawHalf(s, logoPass) {
    // the right half is an exact mirror (transform) fed mirrored sway values, so at rest both halves are symmetric
    const hp = halves[s], G = geo(), e = G.e, M = s === 1;
    const hx = s === 0 ? hp.x : Float32Array.from({ length: N }, (_, i) => -hp.x[N - 1 - i]);
    const top = TOPF() - 8, hem = H - 24, span = hem - top, Y = yy => top + yy * span;
    const mirror = () => { if (M) { ctx.translate(W, 0); ctx.scale(-1, 1); } };
    const edge = (u, sw, path, down) => {           // quadratic edge from top to hem (or reverse)
      const a = xAt(u, 0, sw, G), c = u * G.w + 0.8 * sw, b = xAt(u, 1, sw, G);
      if (down) path.quadraticCurveTo(c, Y(.5), b, hem); else path.quadraticCurveTo(c, Y(.5), a, top);
      return [a, b];
    };
    const out = new Path2D(); const sIn = hx[N - 1];
    out.moveTo(-6, top); out.lineTo(xAt(1, 0, sIn, G) + .5, top); edge(1, sIn, out, true); out.lineTo(-6, hem); out.closePath();
    if (logoPass) {
    // logo drawn last (above texture, shading and the seam), clipped to this panel once it starts opening
    ctx.save(); mirror(); if (open > 0.01) ctx.clip(out); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const { L: LL, y: ly } = logoBox(), t = Math.max(0, Math.min(1, (ly + LL / 2 - top) / span)), wl = G.w + G.L * t * t;
    drawLogo(s, M ? W - wl : 0, wl, t); ctx.restore();
      return;
    }
    ctx.save(); mirror();
    ctx.fillStyle = '#1a0206'; ctx.fill(out);
    const bs = j => j <= 0 ? hx[0] : j >= N ? hx[N - 1] : (hx[j - 1] + hx[j]) / 2;   // shared fold edges: no gaps while rippling
    for (let i = 0; i < N; i++) {
      const sw = hx[i], s0 = bs(i), s1 = bs(i + 1), u0 = i / N, u1 = (i + 1) / N;
      const xa = xAt(u0, .5, s0, G), xb = xAt(u1, .5, s1, G) + 1;
      ctx.fillStyle = foldGrad(xa, xb, u0, u1, FOLDS(), sw, 0.18 * e);
      const p = new Path2D(); p.moveTo(xAt(u0, 0, s0, G), top); p.lineTo(xAt(u1, 0, s1, G) + 1, top);
      const c1 = u1 * G.w + 0.8 * s1 + 1; p.quadraticCurveTo(c1, Y(.5), xAt(u1, 1, s1, G) + 1, hem); p.lineTo(xAt(u0, 1, s0, G), hem);
      p.quadraticCurveTo(u0 * G.w + 0.8 * s0, Y(.5), xAt(u0, 0, s0, G), top); ctx.fill(p);
    }
    ctx.save(); ctx.clip(out);
    const sh = ctx.createLinearGradient(0, top, 0, hem); sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(.12, 'rgba(0,0,0,0)'); sh.addColorStop(.7, 'rgba(0,0,0,.05)'); sh.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = sh; ctx.fillRect(-6, top, W, span);
    ctx.globalAlpha = .18; ctx.fillStyle = nap; ctx.fillRect(-6, top, W, span); ctx.globalAlpha = 1;
    ctx.restore(); ctx.restore();
    // leading edge: a soft dark fold, no gold line through the logo
    ctx.save(); mirror();
    const ie = new Path2D(); ie.moveTo(xAt(1, 0, sIn, G) - 2, top); edge(1, sIn, ie, true);
    ctx.lineCap = 'round'; ctx.translate(-3, 0); ctx.strokeStyle = 'rgba(10,0,2,.35)'; ctx.lineWidth = 8; ctx.stroke(ie); ctx.strokeStyle = 'rgba(10,0,2,.6)'; ctx.lineWidth = 3; ctx.stroke(ie); ctx.translate(3, 0);
    const xr = xAt(1, 1, sIn, G);
    // hem: two gold bands with cream fringe
    ctx.fillStyle = goldV(hem - 30, hem - 24); ctx.fillRect(-6, hem - 30, xr + 4, 6);
    ctx.fillStyle = goldV(hem, hem + 8); ctx.fillRect(-6, hem, xr + 4, 8);
    ctx.fillStyle = 'rgba(255,240,200,.35)'; ctx.fillRect(-6, hem + 2, xr + 4, 1.5);
    ctx.lineWidth = 1.6;
    for (let k = 0, x = xr - 3; x > -4; k++, x -= 3) {
      const i = Math.max(0, Math.min(N - 1, Math.floor(x / (xr / N)))), dx = hx[i] * 0.3;
      ctx.strokeStyle = k % 3 ? '#f1dfae' : '#c9a24a'; ctx.beginPath(); ctx.moveTo(x, hem + 8); ctx.lineTo(x + dx, H - (k % 2 ? 1 : 4)); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---- logo printed on the velvet: sliced per fold, follows sway + bunching ---- */
  const logoBox = () => { const L = Math.min(W * 0.46, 240, H * 0.4); return { L, x: W / 2 - L / 2, y: H * 0.52 - L / 2 - 20 }; };
  function drawLogo(s, x0, width, t) {
    if (!img.complete || !img.naturalWidth) return;
    const h = halves[s], hw = W / 2, { L, x: lx, y: ly } = logoBox(), sc = width / hw, rest0 = s ? hw : 0, rfw = hw / N, k = img.naturalWidth / L;
    const a = Math.max(rest0, lx), b = Math.min(rest0 + hw, lx + L); if (b <= a) return;
    // average sway of the folds under this half of the logo -> the logo moves as one piece (no slicing, no stripes)
    let sum = 0, n = 0; for (let i = 0; i < N; i++) { const c = rest0 + (i + .5) * rfw; if (c >= a && c <= b) { sum += h.x[i]; n++; } }
    const sway = n ? sum / n : 0, dx = x0 + (a - rest0) * sc + sway * (0.6 + 0.4 * t), dw = (b - a) * sc;
    const cxp = x0 + (lx + L / 2 - rest0) * sc + sway * .8, hg = ctx.createRadialGradient(cxp, ly + L / 2, L * .45, cxp, ly + L / 2, L * .75);
    hg.addColorStop(0, 'rgba(12,0,6,.5)'); hg.addColorStop(1, 'rgba(12,0,6,0)'); ctx.fillStyle = hg;
    const cut = open > 0.01 ? (s ? dx : dx + dw) : Math.round(W / 2), hx0 = s ? cut : cxp - L, hx1 = s ? cxp + L : cut;   // each half shades only its own side
    ctx.fillRect(hx0, ly - L * .3, hx1 - hx0, L * 1.6);
    // printed-on-velvet warp: logo drawn as 2-device-px strips, each shifted by the fold displacement interpolated at its x.
    // integer device-pixel destinations + 1px overlap => no gaps or seams; at rest every strip lands 1:1 (pixel-identical to a flat draw)
    const D = Math.round(L * DPR);
    if (offKey !== D || !offReady) { off.width = off.height = D; oc.clearRect(0, 0, D, D); oc.imageSmoothingQuality = 'high'; oc.drawImage(img, 0, 0, D, D); offKey = D; offReady = true; }
    const amp = 0.6 + 0.4 * t;
    const cv = (halves[0].x[N - 1] + halves[1].x[0]) / 2;   // shared value at the centre so the two halves meet with no gap
    const disp = xr => { const f = (xr - rest0) / rfw - .5;
      if (!s && f > N - 1) return (h.x[N - 1] + (cv - h.x[N - 1]) * Math.min(1, (f - (N - 1)) / .5)) * amp;
      if (s && f < 0) return (cv + (h.x[0] - cv) * Math.max(0, (f + .5) / .5)) * amp;
      const i = Math.floor(f), r = f - i, i0 = Math.max(0, Math.min(N - 1, i)), i1 = Math.max(0, Math.min(N - 1, i + 1)); return (h.x[i0] * (1 - r) + h.x[i1] * r) * amp; };
    const map = xr => (x0 + (xr - rest0) * sc + disp(xr)) * DPR;      // physical device px
    const sA = Math.round((a - lx) * DPR), sB = Math.round((b - lx) * DPR), xrOf = sx => lx + sx / DPR;
    const origin = Math.round(map(xrOf(sA))) - MARG, wcw = Math.ceil((sB - sA) * Math.max(sc, .05)) + 2 * MARG;
    if (wc.width < wcw) wc.width = wcw; if (wc.height !== D) wc.height = D;
    wx.setTransform(1, 0, 0, 1, 0, 0); wx.globalCompositeOperation = 'source-over'; wx.clearRect(0, 0, wc.width, D); wx.imageSmoothingEnabled = true;
    let prev = Math.round(map(xrOf(sA))) - origin;
    for (let sx = sA; sx < sB; sx += 2) {
      const sw = Math.min(2, sB - sx), nx = Math.round(map(xrOf(sx + sw))) - origin;
      wx.drawImage(off, sx, 0, Math.min(sw + (sx + sw < sB ? 1 : 0), D - sx), D,   // never sample past this half's edge (logo centre): no shared columns between halves
         prev, 0, Math.max(1, nx - prev) + 1, D);
      prev = nx;
    }
    // smooth fold shading (one continuous gradient across the half, not per strip)
    if (!reduce) {
      const g = wx.createLinearGradient(0, 0, wcw, 0); let last = 0, any = false;
      for (let i = 0; i < N; i++) {
        const c = rest0 + (i + .5) * rfw; if (c < a - rfw || c > b + rfw) continue;
        const pos = Math.max(last, Math.min(1, Math.max(0, (map(c) - origin) / wcw))); last = pos;
        const sl = (h.x[Math.min(N - 1, i + 1)] - h.x[Math.max(0, i - 1)]) * (s ? -1 : 1), al = Math.max(-.2, Math.min(.2, sl * .018));
        g.addColorStop(pos, al >= 0 ? `rgba(255,232,200,${al})` : `rgba(18,0,12,${-al * 1.4})`); any = true;
      }
      if (any) { wx.globalCompositeOperation = 'source-atop'; wx.fillStyle = g; wx.fillRect(0, 0, wcw, D); wx.globalCompositeOperation = 'source-over'; }
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(wc, 0, 0, wcw, D, origin, Math.round(ly * DPR), wcw, D); ctx.restore();
  }
  const off = document.createElement('canvas'), oc = off.getContext('2d'), wc = document.createElement('canvas'), wx = wc.getContext('2d'), MARG = 80;
  let offKey = 0, offReady = false;

  // static side "leg" drapes, gathered by gold rope tiebacks
  function drawLeg(s) {
    const top = TOPF() - 10, Ls = Math.max(24, Math.min(W * 0.075, 104)), yT = H * 0.6, n = 10, cw = COLW();
    const prof = y => y < yT ? Ls * (1.5 - 0.95 * Math.pow((y - top) / (yT - top), 1.6)) : Ls * (0.55 + 0.7 * Math.pow((y - yT) / (H - yT), .8));
    ctx.save(); if (s) { ctx.translate(W, 0); ctx.scale(-1, 1); } ctx.translate(cw, 0);
    const ys = []; for (let y = top; y <= H; y += (H - top) / 28) ys.push(y); ys.push(H);
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      ctx.fillStyle = foldGrad(u0 * Ls * .9, u1 * Ls * .9 + 1, u0, u1, 1.5, 0, -.05);
      ctx.beginPath(); ys.forEach((y, j) => { const x = u0 * prof(y) - (i ? 0 : 6); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      for (let j = ys.length - 1; j >= 0; j--) ctx.lineTo(u1 * prof(ys[j]) + 1, ys[j]); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(10,0,2,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ys.forEach((y, j) => { const x = prof(y); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    // rope tieback + tassel
    const xw = Ls * 0.55 + 3;
    for (const [lw, c] of [[10, '#4a2c04'], [7.5, '#d9a52c'], [2.5, '#ffe7a3']]) { ctx.lineWidth = lw; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(-4, yT - 10); ctx.quadraticCurveTo(xw * .6, yT + 10, xw, yT); ctx.stroke(); }
    tassel(xw, yT + 2, W < 600 ? 1.2 : 1.8);
    ctx.restore();
  }

  function drawValance() {
    const F = FR(), top = TOPF(), sw = Math.min(20, top * 0.2), n = Math.max(3, Math.round(W / 240)), ww = W / n, base = top - sw;
    const shape = new Path2D(); shape.moveTo(0, F); shape.lineTo(W, F); shape.lineTo(W, base);
    for (let i = n - 1; i >= 0; i--) shape.quadraticCurveTo(i * ww + ww / 2, top + sw, i * ww, base);
    shape.closePath();
    const g = ctx.createLinearGradient(0, F, 0, top + sw); g.addColorStop(0, '#3a0008'); g.addColorStop(.5, '#b3121f'); g.addColorStop(.8, '#d8243a'); g.addColorStop(1, '#7a0a16');
    ctx.fillStyle = g; ctx.fill(shape);
    ctx.save(); ctx.clip(shape);
    ctx.globalAlpha = .2; ctx.fillStyle = nap; ctx.fillRect(0, F, W, top + sw); ctx.globalAlpha = 1;
    for (let i = 0; i < n; i++) for (let k = 1; k <= 3; k++) {       // gathered swag folds
      const dy = k * (base - F) / 4.2;
      ctx.strokeStyle = 'rgba(20,0,4,.45)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(i * ww, base - dy); ctx.quadraticCurveTo(i * ww + ww / 2, top + sw - dy * 1.1, (i + 1) * ww, base - dy); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,110,100,.22)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(i * ww, base - dy - 6); ctx.quadraticCurveTo(i * ww + ww / 2, top + sw - dy * 1.1 - 6, (i + 1) * ww, base - dy - 6); ctx.stroke();
    }
    ctx.restore();
    // gold braid + fringe on the scalloped edge
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x0 = i * ww, cx = x0 + ww / 2, x1 = x0 + ww;
      for (const [lw, c] of [[7, '#5a3d0a'], [5, '#e6cf8f'], [1.6, '#fff4d2']]) { ctx.lineWidth = lw; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(x0, base); ctx.quadraticCurveTo(cx, top + sw, x1, base); ctx.stroke(); }
      ctx.lineWidth = 1.3;
      for (let t = 0.02; t < 1; t += 3 / ww) {
        const x = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * cx + t * t * x1, y = (1 - t) * (1 - t) * base + 2 * t * (1 - t) * (top + sw) + t * t * base;
        ctx.strokeStyle = (t * ww / 3 | 0) % 3 ? '#f1dfae' : '#b8913f'; const hs = x < W / 2 ? 0 : 1, fi = Math.max(0, Math.min(N - 1, ((x - hs * W / 2) / (W / 2) * N) | 0)), fs = halves[hs].x[fi] * .35; ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + fs, y + 16); ctx.stroke();
      }
    }
    for (let i = 0; i <= n; i++) tassel(Math.min(W - 8, Math.max(8, i * ww)), base + 1, W < 600 ? .85 : 1.1);
    ctx.fillStyle = goldV(F, F + 7); ctx.fillRect(0, F, W, 7);
  }

  const COLW = () => (W >= 900 ? Math.min(54, W * .04) : W >= 600 ? 18 : 0);
  function drawColumns() {           // cream/gold fluted columns with warm sconces (slim/absent on phones)
    const cw = COLW(), F = FR();
    for (const s of [0, 1]) {
      ctx.save(); if (s) { ctx.translate(W, 0); ctx.scale(-1, 1); }
      if (cw) {
        const x = F - 1, g = ctx.createLinearGradient(x, 0, x + cw, 0);
        g.addColorStop(0, '#6b5428'); g.addColorStop(.2, '#f4e6c2'); g.addColorStop(.45, '#d8c08a'); g.addColorStop(.7, '#fff6dc'); g.addColorStop(1, '#7a5f2c');
        ctx.fillStyle = g; ctx.fillRect(x, 0, cw, H);
        ctx.strokeStyle = 'rgba(90,60,20,.35)'; ctx.lineWidth = 1.2; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x + cw * k / 5, TOPF() + 30); ctx.lineTo(x + cw * k / 5, H - 40); ctx.stroke(); }
        ctx.fillStyle = goldV(TOPF() + 6, TOPF() + 30); ctx.fillRect(x - 3, TOPF() + 6, cw + 6, 24); ctx.fillRect(x - 3, H - 40, cw + 6, 28);
      }
      // sconce glow
      const lx = F + Math.max(cw, 10) / 2 + (cw ? 0 : 6), ly = H * .4, r = W < 600 ? 70 : 150;
      const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, r); lg.addColorStop(0, 'rgba(255,214,140,.8)'); lg.addColorStop(.25, 'rgba(255,170,90,.3)'); lg.addColorStop(1, 'rgba(255,150,80,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff1c8'; ctx.beginPath(); ctx.ellipse(lx, ly, W < 600 ? 3 : 5, W < 600 ? 5 : 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = goldV(ly + 6, ly + 16); ctx.fillRect(lx - (W < 600 ? 4 : 7), ly + 6, W < 600 ? 8 : 14, 4);
      ctx.restore();
    }
    // soft chandelier glow at top centre
    const cy = TOPF() * .55, R = Math.min(W, H) * (W < 600 ? .35 : .22);
    const cg = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, R); cg.addColorStop(0, 'rgba(255,230,170,.35)'); cg.addColorStop(.3, 'rgba(255,200,120,.12)'); cg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = cg; ctx.fillRect(W / 2 - R, 0, R * 2, cy + R);
    ctx.fillStyle = 'rgba(255,240,200,.9)'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(W / 2 + k * (W < 600 ? 9 : 14), cy + 6 + Math.abs(k) * -2, W < 600 ? 1.6 : 2.4, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  function drawFrame() {           // gilded proscenium
    const F = FR();
    const bevel = (x, y, w, h, vert) => { const g = vert ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#3b2a10'); g.addColorStop(.3, '#efdcae'); g.addColorStop(.55, '#b08a45'); g.addColorStop(.8, '#fff0c8'); g.addColorStop(1, '#3b2a10'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); };
    bevel(0, 0, W, F, false); bevel(0, H - F * .6, W, F * .6, false); bevel(0, 0, F, H, true); bevel(W - F, 0, F, H, true);
    // cartouche at top centre
    const cx = W / 2, cy = F + 4, r = W < 600 ? 15 : 22;
    ctx.fillStyle = goldV(cy - r, cy + r); ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.5, r, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a0712'; ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.05, r * .62, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f5c542'; ctx.font = `700 ${r * .62 | 0}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('365', cx, cy + 1);
    ctx.fillStyle = goldV(cy - r, cy + r); for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + d * r * 1.45, cy - 3); ctx.quadraticCurveTo(cx + d * r * 2.6, cy - r * .9, cx + d * r * 3.2, cy - 2); ctx.quadraticCurveTo(cx + d * r * 2.4, cy + 2, cx + d * r * 1.45, cy + 4); ctx.fill(); }
  }


  /* ---- spotlight: beam from top, pool around logo, vignette, dust ---- */
  const mobile = Math.min(innerWidth, innerHeight) < 600;
  const dust = Array.from({ length: mobile ? 18 : 40 }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.6, s: .01 + Math.random() * .03, p: Math.random() * 6.28 }));
  let spotX = 0, sTime = 0;
  function drawSpot(dt) {
    const a = 1 - ease(open); if (a <= 0) return;
    sTime += dt;
    const target = (!reduce && ptr) ? Math.max(-W * .08, Math.min(W * .08, (ptr.x - W / 2) * .15)) : 0;
    if (!reduce) spotX += (target + Math.sin(sTime * .6) * W * .012 - spotX) * Math.min(1, dt * 2.5);
    const cx = W / 2 + spotX, cy = H * .52, R = Math.min(W, H) * .42;
    ctx.save(); ctx.globalAlpha = a;
    // vignette darkens curtain edges
    const vg = ctx.createRadialGradient(cx, cy, R * .5, W / 2, H / 2, Math.hypot(W, H) * .62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,0,10,.78)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    // volumetric beam
    const topW = Math.min(W * .09, 80), botW = R * 1.05, sx = W / 2 + spotX * .3;
    const bg = ctx.createLinearGradient(0, 0, 0, cy + R * .4);
    bg.addColorStop(0, 'rgba(255,230,170,.20)'); bg.addColorStop(.7, 'rgba(255,214,140,.07)'); bg.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(sx - topW / 2, 0); ctx.lineTo(sx + topW / 2, 0); ctx.lineTo(cx + botW / 2, cy + R * .4); ctx.lineTo(cx - botW / 2, cy + R * .4); ctx.closePath(); ctx.fill();
    // warm pool of light on the curtain behind the logo
    const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .75);
    pg.addColorStop(0, 'rgba(255,220,150,.32)'); pg.addColorStop(.45, 'rgba(255,190,120,.12)'); pg.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(cx, cy, R * .78, R * .6, 0, 0, 7); ctx.fill();
    // dust motes drifting in the beam
    for (const d of dust) {
      if (!reduce) { d.y -= d.s * dt; d.p += dt; if (d.y < 0) { d.y = 1; d.x = Math.random(); } }
      const yy = d.y * (cy + R * .4), half = topW / 2 + (botW / 2 - topW / 2) * (yy / (cy + R * .4));
      const xx = sx + (cx - sx) * (yy / (cy + R * .4)) + (d.x - .5) * 2 * half * .9 + Math.sin(d.p) * 4;
      ctx.fillStyle = `rgba(255,236,190,${.25 + .35 * Math.abs(Math.sin(d.p * .7))})`;
      ctx.beginPath(); ctx.arc(xx, yy, d.r, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  /* ---- original funk bass loop (Web Audio, synthesized; 2 bars @ 104 BPM) ---- */
  const BPM = 104, STEP = 60 / BPM / 4;
  // [16th step, midi note, length in 16ths, pop?]  — E minor pentatonic groove with octave pops
  const BASS = [[0,28,2],[3,28,1],[4,40,1,1],[6,31,1],[7,33,1],[8,28,2],[10,38,1],[11,40,1,1],[14,35,1],[15,38,1],
                [16,28,2],[19,28,1],[20,40,1,1],[22,31,1],[23,32,1],[24,33,2],[26,45,1,1],[27,31,1],[28,28,1],[30,38,1,1],[31,40,1,1]];
  const KICK = [0, 7, 10, 16, 23, 26], CLAP = [4, 12, 20, 28];
  let ac = null, master = null, noise = null, timer = 0, nextT = 0, stepI = 0, muted = false;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function bass(t, m, len, pop) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = hz(m); o2.frequency.value = hz(m) / (pop ? 1 : 2) * 1.003;
    f.type = 'lowpass'; f.Q.value = pop ? 9 : 6;
    f.frequency.setValueAtTime(pop ? 2600 : 1400, t); f.frequency.exponentialRampToValueAtTime(pop ? 500 : 220, t + STEP * len * .9);
    const d = STEP * len * (pop ? .7 : .85), v = pop ? .32 : .42;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .006); g.gain.setTargetAtTime(v * .55, t + .02, .05); g.gain.setTargetAtTime(0, t + d, .015);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(master);
    o.start(t); o2.start(t); o.stop(t + d + .1); o2.stop(t + d + .1);
  }
  function kick(t) {
    const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
    g.gain.setValueAtTime(.55, t); g.gain.exponentialRampToValueAtTime(.001, t + .25); o.connect(g); g.connect(master); o.start(t); o.stop(t + .26);
  }
  function clap(t) {
    for (const off of [0, .012, .024]) {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noise;
      f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = .9;
      g.gain.setValueAtTime(.16, t + off); g.gain.exponentialRampToValueAtTime(.001, t + off + (off ? .03 : .14));
      s.connect(f); f.connect(g); g.connect(master); s.start(t + off); s.stop(t + off + .16);
    }
  }
  function schedule() {
    if (!ac) return;
    while (nextT < ac.currentTime + .12) {
      const s = stepI % 32;
      for (const n of BASS) if (n[0] === s) bass(nextT, n[1], n[2], n[3]);
      if (KICK.includes(s)) kick(nextT);
      if (CLAP.includes(s)) clap(nextT);
      nextT += STEP * (s % 2 ? .92 : 1.08); stepI++;      // light swing
    }
  }
  function startMusic() {
    if (ac || opening) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : .7;
      const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate * .2, ac.sampleRate); const ch = noise.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      nextT = ac.currentTime + .05; schedule(); timer = setInterval(schedule, 25);
      const sync = () => { const on = ac && ac.state === 'running'; mute.hidden = !on; sound.hidden = on || opening; };
      ac.onstatechange = sync; sync();
    } catch (e) { console.warn('audio off', e); }
  }
  function stopMusic() {
    if (!ac) return; const a = ac; ac = null; a.onstatechange = null; clearInterval(timer);
    try { master.gain.cancelScheduledValues(a.currentTime); master.gain.setValueAtTime(master.gain.value, a.currentTime); master.gain.linearRampToValueAtTime(0, a.currentTime + .3); } catch {}
    setTimeout(() => { a.close().catch(() => {}); }, 380);
  }
  const mute = document.createElement('button'); mute.type = 'button'; mute.className = 'curtain-mute'; mute.hidden = true;
  const setMute = () => { mute.textContent = muted ? '🔇 Sound off' : '🔊 Sound on'; mute.setAttribute('aria-pressed', String(muted)); };
  setMute(); ov.append(mute);
  mute.addEventListener('pointerdown', e => e.stopPropagation());
  mute.addEventListener('click', e => { e.stopPropagation(); muted = !muted; setMute(); if (master && ac) master.gain.setTargetAtTime(muted ? 0 : .7, ac.currentTime, .05); });
  // gold "Tap for sound" hint, shown until the AudioContext is actually running
  const sound = document.createElement('div'); sound.className = 'curtain-sound'; sound.setAttribute('aria-hidden', 'true');
  sound.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Tap for sound</span>';
  ov.append(sound);
  // try to start right away; browsers keep it suspended until the first gesture, so resume on any touch/rub/key
  function unlock(e) {
    if (opening || (e && (e.target === skip || e.target === mute))) return;
    if (!ac) startMusic();
    if (ac && ac.state !== 'running') ac.resume().catch(() => {});
  }
  for (const t of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'keydown', 'click']) ov.addEventListener(t, unlock, { capture: true, passive: true });
  addEventListener('keydown', unlock, { capture: true });
  startMusic();

  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    if (holdAt != null) open = holdAt; else if (opening) { open = Math.min(1, (now - t0) / 2100); if (open >= 1) return done(); }
    step(dt);
    ctx.clearRect(0, 0, W, H);
    if (open < .02) { ctx.fillStyle = '#1a0206'; ctx.fillRect(0, 0, W, H); }
    drawHalf(0); drawHalf(1); drawHalf(0, true); drawHalf(1, true);   // logo after both fabrics + seams
    drawSpot(dt);
    ctx.globalAlpha = open < .72 ? 1 : Math.max(0, 1 - (open - .72) / .28);
    drawColumns(); drawLeg(0); drawLeg(1); drawValance(); drawFrame(); ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }
  let raf = requestAnimationFrame(frame);

  /* ---- input: pointer + touch rub ---- */
  let down = null;   // tap-vs-drag tracking: only a short, still press on the centre opens
  ov.addEventListener('pointermove', e => {
    if (down) down.dist += Math.hypot(e.clientX - down.lx, e.clientY - down.ly), down.lx = e.clientX, down.ly = e.clientY;
    if (reduce || opening) return;
    const vx = ptr ? e.clientX - ptr.x : 0, vy = ptr ? e.clientY - ptr.y : 0; ptr = { x: e.clientX, y: e.clientY };
    if (Math.abs(vx) + Math.abs(vy) < 1) return;
    poke(e.clientX, e.clientY, vx, vy);
  }, { passive: true });
  ov.addEventListener('pointerdown', e => { down = { t: performance.now(), dist: 0, lx: e.clientX, ly: e.clientY }; ptr = { x: e.clientX, y: e.clientY }; if (!reduce) poke(e.clientX, e.clientY, 0); }, { passive: true });
  const wasDrag = e => e && e.detail > 0 && down && (down.dist > 12 || performance.now() - down.t > 650);
  ov.addEventListener('touchmove', e => e.preventDefault(), { passive: false });   // keep page from scrolling under the curtain

  function enter() {
    if (opening) return; opening = true; t0 = performance.now(); stopMusic();
    try { sessionStorage.setItem(KEY, '1'); } catch {}
    ov.classList.add('opening');
    if (!reduce) for (let i = 0; i < N; i++) { halves[0].v[i] -= 220 * (i + 1) / N; halves[1].v[i] += 220 * (N - i) / N; }   // panels swing as they gather
    if (reduce) { ov.classList.add('fade'); setTimeout(done, 450); }
  }
  function done() {
    cancelAnimationFrame(raf); document.documentElement.classList.remove('curtain-lock');
    ov.classList.add('gone'); setTimeout(() => ov.remove(), 400);
  }
  logo.addEventListener('click', e => { if (wasDrag(e)) return; enter(); }); skip.addEventListener('click', () => { stopMusic(); try { sessionStorage.setItem(KEY, '1'); } catch {} done(); });
  addEventListener('keydown', function k(e) { if (!ov.isConnected) return removeEventListener('keydown', k); if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (document.activeElement === mute) return mute.click(); enter(); } else if (e.key === 'Escape') skip.click(); });
  window.P365Curtain = { _still: () => { still = true; for (const h of halves) { h.x.fill(0); h.v.fill(0); } }, _hold: v => { holdAt = v; }, enter, skip: () => skip.click(), _audio: () => ac && ac.state, _down: () => down, _amp: () => Math.max(...halves.flatMap(h => [...h.x].map(Math.abs))) };
})();
