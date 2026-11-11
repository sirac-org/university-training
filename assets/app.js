
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const PAGE=document.body.dataset.page||'home';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

  let LANG=store.get('ut-lang','ar'); if(!I18N[LANG]) LANG='ar';
  const T=()=>I18N[LANG];
  const t=(k,vars)=>{let s=T()[k]??I18N.ar[k]??k; if(vars) Object.keys(vars).forEach(v=>s=s.replace('{'+v+'}',vars[v])); return s};
  const name=(cat,id)=>(T()[cat]&&T()[cat][id])||(I18N.ar[cat]&&I18N.ar[cat][id])||id;
  const fmt=(n,d=0)=>Number(n).toLocaleString(T().locale,{minimumFractionDigits:d,maximumFractionDigits:d});
  const plur=(n,key)=>{const w=t(key);return (LANG==='en'&&n===1&&w.endsWith('s'))?w.slice(0,-1):w};
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  /* ---------- helpers on data ---------- */
  const byId=(arr,id)=>arr.find(x=>x.id===id);
  const lect=id=>byId(DATA.lecturers,id);
  const avatarColors=['#0E9594','#11686A','#F2542D','#8E44AD','#1F6FB2','#B03A5B','#C98A1C','#562C2C'];
  const avatarColor=id=>{let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))>>>0;return avatarColors[h%avatarColors.length]};
  const initials=id=>{const n=name('lecturers',id).replace('+','').trim().split(/\s+/);return (n[0]?.[0]||'')+(n[1]?.[0]||'')};
  const maxAvg=Math.max(...DATA.lecturers.map(l=>l.attendance/l.lectures));
  const rating=l=>{const r=Math.max(1,Math.min(5,(l.attendance/l.lectures)/maxAvg*5));return Math.round(r*2)/2};

  /* ---------- THEME ---------- */
  const root=document.documentElement;
  const savedTheme=store.get('ut-theme',null);
  if(savedTheme) root.setAttribute('data-theme',savedTheme);
  else if(window.matchMedia('(prefers-color-scheme: dark)').matches) root.setAttribute('data-theme','dark');
  $('#themeToggle').addEventListener('click',()=>{
    const next=root.getAttribute('data-theme')==='dark'?'light':'dark';
    root.setAttribute('data-theme',next); store.set('ut-theme',next);
    toast(next==='dark'?t('themeDark'):t('themeLight'));
    renderCharts(); renderCenterCharts(); if(modalChart){modalChart.destroy();modalChart=null;} if(modalOpenId) reopenModal();
  });

  let toastTimer; function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800)}

  /* ---------- LANGUAGE ---------- */
  function applyLang(){
    const d=T();
    root.setAttribute('lang',LANG); root.setAttribute('dir',d.dir);
    document.title=(PAGE==='home'?d.brandSub:t('tab'+PAGE[0].toUpperCase()+PAGE.slice(1)))+' — '+d.brand;
    $$('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n)});
    $$('[data-i18n-html]').forEach(el=>{el.innerHTML=t(el.dataset.i18nHtml)});
    $$('[data-i18n-ph]').forEach(el=>{el.placeholder=t(el.dataset.i18nPh)});
    $$('.lang-switch button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===LANG)));
    renderCentersTable(); renderCourses(); renderLecturers(); renderCenters(); renderCharts(); renderCenterCharts(); setNavLabels();
    if(modalOpenId) reopenModal();
  }
  $$('.lang-switch button').forEach(b=>b.addEventListener('click',()=>{LANG=b.dataset.lang;store.set('ut-lang',LANG);applyLang()}));

  /* ---------- NAV (multi-page) ---------- */
  $$('.tab').forEach(a=>a.setAttribute('aria-selected',String(a.dataset.tab===PAGE)));
  $$('.tab').forEach(a=>a.addEventListener('click',()=>closeDrawer()));

  /* ---------- SIDE NAV: collapse (desktop) / drawer (mobile) ---------- */
  const isDesktop=()=>window.matchMedia('(min-width:1024px)').matches;
  const resizeCharts=()=>setTimeout(()=>{Object.values(charts).forEach(c=>c.resize())},400);
  function setNavLabels(){
    $$('.tab').forEach(b=>{b.dataset.label=b.querySelector('span:not(.count)').textContent});
    const c=$('#navCollapse'), col=document.body.dataset.nav==='collapsed';
    c.querySelector('span').textContent=col?t('navExpand'):t('navCollapse'); c.title=col?t('navExpand'):t('navCollapse');
  }
  function applyNav(){
    if(isDesktop()) document.body.dataset.nav=store.get('ut-nav','open')==='collapsed'?'collapsed':'open';
    else document.body.dataset.nav='closed';
    setNavLabels(); resizeCharts();
    const act=$('.tab[aria-selected="true"]');
    if(act&&isDesktop()) setTimeout(()=>act.scrollIntoView({block:'nearest'}),80);
  }
  function closeDrawer(){ if(!isDesktop()){document.body.dataset.nav='closed';$('#navBurger').setAttribute('aria-expanded','false')} }
  $('#navCollapse').addEventListener('click',()=>{
    const col=document.body.dataset.nav!=='collapsed';
    document.body.dataset.nav=col?'collapsed':'open'; store.set('ut-nav',col?'collapsed':'open'); setNavLabels(); resizeCharts();
  });
  $('#navBurger').addEventListener('click',()=>{
    const open=document.body.dataset.nav!=='open';
    document.body.dataset.nav=open?'open':'closed'; $('#navBurger').setAttribute('aria-expanded',String(open));
  });
  $('#navOverlay').addEventListener('click',closeDrawer);
  $('#drawerClose').addEventListener('click',closeDrawer);
  window.matchMedia('(min-width:1024px)').addEventListener('change',applyNav);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});

  /* ---------- REVEAL ---------- */
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -40px 0px'});
  function observeReveals(){
    const els=$$('.reveal:not(.in)');
    els.forEach(el=>io.observe(el));
    // Safety net: never leave content hidden if the observer does not fire (older/in-app browsers)
    setTimeout(()=>els.forEach(el=>{const r=el.getBoundingClientRect();if(r.top<window.innerHeight+200)el.classList.add('in')}),900);
  }
  window.addEventListener('load',()=>setTimeout(()=>$$('.reveal').forEach(el=>{if(el.getBoundingClientRect().top<window.innerHeight)el.classList.add('in')}),1500));

  /* ---------- COUNTERS ---------- */
  const cio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){animateCount(e.target);cio.unobserve(e.target)}}),{threshold:.5});
  function animateCount(el){
    const target=parseFloat(el.dataset.count), dec=parseInt(el.dataset.decimals||'0');
    if(reduced){el.textContent=fmt(target,dec);return}
    const dur=1600, start=performance.now();
    const step=now=>{const p=Math.min(1,(now-start)/dur);const e=1-Math.pow(1-p,4);el.textContent=fmt(target*e,dec);if(p<1)requestAnimationFrame(step)};
    requestAnimationFrame(step);
  }
  function bindCounters(){$$('[data-count]').forEach(el=>{if(!el.dataset.bound){el.dataset.bound='1';cio.observe(el)}})}

  /* ---------- CENTERS TABLE ---------- */
  function renderCentersTable(){ if(!$('#centersTable')) return;
    const tot=DATA.totals.attendance;
    const rows=[...DATA.centers].sort((a,b)=>b.attendance-a.attendance);
    const totC=DATA.centers.reduce((s,c)=>s+c.courses,0);
    $('#centersTable').innerHTML=`
      <thead><tr><th>#</th><th>${t('thCenter')}</th><th>${t('thCourses')}</th><th>${t('thLectures')}</th><th>${t('thHours')}</th><th>${t('thAttend')}</th><th>${t('thShare')}</th></tr></thead>
      <tbody>${rows.map((c,i)=>{const sh=c.attendance/tot*100;return `<tr><td class="num">${fmt(i+1)}</td><td><b>${name('centers',c.id)}</b></td><td class="num">${fmt(c.courses)}</td><td class="num">${fmt(c.lectures)}</td><td class="num">${fmt(c.hours,2)}</td><td class="num"><b>${fmt(c.attendance)}</b></td>
        <td><div style="display:flex;align-items:center;gap:.6rem"><span class="meter"><i style="width:${sh.toFixed(1)}%"></i></span><span class="num" style="min-width:3.5em">${fmt(sh,1)}%</span></div></td></tr>`}).join('')}</tbody>
      <tfoot><tr><td></td><td>${t('thTotal')}</td><td class="num">${fmt(totC)}</td><td class="num">${fmt(DATA.totals.lectures)}</td><td class="num">${fmt(DATA.totals.hours,2)}</td><td class="num">${fmt(tot)}</td><td class="num">100%</td></tr></tfoot>`;
  }

  /* ---------- CHARTS ---------- */
  const charts={};
  function palette(){return [css('--c1'),css('--c2'),css('--c3'),css('--c4'),css('--c5'),css('--c6')]}
  function baseOpts(){
    const text=css('--text-2'), grid=css('--line'), isRTL=T().dir==='rtl';
    Chart.defaults.font.family=css('--font'); Chart.defaults.font.size=12; Chart.defaults.color=text;
    return {
      responsive:true,maintainAspectRatio:false,animation:reduced?false:{duration:900,easing:'easeOutQuart'},
      layout:{padding:{top:6}},
      plugins:{
        legend:{rtl:isRTL,textDirection:T().dir,labels:{usePointStyle:true,pointStyle:'rectRounded',boxWidth:10,padding:16,color:text,font:{weight:'700'}}},
        tooltip:{rtl:isRTL,textDirection:T().dir,backgroundColor:css('--espresso'),titleColor:'#fff',bodyColor:'#F5DFBB',padding:12,cornerRadius:10,displayColors:true,boxPadding:4,
          titleFont:{weight:'800',size:13},bodyFont:{size:12},
          callbacks:{label:c=>{const v=c.chart.options.indexAxis==='y'?c.parsed.x:c.parsed.y;return ` ${c.dataset.label?c.dataset.label+': ':''}${fmt(v, c.dataset._dec||0)}`}}}
      },
      scales:{x:{grid:{display:false},border:{display:false},ticks:{color:text}},y:{grid:{color:grid},border:{display:false,dash:[3,3]},ticks:{color:text,callback:v=>fmt(v)},beginAtZero:true}}
    };
  }
  function make(id,cfg){if(charts[id]){charts[id].destroy()}const c=$('#'+id);if(!c)return;charts[id]=new Chart(c,cfg)}
  function renderCharts(){
    if(!$('#chCenters')||typeof Chart==='undefined')return;
    const P=palette(), o=baseOpts(), surface=css('--surface');
    const centers=[...DATA.centers].sort((a,b)=>b.attendance-a.attendance);

    // 1) Attendance by center — single hue, direct labels via tooltip
    make('chCenters',{type:'bar',data:{labels:centers.map(c=>name('centers',c.id)),datasets:[{label:t('legendAttend'),data:centers.map(c=>c.attendance),backgroundColor:P[0],borderRadius:{topLeft:6,topRight:6},borderSkipped:'bottom',maxBarThickness:46}]},
      options:{...o,plugins:{...o.plugins,legend:{display:false}}}});

    // 2) General vs private — grouped bars (percent share of each measure)
    const gen=DATA.courses.filter(c=>c.type==='general'&&c.status==='completed'), pri=DATA.courses.filter(c=>c.type==='private');
    const sum=(a,k)=>a.reduce((s,c)=>s+c[k],0);
    const measures=['attendance','lectures','hours'], labels=[t('legendAttend'),t('legendLect'),t('legendHours')];
    make('chType',{type:'bar',data:{labels,datasets:[
        {label:t('general'),data:measures.map(k=>+(sum(gen,k)/(sum(gen,k)+sum(pri,k))*100).toFixed(1)),backgroundColor:P[0],borderRadius:6,borderSkipped:false,maxBarThickness:38,_dec:1},
        {label:t('private'),data:measures.map(k=>+(sum(pri,k)/(sum(gen,k)+sum(pri,k))*100).toFixed(1)),backgroundColor:P[1],borderRadius:6,borderSkipped:false,maxBarThickness:38,_dec:1}]},
      options:{...o,scales:{...o.scales,y:{...o.scales.y,max:100,ticks:{...o.scales.y.ticks,callback:v=>v+'%'}}},
        plugins:{...o.plugins,tooltip:{...o.plugins.tooltip,callbacks:{label:c=>` ${c.dataset.label}: ${fmt(c.parsed.y,1)}%`}}}}});

    // 3) Attendance by course — horizontal, color by type
    const cs=[...DATA.courses].sort((a,b)=>b.attendance-a.attendance);
    make('chCourses',{type:'bar',data:{labels:cs.map(c=>name('courses',c.id)),datasets:[{label:t('legendAttend'),data:cs.map(c=>c.attendance),
        backgroundColor:cs.map(c=>c.status==='ongoing'?P[1]+'99':c.type==='general'?P[0]:P[3]),borderColor:cs.map(c=>c.status==='ongoing'?P[1]:'transparent'),borderWidth:cs.map(c=>c.status==='ongoing'?2:0),borderDash:[4,3],borderRadius:6,borderSkipped:false,maxBarThickness:22}]},
      options:{...o,indexAxis:'y',scales:{x:{grid:{color:css('--line')},border:{display:false},ticks:{color:css('--text-2'),callback:v=>fmt(v)},beginAtZero:true},y:{grid:{display:false},border:{display:false},ticks:{color:css('--text-2'),font:{size:11,weight:'600'}}}},
        plugins:{...o.plugins,legend:{display:false},tooltip:{...o.plugins.tooltip,callbacks:{label:c=>{const course=cs[c.dataIndex];return ` ${fmt(c.parsed.x)} ${t('attendance')} · ${t(course.type)} · ${t(course.status)}`}}}}}});

    // 4) Hajj program — stacked by center per track
    const hajj=byId(DATA.courses,'hajj'), hc=['ittihad','burj','kashish','amtaliya'];
    make('chHajj',{type:'bar',data:{labels:hajj.tracks.map(tr=>name('spec',tr.key)),datasets:hc.map((cid,i)=>({label:name('centers',cid),
        data:hajj.tracks.map(tr=>hajj.rows.filter(r=>r.track===tr.key&&r.center===cid).reduce((s,r)=>s+r.attendance,0)),backgroundColor:P[i],borderColor:surface,borderWidth:1,borderRadius:3,maxBarThickness:48}))},
      options:{...o,scales:{x:{...o.scales.x,stacked:true},y:{...o.scales.y,stacked:true}}}});

    // 5) Hours vs lectures by center — two separate small bars sharing one axis (counts)
    const cc=[...DATA.centers].sort((a,b)=>b.lectures-a.lectures);
    make('chHoursLect',{type:'bar',data:{labels:cc.map(c=>name('centers',c.id)),datasets:[
        {label:t('legendLect'),data:cc.map(c=>c.lectures),backgroundColor:P[0],borderRadius:6,borderSkipped:false,maxBarThickness:30},
        {label:t('legendHours'),data:cc.map(c=>+c.hours.toFixed(1)),backgroundColor:P[2],borderRadius:6,borderSkipped:false,maxBarThickness:30,_dec:1}]},options:o});

    // 6) Top lecturers
    const tl=[...DATA.lecturers].filter(l=>!l.joint).sort((a,b)=>b.attendance-a.attendance).slice(0,8);
    make('chTopLect',{type:'bar',data:{labels:tl.map(l=>name('lecturers',l.id)),datasets:[{label:t('legendAttend'),data:tl.map(l=>l.attendance),backgroundColor:P[0],borderRadius:6,borderSkipped:false,maxBarThickness:20}]},
      options:{...o,indexAxis:'y',scales:{x:{grid:{color:css('--line')},border:{display:false},ticks:{color:css('--text-2'),callback:v=>fmt(v)},beginAtZero:true},y:{grid:{display:false},border:{display:false},ticks:{color:css('--text-2'),font:{size:11,weight:'600'}}}},
        plugins:{...o.plugins,legend:{display:false}}}});
  }

  /* ---------- COURSES ---------- */
  const state={q:'',filter:'all',sort:'default'};
  const ICONS={
    general:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3.2 9.8h17.6M3.2 14.2h17.6"/><path d="M12 3c2.6 3 2.6 15 0 18-2.6-3-2.6-15 0-18Z"/></svg>',
    private:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8 5 5.9v5.7c0 4.2 2.9 7.7 7 9.6 4.1-1.9 7-5.4 7-9.6V5.9l-7-3.1Z"/><path d="M9.4 12.1 11.3 14l3.4-3.6"/></svg>'
  };
  const ICON_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  const ICON_CLOCK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  function statusBadge(c){return c.status==='completed'?`<span class="badge badge-ok">${ICON_CHECK}${t('completed')}</span>`:`<span class="badge badge-warn">${ICON_CLOCK}${t('ongoing')}</span>`}
  function searchable(c){return [name('courses',c.id),I18N.ar.courses[c.id],I18N.en.courses[c.id],I18N.tr.courses[c.id],
      ...c.lecturers.flatMap(l=>[name('lecturers',l),I18N.ar.lecturers[l],I18N.en.lecturers[l]]),
      ...[...new Set(c.rows.map(r=>r.center))].flatMap(cid=>[name('centers',cid),I18N.ar.centers[cid],I18N.en.centers[cid]]),
      t(c.type),t(c.status),I18N.ar[c.type],I18N.ar[c.status]].join(' ').toLowerCase()}
  function filtered(){
    let arr=DATA.courses.filter(c=>{
      if(state.filter==='general'&&c.type!=='general')return false;
      if(state.filter==='private'&&c.type!=='private')return false;
      if(state.filter==='ongoing'&&c.status!=='ongoing')return false;
      if(state.q&&!searchable(c).includes(state.q))return false;
      return true});
    if(state.sort!=='default')arr=[...arr].sort((a,b)=>b[state.sort]-a[state.sort]);
    return arr;
  }
  function renderCourses(){
    const g=$('#coursesGrid'); if(!g) return; const arr=filtered();
    $('#resultsMeta').textContent=t('results',{n:fmt(arr.length),t:fmt(DATA.courses.length)});
    if(!arr.length){g.innerHTML=`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/></svg><h3 class="t-h3">${t('noResults')}</h3><p>${t('noResultsSub')}</p></div>`;return}
    g.innerHTML=arr.map((c,i)=>`
      <button type="button" class="card course-card reveal" data-delay="${(i%3)+1}" data-type="${c.type}" data-status="${c.status}" data-id="${c.id}" aria-haspopup="dialog">
        <div class="course-top">
          <div class="course-icon">${ICONS[c.type]}</div>
          <div class="badges">${statusBadge(c)}<span class="badge badge-type">${t(c.type)}</span></div>
        </div>
        <div>
          <h3>${name('courses',c.id)}</h3>
          <p class="course-desc">${name('courseDesc',c.id)}</p>
        </div>
        <div class="course-meta">
          <div><b class="num">${fmt(c.lectures)}</b><span>${t('lectures')}</span></div>
          <div><b class="num">${fmt(c.hours,1)}</b><span>${t('hours')}</span></div>
          <div><b class="num">${fmt(c.attendance)}</b><span>${t('attendance')}</span></div>
        </div>
        <div class="course-foot">
          <div style="display:flex;align-items:center;gap:.5rem">
            <div class="avatars">${c.lecturers.slice(0,4).map(l=>`<span class="avatar" style="background:${avatarColor(l)}" title="${name('lecturers',l)}">${initials(l)}</span>`).join('')}${c.lecturers.length>4?`<span class="avatar" style="background:var(--text-3)">+${c.lecturers.length-4}</span>`:''}</div>
            <span>${fmt(c.centers)} ${plur(c.centers,'centersN')}</span>
          </div>
          <span class="more">${t('details')}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></span>
        </div>
      </button>`).join('');
    $$('.course-card',g).forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.id)));
    observeReveals();
  }
  let debounce; if($('#searchInput')) $('#searchInput').addEventListener('input',e=>{clearTimeout(debounce);debounce=setTimeout(()=>{state.q=e.target.value.trim().toLowerCase();renderCourses()},120)});
  $$('#typeChips .chip').forEach(ch=>ch.addEventListener('click',()=>{state.filter=ch.dataset.filter;$$('#typeChips .chip').forEach(x=>x.setAttribute('aria-pressed',String(x===ch)));renderCourses()}));
  if($('#sortSelect')) $('#sortSelect').addEventListener('change',e=>{state.sort=e.target.value;renderCourses()});

  /* ---------- MODAL ---------- */
  let modalChart=null, modalOpenId=null, modalKind='course', lastFocus=null;
  const MODALS={center:(id,r)=>openCenterModal(id,r),lecturer:(id,r)=>openLecturerModal(id,r),course:(id,r)=>openModal(id,r)};
  function reopenModal(){ MODALS[modalKind](modalOpenId,true) }
  function showModalShell(){const m=$('#modal'); m.classList.add('open'); m.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; if(modalChart){modalChart.destroy();modalChart=null}}
  function openCenterModal(id,rerender){
    const c=byId(DATA.centers,id); if(!c)return;
    modalOpenId=id; modalKind='center'; if(!rerender) lastFocus=document.activeElement;
    const P=palette();
    const list=DATA.courses.map(co=>{const rows=co.rows.filter(r=>r.center===id);if(!rows.length)return null;return {co,lectures:rows.reduce((s,r)=>s+r.lectures,0),hours:rows.reduce((s,r)=>s+r.hours,0),attendance:rows.reduce((s,r)=>s+r.attendance,0),lect:[...new Set(rows.map(r=>r.lecturer))]}}).filter(Boolean).sort((a,b)=>b.attendance-a.attendance);
    const lects=[...new Set(list.flatMap(x=>x.lect))];
    const share=c.attendance/DATA.totals.attendance*100;
    $('#modalBadges').innerHTML=`<span class="badge badge-type">${fmt(share,1)}% ${t('shareOf')}</span>`;
    $('#modalTitle').textContent=name('centers',c.id);
    $('#modalSub').textContent=`${fmt(c.courses)} ${t('coursesN')} · ${fmt(c.lectures)} ${t('lectures')} · ${fmt(c.hours,2)} ${t('hours')} · ${fmt(c.attendance)} ${t('attendance')}`;
    const hasOngoing=list.some(x=>x.co.status==='ongoing');
    $('#modalBody').innerHTML=`
      <div class="modal-stats">
        <div><b class="num">${fmt(c.courses)}</b><span>${t('thCourses')}</span></div>
        <div><b class="num">${fmt(c.lectures)}</b><span>${t('lectures')}</span></div>
        <div><b class="num">${fmt(c.hours,2)}</b><span>${t('hours')}</span></div>
        <div><b class="num">${fmt(c.attendance)}</b><span>${t('attendance')}</span></div>
      </div>
      <div class="modal-section"><h4>${t('mCenterLect')}</h4><div class="tags">${lects.map(l=>`<span class="tag" style="display:inline-flex;align-items:center;gap:.4rem"><span class="avatar" style="background:${avatarColor(l)};margin:0;width:24px;height:24px;font-size:.6rem;border:0">${initials(l)}</span>${name('lecturers',l)}</span>`).join('')}</div></div>
      <div class="modal-section"><h4>${t('chCourses')}</h4><div class="chart-box"><canvas id="modalChart"></canvas></div></div>
      <div class="modal-section"><h4>${t('mCourses')}</h4><div class="table-wrap"><table>
        <thead><tr><th>${t('thCourse')}</th><th>${t('thStatus')}</th><th>${t('thLecturer')}</th><th>${t('thLectures')}</th><th>${t('thHours')}</th><th>${t('thAttend')}</th></tr></thead>
        <tbody>${list.map(x=>`<tr><td><b>${name('courses',x.co.id)}</b> <span class="badge badge-type" style="font-size:.65rem">${t(x.co.type)}</span></td><td>${statusBadge(x.co)}</td><td>${x.lect.map(l=>name('lecturers',l)).join('، ')}</td><td class="num">${fmt(x.lectures)}</td><td class="num">${fmt(x.hours,2)}</td><td class="num">${fmt(x.attendance)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="3">${t('thTotal')} (${t('completed')})</td><td class="num">${fmt(c.lectures)}</td><td class="num">${fmt(c.hours,2)}</td><td class="num">${fmt(c.attendance)}</td></tr></tfoot>
      </table></div>${hasOngoing?`<p class="t-muted" style="margin-top:.6rem;font-size:.8rem">${t('centerOngoingNote')}</p>`:''}</div>`;
    showModalShell();
    if(typeof Chart!=='undefined'){
      const o=baseOpts();
      modalChart=new Chart($('#modalChart'),{type:'bar',data:{labels:list.map(x=>name('courses',x.co.id)),datasets:[{label:t('legendAttend'),data:list.map(x=>x.attendance),backgroundColor:list.map(x=>x.co.status==='ongoing'?P[1]:P[0]),borderRadius:6,borderSkipped:false,maxBarThickness:40}]},
        options:{...o,indexAxis:'y',scales:{x:{grid:{color:css('--line')},border:{display:false},ticks:{color:css('--text-2'),callback:v=>fmt(v)},beginAtZero:true},y:{grid:{display:false},border:{display:false},ticks:{color:css('--text-2'),font:{size:11,weight:'600'}}}},plugins:{...o.plugins,legend:{display:false}}}});
    }
    if(!rerender) $('.modal-close').focus();
  }
  function openModal(id,rerender){
    const c=byId(DATA.courses,id); if(!c)return;
    modalOpenId=id; modalKind='course'; if(!rerender) lastFocus=document.activeElement;
    const P=palette();
    const centersAgg={}; c.rows.forEach(r=>{centersAgg[r.center]=centersAgg[r.center]||{lectures:0,hours:0,attendance:0};centersAgg[r.center].lectures+=r.lectures;centersAgg[r.center].hours+=r.hours;centersAgg[r.center].attendance+=r.attendance});
    const centerIds=Object.keys(centersAgg).sort((a,b)=>centersAgg[b].attendance-centersAgg[a].attendance);
    const groups=[...new Set(c.rows.map(r=>r.group).filter(Boolean))];
    $('#modalBadges').innerHTML=statusBadge(c)+`<span class="badge badge-type">${t(c.type)}</span>`;
    $('#modalTitle').textContent=name('courses',c.id);
    $('#modalSub').textContent=name('courseDesc',c.id);
    const hasTrack=!!c.tracks;
    $('#modalBody').innerHTML=`
      ${c.status==='ongoing'?`<div class="note" style="margin:0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg><span>${t('kahfNote')}</span></div>`:''}
      <div class="modal-stats">
        <div><b class="num">${fmt(c.lectures)}</b><span>${t('lectures')}</span></div>
        <div><b class="num">${fmt(c.hours,2)}</b><span>${t('hours')}</span></div>
        <div><b class="num">${fmt(c.attendance)}</b><span>${t('attendance')}</span></div>
        <div><b class="num">${fmt(c.centers)}</b><span>${t('centersN')}</span></div>
      </div>
      <div class="modal-section"><h4>${t('mOverview')}</h4>
        <ul class="info-list" style="padding:0;margin:0">
          <li><span>${t('mType')}</span><b>${t(c.type)}</b></li>
          <li><span>${t('mStatus')}</span><b>${t(c.status)}</b></li>
          <li><span>${t('mAvg')}</span><b class="num">${fmt(c.attendance/c.lectures,1)}</b></li>
          <li><span>${t('mAvgH')}</span><b class="num">${fmt(c.hours/c.lectures*60,0)} ${LANG==='ar'?'دقيقة':LANG==='tr'?'dk':'min'}</b></li>
        </ul></div>
      <div class="modal-section"><h4>${t('mLecturers')}</h4><div class="tags">${c.lecturers.map(l=>`<span class="tag" style="display:inline-flex;align-items:center;gap:.4rem"><span class="avatar" style="background:${avatarColor(l)};margin:0;width:24px;height:24px;font-size:.6rem;border:0">${initials(l)}</span>${name('lecturers',l)}</span>`).join('')}</div></div>
      ${groups.length?`<div class="modal-section"><h4>${t('mGroups')}</h4><div class="tags">${groups.map(g=>`<span class="tag">${name('groups',g)}</span>`).join('')}</div></div>`:''}
      ${hasTrack?`<div class="modal-section"><h4>${t('mTracks')}</h4><div class="track-list">${c.tracks.map((tr,i)=>`<div class="track"><i style="background:${P[i%6]}"></i><b>${name('spec',tr.key)}</b><span>${name('lecturers',tr.lecturer)} · ${fmt(tr.lectures)} ${t('lectures')} · ${fmt(tr.hours,1)} ${t('hours')} · ${fmt(tr.attendance)} ${t('attendance')}</span></div>`).join('')}</div></div>`:''}
      <div class="modal-section"><h4>${t('mChart')}</h4><div class="chart-box"><canvas id="modalChart"></canvas></div></div>
      <div class="modal-section"><h4>${t('mRows')}</h4><div class="table-wrap"><table>
        <thead><tr>${hasTrack?`<th>${t('thTrack')}</th>`:''}<th>${t('thLecturer')}</th>${groups.length?`<th>${t('thGroup')}</th>`:''}<th>${t('thCenter')}</th><th>${t('thLectures')}</th><th>${t('thHours')}</th><th>${t('thAttend')}</th></tr></thead>
        <tbody>${c.rows.map(r=>`<tr>${hasTrack?`<td>${name('spec',r.track)}</td>`:''}<td><b>${name('lecturers',r.lecturer)}</b></td>${groups.length?`<td>${name('groups',r.group)}</td>`:''}<td>${name('centers',r.center)}</td><td class="num">${fmt(r.lectures)}</td><td class="num">${fmt(r.hours,2)}</td><td class="num">${fmt(r.attendance)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="${(hasTrack?1:0)+(groups.length?1:0)+2}">${t('thTotal')}</td><td class="num">${fmt(c.lectures)}</td><td class="num">${fmt(c.hours,2)}</td><td class="num">${fmt(c.attendance)}</td></tr></tfoot>
      </table></div></div>`;
    showModalShell();
    if(typeof Chart!=='undefined'){
      const o=baseOpts();
      modalChart=new Chart($('#modalChart'),{type:'bar',data:{labels:centerIds.map(cid=>name('centers',cid)),datasets:[{label:t('legendAttend'),data:centerIds.map(cid=>centersAgg[cid].attendance),backgroundColor:c.status==='ongoing'?P[1]:P[0],borderRadius:6,borderSkipped:false,maxBarThickness:52}]},
        options:{...o,plugins:{...o.plugins,legend:{display:false}}}});
    }
    if(!rerender) $('.modal-close').focus();
  }
  function closeModal(){const m=$('#modal');m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.style.overflow='';modalOpenId=null;if(modalChart){modalChart.destroy();modalChart=null}if(lastFocus)lastFocus.focus()}
  $$('[data-close]').forEach(el=>el.addEventListener('click',closeModal));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modalOpenId)closeModal()});

  /* ---------- LECTURERS ---------- */
  /* ---------- LECTURERS ---------- */
  function lecturerRows(id){
    const out=[];
    DATA.courses.forEach(co=>co.rows.filter(r=>r.lecturer===id).forEach(r=>out.push({co,...r})));
    return out;
  }
  function lecturerProfile(id){
    const rows=lecturerRows(id), done=rows.filter(r=>r.co.status==='completed');
    const byCourse={}; rows.forEach(r=>{const k=r.co.id;(byCourse[k]=byCourse[k]||{co:r.co,lectures:0,hours:0,attendance:0,centers:new Set()});
      byCourse[k].lectures+=r.lectures;byCourse[k].hours+=r.hours;byCourse[k].attendance+=r.attendance;byCourse[k].centers.add(r.center)});
    return {rows,done,byCourse:Object.values(byCourse).sort((a,b)=>b.attendance-a.attendance),
            centers:[...new Set(done.map(r=>r.center))], allCenters:[...new Set(rows.map(r=>r.center))]};
  }
  function renderLecturers(){
    if(!$('#lecturersGrid')) return;
    const sorted=[...DATA.lecturers].sort((a,b)=>b.attendance-a.attendance);
    if($('#lectCount')) $('#lectCount').textContent=fmt(DATA.lecturers.length);
    $('#lecturersGrid').innerHTML=sorted.map((l,i)=>{
      const avg=l.attendance/l.lectures, pf=lecturerProfile(l.id);
      return `
      <button type="button" class="card lect-card reveal" data-delay="${(i%3)+1}" data-id="${l.id}" aria-haspopup="dialog">
        ${i<3?`<span class="rank">${i===0?t('topRank'):t('rankN',{n:fmt(i+1)})}</span>`:''}
        <div class="lect-top">
          <div class="lect-avatar" style="background:linear-gradient(135deg,${avatarColor(l.id)},${avatarColor(l.id)}cc)">${initials(l.id)}</div>
          <div><div class="lect-name">${name('lecturers',l.id)}</div><div class="lect-role">${l.joint?t('joint')+' · ':''}${fmt(l.courses)} ${LANG==='ar'?(l.courses>1?'دورتان':'دورة'):LANG==='tr'?'kurs':(l.courses>1?'courses':'course')} · ${fmt(pf.centers.length)} ${plur(pf.centers.length,'centersN')}</div></div>
        </div>
        <div class="tags">${l.spec.map(sp=>`<span class="tag">${name('spec',sp)}</span>`).join('')}</div>
        <div class="lect-bar"><span class="t-muted">${t('avgPerLecture',{n:fmt(avg,1)})}</span><span class="meter"><i style="width:${(avg/maxAvg*100).toFixed(1)}%"></i></span></div>
        <div class="lect-stats">
          <div><b class="num">${fmt(l.courses)}</b><span>${t('thCourses')}</span></div>
          <div><b class="num">${fmt(l.lectures)}</b><span>${t('thLectures')}</span></div>
          <div><b class="num">${fmt(l.hours,1)}</b><span>${t('thHours')}</span></div>
          <div><b class="num">${fmt(l.attendance)}</b><span>${t('thAttend')}</span></div>
        </div>
        <div class="course-foot"><span></span><span class="more">${t('details')}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></span></div>
      </button>`}).join('');
    $$('.lect-card').forEach(b=>b.addEventListener('click',()=>openLecturerModal(b.dataset.id)));
    observeReveals();
  }

  function openLecturerModal(id,rerender){
    const l=lect(id); if(!l)return;
    modalOpenId=id; modalKind='lecturer'; if(!rerender) lastFocus=document.activeElement;
    const P=palette(), pf=lecturerProfile(id);
    const rank=[...DATA.lecturers].sort((a,b)=>b.attendance-a.attendance).findIndex(x=>x.id===id)+1;
    const avg=l.attendance/l.lectures, hasOngoing=pf.rows.some(r=>r.co.status==='ongoing');
    $('#modalBadges').innerHTML=`<span class="badge badge-type">${rank===1?t('topRank'):t('rankN',{n:fmt(rank)})}</span>`+(l.joint?`<span class="badge badge-type">${t('joint')}</span>`:'');
    $('#modalTitle').textContent=name('lecturers',id);
    $('#modalSub').textContent=l.spec.map(sp=>name('spec',sp)).join(' · ');
    $('#modalBody').innerHTML=`
      <div class="modal-section"><h4>${t('mGeneral')}</h4>
        <ul class="info-list" style="padding:0;margin:0">
          <li><span>${t('mSpecialties')}</span><b>${l.spec.map(sp=>name('spec',sp)).join('، ')}</b></li>
          <li><span>${t('mCoursesTaught')}</span><b>${pf.byCourse.filter(x=>x.co.status==='completed').map(x=>name('courses',x.co.id)).join('، ')}</b></li>
          <li><span>${t('mCentersWorked')}</span><b>${pf.centers.map(c=>name('centers',c)).join('، ')}</b></li>
          <li><span>${t('mAvg')}</span><b class="num">${fmt(avg,1)}</b></li>
        </ul></div>
      <div class="modal-section"><h4>${t('mNumbers')}</h4>
        <div class="modal-stats">
          <div><b class="num">${fmt(l.courses)}</b><span>${t('thCourses')}</span></div>
          <div><b class="num">${fmt(l.lectures)}</b><span>${t('lectures')}</span></div>
          <div><b class="num">${fmt(l.hours,2)}</b><span>${t('hours')}</span></div>
          <div><b class="num">${fmt(l.attendance)}</b><span>${t('attendance')}</span></div>
        </div></div>
      <div class="modal-section"><h4>${t('mByCourse')}</h4><div class="chart-box"><canvas id="modalChart"></canvas></div></div>
      <div class="modal-section"><h4>${t('mDetails')}</h4><div class="table-wrap"><table>
        <thead><tr><th>${t('thCourse')}</th><th>${t('thStatus')}</th><th>${t('thCenter')}</th><th>${t('thLectures')}</th><th>${t('thHours')}</th><th>${t('thAttend')}</th></tr></thead>
        <tbody>${pf.rows.map(r=>`<tr><td><b>${name('courses',r.co.id)}</b></td><td>${statusBadge(r.co)}</td><td>${name('centers',r.center)}</td><td class="num">${fmt(r.lectures)}</td><td class="num">${fmt(r.hours,2)}</td><td class="num">${fmt(r.attendance)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="3">${t('thTotal')} (${t('completed')})</td><td class="num">${fmt(l.lectures)}</td><td class="num">${fmt(l.hours,2)}</td><td class="num">${fmt(l.attendance)}</td></tr></tfoot>
      </table></div>${hasOngoing?`<p class="t-muted" style="margin-top:.6rem;font-size:.8rem">${t('lectOngoingNote')}</p>`:''}</div>`;
    showModalShell();
    if(typeof Chart!=='undefined'){
      const o=baseOpts();
      modalChart=new Chart($('#modalChart'),{type:'bar',data:{labels:pf.byCourse.map(x=>name('courses',x.co.id)),
        datasets:[{label:t('legendAttend'),data:pf.byCourse.map(x=>x.attendance),backgroundColor:pf.byCourse.map(x=>x.co.status==='ongoing'?P[1]:P[0]),borderRadius:6,borderSkipped:false,maxBarThickness:34}]},
        options:{...o,indexAxis:'y',scales:{x:{grid:{color:css('--line')},border:{display:false},ticks:{color:css('--text-2'),callback:v=>fmt(v)},beginAtZero:true},y:{grid:{display:false},border:{display:false},ticks:{color:css('--text-2'),font:{size:11,weight:'600'}}}},plugins:{...o.plugins,legend:{display:false}}}});
    }
    if(!rerender) $('.modal-close').focus();
  }

  /* ---------- CENTERS ---------- */
  const centerColors={ittihad:'#0E9594',burj:'#F2542D',kashish:'#8E44AD',amtaliya:'#C98A1C',alijamal:'#1F6FB2',issawiya:'#B03A5B'};
  function renderCenters(){
    if(!$('#centersGrid')) return; const sorted=[...DATA.centers].sort((a,b)=>b.attendance-a.attendance);
    $('#centersGrid').innerHTML=sorted.map((c,i)=>{const sh=c.attendance/DATA.totals.attendance*100;const lects=new Set(DATA.courses.flatMap(co=>co.rows.filter(r=>r.center===c.id&&co.status==='completed').map(r=>r.lecturer)));return `
      <button type="button" class="card center-card reveal" data-delay="${(i%3)+1}" data-id="${c.id}" aria-haspopup="dialog">
        <span class="ring" style="background:radial-gradient(circle,${centerColors[c.id]}26,transparent 70%)"></span>
        <div class="center-head">
          <div class="center-icon" style="background:linear-gradient(135deg,${centerColors[c.id]},${centerColors[c.id]}bb)">${fmt(i+1)}</div>
          <div><h3>${name('centers',c.id)}</h3><div class="t-muted">${fmt(lects.size)} ${plur(lects.size,'lecturersN')} · ${fmt(c.courses)} ${plur(c.courses,'coursesN')}</div></div>
        </div>
        <div class="center-share"><span class="meter"><i style="width:${sh.toFixed(1)}%;background:${centerColors[c.id]}"></i></span><span class="num">${fmt(sh,1)}%</span></div>
        <div class="center-meta">
          <div><b class="num">${fmt(c.courses)}</b><span>${t('thCourses')}</span></div>
          <div><b class="num">${fmt(c.lectures)}</b><span>${t('thLectures')}</span></div>
          <div><b class="num">${fmt(c.hours,1)}</b><span>${t('thHours')}</span></div>
          <div><b class="num">${fmt(c.attendance)}</b><span>${t('thAttend')}</span></div>
        </div>
        <div class="course-foot"><span></span><span class="more">${t('details')}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></span></div>
      </button>`}).join('');
    $$('.center-card').forEach(b=>b.addEventListener('click',()=>openCenterModal(b.dataset.id)));
    observeReveals();
  }
  function renderCenterCharts(){
    if(!$('#chCenterCourses')||typeof Chart==='undefined')return;
    const o=baseOpts(), P=palette();
    const cs=[...DATA.centers].sort((a,b)=>b.courses-a.courses);
    make('chCenterCourses',{type:'bar',data:{labels:cs.map(c=>name('centers',c.id)),datasets:[{label:t('thCourses'),data:cs.map(c=>c.courses),backgroundColor:cs.map(c=>centerColors[c.id]),borderRadius:6,borderSkipped:false,maxBarThickness:44}]},options:{...o,plugins:{...o.plugins,legend:{display:false}}}});
    const ca=[...DATA.centers].sort((a,b)=>b.attendance/b.lectures-a.attendance/a.lectures);
    make('chCenterAvg',{type:'bar',data:{labels:ca.map(c=>name('centers',c.id)),datasets:[{label:t('sAvg'),data:ca.map(c=>+(c.attendance/c.lectures).toFixed(1)),backgroundColor:P[0],borderRadius:6,borderSkipped:false,maxBarThickness:44,_dec:1}]},options:{...o,plugins:{...o.plugins,legend:{display:false}}}});
  }

  /* ---------- GLOBAL SEARCH + DEEP LINKS ---------- */
  const PAGE_OF={course:'courses',lecturer:'lecturers',center:'centers'};
  const PREFIX={course:'c-',lecturer:'l-',center:'m-'};
  function openEntity(kind,id){
    if(PAGE_OF[kind]===PAGE){ MODALS[kind](id,false); return }
    location.href=PAGE_OF[kind]+'.html#'+PREFIX[kind]+id;
  }
  function toTop(){
    try{window.scrollTo(0,0)}catch(e){}
    document.documentElement.scrollTop=0; document.body.scrollTop=0;
  }
  function initDeepLink(){
    if('scrollRestoration' in history) history.scrollRestoration='manual';
    toTop(); requestAnimationFrame(toTop); setTimeout(toTop,60); setTimeout(toTop,300);
    window.addEventListener('pageshow',toTop);
    const h=(location.hash||'').replace('#','');
    if(!h) return;
    for(const k in PREFIX){ if(h.startsWith(PREFIX[k])&&PAGE_OF[k]===PAGE){ setTimeout(()=>MODALS[k](h.slice(PREFIX[k].length),false),260); return } }
  }
  function searchIndex(){
    const out=[];
    DATA.courses.forEach(c=>out.push({kind:'course',id:c.id,title:name('courses',c.id),
      sub:`${t(c.type)} · ${fmt(c.lectures)} ${t('lectures')} · ${fmt(c.attendance)} ${t('attendance')}`,
      hay:[name('courses',c.id),I18N.ar.courses[c.id],I18N.en.courses[c.id],I18N.tr.courses[c.id],name('courseDesc',c.id),
           ...c.lecturers.map(x=>name('lecturers',x)),...c.lecturers.map(x=>I18N.ar.lecturers[x])].join(' ').toLowerCase()}));
    DATA.lecturers.forEach(l=>out.push({kind:'lecturer',id:l.id,title:name('lecturers',l.id),
      sub:`${l.spec.map(sp=>name('spec',sp)).join(' · ')} · ${fmt(l.attendance)} ${t('attendance')}`,
      hay:[name('lecturers',l.id),I18N.ar.lecturers[l.id],I18N.en.lecturers[l.id],I18N.tr.lecturers[l.id],
           ...l.spec.map(sp=>name('spec',sp)),...l.spec.map(sp=>I18N.ar.spec[sp])].join(' ').toLowerCase()}));
    DATA.centers.forEach(c=>out.push({kind:'center',id:c.id,title:name('centers',c.id),
      sub:`${fmt(c.courses)} ${t('coursesN')} · ${fmt(c.lectures)} ${t('lectures')} · ${fmt(c.attendance)} ${t('attendance')}`,
      hay:[name('centers',c.id),I18N.ar.centers[c.id],I18N.en.centers[c.id],I18N.tr.centers[c.id]].join(' ').toLowerCase()}));
    return out;
  }
  const SEARCH_ICON={
    course:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 9.5 12 4.5 2 9.5l10 5 10-5Z"/><path d="M6.5 11.8V17c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-5.2"/></svg>',
    lecturer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.6" r="2.6" fill="currentColor" stroke="none"/><path d="M12 7.6V13"/><path d="M6.6 10.4h10.8"/><path d="M8.2 21 12 13l3.8 8"/></svg>',
    center:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 21h19"/><path d="M6 21V5.6a1 1 0 0 1 .6-.9l5-2.1a1 1 0 0 1 1.4.9V21"/><path d="M13 10.6h4.4a1 1 0 0 1 1 1V21"/></svg>'};
  const KIND_LABEL={course:'tabCourses',lecturer:'tabLecturers',center:'tabCenters'};
  let searchHits=[], searchSel=0;
  function renderSearch(q){
    const box=$('#searchResults'); q=(q||'').trim().toLowerCase();
    const all=searchIndex();
    if(q){
      const ORDER={lecturer:0,course:1,center:2};
      searchHits=all.filter(x=>x.hay.includes(q)).map(x=>{
        const tl=x.title.toLowerCase();
        return {...x,_s:tl===q?0:tl.startsWith(q)?1:tl.includes(q)?2:3};
      }).sort((a,b)=>a._s-b._s||ORDER[a.kind]-ORDER[b.kind]).slice(0,24);
    } else searchHits=all.filter(x=>x.kind==='course').slice(0,6);
    searchSel=0;
    if(!searchHits.length){ box.innerHTML=`<div class="search-empty">${t('noResults')}</div>`; return }
    searchHits.sort((a,b)=>({lecturer:0,course:1,center:2})[a.kind]-({lecturer:0,course:1,center:2})[b.kind]||(a._s||0)-(b._s||0));
    let html='',last=null;
    searchHits.forEach((x,i)=>{
      if(x.kind!==last){ html+=`<div class="search-group">${t(KIND_LABEL[x.kind])}</div>`; last=x.kind }
      html+=`<button type="button" class="search-item${i===0?' sel':''}" data-i="${i}" data-kind="${x.kind}" data-id="${x.id}">
        <span class="si-ic">${SEARCH_ICON[x.kind]}</span>
        <span class="si-tx"><b>${x.title}</b><span>${x.sub}</span></span>
        <svg class="si-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>`;
    });
    box.innerHTML=html;
    $$('.search-item',box).forEach(b=>b.addEventListener('click',()=>{closeSearch();openEntity(b.dataset.kind,b.dataset.id)}));
  }
  function moveSel(d){
    const items=$$('.search-item'); if(!items.length)return;
    searchSel=(searchSel+d+items.length)%items.length;
    items.forEach((b,i)=>b.classList.toggle('sel',i===searchSel));
    items[searchSel].scrollIntoView({block:'nearest'});
  }
  function openSearch(){
    const m=$('#searchModal'); m.classList.add('open'); m.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden'; $('#searchInput2').value=''; renderSearch('');
    setTimeout(()=>$('#searchInput2').focus(),30);
  }
  function closeSearch(){
    const m=$('#searchModal'); m.classList.remove('open'); m.setAttribute('aria-hidden','true');
    if(!modalOpenId) document.body.style.overflow='';
  }
  $('#searchTrigger').addEventListener('click',openSearch);
  $$('[data-close-search]').forEach(el=>el.addEventListener('click',closeSearch));
  let sdeb; $('#searchInput2').addEventListener('input',e=>{clearTimeout(sdeb);sdeb=setTimeout(()=>renderSearch(e.target.value),110)});
  $('#searchInput2').addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'){e.preventDefault();moveSel(1)}
    else if(e.key==='ArrowUp'){e.preventDefault();moveSel(-1)}
    else if(e.key==='Enter'){const b=$$('.search-item')[searchSel];if(b){closeSearch();openEntity(b.dataset.kind,b.dataset.id)}}
  });
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#searchModal').classList.contains('open')?closeSearch():openSearch()}
    else if(e.key==='Escape'&&$('#searchModal').classList.contains('open')){closeSearch()}
  });


  /* ---------- MISC ---------- */
  const bt=$('#backTop'); window.addEventListener('scroll',()=>bt.classList.toggle('show',window.scrollY>600),{passive:true});
  bt.addEventListener('click',()=>window.scrollTo({top:0,behavior:reduced?'auto':'smooth'}));
  window.addEventListener('resize',()=>{Object.values(charts).forEach(c=>c.resize())});

  /* ---------- INIT ---------- */
  applyNav(); applyLang(); bindCounters(); observeReveals(); initDeepLink();
})();
