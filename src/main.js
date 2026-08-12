import { SEED, setSeed, seedInit } from './engine/rng.js';
import { APP_VER, newState, setState } from './engine/state.js';
import { internFlow, yearHeader } from './engine/career-flow.js';
import { $, card, board, divider, confirmModal } from './ui/render.js';

/* ================= 開場設定 ================= */
(function(){ const t=document.getElementById('act-toggle');
  if(t)t.onclick=()=>{ document.getElementById('act').classList.toggle('collapsed');
    t.textContent=document.getElementById('act').classList.contains('collapsed')?'⌃ 展開選項':'⌄ 收合選項'; };
})();
let selSubj='國文';
$('seed-show').value=SEED;
$('seed-re').onclick=e=>{e.preventDefault();setSeed(Math.random().toString(36).slice(2,10));$('seed-show').value=SEED;};
document.querySelectorAll('#seg-subj button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#seg-subj button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on'); selSubj=b.dataset.v;
});
$('btn-start').onclick=()=>{
  const nm=$('in-name').value.trim()||'陳靖雯';
  const sv=$('seed-show').value.trim(); if(sv)setSeed(sv);
  history.replaceState(null,'','?seed='+encodeURIComponent(SEED));
  seedInit(SEED);
  const S=newState(nm,selSubj);
  setState(S);
  $('start').style.display='none';
  $('board').style.display=''; $('act').style.display='';
  board(0);
  card('info','教師誕生',`立志成為 <b class="hl">${S.subject}科</b>國中老師的 <b class="hl">${S.name}</b>，${S.year} 年展開為期半年的教育實習。往後的路，要自己選。`);
  divider(yearHeader()); board(0);
  internFlow();
};
if(typeof document!=='undefined'&&document.getElementById('btn-restart')){
  document.getElementById('btn-restart').onclick=function(){
    confirmModal('確定要放棄這段人生，從頭開始嗎？',()=>{ location.href=location.pathname; });
  };
}
(function(){ const vb=document.getElementById('ver-badge'); if(vb)vb.textContent=APP_VER; })();
