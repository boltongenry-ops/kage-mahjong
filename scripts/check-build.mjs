import{readFileSync,existsSync}from'node:fs';import{runInNewContext}from'node:vm';import assert from'node:assert/strict';
const code=readFileSync('dist/sw.js','utf8');const listeners={};const items=new Map();let activeCache;let requestOffline=false;
const cache={addAll:async urls=>{for(const u of urls){const path=u==='/'?'dist/index.html':'dist'+u;assert(existsSync(path),`Missing offline resource: ${u}`);items.set(u,new Response(readFileSync(path)));}},match:async r=>items.get(typeof r==='string'?r:new URL(r.url).pathname)?.clone()};
const self={location:{origin:'https://kage.test'},addEventListener:(n,f)=>listeners[n]=f,skipWaiting:()=>{}};
const caches={open:async name=>{activeCache=name;return cache;},keys:async()=>[activeCache,'other-app-cache'],delete:async k=>{assert(k.startsWith('kage-'));}};
runInNewContext(code,{self,caches,URL,Response,fetch:async()=>{if(requestOffline)throw Error('offline');return new Response('network');}});
await new Promise((res,rej)=>listeners.install({waitUntil:p=>p.then(res,rej)}));await new Promise((res,rej)=>listeners.activate({waitUntil:p=>p.then(res,rej)}));requestOffline=true;
for(const path of ['/','/data/levels.json','/art/icons.svg','/icon-192.png']){let response;listeners.fetch({request:{url:'https://kage.test'+path,method:'GET',mode:'navigate'},respondWith:p=>response=p});assert.equal((await response).status,200);}
const manifest=JSON.parse(readFileSync('dist/manifest.webmanifest','utf8'));for(const i of manifest.icons)assert(existsSync('dist'+i.src));console.log('Offline install, cache isolation, assets, manifest and network-free requests passed:',items.size,'cached resources');
