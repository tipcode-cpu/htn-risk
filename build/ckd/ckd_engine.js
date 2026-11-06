
/* ══════════════════════════════════════════════════════════════
   CKD 층 (KDIGO 2024 CKD / 2021 BP) — 아래 로직은 언어와 무관하다.
   ⚠ 임상 규칙의 단일 출처. 규칙을 고칠 때는 근거(src)를 함께 고칠 것.
   고혈압 위험도 분류(표 10·11·13)는 위쪽 KSH 로직이 그대로 담당하며
   이 층은 그 결과를 바꾸지 않는다.

   2026-11-06 GPT(Codex) 독립 검수 반영:
   - 긴급 안전 경고를 UACR 유무와 무관하게 가장 먼저 그린다
   - 임신·투석·이식에서 신장보호제와 KFRE 를 차단한다
   - 칼륨·CrCl·당뇨 유형·최대 내약용량 RASi 가 없으면 "보류"로 두고
     확정적인 1선/금기 판정을 내지 않는다
   ══════════════════════════════════════════════════════════════ */

/* 문구 안의 {x} 를 값으로 바꾼다 — 숫자는 언어와 무관하므로 로직에서 넘긴다. */
function tf(key, vars){
  var s = t(key);
  if(!vars) return s;
  return s.replace(/\{(\w+)\}/g, function(m, k){ return (vars[k]!==undefined) ? vars[k] : m; });
}
function finite(v){ return (typeof v === 'number') && isFinite(v); }

/* ---------- KFRE 4변수 (Tangri). G3–G5 전용. ----------
   ⚠ 계수·baseline survival 은 2차 출처에서 얻어 1차 논문의 HR·중심화값과 대조한 것이다.
      1차 논문의 계수표는 확인하지 못했다. 화면에 이 사실을 표기한다. */
function calcKFRE(age, male, egfr, acr, northAmerica){
  if(!finite(age) || !finite(egfr) || !finite(acr)) return null;
  if(!(age>0) || !(egfr>0) || !(acr>0)) return null;
  var L = -0.2201*(age/10 - 7.036)
        +  0.2467*((male?1:0) - 0.5642)
        -  0.5567*(egfr/5 - 7.222)
        +  0.4510*(Math.log(acr) - 5.137);
  var S2 = northAmerica ? 0.9750 : 0.9832;
  var S5 = northAmerica ? 0.9240 : 0.9365;
  var r = { y2: 100*(1-Math.pow(S2, Math.exp(L))), y5: 100*(1-Math.pow(S5, Math.exp(L))) };
  return (finite(r.y2) && finite(r.y5)) ? r : null;
}

/* Cockcroft-Gault CrCl — 라벨의 금기 기준은 eGFR 이 아니라 CrCl 이다.
   체중이 없으면 null 을 돌려주고, 호출부는 확정 판정을 하지 않는다. */
function calcCrCl(age, weightKg, scr, female){
  if(!finite(age) || !finite(weightKg) || !finite(scr)) return null;
  if(!(age>0) || !(weightKg>0) || !(scr>0)) return null;
  return ((140-age) * weightKg * (female?0.85:1)) / (72*scr);
}

/* ---------- CKD 분류 (KDIGO 2024) ---------- */
function gStage(e){
  if(!finite(e) || e<=0) return null;
  if(e>=90) return "G1"; if(e>=60) return "G2"; if(e>=45) return "G3a";
  if(e>=30) return "G3b"; if(e>=15) return "G4"; return "G5";
}
function aStage(acr){
  if(!finite(acr) || acr<0) return null;
  if(acr<30) return "A1"; if(acr<=300) return "A2"; return "A3";
}
/* heat map 18칸. 1=저위험 2=중등도 3=고위험 4=초고위험 */
var HEATMAP = {
  G1:{A1:1,A2:2,A3:3}, G2:{A1:1,A2:2,A3:3},
  G3a:{A1:2,A2:3,A3:4}, G3b:{A1:3,A2:4,A3:4},
  G4:{A1:4,A2:4,A3:4},  G5:{A1:4,A2:4,A3:4}
};

/* CKD 입력 상태 — 위 KSH 상태(st)에서 필요한 값만 가져다 쓴다 */
function ckdState(st){
  var manual = num('ck-egfr');
  var egfr = finite(manual) ? manual : (st.eg ? st.eg.egfr : null);
  var acr  = st.ua ? st.ua.uacr : null;
  var k    = num('ck-k'); if(!finite(k)) k = null;
  var age  = num('age');  if(!finite(age)) age = null;
  var wt   = num('bmi-w'); if(!finite(wt)) wt = null;
  var scr  = num('egfr-cr'); if(!finite(scr)) scr = null;
  var dmType = document.getElementById('ck-dmtype').value;
  return {
    egfr:egfr, acr:acr, k:k, age:age, weight:wt, scr:scr,
    crcl: calcCrCl(age, wt, scr, chk('sex-f')),
    male: chk('sex-m'),
    egfrManual: finite(manual),
    gStage: gStage(egfr), aStage: aStage(acr),
    diabetes: st.dm, dmType: dmType,
    t2dm: dmType === 't2', t1dm: dmType === 't1',
    hf: chk('cvd-hf'), hfref: chk('ck-hfref'),
    bbIndication: chk('ck-bbind'),
    maxRasi: chk('ck-maxrasi'),
    pregnant: chk('ck-pregnant'),
    dialysis: chk('ck-dialysis'),
    transplant: chk('ck-transplant'),
    chronic: chk('ck-chronic'),
    measure: document.getElementById('ck-measure').value,
    northAmerica: document.getElementById('ck-region').value === 'na'
  };
}

/* ---------- 혈압 목표 ----------
   ⚠ 지침마다 값이 다르다. 하나로 합치지 않고 나란히 보여준다. */
function ckdBpTargets(p){
  var out = [];
  if(p.dialysis){
    out.push({src:t('ck_bt_common'), target:t('ck_bt_none'), note:t('ck_bt_dialysis_note')});
    return out;
  }
  if(p.transplant){
    out.push({src:"KDIGO 2021 (4.1)", target:"<130/80 mmHg", cls:"primary", note:t('ck_bt_tx_note')});
    out.push({src:"KSH 2026", target:"<130/80 mmHg", note:""});
    return out;
  }
  out.push({src:t('ck_bt_ksh_src'), target:"<130/80 mmHg", cls:"primary", note:t('ck_bt_ksh_note')});
  out.push({src:"KDIGO 2021/2024 (3.4.1)", target:t('ck_bt_kdigo'), note:t('ck_bt_kdigo_note')});
  out.push({src:"ESC 2024", target:t('ck_bt_esc'), note:t('ck_bt_esc_note')});
  return out;
}

/* ---------- 항고혈압제 등급 ----------
   1=1선 2=사용가능 3=주의 4=피함 0=참고/보류 */
function ckdGradeDrugs(p){
  var e = p.egfr, g = p.gStage, A = p.aStage;
  var R = [];
  function add(name, grade, why, src, sub){ R.push({name:name, grade:grade, why:why, src:src, sub:!!sub}); }
  var DM = t('ck_src_dailymed');

  /* ── ACEi / ARB — eGFR 저하만으로는 절대 중단 권고를 내지 않는다 ── */
  (function(){
    if(p.pregnant){ add(t('ck_d_rasi'), 4, t('ck_w_rasi_preg'), t('ck_src_fdaclass')); return; }
    if(p.transplant){ add("ARB", 1, t('ck_w_rasi_tx'), "KDIGO 2021 Rec 4.1 (1C)"); return; }
    var grade, why, src;
    if(A==="A3" && g!=="G5"){ grade=1; why=t('ck_w_rasi_a3'); src="KDIGO 2024 Rec 3.6 " + t('ck_src_recnum'); }
    else if(A==="A2" && p.diabetes){ grade=1; why=t('ck_w_rasi_a2dm'); src="KDIGO 2024 Rec 3.6 " + t('ck_src_recnum'); }
    else if(A==="A2"){ grade=2; why=t('ck_w_rasi_a2'); src="KDIGO 2024 Rec 3.6 " + t('ck_src_recnum'); }
    else { grade=2; why=t('ck_w_rasi_a1'); src="KDIGO 2024 PP 3.6.6 / KSH 2026"; }
    if(p.k!=null && p.k>5.5){
      grade=3; why=tf('ck_w_rasi_k', {k:p.k.toFixed(1)}); src="KDIGO 2024 PP 3.6.3, Fig 32";
    } else if(g==="G5"){
      grade=3; why=t('ck_w_rasi_g5'); src="KDIGO 2024 PP 3.6.5, 3.6.7 / STOP-ACEi NEJM 2022";
    }
    add(t('ck_d_rasi'), grade, why, src);
  })();

  /* ── CCB ── */
  add(t('ck_d_dhp'), 1,
      p.transplant ? t('ck_w_dhp_tx') : t('ck_w_dhp'),
      p.transplant ? "KDIGO 2021 Rec 4.1 (1C)" : "KDIGO 2021 BP");
  /* 비DHP 는 음성 수축력 때문에 HFrEF 에서 피한다 */
  if(p.hfref)      add(t('ck_d_ndhp'), 4, t('ck_w_ndhp_hfref'), "ESC/ACC HF · KDIGO 2021 BP");
  else if(p.hf)    add(t('ck_d_ndhp'), 3, t('ck_w_ndhp_hf'),    "ESC/ACC HF · KDIGO 2021 BP");
  else             add(t('ck_d_ndhp'), 2, t('ck_w_ndhp'),       "KDIGO 2021 BP / ESC 2024");

  /* ── 이뇨제 ── */
  if(e!=null && e>=30){
    add(t('ck_d_thiazide'), 1, t('ck_w_thz_ok'), "KSH 2026 / ESC 2024");
    add(t('ck_d_loop'), 2, t('ck_w_loop_ok'), "KDIGO 2021 BP");
  } else if(e!=null){
    add(t('ck_d_hctz'), 3, t('ck_w_hctz_low'), "KDIGO 2021 BP (p.S46)");
    add(t('ck_d_thzlike'), 2, t('ck_w_thzlike_low'), "KDIGO 2021 BP / CLICK NEJM 2021");
    add(t('ck_d_loop'), 1, t('ck_w_loop_low'), "KDIGO 2021 BP / ESC 2024 9.7.3");
  }

  /* ── MRA — 3종을 한 범주로 묶지 않는다 ── */
  (function(){
    if(e==null) return;
    var kHigh = (p.k!=null && p.k>5.0), kVeryHigh = (p.k!=null && p.k>5.5);
    /* spironolactone */
    if(kVeryHigh){
      add("Spironolactone", 4, tf('ck_w_spiro_k55', {k:p.k.toFixed(1)}), DM + " / KDIGO 2024 Fig 32");
    } else if(e>=45){
      add("Spironolactone", p.k==null ? 3 : (kHigh?3:2),
          p.k==null ? t('ck_w_spiro_nok') : (kHigh ? tf('ck_w_spiro_k', {k:p.k.toFixed(1)}) : t('ck_w_spiro_ok')),
          "AHA/ACC · ESC (eGFR≥45) / " + DM);
    } else if(e>=30){
      add("Spironolactone", 3, t('ck_w_spiro_3045'), DM + " / KDIGO PP 3.2.7");
    } else {
      add("Spironolactone", 4, t('ck_w_spiro_low'), "KDIGO PP 3.8.5 / " + DM);
    }
    /* eplerenone — 라벨 금기는 CrCl 기준이다. CrCl 이 없으면 확정 판정을 하지 않는다. */
    if(kVeryHigh){
      add("Eplerenone", 4, tf('ck_w_eple_k', {k:p.k.toFixed(1)}), DM);
    } else if(p.crcl == null){
      add("Eplerenone", 3, t('ck_w_eple_nocrcl'), DM);
    } else {
      var c = p.crcl, cs = " " + tf('ck_crcl_val', {c:c.toFixed(0)});
      if(c<=30)     add("Eplerenone", 4, t('ck_w_eple_30') + cs, DM);
      else if(c<50) add("Eplerenone", 4, t('ck_w_eple_50') + cs, DM);
      else          add("Eplerenone", p.k==null?3:2,
                        (p.k==null ? t('ck_w_eple_nok') : t('ck_w_eple_ok')) + cs, DM);
    }
  })();

  /* ── β차단제 ── */
  add(t('ck_d_bb'), p.bbIndication?1:2,
      p.bbIndication ? t('ck_w_bb_ind') : t('ck_w_bb_noind'), "KDIGO 2021 BP");
  if(p.crcl != null && p.crcl < 40)
    add(t('ck_d_bb_dose'), 0, tf('ck_w_bb_dose', {c:p.crcl.toFixed(0)}), DM, true);
  else if(p.crcl == null && e != null && e < 40)
    add(t('ck_d_bb_dose'), 0, t('ck_w_bb_dose_nocrcl'), DM, true);

  /* ── 기타 ── */
  add(t('ck_d_alpha'), 3, t('ck_w_alpha'), "ALLHAT 2000 / KDIGO 2021 BP");
  add(t('ck_d_central'), 3, t('ck_w_central'), "KDIGO 2021 BP / " + DM);
  return R;
}

/* ---------- 신장보호제 (항고혈압제가 아니므로 별도 층) ---------- */
function ckdGradeNephro(p){
  var e=p.egfr, a=p.acr, R=[];
  if(e==null || a==null) return R;

  /* 적용 자체가 성립하지 않는 상태를 먼저 걸러낸다 */
  if(p.pregnant){
    R.push({name:t('ck_d_sglt2'), grade:4, why:t('ck_w_sglt2_preg'), src:t('ck_src_fdaclass')});
    R.push({name:"Finerenone",    grade:4, why:t('ck_w_fine_preg'),  src:t('ck_src_fdaclass')});
    return R;
  }
  if(p.dialysis){
    R.push({name:t('ck_d_nephro_all'), grade:0, why:t('ck_w_nephro_dialysis'), src:"KDIGO 2024"});
    return R;
  }
  if(p.transplant){
    R.push({name:t('ck_d_nephro_all'), grade:0, why:t('ck_w_nephro_tx'), src:"KDIGO 2024 / KDIGO 2021 (4)"});
    return R;
  }

  /* ── SGLT2i ── */
  if(e>=20 && (a>=200 || p.hf || (p.t2dm && a>=30))){
    var cond = a>=200 ? t('ck_cond_acr200') : (p.hf ? t('ck_cond_hf') : t('ck_cond_t2dm'));
    R.push({name:t('ck_d_sglt2'), grade:1, why:tf('ck_w_sglt2_strong', {cond:cond}), src:"KDIGO 2024 (1A)"});
  } else if(e>=20 && e<45){
    R.push({name:t('ck_d_sglt2'), grade:2, why:t('ck_w_sglt2_2045'), src:"KDIGO 2024 (2B)"});
  } else if(e>=45){
    R.push({name:t('ck_d_sglt2'), grade:2, why:t('ck_w_sglt2_45'), src:"KDIGO 2024"});
  } else {
    R.push({name:t('ck_d_sglt2'), grade:3, why:t('ck_w_sglt2_low'), src:"KDIGO 2024 PP 3.7.1–3.7.3"});
  }
  if(p.t1dm) R.push({name:t('ck_d_sglt2_t1'), grade:3, why:t('ck_w_sglt2_t1'), sub:true, src:t('ck_src_fda')});
  R.push({name:t('ck_d_sglt2_note'), grade:0, why:t('ck_w_sglt2_note'), sub:true,
    src:"ESC 2024 / KSH 2026 / KDIGO 2024"});

  /* ── Finerenone — 제2형 당뇨, K 확인, 최대 내약용량 RASi 가 전제 ── */
  (function(){
    if(p.t1dm){ R.push({name:"Finerenone", grade:4, why:t('ck_w_fine_t1'), src:t('ck_src_fda')}); return; }
    if(!p.diabetes || !p.t2dm){
      R.push({name:"Finerenone", grade:3,
        why: p.diabetes ? t('ck_w_fine_dmunknown') : t('ck_w_fine_nodm'),
        src:"KDIGO 2024 Rec 3.8.1 / FIND-CKD"});
      return;
    }
    if(!(e>25))  { R.push({name:"Finerenone", grade:4, why:t('ck_w_fine_egfr'), src:"KDIGO 2024 Rec 3.8.1 / "+t('ck_src_fda')}); return; }
    if(!(a>=30)) { R.push({name:"Finerenone", grade:4, why:t('ck_w_fine_acr'),  src:"KDIGO 2024 Rec 3.8.1 / "+t('ck_src_fda')}); return; }
    if(p.k==null){
      R.push({name:"Finerenone", grade:3, why:t('ck_w_fine_nok'), src:"KDIGO 2024 Fig 26"});
    } else if(p.k>5.0){
      R.push({name:"Finerenone", grade:3, why:tf('ck_w_fine_k', {k:p.k.toFixed(1)}), src:"KDIGO 2024 Fig 26"});
    } else if(!p.maxRasi){
      R.push({name:"Finerenone", grade:3, why:t('ck_w_fine_norasi'), src:"KDIGO 2024 Rec 3.8.1 (2A)"});
    } else {
      R.push({name:"Finerenone", grade:1,
        why: tf('ck_w_fine_ok', {dose: e<60?"10 mg":"20 mg", band: e<60?"25–59":"≥60"}),
        src:"KDIGO 2024 Rec 3.8.1 (2A), Fig 26 / FIDELIO-DKD"});
    }
    R.push({name:t('ck_d_fine_k'), grade:0, why:t('ck_w_fine_kproto'), sub:true, src:"KDIGO 2024 Fig 26"});
  })();
  return R;
}

/* ---------- 긴급 안전 경고 — UACR 유무와 무관하게 항상 먼저 그린다 ---------- */
function ckdUrgent(p){
  var U=[];
  if(p.k!=null){
    if(p.k>=6.5)      U.push({t:t('ck_sf_k65_t'), d:t('ck_sf_k65_d'), s:"KDIGO 2024 Table 28"});
    else if(p.k>=6.0) U.push({t:t('ck_sf_k60_t'), d:t('ck_sf_k60_d'), s:"KDIGO 2024 Table 28"});
    else if(p.k>5.5)  U.push({t:t('ck_sf_k55_t'), d:t('ck_sf_k55_d'), s:"KDIGO 2024 Fig 32"});
  }
  if(p.pregnant) U.push({t:t('ck_sf_preg_t'), d:t('ck_sf_preg_d'), s:t('ck_src_fdaclass')});
  return U;
}

/* ---------- 안전·모니터링 ---------- */
function ckdSafety(p){
  var C=[], e=p.egfr;
  C.push({t:t('ck_sf_dual_t'),    d:t('ck_sf_dual_d'),    s:"KDIGO 2021 Rec 3.3.1 (1B)"});
  C.push({t:t('ck_sf_monitor_t'), d:t('ck_sf_monitor_d'), s:"KDIGO 2024 PP 3.6.2, 3.6.4"});
  C.push({t:t('ck_sf_cr30_t'),    d:t('ck_sf_cr30_d'),    s:"KDIGO 2024"});
  if(e!=null && e<30) C.push({t:t('ck_sf_stop_t'), d:t('ck_sf_stop_d'), s:"STOP-ACEi NEJM 2022"});
  if(p.measure && p.measure!=="std")
    C.push({t:t('ck_sf_meas_t'), d:t('ck_sf_meas_d'), s:"KDIGO 2021 PP 3.1.1", urgent:true});
  if(!p.chronic)
    C.push({t:t('ck_sf_chronic_t'), d:t('ck_sf_chronic_d'), s:"KDIGO 2024 PP 1.1.3.2", urgent:true});
  return C;
}

/* ---------- 렌더 ---------- */
function ckdGradeLabel(g){ return g>=1 && g<=4 ? t('ck_g'+g) : t('ck_g0'); }

function drugRows(list){
  var h="";
  for(var i=0;i<list.length;i++){
    var d=list[i];
    h += "<div class='drugrow"+(d.sub?" sub":"")+"'>"+
           "<div class='gr gr-"+d.grade+"'>"+ckdGradeLabel(d.grade)+"</div>"+
           "<div><div class='nm'>"+d.name+"</div>"+
           "<div class='why'>"+d.why+"</div>"+
           "<div class='src'>"+d.src+"</div></div></div>";
  }
  return h;
}
function urgentRows(list){
  var h="";
  for(var i=0;i<list.length;i++)
    h += "<div class='ckitem urgent'><div class='t'>"+list[i].t+"</div>"+
         "<div class='d'>"+list[i].d+"</div><div class='s'>"+list[i].s+"</div></div>";
  return h;
}

function renderCKD(st){
  var out = document.getElementById('ckd-out');
  var p = ckdState(st);

  /* 긴급 경고가 입력 부족 때문에 사라지지 않게 가장 먼저 그린다 */
  var U = ckdUrgent(p);
  var head = U.length ? "<div class='ckd-sub'>"+t('ck_h_urgent')+"</div>" + urgentRows(U) : "";

  if(p.egfr==null || p.acr==null){
    var msg = (p.egfr==null) ? t('ck_need_egfr') : t('ck_need_acr');
    var partial = "";
    if(p.egfr!=null && p.acr==null)
      partial = "<div class='ckd-badges'><span class='gab'>"+p.gStage+"</span>"+
                "<span class='muted'>eGFR "+p.egfr.toFixed(1)+" · "+t('ck_a_unknown')+"</span></div>";
    out.innerHTML = head + partial + "<div class='ckempty'>" + msg + "</div>";
    return;
  }

  var risk = HEATMAP[p.gStage][p.aStage];
  var H = head;

  /* 1. 분류 + heat map */
  H += "<div class='ckd-sub'>"+t('ck_h_class')+"</div>";
  H += "<div class='ckd-badges'><span class='gab'>"+p.gStage+"</span><span class='gab'>"+p.aStage+"</span>"+
       "<span class='krisk kr"+risk+"'>"+t('ck_risk'+risk)+"</span>"+
       "<span class='muted'>eGFR "+p.egfr.toFixed(1)+
       (p.egfrManual? " ("+t('ck_src_manual')+")" : " ("+t('ck_src_epi')+")")+
       " · UACR "+p.acr.toFixed(1)+" mg/g"+
       (p.crcl!=null ? " · CrCl "+p.crcl.toFixed(0)+" mL/min" : "")+"</span></div>";

  var gs=["G1","G2","G3a","G3b","G4","G5"];
  var gl={G1:"≥90",G2:"60–89",G3a:"45–59",G3b:"30–44",G4:"15–29",G5:"&lt;15"};
  var hm="<div id='ckd-heatwrap'><table class='ckd-hm'><tr><th></th>"+
         "<th>A1<br>&lt;30</th><th>A2<br>30–300</th><th>A3<br>&gt;300</th></tr>";
  for(var i=0;i<gs.length;i++){
    hm += "<tr><td class='lab'>"+gs[i]+"<br>"+gl[gs[i]]+"</td>";
    var as=["A1","A2","A3"];
    for(var j=0;j<as.length;j++){
      var c=HEATMAP[gs[i]][as[j]];
      var here=(gs[i]===p.gStage && as[j]===p.aStage);
      hm += "<td class='k"+c+(here?" here":"")+"'>"+(here? t('ck_here') : t('ck_short'+c))+"</td>";
    }
    hm += "</tr>";
  }
  hm += "</table></div>";
  H += hm;
  /* 검사상 범주와 CKD 확정 진단은 다르다 — chronic 체크 여부와 무관하게 알린다 */
  H += "<div class='ckwarn'>" + (p.chronic ? t('ck_warn_dx') : t('ck_warn_chronic')) + "</div>";

  /* 2. 혈압 목표 — 지침별로 나란히 */
  H += "<div class='ckd-sub'>"+t('ck_h_bp')+"</div>";
  var sbp=num('sbp'), dbp=num('dbp');
  if(finite(sbp)&&finite(dbp)){
    H += "<div style='font-weight:800;margin-bottom:8px;'>"+t('ck_bt_current')+" "+sbp+"/"+dbp+
         " mmHg <span class='muted' style='font-weight:600'>("+t('ck_m_'+p.measure)+")</span></div>";
  }
  var tg = ckdBpTargets(p);
  for(var i=0;i<tg.length;i++){
    H += "<div class='bpt"+(tg[i].cls==="primary"?" primary":"")+"'>"+
         "<div class='src'>"+tg[i].src+"</div><div class='tgt'>"+tg[i].target+"</div>"+
         (tg[i].note? "<div class='note'>"+tg[i].note+"</div>" : "")+"</div>";
  }
  /* 두 경로(고혈압 위험도 / CKD)의 목표가 갈리는 경우를 숨기지 않는다 */
  if(!p.dialysis && st.bp.code>=2){
    var htnR = resolve(st);
    if(htnR && !bpTarget(st, htnR.key).low) H += "<div class='ckwarn'>"+t('ck_warn_target_split')+"</div>";
  }

  /* 3. 항고혈압제 등급 */
  H += "<div class='ckd-sub'>"+t('ck_h_drugs')+"</div>";
  H += "<div class='gleg'><span class='gr-1'>"+t('ck_g1')+"</span><span class='gr-2'>"+t('ck_g2')+
       "</span><span class='gr-3'>"+t('ck_g3')+"</span><span class='gr-4'>"+t('ck_g4')+"</span></div>";
  H += drugRows(ckdGradeDrugs(p));

  /* 4. 신장보호제 */
  H += "<div class='ckd-sub'>"+t('ck_h_nephro')+"</div>";
  H += drugRows(ckdGradeNephro(p));
  H += "<div class='ckwarn'>"+t('ck_warn_nephro')+"</div>";

  /* 5. KFRE — G3–G5, 비투석에서만 */
  H += "<div class='ckd-sub'>"+t('ck_h_kfre')+"</div>";
  var kf = null, blocked = null;
  if(p.dialysis)                                        blocked = t('ck_kfre_dialysis');
  else if(p.transplant)                                 blocked = t('ck_kfre_tx');
  else if(["G3a","G3b","G4","G5"].indexOf(p.gStage)<0)  blocked = tf('ck_kfre_na', {g:p.gStage||"—"});
  else if(p.age==null)                                  blocked = t('ck_kfre_needage');
  else {
    kf = calcKFRE(p.age, p.male, p.egfr, p.acr, p.northAmerica);
    if(kf==null) blocked = t('ck_kfre_badinput');
  }
  if(kf){
    H += "<div class='kfre'><div class='k'><div class='v'>"+kf.y2.toFixed(1)+"%</div>"+
         "<div class='l'>"+t('ck_kfre_2y')+"</div></div>"+
         "<div class='k'><div class='v'>"+kf.y5.toFixed(1)+"%</div>"+
         "<div class='l'>"+t('ck_kfre_5y')+"</div></div></div>";
    var acts=[];
    if(kf.y5>=3)  acts.push(t('ck_kfre_a1'));
    if(kf.y2>=10) acts.push(t('ck_kfre_a2'));
    if(kf.y2>=40) acts.push(t('ck_kfre_a3'));
    for(var i=0;i<acts.length;i++) H += "<div class='ckitem'><div class='t'>"+acts[i]+"</div></div>";
    H += "<div class='ckwarn'>"+tf('ck_kfre_warn',
          {region: p.northAmerica ? t('ck_r_na_s') : t('ck_r_non_s')})+"</div>";
  } else {
    H += "<div class='ckempty'>"+blocked+"</div>";
  }

  /* 6. 안전·모니터링 */
  H += "<div class='ckd-sub'>"+t('ck_h_safety')+"</div>";
  var sc = ckdSafety(p);
  for(var i=0;i<sc.length;i++){
    H += "<div class='ckitem"+(sc[i].urgent?" urgent":"")+"'>"+
         "<div class='t'>"+sc[i].t+"</div><div class='d'>"+sc[i].d+"</div>"+
         "<div class='s'>"+sc[i].s+"</div></div>";
  }

  H += "<div class='ckwarn'>"+t('ck_sources')+"</div>";
  out.innerHTML = H;
}
