/* ---------- 能力值、科目、階段、大學背景、地理分級、薪資門檻等靜態表格 ---------- */
export const ABL={sta:'教學熱忱',con:'教材精熟',pow:'教學魅力',spd:'臨場反應',eye:'因材施教',
  rng:'班級經營',fld:'輔導能力',arm:'溝通能力',cat:'行政能力'};
export const AB_KEYS=Object.keys(ABL);
export const AB_CORE=['con','pow','spd','eye'];      /* 教學核心四項 */
export const AB_MGMT=['rng','fld','arm','cat'];       /* 職能四項 */
export const SUBJECTS=['國文','英文','數學','理化','社會'];
export const STAGES=['國中','高中'];
/* 科目頂尖工具權重池：[招牌能力, 次要能力] */
export const SUBJ_POOL={
  國文:['arm','eye'], 英文:['spd','con'], 數學:['con','eye'], 理化:['pow','con'], 社會:['arm','fld'],
};

/* ---------- 大學背景（開局隨機配發，對應 WIKI 四、大學背景） ---------- */
export const UNIV_TIERS=[
  {key:'top',n:'頂大',schools:['台大','清大','交大','成大','政大','中正','中山','中央','中興'],p:10,bonus:[4,8]},
  {key:'edu',n:'師培大學',schools:['台師大','教育大學'],p:20,bonus:[2,5],eduBoost:{rng:2,fld:2}},
  {key:'natl',n:'一般國立大學',schools:['一般國立大學'],p:35,bonus:[0,3]},
  {key:'priv',n:'一般私立大學',schools:['一般私立大學'],p:35,bonus:[0,0]},
];
/* ---------- 地理分級與虛構學校 ---------- */
export const TIERS=['六都','非六都','離島偏鄉'];
export const SCHOOLS={
  國中:{六都:['群英國中','新鳴國中','丹霞國中','澄川國中'],非六都:['瑞華國中','靖安國中','蒼梧國中','崇安國中'],離島偏鄉:['潮音國中','燕鷗國中']},
  高中:{六都:['雲海高中','青雲高中','明承高中','望星高中'],非六都:['東寧高中','光禾高中','清泉高中','雙溪高中'],離島偏鄉:['星砂高中','浪岬高中']},
};
/* ---------- 教師甄試門檻與上榜機率公式 ---------- */
export const EXAM_TH={
  六都:{th:52,base:20,lo:5,hi:70}, 非六都:{th:44,base:35,lo:10,hi:85}, 離島偏鄉:{th:36,base:55,lo:20,hi:95},
};
/* ---------- 薪資與職涯分級門檻（對應 WIKI 六、職涯分級門檻表） ---------- */
export const PAY_SUB=55;
export const LV_TABLE={
  代理:{不分區:{par:32,min:26,pay:55}},
  正式教師:{離島偏鄉:{par:38,min:32,pay:70},非六都:{par:44,min:38,pay:62},六都:{par:50,min:44,pay:60}},
  組長:{離島偏鄉:{par:44,min:39,pay:82},非六都:{par:50,min:45,pay:75},六都:{par:56,min:51,pay:73}},
  主任:{離島偏鄉:{par:50,min:45,pay:100},非六都:{par:56,min:51,pay:95},六都:{par:62,min:57,pay:92}},
  校長:{離島偏鄉:{par:58,min:53,pay:140},非六都:{par:64,min:59,pay:135},六都:{par:70,min:65,pay:130}},
};
