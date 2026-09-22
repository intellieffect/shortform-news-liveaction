"""Composite preparation only: preserve generated motion, remove black plate."""
from pathlib import Path
import numpy as np
from PIL import Image
import sys
root=Path(sys.argv[1])
(root/'frames').mkdir(exist_ok=True)
for p in sorted((root/'decoded').glob('*.png')):
    rgb=np.asarray(Image.open(p).convert('RGB'),dtype=np.float32)/255
    m=rgb.max(axis=2)
    a=np.clip((m-3/255)/(210/255),0,1)
    # Silver satellite is opaque; luminous ribbons and atmospheric band translucent.
    yy,xx=np.mgrid[0:rgb.shape[0],0:rgb.shape[1]]
    satellite=(xx>95)&(xx<430)&(yy>310)&(yy<680)
    a=np.where(satellite,np.clip((m-3/255)/.22,0,1),a)
    straight=np.clip(rgb/np.maximum(a[...,None],1/255),0,1)
    Image.fromarray(np.uint8(np.dstack((straight,a))*255)).save(root/'frames'/p.name)
