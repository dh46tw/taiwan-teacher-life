import { S } from './state.js';
import { clamp, chance, pick, R } from './rng.js';
import { addAb } from './growth.js';
import { card, board, choose } from '../ui/render.js';
import { ABL, AB_KEYS, SUBJ_CONTEST } from '../data/tables.js';
import { TEACHER_EVENTS } from '../data/events.js';
import { trackCrisisBold } from './traits-unlock.js';

/* ================= 事件卡引擎（對應 WIKI 八、十一） ================= */

/* 三層投入的成功率與必然代價（對應 WIKI 八） */
const TIER_PROB_OFFSET={low:20,mid:0,high:-15};
/* 強心臟：高投入選項的成功率懲罰永久消除（對應 WIKI 九） */
function tierProbOffset(tier){
  if(tier==='high'&&S.traits&&S.traits.ironHeart)return 0;
  return TIER_PROB_OFFSET[tier];
}
const TIER_PASSION_COST={low:0,mid:-1,high:-2};
const TIER_OW_COST_IF_PASSION={low:0,mid:3,high:6}; /* 主獎勵本身是教學熱忱時的替代代價 */
const TIER_LABEL={low:'低投入',mid:'中投入',high:'高投入'};

/* 事件卡如何計分（對應 WIKI 六）：一般卡直接計入 CareerScore；職務限定卡先累進本年度 yearRoleScore，
   由 career-flow 在年末依職務公式結算。基礎係數與失敗扣分倍數 WIKI 未給精確數字，為起始數值待試玩校準。 */
const GENERAL_TIER_SCORE={low:{good:2,bad:0},mid:{good:4,bad:-2},high:{good:8,bad:-6}};
const ROLE_TAGS=['SUBJ','HR','ADMIN','DIR','PRIN'];
const ROLE_FAIL_HEAVY=['DIR','PRIN']; /* 主任/校長失敗扣分遠重於成功加分，呼應「多做多錯」設計意圖 */
const ROLE_SUCCESS_COEF={low:1,mid:1.5,high:2};
const ROLE_BASE_UNIT=4;
const ROLE_FAIL_MULT=3;

export function eventBase(){ /* 大器晚成：好結果機率 50%→70%（特性系統於 Phase 7 補上判定條件） */
  return (S.traits&&S.traits.late)?70:50;
}
/* 若成功效果只有教學熱忱一項，視為「主要獎勵本身就是教學熱忱」，必然代價改記在過勞量表 */
function isPassionPrimary(ev){
  const keys=Object.keys(ev.g);
  return keys.length===1&&keys[0]==='pas';
}
/* 低投入=基準值朝0方向-1、高投入=基準值朝外+1、中投入=基準值本身（對應 WIKI 十一） */
function tierAdjust(v,tier){
  if(tier==='mid'||v===0)return v;
  const s=v>0?1:-1;
  return tier==='low'?v-s:v+s;
}
export function jobTag(){ return {科任:'SUBJ',導師:'HR',組長:'ADMIN',主任:'DIR',校長:'PRIN'}[S.job]||null; }

/* 地理分級事件觸發權重（對應 WIKI 四、事件觸發權重表） */
const REGION_UP15=['公開觀議課','全縣公開示範教學','校長／督學入班觀課','媒體採訪／教育局關注'];
const REGION_FAMILY_UP10=['家長日','家長投訴老師','班級家長群組口角'];
const REGION_CONFLICT_DOWN10=['突發衝突事件','學生鬥毆事件','班級發生偷竊事件'];
const REGION_HR_UP15=['學生中輟','適性輔導與志願選填','家長日'];
export function regionWeight(ev){
  const region=S.region; let w=1;
  if(!region)return w;
  if(region==='六都'){
    if(REGION_UP15.includes(ev.n))w*=1.15;
    if(REGION_FAMILY_UP10.includes(ev.n))w*=1.10;
  } else if(region==='非六都'){
    if(ev.n==='學生中輟')w*=1.15;
    if(REGION_CONFLICT_DOWN10.includes(ev.n))w*=0.90;
  } else if(region==='離島偏鄉'){
    if(REGION_HR_UP15.includes(ev.n))w*=1.15;
  }
  return w;
}
export function weightedPick(items,weightFn){
  const weights=items.map(weightFn);
  const total=weights.reduce((a,b)=>a+b,0);
  let r=R()*total;
  for(let i=0;i<items.length;i++){ r-=weights[i]; if(r<=0)return items[i]; }
  return items[items.length-1];
}

/* 一般卡／職務限定卡通用卡池（對應 WIKI 十一：通用星號卡/TCORE/MGMT/PRO＋現職職務標籤） */
export function mainPool(){
  const tags=['*','TCORE','MGMT'];
  if(S.phase==='正職')tags.push('PRO');
  const jt=jobTag(); if(S.phase==='正職'&&jt)tags.push(jt);
  return TEACHER_EVENTS.filter(e=>!e.subject&&tags.includes(e.for));
}
/* 科目專屬卡池（觸發機率獨立計算，不擠壓通用卡池，對應 WIKI 十一。25% 為起始數值待校準） */
export const SUBJECT_EVENT_CHANCE=25;
export function subjectPool(){
  return TEACHER_EVENTS.filter(e=>e.subject===S.subject);
}

function applyMandatoryCost(ev,tier,fx){
  /* 本次觸發效果本身就有動到教學熱誠（無論是否為唯一獎勵）：必然代價改記在過勞量表，
     避免對同一項屬性疊加兩筆相反方向的增減（曾造成「熱誠+1／熱誠-1」同時出現的顯示與計算錯誤） */
  if(isPassionPrimary(ev)||Object.prototype.hasOwnProperty.call(fx,'pas')){
    const delta=TIER_OW_COST_IF_PASSION[tier];
    if(delta>0){ S.ow=(S.ow||0)+delta; return `過勞量表 <b class="dn">+${delta}</b>`; }
    return null;
  }
  const delta=TIER_PASSION_COST[tier];
  if(delta<0){ const g=addAb('pas',delta); return `${ABL.pas} <b class="dn">${g}</b>`; }
  return null;
}

export function resolveEvent(ev,tier,after){
  const base=eventBase();
  const prob=clamp(base+tierProbOffset(tier),5,95);
  const good=chance(prob);
  const fx=good?ev.g:ev.b;
  const explicitKeys=Object.keys(fx).filter(k=>k!=='rand'&&k!=='ow');
  const out=[];
  for(const k in fx){
    if(k==='ow'){
      const delta=fx.ow; /* 過勞量表固定代價，不受投入層級影響 */
      S.ow=(S.ow||0)+delta;
      out.push(`過勞量表 <b class="dn">+${delta}</b>`);
      continue;
    }
    const key=k==='rand'?pick(AB_KEYS.filter(a=>!explicitKeys.includes(a))):k;
    const v=tierAdjust(fx[k],tier);
    const g=addAb(key,v);
    out.push(`${ABL[key]} <b class="${g>0?'up':g<0?'dn':'hl'}">${g>0?'+'+g:g<0?g:'蓄力中'}</b>`);
  }
  const costLine=applyMandatoryCost(ev,tier,fx);
  if(costLine)out.push(costLine);
  /* 事件卡計分（對應 WIKI 六） */
  if(ROLE_TAGS.includes(ev.for)){
    let delta=0;
    if(good)delta=ROLE_BASE_UNIT*ROLE_SUCCESS_COEF[tier];
    else if(ROLE_FAIL_HEAVY.includes(ev.for))delta=-(ROLE_BASE_UNIT*ROLE_SUCCESS_COEF[tier]*ROLE_FAIL_MULT);
    S.yearRoleScore=(S.yearRoleScore||0)+delta;
  } else {
    const t=GENERAL_TIER_SCORE[tier];
    S.careerScore=(S.careerScore||0)+(good?t.good:t.bad);
  }
  /* 主任／校長任期零失敗判定（對應 WIKI 六，卸任/退休結算的一次性加分依據） */
  if(!good&&ev.for==='DIR')S.dirCleanTenure=false;
  if(!good&&ev.for==='PRIN')S.prinCleanTenure=false;
  /* 科目專屬卡高投入成功時，有機會獲「指導學生獲全國賽」榮譽（對應 WIKI 六，25%起始數值待校準） */
  if(good&&tier==='high'&&ev.for==='SUBJ'&&ev.subject&&chance(25)){
    S.honorScore=(S.honorScore||0)+90; S.awardCount=(S.awardCount||0)+1;
    S.nationalContestThisYear=true;
    out.push(`🏆 指導學生獲全國賽（${SUBJ_CONTEST[ev.subject]||''}）教育積分 <b class="up">+90</b>`);
  }
  card(good?'good':'bad',`事件｜${ev.n}（${TIER_LABEL[tier]}）`,`${good?ev.gt:ev.bt}<br>${out.join('、')}`);
  board(1);
  trackCrisisBold(ev,tier,good);
  after(good,ev,tier);
}

export function drawEventFrom(pool,after){
  const list=pool.length?pool:mainPool();
  const ev=weightedPick(list,regionWeight);
  const base=eventBase();
  choose(`事件｜${ev.n} — 你要怎麼應對？`,[
    {t:ev.opts[0],s:`成功率 ${clamp(base+tierProbOffset('low'),5,95)}%｜效果最小`,f:()=>resolveEvent(ev,'low',after)},
    {t:ev.opts[1],main:true,s:`成功率 ${clamp(base+tierProbOffset('mid'),5,95)}%｜標準效果`,f:()=>resolveEvent(ev,'mid',after)},
    {t:ev.opts[2],warn:true,s:`成功率 ${clamp(base+tierProbOffset('high'),5,95)}%｜效果最大`,f:()=>resolveEvent(ev,'high',after)},
  ]);
}
/* 學期中事件：先抽通用/職務限定卡；科目專屬卡獨立機率額外觸發一次 */
export function drawEvent(after){
  drawEventFrom(mainPool(),()=>{
    const sp=subjectPool();
    if(sp.length&&chance(SUBJECT_EVENT_CHANCE)){
      drawEventFrom(sp,after);
    } else after();
  });
}
