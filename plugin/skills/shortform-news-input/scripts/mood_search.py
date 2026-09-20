#!/usr/bin/env python3
"""영상 분위기 프로필 → Mixkit mood/tag 페이지 교집합 점수 → 후보 순위"""
import re,json,urllib.request,time,datetime
UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/126"}
def items(url):
    try: s=urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=30).read().decode('utf-8','ignore')
    except Exception: return []
    out=[]
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>',s,flags=re.S):
        try: d=json.loads(m.group(1))
        except: continue
        for g in (d.get('@graph',[d]) if isinstance(d,dict) else d):
            if isinstance(g,dict) and g.get('@type')=='ItemList':
                for it in g.get('itemListElement',[]): out.append(it)
    return out
def sec(d):
    m=re.match(r'PT(?:(\d+)M)?(?:(\d+)S)?',d or ''); return (int(m.group(1) or 0)*60+int(m.group(2) or 0)) if m else 0
# 영상 분위기 프로필 (내레이션·facts에서): 밤하늘 상실(reflective·melancholic), 과학 경고(serious·cautious·ominous 약), 우주(atmospheric·ethereal·space), 마무리 호소(hopeful·reflective)
PROFILE={"mood":{"atmospheric":3,"ethereal":3,"reflective":3,"serious":2,"cautious":2,"mysterious":2,"ominous":1,"melancholic":2,"sombre":1,"calm":1,"meditative":1,"hopeful":1,"tension":1,"futuristic":1,"lonely":1},
         "tag":{"space":3,"science":2,"documentary":2,"environmental":2,"news":1,"technology":1,"cinematic":1},
         "anti":{"energetic":-3,"upbeat":-3,"happy":-3,"cheerful":-3,"epic":-2,"aggressive":-3,"exciting":-2,"fun":-3,"playful":-3,"festive":-3}}
score={}; meta={}
for kind,weights in PROFILE.items():
    base={"mood":"https://mixkit.co/free-stock-music/mood/","tag":"https://mixkit.co/free-stock-music/tag/","anti":"https://mixkit.co/free-stock-music/mood/"}[kind]
    for key,w in weights.items():
        its=items(base+key+"/"); print(f"{kind}/{key}: {len(its)}")
        for it in its:
            u=it.get('url'); 
            if not u: continue
            meta.setdefault(u,{"name":it.get('name'),"artist":it.get('byArtist'),"genre":it.get('genre'),"dur":sec(it.get('duration')),"license":it.get('copyrightNotice'),"hits":[]})
            score[u]=score.get(u,0)+w; meta[u]["hits"].append(f"{key}{'+' if w>0 else ''}{w}")
        time.sleep(0.4)
rank=sorted([(s,u) for u,s in score.items() if meta[u]["dur"]>=70 and s>0],reverse=True)
out=[{"url":u,"score":s,**meta[u]} for s,u in rank]
json.dump({"generated_at":datetime.datetime.now().astimezone().isoformat(timespec="seconds"),"profile":PROFILE,"ranked":out},open('mood_results.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print("\n== 분위기 점수 상위 (≥70s) ==")
for o in out[:16]: print(f"  {o['score']:3d}  {o['dur']:4d}s {str(o['genre'])[:10]:<10} {o['name'][:30]:<30} {str(o['artist'])[:20]:<20} | {' '.join(o['hits'])}")
