#!/usr/bin/env python3
"""Mixkit 항목 추출.

⚠️ 2026-08-30 실측 — 음악과 SFX의 페이지 구조가 갈렸다.
  음악  https://mixkit.co/free-stock-music/{mood,tag}/<t>/   → JSON-LD ItemList 그대로 (변경 없음)
  SFX   https://mixkit.co/free-sound-effects/tag/<t>/        → **404**
        https://mixkit.co/free-sound-effects/<t>/            → 200이지만 **JSON-LD 없음**
        → data-audio-player-item-id-value 속성 + item-grid-card__title 로 파싱해야 한다(sfx_items).
  음악 mp3 URL은 JSON-LD의 url 필드가 곧 파일이다 (https://assets.mixkit.co/music/<id>/<id>.mp3).
  SFX  mp3 URL은 https://assets.mixkit.co/active_storage/sfx/<id>/<id>-preview.mp3.
"""
import re,json,urllib.request,datetime,time
UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/126"}
def page(url):
    try: return urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=30).read().decode('utf-8','ignore')
    except Exception as e: return ""
def items(s):
    out=[]
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>',s,flags=re.S):
        try: d=json.loads(m.group(1))
        except: continue
        graph=d.get('@graph',[d]) if isinstance(d,dict) else d
        for g in graph:
            if isinstance(g,dict) and g.get('@type')=='ItemList':
                for it in g.get('itemListElement',[]):
                    out.append({"name":it.get('name'),"type":it.get('@type'),"genre":it.get('genre'),"artist":it.get('byArtist') or it.get('author'),"duration":it.get('duration'),"url":it.get('url') or it.get('contentUrl'),"license":it.get('license'),"copyright":it.get('copyrightNotice'),"published":it.get('datePublished')})
    return out
def sec(d):
    m=re.match(r'PT(?:(\d+)M)?(?:(\d+)S)?',d or ''); return (int(m.group(1) or 0)*60+int(m.group(2) or 0)) if m else 0
def sfx_items(h):
    """SFX 페이지 파싱 (JSON-LD 없음). id·이름·mp3 URL."""
    import html as _h
    out=[]
    for m in re.finditer(r'data-audio-player-item-id-value="(\d+)"',h):
        sid=m.group(1); seg=h[m.start():m.start()+3000]
        t=re.search(r'item-grid-card__title[\s\S]{0,200}?>([^<]{3,70})<',seg)
        out.append({"id":sid,"name":re.sub(r"\s+"," ",_h.unescape(t.group(1))).strip() if t else None,
                    "url":f"https://assets.mixkit.co/active_storage/sfx/{sid}/{sid}-preview.mp3",
                    "license":"Mixkit Sound Effects Free License"})
    return out

Q={"music":["space","ambient","cinematic","piano","meditation","calm","documentary"],"sfx":["whoosh","air","click","riser","drone","transition","interface","beep"]}
res={"generated_at":datetime.datetime.now().astimezone().isoformat(timespec="seconds"),"music":{},"sfx":{}}
for kind,tags in Q.items():
    base="https://mixkit.co/free-stock-music/tag/" if kind=="music" else "https://mixkit.co/free-sound-effects/"
    for tg in tags:
        h=page(base+tg+"/")
        c=items(h) if kind=="music" else sfx_items(h)   # 2026-08-30: SFX는 JSON-LD 없음
        res[kind][tg]=c; print(f"{kind}/{tg}: {len(c)}"); time.sleep(0.5)
json.dump(res,open("mixkit_results.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
print("\n== 음악 후보 (≥70s, 장르 Ambient/Cinematic/Piano/Classical) ==")
seen=set()
for tg,c in res["music"].items():
    for x in c:
        if x['url'] in seen: continue
        seen.add(x['url'])
        if sec(x['duration'])>=70 and (x['genre'] or '') in ('Ambient','Cinematic','Piano','Classical','Electronic','Acoustic'):
            print(f"  [{tg}] {sec(x['duration']):3d}s {x['genre']:<10} {x['name'][:32]:<32} | {str(x['artist'])[:22]:<22} | {x['url']}")
print("\n== SFX 후보 ==  (길이는 다운로드 후 ffprobe로 잰다 — 페이지에 없음)")
seen=set()
for tg,c in res["sfx"].items():
    for x in c[:15]:
        if x['url'] in seen: continue
        seen.add(x['url']); print(f"  [{tg}] {x['id']:>5} {str(x['name'])[:44]:<44} | {x['url']}")
