"""Full-frame thumbnail with measured text spacing and episode accent color."""
from pathlib import Path
import argparse,hashlib,json,sys
from PIL import Image,ImageOps,ImageDraw,ImageFont,ImageColor

# 호출자는 stdout/stderr를 UTF-8로 읽는다. Windows 기본 인코딩(cp949 등)에 맡기지 않는다.
for _stream in (sys.stdout,sys.stderr):
 getattr(_stream,"reconfigure",lambda **_:None)(encoding="utf-8",errors="replace")

def main():
 p=argparse.ArgumentParser();p.add_argument('--project',default='.');p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args()
 here=Path(__file__).resolve().parent
 root=Path(a.project).resolve()
 workspace=(root/json.loads((root/'project.json').read_text(encoding='utf-8'))['workspace']).resolve()
 engine=(root/json.loads((root/'project.json').read_text(encoding='utf-8'))['engine']).resolve()
 preset=json.loads((here/'preset.json').read_text(encoding='utf-8'));job=json.loads(Path(a.input).read_text(encoding='utf-8'))
 def resolve(value):
  if value.startswith('@engine/'):return engine/value[len('@engine/'):]
  v=Path(value);return v if v.is_absolute() else workspace/v
 font=resolve(preset['typography']['font_file']);logo=resolve(preset['layout']['logo']['source']);source=resolve(job['image'])
 if hashlib.sha256(font.read_bytes()).hexdigest()!=preset['typography']['font_sha256']:raise ValueError('지정 Medium 폰트 해시 불일치')
 specs=[dict(s) for s in preset['layout']['title_lines']]
 sizes=job.get('title_sizes_px',[s['size_px'] for s in specs])
 if not isinstance(sizes,list) or len(sizes)!=2:raise ValueError('title_sizes_px는 두 줄의 크기 배열이어야 합니다')
 for spec,size in zip(specs,sizes):
  if type(size) is not int or not spec['min_size_px']<=size<=spec['size_px']:raise ValueError('글자 크기는 기본값의 85~100% 범위여야 합니다')
  spec['size_px']=size
 if 'accent_color' in job:
  ImageColor.getrgb(job['accent_color'])
  specs[1]['color']=job['accent_color']
 lines=job['title_lines']
 if len(lines)!=2 or any(not isinstance(t,str) or not t.strip() or '\n' in t for t in lines):raise ValueError('비어 있지 않은 제목 두 줄이 필요합니다')
 width=preset['canvas']['width'];height=preset['canvas']['height']
 im=Image.new('RGB',(width,height),preset['layout']['background']);d=ImageDraw.Draw(im)
 title_fonts=[]
 for text,spec in zip(lines,specs):
  f=ImageFont.truetype(str(font),spec['size_px']);box=d.textbbox((0,0),text,font=f)
  while box[2]-box[0]>spec['max_width_px'] and spec['size_px']>spec['min_size_px']:
   spec['size_px']-=1;f=ImageFont.truetype(str(font),spec['size_px']);box=d.textbbox((0,0),text,font=f)
  if box[2]-box[0]>spec['max_width_px']:raise ValueError('최소 크기에서도 제목 영역을 넘습니다. 의미를 유지하며 문구를 다듬으세요: '+text)
  title_fonts.append(f)
 bg=Image.open(source).convert('RGB')
 if 'image_crop' in job:
  x,y,w,h=job['image_crop']
  if min(x,y)<0 or min(w,h)<=0 or x+w>1.000001 or y+h>1.000001:raise ValueError('image_crop은 이미지 안의 정규화 x,y,width,height여야 합니다')
  bw,bh=bg.size;bg=bg.crop((round(x*bw),round(y*bh),round((x+w)*bw),round((y+h)*bh)))
 area=preset['layout']['hero'];bg=ImageOps.fit(bg,(area['width'],area['height']),method=Image.Resampling.LANCZOS)
 im.paste(bg,(area['x'],area['y']))
 shade=preset['layout']['shade'];opacity=job.get('text_shade_opacity',shade['opacity'])
 if type(opacity) not in (int,float) or not 0<=opacity<=0.8:raise ValueError('text_shade_opacity는 0~0.8이어야 합니다')
 overlay=Image.new('RGBA',im.size,(0,0,0,0));od=ImageDraw.Draw(overlay)
 for y in range(shade['fade_end_y']):
  fade=max(0,(y-shade['hold_end_y'])/(shade['fade_end_y']-shade['hold_end_y']))
  alpha=round(255*opacity*(1-fade)**0.7)
  od.line((0,y,width,y),fill=(0,0,0,alpha))
 im=Image.alpha_composite(im.convert('RGBA'),overlay).convert('RGB');d=ImageDraw.Draw(im)
 layout=preset['layout'];place=layout['logo']
 top=max(layout['title_top'],place['y']+place['height']+layout['logo_title_gap_px'])
 for text,spec,f in zip(lines,specs,title_fonts):
  box=d.textbbox((0,0),text,font=f);ink_width=box[2]-box[0];ink_height=box[3]-box[1]
  left=(width-ink_width)//2
  if left<layout['safe_margin_x'] or top+ink_height>height-100:raise ValueError('제목이 안전 여백을 넘습니다')
  d.text((left-box[0],top-box[1]),text,font=f,fill=spec['color'],stroke_width=0)
  spec['ink_bbox']=[left,top,left+ink_width,top+ink_height]
  top+=ink_height+layout['line_gap_px']
 place=preset['layout']['logo'];mark=Image.open(logo).convert('RGBA');mark.thumbnail((place['width'],place['height']),Image.Resampling.LANCZOS)
 # Align to the video logo box at top-right, preserving aspect.
 im.paste(mark,(place['x']+place['width']-mark.width,place['y']),mark)
 out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
 if out.exists():raise FileExistsError('기존 산출물을 보존하세요: '+str(out))
 im.save(out);im.resize((270,480),Image.Resampling.LANCZOS).save(out.with_name(out.stem+'-preview.png'))
 dependencies=[Path(a.input).resolve(),here/'preset.json',here/'GUIDE.md',Path(__file__).resolve(),font,logo,source]
 def record_path(f):
  f=f.resolve()
  if f.is_relative_to(engine):return '@engine/'+f.relative_to(engine).as_posix()
  if f.is_relative_to(workspace):return f.relative_to(workspace).as_posix()
  raise ValueError('입력 자료를 workspace 안에 복사한 뒤 사용하세요: '+str(f))
 out.with_suffix('.inputs.json').write_text(json.dumps([{'path':record_path(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in dependencies],ensure_ascii=False,indent=2),encoding='utf-8')
 out.with_suffix('.layout.json').write_text(json.dumps({'title_lines':specs,'hero':area,'logo':place,'text_shade_opacity':opacity},ensure_ascii=False,indent=2),encoding='utf-8')
 print(out)
if __name__=='__main__':main()
