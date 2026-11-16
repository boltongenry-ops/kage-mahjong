import {writeFileSync,mkdirSync} from 'node:fs';
import {rng,blocked,type Tile,type LevelDefinition} from '../src/engine.ts';
const levels:LevelDefinition[]=[];
for(let id=1;id<=500;id++){
 const random=rng(id*7919),template=(id-1)%30,chapter=Math.floor((id-1)/50),hard=id%10===0;
 const difficulty=id<=5?0:Math.min(9,chapter+(hard?2:0));
 const count=id<=5?18+(id-1)*3:Math.min(108,36+chapter*6+Math.floor(random()*5)*3+(hard?12:0));
 const candidates:Omit<Tile,'id'|'kind'>[]=[];
 for(let z=0;z<4;z++)for(let y=0;y<6;y++)for(let x=0;x<6;x++){
  const dist=Math.abs(x-2.5)+Math.abs(y-2.5);
  const omit=(template%5===0&&dist>4)||(template%5===1&&((x===0||x===5)&&(y===0||y===5)))||(template%5===2&&x===0&&y<3)||(template%5===3&&x===5&&y>2);
  if(!omit)candidates.push({x:x+(z%2)*.22,y:y-(z%2)*.20,z});
 }
 candidates.sort((a,b)=>a.z-b.z || ((a.x*13+a.y*7+template*3)%17)-((b.x*13+b.y*7+template*3)%17));
 const tiles:Tile[]=candidates.slice(0,count).map((t,id)=>({...t,id,kind:0}));
 const remaining=new Set(tiles.map(t=>t.id)),solution:number[]=[];
 while(remaining.size){const free=tiles.filter(a=>remaining.has(a.id)&&!tiles.some(b=>remaining.has(b.id)&&blocked(a,b)));const next=free[Math.floor(random()*free.length)];solution.push(next.id);remaining.delete(next.id);}
 let p=0;const kinds=Math.min(12,3+chapter);
 while(p<count){const groups=Math.min(Math.floor((count-p)/3),id<3?1:1+Math.floor(random()*(difficulty>2?3:2)));const chosen:number[]=[];while(chosen.length<groups){const k=(Math.floor(random()*kinds)+template)%18;if(!chosen.includes(k))chosen.push(k);}
 const stream=[...chosen,...chosen,...chosen];
 // Shuffle within rounds; a third-round tile always clears before a seventh can accumulate.
 for(let r=0;r<3;r++)for(let i=groups-1;i>0;i--){const j=Math.floor(random()*(i+1));[stream[r*groups+i],stream[r*groups+j]]=[stream[r*groups+j],stream[r*groups+i]];}
 for(const kind of stream)tiles[solution[p++]].kind=kind;
 }
 levels.push({id,version:1,template,difficulty,tiles,solution});
}
mkdirSync('public/data',{recursive:true});writeFileSync('public/data/levels.json',JSON.stringify(levels));console.log('Generated',levels.length,'fixed levels');
