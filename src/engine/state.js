import { R, ri, chance } from './rng.js';
import { AB_KEYS } from '../data/tables.js';

export const APP_VER='v1.0.0-alpha';

/* ================= 遊戲狀態 ================= */
export let S=null;
export function setState(newS){ S=newS; }

/* ---------- 出生設定：六維各 ri(20,32)，教學能力額外 +ri(0,6)（對應 WIKI 三） ---------- */
function rollBirthAbilities(){
  const ab={};
  AB_KEYS.forEach(k=>ab[k]=ri(20,32));
  ab.pro+=ri(0,6);
  return ab;
}

/* ---------- 潛力天花板：OOTP 式洗牌，數字對玩家隱藏（對應 WIKI 三） ----------
   洗牌後：1項頂尖(72-80)、1項優質(64-74)、其餘4項平庸(46-62)。
   60% 機率把「教學能力」強制排到頂尖位，40% 完全隨機。 */
function rollPotential(){
  let sh;
  if(chance(60)){
    const rest=AB_KEYS.filter(k=>k!=='pro');
    for(let i=rest.length-1;i>0;i--){ const j=Math.floor(R()*(i+1)); const t=rest[i]; rest[i]=rest[j]; rest[j]=t; }
    sh=['pro',...rest];
  } else {
    sh=AB_KEYS.slice();
    for(let i=sh.length-1;i>0;i--){ const j=Math.floor(R()*(i+1)); const t=sh[i]; sh[i]=sh[j]; sh[j]=t; }
  }
  const pot={};
  sh.forEach((k,i)=>{ pot[k]= i===0?ri(72,80) : i===1?ri(64,74) : ri(46,62); });
  return pot;
}

export function newState(name,subject){
  const ab=rollBirthAbilities();
  const pot=rollPotential();
  const investedPoints={}; AB_KEYS.forEach(k=>investedPoints[k]=0);
  return {
    name,subject,teachStage:'國中',
    age:23,year:2026,startYear:2026,
    phase:'實習',phaseYr:1,
    ab,pot,carry:{},investedPoints,
    job:null,region:null,school:null,
    teachYears:0,svc:0,svcTotal:0,
    ow:0,
    homeroomYrsLeft:0,hrPoints:0,hrYearsTotal:0,
    leadYears:0,leadYearsTotal:0,adminDutyYearsTotal:0,
    deptYears:0,deptYearsTotal:0,deptCandidate:false,deptOffice:null,deptOfficesHeld:{},
    principalYearsTotal:0,principalCandidate:false,
    dirCleanTenure:true,prinCleanTenure:true,
    mgmtLowStreak:0,stableYears:0,
    owBigCount:0,owStreak:0,owLeaveTaken:false,sickLeaveYears:0,
    intensity:null,traits:{},
    schoolYears:0,prevSchool:null,everAdmin:false,firstRegion:null,
    subYearsTotal:0,everFormal:false,
    sixCount:0,crisisBoldStreak:0,crisisBoldFailTotal:0,
    healthyStreak:0,focusStreak:0,bigInjEarlyCount:0,complainCount:0,
    refusedTransferPending:null,
    recentD:[],
    careerScore:0,honorScore:0,awardCount:0,awardsWon:{},
    log:[],done:false,
  };
}
