import { S } from './state.js';
import { R, clamp, chance, ri, pick } from './rng.js';
import { ovr, lvRow, totalCareerScore, finalTier } from './scoring.js';
import { addAb } from './growth.js';
import { card, board } from '../ui/render.js';
import { ABL, AB_KEYS } from '../data/tables.js';
import { AWARDS, SUBJ_CONTEST } from '../data/awards.js';
import { TRAIT_NAMES } from '../data/traits.js';

/* ================= 隱藏特性系統（對應 WIKI 十，共 24 種；肝帝已於過勞系統實作） ================= */

/* ---------- 教學鬼才／大器晚成：26歲前5次擲出6、或25~31歲單年爆發成長 ---------- */
export function bumpSixCount(){
  S.sixCount=(S.sixCount||0)+1;
  if(S.sixCount>=5&&!S.traits.genius){
    S.traits.genius=true;
    const cands=AB_KEYS.filter(k=>S.ab[k]<70);
    for(let i=cands.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=cands[i];cands[i]=cands[j];cands[j]=t;}
    const boost=cands.slice(0,2);
    boost.forEach(k=>{ S.pot[k]=Math.min(80,(S.pot[k]||62)+10); S.ab[k]=clamp(S.ab[k]+5,1,80); });
    card('gold','隱藏特性解鎖：教學鬼才',`26 歲前五度擲出高標值！從今以後每顆訓練骰永久固定 <b class="hl">4 點以上</b>，事件卡好結果機率提升至 <b class="hl">70%</b>。${boost.length?'天賦覺醒：'+boost.map(k=>`${ABL[k]} <b class="up">+5</b>（潛力上限 +10）`).join('、'):''}`);
    board(0);
  }
}
export function checkLateBloom(totalGot){
  if((S.traits.genius||S.traits.late))return;
  if(S.age>=25&&S.age<=31&&ovr()<47&&totalGot>=16){
    S.traits.late=true;
    const cands=AB_KEYS.filter(k=>S.ab[k]<70);
    for(let i=cands.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=cands[i];cands[i]=cands[j];cands[j]=t;}
    const boost=cands.slice(0,2);
    boost.forEach(k=>{ S.pot[k]=Math.min(80,(S.pot[k]||62)+10); S.ab[k]=clamp(S.ab[k]+5,1,80); });
    card('gold','隱藏特性解鎖：大器晚成',`這一年拚出了單年 <b class="hl">+${totalGot}</b> 的爆發式成長！從今以後訓練骰永久固定 <b class="hl">3 點以上</b>，事件卡好結果機率提升至 <b class="hl">70%</b>。${boost.length?'潛能重新被評估：'+boost.map(k=>`${ABL[k]} <b class="up">+5</b>（潛力上限 +10）`).join('、'):''}`);
    board(0);
  }
}
/* ---------- 偏才／一心一藝：連續3年七成五以上點數灌同一能力 ---------- */
export function checkFocus(hist,totalGot){
  if(S.traits.focus||!hist||!hist.length||totalGot<=0)return;
  const byKey={}; hist.forEach(([k,got])=>{ byKey[k]=(byKey[k]||0)+got; });
  let maxVal=0; for(const k in byKey){ if(byKey[k]>maxVal)maxVal=byKey[k]; }
  if(maxVal/totalGot>=0.75) S.focusStreak=(S.focusStreak||0)+1; else S.focusStreak=0;
  if(S.focusStreak>=3){
    S.traits.focus=true;
    card('gold','隱藏特性解鎖：偏才／一心一藝','連續 3 年把七成五以上的訓練點數都灌進同一項能力——這份執念換來開學期擲骰永久多 1 顆。');
    board(0);
  }
}
/* ---------- 自律魔人：25歲前15次保守應對，且聚餐搞砸<5次 ---------- */
export function checkDiscipline(){
  if(S.traits.disc)return;
  if((S.safeCount||0)>=15&&(S.partyFailCount||0)<5){
    S.traits.disc=true;
    card('gold','隱藏特性解鎖：自律魔人','25 歲前累計 15 次保守應對，生活紀律嚴謹——整條衰退曲線將延後兩年。');
    board(1);
  }
}
/* ---------- 學院派高材生：師培大學出身，教育實習期間表現優良 ---------- */
export function checkAcademyHonor(){
  if(S.univTier!=='edu'||S.traits.academy)return;
  const prob=clamp(ovr(),15,55);
  if(chance(prob)){
    S.traits.academy=true;
    card('gold','隱藏特性解鎖：學院派高材生','師培大學出身，教育實習期間表現優良——25 歲前請假機率降低，開學期擲骰期望值也跟著提升。');
    board(0);
  }
}
/* ---------- 大心臟／救火隊長、辦公室風向球：危機事件全力一搏 ---------- */
export function trackCrisisBold(good){
  if(good){
    S.crisisBoldStreak=(S.crisisBoldStreak||0)+1;
    if(S.crisisBoldStreak>=4&&!S.traits.heart){
      S.traits.heart=true;
      card('gold','隱藏特性解鎖：大心臟／救火隊長','危機事件連續 4 次全力一搏且全部成功——從今以後永久消除全力一搏的失敗率懲罰。');
      board(1);
    }
  } else {
    S.crisisBoldStreak=0;
    S.crisisBoldFailTotal=(S.crisisBoldFailTotal||0)+1;
    if(S.crisisBoldFailTotal>=10&&!S.traits.windvane){
      S.traits.windvane=true;
      card('bad','隱藏特性解鎖：辦公室風向球','危機事件全力一搏累計失敗超過 10 次——同事開始把你當成校園氣氛的溫度計，超額介聘的名單也更容易看到你的名字。');
      board(1);
    }
  }
}
/* ---------- 外務纏身：聚餐/兼職搞砸合計4次 ---------- */
export function checkDistract(){
  if(S.traits.distract)return;
  if((S.miscFailCount||0)>=4){
    S.traits.distract=true;
    card('bad','隱藏特性解鎖：外務纏身','聚餐與兼職的坑踩了又踩，正職備課的時間被壓縮——開學期擲骰永久少 1 顆（最低 2 顆）。');
    board(1);
  }
}
/* ---------- 鐵飯碗不是叫假的：連續5年零請假零過勞大傷 ---------- */
export function checkIronWill(){
  if(S.traits.iron)return;
  if((S.healthyStreak||0)>=5){
    S.traits.iron=true;
    card('gold','隱藏特性解鎖：鐵飯碗不是叫假的','連續 5 年零請假、零過勞大傷全勤——從今以後每年請假機率上限鎖定在 <b class="hl">10%</b>。');
    board(1);
  }
}
/* ---------- 藥罐子老師：32歲前生涯累計2次過勞/職業傷害大傷 ---------- */
export function bumpBigInjEarly(){
  S.healthyStreak=0;
  if(S.age<32){
    S.bigInjEarlyCount=(S.bigInjEarlyCount||0)+1;
    if(S.bigInjEarlyCount>=2&&!S.traits.glass){
      S.traits.glass=true;
      card('bad','隱藏特性解鎖：藥罐子老師','32 歲前生涯已經兩度因傷／過勞大傷倒下——從今以後每年請假機率下限鎖定在 <b class="hl">40%</b>。');
      board(1);
    }
  }
}
/* ---------- 上台恐懼症：正式教師以上 d≤−6 且被降調/超額 ---------- */
export function triggerStageFear(){
  if(S.traits.stageFear)return;
  S.traits.stageFear=true;
  card('bad','隱藏特性解鎖：上台恐懼症','這一年的表現重重跌了一跤，還被調離——系統評價因此永久 <b class="dn">−3</b>，直到再次升等才能洗刷。');
  board(0);
}
export function clearStageFearOnPromotion(){
  if(S.traits.stageFear){
    S.traits.stageFear=false;
    card('good','','系統評價已經回穩，「上台恐懼症」的陰影正式解除。');
    board(0);
  }
}
/* ---------- 躺平教師：拒絕介聘後隔年成績仍未打回應有水準 ---------- */
export function checkLayback(){
  if(S.refusedTransferPending){
    const {par}=S.refusedTransferPending; S.refusedTransferPending=null;
    if(ovr()<par&&!S.traits.layback){
      S.traits.layback=true;
      card('bad','隱藏特性解鎖：躺平教師','拒絕降調／介聘之後，隔年成績依然沒有打回應有水準——事件卡失敗率永久 +10%，退休時同事的評語，大概也不會太客氣。');
      board(0);
    }
  }
}
/* ---------- 工具人老師：單一維度gap≥22且該維度值≥58，動態觸發/解除 ---------- */
export function checkToolMan(){
  const a=S.ab;
  const dims=[['教學',Math.max(a.pow,a.con)],['臨場反應',a.spd],['行政支援',(a.rng+a.fld+a.arm+a.cat)/4]];
  dims.sort((x,y)=>y[1]-x[1]);
  const gap=dims[0][1]-dims[1][1];
  if(gap>=22&&dims[0][1]>=58){
    if(!S.traits.toolMan){
      S.traits.toolMan=true;
      card('bad','隱藏特性解鎖：工具人老師',`${dims[0][0]}能力遙遙領先其他面向——你被貼上單一功能支援的標籤，正式授課節數被大幅壓縮。`);
      board(0);
    }
  } else if(gap<18&&S.traits.toolMan){
    S.traits.toolMan=false;
    card('good','','補強了其他面向的能力，「工具人老師」標籤總算撕下來了。');
    board(0);
  }
}
/* ---------- 校魂／◯◯活字典：同校服務年資 ---------- */
export function schoolTenureCheck(){
  if(S.school===S.prevSchool)S.schoolYears=(S.schoolYears||0)+1; else S.schoolYears=1;
  S.prevSchool=S.school;
  S.schoolYearsMap=S.schoolYearsMap||{}; S.schoolYearsMap[S.school]=(S.schoolYearsMap[S.school]||0)+1;
  if(S.school==='群英國中'&&S.schoolYears>=10&&!S.traits.soul){
    S.traits.soul=true;
    card('gold','隱藏特性解鎖：校魂','在群英國中同校服務滿 10 年——「我愛群英，不離不棄」。');
    board(2);
  }
  const par=lvRow(S.job,S.region).par;
  if(S.schoolYears>=15&&ovr()-par>=0&&!S.traits.dict){
    S.traits.dict=true; S.dictNick=S.school.replace(/(國中|高中)$/,'');
    card('gold','隱藏特性解鎖：'+S.dictNick+'活字典',`在 ${S.school} 服務滿 15 年，考績穩定——同事都叫你「${S.dictNick}活字典」，什麼校園往事都得問你。`);
    board(2);
  }
  if(S.schoolYears>=10&&S.excellentSchools&&S.excellentSchools[S.school]&&!S.traits.treasure){
    S.traits.treasure=true; S.honorScore=(S.honorScore||0)+200;
    card('gold','隱藏特性解鎖：校寶',`在拿過教學卓越獎的 ${S.school} 服務滿 10 年不轉校——你就是這裡的活招牌。續聘／介聘薪資固定 <b class="hl">×1.2</b>，退休評價 <b class="hl">+200</b>。`);
    board(2);
  }
}
/* ---------- 退休時結算的特性（偏鄉之光／萬年代理魂／只想好好教書） ---------- */
export function checkRetireTraits(){
  if(S.firstRegion==='離島偏鄉'){
    const promoted=(S.phase==='正職')&&((S.region==='六都')||S.job==='校長');
    if(promoted&&!S.traits.ruralLight){
      S.traits.ruralLight=true;
      card('gold','隱藏特性解鎖：偏鄉之光','出身離島偏鄉，最終仍站上更大的舞台——「出身，從來不是天花板。」');
    }
  }
  if(S.phase==='代理'&&(S.subYearsTotal||0)>=20&&!S.traits.foreverSub){
    S.traits.foreverSub=true;
    card('gold','隱藏特性解鎖：萬年代理魂','退休時仍是代理教師身份，代理年資累計超過 20 年——「鐵打的代理，流水的正式教師，你就是那個永遠的伏筆。」');
  }
  if(!S.everAdmin&&(S.teachYears||0)>=25&&!S.traits.justTeach){
    S.traits.justTeach=true;
    card('gold','隱藏特性解鎖：只想好好教書','從未擔任組長以上職務，教學年資 25 年以上——「行政？謝謝再聯絡，我只想把書教好。」');
  }
  /* 杏壇傳奇／天道酬勤／校寶／打不倒的教育魂：另於 checkHallOfFame()／checkFighterSpirit()／schoolTenureCheck() 判定 */
}
export function traitsSummaryHtml(){
  const keys=Object.keys(S.traits||{}).filter(k=>S.traits[k]);
  if(!keys.length)return '';
  const names=keys.map(k=> k==='dict'&&S.dictNick ? S.dictNick+'活字典' : (TRAIT_NAMES[k]||k));
  return `<div class="statline">解鎖特性：${names.join('、')}</div>`;
}
/* ---------- 打不倒的教育魂：已擁有藥罐子老師後，仍拿下師鐸獎等級大獎 ---------- */
export function checkFighterSpirit(){
  if(S.traits.glass&&!S.traits.fighter){
    S.traits.glass=false; S.traits.fighter=true;
    for(let i=0;i<8;i++)addAb(pick(AB_KEYS),1);
    card('gold','隱藏特性解鎖：打不倒的教育魂','曾經被傷病與過勞逼到藥罐子的地步，如今卻在正式教師任內拿下重量級大獎——「藥罐子老師」標籤正式覆蓋刪除，請假機率恢復正常，額外獲得 8 點能力成長。');
    board(2);
  }
}
/* ---------- 年度獎項判定：每個正職學年最多一項，由高至低嘗試 ---------- */
export function rollAward(){
  const popularBoost=(S.school==='群英國中'||S.school==='雲海高中')?1.3:1;
  const univBoost=(S.region==='六都'&&(S.univTier==='top'||S.univTier==='edu'))?1.2:1; /* 頂大／師培大學出身於六都任教，獨立疊加，不取代指標校加成 */
  for(const a of AWARDS){
    if(a.newOnly&&(S.svc||0)>2)continue;
    if(ovr()<a.min)continue;
    const p=a.prob*(a.popular?popularBoost*univBoost:1);
    if(chance(p)){
      const name=a.subj?`指導學生獲全國賽（${SUBJ_CONTEST[S.subject]}）`:a.n;
      const pts=Array.isArray(a.pts)?ri(a.pts[0],a.pts[1]):a.pts;
      S.honorScore=(S.honorScore||0)+pts; S.awardCount=(S.awardCount||0)+1;
      S.awardsWon=S.awardsWon||{}; S.awardsWon[a.key]=(S.awardsWon[a.key]||0)+1;
      if(a.school){ S.excellentSchools=S.excellentSchools||{}; S.excellentSchools[S.school]=true; }
      card('gold','年度獎項',`榮獲 <b class="hl">${name}</b>！（生涯評價分 +${pts}）`);
      board(2);
      if(['devotion','shiduo','countyExcellent'].includes(a.key))checkFighterSpirit();
      return;
    }
  }
}
/* ---------- 典範教育家評選／天道酬勤（對應 WIKI 十一） ---------- */
export function checkHallOfFame(){
  const score=totalCareerScore(), tier=finalTier();
  let hofText='';
  if(tier==='典範教育家'){
    if(score>=8000*1.12&&!S.traits.legend){
      S.traits.legend=true;
      hofText='退休 5 年後開放候選，評選委員會一致通過，第一年就當選「典範教育家」——解鎖隱藏特性「杏壇傳奇」。';
    } else {
      hofText='退休 5 年後開放候選，歷經幾年等待，最終仍以「典範教育家」的身份被追認。';
    }
  }
  if((S.potSum0||0)<=469&&(tier==='典範教育家'||S.job==='校長')&&!S.traits.diligence){
    S.traits.diligence=true;
    card('gold','隱藏特性解鎖：天道酬勤','起始潛力並不出色，卻靠汗水堆出頂級成就——「你不是天選之人，你是把汗水熬成天賦的那種人。」');
  }
  return hofText;
}
