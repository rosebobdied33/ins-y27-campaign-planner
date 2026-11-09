'use client';
import {useState,type FormEvent} from 'react';
import {Check, Pencil, Plus, Trash2} from 'lucide-react';
import {parseMoney,recordedSpend,yuan,type Payment,type Project} from '../lib/planner';

export function ProjectPayments({project,onChange}:{project:Project;onChange:(payments:Payment[])=>void}) {
  const [editor,setEditor]=useState<Payment|null>(null);
  const [error,setError]=useState('');
  const payments=project.payments??[];
  const total=recordedSpend(project);
  const start=(payment:Payment)=>{setEditor(payment);setError('');};
  const save=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(!editor)return;
    const data=new FormData(event.currentTarget);
    const title=String(data.get('title')).trim();
    const date=String(data.get('date'));
    let amount:number|null=null;
    try{amount=parseMoney(String(data.get('amount')));}catch{}
    if(!title||!amount||!date){setError('请填写付款项目、日期及大于零的金额。');return;}
    const entry={...editor,title,date,amount};
    const next=payments.some(p=>p.id===entry.id)?payments.map(p=>p.id===entry.id?entry:p):[...payments,entry];
    onChange(next);
    setEditor(null);
  };
  return <div className="project-payments">
    <div className="project-payments-head"><span>付款明细 · {payments.length} 笔</span><strong>{total===null?'—':yuan(total)}</strong></div>
    {payments.length>0&&<ul>{payments.map(payment=><li key={payment.id}>
      <div><b>{payment.title}</b><small>{payment.date} · {yuan(payment.amount)}</small></div>
      <button type="button" className="icon" aria-label={'编辑付款 '+payment.title} onClick={()=>start(payment)}><Pencil/></button>
      <button type="button" className="icon" aria-label={'删除付款 '+payment.title} onClick={()=>{
        if(!window.confirm('删除付款「'+payment.title+'」？'))return;
        onChange(payments.filter(p=>p.id!==payment.id));
        if(editor?.id===payment.id)setEditor(null);
      }}><Trash2/></button>
    </li>)}</ul>}
    {editor?<form key={editor.id} onSubmit={save}>
      <label>付款项目<input name="title" required maxLength={80} placeholder="例如 舞台搭建首款" defaultValue={editor.title}/></label>
      <div className="fields"><label>付款日期<input name="date" required type="date" min="2000-01-01" max="2099-12-31" defaultValue={editor.date}/></label>
      <label>金额（元）<input name="amount" required inputMode="decimal" defaultValue={editor.amount?String(editor.amount/100):''}/></label></div>
      {error&&<p role="alert" className="danger">{error}</p>}
      <div className="actions"><button type="button" onClick={()=>setEditor(null)}>取消</button><button className="primary" type="submit"><Check size={15}/>保存付款</button></div>
    </form>:<button type="button" disabled={payments.length>=100} onClick={()=>start({id:crypto.randomUUID(),title:'',date:'',amount:0})}><Plus size={15}/>登记一笔付款</button>}
  </div>;
}
