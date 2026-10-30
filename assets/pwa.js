/* Prince 365 PWA: service worker + Add to Home Screen helper */
(() => {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(console.warn));
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) return;
  const box = document.createElement('div'); box.className = 'a2hs'; box.hidden = true;
  const txt = document.createElement('span'); const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn btn-gold btn-sm';
  const x = document.createElement('button'); x.type = 'button'; x.className = 'a2hs-x'; x.setAttribute('aria-label', 'Dismiss'); x.textContent = '×';
  box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Install app'); btn.className = 'a2hs-btn'; btn.hidden = true;
  box.append(txt, btn, x);
  const place = () => { const hero = document.querySelector('.hero'); if (hero) hero.after(box); else document.body.prepend(box); };   // in page flow, right under the hero video
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', place); else place();
  const dismissed = () => { try { return localStorage.getItem('p365_a2hs') === '1'; } catch { return false; } };
  x.onclick = () => { box.hidden = true; try { localStorage.setItem('p365_a2hs', '1'); } catch {} };
  let deferred;
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferred = e; if (dismissed()) return;
    txt.textContent = 'Get Prince 365 on your home screen'; btn.textContent = 'Install'; btn.hidden = false; box.hidden = false;
  });
  btn.onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; box.hidden = true; };
  addEventListener('appinstalled', () => { box.hidden = true; });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !dismissed()) setTimeout(() => { txt.textContent = 'Install: tap Share ⬆︎ then Add to Home Screen'; btn.hidden = true; box.hidden = false; }, 1500);
})();
