import { S } from './state.js';
import { ri, R, clamp, chance } from './rng.js';
import { bumpSixCount } from './traits-unlock.js';

/* ================= 能力成長（成長成本曲線，見 WIKI 四） ================= */
export function abCost(k){
  const cur=S.ab[k], pk=(S.pot&&S.pot[k])||62;
  let c=cur>=72?3:cur>=64?2:1;
  if(cur>=pk)c*=3;
  return c;
}
export function addAb(k,v){
  if(!(k in S.ab))return 0; const o=S.ab[k];
  if(v<0){ S.ab[k]=clamp(o+v,1,80); return S.ab[k]-o; } /* 扣值 1:1,不吃量表成本 */
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
export function rollOneDie(){ /* 教學鬼才／大器晚成：訓練骰值永久墊高 */
  if(S.traits&&S.traits.genius)return ri(4,6);
  if(S.traits&&S.traits.late)return ri(3,6);
  return ri(1,6);
}
export function diceCount(base){ /* 外務纏身 -1（最低2）／學院派35%機率+1／偏才永久+1 */
  let n=base;
  if(S.traits&&S.traits.distract&&n>2)n--;
  if(S.traits&&S.traits.academy&&chance(35))n++;
  if(S.traits&&S.traits.focus)n++;
  return n;
}
export function genDice(baseN){
  const n=diceCount(baseN); const dice=[];
  for(let i=0;i<n;i++){ const v=rollOneDie(); dice.push(v);
    if(v===6&&S.age<26&&!(S.traits&&S.traits.genius))bumpSixCount(); }
  return dice;
}
export function rollDice(){ const r=R(); const n=r<0.35?3:r<0.75?4:r<0.95?5:6; return genDice(n); }
