// Отметки ухода: локально (localStorage) + общий JSON в репозитории GitHub (см. config.js).
// flowers.log   = {id:{w:{d:'YYYY-MM-DD'|null,by:'Имя',t:мс},f:{...}}} — последний полив/подкормка; d=null — отметка снята
// flowers.mine  = [id,...] — «Мои цветы» (только на этом устройстве)
// flowers.tab   = 'all' | 'mine'
// flowers.name  = имя, которое увидят коллеги; flowers.token = токен GitHub для записи
// При конфликте побеждает запись с большим t.
const Store=(()=>{
  const cfg=window.FLOWERS_SYNC||null;
  const K={log:'flowers.log',mine:'flowers.mine',tab:'flowers.tab',name:'flowers.name',tok:'flowers.token'};
  const rd=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};
  const raw=k=>{try{return localStorage.getItem(k)||''}catch(e){return ''}};
  const wr=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const parse=s=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(s||'');return m?new Date(+m[1],m[2]-1,+m[3]):null};

  // старый формат {id:{w:'YYYY-MM-DD'}} -> {id:{w:{d,by,t}}}
  const norm=o=>{
    const out={};if(!o||typeof o!=='object'||Array.isArray(o))return out;
    for(const id in o)for(const k of ['w','f']){
      let e=(o[id]||{})[k];if(!e)continue;
      if(typeof e==='string')e={d:e,by:'',t:parse(e)?parse(e).getTime():0};
      if(e&&typeof e==='object'&&(e.d===null||parse(e.d)))(out[id]||(out[id]={}))[k]={d:e.d,by:String(e.by||'').slice(0,40),t:+e.t||0};
    }
    return out;
  };
  const mem={log:norm(rd(K.log,{})),mine:rd(K.mine,[]),tab:rd(K.tab,'all')};
  if(!Array.isArray(mem.mine))mem.mine=[];
  const saveLog=()=>wr(K.log,JSON.stringify(mem.log));
  const saveMine=()=>wr(K.mine,JSON.stringify(mem.mine));

  const merge=(a,b)=>{const out=JSON.parse(JSON.stringify(a));
    for(const id in b)for(const k in b[id]){const e=b[id][k],c=(out[id]||{})[k];if(!c||e.t>c.t)(out[id]||(out[id]={}))[k]=e}
    return out};
  const stable=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((r,x)=>(r[x]=v[x],r),{}):v);

  // ---- синхронизация ----
  const sync={mode:cfg?(raw(K.tok)?'rw':'ro'):'off',msg:'',at:0};
  let busy=false,again=false;
  const api=cfg&&`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
  const utf8=s=>decodeURIComponent(escape(atob(s.replace(/\s/g,''))));
  const b64=s=>btoa(unescape(encodeURIComponent(s)));
  const fail=(status)=>Object.assign(new Error('http '+status),{status});

  async function fetchRemote(){
    const tok=raw(K.tok);
    if(tok){
      const r=await fetch(api+'?ref='+encodeURIComponent(cfg.branch)+'&t='+Date.now(),{headers:{Authorization:'Bearer '+tok,Accept:'application/vnd.github+json'},cache:'no-store'});
      if(r.status===404)return {data:{},sha:null};
      if(!r.ok)throw fail(r.status);
      const j=await r.json();
      return {data:norm(JSON.parse(utf8(j.content)||'{}')),sha:j.sha};
    }
    const r=await fetch(`https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${cfg.path}?t=${Date.now()}`,{cache:'no-store'});
    if(r.status===404)return {data:{},sha:null};
    if(!r.ok)throw fail(r.status);
    return {data:norm(await r.json()),sha:null};
  }
  async function put(data,sha){
    const body={message:'Flowers log',content:b64(JSON.stringify(data,null,1)+'\n'),branch:cfg.branch};
    if(sha)body.sha=sha;
    return fetch(api,{method:'PUT',headers:{Authorization:'Bearer '+raw(K.tok),Accept:'application/vnd.github+json'},body:JSON.stringify(body)});
  }
  const text=e=>e.status===401?'Токен не подошёл':e.status===403||e.status===404?'Нет доступа к репозиторию (проверьте права токена)':e.status?'Ошибка GitHub '+e.status:'Нет связи';

  async function run(){
    if(!cfg)return;
    if(busy){again=true;return}
    busy=true;let changed=false;const prev=sync.msg+'|'+sync.mode;
    try{
      sync.mode=raw(K.tok)?'rw':'ro';
      for(let i=0;i<4;i++){
        const {data,sha}=await fetchRemote();
        const merged=merge(data,mem.log);
        if(stable(merged)!==stable(mem.log)){mem.log=merged;saveLog();changed=true}
        if(sync.mode!=='rw'||stable(merged)===stable(data))break;
        const r=await put(merged,sha);
        if(r.ok)break;
        if(r.status===409||r.status===422){if(i===3)throw fail(r.status);continue}
        throw fail(r.status);
      }
      sync.msg='';sync.at=Date.now();
    }catch(e){sync.msg=text(e)}
    busy=false;
    if(changed||prev!==sync.msg+'|'+sync.mode)api2.onChange();
    if(again){again=false;run()}
  }

  const api2={
    onChange(){},
    today:()=>iso(new Date()),
    // kind: 'w' (полив) или 'f' (подкормка)
    get:(id,kind)=>((mem.log[id]||{})[kind]||{}).d||null,
    by:(id,kind)=>((mem.log[id]||{})[kind]||{}).by||'',
    set(id,kind,date){
      (mem.log[id]||(mem.log[id]={}))[kind]={d:date&&parse(date)?date:null,by:raw(K.name),t:Date.now()};
      saveLog();run();
    },
    daysAgo(date){const d=parse(date);if(!d)return null;const t=parse(iso(new Date()));return Math.round((t-d)/864e5)},
    ago(date){const n=this.daysAgo(date);if(n==null)return '';return n<=0?'сегодня':n==1?'вчера':n+' дн. назад'},
    fmt(date){const d=parse(date);return d?d.toLocaleDateString('ru',{day:'numeric',month:'short'}):''},
    isMine:id=>mem.mine.includes(id),
    toggleMine(id){const i=mem.mine.indexOf(id);i<0?mem.mine.push(id):mem.mine.splice(i,1);saveMine();return i<0},
    mineCount:ids=>ids.filter(i=>mem.mine.includes(i)).length,
    tab:()=>mem.tab==='mine'?'mine':'all',
    setTab(t){mem.tab=t;wr(K.tab,JSON.stringify(t))},
    name:()=>raw(K.name),
    setName(n){wr(K.name,String(n||'').trim().slice(0,40))},
    token:()=>raw(K.tok),
    setToken(t){wr(K.tok,String(t||'').trim());sync.mode=cfg?(raw(K.tok)?'rw':'ro'):'off'},
    sync,
    enabled:!!cfg,
    refresh:run
  };
  return api2;
})();
