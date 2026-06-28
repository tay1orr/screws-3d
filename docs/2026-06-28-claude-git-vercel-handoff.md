# Claude Code Git·Vercel 전달서

## 작업 경로

```text
C:\Users\user\Documents\인공지능 기초\screws-3d
```

이 폴더가 Git 저장소 루트이자 Vercel 배포 루트다. 상위 폴더나 새 하위 프로젝트를 만들지 않는다.

## 연결 상태

- 브랜치: `master`
- 원격: `origin`
- 원격 저장소: `https://github.com/tay1orr/screws-3d.git`
- 배포 주소: `https://screws-3d.vercel.app/`
- 구성: 빌드 없는 정적 HTML/CSS/JavaScript

## 푸시 전 필수 검사

아래 명령을 작업 경로에서 순서대로 실행한다.

```powershell
node --check src\2026-06-28-bin-view.js
node --check src\2026-06-28-collector-state.js
node --check src\2026-06-28-level-validator.js
node --check src\audio.js
node --check src\game.js
node --check src\levels.js
node --check src\main.js
node --check src\objects.js
node tests\2026-06-28-run-game-rules.js
git diff --check
git status --short
```

테스트는 `12/12 tests passed`여야 한다. 오류가 있으면 커밋하거나 푸시하지 말고 먼저 수정한다.

## 커밋과 푸시

사용자가 요청하면 다음 절차로 현재 변경 전체를 올린다.

```powershell
git add index.html styles.css README.md vercel.json src tests docs
git status --short
git commit -m "Polish Screwdom 3D gameplay and UI"
git push origin master
```

강제 푸시, 리베이스, 과거 커밋 삭제는 하지 않는다. 원격 변경 때문에 일반 푸시가 거부되면 즉시 사용자에게 알리고 임의로 덮어쓰지 않는다.

## 배포 확인

푸시 뒤 Vercel 자동 배포가 완료되면 아래를 확인한다.

1. `https://screws-3d.vercel.app/`에서 시작 화면이 열린다.
2. 시작 버튼 뒤 `84 / 84`가 표시된다.
3. 수집 상자는 위 1구·아래 2구 배치다.
4. 임시 보관함은 정확히 5칸이다.
5. 메뉴를 열면 게임이 실제로 멈추고 계속하기로 복귀한다.
6. 브라우저 개발자 콘솔에 오류가 없다.

## 이번 변경의 핵심

- 수집 상자와 십자 홈 나사 토큰을 원작 형태에 가깝게 개선
- 상자 완료·퇴장·교체 애니메이션 연결
- 일시정지 중 게임 타이머 정지
- 다섯 번째 버퍼 예약 뒤 추가 입력 차단
- 캐스케이드와 GPU 자원 정리 개선
- 카메라 안전 영역 피팅과 플로팅 배경 개선
- 한글 UI와 HTML 구조 정상화

현재 레벨 구조물은 오두막이다. 원작 홍보 이미지의 풍차 레벨로 교체하는 작업은 이번 배포 안정화 범위에 포함하지 않는다.
