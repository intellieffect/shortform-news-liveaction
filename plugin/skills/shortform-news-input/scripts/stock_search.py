#!/usr/bin/env python3
"""Pexels / Pixabay / Unsplash 검색 — 비트별 10쿼리, 사진+영상. 키는 키체인. 결과 → stock_results.json"""
import json, urllib.request, urllib.parse, subprocess, os, time, datetime
def key(s): return subprocess.check_output(["security","find-generic-password","-a",os.environ["USER"],"-s",s,"-w"]).decode().strip()
PX, PB, US = key("pexels-api-key"), key("pixabay-api-key"), key("unsplash-access-key")
UA="shortform-workflow/1.0 (mj@intellieffect.com)"
def get(url, headers={}):
    r=urllib.request.Request(url, headers={"User-Agent":UA, **headers}); return json.load(urllib.request.urlopen(r, timeout=30))
Q=[("b01_b21","satellite trails night sky long exposure"),("b02","starlink satellite train night sky"),("b02alt","earth orbit satellites"),
   ("b09","space mirror satellite sunlight"),("b11","light pollution city night sky"),("b12_b13","Paranal Very Large Telescope"),
   ("b16","telescope dome milky way night"),("b17a","asteroid"),("b17b","earth atmosphere from space horizon"),("b19","milky way beach shoreline night")]
out=[]
for beat,q in Q:
    row={"beat":beat,"query":q}
    qe=urllib.parse.quote(q)
    # Pexels photos + videos
    try:
        d=get(f"https://api.pexels.com/v1/search?query={qe}&per_page=8&orientation=portrait",{"Authorization":PX})
        row["pexels_photos"]={"total":d.get("total_results"),"items":[{"id":p["id"],"w":p["width"],"h":p["height"],"photographer":p["photographer"],"url":p["url"],"src":p["src"]["original"],"alt":(p.get("alt") or "")[:80]} for p in d.get("photos",[])]}
        d=get(f"https://api.pexels.com/videos/search?query={qe}&per_page=6&orientation=portrait",{"Authorization":PX})
        row["pexels_videos"]={"total":d.get("total_results"),"items":[{"id":v["id"],"w":v["width"],"h":v["height"],"dur":v["duration"],"user":v["user"]["name"],"url":v["url"],"files":[{"q":f.get("quality"),"w":f.get("width"),"h":f.get("height"),"link":f["link"]} for f in v["video_files"] if f.get("width")]} for v in d.get("videos",[])]}
    except Exception as e: row["pexels_error"]=str(e)
    # Pixabay photos + videos
    try:
        d=get(f"https://pixabay.com/api/?key={PB}&q={qe}&image_type=photo&orientation=vertical&min_width=1080&per_page=8&safesearch=true")
        row["pixabay_photos"]={"total":d.get("totalHits"),"items":[{"id":p["id"],"w":p["imageWidth"],"h":p["imageHeight"],"user":p["user"],"url":p["pageURL"],"src":p.get("largeImageURL"),"tags":p["tags"][:80]} for p in d.get("hits",[])]}
        d=get(f"https://pixabay.com/api/videos/?key={PB}&q={qe}&per_page=6&safesearch=true")
        row["pixabay_videos"]={"total":d.get("totalHits"),"items":[{"id":v["id"],"dur":v["duration"],"user":v["user"],"url":v["pageURL"],"tags":v["tags"][:80],"files":{k:{"w":f["width"],"h":f["height"],"link":f["url"]} for k,f in v["videos"].items() if f.get("width")}} for v in d.get("hits",[])]}
    except Exception as e: row["pixabay_error"]=str(e)
    # Unsplash photos
    try:
        d=get(f"https://api.unsplash.com/search/photos?query={qe}&per_page=8&orientation=portrait",{"Authorization":f"Client-ID {US}"})
        row["unsplash_photos"]={"total":d.get("total"),"items":[{"id":p["id"],"w":p["width"],"h":p["height"],"user":p["user"]["name"],"url":p["links"]["html"],"src":p["urls"]["raw"],"download_location":p["links"]["download_location"],"alt":(p.get("alt_description") or "")[:80]} for p in d.get("results",[])]}
    except Exception as e: row["unsplash_error"]=str(e)
    out.append(row); time.sleep(0.8)
json.dump({"generated_at":datetime.datetime.now().astimezone().isoformat(timespec="seconds"),"queries":out},open("stock_results.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
for r in out:
    print(f"\n### {r['beat']} — {r['query']}")
    for k in ("pexels_photos","pexels_videos","pixabay_photos","pixabay_videos","unsplash_photos"):
        v=r.get(k)
        if not v: print(f"  {k}: ERR {r.get(k.split('_')[0]+'_error','')[:60]}"); continue
        tops=v["items"][:3]
        desc="; ".join((f"{i.get('w')}x{i.get('h')} {i.get('alt') or i.get('tags') or ''}"[:45] if 'dur' not in i else f"{i['dur']}s {(i.get('tags') or '')[:30]}") for i in tops)
        print(f"  {k:<16} total={v['total']:<6} | {desc}")
