/* One soundtrack at a time: funk intro track, promo video (with sound), timeline videos, Lenka's Mixcloud mix. */
(()=>{
  const mus=document.getElementById('mus'),snd=document.getElementById('snd');
  const stopFunk=()=>{if(mus&&!mus.paused){mus.pause();snd&&snd.classList.add('off')}};
  const stopVideos=except=>document.querySelectorAll('video').forEach(v=>{if(v!==except&&v.id!=='vid'&&!v.muted&&!v.paused)v.pause()});
  const stopMix=()=>{try{window.p365Mix&&window.p365Mix.pause()}catch(e){}};
  document.addEventListener('play',e=>{const t=e.target;if(t.id==='vid')return;
    if(t===mus){stopVideos();stopMix();return}
    if(!t.muted){stopFunk();stopMix();stopVideos(t)}},true);
  document.addEventListener('volumechange',e=>{const t=e.target;if(t.tagName==='VIDEO'&&t.id!=='vid'&&!t.muted&&!t.paused){stopFunk();stopMix();stopVideos(t)}},true);
  document.addEventListener('p365:mix',()=>{stopFunk();stopVideos()});
  /* scroll reveal for generic blocks not already using .reveal */
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver'in window){
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('r-in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('main section:not(.rhero) .h2, .tl-item, .ep, .fam-grid figure, figure').forEach(el=>{if(!el.closest('.rhero')){el.classList.add('r-up');io.observe(el)}});
  }
  /* active nav link */
  const links=[...document.querySelectorAll('nav .links a')];
  const secs=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
  addEventListener('scroll',()=>{let cur;secs.forEach(s=>{if(s.getBoundingClientRect().top<innerHeight*.35)cur=s});links.forEach(a=>a.classList.toggle('act',cur&&a.getAttribute('href')==='#'+cur.id))},{passive:true});
  document.querySelectorAll('nav .links a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.links').classList.remove('open')));
})();
addEventListener('scroll',()=>document.body.classList.toggle('scrolledN',scrollY>60),{passive:true});
