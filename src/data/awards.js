/* ---------- 年度獎項（對應 WIKI 十一，融入 HonorScore） ---------- */
export const SUBJ_CONTEST={國文:'作文比賽',英文:'英語競賽',數學:'數學競賽',理化:'科展',社會:'公民行動方案'};
export const AWARDS=[
  {key:'devotion',n:'教育部教育奉獻獎',pts:460,min:68,prob:1.2},
  {key:'shiduo',n:'師鐸獎',pts:420,min:63,prob:2},
  {key:'countyExcellent',n:'特殊優良教師獎（縣市級）',pts:300,min:56,prob:3.5},
  {key:'teachExcellence',n:'教學卓越獎（團體，個人列名）',pts:220,min:50,prob:4.5,school:true},
  {key:'countyGood',n:'縣市優良教師',pts:160,min:44,prob:6},
  {key:'newTeacher',n:'新進教師獎',pts:140,min:34,prob:9,newOnly:true},
  {key:'contest',n:null,pts:90,min:42,prob:5,subj:true},
  {key:'schoolHonor',n:'校內特殊表現嘉獎',pts:[40,70],min:28,prob:14,popular:true},
];
