    console.log('self-check (고혈압) 완료');

    /* ── CKD 층 자체 점검 ─────────────────────────────────────── */
    (function ckdSelfTest(){
      var fail = 0;
      function ok(name, cond){ if(!cond){ fail++; console.error('FAIL ' + name); } else console.log('PASS ' + name); }
      function near(a, b, tol){ return Math.abs(a-b) <= tol; }
      function set(id, v){ var e=document.getElementById(id); if(e) e.value = v; }
      function check(id, v){ var e=document.getElementById(id); if(e) e.checked = !!v; }

      /* 병기 경계 */
      ok('gStage 경계', gStage(90)==='G1' && gStage(89.9)==='G2' && gStage(60)==='G2' &&
                        gStage(59.9)==='G3a' && gStage(45)==='G3a' && gStage(44.9)==='G3b' &&
                        gStage(30)==='G3b' && gStage(29.9)==='G4' && gStage(15)==='G4' && gStage(14.9)==='G5');
      ok('aStage 경계', aStage(29.9)==='A1' && aStage(30)==='A2' && aStage(300)==='A2' && aStage(300.1)==='A3');

      /* heat map 18칸이 모두 1~4 */
      var cells = 0, bad = 0;
      for(var g in HEATMAP) for(var a in HEATMAP[g]){ cells++; var v=HEATMAP[g][a]; if(!(v>=1&&v<=4)) bad++; }
      ok('heat map 18칸', cells===18 && bad===0);

      /* CKD-EPI 2021 — 손으로 검산한 기준값 */
      check('sex-m', true); check('sex-f', false); set('age', 65); set('egfr-cr', 1.8);
      ok('CKD-EPI 남 65세 Scr 1.8 ≈ 41.26', near(computeEGFR().egfr, 41.26, 0.05));
      check('sex-m', false); check('sex-f', true); set('age', 50); set('egfr-cr', 0.9);
      ok('CKD-EPI 여 50세 Scr 0.9 ≈ 77.89', near(computeEGFR().egfr, 77.89, 0.05));

      /* KFRE — 손으로 검산한 기준값 (비북미 계수) */
      var k1 = calcKFRE(65, true, 41.3, 450, false);
      ok('KFRE 65세 남 eGFR41.3 ACR450 ≈ 1.83 / 6.90',
         near(k1.y2, 1.83, 0.05) && near(k1.y5, 6.90, 0.05));
      var k2 = calcKFRE(70, false, 30, 1000, false);
      ok('KFRE 70세 여 eGFR30 ACR1000 ≈ 6.31 / 22.30',
         near(k2.y2, 6.31, 0.05) && near(k2.y5, 22.30, 0.05));

      /* ── 임상 규칙 회귀 방지 ─────────────────────────────────── */
      function grades(p){ var m={}; var L=ckdGradeDrugs(p); for(var i=0;i<L.length;i++) m[L[i].name]=L[i]; return m; }
      var base = {egfr:25, acr:500, k:4.2, age:70, male:true, gStage:'G4', aStage:'A3',
                  diabetes:false, hf:false, bbIndication:false, pregnant:false,
                  dialysis:false, transplant:false, chronic:true, measure:'std', northAmerica:false};

      /* eGFR 저하만으로 RASi 를 끊지 않는다 (STOP-ACEi) */
      ok('eGFR 25·A3 에서 RASi 는 1선', grades(base)[t('ck_d_rasi')].grade === 1);
      var g5 = Object.assign({}, base, {egfr:10, gStage:'G5'});
      ok('eGFR 10 에서도 RASi 는 피함(4)이 아니다', grades(g5)[t('ck_d_rasi')].grade === 3);

      /* 고칼륨혈증은 중단이 아니라 주의 + K 조절 우선 */
      var kHi = Object.assign({}, base, {k:5.8});
      var r = grades(kHi)[t('ck_d_rasi')];
      ok('K 5.8 → RASi 주의(3)', r.grade === 3);
      ok('K 5.8 → 중단보다 K 조절이 먼저라는 문구', r.why.indexOf('5.8') >= 0);

      /* 임신은 금기 */
      ok('임신 → RASi 피함(4)', grades(Object.assign({}, base, {pregnant:true}))[t('ck_d_rasi')].grade === 4);

      /* MRA 3종을 한 범주로 묶지 않는다 */
      var m60 = grades(Object.assign({}, base, {egfr:55, gStage:'G3a'}));
      ok('eGFR 55 — eplerenone 은 CrCl 경계로 주의(3)', m60['Eplerenone'].grade === 3);
      ok('eGFR 55 — spironolactone 과 등급이 다르다', m60['Spironolactone'].grade !== m60['Eplerenone'].grade);

      /* 신장보호제 */
      function nephro(p){ var m={}; var L=ckdGradeNephro(p); for(var i=0;i<L.length;i++) m[L[i].name]=L[i]; return m; }
      ok('eGFR≥20 & ACR≥200 → SGLT2i 1선', nephro(base)[t('ck_d_sglt2')].grade === 1);
      ok('비당뇨 → finerenone 은 1선이 아니다', nephro(base)['Finerenone'].grade !== 1);
      var dmOK = Object.assign({}, base, {diabetes:true, egfr:40, k:4.5});
      ok('제2형 당뇨 + eGFR40 + ACR500 + K4.5 → finerenone 1선', nephro(dmOK)['Finerenone'].grade === 1);
      ok('K 5.4 면 finerenone 을 시작하지 않는다',
         nephro(Object.assign({}, dmOK, {k:5.4}))['Finerenone'].grade === 3);

      /* 안전 체크리스트 */
      function titles(p){ return ckdSafety(p).map(function(c){ return c.t; }); }
      ok('만성 미확인 → 경고 항목', titles(Object.assign({}, base, {chronic:false})).indexOf(t('ck_sf_chronic_t')) >= 0);
      ok('만성 확인 → 그 경고 없음', titles(base).indexOf(t('ck_sf_chronic_t')) < 0);
      ok('가정혈압 → 측정방법 경고', titles(Object.assign({}, base, {measure:'home'})).indexOf(t('ck_sf_meas_t')) >= 0);
      ok('ACEi+ARB 병용금지는 항상 표시', titles(base).indexOf(t('ck_sf_dual_t')) >= 0);

      /* 혈압 목표를 하나로 합치지 않는다 */
      ok('일반 CKD → 지침 3종을 나란히', ckdBpTargets(base).length === 3);
      ok('투석 → 목표 없음 1줄', ckdBpTargets(Object.assign({}, base, {dialysis:true})).length === 1);

      /* 언어를 바꿔도 등급은 같아야 한다 */
      setLang('ko'); var ko = ckdGradeDrugs(base).map(function(d){ return d.grade; }).join(',');
      setLang('en'); var en = ckdGradeDrugs(base).map(function(d){ return d.grade; }).join(',');
      ok('언어가 등급을 바꾸지 않는다', ko === en);
      setLang('ko');

      /* eGFR 직접 입력이 크레아티닌 계산값을 덮어쓴다 */
      check('sex-m', true); check('sex-f', false); set('age', 60); set('egfr-cr', 1.0);
      set('uacr-alb', 50); set('uacr-cr', 100); set('ck-egfr', 33);
      var p = ckdState(getState());
      ok('eGFR 직접 입력 우선', near(p.egfr, 33, 0.001) && p.egfrManual === true && p.gStage === 'G3b');
      set('ck-egfr', '');
      ok('직접 입력을 지우면 계산값으로 복귀', ckdState(getState()).egfrManual === false);

      console.log(fail === 0 ? 'CKD 자체 점검 전부 통과' : 'CKD 자체 점검 실패 ' + fail + '건');
    })();
