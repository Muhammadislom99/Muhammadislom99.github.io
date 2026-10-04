// Отметки ухода: локально (localStorage) + общая база Firebase Firestore (см. config.js).
// flowers.log   = {id:{w:{d:'YYYY-MM-DD'|null,by:'Имя',t:мс},f:{...}}} — последний полив/подкормка; d=null — отметка снята
// flowers.mine  = [id,...] — «Мои цветы» (только на этом устройстве)
// flowers.tab   = 'all' | 'mine'
// flowers.name  = имя, которое увидят коллеги
// При конфликте побеждает запись с большим t.
const Store=(()=>{
  const cfg=window.FLOWERS_SYNC||null;
  const K={log:'flowers.log',mine:'flowers.mine',tab:'flowers.tab',name:'flowers.name'};
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

  // ---- синхронизация (Firestore REST, опрос раз в минуту) ----
  const on=!!(cfg&&cfg.apiKey&&cfg.projectId);
  const sync={mode:on?'rw':'off',msg:'',at:0};
  let busy=false,again=false;
  const base=on&&`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents/care`;
  const fail=status=>Object.assign(new Error('http '+status),{status});
  const text=e=>e.status===400||e.status===403?'Нет доступа к базе: проверьте ключ и правила Firestore':e.status===404?'База Firestore не найдена: проверьте projectId':e.status?'Ошибка Firebase '+e.status:'Нет связи';
  const docId=(id,k)=>id+'_'+k;

  async function fetchRemote(){
    const data={};let token='';
    do{
      const r=await fetch(base+'?pageSize=300&key='+encodeURIComponent(cfg.apiKey)+(token?'&pageToken='+encodeURIComponent(token):''),{cache:'no-store'});
      if(!r.ok)throw fail(r.status);
      const j=await r.json();
      for(const d of j.documents||[]){
        const m=/\/care\/([a-z0-9]+)_([wf])$/.exec(d.name),f=d.fields||{};
        if(!m)continue;
        const e={d:f.d&&f.d.stringValue||null,by:f.by&&f.by.stringValue||'',t:+(f.t&&f.t.integerValue)||0};
        if(e.d!==null&&!parse(e.d))continue;
        (data[m[1]]||(data[m[1]]={}))[m[2]]=e;
      }
      token=j.nextPageToken||'';
    }while(token);
    return data;
  }
  async function push(id,k,e){
    const q=['d','by','t'].map(x=>'updateMask.fieldPaths='+x).join('&');
    const body={fields:{d:e.d===null?{nullValue:null}:{stringValue:e.d},by:{stringValue:e.by||''},t:{integerValue:String(e.t)}}};
    const r=await fetch(`${base}/${docId(id,k)}?${q}&key=${encodeURIComponent(cfg.apiKey)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok)throw fail(r.status);
  }

  async function run(){
    if(!on)return;
    if(busy){again=true;return}
    busy=true;let changed=false;const prev=sync.msg;
    try{
      const remote=await fetchRemote();
      const merged=merge(remote,mem.log);
      if(stable(merged)!==stable(mem.log)){mem.log=merged;saveLog();changed=true}
      for(const id in merged)for(const k in merged[id]){
        const e=merged[id][k],r=(remote[id]||{})[k];
        if(!r||e.t>r.t)await push(id,k,e);
      }
      sync.msg='';sync.at=Date.now();
    }catch(e){sync.msg=text(e)}
    busy=false;
    if(changed||prev!==sync.msg)api2.onChange();
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
    sync,
    enabled:on,
    refresh:run
  };
  return api2;
})();
