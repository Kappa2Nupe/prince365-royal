import numpy as np, wave
SR=44100;BPM=114;b=60/BPM;s16=b/4
FILL=2*b  # half bar pickup fill
BARS=12;N=int(SR*(FILL+BARS*4*b)+SR*0.5)
L=np.zeros(N);Rr=np.zeros(N)
rng=np.random.default_rng(7)
def add(sig,t,pan=0.0,g=1.0):
    i=int(t*SR);j=min(N,i+len(sig));sig=sig[:j-i]*g
    L[i:j]+=sig*(1-pan)*.5*2**.5*.7;Rr[i:j]+=sig*(1+pan)*.5*2**.5*.7
def env(n,a=.002,d=.1):
    t=np.arange(n)/SR;return np.minimum(1,t/a)*np.exp(-t/d)
def kick():
    n=int(.35*SR);t=np.arange(n)/SR;f=50+120*np.exp(-t*35)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*9)*1.1
def snare():
    n=int(.25*SR);t=np.arange(n)/SR
    return (rng.standard_normal(n)*np.exp(-t*18)*.6+np.sin(2*np.pi*190*t)*np.exp(-t*25)*.5)
def clap():
    n=int(.2*SR);t=np.arange(n)/SR;e=np.exp(-t*20)
    for k in (0.01,0.02):e+=np.exp(-np.maximum(0,t-k)*80)*(t>k)
    x=rng.standard_normal(n)*e*.3;return np.convolve(x,[1,-.9],'same')
def hat(o=False):
    n=int((.18 if o else .05)*SR);t=np.arange(n)/SR
    x=np.diff(rng.standard_normal(n+1))*np.exp(-t*(15 if o else 70));return x*.18
def tom(f):
    n=int(.3*SR);t=np.arange(n)/SR;ff=f*(1+.5*np.exp(-t*20))
    return np.sin(2*np.pi*np.cumsum(ff)/SR)*np.exp(-t*10)*.7
def saw(f,n,det=0):
    t=np.arange(n)/SR;x=0
    for d in (-det,0,det):x=x+2*((t*f*(1+d))%1)-1
    return x/3
def lp(x,a):
    y=np.zeros_like(x);p=0
    for i in range(len(x)):p+=a*(x[i]-p);y[i]=p
    return y
def bass(f,dur):
    n=int(dur*SR);t=np.arange(n)/SR
    x=np.sin(2*np.pi*f*t+1.5*np.exp(-t*20)*np.sin(2*np.pi*f*2*t))  # slap-ish FM
    x+=.3*np.sign(np.sin(2*np.pi*f*t))*np.exp(-t*30)
    return x*np.minimum(1,t/.003)*np.exp(-t*4)*np.minimum(1,(n-np.arange(n))/200)*.55
def brass(fs,dur):
    n=int(dur*SR);x=sum(saw(f,n,.006) for f in fs)/len(fs)
    t=np.arange(n)/SR;e=np.minimum(1,t/.01)*np.exp(-t*3)*np.minimum(1,(n-np.arange(n))/400)
    return lp(x*e,.25)*.55
def gtr(fs):
    n=int(.06*SR);t=np.arange(n)/SR
    x=sum(saw(f,n) for f in fs)+rng.standard_normal(n)*.6
    return np.convolve(x,[1,-1],'same')*np.exp(-t*60)*.08
def nf(m):return 440*2**((m-69)/12)
# fill: 8 sixteenths toms/snare
for k,f in enumerate([220,220,180,180,140,140,110,0]):
    add(tom(f) if f else snare(),k*s16,pan=(.5-k/7)*.6,g=.8)
T0=FILL
# downbeat stab + crash
add(brass([nf(m) for m in (57,61,64,68)],.45),T0,g=1.2)
crash=np.diff(rng.standard_normal(int(1.5*SR)+1))*np.exp(-np.arange(int(1.5*SR))/SR*3)*.12;add(crash,T0,.3)
# Original bass line (E minor dorian-ish), 16 steps: (step, midi, len16)
bl=[(0,40,2),(3,40,1),(4,52,1),(6,50,1),(7,40,1),(10,43,1),(11,45,2),(14,47,1),(15,45,1)]
bl2=[(0,40,2),(3,52,1),(5,40,1),(6,38,2),(8,40,1),(10,47,1),(11,50,1),(12,52,1),(14,50,1),(15,47,1)]
chords=[[64,67,71,74],[62,66,69,72]]
for bar in range(BARS):
    t=T0+bar*4*b;swing=lambda st:st*s16+(s16*.12 if st%2 else 0)
    last=bar==BARS-1
    for st in range(16):
        if st in (0,7,10) or (st==14 and bar%2): add(kick(),t+swing(st))
        if st in (4,12): add(snare(),t+swing(st),g=.9);add(clap(),t+swing(st),g=.8)
        add(hat(st==6 or st==14),t+swing(st),pan=.3,g=1 if st%2==0 else .6)
        if st in (2,6,10,14): add(gtr([nf(m) for m in (64,67,71)]),t+swing(st),pan=-.5)
        if st in (3,11): add(gtr([nf(m) for m in (64,67,71)]),t+swing(st),pan=-.5,g=.6)
    for st,m,l in (bl if bar%2==0 else bl2): add(bass(nf(m),l*s16*.95),t+swing(st))
    # stabby brass: original rhythm on & of 2, 4e, and bar-end push
    c=chords[(bar//2)%2]
    if bar%4!=3:
        for st,l in ((6,1),(9,1),(14,2)): add(brass([nf(x) for x in c],l*s16*.9),t+swing(st),g=.8)
    else:
        for st,l in ((0,2),(3,1),(6,1),(10,1),(12,4)): add(brass([nf(x+2) for x in c],l*s16*.9),t+swing(st),g=.8)
    # synth pad
    if bar%2==0:
        n=int(8*b*SR);p=lp(sum(saw(nf(x-12),n,.004) for x in c)/4,.04)*np.minimum(1,np.arange(n)/SR/1.2)*np.minimum(1,(n-np.arange(n))/SR/1.)*.12
        add(p,t,pan=.2)
mix=np.stack([L,Rr],1);mix=np.tanh(mix*1.3)/np.tanh(1.3);mix/=np.abs(mix).max()*1.12
# fade tail
f=int(.4*SR);mix[-f:]*=np.linspace(1,0,f)[:,None]
w=wave.open('funk.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((mix*32767).astype('<i2').tobytes());w.close()
print("stab at",T0,"len",N/SR)
