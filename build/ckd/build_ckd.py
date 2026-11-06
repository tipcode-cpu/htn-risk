#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ckd-risk-calculator.html 빌드.

index.html(고혈압 위험도 분류, KSH 2026)을 바탕으로 두고 CKD(KDIGO) 층만 얹는다.
교체는 전부 앵커 기반이며 하나라도 어긋나면 즉시 실패한다 —
"고혈압 도구 본체는 그대로 남는다"를 빌드가 보증하게 하려는 것이다.

  python3 build_ckd.py
"""
import re, sys, pathlib

HERE = pathlib.Path(__file__).parent
BASE = HERE / "_base_index.html"
OUT  = HERE / "ckd-risk-calculator.html"

def read(name):
    return (HERE / name).read_text(encoding="utf-8")

src = BASE.read_text(encoding="utf-8")
orig_len = len(src)
steps = []

def sub(label, anchor, replacement, count=1):
    """앵커가 정확히 count 번 나오지 않으면 실패한다."""
    global src
    n = src.count(anchor)
    if n != count:
        sys.exit(f"[FAIL] {label}: 앵커가 {n}번 나왔습니다 (기대 {count}번)\n  anchor={anchor[:90]!r}")
    src = src.replace(anchor, replacement, count)
    steps.append(label)

def insert_before(label, anchor, block):
    sub(label, anchor, block + anchor)

# ── 1. 제목 ────────────────────────────────────────────────────────────────
sub("title",
    "<title>고혈압 위험도 분류 · CardioQuick</title>",
    "<title>CKD 동반 고혈압 · CardioQuick</title>")

# ── 2. CSS ────────────────────────────────────────────────────────────────
insert_before("css", "</style>\n<script>\n(function initThemeEarly(){", read("ckd_add.css"))

# ── 3. CKD 입력을 1번 "수치 입력" 카드 안에 분산 삽입 ────────────────────
#    별도 카드를 두지 않고 해당 검사 바로 아래에 붙인다. KDIGO 전용 항목에는 seal 을 단다.
FRAG = {}
for _blk in read("ckd_input.html").split("<!-- @SPLIT ")[1:]:
    _name, _body = _blk.split(" -->", 1)
    FRAG[_name.strip()] = _body.rstrip() + "\n"

sub("seal-bp", '    <div id="bp-result" class="result"></div>\n',
    '    <div id="bp-result" class="result"></div>\n' + FRAG["bp"])
sub("seal-dm", '    <div id="hba1c-result" class="result"></div>\n',
    '    <div id="hba1c-result" class="result"></div>\n' + FRAG["dm"])
sub("seal-egfr", '    <div id="egfr-result" class="result"></div>\n',
    FRAG["egfr"] + '    <div id="egfr-result" class="result"></div>\n')
sub("seal-tail", '    <div id="uacr-result" class="result"></div>\n',
    '    <div id="uacr-result" class="result"></div>\n\n' + FRAG["tail"])

# 1번 카드의 소제목에 KDIGO 표식을 단다
sub("seal-h-bp", '<span data-i18n="s1_bp">혈압</span> <span class="req" data-i18n="tag_req">필수</span>',
    '<span data-i18n="s1_bp">혈압</span> <span class="req" data-i18n="tag_req">필수</span> <span class="seal">KDIGO</span>')
sub("seal-h-egfr", '<span data-i18n="s1_egfr">신장 기능 (eGFR)</span>',
    '<span data-i18n="s1_egfr">신장 기능 (eGFR)</span> <span class="seal">KDIGO</span>')
sub("seal-h-uacr", '<span data-i18n="s1_uacr">요 알부민/크레아티닌 (UACR)</span>',
    '<span data-i18n="s1_uacr">요 알부민/크레아티닌 (UACR)</span> <span class="seal">KDIGO</span>')
sub("seal-h-hba1c", '<span data-i18n="s1_hba1c">당화혈색소 (HbA1c)</span>',
    '<span data-i18n="s1_hba1c">당화혈색소 (HbA1c)</span> <span class="seal">KDIGO</span>')

# ── 4. 결과 카드 (footer 앞) ────────────────────────────────────────────────
insert_before("result-card", '  <div class="full footer">', read("ckd_result.html").lstrip("\n"))

# ── 5. i18n ────────────────────────────────────────────────────────────────
insert_before("i18n-ko", '  footer_text:"임상 의사결정 보조 도구입니다.', read("ckd_i18n_ko.js").lstrip("\n"))
insert_before("i18n-en", '  footer_text:"Clinical decision support tool.', read("ckd_i18n_en.js").lstrip("\n"))

# 표제·부제·적용범위 — 하이브리드임을 명시
sub("ko-doc_title",  'doc_title:"고혈압 위험도 분류 · CardioQuick",',
                     'doc_title:"CKD 동반 고혈압 · CardioQuick",')
sub("ko-app_title",  'app_title:"고혈압 심뇌혈관 위험도 분류",',
                     'app_title:"CKD 동반 고혈압 — 위험도 분류와 약제 적절성",')
sub("ko-subtitle",
    'app_subtitle:"대한고혈압학회 2026 진료지침 · 표 10 위험인자 / 표 11 위험도 분류 / 표 13 목표 혈압 · 의료진용",',
    'app_subtitle:"대한고혈압학회 2026 (표 10 · 11 · 13) + KDIGO 2024 CKD / 2021 BP · 의료진용",')
sub("ko-scope",
    '비만(BMI ≥25)·복부비만(남 ≥90, 여 ≥85 cm) 기준은 아시아-태평양 기준이며 ESC·AHA 정의와 다릅니다.",',
    '비만(BMI ≥25)·복부비만(남 ≥90, 여 ≥85 cm) 기준은 아시아-태평양 기준이며 ESC·AHA 정의와 다릅니다. '
    '여기에 <b>KDIGO 2024 CKD / 2021 BP</b> 층을 더해 CKD 병기·혈압 목표·약제 적절성을 함께 표시합니다. '
    'CKD 층은 위 고혈압 위험도 분류를 바꾸지 않습니다.",')
sub("en-doc_title", 'doc_title:"Hypertension CV Risk Stratification · CardioQuick",',
                    'doc_title:"Hypertension with CKD · CardioQuick",')
sub("en-app_title", 'app_title:"Hypertension Cardiovascular Risk Stratification",',
                    'app_title:"Hypertension with CKD — risk stratification and drug suitability",')
sub("en-subtitle",
    'app_subtitle:"Korean Society of Hypertension 2026 Guideline · Table 10 risk factors / Table 11 risk strata / Table 13 BP targets · For clinicians",',
    'app_subtitle:"Korean Society of Hypertension 2026 (Tables 10, 11, 13) with KDIGO 2024 CKD / 2021 BP · For clinicians",')
sub("en-scope",
    'Laboratory values are entered in conventional units (mg/dL).",',
    'Laboratory values are entered in conventional units (mg/dL). A <b>KDIGO 2024 CKD / 2021 BP</b> layer is added on top, '
    'showing CKD stage, blood pressure targets and antihypertensive suitability. The CKD layer does not alter the hypertension risk stratification.",')

# 오류 문구
# ko 의 ck_err 는 사전 안에 이미 있다. en 에만 넣는다.
sub("en-err", "  ck_sub_k:\"Serum potassium\",",
              "  ck_err:\"An error occurred while rendering the CKD layer. The hypertension result above is unaffected. Check the console.\",\n"
              "  ck_sub_k:\"Serum potassium\",")

# ── 6. 엔진 ───────────────────────────────────────────────────────────────
insert_before("engine", "function clearAll(){ location.reload(); }", read("ckd_engine.js").lstrip("\n") + "\n")

# ── 7. calc() 를 감싼다 — 고혈압 로직은 손대지 않고 CKD 층만 뒤에 붙인다 ────
sub("calc-rename", "function calc(){\n  var st=getState();",
                   "function calcHtn(){\n  var st=getState();")
insert_before("calc-wrapper", "\n// 표 11 시각화 (원본 색상 + 환자 셀 강조)",
"""
/* 고혈압 로직(calcHtn)을 먼저 끝내고 CKD 층을 그린다.
   CKD 층이 실패해도 위쪽 위험도 결과는 이미 그려져 있다. */
function calc(){
  calcHtn();
  try { renderCKD(getState()); }
  catch(e){
    console.error('CKD layer error', e);
    var o=document.getElementById('ckd-out');
    if(o) o.innerHTML = "<div class='ckwarn'><b>"+t('ck_err')+"</b></div>";
  }
}
""")

# ── 8. 자체 점검 ──────────────────────────────────────────────────────────
sub("selftest", "    console.log('self-check 완료');", read("ckd_selftest.js").strip("\n"))

OUT.write_text(src, encoding="utf-8")
print(f"[OK] {OUT.name}  {orig_len:,} → {len(src):,} bytes  (+{len(src)-orig_len:,})")
print("     steps: " + ", ".join(steps))
