"""motion.json 생성기 — narration.txt 토큰(공백 분리)에서 앵커를 찾는다. 실제 narration.json 토큰과 동일해야 editorial:check가 통과한다."""
import json, hashlib, sys
lines=[l.strip() for l in open('narration.txt',encoding='utf-8') if l.strip()]
tok={f"s{i+1:02d}":l.split() for i,l in enumerate(lines)}
def A(line,word,edge='start',off=0,nth=0):
    ws=tok[line]; idx=[i for i,w in enumerate(ws) if w.startswith(word)]
    if not idx: raise SystemExit(f"no token {word} in {line}: {ws}")
    return {"anchor":{"line":line,"token_index":idx[nth],"word":ws[idx[nth]],"edge":edge,"offset_frames":off}}
def last(line): return tok[line][-1]
E=[]
def ev(id,concept,element,kind,f,s,t,e,why,easing=("ease-out","ease-in-out","ease-in"),dep=[],co=[]):
    E.append({"id":id,"concept_id":concept,"element_id":element,"kind":kind,"timing":{"from":f,"settled":s,"to":t,"end":e},"easing":{"enter":easing[0],"move":easing[1],"exit":easing[2]},"depends_on":dep,"coexist_with":co,"why":why})
L=last
# leak s01-s03
ev("recon_note_show","leak","recon_note","label",A("s01","사십구",'start',0),A("s01","사십구",'start',8),A("s03",L("s03"),'end',-2),A("s03",L("s03"),'end',6),"생성 장면임을 첫 화면부터 표기")
ev("name_reveal","leak","planet_name","label",A("s03","엘에이치에스",'start',-2),A("s03","엘에이치에스",'start',10),A("s03",L("s03"),'end',-2),A("s03",L("s03"),'end',6),"이름을 말할 때 이름·거리를 보여준다")
# conditions s04-s05
ev("cond_reveal","conditions","cond_list","label",A("s04","단단한",'start',-2),A("s04","그리고",'end',8),A("s05",L("s05"),'end',-2),A("s05",L("s05"),'end',8),"세 항목을 발화 순서대로 드러내고 끝까지 유지")
ev("goldilocks","conditions","goldilocks","diagram",A("s05","골디락스",'start',-6),A("s05","골디락스",'end',6),A("s05","앞의",'start',20),A("s05","앞의",'start',30),"별 주위 띠와 행성 위치")
ev("cond_check","conditions","cond_list","diagram",A("s05","앞의",'start',0),A("s05","갖췄습니다.",'end',0),A("s05",L("s05"),'end',-2),A("s05",L("s05"),'end',8),"위 두 항목에 확인 표시, '대기'는 비움",dep=["cond_reveal"])
# threat s06-s07
ev("star_label","threat","star_label","label",A("s06","적색왜성.",'start',-2),A("s06","적색왜성.",'start',10),A("s07","트라피스트",'start',-8),A("s07","트라피스트",'start',0),"별 라벨")
ev("strip_push","threat","halo","motion",A("s06","강한",'start',-2),A("s06","벗겨내곤",'end',0),A("s07","트라피스트",'start',-8),A("s07","트라피스트",'start',0),"복사가 내려와 halo를 별 반대편으로 밀어내고 얇게 만든다",("linear","ease-in-out","ease-in"))
ev("trappist_show","threat","trappist_diagram","diagram",A("s07","트라피스트",'start',-4),A("s07","트라피스트",'start',12),A("s07",L("s07"),'end',-2),A("s07",L("s07"),'end',8),"TRAPPIST-1 개념도로 전환")
ev("trappist_label","threat","trappist_label","label",A("s07","행성들에선",'start',-2),A("s07","행성들에선",'start',10),A("s07",L("s07"),'end',-2),A("s07",L("s07"),'end',8),"개념도·귀속 표기",dep=["trappist_show"])
ev("recon_note2_show","threat","recon_note2","label",A("s06","문제는",'start',0),A("s06","문제는",'start',8),A("s07",L("s07"),'end',-2),A("s07",L("s07"),'end',8),"재구성 표기")
# model s08-s09
ev("model_note_show","model","model_note","label",A("s08","그런데",'start',0),A("s08","그런데",'start',10),A("s09",L("s09"),'end',-2),A("s09",L("s09"),'end',6),"모델 예측 표기")
ev("light_rise","model","light_gas","motion",A("s08","가벼운",'start',-4),A("s08","나가고,",'end',0),A("s09",L("s09"),'end',-2),A("s09",L("s09"),'end',6),"밝은 작은 입자가 위로 떠올라 일부만 림 밖으로 흩어진다")
ev("heavy_sink","model","heavy_gas","motion",A("s08","무거운",'start',-4),A("s08","남습니다.",'end',0),A("s09",L("s09"),'end',-2),A("s09",L("s09"),'end',6),"어두운 큰 입자가 아래로 내려가 표면 근처에 모인다",dep=["light_rise"])
ev("layer_labels","model","layer_labels","label",A("s09","그렇다면",'start',-2),A("s09","그렇다면",'start',10),A("s09",L("s09"),'end',-2),A("s09",L("s09"),'end',6),"층이 완성된 뒤 위·아래 라벨",dep=["heavy_sink"])
# observation s10-s12
ev("telescope_show","observation","telescope_scene","media",A("s10","이천이십사년,",'start',0),A("s10","이천이십사년,",'start',8),A("s10","행성이",'start',-4),A("s10","행성이",'start',8),"실존 시설 실사")
ev("telescope_label","observation","telescope_label","label",A("s10","칠레",'start',-2),A("s10","칠레",'start',10),A("s10","행성이",'start',-6),A("s10","행성이",'start',2),"망원경 이름·장소·연도",dep=["telescope_show"])
ev("transit_move","observation","transit_scene","motion",A("s10","행성이",'start',0),A("s10","잡았습니다.",'end',0),A("s12",L("s12"),'end',-2),A("s12",L("s12"),'end',8),"행성이 별 원반 앞을 가로지른다",("ease-out","linear","ease-in"))
ev("spectrum_show","observation","spectrum","diagram",A("s11","별빛을",'start',-2),A("s11","펼치면,",'end',4),A("s12",L("s12"),'end',-2),A("s12",L("s12"),'end',8),"별빛을 색깔별로 펼친 띠가 나타난다",dep=["transit_move"])
ev("spectrum_label","observation","spectrum_label","label",A("s11","펼치면,",'start',0),A("s11","펼치면,",'end',6),A("s12",L("s12"),'end',-2),A("s12",L("s12"),'end',8),"띠가 무엇인지 표기",dep=["spectrum_show"])
ev("helium_dip","observation","helium_line","diagram",A("s11","헬륨이",'start',-2),A("s11","남습니다.",'end',0),A("s12",L("s12"),'end',-2),A("s12",L("s12"),'end',8),"띠의 한 지점이 어두워져 선이 남는다",dep=["spectrum_show"])
ev("obs_note_show","observation","obs_note","label",A("s10","행성이",'start',0),A("s10","행성이",'start',8),A("s12",L("s12"),'end',-2),A("s12",L("s12"),'end',8),"원리 도해 표기")
# meaning s13-s15
ev("first_label","meaning","first_label","label",A("s13","새는",'start',-2),A("s13","새는",'start',10),A("s13",L("s13"),'end',10),A("s13",L("s13"),'end',18),"같은 장면 위에 '첫 증거·처음' 라벨")
ev("cond_recall","meaning","cond_recall","label",A("s13","골디락스",'start',-2),A("s13","골디락스",'start',10),A("s14","온실효과를",'start',-6),A("s14","온실효과를",'start',2),"세 조건 모두 확인",dep=["first_label"])
ev("heavy_layer","meaning","heavy_layer","diagram",A("s14","아래",'start',-2),A("s14","남은",'end',4),A("s15",L("s15"),'end',-2),A("s15",L("s15"),'end',8),"아래 남은 무거운 기체층 띠")
ev("ocean_label","meaning","ocean_label","label",A("s14","온실효과를",'start',-2),A("s14","온실효과를",'start',10),A("s15","이",'start',-6),A("s15","이",'start',2),"조건 문구와 바다 가능성을 함께",dep=["heavy_layer"])
ev("age_label","meaning","age_label","label",A("s15","삼십억",'start',-2),A("s15","삼십억",'start',10),A("s15",L("s15"),'end',-2),A("s15",L("s15"),'end',8),"30억년 유지 가능성")
# close s16-s17
ev("variability_note","close","variability_note","label",A("s16","다만",'start',0),A("s16","다만",'start',10),A("s16",L("s16"),'end',14),A("s16",L("s16"),'end',22),"2025 미검출·변동 해석")
ev("credits_show","close","credits","label",A("s17","새어",'start',0),A("s17","새어",'start',10),A("s17",L("s17"),'end',40),A("s17",L("s17"),'end',48),"출처 크레딧")
cues=[
 {"id":"strip_rush","kind":"sfx","bind":{"event_id":"strip_push","point":"from","offset_frames":0},"asset":"audio/sfx_rush.wav","gain_db":-14},
 {"id":"rise_shimmer","kind":"sfx","bind":{"event_id":"light_rise","point":"from","offset_frames":0},"asset":"audio/sfx_shimmer.wav","gain_db":-16},
 {"id":"dip_tick","kind":"sfx","bind":{"event_id":"helium_dip","point":"settled","offset_frames":0},"asset":"audio/sfx_tick.wav","gain_db":-12}
]
sha=sys.argv[1] if len(sys.argv)>1 else "TBD"
total=int(sys.argv[2]) if len(sys.argv)>2 else 2700
json.dump({"schema_version":"1.0","pilot":"hani_1269147","fps":30,"total_frames":total,"narration_word_sha256":sha,"events":E,"audio_cues":cues},open('motion.json','w'),ensure_ascii=False,indent=1)
print(len(E),"events")
