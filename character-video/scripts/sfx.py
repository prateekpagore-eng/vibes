import numpy as np, wave, sys
SR=44100; out=sys.argv[1]  # usage: python3 sfx.py public/sfx; rng=np.random.default_rng(7)
def save(name,x):
    x=x/np.max(np.abs(x))*0.85
    with wave.open(f'{out}/{name}.wav','wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x*32767).astype(np.int16).tobytes())
def lowpass(x,cut):  # one-pole, time-varying cutoff
    y=np.zeros_like(x); a=np.exp(-2*np.pi*cut/SR); p=0
    for i in range(len(x)): p=(1-a[i])*x[i]+a[i]*p; y[i]=p
    return y
# whoosh: noise with cutoff sweeping up then down, bell envelope
n=int(SR*0.38); t=np.linspace(0,1,n)
cut=300+5200*np.sin(np.pi*t)**2
w=lowpass(rng.standard_normal(n),cut)-lowpass(rng.standard_normal(n),cut*0.25)*0.3
save('whoosh', w*np.sin(np.pi*t)**1.5)
# pop: fast downward pitch sweep + tiny click
n=int(SR*0.16); t=np.arange(n)/SR
f=900*np.exp(-t*28)+180; ph=2*np.pi*np.cumsum(f)/SR
p=np.sin(ph)*np.exp(-t*30); p[:60]+=rng.standard_normal(60)*0.6*np.linspace(1,0,60)
save('pop', p)
# landing thump for the entrance
n=int(SR*0.3); t=np.arange(n)/SR
f=120*np.exp(-t*12)+45; th=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*14)
save('thump', th)
# sparkle chime for the final role
n=int(SR*0.9); t=np.arange(n)/SR; s=np.zeros(n)
for k,(fq,d) in enumerate([(1318,0),(1760,0.07),(2637,0.14)]):
    o=int(d*SR); tt=t[:n-o]; s[o:]+=np.sin(2*np.pi*fq*tt)*np.exp(-tt*6)*(0.5+0.5*np.sin(2*np.pi*fq*2*tt)*0.3)
save('sparkle', s)
