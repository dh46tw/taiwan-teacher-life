import { S } from './state.js';
import { clamp, chance, pick, ri } from './rng.js';
import { addAb } from './growth.js';
import { card, board, choose, divider } from '../ui/render.js';
import { ABL, AB_KEYS } from '../data/tables.js';
import { settleDirTenure, settlePrinTenure, owCap, owStatusLabel } from './scoring.js';
import { retireSummaryHtml } from './summary.js';
import { endingActions } from '../ui/share.js';
import { bumpBigInjEarly, retirementTraitBonus } from './traits-unlock.js';

/* ================= 過勞系統（健康主導，對應 WIKI 七） ================= */
const OW_MULT={全力衝刺:1.25,正常負荷:1.0,佛系躺平:0.65};
const JOB_LOAD={科任:0.8,導師:1.15,組長:1.2,主任:1.35,校長:1.4};
const CORE_POOL=['pro','mgt','com','adm']; /* 過勞對賭時「隨機一項核心能力」的抽選池，排除健康／教學熱忱 */

function jobLoadMult(){ return JOB_LOAD[S.job]||0.8; } /* 代理／實習期無職務負荷表，先比照科任最低負荷 */

export function owAccrue(){
  const mult=OW_MULT[S.intensity]||1.0;
  const leaveMult=S.owLeaveTaken?1.15:1;
  S.ow=(S.ow||0)+(S.ab.adm+S.ab.com)/19*mult*leaveMult*jobLoadMult();
}

/* ---------- 職業倦怠症候群風險（對應 WIKI 七，健康值為主要因子） ---------- */
export function burnoutProb(hardFailCount){
  const hp=S.ab.hp;
  return clamp(2+Math.max(0,(40-hp)/40)*8+hardFailCount*1.5,2,15);
}

/* ---------- 過勞抉擇：量表滿了（對應 WIKI 七） ---------- */
export function owGamble(cont){
  if((S.ow||0)<owCap()){ cont(); return; }
  const coreKey=pick(CORE_POOL);
  addAb('hp',-5); addAb(coreKey,-5);
  board(2);
  card('bad','過勞警報',`長期超載的身心終於發出警訊——健康、${ABL[coreKey]}各 <b class="dn">−5</b>。眼前擺著兩個選項。`);
  const succP=(S.traits&&S.traits.owBeast)?85:55;
  const hypoProb=burnoutProb((S.owBigCount||0)+1);
  const highRisk=hypoProb>=8||S.ab.hp<30;
  choose('過勞抉擇：量表已經見底',[
    {t:'申請留職停薪',main:true,s:'量表歸零、本學年成效不列入考核，回來後回春 +3~10',f:()=>{
      const wasBeast=!!(S.traits&&S.traits.owBeast);
      S.ow=0; S.owLeaveTaken=true; S.owStreak=0;
      if(S.traits)S.traits.owBeast=false;
      const g1=ri(3,10),g2=ri(3,10);
      const k2=pick(CORE_POOL.filter(k=>k!==coreKey));
      addAb('hp',g1); addAb(k2,g2); board(2);
      card('good','留職停薪',`帶職停薪，把自己從崩潰邊緣拉回來。回來後健康 <b class="up">+${g1}</b>、${ABL[k2]} <b class="up">+${g2}</b>。${wasBeast?'<br><span style="color:var(--dim)">（「功勞不知道但過勞一定有」特性因此失效）</span>':''}`);
      board(2); owAfterGamble('leave',cont);
    }},
    {t:'簽切結書硬撐',warn:true,
      s:(highRisk?`⚠️ 高風險｜成功率 ${succP}%｜若失敗，職業倦怠症候群機率約 ${Math.round(hypoProb)}%`:`成功率 ${succP}%｜失敗＝過勞倒下（隔年強制病假、能力再各−5）`),
      f:()=>{
        if(chance(succP)){
          S.ow=Math.max(0,S.ow-20); addAb('hp',5); addAb(coreKey,5);
          card('good','險過一關',`切結書簽下去，硬是把這學期撐完——量表 <b class="hl">−20</b>，健康、${ABL[coreKey]}各 <b class="up">+5</b>。但這是在跟未來借命。`);
          board(2); owAfterGamble('inject',cont);
        } else { owBigInjury(coreKey,cont); }
      }},
  ]);
}
export function owBigInjury(coreKey,cont){
  S.owBigCount=(S.owBigCount||0)+1;
  S.ow=0; S.owStreak=0;
  const prob=burnoutProb(S.owBigCount);
  if(chance(prob)){
    S.ab.pro=10;
    if(S.pot)S.pot.pro=20;
    board(2);
    card('bad','職業倦怠症候群',`診斷書上「重度憂鬱伴隨自律神經失調」幾個字，說明了一切。核心教學能力砍到 <b class="dn">10</b>，潛力上限砍到 <b class="dn">20</b>。你被迫辦理資遣，教職生涯基本結束。`);
    forceRetireBurnout(); return;
  }
  S.sickLeaveYears=(S.sickLeaveYears||0)+1;
  bumpBigInjEarly();
  addAb('hp',-5); addAb(coreKey,-5);
  let halved=false;
  if(S.owBigCount>=2){
    S.ab.hp=clamp(Math.round(S.ab.hp/2),1,80);
    S.ab[coreKey]=clamp(Math.round(S.ab[coreKey]/2),1,80);
    halved=true;
  }
  board(2);
  card('bad','過勞倒下',`硬撐的代價來了——身心當場亮出紅燈。隔年<b class="dn">強制病假</b>。健康、${ABL[coreKey]}再各 <b class="dn">−5</b>。${halved?`這是你第二次因過勞倒下，健康與${ABL[coreKey]} <b class="dn">直接砍半</b>。`:''}`);
  board(2);
  owAfterGamble('fail',cont);
}
function owAfterGamble(kind,cont){
  if(kind==='inject'){
    S.owStreak=(S.owStreak||0)+1;
    if(S.owStreak>=2&&!(S.traits&&S.traits.owBeast)){
      S.traits=S.traits||{}; S.traits.owBeast=true;
      card('gold','隱藏特性解鎖：功勞不知道但過勞一定有','連續兩次靠硬撐挺過過勞危機、中間完全沒請假——你的身體像被榨乾又補滿的橡皮筋。<b class="hl">過勞量表上限翻倍、硬撐成功率翻倍</b>。');
      board(2);
    }
  } else { S.owStreak=0; }
  cont();
}
function forceRetireBurnout(){
  if(S.job==='主任')settleDirTenure();
  if(S.job==='校長')settlePrinTenure();
  retirementTraitBonus();
  divider(`${S.year} 年 · ${S.age} 歲 · 職業倦怠強制退場`);
  card('gold','退休（因職業倦怠症候群）',`因職業倦怠症候群被迫辦理資遣／自請退休。${retireSummaryHtml()}`);
  endingActions();
}

/* ---------- 開學期教學強度規劃（每學年必選，對應 WIKI 七） ---------- */
export function chooseIntensity(next){
  choose(`開學期教學強度規劃（過勞狀況：${owStatusLabel()}）`,[
    {t:'全力衝刺',warn:true,s:'成效最佳（事件亮點機率+6%）｜過勞負擔最重（×1.25）',f:()=>applyIntensity('全力衝刺',next)},
    {t:'正常負荷',main:true,s:'標準強度與過勞負擔（×1.0）',f:()=>applyIntensity('正常負荷',next)},
    {t:'佛系躺平',s:'成效保守（事件亮點機率−6%）｜過勞負擔最輕（×0.65）',f:()=>applyIntensity('佛系躺平',next)},
  ]);
}
function applyIntensity(mode,next){
  S.intensity=mode;
  card('info','開學期規劃',mode==='全力衝刺'?'決定全力衝刺，這學期過勞負擔會加重。':mode==='佛系躺平'?'決定佛系躺平，至少不會那麼操。':'正常負荷開學，一切照舊。');
  board(0); next();
}

/* ================= 傷病與衰退（對應 WIKI 七） ================= */
export function injuryProb(){
  let p=15; if(S.age>=35)p+=12; else if(S.age>=32)p+=6;
  if(S.traits&&S.traits.burnedOut)p=Math.max(p,40); /* 整組壞了了：請假機率下限40%（對應 WIKI 九） */
  return clamp(p,3,95);
}
const INJ_NAMES=['慢性咽喉炎','腰椎椎間盤突出','焦慮症','聲帶結節'];
/* after(noInjury): noInjury=true 表示這學期沒事，可繼續進入事件卡 */
export function rollInjury(after){
  const p=injuryProb();
  if(!chance(p)){ S.healthyStreak=(S.healthyStreak||0)+1; after(true); return; }
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
/* 衰退曲線：健康≥65延後2年觸發；健康<40提前2年觸發且幅度×1.5（對應 WIKI 七） */
export function applyDecline(){
  const hp=S.ab.hp;
  const delay=hp>=65?2:(hp<40?-2:0);
  const magMult=hp<40?1.5:1;
  const mildStart=52+delay, severeStart=55+delay;
  if(S.age<mildStart)return;
  let dec=S.age>=severeStart?5+(S.age-severeStart):2;
  dec=Math.round(dec*magMult);
  AB_KEYS.forEach(k=>{ S.ab[k]=clamp(S.ab[k]-dec,1,80); });
  card('bad','歲月不饒人',`${S.age>=severeStart?'衰退加劇期':'體力漸不如前'}：各項能力 <b class="dn">−${dec}</b>${hp>=65?'（健康狀況佳，衰退已延後）':hp<40?'（健康狀況不佳，衰退提前且加劇）':''}。`);
  board(0);
}
export function handleSickLeaveYear(){
  if(!((S.sickLeaveYears||0)>0))return false;
  S.sickLeaveYears--;
  card('bad','病假／留停年',`身心尚未恢復，${S.year} 年沒有實質授課，也沒有進帳。${S.sickLeaveYears>0?'（明年恐怕還得繼續休養）':''}`);
  board(2);
  return true;
}
