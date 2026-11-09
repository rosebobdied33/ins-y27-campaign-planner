import test from 'node:test';
import assert from 'node:assert/strict';
import {monthWeeks} from '../lib/calendar';

test('calendar shows inclusive spans across months and places overlapping projects in separate lanes', () => {
  const longer={start:'2027-01-29',end:'2027-02-03'};
  const overlap={start:'2027-02-03',end:'2027-02-03'};
  const january=monthWeeks(2027,0,[longer]);
  assert.deepEqual(january.at(-1)?.days,[25,26,27,28,29,30,31]);
  assert.deepEqual(january.at(-1)?.segments,[{
    project:longer,lane:0,start:5,end:8,continuesFrom:false,continuesTo:true,
  }]);
  assert.deepEqual(monthWeeks(2027,1,[overlap,longer])[0].segments,[
    {project:longer,lane:0,start:1,end:4,continuesFrom:true,continuesTo:false},
    {project:overlap,lane:1,start:3,end:4,continuesFrom:false,continuesTo:false},
  ]);
});

test('year-end calendar clips the visual bar while retaining the full project dates', () => {
  const project={start:'2027-12-30',end:'2028-01-07'};
  const week=monthWeeks(2027,11,[project]).at(-1);
  assert.deepEqual(week?.days,[27,28,29,30,31,null,null]);
  assert.deepEqual(week?.segments,[{project,lane:0,start:4,end:6,continuesFrom:false,continuesTo:true}]);
});
