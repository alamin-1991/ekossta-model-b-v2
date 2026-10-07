const $=id=>document.getElementById(id);
const state={apiUrl:localStorage.getItem('ekossta_model_b_api_url')||'',dark:localStorage.getItem('ekossta_model_b_dark')==='1',token:sessionStorage.getItem('ekossta_v2_token')||'',user:JSON.parse(sessionStorage.getItem('ekossta_v2_user')||'null')};

function isDesktopSidebar_(){
  return window.matchMedia('(min-width: 769px)').matches;
}

function isDesktopDropdown_(){
  return window.matchMedia('(min-width: 1025px)').matches;
}

function closeSidebarPopups_(except=null){
  document.querySelectorAll('.nav-group.desktop-popup-open').forEach(group=>{
    if(group!==except){
      group.classList.remove('desktop-popup-open');
      group.classList.remove('open');
      const toggle=group.querySelector(':scope > .nav-group-toggle');
      if(toggle)toggle.setAttribute('aria-expanded','false');
    }
  });
}

function positionSidebarPopup_(group){
  if(!group || !isDesktopSidebar_())return;
  const toggle=group.querySelector(':scope > .nav-group-toggle');
  const menu=group.querySelector(':scope > .nav-submenu');
  if(!toggle || !menu)return;
  const r=toggle.getBoundingClientRect();
  const gap=8;
  const width=Math.min(260, Math.max(220, window.innerWidth-r.right-gap-14));
  const maxHeight=Math.max(220, window.innerHeight-24);
  menu.style.left=Math.round(r.right+gap)+'px';
  menu.style.top=Math.round(Math.max(12, Math.min(r.top, window.innerHeight-maxHeight-12)))+'px';
  menu.style.width=Math.round(width)+'px';
  menu.style.maxHeight=Math.round(maxHeight)+'px';
}

function setupNavigation(){
  const buttons=[...document.querySelectorAll('.nav-item[data-page]')];
  buttons.forEach(btn=>btn.addEventListener('click',()=>{
    showPage(btn.dataset.page);
    if(isDesktopSidebar_())closeSidebarPopups_();
  }));

  document.querySelectorAll('[data-page-jump]').forEach(btn=>{
    btn.addEventListener('click',()=>showPage(btn.dataset.pageJump));
  });

  document.querySelectorAll('.nav-group-toggle').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const group=btn.closest('.nav-group');
      if(!group)return;
      if(isDesktopSidebar_() && !isDesktopDropdown_()){
        const opening=!group.classList.contains('desktop-popup-open');
        closeSidebarPopups_(opening?group:null);
        group.classList.toggle('desktop-popup-open',opening);
        group.classList.toggle('open',opening);
        btn.setAttribute('aria-expanded',opening?'true':'false');
        if(opening)requestAnimationFrame(()=>positionSidebarPopup_(group));
      }else{
        const open=group.classList.toggle('open');
        btn.setAttribute('aria-expanded',open?'true':'false');
      }
    });
  });

  setupMobileMenu_();

  document.addEventListener('click',e=>{
    if(isDesktopSidebar_() && !e.target.closest('#sidebar'))closeSidebarPopups_();
  });

  window.addEventListener('resize',()=>{
    if(isDesktopSidebar_()){
      document.querySelectorAll('.nav-group.desktop-popup-open').forEach(positionSidebarPopup_);
    }else{
      document.querySelectorAll('.nav-submenu').forEach(m=>{m.style.left='';m.style.top='';m.style.width='';m.style.maxHeight=''});
      document.querySelectorAll('.nav-group').forEach(g=>g.classList.remove('desktop-popup-open'));
    }
  });

  if(isDesktopSidebar_()){
    document.querySelectorAll('.nav-group').forEach(g=>{
      g.classList.remove('open','desktop-popup-open');
      const t=g.querySelector(':scope > .nav-group-toggle');
      if(t)t.setAttribute('aria-expanded','false');
    });
  }

  const themeTargets=['themeBtn','desktopThemeBtn','sidebarThemeBtn'];
  themeTargets.forEach(id=>{
    const e=$(id);
    if(e)e.onclick=toggleTheme;
  });

  const lo=$('sidebarLogoutBtn');
  if(lo)lo.onclick=logout;
}

function setupMobileMenu_(){
  const mobileNav=$('mobileNav');
  const drawer=$('mobileMenu');
  const content=$('mobileMenuContent');
  if(!mobileNav||!drawer||!content)return;

  const openMenu=(preferredGroup='')=>{
    buildMobileMenu_(preferredGroup);
    drawer.hidden=false;
    drawer.setAttribute('aria-hidden','false');
    document.body.classList.add('mobile-menu-open');
    requestAnimationFrame(()=>drawer.classList.add('show'));
  };
  const closeMenu=()=>{
    drawer.classList.remove('show');
    drawer.setAttribute('aria-hidden','true');
    document.body.classList.remove('mobile-menu-open');
    setTimeout(()=>{drawer.hidden=true;},180);
  };

  mobileNav.querySelectorAll('[data-mobile-open-group]').forEach(btn=>btn.addEventListener('click',()=>openMenu(btn.dataset.mobileOpenGroup)));
  mobileNav.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.page)));
  drawer.querySelectorAll('[data-mobile-close]').forEach(el=>el.addEventListener('click',closeMenu));
  drawer.addEventListener('click',e=>{
    const groupBtn=e.target.closest('.mobile-group-toggle');
    if(groupBtn){
      const group=groupBtn.closest('.mobile-menu-group');
      if(!group)return;
      group.classList.toggle('open');
      groupBtn.setAttribute('aria-expanded',group.classList.contains('open')?'true':'false');
      return;
    }
    const logoutBtn=e.target.closest('[data-mobile-logout]');
    if(logoutBtn){
      closeMenu();
      logout();
      return;
    }
    const item=e.target.closest('[data-mobile-page]');
    if(item){
      showPage(item.dataset.mobilePage);
      closeMenu();
    }
  });
  drawer.addEventListener('click',e=>{
    if(e.target===drawer)closeMenu();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer.hidden)closeMenu();});
}

function buildMobileMenu_(preferredGroup=''){
  const content=$('mobileMenuContent');
  if(!content)return;
  const role=state.user?.role||'';
  const activePage=document.querySelector('.nav-item.active')?.dataset.page||'dashboard';
  const canAdmin=role==='ADMIN';

  const groups=[
    {key:'kokurikulum',label:'Kokurikulum',items:[
      ['unit','Unit Kokurikulum',''],
      ['penempatan','Penempatan Unit',''],
      ['kehadiran','Kehadiran','V2.4'],
      ['aktiviti','Aktiviti & Acara',''],
      ['peserta','Peserta Aktiviti',''],
      ['pencapaian','Pencapaian','V2.6']
    ]},
    {key:'laporan',label:'Laporan',items:[
      ['reports','Laporan Aktiviti',''],
      ['galeri','Galeri','']
    ]},
    {key:'tetapan',label:'Tetapan',items:[
      ['system-settings','Tetapan Sistem',''],
      ['guru','Guru',''],
      ['murid','Murid',''],
      ['users','Pengurusan Pengguna','']
    ]}
  ];

  const allowed=page=>{
    if(['guru','users','system-settings'].includes(page))return canAdmin;
    return ['unit','penempatan','murid','reports','attendance','activity','activity-participants'].includes(page);
  };
  const isDisabled=page=>!allowed(page)||['peserta','pencapaian','galeri'].includes(page);

  const groupIsOpen=g=>{
    if(preferredGroup && g.key===preferredGroup)return true;
    return g.items.some(x=>x[0]===activePage);
  };

  const renderItems=(items,indent=0)=>items.map(([page,label,badge])=>{
    const disabled=isDisabled(page);
    return `<button class="mobile-menu-item ${activePage===page?'active':''} ${disabled?'disabled':''} ${indent?'nested':''}" data-mobile-page="${page}" type="button" ${disabled?'disabled':''}><span>${label}</span>${badge?`<em>${badge}</em>`:''}</button>`;
  }).join('');

  content.innerHTML=`
    <button class="mobile-main-link ${activePage==='dashboard'?'active':''}" data-mobile-page="dashboard" type="button">
      <b>Dashboard</b>
    </button>
    ${groups.map(g=>{
      const open=groupIsOpen(g);
      if(g.key!=='tetapan'){
        return `<div class="mobile-menu-group ${open?'open':''}">
          <button class="mobile-group-toggle" type="button" aria-expanded="${open?'true':'false'}"><span>${g.label}</span><b>›</b></button>
          <div class="mobile-group-items">${renderItems(g.items)}</div>
        </div>`;
      }
      const settingsOpen=open;
      return `<div class="mobile-menu-group ${settingsOpen?'open':''}">
        <button class="mobile-group-toggle" type="button" aria-expanded="${settingsOpen?'true':'false'}"><span>${g.label}</span><b>›</b></button>
        <div class="mobile-group-items">
          ${renderItems([['system-settings','Tetapan Sistem','']])}
          <div class="mobile-menu-group mobile-nested-group">
            <button class="mobile-group-toggle mobile-nested-toggle" type="button" aria-expanded="${activePage==='guru'||activePage==='murid'?'true':'false'}"><span>Pengurusan Data</span><b>›</b></button>
            <div class="mobile-group-items">${renderItems([['guru','Guru',''],['murid','Murid','']])}</div>
          </div>
          ${renderItems([['users','Pengurusan Pengguna','']])}
        </div>
      </div>`
    }).join('')}
    <button class="mobile-logout-btn" data-mobile-logout type="button">Log Keluar</button>`;
}

function showPage(page){
  const role=state.user?.role||'';

  if(page==='users' && role!=='ADMIN')
    return toast('Akses ditolak.');

  if(page==='guru' && role!=='ADMIN')
    return toast('Akses ditolak.');

  if(page==='system-settings' && role!=='ADMIN')
    return toast('Akses ditolak.');

  const map={
    dashboard:'Dashboard',
    murid:'Murid',
    guru:'Guru',
    unit:'Unit Kokurikulum',
    penempatan:'Penempatan Unit',
    users:'Pengurusan Pengguna',
    analysis:'Analisis',
    reports:'Laporan Aktiviti',
    activity:'Aktiviti & Acara',
    'activity-participants':'Daftar Peserta',
    'system-settings':'Tetapan Sistem',
    attendance:'Kehadiran'
  };

  document.querySelectorAll('.page-section').forEach(el=>el.hidden=true);

  document.querySelectorAll('.nav-item[data-page]').forEach(el=>{
    el.classList.toggle('active',el.dataset.page===page);
  });

  document.querySelectorAll('.page-'+page).forEach(el=>el.hidden=false);

  const title=map[page]||'Dashboard';

  ['desktopPageTitle','mobilePageTitle'].forEach(id=>{
    const e=$(id);
    if(e)e.textContent=title;
  });

  if($('mobileMenu') && !$('mobileMenu').hidden) buildMobileMenu_();

  if(page==='dashboard'){loadMurid();loadUnit();}
  if(page==='murid')loadMurid();
  if(page==='guru')loadGuru();
  if(page==='unit')loadUnit();
  if(page==='attendance')loadAttendancePage();
  if(page==='activity')loadAktivitiPage();
  if(page==='activity-participants')loadAktivitiPesertaPage();
  if(page==='unit-overview')loadUnitOverview();
  if(page==='users')loadUsers();

  // Pastikan submenu induk terbuka hanya pada desktop dropdown.
  // Tablet menggunakan popup dan perlu ditutup selepas pilihan dibuat.
  const active=document.querySelector('.nav-item[data-page="'+page+'"]');
  if(active && isDesktopDropdown_()){
    document.querySelectorAll('.nav-group').forEach(g=>{
      if(g.contains(active)){
        g.classList.add('open');
        g.classList.remove('desktop-popup-open');
        const t=g.querySelector(':scope > .nav-group-toggle');
        if(t)t.setAttribute('aria-expanded','true');
      }
    });
  }
}

function init(){
  document.documentElement.classList.toggle('dark',state.dark);
  setupNavigation();
  setThemeIcons_();
  const bind=(id,event,fn)=>{const e=$(id);if(e)e.addEventListener(event,fn)};
  bind('loginBtn','click',login);
  bind('logoutBtn','click',logout);
  bind('meBtn','click',me);
  bind('loadBtn','click',loadMurid);
  bind('refreshBtn','click',loadMurid);
  bind('addBtn','click',addMurid);
  bind('addUserBtn','click',addUser);
  bind('usersRefreshBtn','click',loadUsers);
  bind('guruRefreshBtn','click',loadGuru);
  bind('addGuruBtn','click',saveGuru);
  bind('cancelGuruBtn','click',cancelGuru);
  bind('unitRefreshBtn','click',loadUnit);
  bind('addUnitBtn','click',saveUnit);
  bind('cancelUnitBtn','click',cancelUnit);
  bind('addMemberBtn','click',addUnitMember);
  bind('attendanceRefreshBtn','click',loadAttendancePage);
  bind('activityAddBtn','click',()=>openAktivitiModal());
  bind('activityRefreshBtn','click',loadAktivitiPage);
  bind('activitySearch','input',filterAktivitiTable);
  bind('activityYear','change',filterAktivitiTable);
  bind('activityLevel','change',filterAktivitiTable);
  bind('activityDate','change',updateActivityDay_);
  bind('activityForm','submit',saveAktiviti);
  bind('activityParticipantsBackBtn','click',()=>showPage('activity'));
  bind('activityParticipantsSaveBtn','click',saveAktivitiPeserta);
  bind('activityParticipantClass','change',renderAktivitiPesertaTable_);
  bind('activityParticipantSearch','input',renderAktivitiPesertaTable_);
  document.querySelectorAll('[data-activity-close]').forEach(e=>e.addEventListener('click',closeAktivitiModal));
  bind('attLoadBtn','click',loadAttendanceForm);
  bind('attSaveBtn','click',saveAttendance);
  bind('attRecordRefreshBtn','click',loadAttendanceRecords);
  document.querySelectorAll('[data-att-bulk]').forEach(btn=>btn.addEventListener('click',()=>bulkAttendanceStatus(btn.dataset.attBulk)));
  if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(console.warn);
  if(state.token&&state.user)showApp();else showLogin();
}
function apiGet(action,params={}){
  return new Promise((resolve,reject)=>{
    let u;
    try{
      u=new URL(state.apiUrl||prompt('Masukkan URL Apps Script /exec'));
    }catch(e){
      reject(Error('URL backend tidak sah.'));
      return;
    }

    u.search='';
    u.hash='';

    if(!state.apiUrl){
      state.apiUrl=u.toString();
      localStorage.setItem('ekossta_model_b_api_url',state.apiUrl);
    }

    const cb='__ekossta_v2_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const q=new URLSearchParams();
    q.set('action',String(action||''));
    q.set('callback',cb);
    q.set('_',String(Date.now()));

    Object.keys(params||{}).forEach(k=>{
      const v=params[k];
      if(v!==undefined&&v!==null) q.set(k,String(v));
    });

    const s=document.createElement('script');
    s.src=u.origin+u.pathname+'?'+q.toString();
    s.async=true;
    s.referrerPolicy='no-referrer-when-downgrade';

    let timer=null;
    let finished=false;

    const cleanup=()=>{
      if(timer)clearTimeout(timer);
      timer=null;
      try{delete window[cb]}catch(e){window[cb]=undefined}
      if(s.parentNode)s.parentNode.removeChild(s);
    };

    window[cb]=data=>{
      if(finished)return;
      finished=true;
      cleanup();

      if(!data){
        reject(Error('Backend menghantar respons kosong.'));
        return;
      }

      if(data.ok===false){
        reject(Error(data.error||'Backend error.'));
        return;
      }

      resolve(data);
    };

    s.onerror=()=>{
      if(finished)return;
      finished=true;
      cleanup();
      reject(Error('Gagal memuatkan respons Apps Script. Semak URL /exec dan deployment.'));
    };

    timer=setTimeout(()=>{
      if(finished)return;
      finished=true;
      cleanup();
      reject(Error('Backend timeout selepas 30 saat. Backend /exec boleh dicapai tetapi respons JSONP tidak sampai ke browser.'));
    },30000);

    document.head.appendChild(s);
  });
}
async function login(){const b=$('loginBtn'),username=$('username').value.trim(),password=$('password').value;if(!username||!password)return toast('Masukkan username dan password.');if(!state.apiUrl){const u=prompt('Masukkan URL Apps Script /exec');if(!u)return;if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(u.trim()))return toast('URL /exec tidak sah.');state.apiUrl=u.trim();localStorage.setItem('ekossta_model_b_api_url',state.apiUrl)}b.disabled=true;b.textContent='⏳ Mengesahkan...';try{const d=await apiGet('login',{username,password});state.token=d.token;state.user=d.user;sessionStorage.setItem('ekossta_v2_token',state.token);sessionStorage.setItem('ekossta_v2_user',JSON.stringify(state.user));$('password').value='';showApp();toast('Login berjaya.')}catch(e){$('loginResult').textContent=e.message;toast(e.message)}finally{b.disabled=false;b.textContent='Log Masuk'}}
async function logout(){try{if(state.token)await apiGet('logout',{token:state.token})}catch(e){}state.token='';state.user=null;sessionStorage.removeItem('ekossta_v2_token');sessionStorage.removeItem('ekossta_v2_user');showLogin();toast('Logout berjaya.')}
async function me(){try{const d=await apiGet('me',{token:state.token});$('meResult').textContent='Session sah sehingga '+new Date(d.expiresAt).toLocaleString('ms-MY')}catch(e){toast(e.message);if(/Session/.test(e.message))logout()}}
async function loadMurid(){try{const d=await apiGet('getMurid',{token:state.token});render(d.data||[]);$('muridCount').textContent=(d.data||[]).length;toast('Data dimuat.')}catch(e){toast(e.message)}}
async function addMurid(){if(!['ADMIN','GURU'].includes(state.user?.role))return toast('Akses ditolak.');const b=$('addBtn'),p={token:state.token,nama:$('nama').value.trim(),noKp:$('noKp').value.trim(),tingkatan:$('tingkatan').value.trim(),kelas:$('kelas').value.trim()};if(Object.values(p).some(x=>!x))return toast('Lengkapkan semua medan murid.');b.disabled=true;b.textContent='⏳ Menyimpan...';try{const d=await apiGet('addMurid',p);$('addResult').textContent=d.message||'Berjaya.';['nama','noKp','tingkatan','kelas'].forEach(id=>$(id).value='');$('jantina').value='';await loadMurid();toast('Murid ditambah.')}catch(e){$('addResult').textContent=e.message;toast(e.message)}finally{b.disabled=false;b.textContent='Tambah ke Google Sheet'}}

async function loadUsers(){
  if(state.user?.role!=='ADMIN')return;
  try{const d=await apiGet('getUsers',{token:state.token});renderUsers(d.data||[]);}
  catch(e){toast(e.message);}
}
function renderUsers(rows){
  const wrap=$('usersTableWrap');
  if(!rows.length){wrap.innerHTML='<div class="empty">Tiada pengguna.</div>';return;}
  const t=document.createElement('table'),thead=document.createElement('thead'),hr=document.createElement('tr');
  ['ID','USERNAME','NAMA','ROLE','STATUS','LAST_LOGIN','TINDAKAN'].forEach(c=>{const th=document.createElement('th');th.textContent=c;hr.appendChild(th)});thead.appendChild(hr);t.appendChild(thead);
  const tb=document.createElement('tbody');
  rows.forEach(r=>{const tr=document.createElement('tr');
    ['USER_ID','USERNAME','NAMA','ROLE','STATUS','LAST_LOGIN'].forEach(c=>{const td=document.createElement('td');td.textContent=r[c]||'-';tr.appendChild(td)});
    const td=document.createElement('td');
    const role=document.createElement('select');['GURU','ADMIN'].forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;if(r.ROLE===x)o.selected=true;role.appendChild(o)});role.onchange=()=>changeRole(r.USER_ID,role.value);
    const status=document.createElement('button');status.className='btn secondary small';status.textContent=r.STATUS==='AKTIF'?'Nyahaktif':'Aktifkan';status.onclick=()=>setStatus(r.USER_ID,r.STATUS==='AKTIF'?'TIDAK_AKTIF':'AKTIF');
    const reset=document.createElement('button');reset.className='btn secondary small';reset.textContent='Reset Password';reset.onclick=()=>resetPassword(r.USER_ID,r.USERNAME);
    const kick=document.createElement('button');kick.className='btn secondary small';kick.textContent='Logout Session';kick.onclick=()=>logoutSessions(r.USER_ID);
    td.append(role,status,reset,kick);tr.appendChild(td);tb.appendChild(tr);
  });t.appendChild(tb);wrap.replaceChildren(t);
}
async function addUser(){
  const b=$('addUserBtn'),p={token:state.token,username:$('newUsername').value.trim(),nama:$('newUserNama').value.trim(),role:$('newUserRole').value,password:$('newUserPassword').value};
  if(!p.username||!p.nama||!p.password)return toast('Lengkapkan semua medan pengguna.');
  b.disabled=true;b.textContent='⏳ Menyimpan...';
  try{const d=await apiGet('addUser',p);$('userResult').textContent=d.message||'Berjaya.';['newUsername','newUserNama','newUserPassword'].forEach(id=>$(id).value='');await loadUsers();toast('Pengguna ditambah.');}
  catch(e){$('userResult').textContent=e.message;toast(e.message)}finally{b.disabled=false;b.textContent='+ Tambah Pengguna'}
}
async function setStatus(userId,status){try{const d=await apiGet('setUserStatus',{token:state.token,userId,status});toast(d.message);loadUsers();}catch(e){toast(e.message)}}
async function resetPassword(userId,username){const password=prompt(`Password baharu untuk ${username}:`);if(password===null)return;if(password.length<8)return toast('Password minimum 8 aksara.');try{const d=await apiGet('resetUserPassword',{token:state.token,userId,password});toast(d.message);loadUsers();}catch(e){toast(e.message)}}
async function changeRole(userId,role){try{const d=await apiGet('changeUserRole',{token:state.token,userId,role});toast(d.message);loadUsers();}catch(e){toast(e.message);loadUsers()}}
async function logoutSessions(userId){try{const d=await apiGet('logoutUserSessions',{token:state.token,userId});toast(d.message);loadUsers();}catch(e){toast(e.message)}}
async function loadGuru(){
  if(state.user?.role!=='ADMIN')return;
  try{
    const d=await apiGet('getGuru',{token:state.token});
    renderGuru(d.data||[]);
    await loadGuruUserOptions();
  }catch(e){toast(e.message)}
}
async function loadGuruUserOptions(){
  const s=$('guruUserId'); if(!s)return;
  try{
    const d=await apiGet('getUsers',{token:state.token});
    const current=s.value;
    s.replaceChildren(new Option('-- Tiada pautan --',''));
    (d.data||[]).filter(x=>x.STATUS==='AKTIF').forEach(x=>s.appendChild(new Option(`${x.USERNAME} — ${x.NAMA}`,x.USER_ID)));
    s.value=current;
  }catch(e){}
}
function renderGuru(rows){
  const wrap=$('guruTableWrap');
  if(!rows.length){wrap.innerHTML='<div class="empty">Tiada guru direkodkan.</div>';return}
  const t=document.createElement('table'),thead=document.createElement('thead'),hr=document.createElement('tr');
  ['NO_GURU','NAMA','EMAIL','NO_TEL','STATUS','USER_ID','TINDAKAN'].forEach(c=>{const th=document.createElement('th');th.textContent=c;hr.appendChild(th)});thead.appendChild(hr);t.appendChild(thead);
  const tb=document.createElement('tbody');
  rows.forEach(r=>{
    const tr=document.createElement('tr');
    ['NO_GURU','NAMA','EMAIL','NO_TEL','STATUS','USER_ID'].forEach(c=>{const td=document.createElement('td');td.textContent=r[c]||'-';tr.appendChild(td)});
    const td=document.createElement('td');
    const edit=document.createElement('button');edit.className='btn secondary small';edit.textContent='Edit';edit.onclick=()=>editGuru(r);
    const status=document.createElement('button');status.className='btn secondary small';status.textContent=r.STATUS==='AKTIF'?'Nyahaktif':'Aktifkan';status.onclick=()=>setGuruStatus(r.NO_GURU,r.STATUS==='AKTIF'?'TIDAK_AKTIF':'AKTIF');
    td.append(edit,status);tr.appendChild(td);tb.appendChild(tr);
  });
  t.appendChild(tb);wrap.replaceChildren(t);
}
function editGuru(r){
  $('guruOriginalNo').value=r.NO_GURU||'';$('guruNo').value=r.NO_GURU||'';$('guruNama').value=r.NAMA||'';$('guruEmail').value=r.EMAIL||'';$('guruTel').value=r.NO_TEL||'';$('guruStatus').value=r.STATUS||'AKTIF';$('guruUserId').value=r.USER_ID||'';
  $('addGuruBtn').textContent='Simpan Perubahan';$('cancelGuruBtn').hidden=false;window.scrollTo({top:$('guruSection').offsetTop-20,behavior:'smooth'});
}
function cancelGuru(){['guruOriginalNo','guruNo','guruNama','guruEmail','guruTel'].forEach(id=>$(id).value='');$('guruStatus').value='AKTIF';$('guruUserId').value='';$('addGuruBtn').textContent='+ Tambah Guru';$('cancelGuruBtn').hidden=true;}
async function saveGuru(){
  const b=$('addGuruBtn');
  const originalNoGuru=$('guruOriginalNo').value.trim();
  const p={token:state.token,originalNoGuru,noGuru:$('guruNo').value.trim(),nama:$('guruNama').value.trim(),email:$('guruEmail').value.trim(),noTel:$('guruTel').value.trim(),status:$('guruStatus').value,userId:$('guruUserId').value};
  if(!p.noGuru||!p.nama)return toast('No. Guru dan Nama diperlukan.');
  b.disabled=true;b.textContent='⏳ Menyimpan...';
  try{
    const d=await apiGet(originalNoGuru?'updateGuru':'addGuru',p);$('guruResult').textContent=d.message||'Berjaya.';cancelGuru();await loadGuru();toast(d.message||'Berjaya.');
  }catch(e){$('guruResult').textContent=e.message;toast(e.message)}finally{b.disabled=false;if(!originalNoGuru)b.textContent='+ Tambah Guru';}
}
async function setGuruStatus(noGuru,status){try{const d=await apiGet('setGuruStatus',{token:state.token,noGuru,status});toast(d.message);loadGuru();}catch(e){toast(e.message)}}

function render(rows){const wrap=$('tableWrap');if(!rows.length){wrap.innerHTML='<div class="empty">Tiada data.</div>';return}const cols=['ID','NO_KP','NAMA','JANTINA','TINGKATAN','KELAS','STATUS'],t=document.createElement('table'),thead=document.createElement('thead'),hr=document.createElement('tr');cols.forEach(c=>{const th=document.createElement('th');th.textContent=c;hr.appendChild(th)});thead.appendChild(hr);t.appendChild(thead);const tb=document.createElement('tbody');rows.forEach(r=>{const tr=document.createElement('tr');cols.forEach(c=>{const td=document.createElement('td');td.textContent=r[c]??'';tr.appendChild(td)});tb.appendChild(tr)});t.appendChild(tb);wrap.replaceChildren(t)}
let UNIT_ROWS=[];
async function loadUnit(){try{const d=await apiGet('getUnit',{token:state.token});UNIT_ROWS=d.data||[];renderUnit(UNIT_ROWS);await loadUnitForms();}catch(e){toast(e.message)}}
async function loadUnitForms(){
  const gs=$('unitGuru'),ms=$('memberMurid'),us=$('memberUnit'); if(!gs||!ms||!us)return;
  if(state.user?.role==='ADMIN'){
    try{const g=await apiGet('getGuru',{token:state.token});gs.replaceChildren(new Option('-- Pilih Guru --',''));(g.data||[]).filter(x=>x.STATUS==='AKTIF').forEach(x=>gs.appendChild(new Option(`${x.NO_GURU} — ${x.NAMA}`,x.NO_GURU)));}catch(e){}
  }
  us.replaceChildren(new Option('-- Pilih Unit --',''));UNIT_ROWS.filter(x=>String(x.STATUS).toUpperCase()==='AKTIF').forEach(x=>us.appendChild(new Option(`${x.NAMA_UNIT} — ${x.TAHUN}`,x.UNIT_ID)));
  try{const m=await apiGet('getMurid',{token:state.token});ms.replaceChildren(new Option('-- Pilih Murid --',''));(m.data||[]).filter(x=>String(x.STATUS).toUpperCase()==='AKTIF').forEach(x=>ms.appendChild(new Option(`${x.NO_KP} — ${x.NAMA} (${x.JANTINA||'-'})`,x.NO_KP)));}catch(e){}
  const y=new Date().getFullYear();if(!$('unitTahun').value)$('unitTahun').value=y;if(!$('memberTahun').value)$('memberTahun').value=y;
}
function renderUnit(rows){
  const cards=$('unitCards');
  if(!rows.length){cards.innerHTML='';$('unitSummary').innerHTML='';return}
  const totals=rows.reduce((a,r)=>({unit:a.unit+1,ahli:a.ahli+Number(r.JUMLAH_AHLI||0),lelaki:a.lelaki+Number(r.LELAKI||0),perempuan:a.perempuan+Number(r.PEREMPUAN||0)}),{unit:0,ahli:0,lelaki:0,perempuan:0});$('unitSummary').innerHTML=`<div><b>${totals.unit}</b><small>Unit</small></div><div><b>${totals.ahli}</b><small>Jumlah ahli</small></div><div><b>${totals.lelaki}</b><small>Lelaki</small></div><div><b>${totals.perempuan}</b><small>Perempuan</small></div>`;
  cards.innerHTML=rows.map(r=>`<div class="unit-card unit-card-clickable" role="button" tabindex="0" onclick="openUnitOverview('${escAttr(r.UNIT_ID)}','${escAttr(r.TAHUN)}')" onkeydown="if(event.key==='Enter'||event.key===' ')openUnitOverview('${escAttr(r.UNIT_ID)}','${escAttr(r.TAHUN)}')"><div class="unit-card-top"><span class="unit-category">${esc(r.KATEGORI)}</span><span class="unit-status ${String(r.STATUS)==='AKTIF'?'on':'off'}">${esc(r.STATUS)}</span></div><h3>${esc(r.NAMA_UNIT)}</h3><div class="unit-counts"><div><b>${Number(r.JUMLAH_AHLI||0)}</b><small>Jumlah</small></div><div><b>${Number(r.LELAKI||0)}</b><small>Lelaki</small></div><div><b>${Number(r.PEREMPUAN||0)}</b><small>Perempuan</small></div></div><div class="unit-card-open">Buka Butiran Unit →</div></div>`).join('');
}

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}function escAttr(v){return esc(v).replace(/`/g,'&#96;')}
function editUnit(id){const r=UNIT_ROWS.find(x=>String(x.UNIT_ID)===String(id));if(!r)return;$('unitOriginalId').value=r.UNIT_ID;$('unitNama').value=r.NAMA_UNIT||'';$('unitKategori').value=r.KATEGORI||'UNIT BERUNIFORM';$('unitGuru').value=r.GURU_PENASIHAT||'';$('unitTahun').value=r.TAHUN||'';$('unitStatus').value=r.STATUS||'AKTIF';$('addUnitBtn').textContent='Simpan Perubahan';$('cancelUnitBtn').hidden=false;window.scrollTo({top:$('unitSection').offsetTop-20,behavior:'smooth'})}
function cancelUnit(){['unitOriginalId','unitNama'].forEach(id=>$(id).value='');$('unitGuru').value='';$('unitStatus').value='AKTIF';$('unitTahun').value=new Date().getFullYear();$('addUnitBtn').textContent='+ Tambah Unit';$('cancelUnitBtn').hidden=true}
async function saveUnit(){const b=$('addUnitBtn'),id=$('unitOriginalId').value.trim(),p={token:state.token,unitId:id,namaUnit:$('unitNama').value.trim(),kategori:$('unitKategori').value,guruPenasihat:$('unitGuru').value,tahun:$('unitTahun').value,status:$('unitStatus').value};if(!p.namaUnit||!p.tahun)return toast('Nama unit dan tahun diperlukan.');b.disabled=true;b.textContent='⏳ Menyimpan...';try{const d=await apiGet(id?'updateUnit':'addUnit',p);$('unitResult').textContent=d.message||'Berjaya.';cancelUnit();await loadUnit();toast(d.message||'Berjaya.')}catch(e){$('unitResult').textContent=e.message;toast(e.message)}finally{b.disabled=false;if(!id)b.textContent='+ Tambah Unit'}}
async function toggleUnit(unitId,status){try{const d=await apiGet('setUnitStatus',{token:state.token,unitId,status});toast(d.message);await loadUnit()}catch(e){toast(e.message)}}
async function addUnitMember(){const b=$('addMemberBtn'),p={token:state.token,unitId:$('memberUnit').value,noKp:$('memberMurid').value,tahun:$('memberTahun').value};if(!p.unitId||!p.noKp||!p.tahun)return toast('Lengkapkan Unit, Murid dan Tahun.');b.disabled=true;try{const d=await apiGet('addUnitMember',p);$('memberResult').textContent=d.message;await loadUnit();toast(d.message)}catch(e){$('memberResult').textContent=e.message;toast(e.message)}finally{b.disabled=false}}
async function viewUnitMembers(unitId){try{const d=await apiGet('getUnitMembers',{token:state.token,unitId});const rows=d.data||[];const r=UNIT_ROWS.find(x=>String(x.UNIT_ID)===String(unitId));if(!rows.length)return alert(`Ahli ${r?.NAMA_UNIT||'unit'} belum ada.`);const text=rows.map((x,i)=>`${i+1}. ${x.NAMA} — ${x.JANTINA} — ${x.NO_KP}`).join('\n');alert(`AHLI: ${r?.NAMA_UNIT||unitId}\n\n${text}`)}catch(e){toast(e.message)}}
function showLogin(){
  document.body.classList.add('logged-out');
  $('loginView').hidden=false;
  $('appView').hidden=true;

  const sidebar=$('sidebar');
  if(sidebar)sidebar.setAttribute('aria-hidden','true');

  const mobileNav=$('mobileNav');
  if(mobileNav)mobileNav.setAttribute('aria-hidden','true');
}

function showApp(){
  document.body.classList.remove('logged-out');
  $('loginView').hidden=true;
  $('appView').hidden=false;

  const sidebar=$('sidebar');
  if(sidebar)sidebar.removeAttribute('aria-hidden');

  const mobileNav=$('mobileNav');
  if(mobileNav)mobileNav.removeAttribute('aria-hidden');

  $('welcome').textContent=
    `Selamat datang, ${state.user?.nama||state.user?.username||''}.`;

  const isAdmin=state.user?.role==='ADMIN';

  $('userSection').hidden=!isAdmin;
  $('guruSection').hidden=!isAdmin;
  $('unitSection').hidden=false;
  $('unitAdminArea').hidden=!isAdmin;

  document.querySelectorAll('.admin-nav').forEach(el=>{
    el.hidden=!isAdmin;
  });

  $('sideUserName').textContent=
    state.user?.nama||state.user?.username||'Pengguna';

  $('sideUserRole').textContent='Pengguna';
  $('desktopUser').textContent=state.user?.nama||state.user?.username||'-';

  showPage('dashboard');

  if(isAdmin){
    loadUsers();
    loadGuru();
  }
}
function themeIconMarkup_(isDark){
  return isDark
    ? '<svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>'
    : '<svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"></path></svg>';
}
function setThemeIcons_(){
  ['themeBtn','desktopThemeBtn','sidebarThemeBtn'].forEach(id=>{const e=$(id);if(e)e.innerHTML=themeIconMarkup_(state.dark)});
}
function toggleTheme(){
  state.dark=!state.dark;
  document.documentElement.classList.toggle('dark',state.dark);
  localStorage.setItem('ekossta_model_b_dark',state.dark?'1':'0');
  setThemeIcons_();
}
function toast(m){const e=$('toast');e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),3200)}



/* =========================================================
   V2.5 AKTIVITI & ACARA FRONTEND
========================================================= */
let AKTIVITI_ROWS=[];
function activityEsc_(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function activityDate_(v){const d=new Date(v);return isNaN(d.getTime())?'':d.toLocaleDateString('ms-MY')}
function activityDayFromDate_(v){if(!v)return '';const d=new Date(String(v)+'T00:00:00');if(isNaN(d.getTime()))return '';return ['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'][d.getDay()]}
async function loadAktivitiPage(){
  try{
    const d=await apiGet('getAktiviti',{token:state.token});
    AKTIVITI_ROWS=d.data||[];
    fillAktivitiYears_();
    renderAktivitiTable_(AKTIVITI_ROWS);
  }catch(e){toast(e.message||'Gagal memuatkan aktiviti.');}
}
function fillAktivitiYears_(){
  const sel=$('activityYear');if(!sel)return;
  const current=sel.value;
  const years=[...new Set(AKTIVITI_ROWS.map(r=>String(r.TARIKH||'').slice(0,4)).filter(x=>/^\d{4}$/.test(x)))].sort((a,b)=>b-a);
  sel.innerHTML='<option value="">Semua Tahun</option>'+years.map(y=>`<option value="${activityEsc_(y)}">${activityEsc_(y)}</option>`).join('');
  if(current)sel.value=current;
}
function filterAktivitiTable(){
  const q=String($('activitySearch')?.value||'').trim().toLowerCase();
  const y=String($('activityYear')?.value||'');
  const level=String($('activityLevel')?.value||'').toUpperCase();
  const rows=AKTIVITI_ROWS.filter(r=>{
    const hay=[r.NAMA_AKTIVITI,r.TEMPAT,r.OBJEKTIF,r.AKTIVITI,r.IMPAK].join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(!y||String(r.TARIKH||'').slice(0,4)===y)&&(!level||String(r.PERINGKAT||'').toUpperCase()===level);
  });
  renderAktivitiTable_(rows);
}
function suratTplEsc_(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function suratTplReplace_(html,a,p,d){
  const map={NAMA_SEKOLAH:d.schoolName||'',NAMA_MURID:p?.NAMA||'',NO_KP:p?.NO_KP||'',KELAS:p?.KELAS||'',NAMA_AKTIVITI:a?.NAMA_AKTIVITI||'',ANJURAN:a?.NO_GURU||'',TARIKH:activityDate_(a?.TARIKH)||'',PERINGKAT:a?.PERINGKAT||'',TEMPAT:a?.TEMPAT||'',HARI:a?.HARI||'',MASA:a?.MASA||''};
  let out=String(html||'');Object.keys(map).forEach(k=>out=out.replace(new RegExp('{{\\s*'+k+'\\s*}}','g'),suratTplEsc_(map[k])));
  if(d.logoDataUrl)out=out.replace(/\{\{LOGO_SEKOLAH\}\}/g,`<img src="${d.logoDataUrl}" style="max-width:72px;max-height:78px;object-fit:contain;display:block;margin:0 auto 8px">`);else out=out.replace(/\{\{LOGO_SEKOLAH\}\}/g,'');
  return out;
}
function suratTplInjectCss_(){
  if(document.getElementById('suratTplEditorCss'))return;
  const st=document.createElement('style');st.id='suratTplEditorCss';st.textContent=`
  .st-modal{position:fixed;inset:0;z-index:99999;background:rgba(8,9,15,.72);backdrop-filter:blur(5px);display:none;align-items:stretch;justify-content:center;padding:18px}.st-modal.open{display:flex}.st-dialog{width:min(1400px,100%);height:100%;background:var(--surface,#1b1b24);border:1px solid var(--border,#3b3b4a);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.4)}.st-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border,#3b3b4a)}.st-title{font-size:18px;font-weight:800}.st-sub{font-size:12px;opacity:.7;margin-top:3px}.st-actions{display:flex;gap:8px;flex-wrap:wrap}.st-body{display:grid;grid-template-columns:minmax(0,1fr) 430px;min-height:0;flex:1}.st-editor{display:flex;flex-direction:column;min-width:0;border-right:1px solid var(--border,#3b3b4a)}.st-toolbar{display:flex;gap:5px;flex-wrap:wrap;padding:10px;border-bottom:1px solid var(--border,#3b3b4a);background:var(--surface-2,#22222d)}.st-tool{min-width:34px;height:32px;border:1px solid var(--border,#454555);border-radius:7px;background:transparent;color:inherit;cursor:pointer;font-weight:700}.st-tool:hover{background:rgba(109,40,217,.16)}.st-select{height:32px;border:1px solid var(--border,#454555);border-radius:7px;background:var(--surface,#1b1b24);color:inherit;padding:0 8px}.st-vars{display:flex;gap:6px;flex-wrap:wrap;padding:8px 10px;border-bottom:1px solid var(--border,#3b3b4a);font-size:12px}.st-var{border:1px solid var(--border,#454555);border-radius:999px;background:transparent;color:inherit;padding:5px 9px;cursor:pointer}.st-canvas{flex:1;overflow:auto;padding:24px;background:#2a2a33}.st-page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;color:#111;padding:18mm;box-shadow:0 5px 25px rgba(0,0,0,.28);outline:none}.st-page:focus{box-shadow:0 0 0 2px #6d28d9,0 5px 25px rgba(0,0,0,.28)}.st-preview{overflow:auto;background:#e9e9ed;padding:22px}.st-preview-page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;color:#111;padding:18mm;box-shadow:0 5px 20px rgba(0,0,0,.18);font-family:Arial,sans-serif;font-size:11pt;line-height:1.45}.st-note{padding:8px 12px;font-size:12px;opacity:.72;border-top:1px solid var(--border,#3b3b4a)}@media(max-width:1000px){.st-body{grid-template-columns:1fr}.st-preview{display:none}.st-editor{border-right:0}.st-page{width:100%;min-height:0}}`;
  document.head.appendChild(st);
}
let ST_DATA=null;
function stOpenTemplateEditor(activityId){
  if(String(state.user?.role||'').toUpperCase()!=='ADMIN')return toast('Hanya ADMIN boleh mengedit template surat.');
  suratTplInjectCss_();
  let m=document.getElementById('stTemplateModal');
  if(!m){m=document.createElement('div');m.id='stTemplateModal';m.className='st-modal';m.innerHTML=`<div class="st-dialog"><div class="st-head"><div><div class="st-title">Edit Template Surat Kebenaran</div><div class="st-sub">Editor seperti Word • Template digunakan untuk semua surat kebenaran</div></div><div class="st-actions"><button class="btn secondary" type="button" id="stReset">Pulihkan Template</button><button class="btn primary" type="button" id="stSave">Simpan Template</button><button class="btn secondary" type="button" id="stClose">Tutup</button></div></div><div class="st-body"><div class="st-editor"><div class="st-toolbar"><button class="st-tool" data-cmd="undo">↶</button><button class="st-tool" data-cmd="redo">↷</button><button class="st-tool" data-cmd="bold"><b>B</b></button><button class="st-tool" data-cmd="italic"><i>I</i></button><button class="st-tool" data-cmd="underline"><u>U</u></button><button class="st-tool" data-cmd="justifyLeft">L</button><button class="st-tool" data-cmd="justifyCenter">C</button><button class="st-tool" data-cmd="justifyRight">R</button><button class="st-tool" data-cmd="insertUnorderedList">• List</button><button class="st-tool" data-cmd="insertOrderedList">1. List</button><select class="st-select" id="stFont"><option value="Arial">Arial</option><option value="Calibri">Calibri</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="Verdana">Verdana</option></select><select class="st-select" id="stSize"><option value="2">10</option><option value="3" selected>12</option><option value="4">14</option><option value="5">18</option><option value="6">24</option></select></div><div class="st-vars"><span>Medan automatik:</span><button class="st-var" data-var="{{NAMA_MURID}}">Nama Murid</button><button class="st-var" data-var="{{NO_KP}}">No. KP</button><button class="st-var" data-var="{{KELAS}}">Kelas</button><button class="st-var" data-var="{{NAMA_AKTIVITI}}">Aktiviti</button><button class="st-var" data-var="{{TARIKH}}">Tarikh</button><button class="st-var" data-var="{{PERINGKAT}}">Peringkat</button><button class="st-var" data-var="{{TEMPAT}}">Tempat</button><button class="st-var" data-var="{{ANJURAN}}">Anjuran</button><button class="st-var" data-var="{{NAMA_SEKOLAH}}">Sekolah</button><button class="st-var" data-var="{{LOGO_SEKOLAH}}">Logo</button></div><div class="st-canvas"><div id="stEditor" class="st-page" contenteditable="true"></div></div><div class="st-note">Tip: pilih teks dan gunakan toolbar seperti Word. Medan dalam {{...}} akan diganti secara automatik semasa surat dijana.</div></div><div class="st-preview"><div id="stPreview" class="st-preview-page"></div></div></div></div>`;document.body.appendChild(m);}
  m.classList.add('open');
  const ed=document.getElementById('stEditor');
  const load=async()=>{try{const d=await apiGet('getPermissionLetterTemplate',{token:state.token});const a=await apiGet('getAktivitiPeserta',{token:state.token,aktivitiId:activityId});ST_DATA=Object.assign({},d,{activity:a.aktiviti||{},peserta:(a.data||[]).filter(x=>x.selected)});ed.innerHTML=d.html||'';stPreviewTemplate_();}catch(e){toast(e.message||'Gagal memuatkan template.');}};load();
  m.querySelectorAll('.st-tool').forEach(b=>{b.onclick=()=>{ed.focus();document.execCommand(b.dataset.cmd,false,null);stPreviewTemplate_();}});
  document.getElementById('stFont').onchange=e=>{ed.focus();document.execCommand('fontName',false,e.target.value);stPreviewTemplate_();};
  document.getElementById('stSize').onchange=e=>{ed.focus();document.execCommand('fontSize',false,e.target.value);stPreviewTemplate_();};
  m.querySelectorAll('.st-var').forEach(b=>b.onclick=()=>{ed.focus();document.execCommand('insertText',false,b.dataset.var);stPreviewTemplate_();});
  ed.oninput=stPreviewTemplate_;
  document.getElementById('stClose').onclick=()=>m.classList.remove('open');
  document.getElementById('stSave').onclick=async()=>{try{const d=await apiGet('savePermissionLetterTemplate',{token:state.token,html:ed.innerHTML});toast(d.message||'Template berjaya disimpan.');m.classList.remove('open');}catch(e){toast(e.message||'Gagal menyimpan template.');}};
  document.getElementById('stReset').onclick=async()=>{if(!confirm('Pulihkan template surat asal? Perubahan semasa akan diganti.'))return;try{const d=await apiGet('resetPermissionLetterTemplate',{token:state.token});ed.innerHTML=d.html||'';stPreviewTemplate_();toast(d.message||'Template dipulihkan.');}catch(e){toast(e.message||'Gagal memulihkan template.');}};
}
function stPreviewTemplate_(){const ed=document.getElementById('stEditor'),pv=document.getElementById('stPreview');if(!ed||!pv)return;const a=ST_DATA?.activity||{},p=(ST_DATA?.peserta||[])[0]||{};pv.innerHTML=suratTplReplace_(ed.innerHTML,a,p,ST_DATA||{});}
function renderAktivitiTable_(rows){
  const wrap=$('activityTableWrap');if(!wrap)return;if(!rows.length){wrap.innerHTML='<div class="empty">Tiada aktiviti ditemui.</div>';return;}
  const admin=String(state.user?.role||'').toUpperCase()==='ADMIN';
  wrap.innerHTML=`<table class="activity-table"><thead><tr><th>AKTIVITI</th><th>TARIKH</th><th>TEMPAT</th><th>PERINGKAT</th><th>GURU</th><th>TINDAKAN</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${activityEsc_(r.NAMA_AKTIVITI)}</b></td><td>${activityDate_(r.TARIKH)||'-'}${r.HARI?`<small class="activity-day">${activityEsc_(r.HARI)}</small>`:''}</td><td>${activityEsc_(r.TEMPAT||'-')}</td><td><span class="activity-level-badge">${activityEsc_(r.PERINGKAT||'-')}</span></td><td>${activityEsc_(r.NO_GURU||'-')}</td><td><div class="activity-actions"><button class="btn secondary small" type="button" onclick="openAktivitiPeserta('${activityEsc_(r.AKTIVITI_ID)}')">Peserta</button><button class="btn secondary small" type="button" onclick="openAktivitiPermissionLetter('${activityEsc_(r.AKTIVITI_ID)}')">Jana Surat</button>${admin?`<button class="btn secondary small" type="button" onclick="stOpenTemplateEditor('${activityEsc_(r.AKTIVITI_ID)}')">Edit Template</button>`:''}<button class="btn secondary small" type="button" onclick="openAktivitiModal('${activityEsc_(r.AKTIVITI_ID)}')">Edit</button></div></td></tr>`).join('')}</tbody></table>`;
}
async function openAktivitiPermissionLetter(activityId){
  try{
    if(!activityId)return toast('ID aktiviti tidak sah.');
    const d=await apiGet('getAktivitiPeserta',{token:state.token,aktivitiId:activityId});
    const peserta=(d.data||[]).filter(x=>x.selected&&String(x.STATUS||'AKTIF').toUpperCase()==='AKTIF');
    if(!peserta.length){toast('Tiada peserta berdaftar. Daftarkan peserta terlebih dahulu.');return;}
    const a=d.aktiviti||{};const td=await apiGet('getPermissionLetterTemplate',{token:state.token});
    if(!window.confirm(`JANA SURAT KEBENARAN\n\nAktiviti: ${a.NAMA_AKTIVITI||'Aktiviti'}\nJumlah peserta: ${peserta.length}\n\nTeruskan?`))return;
    const w=window.open('','_blank');if(!w){toast('Popup disekat. Benarkan pop-up untuk e-KOSSTA.');return;}
    const pages=peserta.map((p,i)=>`<section class="permission-page">${suratTplReplace_(td.html||'',a,p,td)}<div class="page-no">Surat ${i+1} daripada ${peserta.length}</div></section>`).join('');
    w.document.open();w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Surat Kebenaran</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#e5e7eb;color:#111;font-family:Arial,sans-serif}.permission-page{width:210mm;min-height:297mm;padding:18mm;background:#fff;margin:0 auto;page-break-after:always;position:relative}.permission-page:last-child{page-break-after:auto}.page-no{position:absolute;bottom:8mm;right:12mm;font-size:8pt;color:#777}@media screen{body{padding:20px}.permission-page{box-shadow:0 3px 18px rgba(0,0,0,.18);margin-bottom:20px}}@media print{body{background:#fff}.permission-page{margin:0;box-shadow:none}}</style></head><body>${pages}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350));</script></body></html>`);w.document.close();w.focus();toast('Surat sedia untuk Print / Save as PDF.');
  }catch(e){toast(e.message||'Gagal menjana surat kebenaran.');}
}

async function loadActivityTeacherOptions_(selected=''){
  const sel=$('activityTeacher');if(!sel)return;
  try{
    const d=await apiGet('getGuru',{token:state.token});
    const teachers=(d.data||[]).filter(x=>String(x.STATUS||'AKTIF').toUpperCase()==='AKTIF');
    sel.innerHTML='<option value="">-- Pilih Guru --</option>'+teachers.map(x=>`<option value="${activityEsc_(x.NO_GURU)}">${activityEsc_(x.NAMA)} — ${activityEsc_(x.NO_GURU)}</option>`).join('');
    if(selected)sel.value=selected;
    if(state.user?.role==='GURU'){
      const me=teachers.find(x=>String(x.USER_ID||'')===String(state.user?.userId||''));
      if(me)sel.value=me.NO_GURU;
      sel.disabled=true;
    }else sel.disabled=false;
  }catch(e){toast(e.message||'Gagal memuatkan guru.');}
}
function updateActivityDay_(){if($('activityDay'))$('activityDay').value=activityDayFromDate_($('activityDate')?.value||'')}
async function openAktivitiModal(id=''){
  const modal=$('activityModal');if(!modal)return;
  $('activityForm').reset();$('activityId').value=id||'';$('activityModalTitle').textContent=id?'Kemaskini Aktiviti':'Tambah Aktiviti';
  $('activityDay').value='';
  const r=AKTIVITI_ROWS.find(x=>String(x.AKTIVITI_ID)===String(id));
  await loadActivityTeacherOptions_(r?.NO_GURU||'');
  if(r){
    $('activityName').value=r.NAMA_AKTIVITI||'';
    $('activityDate').value=String(r.TARIKH||'').slice(0,10);
    $('activityDay').value=r.HARI||activityDayFromDate_(r.TARIKH);
    $('activityTime').value=r.MASA||'';
    $('activityPlace').value=r.TEMPAT||'';
    $('activityLevelForm').value=r.PERINGKAT||'';
  }
  modal.hidden=false;document.body.classList.add('activity-modal-open');requestAnimationFrame(()=>modal.classList.add('show'));
}
function closeAktivitiModal(){const modal=$('activityModal');if(!modal)return;modal.classList.remove('show');document.body.classList.remove('activity-modal-open');setTimeout(()=>{modal.hidden=true},160)}
async function saveAktiviti(e){
  e.preventDefault();
  const b=$('activitySaveBtn');
  const p={token:state.token,aktivitiId:$('activityId').value.trim(),namaAktiviti:$('activityName').value.trim(),tarikh:$('activityDate').value,masa:$('activityTime').value,tempat:$('activityPlace').value.trim(),peringkat:$('activityLevelForm').value,noGuru:$('activityTeacher').value};
  if(!p.namaAktiviti||!p.tarikh||!p.tempat||!p.peringkat)return toast('Lengkapkan maklumat asas aktiviti.');
  b.disabled=true;b.textContent='Menyimpan...';
  try{const d=await apiGet('saveAktiviti',p);toast(d.message||'Aktiviti berjaya disimpan.');closeAktivitiModal();await loadAktivitiPage();}
  catch(e){toast(e.message||'Gagal menyimpan aktiviti.');}
  finally{b.disabled=false;b.textContent='Simpan Aktiviti';}
}

/* =========================================================
   V2.4 UNIT OVERVIEW
========================================================= */
let UNIT_OVERVIEW_ID='';
let UNIT_OVERVIEW_YEAR='';
function unitOverviewEsc_(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function unitStatusMark_(v){
  const s=String(v||'').toUpperCase();
  if(s==='HADIR')return '<span class="uo-status hadir">✓</span>';
  if(s==='TIDAK HADIR')return '<span class="uo-status tidak">✕</span>';
  if(s==='BERSEBAB')return '<span class="uo-status bersebab">B</span>';
  if(s==='CUTI')return '<span class="uo-status cuti">C</span>';
  return '<span class="uo-status kosong">–</span>';
}
function openUnitOverview(unitId,tahun){
  UNIT_OVERVIEW_ID=String(unitId||'');
  UNIT_OVERVIEW_YEAR=String(tahun||new Date().getFullYear());
  showPage('unit-overview');
}
async function loadUnitOverview(){
  const title=$('unitOverviewTitle');
  if(!UNIT_OVERVIEW_ID){showPage('unit');return;}
  ['unitOverviewMembers','unitOverviewWeeks','unitOverviewMemberAttendance','unitOverviewAjk'].forEach(id=>{if($(id))$(id).innerHTML='<div class="empty">Memuatkan data...</div>';});
  try{
    const d=await apiGet('getUnitOverview',{token:state.token,unitId:UNIT_OVERVIEW_ID,tahun:UNIT_OVERVIEW_YEAR});
    const u=d.unit||{};
    if(title)title.textContent=u.NAMA_UNIT||'Unit Kokurikulum';
    if($('unitOverviewMeta'))$('unitOverviewMeta').textContent=u.GURU_PENASIHAT?`Guru Penasihat: ${esc(u.GURU_PENASIHAT)}`:'';
    const st=d.stats||{};
    $('unitOverviewStats').innerHTML=`<div><b>${st.jumlahAhli||0}</b><small>Jumlah Ahli</small></div><div><b>${st.jumlahAJK||0}</b><small>AJK</small></div><div><b>${st.jumlahMingguDirekodkan||0}</b><small>Minggu Direkodkan</small></div><div><b>${(d.minggu||[]).filter(x=>x.ADA_REKOD).length?Math.round((d.minggu||[]).filter(x=>x.ADA_REKOD).reduce((a,x)=>a+x.PERATUS,0)/(d.minggu||[]).filter(x=>x.ADA_REKOD).length):0}%</b><small>Purata Kehadiran</small></div>`;
    renderUnitOverviewMembers_(d.ahli||[]);
    renderUnitOverviewWeeks_(d.minggu||[]);
    renderUnitOverviewMemberAttendance_(d.ahli||[]);
    renderUnitOverviewAjk_(d.ajk||[]);
  }catch(e){toast(e.message||'Gagal memuatkan butiran unit.');}
}
function renderUnitOverviewMembers_(rows){
  const w=$('unitOverviewMembers');if(!w)return;
  if(!rows.length){w.innerHTML='<div class="empty">Tiada ahli aktif bagi tahun ini.</div>';return;}
  w.innerHTML=`<table class="unit-overview-table"><thead><tr><th>#</th><th>Murid</th><th>Jantina</th><th>Tingkatan</th><th>Kelas</th><th>Status</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${unitOverviewEsc_(r.NAMA)}</b><small>${unitOverviewEsc_(r.NO_KP)}</small></td><td>${unitOverviewEsc_(r.JANTINA)}</td><td>${unitOverviewEsc_(r.TINGKATAN)}</td><td>${unitOverviewEsc_(r.KELAS)}</td><td>${unitOverviewEsc_(r.STATUS)}</td></tr>`).join('')}</tbody></table>`;
}
function renderUnitOverviewWeeks_(rows){
  const w=$('unitOverviewWeeks');if(!w)return;
  w.innerHTML=`<table class="unit-overview-table"><thead><tr><th>Minggu</th><th>Tarikh</th><th>Perjumpaan</th><th>Ahli</th><th>Hadir</th><th>Tidak Hadir</th><th>Bersebab</th><th>Cuti</th><th>Kehadiran</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.ADA_REKOD?'':'week-empty'}"><td><b>${r.MINGGU}</b></td><td>${r.TARIKH?new Date(r.TARIKH).toLocaleDateString('ms-MY'):'-'}</td><td>${r.NO_PERJUMPAAN||'-'}</td><td>${r.TOTAL}</td><td>${r.HADIR}</td><td>${r.TIDAK_HADIR}</td><td>${r.BERSEBAB}</td><td>${r.CUTI}</td><td><b>${r.PERATUS}%</b></td></tr>`).join('')}</tbody></table>`;
}
function renderUnitOverviewMemberAttendance_(rows){
  const w=$('unitOverviewMemberAttendance');if(!w)return;
  if(!rows.length){w.innerHTML='<div class="empty">Tiada ahli.</div>';return;}
  const weeks=Array.from({length:15},(_,i)=>i+1);
  w.innerHTML=`<div class="unit-overview-scroll"><table class="unit-overview-table unit-week-table"><thead><tr><th>Murid</th>${weeks.map(x=>`<th>M${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><td><b>${unitOverviewEsc_(r.NAMA)}</b><small>${unitOverviewEsc_(r.KELAS)}</small></td>${weeks.map(w=>`<td>${unitStatusMark_((r.MINGGU||{})[w]?.STATUS)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="unit-week-legend"><span>✓ Hadir</span><span>✕ Tidak Hadir</span><span>B Bersebab</span><span>C Cuti</span><span>– Tiada rekod</span></div>`;
}
function renderUnitOverviewAjk_(rows){
  const w=$('unitOverviewAjk');if(!w)return;
  if(!rows.length){w.innerHTML='<div class="empty">Belum ada rekod AJK untuk unit ini bagi tahun tersebut.</div>';return;}
  w.innerHTML=`<table class="unit-overview-table"><thead><tr><th>#</th><th>Murid</th><th>Jawatan</th><th>Tingkatan</th><th>Kelas</th><th>Status</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${unitOverviewEsc_(r.NAMA)}</b><small>${unitOverviewEsc_(r.NO_KP)}</small></td><td><span class="uo-role">${unitOverviewEsc_(r.JAWATAN)}</span></td><td>${unitOverviewEsc_(r.TINGKATAN)}</td><td>${unitOverviewEsc_(r.KELAS)}</td><td>${unitOverviewEsc_(r.STATUS)}</td></tr>`).join('')}</tbody></table>`;
}

/* =========================================================
   V2.4 KEHADIRAN FRONTEND
========================================================= */
let ATT_ROWS=[];
let ATT_UNITS=[];
function attYear_(){return String(new Date().getFullYear());}
function attDate_(){return new Date().toISOString().slice(0,10);}
function attEsc_(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function attSetKpi_(){
  const rows=ATT_ROWS||[]; const total=rows.length; const hadir=rows.filter(r=>r.STATUS==='HADIR').length; const tidak=rows.filter(r=>r.STATUS==='TIDAK HADIR').length;
  const pct=total?Math.round(hadir/total*100):0;
  if($('attKpiJumlah'))$('attKpiJumlah').textContent=total;
  if($('attKpiHadir'))$('attKpiHadir').textContent=hadir;
  if($('attKpiTidak'))$('attKpiTidak').textContent=tidak;
  if($('attKpiPeratus'))$('attKpiPeratus').textContent=pct+'%';
}
function attFillUnits_(units,selectId,placeholder){
  const el=$(selectId);if(!el)return;const current=el.value;
  el.innerHTML=`<option value="">${placeholder}</option>`+(units||[]).map(u=>`<option value="${attEsc_(u.UNIT_ID)}">${attEsc_(u.NAMA_UNIT)}</option>`).join('');
  if(current)el.value=current;
}
async function loadAttendancePage(){
  const y=$('attTahun');const d=$('attTarikh');if(y&&!y.value)y.value=attYear_();if(d&&!d.value)d.value=attDate_();
  try{const data=await apiGet('getUnit',{token:state.token});ATT_UNITS=(data.data||[]).filter(u=>String(u.STATUS||'').toUpperCase()==='AKTIF');attFillUnits_(ATT_UNITS,'attUnit','-- Pilih Unit --');attFillUnits_(ATT_UNITS,'attRecordUnit','Semua Unit');await loadAttendanceRecords();}catch(e){toast(e.message)}
}
async function loadAttendanceForm(){
  const unit=$('attUnit')?.value,tahun=$('attTahun')?.value,tarikh=$('attTarikh')?.value,minggu=$('attMinggu')?.value;
  if(!unit||!tahun||!tarikh)return toast('Pilih unit, tahun dan tarikh dahulu.');
  const b=$('attLoadBtn');b.disabled=true;b.textContent='Memuatkan...';
  try{
    const d=await apiGet('getAttendanceForm',{token:state.token,unitId:unit,tahun,tarikh});
    if($('attMinggu')&&!minggu&&d.minggu)$('attMinggu').value=d.minggu;
    if($('attNoPerjumpaan'))$('attNoPerjumpaan').value=d.noPerjumpaan||'';
    ATT_ROWS=(d.members||[]).map(x=>({...x}));renderAttendanceTable_();
    $('attendanceEntryPanel').hidden=false;$('attSaveBtn').disabled=!ATT_ROWS.length;$('attFormResult').textContent=`${ATT_ROWS.length} ahli aktif • Perjumpaan ${d.noPerjumpaan||'-'}`;attSetKpi_();
  }catch(e){toast(e.message);$('attendanceEntryPanel').hidden=true}finally{b.disabled=false;b.textContent='Muat Senarai Ahli'}
}
function renderAttendanceTable_(){
  const wrap=$('attendanceTableWrap');if(!wrap)return;
  if(!ATT_ROWS.length){wrap.innerHTML='<div class="empty">Tiada ahli aktif ditemui untuk unit dan tahun ini.</div>';return;}
  const rows=ATT_ROWS.map((r,i)=>`<tr data-att-row="${i}"><td>${i+1}</td><td><b>${attEsc_(r.NAMA)}</b><small>${attEsc_(r.NO_KP)}</small></td><td>${attEsc_(r.KELAS||'-')}</td><td>${attEsc_(r.JANTINA||'-')}</td><td><select class="att-status" data-index="${i}"><option>HADIR</option><option>TIDAK HADIR</option><option>BERSEBAB</option><option>CUTI</option></select></td><td><input class="att-note" data-index="${i}" value="${attEsc_(r.CATATAN||'')}" placeholder="Catatan"></td></tr>`).join('');
  wrap.innerHTML=`<table class="attendance-table"><thead><tr><th>#</th><th>Murid</th><th>Kelas</th><th>Jantina</th><th>Status</th><th>Catatan</th></tr></thead><tbody>${rows}</tbody></table>`;
  wrap.querySelectorAll('.att-status').forEach(e=>{e.value=ATT_ROWS[Number(e.dataset.index)].STATUS||'HADIR';e.addEventListener('change',()=>{ATT_ROWS[Number(e.dataset.index)].STATUS=e.value;attSetKpi_()})});
  wrap.querySelectorAll('.att-note').forEach(e=>e.addEventListener('input',()=>{ATT_ROWS[Number(e.dataset.index)].CATATAN=e.value}));
}
function bulkAttendanceStatus(status){ATT_ROWS.forEach(r=>r.STATUS=status);renderAttendanceTable_();attSetKpi_()}
async function saveAttendance(){
  if(!ATT_ROWS.length)return toast('Tiada senarai murid untuk disimpan.');
  const minggu=$('attMinggu')?.value;if(!minggu)return toast('Masukkan Minggu Persekolahan.');
  const b=$('attSaveBtn');b.disabled=true;b.textContent='Menyimpan...';
  try{const p={token:state.token,unitId:$('attUnit').value,tahun:$('attTahun').value,tarikh:$('attTarikh').value,minggu,noPerjumpaan:$('attNoPerjumpaan').value,members:JSON.stringify(ATT_ROWS.map(r=>({NO_KP:r.NO_KP,STATUS:r.STATUS||'HADIR',CATATAN:r.CATATAN||''})))};const d=await apiGet('saveAttendance',p);$('attFormResult').textContent=d.message||'Berjaya.';toast(d.message||'Kehadiran berjaya disimpan.');await loadAttendanceRecords();}catch(e){toast(e.message)}finally{b.disabled=false;b.textContent='Simpan Kehadiran'}
}
async function loadAttendanceRecords(){
  if(!$('attendanceRecordsWrap'))return;
  try{const p={token:state.token,tahun:$('attTahun')?.value||attYear_(),unitId:$('attRecordUnit')?.value||'',minggu:$('attRecordMinggu')?.value||''};const d=await apiGet('getAttendanceRecords',p);renderAttendanceRecords_(d.data||[]);}catch(e){toast(e.message)}
}
function renderAttendanceRecords_(rows){
  const wrap=$('attendanceRecordsWrap');if(!wrap)return;if(!rows.length){wrap.innerHTML='<div class="empty">Belum ada rekod kehadiran.</div>';return;}
  wrap.innerHTML=`<table class="attendance-table"><thead><tr><th>Unit</th><th>Tarikh</th><th>Minggu</th><th>Perjumpaan</th><th>Hadir</th><th>Tidak Hadir</th><th>Kehadiran</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${attEsc_(r.NAMA_UNIT)}</td><td>${new Date(r.TARIKH).toLocaleDateString('ms-MY')}</td><td>${attEsc_(r.MINGGU)}</td><td>${attEsc_(r.NO_PERJUMPAAN)}</td><td>${r.HADIR}</td><td>${r.TIDAK_HADIR}</td><td><b>${r.PERATUS}%</b></td></tr>`).join('')}</tbody></table>`;
}


document.addEventListener('click',e=>{
  if(e.target && e.target.id==='unitOverviewBackBtn')showPage('unit');
  if(e.target && e.target.id==='unitOverviewRefreshBtn')loadUnitOverview();
});
document.addEventListener('DOMContentLoaded',init);


let AKTIVITI_PESERTA_STATE={aktiviti:null,rows:[],classes:[]};
async function openAktivitiPeserta(id){state.currentActivityId=String(id||'');showPage('activity-participants');}
async function loadAktivitiPesertaPage(){
  const id=String(state.currentActivityId||'');if(!id){showPage('activity');return;}
  try{
    const d=await apiGet('getAktivitiPeserta',{token:state.token,aktivitiId:id});
    AKTIVITI_PESERTA_STATE={aktiviti:d.aktiviti||null,rows:d.data||[],classes:d.classes||[]};
    const a=AKTIVITI_PESERTA_STATE.aktiviti||{};
    if($('activityParticipantsTitle'))$('activityParticipantsTitle').textContent=a.NAMA_AKTIVITI||'Daftar Peserta';
    if($('activityParticipantsMeta'))$('activityParticipantsMeta').textContent=[activityDate_(a.TARIKH),a.TEMPAT,a.PERINGKAT].filter(Boolean).join(' • ');
    const sel=$('activityParticipantClass');if(sel){sel.innerHTML='<option value="">Semua Kelas</option>'+AKTIVITI_PESERTA_STATE.classes.map(x=>`<option value="${activityEsc_(x)}">${activityEsc_(x)}</option>`).join('');}
    if($('activityParticipantSearch'))$('activityParticipantSearch').value='';renderAktivitiPesertaTable_();
  }catch(e){toast(e.message||'Gagal memuatkan peserta.');showPage('activity');}
}
function renderAktivitiPesertaTable_(){
  const wrap=$('activityParticipantsTableWrap');if(!wrap)return;
  const cls=String($('activityParticipantClass')?.value||'');const q=String($('activityParticipantSearch')?.value||'').trim().toLowerCase();
  const rows=AKTIVITI_PESERTA_STATE.rows.filter(r=>(!cls||String(r.KELAS)===cls)&&(!q||String(r.NAMA).toLowerCase().includes(q)||String(r.NO_KP).toLowerCase().includes(q)));
  const selected=AKTIVITI_PESERTA_STATE.rows.filter(r=>r.selected).length;if($('activityParticipantsCount'))$('activityParticipantsCount').textContent=`${selected} peserta dipilih`;
  wrap.innerHTML=`<table class="activity-participant-table"><thead><tr><th>PILIH</th><th>NAMA MURID</th><th>NO. KP</th><th>TINGKATAN</th><th>KELAS</th><th>JANTINA</th><th>PERANAN</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td><input class="activity-participant-check" type="checkbox" data-kp="${activityEsc_(r.NO_KP)}" ${r.selected?'checked':''}></td><td><b>${activityEsc_(r.NAMA)}</b></td><td>${activityEsc_(r.NO_KP)}</td><td>${activityEsc_(r.TINGKATAN||'-')}</td><td>${activityEsc_(r.KELAS||'-')}</td><td>${activityEsc_(r.JANTINA||'-')}</td><td><input class="activity-participant-role" data-kp="${activityEsc_(r.NO_KP)}" value="${activityEsc_(r.peranan||'PESERTA')}" ${r.selected?'':'disabled'}></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty">Tiada murid ditemui.</div></td></tr>'}</tbody></table>`;
  wrap.querySelectorAll('.activity-participant-check').forEach(ch=>ch.addEventListener('change',e=>{const r=AKTIVITI_PESERTA_STATE.rows.find(x=>String(x.NO_KP)===String(e.target.dataset.kp));if(!r)return;r.selected=e.target.checked;renderAktivitiPesertaTable_();}));
  wrap.querySelectorAll('.activity-participant-role').forEach(inp=>inp.addEventListener('input',e=>{const r=AKTIVITI_PESERTA_STATE.rows.find(x=>String(x.NO_KP)===String(e.target.dataset.kp));if(r)r.peranan=e.target.value;}));
}
async function saveAktivitiPeserta(){
  const id=String(state.currentActivityId||'');if(!id)return;const selected=AKTIVITI_PESERTA_STATE.rows.filter(r=>r.selected).map(r=>({NO_KP:r.NO_KP,PERANAN:r.peranan||'PESERTA'}));const b=$('activityParticipantsSaveBtn');if(b){b.disabled=true;b.textContent='Menyimpan...';}
  try{const d=await apiGet('saveAktivitiPeserta',{token:state.token,aktivitiId:id,peserta:JSON.stringify(selected)});toast(d.message||'Peserta berjaya disimpan.');await loadAktivitiPesertaPage();}catch(e){toast(e.message||'Gagal menyimpan peserta.');}finally{if(b){b.disabled=false;b.textContent='Simpan Peserta';}}
}
