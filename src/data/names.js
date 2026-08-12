/* ---------- 隨機姓名產生器（玩家未輸入姓名時使用，種子化） ---------- */
import { pick } from '../engine/rng.js';

const SURNAMES = ['陳','林','黃','張','李','王','吳','劉','蔡','楊'];
const GIVEN_NAMES = [
  '靖雯','家豪','詩涵','冠廷','怡君','俊傑','佩珊','承翰','雅婷','建宏',
  '思妤','柏宇','雨萱','彥廷','欣怡','宗翰','子涵','展碩','佳穎','承恩',
];

export function randomName(){ return pick(SURNAMES) + pick(GIVEN_NAMES); }
