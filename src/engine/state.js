import { R, ri, pick, chance } from './rng.js';
import { AB_KEYS, SUBJ_POOL, UNIV_TIERS } from '../data/tables.js';

export const APP_VER='v0.8.0';

/* ---------- 大學背景（開局隨機配發，對應 WIKI 四、大學背景） ---------- */
export function pickUnivTier(){
  const r=R()*100; let acc=0;
  for(const t of UNIV_TIERS){ acc+=t.p; if(r<acc)return t; }
  return UNIV_TIERS[UNIV_TIERS.length-1];
}

/* ================= 遊戲狀態 ================= */
export let S=null;
export function setState(newS){ S=newS; }
export function newState(name,subject,teachStage){
  const ab={}; AB_KEYS.forEach(k=>ab[k]=ri(20,32));
  const pool=SUBJ_POOL[subject];
  ab[pool[0]]+=ri(0,6); ab[pool[1]]+=ri(0,4);
  /* 大學背景：開局隨機配發，疊加起始能力值（對應 WIKI 四、大學背景） */
  const univ=pickUnivTier();
  const univBonus=ri(univ.bonus[0],univ.bonus[1]);
  AB_KEYS.forEach(k=>ab[k]+=univBonus);
  if(univ.eduBoost){ for(const k in univ.eduBoost)ab[k]+=univ.eduBoost[k]; }
  const univSchool=pick(univ.schools);
  /* OOTP 式潛力天花板洗牌：60% 機率把科目權重池一項強制排到頂尖位，40% 完全隨機 */
  let sh;
  if(chance(60)){
    const forced=pick(pool);
    const rest=AB_KEYS.filter(k=>k!==forced);
    for(let i=rest.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=rest[i];rest[i]=rest[j];rest[j]=t;}
    sh=[forced,...rest];
  } else {
    sh=AB_KEYS.slice();
    for(let i=sh.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=sh[i];sh[i]=sh[j];sh[j]=t;}
  }
  const pot={};
  sh.forEach((k,i)=>{ pot[k]= i===0?ri(72,80) : i===1?ri(64,74) : i===2?ri(56,68) : ri(46,62); });
  return {name,subject,teachStage,age:23,year:2026,startYear:2026,phase:'實習',phaseYr:1,
    pot,potSum0:Object.values(pot).reduce((a,b)=>a+b,0),
    ab,carry:{},job:null,region:null,school:null,salary:0,
    univTier:univ.key,univTierName:univ.n,univSchool,teachYears:0,svc:0,
    ow:0,homeroomYrsLeft:0,hrPoints:0,leadYears:0,deptYears:0,
    hrYearsTotal:0,adminDutyYearsTotal:0,recentD:[],
    deptCandidate:false,deptOffice:null,deptOfficesHeld:{},mgmtLowStreak:0,stableYears:0,
    owBigCount:0,owStreak:0,owLeaveTaken:false,sickLeaveYears:0,intensity:null,traits:{},
    schoolYears:0,prevSchool:null,everAdmin:false,firstRegion:null,subYearsTotal:0,
    sixCount:0,safeCount:0,partyFailCount:0,miscFailCount:0,
    crisisBoldStreak:0,crisisBoldFailTotal:0,healthyStreak:0,focusStreak:0,
    bigInjEarlyCount:0,complainCount:0,refusedTransferPending:null,dictNick:null,
    svcTotal:0,leadYearsTotal:0,deptYearsTotal:0,principalYearsTotal:0,
    principalCandidate:false,everFormal:false,
    awardCount:0,honorScore:0,awardsWon:{},excellentSchools:{},schoolYearsMap:{},
    log:[],done:false};
}
