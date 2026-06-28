# Screwdom 3D

색깔 나사를 수집 상자에 맞춰 넣으며 3D 구조물을 분해하는 모바일 우선 퍼즐 게임입니다.

- 배포 주소: <https://screws-3d.vercel.app/>
- Git 원격 저장소: <https://github.com/tay1orr/screws-3d>
- 배포 브랜치: `master`

## 게임 규칙

- 화면 위에는 색이 정해진 활성 상자 2개와 임시 보관함 5칸이 있습니다.
- 선택한 나사 색이 활성 상자와 같으면 상자로, 다르면 첫 빈 임시 칸으로 이동합니다.
- 같은 색 나사 3개가 상자에 모이면 상자가 완성되고 다음 색 상자가 등장합니다.
- 새 상자 색과 같은 임시 나사는 자동으로 상자로 이동하며 연쇄 완성이 가능합니다.
- 임시 보관함 5칸이 모두 차고 자동 이동으로 해소되지 않으면 실패합니다.
- 모든 나사와 부품을 정리하면 승리합니다.

## 조작

- 드래그: 구조물 회전
- 핀치 또는 마우스 휠: 확대·축소
- 나사 누르기: 접근 가능한 나사 풀기
- 왼쪽 위 메뉴: 일시정지, 재시작

## 현재 구현된 확장 기반

- 레벨 이름·난이도·설명 메타데이터
- 브라우저 내부 진행도 저장과 다음 레벨 잠금 해제
- 마지막 레벨에서 같은 레벨을 ‘다음 레벨’로 잘못 표시하지 않는 완료 처리
- 제작자 메뉴와 비공개 날짜 이스터에그

## 로컬 실행

별도 설치나 빌드 과정이 필요하지 않습니다.

```powershell
cd "C:\Users\user\Documents\인공지능 기초\screws-3d"
python -m http.server 8765
```

브라우저에서 `http://localhost:8765/`을 엽니다.

규칙 테스트:

```powershell
node tests\2026-06-28-run-game-rules.js
node tests\2026-06-28-progress-store-tests.js
```

## Vercel 배포

이 폴더가 저장소와 Vercel의 루트 디렉터리입니다. `master` 브랜치로 푸시하면 연결된 Vercel 프로젝트가 자동 배포합니다.

```powershell
git add index.html styles.css README.md vercel.json src tests docs
git commit -m "Add creator heart easter egg and level progress foundation"
git push origin master
```

클로드 코드 전달 사항은 `docs/2026-06-28-claude-git-vercel-handoff.md`를 확인하세요.

## 구조

```text
index.html                         게임 화면과 UI
styles.css                         반응형 UI 및 애니메이션
vercel.json                        Vercel 정적 배포 설정
src/
  main.js                          Three.js 씬, 카메라, 입력, 화면 흐름
  game.js                          게임 상태와 애니메이션 수명주기
  objects.js                       나사와 구조물 메시
  levels.js                        레벨 데이터
  audio.js                         WebAudio 효과음
  2026-06-28-collector-state.js    상자·버퍼·자동 이동 규칙 엔진
  2026-06-28-level-validator.js    레벨 데이터 검증
  2026-06-28-bin-view.js           상자·버퍼·나사 토큰 UI
  2026-06-28-heart-party.js        하트 파티클 이스터에그
  2026-06-28-progress-store.js     레벨 진행도 로컬 저장
tests/
  2026-06-28-game-rules.html       브라우저 규칙 테스트
  2026-06-28-game-rules.js         규칙 테스트 본체
  2026-06-28-run-game-rules.js     명령줄 테스트 실행기
  2026-06-28-progress-store-tests.js 진행도 저장 테스트
docs/                              구현 보고서와 전달 문서
```

## 기술 구성

- 순수 HTML, CSS, JavaScript
- Three.js r160 ES modules(CDN)
- DOM 기반 수집 상자와 버퍼 UI
- WebAudio 효과음
- 빌드 도구 없는 Vercel 정적 호스팅
