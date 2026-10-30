(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const skipIntro = reduce || /[?&](nointro|screenshot)\b/.test(location.search) || sessionStorage.getItem('p365-intro');

  /* Film-leader intro: 3-2-1 */
  const leader = $('#leader') || {classList:{add(){}}};
  const endLeader = () => { leader.classList.add('done'); sessionStorage.setItem('p365-intro', '1'); };
  if (skipIntro) { leader.classList.add('done'); }
  else {
    let n = 3; const num = $('#leaderNum') || {};
    const t = setInterval(() => { n--; if (n <= 0) { clearInterval(t); endLeader(); } else num.textContent = n; }, 750);
    ($('#leaderSkip')||{addEventListener(){}}).addEventListener('click', () => { clearInterval(t); endLeader(); });
  }

  /* Nav state */
  const nav = $('#nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* Hero video + sound controls (overlay, corner icon, tap-on-video, hero button all in sync) */
  const v = $('#heroVideo'), btn = $('#soundBtn'), tap = $('#tapSound'), mute = $('#muteBtn'), frame = $('.tv-frame');
  v.muted = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
  let soundStarted = false;
  const syncUI = () => {
    const on = !v.muted;
    frame.classList.toggle('sound-on', on);
    if (btn) {
      btn.setAttribute('aria-pressed', String(on));
      $('.ico', btn).textContent = on ? '🔇' : '🔊';
      $('.lbl', btn).textContent = on ? 'Mute' : 'Play with sound';
    }
    mute.setAttribute('aria-pressed', String(on));
    mute.setAttribute('aria-label', on ? 'Mute video' : 'Unmute video');
    tap.tabIndex = on ? -1 : 0; tap.setAttribute('aria-hidden', String(on));
  };
  // Must run synchronously inside the user's tap for iOS Safari to allow audio.
  const setSound = on => {
    if (on) {
      if (!soundStarted) { try { v.currentTime = 0; } catch (e) {} soundStarted = true; }
      v.muted = false; v.volume = 1;
      const p = v.play();
      p && p.catch(() => { v.muted = true; syncUI(); });
    } else {
      v.muted = true;   // muting never starts playback
    }
    syncUI();
  };
  btn && btn.addEventListener('click', () => setSound(v.muted));
  mute.addEventListener('click', e => { e.stopPropagation(); setSound(v.muted); });
  tap.addEventListener('click', e => { e.stopPropagation(); setSound(true); });
  const osd = $('.vhs-tl', frame);
  let userPaused = false, inView = false;
  const syncPlay = () => {
    const paused = v.paused;
    frame.classList.toggle('is-paused', paused);
    if (osd) osd.innerHTML = paused ? '<span class="rec">❚❚</span> PAUSE' : '<span class="rec">●</span> PLAY ▶';
  };
  frame.addEventListener('click', () => {
    if (v.muted && !soundStarted) { userPaused = false; setSound(true); return; }
    if (v.paused) { userPaused = false; v.play().catch(() => {}); } else { userPaused = true; v.pause(); }
  });
  v.addEventListener('play', syncPlay); v.addEventListener('pause', syncPlay); syncPlay();
  if ('IntersectionObserver' in window) {
    v.pause();
    new IntersectionObserver(es => es.forEach(e => {
      inView = e.isIntersecting && e.intersectionRatio >= 0.5;
      if (!inView && !v.paused) v.pause();   // never auto-plays; only pauses when scrolled away
    }), { threshold: [0, 0.5, 1] }).observe(frame);
  }
  v.addEventListener('volumechange', syncUI);
  syncUI();
  const clock = $('#vhsClock');
  const pad = (x, l = 2) => String(Math.floor(x)).padStart(l, '0');
  v.addEventListener('timeupdate', () => {
    const s = v.currentTime; clock.textContent = `SP ${pad(s / 3600)}:${pad(s / 60 % 60)}:${pad(s % 60)}`;
  });

  /* Countdown to June 1 2027 (Minneapolis, CDT) */
  const target = new Date('2027-06-01T20:00:00-05:00').getTime();
  const els = { d: $('#cdD'), h: $('#cdH'), m: $('#cdM'), s: $('#cdS') };
  const set = (el, val) => { if (el.textContent !== val) { el.textContent = val; el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); } };
  const tick = () => {
    let diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / 864e5); diff -= d * 864e5;
    const h = Math.floor(diff / 36e5); diff -= h * 36e5;
    const m = Math.floor(diff / 6e4); diff -= m * 6e4;
    const s = Math.floor(diff / 1e3);
    set(els.d, String(d).padStart(3, '0')); set(els.h, pad(h)); set(els.m, pad(m)); set(els.s, pad(s));
    if (target - Date.now() <= 0) $('.cd-foot').innerHTML = '<span class="gold">It\'s tonight. We Never Close!</span>';
  };
  tick(); setInterval(tick, 1000);

  /* Scroll reveals */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });

  /* Timeline progress line */
  const tl = $('.timeline'), fill = $('#tlFill');
  const tlUpdate = () => {
    const r = tl.getBoundingClientRect(); const vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * .6 - r.top) / r.height));
    fill.style.height = (p * 100) + '%';
  };
  addEventListener('scroll', tlUpdate, { passive: true }); tlUpdate();

  /* Poster tilt */
  const poster = $('[data-tilt]');
  if (poster && !reduce && matchMedia('(hover:hover)').matches) {
    poster.addEventListener('mousemove', e => {
      const r = poster.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      poster.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    });
    poster.addEventListener('mouseleave', () => poster.style.transform = '');
  }

  /* Lightbox (delegated: works for static + dynamically added a.lb links) */
  const lb = $('#lightbox'), img = $('#lbImg'), cap = $('#lbCap');
  let links = [], idx = 0, lastFocus;
  const visibleLinks = () => $$('a.lb').filter(a => a.offsetParent !== null);
  const show = i => { idx = (i + links.length) % links.length; const a = links[idx]; img.src = a.getAttribute('href'); img.alt = a.querySelector('img')?.alt || ''; cap.textContent = a.dataset.caption || ''; };
  const open = a => { links = visibleLinks(); lastFocus = document.activeElement; show(Math.max(0, links.indexOf(a))); lb.hidden = false; document.body.style.overflow = 'hidden'; $('#lbClose').focus(); };
  const close = () => { lb.hidden = true; document.body.style.overflow = ''; lastFocus?.focus(); };
  document.addEventListener('click', e => { const a = e.target.closest('a.lb'); if (!a) return; e.preventDefault(); open(a); });
  $('#lbClose').onclick = close; $('#lbPrev').onclick = () => show(idx - 1); $('#lbNext').onclick = () => show(idx + 1);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });

  /* Clubhouse episode wall filters */
  const chBtns = $$('.chf');
  chBtns.forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.f;
    chBtns.forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', String(x === b)); });
    $$('#epWall .ep').forEach(ep => { const on = f === 'all' || ep.dataset.cat === f; ep.hidden = !on; if (on) ep.classList.add('in'); });
    $$('#epWall .ep-year').forEach(y => { y.hidden = !$$(`#epWall .ep[data-year="${y.dataset.year}"]`).some(ep => !ep.hidden); });
  }));

  /* Purple rain canvas (gold + violet drops) */
  const c = $('#rain'); const ctx = c && c.getContext('2d');
  if (c && !reduce) {
    let W, H, drops = [];
    const resize = () => { W = c.width = innerWidth; H = c.height = innerHeight; const n = Math.round(W / 14); drops = Array.from({ length: n }, () => mk(true)); };
    const mk = (init) => ({ x: Math.random() * W, y: init ? Math.random() * H : -20, l: 8 + Math.random() * 18, v: 3 + Math.random() * 6, g: Math.random() < .12, a: .15 + Math.random() * .45 });
    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      for (const d of drops) {
        ctx.strokeStyle = d.g ? `rgba(245,197,66,${d.a})` : `rgba(177,92,255,${d.a})`;
        ctx.lineWidth = d.g ? 1.5 : 1; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 1, d.y + d.l); ctx.stroke();
        d.y += d.v; if (d.y > H) Object.assign(d, mk(false));
      }
      requestAnimationFrame(loop);
    };
    addEventListener('resize', resize); resize(); loop();
  }
})();
