import {seed} from './fixtures/example';
import test from 'node:test';
import assert from 'node:assert/strict';
import { allocation, summary, PRIMARY_FORMS, primaryFormLabel, filterProjects, spending, settlementMonths, validateProjects, durationDays, quarter, parseMoney, backup, readBackup, csv, nextCode } from '../lib/planner';

test('seed has the exact annual structure and preserves unfilled amounts', () => {
  const items = seed(), totals = summary(items,145000);
  assert.equal(items.length, 3);
  assert.equal(new Set(items.map(p => p.code)).size, 3);
  assert.deepEqual([totals.S, totals.A, totals.total, totals.remaining], [135000, 10000, 145000, 0]);
  assert.ok(items.every(p => p.build === null && p.experience === null && p.primary === '待定'));
  assert.equal(items.find(p => p.code === 'A01')?.end, '2028-01-10');
  assert.equal(quarter(items.find(p => p.code === 'S02')!.start), 'Q2');
  assert.equal(summary(items).quarters.reduce((a,b) => a+b), totals.total);
});
test('plan totals and allocation gaps use independent amounts', () => {
  const p = seed()[1];
  assert.equal(allocation({...p, build: 53000, experience: 37000}), 0);
  assert.equal(allocation({...p, build: 53000, experience: 38000}), -1000);
  assert.equal(allocation({...p, build: 53000}), 37000);
  assert.equal(summary([{...p, budget: 1}], 145000).remaining, 144999);
  assert.equal(parseMoney('100,123.09'), 10012309);
  assert.equal(parseMoney(''), null);
  assert.throws(() => parseMoney('1.123'));
});
test('backup is lossless and rejects duplicates, invalid dates and repeated formats', () => {
  const items = seed();
  assert.deepEqual(readBackup(backup(items)), items);
  for (const invalid of [
    [...items, items[0]],
    [{...items[0], start:'2027-02-30'}],
    [{...items[0], primary:'艺术装置', secondary:'艺术装置'}],
    [{...items[0], build:1.2}]
  ]) assert.throws(() => readBackup(backup(invalid)));
  assert.equal(nextCode(items, 'S'), 'S03');
  assert.match(csv([{...items[0], name:'=2+2'}]), /"'=2\+2"/);
});

test('campaign duration counts both endpoints across months, leap days and years', () => {
  assert.equal(durationDays('2027-01-22','2027-03-01'), 39);
  assert.equal(durationDays('2027-11-26','2028-01-17'), 53);
  assert.equal(durationDays('2028-02-28','2028-03-01'), 3);
  assert.equal(durationDays('2027-05-20','2027-05-20'), 1);
  assert.equal(durationDays('2027-05-21','2027-05-20'), null);
  assert.match(csv([{...seed()[0], start:'2027-01-22', end:'2027-03-01'}]), /"2027-03-01","39"/);
});

test('spending keeps missing entries separate and calculates pending and overspend per project', () => {
  const [first,second,third] = seed();
  const items = validateProjects([{...first,spent:50000},{...second,spent:30000},third]);
  assert.deepEqual(spending(items), {
    paid:80000,pending:70000,over:5000,recorded:2,withPayment:2,withBalance:2,
    quarters:[50000,30000,0,0],
  });
  assert.equal(readBackup(backup(items))[0].spent, 50000);
  assert.equal(items[2].spent, undefined);
});

test('custom primary forms survive backup and legacy forms remain readable', () => {
  const [first, second] = seed();
  const custom = {...first, primary:'其他', primaryDetail:'社区联动'};
  const legacy = {...second, primary:'全楼运营'};
  const items = readBackup(backup([custom,legacy]));
  assert.equal(primaryFormLabel(items[0]), '社区联动');
  assert.equal(primaryFormLabel(items[1]), '全楼运营');
  assert.ok(!PRIMARY_FORMS.some(form => String(form)==='全楼运营'));
  assert.deepEqual(filterProjects(items,'all','all','其他'), [items[0]]);
  assert.match(csv(items), /社区联动/);
});

test('dated payments add to legacy totals and survive backup and export', () => {
  const project={...seed()[0],spent:1000,payments:[
    {id:'payment-1',title:'搭建首款',date:'2027-02-01',amount:2500},
    {id:'payment-2',title:'搭建尾款',date:'2027-03-01',amount:1500},
  ]};
  const [restored]=readBackup(backup([project]));
  assert.equal(restored.payments?.length,2);
  assert.equal(spending([restored]).paid,5000);
  assert.equal(spending([restored]).pending,project.budget-5000);
  assert.equal(spending([{...restored,spent:null}]).paid,4000);
  assert.match(csv([restored]), /"50","400"/);
});

test('a final settlement replaces legacy actuals and belongs to the month it was closed', () => {
  const old={...seed()[0],spent:1000,payments:[{id:'old',title:'旧记录',date:'2027-02-02',amount:2000}]};
  const closed={...old,settlement:{build:3000,experience:0,date:'2028-01-03'}};
  const [restored]=readBackup(backup([closed]));
  assert.equal(spending([old]).paid,3000);
  assert.equal(spending([restored]).paid,3000);
  assert.equal(spending([restored]).pending,0);
  assert.equal(settlementMonths([old,restored],'2027').reduce((a,b)=>a+b,0),0);
  assert.equal(settlementMonths([old,restored],'2028')[0],3000);
  assert.match(csv([restored]), /"30","0","2028-01-03"/);
});
