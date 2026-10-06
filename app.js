const $=id=>document.getElementById(id);
const state={apiUrl:localStorage.getItem('ekossta_model_b_api_url')||'',dark:localStorage.getItem('ekossta_model_b_dark')==='1',token:sessionStorage.getItem('ekossta_v2_token')||'',user:JSON.parse(sessionStorage.getItem('ekossta_v2_user')||'null')};

function isDesktopSidebar_(){
  return window.matchMedia('(min-width: 769px)').matches;
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
      if(isDesktopSidebar_()){
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
      ['aktiviti','Aktiviti & Acara','V2.5'],
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
    return ['unit','penempatan','murid','reports','attendance'].includes(page);
  };
  const isDisabled=page=>!allowed(page)||['aktiviti','peserta','pencapaian','galeri'].includes(page);

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
  if(page==='users')loadUsers();

  // Pastikan submenu induk terbuka apabila halaman anak dipilih.
  const active=document.querySelector('.nav-item[data-page="'+page+'"]');
  if(active){
    document.querySelectorAll('.nav-group').forEach(g=>{
      if(g.contains(active)){
        g.classList.add('open');
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
  const cards=$('unitCards'),wrap=$('unitTableWrap');
  if(!rows.length){cards.innerHTML='';$('unitSummary').innerHTML='';wrap.innerHTML='<div class="empty">Tiada unit direkodkan.</div>';return}
  const totals=rows.reduce((a,r)=>({unit:a.unit+1,ahli:a.ahli+Number(r.JUMLAH_AHLI||0),lelaki:a.lelaki+Number(r.LELAKI||0),perempuan:a.perempuan+Number(r.PEREMPUAN||0)}),{unit:0,ahli:0,lelaki:0,perempuan:0});$('unitSummary').innerHTML=`<div><b>${totals.unit}</b><small>Unit</small></div><div><b>${totals.ahli}</b><small>Jumlah ahli</small></div><div><b>${totals.lelaki}</b><small>Lelaki</small></div><div><b>${totals.perempuan}</b><small>Perempuan</small></div>`;
  cards.innerHTML=rows.map(r=>`<div class="unit-card"><div class="unit-card-top"><span class="unit-category">${esc(r.KATEGORI)}</span><span class="unit-status ${String(r.STATUS)==='AKTIF'?'on':'off'}">${esc(r.STATUS)}</span></div><h3>${esc(r.NAMA_UNIT)}</h3><p class="muted">Guru: ${esc(r.GURU_PENASIHAT||'Belum ditetapkan')} • Tahun ${esc(r.TAHUN)}</p><div class="unit-counts"><div><b>${Number(r.JUMLAH_AHLI||0)}</b><small>Jumlah</small></div><div><b>${Number(r.LELAKI||0)}</b><small>Lelaki</small></div><div><b>${Number(r.PEREMPUAN||0)}</b><small>Perempuan</small></div></div><button class="btn secondary small" onclick="viewUnitMembers('${escAttr(r.UNIT_ID)}')">Lihat Ahli</button>${state.user?.role==='ADMIN'?`<button class="btn secondary small" onclick="editUnit('${escAttr(r.UNIT_ID)}')">Edit</button><button class="btn secondary small" onclick="toggleUnit('${escAttr(r.UNIT_ID)}','${String(r.STATUS)==='AKTIF'?'TIDAK_AKTIF':'AKTIF'}')">${String(r.STATUS)==='AKTIF'?'Nyahaktif':'Aktifkan'}</button>`:''}</div>`).join('');
  const t=document.createElement('table'),thead=document.createElement('thead'),hr=document.createElement('tr');['UNIT','KATEGORI','GURU PENASIHAT','TAHUN','JUMLAH','LELAKI','PEREMPUAN','STATUS'].forEach(c=>{const th=document.createElement('th');th.textContent=c;hr.appendChild(th)});thead.appendChild(hr);t.appendChild(thead);const tb=document.createElement('tbody');rows.forEach(r=>{const tr=document.createElement('tr');[r.NAMA_UNIT,r.KATEGORI,r.GURU_PENASIHAT||'-',r.TAHUN,r.JUMLAH_AHLI||0,r.LELAKI||0,r.PEREMPUAN||0,r.STATUS].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.appendChild(td)});tb.appendChild(tr)});t.appendChild(tb);wrap.replaceChildren(t);
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
    $('attendanceEntryPanel').hidden=false;$('attSaveBtn').disabled=!ATT_ROWS.length;
    if(ATT_ROWS.length){
      $('attFormResult').textContent=`${ATT_ROWS.length} ahli aktif • Perjumpaan ${d.noPerjumpaan||'-'}`;
    }else{
      const unitName=d.unit?.NAMA_UNIT||$('attUnit')?.selectedOptions?.[0]?.textContent||'unit dipilih';
      $('attFormResult').innerHTML=`<b>Tiada murid ditemui.</b> Unit <b>${attEsc_(unitName)}</b> belum mempunyai penempatan murid <b>AKTIF</b> bagi tahun <b>${attEsc_(tahun)}</b>. Semak menu <b>Unit Kokurikulum → Lihat Ahli</b> dan pastikan tahun penempatan sama.`;
    }
    attSetKpi_();
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

document.addEventListener('DOMContentLoaded',init);
