#!/usr/bin/env python3
"""asset_brief.json 5비트 — Openverse + Pexels(사진·영상) + Pixabay(사진·영상) + Unsplash. 결과 brief_results.json"""
import json, urllib.request, urllib.parse, subprocess, os, time, datetime
def key(s): return subprocess.check_output(["security","find-generic-password","-a",os.environ["USER"],"-s",s,"-w"]).decode().strip()
PX,PB,US=key("pexels-api-key"),key("pixabay-api-key"),key("unsplash-access-key"); UA="shortform-workflow/1.0 (mj@intellieffect.com)"
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
    except Exception as e: row["openverse_error"]=str(e)
    try:
        d=get(f"https://api.pexels.com/v1/search?query={qe}&per_page=8",{"Authorization":PX})
        row["pexels_photos"]=[{"id":p["id"],"w":p["width"],"h":p["height"],"by":p["photographer"],"page":p["url"],"src":p["src"]["original"],"alt":(p.get("alt") or "")[:70]} for p in d.get("photos",[])]
        d=get(f"https://api.pexels.com/videos/search?query={qe}&per_page=6",{"Authorization":PX})
        row["pexels_videos"]=[{"id":v["id"],"w":v["width"],"h":v["height"],"dur":v["duration"],"by":v["user"]["name"],"page":v["url"],"files":[{"w":f.get("width"),"h":f.get("height"),"link":f["link"]} for f in v["video_files"] if f.get("width")]} for v in d.get("videos",[])]
    except Exception as e: row["pexels_error"]=str(e)
    try:
        d=get(f"https://pixabay.com/api/videos/?key={PB}&q={qe}&per_page=6&safesearch=true")
        row["pixabay_videos"]=[{"id":v["id"],"dur":v["duration"],"by":v["user"],"page":v["pageURL"],"tags":v["tags"][:70],"files":{k:{"w":f["width"],"h":f["height"],"link":f["url"]} for k,f in v["videos"].items() if f.get("width")}} for v in d.get("hits",[])]
    except Exception as e: row["pixabay_error"]=str(e)
    try:
        d=get(f"https://api.unsplash.com/search/photos?query={qe}&per_page=8",{"Authorization":f"Client-ID {US}"})
        row["unsplash"]=[{"id":p["id"],"w":p["width"],"h":p["height"],"by":p["user"]["name"],"page":p["links"]["html"],"src":p["urls"]["raw"],"dl":p["links"]["download_location"],"alt":(p.get("alt_description") or "")[:70]} for p in d.get("results",[])]
    except Exception as e: row["unsplash_error"]=str(e)
    out.append(row); time.sleep(0.8)
json.dump({"generated_at":datetime.datetime.now().astimezone().isoformat(timespec="seconds"),"queries":out},open("brief_results.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
for r in out:
    print(f"\n### {r['beat']} — {r['query']}")
    for k in ("openverse","pexels_photos","pexels_videos","pixabay_videos","unsplash"):
        v=r.get(k)
        if v is None: print(f"  {k}: ERR {r.get(k.split('_')[0]+'_error','')[:50]}"); continue
        print(f"  {k:<14} n={len(v):<2} | "+" ; ".join((f"{i.get('w')}x{i.get('h')} {(i.get('alt') or i.get('title') or i.get('tags') or '')[:38]}" if 'dur' not in i else f"{i['dur']}s {(i.get('tags') or '')[:30]}") for i in v[:3]))
