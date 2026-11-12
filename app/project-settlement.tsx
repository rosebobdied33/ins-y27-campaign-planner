import {parseMoney,recordedSpend,yuan,type Project,type Settlement} from '../lib/planner';

export function readSettlement(data:FormData):Settlement|undefined {
  const buildText=String(data.get('settlementBuild')??'').trim();
  const experienceText=String(data.get('settlementExperience')??'').trim();
  const date=String(data.get('settlementDate')??'');
  if(!buildText&&!experienceText&&!date)return;
  const build=parseMoney(buildText);
  const experience=parseMoney(experienceText);
  if(build===null||experience===null||!date)throw new Error('Incomplete settlement');
  return {build,experience,date};
}

export function ProjectSettlement({project,error,onChange}:{project:Project;error:string;onChange:()=>void}) {
  const {settlement}=project;
  const total=recordedSpend(project);
  return <div className="project-dialog-settlement" onChange={onChange}>
    <div className="project-dialog-settlement-head"><h4>实际支出</h4><span>{total===null?'待结算':yuan(total)}</span></div>
    {!settlement&&total!==null&&<p>原记录 {yuan(total)}。填写结算后按本次金额汇总。</p>}
    <div className="fields">
      <label>实际搭建费（元）<input name="settlementBuild" inputMode="decimal" defaultValue={settlement?String(settlement.build/100):''}/></label>
      <label>实际体验费（元）<input name="settlementExperience" inputMode="decimal" defaultValue={settlement?String(settlement.experience/100):''}/></label>
    </div>
    <label className="settlement-date">结算日期<input name="settlementDate" type="date" min="2000-01-01" max="2099-12-31" defaultValue={settlement?.date??''}/></label>
    {error&&<p className="danger" role="alert">{error}</p>}
  </div>;
}
