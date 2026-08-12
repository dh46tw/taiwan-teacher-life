import { S } from './state.js';
import { TIER_TABLE, BIG_AWARD_KEYS, COUNTY_OR_ABOVE_KEYS, FLAVOR, ABL, AB_KEYS, AWARDS } from '../data/tables.js';

/* ================= 生涯結算：教育積分、5級稱號、風味詞綴（對應 WIKI 六） ================= */
export function totalScore(){ return (S.careerScore||0)+(S.honorScore||0); }
export function tierOf(score){
  for(const row of TIER_TABLE){ if(score>=row.min)return row.name; }
  return TIER_TABLE[TIER_TABLE.length-1].name;
}
const TIER_RANK=['一頁教育者','認真教師','資深良師','明星教師','典範教育家'];
/* 保底規則：師鐸獎/教育奉獻獎→至少明星教師；任一縣市級以上單項獎→至少資深良師（對應 WIKI 六） */
export function finalTier(){
  let t=tierOf(totalScore());
  const won=S.awardsWon||{};
  if(BIG_AWARD_KEYS.some(k=>won[k])&&TIER_RANK.indexOf(t)<TIER_RANK.indexOf('明星教師'))t='明星教師';
  else if(COUNTY_OR_ABOVE_KEYS.some(k=>won[k])&&TIER_RANK.indexOf(t)<TIER_RANK.indexOf('資深良師'))t='資深良師';
  return t;
}
/* 風味稱號：累積投入點數最高一項；從未主動訓練過則依最終職務路線判定（對應 WIKI 六） */
export function flavorOf(){
  const inv=S.investedPoints||{};
  const sorted=AB_KEYS.slice().sort((a,b)=>(inv[b]||0)-(inv[a]||0));
  const top=sorted[0];
  if(!top||(inv[top]||0)===0){
    if(S.job==='校長'||S.job==='主任')return FLAVOR.adm;
    if(S.job==='組長')return FLAVOR.com;
    if(S.job==='導師')return FLAVOR.mgt;
    return FLAVOR.pro;
  }
  return FLAVOR[top];
}
export function finalJobLabel(){
  if(S.phase==='代理')return '代理教師';
  if(S.phase==='正職')return `${S.region}・${S.school}・${(S.job==='主任'&&S.deptOffice)?S.deptOffice+'主任':S.job}`;
  return S.phase||'';
}
export function honorsList(){
  const won=S.awardsWon||{};
  const list=[];
  Object.keys(won).forEach(k=>{
    if(!won[k])return;
    if(k==='schoolMerit'){ list.push(`校內特殊表現嘉獎 ×${won[k]}`); return; }
    const a=AWARDS[k]; if(a)list.push(a.name);
  });
  return list;
}
export function retireSummaryHtml(){
  const cs=Math.round(S.careerScore||0), hs=Math.round(S.honorScore||0), total=Math.round(totalScore());
  const tier=finalTier(), flavor=flavorOf();
  const honors=honorsList();
  const abLines=AB_KEYS.map(k=>`${ABL[k]} ${S.ab[k]}`).join('、');
  return `
    <div style="margin-top:10px">
      <div style="font-size:20px;font-weight:bold;color:var(--amber)">★ ${tier}・${flavor}</div>
      <div style="margin-top:6px">CareerScore ${cs}　HonorScore ${hs}　<b>教育積分總分 ${total}</b></div>
      <div style="margin-top:6px;color:var(--dim)">六維能力值：${abLines}</div>
      <div style="margin-top:6px;color:var(--dim)">生涯榮譽（${honors.length}項）：${honors.length?honors.join('、'):'無正式榮譽紀錄'}</div>
      <div style="margin-top:6px;color:var(--dim)">${finalJobLabel()}｜${S.startYear||2026}–${S.year}｜退休時 ${S.age} 歲｜教學年資 ${S.teachYears||0} 年</div>
    </div>`;
}
