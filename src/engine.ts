export type Mode = 'campaign' | 'zen' | 'timed' | 'daily';
export interface Tile { id: number; x: number; y: number; z: number; kind: number }
export interface LevelDefinition { id: number; version: 1; template: number; difficulty: number; tiles: Tile[]; solution: number[] }
export interface Snapshot { remaining: number[]; tray: number[]; score: number }
export interface GameState extends Snapshot { levelId: number; mode: Mode; history: Snapshot[]; status: 'playing'|'won'|'lost'; undos: number; hints: number; remainingMs: number; round: number; date: string; awarded: boolean }
export function blocked(a: Tile,b: Tile): boolean { return b.z>a.z && Math.abs(a.x-b.x)<.94 && Math.abs(a.y-b.y)<.94 }
export function available(level: LevelDefinition,remaining: number[],id: number): boolean { const a=level.tiles[id]; return !!a && remaining.includes(id) && !remaining.some(i=>blocked(a,level.tiles[i])); }
export function start(level: LevelDefinition,mode: Mode,date=''): GameState { return {levelId:level.id,mode,remaining:level.tiles.map(t=>t.id),tray:[],history:[],score:0,status:'playing',undos:0,hints:0,remainingMs:120000,round:0,date,awarded:false}; }
export function select(level: LevelDefinition,s: GameState,id: number): GameState {
 if(s.status!=='playing'||!available(level,s.remaining,id))return s;
 const history=[...s.history,{remaining:[...s.remaining],tray:[...s.tray],score:s.score}];
 const remaining=s.remaining.filter(i=>i!==id),tray=[...s.tray,id].sort((a,b)=>level.tiles[a].kind-level.tiles[b].kind);
 const kind=level.tiles[id].kind, matches=tray.filter(i=>level.tiles[i].kind===kind); let score=s.score;
 if(matches.length===3){matches.forEach(i=>tray.splice(tray.indexOf(i),1));score+=100;}
 const status=remaining.length===0&&tray.length===0?'won':tray.length>=(s.mode==='zen'?9:7)?'lost':'playing';
 return {...s,remaining,tray,history,score,status};
}
export function undo(s: GameState): GameState { const last=s.history.at(-1);return last?{...s,...structuredClone(last),history:s.history.slice(0,-1),status:'playing',undos:s.undos+1,awarded:false}:s; }
export function stars(s: GameState): number {return 1+Number(!s.undos)+Number(!s.hints);}
export function dayKey(date=new Date()): string {return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function hash(s: string): number {let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function rng(seed: number): ()=>number {return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function solve(level:LevelDefinition,remaining:number[],tray:number[],capacity=7,budget=200):number[]|null {
 const until=performance.now()+budget, memo=new Set<string>();let visits=0;
 const masks=level.tiles.map(a=>level.tiles.reduce((m,b)=>blocked(a,b)?m|1n<<BigInt(b.id):m,0n));
 const counts=Array(18).fill(0);tray.forEach(i=>counts[level.tiles[i].kind]++);
 const search=(mask:bigint,c:number[],load:number):number[]|null=>{
  if(mask===0n)return load===0?[]:null;
  if(++visits%128===0&&performance.now()>until)return null;
  const key=mask.toString(36)+':'+c.join('');if(memo.has(key))return null;memo.add(key);
  const options=level.tiles.filter(t=>(mask&1n<<BigInt(t.id))!==0n&&(mask&masks[t.id])===0n).sort((a,b)=>c[b.kind]-c[a.kind]);
  for(const t of options){const nc=[...c];nc[t.kind]++;const nl=load+(nc[t.kind]===3?-2:1);if(nl>=capacity)continue;if(nc[t.kind]===3)nc[t.kind]=0;const result=search(mask&~(1n<<BigInt(t.id)),nc,nl);if(result)return[t.id,...result];if(performance.now()>until)return null;}
  return null;
 };return search(remaining.reduce((m,i)=>m|1n<<BigInt(i),0n),counts,tray.length);
}
