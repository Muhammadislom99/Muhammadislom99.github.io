const P=window.PLANTS;
const lf=(a,l,w,f,o=1,y=126)=>`<path transform="translate(100 ${y}) rotate(${a}) scale(${l})" d="M0 0C${-w} -.3 ${-w} -.7 0 -1C${w} -.7 ${w} -.3 0 0Z" fill="${f}" opacity="${o}"/>`;
const lv=(a,l,w,f,y)=>lf(a,l,w,f,1,y)+lf(a,l*.82,w*.5,'#fff',.16,y);
function art(p){
  let s='',c=p.c,A;
  if(p.t==='fan'){A=[-68,-44,-22,0,22,44,68];A.forEach((a,i)=>{const L=58+(i%2)*14+(i==3?10:0);s+=lv(a,L,.5,p.c2&&i%2?p.c2:c);if(p.st)s+=lf(a,L*.9,.1,'#0d3b22',.55)});if(p.dots)for(let i=0;i<14;i++){const a=(i*47)%130-65,r=20+(i*13)%40;s+=`<circle cx="${100+Math.sin(a*Math.PI/180)*r}" cy="${126-Math.cos(a*Math.PI/180)*r}" r="2.200" fill="${p.dots}" opacity=".9"/>`}}
  else if(p.t==='ros'){A=[-78,-55,-32,-10,10,32,55,78];A.forEach((a,i)=>{s+=lv(a,56+(i%2)*10,p.w||.2,c)});if(p.f)for(let i=0;i<9;i++)s+=`<circle cx="${82+(i*7)%36}" cy="${62+(i*11)%14}" r="4" fill="${p.f}"/>`}
  else if(p.t==='heart'){s+='<rect x="92" y="36" width="16" height="92" rx="8" fill="#2d2a26"/>';[-72,-40,-12,12,40,72].forEach((a,i)=>{s+=lv(a,50+(i%3)*8,.75,c,126-i*9)})}
  else if(p.t==='spa'){[-55,-22,22,55].forEach(a=>{s+=lv(a,54,.5,c)});s+=lv(-14,42,.75,'#d9304a',118)+lv(18,36,.75,'#e8455b',118)+'<path d="M104 84q8-20 14-28" stroke="#f2d04a" stroke-width="5" stroke-linecap="round" fill="none"/>'}
  else if(p.t==='cac'){s+=`<rect x="84" y="46" width="32" height="84" rx="16" fill="${c}"/><rect x="62" y="74" width="16" height="40" rx="8" fill="${c}"/><rect x="122" y="64" width="16" height="42" rx="8" fill="${c}"/><rect x="62" y="104" width="28" height="12" rx="6" fill="${c}"/><rect x="110" y="96" width="28" height="12" rx="6" fill="${c}"/><path d="M100 50v78M92 56v70M108 56v70" stroke="#fff" stroke-opacity=".2" stroke-width="2"/>`}
  else if(p.t==='bush'){for(let i=0;i<30;i++){const a=i*2.400,r=8+(i*7)%34;s+=`<circle cx="${100+Math.cos(a)*r*1.500}" cy="${92+Math.sin(a)*r*.9}" r="${11+(i%3)*3}" fill="${i%2?c:p.c2}"/>`}if(p.f)for(let i=0;i<7;i++)s+=`<circle cx="${70+i*10}" cy="${70+(i*17)%40}" r="4" fill="${p.f}"/>`}
  else if(p.t==='spike'){s+='<rect x="95" y="52" width="10" height="76" rx="5" fill="#a8cf6e"/><path d="M95 80h10M95 100h10" stroke="#6f9a3a" stroke-width="2"/>';[-70,-40,-14,14,40,70].forEach((a,i)=>{s+=lv(a,48+(i%2)*10,.18,c,62)});s+=lv(0,52,.15,c,62)}
  const bw=p.pot||'#f3f3ef';
  return `<svg viewBox="0 0 200 200" role="img" aria-label="${p.n}"><ellipse cx="100" cy="182" rx="48" ry="6" fill="#000" opacity=".12"/>${s}<path d="M66 136h68l-7 40q-1 6-8 6H81q-7 0-8-6z" fill="${bw}"/><path d="M66 136h68l-7 40q-1 6-8 6H81q-7 0-8-6z" fill="url(#gP)"/><rect x="60" y="126" width="80" height="14" rx="7" fill="${bw}"/><rect x="60" y="126" width="80" height="14" rx="7" fill="url(#gP)"/><ellipse cx="100" cy="128" rx="32" ry="3.500" fill="#5a4636"/></svg>`;
}
const S=['Зима','Весна','Лето','Осень'];
const R=[['w','Полив'],['l','Свет'],['t','Температура'],['f','Подкормка']];
const app=document.getElementById('app'),ttl=document.getElementById('ttl'),sub=document.getElementById('sub');
const cur=()=>{const m=new Date().getMonth();return m<2||m==11?0:m<5?1:m<8?2:3};
let season=cur();
const POTS=[[9,350],[12,800],[15,1500],[20,3500],[25,6000]];
const WF={tr:[.12,.16,.2,.14],hu:[.15,.2,.25,.17],md:[.13,.17,.21,.15],su:[.05,.08,.11,.06]};
function dose(ml){const step=ml<40?5:10;return Math.max(step,Math.round(ml/step)*step)}
function doses(k){const f=WF[k][season];return POTS.map(([d,v])=>[d,dose(v*f)])}
let waterOpen=false,feedOpen=false;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Срок из текста ухода («Раз в 10–14 дней», «Каждые 2 недели», «Раз в месяц») -> [мин, макс] в днях
const UNIT={'дн':1,'недел':7,'месяц':30};
function interval(txt){
  const m=/(?:раз в|каждые)\s+(?:(\d+)(?:–(\d+))?\s+)?(дн|недел|месяц)/i.exec(txt||'');
  if(!m)return null;
  const u=UNIT[m[3]];return [(+m[1]||1)*u,(+(m[2]||m[1])||1)*u];
}
// ok — рано, soon — пора, late — просрочено; null — нет отметки или в этот сезон не нужно
function state(p,kind){
  const v=Store.get(p.id,kind);if(!v)return null;
  const iv=interval(p.care[kind][cur()]);if(!iv)return null;
  const n=Store.daysAgo(v),hi=iv[1];
  return n<iv[0]?'ok':n<=hi+Math.max(1,Math.round(hi*.25))?'soon':'late';
}
const RANK={ok:0,soon:1,late:2};
const worst=(...s)=>s.filter(Boolean).sort((x,y)=>RANK[y]-RANK[x])[0]||'';
function status(p){
  return [['w','Полив'],['f','Корм']].map(([k,l])=>{
    const v=Store.get(p.id,k);
    return v?`<span class="chip ${state(p,k)||''}">${l}: ${Store.ago(v)}</span>`:'';
  }).join('');
}
function home(){
  const mine=P.filter(p=>Store.isMine(p.id));
  const tab=Store.tab(),list=tab==='mine'?mine:P;
  ttl.textContent='Цветы';
  sub.textContent=tab==='mine'?'Моих цветов: '+mine.length:'Всего в помещении: '+P.length;
  const cards=list.map(p=>{const st=status(p),s=worst(state(p,'w'),state(p,'f'));return `<button class="card" data-id="${p.id}"${s?' data-s="'+s+'"':''}><div class="art"><img src="${(p.photos||[])[0]||''}" alt="${esc(p.n)}">${Store.isMine(p.id)?'<i class="star" aria-label="В моих цветах">★</i>':''}</div><b>${p.n}</b>${st?'<div class="st">'+st+'</div>':''}</button>`}).join('');
  const legend='<p class="legend"><span class="chip ok">в норме</span><span class="chip soon">пора</span><span class="chip late">просрочено</span></p>';
  app.innerHTML=`<div class="tabs two" role="tablist"><button role="tab" aria-selected="${tab==='all'}" data-t="all">Все (${P.length})</button><button role="tab" aria-selected="${tab==='mine'}" data-t="mine">Мои цветы (${mine.length})</button></div>`+
    (list.length?legend+'<div class="grid">'+cards+'</div>':'<p class="empty">Пока пусто. Откройте цветок и нажмите «☆ В мои цветы».</p>');
  app.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{Store.setTab(b.dataset.t);home()});
  app.querySelectorAll('.card').forEach(b=>b.onclick=()=>{location.hash='#'+b.dataset.id});
}
function detail(p){
  ttl.textContent=p.n;sub.textContent=p.lat;
  const care=p.care;
  const draw=()=>{
    const d=[care.w[season],care.l[season],care.t[season],care.f[season]];
    app.querySelector('.tabs').innerHTML=S.map((s,i)=>`<button role="tab" aria-selected="${i==season}" data-i="${i}">${s}</button>`).join('');
    app.querySelector('.rows').innerHTML=R.map((r,i)=>{
      if(r[0]==='w'){
        const items=doses(p.k).map(([dmm,ml])=>`<li><span>Горшок ${dmm} см</span><b>${ml} мл</b></li>`).join('');
        const note=p.id==='drac'?'<p>Эти миллилитры — если растение сидит в земле. Если стебли стоят в вазе с водой, столько не лейте: воду просто меняют раз в неделю.</p>':'';
        return `<div class="row water"><button type="button" class="wbtn" data-fold="w" aria-expanded="${waterOpen}"><svg><use href="#i-w"/></svg><span class="txt"><small>Полив</small><span>${d[i]}</span></span><i class="chev" aria-hidden="true"></i></button><div class="wlist"${waterOpen?'':' hidden'}><ul>${items}</ul><p>Полить так, чтобы вода прошла через всю землю. Лишнюю из тарелки под горшком вылить.</p>${note}</div></div>`;
      }
      if(r[0]==='f'){
        const body=`<ul class="stack"><li><span>Чем</span>${care.what}</li><li><span>Как</span>${care.how}</li><li><span>В этот сезон</span>${d[i]}</li></ul>`;
        return `<div class="row water"><button type="button" class="wbtn" data-fold="f" aria-expanded="${feedOpen}"><svg><use href="#i-f"/></svg><span class="txt"><small>Подкормка</small><span>${d[i]}</span></span><i class="chev" aria-hidden="true"></i></button><div class="wlist"${feedOpen?'':' hidden'}>${body}</div></div>`;
      }
      return `<div class="row"><svg><use href="#i-${r[0]}"/></svg><div><small>${r[1]}</small><span>${d[i]}</span></div></div>`;
    }).join('');
    app.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{season=+b.dataset.i;draw()});
    app.querySelectorAll('.wbtn').forEach(b=>b.onclick=()=>{if(b.dataset.fold==='w')waterOpen=!waterOpen;else feedOpen=!feedOpen;draw()});
  };
  const ph=p.photos||[],vw=ph.map(u=>`<img src="${u}" alt="${p.n}">`).concat([art(p)]);
  app.innerHTML=`<button class="back">← Все цветы</button><div class="det"><div><div class="hero">${vw[0]}</div>${ph.length?'<div class="vs">'+vw.map((_,i)=>`<button data-v="${i}" aria-pressed="${i==0}">${i<ph.length?(ph.length>1?'Фото '+(i+1):'Фото'):'Рисунок'}</button>`).join('')+'</div>':''}</div><div><h2>${p.n}</h2><p class="lat">${p.lat}</p><button type="button" class="mine" aria-pressed="false"></button><div class="log"></div><p class="tip"><span class="lead">${care.about}</span><b>Любит.</b> ${care.like}<br><b>Не любит.</b> ${care.hate}<br><b>Проблемы.</b> ${care.ill}</p><div class="tabs" role="tablist"></div><div class="rows"></div></div></div><p class="tip srcs"><b>Источники</b>${care.src.map(([n,u])=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+n+'</a>').join('')}</p>`;
  app.querySelector('.back').onclick=()=>{location.hash=''};
  app.querySelectorAll('.vs button').forEach(b=>b.onclick=()=>{app.querySelector('.hero').innerHTML=vw[+b.dataset.v];app.querySelectorAll('.vs button').forEach(x=>x.setAttribute('aria-pressed',x===b))});
  const mineBtn=app.querySelector('.mine');
  const drawMine=()=>{const on=Store.isMine(p.id);mineBtn.setAttribute('aria-pressed',on);mineBtn.textContent=on?'★ В моих цветах':'☆ В мои цветы'};
  mineBtn.onclick=()=>{Store.toggleMine(p.id);drawMine()};
  const drawLog=()=>{
    const box=app.querySelector('.log'),today=Store.today();
    box.innerHTML=[['w','Последний полив','i-w'],['f','Последняя подкормка','i-f']].map(([k,label,ic])=>{
      const v=Store.get(p.id,k);
      const st=state(p,k)||'';
      return `<div class="lrow ${st}" data-k="${k}"><svg><use href="#${ic}"/></svg><div class="ltx"><small>${label}</small><b>${v?Store.ago(v):'не отмечено'}</b>${v?'<span>'+Store.fmt(v)+'</span>':''}</div><div class="lbt"><button type="button" data-a="now">Сегодня</button><input type="date" max="${today}" value="${v||''}" aria-label="${label}: дата">${v?'<button type="button" data-a="clr" aria-label="Сбросить">×</button>':''}</div></div>`}).join('');
    box.querySelectorAll('.lrow').forEach(r=>{
      const k=r.dataset.k;
      r.querySelector('[data-a=now]').onclick=()=>{Store.set(p.id,k,Store.today());drawLog()};
      r.querySelector('input').onchange=e=>{Store.set(p.id,k,e.target.value);drawLog()};
      const c=r.querySelector('[data-a=clr]');if(c)c.onclick=()=>{Store.set(p.id,k,null);drawLog()};
    });
  };
  drawMine();drawLog();
  draw();
}
function route(){const id=location.hash.slice(1),p=P.find(x=>x.id===id);p?detail(p):home();window.scrollTo(0,0)}
addEventListener('hashchange',route);
const root=document.documentElement;
try{const t=localStorage.getItem('theme');if(t)root.dataset.theme=t}catch(e){}
document.getElementById('th').onclick=()=>{
  const dark=root.dataset.theme?root.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches;
  root.dataset.theme=dark?'light':'dark';
  try{localStorage.setItem('theme',root.dataset.theme)}catch(e){}
};
route();
