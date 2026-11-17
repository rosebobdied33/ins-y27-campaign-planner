import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceWorldWheel,worldCameraPose} from '../lib/world-navigation';

test('reaching the far view consumes the gesture before returning home',()=>{
  const first=advanceWorldWheel(.03,-320,false);
  assert.equal(first.zoom,0);
  assert.equal(first.returnHome,false);
  assert.equal(advanceWorldWheel(first.zoom,-180,true).returnHome,false);
  assert.equal(advanceWorldWheel(first.zoom,-180,false).returnHome,true);
});

test('orbit and zoom keep the camera above the site and outside the building',()=>{
  for(const mobile of [false,true]){
    for(const yaw of [-9,-1,0,3,9]){
      for(const zoom of [0,.4,1,2]){
        const {position,target}=worldCameraPose({azimuth:yaw,elevation:-2,zoom},mobile);
        assert.ok(position[1]>12);
        assert.ok(Math.hypot(position[0],position[2]+18)>52);
        assert.ok(target.every(Number.isFinite));
      }
    }
  }
});
