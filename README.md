# Screws 3D

3D 퍼즐 게임 — 같은 색 나사를 3개씩 모아 모든 판자를 분해하세요.

브라우저에서 바로 플레이: (배포 후 URL 입력)

## 로컬 실행

ES 모듈을 쓰므로 HTTP 서버가 필요해요. 폴더에서:

```powershell
python -m http.server 8765
```

그리고 `http://localhost:8765/` 접속.

## 조작법

- **드래그**: 카메라 회전
- **핀치/휠**: 줌
- **나사 탭**: 풀기
- 같은 색 3개가 슬롯에 모이면 자동 제거
- 3개 슬롯이 다른 색으로 가득 차고 진행 불가하면 게임오버

## 기술 스택

- Three.js r160 (CDN, ES modules)
- 절차적 우드 텍스처 (HTML Canvas)
- WebAudio 신디 SFX
- 빌드 도구 없음, 그냥 정적 호스팅

## 폴더 구조

```
index.html
styles.css
src/
  main.js       씬 부트스트랩
  game.js       게임 로직
  objects.js    Screw / Plank / SlotTray
  levels.js     레벨 데이터
  textures.js   절차적 텍스처
  audio.js      신디 사운드
```
