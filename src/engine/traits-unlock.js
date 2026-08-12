import { S } from './state.js';
import { pick } from './rng.js';
import { addAb } from './growth.js';
import { card, board } from '../ui/render.js';
import { ABL, AB_KEYS } from '../data/tables.js';
import { TRAIT_NAMES } from '../data/traits.js';

/* ================= 隱藏特性系統（7 種，對應 WIKI 九） ================= */
function unlock(key,desc){
  if(S.traits&&S.traits[key])return;
  S.traits=S.traits||{}; S.traits[key]=true;
  card('gold',`隱藏特性解鎖：${TRAIT_NAMES[key]}`,desc);
  board(0);
}

/* 強心臟：危機事件卡連續4次選高投入且全部成功 → 高投入成功率懲罰永久消除 */
export function trackCrisisBold(ev,tier,good){
  if(!ev.crisis||tier!=='high')return;
  if(good){
    S.crisisBoldStreak=(S.crisisBoldStreak||0)+1;
    if(S.crisisBoldStreak>=4){
      unlock('ironHeart','危機事件連續4次選擇高投入應對且全部成功——你早已練就處變不驚的膽識。<b class="hl">高投入選項的成功率懲罰永久消除</b>。');
    }
  } else {
    S.crisisBoldStreak=0;
  }
}

/* 大器晚成：25~31歲、當下OVR<47、單年加點總幅度≥16（逆襲式成長） */
export function checkLateBloom(ovrBefore,totalGot){
  if(S.traits&&S.traits.late)return;
  if(S.age>=25&&S.age<=31&&ovrBefore<47&&totalGot>=16){
    const k=pick(AB_KEYS);
    if(S.pot)S.pot[k]=Math.min(80,(S.pot[k]||62)+10);
    const g=addAb(k,5);
    S.traits=S.traits||{}; S.traits.late=true;
    card('gold','隱藏特性解鎖：大器晚成',`蓄勢待發，這一年徹底逆襲——<b class="hl">經驗骰永久 ≥3 點、事件卡好結果機率提升至 70%</b>，${ABL[k]}潛力上限 <b class="up">+10</b> 且當場 <b class="up">${g>0?'+'+g:g}</b>。`);
    board(0);
  }
}

/* 整組壞了了：32歲前生涯累計2次過勞/職業傷害大傷 → 往後每年請假機率下限40% */
export function bumpBigInjEarly(){
  if(S.age>=32)return;
  S.bigInjEarlyCount=(S.bigInjEarlyCount||0)+1;
  if(S.bigInjEarlyCount>=2){
    unlock('burnedOut','32歲前生涯已累計兩次過勞／職業傷害大傷，身體徹底被榨乾了。<b class="dn">往後每年請假機率下限 40%</b>。');
  }
}

/* 堅守校園：同校連續服務10年以上、未曾轉校 → 續聘/介聘待遇加成、退休評價額外加分 */
export function checkStayput(){
  if((S.schoolYears||0)>=10){
    unlock('stayput','同一所學校一待就是十年以上，從沒想過要換地方。<b class="hl">續聘/介聘待遇加成、退休評價額外加分</b>。');
  }
}

/* 萬年代理／敬業代表：僅在退休當下判定，直接加進 CareerScore（對應 WIKI 九，起始數值待試玩校準） */
export function retirementTraitBonus(){
  if(S.phase==='代理'&&(S.subYearsTotal||0)>=20&&!(S.traits&&S.traits.foreverSub)){
    S.traits=S.traits||{}; S.traits.foreverSub=true;
    S.careerScore=(S.careerScore||0)+300;
    card('gold','隱藏特性解鎖：萬年代理','代理教到退休，代理年資累計已滿20年——這份堅持本身就是一種成就。<b class="up">教育積分額外 +300</b>，補償代理路線先天分數弱勢。');
    board(2);
  }
  if(!S.everAdmin&&(S.teachYears||0)>=25&&!(S.traits&&S.traits.devoted)){
    S.traits=S.traits||{}; S.traits.devoted=true;
    S.careerScore=(S.careerScore||0)+250;
    card('gold','隱藏特性解鎖：敬業代表','從未踏入行政職，專心教書滿25年——安穩背後是紮實的付出。<b class="up">教育積分額外 +250</b>，補償無行政路線的分數弱勢。');
    board(2);
  }
  if(S.traits&&S.traits.stayput){
    S.careerScore=(S.careerScore||0)+150;
    card('gold','堅守校園退休加分','久任同校的堅持，在退休評價上額外加分。<b class="up">教育積分額外 +150</b>。');
    board(2);
  }
}
