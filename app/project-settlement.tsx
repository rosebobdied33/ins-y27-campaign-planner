'use client';
import {useState,type FormEvent} from 'react';
import {Check,ChevronDown} from 'lucide-react';
import {parseMoney,recordedSpend,yuan,type Project,type Settlement} from '../lib/planner';

export function ProjectSettlement({project,onSave}:{project:Project;onSave:(settlement:Settlement)=>void}) {
  const [error,setError]=useState('');
  const {settlement}=project;
  const total=recordedSpend(project);
  const save=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    const data=new FormData(event.currentTarget);
    try {
      const build=parseMoney(String(data.get('build')));
      const experience=parseMoney(String(data.get('experience')));
      const date=String(data.get('date'));
      if(build===null||experience===null||!date)throw new Error();
      onSave({build,experience,date});
      setError('');
    }catch{setError('请填写有效金额与结算日期，无支出的费用项填 0。');}
  };
  return <details className="project-settlement">
    <summary><ChevronDown size={15}/><b>实际支出</b><span>{total===null?'待结算':yuan(total)}</span></summary>
    <form key={settlement?JSON.stringify(settlement):'unsettled'} onSubmit={save}>
      {!settlement&&total!==null&&<p>原记录 {yuan(total)}。保存后按本次结算金额汇总。</p>}
      <div className="fields">
        <label>实际搭建费（元）<input name="build" inputMode="decimal" required defaultValue={settlement?String(settlement.build/100):''}/></label>
        <label>实际体验费（元）<input name="experience" inputMode="decimal" required defaultValue={settlement?String(settlement.experience/100):''}/></label>
      </div>
      <label className="settlement-date">结算日期<input name="date" type="date" min="2000-01-01" max="2099-12-31" required defaultValue={settlement?.date??''}/></label>
      {error&&<p className="danger" role="alert">{error}</p>}
      <button type="submit" className="primary"><Check size={15}/>保存结算</button>
    </form>
  </details>;
}
