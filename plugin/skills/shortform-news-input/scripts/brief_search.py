#!/usr/bin/env python3
"""asset_brief.json 5비트 — Openverse + Pexels(사진·영상) + Pixabay(사진·영상) + Unsplash. 결과 brief_results.json"""
import json, urllib.request, urllib.parse, subprocess, os, sys, time, datetime
def _dotenv(path, name):
    """`.env` 한 줄에서 값을 꺼낸다. 값이 비면 «안 적은 것»으로 본다."""
    try:
        text = open(path, encoding="utf-8-sig").read()   # Windows 편집기가 붙이는 BOM 제거
    except OSError:
        return None
    except UnicodeDecodeError:
        sys.exit(f"{path} 를 UTF-8로 읽을 수 없다 — .env 는 UTF-8로 저장한다"
                 " (PowerShell 은 `Out-File -Encoding utf8`).")
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        key, value = line.split("=", 1)
        if key.strip() != name: continue
        value = value.strip()
        if len(value) > 1 and value[0] in "'\"" and value[-1] == value[0]:
            return value[1:-1] or None
        for i in range(1, len(value)):          # 값 뒤에 붙인 주석을 자른다
            if value[i] == "#" and value[i - 1] in " \t":
                value = value[:i]; break
        return value.strip() or None
    return None
def _env(name, keychain=None, default=None):
    """키·설정 읽기 — 환경변수 → 상위 경로의 .env → (macOS일 때만) 키체인. 저장소 `.env.example` 참고.
    빈 값은 없는 것으로 본다 — `.env.example` 을 복사해 일부만 채우는 것이 보통이라서다."""
    value = (os.environ.get(name) or "").strip()
    if value: return value
    seen = set()
    for start in (os.getcwd(), os.path.dirname(os.path.abspath(__file__))):
        d = os.path.abspath(start)
        while d not in seen:
            seen.add(d)
            value = _dotenv(os.path.join(d, ".env"), name)
            if value: return value
            nd = os.path.dirname(d)
            if nd == d: break
            d = nd
    if keychain and sys.platform == "darwin":
        # 항목이 없을 때 security 가 제 에러를 찍어 우리 안내를 덮으므로 삼킨다.
        try:
            value = subprocess.check_output(["security", "find-generic-password", "-a", os.environ.get("USER", ""), "-s", keychain, "-w"], stderr=subprocess.DEVNULL).decode().strip()
            if value: return value
        except Exception: pass
    if default is not None: return default
    sys.exit(f"{name} 가 없다 — 저장소 루트 `.env` 에 {name}=... 를 넣는다 (`.env.example` 참고).")
_contact = _env("SHORTFORM_CONTACT", default="")
UA = f"shortform-workflow/1.0 ({_contact})" if _contact else "shortform-workflow/1.0"
PX = _env("PEXELS_API_KEY", "pexels-api-key")
PB = _env("PIXABAY_API_KEY", "pixabay-api-key")
US = _env("UNSPLASH_ACCESS_KEY", "unsplash-access-key")
# 키가 오류 문자열을 타고 결과 JSON·화면으로 새지 않게 지운다.
_SECRETS = [v for v in (PX, PB, US) if v]
def _safe(value):
    text = str(value)
    for secret in _SECRETS: text = text.replace(secret, "***")
    return text
def get(url,h={}): return json.load(urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":UA,**h}),timeout=30))
Q=[("b10","full moon close up night sky"),("b10","very bright light in night sky glare"),
   ("b11","person silhouette looking up night sky city"),("b11","city night sky timelapse stars"),
   ("b14","satellite trails long exposure many streaks"),("b14","starlink satellites streaks night sky"),
   ("b15","light pollution sky glow milky way comparison"),("b15","milky way fading sky glow timelapse"),
   ("b16","observatory telescope dome interior"),("b16","large telescope mirror close up")]
out=[]
for beat,q in Q:
    qe=urllib.parse.quote(q); row={"beat":beat,"query":q}
    try:
        d=get("https://api.openverse.org/v1/images/?"+urllib.parse.urlencode({"q":q,"license_type":"commercial,modification","page_size":8}))
        row["openverse"]=[{"id":r["id"],"title":(r.get("title") or "")[:70],"creator":r.get("creator"),"source":r.get("source"),"license":r["license"],"w":r.get("width"),"h":r.get("height"),"url":r.get("url"),"page":r.get("foreign_landing_url")} for r in d.get("results",[]) if (r.get("width") or 0)>=1500]
    except Exception as e: row["openverse_error"]=_safe(e)
    try:
        d=get(f"https://api.pexels.com/v1/search?query={qe}&per_page=8",{"Authorization":PX})
        row["pexels_photos"]=[{"id":p["id"],"w":p["width"],"h":p["height"],"by":p["photographer"],"page":p["url"],"src":p["src"]["original"],"alt":(p.get("alt") or "")[:70]} for p in d.get("photos",[])]
        d=get(f"https://api.pexels.com/videos/search?query={qe}&per_page=6",{"Authorization":PX})
        row["pexels_videos"]=[{"id":v["id"],"w":v["width"],"h":v["height"],"dur":v["duration"],"by":v["user"]["name"],"page":v["url"],"files":[{"w":f.get("width"),"h":f.get("height"),"link":f["link"]} for f in v["video_files"] if f.get("width")]} for v in d.get("videos",[])]
    except Exception as e: row["pexels_error"]=_safe(e)
    try:
        d=get(f"https://pixabay.com/api/videos/?key={urllib.parse.quote(PB, safe='')}&q={qe}&per_page=6&safesearch=true")
        row["pixabay_videos"]=[{"id":v["id"],"dur":v["duration"],"by":v["user"],"page":v["pageURL"],"tags":v["tags"][:70],"files":{k:{"w":f["width"],"h":f["height"],"link":f["url"]} for k,f in v["videos"].items() if f.get("width")}} for v in d.get("hits",[])]
    except Exception as e: row["pixabay_error"]=_safe(e)
    try:
        d=get(f"https://api.unsplash.com/search/photos?query={qe}&per_page=8",{"Authorization":f"Client-ID {US}"})
        row["unsplash"]=[{"id":p["id"],"w":p["width"],"h":p["height"],"by":p["user"]["name"],"page":p["links"]["html"],"src":p["urls"]["raw"],"dl":p["links"]["download_location"],"alt":(p.get("alt_description") or "")[:70]} for p in d.get("results",[])]
    except Exception as e: row["unsplash_error"]=_safe(e)
    out.append(row); time.sleep(0.8)
json.dump({"generated_at":datetime.datetime.now().astimezone().isoformat(timespec="seconds"),"queries":out},open("brief_results.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
for r in out:
    print(f"\n### {r['beat']} — {r['query']}")
    for k in ("openverse","pexels_photos","pexels_videos","pixabay_videos","unsplash"):
        v=r.get(k)
        if v is None: print(f"  {k}: ERR {r.get(k.split('_')[0]+'_error','')[:50]}"); continue
        print(f"  {k:<14} n={len(v):<2} | "+" ; ".join((f"{i.get('w')}x{i.get('h')} {(i.get('alt') or i.get('title') or i.get('tags') or '')[:38]}" if 'dur' not in i else f"{i['dur']}s {(i.get('tags') or '')[:30]}") for i in v[:3]))
