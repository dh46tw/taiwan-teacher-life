import { S } from './state.js';
import { rollDice, addAb } from './growth.js';
import { card, board, choose, divider, allocUI } from '../ui/render.js';
import { drawEvent } from './events.js';
import { chooseIntensity, owAccrue, owGamble, rollInjury, applyDecline, handleSickLeaveYear } from './ow.js';
import { examChoice } from './exam.js';
import { ovr, jobTitle, mgmtVFor, accrueCareerScoreForYear, rollAward, settleDirTenure, settlePrinTenure, deptAppointBonus, principalAppointBonus } from './scoring.js';
import { retireSummaryHtml } from './summary.js';
import { endingActions } from '../ui/share.js';
import { checkLateBloom, checkStayput, retirementTraitBonus } from './traits-unlock.js';
import { clamp, chance, pick, ri } from './rng.js';
import { EXAM_TH, SCHOOLS, TIERS, ABL } from '../data/tables.js';
import { INTERN_EVENTS } from '../data/events.js';

/* 同校連續服務年數追蹤（堅守校園判定用，對應 WIKI 九） */
function trackSchoolTenure(){
  if(S.prevSchool&&S.prevSchool===S.school)S.schoolYears=(S.schoolYears||0)+1;
  else S.schoolYears=S.school?1:0;
  S.prevSchool=S.school;
  checkStayput();
}

/* ================= 年度流程（對應 WIKI 二、五、六：代理↔正式教甄／導師／組長／主任／校長／介聘／積分／退休）================= */
function renderAwardCards(granted){ granted.forEach(a=>card('gold','年度榮譽',`榮獲 <b class="hl">${a.name}</b>！教育積分額外 <b class="up">+${a.score}</b>。`)); }
export function advanceYear(){ S.age++; S.year++; }
export function yearHeader(){
  if(S.phase==='實習')return `${S.year} 年 · ${S.age} 歲 · 教育實習`;
  if(S.phase==='代理')return S.school?`${S.year} 年 · ${S.age} 歲 · 代理教師・${S.region}${S.school}`:`${S.year} 年 · ${S.age} 歲 · 代理教師（尋找職缺中）`;
  if(S.phase==='正職')return `${S.year} 年 · ${S.age} 歲 · ${S.region}${jobTitle()}・${S.school}`;
  return `${S.year} 年 · ${S.age} 歲`;
}
export function startYear(){
  if(S.done)return;
  if(retireEligible().byAge){ endGameRetire('byAge'); return; }
  divider(yearHeader()); board(0);
  switch(S.phase){
    case '實習': internFlow(); break;
    case '代理': subYear(); break;
    case '正職': proYear(); break;
    default: subYear();
  }
}
/* 教育實習結束＝代理／正式同時投考的第一次教師甄試（對應 WIKI 二） */
export function internFlow(){
  card('info','教育實習','為期半年的教育實習正式展開，教學現場的第一堂震撼教育才剛開始。');
  internEvent(()=>{
    card('info','教育實習','半年實習期滿，正式取得投考教師甄試的資格。');
    S.phase='代理';
    choose('',[{t:'參加教師甄試 ▸',main:true,f:()=>examChoice(()=>startYear())}]);
  });
}
/* 實習期間簡化版事件卡：三選一、固定效果直接生效（非 WIKI 條文，使用者要求補充） */
function internEvent(next){
  const ev=pick(INTERN_EVENTS);
  choose(`實習事件｜${ev.n} — 你要怎麼做？`,ev.choices.map(c=>({
    t:c.t,
    f:()=>{
      const out=Object.keys(c.fx).map(k=>{
        const g=addAb(k,c.fx[k]);
        return `${ABL[k]} <b class="${g>0?'up':g<0?'dn':'hl'}">${g>0?'+'+g:g}</b>`;
      });
      card('info',`實習事件｜${ev.n}`,`${c.text}<br>${out.join('、')}`);
      board(0);
      next();
    },
  })));
}

/* ---------- 退休資格三分類（對應 WIKI 十） ---------- */
export function retireEligible(){
  const voluntary=(S.teachYears||0)>=25
    || ((S.svcTotal||0)>=5&&S.age>=60)
    || ((S.svcTotal||0)>=15&&(S.owBigCount||0)>=2);
  const byAge=(S.svcTotal||0)>=5&&S.age>=65;
  return {voluntary,byAge};
}
const RETIRE_TEXT={
  byAge:{title:'屆齡退休',body:'服務年資與年齡皆已達屆齡退休門檻，學校依規定辦理退休。'},
  voluntary:{title:'自願退休',body:'年資或年齡已達自願退休條件，決定為這段教職生涯畫下句點。'},
};
export function endGameRetire(kind){
  board(2);
  if(S.job==='主任')settleDirTenure();
  if(S.job==='校長')settlePrinTenure();
  retirementTraitBonus();
  const t=RETIRE_TEXT[kind]||{title:'退休',body:'教職生涯告一段落。'};
  divider(`${S.year} 年 · ${S.age} 歲 · ${t.title}`);
  card('gold',t.title,`${t.body}${retireSummaryHtml()}`);
  endingActions();
}

/* ---------- 代理教師（年度迴圈） ---------- */
function subYear(){
  applyDecline();
  if(handleSickLeaveYear()){
    choose('',[{t:'▸ 熬過這一年 ▸',main:true,f:()=>{ advanceYear(); startYear(); }}]);
    return;
  }
  if(retireEligible().voluntary){
    choose('是否申請本年度自願退休？',[
      {t:'申請自願退休',warn:true,f:()=>endGameRetire('voluntary')},
      {t:'繼續任教 ▸',main:true,f:()=>subYearContinue()},
    ]);
    return;
  }
  if(!S.school){ assignSubPlacement(()=>subYearContinue()); return; }
  subYearContinue();
}
/* 代理教師找職缺（新設計，對應 WIKI 一「續聘」分岔事件；起始數值待試玩校準） */
function assignSubPlacement(next){
  choose('尋找代理教師職缺，想投遞哪個地理分級？',[
    {t:'六都',f:()=>rollSubPlacement('六都',next)},
    {t:'非六都',main:true,f:()=>rollSubPlacement('非六都',next)},
    {t:'離島偏鄉',f:()=>rollSubPlacement('離島偏鄉',next)},
  ]);
}
function rollSubPlacement(tier,next){
  const got=chance(85)?tier:pick(TIERS.filter(t=>t!==tier));
  S.region=got; S.school=pick(SCHOOLS[got]);
  if(got===tier)card('info','代理職缺',`順利在 <b class="hl">${S.region}</b> 的 <b class="hl">${S.school}</b> 找到代理職缺。`);
  else card('info','代理職缺',`原本想去${tier}，但目前缺額有限，最後在 <b class="hl">${got}</b> 的 <b class="hl">${S.school}</b> 找到代理職缺。`);
  board(0); next();
}
function subYearContinue(){
  trackSchoolTenure();
  chooseIntensity(()=>{
    const dice=rollDice();
    const ovrBefore=ovr();
    choose('',[{t:`▸ 分配教育經驗（${dice.length} 顆骰）`,main:true,f:()=>{
      allocUI({dice},'分配教育經驗（代理教師）',(totalGot)=>{
        checkLateBloom(ovrBefore,totalGot);
        board(1);
        rollInjury(noInjury=>{ if(noInjury)drawEvent(subEnd); else subEnd(); });
      });
    }}]);
  });
}
function subEnd(){
  board(2);
  owAccrue();
  S.teachYears=(S.teachYears||0)+1; S.subYearsTotal=(S.subYearsTotal||0)+1;
  accrueCareerScoreForYear();
  card('info','學期末結算',`本年度以代理教師身份任教（服務年資 ${S.teachYears} 年）。`);
  board(2);
  owGamble(()=>{
    if(S.done)return;
    examChoice(()=>{
      if(S.done)return;
      if(S.phase==='代理'){ subRenewalStep(()=>{ advanceYear(); startYear(); }); }
      else { advanceYear(); startYear(); }
    });
  });
}
/* 代理教師續聘（新設計，對應 WIKI 一「續聘」分岔事件；起始數值待試玩校準） */
function subRenewalStep(next){
  choose('是否尋求原校續聘代理職缺？',[
    {t:'尋求原校續聘',main:true,f:()=>{
      const prob=clamp(Math.round(ovr()*1.2)+20,30,90);
      if(chance(prob)){ card('good','續聘',`原校同意續聘，明年繼續留在 <b class="hl">${S.school}</b>。`); }
      else { S.school=null; S.region=null; card('bad','未獲續聘','原校這次沒有續聘缺額，得另尋代理機會。'); }
      board(0); next();
    }},
    {t:'另尋其他學校代理機會',f:()=>{
      S.school=null; S.region=null;
      card('info','','決定不留原校，主動另尋代理機會。'); board(0); next();
    }},
  ]);
}

/* ---------- 正式教師（年度迴圈） ---------- */
function proYear(){
  applyDecline();
  if(handleSickLeaveYear()){
    choose('',[{t:'▸ 熬過這一年 ▸',main:true,f:()=>{ advanceYear(); startYear(); }}]);
    return;
  }
  if(retireEligible().voluntary){
    choose('是否申請本年度自願退休？',[
      {t:'申請自願退休',warn:true,f:()=>endGameRetire('voluntary')},
      {t:'繼續任教 ▸',main:true,f:()=>proYearContinue()},
    ]);
    return;
  }
  proYearContinue();
}
function proYearContinue(){
  trackSchoolTenure();
  chooseIntensity(()=>{
    const dice=rollDice();
    const ovrBefore=ovr();
    choose('',[{t:`▸ 分配教育經驗（${dice.length} 顆骰）`,main:true,f:()=>{
      allocUI({dice},'分配教育經驗',(totalGot)=>{
        checkLateBloom(ovrBefore,totalGot);
        board(1);
        rollInjury(noInjury=>{ if(noInjury)drawEvent(proEnd); else proEnd(); });
      });
    }}]);
  });
}
function proEnd(){
  board(2);
  if(S.job==='組長'){ S.leadYears=(S.leadYears||0)+1; S.leadYearsTotal=(S.leadYearsTotal||0)+1; }
  if(S.job==='導師')S.hrYearsTotal=(S.hrYearsTotal||0)+1;
  owAccrue();
  S.teachYears=(S.teachYears||0)+1; S.svc=(S.svc||0)+1; S.svcTotal=(S.svcTotal||0)+1;
  S.recentOvr=S.recentOvr||[]; S.recentOvr.push(ovr()); if(S.recentOvr.length>3)S.recentOvr.shift();
  const completedHrTerm=S.job==='導師'&&S.homeroomYrsLeft===1;
  const nationalContest=!!S.nationalContestThisYear; S.nationalContestThisYear=false;
  accrueCareerScoreForYear({completedHrTerm,nationalContest});
  renderAwardCards(rollAward());
  card('info','學期末結算',`本學年以 <b class="hl">${jobTitle()}</b> 身份於 <b class="hl">${S.school}</b> 任教（服務年資 ${S.svc} 年）。`);
  board(2);
  owGamble(()=>{
    if(S.done)return;
    homeroomStep(()=>adminAssignStep(()=>deptExamOrVacancyStep(()=>
      demotionCheck(()=>passiveTransferStep(()=>activeTransferStep(()=>{
        if(S.done)return;
        advanceYear(); startYear();
      }))))));
  });
}

/* 導師 3 年一屆：輪值中僅倒數；輪值結束才開職務重分配會議（對應 WIKI 五） */
function homeroomStep(next){
  if(S.job!=='導師'){ next(); return; }
  S.homeroomYrsLeft--;
  if(S.homeroomYrsLeft>0){ next(); return; }
  S.hrPoints=(S.hrPoints||0)+1;
  const canAdmin=S.deptCandidate||mgmtVFor('組長')>=40;
  const opts=[
    {t:'繼續接任導師（再帶一屆）',main:true,f:()=>{ S.homeroomYrsLeft=3; card('info','職務重分配會議',`第 ${S.hrPoints} 屆帶完，決定再帶一屆，導師之路還很長。`); board(0); next(); }},
    {t:'休息一年轉任科任',f:()=>{ S.job='科任'; S.hrReassignCooldown=true; card('info','職務重分配會議','這屆帶完，申請暫時轉任科任喘口氣。'); board(0); next(); }},
  ];
  if(canAdmin)opts.push({t:'爭取行政職缺',f:()=>{ S.job='科任'; card('info','職務重分配會議','決定把重心放到行政職缺爭取上，暫時轉任科任待命。'); board(0); next(); }});
  choose(`職務重分配會議：導師積分 ${S.hrPoints}`,opts);
}
/* 組長邀約制：主任依溝通能力/表現發出邀約，離島偏鄉婉拒成功率 −25%（對應 WIKI 五、四）。
   hrReassignCooldown：剛結束一屆導師並選擇「休息一年轉任科任」時，本年度不會被立即指派回導師
   （否則會在同一場職務重分配會議裡直接推翻玩家剛做的決定，對應試玩回報的 Bug） */
function adminAssignStep(next){
  if(S.job!=='科任'){ next(); return; }
  const skipHrReassign=!!S.hrReassignCooldown; S.hrReassignCooldown=false;
  const isRural=S.region==='離島偏鄉';
  const inviteProb=clamp(Math.round(mgmtVFor('組長')*1.1)+(isRural?15:0),5,65);
  if(chance(inviteProb)){
    choose(isRural?'主任邀約你擔任組長（學校人手不足，這裡不太好婉拒）':'主任邀約你擔任組長',[
      {t:'接受邀約擔任組長',main:true,f:()=>{ S.job='組長'; S.leadYears=0; S.mgmtLowStreak=0; S.homeroomYrsLeft=0; S.everAdmin=true;
        card('gold','職務異動',`從今年起接任 <b class="hl">組長</b>。`); board(0); next(); }},
      {t:'婉拒，維持現職',f:()=>{
        const refuseOk=isRural?chance(75):true;
        if(!refuseOk){
          S.job='組長'; S.leadYears=0; S.mgmtLowStreak=0; S.homeroomYrsLeft=0; S.everAdmin=true;
          card('bad','職務異動','想婉拒，但校內人手實在不足——最後還是被留任組長。「無法拒絕行政」，偏鄉學校就是這樣。');
          board(0); next(); return;
        }
        card('info','','婉拒了這次邀約，繼續留在科任崗位。不影響未來再被邀約的機率。'); next(); }},
    ]);
    return;
  }
  const hrProb=clamp(70-(S.hrPoints||0)*15,20,90);
  if(!skipHrReassign&&chance(hrProb)){
    S.job='導師'; S.homeroomYrsLeft=3;
    card('info','職務異動',`新學年校方指派你擔任 <b class="hl">導師</b>，開始新一屆三年帶班。`);
    board(0);
  }
  next();
}
/* 主任報考門檻三選一（對應 WIKI 五）：「成績優良」以近3年 OVR 是否穩定在 45 以上為判準（起始數值，待試玩校準） */
function goodRecentRecord(){ return (S.recentOvr||[]).length>=3&&S.recentOvr.every(v=>v>=45); }
function deptExamEligible(){
  if((S.svcTotal||0)>=5)return true;
  if(((S.leadYearsTotal||0)>=2||(S.hrYearsTotal||0)>=3)&&goodRecentRecord())return true;
  if((S.leadYearsTotal||0)>=1&&(S.hrYearsTotal||0)>=2&&goodRecentRecord())return true;
  return false;
}
function checkPrincipalCandidate(){
  S.principalCandidate=Object.keys(S.deptOfficesHeld||{}).length>=2&&(S.deptYearsTotal||0)>=6;
}
/* 校長遴選出缺（對應 WIKI 五：需2處室主任資歷+年資≥6年，出缺機率六都最低競爭最烈） */
function principalVacancyStep(next){
  if(!S.principalCandidate){ next(); return; }
  const vacProb={六都:5,非六都:8,離島偏鄉:12}[S.region]||8;
  if(chance(vacProb)){
    choose(`${S.region}傳出校長出缺`,[
      {t:'投入遴選',main:true,f:()=>{
        const officesBonus=(Object.keys(S.deptOfficesHeld||{}).length-2)*5;
        const prob=clamp(Math.round((mgmtVFor('校長')-50)*2+officesBonus+35),10,85);
        if(chance(prob)){
          settleDirTenure(); /* 卸下主任職務，結算 DIR 任期零失敗加成 */
          S.job='校長'; S.principalYearsTotal=0; S.everAdmin=true; S.prinAppointAge=S.age; S.prinCleanTenure=true;
          const bonus=principalAppointBonus(S.age); S.careerScore=(S.careerScore||0)+bonus;
          card('gold','校長遴選',`遴選委員會通過推薦，你正式派任為 <b class="hl">${S.school} 校長</b>！跨處室主任資歷終於修成正果。到任年齡加成 <b class="up">+${bonus}</b>。`);
          board(0);
        } else { card('bad','校長遴選','這次遴選沒有通過，缺額由其他候選人補上。'); board(0); }
        next();
      }},
      {t:'暫不投入',f:()=>next()},
    ]);
    return;
  }
  next();
}
/* 主任候選資格考試（可選投考，score=OVR+組長年資*2+隨機值，門檻50）／已有候選資格則檢查出缺（對應 WIKI 五） */
function deptExamOrVacancyStep(next){
  if(S.job==='校長'){ S.principalYearsTotal=(S.principalYearsTotal||0)+1; next(); return; }
  if(S.job==='主任'){
    S.deptYears=(S.deptYears||0)+1; S.deptYearsTotal=(S.deptYearsTotal||0)+1;
    checkPrincipalCandidate();
    principalVacancyStep(next);
    return;
  }
  if(!S.deptCandidate){
    if(!deptExamEligible()){ next(); return; }
    choose('是否參加本年度主任甄試／儲訓？',[
      {t:'參加甄試',f:()=>{
        const score=ovr()+(S.leadYears||0)*2+ri(-4,4);
        if(score>=50){ S.deptCandidate=true; card('good','主任甄試',`評分 <b class="hl">${score}</b>（門檻50），取得主任候選資格！之後只要出缺就能爭取遞補。`); }
        else card('bad','主任甄試',`評分 <b class="hl">${score}</b>（門檻50），這次沒有過，之後仍可再考。`);
        board(0); next();
      }},
      {t:'不參加',main:true,f:()=>next()},
    ]);
    return;
  }
  const vacProb={六都:8,非六都:12,離島偏鄉:18}[S.region]||12;
  if(chance(vacProb)){
    choose(`${S.school} 傳出主任缺額`,[
      {t:'爭取遞補',main:true,f:()=>{
        const prob=clamp(Math.round((mgmtVFor('主任')-45)*2+50),10,90);
        if(chance(prob)){
          S.job='主任'; S.deptYears=0; S.homeroomYrsLeft=0; S.everAdmin=true; S.deptAppointAge=S.age; S.dirCleanTenure=true;
          S.deptOffice=pick(['教務處','學務處','總務處','輔導處']);
          S.deptOfficesHeld=S.deptOfficesHeld||{}; S.deptOfficesHeld[S.deptOffice]=true;
          const bonus=deptAppointBonus(S.age); S.careerScore=(S.careerScore||0)+bonus;
          card('gold','主任遞補',`爭取成功！派任為 <b class="hl">${S.deptOffice}主任</b>。到任年齡加成 <b class="up">+${bonus}</b>。`);
          board(0);
        } else { card('bad','主任遞補','這次遞補評選沒有選上，缺額由其他候選人補上。'); board(0); }
        next();
      }},
      {t:'暫不爭取',f:()=>next()},
    ]);
    return;
  }
  next();
}
/* 組長／主任／校長連續兩年低於職務分級平均水準 −4 → 業務檢討約談，降回科任（對應 WIKI 五） */
const ROLE_BASELINE={組長:40,主任:50,校長:55};
function demotionCheck(next){
  if(S.job==='組長'||S.job==='主任'||S.job==='校長'){
    const base=ROLE_BASELINE[S.job];
    if(mgmtVFor(S.job)<base-4){
      S.mgmtLowStreak=(S.mgmtLowStreak||0)+1;
      if(S.mgmtLowStreak>=2){
        const oldJob=jobTitle(), wasJob=S.job;
        if(wasJob==='主任')settleDirTenure();
        if(wasJob==='校長')settlePrinTenure();
        S.job='科任'; S.mgmtLowStreak=0;
        card('bad','業務檢討約談',`${oldJob}表現連續兩年未達標準，約談後<b class="dn">降回科任</b>。`);
        board(0);
      }
    } else S.mgmtLowStreak=0;
  }
  next();
}
/* ---------- 介聘子系統（WIKI 未給細節，新設計；沿用教甄門檻表作為分級基準，起始數值待試玩校準） ---------- */
function passiveTransferStep(next){
  let baseRisk=(S.stableYears>0)?8:15;
  if(S.stableYears>0)S.stableYears--;
  if(!chance(baseRisk)){ next(); return; }
  const par=EXAM_TH[S.region].th;
  const veteran=ovr()>=par+4;
  const doTransfer=()=>{
    const poolS=SCHOOLS[S.region].filter(s=>s!==S.school);
    S.school=poolS.length?pick(poolS):S.school; S.svc=0;
    card('info','超額介聘',`確定調往新校：<b class="hl">${S.school}</b>。`);
    board(0);
  };
  if(veteran){
    choose('超額介聘名單公布，你名列其中（資深教師）',[
      {t:'爭取留任申覆',main:true,s:'保證留任｜代價：未來考績與介聘志願序將受影響',f:()=>{
        card('good','留任申覆','申覆成功，確定留任原校。（未來3年考績優等機率打折、下次介聘志願序後退）'); board(0);
        S.refusedTransferPending=true; next(); }},
      {t:'接受介聘，調往新校',f:()=>{ doTransfer(); next(); }},
    ]);
  } else {
    choose('超額介聘名單公布，你名列其中',[
      {t:'公開抱怨',warn:true,s:'最終超額機率 60%',f:()=>{
        S.complainCount=(S.complainCount||0)+1;
        if(chance(60))doTransfer(); else card('info','','抱怨過後，這次意外留了下來。');
        next(); }},
      {t:'保持沉默',main:true,s:'最終超額機率 35%',f:()=>{
        if(chance(35))doTransfer(); else card('info','','沉默是金，這次沒事。');
        next(); }},
    ]);
  }
}
function activeTransferStep(next){
  if((S.svc||0)<3){ next(); return; }
  choose('是否申請本年度主動介聘？',[
    {t:'蹲點深耕',s:'未來2年超額介聘機率減半',f:()=>{
      S.stableYears=2; card('info','主動介聘','決定蹲點深耕，暫不折騰，先求穩定。'); board(0); next(); }},
    {t:'積極流動',s:'嘗試調往更好的學校／地區',f:()=>{ rollActiveTransfer(); next(); }},
    {t:'暫不申請',main:true,f:()=>next()},
  ]);
}
const REGION_TIERS=['離島偏鄉','非六都','六都'];
function rollActiveTransfer(){
  const curIdx=REGION_TIERS.indexOf(S.region);
  if(curIdx>=2){
    const poolS=SCHOOLS[S.region].filter(s=>s!==S.school);
    S.school=poolS.length?pick(poolS):S.school; S.svc=0;
    card('good','積極流動',`成功轉調六都內的 <b class="hl">${S.school}</b>，持續在熱門圈打拼。`); board(0); return;
  }
  const target=REGION_TIERS[curIdx+1];
  const o=ovr(), par=EXAM_TH[target].th;
  const prob=clamp(Math.round((o-par)*3+30),10,80);
  if(chance(prob)){
    S.region=target; S.school=pick(SCHOOLS[target]); S.svc=0;
    card('gold','積極流動成功',`評分 ${o}（${target}門檻${par}）成功調往 <b class="hl">${target}</b> 的 <b class="hl">${S.school}</b>！`);
  } else {
    card('bad','積極流動未成功',`評分 ${o}（${target}門檻${par}），這次沒能調到更好的學校，繼續留在 <b class="hl">${S.school}</b>。`);
  }
  board(0);
}
