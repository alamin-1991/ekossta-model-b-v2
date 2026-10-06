const $=id=>document.getElementById(id);
const state={apiUrl:localStorage.getItem('ekossta_model_b_api_url')||'',dark:localStorage.getItem('ekossta_model_b_dark')==='1',token:sessionStorage.getItem('ekossta_v2_token')||'',user:JSON.parse(sessionStorage.getItem('ekossta_v2_user')||'null')};
function init(){if(state.dark){document.documentElement.classList.add('dark');$('themeBtn').textContent='☀️'}$('themeBtn').onclick=toggleTheme;$('loginBtn').onclick=login;$('logoutBtn').onclick=logout;$('meBtn').onclick=me;$('loadBtn').onclick=loadMurid;$('refreshBtn').onclick=loadMurid;$('addBtn').onclick=addMurid;$('addUserBtn').onclick=addUser;$('usersRefreshBtn').onclick=loadUsers;if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(console.warn);if(state.token&&state.user)showApp();else showLogin()}
function apiGet(action,params={}){return new Promise((resolve,reject)=>{let u;try{u=new URL(state.apiUrl||prompt('Masukkan URL Apps Script /exec'))}catch(e){reject(Error('URL backend tidak sah.'));return}if(!state.apiUrl){state.apiUrl=u.toString();localStorage.setItem('ekossta_model_b_api_url',state.apiUrl)}const cb='__ekossta_v2_'+Date.now()+'_'+Math.random().toString(36).slice(2),q=new URLSearchParams({action,callback:cb,...params}),s=document.createElement('script');s.src=u.origin+u.pathname+'?'+q;s.async=true;let timer;window[cb]=data=>{clearTimeout(timer);delete window[cb];s.remove();data&&data.ok===false?reject(Error(data.error||'Backend error.')):resolve(data)};s.onerror=()=>{clearTimeout(timer);delete window[cb];s.remove();reject(Error('Gagal menghubungi Apps Script.'))};timer=setTimeout(()=>{delete window[cb];s.remove();reject(Error('Backend timeout.'))},15000);document.head.appendChild(s)})}
async function login(){const b=$('loginBtn'),username=$('username').value.trim(),password=$('password').value;if(!username||!password)return toast('Masukkan username dan password.');if(!state.apiUrl){const u=prompt('Masukkan URL Apps Script /exec');if(!u)return;if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(u.trim()))return toast('URL /exec tidak sah.');state.apiUrl=u.trim();localStorage.setItem('ekossta_model_b_api_url',state.apiUrl)}b.disabled=true;b.textContent='⏳ Mengesahkan...';try{const d=await apiGet('login',{username,password});state.token=d.token;state.user=d.user;sessionStorage.setItem('ekossta_v2_token',state.token);sessionStorage.setItem('ekossta_v2_user',JSON.stringify(state.user));$('password').value='';showApp();toast('Login berjaya.')}catch(e){$('loginResult').textContent=e.message;toast(e.message)}finally{b.disabled=false;b.textContent='Log Masuk'}}
async function logout(){try{if(state.token)await apiGet('logout',{token:state.token})}catch(e){}state.token='';state.user=null;sessionStorage.removeItem('ekossta_v2_token');sessionStorage.removeItem('ekossta_v2_user');showLogin();toast('Logout berjaya.')}
async function me(){try{const d=await apiGet('me',{token:state.token});$('meResult').textContent='Session sah sehingga '+new Date(d.expiresAt).toLocaleString('ms-MY')}catch(e){toast(e.message);if(/Session/.test(e.message))logout()}}
async function loadMurid(){try{const d=await apiGet('getMurid',{token:state.token});render(d.data||[]);$('muridCount').textContent=(d.data||[]).length;toast('Data dimuat.')}catch(e){toast(e.message)}}
async function addMurid(){if(!['ADMIN','GURU'].includes(state.user?.role))return toast('Akses ditolak.');const b=$('addBtn'),p={token:state.token,nama:$('nama').value.trim(),noKp:$('noKp').value.trim(),tingkatan:$('tingkatan').value.trim(),kelas:$('kelas').value.trim()};if(Object.values(p).some(x=>!x))return toast('Lengkapkan semua medan.');b.disabled=true;b.textContent='⏳ Menyimpan...';try{const d=await apiGet('addMurid',p);$('addResult').textContent=d.message||'Berjaya.';['nama','noKp','tingkatan','kelas'].forEach(id=>$(id).value='');await loadMurid();toast('Murid ditambah.')}catch(e){$('addResult').textContent=e.message;toast(e.message)}finally{b.disabled=false;b.textContent='Tambah ke Google Sheet'}}

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
function render(rows){const wrap=$('tableWrap');if(!rows.length){wrap.innerHTML='<div class="empty">Tiada data.</div>';return}const cols=['ID','NO_KP','NAMA','TINGKATAN','KELAS','STATUS'],t=document.createElement('table'),thead=document.createElement('thead'),hr=document.createElement('tr');cols.forEach(c=>{const th=document.createElement('th');th.textContent=c;hr.appendChild(th)});thead.appendChild(hr);t.appendChild(thead);const tb=document.createElement('tbody');rows.forEach(r=>{const tr=document.createElement('tr');cols.forEach(c=>{const td=document.createElement('td');td.textContent=r[c]??'';tr.appendChild(td)});tb.appendChild(tr)});t.appendChild(tb);wrap.replaceChildren(t)}
function showLogin(){$('loginView').hidden=false;$('appView').hidden=true}
function showApp(){$('loginView').hidden=true;$('appView').hidden=false;$('welcome').textContent=`Selamat datang, ${state.user?.nama||state.user?.username||''}.`;$('roleValue').textContent=state.user?.role||'-';const isAdmin=state.user?.role==='ADMIN';$('adminSection').hidden=!['ADMIN','GURU'].includes(state.user?.role);$('userSection').hidden=!isAdmin;loadMurid();if(isAdmin)loadUsers()}
function toggleTheme(){state.dark=!state.dark;document.documentElement.classList.toggle('dark',state.dark);localStorage.setItem('ekossta_model_b_dark',state.dark?'1':'0');$('themeBtn').textContent=state.dark?'☀️':'🌙'}
function toast(m){const e=$('toast');e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),3200)}
document.addEventListener('DOMContentLoaded',init);
