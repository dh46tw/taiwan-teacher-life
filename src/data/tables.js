/* ---------- 六維能力值、科目、地理分級、學校、教甄門檻等靜態表格（對應 WIKI 三、四） ---------- */
export const ABL={hp:'健康',pas:'教學熱忱',pro:'教學能力',mgt:'班級經營',com:'溝通能力',adm:'行政能力'};
export const AB_KEYS=Object.keys(ABL);

export const SUBJECTS=['國文','英文','數學','理化','社會'];
export const STAGE='國中'; /* WIKI 限縮於國中學制 */

/* ---------- 地理分級與虛構國中校名（對應 WIKI 四） ---------- */
export const TIERS=['六都','非六都','離島偏鄉'];
export const SCHOOLS={
  六都:['群英國中','新鳴國中','丹霞國中','澄川國中'],
  非六都:['瑞華國中','靖安國中','蒼梧國中','崇安國中'],
  離島偏鄉:['潮音國中','燕鷗國中','星砂國中','浪岬國中'],
};
export const POPULAR_SCHOOL='群英國中'; /* 人氣加乘校：較容易獲提名校內特殊表現嘉獎 */

/* ---------- 教師甄試門檻與上榜機率公式（對應 WIKI 二） ---------- */
export const EXAM_TH={
  六都:{th:52,base:20,lo:5,hi:70},
  非六都:{th:44,base:35,lo:10,hi:85},
  離島偏鄉:{th:36,base:55,lo:20,hi:95},
};

/* ---------- 5 級終局稱號與分數門檻（對應 WIKI 六） ---------- */
export const TIER_ORDER=['一頁教育者','認真教師','資深良師','明星教師','典範教育家'];
export const TIER_TABLE=[
  {name:'典範教育家',min:4000},
  {name:'明星教師',min:2950},
  {name:'資深良師',min:2150},
  {name:'認真教師',min:1450},
  {name:'一頁教育者',min:-Infinity},
];

/* ---------- 風味稱號詞綴（依累積投入點數最高一項，對應 WIKI 六） ---------- */
export const FLAVOR={pro:'教學型',mgt:'帶班型',com:'公關型',adm:'行政通型',hp:'長青型',pas:'熱血型'};

/* ---------- HonorScore 年度大獎（對應 WIKI 六） ---------- */
export const AWARDS={
  devotion:{name:'教育部教育奉獻獎',score:460},
  shiduo:{name:'師鐸獎',score:420},
  countyExcellent:{name:'特殊優良教師獎（縣市級）',score:300},
  teachExcellence:{name:'教學卓越獎（團體，個人列名）',score:220},
  countyGood:{name:'縣市優良教師',score:160},
  newTeacher:{name:'新進教師獎/初任教師優良獎',score:140},
  schoolMerit:{name:'校內特殊表現嘉獎',scoreRange:[40,70]},
  nationalContest:{name:'指導學生獲全國賽',score:90},
};
/* 拿過師鐸獎或教育奉獻獎 → 至少「明星教師」；拿過任一縣市級以上單項獎 → 至少「資深良師」 */
export const BIG_AWARD_KEYS=['devotion','shiduo'];
export const COUNTY_OR_ABOVE_KEYS=['devotion','shiduo','countyExcellent','teachExcellence','countyGood'];

/* 科目對應全國賽名稱（對應 WIKI 六） */
export const SUBJ_CONTEST={
  國文:'作文比賽',英文:'英語競賽',數學:'數學競賽',理化:'科展',社會:'公民行動方案',
};
