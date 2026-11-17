const venues=[
  ['soul-house','SOUL HOUSE','#b7a4ff'],['ins-playland','INS 乐园企划','#f084a9'],['ins-dance-store','INS 蹦迪便利店','#77c5ef'],
  ['oasis','OASIS','#69c8ac'],['nothing-serious','Nothing Serious Club','#798eff'],['upper-wood','UPPERWOOD','#db70c8'],['joke','Joke','#e7958c'],['hush','HUSH','#ce71a5'],
  ['radi','RADI','#6588ff'],['kz-shanghai','KZ Shanghai','#b095f8'],['dirty','DIRTY','#5acfc9'],['culture-club','Culture Club','#a178ed'],
  ['friends','FRIENDS','#ec9d98'],['lafin','Lafin','#51aee6'],['jump','JUMP','#f2ae70'],
] as const;

const rowLengths=[3,5,7];

export const crystalVenues=rowLengths.flatMap((length,row)=>{
  const start=rowLengths.slice(0,row).reduce((total,count)=>total+count,0);
  return venues.slice(start,start+length).map(([id,name,color],column)=>({
    id,name,color,row,column,x:(column-(length-1)/2)*12.2,y:54-row*17.5,z:-3+row*3,
  }));
});
