import type { Project } from '../../lib/planner';
export function seed(): Project[] {
  return [
    {id:'S01',code:'S01',tier:'S',name:'Example',start:'2027-02-02',end:'2027-03-02',budget:45000},
    {id:'S02',code:'S02',tier:'S',name:'Example 2',start:'2027-06-02',end:'2027-07-02',budget:90000},
    {id:'A01',code:'A01',tier:'A',name:'Example 3',start:'2027-12-10',end:'2028-01-10',budget:10000},
  ].map(p=>({...p, tier:p.tier as Project['tier'], build:null,experience:null,notes:'',primary:'待定',secondary:'不叠加',status:'规划中',color:'#aa85eb'}));
}
