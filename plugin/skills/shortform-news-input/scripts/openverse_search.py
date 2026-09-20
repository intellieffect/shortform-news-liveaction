#!/usr/bin/env python3
"""Openverse 무키 검색 — 비트별 쿼리, 상업적 사용+수정 허용 라이선스만. 결과 → openverse_results.json + .md"""
import json, urllib.request, urllib.parse, time, datetime
Q = [
 ("b01_b21", "satellite trails night sky long exposure", "위성 궤적 (ESO eso2607a 대체 후보)"),
 ("b02",     "starlink satellite train night sky",        "스타링크 열차 (Starlink CTIO 대체 후보)"),
 ("b02alt",  "earth orbit satellites illustration",       "궤도 위성 추상"),
 ("b09",     "space mirror satellite reflect sunlight",   "우주거울 (생성 유지 중)"),
 ("b11",     "light pollution city night sky",            "빛공해 도시 (생성 유지 중)"),
 ("b12_b13", "Paranal Very Large Telescope",              "VLT (커먼즈 potw2321b 대체 후보)"),
 ("b16",     "telescope dome milky way night",            "돔 실루엣 (ESO uhd0654 대체 후보)"),
 ("b17a",    "asteroid Bennu",                            "소행성 (NASA 1041px 대체 후보)"),
 ("b17b",    "earth limb atmosphere from space airglow",  "지구 림·대기 (ISS066 대체 후보)"),
 ("b19",     "milky way beach shoreline night",           "천상의 해변 (생성 유지 중)"),
]
out=[]
for key,q,why in Q:
    url="https://api.openverse.org/v1/images/?"+urllib.parse.urlencode({"q":q,"license_type":"commercial,modification","page_size":10,"mature":"false"})
    try:
        d=json.load(urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"shortform-workflow/1.0 (mj@intellieffect.com)"}),timeout=30))
    except Exception as e:
        out.append({"beat":key,"query":q,"why":why,"error":str(e)}); continue
    rs=[]
    for r in d.get("results",[]):
        rs.append({"id":r["id"],"title":(r.get("title") or "")[:80],"creator":r.get("creator"),"source":r.get("source"),"provider":r.get("provider"),
                   "license":f'{r["license"]} {r.get("license_version","")}'.strip(),"w":r.get("width"),"h":r.get("height"),
                   "url":r.get("url"),"foreign_landing_url":r.get("foreign_landing_url"),"attribution":r.get("attribution")})
    out.append({"beat":key,"query":q,"why":why,"result_count":d.get("result_count"),"results":rs})
    time.sleep(1.2)
json.dump({"generated_at":datetime.datetime.now().astimezone().isoformat(timespec="seconds"),"api":"openverse v1 (anonymous)","filters":"license_type=commercial,modification","queries":out},open("openverse_results.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
for o in out:
    print(f"\n### {o['beat']} — {o['query']}  ({o['why']})  총 {o.get('result_count')}건")
    if "error" in o: print("  ERROR", o["error"]); continue
    big=[r for r in o["results"] if (r["w"] or 0)>=2000]
    for r in o["results"][:6]:
        flag="★" if (r["w"] or 0)>=2000 else " "
        print(f"  {flag} {r['w']}x{r['h']} {r['license']:<8} {r['source']:<12} {r['creator'] or '-':<22} {r['title'][:50]}")
    print(f"  ≥2000px: {len(big)}/{len(o['results'])}")
