# HANDOFF — CKD 동반 고혈압 계산기 (KSH 2026 + KDIGO 2024 하이브리드)

작성일 2026-11-06 · `ckd-risk-calculator.html` 을 이어서 손볼 때 이 문서와 `build/ckd/` 만 읽으면 됩니다.

## 1. 산출물 · 위치

| 항목 | 값 |
|---|---|
| 로컬 파일 | `C:\Users\tipco\Documents\htn-risk\ckd-risk-calculator.html` (단일 HTML, 의존성 없음) |
| 배포 URL | https://tipcode-cpu.github.io/htn-risk/ckd-risk-calculator.html |
| 형제 도구 | `index.html`(고혈압) · `lipid-risk-calculator.html`(이상지질혈증) · `cardio-risk-calculator.html`(HTN+LIPID 통합) |
| 자체 점검 | `ckd-risk-calculator.html#test` 로 열면 콘솔에 고혈압 기존 점검 + CKD 25항목 PASS/FAIL 출력 |
| QR | `qr_card.png`(인쇄용 2종) · `qr_index.png` · `qr_ckd.png` |

## 2. 설계 — 왜 "하이브리드"인가

`index.html`(KSH 2026 고혈압 위험도 분류)을 **바탕 그대로 두고** KDIGO 층만 얹었습니다.
표 10·11·13 로직, 한/영 i18n, 테마, 자동 반영(BMI·지질·HbA1c·eGFR·UACR)은 전부 원본입니다.

빌드는 `build/ckd/build_ckd.py` 의 **앵커 기반 치환 20단계**이고 앵커가 하나라도 어긋나면 빌드가 즉시 실패합니다.
"고혈압 도구 본체가 그대로 남는다"를 사람 눈이 아니라 빌드가 보증하게 하려는 구조입니다.

원본에서 바뀐 것은 이것뿐입니다.

- `calc()` → `calcHtn()` 으로 이름만 변경. 새 `calc()` 는 `calcHtn()` 을 먼저 돌리고 그 뒤에 `renderCKD()` 를 부릅니다.
  CKD 층이 던져도 위쪽 고혈압 결과는 이미 그려져 있고, 패널에 오류 문구가 뜹니다.
- 제목·부제·적용범위 문구에 KDIGO 추가.
- 입력 카드 5번과 CKD 결과 카드 1개 추가, CSS·i18n(ko/en)·엔진·자체점검 블록 추가.

## 3. 화면 구성

**입력** — 1~4번은 원본 그대로. **5번 CKD 평가 추가 입력**: eGFR 직접 입력(크레아티닌 계산값을 덮어씀),
혈청 칼륨, 혈압 측정 방법, 만성(≥3개월) 확인 · β차단제 적응증 · 임신 · 투석 · 신장이식, KFRE 지역 보정.
제2형 당뇨는 HbA1c/2번에서, 심부전은 4번 체크박스에서 그대로 가져옵니다.

**결과** — 위쪽은 원본(위험군 배지 · 표 13 · 표 11 매트릭스). 아래 CKD 카드 6절:
① KDIGO 분류 + 18칸 heat map ② 혈압 목표 3종 비교 ③ 항고혈압제 10행 4단계 등급
④ 신장보호제 별도 층 ⑤ KFRE ⑥ 안전·모니터링.

## 4. 의도적으로 넣은 임상 제약 (고치기 전에 읽을 것)

1. **UACR 없이는 CKD 층을 아예 그리지 않습니다.** eGFR 단독으로 CKD 위험을 말하지 않기 위해서입니다.
2. **만성(≥3개월) 미확인 시 경고**가 뜹니다 (KDIGO 2024 PP 1.1.3.2).
3. **혈압 목표를 한 숫자로 합치지 않습니다.** KSH <130/80 · KDIGO SBP<120 · ESC 120–129 를 나란히 보여주고
   KSH 만 primary 로 강조합니다. 지침이 실제로 다르기 때문입니다.
4. **RASi 는 eGFR 저하만으로 중단 등급이 나오지 않습니다** (STOP-ACEi). eGFR<15 에서도 최대 "주의"입니다.
   고칼륨혈증에서도 "중단"이 아니라 식이·NSAID 중단·이뇨제·K 교환수지가 **먼저** 제시됩니다.
5. **KFRE 는 G3–G5 에서만** 산출합니다 (개발 코호트에 G1–G2 없음).
6. **MRA 3종을 한 범주로 묶지 않습니다** — spironolactone / eplerenone / finerenone 이 각각 다른 행입니다.
7. **두 경로의 목표가 갈리면 숨기지 않고 경고합니다.** 알부민뇨만 있고 eGFR≥60 인 환자에서
   KSH 표 11 은 알부민뇨를 무증상 장기손상으로, KDIGO 는 CKD 로 다뤄 목표가 <140/90 과 <130/80 으로 갈립니다.

## 5. 미해결 · 확인 필요

1. **KFRE 계수는 2차 출처**입니다. 원논문(Tangri)의 HR·중심화값과는 일치를 확인했으나 계수표 원본은 못 봤습니다.
   → 임상 사용 전 kidneyfailurerisk.com 으로 두어 건 대조할 것. 화면에도 같은 문구를 띄웁니다.
2. **약제 컷오프는 미국 FDA 라벨(DailyMed)** 기준입니다. **국내 식약처 허가사항은 대조하지 않았습니다.**
3. **Eplerenone 의 "CrCl<50 금기"는 CrCl 기준이며 eGFR 이 아닙니다.** 입력은 eGFR 이므로 경계값(50–60)에서는
   "주의"로 낮추고 Cockcroft-Gault 확인을 요구하는 문구를 붙였습니다. 더 좋은 처리는 CrCl 입력칸 추가입니다.
4. **KSH 2026 은 공식 요약(Clin Hypertens 2026;32:e31)** 기준이고 전문은 미확인. 2025 AHA/ACC 는 미반영.
5. 미구현: 결과 복사 버튼(EMR용 텍스트) — `cardio-risk-calculator.html` 의 `copySummary()` 를 가져오면 됩니다.
6. HANDOFF-lipid-risk 6-7 의 제안(저장소를 `cardioquick/` 로 개명하고 공통 CSS 추출)은 여전히 미착수입니다.
   현재 네 도구가 CSS 를 각자 복사해 갖고 있습니다.

## 6. 빌드

```bash
cd build/ckd
python3 build_ckd.py        # _base_index.html(= index.html 사본) → ../../ckd-risk-calculator.html
```

`_base_index.html` 은 `index.html` 의 사본입니다. **`index.html` 을 고쳤다면 사본을 갱신한 뒤 다시 빌드**해야
두 도구가 어긋나지 않습니다. 앵커가 깨지면 빌드가 실패하면서 어느 단계인지 알려줍니다.

## 7. 검증 기록 (2026-11-06)

- headless Chromium `#test`: 고혈압 기존 점검 통과 + **CKD 25항목 전부 PASS**, 페이지 오류 없음
- CKD-EPI 2021 손계산 대조: 남 65세 Scr 1.8 → 41.26 · 여 50세 Scr 0.9 → 77.89
- KFRE 손계산 대조: 65세 남 eGFR 41.3 ACR 450 → 2년 1.83% / 5년 6.90% · 70세 여 eGFR 30 ACR 1000 → 6.31% / 22.30%
- 라이트·다크 × 데스크톱(1440px)·모바일(iPhone 13, 390px) 4종 스크린샷 확인
- 모바일 가로 오버플로 **0px** (`scrollWidth − innerWidth`)
- 새 색을 만들지 않고 기존 토큰(`--card2 --border --muted --accent --warn --r-*`)만 써서 테마 전환이 원본과 동일

## 8. 운영 메모

- 컴퓨터 쪽 셸(Claude 연결 폴더)에는 GitHub 인증이 없습니다 → **커밋까지만 하고 `git push` 는 Windows 에서** 하십시오.
- 커밋은 lock 파일 때문에 삭제 권한이 필요합니다 → 세션마다 폴더 삭제 권한 승인 1회.
- 커밋 작성자는 `tipcode-cpu <tipcode@gmail.com>` 로 `-c` 지정합니다.
- `service-worker.js` 의 `CACHE_NAME` 을 `cardioquick-v16-ckd` 로 올리고 ASSETS 에 네 도구를 모두 넣었습니다.
  **도구를 고칠 때마다 CACHE_NAME 을 올려야** 사용자 기기에 갱신이 전달됩니다.
