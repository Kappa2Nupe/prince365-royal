/* Prince 365 community: one small data layer + UI bindings.
 * Backends: Supabase (when assets/config.js is filled in) or a localStorage demo fallback.
 * All user text is rendered with textContent (never innerHTML) to prevent XSS.
 */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const CFG = window.P365_CONFIG || {};

  /* ---------------- moderation / validation ---------------- */
  const LIMITS = { name: 40, message: 1000, chat: 500, caption: 200, email: 254 };
  const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const IMG_MAX = 8 * 1024 * 1024;
  const BAD = ['fuck', 'fucking', 'fucker', 'motherfucker', 'shit', 'bullshit', 'bitch', 'cunt', 'asshole', 'dick', 'cock', 'whore', 'slut', 'bastard', 'nigger', 'nigga', 'faggot', 'fag', 'retard', 'twat', 'wanker'];
  const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
  const badRe = new RegExp('\\b(' + BAD.join('|') + ')(s|es|ed|ing)?\\b', 'gi');
  function filterProfanity(text) {
    // mask in the original string where the leetspeak-normalised version matches
    const norm = text.replace(/[013457@$!]/g, c => LEET[c]);
    let out = text.split(''); let m; badRe.lastIndex = 0;
    while ((m = badRe.exec(norm))) for (let i = m.index + 1; i < m.index + m[0].length; i++) out[i] = '★';
    return out.join('');
  }
  const clean = (s, max) => filterProfanity(String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\s+\n/g, '\n').trim().slice(0, max));
  const validEmail = e => /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= LIMITS.email;
  function validateImage(file) {
    if (!file) return 'Choose a photo first.';
    if (!IMG_TYPES.includes(file.type)) return 'Only JPG, PNG or WebP images, please.';
    if (file.size > IMG_MAX) return 'That photo is over 8 MB. Try a smaller one.';
    return null;
  }
  const cooldown = {}; // client-side flood guard
  function throttle(key, ms) { const now = Date.now(); if (cooldown[key] && now - cooldown[key] < ms) return Math.ceil((ms - (now - cooldown[key])) / 1000); cooldown[key] = now; return 0; }

  /* ---------------- demo adapter (localStorage) ---------------- */
  function DemoAdapter() {
    const K = t => 'p365_demo_' + t;
    const read = t => { try { return JSON.parse(localStorage.getItem(K(t)) || '[]'); } catch { return []; } };
    const write = (t, rows) => localStorage.setItem(K(t), JSON.stringify(rows));
    const id = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    const insert = (t, row, cap = 500) => { const rows = read(t); const r = { id: id(), created_at: new Date().toISOString(), ...row }; rows.push(r); write(t, rows.slice(-cap)); return r; };
    const bc = 'BroadcastChannel' in window ? new BroadcastChannel('p365-chat') : null;
    const subs = new Set();
    bc && (bc.onmessage = e => subs.forEach(cb => cb(e.data)));
    if (!localStorage.getItem(K('seeded'))) {
      insert('posts', { name: 'Prince 365 (demo)', message: 'Welcome to the Living Room! This is demo mode: messages you post here stay in your own browser until the site is connected to the online database.', parent_id: null });
      localStorage.setItem(K('seeded'), '1');
    }
    return {
      mode: 'demo',
      async signup({ email, name }) {
        const rows = read('signups');
        if (rows.some(r => r.email.toLowerCase() === email.toLowerCase())) return { duplicate: true };
        insert('signups', { email, name: name || null }); return { ok: true };
      },
      async listPosts() { return read('posts'); },
      async addPost(p) { return insert('posts', p); },
      async listChat() { return read('chat_messages').slice(-100); },
      async sendChat(m) { const r = insert('chat_messages', m, 200); bc && bc.postMessage(r); return r; },
      subscribeChat(cb) { subs.add(cb); addEventListener('storage', e => { if (e.key === K('chat_messages')) { const rows = read('chat_messages'); cb(rows[rows.length - 1]); } }); return () => subs.delete(cb); },
      async listPhotos() { return read('photos').filter(p => p.approved !== false).reverse(); },
      async uploadPhoto({ file, name, caption }) {
        const url = await downscale(file, 1100, 0.8); // keep localStorage small
        try { return insert('photos', { name, caption, image_url: url, approved: true }, 24); }
        catch (e) { throw new Error('Demo storage is full in this browser. (Online mode has no such limit.)'); }
      }
    };
  }
  function downscale(file, max, q) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => { const im = new Image(); im.onload = () => {
        const s = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas');
        c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', q)); }; im.onerror = () => rej(new Error('Could not read that image.')); im.src = fr.result; };
      fr.onerror = () => rej(new Error('Could not read that file.')); fr.readAsDataURL(file);
    });
  }

  /* ---------------- Supabase adapter ---------------- */
  async function SupabaseAdapter() {
    const { createClient } = await import(CFG.SUPABASE_JS_URL || 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    const demo = DemoAdapter();
    const sb = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const bucket = CFG.PHOTO_BUCKET || 'fan-photos';
    const chk = ({ data, error }) => { if (error) throw error; return data; };
    const publicUrl = path => sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    return {
      mode: 'live',
      signup: (...a) => demo.signup(...a), // signups/photos not provisioned online yet: stay in demo
      listPhotos: (...a) => demo.listPhotos(...a),
      uploadPhoto: (...a) => demo.uploadPhoto(...a),
      async _unusedSignup({ email, name }) {
        // insert only: anon has no SELECT on signups (emails stay private)
        const { error } = await sb.from('signups').insert({ email, name: name || null, source: 'landing' });
        if (error && error.code === '23505') return { duplicate: true };
        if (error) throw error; return { ok: true };
      },
      async listPosts() { return chk(await sb.from('board_posts').select('id,name,message,created_at').order('created_at', { ascending: false }).limit(50)); },
      async addPost(p) { return chk(await sb.from('board_posts').insert({ name: p.name, message: p.message }).select('id,name,message,created_at').single()); },
      noReplies: true,
      async listChat() { return chk(await sb.from('chat_messages').select('id,name,message,created_at').order('created_at', { ascending: false }).limit(100)).reverse(); },
      async sendChat(m) { return chk(await sb.from('chat_messages').insert(m).select('id,name,message,created_at').single()); },
      subscribeChat(cb, onStatus) {
        const ch = sb.channel('p365-chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => cb(payload.new))
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'board_posts' }, payload => window.dispatchEvent(new CustomEvent('p365-post', { detail: payload.new })))
          .subscribe(st => onStatus && onStatus(st));
        return () => sb.removeChannel(ch);
      },
      async _unusedListPhotos() {
        const rows = chk(await sb.from('photos').select('id,name,caption,image_path,created_at').order('created_at', { ascending: false }).limit(120));
        return rows.map(r => ({ ...r, image_url: publicUrl(r.image_path) }));
      },
      async _unusedUploadPhoto({ file, name, caption }) {
        const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
        const path = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
        chk(await sb.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' }));
        const row = chk(await sb.from('photos').insert({ name, caption: caption || null, image_path: path }).select('id,name,caption,image_path,created_at').single());
        return { ...row, image_url: publicUrl(path) };
      }
    };
  }

  /* ---------------- data layer bootstrap ---------------- */
  const configured = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  const ready = (configured ? SupabaseAdapter().catch(err => { console.warn('Supabase unavailable, using demo mode', err); return DemoAdapter(); }) : Promise.resolve(DemoAdapter()));
  window.P365Data = { ready, filterProfanity, LIMITS };

  /* ---------------- UI helpers ---------------- */
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const ago = iso => { const s = (Date.now() - new Date(iso)) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
  const say = (form, msg, ok) => { const p = form.querySelector('.cm-msg') || form.parentElement.querySelector('.cm-msg'); if (p) { p.textContent = msg; p.classList.toggle('ok', !!ok); } };
  const hp = form => form.querySelector('.hp')?.value; // honeypot filled = bot
  const NAME_KEY = 'p365_name';
  const rememberName = n => { try { localStorage.setItem(NAME_KEY, n); } catch {} };
  document.querySelectorAll('input[name="name"]').forEach(i => { if (i.id !== 'signupName') i.value = localStorage.getItem(NAME_KEY) || ''; });

  ready.then(api => {
    /* mode labels */
    document.querySelectorAll('[data-mode-pill]').forEach(p => p.classList.add(api.mode));
    document.querySelectorAll('[data-mode-text]').forEach(t => t.textContent = api.mode === 'live' ? 'Live: connected to the Prince 365 community.' : 'Demo mode, not saved online: entries stay in this browser only.');

    /* tabs */
    const tabs = [...document.querySelectorAll('.cmt')];
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => { const on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', String(on)); const pane = document.getElementById(x.getAttribute('aria-controls')); pane.hidden = !on; pane.classList.toggle('on', on); });
      if (t.id === 'tab-chat') { const log = $('#chatLog'); log.scrollTop = log.scrollHeight; }
    }));

    /* char counter */
    document.querySelectorAll('[data-count-for]').forEach(c => { const f = c.closest('form').elements[c.dataset.countFor]; const upd = () => c.textContent = `${f.value.length} / ${f.maxLength}`; f.addEventListener('input', upd); upd(); });

    /* ---- email signup ---- */
    const nf = $('#notifyForm'), nmsg = $('#formMsg');
    nf.addEventListener('submit', async e => {
      e.preventDefault(); if (hp(nf)) return;
      const email = nf.elements.email.value.trim(), name = clean(nf.elements.name.value, LIMITS.name);
      if (!validEmail(email)) { nmsg.textContent = 'Hmm, that email looks off. Try again?'; nf.elements.email.focus(); return; }
      const w = throttle('signup', 5000); if (w) { nmsg.textContent = `One sec… try again in ${w}s.`; return; }
      nmsg.textContent = 'Adding you…';
      try {
        const r = await api.signup({ email, name });
        nmsg.textContent = r.duplicate ? "You're already on the list. We'll be in touch!" : (api.mode === 'live' ? "You're on the list! Tickets and info coming soon." : "Saved in demo mode (this browser only). Not sent online yet.");
        if (!r.duplicate) nf.reset();
      } catch (err) { console.error(err); nmsg.textContent = 'Something went wrong. Please try again later.'; }
    });

    /* ---- message board ---- */
    const board = $('#board'), pf = $('#postForm');
    let posts = [];
    function renderBoard() {
      board.textContent = '';
      const top = posts.filter(p => !p.parent_id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (!top.length) { board.append(el('p', 'empty', 'No messages yet. Start the conversation!')); return; }
      top.forEach(p => {
        const card = el('article', 'post');
        const h = el('header'); h.append(el('span', 'avatar', (p.name || '?').trim().charAt(0).toUpperCase()), el('b', null, p.name), el('time', null, ago(p.created_at)));
        h.querySelector('time').dateTime = p.created_at;
        card.append(h, el('p', 'post-body', p.message));
        const replies = posts.filter(r => r.parent_id === p.id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        if (replies.length) { const ul = el('div', 'replies'); replies.forEach(r => { const d = el('div', 'reply'); d.append(el('b', null, r.name), el('time', null, ago(r.created_at)), el('p', null, r.message)); ul.append(d); }); card.append(ul); }
        if (!api.noReplies) { const rb = el('button', 'reply-btn', 'Reply'); rb.type = 'button';
        rb.addEventListener('click', () => openReply(card, p.id, rb)); card.append(rb); }
        board.append(card);
      });
    }
    function openReply(card, parentId, btn) {
      if (card.querySelector('.reply-form')) return;
      btn.hidden = true;
      const f = el('form', 'reply-form'); f.noValidate = true;
      const n = el('input'); n.name = 'name'; n.maxLength = LIMITS.name; n.placeholder = 'Name'; n.value = localStorage.getItem(NAME_KEY) || ''; n.required = true; n.setAttribute('aria-label', 'Your name');
      const m = el('input'); m.name = 'message'; m.maxLength = LIMITS.message; m.placeholder = 'Write a reply…'; m.required = true; m.setAttribute('aria-label', 'Reply');
      const s = el('button', 'btn btn-gold btn-sm', 'Reply'); s.type = 'submit';
      const msg = el('p', 'cm-msg'); f.append(n, m, s, msg); card.append(f); m.focus();
      f.addEventListener('submit', async e => { e.preventDefault(); await submitPost(f, n.value, m.value, parentId); });
    }
    async function submitPost(form, rawName, rawMsg, parentId) {
      const name = clean(rawName, LIMITS.name), message = clean(rawMsg, LIMITS.message);
      if (!name) return say(form, 'Add your name.'); if (!message) return say(form, 'Write a message first.');
      const w = throttle('post', 15000); if (w) return say(form, `Easy now! You can post again in ${w}s.`);
      try { const row = await api.addPost({ name, message, parent_id: parentId || null }); if (!posts.some(x => x.id === row.id)) posts.push(row); rememberName(name); renderBoard(); if (!parentId) { form.reset(); form.elements.name.value = name; form.querySelector('[data-count-for]') && (form.querySelector('[data-count-for]').textContent = `0 / ${LIMITS.message}`); say(form, api.mode === 'live' ? 'Posted!' : 'Posted (demo mode: only visible in this browser).', true); } }
      catch (err) { console.error(err); say(form, 'Could not post right now. Please try again.'); }
    }
    addEventListener('p365-post', e => { const r = e.detail; if (r && !posts.some(x => x.id === r.id)) { posts.push(r); renderBoard(); } });
    pf.addEventListener('submit', e => { e.preventDefault(); if (hp(pf)) return; submitPost(pf, pf.elements.name.value, pf.elements.message.value, null); });
    api.listPosts().then(r => { posts = r; renderBoard(); }).catch(err => { console.error(err); board.textContent = ''; board.append(el('p', 'empty', 'Messages are unavailable right now.')); });

    /* ---- live chat ---- */
    const log = $('#chatLog'), cf = $('#chatForm'), cstatus = $('#chatStatus'), seen = new Set();
    function addChat(m) {
      if (!m || seen.has(m.id)) return; seen.add(m.id);
      log.querySelector('.empty')?.remove();
      const line = el('div', 'chat-line'); const mine = m.name === (localStorage.getItem(NAME_KEY) || '');
      if (mine) line.classList.add('mine');
      line.append(el('b', null, m.name), el('span', null, m.message), el('time', null, new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })));
      const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
      log.append(line); while (log.children.length > 150) log.firstChild.remove();
      if (atBottom || mine) log.scrollTop = log.scrollHeight;
    }
    api.listChat().then(r => r.forEach(addChat)).catch(console.error);
    const setStatus = st => { const live = st === 'SUBSCRIBED' || st === 'demo'; cstatus.textContent = api.mode === 'demo' ? 'demo · this browser' : (live ? '● live' : 'connecting…'); cstatus.classList.toggle('live', live); };
    api.subscribeChat(addChat, setStatus); if (api.mode === 'demo') setStatus('demo');
    cf.addEventListener('submit', async e => {
      e.preventDefault(); if (hp(cf)) return;
      const name = clean(cf.elements.name.value, LIMITS.name), message = clean(cf.elements.message.value, LIMITS.chat), cm = $('#chatMsg');
      if (!name) { cm.textContent = 'Add your name first.'; cf.elements.name.focus(); return; }
      if (!message) return;
      const w = throttle('chat', 3000); if (w) { cm.textContent = 'Slow down a little 🙂'; return; }
      cm.textContent = ''; rememberName(name);
      try { const row = await api.sendChat({ name, message }); addChat(row); cf.elements.message.value = ''; cf.elements.message.focus(); }
      catch (err) { console.error(err); cm.textContent = 'Message not sent. Try again.'; }
    });

    /* ---- photo wall ---- */
    const wall = $('#fanWall'), phf = $('#photoForm'), fileIn = phf.elements.file, prev = phf.querySelector('.drop-preview'), drop = $('#drop');
    function addPhoto(p, prepend) {
      wall.querySelector('.empty')?.remove();
      const a = el('a', 'fan lb'); a.href = p.image_url; a.dataset.caption = [p.caption, '· shared by ' + p.name].filter(Boolean).join(' ');
      const im = el('img'); im.src = p.image_url; im.alt = p.caption ? `Fan memory: ${p.caption}` : `Fan memory shared by ${p.name}`; im.loading = 'lazy';
      const cap = el('span', 'fan-cap'); cap.append(el('b', null, p.name)); if (p.caption) cap.append(el('span', null, p.caption));
      a.append(im, cap); prepend ? wall.prepend(a) : wall.append(a);
    }
    api.listPhotos().then(r => r.forEach(p => addPhoto(p))).catch(console.error);
    const showPreview = f => { const err = validateImage(f); if (err) { say(phf, err); prev.hidden = true; return; } say(phf, ''); prev.src = URL.createObjectURL(f); prev.hidden = false; drop.classList.add('has'); };
    fileIn.addEventListener('change', () => showPreview(fileIn.files[0]));
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (!f) return; const dt = new DataTransfer(); dt.items.add(f); fileIn.files = dt.files; showPreview(f); });
    phf.addEventListener('submit', async e => {
      e.preventDefault(); if (hp(phf)) return;
      const file = fileIn.files[0], err = validateImage(file); if (err) return say(phf, err);
      const name = clean(phf.elements.name.value, LIMITS.name), caption = clean(phf.elements.caption.value, LIMITS.caption);
      if (!name) return say(phf, 'Add your name.');
      if (!phf.elements.consent.checked) return say(phf, 'Please confirm you have permission to share this photo.');
      const w = throttle('photo', 20000); if (w) return say(phf, `Please wait ${w}s before uploading another.`);
      const btn = phf.querySelector('button[type=submit]'); btn.disabled = true; say(phf, 'Uploading…');
      try { const row = await api.uploadPhoto({ file, name, caption }); addPhoto(row, true); rememberName(name); phf.reset(); phf.elements.name.value = name; prev.hidden = true; drop.classList.remove('has'); say(phf, api.mode === 'live' ? 'Thanks! Your memory is on the wall.' : 'Added in demo mode (only visible in this browser).', true); }
      catch (er) { console.error(er); say(phf, er.message && api.mode === 'demo' ? er.message : 'Upload failed. Please try again.'); }
      finally { btn.disabled = false; }
    });
  });
})();
