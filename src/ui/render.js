import { S } from '../engine/state.js';
import { ovr, jobTitle, owCap, owStatusLabel } from '../engine/scoring.js';
import { abCost, trainAb } from '../engine/growth.js';
import { ABL, AB_KEYS } from '../data/tables.js';

/* ================= UI 基礎（沿用自 YaKyoLife，機制不變） ================= */
export const $=id=>document.getElementById(id);
export function scrollBottom(){ /* iOS Safari 於 iframe 內平滑滾動易觸發白畫面,改用同步滾動+rAF */
  try{ requestAnimationFrame(function(){ window.scrollTo(0, document.body.scrollHeight); }); }
  catch(e){ try{ window.scrollTo(0, document.body.scrollHeight); }catch(_){} }
}
var _curYearBody=null;
var MAX_YEARS=8;
export function logTarget(){ return _curYearBody || $('log'); }
export function card(cls,title,html){ const d=document.createElement('div'); d.className='card '+cls;
  d.innerHTML=(title?`<h4>${title}</h4>`:'')+html; logTarget().appendChild(d);
  scrollBottom(); }
export function divider(t){
  const log=$('log'); const blocks=log.querySelectorAll('.yr-block');
  const prev=blocks[blocks.length-1];
  if(prev){ const h=prev.querySelector('.yr-head'); if(h&&prev.querySelector('.yr-body').children.length) h.classList.add('has-body'); }
  const prevPrev=blocks[blocks.length-2];
  if(prevPrev){ prevPrev.classList.add('collapsed'); }
  const block=document.createElement('div'); block.className='yr-block';
  const head=document.createElement('div'); head.className='yr-head'; head.textContent=t;
  const body=document.createElement('div'); body.className='yr-body';
  head.onclick=()=>block.classList.toggle('collapsed');
  block.appendChild(head); block.appendChild(body); log.appendChild(block); _curYearBody=body;
  const newBlocks=log.querySelectorAll('.yr-block');
  if(newBlocks.length>MAX_YEARS){ for(let i=0;i<newBlocks.length-MAX_YEARS;i++)newBlocks[i].remove(); }
}
export function jobLabel(){
  if(S.phase==='實習')return '實習教師';
  if(S.phase==='代理')return '代理教師';
  if(S.phase==='正職')return jobTitle()||'教師';
  return '';
}
export function locLabel(){
  if(S.phase==='實習')return '教育實習';
  if(S.phase==='正職'||S.phase==='代理')return S.school?`${S.region}・${S.school}`:'尋找職缺中';
  return '';
}
export function owStatusClass(){
  const r=(S.ow||0)/owCap();
  return r>=0.85?'ow-bad':r>=0.6?'ow-warn':'ow-ok';
}
export function board(phase){
  $('bd-name').innerHTML=`${S.name}<small>${S.subject}科・${S.teachStage}・${jobLabel()}</small>`;
  $('bd-team').innerHTML=`<span style="color:var(--amber)">${locLabel()}</span>`;
  $('bd-age').textContent=S.age; $('bd-year').textContent=S.year;
  $('bd-ovr').textContent=ovr(); $('bd-sal').textContent=Math.round(S.careerScore||0).toLocaleString();
  const owEl=$('bd-ow');
  if(owEl){ owEl.textContent=owStatusLabel(); owEl.className='ow-badge '+owStatusClass(); }
  [0,1,2].forEach(i=>$('lp'+i).classList.toggle('on',i===phase));
}
export function actClear(){ const a=$('act'); a.innerHTML=''; a.classList.remove('collapsed');
  const t=$('act-toggle'); if(t)t.style.display='none'; }
export function actToggleSync(){
  const a=$('act'), t=$('act-toggle'); if(!t)return;
  const has=a.innerHTML.trim()!=='' && a.style.display!=='none';
  t.style.display=has?'block':'none';
  t.textContent=a.classList.contains('collapsed')?'⌃ 展開選項':'⌄ 收合選項';
}
export function choose(title,opts){
  actClear(); const a=$('act');
  a.classList.remove('collapsed');
  if(title)a.innerHTML=`<div class="title">${title}</div>`;
  opts.forEach(o=>{ const b=document.createElement('button');
    b.className='btn'+(o.main?' main':'')+(o.warn?' warn':'');
    b.innerHTML=o.t+(o.s?`<small>${o.s}</small>`:'');
    b.onclick=()=>{ actClear(); o.f(); }; a.appendChild(b); });
  actToggleSync(); scrollBottom();
}
/* 六維能力用途說明（對照 scoring.js/ow.js 實際計算式，供分配面板 info 彈窗使用） */
const AB_DESC={
  hp:'體力撐不撐得住。過低會拉高過勞量表上限風險與請假、大病機率。',
  pas:'小幅影響教學評價，也是許多事件卡「必然代價」優先扣點的項目。',
  pro:'科任／代理身份的教學評價主力，也是教甄評分的關鍵。',
  mgt:'導師身份教學評價的主力，也計入組長／主任／校長的管理評價。',
  com:'計入導師以上各職務的管理評價，也影響組長邀約、糾紛協調等事件成敗。',
  adm:'組長／主任／校長管理評價的主力，行政職續任門檻主要看這項。',
};
/* 能力值說明彈窗（沿用 confirmModal 的 modal-mask 樣式） */
export function abilityInfoModal(){
  const mask=document.createElement('div'); mask.className='modal-mask';
  mask.innerHTML=`<div class="modal-box">
    <p style="margin-bottom:10px;font-weight:700">六維能力的用途</p>
    ${AB_KEYS.map(k=>`<p style="margin-bottom:8px"><b class="hl">${ABL[k]}</b>：${AB_DESC[k]}</p>`).join('')}
    <button class="btn" id="ai-close">關閉</button></div>`;
  document.body.appendChild(mask);
  const close=()=>mask.remove();
  mask.addEventListener('click',e=>{ if(e.target===mask)close(); });
  mask.querySelector('#ai-close').onclick=close;
}
/* 加點介面：mode {dice:[..]} 或 {pool:n}（沿用自 YaKyoLife，機制不變） */
export function allocUI(mode,label,done){
  actClear(); const a=$('act'); const keys=AB_KEYS;
  let dice=mode.dice?mode.dice.slice():null, pool=mode.pool||0, idx=0, hist=[], totalGot=0;
  a.innerHTML=`<div class="title">${label} <button type="button" id="al-info" aria-label="能力值說明" title="能力值說明">ⓘ</button></div><div id="al-top"></div><div id="al-rows"></div><div class="row2" id="al-btm"></div>`;
  $('al-info').onclick=abilityInfoModal;
  const top=$('al-top'),rows=$('al-rows'),btm=$('al-btm');
  function remaining(){ return dice?dice.length-idx:pool; }
  function render(){
    if(dice){ top.innerHTML='<div id="dice">'+dice.map((v,i)=>`<div class="die ${i<idx?'used':''} ${i===idx?'active':''} ${v===6?'six':''}">${v}</div>`).join('')+'</div>'; }
    else top.innerHTML=`<div class="pool">剩餘可分配點數：${pool} 點（點一下能力 +1）</div>`;
    rows.innerHTML='';
    keys.forEach(k=>{ const v=S.ab[k],cap=v>=80;
      const r=document.createElement('div'); r.className='abrow'+(cap?' capped':'');
      const pk=(S.pot&&S.pot[k])||62, cst=abCost(k), cr=(S.carry&&S.carry[k])||0;
      r.innerHTML=`<span class="nm">${ABL[k]}</span><span class="bar"><i style="width:${v/80*100}%"></i><em style="left:${pk/80*100}%"></em></span><span class="val" style="line-height:1.1">${v}<small style="opacity:.5">/${pk}</small>${cst>1?`<span style="display:block;opacity:.5;font-size:10.5px;letter-spacing:1px;margin-top:-2px">${cr}/${cst}</span>`:''}</span>`;
      if(!cap&&remaining()>0)r.onclick=()=>{ const amt=dice?dice[idx]:1;
        const pc=(S.carry&&S.carry[k])||0;
        const got=trainAb(k,amt); hist.push([k,got,pc,amt]); totalGot+=got; if(dice)idx++; else pool--;
        r.querySelector('.val').innerHTML=`${S.ab[k]} <b style="display:block;font-size:10.5px">${got>0?'+'+got:'蓄力中'}</b>`; render(); board(0); };
      rows.appendChild(r); });
    btm.innerHTML='';
    const u=document.createElement('button'); u.className='btn'; u.style.textAlign='center';
    u.textContent='↩ 復原'; u.disabled=!hist.length;
    u.style.opacity=hist.length?'1':'0.35'; u.style.cursor=hist.length?'pointer':'default';
    if(hist.length)u.onclick=()=>{ const [k,got,pc,amt]=hist.pop(); totalGot-=got; S.ab[k]-=got; if(S.carry)S.carry[k]=pc;
      if(S.investedPoints)S.investedPoints[k]=(S.investedPoints[k]||0)-amt;
      if(dice)idx--; else pool++; render(); board(0); };
    btm.appendChild(u);
    const allCap=keys.every(k=>S.ab[k]>=80);
    if(remaining()===0||allCap){ const c=document.createElement('button'); c.className='btn main';
      c.textContent=(remaining()>0&&allCap)?'能力已達上限，捨棄剩餘骰子 ▸':'確認 ▸';
      c.onclick=()=>{ actClear(); done(totalGot,hist); }; btm.appendChild(c); }
    actToggleSync();
  }
  render();
}
/* 站內確認彈窗（不依賴瀏覽器原生 confirm，避免在部分 WebView/內嵌瀏覽器被封鎖而完全無反應） */
export function confirmModal(msg,onConfirm){
  const mask=document.createElement('div'); mask.className='modal-mask';
  mask.innerHTML=`<div class="modal-box"><p>${msg}</p>
    <button class="btn warn" id="cm-yes">確定重新開始</button>
    <button class="btn" id="cm-no">取消</button></div>`;
  document.body.appendChild(mask);
  const close=()=>mask.remove();
  mask.addEventListener('click',e=>{ if(e.target===mask)close(); });
  mask.querySelector('#cm-no').onclick=close;
  mask.querySelector('#cm-yes').onclick=()=>{ close(); onConfirm(); };
}
