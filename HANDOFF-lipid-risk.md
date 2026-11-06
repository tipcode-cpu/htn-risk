# HANDOFF — 이상지질혈증 2026 위험도·LDL 목표·Atozet 추천 계산기

작성일 2026-10-22 · 이 문서는 "웹툴 세션"으로 작업을 이관하기 위한 인계 노트입니다. 새 세션에서는 이 파일과 `lipid-risk-calculator.html` 하나만 읽으면 이어서 작업할 수 있습니다.

## 1. 산출물 · 위치

| 항목 | 값 |
|---|---|
| 로컬 파일 | `C:\Users\tipco\Documents\htn-risk\lipid-risk-calculator.html` (단일 HTML, 의존성 없음) |
| 저장소 | `github.com/tipcode-cpu/htn-risk` main, 커밋 `970543b` (2026-10-20) |
| 배포 URL | https://tipcode-cpu.github.io/htn-risk/lipid-risk-calculator.html |
| 형제 도구 | 고혈압 위험도 계산기 `index.html` → https://tipcode-cpu.github.io/htn-risk/ |
| 근거 문서 | 한국지질·동맥경화학회 『이상지질혈증 진료지침 2026』 요약본(27p PDF) — p.4 주요 위험인자, p.5 위험강화인자, p.6 목표치, p.7 LDL 농도별 치료, p.10 치료 전략, p.12 스타틴 약리, p.14–15 한국인 스타틴·복합제 강하효과, p.16–24 질환군별 권고 |
| 자체 점검 | `lipid-risk-calculator.html#test` 로 열면 콘솔에 4 시나리오·6 항목 PASS/FAIL 출력 |

## 2. 화면 구성 (3열, 1100px 이하 2열, 680px 이하 1열)

- **좌 (입력)** — 성별·나이 / LDL-C 직접측정(우선) 또는 TC·HDL·TG → Sampson/NIH 계산 / SBP·DBP·항고혈압제 / 키·체중(BMI) / Cr → eGFR(CKD-EPI 2021), UACR / Lp(a), hsCRP. 두 번째 카드 **현재 지질강하제**: 스타틴 종류·용량, ezetimibe, PCSK9i, bempedoic acid, 스타틴 불내성, 치료 전 LDL(선택).
- **중 (분류)** — ASCVD: CAD(+ACS 하위), 죽상경화성 뇌졸중/TIA(+재발 고위험 하위), 경동맥, PAD, AAA / 당뇨병(유병기간, 표적장기손상 5항목, "강화목표 적용(선택적)" 토글) / 주요 위험인자(연령·고혈압·HDL<40·HDL 60–100 보호 = 자동, 흡연·조기 CAD 가족력 = 수동) / 기타(FH, CKD, HIV, 임신·수유) / 위험강화인자 11개 + "목표 1단계 강화" 토글.
- **우 (결과, sticky)** — 위험군 배지 · KPI(현재 LDL / 목표 / 추가 감소율) · 목표표(≥50% 규칙, 기저치 역산, p.7 치료 구간, non-HDL 판정) · **약물 추천 박스** · 요법별 예상 강하율/예상 LDL/달성 표 · 권고등급 노트 · p.6 목표표(해당 행 강조) · "결과 복사" 버튼(EMR용 텍스트).

## 3. 핵심 로직 (JS 함수명)

- `countRF()` — 주요 위험인자 수. HDL 60–100이면 −1(최소 0). 당뇨병은 인자 수에 넣지 않음.
- `resolveGroup()` — 우선순위: CAD/ACS → 재발 고위험 뇌졸중 → DM+(TOD 또는 RF≥3)&토글 → [vhigh <55]; 뇌졸중·경동맥·PAD·AAA, DM+(유병≥10y 또는 RF≥1 또는 TOD) → [high <70]; DM → [dm <100]; RF≥2 → [mod <130]; 그 외 [low <160]. vhigh/high는 `need50=true`(기저 대비 ≥50%). FH는 목표만 override(RF/ASCVD 있으면 55, 없으면 70). 위험강화인자 토글은 low/mod에서만 한 단계 하향.
- `treatBand(target, ldl)` — p.7 표. 치료 중 환자는 역산 기저치로 판정.
- `currentRegimen()` — 현재 요법의 총 강하율. 스타틴+eze 조합은 한국인 복합제 표가 있으면 그 값, 없으면 `1−(1−s)(1−0.20)`; PCSK9i는 ×(1−0.55), bempedoic은 ×(1−0.17).
- 기저치: `baseline = 치료 전 LDL 입력값 || LDL_now/(1−eff_cur)`; `goal = need50 ? min(target, baseline×0.5) : target`; 달성 = `LDL < goal`(strict).
- `candidates()` — Atozet 10/10·20·40·80, Atozet 10/80+PCSK9i, (치료 중이면) 현재 스타틴+eze 추가, 현재 요법+PCSK9i; 불내성이면 eze / eze+bempedoic / eze+PCSK9i.
- `buildRecommendation()` 분기: 임신(III A) → 치료 중·달성 = "현재 치료 유지" → 미치료·생활습관 구간 = 약물 비권고(+"시작한다면" 용량) → 불내성 → ACS(즉시 10/40 이상, IIa B) → 치료 중[PCSK9i 포함 최대치료 미달 / Atozet 중 증량 또는 PCSK9i / 타 스타틴 → Atozet 전환 + 최소변경 대안] → 미치료[최저 달성 Atozet; 필요 ≤40%면 스타틴 단독 대안 병기; 60% 초과 시 10/80 → PCSK9i].

## 4. 효능 데이터 (코드 상단 `STATINS`, `ATOZET`)

지침 p.14–15 범위 중앙값. **※ 표시 = 지침에 없어 추정**(국외 문헌 기반).

| 요법 | 강하율 % | 비고 |
|---|---|---|
| Atorva 10/20/40/80 | 41.5 / 45.5 / 55.5 / 56 | 40과 80이 거의 같음(한국인 데이터 그대로) |
| Rosuva 5/10/20 | 44.5 / 46 / 51 | 2.5 mg 36 ※ |
| Pitava 2/4 | 36 / 42 | 1 mg 30 ※ |
| Atozet(eze10+atorva) 10/20/40/80 | 51.5 / 53.5 / 56.5 / **60 ※** | 5/10은 44.8 |
| Rosu+eze 5/10/20 | 58 / 60 / 63 | |
| Pita+eze 2/4 | 52.3 / 51.5 | |
| PCSK9i 증분 | 55 ※ | 현재 요법 대비 곱셈 적용 |
| eze 단독 19 ※ · eze 증분 20 ※ · bempedoic 증분 17 ※ | | |

## 5. 디자인 연속성 (고혈압 계산기와 공유)

- 동일 CSS 토큰·컴포넌트: `.card .row .pill .factor-grid>label.chk .badge .result .treat .gl-table`, 다크/라이트 테마(`localStorage['cardioquick-theme']` 공유), 우상단 "전체 지우기".
- 위험군 색: `--r-low`(녹) `--r-mod`(황) `--r-dm`(주황) `--r-high`(적) `--r-vhigh`(암적 #6d2033). 자동 반영 체크박스는 `.chk.auto`(노란 테두리), 하위 항목은 `.chk.sub`(점선·들여쓰기).
- 폰트 "Segoe UI","Malgun Gothic","Apple SD Gothic Neo"; 배경 #101216(다크) / #f8fafc(라이트).

## 6. 의도적 결정·미해결 사항 (새 세션에서 판단 필요)

1. **당뇨병 <55 강화목표**는 지침 표현("선택적")대로 기본 OFF 토글. 기본 ON으로 바꿀지 결정 필요.
2. **CKD**는 요약본에 별도 목표치가 없어 위험군을 바꾸지 않고 "스타틴±eze 권고(I A)" 노트만 표시. 2022판처럼 고위험으로 올릴지 검토.
3. **Atozet 10/80 = 60%**, **PCSK9i 증분 55%**는 추정치. 아토르바 40→80 증량 효과가 한국인 데이터상 미미하게 계산됨.
4. 치료 중 환자의 50% 규칙은 치료 전 LDL 미입력 시 "현재 요법 평균 강하율 ≥50%"와 동치가 됨(역산의 한계) — 화면에 "역산" 표기함.
5. non-HDL은 판정만 하고 약물 추천에는 반영하지 않음(TG≥200 시 이차 목표 노트만).
6. 미구현: 영문 토글(i18n), PWA manifest/service worker, 고혈압 계산기와의 상호 링크 버튼, LDL 값 두 계산기 간 전달(고혈압 쪽 "LDL 복사" 버튼 텍스트 형식 `LDL-C 123.4 mg/dL (Sampson/NIH)` 와 호환되는 붙여넣기 파서).
7. `manifest.json`이 로컬에서 CRLF 변경만 있는 상태(unstaged) — `git checkout manifest.json`으로 정리 가능.

## 7. 운영 메모

- 컴퓨터 쪽 셸(Claude 연결 폴더)에는 GitHub 인증이 없음 → 로컬 커밋을 `git bundle`로 가져와 클라우드 세션에서 푸시하는 방식 사용. 커밋 작성자는 `tipcode-cpu <tipcode@gmail.com>`로 `-c` 지정.
- 커밋은 삭제 권한(lock 파일) 필요 → 세션마다 폴더 삭제 권한 승인 1회.
- 웹툴 세션 통합 시 제안 구조: `htn-risk/` 를 `cardioquick/`로 개명하고 `index.html`(허브) → `htn/`, `lipid/` 하위 폴더, 공통 CSS를 `cardioquick.css`로 추출. 현재는 두 파일이 CSS를 각자 복사해 가지고 있음.
