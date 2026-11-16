import type {GameState,LevelDefinition} from './engine';
export interface SaveData {version:1;stars:Record<string,number>;daily:Record<string,number>;best:number;sessions:Partial<Record<GameState['mode'],GameState>>;settings:{music:boolean;sound:boolean;vibration:boolean;motion:boolean};}
export const fresh=():SaveData=>({version:1,stars:{},daily:{},best:0,sessions:{},settings:{music:false,sound:true,vibration:true,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches}});
let db:IDBDatabase|undefined;let queue=Promise.resolve();
export function validateSave(value:unknown,levels:LevelDefinition[]):SaveData {
 const v=value as SaveData;if(!v||v.version!==1||!v.stars||!v.daily||!v.sessions||!v.settings||!Number.isFinite(v.best)||v.best<0)throw Error('Неподдерживаемый файл сохранения');
 for(const [id,n] of Object.entries(v.stars))if(!/^\d+$/.test(id)||+id<1||+id>500||!Number.isInteger(n)||n<1||n>3)throw Error('Повреждён прогресс');
 for(const [date,n] of Object.entries(v.daily))if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isInteger(n)||n<1||n>3)throw Error('Повреждён календарь');
 for(const key of ['music','sound','vibration','motion'] as const)if(typeof v.settings[key]!=='boolean')throw Error('Повреждены настройки');
 for(const [mode,s]of Object.entries(v.sessions)){
  if(!s||!['campaign','zen','timed','daily'].includes(mode)||s.mode!==mode||!Number.isInteger(s.levelId)||!levels[s.levelId-1]||!['playing','won','lost'].includes(s.status)||!Array.isArray(s.history)||s.history.length>108||typeof s.awarded!=='boolean'||typeof s.date!=='string')throw Error('Повреждена партия');
  for(const k of ['score','remainingMs','round','undos','hints'] as const)if(!Number.isFinite(s[k])||s[k]<0)throw Error('Повреждена партия');
  for(const p of [s,...s.history]){if(!Array.isArray(p.remaining)||!Array.isArray(p.tray))throw Error('Повреждены плитки');const ids=[...p.remaining,...p.tray];if(new Set(ids).size!==ids.length||ids.some(i=>!Number.isInteger(i)||i<0||i>=levels[s.levelId-1].tiles.length)||p.tray.length>9)throw Error('Повреждены плитки');}
 }
 return structuredClone(v);
}
export async function load(levels:LevelDefinition[]):Promise<SaveData>{
 db=await new Promise((resolve,reject)=>{const r=indexedDB.open('kage-save',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 for(const key of ['current','backup']){const v=await new Promise<unknown>((resolve,reject)=>{const r=db!.transaction('state').objectStore('state').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(v){try{return validateSave(v,levels);}catch{continue;}}}return fresh();
}
export function persist(data:SaveData):Promise<void>{const snapshot=structuredClone(data);queue=queue.catch(()=>{}).then(()=>new Promise<void>((resolve,reject)=>{if(!db){reject(Error('Хранилище браузера недоступно. Экспортируйте прогресс в настройках.'));return;}const tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),r=store.get('current');r.onsuccess=()=>{if(r.result)store.put(r.result,'backup');store.put(snapshot,'current');};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);}));return queue;}
