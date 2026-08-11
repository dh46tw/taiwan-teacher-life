import { S } from './state.js';
import { clamp, chance, pick, ri } from './rng.js';
import { ovr, jobTitle, mgmtVFor, lvRow } from './scoring.js';
import { rollDice } from './growth.js';
import { chooseIntensity, owAccrue, owGamble, rollInjury, applyDecline, handleSickLeaveYear } from './ow.js';
import { drawEvent, jobTag } from './events.js';
import { examChoice } from './exam.js';
import {
  checkAcademyHonor, checkFocus, checkLateBloom, checkToolMan, schoolTenureCheck,
  rollAward, checkLayback, triggerStageFear, clearStageFearOnPromotion,
} from './traits-unlock.js';
import { retireSummaryHtml } from './summary.js';
import { card, board, choose, divider, allocUI } from '../ui/render.js';
import { endingActions, secondLifeEnding } from '../ui/share.js';
import { PAY_SUB, SCHOOLS } from '../data/tables.js';

/* ================= 年度流程 ================= */
export function advanceYear(){ S.age++; S.year++; }
export function yearHeader(){
  if(S.phase==='實習')return `${S.year} 年 · ${S.age} 歲 · 教育實習`;
  if(S.phase==='代理')return `${S.year} 年 · ${S.age} 歲 · 代理教師`;
  if(S.phase==='正職')return `${S.year} 年 · ${S.age} 歲 · ${S.region}${jobTitle()}・${S.school}`;
  return `${S.year} 年 · ${S.age} 歲`;
}
export function startYear(){
  if(retireEligible().byAge){ endGameRetire('byAge'); return; }
  divider(yearHeader()); board(0);
  switch(S.phase){
    case '實習': internFlow(); break;
    case '代理': subYear(); break;
    case '正職': proYear(); break;
    default: subYear();
  }
}
/* ---------- 教育實習半年（生涯起點，對應 WIKI 六） ---------- */
export function internFlow(){
  checkAcademyHonor();
  card('info','教育實習','為期半年的教育實習順利結束，正式取得投考教師甄試的資格。');
  S.phase='代理';
  choose('',[{t:'投入教職生涯 ▸',main:true,f:()=>startYear()}]);
}
/* ---------- 代理教師（年度迴圈） ---------- */
export function subYear(){
  if(S.age>=35&&!S.everFormal){ secondLifeEnding('教到 35 歲仍未能考取正式教師資格，決定就此告別教職。'); return; }
  applyDecline();
  if(handleSickLeaveYear())return;
  if(retireEligible().voluntary){
    choose('是否申請本年度自願退休？',[
      {t:'申請自願退休',warn:true,f:()=>endGameRetire('voluntary')},
      {t:'繼續任教 ▸',main:true,f:()=>subYearContinue()},
    ]);
    return;
  }
  subYearContinue();
}
function subYearContinue(){
  chooseIntensity(()=>{
    const dice=rollDice();
    choose('',[{t:`▸ 分配訓練成果（${dice.length} 顆骰）`,main:true,
      f:()=>allocUI({dice},'分配訓練成果（代理教師）',(totalGot,hist)=>{
        checkFocus(hist,totalGot); checkLateBloom(totalGot);
        board(1);
        rollInjury(has=>{ if(has)drawEvent(['*','TCORE','MGMT'],subEnd); else subEnd(); }); })}]);
  });
}
function subEnd(){
  board(2);
  owAccrue();
  S.salary=(S.salary||0)+PAY_SUB; S.teachYears=(S.teachYears||0)+1; S.subYearsTotal=(S.subYearsTotal||0)+1;
  checkToolMan();
  card('info','學期末結算',`本年度以代理教師身份任教，薪資 <b class="hl">${PAY_SUB}萬</b> 入帳。`);
  owGamble(()=>{ examChoice(()=>{ advanceYear(); startYear(); }); });
}
/* ---------- 正式教師（年度迴圈） ---------- */
export function proYear(){
  applyDecline();
  if(handleSickLeaveYear())return;
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
  chooseIntensity(()=>{
    const dice=rollDice();
    choose('',[{t:`▸ 分配訓練成果（${dice.length} 顆骰）`,main:true,
      f:()=>allocUI({dice},'分配訓練成果',(totalGot,hist)=>{
        checkFocus(hist,totalGot); checkLateBloom(totalGot);
        board(1);
        rollInjury(has=>{ if(has)drawEvent(['*','TCORE','MGMT','PRO'].concat(jobTag()?[jobTag()]:[]),proEnd); else proEnd(); }); })}]);
  });
}
/* ---------- 正式教師：學期末（薪資結算→導師輪替→組長邀約/導師指派→主任甄試/缺額→降調檢查→超額介聘→主動介聘） ---------- */
function proEnd(){
  board(2);
  if(S.job==='組長'){ S.leadYears=(S.leadYears||0)+1; S.leadYearsTotal=(S.leadYearsTotal||0)+1; }
  owAccrue();
  settleSalary(()=>{
    schoolTenureCheck(); checkToolMan(); rollAward();
    owGamble(()=>homeroomStep(()=>adminAssignStep(()=>deptExamOrVacancyStep(()=>
      demotionCheck(()=>passiveTransferStep(()=>activeTransferStep(()=>{
        advanceYear(); startYear();
      })))))));
  });
}
function settleSalary(next){
  const payMult=(S.traits&&S.traits.treasure)?1.2:1;
  const pay=lvRow(S.job,S.region).pay*payMult;
  S.salary=(S.salary||0)+pay; S.teachYears=(S.teachYears||0)+1; S.svc=(S.svc||0)+1; S.svcTotal=(S.svcTotal||0)+1;
  if(S.job==='導師')S.hrYearsTotal=(S.hrYearsTotal||0)+1;
  S.recentD=S.recentD||[]; S.recentD.push(ovr()-lvRow(S.job,S.region).par); if(S.recentD.length>3)S.recentD.shift();
  card('info','學期末結算',`本學年以 <b class="hl">${jobTitle()}</b> 身份於 <b class="hl">${S.school}</b> 任教，薪資 <b class="hl">${Math.round(pay)}萬</b> 入帳（服務年資 ${S.svc} 年）。`);
  board(2); next();
}
/* 導師 3 年一輪：輪值中僅倒數；輪值結束才開職務重分配會議 */
function homeroomStep(next){
  if(S.job!=='導師'){ next(); return; }
  S.homeroomYrsLeft--;
  if(S.homeroomYrsLeft>0){ next(); return; }
  S.hrPoints=(S.hrPoints||0)+1;
  const canAdmin=mgmtVFor('組長')>=40||S.deptCandidate;
  const opts=[
    {t:'繼續接任導師（再帶一屆）',main:true,f:()=>{ S.homeroomYrsLeft=3; card('info','職務重分配會議',`第 ${S.hrPoints} 屆帶完，決定再帶一屆，導師之路還很長。`); board(0); next(); }},
    {t:'休息一年轉任科任',f:()=>{ S.job='科任'; card('info','職務重分配會議','這屆帶完，申請暫時轉任科任喘口氣。'); board(0); next(); }},
  ];
  if(canAdmin)opts.push({t:'爭取行政職缺',f:()=>{ S.job='科任'; card('info','職務重分配會議','決定把重心放到行政職缺爭取上，暫時轉任科任待命。'); board(0); next(); }});
  choose(`職務重分配會議：導師積分 ${S.hrPoints}`,opts);
}
/* 科任：可能被邀約組長，或被指派下一屆導師（互斥，優先檢查組長邀約） */
function adminAssignStep(next){
  if(S.job!=='科任'){ next(); return; }
  const isRural=S.region==='離島偏鄉';
  const inviteProb=clamp(Math.round(mgmtVFor('組長')*1.1)+(isRural?15:0),5,65);
  if(chance(inviteProb)){
    choose(isRural?'主任邀約你擔任組長（學校人手不足，這裡不太好婉拒）':'主任邀約你擔任組長',[
      {t:'接受邀約擔任組長',main:true,f:()=>{ S.job='組長'; S.leadYears=0; S.mgmtLowStreak=0; S.homeroomYrsLeft=0; S.everAdmin=true;
        card('gold','職務異動',`從今年起接任 <b class="hl">組長</b>。`); board(0); clearStageFearOnPromotion(); next(); }},
      {t:'婉拒，維持現職',f:()=>{
        if(isRural&&chance(40)){
          S.job='組長'; S.leadYears=0; S.mgmtLowStreak=0; S.homeroomYrsLeft=0; S.everAdmin=true;
          card('bad','職務異動','想婉拒，但校內人手實在不足——最後還是被留任組長。「無法拒絕行政」，偏鄉學校就是這樣。');
          board(0); clearStageFearOnPromotion(); next(); return;
        }
        card('info','','婉拒了這次邀約，繼續留在科任崗位。不影響未來再被邀約的機率。'); next(); }},
    ]);
    return;
  }
  const hrProb=clamp(70-(S.hrPoints||0)*15,20,90);
  if(chance(hrProb)){
    S.job='導師'; S.homeroomYrsLeft=3;
    card('info','職務異動',`新學年校方指派你擔任 <b class="hl">導師</b>，開始新一屆三年帶班。`);
    board(0);
  }
  next();
}
/* 主任報考門檻（對應 WIKI 五）：國中三選一／高中組長+導師+行政兼職年資合計滿4年 */
function deptExamEligible(){
  if(S.teachStage==='高中'){
    return (S.leadYearsTotal||0)+(S.hrYearsTotal||0)+(S.adminDutyYearsTotal||0)>=4;
  }
  const goodRecord=(S.recentD||[]).length>=3 && S.recentD.every(d=>d>=0);
  if((S.svcTotal||0)>=5)return true;
  if((S.leadYearsTotal||0)>=2||(S.hrYearsTotal||0)>=3){ if(goodRecord)return true; }
  if((S.leadYearsTotal||0)>=1&&(S.hrYearsTotal||0)>=2){ if(goodRecord)return true; }
  return false;
}
/* ---------- 校長遴選（對應 WIKI 五、六，需跨處室主任資歷＋出缺） ---------- */
function checkPrincipalCandidate(){
  S.principalCandidate=Object.keys(S.deptOfficesHeld||{}).length>=2&&(S.deptYearsTotal||0)>=6;
}
function principalVacancyStep(next){
  if(!S.principalCandidate){ next(); return; }
  const vacProb={六都:8,非六都:12,離島偏鄉:16}[S.region]||10;
  if(chance(vacProb)){
    choose(`${S.region}傳出校長出缺`,[
      {t:'投入遴選',main:true,f:()=>{
        const par=lvRow('校長',S.region).par;
        const officesBonus=(Object.keys(S.deptOfficesHeld||{}).length-2)*5;
        const prob=clamp(Math.round((mgmtVFor('校長')-par)*2+officesBonus+35),10,85);
        if(chance(prob)){
          S.job='校長'; S.principalYearsTotal=0; S.everAdmin=true;
          card('gold','校長遴選',`遴選委員會通過推薦，你正式派任為 <b class="hl">${S.school} 校長</b>！跨處室主任資歷終於修成正果。`);
          board(0); clearStageFearOnPromotion();
        } else { card('bad','校長遴選','這次遴選沒有通過，缺額由其他候選人補上。'); board(0); }
        next();
      }},
      {t:'暫不投入',f:()=>next()},
    ]);
    return;
  }
  next();
}
/* 主任候選資格考試（可選投考）／已有候選資格則檢查出缺 */
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
        if(score>=50){ S.deptCandidate=true;
          card('good','主任甄試',`評分 <b class="hl">${score}</b>（門檻50），取得主任候選資格！之後只要出缺就能爭取遞補。`); }
        else card('bad','主任甄試',`評分 <b class="hl">${score}</b>（門檻50），這次沒有過，之後仍可再考。`);
        board(0); next();
      }},
      {t:'不參加',main:true,f:()=>next()},
    ]);
    return;
  }
  const vacProb={六都:25,非六都:18,離島偏鄉:12}[S.region]||15;
  if(chance(vacProb)){
    choose(`${S.school} 傳出主任缺額`,[
      {t:'爭取遞補',main:true,f:()=>{
        const par=lvRow('主任',S.region).par;
        const prob=clamp(Math.round((mgmtVFor('主任')-par)*2+50),10,90);
        if(chance(prob)){
          S.job='主任'; S.deptYears=0; S.homeroomYrsLeft=0; S.everAdmin=true;
          S.deptOffice=pick(['教務處','學務處','總務處','輔導處']);
          S.deptOfficesHeld=S.deptOfficesHeld||{}; S.deptOfficesHeld[S.deptOffice]=true;
          card('gold','主任遞補',`爭取成功！派任為 <b class="hl">${S.deptOffice}主任</b>。`);
          board(0); clearStageFearOnPromotion();
        } else { card('bad','主任遞補','這次遞補評選沒有選上，缺額由其他候選人補上。'); board(0); }
        next();
      }},
      {t:'暫不爭取',f:()=>next()},
    ]);
    return;
  }
  next();
}
/* 組長／主任連續兩年未達門檻 -4 → 業務檢討約談，降回科任 */
function demotionCheck(next){
  if(S.job==='組長'||S.job==='主任'||S.job==='校長'){
    const par=lvRow(S.job,S.region).par;
    if(mgmtVFor(S.job)<par-4){
      S.mgmtLowStreak=(S.mgmtLowStreak||0)+1;
      if(S.mgmtLowStreak>=2){
        const oldJob=jobTitle(); const d=ovr()-par;
        S.job='科任'; S.mgmtLowStreak=0;
        card('bad','業務檢討約談',`${oldJob}表現連續兩年未達標準，約談後<b class="dn">降回科任</b>。`);
        board(0);
        if(d<=-6)triggerStageFear();
      }
    } else S.mgmtLowStreak=0;
  }
  next();
}
/* 被動超額介聘：基礎 15%（蹲點深耕生效中則 8%）機率被列入名單 */
function passiveTransferStep(next){
  checkLayback();
  let baseRisk=(S.stableYears>0)?8:15;
  if(S.traits.windvane)baseRisk+=15; /* 辦公室風向球：超額介聘機率大增 */
  if(S.traits.gossip)baseRisk+=8; /* 茶水間輿論領袖：永久提高超額介聘機率 */
  if(S.stableYears>0)S.stableYears--;
  if(!chance(baseRisk)){ next(); return; }
  const par=lvRow(S.job,S.region).par;
  const veteran=ovr()>=par+4&&!S.traits.windvane; /* 風向球體質不能再申覆否決 */
  const doTransfer=()=>{
    const d=ovr()-par;
    const poolS=SCHOOLS[S.teachStage][S.region].filter(s=>s!==S.school);
    S.school=poolS.length?pick(poolS):S.school; S.svc=0;
    card('info','超額介聘',`確定調往新校：<b class="hl">${S.school}</b>。`);
    board(0);
    if(d<=-6)triggerStageFear();
  };
  if(veteran){
    choose('超額介聘名單公布，你名列其中（資深教師）',[
      {t:'爭取留任申覆',main:true,s:'保證留任｜代價：未來考績與介聘志願序將受影響',f:()=>{
        card('good','留任申覆','申覆成功，確定留任原校。（未來3年考績優等機率打折、下次介聘志願序後退）'); board(0);
        S.refusedTransferPending={par}; next(); }},
      {t:'接受介聘，調往新校',f:()=>{ doTransfer(); next(); }},
    ]);
  } else {
    choose('超額介聘名單公布，你名列其中'+(S.traits.windvane?'（風向球體質，這次躲不掉了）':''),[
      {t:'公開抱怨',warn:true,s:'最終超額機率 60%',f:()=>{
        S.complainCount=(S.complainCount||0)+1;
        if(S.complainCount>=2&&!S.traits.gossip){
          S.traits.gossip=true;
          card('bad','隱藏特性解鎖：茶水間輿論領袖','面對超額傳言公開抱怨已經第二次——從此你的名字更容易出現在超額介聘的名單上。');
          board(0);
        }
        if(chance(60))doTransfer(); else card('info','','抱怨過後，這次意外留了下來。');
        next(); }},
      {t:'保持沉默',main:true,s:'最終超額機率 35%',f:()=>{
        if(chance(35))doTransfer(); else card('info','','沉默是金，這次沒事。');
        next(); }},
    ]);
  }
}
/* 主動介聘：服務滿 3 年後每年可選擇蹲點深耕／積極流動 */
function activeTransferStep(next){
  if((S.svc||0)<3){ next(); return; }
  choose('是否申請本年度主動介聘？',[
    {t:'蹲點深耕',s:'未來2年超額介聘機率減半',f:()=>{
      S.stableYears=2; card('info','主動介聘','決定蹲點深耕，暫不折騰，先求穩定。'); board(0); next(); }},
    {t:'積極流動',s:'嘗試調往更好的學校／地區',f:()=>{ rollActiveTransfer(); next(); }},
    {t:'暫不申請',main:true,f:()=>next()},
  ]);
}
function rollActiveTransfer(){
  const tiers=['離島偏鄉','非六都','六都'];
  const curIdx=tiers.indexOf(S.region);
  if(curIdx>=2){
    const poolS=SCHOOLS[S.teachStage][S.region].filter(s=>s!==S.school);
    S.school=poolS.length?pick(poolS):S.school; S.svc=0;
    card('good','積極流動',`成功轉調六都內的 <b class="hl">${S.school}</b>，持續在熱門圈打拼。`); board(0); return;
  }
  const target=tiers[curIdx+1];
  const o=ovr(), par=lvRow(S.job,target).par;
  const prob=clamp(Math.round((o-par)*3+30),10,80);
  if(chance(prob)){
    S.region=target; S.school=pick(SCHOOLS[S.teachStage][target]); S.svc=0;
    card('gold','積極流動成功',`評分 ${o}（${target}門檻${par}）成功調往 <b class="hl">${target}</b> 的 <b class="hl">${S.school}</b>！`);
  } else {
    card('bad','積極流動未成功',`評分 ${o}（${target}門檻${par}），這次沒能調到更好的學校，繼續留在 <b class="hl">${S.school}</b>。`);
  }
  board(0);
}
/* ---------- 引退（完整退休儀式，對應 WIKI 十二） ---------- */
/* ---------- 退休資格三分類（對應 WIKI 十二） ---------- */
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
  voluntarySpecial:{title:'自願退休（因公傷病）',body:'服務年資已達 15 年，且身心狀況經專業評估已不適合繼續任教——選擇以自願退休的方式，體面地告一段落。'},
  order:{title:'命令退休',body:'服務年資已達 5 年，但身心狀況經判定已不堪勝任教學——學校依規定啟動命令退休程序。'},
};
export function endGameRetire(kind){
  board(2);
  const t=RETIRE_TEXT[kind];
  divider(`${S.year} 年 · ${S.age} 歲 · ${t.title}`);
  card('gold',t.title,`${t.body}<br>${retireSummaryHtml()}`);
  endingActions();
}
