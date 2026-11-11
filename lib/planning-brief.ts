import {z} from 'zod';

export const briefLimits={positioning:36,direction:24,difference:48,keyword:12,keywordCount:3} as const;

export const planningBriefSchema=z.object({
  positioning:z.string().max(briefLimits.positioning),
  direction:z.string().max(briefLimits.direction),
  difference:z.string().max(briefLimits.difference),
  keywords:z.array(z.string().max(briefLimits.keyword)).max(briefLimits.keywordCount),
});
export type PlanningBrief=z.infer<typeof planningBriefSchema>;

const suggestions:Readonly<Partial<Record<string,PlanningBrief>>>={
  S01:{
    positioning:'走进一座可以互动的奇想牧场。',
    direction:'场景营造 × 轻量互动',
    difference:'从静态拍照场景，升级为可参与的牧场世界。',
    keywords:['牧场地标','角色互动','周中延展'],
  },
  S02:{
    positioning:'把春天做成一座会生长的市集。',
    direction:'市集运营 × 场景艺术',
    difference:'让市集内容成为主角，而不只是搭建一座市场。',
    keywords:['主题市集','艺术花园','内容更新'],
  },
  S03:{
    positioning:'将游戏规则带进现实空间。',
    direction:'数字互动 × 游戏场景',
    difference:'让用户成为游戏玩家，而不只是观看游戏装置。',
    keywords:['实体游戏','互动设备','周年事件'],
  },
  S04:{
    positioning:'一座在夜晚被音乐唤醒的泳池。',
    direction:'沉浸场景 × 音乐事件',
    difference:'从静态水景美陈，升级为声光水结合的夜间体验。',
    keywords:['夜间水景','灯光音乐','互动现场'],
  },
  S05:{
    positioning:'让秋日假期成为持续发生的事件。',
    direction:'季节场景 × 假日运营',
    difference:'减少静态装饰依赖，让体验在活动周期内持续更新。',
    keywords:['秋日地标','假日玩法','周中焕新'],
  },
  S06:{
    positioning:'进入一座被影像与表演改写的剧场。',
    direction:'影像装置 × 沉浸演艺',
    difference:'让场景随演艺内容变化，而不是一次性的拍照装置。',
    keywords:['空间影像','现场表演','沉浸探索'],
  },
  S07:{
    positioning:'把冬日的奇想收藏进一座博物馆。',
    direction:'艺术展陈 × 节庆体验',
    difference:'从常规节庆装饰，转向可参观、可探索的展览世界。',
    keywords:['主题藏品','互动展陈','跨年事件'],
  },
};

export function campaignBrief(project:{id:string;planningBrief?:PlanningBrief|null}) {
  return project.planningBrief??suggestions[project.id];
}
