const DAY = 86_400_000;

export function monthWeeks<T extends {start:string;end:string}>(year:number,month:number,projects:readonly T[]) {
  const first=Date.UTC(year,month,1);
  const last=Date.UTC(year,month+1,1)-DAY;
  const weekday=(new Date(first).getUTCDay()+6)%7;
  const starts=projects.map(project=>({
    project,
    from:Date.parse(project.start+'T00:00:00Z'),
    to:Date.parse(project.end+'T00:00:00Z'),
  })).sort((a,b)=>a.from-b.from);
  const weeks=[];
  for(let week=first-weekday*DAY;week<=last;week+=7*DAY){
    const left=Math.max(week,first),right=Math.min(week+6*DAY,last);
    const days=Array.from({length:7},(_,i)=>{
      const day=week+i*DAY;
      return day>=first&&day<=last?new Date(day).getUTCDate():null;
    });
    const laneEnds:number[]=[];
    const segments=starts.filter(({from,to})=>from<=right&&to>=left).map(({project,from,to})=>{
      const start=Math.max(from,left);
      const end=Math.min(to,right);
      let lane=laneEnds.findIndex(occupiedUntil=>occupiedUntil<start);
      if(lane===-1)lane=laneEnds.length;
      laneEnds[lane]=end;
      return {project,lane,start:(start-week)/DAY+1,end:(end-week)/DAY+2,continuesFrom:from<start,continuesTo:to>end};
    });
    weeks.push({days,segments});
  }
  return weeks;
}
