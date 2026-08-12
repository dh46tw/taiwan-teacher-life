import { S } from './state.js';
import { ri, R, clamp } from './rng.js';

/* ================= 能力成長成本曲線（對應 WIKI 三：<64→1／64-71→2／72+→3／超天花板×3） ================= */
export function abCost(k){
  const cur=S.ab[k], pk=(S.pot&&S.pot[k])||62;
  let c=cur>=72?3:cur>=64?2:1;
  if(cur>=pk)c*=3;
  return c;
}
/* 純能力值變動：扣值 1:1 直接生效；加值吃成長成本曲線與蓄力槽。不記錄「累積投入點數」。 */
export function addAb(k,v){
  if(!(k in S.ab))return 0; const o=S.ab[k];
  if(v<0){ S.ab[k]=clamp(o+v,1,80); return S.ab[k]-o; }
  if(!S.carry)S.carry={};
  let cur=o,bud=v+(S.carry[k]||0);
  const pk=(S.pot&&S.pot[k])||62;
  while(bud>0&&cur<80){
    let cost=cur>=72?3:cur>=64?2:1;
    if(cur>=pk)cost*=3;
    if(bud>=cost){bud-=cost;cur++;} else break;
  }
  S.carry[k]=cur>=80?0:bud;
  S.ab[k]=cur; return cur-o;
}
/* 開學期擲骰／訓練加點專用：疊加「累積投入點數」（對應 WIKI 三，退休結算風味稱號依據）。
   投入點數記錄的是實際投入的骰值，不因後續衰退／事件卡扣分而改變。 */
export function trainAb(k,v){
  const got=addAb(k,v);
  if(!S.investedPoints)S.investedPoints={};
  S.investedPoints[k]=(S.investedPoints[k]||0)+v;
  return got;
}
export function rollOneDie(){
  if(S.traits&&S.traits.late)return ri(3,6); /* 大器晚成：訓練骰永久 ≥3 點 */
  return ri(1,6);
}
export function genDice(n){
  const dice=[]; for(let i=0;i<n;i++)dice.push(rollOneDie()); return dice;
}
/* 開學期每年擲 3–6 顆骰（機率 35%/40%/20%/5%，對應 WIKI 三） */
export function rollDice(){
  const r=R(); const n=r<0.35?3:r<0.75?4:r<0.95?5:6; return genDice(n);
}
