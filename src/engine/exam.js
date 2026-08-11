import { S } from './state.js';
import { chance, pick, ri, clamp } from './rng.js';
import { ovr } from './scoring.js';
import { card, board, choose } from '../ui/render.js';
import { secondLifeEnding } from '../ui/share.js';
import { EXAM_TH, SCHOOLS } from '../data/tables.js';

/* ---------- 教師甄試門檻與上榜機率公式 ---------- */
export function examProb(tier,score){ const t=EXAM_TH[tier]; return clamp((score-t.th)*3+t.base,t.lo,t.hi); }

/* ================= 教師甄試（每年可選擇投考或維持現狀） ================= */
export function examChoice(cb){
  const o=ovr();
  const opts=[
    {t:'投考 六都',s:`門檻${EXAM_TH.六都.th}`,f:()=>attemptExam('六都',cb)},
    {t:'投考 非六都',s:`門檻${EXAM_TH.非六都.th}`,f:()=>attemptExam('非六都',cb)},
    {t:'投考 離島偏鄉',s:`門檻${EXAM_TH.離島偏鄉.th}`,f:()=>attemptExam('離島偏鄉',cb)},
    {t:'不投考，維持現狀',main:true,f:()=>cb()},
  ];
  if(S.age<35&&!S.everFormal){
    opts.push({t:'放棄教職，展開第二人生',warn:true,f:()=>secondLifeEnding('決定放棄教職，走一條不一樣的路。')});
  }
  choose(`是否投考本年度教師甄試？（教學評價 ${o}）`,opts);
}
export function attemptExam(tier,cb){
  const o=ovr();
  const score=o+Math.min(S.teachYears||0,5)*2+ri(-4,4);
  const th=EXAM_TH[tier].th, prob=examProb(tier,score);
  let ok=chance(prob), waitlisted=false;
  if(!ok&&tier==='離島偏鄉'&&score<th&&chance(10)){ ok=true; waitlisted=true; }
  if(ok){
    S.phase='正職'; S.region=tier; S.school=pick(SCHOOLS[S.teachStage][tier]); S.job='科任'; S.svc=0;
    if(!S.firstRegion)S.firstRegion=tier;
    S.everFormal=true;
    card('gold','教師甄試放榜',`${tier}志願評分 <b class="hl">${score}</b>（門檻${th}｜上榜機率${prob}%）——上榜了！${waitlisted?'以候用教師候補資格遞補，':''}正式成為 <b class="hl">${S.school}</b> 專任教師。`);
  } else {
    card('bad','教師甄試落榜',`${tier}志願評分 <b class="hl">${score}</b>（門檻${th}｜上榜機率${prob}%），這次沒有輪到你，繼續代理。`);
  }
  board(2); cb();
}
