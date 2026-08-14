# htn-risk

Cardiovascular risk stratification for hypertension, implementing the
**Korean Society of Hypertension (KSH) 2026 guideline** — Table 10 (risk factors),
Table 11 (risk strata) and Table 13 (blood pressure targets), Recommendations 8–13.

대한고혈압학회 2026 진료지침 기반 심뇌혈관 위험도 분류 계산기.

**Live:** https://tipcode-cpu.github.io/htn-risk/

Available in **Korean and English** — switch with the 한국어 / EN buttons at the
top right. The choice is stored on the device.

## What it does

Enter sex, age and blood pressure; everything else is optional. Any laboratory
value you enter is computed and folded into the risk factor count automatically:

| Input | Computed | Applied as |
|---|---|---|
| Height, weight | BMI | Obesity risk factor at BMI ≥25 |
| TC, HDL-C, TG | LDL-C (Sampson/NIH; Martin-Hopkins shown for comparison) | Dyslipidaemia risk factor |
| HbA1c | Diabetes / prediabetes | 2 or 1 risk factors |
| Serum creatinine | eGFR (CKD-EPI 2021, race-free) | Clinical CKD at eGFR <60 |
| Urine albumin, creatinine | UACR | Microalbuminuria → organ damage; >300 → clinical CKD |

Output is the risk group, the applicable blood pressure target, when to start
drug therapy, and the Table 11 matrix with the patient's cell highlighted.

## Scope and limits

- Implements the **Korean** guideline. Obesity (BMI ≥25) and abdominal obesity
  (waist ≥90 cm men, ≥85 cm women) use Asia-Pacific criteria and **differ from
  ESC and AHA definitions**. Read the risk strata with that in mind.
- Laboratory values are entered in **conventional units (mg/dL)**. SI units are
  not currently supported.
- Borderline cells in Table 11 (printed as "or") are resolved to a single risk
  group using the guideline text; the table still shows the original range.
- Clinical decision support only. The treating clinician makes the final call.

## Running it

Single self-contained HTML file — no build, no server, no dependencies.
Open `index.html`, or install it from the live URL as a PWA
(Share → Add to Home Screen on iOS; ⋮ → Install on Android Chrome).
It works offline once loaded. No data leaves the device.

Open `index.html#test` and check the console to run the built-in self-check.

## Editing the text

All user-facing strings live in the `I18N` object at the top of the script, with
`ko` and `en` side by side. The calculation logic is language-independent — when
the guideline changes, update the numbers in the logic and both language entries.
