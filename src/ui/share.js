import { S, APP_VER } from '../engine/state.js';
import { SEED, pick, clamp } from '../engine/rng.js';
import { careerScoreCalc, honorScoreCalc, finalTier } from '../engine/scoring.js';
import { finalJobLabel, honorsList } from '../engine/summary.js';
import { card, board, divider, choose, scrollBottom, logTarget } from './render.js';
import { ABL, AB_KEYS } from '../data/tables.js';
import { TRAIT_NAMES } from '../data/traits.js';
import { SECOND_LIFE } from '../data/second-life.js';

/* ---------- 結算圖（Canvas 產生 PNG，對應 WIKI 十二／原作 shareImage） ---------- */
export function shareImage(out){
  const tier=finalTier();
  const cs=careerScoreCalc(), hs=honorScoreCalc(), total=cs+hs;
  const negK=['glass','toolMan','stageFear','distract','windvane','gossip','layback'];
  const traitKeys=Object.keys(S.traits||{}).filter(k=>S.traits[k]);
  const traits=traitKeys.map(k=>({label:k==='dict'&&S.dictNick?S.dictNick+'活字典':(TRAIT_NAMES[k]||k),key:k,neg:negK.includes(k)}));
  const honors=honorsList();
  const abList=AB_KEYS.map(k=>({k,label:ABL[k],v:S.ab[k],pot:(S.pot&&S.pot[k])||62}));

  const W=760, PAD=32, scale=2;
  const cv=document.createElement('canvas');
  const c=cv.getContext('2d');
  c.font='13px sans-serif';

  /* 榮譽雙欄換行 */
  const colW=(W-PAD*2)/2, maxTextW=colW-20;
  const honorBlocks=honors.map(h=>{
    let text='· '+h, lines=[], curr='';
    for(let i=0;i<text.length;i++){ const test=curr+text[i];
      if(c.measureText(test).width>maxTextW&&curr.length>0){ lines.push(curr); curr='  '+text[i]; } else curr=test; }
    if(curr)lines.push(curr);
    return lines;
  });
  const rows2=Math.ceil(honorBlocks.length/2);
  let leftH=0,rightH=0;
  honorBlocks.slice(0,rows2).forEach(b=>leftH+=b.length*22);
  honorBlocks.slice(rows2).forEach(b=>rightH+=b.length*22);
  const honorsH=honors.length?Math.max(leftH,rightH):22;

  let H=150;
  H+=traits.length?34:0;
  H+=30+3*24+14; /* 生涯評價 */
  H+=30+abList.length*24+14; /* 能力值 */
  H+=30+honorsH+16; /* 榮譽 */
  H+=60;

  cv.width=W*scale; cv.height=H*scale;
  c.scale(scale,scale);
  c.fillStyle='#0d1b2a'; c.fillRect(0,0,W,H);
  c.strokeStyle='#2c4f6b'; c.lineWidth=3; c.strokeRect(10,10,W-20,H-20);
  c.textBaseline='top';

  c.fillStyle='#8ea3ae'; c.font='13px sans-serif'; c.fillText('T e a c h e r L i f e ・ 退 休 紀 念',PAD,30);
  c.fillStyle='#ffc95c'; c.font='bold 34px sans-serif'; c.fillText(S.name,PAD,52);
  c.fillStyle='#eef1ea'; c.font='14px sans-serif';
  c.fillText(`${S.subject}科・${S.teachStage}｜${finalJobLabel()}｜${S.startYear||2026}–${S.year}｜退休時 ${S.age} 歲`,PAD,96);

  let y=126, tagx=PAD;
  function tagColor(o){
    if(o.key==='legend')return {bg:'#3a2c05',bd:'#ffc95c',fg:'#ffe08a'};
    if(o.key==='liver')return {bg:'#232733',bd:'#c8d0e0',fg:'#e8eef7'};
    if(o.neg)return {bg:'#2a0f0f',bd:'#c0392b',fg:'#ff8b7a'};
    return {bg:'#173524',bd:'#2c4f6b',fg:'#9fd8a8'};
  }
  if(traits.length){
    traits.forEach(o=>{ const t=o.label, col=tagColor(o);
      c.font='12px sans-serif'; const w=c.measureText(t).width+16;
      c.fillStyle=col.bg; c.strokeStyle=col.bd; c.lineWidth=1;
      c.fillRect(tagx,y,w,20); c.strokeRect(tagx,y,w,20);
      c.fillStyle=col.fg; c.fillText(t,tagx+8,y+3);
      tagx+=w+8; if(tagx>W-140){tagx=PAD;y+=26;}
    });
    y+=30;
  }
  function hr(){ c.strokeStyle='#2c4f6b'; c.lineWidth=1; c.beginPath(); c.moveTo(PAD,y); c.lineTo(W-PAD,y); c.stroke(); y+=12; }
  function sectionTitle(t){ c.fillStyle='#8ea3ae'; c.font='bold 13px sans-serif'; c.fillText(t,PAD,y); y+=22; }

  hr(); sectionTitle('生涯評價');
  c.font='bold 16px sans-serif'; c.fillStyle='#ffc95c'; c.fillText('★ '+tier,PAD,y); y+=24;
  c.font='13px monospace'; c.fillStyle='#eef1ea';
  c.fillText(`CareerScore ${Math.round(cs)}　HonorScore ${hs}`,PAD,y); y+=24;
  c.fillText(`生涯評價分 ${Math.round(total)}`,PAD,y); y+=30;

  hr(); sectionTitle('生涯能力值');
  const barX=PAD+64, barW=W-PAD*2-64-46;
  abList.forEach(o=>{
    c.font='13px sans-serif'; c.fillStyle='#eef1ea'; c.fillText(o.label,PAD,y+4);
    c.fillStyle='#0d1f30'; c.fillRect(barX,y+3,barW,10);
    c.fillStyle='#ffc95c'; c.fillRect(barX,y+3,barW*clamp(o.v/80,0,1),10);
    c.font='12px monospace'; c.fillStyle='#8ea3ae'; c.fillText(String(o.v),barX+barW+8,y+3);
    y+=24;
  });
  y+=6;

  hr(); sectionTitle('生涯榮譽（'+honors.length+' 項）');
  c.font='13px sans-serif'; c.fillStyle='#9fd8a8';
  if(!honors.length){ c.fillText('· 無正式榮譽紀錄，但每一年都有教到的學生',PAD,y); y+=honorsH; }
  else{
    const startY=y; let currY=startY;
    honorBlocks.forEach((b,i)=>{
      const isRight=i>=rows2;
      if(i===rows2)currY=startY;
      const hx=PAD+(isRight?colW:0);
      b.forEach(line=>{ c.fillText(line,hx,currY); currY+=22; });
    });
    y+=honorsH;
  }
  y+=8;

  c.fillStyle='#ffc95c'; c.font='bold 15px sans-serif';
  c.fillText('生涯累計薪資 '+Math.round(S.salary).toLocaleString()+' 萬元',PAD,y); y+=26;
  c.fillStyle='#8ea3ae'; c.font='11px monospace'; c.fillText('seed: '+SEED,PAD,H-40);
  c.textAlign='right'; c.fillText(APP_VER,W-PAD,H-40); c.textAlign='left';

  const url=cv.toDataURL('image/png');
  const fileName='教職生涯結算_'+S.name+'.png';
  out.innerHTML=`<img src="${url}" style="width:100%;border-radius:8px" alt="結算圖">
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn main" id="sh-save" style="flex:1;margin-top:0">💾 儲存／分享圖片</button>
      <button class="btn" id="sh-dl" style="flex:1;margin-top:0">下載到裝置</button>
    </div>
    <div class="statline" style="margin-top:6px">若按鈕無效，長按上方圖片也可儲存</div>`;
  out.querySelector('#sh-dl').onclick=()=>{ const a=document.createElement('a'); a.href=url; a.download=fileName;
    document.body.appendChild(a); a.click(); a.remove(); };
  out.querySelector('#sh-save').onclick=async()=>{
    try{
      const blob=await (await fetch(url)).blob();
      const file=new File([blob],fileName,{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:'TeacherLife 教職生涯結算',text:S.name+' 的教職人生'});
        return;
      }
    }catch(e){ if(e&&e.name==='AbortError')return; }
    const a=document.createElement('a'); a.href=url; a.download=fileName;
    document.body.appendChild(a); a.click(); a.remove();
  };
}
/* ---------- 結算畫面共用收尾：分享圖／複製重播連結／開啟新人生 ---------- */
export function endingActions(){
  const sh=document.createElement('div'); sh.className='card';
  sh.innerHTML=`<h4>分享這段生涯</h4>
    <div style="display:flex;gap:8px">
      <button class="btn main" id="sh-img" style="flex:1">📸 產生結算圖</button>
      <button class="btn" id="sh-url" style="flex:1">🔗 複製重播連結</button>
    </div><div id="sh-out" style="margin-top:8px"></div>`;
  logTarget().appendChild(sh); scrollBottom();
  sh.querySelector('#sh-img').onclick=()=>shareImage(sh.querySelector('#sh-out'));
  sh.querySelector('#sh-url').onclick=e=>{
    const url=location.origin.startsWith('http')?location.origin+location.pathname+'?seed='+SEED:location.href.split('?')[0]+'?seed='+SEED;
    const okmsg=()=>{e.target.textContent='✅ 已複製';setTimeout(()=>e.target.textContent='🔗 複製重播連結',1600);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(okmsg,()=>prompt('手動複製連結：',url));
    else prompt('手動複製連結：',url);
  };
  choose('',[
    {t:'🌱 開啟新的人生（新種子）',main:true,f:()=>{location.href=location.pathname;}},
    {t:'用同一個種子重來',s:'seed: '+SEED,f:()=>{location.href=location.pathname+'?seed='+SEED;}}]);
  S.done=true;
}
export function secondLifeEnding(reason){
  board(2);
  divider(`${S.year} 年 · ${S.age} 歲 · 離開教職`);
  const script=pick(SECOND_LIFE);
  card('gold','第二人生',`${reason}<br>${script}<br><br>離開教職的人生，也是人生。<b class="hl">${S.name}</b>，辛苦了。`);
  endingActions();
}
