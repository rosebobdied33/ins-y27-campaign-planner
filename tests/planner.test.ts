import {seed} from './fixtures/example';
import test from 'node:test';
import assert from 'node:assert/strict';
import { allocation, summary, spending, validateProjects, durationDays, quarter, parseMoney, backup, readBackup, csv, nextCode } from '../lib/planner';

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
