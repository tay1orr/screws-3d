# Screwdom 3D — 진행 인계 문서 (다음 라운드용)

작성일: 2026-06-29
대상 폴더: `C:\Users\user\Documents\인공지능 기초\screws-3d`
배포: <https://screws-3d.vercel.app/>
GitHub: <https://github.com/tay1orr/screws-3d> (브랜치 `master`)

이 문서는 **다음 작업자(또는 다음 라운드의 자신)** 가 빠르게 맥락을 잡고 이어서 작업할 수 있도록 정리한 것이다.

---

## 1. 현재 상태 한 줄 요약

13 레벨 캠페인 + 진행도 저장 + 이스터에그까지 안정화된 상태. 가장 최근 푸시는 `2b96d0a Add master layered campaign levels with deadlock-checked solutions`.

---

## 2. 작업 경로 (반드시 이 폴더)

```text
C:\Users\user\Documents\인공지능 기초\screws-3d
```

- Git 저장소 루트 + Vercel 배포 루트.
- 상위 폴더나 새 하위 프로젝트 만들지 않는다.
- **주의**: 과거에 `C:\Users\user\screws-3d` 라는 다른 폴더에서 작업한 기록이 있다. 같은 GitHub 원격을 가리키지만 **여기 (`Documents\인공지능 기초\screws-3d`) 가 정답 폴더**. 다른 폴더는 무시.

---

## 3. 13 레벨 라인업

| # | 레벨 | 정의 위치 | 등급 | 비고 |
|---|---|---|---|---|
| 1 | 첫 나사판 (TUTORIAL_LEVEL) | `src/2026-06-28-campaign-levels.js` | 튜토리얼 | 18 나사 / 2 박스 |
| 2 | 하늘빛 풍차 (WINDMILL_LEVEL) | `src/2026-06-28-campaign-levels.js` | 입문 | 30 나사 / 3 박스 |
| 3 | 다층 오두막 (COTTAGE) | `src/levels.js` (인라인) | 표준 | 84 나사 |
| 4 | 민트 오두막 (MINT_COTTAGE) | `src/levels.js` (`cottageVariant`) | 표준+ | COTTAGE 컬러 변종 |
| 5 | 로즈 오두막 (ROSE_COTTAGE) | `src/levels.js` (`cottageVariant`) | 표준+ | COTTAGE 컬러 변종 |
| 6 | 항구의 2층집 (HARBOR_HOUSE_LEVEL) | `src/2026-06-29-advanced-levels.js` | 고급 | 45 나사 / 3 박스 |
| 7 | 노을빛 2층집 (SUNSET_HOUSE_LEVEL) | `src/2026-06-29-advanced-levels.js` | 고급 | 45 나사 / 1 박스 |
| 8 | 청록빛 ㄱ자 저택 (L_SHAPED_MANOR_LEVEL) | `src/2026-06-29-elite-levels.js` | 엘리트 | 54 / 4 레이어 / 버퍼 4 |
| 9 | 교차 지붕 시계탑 (CROSS_TOWER_LEVEL) | `src/2026-06-29-elite-levels.js` | 엘리트 | 72 / 5 레이어 / 버퍼 4 |
| 10 | 자정빛 이중 골조 저택 (FINAL_INNER_FRAME_LEVEL) | `src/2026-06-29-elite-levels.js` | 엘리트 | 84 / 5 레이어 / 버퍼 3 |
| 11 | 쌍탑 연결 저택 (TWIN_BRIDGE_MANOR_LEVEL) | `src/2026-06-29-master-levels.js` | 마스터 | 96 / 6 레이어 / 버퍼 3 |
| 12 | 교차 회랑 공방 (CROSS_CORRIDOR_WORKSHOP_LEVEL) | `src/2026-06-29-master-levels.js` | 마스터 | 108 / 7 레이어 / 버퍼 3 |
| 13 | 자정의 이중 성채 (MIDNIGHT_DOUBLE_FORTRESS_LEVEL) | `src/2026-06-29-master-levels.js` | 마스터 | 120 / 8 레이어 / 버퍼 2 |

조립은 `src/levels.js` 의 `LEVELS` 배열에서 한다 (`TUTORIAL → WINDMILL → COTTAGE → MINT → ROSE → HARBOR → SUNSET → ...ELITE → ...MASTER`).

---

## 4. 폴더 구조

```text
index.html                                         시작 화면 + HUD + 일시정지 + 결과 패널 + 레벨 선택 + 날짜 모달
styles.css                                         반응형 + safe-area + bin/buffer/token + 카드들
vercel.json                                        정적 배포 설정
src/
  main.js                                          Three.js 씬·카메라·OrbitControls·viewProj·입력·HUD 와이어링
  game.js                                          상태 / 캐스케이드 게이트 / 승패 / 파티클 풀 / dispose
  objects.js                                       Screw + Plank 메시
  levels.js                                        LEVELS 배열 + LEVEL_SUMMARY + COTTAGE + cottageVariant
  audio.js                                         WebAudio SFX
  2026-06-28-bin-view.js                           DOM 상자 2개 + 버퍼 5개 + 헤드 토큰 레이어
  2026-06-28-campaign-levels.js                    TUTORIAL_LEVEL + WINDMILL_LEVEL
  2026-06-28-collector-state.js                    순수 규칙 엔진 (활성 박스 + 버퍼 + 큐 + 자동 이송 + cascade step)
  2026-06-28-heart-party.js                        제작자 날짜 이스터에그 (240 하트 + 충격파)
  2026-06-28-level-validator.js                    색 카운트 / 큐 일치 / 의존성 순환 검사
  2026-06-28-progress-store.js                     localStorage 진행도 저장 (스키마 v2 + JDY 해금)
  2026-06-29-advanced-levels.js                    HARBOR / SUNSET (`buildSteppedHouse`)
  2026-06-29-elite-levels.js                       ELITE 3 레벨 + 공통 빌더 (`topPart`, `frontPart`, `gableZ`, `buildLayeredLevel` ...)
  2026-06-29-master-levels.js                      MASTER 3 레벨 (elite 빌더 재사용)
  2026-06-29-part-dependencies.js                  굴뚝 ↔ 앞 지붕 같은 구조 의존
tests/
  2026-06-28-game-rules.html                       브라우저 규칙 테스트 뷰
  2026-06-28-game-rules.js                         G-01~G-10 + X-01~X-02 시나리오
  2026-06-28-progress-store-tests.js               4건 (JDY 해금 포함)
  2026-06-28-run-game-rules.js                     명령줄 러너 (12/12 PASS)
  2026-06-29-campaign-level-tests.js               2건 (튜토리얼 / 풍차)
  2026-06-29-concurrent-input-tests.js             완성 박스가 다른 박스 입력을 전역 잠그지 않음
  2026-06-29-dynamic-box-level-tests.js            4 레벨 동적 박스 카운트
  2026-06-29-elite-level-tests.js                  엘리트 3 + 순환 의존성 검출
  2026-06-29-master-level-tests.js                 마스터 3 + 데드락 체크 풀이
  2026-06-29-part-dependency-tests.js              굴뚝 ↔ 지붕
docs/
  2026-06-28-claude-git-vercel-handoff.md          전달서 (푸시 절차 기준)
  2026-06-28-easter-egg-progress-update.md         이스터에그 + 진행도 라운드 기록
  2026-06-28-stage-1-6-report.md                   초기 6단계 (Documents 폴더로 옮겨오기 전 기록)
  2026-06-29-phase-a-d-report.md                   2차 라운드 보고서
  2026-06-29-three-level-campaign-update.md        3레벨 캠페인 라운드
  2026-06-29-progress-handoff.md                   이 문서
```

---

## 5. 푸시 전 표준 절차 (매 라운드 동일)

`docs/2026-06-28-claude-git-vercel-handoff.md` 가 1차 기준. 라운드마다 새 모듈/테스트가 추가되면 그 명령 목록도 함께 늘려서 실행한다. 현재까지 누적 명령은 아래와 같다.

```powershell
cd "C:\Users\user\Documents\인공지능 기초\screws-3d"

# 1) 모든 소스 모듈 syntax (15)
node --check src\2026-06-28-bin-view.js
node --check src\2026-06-28-collector-state.js
node --check src\2026-06-28-level-validator.js
node --check src\2026-06-28-heart-party.js
node --check src\2026-06-28-progress-store.js
node --check src\2026-06-28-campaign-levels.js
node --check src\2026-06-29-advanced-levels.js
node --check src\2026-06-29-elite-levels.js
node --check src\2026-06-29-master-levels.js
node --check src\2026-06-29-part-dependencies.js
node --check src\audio.js
node --check src\game.js
node --check src\levels.js
node --check src\main.js
node --check src\objects.js

# 2) 모든 테스트 (8)
node tests\2026-06-28-run-game-rules.js                # 12/12 tests passed
node tests\2026-06-28-progress-store-tests.js          # 4/4 progress tests passed
node tests\2026-06-29-campaign-level-tests.js          # 2/2 campaign levels passed
node tests\2026-06-29-part-dependency-tests.js
node tests\2026-06-29-concurrent-input-tests.js
node tests\2026-06-29-dynamic-box-level-tests.js
node tests\2026-06-29-elite-level-tests.js
node tests\2026-06-29-master-level-tests.js

# 3) 변경 검사
git diff --check
git status --short

# 4) 커밋 + 푸시 (메시지는 라운드 성격에 맞게)
git add index.html styles.css README.md vercel.json src tests docs
git commit -m "<설명적 한 줄>"
git push origin master
```

테스트 한 줄이라도 실패하면 커밋·푸시하지 말고 먼저 수정한다. CRLF 경고는 Windows 줄바꿈 경고일 뿐 실제 오류가 아니므로 무시.

---

## 6. 배포 확인 체크리스트 (사용자가 직접 봐야 함)

> 클로드 코드는 브라우저 화면을 캡처할 수 없다. 시각·동작 검증은 사용자가 직접.

1. <https://screws-3d.vercel.app/> 시작 화면이 열린다.
2. 시작 버튼 뒤 카운터가 `18 / 18` (튜토리얼이 첫 레벨이라면) 또는 마지막으로 열린 레벨에 맞게 표시.
3. 수집 상자는 위 1구·아래 2구 배치.
4. 임시 보관함이 정확히 5칸.
5. 메뉴 열면 게임이 멈추고 계속하기로 복귀.
6. DevTools 콘솔에 오류 0건.
7. 일시정지 메뉴의 `제작자: taylorr` 버튼이 날짜 입력창을 연다.
8. 틀린 날짜는 오류 문구 + 흔들림만.
9. `20250511` 입력 시 메뉴 닫히고 대량 하트·충격파·사운드.
10. 레벨 선택 화면에 13 레벨이 순서대로 표시.
11. 첫 실행에는 첫 나사판만 열려 있고, 완료할 때마다 다음 잠금 해제.
12. 각 레벨 카드의 나사 수가 표 (위 §3) 와 일치.
13. 마스터 마지막 레벨 완료 시 `다음 레벨` 이 아니라 `다시 플레이`.

---

## 7. 핵심 시스템 노트 (코드 들어가기 전 알아두면 좋은 것)

### 7.1 규칙 엔진 (`CollectorState`)
- 활성 박스 2 + 버퍼 5 + 큐.
- `acceptScrew(color, screwId)` → `{ target, boxIndex/slotIndex, stackIndex }` 또는 `null`.
- `resolveCascadeStep()` 한 라운드씩 — game 측이 애니메이션 끝날 때까지 대기 후 다시 호출.
- Three.js 의존 없음. 테스트 페이지에서 격리 검증 가능.

### 7.2 입력 게이트 (`game.js _isAcceptingInput`)
- 컬렉터 캐스케이드 pending / 박스 capacity 도달 / `cascadeBusyUntil` 미경과 시 거부.
- "한 박스 가득 차도 **다른 박스/버퍼 입력은 막지 않음**" — `2026-06-29-concurrent-input-tests.js` 가 보호.

### 7.3 DOM 토큰 (`BinView`)
- 3D 나사가 `state=landed` 가 되는 순간 game.js 가 mesh destroy → `BinView.createHeadToken` 호출.
- 자동 이송 = DOM 토큰의 CSS `transform` transition.
- 슬라이드인 박스 안 입은 보낸 토큰은 320ms 지연 후 좌표 샘플 (애니메이션 중 `getBoundingClientRect` 가 잘못된 위치 반환).

### 7.4 카메라 자동 피팅 (`main.js fitCameraToLevel`)
- BoundingBox + UI top 영역 빼고 가장 제한적인 축 기준으로 거리 계산.
- 레벨 로드 시 + window resize 시 호출.

### 7.5 진행도 저장 v2
- localStorage 키 분리: `unlocked-levels` + `completed-levels`.
- 스키마 v1 → v2 마이그레이션 처리.
- JDY 해금 코드는 모든 레벨을 열고 저장 (테스트로 검증).

### 7.6 의존성·풀이 검증
- `validateLevel` 가 색 카운트, 큐 길이, 의존성 순환 검사.
- `elite-level-tests` / `master-level-tests` 는 `authoredSolution` 단계별 시뮬레이션으로 데드락 없는 풀이가 진짜 존재함을 확인.

---

## 8. 알려진 한계

| 항목 | 상태 | 비고 |
|---|---|---|
| 영상 1:1 시각 패리티 | 영상 못 봄. 사용자 피드백으로 좁히는 방식 | |
| 스크린샷/녹화 자동화 | 클로드 환경에서 불가 | 사용자 직접 |
| 실기기 FPS 측정 | 미실시 | |
| 풍차 레벨 영상 일치도 | 30 나사로 다운스케일 (난이도 곡선) — 영상은 더 많음 | |
| 글로벌 명명 FSM | 게이트 함수로 우회. 명시적 7-state 미도입 | |
| Playwright/E2E 자동 실행 | 환경 없음 — 파일 작성은 가능, 실행은 사용자/Codex | |
| 잔디 + 청록 하늘 배경 | Codex P1 분류, 미시작 | |

---

## 9. 다음 라운드에 자연스럽게 이어질 수 있는 작업

1. **레벨 변종 추가** — `cottageVariant` 패턴을 advanced/elite 에도 적용해 컬러·문양만 다른 변종 생성.
2. **두 번째 실루엣 라인업** — 풍차의 시계탑·등대·수레 등 완전히 다른 오브젝트 군.
3. **사운드 폴리시** — 자동 이송 전용 톤, 연쇄 단계별 음높이 상승.
4. **마스터 데드락 시각 표시** — 풀이 불가 상태에 들어가기 직전 경고 UI.
5. **레벨 선택 화면 페이지네이션** — 13 레벨 → 향후 확장 시 카드 정렬·필터.
6. **퍼포먼스** — 나사 인스턴싱 (`InstancedMesh`), 저사양 모바일 GPU 부하 측정.
7. **레벨 분류 메타 노출** — 등급(튜토리얼/입문/고급/엘리트/마스터)별 그룹 UI.
8. **글로벌 명명 FSM** — Codex 권장 7-state 로 입력 게이트 명시화.

---

## 10. 작업 시작할 때 빠르게 확인하는 명령어 모음

```powershell
cd "C:\Users\user\Documents\인공지능 기초\screws-3d"
git status --short                              # 미커밋 변경 확인
git log --oneline -5                            # 최근 커밋 5건
git fetch origin && git rev-list --left-right --count origin/master...HEAD
                                                # 원격과의 ahead/behind
ls docs/                                        # 최신 라운드 문서 확인
```

이 네 명령으로 어디서부터 이어 작업해야 하는지 즉시 파악 가능.

---

## 11. 가장 최근 커밋 (참고)

```text
2b96d0a Add master layered campaign levels with deadlock-checked solutions
0f6d1f7 Add elite layered campaign levels with authored solution tests
78d8f79 Add harbor and sunset two-story levels with input safety tests
8f8ea52 Add three-level campaign and level selection
04a5326 Add creator heart easter egg and level progress foundation
163d930 Polish Screwdom 3D gameplay and UI
df6bc3c Add Phase A-D round 2 report for Codex re-review
ad02a9a Phase D: particle pool, dispose on restart, RAF cancellation, README
...
```

`git log --oneline` 으로 더 거슬러 올라가면 Stage 1~6 → Phase A~D → 캠페인 확장 → 엘리트 → 마스터 순서가 한눈에 보인다.
