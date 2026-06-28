# Screws 3D

3D 퍼즐 게임. 같은 색 나사 3개를 상자에 모으고, 상자 색에 안 맞는 나사는 임시 보관함에 잠시 두면서, 모든 부품을 분해하세요.

플레이: <https://screws-3d.vercel.app/>

## 규칙

- 화면 상단에 **활성 상자 2개** (색 고정) + **임시 보관함 5칸** (어떤 색이든 가능)
- 나사를 탭하면 풀려 날아감
  - 색이 활성 상자와 같으면 → 상자로
  - 다르면 → 첫 빈 임시 슬롯으로
- 상자에 같은 색 3개가 모이면 → 클리어, 큐에서 다음 색이 슬라이드 다운
- 새 상자 색과 같은 임시 나사가 있으면 → 자동 이송 (연쇄 가능)
- **게임오버**: 임시 보관함 5/5 + 어떤 자동 이송도 불가능 → 즉시 실패
- **승리**: 모든 나사 정리 + 모든 부품 해체

## 조작

- **드래그**: 카메라 360° 회전
- **핀치 / 휠**: 줌
- **나사 탭**: 풀기 (가려진 나사는 못 누름)
- 좌상단 **☰**: 일시정지 메뉴 (재시작 / 다음 / 계속)

## 로컬 실행

```powershell
cd C:\Users\user\screws-3d
python -m http.server 8765
```

브라우저에서 `http://localhost:8765/` 접속.

규칙 단위 테스트: `http://localhost:8765/tests/2026-06-28-game-rules.html`

## 구조

```
index.html                        시작 화면 + HUD + 일시정지 / 결과 패널
styles.css                        모바일 우선 레이아웃 + safe-area + 일시정지 카드
src/
  main.js                         씬 / 카메라 / OrbitControls / BinView / viewProj / 입력
  game.js                         상태 머신 (PLAYING / 캐스케이드 게이트 / 승패)
  objects.js                      Screw + Plank
  levels.js                       기준 별장 한 레벨 (22 부품 / 84 나사 / 6색)
  audio.js                        WebAudio 효과음
  2026-06-28-collector-state.js   순수 규칙 엔진 (상자 / 큐 / 버퍼 / 자동이송)
  2026-06-28-level-validator.js   레벨 정합성 검사
  2026-06-28-bin-view.js          DOM/SVG 상자 + 버퍼 + 헤드 토큰
tests/
  2026-06-28-game-rules.html      G-01 ~ G-10 + X-01 ~ X-02 인수 테스트
  2026-06-28-game-rules.js
docs/
  2026-06-28-stage-1-6-report.md  Stage 1~6 진행 보고서
```

## 기술 스택

- Three.js r160 (CDN, ES modules)
- 절차적 우드/박공지붕/창문/문 메시
- DOM/SVG 상단 UI (수집 상자 + 임시 보관함 + 헤드 토큰)
- WebAudio 신디 SFX
- 빌드 도구 없음, 정적 호스팅
- Vercel 자동 배포 (master 푸시 시)
