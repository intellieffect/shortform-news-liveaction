# 기술 검증 범위

새 편은 source plugin1.9.0, 복원체크아웃 HEAD7be33628에서 직접 실행했다. config/production-defaults 및 프로필1.2.0·수령로고 자동연결을 유지했다. 호스트가 설치 스킬을 자동 로드했다는 증거는 없으므로 host_session_load=unverified를 유지.

표준 produce timeline/sync/proof/render 및 렌더 전 설명/모션/자막 가드 통과 기록은 run.json과 out/pilots/본편/production/*.log에 있다. 새 장면 파일 targeted eslint 통과. 전체 npm run lint의 TypeScript는 기존 docs/research/2026-09-06-case-reference-guide/snapshots의 끊어진 import/암묵 any로 실패했다. unrelated 기존문서는 수정하지 않았다. 이 결과는 repository-lint.log에 보존.

렌더 완료 검사는 MP4 해상도/FPS/프레임수/AV길이/전체디코드를 검사한다. 연속 시청 또는 청취를 대신하지 않는다. 독립 시각 검수는 완성MP4추출 원해상/360×640 표본, 음향은 gpt-audio-1.5 실제 오디오입력 응답을 별도 근거로 사용한다. 도구가 말한 시간코드가 틀리면 실측발화시각과 구별하고 정확한시각으로 인용하지 않는다.

외부 게시·메시지 전송·다른 worktree 변경·main 병합 없음. 기존N44원고/제작폴더/평가는 입력으로 사용하지 않았다.
