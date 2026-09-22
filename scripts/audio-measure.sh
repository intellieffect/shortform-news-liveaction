#!/usr/bin/env bash
# 4-5 믹스 측정 — 통합 LUFS·LRA·TP + 구간 RMS. 사용: npm run audio:measure -- <mp4> [--narr <narration.wav>] [--beats <beats.json>] [--win 이름:시작:길이]...
# 구간: 첫 0.4s(BGM 단독)·첫 1초·마지막 1초 + 내레이션 무음 창(silencedetect −35dB 0.25s, 앞 3·뒤 2) + 엔드카드(beats role=endcard) + --win 추가분.
# 0.4s 미만 창은 ebur128 대신 volumedetect(4편 함정). 기준값은 docs/specs/audio.schema.md 4c.
set -u; FF="${FFMPEG_PATH:-ffmpeg}"; FP="${FFPROBE_PATH:-ffprobe}"
F="$1"; shift; NARR=""; BEATS=""; WINS=()
while [ $# -gt 0 ]; do case "$1" in --narr) NARR="$2"; shift 2;; --beats) BEATS="$2"; shift 2;; --win) WINS+=("$2"); shift 2;; *) shift;; esac; done
DUR=$($FP -v error -show_entries format=duration -of csv=p=0 "$F")
echo "== 통합 ($F, ${DUR}s)"; $FF -hide_banner -i "$F" -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I|LRA|Peak):'
seg(){ local name="$1" ss="$2" t="$3"; local v=$($FF -hide_banner -ss "$ss" -t "$t" -i "$F" -af volumedetect -f null - 2>&1 | grep -oE 'mean_volume: [-0-9.]+' | grep -oE '[-0-9.]+'); printf "%-30s %6s dB   (%ss +%ss)\n" "$name" "${v:-?}" "$ss" "$t"; }
echo "== 구간 RMS (volumedetect mean)"
seg "첫 0.4s(BGM 단독)" 0 0.4; seg "첫 1초" 0 1.0
if [ -n "$NARR" ] && [ -f "$NARR" ]; then
  $FF -hide_banner -i "$NARR" -af silencedetect=n=-35dB:d=0.25 -f null - 2>&1 | grep -oE 'silence_(start|end): [0-9.]+' | paste - - | awk '{print $2, $4}' | awk -v n=0 '{s[n]=$1; e[n]=$2; n++} END{for(i=0;i<n;i++){ if(i<3||i>=n-2) if(e[i]-s[i]>0.25 && s[i]>0.5) print s[i], e[i]-s[i]}}' | while read -r s l; do seg "발화 틈 ${s}s" "$s" "$l"; done
fi
if [ -n "$BEATS" ] && [ -f "$BEATS" ]; then
  E=$(node -e "const b=require(require('path').resolve('$BEATS')).beats.find(x=>x.role==='endcard');if(b)console.log((b.start_sec??b.start)+' '+((b.end_sec??b.end)-(b.start_sec??b.start)))"); [ -n "$E" ] && seg "엔드카드" ${E% *} ${E#* }
fi
seg "마지막 1초" "$(echo "$DUR - 1" | bc)" 1.0
for w in "${WINS[@]:-}"; do
  if [ -n "$w" ]; then seg "${w%%:*}" "$(echo "$w" | cut -d: -f2)" "$(echo "$w" | cut -d: -f3)"; fi
done
exit 0
