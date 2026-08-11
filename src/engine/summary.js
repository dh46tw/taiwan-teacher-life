import { S } from './state.js';
import { ovr, jobTitle, careerScoreCalc, honorScoreCalc, finalTier } from './scoring.js';
import { checkRetireTraits, checkHallOfFame, traitsSummaryHtml } from './traits-unlock.js';
import { AWARDS, SUBJ_CONTEST } from '../data/awards.js';

/* ---------- 代表機構／退休儀式（對應 WIKI 十二） ---------- */
export function repInstitution(){
  const m=S.schoolYearsMap||{}; let best=null,bestY=0;
  for(const k in m){ if(m[k]>bestY){bestY=m[k];best=k;} }
  return best||S.school||S.region||'';
}
export function finalJobLabel(){
  return S.phase==='正職' ? `${S.region}${jobTitle()}（${S.school}）` : '代理教師（萬年代理）';
}
/* 依 AWARDS 資料表與 S.awardsWon 計數，重建可讀的生涯榮譽清單 */
export function honorsList(){
  const w=S.awardsWon||{};
  return AWARDS.filter(a=>w[a.key]>0).map(a=>{
    const n=a.subj?`指導學生獲全國賽（${SUBJ_CONTEST[S.subject]}）`:a.n;
    const cnt=w[a.key];
    return cnt>1?`${n} ×${cnt}`:n;
  });
}
export function retireCeremonyHtml(tier){
  if(tier==='典範教育家')return `<b class="hl">${repInstitution()}</b>所在縣市政府公開表揚，教育處長親自出席歡送茶會，歷屆學生返校獻花，地方新聞報導了這段教育生涯。`;
  if(tier==='明星教師')return `${S.school||repInstitution()}辦理退休歡送會，全校師生列隊歡送，畢業班學生自製回憶錄影片，場面感人。`;
  if(tier==='資深良師')return `學年同事在辦公室辦了一場小小歡送茶會，收到一疊卡片與一束花，暖暖的。`;
  return `默默辦理退休手續，只有幾個熟識的同事私下請吃一頓飯道別。不是每個人都有盛大的儀式，但每個認真教過書的人，都有學生記得。`;
}
export function retireSummaryHtml(){
  checkRetireTraits();
  const cs=careerScoreCalc(), hs=honorScoreCalc(), total=cs+hs, tier=finalTier();
  const hof=checkHallOfFame();
  return `教職生涯畫下句點。最終身份：<b class="hl">${finalJobLabel()}</b>。教學年資 ${S.teachYears||0} 年，教學評價 ${ovr()}，生涯累計薪資 ${Math.round(S.salary).toLocaleString()} 萬元。`
    +`<div class="statline">CareerScore ${Math.round(cs)}　HonorScore ${hs}　生涯評價分 <b class="hl">${Math.round(total)}</b>　評選：<b class="hl">${tier}</b></div>`
    +`${retireCeremonyHtml(tier)}${hof?'<br>'+hof:''}${traitsSummaryHtml()}`;
}
