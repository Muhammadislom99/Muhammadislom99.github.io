// Всё, что пользователь отмечает, живёт в localStorage браузера.
// flowers.log  = {id:{w:'YYYY-MM-DD',f:'YYYY-MM-DD'}} — последний полив и подкормка
// flowers.mine = [id,...] — «Мои цветы»
// flowers.tab  = 'all' | 'mine' — выбранная вкладка на главной
const Store=(()=>{
  const K={log:'flowers.log',mine:'flowers.mine',tab:'flowers.tab'};
  const rd=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};
  const mem={log:rd(K.log,{}),mine:rd(K.mine,[]),tab:rd(K.tab,'all')};
  const save=k=>{try{localStorage.setItem(K[k],JSON.stringify(mem[k]))}catch(e){}};
  if(typeof mem.log!=='object'||Array.isArray(mem.log))mem.log={};
  if(!Array.isArray(mem.mine))mem.mine=[];
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const parse=s=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(s||'');return m?new Date(+m[1],m[2]-1,+m[3]):null};
  return {
    today:()=>iso(new Date()),
    // kind: 'w' (полив) или 'f' (подкормка)
    get:(id,kind)=>(mem.log[id]||{})[kind]||null,
    set(id,kind,date){
      const e=mem.log[id]||(mem.log[id]={});
      if(date&&parse(date))e[kind]=date;else delete e[kind];
      if(!Object.keys(e).length)delete mem.log[id];
      save('log');
    },
    daysAgo(date){const d=parse(date);if(!d)return null;const t=parse(iso(new Date()));return Math.round((t-d)/864e5)},
    ago(date){const n=this.daysAgo(date);if(n==null)return '';return n<=0?'сегодня':n==1?'вчера':n+' дн. назад'},
    fmt(date){const d=parse(date);return d?d.toLocaleDateString('ru',{day:'numeric',month:'short'}):''},
    isMine:id=>mem.mine.includes(id),
    toggleMine(id){const i=mem.mine.indexOf(id);i<0?mem.mine.push(id):mem.mine.splice(i,1);save('mine');return i<0},
    mineCount:ids=>ids.filter(i=>mem.mine.includes(i)).length,
    tab:()=>mem.tab==='mine'?'mine':'all',
    setTab(t){mem.tab=t;save('tab')}
  };
})();
