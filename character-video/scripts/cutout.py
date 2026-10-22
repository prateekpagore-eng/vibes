import sys, numpy as np
from PIL import Image
from scipy import ndimage
U=sys.argv[2].rstrip('/')+'/'  # folder holding the character sheet PNGs
OUT=sys.argv[1]  # usage: python3 cutout.py public/roles <sheets-dir>
S=1.376
jobs={ # name: (file, x0,y0,x1,y1 in 2000-scale)
 'builder':('26a8a2b2-image.png',140,145,505,1045),
 'ceo':('a93a275f-image.png',60,105,465,595),
 'scientist':('a93a275f-image.png',895,105,1255,595),
 'detective':('a93a275f-image.png',1305,105,1595,595),
 'engineer':('a93a275f-image.png',870,645,1220,1072),
 'director':('a93a275f-image.png',1235,645,1612,1072),
}
for name,(f,x0,y0,x1,y1) in jobs.items():
    im=np.array(Image.open(U+f).convert('RGB')).astype(int)
    c=im[int(y0*S):int(y1*S), int(x0*S):int(x1*S)]
    r,g,b=c[...,0],c[...,1],c[...,2]
    mx=c.max(-1); mn=c.min(-1)
    thr=120 if name=='builder' else 165
    bgish=(mn>thr)&((mx-mn)<28)          # paper, grid lines, soft shadow
    lab,_=ndimage.label(bgish)
    edge=np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]]))
    bg=np.isin(lab,edge[edge>0])
    fg=~bg
    fl,n=ndimage.label(fg)
    sizes=ndimage.sum(fg,fl,range(1,n+1))
    keep=fl==(np.argmax(sizes)+1)
    keep=ndimage.binary_fill_holes(keep) & (keep | ~bg)
    alpha=ndimage.gaussian_filter(keep.astype(float),0.7)
    rgba=np.dstack([c,(alpha*255).astype(int)]).astype(np.uint8)
    ys,xs=np.where(keep)
    rgba=rgba[ys.min():ys.max()+1, xs.min():xs.max()+1]
    Image.fromarray(rgba,'RGBA').save(f'{OUT}/{name}.png')
    print(name, rgba.shape)
