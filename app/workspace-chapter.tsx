import type {ReactNode} from 'react';
import {ArrowDown} from 'lucide-react';

const chapters={
  overview:'年度总览',
  budget:'预算看板',
  projects:'项目规划',
  resources:'资源分析',
} as const;

export function ChapterJump({target,children}:{target:string;children:ReactNode}) {
  return <button type="button" className="edition-jump" onClick={()=>{
    const section=document.getElementById(target);
    section?.scrollIntoView({block:'start'});
    section?.focus({preventScroll:true});
  }}>{children}<ArrowDown size={13} aria-hidden="true"/></button>;
}
export function WorkspaceChapter({pane,detail,children}:{pane:keyof typeof chapters;detail?:string;children?:ReactNode}) {
  return <header className="edition-chapter" data-chapter={pane}>
    <div className="edition-chapter-copy">
      <h1>{chapters[pane]}{detail&&<small>{detail}</small>}</h1>
    </div>
    {children&&<div className="edition-chapter-actions">{children}</div>}
  </header>;
}
