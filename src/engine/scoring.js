import { S } from './state.js';
import { SUBJ_POOL, AB_CORE, LV_TABLE } from '../data/tables.js';

/* ================= 評分公式 ================= */
export function teachV(){
  const a=S.ab, sig=SUBJ_POOL[S.subject][0];
  const arr=AB_CORE.map(k=> k===sig ? a[k]*1.08 : a[k]);
  arr.sort((x,y)=>y-x);
  return arr[0]*0.38+arr[1]*0.27+arr[2]*0.20+arr[3]*0.15;
}
export function mgmtVFor(job){
  const a=S.ab;
  switch(job){
    case '導師': return a.rng*0.5+a.fld*0.5;
    case '組長': return a.arm*0.4+a.rng*0.3+a.fld*0.3;
    case '主任': return a.cat*0.45+a.arm*0.35+a.rng*0.2;
    case '校長': return a.cat*0.4+a.arm*0.35+a.fld*0.25;
    default: return 0;
  }
}
export function mgmtV(){ return mgmtVFor(S.job); }
export const MW={科任:0.05,導師:0.25,組長:0.35,主任:0.45,校長:0.55};
export function ovr(){
  const mw=MW[S.job||'科任'];
  let v=Math.round(teachV()*(1-mw)+mgmtV()*mw+S.ab.sta*0.05);
  if(S.traits&&S.traits.stageFear)v-=3;
  return v;
}
export function jobTitle(){ return (S.job==='主任'&&S.deptOffice) ? S.deptOffice+'主任' : S.job; }

/* ---------- 薪資與職涯分級門檻（對應 WIKI 六、職涯分級門檻表） ---------- */
export function payTier(job){ return (job==='科任'||job==='導師')?'正式教師':job; }
export function lvRow(job,region){ return job==='代理'?LV_TABLE.代理.不分區:LV_TABLE[payTier(job)][region]; }

/* ---------- 生涯評價分（對應 WIKI 十一） ---------- */
export function careerScoreCalc(){
  return (S.svcTotal||0)*10+(S.hrPoints||0)*8+(S.awardCount||0)*15
    +(S.leadYearsTotal||0)*6+(S.deptYearsTotal||0)*12+(S.principalYearsTotal||0)*25;
}
export function honorScoreCalc(){ return S.honorScore||0; }
export function totalCareerScore(){ return careerScoreCalc()+honorScoreCalc(); }
export function hasCountyOrAbove(){ const w=S.awardsWon||{}; return !!(w.countyExcellent||w.teachExcellence||w.countyGood||w.shiduo||w.devotion); }
export function hasBigAward(){ const w=S.awardsWon||{}; return !!(w.shiduo||w.devotion); }
export const TIER_ORDER=['一頁教育者','邊緣教師','資深良師','明星教師','典範教育家'];
export function tierOf(score){
  if(score>=8000)return '典範教育家';
  if(score>=5900)return '明星教師';
  if(score>=4300)return '資深良師';
  if(score>=2900)return '邊緣教師';
  return '一頁教育者';
}
export function finalTier(){
  let t=tierOf(totalCareerScore());
  if(hasBigAward()&&TIER_ORDER.indexOf(t)<TIER_ORDER.indexOf('明星教師'))t='明星教師';
  else if(hasCountyOrAbove()&&TIER_ORDER.indexOf(t)<TIER_ORDER.indexOf('資深良師'))t='資深良師';
  return t;
}
