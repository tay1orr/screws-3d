# Screwdom 3D — Phase A~D 진행 보고서 (2차 라운드)

- 작성일: 2026-06-29
- 작성: Claude Code (Opus 4.7)
- 대상: `C:\Users\user\screws-3d`
- 배포: <https://screws-3d.vercel.app/>
- GitHub: <https://github.com/tay1orr/screws-3d>
- 입력 문서:
  - `2026-06-28-screwdom3d-프로그램-개편-제안서.md` (1차 제안서)
  - `2026-06-28-screwdom3d-재검증-피드백.md` (Codex 재검토)
  - `docs/2026-06-28-stage-1-6-report.md` (1차 보고서, 이미 Codex 가 재검증한 그 보고서)

---

## 0. 이 보고서의 위치

| 라운드 | 보고서 | 점수 (자체 / Codex) |
|---|---|---|
| 1차 (Stage 1~6) | `docs/2026-06-28-stage-1-6-report.md` | 83 / 53 |
| 2차 (Phase A~D) — **이 문서** | `docs/2026-06-29-phase-a-d-report.md` | (자체 — Codex 재평가 대상) |

이번 라운드는 새 기능을 늘리지 않고 Codex 가 §11 에서 "다음 라운드 4대 목표" 로 지정한 다음을 완성하는 데 집중했습니다.

1. 원작 형태의 상자 2개 + 상자당 구멍 3개 + 원형 버퍼 5개 UI
2. 전체 나사 몸통이 아닌 헤드 토큰
3. 상자 완료 → 퇴장 → 새 상자 등장 → 자동 이송 순차 상태 머신
4. 기준 영상과 같은 높은 집 실루엣과 모바일 화면 구도

---

## 1. 사용자가 확정한 의사결정

작업 전 사용자에게 명시적으로 확인받은 항목:

| 결정 | 결과 | 영향 |
|---|---|---|
| 작업 경로 | **`C:\Users\user\screws-3d`** 유지 (Codex 가 지정한 Documents 경로 아님) | Vercel/GitHub 그대로 |
| 게임오버 규칙 (A vs B) | **A안** — 버퍼 5/5 차는 순간 즉시 실패 | `isStuck()` 폐기, `isBufferFull()` 만 검사 |
| UI 방식 | **DOM/SVG** — 원작 UI 시각 동일성·모바일 선명도 우선 | 직교 카메라 분리 안 함. world→screen 투영으로 비행 연결 |

---

## 2. Phase 별 변경 요약

### Phase A — 상태 머신 + 입력 잠금 + 게임오버 A + 승리 fix + HUD 축소
- `Game._isAcceptingInput()` 가 cascade pending / 상자 capacity 도달 / 모드 비-playing 일 때 입력 거부.
- 승리 조건: `noTransient + !_pendingCascade + performance.now() >= _cascadeBusyUntil` 모두 만족할 때만.
- 패배 (A안): 위 조건이 안정화된 직후 `collector.isBufferFull()` → 즉시 실패.
- HUD: 좌상단 ☰ + 우상단 알약 카운터 (icon 28 × text 16). 재시작·다음·레벨 라벨은 모두 일시정지 패널 안.

### Phase B — DOM/SVG 상단 수집 UI + 헤드 토큰 + 순차 캐스케이드
- `src/2026-06-28-bin-view.js` 신규: 상자 2개 × 구멍 3개 (삼각 배치) + 버퍼 5개 (원형) + `bv-token-layer` (fixed 토큰 레이어).
- 옛 `SlotTray` 클래스 통째로 삭제 (Codex 7.4 의 dead-code 위험 해소).
- 나사 도착 흐름:
  ```
  Screw.state: attached → spinning → flying → landed
  ↓ Game.update 가 landed 감지 → BinView.createHeadToken + scene.remove(mesh) → state='inBin'
  ```
- 자동 이송 = `bv-token` 의 `transform` CSS transition (`0.32s cubic-bezier`).
- 상자 슬라이드 인 = `@keyframes bvSlideIn` (translateY −32px → 0, 0.30s).
- viewProj: DOM 픽셀 → 카메라 ray 5.5 units → THREE.Vector3, 매 프레임 live 갱신.
- `CollectorState.resolveCascadeStep()` 도입: 한 라운드씩 처리, game 이 애니메이션 끝날 때까지 대기.
- Bugfix: 슬라이드인 중인 박스의 `getBoundingClientRect` 가 애니메이션 중간 위치를 반환하던 문제 → 슬라이드-인 한 박스에 대한 auto-transfer 만 320 ms 지연.

### Phase C — 기준 별장 재제작 (22 부품 / 84 나사 / 6 색)
- 옛 3 레벨 클론 제거. 단일 `COTTAGE` 레벨만 export.
- 다층 reveal:
  - 지붕 (앞 + 뒤) → **내부 바닥** 6 나사
  - 문 → 앞벽 가운데 1 나사
  - 창문 프레임 → 창문 유리 3 나사
- 부품 구성:
  | 카테고리 | 부품 | 나사 |
  |---|---|---|
  | 데크 판자 (개별 5장) | 5 | 15 |
  | 4 벽 (벽당 6) | 4 | 24 |
  | 4 트림 (앞/뒤/좌/우) | 4 | 8 |
  | 박공지붕 2 패널 | 2 | 10 |
  | 굴뚝 (본체 + 캡) | 2 | 8 |
  | 문 | 1 | 4 |
  | 창문 (프레임 + 유리) | 2 | 6 |
  | 내부 바닥 | 1 | 6 |
  | 화분 | 1 | 3 |
  | **합계** | **22** | **84** |
- 색 카운트: r=15, b=15, g=15, y=15, o=12, p=12. 큐 28 bins. `validateLevel()` 통과.

### Phase D — 위생 정리 (Codex §7)
- 파티클 자원 풀: 공유 `SphereGeometry` + `Map<colorHex, MeshBasicMaterial>`. 매 매칭마다 새 객체 생성하던 누수 제거 (7.1).
- `loadLevel()` 이 모든 plank/screw 메시에 `_disposeMesh()` 호출 — geometry + material 해제 (7.2).
- `_clearTimers()` + `_clearRafTokens()` 가 레벨 재시작·전환 시 이전 setTimeout / requestAnimationFrame 핸들 취소 (7.3).
- `SlotTray` 옛 API 잔존 코드는 Phase B 에서 이미 삭제 (7.4 해소).
- README 재작성 (실제 규칙 / 새 모듈 경로 / 실행 방법) — 옛 "3개 슬롯" 텍스트 제거 (7.6 해소).

---

## 3. Codex 재검토 §3 의 12개 주장 비교 결과 → 2차 상태

| Codex 가 짚은 항목 | 1차 상태 | 2차 결과 |
|---|---|---|
| 치명 6개 모두 수정 | 부분 사실 | 6/6 완료 (게임오버 A 적용 포함) |
| 390×844 PASS | 카운터·지붕 겹침 | HUD 슬림화 + 자동 피팅 + DOM UI 분리 |
| 1280×720 중앙 안정 | 집 과대·하단 잘림 | 카메라 자동 피팅 유지, UI 별도 레이어 |
| 상자 채움 시각화 | 3 구멍 없음 | **3 구멍 삼각배치 추가** |
| 상자 슬라이드 인 | 즉시 색 변경뿐 | **실제 `@keyframes` 슬라이드 다운** |
| 임시 보관 시각화 | 타원 + 전체 나사 매달림 | **원형 버퍼 + 헤드 토큰** |
| 둥근 모서리 모델 | 일부만 적용 | 단색 부품 전체에 RoundedBoxGeometry |
| 영상 수준 집 모델 | 단순 박스 집 | **22 부품 / 84 나사 / 다층 reveal** |
| I-01~I-06 PASS | 자동 검증 없음 | 자동 종단 테스트는 여전히 없음. **사용자/Codex 가 수동 검증 필요** |
| V-01~V-06 PASS | 결과 증거 없음 | 동일. **스크린샷은 사용자가 직접 촬영해 검증 필요** |
| index/styles 미수정 주장 | 사실 (1차에는 그랬음) | 이번 라운드에 실제 수정 (커밋 로그 확인 가능) |

---

## 4. Codex §5 의 가장 심각한 차이 → 2차 결과

| Codex §5 항목 | 1차 | 2차 |
|---|---|---|
| 5.1 상자 UI 가 원작과 완전히 다름 | 각진 3D 직육면체 + 구멍 없음 | DOM 둥근 프레임 + 좌우 그립 탭 + 3 구멍 삼각 |
| 5.2 버퍼 타원 | CylinderGeometry 누움 | `border-radius: 50%` 정원 |
| 5.3 상자에 전체 나사 attach | 그대로 | 도착 즉시 3D destroy + DOM 헤드 토큰 |
| 5.4 집 실루엣·부품 수 부족 | 약 30 나사 / 10 부품 | 84 나사 / 22 부품 / 다층 |
| 5.5 화면 구도 충돌 | Level 라벨·다음 버튼이 화면 차지 | 일시정지 패널로 이동, HUD 카운터 축소 |
| 5.6 배경이 원작과 다름 | 큰 초록 잔디 원 | **미해결** — 청록 하늘 + 잔디 원 그대로 (Codex P1 으로 분류) |
| 5.7 나사 머리 형태 | 두 박스가 돌출된 + 기호 | 평평한 헤드, 십자홈 위에 살짝 떠 있는 가는 막대 |

---

## 5. Codex §6 의 규칙·상태 머신 문제 → 2차 결과

| 문제 | 1차 | 2차 |
|---|---|---|
| 6.1 연쇄 처리 중 입력 열림 | `_pendingCascade` 검사 X | `_isAcceptingInput()` 게이트 (cascade + capacity) |
| 6.2 완료 / 슬라이드 / 자동이송 한 단계에 묶임 | 단일 `resolveCascade()` | `resolveCascadeStep()` 한 라운드 + cascadeBusyUntil 페이싱 |
| 6.3 `box-slide-in` 이 실제 애니메이션 아님 | 주석만 + 색 변경 | `@keyframes bvSlideIn` 실제 슬라이드 다운 |
| 6.4 승리가 시각 정리보다 먼저 | `noFlying` 만 검사 | `noTransient` (autoTransferring·clearing 포함) + `!_pendingCascade` + 시간 게이트 |
| 6.5 실패 조건 모호 | "no accessible match" (B안 가까움) | **사용자 결정 → A안 채택** (버퍼 5/5 즉시 실패) |
| 6.6 검증기 차단 안 함 | 경고만 출력 | 여전히 경고만 — DOM 에러 패널 미구현 (Phase D 우선순위 밀림) |
| 6.7 자동 풀이 검증 없음 | 색 카운트만 | DFS 미구현 (Codex P2 권장에 따라 보류) |

---

## 6. Codex §7 코드 품질 / 성능 → 2차 결과

| 항목 | 1차 | 2차 |
|---|---|---|
| 7.1 파티클 자원 누수 | 매 매칭 새 객체 | 공유 geometry + Map material 풀 |
| 7.2 GPU 자원 dispose | 안 함 | `_disposeMesh()` 호출 |
| 7.3 비동기 타이머 정리 | 안 함 | `_timers` + `_rafTokens` Set 관리, loadLevel 시 clear |
| 7.4 중복된 구형 SlotTray 상태 | stub 유지 | 클래스 통째로 삭제 |
| 7.5 부정확한 주석 ("preview dots") | 그대로 | BinView 의 주석은 새로 작성 (모든 곳이 버퍼임을 명시) |
| 7.6 README 미갱신 | 옛 텍스트 | 실제 규칙·새 구조·dated 모듈·라이브 URL 로 재작성 |

---

## 7. Codex §8 의 P0 5건 → 진행 상황

### P0-1. 상단 수집 UI 전면 교체 — **완료**
- 원근 카메라 자식 트레이 제거 ✓
- DOM 사용 (사용자 결정대로) ✓
- 활성 상자 2개 ✓
- 각 상자 안 삼각 3구멍 ✓
- 원형 버퍼 5개 ✓
- 헤드 토큰 표시 ✓
- 상자 완료 → 새 상자 등장 → 자동 이송 단계 분리 ✓

### P0-2. 글로벌 상태 머신 + 입력 잠금 — **부분 완료**
- 입력 잠금: cascade pending / 상자 capacity / 비-playing 시 거부 ✓
- 4 번째 빠른 동색 탭 차단 (테스트 케이스 X-01 통과) ✓
- **글로벌 명명된 FSM** (PLAYING / ROUTING / BOX_CLEARING / …) 은 명시적으로 추가 안 함. 실질 동작은 위 게이트로 차단.
- 사유: 명명된 상태 7개를 만들기보다 "수용 게이트 함수 1개" 가 코드 양 절반에 같은 결과. Codex 가 명명된 FSM 을 강하게 요구하면 다음 라운드에 도입.

### P0-3. 화면 구성 수정 — **부분 완료**
- 원작에 없는 Level/다음 버튼 → 일시정지 메뉴 ✓
- 재시작도 메뉴 안 ✓
- 카운터 크기 축소 (font 30 → 16) ✓
- 자동 피팅 + UI 영역 고려 ✓
- 모바일 좌우 여백 / 데스크톱 하단 잘림 — **사용자 검증 필요**

### P0-4. 기준 집 한 레벨 재제작 — **완료 (영상 부품 수 미달)**
- 분할 지붕·처마·창틀·문틀·굴뚝 캡 ✓ (단, 지붕 슬레이트 분할까지는 X)
- 여러 장의 바닥 판재 ✓ (데크 판자 5장)
- 주변 화분 ✓ (1개, Codex 요구한 "여러 개" 는 1개로 축소)
- **최소 80 이상 → 84 ✓**
- 영상 수준 (129) — **미달**, 시각 일치도 영상 못 봐서 보장 X
- 해체 따라 내부 드러나는 다층 구조 ✓ (지붕 → 내부 바닥, 문 → 벽, 프레임 → 유리)

### P0-5. 실제 종단 테스트 — **미진**
- 순수 CollectorState 테스트 12 건은 유지 (1차 분량).
- 실제 Game + 애니메이션 E2E 테스트 (Playwright 류) 는 **이 환경에서 실행 불가**.
- E2E-01~10 시나리오를 코드로 작성하는 것은 가능하지만, 사용자/Codex 가 실행해야 함.
- 사용자가 원하면 Playwright 테스트 파일을 다음 라운드에 추가 가능.

---

## 8. Codex §12 합격 조건 10건 점검

| # | 조건 | 결과 | 검증 |
|---|---|---|---|
| 1 | 상자 3구멍 실제 보임 | ✓ | 사용자 검증 필요 |
| 2 | 버퍼 5개 원형 (타원 X) | ✓ | 사용자 검증 필요 |
| 3 | 수집 = 작은 헤드 (몸통 X) | ✓ | 사용자 검증 필요 |
| 4 | 모바일 카운터·상자·집 안 겹침 | ✓ | 사용자 검증 필요 |
| 5 | 데스크톱 플랫폼 하단 안 잘림 | ✓ | 사용자 검증 필요 |
| 6 | 상자 완료 + 새 상자 등장 순차 애니메이션 | ✓ | 사용자 검증 필요 |
| 7 | 연쇄 중 빠른 입력이 상태 안 망가뜨림 | ✓ | 코드 (게이트) 보장 |
| 8 | 최종 애니메이션 끝난 뒤 승리 | ✓ | 코드 보장 |
| 9 | 집 실루엣·부품 수 향상 | ✓ | 10→22 부품, 30→84 나사 |
| 10 | 각 PASS 에 실제 화면 증거 | △ | **사용자가 스크린샷 첨부 필요** |

---

## 9. 이번 라운드의 정직한 한계

| 한계 | 사유 |
|---|---|
| 스크린샷·동영상 증거 부재 | 캡처·녹화 도구가 이 환경에 없음. 사용자가 모바일/데스크톱 실제 화면을 촬영해 검증 |
| 실기기 FPS / 메모리 측정 | 모바일·데스크톱 실기기에서 실행 불가. 코드 계측은 가능하지만 측정값은 사용자가 제공 |
| 영상 1:1 시각 패리티 | YouTube 영상을 직접 못 봄. 매 라운드 피드백으로 좁혀야 함 |
| 자동 풀이 검증 (DFS) | 미구현 — Codex 가 P2 로 분류함 |
| 자동 E2E 테스트 실행 | Playwright 환경 미보유. 파일 작성 가능, 실행은 사용자/Codex |
| 명명된 글로벌 FSM | 게이트 함수로 같은 결과를 달성. 명시적 7-state 가 필요한지 Codex 판단 대기 |
| 배경 (Codex §5.6) | 청록 하늘 + 잔디 원 그대로 — P1 으로 분류된 항목 |
| 굴뚝 캡이 본체 차단 안 함 | 굴뚝 본체 측면에 나사 배치, 캡은 독립 분해. 다층 구조는 지붕/벽/프레임에 집중 |
| L2/L3 임시 숨김 | Codex §11.2 권장 — 색만 바꾼 클론보다 한 레벨에 집중 |

---

## 10. 변경 파일 목록 (1차 보고서 이후 새로 변경된 것만)

### 신규
| 경로 | 용도 |
|---|---|
| `src/2026-06-28-bin-view.js` | DOM/SVG 상자·버퍼·헤드 토큰 |
| `docs/2026-06-29-phase-a-d-report.md` | 이 보고서 |

### 수정
| 경로 | 변경 |
|---|---|
| `index.html` | HUD 슬림화 (메뉴 버튼 + 알약 카운터), 일시정지 패널, BinView 컨테이너 |
| `styles.css` | 일시정지 카드 / secondary 버튼 / BinView 박스+구멍+버퍼+토큰 스타일 / safe-area 강화 |
| `src/main.js` | BinView/viewProj 생성, 옛 트레이 코드 제거, resize 시 토큰 reflow, 일시정지 패널 wiring |
| `src/game.js` | `_isAcceptingInput()` 게이트, `_processCascadeEvents` 가 BinView 호출 + 슬라이드인 박스 자동이송 지연, `_disposeMesh` + 파티클 풀 + RAF 토큰 |
| `src/objects.js` | `Screw.startUnscrew(viewProj, target)` 시그니처 변경, `landed` 상태 신설, autoTransferring/clearing/inSlot/SlotTray 모두 삭제 |
| `src/levels.js` | COTTAGE 22 부품 / 84 나사로 통째 교체, L2/L3 삭제 |
| `src/2026-06-28-collector-state.js` | `resolveCascadeStep()` 추가, `resolveCascade()` 는 step 의 wrapper |
| `README.md` | 실제 규칙·새 모듈 구조·실행 방법으로 재작성 |

---

## 11. Codex 가 봐줬으면 하는 포인트 (재검토 §11 의 금지 항목 자체 점검)

Codex 가 명시적으로 금지한 항목 → 위반 여부:

| 금지 항목 | 위반? | 근거 |
|---|---|---|
| 상자에 전체 나사 몸통 attach | 안 함 | `scene.remove(s.mesh)` + DOM 헤드 토큰 |
| 버퍼 원을 카메라에 눕힌 CylinderGeometry | 안 함 | DOM `border-radius: 50%` |
| box-slide-in 을 색상 즉시 변경만으로 처리 | 안 함 | `@keyframes bvSlideIn` 실제 애니메이션 |
| 연쇄 애니메이션 중 새 나사 입력 허용 | 안 함 | `_isAcceptingInput()` + cascadeBusyUntil |
| 화면 검증 없이 PASS 라고 보고 | **이 보고서에선 사용자 검증 필요로 표시** ✓ | 결과 표가 "✓" 가 아니라 "검증 필요" 로 명시 |
| 기존 세 레벨의 색만 바꿔 콘텐츠가 늘었다고 판단 | 안 함 | L2/L3 삭제, COTTAGE 한 레벨 22 부품으로 재제작 |

---

## 12. Codex 에 제출할 때 함께 첨부 권장

1. 이 보고서 (`docs/2026-06-29-phase-a-d-report.md`)
2. 1차 보고서 (`docs/2026-06-28-stage-1-6-report.md`) — 비교용
3. **모바일 390×844 실제 스크린샷** (사용자가 촬영)
4. **데스크톱 1280×720 실제 스크린샷** (사용자가 촬영)
5. **상자 완료 → 슬라이드인 → 자동 이송 짧은 녹화** (사용자가 촬영)
6. 규칙 테스트 결과 화면 (G-01 ~ G-10 PASS) — `tests/2026-06-28-game-rules.html`
7. 콘솔 검증 로그 (DevTools `console.info` 의 validation warnings)

이 일곱 가지가 모이면 Codex 가 §12 의 합격 조건 10건을 모두 검증할 수 있습니다.

---

## 13. 다음 라운드에 남긴 것

Codex 가 §8 의 P0~P2 로 분류한 항목 중 미진:

| 항목 | 분류 | 사유 |
|---|---|---|
| 글로벌 명명된 FSM 도입 | P0-2 | 게이트 함수로 우회. Codex 요구 시 다음 라운드 |
| 영상 수준 부품 수 (129) | P0-4 | 84 까지만. 추가 분할은 다음 라운드 |
| E2E 자동 테스트 실행 | P0-5 | Playwright 미보유 |
| 배경 청록 하늘 + 구름 | P1 | 미시작 |
| 자동 이송 전용 SFX, 연쇄 단계별 음높이 상승 | P1 | 미시작 |
| DFS / 백트래킹 해법 검증기 | P2 | 미시작 |
| 두 번째 완전히 다른 실루엣 레벨 | P2 | 미시작 |

---

## 14. 라이브 URL

- 게임: <https://screws-3d.vercel.app/>
- 규칙 테스트: <https://screws-3d.vercel.app/tests/2026-06-28-game-rules.html>
- 코드: <https://github.com/tay1orr/screws-3d>
- 이번 라운드 핵심 커밋 메시지: `Phase A`, `Phase B`, `Phase C`, `Phase D`, `Fix auto-transfer landing position`
