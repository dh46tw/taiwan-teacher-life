import { S } from './state.js';
import { clamp, chance, pick, R } from './rng.js';
import { addAb } from './growth.js';
import { card, board, choose } from '../ui/render.js';
import { ABL, AB_KEYS } from '../data/tables.js';
import { TEACHER_EVENTS } from '../data/events.js';
import { checkDiscipline, checkDistract, trackCrisisBold } from './traits-unlock.js';

/* ================= 事件卡（18 張，三段強度應對，對應 WIKI 九） ================= */
const CRISIS_EVENTS=['危機處理演練','突發衝突事件']; /* 對應大心臟／救火隊長、辦公室風向球 */
export function eventBase(){ /* 教學鬼才／大器晚成：好結果機率 50%→70%；全力衝刺 +6%；躺平教師 −10% */
  let b=(S.traits&&(S.traits.genius||S.traits.late))?70:50;
  if(S.intensity==='全力衝刺')b+=6;
  if(S.traits&&S.traits.layback)b-=10;
  return clamp(b,5,95);
}
export function boldPen(){ return (S.traits&&S.traits.heart)?0:15; } /* 大心臟：消除全力一搏懲罰 */
export function resolveEvent(ev,mode,after){
  const base=eventBase(), bp=boldPen();
  const mag=mode==='safe'?1:mode==='bold'?3:2;
  let good,tag;
  if(mode==='safe'){ good=chance(Math.min(95,base+20)); tag='保守應對';
    if(S.age<25){ S.safeCount=(S.safeCount||0)+1; checkDiscipline(); } }
  else if(mode==='bold'){ good=chance(base-bp); tag='全力一搏'; }
  else { good=chance(base); tag='照常執行'; }
  const fx=good?ev.g:ev.b;
  const explicitKeys=Object.keys(fx).filter(k=>k!=='rand'&&k!=='ow');
  const out=[];
  for(const k in fx){
    const dir=fx[k]>0?1:-1;
    if(k==='ow'){
      const delta=Math.max(1,Math.round(fx.ow*(mag+1)/3));
      S.ow=(S.ow||0)+delta;
      out.push(`過勞量表 <b class="dn">+${delta}</b>`);
    } else {
      const key=k==='rand'?pick(AB_KEYS.filter(a=>!explicitKeys.includes(a))):k;
      if(dir>0){ const g=addAb(key,mag); out.push(`${ABL[key]} <b class="${g>0?'up':'hl'}">${g>0?'+'+g:'蓄力中'}</b>`); }
      else { const g=addAb(key,-mag); out.push(`${ABL[key]} <b class="dn">${g}</b>`); }
    }
  }
  card(good?'good':'bad',`事件｜${ev.n}（${tag}）`,`${good?ev.gt:ev.bt}<br>${out.join('、')}`);
  board(1);
  if(mode==='bold'&&CRISIS_EVENTS.includes(ev.n))trackCrisisBold(good);
  if(!good&&ev.n==='教師社群團購／聚餐文化'){ S.partyFailCount=(S.partyFailCount||0)+1; S.miscFailCount=(S.miscFailCount||0)+1; checkDistract(); }
  if(!good&&ev.n==='校外演講／兼課邀約'){ S.miscFailCount=(S.miscFailCount||0)+1; checkDistract(); }
  after();
}
export function jobTag(){ /* 身份別事件卡對應，對應 WIKI 九 */
  return {科任:'SUBJ',導師:'HR',組長:'ADMIN',主任:'DIR',校長:'PRIN'}[S.job]||null;
}
/* 地理事件觸發權重（對應 WIKI 三、事件觸發權重表） */
export function regionWeight(ev){
  const region=S.region; let w=1;
  if(!region)return w;
  if(region==='六都'){
    if(['公開觀議課','全縣公開示範教學','校長／督學入班觀課','媒體採訪／教育局關注'].includes(ev.n))w*=1.6;
  } else if(region==='非六都'){
    if(ev.n==='學生中輟')w*=2;
    if(ev.n==='超額介聘風聲')w*=1.5;
  } else if(region==='離島偏鄉'){
    if(ev.for==='ADMIN')w*=2.2;
    if(ev.for==='HR')w*=1.4;
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
export function drawEvent(tags,after){
  const pool=TEACHER_EVENTS.filter(e=>tags.includes(e.for));
  const list=pool.length?pool:TEACHER_EVENTS;
  const ev=weightedPick(list,regionWeight);
  if(ev.for==='ADMIN'&&S.job!=='主任'&&S.job!=='校長')S.adminDutyYearsTotal=(S.adminDutyYearsTotal||0)+1;
  const base=eventBase(), bp=boldPen();
  choose(`事件｜${ev.n} — 你要怎麼應對？`,[
    {t:'全力一搏',warn:true,s:`成功率 ${base-bp}%｜效果最大（±3）`,f:()=>resolveEvent(ev,'bold',after)},
    {t:'照常執行',main:true,s:`成功率 ${base}%｜標準效果（±2）`,f:()=>resolveEvent(ev,'norm',after)},
    {t:'保守應對',s:`成功率 ${Math.min(95,base+20)}%｜效果最小（±1）`,f:()=>resolveEvent(ev,'safe',after)},
  ]);
}
