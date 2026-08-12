import { S } from './state.js';
import { chance, pick, ri, clamp } from './rng.js';
import { ovr } from './scoring.js';
import { card, board, choose } from '../ui/render.js';
import { secondLifeEnding } from '../ui/share.js';
import { EXAM_TH, SCHOOLS } from '../data/tables.js';

/* ---------- 教師甄試門檻與上榜機率公式（對應 WIKI 二，數字沿用） ---------- */
export function examProb(tier,score){ const t=EXAM_TH[tier]; return clamp((score-t.th)*3+t.base,t.lo,t.hi); }
export function examScoreRoll(){ return ovr()+Math.min(S.teachYears||0,5)*2+ri(-4,4); }

/* ================= 教師甄試（每年可選擇投考或維持現狀，可同年度投考多志願，對應 WIKI 二） ================= */
export function examChoice(cb){
  const o=ovr();
  const opts=[
    {t:'投考 六都',s:`門檻${EXAM_TH.六都.th}`,f:()=>attemptExamMulti(['六都'],cb)},
    {t:'投考 非六都',s:`門檻${EXAM_TH.非六都.th}`,f:()=>attemptExamMulti(['非六都'],cb)},
    {t:'投考 離島偏鄉',s:`門檻${EXAM_TH.離島偏鄉.th}`,f:()=>attemptExamMulti(['離島偏鄉'],cb)},
    {t:'同時投考 六都＋非六都',f:()=>attemptExamMulti(['六都','非六都'],cb)},
    {t:'同時投考 非六都＋離島偏鄉',f:()=>attemptExamMulti(['非六都','離島偏鄉'],cb)},
    {t:'同時投考 三個志願',f:()=>attemptExamMulti(['六都','非六都','離島偏鄉'],cb)},
    {t:'不投考，維持現狀',main:true,f:()=>cb()},
  ];
  if(S.age<35&&!S.everFormal){
    opts.push({t:'放棄教職，展開第二人生',warn:true,f:()=>secondLifeEnding('教到這裡，決定放棄教職，走一條不一樣的路。')});
  }
  choose(`是否投考本年度教師甄試？（教學評價 ${o}）`,opts);
}
/* 同年度可投考多志願；若多個志願同時上榜，列出候選學校供玩家選擇其中一所（對應 WIKI 二） */
function attemptExamMulti(tiers,cb){
  const passed=[];
  const lines=[];
  tiers.forEach(tier=>{
    const score=examScoreRoll();
    const th=EXAM_TH[tier].th, prob=examProb(tier,score);
    let ok=chance(prob), waitlisted=false;
    if(!ok&&tier==='離島偏鄉'&&score<th&&chance(10)){ ok=true; waitlisted=true; }
    lines.push(`${tier}志願評分 <b class="hl">${score}</b>（門檻${th}｜上榜機率${prob}%）${ok?(waitlisted?'——候用遞補上榜！':'——上榜了！'):'——這次沒有輪到你'}`);
    if(ok)passed.push(tier);
  });
  card(passed.length?'gold':'bad','教師甄試放榜',lines.join('<br>'));
  board(2);
  if(!passed.length){ cb(); return; }
  if(passed.length===1){ acceptOffer(passed[0],cb); return; }
  choose('多個志願同時上榜，選擇要赴任的學校',
    passed.map(tier=>({t:`赴任 ${tier}`,f:()=>acceptOffer(tier,cb)})));
}
function acceptOffer(tier,cb){
  S.phase='正職'; S.region=tier; S.school=pick(SCHOOLS[tier]); S.job='科任'; S.svc=0;
  if(!S.firstRegion)S.firstRegion=tier;
  S.everFormal=true;
  card('gold','正式報到',`正式成為 <b class="hl">${S.school}</b> 專任教師。`);
  board(2); cb();
}
