import { z } from 'zod';
import {planningBriefSchema} from './planning-brief';

export const FORMS = ['待定','空间搭建','场景营造','艺术装置','互动体验','沉浸演艺','市集快闪','事件营销','IP联动','全楼运营'] as const;
export const EXPERIENCE_MODES = ['常规体验','创新体验','其他'] as const;
const SECONDARY = ['不叠加', ...FORMS.slice(1), ...EXPERIENCE_MODES] as const;
const PRIMARY_CATEGORIES = [
  '氛围搭建','主体装置','设定场景','娱乐互动','沉浸演艺','商务联动','简易布置','搭建改造',
] as const;
export const PRIMARY_FORMS = ['待定', ...PRIMARY_CATEGORIES, '其他'] as const;
const BUILD_FORMS = [...new Set([...PRIMARY_FORMS, ...FORMS])];
export const FORM_FILTERS = [...new Set([...BUILD_FORMS, ...EXPERIENCE_MODES])];
export const STATUSES = ['规划中','已确认','执行中','已完成'] as const;
export const COLORS = ['#e49a60','#75aa81','#a186d4','#688ed2','#c377a1','#9d537b','#55a390','#cf747b'];
export const QUARTERS = ['Q1','Q2','Q3','Q4'] as const;
export type Tier = 'S' | 'A';
const money = z.number().int().min(0).max(99_999_999_999);
const date = z.iso.date().refine(v => v >= '2000-01-01' && v <= '2099-12-31');
const payment = z.object({
  id:z.string().min(1).max(80),
  title:z.string().trim().min(1).max(80),
  date,
  amount:money.positive(),
});
export type Payment = z.infer<typeof payment>;
const settlement = z.object({build:money,experience:money,date});
export type Settlement = z.infer<typeof settlement>;
const project = z.object({
  id:z.string().min(1).max(80), code:z.string().regex(/^[SA]\d{2,4}$/),
  tier:z.enum(['S','A']), name:z.string().max(100), start:date, end:date,
  budget:money, settlement:settlement.optional(), spent:money.nullable().optional(), payments:z.array(payment).max(100).refine(rows=>new Set(rows.map(row=>row.id)).size===rows.length).optional(), build:money.nullable(), experience:money.nullable(),
  primary:z.enum(BUILD_FORMS), primaryDetail:z.string().max(80).optional(), secondary:z.enum(SECONDARY), secondaryDetail:z.string().max(80).optional(), status:z.enum(STATUSES),
  planningBrief:planningBriefSchema.optional(), notes:z.string().max(1000), color:z.string().regex(/^#[a-fA-F0-9]{6}$/), accent:z.string().regex(/^#[a-fA-F0-9]{6}$/).optional()
}).refine(p => p.start <= p.end && (p.primary !== p.secondary || p.secondary === '其他') && p.code.startsWith(p.tier));
export type Project = z.infer<typeof project>;
const projects = z.array(project).max(300).refine(p => new Set(p.map(x=>x.code)).size === p.length && new Set(p.map(x=>x.id)).size === p.length);
export const quarter = (start:string) => QUARTERS[Math.floor((Number(start.slice(5,7))-1)/3)];
export function durationDays(start:string,end:string):number|null {
  if (!date.safeParse(start).success || !date.safeParse(end).success || end<start) return null;
  return (Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86_400_000+1;
}
export const allocation = (p:Project) => p.budget - (p.build ?? 0) - (p.experience ?? 0);
export function summary(items:Project[],baseline=0) {
  const out = {S:0,A:0,total:0,build:0,experience:0,unallocated:0,over:0,remaining:baseline,quarters:[0,0,0,0]};
  for (const p of items) {
    out[p.tier] += p.budget; out.total += p.budget;
    out.build += p.build ?? 0; out.experience += p.experience ?? 0;
    const gap = allocation(p); out.unallocated += Math.max(0,gap); out.over += Math.max(0,-gap);
    out.quarters[QUARTERS.indexOf(quarter(p.start))] += p.budget;
  }
  out.remaining -= out.total;
  return out;
}
export function recordedSpend(project:Pick<Project,'spent'|'payments'|'settlement'>):number|null {
  if(project.settlement)return project.settlement.build+project.settlement.experience;
  const payments=project.payments??[];
  if(project.spent==null&&!payments.length)return null;
  return payments.reduce((total,payment)=>total+payment.amount,project.spent??0);
}
export function settlementMonths(items:Project[],year:string):number[] {
  const months=Array<number>(12).fill(0);
  for(const {settlement} of items) {
    if(!settlement||!settlement.date.startsWith(year+'-'))continue;
    months[Number(settlement.date.slice(5,7))-1]+=settlement.build+settlement.experience;
  }
  return months;
}
export function spending(items:Project[]) {
  const totals = {paid:0, pending:0, over:0, recorded:0, withPayment:0, withBalance:0, quarters:[0,0,0,0]};
  for (const project of items) {
    const actual = recordedSpend(project);
    const paid = actual ?? 0;
    const balance = project.budget - paid;
    totals.paid += paid;
    if (!project.settlement) totals.pending += Math.max(balance,0);
    totals.over += Math.max(-balance,0);
    if (actual != null) totals.recorded++;
    if (paid>0) totals.withPayment++;
    if (!project.settlement&&balance>0) totals.withBalance++;
    totals.quarters[QUARTERS.indexOf(quarter(project.start))] += paid;
  }
  return totals;
}
export function filterProjects(items:Project[], tier:string, q:string, form:string) {
  return items.filter(p => (tier==='all'||p.tier===tier) && (q==='all'||quarter(p.start)===q) && (form==='all'||p.primary===form||p.secondary===form));
}
export function parseMoney(raw:string) {
  const value = raw.replace(/[¥￥,\s]/g,'');
  if (!value) return null;
  if (!/^\d{1,9}(\.\d{0,2})?$/.test(value)) throw new Error('请输入有效金额，最多两位小数');
  const [whole, fraction=''] = value.split('.');
  return money.parse(Number(whole)*100 + Number(fraction.padEnd(2,'0')));
}
export const number = (fen:number) => (fen/100).toLocaleString('en-US',{maximumFractionDigits:2});
export const yuan = (fen:number) => '¥'+number(fen);
export const percent = (value:number,total:number) => total ? value/total*100 : 0;
export const nextCode = (items:Project[], tier:Tier) => {
  const used = new Set(items.map(p=>p.code));
  for(let n=1;n<10000;n++) {
    const code = tier+String(n).padStart(2,'0');
    if(!used.has(code)) return code;
  }
  throw new Error('编号已用完');
};
export const backup = (items:unknown) => JSON.stringify({version:1,year:2027,projects:items},null,2);
export const readBackup = (data:string) => z.object({version:z.literal(1),year:z.literal(2027),projects}).parse(JSON.parse(data)).projects;
export const validateProjects = (value:unknown) => projects.parse(value);
export function primaryFormLabel(project:{primary:Project['primary'];primaryDetail?:string|null}):string {
  return project.primary==='其他' ? project.primaryDetail?.trim() || '其他' : project.primary;
}
export function experienceModeLabel(project:{secondary:Project['secondary'];secondaryDetail?:string|null}):string {
  if(project.secondary==='不叠加')return '待定';
  return project.secondary==='其他' ? project.secondaryDetail?.trim() || '其他' : project.secondary;
}
export const HEADERS = ['编号','级别','主题名称','季度','开始日期','结束日期','周期（天）','状态','预算（元）','搭建（元）','体验（元）','待分配 / 超额（元）','搭建形式','体验模式','备注','实际已支出（元）','预算差额（元）','实际搭建费（元）','实际体验费（元）','结算日期'];
export const rows = (items:Project[]) => items.map(p => {
  const actual=recordedSpend(p);
  return [p.code,p.tier,p.name,quarter(p.start),p.start,p.end,durationDays(p.start,p.end),p.status,p.budget/100,p.build===null?null:p.build/100,p.experience===null?null:p.experience/100,allocation(p)/100,primaryFormLabel(p),experienceModeLabel(p),p.notes,actual==null?null:actual/100,(p.budget-(actual??0))/100,p.settlement?p.settlement.build/100:null,p.settlement?p.settlement.experience/100:null,p.settlement?.date??null];
});
export const csv = (items:Project[]) => '\uFEFF'+[HEADERS,...rows(items)].map(row => row.map(v => {
  const s = String(v ?? '');
  return '"'+(typeof v==='string' && (/^\s*[=+\-@]/.test(s)||/^[\t\r\n]/.test(s)) ? "'"+s : s).replaceAll('"','""')+'"';
}).join(',')).join('\r\n');
