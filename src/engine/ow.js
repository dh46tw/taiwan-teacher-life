import { S } from './state.js';
import { clamp, chance, pick, ri } from './rng.js';
import { addAb } from './growth.js';
import { jobTitle } from './scoring.js';
import { card, board, choose, actClear, divider } from '../ui/render.js';
import { endingActions } from '../ui/share.js';
import { retireSummaryHtml } from './summary.js';
import { bumpBigInjEarly, checkIronWill } from './traits-unlock.js';
import { AB_CORE, AB_KEYS, ABL } from '../data/tables.js';
import { endGameRetire, advanceYear, startYear } from './career-flow.js';

/* ================= 過勞系統（對應 WIKI 七，1:1 結構：owAccrue/owCap/owGamble/owBigInjury/owAfterGamble） ================= */
const OW_MULT={全力衝刺:1.25,正常負荷:1.0,佛系躺平:0.65};
const JOB_LOAD={科任:0.8,導師:1.15,組長:1.2,主任:1.35,校長:1.4};
function jobLoadMult(){ return JOB_LOAD[S.job]||0.8; }
export function owCap(){ let cap=(S.traits&&S.traits.liver)?100:50;
  const sta=S.ab.sta; cap+= sta>=70?10:sta>=65?5:0; return cap; }
export function owStatusLabel(){ const r=(S.ow||0)/owCap();
  return r>=0.85?'心力交瘁':r>=0.6?'略顯疲態':r>=0.35?'狀況尚可':'神清氣爽'; }
export function owAccrue(){
  const mult=OW_MULT[S.intensity]||1.0;
  const leaveMult=S.owLeaveTaken?1.15:1;
  S.ow=(S.ow||0)+(S.ab.cat+S.ab.arm)/19*mult*leaveMult*jobLoadMult();
}
export function owGamble(cont){
  if((S.ow||0)<owCap()){ cont(); return; }
  addAb('sta',-5); const coreKey=pick(AB_CORE); addAb(coreKey,-5);
  board(2);
  card('bad','過勞警報',`長期超載的身心終於發出警訊——教學熱忱、${ABL[coreKey]}各 <b class="dn">−5</b>。眼前擺著兩個選項。`);
  const succP=(S.traits&&S.traits.liver)?85:55;
  choose('過勞抉擇：量表已經見底',[
    {t:'申請留職停薪',main:true,s:'量表歸零、本學年成效不列入考核，回來後回春 +3~10',f:()=>{
      const wasLiver=!!(S.traits&&S.traits.liver);
      S.ow=0; S.owLeaveTaken=true; S.owStreak=0;
      if(S.traits)S.traits.liver=false;
      const g1=ri(3,10),g2=ri(3,10); const k2=pick(AB_CORE.filter(k=>k!==coreKey));
      addAb('sta',g1); addAb(k2,g2); board(2);
      card('good','留職停薪',`帶職停薪，把自己從崩潰邊緣拉回來。回來後教學熱忱 <b class="up">+${g1}</b>、${ABL[k2]} <b class="up">+${g2}</b>。${wasLiver?'<br><span style="color:var(--dim)">（肝帝特性因此失效）</span>':''}`);
      board(2); owAfterGamble('leave',cont); }},
    {t:'簽切結書硬撐',warn:true,s:`成功率 ${succP}%｜失敗＝過勞倒下（隔年強制病假、能力再各−5）`,f:()=>{
      if(chance(succP)){
        S.ow=Math.max(0,S.ow-20); addAb('sta',5); addAb(coreKey,5);
        card('good','險過一關',`切結書簽下去，硬是把這學期撐完——量表 <b class="hl">−20</b>，教學熱忱、${ABL[coreKey]}各 <b class="up">+5</b>。但這是在跟未來借命。`);
        board(2); owAfterGamble('inject',cont);
      } else { owBigInjury(coreKey,cont); } }},
  ]);
}
export function owBigInjury(coreKey,cont){
  S.owBigCount=(S.owBigCount||0)+1; S.ow=0; S.owStreak=0;
  if(chance(5)){
    AB_CORE.forEach(k=>S.ab[k]=10);
    if(S.pot)AB_CORE.forEach(k=>S.pot[k]=20);
    board(2);
    card('bad','職業倦怠症候群',`診斷書上「重度憂鬱伴隨自律神經失調」幾個字，說明了一切。核心教學能力砍到 <b class="dn">10</b>，潛力上限砍到 <b class="dn">20</b>。你被迫辦理資遣，教職生涯基本結束。`);
    forceRetireBurnout(); return;
  }
  S.sickLeaveYears=(S.sickLeaveYears||0)+1;
  bumpBigInjEarly();
  const g1=ri(3,10),g2=ri(3,10), net1=g1-5, net2=g2-5;
  addAb('sta',net1); addAb(coreKey,net2);
  let halved=false;
  if(S.owBigCount>=2){ S.ab.sta=clamp(Math.round(S.ab.sta/2),1,80); S.ab[coreKey]=clamp(Math.round(S.ab[coreKey]/2),1,80); halved=true; }
  board(2);
  const f=n=>n>0?`<b class="up">+${n}</b>`:n<0?`<b class="dn">${n}</b>`:'<b>0</b>';
  card('bad','過勞倒下',`硬撐的代價來了——身心當場亮出紅燈。隔年<b class="dn">強制病假</b>。教學熱忱 ${f(net1)}、${ABL[coreKey]} ${f(net2)}。${halved?`這是你第二次因過勞倒下，教學熱忱與${ABL[coreKey]} <b class="dn">直接砍半</b>。`:''}`);
  board(2);
  if(S.owBigCount>=2&&(S.svcTotal||0)>=5){
    endGameRetire((S.svcTotal||0)>=15?'voluntarySpecial':'order');
    return;
  }
  owAfterGamble('fail',cont);
}
function owAfterGamble(kind,cont){
  if(kind==='inject'){
    S.owStreak=(S.owStreak||0)+1;
    if(S.owStreak>=2&&!(S.traits&&S.traits.liver)){
      S.traits=S.traits||{}; S.traits.liver=true;
      card('gold','隱藏特性解鎖：肝帝','連續兩次靠硬撐挺過過勞危機、中間完全沒請假——你的身體像被榨乾又補滿的橡皮筋。<b class="hl">過勞量表上限翻倍、硬撐成功率翻倍</b>。');
      board(2);
    }
  } else { S.owStreak=0; }
  cont();
}
function forceRetireBurnout(){
  actClear();
  divider(`${S.year} 年 · ${S.age} 歲 · 職業倦怠強制退場`);
  card('gold','退休',`因職業倦怠症候群被迫辦理資遣／自請退休。<br>${retireSummaryHtml()}`);
  endingActions();
}
/* ---------- 開學期教學強度規劃（每學年必選，對應 WIKI 七） ---------- */
export function chooseIntensity(next){
  choose(`開學期教學強度規劃（過勞狀況：${owStatusLabel()}）`,[
    {t:'全力衝刺',warn:true,s:'成效最佳（能力+1、事件亮點機率+6%）｜過勞負擔最重（×1.25）',f:()=>applyIntensity('全力衝刺',next)},
    {t:'正常負荷',main:true,s:'標準強度與過勞負擔（×1.0）',f:()=>applyIntensity('正常負荷',next)},
    {t:'佛系躺平',s:'成效保守（能力−1）｜過勞負擔最輕（×0.65）',f:()=>applyIntensity('佛系躺平',next)},
  ]);
}
function applyIntensity(mode,next){
  S.intensity=mode;
  if(mode==='全力衝刺'){ const k=pick(AB_CORE); const got=addAb(k,1);
    card('good','開學期規劃',`決定全力衝刺——${ABL[k]} <b class="up">${got>0?'+'+got:'蓄力中'}</b>。這學期過勞負擔也會加重。`); }
  else if(mode==='佛系躺平'){ const k=pick(AB_CORE); const got=addAb(k,-1);
    card('info','開學期規劃',`決定佛系躺平——${ABL[k]} <b class="dn">${got}</b>，但至少不會那麼操。`); }
  else card('info','開學期規劃','正常負荷開學，一切照舊。');
  board(0); next();
}
/* ================= 傷病與衰退（對應 WIKI 八） ================= */
export function injuryProb(){
  let p=15; if(S.age>=35)p+=12; else if(S.age>=32)p+=6;
  if(S.traits&&S.traits.academy&&S.age<25)p-=5; /* 學院派：25歲前請假機率-5% */
  if(S.traits&&S.traits.iron&&S.traits.glass)p=25; /* 鐵飯碗+藥罐子同時觸發，取中間值 */
  else if(S.traits&&S.traits.iron)p=Math.min(p,10); /* 鐵飯碗：上限10% */
  else if(S.traits&&S.traits.glass)p=Math.max(p,40); /* 藥罐子：下限40% */
  return clamp(p,3,95);
}
const INJ_NAMES=['慢性咽喉炎','腰椎椎間盤突出','焦慮症','聲帶結節'];
export function rollInjury(after){
  const p=injuryProb();
  if(!chance(p)){
    S.healthyStreak=(S.healthyStreak||0)+1; checkIronWill();
    after(true); return;
  }
  if(chance(64)){ /* 小傷：砍當學期成效（跳過本學期事件），40%機率留後遺症 */
    S.healthyStreak=0;
    card('bad','小傷',`${pick(INJ_NAMES)}發作，這學期教學明顯受影響，本學期只能先放下事件應對。`);
    board(1);
    if(chance(40)){
      const k=pick(AB_KEYS), amt=ri(1,2), g=addAb(k,-amt);
      card('bad','傷勢後遺症',`${ABL[k]} <b class="dn">${g}</b>。`); board(1);
    }
    after(false);
  } else { /* 大傷：整學期病假，50%機率隔年也報銷，全能力-5 */
    S.sickLeaveYears=(S.sickLeaveYears||0)+1;
    bumpBigInjEarly();
    let ext='';
    if(chance(50)){ S.sickLeaveYears++; ext='醫生搖搖頭：<b class="dn">明年也很難恢復</b>（明年也將全年報銷）。'; }
    AB_KEYS.forEach(k=>{ S.ab[k]=clamp(S.ab[k]-5,1,80); });
    card('bad','大傷',`${pick(INJ_NAMES)}來勢洶洶——<b class="dn">整學期病假</b>，全能力 <b class="dn">−5</b>。${ext}`);
    board(1); after(false);
  }
}
export function applyDecline(){
  const declAge=S.age-(S.traits&&S.traits.disc?2:0); /* 自律魔人：衰退曲線延後兩年 */
  if(declAge<52)return;
  const staHigh=S.ab.sta>=65;
  let dec=declAge>=55?5+(declAge-55):2;
  if(staHigh)dec=Math.max(1,dec-2);
  AB_KEYS.forEach(k=>{ S.ab[k]=clamp(S.ab[k]-dec,1,80); });
  card('bad','歲月不饒人',`${declAge>=55?'衰退加劇期':'體力漸不如前'}：各項能力 <b class="dn">−${dec}</b>${staHigh?'（教學熱忱夠高，衰退已放緩）':''}${S.traits&&S.traits.disc?'（自律魔人：衰退曲線延後兩年）':''}。`);
  board(0);
}
export function handleSickLeaveYear(){
  if(!((S.sickLeaveYears||0)>0))return false;
  S.sickLeaveYears--;
  const label=S.phase==='正職'?`${S.region}${jobTitle()}（${S.school}）`:'代理教師';
  card('bad','病假／留停年',`身心尚未恢復，${S.year} 年以${label}身份掛名在職，全年沒有實質授課，也沒有進帳。${S.sickLeaveYears>0?'（明年恐怕還得繼續休養）':''}`);
  board(2);
  choose('',[{t:'▸ 熬過這一年 ▸',main:true,f:()=>{ advanceYear(); startYear(); }}]);
  return true;
}
