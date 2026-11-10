import {z} from 'zod';
import type {Project} from './planner';

export const PLAN_YEAR=2027;
const DAY=86_400_000;
const amount=z.number().int().min(0).max(99_999_999_999);
export const weekdayPlanSchema=z.object({
  monthly:z.array(amount).length(12),min:amount,max:amount,
}).refine(plan=>plan.min<=plan.max);
export type WeekdayPlan=z.infer<typeof weekdayPlanSchema>;
type Dates=Pick<Project,'start'|'end'>;
export type ScheduleProject=Pick<Project,'id'|'code'|'tier'|'name'|'start'|'end'|'status'|'color'>;

const dayNumber=(date:string)=>Date.parse(date+'T00:00:00Z')/DAY;
export function weekdayWindows<T extends ScheduleProject>(projects:T[]) {
  return projects.filter(project=>project.tier==='S').flatMap(project=>{
    const start=new Date((dayNumber(project.start)+7)*DAY).toISOString().slice(0,10);
    return start<=project.end?[{project,start,end:project.end}]:[];
  }).sort((a,b)=>a.start.localeCompare(b.start));
}

export const monthBounds=(month:number):[number,number]=>[Date.UTC(PLAN_YEAR,month,1)/DAY,Date.UTC(PLAN_YEAR,month+1,1)/DAY];

export function coverageDays(items:Dates[],start=monthBounds(0)[0],end=monthBounds(11)[1]):number {
  const spans=items.map(item=>[Math.max(start,dayNumber(item.start)),Math.min(end,dayNumber(item.end)+1)])
    .filter(([from,to])=>from<to).sort(([a],[b])=>a-b);
  let total=0,tail=start;
  for(const [from,to] of spans){
    total+=Math.max(0,to-Math.max(tail,from));
    tail=Math.max(tail,to);
  }
  return total;
}

export const monthlyTotal=(plan?:WeekdayPlan|null)=>plan?.monthly.reduce((sum,value)=>sum+value,0)??0;
