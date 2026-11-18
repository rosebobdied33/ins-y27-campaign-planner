import {crystalVenues} from './dreamscape-venues';

// Keep artwork decisions independent of the official logo assets and venue data.
const treatments=[
 {ink:'#302640',paper:'#e6dced',metal:'#bba3cd',texture:'guilloche',turn:0},
 {ink:'#553146',paper:'#eed3dc',metal:'#d9acb8',texture:'diamonds',turn:28},
 {ink:'#163c51',paper:'#d8ebef',metal:'#a8c9d2',texture:'waves',turn:165},
 {ink:'#21463c',paper:'#d9e8cb',metal:'#b7c79e',texture:'stars',turn:80},
 {ink:'#25355b',paper:'#dce0f1',metal:'#adb6d2',texture:'moire',turn:205},
 {ink:'#482e4c',paper:'#ecd9e8',metal:'#caacba',texture:'guilloche',turn:315},
 {ink:'#603b3d',paper:'#eed8ce',metal:'#cba695',texture:'waves',turn:340},
 {ink:'#3c253d',paper:'#e7cddb',metal:'#c69caf',texture:'diamonds',turn:300},
 {ink:'#253563',paper:'#d9e3f6',metal:'#a7badb',texture:'stars',turn:220},
 {ink:'#403257',paper:'#e5def1',metal:'#bca6d3',texture:'moire',turn:265},
 {ink:'#1e464c',paper:'#d0e8e4',metal:'#a3c9c2',texture:'diamonds',turn:120},
 {ink:'#45304f',paper:'#e4d9eb',metal:'#baa2cc',texture:'stars',turn:285},
 {ink:'#593b42',paper:'#eeded9',metal:'#d0afa6',texture:'guilloche',turn:352},
 {ink:'#214454',paper:'#d5e7ed',metal:'#a7c6d0',texture:'waves',turn:180},
 {ink:'#55402b',paper:'#eee3c9',metal:'#cebc8f',texture:'moire',turn:40},
] as const;
export function brandCardArt(id:string){
 const index=Math.max(0,crystalVenues.findIndex(venue=>venue.id===id));
 return treatments[index%treatments.length];
}
