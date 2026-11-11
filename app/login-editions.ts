import {campaignTitles} from './campaign-gallery';

export type EditionYear=2026|2027;
type ReelEdition={id:string;code:string;name:string;title:string;start:string;end:string;nodes:string[];glow:string;wash:string;deep:string;poster?:string};

const codes=['S01','S02','S03','S04','S05','S06','S07'] as const;
// Public opening cards use the dates and named nodes from the supplied planning table.
const planning:Record<typeof codes[number],{name:string;start:string;end:string;nodes:string[]}>={
  S01:{name:'小羊牧场',start:'2027-01-22',end:'2027-03-15',nodes:['02.06 春节','02.14 情人节','02.20 元宵','03.08 女神月']},
  S02:{name:'春日市场',start:'2027-03-26',end:'2027-05-24',nodes:['05.01 五一','05.20 520']},
  S03:{name:'游戏世界4',start:'2027-06-04',end:'2027-07-26',nodes:['06.09 端午']},
  S04:{name:'夏夜泳池',start:'2027-07-30',end:'2027-08-30',nodes:['08.08 七夕']},
  S05:{name:'枫林假日',start:'2027-09-03',end:'2027-10-18',nodes:['09.15 中秋','10.01 国庆']},
  S06:{name:'迷雾剧场',start:'2027-10-29',end:'2027-11-15',nodes:['11.11 双11']},
  S07:{name:'冬博物馆',start:'2027-11-26',end:'2028-01-17',nodes:['12.25 圣诞','12.31 跨年','01.01 元旦']},
};
const archive=[
  ['抓马之城','Drama City','DRAMA_CITY','01-23','2026-03-02',['情人节'],'#ffe186','#bf594f','#3c1c26'],
  ['酒心花园','The Liquor Garden','LIQUOR_GARDEN','04-03','2026-05-25',['五一假期','520'],'#c9efb0','#a39fc9','#24352f'],
  ['游戏世界','Game World','GAME_WORLD','05-29','2026-07-20',['儿童节','端午'],'#ffc1f0','#8768d0','#231f49'],
  ['闪光邮轮','The Odyssey','FLASH_CRUISE','07-24','2026-08-24',['七夕'],'#d7edff','#649abc','#182d43'],
  ['落日飞车','Sunset Ride','SUNSET_RIDE','09-04','2026-10-19',['中秋&国庆'],'#ffdb9b','#d88165','#40212a'],
  ['百戏游园','Theatrical Wonder Land','BAIXI_GARDEN','10-23','2026-11-09',['双11'],'#efc7fc','#967dbe','#302641'],
  ['玩具城堡','Toy Castle','TOY_CASTLE','11-20','2027-01-11',['圣诞&跨年'],'#ffe0a9','#985361','#351a28'],
] as const;

export const loginEditions:Record<EditionYear,ReelEdition[]>={
  2026:codes.map((code,index)=>{
    const [name,title,file,start,end,nodes,glow,wash,deep]=archive[index];
    return {id:'2026:'+code,code,name,title,start:'2026-'+start,end,nodes:[...nodes],glow,wash,deep,
      poster:'./campaign-archive/2026/'+code+'_'+file+'.webp'};
  }),
  2027:codes.map(code=>{
    const palette=campaignTitles[code];
    return {id:'2027:'+code,code,...planning[code],title:palette.title,glow:palette.glow,wash:palette.wash,deep:palette.cover[0]};
  }),
};
