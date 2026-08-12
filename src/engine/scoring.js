import { S } from './state.js';
import { clamp, chance, ri } from './rng.js';
import { AWARDS, POPULAR_SCHOOL } from '../data/tables.js';

/* ================= 過勞量表上限／狀態標籤（對應 WIKI 七，放這裡而非 ow.js 是為了讓 ui/render.js 能顯示而不造成循環引用） ================= */
export function owCap(){
  let cap=(S.traits&&S.traits.owBeast)?100:50;
  const hp=S.ab.hp; cap+=hp>=70?10:hp>=65?5:0;
  return cap;
}
export function owStatusLabel(){
  const r=(S.ow||0)/owCap();
  return r>=0.85?'心力交瘁':r>=0.6?'略顯疲態':r>=0.35?'狀況尚可':'神清氣爽';
}

/* ================= OVR：考試與甄選共用的核心分數（對應 WIKI 二） =================
   OVR = 教學能力*(1-mw) + mgmtV(職務)*mw + 教學熱忱*0.05
   mw（職能權重）依職務遞增：科任最低、校長最高。 */
export const MW={科任:0.05,導師:0.20,組長:0.32,主任:0.45,校長:0.55};

/* mgmtV(職務)：WIKI 未給精確公式，此為起始數值權重組合，待試玩校準（見規劃「待決策」1）。
   導師偏班級經營／溝通；組長偏溝通／班級經營／行政；主任偏行政／溝通；校長偏行政／溝通／班級經營。 */
export function mgmtVFor(job){
  const a=S.ab;
  switch(job){
    case '導師': return a.mgt*0.6+a.com*0.4;
    case '組長': return a.com*0.4+a.mgt*0.3+a.adm*0.3;
    case '主任': return a.adm*0.5+a.com*0.35+a.mgt*0.15;
    case '校長': return a.adm*0.45+a.com*0.35+a.mgt*0.20;
    default: return 0;
  }
}
export function mgmtV(){ return mgmtVFor(S.job); }
export function ovr(){
  const mw=MW[S.job||'科任'];
  return Math.round(S.ab.pro*(1-mw)+mgmtV()*mw+S.ab.pas*0.05);
}
export function jobTitle(){ return (S.job==='主任'&&S.deptOffice) ? S.deptOffice+'主任' : (S.job||''); }

/* ================= CareerScore：依當年度實際職務分軌計分（對應 WIKI 六） =================
   換職務不清零，只是往後年份改用新職務公式累加。事件卡的即時計分見 engine/events.js
   （一般卡直接計入 S.careerScore；職務限定卡先累進 S.yearRoleScore，年末在此結算）。 */
export function accrueCareerScoreForYear(opts={}){
  const job=S.phase==='代理'?'代理':(S.job||'科任');
  const roleEv=S.yearRoleScore||0;
  let add=0;
  switch(job){
    case '代理': add=2; break;
    case '科任': add=S.ab.pro*0.4+roleEv+(opts.nationalContest?30:0); break;
    case '導師': add=S.ab.mgt*0.4+roleEv+(opts.completedHrTerm?40:0); break;
    case '組長': add=roleEv+S.ab.adm*0.2; break;
    case '主任': add=S.ab.adm*0.3+S.ab.com*0.2+roleEv; break;
    case '校長': add=S.ab.adm*0.3+S.ab.com*0.25+roleEv; break;
    default: add=0;
  }
  S.careerScore=(S.careerScore||0)+add;
  S.yearRoleScore=0;
  return add;
}
/* 到任年齡加成：到任當年一次性（對應 WIKI 六） */
export function deptAppointBonus(age){ return clamp(Math.round((50-age)*8),0,160); }
export function principalAppointBonus(age){ return clamp(Math.round((55-age)*12),0,280); }
/* 卸任/退休結算：整段任期零失敗才有的一次性加分（對應 WIKI 六）。呼叫時機：離開該職務（降調／晉升／退休）前。 */
export function settleDirTenure(){
  if(S.dirCleanTenure)S.careerScore=(S.careerScore||0)+100;
  S.dirCleanTenure=true;
}
export function settlePrinTenure(){
  if(S.prinCleanTenure)S.careerScore=(S.careerScore||0)+200;
  S.prinCleanTenure=true;
}

/* ================= HonorScore：年度大獎（對應 WIKI 六） =================
   觸發條件 WIKI 未給精確數字，以下為起始數值待試玩校準。校內特殊表現嘉獎可重複獲得，其餘皆為一次性。 */
export function rollAward(){
  const svc=S.svcTotal||0, o=ovr();
  const granted=[];
  S.awardsWon=S.awardsWon||{};
  let meritP=8; if(S.school===POPULAR_SCHOOL)meritP+=6;
  if(chance(meritP)){
    const v=ri(40,70);
    S.honorScore=(S.honorScore||0)+v; S.awardCount=(S.awardCount||0)+1;
    S.awardsWon.schoolMerit=(S.awardsWon.schoolMerit||0)+1;
    granted.push({name:AWARDS.schoolMerit.name,score:v});
  }
  const tryOnce=(key,cond,prob)=>{
    if(!S.awardsWon[key]&&cond&&chance(prob)){
      const a=AWARDS[key];
      S.honorScore=(S.honorScore||0)+a.score; S.awardCount=(S.awardCount||0)+1; S.awardsWon[key]=true;
      granted.push({name:a.name,score:a.score});
    }
  };
  tryOnce('newTeacher',svc>=1&&svc<=3,10);
  tryOnce('countyGood',o>=52,4);
  tryOnce('teachExcellence',(S.job==='組長'||S.job==='主任')&&S.ab.adm>=55,3);
  tryOnce('countyExcellent',o>=60&&svc>=8,2);
  tryOnce('shiduo',S.age>=48&&svc>=20,1);
  tryOnce('devotion',S.age>=52&&svc>=25,0.6);
  return granted;
}
