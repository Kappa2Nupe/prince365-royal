import re
L='/workspace/prince365/'
live=open(L+'index.html').read()
mine=open('/tmp/hero-only.html').read()
# ---- rename my conflicting classes
for a,b in [('hero','rhero'),('poster','rposter'),('eyebrow','reye'),('grain','rgrain'),('big','rbig')]:
    mine=re.sub(r'\.%s(?![\w-])'%a,'.'+b,mine)
    mine=re.sub(r'class="([^"]*\b)%s\b'%a,lambda m:'class="'+m.group(1)+b,mine)
# ---- live css, minus nav/leader/hero overlays/curtain
css=open(L+'assets/styles.css').read()
def cut(css,start,end):
    i=css.index(start);j=css.index(end,i+len(start));return css[:i]+css[j:]
css=cut(css,'/* ---------- film leader intro','/* ---------- nav')
css=cut(css,'/* ---------- nav','/* ---------- type')
css=cut(css,'/* ---- theatre curtain intro','/* centered install bar')
css=css.replace('.grain{position:fixed','.xgrain{position:fixed').replace('.rain{','.xrain{')
# hero rules: keep (needed for .tv) but neutralise .hero itself
css=re.sub(r'(?<![\w-])\.hero(?=[\s{,:.\[])','.lhero',css)
open('assets/live.css','w').write(css)
# ---- body sections from live
start=live.index('<!-- ============ MARQUEE')
end=live.index('<script src="assets/config.js">')
body=live[start:end].replace('</main>','')
tv=live[live.index('<div class="tv">'):live.index('<a href="#countdown" class="scroll-cue"')]
tv=tv[:tv.rindex('</div>')]  # drop hero-inner close
promo='''<section class="promo" id="promo"><div class="promo-inner"><div class="promo-copy"><p class="eyebrow reveal">Prince 365 Studios presents</p><h2 class="h2 reveal">The <span class="neon-text">Promo</span></h2><p class="big reveal">At Smorgies Pub (formerly the 508), <em>for one night it will be 508 once again.</em></p><button class="btn btn-gold" id="soundBtn" type="button"><span class="ico">🔊</span> <span class="lbl">Play with sound</span></button></div>'''+tv+'</div></section>\n'
# head
head=mine[:mine.index('</head>')]
head=head.replace('<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond','<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=VT323&family=Playfair+Display:ital,wght@1,700&family=Cormorant+Garamond')
head=head.replace('<style>','<link rel="stylesheet" href="assets/live.css">\n<link rel="stylesheet" href="assets/royal.css">\n<style>',1)
bodyM=mine[mine.index('</head>'):]
# my nav -> on-page links
bodyM=re.sub(r'<div class="links">.*?</div>','<div class="links"><a href="#event">Event</a><a href="#dj">DJ</a><a href="#history">Timeline</a><a href="#clubhouse">Clubhouse</a><a href="#family">Family</a><a href="#community">Living Room</a><a href="#notify">Notify</a></div>',bodyM,flags=re.S)
bodyM=bodyM.replace('<nav>','<nav id="nav">')
# drop my lineup section (live event+dj sections carry it) - keep as quick lineup
lu_end=bodyM.index('</section></main>')+len('</section>')
scripts='''
<script src="assets/config.js"></script>
<script src="assets/script.js"></script>
<script src="assets/community.js"></script>
<script src="https://widget.mixcloud.com/media/js/widgetApi.js" defer></script>
'''+live[live.index('<script>\naddEventListener("load"'):live.index('</body>')]
out=head+'</head>'+bodyM[len('</head>'):lu_end]+'\n'+promo+body+'</main>\n'+bodyM[lu_end+len('</main>'):].replace('</body>','<script src="assets/royal.js"></script>\n'+scripts+'</body>')
# remove the curtain-independent stray "</main>" duplicates
out=out.replace('w=Mixcloud.PlayerWidget(f);','w=window.p365Mix=Mixcloud.PlayerWidget(f);')
out=out.replace('w.events.play.on(()=>{playing=true;','w.events.play.on(()=>{document.dispatchEvent(new Event("p365:mix"));playing=true;')
out=out.replace('S.onclick=()=>{muted=!muted;','S.onclick=()=>{muted=!M.paused;')
open('index.html','w').write(out)
print(len(out))
