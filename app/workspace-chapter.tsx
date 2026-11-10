import type {ReactNode} from 'react';
import {ArrowDown} from 'lucide-react';

const chapters={
  overview:{number:'01',section:'THE YEAR',title:'Annual Edition',name:'年度总览',caption:'七个场景，一张全年排期。'},
  budget:{number:'02',section:'FINANCE',title:'Budget Ledger',name:'预算看板',caption:'从年度计划，到每一项结算。'},
  projects:{number:'03',section:'PRODUCTION',title:'Campaign Index',name:'项目规划',caption:'按级别和季度管理活动，打开卡片即可编辑。'},
  resources:{number:'04',section:'INTELLIGENCE',title:'Resource Atlas',name:'资源分析',caption:'对照季度覆盖、年度投入和项目类型。'},
} as const;

export function ChapterJump({target,children}:{target:string;children:ReactNode}) {
  return <button type="button" className="edition-jump" onClick={()=>{
    const section=document.getElementById(target);
    section?.scrollIntoView({block:'start'});
    section?.focus({preventScroll:true});
  }}>{children}<ArrowDown size={13} aria-hidden="true"/></button>;
}
export function WorkspaceChapter({pane,detail,children}:{pane:keyof typeof chapters;detail?:string;children?:ReactNode}) {
  const entry=chapters[pane];
  return <header className="edition-chapter" data-chapter={pane}>
    <div className="edition-chapter-copy">
      <div className="edition-index"><span>{entry.number}</span><b>INS LAND / {entry.section}</b><small>2027</small></div>
      <p className="edition-display" lang="en" aria-hidden="true">{entry.title}</p>
      <h1>{entry.name}{detail&&<small>{detail}</small>}</h1>
      <p className="edition-caption">{entry.caption}</p>
    </div>
    {children&&<div className="edition-chapter-actions">{children}</div>}
  </header>;
}
