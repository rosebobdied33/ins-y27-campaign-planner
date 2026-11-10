import assert from 'node:assert/strict';
import test from 'node:test';
import {coverageDays,monthBounds,monthlyTotal,weekdayPlanSchema,weekdayWindows,type ScheduleProject} from '../lib/weekday';

const project:ScheduleProject={id:'S1',code:'S01',tier:'S',name:'Test',start:'2027-12-24',end:'2028-01-07',status:'规划中',color:'#84617a'};

test('week two starts seven days after the S campaign launches and keeps the end date',()=>{
  const [window]=weekdayWindows([project,{...project,id:'a',tier:'A'},{...project,id:'short',end:'2027-12-29'}]);
  assert.equal(window.start,'2027-12-31');
  assert.equal(window.end,'2028-01-07');
  assert.equal(coverageDays([window]),1);
  assert.equal(weekdayWindows([{...project,end:'2027-12-30'}]).length,0);
});

test('monthly coverage merges overlaps and clips to the reporting period',()=>{
  const dates=[{start:'2027-01-30',end:'2027-02-03'},{start:'2027-02-02',end:'2027-02-05'}];
  assert.equal(coverageDays(dates,...monthBounds(0)),2);
  assert.equal(coverageDays(dates,...monthBounds(1)),5);
  assert.equal(coverageDays(dates),7);
});

test('weekday allocations require twelve integer amounts and an ordered target range',()=>{
  const plan={monthly:Array<number>(12).fill(1700),min:18000,max:25000};
  assert.equal(monthlyTotal(weekdayPlanSchema.parse(plan)),20400);
  assert.equal(weekdayPlanSchema.safeParse({...plan,monthly:[0]}).success,false);
  assert.equal(weekdayPlanSchema.safeParse({...plan,min:26000}).success,false);
});
