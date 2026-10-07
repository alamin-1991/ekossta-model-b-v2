

    'use strict';


    /* =======================================================
       GLOBAL STATE
       ======================================================= */

    const EK = {

      token: null,

      user: null,

      currentPage: 'dashboard',

      theme: 'light',

      initialized: false

    };


    /* =======================================================
       PAGE LABELS
       ======================================================= */

    const PAGE_LABELS = {

      dashboard: 'Dashboard',

      murid: 'Murid',

      guru: 'Guru',

      unit: 'Unit',

      penempatan: 'Profil Murid',

      kehadiran: 'Kehadiran',

      aktiviti: 'Aktiviti & Acara',

      pencapaian: 'Pencapaian',


      ajk: 'AJK Unit',

      pajsk: 'PAJSK',

      analisis: 'Analisis',

      laporan: 'Laporan',

      galeri: 'Galeri',
      import: 'Import Data',

      backup: 'Backup',

      audit: 'Audit',

      tetapan: 'Tetapan'

    };


    /* =======================================================
       DOM READY
       ======================================================= */

    document.addEventListener(
      'DOMContentLoaded',
      initApp
    );


    function initApp() {

      if (EK.initialized) {
        return;
      }

      EK.initialized = true;

      bindEvents();

      loadTheme();

      // Nama sistem dimuatkan SEBELUM/serentak dengan semakan sesi.
      // Endpoint ini hanya memulangkan APP_NAME dan tidak memerlukan login.
      loadPublicAppName();

      checkExistingSession();

    }


    async function loadPublicAppName() {

      try {
        const name = await server('getPublicAppName');
        applyAppNameFromSettings({ APP_NAME: name });
      } catch (error) {
        // Fallback kepada nama lalai yang sedia ada.
        console.warn('PUBLIC APP NAME:', error);
      }

    }


    /* =======================================================
       EVENT BINDING
       ======================================================= */

    function bindEvents() {

      const loginForm =
        document.getElementById('loginForm');

      if (loginForm) {

        loginForm.addEventListener(
          'submit',
          handleLogin
        );

      }
      
      const loginMoeButton =
       document.getElementById('loginMoeButton');

      if (loginMoeButton) {
       loginMoeButton.addEventListener(
        'click',
        handleMoeLogin
       );
      }

      const passwordToggle =
        document.getElementById(
          'passwordToggle'
        );

      if (passwordToggle) {

        passwordToggle.addEventListener(
          'click',
          togglePassword
        );

      }


      const themeButton =
        document.getElementById(
          'themeButton'
        );

      if (themeButton) {

        themeButton.addEventListener(
          'click',
          toggleTheme
        );

      }


      const mobileMenuButton =
        document.getElementById(
          'mobileMenuButton'
        );

      if (mobileMenuButton) {

        mobileMenuButton.addEventListener(
          'click',
          openMobileSidebar
        );

      }


      const sidebarClose =
        document.getElementById(
          'sidebarClose'
        );

      if (sidebarClose) {

        sidebarClose.addEventListener(
          'click',
          closeMobileSidebar
        );

      }


      const sidebarOverlay =
        document.getElementById(
          'sidebarOverlay'
        );

      if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
          'click',
          closeMobileSidebar
        );

      }


      document
        .querySelectorAll('.nav-group-header')
        .forEach(function(button) {

          button.addEventListener(
            'click',
            function() {

              toggleNavGroup(
                button.closest('.nav-group')
              );

            }
          );

        });


      document
        .querySelectorAll(
          '.nav-item[data-page], .quick-item[data-page], .text-button[data-page]'
        )
        .forEach(function(element) {

          element.addEventListener(
            'click',
            function() {

              navigateTo(
                element.dataset.page,
                element.dataset.analysisView || ''
              );

            }
          );

        });


      const refreshButton =
        document.getElementById(
          'refreshDashboardButton'
        );

      if (refreshButton) {

        refreshButton.addEventListener(
          'click',
          refreshDashboard
        );

      }


      const modalOverlay =
        document.getElementById(
          'modalOverlay'
        );

      if (modalOverlay) {

        modalOverlay.addEventListener(
          'click',
          function(event) {

            if (
              event.target === modalOverlay
            ) {

              closeModal();

            }

          }
        );

      }


      const modalClose =
        document.getElementById(
          'modalClose'
        );

      if (modalClose) {

        modalClose.addEventListener(
          'click',
          closeModal
        );

      }


      document.addEventListener(
        'keydown',
        handleKeyboard
      );

    }


    /* =======================================================
       GOOGLE APPS SCRIPT SERVER WRAPPER
       ======================================================= */

    /* =======================================================
       GOOGLE APPS SCRIPT SERVER WRAPPER — PERFORMANCE PATCH
       - Dedup request serentak yang sama
       - Cache ringkas untuk READ sahaja
       - WRITE/DELETE automatik membersihkan cache
       - Tidak mengubah nama API server sedia ada
       ======================================================= */
    const EK_SERVER_CACHE_TTL = 8000;
    const EK_SERVER_CACHE = Object.create(null);
    const EK_SERVER_INFLIGHT = Object.create(null);
    const EK_SERVER_READS = new Set([
      'dashboard','getAnalysisDashboard','getDashboardQuickAccess',
      'getGuru','getUnits','getAttendanceSession','getMurid','getStudents',
      'getPenempatan','getAktiviti','getPencapaian','getPesertaAktiviti',
      'getAjkUnit','getLaporanAktiviti','getCalendar','getKalendar',
      'getGaleri','getSurat','getUsers','getSettings','getReportTheme',
      'getPermissionLetterTemplate','getPermissionLetterEditorData',
      'getFactoryResetStatus'
    ]);
    const EK_SERVER_WRITES = /^(save|create|update|delete|remove|reset|factoryReset|import|clear|assign|register|mark|submit)/i;

    function _ekServerKey_(method, args) {
      let a='';
      try { a=JSON.stringify(args); } catch(e) { a=String(args); }
      return String(method)+'|'+a;
    }
    function _ekClearServerCache_() {
      Object.keys(EK_SERVER_CACHE).forEach(function(k){ delete EK_SERVER_CACHE[k]; });
    }
    function server(method, ...args) {
      if (typeof google === 'undefined' || !google.script || !google.script.run) {
        return Promise.reject(new Error('Google Apps Script tidak tersedia.'));
      }
      const key=_ekServerKey_(method,args);
      const now=Date.now();
      if(EK_SERVER_READS.has(String(method))){
        const cached=EK_SERVER_CACHE[key];
        if(cached && (now-cached.time)<EK_SERVER_CACHE_TTL) return Promise.resolve(cached.value);
      }
      if(EK_SERVER_INFLIGHT[key]) return EK_SERVER_INFLIGHT[key];

      const p=new Promise(function(resolve,reject){
        try {
          google.script.run
            .withSuccessHandler(function(result){
              if(EK_SERVER_READS.has(String(method))) EK_SERVER_CACHE[key]={time:Date.now(),value:result};
              else if(EK_SERVER_WRITES.test(String(method))) _ekClearServerCache_();
              resolve(result);
            })
            .withFailureHandler(function(error){
              reject(error instanceof Error ? error : new Error(error && error.message ? error.message : String(error)));
            })[method](...args);
        } catch(error) { reject(error); }
      });
      EK_SERVER_INFLIGHT[key]=p;
      p.then(function(){delete EK_SERVER_INFLIGHT[key];},function(){delete EK_SERVER_INFLIGHT[key];});
      return p;
    }


    /* =======================================================
       LOGIN
       ======================================================= */

    function handleMoeLogin() {

  console.log('GOOGLE/MOE BUTTON DIKLIK');

  const button =
    document.getElementById('loginMoeButton');

  if (!button) {
    console.error('loginMoeButton tidak dijumpai.');
    return;
  }

  button.disabled = true;

  button.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i>' +
    '<span>Mengenal pasti akaun...</span>';

  server('loginGuruMoe')
    .then(function(result) {

      console.log('MOE LOGIN RESULT:', result);

      button.disabled = false;

      button.innerHTML =
        '<i class="fa-brands fa-google"></i>' +
        '<span>Log Masuk dengan Google / MOE</span>';

      if (!result || !result.token || !result.user) {
        showLoginError(
          'Maklumat log masuk tidak lengkap.'
        );
        return;
      }

      EK.token = result.token;
      EK.user = result.user;

      saveSession();

      showToast(
        'Log masuk Google / MOE berjaya.',
        'success'
      );

      showApp();

    })
    .catch(function(error) {

      console.error(
        'GOOGLE/MOE LOGIN ERROR:',
        error
      );

      button.disabled = false;

      button.innerHTML =
        '<i class="fa-brands fa-google"></i>' +
        '<span>Log Masuk dengan Google / MOE</span>';

      showLoginError(
        getErrorMessage(error)
      );
    });
}

    function completeMoeLogin_(result) {
      EK.token = result.token;
      EK.user = result.user;
      saveSession();
      showToast('Log masuk Google / MOE berjaya.', 'success');
      showApp();
      if (result && result.needsPembimbingRegistration) {
        setTimeout(function(){ openGuruPembimbingModal_(); }, 350);
      }
    }

    function ensureMoeRegistrationModal_() {
      if (document.getElementById('moeRegistrationModal')) return document.getElementById('moeRegistrationModal');
      const style = document.createElement('style');
      style.id = 'moeRegistrationModalStyle';
      style.textContent = `
        .moe-reg-modal{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(10,14,25,.72);backdrop-filter:blur(8px)}
        .moe-reg-modal.open{display:flex}
        .moe-reg-card{width:min(520px,100%);background:var(--surface,#fff);border:1px solid rgba(255,255,255,.12);border-radius:22px;box-shadow:0 24px 80px rgba(0,0,0,.28);overflow:hidden}
        .moe-reg-head{padding:24px 26px 18px;border-bottom:1px solid rgba(127,127,127,.16)}
        .moe-reg-head h2{margin:0 0 6px;font-size:22px}
        .moe-reg-head p{margin:0;color:var(--muted-text,#78788c);font-size:13px;line-height:1.5}
        .moe-reg-body{padding:22px 26px}
        .moe-reg-field{margin-bottom:15px}
        .moe-reg-field label{display:block;margin-bottom:7px;font-size:13px;font-weight:700}
        .moe-reg-field input{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid rgba(127,127,127,.28);border-radius:11px;background:transparent;color:inherit;outline:none}
        .moe-reg-field input:focus{border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.12)}
        .moe-reg-email{background:rgba(139,92,246,.08)!important;color:#7c3aed!important}
        .moe-reg-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
        .moe-reg-btn{border:0;border-radius:11px;padding:11px 17px;font-weight:700;cursor:pointer}
        .moe-reg-cancel{background:rgba(127,127,127,.12);color:inherit}
        .moe-reg-submit{background:#8b5cf6;color:#fff}
        .moe-reg-submit:disabled{opacity:.6;cursor:not-allowed}
        .moe-reg-status{min-height:20px;margin-top:10px;font-size:13px;color:#ef4444}
      `;
      document.head.appendChild(style);
      const modal=document.createElement('div');
      modal.id='moeRegistrationModal';
      modal.className='moe-reg-modal';
      modal.innerHTML=`<div class="moe-reg-card" role="dialog" aria-modal="true" aria-labelledby="moeRegTitle"><div class="moe-reg-head"><h2 id="moeRegTitle">Pendaftaran Guru</h2><p>Akaun MOE anda belum mempunyai rekod dalam ${ekAppName()}. Lengkapkan maklumat di bawah untuk mendaftar dan terus log masuk.</p></div><div class="moe-reg-body"><div class="moe-reg-field"><label>Email MOE</label><input id="moeRegEmail" class="moe-reg-email" type="email" readonly></div><div class="moe-reg-field"><label>No. Guru</label><input id="moeRegNoGuru" class="moe-reg-email" type="text" readonly><small style="display:block;margin-top:6px;color:var(--muted-text,#78788c)">No. Guru dijana automatik mengikut urutan pendaftaran.</small></div><div class="moe-reg-field"><label>Nama Guru *</label><input id="moeRegNama" type="text" maxlength="150" placeholder="Nama penuh guru" autocomplete="name"></div><div class="moe-reg-field"><label>No. Telefon</label><input id="moeRegNoTel" type="tel" maxlength="30" placeholder="Contoh: 0123456789" autocomplete="tel"></div><div id="moeRegStatus" class="moe-reg-status"></div><div class="moe-reg-actions"><button type="button" class="moe-reg-btn moe-reg-cancel" onclick="closeMoeRegistrationModal()">Batal</button><button type="button" id="moeRegSubmit" class="moe-reg-btn moe-reg-submit" onclick="submitMoeRegistration()"><i class="fa-solid fa-user-plus"></i> Daftar & Log Masuk</button></div></div></div>`;
      modal.addEventListener('click',function(e){if(e.target===modal)closeMoeRegistrationModal();});
      document.body.appendChild(modal);
      return modal;
    }

    function openMoeRegistrationModal(email, suggestedNoGuru) {
      const modal=ensureMoeRegistrationModal_();
      document.getElementById('moeRegEmail').value=email||'';
      document.getElementById('moeRegNoGuru').value=suggestedNoGuru||'';
      document.getElementById('moeRegNama').value='';
      document.getElementById('moeRegNoTel').value='';
      document.getElementById('moeRegStatus').textContent='';
      modal.classList.add('open');
      setTimeout(function(){document.getElementById('moeRegNoGuru')?.focus();},80);
    }

    function closeMoeRegistrationModal(){
      document.getElementById('moeRegistrationModal')?.classList.remove('open');
    }

    async function submitMoeRegistration(){
      const btn=document.getElementById('moeRegSubmit');
      const status=document.getElementById('moeRegStatus');
      const nama=document.getElementById('moeRegNama')?.value.trim()||'';
      const noTel=document.getElementById('moeRegNoTel')?.value.trim()||'';
      if(!nama){status.textContent='Nama Guru wajib diisi.';return;}
      btn.disabled=true;
      status.textContent='Mendaftarkan guru...';
      try{
        const result=await server('registerGuruMoe',nama,noTel);
        if(!result||!result.token||!result.user)throw new Error('Pendaftaran tidak lengkap.');
        closeMoeRegistrationModal();
        completeMoeLogin_(result);
      }catch(error){
        status.textContent=getErrorMessage(error);
      }finally{
        btn.disabled=false;
      }
    }

    function ensureGuruPembimbingModal_(){
      let modal=document.getElementById('guruPembimbingModal');
      if(modal)return modal;
      const style=document.createElement('style');
      style.id='guruPembimbingModalStyle';
      style.textContent=`
        .gpb-modal{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(10,14,25,.72);backdrop-filter:blur(8px)}
        .gpb-modal.open{display:flex}
        .gpb-card{width:min(820px,100%);max-height:90vh;overflow:auto;background:var(--surface,#151a2a);border:1px solid rgba(255,255,255,.14);border-radius:22px;box-shadow:0 24px 80px rgba(0,0,0,.35)}
        .gpb-head{padding:26px 30px 20px;border-bottom:1px solid rgba(255,255,255,.12)}
        .gpb-head h2{margin:0 0 7px;font-size:23px;line-height:1.25;color:#fff!important;font-weight:800;letter-spacing:-.2px}
        .gpb-head p{margin:0;color:rgba(255,255,255,.78);font-size:13px;line-height:1.6}
        .gpb-body{padding:22px 30px 26px}
        .gpb-info{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
        .gpb-info div{padding:13px 15px;border-radius:14px;background:rgba(139,92,246,.09);border:1px solid rgba(139,92,246,.16)}
        .gpb-info small{display:block;color:rgba(255,255,255,.62);font-size:11px;margin-bottom:5px}.gpb-info strong{display:block;font-size:14px;color:#fff}
        .gpb-title{margin:0 0 12px;font-size:14px;font-weight:800;color:#fff}.gpb-subtitle{margin:-5px 0 17px;color:rgba(255,255,255,.62);font-size:12px}
        .gpb-select-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
        .gpb-select-card{position:relative;padding:15px;border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(255,255,255,.025);transition:.18s ease}.gpb-select-card:hover{border-color:rgba(139,92,246,.65);background:rgba(139,92,246,.06);transform:translateY(-1px)}
        .gpb-select-top{display:flex;align-items:center;gap:10px;margin-bottom:10px}.gpb-select-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;background:rgba(139,92,246,.14);color:#c4b5fd;flex:0 0 36px}.gpb-select-label{font-size:13px;font-weight:800;color:#fff}.gpb-select-help{font-size:10px;color:rgba(255,255,255,.52);margin-top:2px}
        .gpb-select{width:100%;height:44px;border:1px solid rgba(255,255,255,.14);border-radius:11px;padding:0 12px;background:#171d2d;color:#fff;font-size:12px;outline:none;cursor:pointer}.gpb-select:focus{border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.16)}.gpb-select option{background:#171d2d;color:#fff}
        .gpb-empty{padding:18px;border-radius:13px;background:rgba(127,127,127,.08);color:rgba(255,255,255,.68)}.gpb-status{min-height:20px;margin-top:13px;color:#f87171;font-size:13px}.gpb-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.gpb-btn{border:0;border-radius:11px;padding:11px 17px;font-weight:700;cursor:pointer}.gpb-skip{background:rgba(255,255,255,.09);color:#fff}.gpb-save{background:#8b5cf6;color:#fff}.gpb-save:hover{background:#7c3aed}.gpb-save:disabled{opacity:.6;cursor:not-allowed}
        @media(max-width:680px){.gpb-info,.gpb-select-grid{grid-template-columns:1fr}.gpb-head,.gpb-body{padding-left:18px;padding-right:18px}}
      `;document.head.appendChild(style);
      modal=document.createElement('div');modal.id='guruPembimbingModal';modal.className='gpb-modal';
      modal.innerHTML=`<div class="gpb-card" role="dialog" aria-modal="true"><div class="gpb-head"><h2>Pendaftaran Guru Pembimbing</h2><p>Pilih Unit kokurikulum yang anda bimbing. Setiap pilihan akan menetapkan anda sebagai Guru Pembimbing bagi Unit tersebut.</p></div><div class="gpb-body"><div id="gpbInfo" class="gpb-info"></div><div class="gpb-title">Pilih Unit Mengikut Kategori</div><div class="gpb-subtitle">Anda boleh memilih satu Unit bagi setiap kategori. Jika tidak mengendalikan kategori tertentu, biarkan pilihan kosong.</div><div id="gpbUnits" class="gpb-select-grid"><div class="gpb-empty">Memuatkan senarai Unit...</div></div><div id="gpbStatus" class="gpb-status"></div><div class="gpb-actions"><button type="button" class="gpb-btn gpb-skip" onclick="closeGuruPembimbingModal()">Kemudian</button><button type="button" id="gpbSave" class="gpb-btn gpb-save" onclick="submitGuruPembimbingRegistration()"><i class="fa-solid fa-floppy-disk"></i> Simpan & Teruskan</button></div></div></div>`;
      modal.addEventListener('click',function(e){if(e.target===modal)closeGuruPembimbingModal();});document.body.appendChild(modal);return modal;
    }

    function gpbCategoryKey_(cat){const c=String(cat||'').trim().toUpperCase();if(c==='BADAN BERUNIFORM'||c==='UNIT BERUNIFORM'||c==='UNIT')return 'uniform';if(c==='KELAB & PERSATUAN'||c==='KELAB / PERSATUAN'||c==='KELAB'||c==='PERSATUAN')return 'kelab';if(c==='SUKAN & PERMAINAN'||c==='SUKAN / PERMAINAN'||c==='SUKAN'||c==='PERMAINAN')return 'sukan';if(c==='RUMAH SUKAN'||c==='RUMAH')return 'rumah';return 'lain'}
    function gpbCategoryMeta_(key){return {uniform:{label:'Unit Beruniform',help:'Pilih Unit Beruniform yang anda bimbing.',icon:'fa-shield-halved'},kelab:{label:'Kelab / Persatuan',help:'Pilih Kelab atau Persatuan yang anda bimbing.',icon:'fa-users'},sukan:{label:'Sukan / Permainan',help:'Pilih Sukan atau Permainan yang anda bimbing.',icon:'fa-futbol'},rumah:{label:'Rumah Sukan',help:'Pilih Rumah Sukan yang anda bimbing.',icon:'fa-house'}}[key]}

    async function openGuruPembimbingModal_(){
      const modal=ensureGuruPembimbingModal_(),unitsBox=document.getElementById('gpbUnits'),info=document.getElementById('gpbInfo'),status=document.getElementById('gpbStatus');
      status.textContent='';unitsBox.innerHTML='<div class="gpb-empty"><i class="fa-solid fa-spinner fa-spin"></i> Memuatkan Unit...</div>';modal.classList.add('open');
      try{
        const result=await server('getPembimbingRegistrationData',getMuridSessionToken());
        const d=typeof result==='string'?JSON.parse(result||'{}'):(result||{});
        info.innerHTML=`<div><small>No. Guru</small><strong>${escapeHtml(d.noGuru||'-')}</strong></div><div><small>Nama Guru</small><strong>${escapeHtml(d.namaGuru||'-')}</strong></div>`;
        const units=Array.isArray(d.units)?d.units:[],grouped={uniform:[],kelab:[],sukan:[],rumah:[]};units.forEach(function(u){const key=gpbCategoryKey_(u.KATEGORI);if(grouped[key])grouped[key].push(u)});
        if(!units.length){unitsBox.innerHTML='<div class="gpb-empty">Belum ada Unit aktif untuk didaftarkan. Anda boleh meneruskannya kemudian.</div>';return;}
        unitsBox.innerHTML=['uniform','kelab','sukan','rumah'].map(function(key){const meta=gpbCategoryMeta_(key),rows=grouped[key]||[];return `<div class="gpb-select-card"><div class="gpb-select-top"><span class="gpb-select-icon"><i class="fa-solid ${meta.icon}"></i></span><div><div class="gpb-select-label">${meta.label}</div><div class="gpb-select-help">${meta.help}</div></div></div><select id="gpb-${key}" class="gpb-select"><option value="">— Tidak pilih —</option>${rows.map(function(u){return `<option value="${escapeHtml(u.UNIT_ID||'')}">${escapeHtml(u.NAMA_UNIT||'-')}${u.TAHUN?' · '+escapeHtml(u.TAHUN):''}</option>`}).join('')}</select></div>`}).join('');
      }catch(e){status.textContent=e.message||String(e);unitsBox.innerHTML='<div class="gpb-empty">Senarai Unit gagal dimuatkan.</div>';}
    }
    function closeGuruPembimbingModal(){document.getElementById('guruPembimbingModal')?.classList.remove('open')}
    async function submitGuruPembimbingRegistration(){
      const btn=document.getElementById('gpbSave'),status=document.getElementById('gpbStatus'),ids=['uniform','kelab','sukan','rumah'].map(function(k){return document.getElementById('gpb-'+k)?.value||''}).filter(Boolean);
      if(!ids.length){status.textContent='Sila pilih sekurang-kurangnya satu Unit yang anda bimbing.';return}btn.disabled=true;status.textContent='Menyimpan pendaftaran Guru Pembimbing...';
      try{await server('registerGuruPembimbing',getMuridSessionToken(),ids);closeGuruPembimbingModal();showToast('Pendaftaran Guru Pembimbing berjaya disimpan.','success');if(typeof loadUnitPage==='function'&&EK.currentPage==='unit')loadUnitPage()}catch(e){status.textContent=e.message||String(e)}finally{btn.disabled=false}
    }

    function handleLogin(event) {

      event.preventDefault();


      const usernameElement =
        document.getElementById(
          'loginUsername'
        );

      const passwordElement =
        document.getElementById(
          'loginPassword'
        );

      const button =
        document.getElementById(
          'loginButton'
        );


      if (
        !usernameElement ||
        !passwordElement ||
        !button
      ) {

        console.error(
          'Elemen login tidak lengkap.'
        );

        return;

      }


      const username =
        usernameElement.value.trim();

      const password =
        passwordElement.value;


      if (!username || !password) {

        showLoginError(
          'Sila masukkan ID pengguna dan kata laluan.'
        );

        return;

      }


      clearLoginError();


      button.disabled = true;

      button.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i>' +
        '<span>Memproses...</span>';


      /*
       * PENTING:
       *
       * Backend semasa login() memulangkan:
       *
       * {
       *   token: "...",
       *   user: {...}
       * }
       *
       * Jadi JANGAN semak result.success.
       */

      server(
        'login',
        username,
        password
      )
      .then(function(result) {

        button.disabled = false;

        button.innerHTML =
          '<i class="fa-solid fa-right-to-bracket"></i>' +
          '<span>Log Masuk</span>';


        if (
          !result ||
          !result.token ||
          !result.user
        ) {

          showLoginError(
            result &&
            result.message
              ? result.message
              : 'ID atau kata laluan tidak sah.'
          );

          return;

        }


        EK.token = result.token;

        EK.user = result.user;


        saveSession();


        showToast(
          'Log masuk berjaya.',
          'success'
        );


        showApp();

      })
      .catch(function(error) {

        button.disabled = false;

        button.innerHTML =
          '<i class="fa-solid fa-right-to-bracket"></i>' +
          '<span>Log Masuk</span>';


        console.error(
          'LOGIN ERROR:',
          error
        );


        showLoginError(
          getErrorMessage(error)
        );

      });

    }
    
    /* =======================================================
     LOGIN GOOGLE / MOE
     ======================================================= */

    function handleMoeLogin() {

     const button =
      document.getElementById('loginMoeButton');

     if (!button) {
        console.error(
       'Butang Login Google/MOE tidak dijumpai.'
       );
       return;
    }

    clearLoginError();
    button.disabled = true;
    button.innerHTML =
       '<i class="fa-solid fa-spinner fa-spin"></i>' +
       '<span>Mengenal pasti akaun...</span>';

    server('loginGuruMoe')
       .then(function(result) {

        button.disabled = false;

        button.innerHTML =
        '<i class="fa-brands fa-google"></i>' +
        '<span>Log Masuk dengan Google / MOE</span>';

        if (result && result.needsRegistration) {
          openMoeRegistrationModal(result.email || '', result.suggestedNoGuru || '');
          return;
        }

        if (!result || !result.token || !result.user) {
          throw new Error('Maklumat log masuk tidak lengkap.');
        }

        completeMoeLogin_(result);

    })
    .catch(function(error) {

      button.disabled = false;

      button.innerHTML =
        '<i class="fa-brands fa-google"></i>' +
        '<span>Log Masuk dengan Google / MOE</span>';

      console.error(
        'GOOGLE / MOE LOGIN ERROR:',
        error
      );

      showLoginError(
        getErrorMessage(error)
      );

    });
}



    /* =======================================================
       PATCH: LOGOUT / TUKAR AKAUN
       ======================================================= */
    function toggleSidebarUserMenu(event) {
      if (event) event.stopPropagation();
      const menu = document.getElementById('sidebarLogoutMenu');
      const button = document.getElementById('sidebarUserButton');
      if (!menu || !button) return;
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      button.setAttribute('aria-expanded', String(willOpen));
    }

    function closeSidebarUserMenu() {
      const menu = document.getElementById('sidebarLogoutMenu');
      const button = document.getElementById('sidebarUserButton');
      if (menu) menu.hidden = true;
      if (button) button.setAttribute('aria-expanded', 'false');
    }

    async function handleLogout() {
      closeSidebarUserMenu();
      const button = document.getElementById('sidebarLogoutButton');
      if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Log keluar...</span>';
      }

      try {
        if (EK.token) {
          await server('logout', EK.token);
        }
      } catch (error) {
        console.warn('LOGOUT SERVER:', error);
      } finally {
        clearSession();
        const loginPage = document.getElementById('loginPage');
        const appShell = document.getElementById('appShell');
        if (appShell) appShell.hidden = true;
        if (loginPage) loginPage.hidden = false;
        showToast('Anda telah log keluar. Sila pilih akaun Google / MOE untuk log masuk.', 'success');
      }
    }

    document.addEventListener('click', function(event) {
      const wrap = document.querySelector('.sidebar-user-wrap');
      if (wrap && !wrap.contains(event.target)) closeSidebarUserMenu();
    });

    /* =======================================================
       SHOW APP
       ======================================================= */

    function ekAppName() {
      return String((EK && EK.appName) || 'e-KOSSTA').trim() || 'e-KOSSTA';
    }


    function applyAppNameFromSettings(settings) {

      const name = String(
        (settings && settings.APP_NAME) ||
        EK.appName ||
        'e-KOSSTA'
      ).trim() || 'e-KOSSTA';

      EK.appName = name;

      const ids = [
        'appName',
        'loginAppName'
      ];

      ids.forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.textContent = name;
      });

      document.querySelectorAll('[data-app-name]').forEach(function(el) {
        el.textContent = name;
      });

      document.title = name;
    }

    async function loadAppNameOnly() {
      try {
        const rows = tsJson(await server('getSettings', tsToken())) || [];
        applyAppNameFromSettings(tsGetSettings(rows));
      } catch (e) {
        console.warn('APP NAME:', e);
      }
    }

    function showApp() {

      const loginPage =
        document.getElementById(
          'loginPage'
        );

      const appShell =
        document.getElementById(
          'appShell'
        );


      if (!loginPage || !appShell) {

        console.error(
          'LOGIN PAGE atau APP SHELL tidak dijumpai.'
        );

        return;

      }


      loginPage.hidden = true;

      appShell.hidden = false;

      loadAppNameOnly();

      updateUserUI();
      loadSidebarSchoolLogo();

      applyRoleVisibility();

      navigateTo('dashboard');
      loadDashboardQuickAccess();

    }


    /* =======================================================
       SESSION
       ======================================================= */

    function saveSession() {

      if (EK.token) {

        localStorage.setItem(
          'ekossta_token',
          EK.token
        );

      }


      if (EK.user) {

        localStorage.setItem(
          'ekossta_user',
          JSON.stringify(EK.user)
        );

      }

    }


    function loadSession() {

      const token =
        localStorage.getItem(
          'ekossta_token'
        );

      const user =
        localStorage.getItem(
          'ekossta_user'
        );


      if (!token || !user) {
        return false;
      }


      try {

        EK.token = token;

        EK.user = JSON.parse(user);

        return true;

      } catch (error) {

        console.error(
          'SESSION PARSE ERROR:',
          error
        );

        clearSession();

        return false;

      }

    }


    function clearSession() {

      EK.token = null;

      EK.user = null;

      localStorage.removeItem(
        'ekossta_token'
      );

      localStorage.removeItem(
        'ekossta_user'
      );

    }


    function checkExistingSession() {

      if (loadSession()) {

        showApp();

      }

    }


    /* =======================================================
       USER UI
       ======================================================= */

    function updateUserUI() {

      if (!EK.user) {
        return;
      }


      const name =
        EK.user.NAMA ||
        EK.user.NAME ||
        'Pengguna';


      const role =
        String(
          EK.user.ROLE || 'PELAWAT'
        ).toUpperCase();


      setText(
        'sidebarUserName',
        name
      );

      setText(
        'topbarUserName',
        name
      );

      setText(
        'sidebarUserRole',
        role
      );

      setText(
        'topbarUserRole',
        role
      );

    }


    /* =======================================================
       ROLE VISIBILITY
       ======================================================= */

    function applyRoleVisibility() {

      const role =
        EK.user &&
        EK.user.ROLE
          ? String(
              EK.user.ROLE
            ).toUpperCase()
          : 'PELAWAT';


      const isAdmin =
        role === 'ADMIN';


      document
        .querySelectorAll('.admin-only')
        .forEach(function(element) {

          element.hidden = !isAdmin;

        });

      // PATCH: menu Pengurusan tidak dipaparkan kepada GURU.
      // class management-only dikekalkan berasingan supaya patch ini
      // tidak mengganggu elemen admin-only sedia ada.
      const isGuru = role === 'GURU';
      document
        .querySelectorAll('.management-only')
        .forEach(function(element) {
          element.hidden = isGuru || !isAdmin;
        });

    }


    /* =======================================================
       NAVIGATION
       ======================================================= */

    function navigateTo(page, analysisView) {

      // PATCH: Guru tidak boleh membuka halaman Pengurusan
      // melalui panggilan navigation secara terus.
      const navRole = String(EK.user?.ROLE || 'PELAWAT').toUpperCase();
      if (navRole === 'GURU' && (page === 'murid' || page === 'guru')) {
        showToast('Akses menu Pengurusan hanya untuk Admin.', 'warning');
        return;
      }

      if (!PAGE_LABELS[page]) {
        console.warn(
          'Page tidak dikenali:',
          page
        );
        return;
      }

      const target =
        document.getElementById(
          'page-' + page
        );

      if (!target) {
        console.error(
          'Page element tidak dijumpai:',
          'page-' + page
        );
        return;
      }

      document
        .querySelectorAll('.page')
        .forEach(function(element) {
          element.classList.remove('active');
        });

      target.classList.add('active');

      document
        .querySelectorAll('.nav-item[data-page]')
        .forEach(function(item) {
          item.classList.toggle(
            'active',
            item.dataset.page === page
          );
        });

      EK.currentPage = page;

      setText(
        'breadcrumbText',
        PAGE_LABELS[page]
      );

      closeMobileSidebar();

      if (page === 'dashboard') {
        loadDashboardQuickAccess();
        loadDashboardData(false);
        return;
      }

      if (page === 'murid') {
        if (target.dataset.loaded !== 'true') {
          renderMuridPage();
          target.dataset.loaded = 'true';
        } else {
          loadMurid();
        }
        return;
      }

      if (page === 'guru') {
        if (target.dataset.loaded !== 'true') {
          renderGuruPage();
          target.dataset.loaded = 'true';
        } else {
          loadGuruPage();
        }
        return;
      }

      if (page === 'unit') {
        if (target.dataset.loaded !== 'true') {
          renderUnitPage();
          target.dataset.loaded = 'true';
        } else {
          loadUnitPage();
        }
        return;
      }

      if (page === 'analisis') {
        const view = analysisView || target.dataset.analysisView || 'dashboard';
        target.dataset.analysisView = view;
        renderAnalysisPage(view);
        return;
      }

      if (page === 'laporan') {
        renderLaporanPage();
        return;
      }
if (page === 'import') { renderImportPage(); return; }
      if (page === 'backup') { renderBackupPage(); return; }
      if (page === 'audit') { renderAuditPage(); return; }

      if (page === 'tetapan') {
        renderTetapanPage();
        return;
      }

      if (page === 'galeri') {
        if (target.dataset.loaded !== 'true') {
          renderGalleryPage();
          target.dataset.loaded = 'true';
        } else {
          loadAnxGallery('anx-gallery-content');
        }
        return;
      }

      if (['penempatan','kehadiran','aktiviti','pencapaian','peserta','ajk'].indexOf(page) >= 0) {
        const fn = {penempatan:renderPenempatanPage, kehadiran:renderKehadiranPage, aktiviti:renderAktivitiPage, pencapaian:renderPencapaianPage, peserta:renderPesertaPage, ajk:renderAjkPage}[page];
        if (target.dataset.loaded !== 'true') { fn(); target.dataset.loaded='true'; }
        else { ({penempatan:loadPenempatanPage, kehadiran:loadKehadiranPage, aktiviti:loadAktivitiPage, pencapaian:loadPencapaianPage, peserta:loadPesertaPage, ajk:loadAjkPage}[page])(); }
        return;
      }

      renderPlaceholderPage(page, target);
    }


    /* =======================================================
       PLACEHOLDER
       ======================================================= */

    function renderPlaceholderPage(
      page,
      target
    ) {

      if (
        target.dataset.loaded === 'true'
      ) {

        return;

      }


      target.dataset.loaded = 'true';


      target.innerHTML = `

        <div class="page-header">

          <div>

            <button
              type="button"
              class="back-button"
              data-page="dashboard"
            >

              <i class="fa-solid fa-arrow-left"></i>

              Dashboard

            </button>

            <h1>
              ${escapeHtml(
                PAGE_LABELS[page]
              )}
            </h1>

            <p>
              Modul sedang disediakan.
            </p>

          </div>

        </div>


        <div class="content-card">

          <div style="
            padding:40px;
            text-align:center;
          ">

            <div
              class="quick-icon aktiviti"
              style="
                margin:0 auto 15px;
              "
            >

              <i class="fa-solid fa-layer-group"></i>

            </div>

            <h3 style="
              margin:0 0 7px;
              color:var(--text);
            ">
              ${escapeHtml(
                PAGE_LABELS[page]
              )}
            </h3>

            <p style="
              margin:0;
              color:var(--text-secondary);
              font-size:13px;
            ">
              Struktur modul akan dimasukkan
              tanpa mengubah backend sedia ada.
            </p>

          </div>

        </div>

      `;


      const backButton =
        target.querySelector(
          '[data-page="dashboard"]'
        );


      if (backButton) {

        backButton.addEventListener(
          'click',
          function() {

            navigateTo('dashboard');

          }
        );

      }

    }


    /* =======================================================
       SIDEBAR GROUP
       ======================================================= */

    function toggleNavGroup(group) {

      if (!group) {
        return;
      }


      const currentlyOpen =
        group.classList.contains(
          'open'
        );


      document
        .querySelectorAll('.nav-group')
        .forEach(function(item) {

          item.classList.remove(
            'open'
          );

        });


      if (!currentlyOpen) {

        group.classList.add(
          'open'
        );

      }

    }


    /* =======================================================
       MOBILE SIDEBAR
       ======================================================= */

    function openMobileSidebar() {

      const sidebar =
        document.getElementById(
          'sidebar'
        );

      const overlay =
        document.getElementById(
          'sidebarOverlay'
        );


      if (!sidebar || !overlay) {
        return;
      }


      sidebar.classList.add(
        'mobile-open'
      );

      overlay.classList.add(
        'active'
      );

    }


    function closeMobileSidebar() {

      const sidebar =
        document.getElementById(
          'sidebar'
        );

      const overlay =
        document.getElementById(
          'sidebarOverlay'
        );


      if (sidebar) {

        sidebar.classList.remove(
          'mobile-open'
        );

      }


      if (overlay) {

        overlay.classList.remove(
          'active'
        );

      }

    }


    /* =======================================================
       THEME
       ======================================================= */

    function loadTheme() {

      const saved =
        localStorage.getItem(
          'ekossta_theme'
        ) || 'light';


      EK.theme =
        saved === 'dark'
          ? 'dark'
          : 'light';


      document.documentElement.classList.toggle(
        'dark-mode-active',
        EK.theme === 'dark'
      );


      updateThemeIcon();

    }


    function toggleTheme() {

      EK.theme =
        EK.theme === 'dark'
          ? 'light'
          : 'dark';


      document.documentElement.classList.toggle(
        'dark-mode-active',
        EK.theme === 'dark'
      );


      localStorage.setItem(
        'ekossta_theme',
        EK.theme
      );


      updateThemeIcon();


      if (
        EK.currentPage === 'dashboard'
      ) {

        loadDashboardData(false);

      }

    }


    function updateThemeIcon() {

      const icon =
        document.getElementById(
          'themeIcon'
        );


      if (!icon) {
        return;
      }


      icon.className =
        EK.theme === 'dark'
          ? 'fa-solid fa-sun'
          : 'fa-solid fa-moon';

    }


    /* =======================================================
       PASSWORD
       ======================================================= */

    function togglePassword() {

      const input =
        document.getElementById(
          'loginPassword'
        );

      const button =
        document.getElementById(
          'passwordToggle'
        );


      if (!input || !button) {
        return;
      }


      const icon =
        button.querySelector('i');


      if (
        input.type === 'password'
      ) {

        input.type = 'text';

        if (icon) {

          icon.className =
            'fa-solid fa-eye-slash';

        }

      } else {

        input.type = 'password';

        if (icon) {

          icon.className =
            'fa-solid fa-eye';

        }

      }

    }


    /* =======================================================
       LOGIN ERROR
       ======================================================= */

    function showLoginError(message) {

      const element =
        document.getElementById(
          'loginError'
        );


      if (!element) {
        return;
      }


      element.textContent =
        message ||
        'Ralat semasa log masuk.';


      element.hidden = false;

    }


    function clearLoginError() {

      const element =
        document.getElementById(
          'loginError'
        );


      if (!element) {
        return;
      }


      element.textContent = '';

      element.hidden = true;

    }


    /* =======================================================
       TOAST
       ======================================================= */

    function showToast(
      message,
      type = 'info',
      title = ''
    ) {

      const container =
        document.getElementById(
          'toastContainer'
        );


      if (!container) {
        return;
      }


      const config = {

        success: {
          icon: 'fa-circle-check',
          title: 'Berjaya'
        },

        error: {
          icon: 'fa-circle-xmark',
          title: 'Ralat'
        },

        warning: {
          icon: 'fa-triangle-exclamation',
          title: 'Amaran'
        },

        info: {
          icon: 'fa-circle-info',
          title: 'Maklumat'
        }

      };


      const selected =
        config[type] ||
        config.info;


      const toast =
        document.createElement(
          'div'
        );


      toast.className =
        'ek-toast ek-toast-' +
        type;


      toast.innerHTML = `

        <div class="ek-toast-icon">

          <i class="fa-solid ${selected.icon}"></i>

        </div>

        <div class="ek-toast-content">

          <p class="ek-toast-title">
            ${escapeHtml(
              title || selected.title
            )}
          </p>

          <p class="ek-toast-message">
            ${escapeHtml(
              message
            )}
          </p>

        </div>

      `;


      container.appendChild(toast);


      setTimeout(
        function() {

          toast.style.opacity = '0';

          toast.style.transform =
            'translateY(8px)';


          setTimeout(
            function() {

              toast.remove();

            },
            180
          );

        },
        3500
      );

    }


    /* =======================================================
       MODAL
       ======================================================= */

    function openModal(
      title,
      body,
      footer = ''
    ) {

      const overlay =
        document.getElementById(
          'modalOverlay'
        );

      const titleElement =
        document.getElementById(
          'modalTitle'
        );

      const bodyElement =
        document.getElementById(
          'modalBody'
        );

      const footerElement =
        document.getElementById(
          'modalFooter'
        );


      if (
        !overlay ||
        !titleElement ||
        !bodyElement ||
        !footerElement
      ) {

        return;

      }


      titleElement.textContent =
        title || '';


      bodyElement.innerHTML =
        body || '';


      footerElement.innerHTML =
        footer || '';


      overlay.hidden = false;

    }


    function closeModal() {

      const overlay =
        document.getElementById(
          'modalOverlay'
        );


      if (overlay) {

        overlay.hidden = true;

      }

    }


    /* =======================================================
       KEYBOARD
       ======================================================= */

    function handleKeyboard(event) {

      if (event.key !== 'Escape') {
        return;
      }


      closeModal();

      closeMobileSidebar();

    }


    /* =======================================================
       DASHBOARD
       ======================================================= */

    async function loadDashboardData(showMessage) {

      const token = EK && EK.token ? EK.token : '';

      if (!token) {
        return;
      }

      const year = String(new Date().getFullYear());

      try {

        /* Dua bacaan dashboard tidak bergantung antara satu sama lain.
           Jalankan serentak supaya satu klik tidak menunggu 2 round-trip. */
        const results = await Promise.all([
          server('dashboard', token, year),
          server('getAnalysisDashboard', token, year).catch(function(error){
            console.warn('Dashboard attendance:', error);
            return null;
          })
        ]);
        const data = typeof results[0] === 'string' ? JSON.parse(results[0]) : results[0];
        const analysis = typeof results[1] === 'string' ? JSON.parse(results[1]) : results[1];
        const summary = data && data.summary ? data.summary : {};

        setText('statMurid', summary.murid || 0);
        setText('statGuru', summary.guru || 0);
        setText('statUnit', summary.unit || 0);
        setText('statAktiviti', summary.aktiviti || 0);

        renderDashboardRecentActivities(data && data.recentActivities || []);
        renderDashboardAchievementRanking(data && data.achievementRanking || [], year);
        renderDashboardAttendance(analysis || null);

        if (showMessage) {
          showToast('Dashboard telah dikemas kini daripada data Google Sheets.', 'success');
        }

      } catch (error) {
        console.error('Dashboard data:', error);
        showToast(getErrorMessage(error), 'error');
      }
    }


    function renderDashboardRecentActivities(rows) {

      const container = document.getElementById('recentActivities');
      if (!container) return;

      if (!rows || !rows.length) {
        container.innerHTML = '<p style="margin:0;color:var(--text-muted);font-size:12px;">Tiada aktiviti direkodkan bagi tahun semasa.</p>';
        return;
      }

      container.innerHTML = rows.slice(0, 6).map(function(row) {
        const title = escapeHtml(row.NAMA_AKTIVITI || 'Aktiviti');
        const date = row.TARIKH ? new Date(row.TARIKH).toLocaleDateString('ms-MY', {day:'2-digit', month:'short', year:'numeric'}) : '-';
        const level = escapeHtml(row.PERINGKAT || '-');
        return '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">' +
          '<div style="min-width:0;"><strong style="display:block;color:var(--text);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + title + '</strong>' +
          '<span style="display:block;margin-top:3px;color:var(--text-muted);font-size:11px;">' + date + ' · ' + level + '</span></div>' +
          '</div>';
      }).join('');
    }


    function renderDashboardAttendance(data) {

      const container = document.getElementById('attendanceSummary');
      if (!container) return;

      if (!data || !data.kpi) {
        container.innerHTML = '<p style="margin:0;color:var(--text-muted);font-size:12px;">Data kehadiran tidak dapat dimuatkan.</p>';
        return;
      }

      const pct = Number(data.kpi.kehadiran || 0);
      const hadir = Number(data.kpi.hadir || 0);
      const total = Number(data.kpi.rekodKehadiran || 0);

      container.innerHTML = '<div style="display:flex;align-items:center;gap:14px;">' +
        '<div style="font-size:30px;font-weight:900;color:var(--primary);line-height:1;">' + pct + '%</div>' +
        '<div><strong style="display:block;color:var(--text);font-size:12px;">Kadar Kehadiran</strong>' +
        '<span style="display:block;margin-top:3px;color:var(--text-muted);font-size:11px;">' + hadir + ' hadir daripada ' + total + ' rekod</span></div>' +
        '</div>';
    }


    async function refreshDashboard() {
      await loadDashboardData(true);
    }


    function renderDashboardAchievementRanking(rows, year) {

      const container = document.getElementById('dashboardAchievementRanking');
      const yearEl = document.getElementById('dashboardRankingYear');
      if (yearEl) yearEl.textContent = year ? 'Tahun ' + year : '';
      if (!container) return;

      rows = Array.isArray(rows) ? rows : [];

      if (!rows.length) {
        container.innerHTML = '<div class="dashboard-ranking-empty"><i class="fa-solid fa-trophy"></i><div>Tiada rekod pencapaian untuk tahun semasa.</div><small>Semakan dibuat berdasarkan TAHUN, TARIKH pencapaian atau TARIKH aktiviti.</small></div>';
        return;
      }

      container.innerHTML = '<div class="dashboard-ranking-table-wrap">' +
        '<table class="dashboard-ranking-table">' +
          '<thead><tr>' +
            '<th style="width:58px;text-align:center;">#</th>' +
            '<th>Murid</th>' +
            '<th>Kelas</th>' +
            '<th>Pencapaian Tertinggi</th>' +
            '<th style="width:110px;text-align:center;">Jumlah</th>' +
          '</tr></thead>' +
          '<tbody>' +
            rows.map(function(row, index) {
              const rank = Number(row.rank || (index + 1));
              const name = escapeHtml(row.nama || '-');
              const kelas = escapeHtml(row.kelas || '-');
              const total = Number(row.total || 0);
              const kp = String(row.noKp || '');
              const bestLevel = escapeHtml(row.bestLevel || '-');
              const bestPosition = escapeHtml(row.bestPosition || '-');
              const medal = rank === 1 ? '<i class="fa-solid fa-crown dashboard-rank-crown"></i>' : '';
              return '<tr>' +
                '<td class="dashboard-rank-cell"><span class="dashboard-rank-no">' + rank + '</span>' + medal + '</td>' +
                '<td><div class="dashboard-student-name">' + name + '</div><div class="dashboard-student-kp">' + escapeHtml(kp) + '</div></td>' +
                '<td><span class="dashboard-class-pill">' + kelas + '</span></td>' +
                '<td><div class="dashboard-achievement-best"><strong>' + bestLevel + '</strong><span>' + bestPosition + '</span></div></td>' +
                '<td style="text-align:center;"><button type="button" class="dashboard-achievement-total" data-ach-kp="' + escapeHtml(kp) + '" data-ach-year="' + escapeHtml(String(year || '')) + '" onclick="window.openDashboardAchievementDetails(this.dataset.achKp, this.dataset.achYear)">' + total + ' <i class="fa-solid fa-chevron-right"></i></button></td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="dashboard-ranking-note"><i class="fa-solid fa-circle-info"></i> Susunan berdasarkan peringkat tertinggi, kedudukan terbaik (Johan hingga No. 5), kemudian jumlah pencapaian sebagai pemecah seri.</div>';
    }

    async function openDashboardAchievementDetails(noKp, selectedYear) {
      noKp = String(noKp || '').trim();
      const year = String(selectedYear || new Date().getFullYear()).trim();
      if (!noKp) return;

      // Buka modal dahulu supaya klik sentiasa memberi maklum balas.
      openModal(
        'Senarai Pencapaian Murid',
        '<div style="padding:28px;text-align:center;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i><div style="margin-top:8px;">Memuatkan senarai acara...</div></div>'
      );

      try {
        const token = typeof getMuridSessionToken === 'function'
          ? getMuridSessionToken()
          : (typeof EK !== 'undefined' && EK ? EK.token : '');

        if (!token) throw new Error('Sesi log masuk tidak ditemui. Sila log masuk semula.');

        const result = await server('getDashboardAchievementDetails', token, noKp, year);
        const data = typeof result === 'string' ? JSON.parse(result) : (result || {});
        const rows = Array.isArray(data.records) ? data.records : [];

        const modalTitle = document.getElementById('modalTitle');
        const modalSubtitle = document.getElementById('modalSubtitle');
        const body = document.getElementById('modalBody');

        if (modalTitle) modalTitle.textContent = data.nama || 'Murid';
        if (modalSubtitle) modalSubtitle.textContent = (data.kelas ? data.kelas + ' · ' : '') + 'Tahun ' + year;
        if (!body) return;

        if (!rows.length) {
          body.innerHTML = '<div style="padding:25px;text-align:center;color:var(--text-muted);"><i class="fa-solid fa-circle-info" style="font-size:24px;margin-bottom:10px;"></i><div>Tiada rekod pencapaian bagi tahun ini.</div><small>Semakan menggunakan TAHUN, TARIKH pencapaian atau TARIKH aktiviti.</small></div>';
          return;
        }

        body.innerHTML = '<div style="padding:4px 0 10px;color:var(--text-muted);font-size:12px;">Jumlah pencapaian: <strong style="color:var(--text);">' + rows.length + '</strong></div>' +
          '<div class="dashboard-achievement-detail-list">' +
          rows.map(function(row, index) {
            return '<div class="dashboard-achievement-detail-item">' +
              '<div class="dashboard-achievement-detail-no">' + (index + 1) + '</div>' +
              '<div class="dashboard-achievement-detail-main">' +
                '<strong>' + escapeHtml(row.acara || row.pencapaian || '-') + '</strong>' +
                '<div class="dashboard-achievement-detail-meta">' +
                  '<span><i class="fa-solid fa-trophy"></i> ' + escapeHtml(row.kedudukan || '-') + '</span>' +
                  '<span><i class="fa-solid fa-layer-group"></i> ' + escapeHtml(row.peringkat || '-') + '</span>' +
                  '<span><i class="fa-solid fa-calendar"></i> ' + escapeHtml(row.tarikh || '-') + '</span>' +
                '</div>' +
                (row.catatan ? '<div class="dashboard-achievement-detail-note">' + escapeHtml(row.catatan) + '</div>' : '') +
              '</div>' +
            '</div>';
          }).join('') +
          '</div>';
      } catch (error) {
        const body = document.getElementById('modalBody');
        if (body) body.innerHTML = '<div style="padding:25px;color:var(--danger,#ef4444);"><i class="fa-solid fa-triangle-exclamation"></i> ' + escapeHtml(error.message || String(error)) + '</div>';
      }
    }

    // Pastikan fungsi boleh dipanggil oleh onclick walaupun browser menjalankan
    // halaman dalam konteks global yang berbeza.
    window.openDashboardAchievementDetails = openDashboardAchievementDetails;

    /* =======================================================
       UTILITIES
       ======================================================= */

    function setText(
      id,
      value
    ) {

      const element =
        document.getElementById(id);


      if (element) {

        element.textContent =
          value == null
            ? ''
            : String(value);

      }

    }


    function getErrorMessage(error) {

      if (!error) {

        return 'Ralat tidak diketahui.';

      }


      if (
        typeof error === 'string'
      ) {

        return error;

      }


      if (error.message) {

        return error.message;

      }


      return 'Ralat tidak diketahui.';

    }


    function escapeHtml(value) {

      return String(
        value == null
          ? ''
          : value
      )
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );

    }


    /* =======================================================
       INITIAL DASHBOARD CHART
       ======================================================= */

    window.addEventListener(
      'load',
      function() {
        if (EK && EK.token) {
          loadDashboardData(false);
        }
      }
    );
          /* =========================================================
        PATCH 4B — MODUL MURID
        ========================================================= */

      let MURID_DATA = [];
      let MURID_EDITING = null;


      /* ---------------------------------------------------------
        TOKEN
        --------------------------------------------------------- */

      function getMuridSessionToken() {

        // PATCH 3B: session utama menggunakan EK.token.
        if (
          typeof EK !== 'undefined' &&
          EK &&
          EK.token
        ) {
          return EK.token;
        }

        // Fallback untuk keserasian dengan kod lama.
        if (typeof sessionToken !== 'undefined' && sessionToken) {
          return sessionToken;
        }

        if (
          typeof currentSessionToken !== 'undefined' &&
          currentSessionToken
        ) {
          return currentSessionToken;
        }

        if (
          typeof authToken !== 'undefined' &&
          authToken
        ) {
          return authToken;
        }

        if (
          typeof TOKEN !== 'undefined' &&
          TOKEN
        ) {
          return TOKEN;
        }

        try {
          const stored =
            sessionStorage.getItem('eKOSSTA_TOKEN');

          if (stored) return stored;
        } catch (e) {
          console.warn('Gagal membaca sessionStorage:', e);
        }

        return '';
      }


      /* ---------------------------------------------------------
        USER ROLE
        --------------------------------------------------------- */

      function getMuridCurrentRole() {

        try {
          if (
            typeof EK !== 'undefined' &&
            EK &&
            EK.user
          ) {
            return String(
              EK.user.ROLE ||
              ''
            ).toUpperCase();
          }
        } catch (e) {}

        return '';
      }



      /* =======================================================
         MODUL GURU — FULL UI
         ======================================================= */
      let GURU_ROWS = [];
      let GURU_EDIT_ID = '';

      function guruInitials(name) {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        return parts.slice(0,2).map(x => x.charAt(0)).join('').toUpperCase() || 'G';
      }
      function guruStatusBadge(status) {
        const active = String(status || 'AKTIF').toUpperCase() === 'AKTIF';
        return `<span class="gm-badge ${active?'active':'inactive'}"><i class="fa-solid ${active?'fa-circle-check':'fa-circle-xmark'}"></i>${active?'Aktif':'Tidak Aktif'}</span>`;
      }
      function renderGuruPage() {
        const c=document.getElementById('page-guru'); if(!c)return;
        c.innerHTML=`
          <div class="gm-module">
            <div class="gm-head">
              <div><div class="gm-kicker">Pengurusan Data</div><h1 class="gm-title">Pengurusan Guru</h1><p class="gm-sub">Urus rekod guru yang digunakan sebagai pengguna dan guru penasihat kokurikulum.</p></div>
              <div class="gm-actions"><button class="gm-btn" onclick="loadGuruPage()"><i class="fa-solid fa-rotate"></i> Segar</button><button class="gm-btn gm-btn-primary" onclick="openGuruForm()"><i class="fa-solid fa-plus"></i> Tambah Guru</button></div>
            </div>
            <div class="gm-kpis">
              <div class="gm-kpi"><div class="gm-kpi-label">Jumlah Guru</div><div id="guru-kpi-total" class="gm-kpi-value">0</div></div>
              <div class="gm-kpi"><div class="gm-kpi-label">Guru Aktif</div><div id="guru-kpi-active" class="gm-kpi-value">0</div></div>
              <div class="gm-kpi"><div class="gm-kpi-label">Tidak Aktif</div><div id="guru-kpi-inactive" class="gm-kpi-value">0</div></div>
            </div>
            <div class="gm-filter"><div class="gm-filter-grid">
              <div class="gm-field"><label>Carian</label><input id="guru-search" type="search" placeholder="Cari nama, no. guru atau email..." oninput="filterGuruTable()"></div>
              <div class="gm-field"><label>Status</label><select id="guru-status-filter" onchange="filterGuruTable()"><option value="">Semua Status</option><option value="AKTIF">Aktif</option><option value="TIDAK AKTIF">Tidak Aktif</option></select></div>
              <div class="gm-field"><label>Susunan</label><select id="guru-sort" onchange="filterGuruTable()"><option value="nama">Nama A–Z</option><option value="nama_desc">Nama Z–A</option><option value="baru">Terbaharu</option></select></div>
              <button class="gm-btn" onclick="resetGuruFilter()"><i class="fa-solid fa-filter-circle-xmark"></i> Reset</button>
            </div></div>
            <div class="gm-table-card"><div class="gm-table-head"><div><div class="gm-table-title">Senarai Guru</div><div id="guru-table-count" class="gm-table-count">Memuatkan...</div></div></div>
              <div class="gm-table-wrap"><table class="gm-table"><thead><tr><th>Guru</th><th>No. Guru</th><th>Email</th><th>No. Telefon</th><th>Status</th><th style="text-align:right">Tindakan</th></tr></thead><tbody id="guru-table-body"></tbody></table></div>
            </div>
          </div>
          <div id="guru-modal" class="gm-modal" onclick="if(event.target===this)closeGuruForm()"><div class="gm-dialog"><div class="gm-dialog-head"><div class="gm-dialog-title" id="guru-modal-title">Tambah Guru</div><button class="gm-close" onclick="closeGuruForm()">×</button></div>
            <form class="gm-form" id="guru-form" onsubmit="submitGuruForm(event)"><div class="gm-grid">
              <div class="gm-field"><label>No. Guru *</label><input id="guru-no" required placeholder="Contoh: G001"></div>
              <div class="gm-field"><label>Nama Guru *</label><input id="guru-name" required placeholder="Nama penuh guru"></div>
              <div class="gm-field"><label>Email</label><input id="guru-email" type="email" placeholder="nama@moe-dl.edu.my"></div>
              <div class="gm-field"><label>No. Telefon</label><input id="guru-tel" placeholder="01X-XXXXXXX"></div>
              <div class="gm-field"><label>Status</label><select id="guru-status"><option value="AKTIF">Aktif</option><option value="TIDAK AKTIF">Tidak Aktif</option></select></div>
              <div class="gm-field gm-span-2"><div class="gm-hint"><i class="fa-solid fa-circle-info"></i> Email digunakan untuk padanan akaun Google/MOE bagi log masuk guru. Pastikan alamat email tepat.</div></div>
            </div></form>
          </div><div class="gm-dialog-foot"><button type="button" class="gm-btn" onclick="closeGuruForm()">Batal</button><button type="submit" form="guru-form" id="guru-save" class="gm-btn gm-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Simpan Guru</button></div></div></div>`;
        loadGuruPage();
      }
      async function loadGuruPage(){
        const body=document.getElementById('guru-table-body'); if(body)body.innerHTML='<tr><td colspan="6"><div class="gm-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan data guru...</div></div></td></tr>';
        try{ GURU_ROWS=ckParse(await server('getGuru',getMuridSessionToken())); updateGuruKpi(); filterGuruTable(); }catch(e){ if(body)body.innerHTML=`<tr><td colspan="6"><div class="gm-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message||String(e))}</div></div></td></tr>`; showToast(e.message||'Gagal memuatkan guru','error'); }
      }
      function updateGuruKpi(){const rows=GURU_ROWS||[];setText('guru-kpi-total',rows.length);setText('guru-kpi-active',rows.filter(r=>String(r.STATUS||'AKTIF').toUpperCase()==='AKTIF').length);setText('guru-kpi-inactive',rows.filter(r=>String(r.STATUS||'').toUpperCase()!=='AKTIF').length)}
      function filterGuruTable(){
        const q=String(document.getElementById('guru-search')?.value||'').trim().toUpperCase(), st=String(document.getElementById('guru-status-filter')?.value||'').toUpperCase(), sort=document.getElementById('guru-sort')?.value||'nama';
        let rows=(GURU_ROWS||[]).filter(r=>(!st||String(r.STATUS||'AKTIF').toUpperCase()===st)&&(!q||[r.NAMA,r.NO_GURU,r.EMAIL,r.NO_TEL].some(v=>String(v||'').toUpperCase().includes(q))));
        rows.sort((a,b)=>{if(sort==='nama_desc')return String(b.NAMA||'').localeCompare(String(a.NAMA||''));if(sort==='baru')return String(b.UPDATED_AT||b.CREATED_AT||'').localeCompare(String(a.UPDATED_AT||a.CREATED_AT||''));return String(a.NAMA||'').localeCompare(String(b.NAMA||''));});
        const body=document.getElementById('guru-table-body'); if(!body)return; setText('guru-table-count',`${rows.length} rekod dipaparkan`); if(!rows.length){body.innerHTML='<tr><td colspan="6"><div class="gm-empty"><i class="fa-solid fa-user-slash"></i><div>Tiada guru ditemui</div><p style="margin:5px 0 0">Cuba ubah carian atau tambah rekod guru baharu.</p></div></td></tr>';return;}
        body.innerHTML=rows.map(r=>`<tr><td><div class="gm-person"><div class="gm-avatar">${escapeHtml(guruInitials(r.NAMA))}</div><div><div class="gm-name">${escapeHtml(r.NAMA||'-')}</div><div class="gm-meta">${escapeHtml(r.EMAIL||'Tiada email')}</div></div></div></td><td>${escapeHtml(r.NO_GURU||'-')}</td><td>${escapeHtml(r.EMAIL||'-')}</td><td>${escapeHtml(r.NO_TEL||'-')}</td><td>${guruStatusBadge(r.STATUS)}</td><td><div class="gm-actions-cell"><button class="gm-icon-btn" title="Edit" aria-label="Edit guru" onclick='openGuruForm(${JSON.stringify(r.NO_GURU)})'><i class="fa-solid fa-pen"></i></button><button class="gm-icon-btn" title="Nyahaktif" aria-label="Nyahaktif guru" onclick='deactivateGuru(${JSON.stringify(r.NO_GURU)})'><i class="fa-solid fa-user-slash"></i></button></div></td></tr>`).join('');
      }
      function resetGuruFilter(){['guru-search','guru-status-filter'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});const s=document.getElementById('guru-sort');if(s)s.value='nama';filterGuruTable()}
      function openGuruForm(no){GURU_EDIT_ID=no||'';const row=(GURU_ROWS||[]).find(r=>String(r.NO_GURU)===String(no));setText('guru-modal-title',row?'Kemaskini Guru':'Tambah Guru');['guru-no','guru-name','guru-email','guru-tel'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});const st=document.getElementById('guru-status');if(st)st.value='AKTIF';if(row){document.getElementById('guru-no').value=row.NO_GURU||'';document.getElementById('guru-name').value=row.NAMA||'';document.getElementById('guru-email').value=row.EMAIL||'';document.getElementById('guru-tel').value=row.NO_TEL||'';st.value=row.STATUS||'AKTIF';document.getElementById('guru-no').readOnly=true} else document.getElementById('guru-no').readOnly=false;document.getElementById('guru-modal').classList.add('open');setTimeout(()=>document.getElementById('guru-name')?.focus(),50)}
      function closeGuruForm(){document.getElementById('guru-modal')?.classList.remove('open')}
      async function submitGuruForm(ev){ev.preventDefault();const btn=document.getElementById('guru-save');const data={NO_GURU:document.getElementById('guru-no').value.trim(),NAMA:document.getElementById('guru-name').value.trim(),EMAIL:document.getElementById('guru-email').value.trim(),NO_TEL:document.getElementById('guru-tel').value.trim(),STATUS:document.getElementById('guru-status').value};if(!data.NO_GURU||!data.NAMA){showToast('No. Guru dan Nama wajib diisi.','warning');return}try{btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';await server('saveGuru',getMuridSessionToken(),data);closeGuruForm();showToast('Rekod guru berjaya disimpan.','success');await loadGuruPage()}catch(e){showToast(e.message||'Gagal menyimpan guru','error')}finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Simpan Guru'}}
      async function deactivateGuru(no){if(!confirm('Nyahaktifkan guru ini? Rekod tidak akan dipadam secara kekal.'))return;try{await server('deleteGuru',getMuridSessionToken(),no);showToast('Guru telah dinyahaktifkan.','success');await loadGuruPage()}catch(e){showToast(e.message||'Gagal mengemaskini guru','error')}}

      /* =======================================================
         MODUL UNIT — FULL UI
         ======================================================= */
      let UNIT_ROWS=[]; let UNIT_GURU=[]; let UNIT_EDIT_ID='';
      function unitBadge(status){const a=String(status||'AKTIF').toUpperCase()==='AKTIF';return `<span class="um-badge ${a?'active':'inactive'}"><i class="fa-solid ${a?'fa-circle-check':'fa-circle-xmark'}"></i>${a?'Aktif':'Tidak Aktif'}</span>`}
      function unitCategoryLabel(cat){
        const c=String(cat||'').trim().toUpperCase();
        if(c==='BADAN BERUNIFORM'||c==='UNIT BERUNIFORM'||c==='UNIT')return 'Unit Beruniform';
        if(c==='KELAB & PERSATUAN'||c==='KELAB / PERSATUAN'||c==='KELAB'||c==='PERSATUAN')return 'Kelab & Persatuan';
        if(c==='SUKAN & PERMAINAN'||c==='SUKAN / PERMAINAN'||c==='SUKAN'||c==='PERMAINAN')return 'Sukan & Permainan';
        if(c==='RUMAH SUKAN'||c==='RUMAH')return 'Rumah Sukan';
        return cat||'Lain-lain';
      }
      function unitCategoryKey(cat){
        const c=String(cat||'').trim().toUpperCase();
        if(c==='BADAN BERUNIFORM'||c==='UNIT BERUNIFORM'||c==='UNIT')return 'UNIT BERUNIFORM';
        if(c==='KELAB & PERSATUAN'||c==='KELAB / PERSATUAN'||c==='KELAB'||c==='PERSATUAN')return 'KELAB / PERSATUAN';
        if(c==='SUKAN & PERMAINAN'||c==='SUKAN / PERMAINAN'||c==='SUKAN'||c==='PERMAINAN')return 'SUKAN / PERMAINAN';
        if(c==='RUMAH SUKAN'||c==='RUMAH')return 'RUMAH SUKAN';
        return c;
      }
      function renderUnitPage(){const c=document.getElementById('page-unit');if(!c)return;c.innerHTML=`
        <div class="uk-module">
          <div class="uk-head"><div><div class="uk-kicker">Kokurikulum</div><h1 class="uk-title">Unit Kokurikulum</h1><p class="uk-sub">Lihat semua unit mengikut kategori. Klik mana-mana kad untuk melihat butiran unit dan ahli tahun semasa.</p></div><div class="uk-actions"><button class="uk-btn" onclick="loadUnitPage()"><i class="fa-solid fa-rotate"></i> Segar</button><button class="uk-btn uk-primary" onclick="openUnitForm()"><i class="fa-solid fa-plus"></i> Tambah Unit</button></div></div>
          <div class="uk-stats"><div class="uk-stat"><span>Jumlah Unit</span><b id="uk-total">0</b></div><div class="uk-stat"><span>Unit Aktif</span><b id="uk-active">0</b></div><div class="uk-stat"><span>Kategori</span><b id="uk-cats">0</b></div></div>
          <div class="uk-filter"><div class="uk-field"><label>Carian Unit</label><input id="unit-search" type="search" placeholder="Cari nama unit..." oninput="filterUnitTable()"></div><div class="uk-field"><label>Kategori</label><select id="unit-category-filter" onchange="filterUnitTable()"><option value="">Semua Kategori</option></select></div><div class="uk-field"><label>Status</label><select id="unit-status-filter" onchange="filterUnitTable()"><option value="">Semua Status</option><option value="AKTIF">Aktif</option><option value="TIDAK AKTIF">Tidak Aktif</option></select></div><button class="uk-btn" onclick="resetUnitFilter()">Reset</button></div>
          <div id="unit-card-sections"></div>
        </div>
        <div id="unit-modal" class="um-modal" onclick="if(event.target===this)closeUnitForm()"><div class="um-dialog"><div class="um-dialog-head"><div class="um-dialog-title" id="unit-modal-title">Tambah Unit</div><button class="um-close" onclick="closeUnitForm()">×</button></div><form class="um-form" id="unit-form" onsubmit="submitUnitForm(event)"><div class="um-grid"><div class="um-field"><label>Nama Unit *</label><input id="unit-name" required placeholder="Contoh: Persatuan Bahasa Melayu"></div><div class="um-field"><label>Kategori *</label><select id="unit-category" required><option value="">Pilih kategori</option><option value="BADAN BERUNIFORM">Badan Beruniform</option><option value="KELAB & PERSATUAN">Kelab & Persatuan</option><option value="SUKAN & PERMAINAN">Sukan & Permainan</option><option value="RUMAH SUKAN">Rumah Sukan</option></select></div><div class="um-field"><label>Guru Penasihat</label><select id="unit-guru"><option value="">Pilih guru</option></select></div><div class="um-field"><label>Tahun</label><input id="unit-year" type="number" min="2000" max="2100" placeholder="Contoh: 2026"></div><div class="um-field"><label>Status</label><select id="unit-status"><option value="AKTIF">Aktif</option><option value="TIDAK AKTIF">Tidak Aktif</option></select></div></div></form><div class="um-dialog-foot"><button type="button" class="um-btn" onclick="closeUnitForm()">Batal</button><button type="submit" form="unit-form" id="unit-save" class="um-btn um-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Simpan Unit</button></div></div></div>
        <div id="uk-detail-modal" class="uk-modal" onclick="if(event.target===this)closeUnitDetail()"><div class="uk-detail-dialog"><div class="uk-detail-head"><div><div class="uk-kicker">Butiran Unit</div><h2 id="uk-detail-title">Unit</h2><div id="uk-detail-meta" class="uk-detail-meta">Tahun semasa</div></div><button class="uk-close" onclick="closeUnitDetail()">×</button></div><div id="uk-detail-body" class="uk-detail-body"><div class="uk-loading"><i class="fa-solid fa-spinner fa-spin"></i> Memuatkan...</div></div></div></div>`;loadUnitPage()}
      async function loadUnitPage(){const box=document.getElementById('unit-card-sections');if(box)box.innerHTML='<div class="uk-loading"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan unit...</div></div>';try{const token=getMuridSessionToken();const results=await Promise.all([server('getUnits',token,{}),server('getGuru',token)]);UNIT_ROWS=ckParse(results[0])||[];UNIT_GURU=ckParse(results[1])||[];populateUnitCategoryFilter();updateUnitKpi();renderUnitCards();populateUnitGuru('')}catch(e){if(box)box.innerHTML=`<div class="uk-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message||String(e))}</div></div>`;showToast(e.message||'Gagal memuatkan unit','error')}}
      function updateUnitKpi(){const r=UNIT_ROWS||[];setText('uk-total',r.length);setText('uk-active',r.filter(x=>String(x.STATUS||'AKTIF').toUpperCase()==='AKTIF').length);setText('uk-cats',new Set(r.map(x=>unitCategoryKey(x.KATEGORI)).filter(Boolean)).size)}
      function renderUnitCards(){const box=document.getElementById('unit-card-sections');if(!box)return;const q=String(document.getElementById('unit-search')?.value||'').trim().toUpperCase(),cat=unitCategoryKey(document.getElementById('unit-category-filter')?.value||''),st=String(document.getElementById('unit-status-filter')?.value||'').toUpperCase();const rows=(UNIT_ROWS||[]).filter(r=>(!q||[r.NAMA_UNIT,r.UNIT_ID,r.GURU_PENASIHAT].some(v=>String(v||'').toUpperCase().includes(q)))&&(!cat||unitCategoryKey(r.KATEGORI)===cat)&&(!st||String(r.STATUS||'AKTIF').toUpperCase()===st));const groups={};rows.forEach(r=>{const k=unitCategoryKey(r.KATEGORI)||'LAIN-LAIN';(groups[k]||(groups[k]=[])).push(r)});const keys=Object.keys(groups).sort((a,b)=>a.localeCompare(b));if(!keys.length){box.innerHTML='<div class="uk-empty"><i class="fa-solid fa-layer-group"></i><div>Tiada unit ditemui.</div><p>Cuba ubah filter atau import data unit terlebih dahulu.</p></div>';return}box.innerHTML=keys.map(k=>`<section class="uk-section"><div class="uk-section-head"><div><h3>${escapeHtml(unitCategoryLabel(k))}</h3><span>${groups[k].length} unit</span></div></div><div class="uk-cards">${groups[k].sort((a,b)=>String(a.NAMA_UNIT||'').localeCompare(String(b.NAMA_UNIT||''))).map(r=>`<button type="button" class="uk-card" onclick='openUnitDetail(${JSON.stringify(r.UNIT_ID)})'><div class="uk-card-icon"><i class="fa-solid fa-layer-group"></i></div><div class="uk-card-main"><strong>${escapeHtml(r.NAMA_UNIT||'-')}</strong><span>${escapeHtml(r.GURU_PENASIHAT||'Guru penasihat belum ditetapkan')}</span><small>${escapeHtml(r.TAHUN||'Tahun semasa')} · ${String(r.STATUS||'AKTIF').toUpperCase()==='AKTIF'?'Aktif':'Tidak aktif'}</small></div><i class="fa-solid fa-chevron-right uk-card-arrow"></i></button>`).join('')}</div></section>`).join('')}
      function filterUnitTable(){renderUnitCards()}
      function resetUnitFilter(){['unit-search','unit-category-filter','unit-status-filter'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});populateUnitCategoryFilter();renderUnitCards()}
      function populateUnitCategoryFilter(){const s=document.getElementById('unit-category-filter');if(!s)return;const old=s.value;const cats=[...new Set((UNIT_ROWS||[]).map(r=>unitCategoryKey(r.KATEGORI)).filter(Boolean))].sort();s.innerHTML='<option value="">Semua Kategori</option>'+cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(unitCategoryLabel(c))}</option>`).join('');if(cats.includes(old))s.value=old}
      function populateUnitGuru(selected){const s=document.getElementById('unit-guru');if(!s)return;s.innerHTML='<option value="">Pilih guru</option>'+(UNIT_GURU||[]).filter(r=>String(r.STATUS||'AKTIF').toUpperCase()==='AKTIF').sort((a,b)=>String(a.NAMA||'').localeCompare(String(b.NAMA||''))).map(r=>`<option value="${escapeHtml(r.NAMA||'')}">${escapeHtml(r.NAMA||'')} · ${escapeHtml(r.NO_GURU||'')}</option>`).join('');s.value=selected||''}
      function openUnitForm(id){UNIT_EDIT_ID=id||'';const row=(UNIT_ROWS||[]).find(r=>String(r.UNIT_ID)===String(id));setText('unit-modal-title',row?'Kemaskini Unit':'Tambah Unit');document.getElementById('unit-name').value=row?.NAMA_UNIT||'';document.getElementById('unit-category').value=row?.KATEGORI||'';document.getElementById('unit-year').value=row?.TAHUN||new Date().getFullYear();document.getElementById('unit-status').value=row?.STATUS||'AKTIF';populateUnitGuru(row?.GURU_PENASIHAT||'');document.getElementById('unit-modal').classList.add('open');setTimeout(()=>document.getElementById('unit-name')?.focus(),50)}
      function closeUnitForm(){document.getElementById('unit-modal')?.classList.remove('open')}
      async function submitUnitForm(ev){ev.preventDefault();const btn=document.getElementById('unit-save');const data={UNIT_ID:UNIT_EDIT_ID||'',NAMA_UNIT:document.getElementById('unit-name').value.trim(),KATEGORI:document.getElementById('unit-category').value,TAHUN:document.getElementById('unit-year').value,GURU_PENASIHAT:document.getElementById('unit-guru').value,STATUS:document.getElementById('unit-status').value};if(!data.NAMA_UNIT||!data.KATEGORI){showToast('Nama Unit dan Kategori wajib diisi.','warning');return}try{btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';await server('saveUnit',getMuridSessionToken(),data);closeUnitForm();showToast('Unit berjaya disimpan.','success');await loadUnitPage()}catch(e){showToast(e.message||'Gagal menyimpan unit','error')}finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Simpan Unit'}}
      async function deactivateUnit(id){if(!confirm('Nyahaktifkan unit ini? Rekod penempatan dan sejarah tidak akan dipadam.'))return;try{await server('deleteUnit',getMuridSessionToken(),id);showToast('Unit telah dinyahaktifkan.','success');await loadUnitPage()}catch(e){showToast(e.message||'Gagal mengemaskini unit','error')}}
      async function openUnitDetail(id){
  const page=document.getElementById('page-unit');
  if(!page)return;
  const host=page.querySelector('.uk-module')||page;
  host.dataset.unitListHtml=host.innerHTML;
  host.dataset.currentUnitId=String(id||'');
  host.innerHTML=`<div class="uk-detail-page">
    <div class="uk-detail-page-head">
      <div class="uk-detail-top-actions">
        <button type="button" class="uk-back-btn" onclick="closeUnitDetailPage()"><i class="fa-solid fa-arrow-left"></i> Kembali ke Unit</button>
        <div class="uk-detail-actions">
          <button type="button" class="uk-btn" onclick="printUnitDetailPage('print')"><i class="fa-solid fa-print"></i> Cetak</button>
          <button type="button" class="uk-btn uk-primary" onclick="printUnitDetailPage('pdf')"><i class="fa-solid fa-file-pdf"></i> Simpan PDF</button>
          <button type="button" class="uk-btn uk-primary" onclick="openUnitAjk('${String(id||'').replace(/'/g,"\\'")}')"><i class="fa-solid fa-user-shield"></i> AJK Unit</button>
        </div>
      </div>
      <div style="margin-top:16px"><div class="uk-kicker">Butiran Unit Kokurikulum</div><h1 class="uk-title" id="uk-detail-title">Memuatkan...</h1><p class="uk-sub" id="uk-detail-sub">Memuatkan maklumat unit...</p></div>
    </div>
    <div id="uk-detail-page-body" class="uk-detail-page-body"><div class="uk-loading"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan ahli dan rekod kehadiran...</div></div></div>
  </div>`;
  const body=document.getElementById('uk-detail-page-body');
  try{
    const year=String(new Date().getFullYear());
    const d=ckParse(await server('getUnitDetail',getMuridSessionToken(),String(id||''),year))||{};
    const unit=d.unit||{};
    const members=(d.ahli||d.members||[]);
    const ajk=(d.ajk||[]);
    window.UK_CURRENT_DETAIL={unit:unit,year:year,members:members,ajk:ajk};
    document.getElementById('uk-detail-title').textContent=unit.NAMA_UNIT||'Unit Kokurikulum';
    document.getElementById('uk-detail-sub').textContent=(unit.KATEGORI||'')+' · Tahun '+year;
    const weeks=Array.from({length:15},(_,i)=>i+1);
    body.innerHTML=`<div class="uk-detail-grid">
      <div class="uk-detail-stat"><span>Jumlah Ahli</span><b>${members.length+ajk.length}</b></div>
      <div class="uk-detail-stat"><span>Kategori</span><b style="font-size:14px">${escapeHtml(unit.KATEGORI||'-')}</b></div>
      <div class="uk-detail-stat"><span>Tahun</span><b>${escapeHtml(year)}</b></div>
      <div class="uk-detail-stat"><span>AJK Aktif</span><b>${ajk.length}</b></div>
    </div>
    <div class="uk-detail-info"><div><span>Nama Unit</span><b>${escapeHtml(unit.NAMA_UNIT||'-')}</b></div><div><span>Guru Penasihat</span><b>${escapeHtml(unit.GURU_PENASIHAT||'Belum ditetapkan')}</b></div></div>
    <div class="uk-member-title"><span>Senarai Ahli Tahun Semasa</span><span>${members.length+ajk.length} orang</span></div>
    <div class="uk-member-table-wrap"><table class="uk-member-table"><thead><tr><th>Bil.</th><th>Murid</th>${weeks.map(w=>`<th>M${w}</th>`).join('')}</tr></thead><tbody>${members.length?members.map((m,i)=>{const a=m.attendance||m.kehadiran||{};return `<tr><td>${i+1}</td><td><div class="uk-student-cell"><div class="uk-avatar">${anxInitials(m.NAMA||m.nama||'?')}</div><div><strong>${escapeHtml(m.NAMA||m.nama||'-')}</strong><small>${escapeHtml(m.KELAS||m.kelas||'')}</small></div></div></td>${weeks.map(w=>{const st=String(a[w]||a[String(w)]||'').toUpperCase();const cls=st==='HADIR'||st==='H'?'uk-week-hadir':st==='TIDAK HADIR'||st==='TH'?'uk-week-tidak':st?'uk-week-lain':'uk-week-empty';const tx=st==='HADIR'||st==='H'?'H':st==='TIDAK HADIR'||st==='TH'?'TH':'—';return `<td><span class="uk-week ${cls}">${tx}</span></td>`}).join('')}</tr>`}).join(''):`<tr><td colspan="17"><div class="uk-empty">Tiada ahli tahun semasa untuk unit ini.</div></td></tr>`}</tbody></table></div>
    ${renderUnitAjkFlowchart(ajk)}`;
  }catch(e){ body.innerHTML=`<div class="uk-error"><b>Gagal memuatkan butiran unit.</b><div style="margin-top:6px">${escapeHtml(e.message||String(e))}</div><button type="button" class="uk-btn" style="margin-top:12px" onclick="openUnitDetail(${JSON.stringify(String(id||''))})">Cuba Lagi</button></div>`; }
}

function renderUnitAjkFlowchart(ajk){
  const list=Array.isArray(ajk)?ajk:[];
  const roleOrder=['PENGERUSI','NAIB PENGERUSI','SETIAUSAHA','PENOLONG SETIAUSAHA','BENDAHARI','AHLI JAWATANKUASA'];
  const rank=r=>{const x=String(r||'').trim().toUpperCase();const i=roleOrder.indexOf(x);return i<0?99:i};
  const sorted=list.slice().sort((a,b)=>rank(a.JAWATAN)-rank(b.JAWATAN)||String(a.NAMA||'').localeCompare(String(b.NAMA||''),'ms'));
  if(!sorted.length)return `<div class="uk-ajk-flow-wrap"><div class="uk-member-title"><span>Struktur AJK Unit</span><span>0 orang</span></div><div class="uk-ajk-flow-empty"><i class="fa-solid fa-sitemap"></i><div>Belum ada AJK berdaftar.</div></div></div>`;
  const top=sorted.filter(a=>String(a.JAWATAN||'').toUpperCase()==='PENGERUSI');
  const second=sorted.filter(a=>['NAIB PENGERUSI','SETIAUSAHA','PENOLONG SETIAUSAHA','BENDAHARI'].includes(String(a.JAWATAN||'').toUpperCase()));
  const bottom=sorted.filter(a=>String(a.JAWATAN||'').toUpperCase()==='AHLI JAWATANKUASA');
  const used=new Set([...top,...second,...bottom]);
  const other=sorted.filter(a=>!used.has(a));
  const card=a=>`<div class="uk-ajk-flow-card"><div class="uk-ajk-flow-icon"><i class="fa-solid fa-user"></i></div><div class="uk-ajk-flow-role">${escapeHtml(a.JAWATAN||'AJK')}</div><div class="uk-ajk-flow-name">${escapeHtml(a.NAMA||a.NO_KP||'-')}</div><div class="uk-ajk-flow-meta"><span><i class="fa-solid fa-graduation-cap"></i>${escapeHtml(a.KELAS||'-')}</span><span class="uk-ajk-flow-status"><i class="fa-solid fa-circle-check"></i>${escapeHtml(a.STATUS||'AKTIF')}</span></div></div>`;
  const row=items=>items.length?`<div class="uk-ajk-flow-row">${items.map(card).join('')}</div>`:'';
  return `<div class="uk-ajk-flow-wrap"><div class="uk-member-title"><span>Struktur AJK Unit</span><span>${sorted.length} orang</span></div><div class="uk-ajk-flow"><div class="uk-ajk-flow-root"><div class="uk-ajk-flow-root-icon"><i class="fa-solid fa-sitemap"></i></div><div><strong>AJK UNIT</strong><small>Struktur organisasi unit</small></div></div><div class="uk-ajk-flow-line"></div>${row(top)}${top.length&& (second.length||bottom.length||other.length)?'<div class="uk-ajk-flow-connector"></div>':''}${row(second)}${second.length&&(bottom.length||other.length)?'<div class="uk-ajk-flow-connector"></div>':''}${row([...bottom,...other])}</div></div>`;
}

function printUnitDetailPage(mode){
  const d=window.UK_CURRENT_DETAIL||{}; const u=d.unit||{}; const members=d.members||[]; const ajk=d.ajk||[]; const year=d.year||new Date().getFullYear();
  if(!u.NAMA_UNIT)return showToast('Butiran unit belum selesai dimuatkan.','warning');
  const weeks=Array.from({length:15},(_,i)=>i+1);
  const memberRows=members.map((m,i)=>{const a=m.attendance||m.kehadiran||{};return `<tr><td>${i+1}</td><td>${ukPrintEsc(m.NAMA||'-')}<small>${ukPrintEsc(m.KELAS||'')}</small></td>${weeks.map(w=>{const st=String(a[w]||a[String(w)]||'').toUpperCase();return `<td>${st==='HADIR'||st==='H'?'H':st==='TIDAK HADIR'||st==='TH'?'TH':'-'}</td>`}).join('')}</tr>`}).join('');
  const ajkRows=ajk.map((a,i)=>`<tr><td>${i+1}</td><td>${ukPrintEsc(a.NAMA||a.NO_KP||'-')}</td><td>${ukPrintEsc(a.KELAS||'-')}</td><td>${ukPrintEsc(a.JAWATAN||'-')}</td><td>${ukPrintEsc(a.STATUS||'AKTIF')}</td></tr>`).join('');
  const w=window.open('','_blank'); if(!w)return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${ukPrintEsc(u.NAMA_UNIT)} - ${year}</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#111;font-size:10px}h1{font-size:20px;margin:0 0 5px}h2{font-size:13px;margin:18px 0 7px;border-bottom:1px solid #bbb;padding-bottom:5px}.meta{display:grid;grid-template-columns:120px 1fr 120px 1fr;gap:5px 10px;margin:12px 0}.meta b{font-weight:700}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:4px;text-align:center}th{background:#eee;font-size:9px}td:nth-child(2){text-align:left;min-width:180px}td small{display:block;color:#666;margin-top:2px}.foot{margin-top:20px;font-size:8px;color:#666}@media print{.no-print{display:none!important}}</style></head><body><h1>${ukPrintEsc(u.NAMA_UNIT)}</h1><div>${ukPrintEsc(u.KATEGORI||'')} · Tahun ${ukPrintEsc(year)}</div><div class="meta"><b>Guru Penasihat</b><span>${ukPrintEsc(u.GURU_PENASIHAT||'-')}</span><b>Jumlah Ahli</b><span>${members.length+ajk.length}</span><b>AJK Aktif</b><span>${ajk.length}</span></div><h2>Senarai Ahli & Kehadiran Mingguan</h2><table><thead><tr><th>Bil.</th><th>Murid</th>${weeks.map(x=>`<th>M${x}</th>`).join('')}</tr></thead><tbody>${memberRows||'<tr><td colspan="17">Tiada ahli.</td></tr>'}</tbody></table><h2>AJK Unit</h2><table><thead><tr><th>Bil.</th><th>Murid</th><th>Kelas</th><th>Jawatan</th><th>Status</th></tr></thead><tbody>${ajkRows||'<tr><td colspan="5">Belum ada AJK.</td></tr>'}</tbody></table><div class="foot">e-KOSSTA · ${ukPrintEsc(u.NAMA_UNIT)} · ${ukPrintEsc(year)}</div><script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
  if(mode==='pdf')showToast('Dialog cetakan dibuka. Pilih “Save as PDF / Simpan sebagai PDF”.','info');
}
function ukPrintEsc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}

async function openUnitAjk(id){
  const page=document.getElementById('page-unit'); if(!page)return;
  const host=page.querySelector('.uk-module')||page;
  const unitId=String(id||host.dataset.currentUnitId||''); if(!unitId)return;
  host.dataset.ajkReturnHtml=host.innerHTML; host.dataset.currentUnitId=unitId;
  host.innerHTML=`<div class="uk-detail-page uk-ajk-page"><div class="uk-detail-page-head"><div class="uk-detail-top-actions"><button type="button" class="uk-back-btn" onclick="backFromUnitAjk()"><i class="fa-solid fa-arrow-left"></i> Kembali ke Unit</button><div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="uk-btn" onclick="printUnitAjk('print')"><i class="fa-solid fa-print"></i> Cetak</button><button type="button" class="uk-btn" onclick="printUnitAjk('pdf')"><i class="fa-solid fa-file-pdf"></i> Simpan PDF</button><button type="button" class="uk-btn uk-primary" onclick="openUnitAjkForm()"><i class="fa-solid fa-user-plus"></i> Daftar AJK</button></div></div><div style="margin-top:16px"><div class="uk-kicker">Kokurikulum · AJK</div><h1 class="uk-title" id="uk-ajk-title">AJK Unit</h1><p class="uk-sub" id="uk-ajk-sub">Pilih murid daripada unit ini sahaja.</p></div></div><div id="uk-ajk-body" class="uk-detail-page-body"><div class="uk-loading"><i class="fa-solid fa-spinner fa-spin"></i> Memuatkan AJK...</div></div></div>`;
  const body=document.getElementById('uk-ajk-body');
  try{
    const year=String(new Date().getFullYear()); const d=ckParse(await server('getUnitDetail',getMuridSessionToken(),unitId,year))||{}; const unit=d.unit||{}; const members=[...(d.ahli||[]),...(d.ajk||[])];
    window.UK_AJK_CONTEXT={unit:unit,unitId:unitId,year:year,members:members,ajk:d.ajk||[]};
    document.getElementById('uk-ajk-title').textContent='AJK · '+(unit.NAMA_UNIT||'Unit'); document.getElementById('uk-ajk-sub').textContent=(unit.KATEGORI||'')+' · Tahun '+year+' · Pemilihan daripada ahli unit sahaja';
    renderUnitAjkBody();
  }catch(e){body.innerHTML=`<div class="uk-error"><b>Gagal memuatkan AJK unit.</b><div style="margin-top:6px">${escapeHtml(e.message||String(e))}</div></div>`}
}
function renderUnitAjkBody(){
  const c=document.getElementById('uk-ajk-body'),ctx=window.UK_AJK_CONTEXT||{}; if(!c)return;
  const classes=[...new Set((ctx.members||[]).map(x=>String(x.KELAS||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ms',{numeric:true}));
  const q=String(document.getElementById('uk-ajk-search')?.value||'').toUpperCase(); const cl=document.getElementById('uk-ajk-class')?.value||'';
  const rows=(ctx.ajk||[]).filter(x=>{const m=(ctx.members||[]).find(z=>String(z.NO_KP)===String(x.NO_KP))||{};return (!cl||String(m.KELAS||'')===cl)&&(!q||[m.NAMA,x.NO_KP,x.JAWATAN].some(v=>String(v||'').toUpperCase().includes(q)))});
  c.innerHTML=`<div class="uk-ajk-filter"><div class="uk-field"><label>Kelas</label><select id="uk-ajk-class" onchange="renderUnitAjkBody()"><option value="">Semua Kelas</option>${classes.map(x=>`<option value="${escapeHtml(x)}" ${x===cl?'selected':''}>${escapeHtml(x)}</option>`).join('')}</select></div><div class="uk-field"><label>Carian</label><input id="uk-ajk-search" value="${escapeHtml(document.getElementById('uk-ajk-search')?.value||'')}" placeholder="Nama / jawatan / NO KP" oninput="renderUnitAjkBody()"></div></div><div class="uk-card"><div class="uk-member-title"><span>AJK Berdaftar</span><span>${rows.length} orang</span></div><div class="uk-ajk-table-wrap"><table class="uk-member-table"><thead><tr><th>Bil.</th><th>Murid</th><th>Kelas</th><th>Jawatan</th><th>Status</th><th></th></tr></thead><tbody>${rows.length?rows.map((x,i)=>{const m=(ctx.members||[]).find(z=>String(z.NO_KP)===String(x.NO_KP))||{};return `<tr><td>${i+1}</td><td><strong>${escapeHtml(m.NAMA||x.NO_KP||'-')}</strong></td><td>${escapeHtml(m.KELAS||'-')}</td><td><span class="uk-ajk-role">${escapeHtml(x.JAWATAN||'-')}</span></td><td>${escapeHtml(x.STATUS||'AKTIF')}</td><td><button class="uk-btn uk-btn-sm" onclick='openUnitAjkForm(${JSON.stringify(x.AJK_ID)})'><i class="fa-solid fa-pen"></i></button></td></tr>`}).join(''):`<tr><td colspan="6"><div class="uk-empty">Tiada AJK untuk pilihan semasa.</div></td></tr>`}</tbody></table></div></div><div id="uk-ajk-form-host"></div>`;
}
function openUnitAjkForm(id){
  const ctx=window.UK_AJK_CONTEXT||{}, existing=(ctx.ajk||[]).find(x=>String(x.AJK_ID)===String(id)); const host=document.getElementById('uk-ajk-form-host'); if(!host)return;
  const classes=[...new Set((ctx.members||[]).map(x=>String(x.KELAS||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ms',{numeric:true}));
  host.dataset.id=existing?.AJK_ID||'';
  host.innerHTML=`<div class="uk-card uk-ajk-form-card"><div class="uk-member-title"><span>${existing?'Kemaskini AJK':'Daftar AJK'}</span><button type="button" class="uk-btn" onclick="closeUnitAjkForm()"><i class="fa-solid fa-arrow-up"></i> Tutup</button></div><form onsubmit="submitUnitAjkForm(event)"><div class="uk-ajk-form-grid"><div class="uk-field"><label>Kelas *</label><select id="uk-ajk-form-class" onchange="populateUnitAjkStudents()"><option value="">Pilih kelas</option>${classes.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('')}</select></div><div class="uk-field"><label>Murid *</label><select id="uk-ajk-form-student" required><option value="">Pilih kelas dahulu</option></select></div><div class="uk-field"><label>Tahun *</label><input id="uk-ajk-form-year" type="number" value="${escapeHtml(existing?.TAHUN||ctx.year||new Date().getFullYear())}" required></div><div class="uk-field"><label>Jawatan *</label><select id="uk-ajk-form-role" required><option value="">Pilih jawatan</option><option>PENGERUSI</option><option>NAIB PENGERUSI</option><option>SETIAUSAHA</option><option>PENOLONG SETIAUSAHA</option><option>BENDAHARI</option><option>AHLI JAWATANKUASA</option></select></div><div class="uk-field"><label>Status</label><select id="uk-ajk-form-status"><option>AKTIF</option><option>TIDAK AKTIF</option></select></div></div><div class="uk-dialog-foot"><button type="button" class="uk-btn" onclick="closeUnitAjkForm()">Batal</button><button type="submit" class="uk-btn uk-primary"><i class="fa-solid fa-floppy-disk"></i> Simpan AJK</button></div></form></div>`;
  if(existing){const m=(ctx.members||[]).find(x=>String(x.NO_KP)===String(existing.NO_KP))||{};document.getElementById('uk-ajk-form-class').value=m.KELAS||'';populateUnitAjkStudents(existing.NO_KP);document.getElementById('uk-ajk-form-student').value=existing.NO_KP||'';document.getElementById('uk-ajk-form-role').value=existing.JAWATAN||'';document.getElementById('uk-ajk-form-status').value=existing.STATUS||'AKTIF';} 
  host.scrollIntoView({behavior:'smooth',block:'start'});
}
function populateUnitAjkStudents(selectedKp){const ctx=window.UK_AJK_CONTEXT||{},cl=document.getElementById('uk-ajk-form-class')?.value||'',sel=document.getElementById('uk-ajk-form-student');if(!sel)return;const existingKp=new Set((ctx.ajk||[]).filter(x=>String(x.STATUS||'AKTIF').toUpperCase()==='AKTIF').map(x=>String(x.NO_KP)));const rows=(ctx.members||[]).filter(m=>!cl||String(m.KELAS||'')===cl).filter(m=>!existingKp.has(String(m.NO_KP))||String(m.NO_KP)===String(document.getElementById('uk-ajk-form-student')?.value||''));const old=selectedKp||sel.value;sel.innerHTML='<option value="">Pilih murid</option>'+rows.sort((a,b)=>String(a.NAMA||'').localeCompare(String(b.NAMA||''))).map(m=>`<option value="${escapeHtml(m.NO_KP)}">${escapeHtml(m.NAMA||'-')} · ${escapeHtml(m.NO_KP)}</option>`).join('');if(rows.some(m=>String(m.NO_KP)===String(old)))sel.value=old;}
function closeUnitAjkForm(){const h=document.getElementById('uk-ajk-form-host');if(h)h.innerHTML='';}
function printUnitAjk(mode){
  const ctx=window.UK_AJK_CONTEXT||{};
  const unit=ctx.unit||{};
  const year=ctx.year||new Date().getFullYear();
  const ajk=(ctx.ajk||[]).filter(x=>String(x.STATUS||'AKTIF').toUpperCase()!=='TIDAK AKTIF');
  const members=ctx.members||[];
  const findMember=kp=>members.find(m=>String(m.NO_KP)===String(kp))||{};
  const esc=v=>String(v==null?'':v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const rows=ajk.map((a,i)=>{
    const m=findMember(a.NO_KP);
    return `<tr><td>${i+1}</td><td>${esc(m.NAMA||a.NAMA||a.NO_KP||'-')}</td><td>${esc(m.KELAS||a.KELAS||'-')}</td><td>${esc(a.JAWATAN||'-')}</td><td>${esc(a.STATUS||'AKTIF')}</td></tr>`;
  }).join('');

  const sheet=document.createElement('div');
  sheet.id='uk-ajk-print-sheet';
  sheet.className='uk-ajk-print-sheet';
  sheet.innerHTML=`
    <div class="uk-ajk-print-head">
      <h1>${esc(unit.NAMA_UNIT||'Unit Kokurikulum')}</h1>
      <div>${esc(unit.KATEGORI||'')} · Tahun ${esc(year)}</div>
    </div>
    <div class="uk-ajk-print-meta">
      <div><b>Guru Penasihat</b><span>${esc(unit.GURU_PENASIHAT||'Belum ditetapkan')}</span></div>
      <div><b>Jumlah AJK Aktif</b><span>${ajk.length}</span></div>
      <div><b>Dicetak</b><span>${esc(new Date().toLocaleString('ms-MY'))}</span></div>
    </div>
    <h2>Senarai AJK Unit</h2>
    <table>
      <thead><tr><th>Bil.</th><th>Nama Murid</th><th>Kelas</th><th>Jawatan</th><th>Status</th></tr></thead>
      <tbody>${rows||'<tr><td colspan="5" style="text-align:center">Belum ada AJK aktif.</td></tr>'}</tbody>
    </table>
    <div class="uk-ajk-print-foot">${esc(ekAppName())} · ${esc(unit.NAMA_UNIT||'Unit Kokurikulum')} · Tahun ${esc(year)}</div>`;

  document.body.appendChild(sheet);
  document.documentElement.classList.add('uk-ajk-printing');

  let cleaned=false;
  const cleanup=function(){
    if(cleaned)return;
    cleaned=true;
    document.documentElement.classList.remove('uk-ajk-printing');
    sheet.remove();
    window.removeEventListener('afterprint',cleanup);
  };
  window.addEventListener('afterprint',cleanup);

  // Cetak dan Simpan PDF menggunakan dialog cetakan sistem.
  // Untuk PDF, pilih "Save as PDF / Simpan sebagai PDF".
  setTimeout(function(){
    try{window.print();}
    catch(err){cleanup();showToast(err.message||'Gagal membuka cetakan.','error');}
  },100);

  // Sesetengah browser tidak menghantar afterprint dengan konsisten.
  setTimeout(cleanup,60000);
}

async function submitUnitAjkForm(e){e.preventDefault();const ctx=window.UK_AJK_CONTEXT||{};const data={AJK_ID:document.querySelector('#uk-ajk-form-host')?.dataset?.id||'',NO_KP:document.getElementById('uk-ajk-form-student')?.value||'',UNIT_ID:ctx.unitId,TAHUN:document.getElementById('uk-ajk-form-year')?.value||ctx.year,JAWATAN:document.getElementById('uk-ajk-form-role')?.value||'',STATUS:document.getElementById('uk-ajk-form-status')?.value||'AKTIF'};if(!data.NO_KP||!data.JAWATAN)return showToast('Sila pilih murid dan jawatan.','warning');try{await server('saveAJK',getMuridSessionToken(),data);showToast('AJK berjaya disimpan.','success');await openUnitAjk(ctx.unitId);}catch(e){showToast(e.message||'Gagal menyimpan AJK','error')}}
function backFromUnitAjk(){const page=document.getElementById('page-unit'),host=page&&(page.querySelector('.uk-module')||page);if(!host)return;if(host.dataset.ajkReturnHtml){host.innerHTML=host.dataset.ajkReturnHtml;delete host.dataset.ajkReturnHtml;openUnitDetail(host.dataset.currentUnitId||'');}else{openUnitDetail(host.dataset.currentUnitId||'');}}

function closeUnitDetailPage(){ const page=document.getElementById('page-unit'); const host=page && (page.querySelector('.uk-module') || page); if(!host||!host.dataset.unitListHtml)return; host.innerHTML=host.dataset.unitListHtml; delete host.dataset.unitListHtml; try{loadUnitPage()}catch(e){} }
      function backToUnitList(){
        const page=document.getElementById('page-unit');
        if(!page)return;
        page.dataset.loaded='false';
        renderUnitPage();
        page.dataset.loaded='true';
        window.scrollTo({top:0,behavior:'smooth'});
      }
      function closeUnitDetail(){/* Modal lama tidak lagi digunakan; butiran Unit kini ialah halaman penuh. */}

      /* ---------------------------------------------------------
        INITIAL RENDER
        --------------------------------------------------------- */

      function renderMuridPage() {

        const container =
          document.getElementById('page-murid');

        if (!container) return;

        container.innerHTML = `
          <div class="murid-module">

            <div class="murid-page-header">

              <div>
                <h1 class="murid-page-title">
                  Pengurusan Murid
                </h1>

                <p class="murid-page-subtitle">
                  Pengurusan rekod murid kokurikulum sekolah.
                </p>
              </div>

              <div class="murid-header-actions">

                <button
                  type="button"
                  class="murid-btn murid-btn-secondary"
                  onclick="resetMuridFilters()"
                >
                  <i class="fa-solid fa-rotate-left"></i>
                  Reset
                </button>

                <button
                  type="button"
                  class="murid-btn murid-btn-primary"
                  onclick="openMuridModal()"
                >
                  <i class="fa-solid fa-plus"></i>
                  Tambah Murid
                </button>

              </div>

            </div>


            <!-- FILTER -->

            <div class="murid-filter-card">

              <div class="murid-filter-grid">

                <div class="murid-field">

                  <label for="murid-search">
                    Carian
                  </label>

                  <input
                    id="murid-search"
                    type="search"
                    placeholder="Nama, No. KP atau kelas..."
                    oninput="filterMuridLocal()"
                  >

                </div>


                <div class="murid-field">

                  <label for="murid-filter-tahun">
                    Tahun
                  </label>

                  <select
                    id="murid-filter-tahun"
                    onchange="loadMurid()"
                  >
                    <option value="">
                      Semua Tahun
                    </option>
                  </select>

                </div>


                <div class="murid-field">

                  <label for="murid-filter-tingkatan">
                    Tingkatan
                  </label>

                  <select
                    id="murid-filter-tingkatan"
                    onchange="loadMurid()"
                  >
                    <option value="">
                      Semua Tingkatan
                    </option>

                    <option value="1">Tingkatan 1</option>
                    <option value="2">Tingkatan 2</option>
                    <option value="3">Tingkatan 3</option>
                    <option value="4">Tingkatan 4</option>
                    <option value="5">Tingkatan 5</option>

                  </select>

                </div>


                <div class="murid-field">

                  <label for="murid-filter-status">
                    Status
                  </label>

                  <select
                    id="murid-filter-status"
                    onchange="loadMurid()"
                  >

                    <option value="">
                      Semua Status
                    </option>

                    <option value="AKTIF">
                      Aktif
                    </option>

                    <option value="TIDAK AKTIF">
                      Tidak Aktif
                    </option>

                  </select>

                </div>


                <div class="murid-filter-actions">

                  <button
                    type="button"
                    class="murid-btn murid-btn-secondary"
                    onclick="loadMurid()"
                  >
                    <i class="fa-solid fa-magnifying-glass"></i>
                    Cari
                  </button>

                </div>

              </div>

            </div>


            <!-- SUMMARY -->

            <div class="murid-summary">

              <div class="murid-summary-card">

                <div class="murid-summary-label">
                  Jumlah Dipaparkan
                </div>

                <div
                  id="murid-summary-total"
                  class="murid-summary-value"
                >
                  0
                </div>

              </div>


              <div class="murid-summary-card">

                <div class="murid-summary-label">
                  Murid Aktif
                </div>

                <div
                  id="murid-summary-active"
                  class="murid-summary-value"
                >
                  0
                </div>

              </div>


              <div class="murid-summary-card">

                <div class="murid-summary-label">
                  Tidak Aktif
                </div>

                <div
                  id="murid-summary-inactive"
                  class="murid-summary-value"
                >
                  0
                </div>

              </div>

            </div>


            <!-- TABLE -->

            <div class="murid-table-card">

              <div class="murid-table-header">

                <div>

                  <div class="murid-table-title">
                    Senarai Murid
                  </div>

                  <div
                    id="murid-table-count"
                    class="murid-table-count"
                  >
                    Memuatkan...
                  </div>

                </div>

              </div>


              <div class="murid-table-wrap">

                <table class="murid-table">

                  <thead>

                    <tr>

                      <th style="width:50px;">
                        #
                      </th>

                      <th>
                        Nama
                      </th>

                      <th>
                        No. KP
                      </th>

                      <th>
                        Tingkatan
                      </th>

                      <th>
                        Kelas
                      </th>

                      <th>
                        Tahun
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Tindakan
                      </th>

                    </tr>

                  </thead>

                  <tbody id="murid-table-body">

                    <tr>
                      <td colspan="8">
                        <div class="murid-loading">
                          Memuatkan data murid...
                        </div>
                      </td>
                    </tr>

                  </tbody>

                </table>

              </div>

            </div>

          </div>


          <!-- MODAL TAMBAH / EDIT -->

          <div
            id="murid-form-modal"
            class="murid-modal"
            onclick="closeMuridModalOutside(event)"
          >

            <div
              class="murid-modal-card"
              onclick="event.stopPropagation()"
            >

              <div class="murid-modal-header">

                <div
                  id="murid-modal-title"
                  class="murid-modal-title"
                >
                  Tambah Murid
                </div>

                <button
                  type="button"
                  class="murid-modal-close"
                  onclick="closeMuridModal()"
                >
                  ×
                </button>

              </div>


              <div class="murid-modal-body">

                <form
                  id="murid-form"
                  onsubmit="submitMuridForm(event)"
                >

                  <div class="murid-form-grid">


                    <div class="murid-form-group">

                      <label for="murid-no-kp">
                        No. KP *
                      </label>

                      <input
                        id="murid-no-kp"
                        type="text"
                        maxlength="20"
                        required
                        placeholder="Contoh: 100101101234"
                      >

                    </div>


                    <div class="murid-form-group">

                      <label for="murid-nama">
                        Nama Murid *
                      </label>

                      <input
                        id="murid-nama"
                        type="text"
                        required
                        placeholder="Nama penuh murid"
                      >

                    </div>


                    <div class="murid-form-group">

                      <label for="murid-jantina">
                        Jantina
                      </label>

                      <select id="murid-jantina">

                        <option value="">
                          Pilih
                        </option>

                        <option value="LELAKI">
                          Lelaki
                        </option>

                        <option value="PEREMPUAN">
                          Perempuan
                        </option>

                      </select>

                    </div>


                    <div class="murid-form-group">

                      <label for="murid-tingkatan">
                        Tingkatan
                      </label>

                      <select id="murid-tingkatan">

                        <option value="">
                          Pilih
                        </option>

                        <option value="1">Tingkatan 1</option>
                        <option value="2">Tingkatan 2</option>
                        <option value="3">Tingkatan 3</option>
                        <option value="4">Tingkatan 4</option>
                        <option value="5">Tingkatan 5</option>

                      </select>

                    </div>


                    <div class="murid-form-group">

                      <label for="murid-kelas">
                        Kelas
                      </label>

                      <input
                        id="murid-kelas"
                        type="text"
                        placeholder="Contoh: 1 ALPHA"
                      >

                    </div>


                    <div class="murid-form-group">

                      <label for="murid-tahun">
                        Tahun
                      </label>

                      <input
                        id="murid-tahun"
                        type="number"
                        min="2000"
                        max="2100"
                        placeholder="Contoh: 2026"
                      >

                    </div>


                    <div class="murid-form-group">

                      <label for="murid-status">
                        Status
                      </label>

                      <select id="murid-status">

                        <option value="AKTIF">
                          Aktif
                        </option>

                        <option value="TIDAK AKTIF">
                          Tidak Aktif
                        </option>

                      </select>

                    </div>


                    <div class="murid-form-group">

                      <label for="murid-email">
                        Email
                      </label>

                      <input
                        id="murid-email"
                        type="email"
                        placeholder="Email murid jika ada"
                      >

                    </div>

                  </div>

                </form>

              </div>


              <div class="murid-modal-footer">

                <button
                  type="button"
                  class="murid-btn murid-btn-secondary"
                  onclick="closeMuridModal()"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  form="murid-form"
                  id="murid-save-btn"
                  class="murid-btn murid-btn-primary"
                >
                  <i class="fa-solid fa-floppy-disk"></i>
                  Simpan
                </button>

              </div>

            </div>

          </div>


          <!-- MODAL SEJARAH -->

          <div
            id="murid-history-modal"
            class="murid-modal"
            onclick="closeMuridHistoryOutside(event)"
          >

            <div
              class="murid-modal-card"
              onclick="event.stopPropagation()"
            >

              <div class="murid-modal-header">

                <div
                  id="murid-history-title"
                  class="murid-modal-title"
                >
                  Sejarah Murid
                </div>

                <button
                  type="button"
                  class="murid-modal-close"
                  onclick="closeMuridHistory()"
                >
                  ×
                </button>

              </div>

              <div class="murid-modal-body">

                <div
                  id="murid-history-content"
                  class="murid-history-list"
                >
                  Memuatkan...
                </div>

              </div>

            </div>

          </div>

        `;

        populateMuridYears();

        loadMurid();
      }


      /* ---------------------------------------------------------
        TAHUN
        --------------------------------------------------------- */

      function populateMuridYears() {

        const select =
          document.getElementById(
            'murid-filter-tahun'
          );

        if (!select) return;

        const currentYear =
          new Date().getFullYear();

        let html =
          '<option value="">Semua Tahun</option>';

        for (
          let year = currentYear + 1;
          year >= currentYear - 5;
          year--
        ) {

          html += `
            <option value="${year}">
              ${year}
            </option>
          `;

        }

        select.innerHTML = html;

      }


      /* ---------------------------------------------------------
        LOAD MURID
        --------------------------------------------------------- */

      function loadMurid() {

        const tbody =
          document.getElementById(
            'murid-table-body'
          );

        if (!tbody) return;

        tbody.innerHTML = `
          <tr>
            <td colspan="8">
              <div class="murid-loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                Memuatkan data murid...
              </div>
            </td>
          </tr>
        `;

        const token =
          getMuridSessionToken();

        if (!token) {

          tbody.innerHTML = `
            <tr>
              <td colspan="8">
                <div class="murid-empty">
                  Sesi log masuk tidak ditemui.
                </div>
              </td>
            </tr>
          `;

          return;
        }


        const tahun =
          document.getElementById(
            'murid-filter-tahun'
          )?.value || '';

        const tingkatan =
          document.getElementById(
            'murid-filter-tingkatan'
          )?.value || '';

        const status =
          document.getElementById(
            'murid-filter-status'
          )?.value || '';


        const filters = {

          tahun:
            tahun,

          tingkatan:
            tingkatan,

          status:
            status

        };


        google.script.run

          .withSuccessHandler(function(result) {

            try {

              MURID_DATA =
                typeof result === 'string'
                  ? JSON.parse(result)
                  : (result || []);

            } catch (error) {

              MURID_DATA = [];

            }

            renderMuridTable();

          })

          .withFailureHandler(function(error) {

            console.error(
              'getMurid:',
              error
            );

            MURID_DATA = [];

            tbody.innerHTML = `
              <tr>
                <td colspan="8">
                  <div class="murid-empty">
                    <div class="murid-empty-icon">
                      ⚠️
                    </div>
                    Gagal memuatkan data murid.
                    <br>
                    <small>
                      ${escapeMuridHtml(
                        error?.message ||
                        'Ralat tidak diketahui.'
                      )}
                    </small>
                  </div>
                </td>
              </tr>
            `;

          })

          .getMurid(
            token,
            filters
          );

      }


      /* ---------------------------------------------------------
        FILTER LOCAL
        --------------------------------------------------------- */

      function filterMuridLocal() {

        renderMuridTable();

      }


      /* ---------------------------------------------------------
        RENDER TABLE
        --------------------------------------------------------- */

      function renderMuridTable() {

        const tbody =
          document.getElementById(
            'murid-table-body'
          );

        if (!tbody) return;


        const search =
          (
            document.getElementById(
              'murid-search'
            )?.value || ''
          )
            .trim()
            .toUpperCase();


        let data =
          Array.isArray(MURID_DATA)
            ? [...MURID_DATA]
            : [];


        if (search) {

          data =
            data.filter(function(row) {

              return (

                String(
                  row.NAMA || ''
                )
                  .toUpperCase()
                  .includes(search)

                ||

                String(
                  row.NO_KP || ''
                )
                  .toUpperCase()
                  .includes(search)

                ||

                String(
                  row.KELAS || ''
                )
                  .toUpperCase()
                  .includes(search)

              );

            });

        }


        updateMuridSummary(data);


        const count =
          document.getElementById(
            'murid-table-count'
          );

        if (count) {

          count.textContent =
            `${data.length} rekod`;

        }


        if (!data.length) {

          tbody.innerHTML = `
            <tr>
              <td colspan="8">

                <div class="murid-empty">

                  <div class="murid-empty-icon">
                    <i class="fa-solid fa-users-slash"></i>
                  </div>

                  Tiada rekod murid ditemui.

                </div>

              </td>
            </tr>
          `;

          return;
        }


        tbody.innerHTML =
          data.map(function(row, index) {

            const status =
              String(
                row.STATUS || 'AKTIF'
              ).toUpperCase();


            const statusClass =
              status === 'AKTIF'
                ? 'murid-status-active'
                : 'murid-status-inactive';


            return `

              <tr>

                <td>
                  ${index + 1}
                </td>


                <td>

                  <div class="murid-name">
                    ${escapeMuridHtml(
                      row.NAMA || '-'
                    )}
                  </div>

                </td>


                <td>

                  <span class="murid-kp">
                    ${escapeMuridHtml(
                      row.NO_KP || '-'
                    )}
                  </span>

                </td>


                <td>
                  ${escapeMuridHtml(
                    row.TINGKATAN || '-'
                  )}
                </td>


                <td>
                  ${escapeMuridHtml(
                    row.KELAS || '-'
                  )}
                </td>


                <td>
                  ${escapeMuridHtml(
                    row.TAHUN || '-'
                  )}
                </td>


                <td>

                  <span
                    class="murid-status ${statusClass}"
                  >
                    ${escapeMuridHtml(
                      status
                    )}
                  </span>

                </td>


                <td>

                  <div class="murid-actions">

                    <button
                      type="button"
                      class="murid-btn murid-btn-secondary murid-btn-small"
                      onclick="viewMuridHistory('${escapeJsMurid(row.NO_KP)}')"
                      title="Sejarah"
                    >
                      <i class="fa-solid fa-clock-rotate-left"></i>
                    </button>


                    <button
                      type="button"
                      class="murid-btn murid-btn-secondary murid-btn-small"
                      onclick="editMurid('${escapeJsMurid(row.NO_KP)}')"
                      title="Edit"
                    >
                      <i class="fa-solid fa-pen"></i>
                    </button>


                    ${
                      getMuridCurrentRole() === 'ADMIN'
                      && status === 'AKTIF'
                      ? `
                        <button
                          type="button"
                          class="murid-btn murid-btn-danger murid-btn-small"
                          onclick="deleteMuridRecord('${escapeJsMurid(row.NO_KP)}')"
                          title="Nyahaktif"
                        >
                          <i class="fa-solid fa-user-slash"></i>
                        </button>
                      `
                      : ''
                    }

                  </div>

                </td>

              </tr>

            `;

          }).join('');

      }


      /* ---------------------------------------------------------
        SUMMARY
        --------------------------------------------------------- */

      function updateMuridSummary(data) {

        const total =
          data.length;

        const active =
          data.filter(function(row) {

            return String(
              row.STATUS || ''
            ).toUpperCase() === 'AKTIF';

          }).length;


        const inactive =
          data.filter(function(row) {

            return String(
              row.STATUS || ''
            ).toUpperCase() === 'TIDAK AKTIF';

          }).length;


        const totalEl =
          document.getElementById(
            'murid-summary-total'
          );

        const activeEl =
          document.getElementById(
            'murid-summary-active'
          );

        const inactiveEl =
          document.getElementById(
            'murid-summary-inactive'
          );


        if (totalEl)
          totalEl.textContent =
            total;


        if (activeEl)
          activeEl.textContent =
            active;


        if (inactiveEl)
          inactiveEl.textContent =
            inactive;

      }


      /* ---------------------------------------------------------
        TAMBAH
        --------------------------------------------------------- */

      function openMuridModal() {

        MURID_EDITING = null;

        const modal =
          document.getElementById(
            'murid-form-modal'
          );

        const title =
          document.getElementById(
            'murid-modal-title'
          );


        if (title)
          title.textContent =
            'Tambah Murid';


        const form =
          document.getElementById(
            'murid-form'
          );

        if (form)
          form.reset();


        const status =
          document.getElementById(
            'murid-status'
          );

        if (status)
          status.value =
            'AKTIF';


        const year =
          document.getElementById(
            'murid-tahun'
          );

        if (year)
          year.value =
            new Date().getFullYear();


        const kp =
          document.getElementById(
            'murid-no-kp'
          );

        if (kp)
          kp.disabled = false;


        if (modal)
          modal.classList.add('show');

      }


      /* ---------------------------------------------------------
        EDIT
        --------------------------------------------------------- */

      function editMurid(noKp) {

        const row =
          MURID_DATA.find(function(item) {

            return String(
              item.NO_KP
            ) === String(noKp);

          });


        if (!row) {

          showMuridMessage(
            'Rekod murid tidak ditemui.',
            'error'
          );

          return;

        }


        MURID_EDITING =
          row;


        const title =
          document.getElementById(
            'murid-modal-title'
          );

        if (title)
          title.textContent =
            'Edit Rekod Murid';


        setMuridField(
          'murid-no-kp',
          row.NO_KP
        );

        setMuridField(
          'murid-nama',
          row.NAMA
        );

        setMuridField(
          'murid-jantina',
          row.JANTINA
        );

        setMuridField(
          'murid-tingkatan',
          row.TINGKATAN
        );

        setMuridField(
          'murid-kelas',
          row.KELAS
        );

        setMuridField(
          'murid-tahun',
          row.TAHUN
        );

        setMuridField(
          'murid-status',
          row.STATUS || 'AKTIF'
        );

        setMuridField(
          'murid-email',
          row.EMAIL
        );


        const kp =
          document.getElementById(
            'murid-no-kp'
          );

        if (kp)
          kp.disabled = true;


        const modal =
          document.getElementById(
            'murid-form-modal'
          );

        if (modal)
          modal.classList.add('show');

      }


      /* ---------------------------------------------------------
        SUBMIT
        --------------------------------------------------------- */

      function submitMuridForm(event) {

        event.preventDefault();


        const token =
          getMuridSessionToken();


        if (!token) {

          showMuridMessage(
            'Sesi log masuk telah tamat. Sila log masuk semula.',
            'error'
          );

          return;

        }


        const data = {

          NO_KP:
            getMuridField(
              'murid-no-kp'
            ),

          NAMA:
            getMuridField(
              'murid-nama'
            ),

          JANTINA:
            getMuridField(
              'murid-jantina'
            ),

          TINGKATAN:
            getMuridField(
              'murid-tingkatan'
            ),

          KELAS:
            getMuridField(
              'murid-kelas'
            ),

          TAHUN:
            getMuridField(
              'murid-tahun'
            ),

          STATUS:
            getMuridField(
              'murid-status'
            ),

          EMAIL:
            getMuridField(
              'murid-email'
            )

        };


        if (!data.NO_KP || !data.NAMA) {

          showMuridMessage(
            'No. KP dan Nama Murid wajib diisi.',
            'error'
          );

          return;

        }


        const saveBtn =
          document.getElementById(
            'murid-save-btn'
          );


        if (saveBtn) {

          saveBtn.disabled =
            true;

          saveBtn.innerHTML =
            `
              <i class="fa-solid fa-spinner fa-spin"></i>
              Menyimpan...
            `;

        }


        google.script.run

          .withSuccessHandler(function(result) {

            if (saveBtn) {

              saveBtn.disabled =
                false;

              saveBtn.innerHTML =
                `
                  <i class="fa-solid fa-floppy-disk"></i>
                  Simpan
                `;

            }


            closeMuridModal();


            showMuridMessage(
              MURID_EDITING
                ? 'Rekod murid berjaya dikemaskini.'
                : 'Murid berjaya didaftarkan.',
              'success'
            );


            MURID_EDITING =
              null;


            loadMurid();

          })

          .withFailureHandler(function(error) {

            if (saveBtn) {

              saveBtn.disabled =
                false;

              saveBtn.innerHTML =
                `
                  <i class="fa-solid fa-floppy-disk"></i>
                  Simpan
                `;

            }


            showMuridMessage(
              error?.message ||
              'Gagal menyimpan rekod murid.',
              'error'
            );

          })

          .saveMurid(
            token,
            data
          );

      }


      /* ---------------------------------------------------------
        DELETE / SOFT DELETE
        --------------------------------------------------------- */

      function deleteMuridRecord(noKp) {

        const row =
          MURID_DATA.find(function(item) {

            return String(
              item.NO_KP
            ) === String(noKp);

          });


        const nama =
          row?.NAMA ||
          noKp;


        const confirmed =
          window.confirm(
            `Adakah anda pasti mahu menyahaktifkan murid "${nama}"?`
          );


        if (!confirmed) return;


        const token =
          getMuridSessionToken();


        if (!token) {

          showMuridMessage(
            'Sesi log masuk tidak ditemui.',
            'error'
          );

          return;

        }


        google.script.run

          .withSuccessHandler(function() {

            showMuridMessage(
              'Murid telah dinyahaktifkan.',
              'success'
            );

            loadMurid();

          })

          .withFailureHandler(function(error) {

            showMuridMessage(
              error?.message ||
              'Gagal menyahaktifkan murid.',
              'error'
            );

          })

          .deleteMurid(
            token,
            noKp
          );

      }


      /* ---------------------------------------------------------
        HISTORY
        --------------------------------------------------------- */

      function viewMuridHistory(noKp) {

        const modal =
          document.getElementById(
            'murid-history-modal'
          );

        const title =
          document.getElementById(
            'murid-history-title'
          );

        const content =
          document.getElementById(
            'murid-history-content'
          );


        if (modal)
          modal.classList.add('show');


        if (content) {

          content.innerHTML =
            `
              <div class="murid-loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                Memuatkan sejarah...
              </div>
            `;

        }


        const row =
          MURID_DATA.find(function(item) {

            return String(
              item.NO_KP
            ) === String(noKp);

          });


        if (title) {

          title.textContent =
            `Sejarah Murid — ${
              row?.NAMA || noKp
            }`;

        }


        const token =
          getMuridSessionToken();


        google.script.run

          .withSuccessHandler(function(result) {

            let data = [];

            try {

              data =
                typeof result === 'string'
                  ? JSON.parse(result)
                  : (result || []);

            } catch (e) {

              data = [];

            }


            renderMuridHistory(
              data
            );

          })

          .withFailureHandler(function(error) {

            if (content) {

              content.innerHTML =
                `
                  <div class="murid-empty">
                    Gagal memuatkan sejarah.
                    <br>
                    <small>
                      ${escapeMuridHtml(
                        error?.message || ''
                      )}
                    </small>
                  </div>
                `;

            }

          })

          .getStudentHistory(
            token,
            noKp
          );

      }


      /* ---------------------------------------------------------
        RENDER HISTORY
        --------------------------------------------------------- */

      function renderMuridHistory(data) {

        const content =
          document.getElementById(
            'murid-history-content'
          );

        if (!content) return;


        if (!Array.isArray(data) || !data.length) {

          content.innerHTML =
            `
              <div class="murid-empty">

                <div class="murid-empty-icon">
                  <i class="fa-solid fa-clock-rotate-left"></i>
                </div>

                Tiada sejarah murid direkodkan.

              </div>
            `;

          return;

        }


        data.sort(function(a, b) {

          return String(
            b.TAHUN || ''
          ).localeCompare(
            String(a.TAHUN || '')
          );

        });


        content.innerHTML =
          data.map(function(row) {

            return `

              <div class="murid-history-item">

                <div class="murid-history-year">

                  Tahun ${escapeMuridHtml(
                    row.TAHUN || '-'
                  )}

                </div>

                <div class="murid-history-detail">

                  Tingkatan:
                  ${escapeMuridHtml(
                    row.TINGKATAN || '-'
                  )}

                  &nbsp; • &nbsp;

                  Kelas:
                  ${escapeMuridHtml(
                    row.KELAS || '-'
                  )}

                  &nbsp; • &nbsp;

                  Status:
                  ${escapeMuridHtml(
                    row.STATUS || '-'
                  )}

                </div>

              </div>

            `;

          }).join('');

      }


      /* ---------------------------------------------------------
        CLOSE MODAL
        --------------------------------------------------------- */

      function closeMuridModal() {

        const modal =
          document.getElementById(
            'murid-form-modal'
          );

        if (modal)
          modal.classList.remove('show');

        MURID_EDITING =
          null;

      }


      function closeMuridModalOutside(event) {

        if (
          event.target &&
          event.target.id ===
            'murid-form-modal'
        ) {

          closeMuridModal();

        }

      }


      function closeMuridHistory() {

        const modal =
          document.getElementById(
            'murid-history-modal'
          );

        if (modal)
          modal.classList.remove('show');

      }


      function closeMuridHistoryOutside(event) {

        if (
          event.target &&
          event.target.id ===
            'murid-history-modal'
        ) {

          closeMuridHistory();

        }

      }


      /* ---------------------------------------------------------
        RESET FILTER
        --------------------------------------------------------- */

      function resetMuridFilters() {

        const search =
          document.getElementById(
            'murid-search'
          );

        const tahun =
          document.getElementById(
            'murid-filter-tahun'
          );

        const tingkatan =
          document.getElementById(
            'murid-filter-tingkatan'
          );

        const status =
          document.getElementById(
            'murid-filter-status'
          );


        if (search)
          search.value = '';

        if (tahun)
          tahun.value = '';

        if (tingkatan)
          tingkatan.value = '';

        if (status)
          status.value = '';


        loadMurid();

      }


      /* ---------------------------------------------------------
        FIELD HELPERS
        --------------------------------------------------------- */

      function getMuridField(id) {

        const el =
          document.getElementById(id);

        return el
          ? String(el.value || '').trim()
          : '';

      }


      function setMuridField(id, value) {

        const el =
          document.getElementById(id);

        if (el)
          el.value =
            value == null
              ? ''
              : value;

      }


      /* ---------------------------------------------------------
        ESCAPE
        --------------------------------------------------------- */

      function escapeMuridHtml(value) {

        return String(
          value == null
            ? ''
            : value
        )
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

      }


      function escapeJsMurid(value) {

        return String(
          value == null
            ? ''
            : value
        )
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\\'")
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r');

      }


      /* ---------------------------------------------------------
        MESSAGE
        --------------------------------------------------------- */

      function showMuridMessage(
        message,
        type
      ) {

        /*
        * Cuba gunakan sistem notification sedia ada
        * jika BENTO Master sudah mempunyainya.
        */

        try {

          if (
            typeof showToast === 'function'
          ) {

            showToast(
              message,
              type
            );

            return;

          }

        } catch (e) {}


        try {

          if (
            typeof showNotification === 'function'
          ) {

            showNotification(
              message,
              type
            );

            return;

          }

        } catch (e) {}


        if (type === 'error') {

          alert(
            'Ralat: ' +
            message
          );

        } else {

          alert(message);

        }

      }

  /* =========================================================
   KOKURIKULUM MODULES — FUNCTIONAL FRONTEND
========================================================= */
let CK_PLACEMENTS=[], CK_ATT=[], CK_ACT=[], CK_ACH=[], CK_STUDENTS=[], CK_UNITS=[], CK_AJK=[], CK_PARTICIPANTS=[], CK_GURU=[];
function ckParse(v){try{return typeof v==='string'?JSON.parse(v||'[]'):v||[]}catch(e){return []}}
function ckYearOptions(rows){const years=new Set([String(new Date().getFullYear())]);(rows||[]).forEach(r=>{if(r.TAHUN)years.add(String(r.TAHUN));});return [...years].sort((a,b)=>Number(b)-Number(a)).map(y=>`<option value="${y}">${y}</option>`).join('')}
function ckUnitOptions(){return (CK_UNITS||[]).filter(r=>String(r.STATUS||'AKTIF').toUpperCase()==='AKTIF').sort((a,b)=>String(a.NAMA_UNIT||'').localeCompare(String(b.NAMA_UNIT||''))).map(r=>`<option value="${escapeHtml(r.UNIT_ID)}">${escapeHtml(r.NAMA_UNIT)} · ${escapeHtml(r.KATEGORI||'')}</option>`).join('')}
function ckStudentOptions(){return (CK_STUDENTS||[]).filter(r=>String(r.STATUS||'AKTIF').toUpperCase()!=='TIDAK AKTIF').sort((a,b)=>String(a.NAMA||'').localeCompare(String(b.NAMA||''))).map(r=>`<option value="${escapeHtml(r.NO_KP)}">${escapeHtml(r.NAMA)} · ${escapeHtml(r.KELAS||'')}</option>`).join('')}
function ckInitials(n){return String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function ckEscapeDate(v){if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);return d.toISOString().slice(0,10)}
function ckDateMY(v){if(!v)return '-';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);return d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short',year:'numeric'})}

function renderPenempatanPage(){const c=document.getElementById('page-penempatan');if(!c)return;const oldProfileModal=document.getElementById('pl-profile-modal');if(oldProfileModal)oldProfileModal.remove();c.innerHTML=`<div class="ck-module"><div class="ck-head"><div><div class="ck-kicker">Kokurikulum</div><h1 class="ck-title">Profil Murid</h1><p class="ck-sub">Senarai semua murid tahun semasa. Klik murid untuk membuka profil semasa dan sejarah tahun sebelumnya.</p></div><div class="ck-actions"><button class="ck-btn" onclick="loadPenempatanPage()"><i class="fa-solid fa-rotate"></i> Segar</button><button class="ck-btn ck-btn-primary" onclick="openPlacementForm()"><i class="fa-solid fa-user-plus"></i> Tambah Penempatan</button></div></div><div class="ck-kpis"><div class="ck-kpi"><div class="ck-kpi-label">Jumlah Murid</div><div id="pl-kpi-total" class="ck-kpi-value">0</div></div><div class="ck-kpi"><div class="ck-kpi-label">Murid Berpenempatan</div><div id="pl-kpi-active" class="ck-kpi-value">0</div></div><div class="ck-kpi"><div class="ck-kpi-label">Belum Lengkap</div><div id="pl-kpi-students" class="ck-kpi-value">0</div></div><div class="ck-kpi"><div class="ck-kpi-label">Unit Terlibat</div><div id="pl-kpi-units" class="ck-kpi-value">0</div></div></div><div class="ck-filter"><div class="ck-filter-grid"><div class="ck-field"><label>Carian</label><input id="pl-search" placeholder="Nama, NO_KP atau kelas..." oninput="filterPlacementTable()"></div><div class="ck-field"><label>Tahun</label><select id="pl-year" onchange="filterPlacementTable()"></select></div><div class="ck-field"><label>Unit</label><select id="pl-unit" onchange="filterPlacementTable()"><option value="">Semua Unit</option></select></div><div class="ck-field"><label>Status Penempatan</label><select id="pl-status" onchange="filterPlacementTable()"><option value="">Semua</option><option>AKTIF</option><option>TIDAK AKTIF</option><option>BELUM DITEMPATKAN</option></select></div><button class="ck-btn" onclick="resetPlacementFilter()"><i class="fa-solid fa-rotate-left"></i> Reset</button></div></div><div class="ck-card"><div class="ck-toolbar"><div><div class="ck-toolbar-title">Senarai Profil Murid Tahun Semasa</div><div id="pl-count" class="ck-count">Memuatkan...</div></div><div class="ck-count">Klik nama murid untuk profil</div></div><div class="ck-table-wrap"><table class="ck-table"><thead><tr><th>Murid</th><th>NO. KP</th><th>Kelas</th><th>Unit Kokurikulum</th><th>Tahun</th><th>Status</th><th>Tindakan</th></tr></thead><tbody id="pl-body"></tbody></table></div></div></div><div id="pl-modal" class="ck-modal" onclick="if(event.target===this)closePlacementForm()"><div class="ck-dialog"><div class="ck-dialog-head"><div class="ck-dialog-title" id="pl-modal-title">Tambah Penempatan</div><button class="ck-close" onclick="closePlacementForm()">×</button></div><form id="pl-form" onsubmit="submitPlacementForm(event)"><div class="ck-dialog-body"><div class="ck-grid"><div class="ck-field full"><label>Murid *</label><select id="pl-student" required></select></div><div class="ck-field"><label>Unit *</label><select id="pl-unit-form" required></select></div><div class="ck-field"><label>Tahun *</label><input id="pl-year-form" type="number" required></div><div class="ck-field"><label>Status</label><select id="pl-status-form"><option>AKTIF</option><option>TIDAK AKTIF</option></select></div></div><div class="ck-info" style="margin-top:14px"><i class="fa-solid fa-shield-halved"></i> Sistem mengelakkan penempatan berganda bagi NO_KP + UNIT_ID + TAHUN.</div></div><div class="ck-dialog-foot"><button type="button" class="ck-btn" onclick="closePlacementForm()">Batal</button><button class="ck-btn ck-btn-primary" id="pl-save"><i class="fa-solid fa-floppy-disk"></i> Simpan</button></div></form></div></div><div id="pl-profile-modal" class="ck-modal" onclick="if(event.target===this)closeStudentProfile()"><div class="ck-dialog ck-profile-dialog"><div class="ck-dialog-head"><div><div class="ck-dialog-title">Profil Murid</div><div id="pl-profile-subtitle" class="ck-count">Memuatkan...</div></div><button class="ck-close" onclick="closeStudentProfile()">×</button></div><div id="pl-profile-content" class="ck-dialog-body"><div class="ck-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan profil...</div></div></div></div></div>`;const profileModal=document.getElementById('pl-profile-modal');if(profileModal)document.body.appendChild(profileModal);loadPenempatanPage()}
async function loadPenempatanPage(){const b=document.getElementById('pl-body');if(b)b.innerHTML='<tr><td colspan="7"><div class="ck-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan murid tahun semasa...</div></div></td></tr>';try{const [p,u,m]=await Promise.all([server('getPlacements',getMuridSessionToken(),{}),server('getUnits',getMuridSessionToken(),{}),server('getMurid',getMuridSessionToken(),{})]);CK_PLACEMENTS=ckParse(p);CK_UNITS=ckParse(u);CK_STUDENTS=ckParse(m);const current=String(new Date().getFullYear());const years=new Set(CK_STUDENTS.map(x=>String(x.TAHUN||'')).filter(Boolean));CK_PLACEMENTS.forEach(x=>years.add(String(x.TAHUN||'')));document.getElementById('pl-year').innerHTML='<option value="">Semua Tahun</option>'+Array.from(years).filter(Boolean).sort((a,b)=>Number(b)-Number(a)).map(y=>`<option value="${escapeHtml(y)}" ${y===current?'selected':''}>${escapeHtml(y)}</option>`).join('');document.getElementById('pl-unit').innerHTML='<option value="">Semua Unit</option>'+ckUnitOptions();updatePlacementKpi();filterPlacementTable()}catch(e){if(b)b.innerHTML=`<tr><td colspan="7"><div class="ck-empty">${escapeHtml(e.message||String(e))}</div></td></tr>`;showToast(e.message||'Gagal memuatkan penempatan','error')}}
function updatePlacementKpi(){const year=document.getElementById('pl-year')?.value||String(new Date().getFullYear());const students=(CK_STUDENTS||[]).filter(x=>!year||String(x.TAHUN)===year);const placements=(CK_PLACEMENTS||[]).filter(x=>!year||String(x.TAHUN)===year);const active=new Set(placements.filter(x=>String(x.STATUS||'AKTIF').toUpperCase()==='AKTIF').map(x=>String(x.NO_KP)));setText('pl-kpi-total',students.length);setText('pl-kpi-active',active.size);setText('pl-kpi-students',Math.max(0,students.length-active.size));setText('pl-kpi-units',new Set(placements.map(x=>String(x.UNIT_ID))).size)}
function filterPlacementTable(){const q=(document.getElementById('pl-search')?.value||'').toUpperCase(),y=document.getElementById('pl-year')?.value||String(new Date().getFullYear()),u=document.getElementById('pl-unit')?.value||'',st=document.getElementById('pl-status')?.value||'';let students=(CK_STUDENTS||[]).filter(x=>!y||String(x.TAHUN)===y);const unitMap={};(CK_UNITS||[]).forEach(x=>unitMap[String(x.UNIT_ID)]=x);const byStudent={};(CK_PLACEMENTS||[]).forEach(x=>{if(y&&String(x.TAHUN)!==y)return;const k=String(x.NO_KP);if(!byStudent[k])byStudent[k]=[];byStudent[k].push(x)});let rows=students.map(m=>{const ps=byStudent[String(m.NO_KP)]||[];const filteredPs=u?ps.filter(p=>String(p.UNIT_ID)===String(u)):ps;const activePs=filteredPs.filter(p=>String(p.STATUS||'AKTIF').toUpperCase()==='AKTIF');const units=filteredPs.map(p=>{const z=unitMap[String(p.UNIT_ID)]||{};return {name:z.NAMA_UNIT||p.UNIT_ID,status:String(p.STATUS||'AKTIF').toUpperCase(),cat:z.KATEGORI||''}});let rowStatus=activePs.length?'AKTIF':'BELUM DITEMPATKAN';if(filteredPs.length&&!activePs.length)rowStatus='TIDAK AKTIF';return Object.assign({},m,{_placements:units,_status:rowStatus})}).filter(x=>!u||x._placements.length>0).filter(x=>!st||x._status===st).filter(x=>!q||[x.NO_KP,x.NAMA,x.KELAS,x.TINGKATAN,x._placements.map(p=>p.name).join(' ')].some(v=>String(v||'').toUpperCase().includes(q))).sort((a,b)=>String(a.NAMA||'').localeCompare(String(b.NAMA||'')));updatePlacementKpi();const b=document.getElementById('pl-body');if(!b)return;setText('pl-count',`${rows.length} murid dipaparkan`);b.innerHTML=rows.length?rows.map((x,i)=>{const units=x._placements.length?x._placements.map(p=>`<span class="ck-badge ${p.status==='AKTIF'?'active':'inactive'}" style="margin:2px 4px 2px 0;display:inline-flex">${escapeHtml(p.name)}</span>`).join(''):'<span class="ck-count">Belum ditempatkan</span>';return `<tr><td><button class="ck-person" style="border:0;background:transparent;padding:0;text-align:left;cursor:pointer" title="Lihat profil murid" data-profile-kp="${escapeHtml(String(x.NO_KP))}"><div class="ck-avatar">${escapeHtml(ckInitials(x.NAMA))}</div><div><div class="ck-name">${escapeHtml(x.NAMA||'Tidak ditemui')}</div><div class="ck-meta">${escapeHtml(x.KELAS||'-')}</div></div></button></td><td>${escapeHtml(x.NO_KP||'-')}</td><td>${escapeHtml(x.KELAS||'-')}<div class="ck-meta">Tingkatan ${escapeHtml(x.TINGKATAN||'-')}</div></td><td>${units}</td><td>${escapeHtml(x.TAHUN||y)}</td><td><span class="ck-badge ${x._status==='AKTIF'?'active':x._status==='TIDAK AKTIF'?'inactive':''}">${escapeHtml(x._status)}</span></td><td><div class="ck-icon-actions"><button class="ck-icon" title="Lihat profil" data-profile-kp="${escapeHtml(String(x.NO_KP))}"><i class="fa-solid fa-eye"></i></button></div></td></tr>`}).join(''):'<tr><td colspan="7"><div class="ck-empty"><i class="fa-solid fa-user-group"></i><div>Tiada murid untuk penapis semasa.</div></div></td></tr>'}
function resetPlacementFilter(){const y=document.getElementById('pl-year');['pl-search','pl-unit','pl-status'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});if(y)y.value=String(new Date().getFullYear());filterPlacementTable()}
function openPlacementForm(){const st=document.getElementById('pl-student'),u=document.getElementById('pl-unit-form');st.innerHTML='<option value="">Pilih murid</option>'+ckStudentOptions();u.innerHTML='<option value="">Pilih unit</option>'+ckUnitOptions();document.getElementById('pl-year-form').value=new Date().getFullYear();document.getElementById('pl-status-form').value='AKTIF';document.getElementById('pl-modal').classList.add('open');setTimeout(()=>st.focus(),40)}function closePlacementForm(){document.getElementById('pl-modal')?.classList.remove('open')}
async function submitPlacementForm(e){e.preventDefault();const btn=document.getElementById('pl-save');const data={NO_KP:document.getElementById('pl-student').value,UNIT_ID:document.getElementById('pl-unit-form').value,TAHUN:document.getElementById('pl-year-form').value,STATUS:document.getElementById('pl-status-form').value};if(!data.NO_KP||!data.UNIT_ID){showToast('Murid dan unit wajib dipilih.','warning');return}try{btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';await server('savePlacement',getMuridSessionToken(),data);closePlacementForm();showToast('Penempatan berjaya disimpan.','success');await loadPenempatanPage()}catch(err){showToast(err.message||'Gagal menyimpan penempatan','error')}finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Simpan'}}
async function deactivatePlacement(id){if(!confirm('Nyahaktifkan penempatan ini?'))return;try{await server('updatePlacementStatus',getMuridSessionToken(),id,'TIDAK AKTIF');showToast('Penempatan dinyahaktifkan.','success');loadPenempatanPage()}catch(e){showToast(e.message||'Gagal mengemaskini','error')}}
async function openStudentProfile(noKp){
  const modal=document.getElementById('pl-profile-modal');
  const content=document.getElementById('pl-profile-content');
  if(!modal||!content){
    showToast('Paparan profil murid tidak tersedia.','error');
    return;
  }
  if(modal.parentElement!==document.body) document.body.appendChild(modal);
  modal.style.display='flex';
  modal.style.visibility='visible';
  modal.style.opacity='1';
  modal.style.zIndex='99999';
  modal.classList.add('open');
  document.body.classList.add('ck-modal-open');
  content.innerHTML='<div class="ck-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan profil murid...</div></div>';
  try{
    let raw;
    try{
      raw=await server('getMuridProfilePopup',getMuridSessionToken(),String(noKp||''));
    }catch(primaryError){
      raw=await server('getStudentAnalysisProfile',getMuridSessionToken(),String(noKp||''));
    }
    const d=ckParse(raw);
    if(!d||!d.current){throw new Error('Data profil murid tidak diterima daripada server.');}
    const cur=d.current||{};
    const prev=d.previous||null;
    setText('pl-profile-subtitle','NO. KP: '+(cur.NO_KP||noKp));
    const placementHtml=(p)=>p&&p.length?p.map(x=>`<div class="ck-profile-item"><div><b>${escapeHtml(x.nama||x.NAMA_UNIT||x.UNIT_ID||'-')}</b><div class="ck-meta">${escapeHtml(x.KATEGORI||'')}</div></div><span class="ck-badge ${String(x.STATUS||'AKTIF').toUpperCase()==='AKTIF'?'active':'inactive'}">${escapeHtml(x.STATUS||'AKTIF')}</span></div>`).join(''):'<div class="ck-empty" style="padding:18px">Tiada penempatan.</div>';
    const yearCard=(label,s,stats)=>`<div class="ck-profile-year"><div class="ck-profile-year-head"><div><div class="ck-kicker">${label}</div><h3>${escapeHtml(s.NAMA||cur.NAMA||'-')}</h3><div class="ck-meta">Tingkatan ${escapeHtml(s.TINGKATAN||'-')} · ${escapeHtml(s.KELAS||'-')} · ${escapeHtml(s.STATUS||'AKTIF')}</div></div><span class="ck-badge active">${escapeHtml(String(s.TAHUN||'-'))}</span></div><div class="ck-mini-grid"><div class="ck-kpi"><div class="ck-kpi-label">Kehadiran</div><div class="ck-kpi-value">${escapeHtml(String(stats&&stats.attendance?stats.attendance.pct:0))}%</div></div><div class="ck-kpi"><div class="ck-kpi-label">Unit</div><div class="ck-kpi-value">${stats&&stats.units?stats.units.length:0}</div></div><div class="ck-kpi"><div class="ck-kpi-label">Aktiviti</div><div class="ck-kpi-value">${stats&&stats.activities?stats.activities.length:0}</div></div><div class="ck-kpi"><div class="ck-kpi-label">Pencapaian</div><div class="ck-kpi-value">${stats&&stats.achievements?stats.achievements.length:0}</div></div></div><div class="ck-profile-section"><div class="ck-toolbar-title">Penempatan</div>${placementHtml(stats&&stats.units?stats.units:[])}</div></div>`;
    content.innerHTML=`<div class="ck-profile-top"><div class="ck-avatar ck-avatar-lg">${escapeHtml(ckInitials(cur.NAMA))}</div><div><h2>${escapeHtml(cur.NAMA||'-')}</h2><div class="ck-meta">NO. KP: ${escapeHtml(cur.NO_KP||noKp)} · Tingkatan ${escapeHtml(cur.TINGKATAN||'-')} · ${escapeHtml(cur.KELAS||'-')}</div></div></div>${yearCard('Tahun Semasa',cur,d.currentStats||{})}${prev?yearCard('Tahun Sebelumnya',prev,d.previousStats||{}):'<div class="ck-info"><i class="fa-solid fa-circle-info"></i> Tiada rekod tahun sebelumnya. Profil hanya memaparkan data tahun semasa.</div>'}`;
  }catch(e){
    content.innerHTML='<div class="ck-profile-error"><b>Profil murid tidak dapat dimuatkan.</b><div style="margin-top:6px">'+escapeHtml(e.message||String(e))+'</div></div>';
  }
}

if(!window.__ekProfileClickBound){document.addEventListener('click',function(ev){const btn=ev.target.closest('[data-profile-kp]');if(!btn)return;ev.preventDefault();ev.stopPropagation();openStudentProfile(btn.getAttribute('data-profile-kp')||'');});window.__ekProfileClickBound=true;}

function closeStudentProfile(){const m=document.getElementById('pl-profile-modal');if(m){m.classList.remove('open');m.style.display='none';m.style.visibility='hidden';}document.body.classList.remove('ck-modal-open')}

function renderKehadiranPage(){const c=document.getElementById('page-kehadiran');if(!c)return;c.innerHTML=`<div class="ck-module"><div class="ck-head"><div><div class="ck-kicker">Kokurikulum</div><h1 class="ck-title">Kehadiran</h1><p class="ck-sub">Rekod kehadiran ahli unit mengikut tahun, tarikh, minggu persekolahan dan nombor perjumpaan.</p></div><div class="ck-actions"><button class="ck-btn" onclick="loadKehadiranPage()"><i class="fa-solid fa-rotate"></i> Segar</button><button class="ck-btn ck-btn-success" onclick="saveKehadiranPage()"><i class="fa-solid fa-floppy-disk"></i> Simpan Kehadiran</button></div></div><div class="ck-card"><div class="ck-grid"><div class="ck-field"><label>Tahun</label><select id="att-year" onchange="loadAttendanceSessionUI()"></select></div><div class="ck-field"><label>Kategori</label><select id="att-cat" onchange="filterAttendanceUnits()"><option value="">Semua Kategori</option></select></div><div class="ck-field"><label>Unit *</label><select id="att-unit" onchange="loadAttendanceSessionUI()"></select></div><div class="ck-field"><label>Tarikh *</label><input id="att-date" type="date" onchange="loadAttendanceSessionUI()"></div><div class="ck-field"><label>Minggu</label><select id="att-week"><option value="">Pilih minggu</option>${Array.from({length:15},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></div><div class="ck-field"><label>No. Perjumpaan</label><input id="att-meeting" type="number" min="1"></div></div></div><div class="ck-card"><div class="ck-toolbar"><div><div class="ck-toolbar-title">Senarai Ahli</div><div id="att-count" class="ck-count">Pilih unit dan tarikh</div></div><button class="ck-btn" onclick="markAllAttendance('HADIR')"><i class="fa-solid fa-check-double"></i> Pilih Semua Hadir</button></div><div id="att-list" class="ck-checklist"><div class="ck-empty"><i class="fa-solid fa-calendar-check"></i><div>Pilih unit dan tarikh untuk memuatkan ahli.</div></div></div></div></div>`;loadKehadiranPage()}
async function loadKehadiranPage(){try{const u=await server('getUnits',getMuridSessionToken(),{});CK_UNITS=ckParse(u)||[];const y=document.getElementById('att-year');const dateEl=document.getElementById('att-date');const today=new Date();const todayStr=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);if(dateEl&&!dateEl.value)dateEl.value=todayStr;y.innerHTML=ckYearOptions(CK_UNITS);const dateYear=(dateEl&&dateEl.value)?String(dateEl.value).slice(0,4):String(today.getFullYear());if([...y.options].some(o=>o.value===dateYear))y.value=dateYear;renderAttendanceCategories();filterAttendanceUnits();loadAttendanceSessionUI()}catch(e){showToast(e.message||'Gagal memuatkan kehadiran','error')}}
function attendanceCategoryKey(cat){const c=String(cat||'').trim().toUpperCase();if(c==='UNIT BERUNIFORM'||c==='BADAN BERUNIFORM'||c==='UNIT')return 'UNIT BERUNIFORM';if(c==='KELAB / PERSATUAN'||c==='KELAB & PERSATUAN'||c==='KELAB'||c==='PERSATUAN')return 'KELAB / PERSATUAN';if(c==='SUKAN / PERMAINAN'||c==='SUKAN & PERMAINAN'||c==='SUKAN'||c==='PERMAINAN')return 'SUKAN / PERMAINAN';if(c==='RUMAH SUKAN'||c==='RUMAH')return 'RUMAH SUKAN';return c;}
function attendanceCategoryLabel(cat){const c=attendanceCategoryKey(cat);return c==='UNIT BERUNIFORM'?'UNIT':c==='KELAB / PERSATUAN'?'KELAB':c==='SUKAN / PERMAINAN'?'SUKAN':c==='RUMAH SUKAN'?'RUMAH':cat;}
function renderAttendanceCategories(){const sel=document.getElementById('att-cat');if(!sel)return;const cats=[...new Set((CK_UNITS||[]).map(u=>attendanceCategoryKey(u.KATEGORI)).filter(Boolean))];sel.innerHTML='<option value="">Semua Kategori</option>'+cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(attendanceCategoryLabel(c))}</option>`).join('');}
function filterAttendanceUnits(){const cat=attendanceCategoryKey(document.getElementById('att-cat')?.value||''),sel=document.getElementById('att-unit');if(!sel)return;sel.innerHTML='<option value="">Pilih unit</option>'+(CK_UNITS||[]).filter(u=>!cat||attendanceCategoryKey(u.KATEGORI)===cat).sort((a,b)=>String(a.NAMA_UNIT||'').localeCompare(String(b.NAMA_UNIT||''))).map(u=>`<option value="${escapeHtml(u.UNIT_ID)}">${escapeHtml(u.NAMA_UNIT)}</option>`).join('');}
async function loadAttendanceSessionUI(){const unit=document.getElementById('att-unit')?.value,date=document.getElementById('att-date')?.value,yearEl=document.getElementById('att-year');let year=yearEl?.value||'';if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date)){const dateYear=date.slice(0,4);if(!year&&yearEl&&[...yearEl.options].some(o=>o.value===dateYear)){yearEl.value=dateYear;year=dateYear;}else if(!year){year=dateYear;}}if(!unit||!date||!year)return;try{const r=ckParse(await server('getAttendanceSession',getMuridSessionToken(),unit,year,date));CK_ATT=r.members||[];document.getElementById('att-week').value=(r.minggu!=null&&r.minggu!=='')?String(r.minggu):'';document.getElementById('att-meeting').value=r.noPerjumpaan||'';renderAttendanceList()}catch(e){showToast(e.message||'Gagal memuatkan sesi kehadiran','error')}}
function renderAttendanceList(){const box=document.getElementById('att-list');if(!box)return;setText('att-count',`${CK_ATT.length} ahli`);if(!CK_ATT.length){box.innerHTML='<div class="ck-empty"><i class="fa-solid fa-user-slash"></i><div>Tiada ahli ditempatkan dalam unit ini.</div></div>';return}box.innerHTML=CK_ATT.map((m,i)=>`<div class="ck-att-row"><div class="ck-person"><div class="ck-avatar">${escapeHtml(ckInitials(m.NAMA))}</div><div><div class="ck-name">${escapeHtml(m.NAMA||'-')}</div><div class="ck-meta">${escapeHtml(m.KELAS||'-')} · ${escapeHtml(m.NO_KP||'')}</div></div></div><div class="ck-status-group"><button class="ck-status ${String(m.STATUS||'HADIR').toUpperCase()==='HADIR'?'active-h':''}" onclick="setAttendanceStatus(${i},'HADIR')">✓ Hadir</button><button class="ck-status ${String(m.STATUS||'').toUpperCase()!=='HADIR'?'active-t':''}" onclick="setAttendanceStatus(${i},'TIDAK HADIR')">✕ Tidak</button></div></div>`).join('')}
function setAttendanceStatus(i,status){if(CK_ATT[i])CK_ATT[i].STATUS=status;renderAttendanceList()}function markAllAttendance(status){CK_ATT=(CK_ATT||[]).map(x=>Object.assign({},x,{STATUS:status}));renderAttendanceList()}
async function saveKehadiranPage(){const unit=document.getElementById('att-unit')?.value,date=document.getElementById('att-date')?.value,yearEl=document.getElementById('att-year'),week=document.getElementById('att-week')?.value,meeting=document.getElementById('att-meeting')?.value;let year=yearEl?.value||'';if(!year&&date)year=String(date).slice(0,4);if(yearEl&&year&&[...yearEl.options].some(o=>o.value===year))yearEl.value=year;if(!unit||!date||!year||!week){showToast('Sila pastikan Unit, Tarikh dan Minggu 1–15 telah dipilih. Tahun akan diambil daripada tarikh.','warning');return}if(!CK_ATT.length){showToast('Tiada ahli untuk disimpan.','warning');return}try{await server('saveAttendance',getMuridSessionToken(),{unitId:unit,tahun:year,tarikh:date,minggu:week,noPerjumpaan:meeting,members:CK_ATT});showToast('Kehadiran berjaya direkodkan.','success');await loadAttendanceSessionUI()}catch(e){showToast(e.message||'Gagal menyimpan kehadiran','error')}}

function renderAktivitiPage(){const c=document.getElementById('page-aktiviti');if(!c)return;c.innerHTML=`<div id="act-list-view"><div class="ck-module"><div class="ck-head"><div><div class="ck-kicker">Kokurikulum</div><h1 class="ck-title">Aktiviti & Acara</h1><p class="ck-sub">Daftar aktiviti, acara dan program kokurikulum.</p></div><div class="ck-actions"><button class="ck-btn" onclick="loadAktivitiPage()"><i class="fa-solid fa-rotate"></i> Segar</button><button class="ck-btn ck-btn-primary" onclick="openActivityForm()"><i class="fa-solid fa-calendar-plus"></i> Tambah Aktiviti</button></div></div><div class="ck-filter"><div class="ck-filter-grid"><div class="ck-field"><label>Carian</label><input id="act-search" placeholder="Nama aktiviti, tempat atau penganjur..." oninput="filterActivityTable()"></div><div class="ck-field"><label>Tahun</label><select id="act-year" onchange="loadAktivitiPage()"></select></div><div class="ck-field"><label>Peringkat</label><select id="act-level" onchange="filterActivityTable()"><option value="">Semua Peringkat</option><option>SEKOLAH</option><option>DAERAH</option><option>NEGERI</option><option>KEBANGSAAN</option></select></div><button class="ck-btn" onclick="resetActivityFilter()"><i class="fa-solid fa-rotate-left"></i> Reset</button></div></div><div class="ck-card"><div class="ck-toolbar"><div><div class="ck-toolbar-title">Senarai Aktiviti</div><div id="act-count" class="ck-count">Memuatkan...</div></div></div><div class="ck-table-wrap"><table class="ck-table"><thead><tr><th>Aktiviti</th><th>Tarikh</th><th>Tempat</th><th>Peringkat</th><th>Guru</th><th>Tindakan</th></tr></thead><tbody id="act-body"></tbody></table></div></div></div></div><div id="act-form-view" style="display:none"></div>`;loadAktivitiPage()}

async function loadAktivitiPage(){try{const [a,u,g]=await Promise.all([server('getActivities',getMuridSessionToken(),{}),server('getUnits',getMuridSessionToken(),{}),server('getGuru',getMuridSessionToken())]);CK_ACT=ckParse(a);CK_UNITS=ckParse(u);CK_GURU=ckParse(g);document.getElementById('act-year').innerHTML='<option value="">Semua Tahun</option>'+ckYearOptions(CK_ACT);filterActivityTable()}catch(e){showToast(e.message||'Gagal memuatkan aktiviti','error')}}
function filterActivityTable(){const q=(document.getElementById('act-search')?.value||'').toUpperCase(),y=document.getElementById('act-year')?.value||'',l=document.getElementById('act-level')?.value||'';let r=(CK_ACT||[]).filter(x=>(!y||String(new Date(x.TARIKH).getFullYear())===y)&&(!l||String(x.PERINGKAT||'').toUpperCase()===l)&&(!q||[x.NAMA_AKTIVITI,x.TEMPAT,x.NO_GURU,x.PERINGKAT].some(v=>String(v||'').toUpperCase().includes(q))));const b=document.getElementById('act-body');if(!b)return;setText('act-count',`${r.length} aktiviti`);b.innerHTML=r.length?r.map(x=>`<tr><td><button type="button" class="ck-link-btn" onclick='openActivityParticipants(${JSON.stringify(x.AKTIVITI_ID)})'>${escapeHtml(x.NAMA_AKTIVITI||'-')}</button><div class="ck-meta">${escapeHtml(x.OBJEKTIF||'')}</div></td><td>${ckDateMY(x.TARIKH)}<div class="ck-meta">${escapeHtml(x.HARI||'')} · ${escapeHtml(x.MASA||'')}</div></td><td>${escapeHtml(x.TEMPAT||'-')}</td><td><span class="ck-badge pending">${escapeHtml(x.PERINGKAT||'-')}</span></td><td>${escapeHtml(x.NO_GURU||'-')}</td><td><div class="ck-icon-actions"><button class="ck-icon" title="Peserta" onclick='openActivityParticipants(${JSON.stringify(x.AKTIVITI_ID)})'><i class="fa-solid fa-people-group"></i></button><button class="ck-icon" title="Jana Surat Kebenaran" onclick='openActivityPermissionLetter(${JSON.stringify(x.AKTIVITI_ID)})'><i class="fa-solid fa-file-signature"></i></button>${getMuridCurrentRole()==='ADMIN'?`<button class="ck-icon" title="Edit Template Surat" onclick='openPermissionLetterTemplateEditor(${JSON.stringify(x.AKTIVITI_ID)})'><i class="fa-solid fa-file-pen"></i></button>`:''}<button class="ck-icon" title="Edit" onclick='openActivityForm(${JSON.stringify(x.AKTIVITI_ID)})'><i class="fa-solid fa-pen"></i></button></div></td></tr>`).join(''):'<tr><td colspan="6"><div class="ck-empty"><i class="fa-solid fa-calendar-xmark"></i><div>Tiada aktiviti ditemui</div></div></td></tr>'}
function resetActivityFilter(){document.getElementById('act-search').value='';document.getElementById('act-year').value='';document.getElementById('act-level').value='';filterActivityTable()}
function openActivityForm(id){const r=(CK_ACT||[]).find(x=>String(x.AKTIVITI_ID)===String(id));const list=document.getElementById('act-list-view'),view=document.getElementById('act-form-view');if(!list||!view)return;view.innerHTML=`<div class="ck-module"><div class="ck-head"><div><div class="ck-kicker">Kokurikulum · Aktiviti & Acara</div><h1 class="ck-title">${r?'Kemaskini Aktiviti':'Tambah Aktiviti'}</h1><p class="ck-sub">Lengkapkan maklumat aktiviti dan simpan sebagai rekod kokurikulum.</p></div><div class="ck-actions"><button type="button" class="ck-btn" onclick="closeActivityForm()"><i class="fa-solid fa-arrow-left"></i> Kembali ke Aktiviti & Acara</button></div></div><div class="ck-card"><form id="act-form" onsubmit="submitActivityForm(event)"><div class="ck-dialog-body"><div class="ck-grid"><div class="ck-field full"><label>Nama Aktiviti *</label><input id="act-name" required></div><div class="ck-field"><label>Tarikh *</label><input id="act-date" type="date" required></div><div class="ck-field"><label>Masa</label><input id="act-time" type="time"></div><div class="ck-field"><label>Tempat</label><input id="act-place"></div><div class="ck-field"><label>Peringkat *</label><select id="act-level-form" required><option value="">Pilih</option><option>SEKOLAH</option><option>DAERAH</option><option>NEGERI</option><option>KEBANGSAAN</option></select></div><div class="ck-field"><label>Penganjur / Guru</label><select id="act-teacher"><option value="">Pilih guru</option>${((CK_GURU||[]).filter(x=>String(x.STATUS||'AKTIF').toUpperCase()==='AKTIF')).map(x=>`<option value="${escapeHtml(x.NO_GURU)}">${escapeHtml(x.NAMA)} · ${escapeHtml(x.NO_GURU)}</option>`).join('')}</select></div><div class="ck-field full"><label>Objektif</label><textarea id="act-objective"></textarea></div><div class="ck-field full"><label>Aktiviti</label><textarea id="act-detail"></textarea></div><div class="ck-field full"><label>Impak</label><textarea id="act-impact"></textarea></div></div></div><div class="ck-dialog-foot" style="justify-content:flex-end;gap:10px"><button type="button" class="ck-btn" onclick="closeActivityForm()"><i class="fa-solid fa-arrow-left"></i> Kembali</button><button class="ck-btn ck-btn-primary" id="act-save"><i class="fa-solid fa-floppy-disk"></i> Simpan Aktiviti</button></div></form></div></div>`;if(r){document.getElementById('act-name').value=r.NAMA_AKTIVITI||'';document.getElementById('act-date').value=ckEscapeDate(r.TARIKH);document.getElementById('act-time').value=r.MASA||'';document.getElementById('act-place').value=r.TEMPAT||'';document.getElementById('act-level-form').value=r.PERINGKAT||'';document.getElementById('act-teacher').value=r.NO_GURU||'';document.getElementById('act-objective').value=r.OBJEKTIF||'';document.getElementById('act-detail').value=r.AKTIVITI||'';document.getElementById('act-impact').value=r.IMPAK||''}view.dataset.id=id||'';list.style.display='none';view.style.display='block';window.scrollTo({top:0,behavior:'smooth'})}
function closeActivityForm(){const list=document.getElementById('act-list-view'),view=document.getElementById('act-form-view');if(view){view.style.display='none';view.innerHTML='';}if(list){list.style.display='block';}loadAktivitiPage()}
async function submitActivityForm(e){e.preventDefault();const btn=document.getElementById('act-save'),view=document.getElementById('act-form-view'),data={AKTIVITI_ID:view?.dataset.id||'',NAMA_AKTIVITI:document.getElementById('act-name').value.trim(),TARIKH:document.getElementById('act-date').value,MASA:document.getElementById('act-time').value,TEMPAT:document.getElementById('act-place').value.trim(),PERINGKAT:document.getElementById('act-level-form').value,NO_GURU:document.getElementById('act-teacher').value,OBJEKTIF:document.getElementById('act-objective').value.trim(),AKTIVITI:document.getElementById('act-detail').value.trim(),IMPAK:document.getElementById('act-impact').value.trim()};try{btn.disabled=true;await server('saveActivity',getMuridSessionToken(),data);showToast('Aktiviti berjaya disimpan.','success');closeActivityForm()}catch(e){showToast(e.message||'Gagal menyimpan aktiviti','error')}finally{btn.disabled=false}}

async function openActivityParticipants(id){
  const list=document.getElementById('act-list-view');
  const form=document.getElementById('act-form-view');
  if(!list||!form)return;
  list.style.display='none';
  form.style.display='block';
  form.innerHTML='<div class="ck-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan butiran aktiviti...</div></div>';
  window.scrollTo({top:0,behavior:'smooth'});
  try{
    const d=ckParse(await server('getActivityDetail',getMuridSessionToken(),id));
    const a=d.activity||{};
    const participants=d.participants||[];
    CK_PARTICIPANTS=participants.map(x=>({NO_KP:x.NO_KP,PERANAN:x.PERANAN||'PESERTA',STATUS:x.STATUS||'AKTIF'}));
    form.dataset.id=id;
    form.innerHTML=`<div class="ck-module">
      <div class="ck-head">
        <div><div class="ck-kicker">Kokurikulum · Aktiviti & Acara</div><h1 class="ck-title">${escapeHtml(a.NAMA_AKTIVITI||'Butiran Aktiviti')}</h1><p class="ck-sub">${escapeHtml(ckDateMY(a.TARIKH))} · ${escapeHtml(a.TEMPAT||'-')} · ${escapeHtml(a.PERINGKAT||'-')}</p></div>
        <div class="ck-actions"><button class="ck-btn" onclick="closeActivityDetail()"><i class="fa-solid fa-arrow-left"></i> Kembali ke Aktiviti</button><button class="ck-btn ck-btn-primary" id="activity-part-save" onclick="saveActivityParticipantsPage()"><i class="fa-solid fa-floppy-disk"></i> Simpan Peserta</button></div>
      </div>
      <div class="ck-card"><div class="ck-toolbar"><div><div class="ck-toolbar-title">Maklumat Aktiviti</div></div></div><div class="ck-grid"><div class="ck-field"><label>Tarikh</label><div class="ck-readonly">${escapeHtml(ckDateMY(a.TARIKH))}</div></div><div class="ck-field"><label>Masa</label><div class="ck-readonly">${escapeHtml(a.MASA||'-')}</div></div><div class="ck-field"><label>Tempat</label><div class="ck-readonly">${escapeHtml(a.TEMPAT||'-')}</div></div><div class="ck-field"><label>Peringkat</label><div class="ck-readonly">${escapeHtml(a.PERINGKAT||'-')}</div></div><div class="ck-field full"><label>Objektif</label><div class="ck-readonly ck-readonly-multi">${escapeHtml(a.OBJEKTIF||'-')}</div></div><div class="ck-field full"><label>Aktiviti</label><div class="ck-readonly ck-readonly-multi">${escapeHtml(a.AKTIVITI||'-')}</div></div><div class="ck-field full"><label>Impak</label><div class="ck-readonly ck-readonly-multi">${escapeHtml(a.IMPAK||'-')}</div></div></div></div>
      <div class="ck-card"><div class="ck-toolbar"><div><div class="ck-toolbar-title">Daftar Peserta</div><div id="act-part-count" class="ck-count"></div></div><div class="ck-actions"><button class="ck-btn" onclick="toggleActivityParticipants(true)">Pilih Semua</button><button class="ck-btn" onclick="toggleActivityParticipants(false)">Kosongkan</button></div></div>
        <div class="ck-grid"><div class="ck-field"><label>Kelas</label><select id="act-part-class" onchange="renderActivityParticipantList()"><option value="">Semua Kelas</option></select></div><div class="ck-field"><label>Carian Murid</label><input id="act-part-search" placeholder="Cari nama / NO KP" oninput="renderActivityParticipantList()"></div></div>
        <div id="act-part-list" class="ck-checklist"></div>
      </div>
    </div>`;
    const [m]=await Promise.all([server('getMurid',getMuridSessionToken(),{})]);
    CK_STUDENTS=ckParse(m);
    const cls=[...new Set((CK_STUDENTS||[]).map(x=>String(x.KELAS||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ms',{numeric:true,sensitivity:'base'}));
    const cs=document.getElementById('act-part-class');
    if(cs)cs.innerHTML='<option value="">Semua Kelas</option>'+cls.map(k=>`<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
    renderActivityParticipantList();
  }catch(e){form.innerHTML=`<div class="ck-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Gagal memuatkan aktiviti</div><small>${escapeHtml(e.message||String(e))}</small><br><button class="ck-btn" onclick="closeActivityDetail()">Kembali ke Aktiviti</button></div>`;}
}
function closeActivityDetail(){const list=document.getElementById('act-list-view'),form=document.getElementById('act-form-view');if(form){form.style.display='none';form.innerHTML='';delete form.dataset.id;}if(list){list.style.display='block';}loadAktivitiPage();window.scrollTo({top:0,behavior:'smooth'});}
function renderActivityParticipantList(){const box=document.getElementById('act-part-list');if(!box)return;const q=(document.getElementById('act-part-search')?.value||'').toUpperCase(),cls=(document.getElementById('act-part-class')?.value||'').toUpperCase(),chosen=new Map((CK_PARTICIPANTS||[]).map(x=>[String(x.NO_KP),x]));const rows=(CK_STUDENTS||[]).filter(x=>String(x.STATUS||'AKTIF').toUpperCase()!=='TIDAK AKTIF').filter(x=>!cls||String(x.KELAS||'').toUpperCase()===cls).filter(x=>!q||[x.NAMA,x.NO_KP].some(v=>String(v||'').toUpperCase().includes(q)));setText('act-part-count',`${rows.length} murid dipaparkan · ${chosen.size} dipilih`);box.innerHTML=rows.length?rows.map(x=>{const p=chosen.get(String(x.NO_KP)),role=p?.PERANAN||'PESERTA';return `<label class="ck-check"><input type="checkbox" ${p?'checked':''} onchange='toggleActivityParticipant(${JSON.stringify(x.NO_KP)},this.checked)'><div style="flex:1"><div class="ck-name">${escapeHtml(x.NAMA)}</div><div class="ck-meta">${escapeHtml(x.KELAS||'-')} · ${escapeHtml(x.NO_KP)}</div></div>${p?`<select onchange='setActivityParticipantRole(${JSON.stringify(x.NO_KP)},this.value)' style="width:140px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);padding:6px"><option ${role==='PESERTA'?'selected':''}>PESERTA</option><option ${role==='KETUA'?'selected':''}>KETUA</option><option ${role==='NAIB KETUA'?'selected':''}>NAIB KETUA</option><option ${role==='AHLI'?'selected':''}>AHLI</option></select>`:''}</label>`}).join(''):'<div class="ck-empty">Tiada murid ditemui.</div>'}
function toggleActivityParticipant(kp,on){const i=CK_PARTICIPANTS.findIndex(x=>String(x.NO_KP)===String(kp));if(on&&i<0)CK_PARTICIPANTS.push({NO_KP:kp,PERANAN:'PESERTA',STATUS:'AKTIF'});if(!on&&i>=0)CK_PARTICIPANTS.splice(i,1);renderActivityParticipantList()}
function setActivityParticipantRole(kp,role){const x=CK_PARTICIPANTS.find(p=>String(p.NO_KP)===String(kp));if(x)x.PERANAN=role}
function toggleActivityParticipants(on){const q=(document.getElementById('act-part-search')?.value||'').toUpperCase(),cls=(document.getElementById('act-part-class')?.value||'').toUpperCase();const rows=(CK_STUDENTS||[]).filter(x=>String(x.STATUS||'AKTIF').toUpperCase()!=='TIDAK AKTIF').filter(x=>!cls||String(x.KELAS||'').toUpperCase()===cls).filter(x=>!q||[x.NAMA,x.NO_KP].some(v=>String(v||'').toUpperCase().includes(q)));if(on)rows.forEach(x=>{if(!CK_PARTICIPANTS.some(p=>String(p.NO_KP)===String(x.NO_KP)))CK_PARTICIPANTS.push({NO_KP:x.NO_KP,PERANAN:'PESERTA',STATUS:'AKTIF'})});else CK_PARTICIPANTS=CK_PARTICIPANTS.filter(p=>!rows.some(x=>String(x.NO_KP)===String(p.NO_KP)));renderActivityParticipantList()}
async function saveActivityParticipantsPage(){const id=document.getElementById('act-form-view')?.dataset.id,btn=document.getElementById('activity-part-save');if(!id)return;try{if(btn)btn.disabled=true;await server('saveParticipants',getMuridSessionToken(),id,CK_PARTICIPANTS);showToast('Peserta berjaya disimpan.','success');const d=ckParse(await server('getActivityDetail',getMuridSessionToken(),id));CK_PARTICIPANTS=d.participants||[];renderActivityParticipantList()}catch(e){showToast(e.message||'Gagal menyimpan peserta','error')}finally{if(btn)btn.disabled=false}}

function renderPesertaPage(){const c=document.getElementById('page-peserta');if(!c)return;c.innerHTML=`<div class="ck-module"><div class="ck-head"><div><div class="ck-kicker">Kokurikulum</div><h1 class="ck-title">Peserta Aktiviti</h1><p class="ck-sub">Pilih peserta terus daripada Data Murid dan tetapkan peranan untuk setiap aktiviti.</p></div><button class="ck-btn ck-btn-primary" onclick="saveParticipantSession()"><i class="fa-solid fa-floppy-disk"></i> Simpan Peserta</button></div><div class="ck-card"><div class="ck-grid"><div class="ck-field"><label>Aktiviti *</label><select id="part-activity" onchange="loadParticipantSession()"></select></div><div class="ck-field"><label>Kelas</label><select id="part-class" onchange="renderParticipantChecklist()"><option value="">Semua Kelas</option></select></div><div class="ck-field"><label>Carian Murid</label><input id="part-search" placeholder="Cari nama / NO_KP" oninput="renderParticipantChecklist()"></div></div></div><div class="ck-card"><div class="ck-toolbar"><div><div class="ck-toolbar-title">Pilih Murid</div><div id="part-count" class="ck-count"></div></div><button class="ck-btn" onclick="toggleAllParticipants(true)">Pilih Semua</button><button class="ck-btn" onclick="toggleAllParticipants(false)">Kosongkan</button></div><div id="part-list" class="ck-checklist"></div></div></div>`;loadPesertaPage()}
async function loadPesertaPage(){try{const [a,m]=await Promise.all([server('getActivities',getMuridSessionToken(),{}),server('getMurid',getMuridSessionToken(),{})]);CK_ACT=ckParse(a);CK_STUDENTS=ckParse(m);const classSel=document.getElementById('part-class');if(classSel){const classes=[...new Set((CK_STUDENTS||[]).map(x=>String(x.KELAS||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ms',{numeric:true,sensitivity:'base'}));classSel.innerHTML='<option value="">Semua Kelas</option>'+classes.map(k=>`<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');}const s=document.getElementById('part-activity');s.innerHTML='<option value="">Pilih aktiviti</option>'+CK_ACT.map(a=>`<option value="${escapeHtml(a.AKTIVITI_ID)}">${escapeHtml(a.NAMA_AKTIVITI)} · ${ckDateMY(a.TARIKH)}</option>`).join('');renderParticipantChecklist()}catch(e){showToast(e.message||'Gagal memuatkan peserta','error')}}
async function loadParticipantSession(){const id=document.getElementById('part-activity')?.value;if(!id){CK_PARTICIPANTS=[];renderParticipantChecklist();return}try{const d=ckParse(await server('getActivityDetail',getMuridSessionToken(),id));CK_PARTICIPANTS=d.participants||[];renderParticipantChecklist()}catch(e){showToast(e.message||'Gagal memuatkan peserta','error')}}
function renderParticipantChecklist(){const box=document.getElementById('part-list');if(!box)return;const q=(document.getElementById('part-search')?.value||'').toUpperCase(),cls=(document.getElementById('part-class')?.value||'').toUpperCase(),chosen=new Set((CK_PARTICIPANTS||[]).map(x=>String(x.NO_KP)));const rows=(CK_STUDENTS||[]).filter(x=>String(x.STATUS||'AKTIF').toUpperCase()!=='TIDAK AKTIF').filter(x=>!cls||String(x.KELAS||'').toUpperCase()===cls).filter(x=>!q||[x.NAMA,x.NO_KP].some(v=>String(v||'').toUpperCase().includes(q)));setText('part-count',`${rows.length} murid dipaparkan · ${chosen.size} dipilih`);box.innerHTML=rows.length?rows.map(x=>{const yes=chosen.has(String(x.NO_KP));const role=(CK_PARTICIPANTS.find(p=>String(p.NO_KP)===String(x.NO_KP))||{}).PERANAN||'PESERTA';return `<label class="ck-check"><input type="checkbox" ${yes?'checked':''} onchange='toggleParticipant(${JSON.stringify(x.NO_KP)},this.checked)'><div style="flex:1"><div class="ck-name">${escapeHtml(x.NAMA)}</div><div class="ck-meta">${escapeHtml(x.KELAS||'-')} · ${escapeHtml(x.NO_KP)}</div></div>${yes?`<select onchange='setParticipantRole(${JSON.stringify(x.NO_KP)},this.value)' style="width:130px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);padding:6px"><option ${role==='PESERTA'?'selected':''}>PESERTA</option><option ${role==='KETUA'?'selected':''}>KETUA</option><option ${role==='NAIB KETUA'?'selected':''}>NAIB KETUA</option><option ${role==='AHLI'?'selected':''}>AHLI</option></select>`:''}</label>`}).join(''):'<div class="ck-empty">Tiada murid ditemui.</div>'}
function toggleParticipant(kp,on){const i=CK_PARTICIPANTS.findIndex(x=>String(x.NO_KP)===String(kp));if(on&&i<0)CK_PARTICIPANTS.push({NO_KP:kp,PERANAN:'PESERTA',STATUS:'AKTIF'});if(!on&&i>=0)CK_PARTICIPANTS.splice(i,1);renderParticipantChecklist()}function setParticipantRole(kp,role){const x=CK_PARTICIPANTS.find(p=>String(p.NO_KP)===String(kp));if(x)x.PERANAN=role}function toggleAllParticipants(on){const q=(document.getElementById('part-search')?.value||'').toUpperCase(),cls=(document.getElementById('part-class')?.value||'').toUpperCase();const rows=CK_STUDENTS.filter(x=>!cls||String(x.KELAS||'').toUpperCase()===cls).filter(x=>!q||[x.NAMA,x.NO_KP].some(v=>String(v||'').toUpperCase().includes(q)));if(on)rows.forEach(x=>{if(!CK_PARTICIPANTS.some(p=>String(p.NO_KP)===String(x.NO_KP)))CK_PARTICIPANTS.push({NO_KP:x.NO_KP,PERANAN:'PESERTA',STATUS:'AKTIF'})});else CK_PARTICIPANTS=CK_PARTICIPANTS.filter(p=>!rows.some(x=>String(x.NO_KP)===String(p.NO_KP)));renderParticipantChecklist()}
async function saveParticipantSession(){const id=document.getElementById('part-activity')?.value;if(!id){showToast('Sila pilih aktiviti.','warning');return}try{await server('saveParticipants',getMuridSessionToken(),id,CK_PARTICIPANTS);showToast('Peserta berjaya disimpan.','success');await loadParticipantSession()}catch(e){showToast(e.message||'Gagal menyimpan peserta','error')}}

function renderPencapaianPage(){
  const c=document.getElementById('page-pencapaian'); if(!c)return;
  c.innerHTML=`
  <div id="pencapaian-list-view" class="ck-module">
    <div class="ck-head">
      <div><div class="ck-kicker">Kokurikulum</div><h1 class="ck-title">Pencapaian</h1><p class="ck-sub">Senarai aktiviti yang telah didaftarkan. Pilih aktiviti untuk merekod pencapaian peserta yang telah didaftarkan.</p></div>
      <div class="ck-actions">
        <button class="ck-btn" onclick="loadPencapaianPage()"><i class="fa-solid fa-rotate"></i> Segar</button>
      </div>
    </div>
    <div class="ck-filter"><div class="ck-filter-grid">
      <div class="ck-field"><label>Carian Aktiviti</label><input id="ach-search" type="search" placeholder="Nama aktiviti / tempat / peserta..." oninput="filterAchievementTable()"></div>
      <div class="ck-field"><label>Tahun</label><select id="ach-year" onchange="filterAchievementTable()"><option value="">Semua Tahun</option></select></div>
      <div class="ck-field"><label>Peringkat</label><select id="ach-level" onchange="filterAchievementTable()"><option value="">Semua</option><option>SEKOLAH</option><option>DAERAH</option><option>NEGERI</option><option>KEBANGSAAN</option></select></div>
      <button class="ck-btn" onclick="resetAchievementFilter()">Reset</button>
    </div></div>
    <div class="ck-card">
      <div class="ck-toolbar"><div><div class="ck-toolbar-title">Aktiviti Berdaftar</div><div id="ach-count" class="ck-count">Memuatkan...</div></div></div>
      <div id="ach-activity-list" class="ach-activity-list"></div>
    </div>
  </div>

  <div id="pencapaian-form-view" class="ck-module" style="display:none">
    <div class="ck-head">
      <div><div class="ck-kicker">Kokurikulum · Pencapaian</div><h1 id="ach-page-title" class="ck-title">Tambah Pencapaian</h1><p class="ck-sub">Isi rekod pencapaian murid. Borang ini dibuka sebagai halaman berasingan supaya pengisian lebih jelas.</p></div>
      <button type="button" class="ck-btn" onclick="closeAchievementForm()"><i class="fa-solid fa-arrow-left"></i> Kembali</button>
    </div>

    <div class="ck-card">
      <div class="ck-toolbar"><div><div class="ck-toolbar-title">Maklumat Pencapaian</div><div class="ck-count">Medan berkaitan PAJSK disusun mengikut rekod pertandingan.</div></div></div>
      <form id="ach-form" onsubmit="submitAchievementForm(event)">
        <div class="ck-dialog-body" style="padding:0">
          <div class="ck-grid">
            <div class="ck-field full"><label>Aktiviti / Acara</label><select id="ach-activity" onchange="loadAchievementActivityParticipants()"><option value="">Pilih aktiviti / acara</option></select></div>
            <div class="ck-field"><label>Tahun *</label><input id="ach-year-form" type="number" min="2000" max="2100" required></div>
            <div class="ck-field"><label>Acara / Pencapaian *</label><input id="ach-name" required placeholder="Contoh: 100 Meter Lelaki"></div>
            <div class="ck-field"><label>Peringkat</label><select id="ach-level-form"><option value="">Pilih peringkat</option><option>SEKOLAH</option><option>DAERAH</option><option>NEGERI</option><option>KEBANGSAAN</option></select></div>
            <div class="ck-field">
              <label>Kedudukan *</label>
              <select id="ach-rank" required onchange="updateAchievementRankInfo()">
                <option value="">Pilih kedudukan</option>
                <option value="JOHAN">Johan</option>
                <option value="NAIB JOHAN">Naib Johan</option>
                <option value="KETIGA">Ketiga</option>
                <option value="KEEMPAT">Keempat</option>
                <option value="KELIMA">Kelima</option>
                <option value="PESERTA SAHAJA">Peserta sahaja</option>
              </select>
              <div id="ach-rank-info" class="ach-rank-note">Pilih kedudukan murid.</div>
            </div>
            <div class="ck-field"><label>Kategori Penyertaan *</label><select id="ach-unit" required><option value="">Pilih kategori</option><option value="Kelab/Persatuan">Kelab / Persatuan</option><option value="Sukan/Permainan">Sukan / Permainan</option><option value="Pasukan Badan Beruniform">Pasukan Badan Beruniform</option></select><div class="ach-rank-note" style="margin-top:8px"><i class="fa-solid fa-circle-info"></i> Pilih <strong>kategori sahaja</strong>. Sistem akan menggunakan unit murid dalam kategori tersebut. Contoh: Ali berada dalam <strong>Softball</strong>, tetapi menyertai acara <strong>Hoki</strong>; pilih <strong>Sukan / Permainan</strong> dan pencapaian Ali akan direkod di bawah unit Softball miliknya.</div></div>
            <div class="ck-field"><label>Tarikh</label><input id="ach-date" type="date"></div>

            <div class="ck-field full">
              <label>Rujukan Kedudukan PAJSK</label>
              <div class="ach-rank-reference">
                <div class="ach-rank-list">
                  <div><span>1</span><strong>Johan</strong></div>
                  <div><span>2</span><strong>Naib Johan</strong></div>
                  <div><span>3</span><strong>Ketiga</strong></div>
                  <div><span>4</span><strong>Keempat</strong></div>
                  <div><span>5</span><strong>Kelima</strong></div>
                  <div class="participant"><span><i class="fa-solid fa-user"></i></span><strong>Peserta sahaja</strong><small>Rekod penyertaan; jangan dikira sebagai kedudukan pencapaian 1–5.</small></div>
                </div>
              </div>
            </div>

            <div class="ck-field full"><label>Peserta / Murid Berdaftar</label>
              <div class="ach-participant-panel">
                <div class="ach-participant-toolbar">
                  <div><div id="ach-part-count" class="ach-participant-count">0 peserta berdaftar</div><div class="ach-participant-help">Senarai ini diambil terus daripada peserta yang telah didaftarkan dalam Aktiviti &amp; Acara.</div></div>
                  <div class="ach-participant-tools"><input id="ach-part-search" type="search" placeholder="Cari nama / No. KP..." oninput="renderAchievementParticipantList()"><select id="ach-part-class" onchange="renderAchievementParticipantList()"><option value="">Semua Kelas</option></select></div>
                </div>
                <div id="ach-participant-list" class="ach-participant-list"><div class="ck-empty" style="padding:25px">Pilih aktiviti / acara dahulu.</div></div>
              </div>
            </div>            <div class="ck-field full"><label>Catatan</label><textarea id="ach-note" rows="3" placeholder="Catatan tambahan..."></textarea></div>
          </div>
        </div>
        <div class="ck-dialog-foot" style="padding-left:0;padding-right:0"><button type="button" class="ck-btn" onclick="closeAchievementForm()"><i class="fa-solid fa-arrow-left"></i> Kembali</button><button type="submit" class="ck-btn ck-btn-primary" id="ach-save"><i class="fa-solid fa-floppy-disk"></i> Simpan Pencapaian</button></div>
      </form>
    </div>
  </div>`;
  loadPencapaianPage();
}

async function loadPencapaianPage(){
  try{
    const token=getMuridSessionToken();
    const [acts,m,u]=await Promise.all([server('getAchievementActivityList',token,{}),server('getMurid',token,{}),server('getUnits',token,{})]);
    CK_ACT=ckParse(acts)||[]; CK_STUDENTS=ckParse(m)||[]; CK_UNITS=ckParse(u)||[];
    const ys=document.getElementById('ach-year');
    const years=[...new Set(CK_ACT.map(x=>String(x.TAHUN||'')).filter(Boolean))].sort((a,b)=>Number(b)-Number(a));
    if(ys)ys.innerHTML='<option value="">Semua Tahun</option>'+years.map(y=>`<option value="${escapeHtml(y)}">${escapeHtml(y)}</option>`).join('');
    const us=document.getElementById('ach-unit');if(us)us.innerHTML='<option value="">Pilih kategori</option><option value="Kelab/Persatuan">Kelab / Persatuan</option><option value="Sukan/Permainan">Sukan / Permainan</option><option value="Pasukan Badan Beruniform">Pasukan Badan Beruniform</option>';
    filterAchievementTable();
  }catch(e){console.error(e);showToast(e.message||'Gagal memuatkan senarai aktiviti pencapaian.','error')}
}

function filterAchievementTable(){
  const q=(document.getElementById('ach-search')?.value||'').toUpperCase().trim();
  const y=document.getElementById('ach-year')?.value||'';
  const l=document.getElementById('ach-level')?.value||'';
  let rows=(CK_ACT||[]).filter(x=>
    (!y||String(x.TAHUN)===String(y)) &&
    (!l||String(x.PERINGKAT||'').toUpperCase()===String(l).toUpperCase())
  );
  if(q)rows=rows.filter(x=>[x.NAMA_AKTIVITI,x.TEMPAT,x.PERINGKAT,x.TAHUN,x.PESERTA_NAMA_TEXT].some(v=>String(v||'').toUpperCase().includes(q)));
  const b=document.getElementById('ach-activity-list');if(!b)return;
  setText('ach-count',`${rows.length} aktiviti berdaftar`);
  b.innerHTML=rows.length?`<div class="ach-list-table-wrap"><div class="ach-grid-list ach-like-activity-table">
    <div class="ach-grid-row ach-grid-head">
      <div>AKTIVITI</div><div>TARIKH</div><div>TEMPAT</div><div>PERINGKAT</div><div>PESERTA</div><div>REKOD</div><div>STATUS</div><div>TINDAKAN</div>
    </div>
    ${rows.map(x=>{
      const recorded=Number(x.JUMLAH_REKOD_PENCAPAIAN||0), peserta=Number(x.JUMLAH_PESERTA||0);
      const status=recorded>0?'TELAH DIREKOD':'BELUM DIREKOD';
      const statusCls=recorded>0?'done':'pending';
      const activityId=JSON.stringify(x.AKTIVITI_ID);
      return `<div class="ach-grid-row ach-grid-data">
        <div class="ach-main-name"><strong title="${escapeHtml(x.NAMA_AKTIVITI||'-')}">${escapeHtml(x.NAMA_AKTIVITI||'-')}</strong></div>
        <div class="ach-nowrap">${escapeHtml(ckDateMY(x.TARIKH)||'-')}</div>
        <div class="ach-place" title="${escapeHtml(x.TEMPAT||'-')}">${escapeHtml(x.TEMPAT||'-')}</div>
        <div><span class="ach-activity-level">${escapeHtml(x.PERINGKAT||'-')}</span></div>
        <div class="ach-number">${peserta}</div>
        <div class="ach-number">${recorded}</div>
        <div><span class="ach-status ${statusCls}">${status}</span></div>
        <div class="ach-activity-action-cell"><button type="button" class="ck-btn ck-btn-primary" onclick='openAchievementForm(${activityId})'><i class="fa-solid fa-pen-to-square"></i> Rekod</button></div>
      </div>`;
    }).join('')}
    </div>`:'<div class="ach-empty-row"><i class="fa-solid fa-inbox"></i><div>Tiada aktiviti berdaftar ditemui.</div><small>Daftarkan aktiviti terlebih dahulu di menu Aktiviti &amp; Acara.</small></div>';
}
function resetAchievementFilter(){const q=document.getElementById('ach-search'),y=document.getElementById('ach-year'),l=document.getElementById('ach-level');if(q)q.value='';if(y)y.value='';if(l)l.value='';filterAchievementTable()}

function populateAchievementClasses(){
  const s=document.getElementById('ach-part-class');if(!s)return;const old=s.value||'';
  const classes=[...new Set((CK_STUDENTS||[]).filter(x=>String(x.STATUS||'AKTIF').toUpperCase()!=='TIDAK AKTIF').map(x=>String(x.KELAS||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ms',{numeric:true}));
  s.innerHTML='<option value="">Semua Kelas</option>'+classes.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');if(classes.includes(old))s.value=old;
}

async function openAchievementForm(activityId){
  const list=document.getElementById('pencapaian-list-view'),form=document.getElementById('pencapaian-form-view');if(!list||!form)return;
  let activity=null;
  const ach=(CK_ACH||[]).find(x=>String(x.PENCAPAIAN_ID)===String(activityId||''));
  if(ach)activity=(CK_ACT||[]).find(x=>String(x.AKTIVITI_ID)===String(ach.AKTIVITI_ID))||null;
  else activity=(CK_ACT||[]).find(x=>String(x.AKTIVITI_ID)===String(activityId||''))||null;
  setText('ach-page-title',ach?'Kemaskini Pencapaian':'Rekod Pencapaian Aktiviti');
  const act=document.getElementById('ach-activity');if(act)act.innerHTML='<option value="">Pilih aktiviti / acara</option>'+(CK_ACT||[]).map(x=>`<option value="${escapeHtml(x.AKTIVITI_ID)}">${escapeHtml(x.NAMA_AKTIVITI||x.AKTIVITI_ID)}</option>`).join('');
  const unit=document.getElementById('ach-unit');if(unit)unit.innerHTML='<option value="">Pilih kategori</option><option value="Kelab/Persatuan">Kelab / Persatuan</option><option value="Sukan/Permainan">Sukan / Permainan</option><option value="Pasukan Badan Beruniform">Pasukan Badan Beruniform</option>';
  document.getElementById('ach-year-form').value=new Date().getFullYear();document.getElementById('ach-name').value='';document.getElementById('ach-level-form').value='';document.getElementById('ach-rank').value='';document.getElementById('ach-date').value=new Date().toISOString().slice(0,10);document.getElementById('ach-note').value='';form.dataset.id=ach?ach.PENCAPAIAN_ID:'';
  window.CK_ACH_PARTICIPANTS=[];
  window.CK_ACH_REGISTERED_PARTICIPANTS=[];
  if(ach){
    if(act)act.value=ach.AKTIVITI_ID||'';document.getElementById('ach-year-form').value=ach.TAHUN||'';document.getElementById('ach-name').value=ach.PENCAPAIAN||'';document.getElementById('ach-level-form').value=ach.PERINGKAT||'';document.getElementById('ach-rank').value=ach.KEDUDUKAN||'';if(unit){const achUnit=(CK_UNITS||[]).find(u=>String(u.UNIT_ID)===String(ach.UNIT_ID));const rawCat=String(achUnit&&achUnit.KATEGORI||'').trim().toUpperCase();const cat=rawCat.includes('SUKAN')?'Sukan/Permainan':rawCat.includes('BERUNIFORM')||rawCat.includes('BADAN BERUNIFORM')?'Pasukan Badan Beruniform':rawCat.includes('KELAB')||rawCat.includes('PERSATUAN')?'Kelab/Persatuan':'';unit.value=cat;}document.getElementById('ach-date').value=ckEscapeDate(ach.TARIKH);document.getElementById('ach-note').value=ach.CATATAN||'';
    window.CK_ACH_PARTICIPANTS=[{NO_KP:ach.NO_KP,PERANAN:'PESERTA',STATUS:'AKTIF'}];
    try{
      const detail=ckParse(await server('getActivityDetail',getMuridSessionToken(),ach.AKTIVITI_ID))||{};
      const all=Array.isArray(detail.participants)?detail.participants:[];
      window.CK_ACH_REGISTERED_PARTICIPANTS=all.map(x=>({NO_KP:String(x.NO_KP||''),PERANAN:x.PERANAN||'PESERTA',STATUS:x.STATUS||'AKTIF'})).filter(x=>x.NO_KP);
    }catch(e){window.CK_ACH_REGISTERED_PARTICIPANTS=[{NO_KP:String(ach.NO_KP),PERANAN:'PESERTA',STATUS:'AKTIF'}];}
  }else if(activity){
    if(act)act.value=activity.AKTIVITI_ID||'';
    if(activity.TARIKH){document.getElementById('ach-date').value=ckEscapeDate(activity.TARIKH);const d=new Date(activity.TARIKH);if(!isNaN(d))document.getElementById('ach-year-form').value=d.getFullYear();}
    if(activity.PERINGKAT)document.getElementById('ach-level-form').value=activity.PERINGKAT||'';
    await loadAchievementActivityParticipants();
  }
  document.getElementById('ach-part-search').value='';populateAchievementClasses();document.getElementById('ach-part-class').value='';
  if(!activity&&!ach)renderAchievementParticipantList();else if(ach)renderAchievementParticipantList();
  updateAchievementRankInfo();list.style.display='none';form.style.display='block';window.scrollTo({top:0,behavior:'smooth'});
}

function closeAchievementForm(){
  const list=document.getElementById('pencapaian-list-view'),form=document.getElementById('pencapaian-form-view');
  if(form){form.style.display='none';delete form.dataset.id;}
  if(list){list.style.display='block';}
  window.CK_ACH_PARTICIPANTS=[];window.CK_ACH_REGISTERED_PARTICIPANTS=[];window.scrollTo({top:0,behavior:'smooth'});
  if(typeof loadPencapaianPage==='function')loadPencapaianPage();
}
function updateAchievementRankInfo(){
  const v=document.getElementById('ach-rank')?.value||'',box=document.getElementById('ach-rank-info');if(!box)return;
  if(v==='PESERTA SAHAJA')box.innerHTML='<i class="fa-solid fa-circle-info"></i> Peserta sahaja direkodkan sebagai penyertaan dan bukan kedudukan pencapaian Johan hingga Kelima.';
  else if(v)box.innerHTML='<i class="fa-solid fa-trophy"></i> Kedudukan ini termasuk dalam senarai kedudukan pencapaian PAJSK 1 hingga 5.';
  else box.textContent='Pilih kedudukan murid.';
}

async function loadAchievementActivityParticipants(){
  const id=document.getElementById('ach-activity')?.value||'';
  if(!id){
    window.CK_ACH_PARTICIPANTS=[];
    window.CK_ACH_REGISTERED_PARTICIPANTS=[];
    renderAchievementParticipantList();
    return;
  }
  try{
    const detail=ckParse(await server('getActivityDetail',getMuridSessionToken(),id))||{};
    const all=Array.isArray(detail.participants)?detail.participants:[];
    window.CK_ACH_REGISTERED_PARTICIPANTS=all.map(x=>({
      NO_KP:String(x.NO_KP||''),
      PERANAN:x.PERANAN||'PESERTA',
      STATUS:x.STATUS||'AKTIF'
    })).filter(x=>x.NO_KP);
    window.CK_ACH_PARTICIPANTS=window.CK_ACH_REGISTERED_PARTICIPANTS.map(x=>({...x}));
    const activity=(CK_ACT||[]).find(x=>String(x.AKTIVITI_ID)===String(id));
    if(activity){
      if(activity.TARIKH)document.getElementById('ach-date').value=ckEscapeDate(activity.TARIKH);
      if(activity.TARIKH){const d=new Date(activity.TARIKH);if(!isNaN(d))document.getElementById('ach-year-form').value=d.getFullYear();}
      if(!document.getElementById('ach-level-form').value&&activity.PERINGKAT)document.getElementById('ach-level-form').value=activity.PERINGKAT;
    }
    renderAchievementParticipantList();
  }catch(e){showToast(e.message||'Gagal memuatkan peserta aktiviti.','error')}
}

function renderAchievementParticipantList(){
  const box=document.getElementById('ach-participant-list');
  if(!box)return;
  const q=(document.getElementById('ach-part-search')?.value||'').toUpperCase().trim();
  const cls=document.getElementById('ach-part-class')?.value||'';
  const selected=new Set((window.CK_ACH_PARTICIPANTS||[]).map(x=>String(x.NO_KP)));
  const registered=Array.isArray(window.CK_ACH_REGISTERED_PARTICIPANTS)
    ? window.CK_ACH_REGISTERED_PARTICIPANTS
    : [];
  let rows=(CK_STUDENTS||[]).filter(x=>registered.some(p=>String(p.NO_KP)===String(x.NO_KP)));
  if(cls)rows=rows.filter(x=>String(x.KELAS||'')===String(cls));
  if(q)rows=rows.filter(x=>[x.NAMA,x.NO_KP,x.KELAS].some(v=>String(v||'').toUpperCase().includes(q)));
  rows.sort((a,b)=>{
    const sa=selected.has(String(a.NO_KP))?0:1;
    const sb=selected.has(String(b.NO_KP))?0:1;
    if(sa!==sb)return sa-sb;
    return String(a.NAMA||'').localeCompare(String(b.NAMA||''),'ms');
  });
  setText('ach-part-count',`${registered.length} peserta berdaftar · ${selected.size} dipilih`);
  if(!registered.length){
    box.innerHTML='<div class="ck-empty" style="padding:28px"><i class="fa-solid fa-users"></i><div>Tiada peserta berdaftar untuk aktiviti ini.</div><small>Daftarkan peserta dahulu di menu Peserta Aktiviti.</small></div>';
    return;
  }
  if(!rows.length){
    box.innerHTML='<div class="ck-empty" style="padding:28px"><i class="fa-solid fa-magnifying-glass"></i><div>Tiada peserta sepadan dengan carian.</div></div>';
    return;
  }
  const selectedRows=rows.filter(x=>selected.has(String(x.NO_KP)));
  const unselectedRows=rows.filter(x=>!selected.has(String(x.NO_KP)));
  const rowHtml=(x,i)=>{
    const kp=String(x.NO_KP),checked=selected.has(kp);
    return `<label class="ach-participant-row ${checked?'is-selected':'is-unselected'}">
      <span class="ach-participant-no">${i+1}</span>
      <input type="checkbox" ${checked?'checked':''} onchange='setAchievementParticipant(${JSON.stringify(kp)},this.checked)'>
      <span class="ach-participant-text">
        <strong>${escapeHtml(x.NAMA||'-')}</strong>
        <small>${escapeHtml(x.KELAS||'-')} · ${escapeHtml(x.NO_KP||'')}</small>
      </span>
      <span class="ach-participant-role">${checked?'DIPILIH':'BELUM DIPILIH'}</span>
    </label>`;
  };
  let html=selectedRows.map((x,i)=>rowHtml(x,i)).join('');
  if(unselectedRows.length){
    html+=`<div class="ach-unselected-label">Belum dipilih · boleh dipilih semula jika murid menyertai acara</div>`;
    html+=unselectedRows.map((x,i)=>rowHtml(x,selectedRows.length+i)).join('');
  }
  box.innerHTML=html;
}

function setAchievementParticipant(kp,on){
  if(!window.CK_ACH_PARTICIPANTS)window.CK_ACH_PARTICIPANTS=[];
  kp=String(kp||'');
  const i=window.CK_ACH_PARTICIPANTS.findIndex(x=>String(x.NO_KP)===kp);
  if(on&&i<0)window.CK_ACH_PARTICIPANTS.push({NO_KP:kp,PERANAN:'PESERTA',STATUS:'AKTIF'});
  if(!on&&i>=0)window.CK_ACH_PARTICIPANTS.splice(i,1);
  renderAchievementParticipantList();
}
function toggleAchievementParticipants(on){
  renderAchievementParticipantList();
}

async function submitAchievementForm(e){
  e.preventDefault();const btn=document.getElementById('ach-save'),form=document.getElementById('pencapaian-form-view'),editingId=form?.dataset?.id||'',participants=window.CK_ACH_PARTICIPANTS||[];if(!participants.length){showToast('Sila pilih sekurang-kurangnya seorang murid.','warning');return;}
  const data={PENCAPAIAN_ID:editingId,AKTIVITI_ID:document.getElementById('ach-activity')?.value||'',UNIT_ID:document.getElementById('ach-unit')?.value||'',TAHUN:document.getElementById('ach-year-form')?.value||'',PENCAPAIAN:document.getElementById('ach-name')?.value.trim()||'',PERINGKAT:document.getElementById('ach-level-form')?.value||'',KEDUDUKAN:document.getElementById('ach-rank')?.value||'',TARIKH:document.getElementById('ach-date')?.value||'',CATATAN:document.getElementById('ach-note')?.value.trim()||'',NO_KP_LIST:participants.map(x=>String(x.NO_KP))};
  if(!data.TAHUN){showToast('Tahun wajib diisi.','warning');return}if(!data.PENCAPAIAN){showToast('Acara / Pencapaian wajib diisi.','warning');return}if(!data.KEDUDUKAN){showToast('Sila pilih kedudukan.','warning');return}if(!data.UNIT_ID){showToast('Sila pilih kategori penyertaan. Sistem akan menentukan unit murid mengikut penempatan kategori tersebut.','warning');return}
  try{if(btn){btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';}const result=ckParse(await server('saveActivityAchievementBulk',getMuridSessionToken(),data))||{};showToast(`Pencapaian berjaya disimpan untuk ${result.jumlahDiproses||participants.length} murid.`,'success');closeAchievementForm();}catch(e){console.error(e);showToast(e.message||'Gagal menyimpan pencapaian.','error')}finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Simpan Pencapaian'}}
}

function renderAjkPage(){const c=document.getElementById('page-ajk');if(!c)return;c.innerHTML=`<div class="ck-module"><div class="ck-head"><div><div class="ck-kicker">Kokurikulum</div><h1 class="ck-title">AJK Unit</h1><p class="ck-sub">Tetapkan jawatan AJK bagi ahli unit mengikut tahun.</p></div><button class="ck-btn ck-btn-primary" onclick="openAjkForm()"><i class="fa-solid fa-user-shield"></i> Tambah AJK</button></div><div class="ck-filter"><div class="ck-filter-grid"><div class="ck-field"><label>Unit</label><select id="ajk-unit" onchange="loadAjkPage()"></select></div><div class="ck-field"><label>Tahun</label><select id="ajk-year" onchange="loadAjkPage()"></select></div><div class="ck-field"><label>Carian</label><input id="ajk-search" placeholder="Nama / jawatan..." oninput="filterAjkTable()"></div><button class="ck-btn" onclick="resetAjkFilter()">Reset</button></div></div><div class="ck-card"><div class="ck-toolbar"><div><div class="ck-toolbar-title">Senarai AJK</div><div id="ajk-count" class="ck-count"></div></div></div><div class="ck-table-wrap"><table class="ck-table"><thead><tr><th>Murid</th><th>Unit</th><th>Jawatan</th><th>Tahun</th><th>Status</th><th>Tindakan</th></tr></thead><tbody id="ajk-body"></tbody></table></div></div></div><div id="ajk-modal" class="ck-modal" onclick="if(event.target===this)closeAjkForm()"><div class="ck-dialog"><div class="ck-dialog-head"><div class="ck-dialog-title">Tambah / Kemaskini AJK</div><button class="ck-close" onclick="closeAjkForm()">×</button></div><form id="ajk-form" onsubmit="submitAjkForm(event)"><div class="ck-dialog-body"><div class="ck-grid"><div class="ck-field full"><label>Murid *</label><select id="ajk-student" required></select></div><div class="ck-field"><label>Unit *</label><select id="ajk-unit-form" required></select></div><div class="ck-field"><label>Tahun *</label><input id="ajk-year-form" type="number" required></div><div class="ck-field"><label>Jawatan *</label><select id="ajk-role" required><option value="">Pilih jawatan</option><option>PENGERUSI</option><option>NAIB PENGERUSI</option><option>SETIAUSAHA</option><option>PENOLONG SETIAUSAHA</option><option>BENDAHARI</option><option>AHLI JAWATANKUASA</option></select></div><div class="ck-field"><label>Status</label><select id="ajk-status"><option>AKTIF</option><option>TIDAK AKTIF</option></select></div></div></div><div class="ck-dialog-foot"><button type="button" class="ck-btn" onclick="closeAjkForm()">Batal</button><button class="ck-btn ck-btn-primary" id="ajk-save">Simpan AJK</button></div></form></div></div>`;loadAjkPage()}
async function loadAjkPage(){try{const [u,m]=await Promise.all([server('getUnits',getMuridSessionToken(),{}),server('getMurid',getMuridSessionToken(),{})]);CK_UNITS=ckParse(u);CK_STUDENTS=ckParse(m);const us=document.getElementById('ajk-unit');us.innerHTML='<option value="">Semua Unit</option>'+ckUnitOptions();const ys=document.getElementById('ajk-year');ys.innerHTML=ckYearOptions(CK_STUDENTS);if(!ys.value)ys.value=String(new Date().getFullYear());const data=ckParse(await server('getAJK',getMuridSessionToken(),{}));CK_AJK=data;filterAjkTable()}catch(e){showToast(e.message||'Gagal memuatkan AJK','error')}}
function filterAjkTable(){const q=(document.getElementById('ajk-search')?.value||'').toUpperCase(),u=document.getElementById('ajk-unit')?.value||'',y=document.getElementById('ajk-year')?.value||'';let r=(CK_AJK||[]).filter(x=>(!u||String(x.UNIT_ID)===u)&&(!y||String(x.TAHUN)===y)).map(x=>{const m=CK_STUDENTS.find(s=>String(s.NO_KP)===String(x.NO_KP))||{},un=CK_UNITS.find(z=>String(z.UNIT_ID)===String(x.UNIT_ID))||{};return Object.assign({},x,{_nama:m.NAMA||x.NO_KP,_kelas:m.KELAS||'',_unit:un.NAMA_UNIT||x.UNIT_ID})}).filter(x=>!q||[x._nama,x.JAWATAN,x._unit].some(v=>String(v||'').toUpperCase().includes(q)));const b=document.getElementById('ajk-body');setText('ajk-count',`${r.length} AJK`);b.innerHTML=r.length?r.map(x=>`<tr><td><div class="ck-person"><div class="ck-avatar">${escapeHtml(ckInitials(x._nama))}</div><div><div class="ck-name">${escapeHtml(x._nama)}</div><div class="ck-meta">${escapeHtml(x._kelas)}</div></div></div></td><td>${escapeHtml(x._unit)}</td><td><span class="ck-badge pending">${escapeHtml(x.JAWATAN)}</span></td><td>${escapeHtml(x.TAHUN)}</td><td><span class="ck-badge ${String(x.STATUS||'AKTIF').toUpperCase()==='AKTIF'?'active':'inactive'}">${escapeHtml(x.STATUS||'AKTIF')}</span></td><td><button class="ck-icon" onclick='openAjkForm(${JSON.stringify(x.AJK_ID)})'><i class="fa-solid fa-pen"></i></button></td></tr>`).join(''):'<tr><td colspan="6"><div class="ck-empty">Tiada AJK ditemui.</div></td></tr>'}
function resetAjkFilter(){document.getElementById('ajk-search').value='';document.getElementById('ajk-unit').value='';document.getElementById('ajk-year').value=String(new Date().getFullYear());filterAjkTable()}
function openAjkForm(id){const r=(CK_AJK||[]).find(x=>String(x.AJK_ID)===String(id));document.getElementById('ajk-student').innerHTML='<option value="">Pilih murid</option>'+ckStudentOptions();document.getElementById('ajk-unit-form').innerHTML='<option value="">Pilih unit</option>'+ckUnitOptions();document.getElementById('ajk-year-form').value=new Date().getFullYear();document.getElementById('ajk-role').value='';document.getElementById('ajk-status').value='AKTIF';document.getElementById('ajk-modal').dataset.id=id||'';if(r){document.getElementById('ajk-student').value=r.NO_KP;document.getElementById('ajk-unit-form').value=r.UNIT_ID;document.getElementById('ajk-year-form').value=r.TAHUN;document.getElementById('ajk-role').value=r.JAWATAN;document.getElementById('ajk-status').value=r.STATUS||'AKTIF'}document.getElementById('ajk-modal').classList.add('open')}
function closeAjkForm(){document.getElementById('ajk-modal')?.classList.remove('open')}async function submitAjkForm(e){e.preventDefault();const data={AJK_ID:document.getElementById('ajk-modal').dataset.id||'',NO_KP:document.getElementById('ajk-student').value,UNIT_ID:document.getElementById('ajk-unit-form').value,TAHUN:document.getElementById('ajk-year-form').value,JAWATAN:document.getElementById('ajk-role').value,STATUS:document.getElementById('ajk-status').value};try{await server('saveAJK',getMuridSessionToken(),data);closeAjkForm();showToast('AJK berjaya disimpan.','success');loadAjkPage()}catch(e){showToast(e.message||'Gagal menyimpan AJK','error')}}



/* =========================================================
   ANALISIS MASTER MODULE
========================================================= */
let ANX_CACHE={};
let ANX_CHARTS={};
let ANX_PROFILE={};
function anxJson(v){try{return typeof v==='string'?JSON.parse(v||'{}'):v||{}}catch(e){return {}}}
function anxToken(){return typeof getMuridSessionToken==='function'?getMuridSessionToken():((typeof EK!=='undefined'&&EK&&EK.token)||'')}
function anxYear(){return String(new Date().getFullYear())}
function anxEsc(v){return typeof escapeHtml==='function'?escapeHtml(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[c]))}
function anxNum(v){return Number(v||0).toLocaleString('ms-MY')}
function anxPct(a,b){return b?Math.round((a/b)*100):0}
function anxDate(v){if(!v)return '-';const d=new Date(v);return isNaN(d)?String(v):d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short',year:'numeric'})}
function anxYearSelect(id){
  const current=new Date().getFullYear();
  const years=[];
  for(let y=current-3;y<=current+1;y++) years.push(y);
  const selected=String(current);
  return `<select id="${id}" class="anx-select">${years.map(y=>`<option value="${y}" ${String(y)===selected?'selected':''}>${y}</option>`).join('')}</select>`;
}
function anxInitials(n){return String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()}
function anxDestroyCharts(){Object.keys(ANX_CHARTS).forEach(k=>{try{ANX_CHARTS[k].destroy()}catch(e){}});ANX_CHARTS={}}
function anxChart(id,type,labels,data,label){const el=document.getElementById(id);if(!el||typeof Chart==='undefined')return;try{ANX_CHARTS[id]?.destroy()}catch(e){};ANX_CHARTS[id]=new Chart(el,{type,data:{labels,datasets:[{label:label||'',data,backgroundColor:type==='doughnut'?['#7c3aed','#ec4899','#059669','#d97706','#0284c7','#dc2626']: 'rgba(124,58,237,.72)',borderColor:type==='line'?'#7c3aed':undefined,borderWidth:type==='line'?2:0,tension:.35,fill:type==='line'?false:undefined}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')}}},scales:type==='doughnut'?{}:{x:{ticks:{color:getComputedStyle(document.documentElement).getPropertyValue('--text-muted')},grid:{color:getComputedStyle(document.documentElement).getPropertyValue('--border')}},y:{beginAtZero:true,ticks:{color:getComputedStyle(document.documentElement).getPropertyValue('--text-muted')},grid:{color:getComputedStyle(document.documentElement).getPropertyValue('--border')}}}}})}
function renderAnalysisPage(view){
  const c=document.getElementById('page-analisis'); if(!c)return;
  try{anxDestroyCharts()}catch(e){}
  const allowed=['dashboard','attendance','activity','achievement','pajsk'];
  const v=allowed.indexOf(view)>=0?view:'dashboard'; c.dataset.analysisView=v;
  const items=[['dashboard','Dashboard Analitik','fa-chart-pie'],['attendance','Analisis Kehadiran','fa-user-check'],['activity','Analisis Aktiviti','fa-calendar-check'],['achievement','Analisis Pencapaian','fa-trophy'],['pajsk','Analisis PAJSK','fa-chart-column']];
  const titles=Object.fromEntries(items.map(x=>[x[0],x[1]]));
  c.innerHTML=`<div class="anx-module"><div class="anx-head"><div><div class="anx-kicker">Analisis Kokurikulum</div><h1 class="anx-title">${anxEsc(titles[v])}</h1><p class="anx-sub">Pilih modul analisis di bawah untuk melihat data sebenar sistem.</p></div><div class="anx-actions"><button class="anx-btn" onclick="renderAnalysisPage('${v}')"><i class="fa-solid fa-rotate"></i> Segar</button></div></div><div class="anx-module-nav">${items.map(x=>`<button type="button" class="anx-module-nav-item ${x[0]===v?'active':''}" onclick="renderAnalysisPage('${x[0]}')"><i class="fa-solid ${x[2]}"></i><span>${anxEsc(x[1])}</span></button>`).join('')}</div><div id="anx-content"></div></div>`;
  if(v==='dashboard')loadAnxDashboard();
  else if(v==='attendance')loadAnxAttendance();
  else if(v==='activity')loadAnxActivity();
  else if(v==='achievement')loadAnxAchievement();
  else if(v==='pajsk')loadAnxPajsk();

}

async function loadAnxDashboard(){const c=document.getElementById('anx-content');if(!c)return;c.innerHTML=`<div class="anx-card"><div class="anx-toolbar"><div><div class="anx-card-title">Ringkasan Tahun</div><div class="anx-card-sub">Data sebenar daripada Google Sheets</div></div><div class="anx-field" style="min-width:120px"><label>Tahun</label>${anxYearSelect('anx-year')}</div></div><div id="anx-dash-body"><div class="anx-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan analitik...</div></div></div></div>`;try{const year=document.getElementById('anx-year').value;const d=anxJson(await server('getAnalysisDashboard',anxToken(),year));ANX_CACHE.dashboard=d;document.getElementById('anx-dash-body').innerHTML=`<div class="anx-grid-4"><div class="anx-card anx-stat"><div class="anx-stat-icon"><i class="fa-solid fa-users"></i></div><div class="anx-stat-value">${anxNum(d.kpi.murid)}</div><div class="anx-stat-label">Murid Aktif</div></div><div class="anx-card anx-stat"><div class="anx-stat-icon"><i class="fa-solid fa-user-check"></i></div><div class="anx-stat-value">${d.kpi.kehadiran}%</div><div class="anx-stat-label">Kadar Kehadiran</div><div class="anx-stat-note">${anxNum(d.kpi.hadir)} daripada ${anxNum(d.kpi.rekodKehadiran)} rekod</div></div><div class="anx-card anx-stat"><div class="anx-stat-icon"><i class="fa-solid fa-calendar-check"></i></div><div class="anx-stat-value">${anxNum(d.kpi.aktiviti)}</div><div class="anx-stat-label">Aktiviti</div></div><div class="anx-card anx-stat"><div class="anx-stat-icon"><i class="fa-solid fa-trophy"></i></div><div class="anx-stat-value">${anxNum(d.kpi.pencapaian)}</div><div class="anx-stat-label">Pencapaian</div></div></div><div class="anx-grid-2" style="margin-top:14px"><div class="anx-card"><div class="anx-toolbar"><div><div class="anx-card-title">Kehadiran Mengikut Kategori</div><div class="anx-card-sub">Peratus hadir berdasarkan rekod</div></div></div><div class="anx-chart"><canvas id="anx-dash-att"></canvas></div></div><div class="anx-card"><div class="anx-toolbar"><div><div class="anx-card-title">Aktiviti Mengikut Peringkat</div><div class="anx-card-sub">Agihan aktiviti tahun ${anxEsc(year)}</div></div></div><div class="anx-chart"><canvas id="anx-dash-act"></canvas></div></div></div><div class="anx-grid-2" style="margin-top:14px"><div class="anx-card"><div class="anx-card-title">Unit Dengan Keahlian Tertinggi</div><div class="anx-card-sub">Berdasarkan penempatan aktif</div><div class="anx-ranking" style="margin-top:14px">${(d.topUnits||[]).map((x,i)=>`<div class="anx-rank-row"><div class="anx-rank-no">${i+1}</div><div><div class="anx-rank-name">${anxEsc(x.nama)}</div><div class="anx-progress" style="margin-top:5px"><span style="width:${d.topUnitsMax?Math.round(x.jumlah/d.topUnitsMax*100):0}%"></span></div></div><div class="anx-rank-val">${anxNum(x.jumlah)}</div></div>`).join('')||'<div class="anx-empty">Tiada data penempatan.</div>'}</div></div><div class="anx-card"><div class="anx-card-title">Aktiviti Terkini</div><div class="anx-card-sub">Rekod aktiviti yang disimpan</div><div class="anx-table-wrap" style="margin-top:12px"><table class="anx-table"><thead><tr><th>Aktiviti</th><th>Tarikh</th><th>Peringkat</th><th>Peserta</th></tr></thead><tbody>${(d.recentActivities||[]).map(x=>`<tr><td><b>${anxEsc(x.nama)}</b></td><td>${anxDate(x.tarikh)}</td><td><span class="anx-pill">${anxEsc(x.peringkat||'-')}</span></td><td>${anxNum(x.peserta)}</td></tr>`).join('')||'<tr><td colspan="4"><div class="anx-empty">Tiada aktiviti.</div></td></tr>'}</tbody></table></div></div></div></div>`;anxChart('anx-dash-att','doughnut',(d.attendanceByCategory||[]).map(x=>x.label),(d.attendanceByCategory||[]).map(x=>x.pct),'Kehadiran');anxChart('anx-dash-act','bar',(d.activityByLevel||[]).map(x=>x.label),(d.activityByLevel||[]).map(x=>x.value),'Aktiviti')}catch(e){c.querySelector('#anx-dash-body').innerHTML=`<div class="anx-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>${anxEsc(e.message||String(e))}</div></div>`}}
async function loadAnxAttendance(){const c=document.getElementById('anx-content');if(!c)return;c.innerHTML=`<div class="anx-card"><div class="anx-toolbar"><div><div class="anx-card-title">Analisis Kehadiran</div><div class="anx-card-sub">Bandingkan kadar hadir mengikut kategori dan unit.</div></div><div class="anx-field"><label>Tahun</label>${anxYearSelect('anx-att-year')}</div></div><div id="anx-att-body"><div class="anx-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan...</div></div></div></div>`;try{const d=anxJson(await server('getAttendanceAnalysis',anxToken(),document.getElementById('anx-att-year').value));ANX_CACHE.attendance=d;document.getElementById('anx-att-body').innerHTML=`<div class="anx-grid-3"><div class="anx-card anx-stat"><div class="anx-stat-value">${d.overall.pct}%</div><div class="anx-stat-label">Keseluruhan Kehadiran</div></div><div class="anx-card anx-stat"><div class="anx-stat-value">${anxNum(d.overall.hadir)}</div><div class="anx-stat-label">Rekod Hadir</div></div><div class="anx-card anx-stat"><div class="anx-stat-value">${anxNum(d.overall.total)}</div><div class="anx-stat-label">Jumlah Rekod</div></div></div><div class="anx-grid-2" style="margin-top:14px"><div class="anx-card"><div class="anx-card-title">Mengikut Kategori</div><div class="anx-chart"><canvas id="anx-att-cat"></canvas></div></div><div class="anx-card"><div class="anx-card-title">Trend Bulanan</div><div class="anx-chart"><canvas id="anx-att-month"></canvas></div></div></div><div class="anx-card" style="margin-top:14px"><div class="anx-card-title">Prestasi Unit</div><div class="anx-card-sub">Kadar hadir berdasarkan rekod unit</div><div class="anx-table-wrap" style="margin-top:12px"><table class="anx-table"><thead><tr><th>Unit</th><th>Kategori</th><th>Hadir</th><th>Rekod</th><th>Kadar</th></tr></thead><tbody>${(d.units||[]).map(x=>`<tr><td><b>${anxEsc(x.nama)}</b></td><td>${anxEsc(x.kategori||'-')}</td><td>${anxNum(x.hadir)}</td><td>${anxNum(x.total)}</td><td><div style="display:flex;align-items:center;gap:9px"><div class="anx-progress" style="width:100px"><span style="width:${x.pct}%"></span></div><b>${x.pct}%</b></div></td></tr>`).join('')||'<tr><td colspan="5"><div class="anx-empty">Tiada rekod kehadiran.</div></td></tr>'}</tbody></table></div></div></div>`;anxChart('anx-att-cat','bar',d.byCategory.map(x=>x.label),d.byCategory.map(x=>x.pct),'Kadar %');anxChart('anx-att-month','line',d.byMonth.map(x=>x.label),d.byMonth.map(x=>x.pct),'Kadar %')}catch(e){c.querySelector('#anx-att-body').innerHTML=`<div class="anx-empty">${anxEsc(e.message||String(e))}</div>`}}
async function loadAnxActivity(){const c=document.getElementById('anx-content');if(!c)return;c.innerHTML=`<div class="anx-card"><div class="anx-toolbar"><div><div class="anx-card-title">Analisis Aktiviti</div><div class="anx-card-sub">Agihan aktiviti, trend bulanan dan peringkat.</div></div><div class="anx-field"><label>Tahun</label>${anxYearSelect('anx-act-year')}</div></div><div id="anx-act-body"><div class="anx-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan...</div></div></div></div>`;try{const d=anxJson(await server('getActivityAnalysis',anxToken(),document.getElementById('anx-act-year').value));document.getElementById('anx-act-body').innerHTML=`<div class="anx-grid-4"><div class="anx-card anx-stat"><div class="anx-stat-value">${anxNum(d.total)}</div><div class="anx-stat-label">Jumlah Aktiviti</div></div><div class="anx-card anx-stat"><div class="anx-stat-value">${anxNum(d.totalParticipants)}</div><div class="anx-stat-label">Penyertaan</div></div><div class="anx-card anx-stat"><div class="anx-stat-value">${anxNum(d.levelCount)}</div><div class="anx-stat-label">Peringkat</div></div><div class="anx-card anx-stat"><div class="anx-stat-value">${d.avgParticipants}</div><div class="anx-stat-label">Purata Peserta / Aktiviti</div></div></div><div class="anx-grid-2" style="margin-top:14px"><div class="anx-card"><div class="anx-card-title">Aktiviti Mengikut Peringkat</div><div class="anx-chart"><canvas id="anx-act-level"></canvas></div></div><div class="anx-card"><div class="anx-card-title">Trend Aktiviti Bulanan</div><div class="anx-chart"><canvas id="anx-act-month"></canvas></div></div></div><div class="anx-card" style="margin-top:14px"><div class="anx-card-title">Senarai Aktiviti</div><div class="anx-table-wrap" style="margin-top:12px"><table class="anx-table"><thead><tr><th>Aktiviti</th><th>Tarikh</th><th>Peringkat</th><th>Peserta</th><th>Guru</th></tr></thead><tbody>${(d.activities||[]).map(x=>`<tr><td><b>${anxEsc(x.nama)}</b></td><td>${anxDate(x.tarikh)}</td><td><span class="anx-pill">${anxEsc(x.peringkat||'-')}</span></td><td>${anxNum(x.peserta)}</td><td>${anxEsc(x.guru||'-')}</td></tr>`).join('')||'<tr><td colspan="5"><div class="anx-empty">Tiada aktiviti.</div></td></tr>'}</tbody></table></div></div></div>`;anxChart('anx-act-level','doughnut',d.byLevel.map(x=>x.label),d.byLevel.map(x=>x.value),'Aktiviti');anxChart('anx-act-month','line',d.byMonth.map(x=>x.label),d.byMonth.map(x=>x.value),'Aktiviti')}catch(e){c.querySelector('#anx-act-body').innerHTML=`<div class="anx-empty">${anxEsc(e.message||String(e))}</div>`}}
async function loadAnxAchievement(){const c=document.getElementById('anx-content');if(!c)return;c.innerHTML=`<div class="anx-card"><div class="anx-toolbar"><div><div class="anx-card-title">Analisis Pencapaian</div><div class="anx-card-sub">Pecahan pencapaian mengikut peringkat dan kedudukan.</div></div><div class="anx-field"><label>Tahun</label>${anxYearSelect('anx-ach-year')}</div></div><div id="anx-ach-body"><div class="anx-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan...</div></div></div></div>`;try{const d=anxJson(await server('getAchievementAnalysis',anxToken(),document.getElementById('anx-ach-year').value));document.getElementById('anx-ach-body').innerHTML=`<div class="anx-grid-3"><div class="anx-card anx-stat"><div class="anx-stat-value">${anxNum(d.total)}</div><div class="anx-stat-label">Jumlah Pencapaian</div></div><div class="anx-card anx-stat"><div class="anx-stat-value">${anxNum(d.studentCount)}</div><div class="anx-stat-label">Murid Mencapai</div></div><div class="anx-card anx-stat"><div class="anx-stat-value">${anxNum(d.activityCount)}</div><div class="anx-stat-label">Aktiviti Berkaitan</div></div></div><div class="anx-grid-2" style="margin-top:14px"><div class="anx-card"><div class="anx-card-title">Mengikut Peringkat</div><div class="anx-chart"><canvas id="anx-ach-level"></canvas></div></div><div class="anx-card"><div class="anx-card-title">Kedudukan</div><div class="anx-chart"><canvas id="anx-ach-rank"></canvas></div></div></div><div class="anx-card" style="margin-top:14px"><div class="anx-card-title">Rekod Pencapaian</div><div class="anx-table-wrap" style="margin-top:12px"><table class="anx-table"><thead><tr><th>Murid</th><th>Pencapaian</th><th>Peringkat</th><th>Kedudukan</th><th>Tarikh</th></tr></thead><tbody>${(d.rows||[]).map(x=>`<tr><td><b>${anxEsc(x.murid)}</b><div style="font-size:10px;color:var(--text-muted)">${anxEsc(x.kelas||'')}</div></td><td>${anxEsc(x.pencapaian)}</td><td><span class="anx-pill">${anxEsc(x.peringkat||'-')}</span></td><td>${anxEsc(x.kedudukan||'-')}</td><td>${anxDate(x.tarikh)}</td></tr>`).join('')||'<tr><td colspan="5"><div class="anx-empty">Tiada pencapaian.</div></td></tr>'}</tbody></table></div></div></div>`;anxChart('anx-ach-level','doughnut',d.byLevel.map(x=>x.label),d.byLevel.map(x=>x.value),'Pencapaian');anxChart('anx-ach-rank','bar',d.byRank.map(x=>x.label),d.byRank.map(x=>x.value),'Kedudukan')}catch(e){c.querySelector('#anx-ach-body').innerHTML=`<div class="anx-empty">${anxEsc(e.message||String(e))}</div>`}}
async function loadAnxPajsk(){
  const c=document.getElementById('anx-content');
  if(!c)return;
  c.innerHTML=`<div class="anx-card" id="pajskPrintArea">
    <div class="anx-toolbar pj-screen-only">
      <div>
        <div class="anx-card-title">Pemarkahan PAJSK Murid</div>
        <div class="anx-card-sub">Senarai pemarkahan mengikut kelas berdasarkan rekod ${ekAppName()}.</div>
      </div>
      <div class="pj-class-tools">
        <div class="anx-field"><label>Tahun</label><select id="pj-year" class="anx-select"></select></div>
        <div class="anx-field"><label>Kelas</label><select id="pj-class" class="anx-select"><option value="">Semua Kelas</option></select></div>
        <button class="anx-btn anx-btn-primary" type="button" onclick="printPajskClass()"><i class="fa-solid fa-print"></i> Cetak Kelas</button>
      </div>
    </div>
    <div class="pj-print-only"><h1 style="margin:0 0 4px;font-size:22px">Rekod Pemarkahan PAJSK</h1><div id="pj-print-meta" style="font-size:12px"></div></div>
    <div id="anx-pj-body"><div class="anx-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan...</div></div></div>
  </div>`;
  const yearEl=document.getElementById('pj-year');
  const current=new Date().getFullYear();
  yearEl.innerHTML=Array.from({length:5},(_,i)=>current-3+i).map(y=>`<option value="${y}" ${String(y)===String(current)?'selected':''}>${y}</option>`).join('');
  try{
    const [students]=await Promise.all([server('getMurid',anxToken(),{})]);
    const classes=[...new Set((anxJson(students)||[]).filter(x=>String(x.STATUS||'AKTIF').toUpperCase()!=='TIDAK AKTIF').map(x=>String(x.KELAS||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    document.getElementById('pj-class').innerHTML='<option value="">Semua Kelas</option>'+classes.map(x=>`<option value="${anxEsc(x)}">${anxEsc(x)}</option>`).join('');
    yearEl.onchange=loadPajskClassTable; document.getElementById('pj-class').onchange=loadPajskClassTable;
    await loadPajskClassTable();
  }catch(e){document.getElementById('anx-pj-body').innerHTML=`<div class="anx-empty">${anxEsc(e.message||String(e))}</div>`}
}
async function loadPajskClassTable(){
  const body=document.getElementById('anx-pj-body'); if(!body)return;
  body.innerHTML='<div class="anx-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Mengira pemarkahan murid...</div></div>';
  try{
    const year=document.getElementById('pj-year').value, kelas=document.getElementById('pj-class').value;
    const d=anxJson(await server('getPAJSKClassAnalysis',anxToken(),year,kelas)); ANX_CACHE.pajskClass=d;
    const rows=d.students||[];
    const count=rows.length;
    body.innerHTML=`<div class="anx-grid-4" style="margin-bottom:14px">
      <div class="anx-card anx-stat"><div class="anx-stat-value">${anxNum(count)}</div><div class="anx-stat-label">Murid</div></div>
      <div class="anx-card anx-stat"><div class="anx-stat-value">${anxNum(rows.filter(x=>x.average!==null).length)}</div><div class="anx-stat-label">Ada Purata 2 Kategori</div></div>
      <div class="anx-card anx-stat"><div class="anx-stat-value">${anxNum(rows.filter(x=>x.events&&x.events.length).length)}</div><div class="anx-stat-label">Ada Rekod Acara</div></div>
      <div class="anx-card anx-stat"><div class="anx-stat-value">${anxNum(rows.filter(x=>x.missing&&x.missing.length).length)}</div><div class="anx-stat-label">Rekod Perlu Lengkap</div></div>
    </div>
    <div class="anx-card" style="padding:0;overflow:hidden">
      <div class="anx-toolbar pj-screen-only" style="padding:16px 18px"><div><div class="anx-card-title">Senarai Pemarkahan ${kelas?anxEsc(kelas):'Semua Kelas'}</div><div class="anx-card-sub">Tahun ${anxEsc(year)} · Khidmat Masyarakat diisi melalui idMe</div></div></div>
      <div class="pj-class-table-wrap">
        <table class="pj-class-table"><thead><tr><th>Murid</th><th>Kelab / Persatuan</th><th>Badan Beruniform</th><th>Sukan / Permainan</th><th>Acara / Penyertaan</th><th>Jumlah Rekod</th><th>Gred</th><th class="pj-screen-only">Tindakan</th></tr></thead><tbody>
        ${rows.length?rows.map((r,i)=>{const c1=r.categories['Kelab/Persatuan'],c2=r.categories['Pasukan Badan Beruniform'],c3=r.categories['Sukan/Permainan'];return `<tr class="pj-class-main"><td><div class="pj-student-name">${anxEsc(r.NAMA)}</div><div class="pj-student-meta">${anxEsc(r.KELAS||'-')} · ${anxEsc(r.NO_KP)}</div></td><td>${pjCategoryCell(c1)}</td><td>${pjCategoryCell(c2)}</td><td>${pjCategoryCell(c3)}</td><td><b>${anxNum((r.eventsText||[]).length)}</b><div class="pj-unit-name">${anxEsc((r.eventsText||[]).slice(0,2).join(' · ')||'Tiada rekod')}</div></td><td><div class="pj-score">${Number(r.recordedTotal||0).toFixed(2)} <small>markah direkod</small></div></td><td>${r.grade?`<span class="pj-grade pj-grade-${r.grade}">${r.grade}</span>`:'<span class="pj-grade">—</span>'}</td><td class="pj-screen-only"><button type="button" class="anx-btn" onclick="togglePajskDetail(${i})"><i class="fa-solid fa-eye"></i> Detail</button></td></tr><tr id="pj-detail-${i}" class="pj-detail-row" style="display:none"><td colspan="8">${pjDetailHtml(r)}</td></tr>`}).join(''):'<tr><td colspan="8"><div class="anx-empty">Tiada murid bagi pilihan ini.</div></td></tr>'}
        </tbody></table>
      </div>
    </div>
    <div class="pj-note"><i class="fa-solid fa-circle-info"></i> <b>Nota:</b> ${anxEsc(d.note)} Skor yang dipaparkan adalah berdasarkan rekod yang tersedia. Komitmen dan Khidmat Masyarakat belum menjadi input ${ekAppName()}. ${anxEsc(d.warning||'')}</div>`;
    document.getElementById('pj-print-meta').textContent=`Tahun: ${year} · Kelas: ${kelas||'Semua Kelas'} · ${count} murid`;
  }catch(e){body.innerHTML=`<div class="anx-empty">${anxEsc(e.message||String(e))}</div>`}
}
function pjCategoryCell(c){if(!c||!c.unit)return '<span style="color:var(--text-muted)">—</span>';return `<div class="pj-score">${c.raw===null?'—':Number(c.raw).toFixed(2)} <small>/110</small></div><div class="pj-unit-name">${anxEsc(c.unit.nama)}</div>`}
function pjDetailHtml(r){
  const cats=[['Kelab/Persatuan',r.categories['Kelab/Persatuan']],['Pasukan Badan Beruniform',r.categories['Pasukan Badan Beruniform']],['Sukan/Permainan',r.categories['Sukan/Permainan']]];
  return `<div class="pj-detail-grid">${cats.map(([name,c])=>{const roles=(c&&c.jawatan)||[],achs=(c&&c.pencapaian)||[];return `<div class="pj-detail-card"><div class="pj-detail-title">${anxEsc(name)}</div><div class="pj-detail-unit">${c&&c.unit?anxEsc(c.unit.nama):'Tiada unit direkodkan'}</div><div class="pj-detail-line"><span>AJK / Jawatan</span><b>${c&&c.unit?Number(c.ajk||0).toFixed(2):'—'} / 10</b></div><div class="pj-role-list"><span class="pj-role-label">Jawatan direkodkan</span>${roles.length?roles.map(x=>`<div class="pj-role-item"><span>${anxEsc(x.JAWATAN||'AHLI')}</span><small>${anxEsc(x.NAMA_UNIT||'')} · ${anxEsc(x.STATUS||'AKTIF')}</small></div>`).join(''):'<div class="pj-role-empty">Tiada jawatan direkodkan.</div>'}</div><div class="pj-detail-line"><span>Kehadiran</span><b>${c&&c.unit?Number(c.attendance||0).toFixed(2):'—'} / 40</b></div><div class="pj-detail-line"><span>Penyertaan</span><b>${c&&c.participation!==null?Number(c.participation||0).toFixed(2):'—'} / 20</b></div><div class="pj-detail-line"><span>Pencapaian</span><b>${c&&c.unit?Number(c.achievement||0).toFixed(2):'—'} / 20</b></div>${achs.length?`<div class="pj-ach-list"><span class="pj-role-label">Pencapaian mengikut unit</span>${achs.map(x=>`<div class="pj-role-item"><span>${anxEsc(x.PENCAPAIAN||'-')}</span><small>${anxEsc(x.NAMA_UNIT||'')} · ${anxEsc(x.PERINGKAT||'-')} · ${anxEsc(x.KEDUDUKAN||'-')}</small></div>`).join('')}</div>`:''}<div class="pj-detail-line"><span>Jumlah rekod</span><b>${c&&c.raw!==null?Number(c.raw).toFixed(2):'—'} / 110</b></div></div>`}).join('')}</div><div class="pj-events"><b>Acara / Penyertaan Murid</b>${r.events&&r.events.length?r.events.map(e=>`<div class="pj-event-item"><span><b>${anxEsc(e.nama)}</b><br><span style="color:var(--text-muted)">${anxEsc(e.peringkat||'-')} · ${anxEsc(e.peranan||'PENGLIBATAN I')}</span></span><b>${Number(e.score||0).toFixed(2)}</b></div>`).join(''):'<div class="pj-unit-name" style="margin-top:8px">Tiada acara direkodkan.</div>'}</div><div class="pj-note"><b>Jumlah markah direkod:</b> ${Number(r.recordedTotal||0).toFixed(2)} · <b>Gred:</b> ${r.grade||'— (belum lengkap)'}<br>Rekod pencapaian dibaca berdasarkan <b>Unit / Kelab / Sukan yang dipilih semasa merekod pencapaian</b>, bukan semata-mata berdasarkan penempatan murid. Komitmen dan Khidmat Masyarakat belum dikira di sini.</div>`;
}
function togglePajskDetail(i){const el=document.getElementById('pj-detail-'+i);if(!el)return;el.style.display=el.style.display==='none'?'table-row':'none'}
function pjPrintDetailHtml(r){
  const cats=[
    ['Kelab / Persatuan',r.categories['Kelab/Persatuan']],
    ['Pasukan Badan Beruniform',r.categories['Pasukan Badan Beruniform']],
    ['Sukan / Permainan',r.categories['Sukan/Permainan']]
  ];
  const catRows=cats.map(function(item){
    const name=item[0],c=item[1]||{},roles=c.jawatan||[];
    const roleHtml=roles.length?roles.map(function(x){return `${anxEsc(x.JAWATAN||'AHLI')} <small>(${anxEsc(x.NAMA_UNIT||'')} · ${anxEsc(x.STATUS||'AKTIF')})</small>`;}).join('<br>'):'Tiada jawatan';
    const achHtml=(c.pencapaian||[]).length?(c.pencapaian||[]).map(function(x){return `${anxEsc(x.PENCAPAIAN||'-')} <small>(${anxEsc(x.NAMA_UNIT||'')} · ${anxEsc(x.PERINGKAT||'-')} · ${anxEsc(x.KEDUDUKAN||'-')})</small>`;}).join('<br>'):'Tiada pencapaian';
    return `<tr>
      <td><b>${anxEsc(name)}</b></td>
      <td>${c.unit?anxEsc(c.unit.nama):'Tiada unit direkodkan'}</td>
      <td>${roleHtml}<br><b>Skor: ${c.unit?Number(c.ajk||0).toFixed(2):'—'} / 10</b></td>
      <td>${c.unit?Number(c.attendance||0).toFixed(2):'—'}</td>
      <td>${c.participation!==null&&c.participation!==undefined?Number(c.participation||0).toFixed(2):'—'}</td>
      <td>${c.unit?Number(c.achievement||0).toFixed(2):'—'}<br><small>${achHtml}</small></td>
      <td>${c.raw!==null&&c.raw!==undefined?Number(c.raw).toFixed(2):'—'}</td>
    </tr>`;
  }).join('');
  const events=(r.events||[]).map(function(e,i){
    return `<tr><td>${i+1}</td><td>${anxEsc(e.nama||'-')}</td><td>${anxEsc(e.peringkat||'-')}</td><td>${anxEsc(e.peranan||'PENGLIBATAN I')}</td><td>${Number(e.score||0).toFixed(2)}</td></tr>`;
  }).join('');
  return `<div class="print-student-detail">
    <h3>${anxEsc(r.NAMA||'-')}</h3>
    <div class="print-student-meta">NO. KP: ${anxEsc(r.NO_KP||'-')} · Tingkatan: ${anxEsc(r.TINGKATAN||'-')} · Kelas: ${anxEsc(r.KELAS||'-')}</div>
    <table class="print-detail-table">
      <thead><tr><th>Komponen</th><th>Unit</th><th>Jawatan<br>dan Skor /10</th><th>Kehadiran<br>/40</th><th>Penyertaan<br>/20</th><th>Pencapaian<br>/20</th><th>Jumlah<br>/110</th></tr></thead>
      <tbody>${catRows}</tbody>
    </table>
    <div class="print-section-title">Acara / Penyertaan Murid</div>
    <table class="print-detail-table">
      <thead><tr><th>Bil.</th><th>Nama Acara</th><th>Peringkat</th><th>Peranan</th><th>Skor</th></tr></thead>
      <tbody>${events||'<tr><td colspan="5">Tiada acara / penyertaan direkodkan.</td></tr>'}</tbody>
    </table>
    <div class="print-total"><b>Jumlah markah direkod:</b> ${Number(r.recordedTotal||0).toFixed(2)} / 330 · <b>Gred:</b> ${r.grade||'— (belum lengkap)'}</div>
    <div class="print-note">Komitmen dan Khidmat Masyarakat belum dikira di sini. Khidmat Masyarakat akan diisi oleh Guru Kelas melalui idMe.</div>
  </div>`;
}
function printPajskClass(){
  const d=ANX_CACHE.pajskClass;
  if(!d||!d.students){showToast('Sila tunggu sehingga senarai PAJSK selesai dimuatkan.','warning');return;}

  const year=document.getElementById('pj-year')?.value||d.tahun;
  const kelas=document.getElementById('pj-class')?.value||'Semua Kelas';
  const rows=d.students||[];

  const w=window.open('','_blank');
  if(!w){showToast('Pelayar menyekat tetingkap cetakan. Sila benarkan pop-up.','error');return;}

  /* CETAK DETAIL SAHAJA — RINGKASAN KELAS TIDAK DICETAK */
  const detailBlocks=rows.map(pjPrintDetailHtml).join('');

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Detail Pemarkahan PAJSK - ${anxEsc(kelas)}</title><style>
    @page{size:A4 landscape;margin:10mm}
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;color:#111;background:#fff;font-size:9px;line-height:1.35;margin:0}
    h1{font-size:20px;margin:0 0 4px}
    h2{font-size:13px;margin:18px 0 7px;border-bottom:1px solid #999;padding-bottom:5px}
    h3{font-size:13px;margin:0 0 3px}
    .meta{font-size:10px;margin-bottom:12px}
    .print-detail-table{width:100%;border-collapse:collapse}
    .print-detail-table th,.print-detail-table td{border:1px solid #aaa;padding:4px 5px;text-align:center;vertical-align:top}
    .print-detail-table th{background:#eee;font-weight:700}
    .print-student-detail{page-break-inside:avoid;margin-top:14px;border-top:2px solid #333;padding-top:9px}
    .print-student-meta{font-size:9px;color:#444;margin-bottom:7px}
    .print-section-title{font-weight:700;font-size:10px;margin:9px 0 4px}
    .print-total{margin-top:7px;padding:6px;border:1px solid #aaa;background:#f7f7f7}
    .print-note{margin-top:6px;font-size:8px;color:#444}
    .foot{margin-top:18px;font-size:8px;color:#555;border-top:1px solid #ccc;padding-top:6px}
    @media print{.no-print{display:none!important}}
  </style></head><body>
    <h1>Detail Pemarkahan PAJSK Setiap Murid</h1>
    <div class="meta"><b>Tahun:</b> ${anxEsc(year)} &nbsp; · &nbsp; <b>Kelas:</b> ${anxEsc(kelas)} &nbsp; · &nbsp; <b>Bilangan murid:</b> ${rows.length}</div>
    ${detailBlocks||'<p>Tiada murid bagi pilihan ini.</p>'}
    <div class="foot">${ekAppName()} · Detail Pemarkahan PAJSK · Tahun ${anxEsc(year)} · Kelas ${anxEsc(kelas)}<br>Nota: Skor berdasarkan rekod yang tersedia dalam ${ekAppName()}. Komitmen dan Khidmat Masyarakat belum menjadi input ${ekAppName()}. Khidmat Masyarakat akan diisi oleh Guru Kelas melalui idMe.</div>
    <script>window.onload=function(){window.focus();window.print()}<\/script>
  </body></html>`);
  w.document.close();
}
async function loadAnxProfile(){const c=document.getElementById('anx-content');if(!c)return;c.innerHTML=`<div class="anx-card"><div class="anx-toolbar"><div><div class="anx-card-title">Profil Murid</div><div class="anx-card-sub">Cari murid menggunakan nama, kelas atau NO_KP.</div></div><div class="anx-filter"><div class="anx-field" style="min-width:300px"><label>Carian Murid</label><input id="anx-profile-search" placeholder="Nama / NO_KP / kelas" oninput="anxProfileSearch()"></div></div></div><div id="anx-profile-results"></div></div><div id="anx-profile-detail" style="margin-top:14px"></div>`;try{const m=anxJson(await server('getMurid',anxToken(),{}));ANX_CACHE.students=m;anxProfileSearch()}catch(e){document.getElementById('anx-profile-results').innerHTML=`<div class="anx-empty">${anxEsc(e.message||String(e))}</div>`}}
function anxProfileSearch(){const q=(document.getElementById('anx-profile-search')?.value||'').toUpperCase();const rows=(ANX_CACHE.students||[]).filter(x=>!q||[x.NAMA,x.NO_KP,x.KELAS].some(v=>String(v||'').toUpperCase().includes(q))).slice(0,20);const el=document.getElementById('anx-profile-results');if(!el)return;if(!rows.length){el.innerHTML='<div class="anx-empty"><i class="fa-solid fa-user-slash"></i><div>Tiada murid ditemui.</div></div>';return}el.innerHTML=`<div class="anx-table-wrap"><table class="anx-table"><thead><tr><th>Murid</th><th>NO. KP</th><th>Kelas</th><th>Tingkatan</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${anxEsc(x.NAMA)}</b></td><td>${anxEsc(x.NO_KP)}</td><td>${anxEsc(x.KELAS||'-')}</td><td>${anxEsc(x.TINGKATAN||'-')}</td><td><button class="anx-btn" onclick="loadAnxStudentProfile('${anxEsc(x.NO_KP)}')"><i class="fa-solid fa-eye"></i> Lihat Profil</button></td></tr>`).join('')}</tbody></table></div>`}
async function loadAnxStudentProfile(noKp){const dEl=document.getElementById('anx-profile-detail');if(!dEl)return;dEl.innerHTML='<div class="anx-card"><div class="anx-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan profil...</div></div></div>';try{const d=anxJson(await server('getStudentAnalysisProfile',anxToken(),noKp));ANX_PROFILE=d;dEl.innerHTML=`<div class="anx-card"><div class="anx-profile"><div class="anx-avatar">${anxInitials(d.student.NAMA)}</div><div><div class="anx-profile-name">${anxEsc(d.student.NAMA)}</div><div class="anx-meta">NO. KP: ${anxEsc(d.student.NO_KP)} · ${anxEsc(d.student.TINGKATAN||'-')} · ${anxEsc(d.student.KELAS||'-')} · ${anxEsc(d.student.STATUS||'')}</div></div><div class="anx-pill">Tahun ${anxEsc(d.tahun)}</div></div><div class="anx-mini-grid"><div class="anx-mini"><b>${d.attendance.pct}%</b><span>Kehadiran</span></div><div class="anx-mini"><b>${anxNum(d.units.length)}</b><span>Unit</span></div><div class="anx-mini"><b>${anxNum(d.activities.length)}</b><span>Aktiviti</span></div><div class="anx-mini"><b>${anxNum(d.achievements.length)}</b><span>Pencapaian</span></div><div class="anx-mini"><b>${anxNum(d.ajk.length)}</b><span>AJK</span></div></div><div class="anx-grid-2" style="margin-top:16px"><div><div class="anx-card-title">Unit & Penglibatan</div><div class="anx-table-wrap" style="margin-top:9px"><table class="anx-table"><thead><tr><th>Unit</th><th>Tahun</th><th>Status</th></tr></thead><tbody>${d.units.map(x=>`<tr><td>${anxEsc(x.nama)}</td><td>${anxEsc(x.TAHUN)}</td><td>${anxEsc(x.STATUS||'AKTIF')}</td></tr>`).join('')||'<tr><td colspan="3">Tiada unit.</td></tr>'}</tbody></table></div></div><div><div class="anx-card-title">Timeline Aktiviti & Pencapaian</div><div class="anx-timeline" style="margin-top:12px">${d.timeline.map(x=>`<div class="anx-tl"><div class="anx-tl-title">${anxEsc(x.title)}</div><div class="anx-tl-sub">${anxEsc(x.date)} · ${anxEsc(x.type)}</div></div>`).join('')||'<div class="anx-empty">Tiada rekod.</div>'}</div></div></div></div>`}catch(e){dEl.innerHTML=`<div class="anx-card"><div class="anx-empty">${anxEsc(e.message||String(e))}</div></div>`}}
async function renderGalleryPage(){const c=document.getElementById('page-galeri');if(!c)return;c.innerHTML=`<div class="anx-module"><div class="anx-head"><div><div class="anx-kicker">Laporan & Dokumentasi</div><h1 class="anx-title">Galeri Kokurikulum</h1><p class="anx-sub">Foto yang telah direkodkan melalui dokumentasi aktiviti.</p></div><div class="anx-actions"><button class="anx-btn" onclick="loadAnxGallery('anx-gallery-content')"><i class="fa-solid fa-rotate"></i> Segar</button></div></div><div id="anx-gallery-content"></div></div>`;loadAnxGallery('anx-gallery-content')}
async function loadAnxGallery(targetId){const c=document.getElementById(targetId||'anx-content');if(!c)return;c.innerHTML='<div class="anx-card"><div class="anx-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan galeri...</div></div></div>';try{const d=anxJson(await server('getGallery',anxToken(),100));c.innerHTML=`<div class="anx-card"><div class="anx-toolbar"><div><div class="anx-card-title">Galeri Kokurikulum</div><div class="anx-card-sub">Foto yang telah direkodkan dalam dokumentasi aktiviti.</div></div><div class="anx-nav-note">${anxNum(d.length)} foto</div></div>${d.length?`<div class="anx-gallery">${d.map(x=>`<a class="anx-photo" href="${anxEsc(x.FILE_URL||'#')}" target="_blank" rel="noopener"><img src="${anxEsc(x.FILE_URL||'')}" alt="${anxEsc(x.NAMA_FAIL||'Foto aktiviti')}" loading="lazy" onerror="this.style.display='none'"><div class="anx-photo-caption">${anxEsc(x.NAMA_FAIL||'Foto aktiviti')}</div></a>`).join('')}</div>`:'<div class="anx-empty"><i class="fa-solid fa-images"></i><div>Tiada foto dalam galeri.</div></div>'}</div>`}catch(e){c.innerHTML=`<div class="anx-card"><div class="anx-empty">${anxEsc(e.message||String(e))}</div></div>`}}
async function loadAnxFiles(){const c=document.getElementById('anx-content');if(!c)return;c.innerHTML='<div class="anx-card"><div class="anx-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Memuatkan fail...</div></div></div>';try{const d=anxJson(await server('getAnalysisFiles',anxToken(),100));c.innerHTML=`<div class="anx-card"><div class="anx-toolbar"><div><div class="anx-card-title">Fail Dokumentasi</div><div class="anx-card-sub">Fail yang telah disimpan melalui laporan dan surat aktiviti.</div></div><div class="anx-nav-note">${anxNum(d.length)} fail</div></div><div class="anx-file-list">${d.map(x=>`<div class="anx-file"><div class="anx-file-icon"><i class="fa-solid ${x.kind==='SURAT'?'fa-envelope':'fa-file-lines'}"></i></div><div style="min-width:0;flex:1"><div class="anx-file-name">${anxEsc(x.name||'Fail')}</div><div class="anx-file-meta">${anxEsc(x.kind)} · ${anxDate(x.createdAt)}</div></div>${x.url?`<a class="anx-file-link" href="${anxEsc(x.url)}" target="_blank" rel="noopener">Lihat</a>`:''}</div>`).join('')||'<div class="anx-empty">Tiada fail dokumentasi.</div>'}</div></div>`}catch(e){c.innerHTML=`<div class="anx-card"><div class="anx-empty">${anxEsc(e.message||String(e))}</div></div>`}}



/* =========================================================
   LAPORAN MASTER FRONTEND — additive patch
========================================================= */
let RPX_REPORTS=[];
let RPX_ACTIVITIES=[];
let RPX_REPORT_EDIT=null;

function rpxData(v){try{return typeof v==='string'?JSON.parse(v):v}catch(e){return v||[]}}
function rpxTok(){return typeof getMuridSessionToken==='function'?getMuridSessionToken():(window.EK&&EK.token)||''}
function rpxEsc(v){return typeof escapeHtml==='function'?escapeHtml(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function rpxDate(v){if(!v)return '-';const d=new Date(v);return isNaN(d)?rpxEsc(v):d.toLocaleDateString('ms-MY',{day:'2-digit',month:'2-digit',year:'numeric'})}
function rpxYear(v){return String(v||new Date().getFullYear())}
function rpxSetActiveTab(key){document.querySelectorAll('.rpx-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.rpx===key))}

async function renderLaporanPage(){
 const c=document.getElementById('page-laporan'); if(!c)return;
 c.innerHTML=`<div class="rpx-module">
   <div class="rpx-head">
     <div>
       <div class="rpx-kicker">Laporan & Dokumentasi</div>
       <h1 class="rpx-title">Laporan Aktiviti</h1>
       <p class="rpx-sub">Pilih aktiviti yang telah direkodkan untuk menyediakan laporan bergambar dan senarai peserta.</p>
     </div>
     <div class="rpx-actions">
       <button class="rpx-btn" onclick="loadRpxActivityReportList()"><i class="fa-solid fa-rotate"></i> Segar</button>
     </div>
   </div>
   <div id="rpx-report-content"></div>
 </div>`;
 await loadRpxActivityReportList();
}

async function loadRpxActivityReportList(){
 const c=document.getElementById('rpx-report-content'); if(!c)return;
 c.innerHTML='<div class="rpx-card rpx-empty"><i class="fa-solid fa-spinner fa-spin"></i><br>Memuatkan senarai aktiviti...</div>';
 try{
   const d=rpxData(await server('getActivityReportList',rpxTok()));
   RPX_ACTIVITIES=d.activities||[];
   RPX_REPORTS=d.reports||[];
   renderRpxActivityReportList();
 }catch(e){
   c.innerHTML='<div class="rpx-card rpx-empty"><i class="fa-solid fa-triangle-exclamation"></i><br>'+rpxEsc(e.message||String(e))+'</div>';
 }
}

function renderRpxActivityReportList(){
 const c=document.getElementById('rpx-report-content'); if(!c)return;
 const rows=RPX_ACTIVITIES||[];
 c.innerHTML=`<div class="rpx-card">
   <div class="rpx-toolbar">
     <div>
       <h3>Senarai Aktiviti</h3>
       <div style="color:var(--text-secondary);font-size:12px">Semua aktiviti yang telah direkodkan dalam modul Aktiviti & Acara.</div>
     </div>
     <div class="rpx-actions">
       <span class="rpx-pill">${rows.length} aktiviti</span>
     </div>
   </div>
   <div class="rpx-filter" style="grid-template-columns:2fr 1fr auto">
     <div class="rpx-field"><label>Carian Aktiviti</label><input id="rpx-activity-report-search" placeholder="Nama aktiviti..." oninput="filterRpxActivityReportList()"></div>
     <div class="rpx-field"><label>Tahun</label><select id="rpx-activity-report-year" onchange="filterRpxActivityReportList()"><option value="">Semua Tahun</option>${[...new Set(rows.map(x=>new Date(x.TARIKH).getFullYear()).filter(y=>!isNaN(y)))].sort((a,b)=>b-a).map(y=>`<option>${y}</option>`).join('')}</select></div>
     <button class="rpx-btn" onclick="document.getElementById('rpx-activity-report-search').value='';document.getElementById('rpx-activity-report-year').value='';filterRpxActivityReportList()">Reset</button>
   </div>
   <div id="rpx-activity-report-table"></div>
 </div>`;
 filterRpxActivityReportList();
}

function filterRpxActivityReportList(){
 const box=document.getElementById('rpx-activity-report-table'); if(!box)return;
 const q=(document.getElementById('rpx-activity-report-search')?.value||'').toUpperCase().trim();
 const y=document.getElementById('rpx-activity-report-year')?.value||'';
 const rows=(RPX_ACTIVITIES||[]).filter(a=>{
   const okQ=!q||String(a.NAMA_AKTIVITI||'').toUpperCase().includes(q);
   const ay=a.TARIKH?new Date(a.TARIKH).getFullYear():'';
   return okQ&&(!y||String(ay)===String(y));
 });
 box.innerHTML=`<div class="rpx-table-wrap"><table class="rpx-table">
   <thead><tr><th>Bil.</th><th>Aktiviti</th><th>Tarikh</th><th>Tempat</th><th>Peringkat</th><th>Peserta</th><th>Laporan</th><th>Tindakan</th></tr></thead>
   <tbody>${rows.map((a,i)=>{
     const report=(RPX_REPORTS||[]).find(r=>String(r.AKTIVITI_ID)===String(a.AKTIVITI_ID));
     const participantCount=Number(a.PESERTA_COUNT||0);
     return `<tr>
       <td>${i+1}</td>
       <td><b>${rpxEsc(a.NAMA_AKTIVITI||'-')}</b></td>
       <td>${rpxDate(a.TARIKH)}</td>
       <td>${rpxEsc(a.TEMPAT||'-')}</td>
       <td>${rpxEsc(a.PERINGKAT||'-')}</td>
       <td><span class="rpx-pill">${participantCount}</span></td>
       <td><span class="rpx-pill">${report?'SUDAH ADA':'BELUM ADA'}</span></td>
       <td><div class="rpx-actions">${report
         ? `<button class="rpx-btn" onclick="openRpxExistingReport('${rpxEsc(a.AKTIVITI_ID)}')"><i class="fa-solid fa-eye"></i> Lihat</button><button class="rpx-btn" onclick="printRpxActivityReport('${rpxEsc(a.AKTIVITI_ID)}')"><i class="fa-solid fa-print"></i> Cetak</button>`
         : `<button class="rpx-btn primary" onclick="openRpxActivityComposer('${rpxEsc(a.AKTIVITI_ID)}')"><i class="fa-solid fa-file-circle-plus"></i> Buat Laporan</button>`
       }</div></td>
     </tr>`;
   }).join('')||'<tr><td colspan="8"><div class="rpx-empty">Tiada aktiviti ditemui.</div></td></tr>'}</tbody>
 </table></div>`;
}

async function openRpxActivityComposer(activityId){
 const c=document.getElementById('rpx-report-content'); if(!c)return;
 c.innerHTML='<div class="rpx-card rpx-empty"><i class="fa-solid fa-spinner fa-spin"></i><br>Memuatkan butiran aktiviti...</div>';
 try{
   const d=rpxData(await server('getActivityReportComposer',rpxTok(),activityId));
   renderRpxActivityComposer(d);
 }catch(e){
   c.innerHTML='<div class="rpx-card rpx-empty">'+rpxEsc(e.message||String(e))+'</div>';
 }
}

function renderRpxActivityComposer(d){
 const a=d.activity||{}, participants=d.participants||[];
 const c=document.getElementById('rpx-report-content'); if(!c)return;
 const title='Laporan Aktiviti — '+(a.NAMA_AKTIVITI||'');
 c.innerHTML=`<div class="rpx-report-detail">
   <div class="rpx-report-detail-head">
     <div>
       <button class="back-button" type="button" onclick="loadRpxActivityReportList()"><i class="fa-solid fa-arrow-left"></i> Kembali ke Senarai Aktiviti</button>
       <h1 class="rpx-report-detail-title">${rpxEsc(title)}</h1>
       <p class="rpx-report-detail-sub">Butiran aktiviti diambil terus daripada pendaftaran Aktiviti & Acara.</p>
     </div>
   </div>

   <div class="rpx-detail-grid">
     <div class="rpx-detail-item"><label>Tarikh</label><strong>${rpxDate(a.TARIKH)}</strong></div>
     <div class="rpx-detail-item"><label>Hari</label><strong>${rpxEsc(a.HARI||'-')}</strong></div>
     <div class="rpx-detail-item"><label>Masa</label><strong>${rpxEsc(a.MASA||'-')}</strong></div>
     <div class="rpx-detail-item"><label>Tempat</label><strong>${rpxEsc(a.TEMPAT||'-')}</strong></div>
     <div class="rpx-detail-item"><label>Peringkat</label><strong>${rpxEsc(a.PERINGKAT||'-')}</strong></div>
     <div class="rpx-detail-item"><label>Bilangan Peserta</label><strong>${participants.length}</strong></div>
   </div>

   <div class="rpx-card">
     <div class="rpx-toolbar"><div><h3>Objektif Aktiviti</h3><div style="color:var(--text-secondary);font-size:12px">Disalin automatik daripada pendaftaran aktiviti.</div></div></div>
     <div class="rpx-copy-box">${rpxEsc(a.OBJEKTIF||'Tiada objektif direkodkan.')}</div>
   </div>

   <div class="rpx-card">
     <div class="rpx-toolbar"><div><h3>Aktiviti / Pelaksanaan</h3><div style="color:var(--text-secondary);font-size:12px">Disalin automatik daripada pendaftaran aktiviti.</div></div></div>
     <div class="rpx-copy-box">${rpxEsc(a.AKTIVITI||'Tiada butiran pelaksanaan direkodkan.')}</div>
   </div>

   <div class="rpx-card">
     <div class="rpx-toolbar"><div><h3>Impak Aktiviti</h3><div style="color:var(--text-secondary);font-size:12px">Disalin automatik daripada pendaftaran aktiviti.</div></div></div>
     <div class="rpx-copy-box">${rpxEsc(a.IMPAK||'Tiada impak direkodkan.')}</div>
   </div>

   <div class="rpx-card">
     <div class="rpx-toolbar">
       <div><h3>Upload 4 Keping Gambar</h3><div class="rpx-upload-note">Sila pilih tepat 4 gambar. Gambar akan disimpan dalam Google Drive dan direkodkan dalam Galeri.</div></div>
       <span id="rpx-photo-count" class="rpx-pill">0 / 4</span>
     </div>
     <div class="rpx-photo-upload">
       ${[1,2,3,4].map(i=>`<div class="rpx-photo-slot" id="rpx-photo-slot-${i}">
         <span class="rpx-photo-number">Foto ${i}</span>
         <div class="rpx-photo-placeholder"><i class="fa-solid fa-image" style="font-size:24px;margin-bottom:7px"></i><br>Klik untuk pilih gambar</div>
         <input type="file" accept="image/*" data-photo-index="${i}" onchange="previewRpxPhoto(this,${i})">
       </div>`).join('')}
     </div>
     <div id="rpx-photo-error" class="rpx-upload-note" style="color:var(--danger);display:none"></div>
   </div>

   <div class="rpx-card">
     <div class="rpx-toolbar">
       <div><h3>Senarai Peserta Aktiviti</h3><div class="rpx-participant-count">${participants.length} murid direkodkan</div></div>
     </div>
     <div class="rpx-table-wrap"><table class="rpx-table">
       <thead><tr><th>Bil.</th><th>Nama Murid</th><th>NO. KP</th><th>Tingkatan</th><th>Kelas</th><th>Peranan</th></tr></thead>
       <tbody>${participants.map((p,i)=>`<tr><td>${i+1}</td><td><b>${rpxEsc(p.NAMA||'-')}</b></td><td>${rpxEsc(p.NO_KP||'-')}</td><td>${rpxEsc(p.TINGKATAN||'-')}</td><td>${rpxEsc(p.KELAS||'-')}</td><td>${rpxEsc(p.PERANAN||'PESERTA')}</td></tr>`).join('')||'<tr><td colspan="6"><div class="rpx-empty">Tiada peserta direkodkan untuk aktiviti ini.</div></td></tr>'}</tbody>
     </table></div>
   </div>

   <div class="rpx-save-bar">
     <div><b>Lengkapkan laporan</b><div class="rpx-upload-note">Selepas disimpan, laporan akan berstatus SELESAI.</div></div>
     <button id="rpx-save-report-btn" class="rpx-btn primary" type="button" onclick="saveRpxActivityReport('${rpxEsc(a.AKTIVITI_ID)}')"><i class="fa-solid fa-cloud-arrow-up"></i> Simpan Laporan</button>
   </div>
 </div>`;
 window.RPX_CURRENT_COMPOSER=d;
 window.RPX_PHOTO_FILES=[null,null,null,null];
}

function previewRpxPhoto(input,index){
 const err=document.getElementById('rpx-photo-error'); if(err)err.style.display='none';
 const file=input?.files?.[0]; if(!file)return;
 if(!String(file.type||'').toLowerCase().startsWith('image/')){showToast('Fail mesti berupa gambar.','error');input.value='';return;}
 const slot=document.getElementById('rpx-photo-slot-'+index); if(!slot)return;
 const old=slot.querySelector('img'); if(old)old.remove();
 const placeholder=slot.querySelector('.rpx-photo-placeholder'); if(placeholder)placeholder.style.display='none';
 const img=document.createElement('img'); img.alt='Foto '+index;
 const reader=new FileReader();
 reader.onload=function(e){img.src=e.target.result;slot.insertBefore(img,slot.querySelector('.rpx-photo-number')?.nextSibling||null)};
 reader.readAsDataURL(file);
 window.RPX_PHOTO_FILES=window.RPX_PHOTO_FILES||[null,null,null,null];
 window.RPX_PHOTO_FILES[index-1]=file;
 const count=window.RPX_PHOTO_FILES.filter(Boolean).length;
 const badge=document.getElementById('rpx-photo-count'); if(badge)badge.textContent=count+' / 4';
}

function rpxPhotoSrc(g){
 const id=String(g?.FILE_ID||'');
 if(id)return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w1200';
 return String(g?.FILE_URL||'');
}

function rpxFileToPayload(file){
 return new Promise((resolve,reject)=>{
   if(!file)return reject(new Error('Fail gambar tidak ditemui.'));
   const reader=new FileReader();
   reader.onload=function(){
     const result=String(reader.result||'');
     const comma=result.indexOf(',');
     resolve({name:file.name,mimeType:file.type||'image/jpeg',data:comma>=0?result.slice(comma+1):result});
   };
   reader.onerror=()=>reject(new Error('Gagal membaca gambar: '+file.name));
   reader.readAsDataURL(file);
 });
}

async function saveRpxActivityReport(activityId){
 const btn=document.getElementById('rpx-save-report-btn');
 const files=(window.RPX_PHOTO_FILES||[]).filter(Boolean);
 const err=document.getElementById('rpx-photo-error');
 if(files.length!==4){
   if(err){err.textContent='Sila pilih tepat 4 keping gambar sebelum menyimpan laporan.';err.style.display='block';}
   showToast('Sila pilih tepat 4 gambar.','error');
   return;
 }
 if(btn){btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';}
 try{
   const payload=[];
   for(const file of files){payload.push(await rpxFileToPayload(file));}
   const result=rpxData(await server('saveActivityReportWithPhotos',rpxTok(),activityId,payload));
   showToast('Laporan aktiviti berjaya disimpan.','success');
   await loadRpxActivityReportList();
 }catch(e){
   if(btn){btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-cloud-arrow-up"></i> Simpan Laporan';}
   showToast(e.message||String(e),'error');
 }
}

async function openRpxExistingReport(activityId){
 const c=document.getElementById('rpx-report-content'); if(!c)return;
 c.innerHTML='<div class="rpx-card rpx-empty"><i class="fa-solid fa-spinner fa-spin"></i><br>Memuatkan laporan...</div>';
 try{
   const d=rpxData(await server('getActivityReportComposer',rpxTok(),activityId));
   renderRpxExistingReport(d);
 }catch(e){c.innerHTML='<div class="rpx-card rpx-empty">'+rpxEsc(e.message||String(e))+'</div>'}
}

function renderRpxExistingReport(d){
 const a=d.activity||{}, participants=d.participants||[], report=d.report||null, gallery=d.gallery||[];
 const c=document.getElementById('rpx-report-content'); if(!c)return;
 c.innerHTML=`<div class="rpx-report-detail">
   <div class="rpx-report-detail-head">
     <div>
       <button class="back-button" type="button" onclick="loadRpxActivityReportList()"><i class="fa-solid fa-arrow-left"></i> Kembali ke Senarai Aktiviti</button>
       <h1 class="rpx-report-detail-title">${rpxEsc(report?.TAJUK||('Laporan Aktiviti — '+(a.NAMA_AKTIVITI||'')))}</h1>
       <p class="rpx-report-detail-sub">Laporan telah disimpan. Foto dan peserta dipaparkan untuk semakan.</p>
     </div>
     <div class="rpx-actions"><button class="rpx-btn primary" onclick="printRpxActivityReport('${rpxEsc(a.AKTIVITI_ID)}')"><i class="fa-solid fa-print"></i> Cetak Laporan</button></div>
   </div>
   <div class="rpx-detail-grid">
     <div class="rpx-detail-item"><label>Tarikh</label><strong>${rpxDate(a.TARIKH)}</strong></div>
     <div class="rpx-detail-item"><label>Hari</label><strong>${rpxEsc(a.HARI||'-')}</strong></div>
     <div class="rpx-detail-item"><label>Masa</label><strong>${rpxEsc(a.MASA||'-')}</strong></div>
     <div class="rpx-detail-item"><label>Tempat</label><strong>${rpxEsc(a.TEMPAT||'-')}</strong></div>
     <div class="rpx-detail-item"><label>Peringkat</label><strong>${rpxEsc(a.PERINGKAT||'-')}</strong></div>
     <div class="rpx-detail-item"><label>Peserta</label><strong>${participants.length}</strong></div>
   </div>
   <div class="rpx-card"><div class="rpx-toolbar"><div><h3>Objektif Aktiviti</h3></div></div><div class="rpx-copy-box">${rpxEsc(a.OBJEKTIF||'-')}</div></div>
   <div class="rpx-card"><div class="rpx-toolbar"><div><h3>Aktiviti / Pelaksanaan</h3></div></div><div class="rpx-copy-box">${rpxEsc(a.AKTIVITI||'-')}</div></div>
   <div class="rpx-card"><div class="rpx-toolbar"><div><h3>Impak Aktiviti</h3></div></div><div class="rpx-copy-box">${rpxEsc(a.IMPAK||'-')}</div></div>
   <div class="rpx-card"><div class="rpx-toolbar"><div><h3>4 Foto Dokumentasi</h3></div><span class="rpx-pill">${gallery.length} foto</span></div>
     ${gallery.length?`<div class="rpx-photo-upload">${gallery.slice(0,4).map((g,i)=>`<a class="rpx-photo-slot" href="${rpxEsc(g.FILE_URL||'#')}" target="_blank" rel="noopener"><span class="rpx-photo-number">Foto ${i+1}</span><img src="${rpxEsc(rpxPhotoSrc(g))}" alt="${rpxEsc(g.NAMA_FAIL||'Foto')}"></a>`).join('')}</div>`:'<div class="rpx-empty">Tiada foto direkodkan.</div>'}
   </div>
   <div class="rpx-card"><div class="rpx-toolbar"><div><h3>Senarai Peserta Aktiviti</h3></div></div><div class="rpx-table-wrap"><table class="rpx-table"><thead><tr><th>Bil.</th><th>Nama Murid</th><th>NO. KP</th><th>Tingkatan</th><th>Kelas</th><th>Peranan</th></tr></thead><tbody>${participants.map((p,i)=>`<tr><td>${i+1}</td><td><b>${rpxEsc(p.NAMA||'-')}</b></td><td>${rpxEsc(p.NO_KP||'-')}</td><td>${rpxEsc(p.TINGKATAN||'-')}</td><td>${rpxEsc(p.KELAS||'-')}</td><td>${rpxEsc(p.PERANAN||'PESERTA')}</td></tr>`).join('')||'<tr><td colspan="6">Tiada peserta.</td></tr>'}</tbody></table></div></div>
 </div>`;
}

async function printRpxActivityReport(activityId){
 try{
   const d=rpxData(await server('getActivityReportComposer',rpxTok(),activityId));
   const a=d.activity||{}, p=d.participants||[], r=d.report||null, g=(d.gallery||[]).slice(0,4);
   if(!r){showToast('Laporan belum disimpan.','error');return;}

   /* Theme Engine: ambil tema yang disimpan dalam SETTINGS dan logo sekolah. */
   const themePromise=server('getReportTheme',rpxTok());
   const logoPromise=server('getSchoolLogoDataUrl',rpxTok());
   const results=await Promise.all([themePromise,logoPromise]);
   const t=rpxData(results[0])||{};
   const logoData=rpxData(results[1])||{};

   const theme=Object.assign({
     background:'#FFFFFF',accent:'#5B3FD0',text:'#1F2937',border:'#D7DCE8',
     fontFamily:'Arial',titleAlign:'center',titleSize:18,bodySize:10,
     marginTop:36,marginRight:36,marginBottom:36,marginLeft:36,
     sectionSpacing:12,logoWidth:70,lineHeight:1.35,tableStyle:'none',tableBorder:'on',tableHeaderColor:'#FFFFFF',tableHeaderTextColor:'#1F2937',tableCellPadding:5,tableFontSize:9
   },t||{});

   const esc=v=>rpxEsc(v);
   const num=(v,d,min,max)=>{let n=Number(v);if(!isFinite(n))n=d;return Math.max(min,Math.min(max,n));};
   const titleAlign=['left','center','right'].includes(String(theme.titleAlign))?String(theme.titleAlign):'center';
   const font=['Arial','Calibri','Georgia','Times New Roman','Verdana'].includes(String(theme.fontFamily))?String(theme.fontFamily):'Arial';
   const bg=String(theme.background||'#FFFFFF');
   const accent=String(theme.accent||'#5B3FD0');
   const text=String(theme.text||'#1F2937');
   const border=String(theme.border||'#D7DCE8');
   const titleSize=num(theme.titleSize,18,12,32);
   const bodySize=num(theme.bodySize,10,8,18);
   const mt=num(theme.marginTop,36,18,90), mr=num(theme.marginRight,36,18,90), mb=num(theme.marginBottom,36,18,90), ml=num(theme.marginLeft,36,18,90);
   const sectionSpacing=num(theme.sectionSpacing,12,4,40);
   const logoWidth=num(theme.logoWidth,70,30,180);
   const lineHeight=num(theme.lineHeight,1.35,1,2);
   const tableStyle=['none','accent','soft'].includes(String(theme.tableStyle))?String(theme.tableStyle):'none';
   const tableBorder=String(theme.tableBorder)==='off'?'off':'on';
   const tablePadding=num(theme.tableCellPadding,5,2,12);
   const tableFontSize=num(theme.tableFontSize,9,7,16);
   const tableHeadBg=tableStyle==='accent'?accent:(tableStyle==='soft'?'#F1F3F7':'transparent');
   const tableHeadText=tableStyle==='accent'?'#FFFFFF':text;
   const tableBorderCss=tableBorder==='off'?'transparent':border;
   const logoSrc=logoData&&logoData.dataUrl?String(logoData.dataUrl):'';

   const w=window.open('','_blank'); if(!w)return;
   const photos=g.map(x=>`<div class="photo"><img src="${esc(rpxPhotoSrc(x))}" alt="${esc(x.NAMA_FAIL||'Foto')}"></div>`).join('');
   const participantRows=p.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.NAMA||'-')}</td><td>${esc(x.NO_KP||'-')}</td><td>${esc(x.TINGKATAN||'-')}</td><td>${esc(x.KELAS||'-')}</td><td>${esc(x.PERANAN||'PESERTA')}</td></tr>`).join('');
   const logoHtml=logoSrc?`<div class="logo-wrap"><img class="school-logo" src="${esc(logoSrc)}" alt="Logo Sekolah"></div>`:'';

   w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.TAJUK||'Laporan Aktiviti')}</title><style>
   @page{size:A4 portrait;margin:0}
   *{box-sizing:border-box}
   html,body{margin:0;padding:0;background:#f3f4f6}
   body{font-family:${JSON.stringify(font)},sans-serif;color:${text};background:${bg};font-size:${bodySize}px;line-height:${lineHeight};padding:${mt}px ${mr}px ${mb}px ${ml}px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
   .head{text-align:${titleAlign};border-bottom:2px solid ${accent};padding-bottom:${Math.max(6,Math.round(sectionSpacing/1.5))}px}
   .logo-wrap{display:flex;justify-content:${titleAlign};align-items:center;margin-bottom:${Math.max(4,Math.round(sectionSpacing/3))}px}
   .school-logo{width:${logoWidth}px;max-width:100%;height:auto;object-fit:contain;display:block}
   .head .school{font-size:${Math.max(bodySize+3,15)}px;font-weight:800}
   .head .sub{font-size:${Math.max(bodySize-1,9)}px;margin-top:2px}
   .title{font-size:${titleSize}px;font-weight:800;margin:${Math.max(6,Math.round(sectionSpacing*.7))}px 0 2px;text-transform:uppercase;color:${text}}
   .meta{display:grid;grid-template-columns:95px 1fr 95px 1fr;gap:5px 8px;margin-top:${sectionSpacing}px;border:1px solid ${border};padding:8px;background:${bg}}
   .meta b{font-size:${Math.max(bodySize-1,8)}px}
   .meta span{overflow-wrap:anywhere}
   .box{border:1px solid ${border};padding:8px;margin-top:5px;white-space:pre-wrap;background:${bg};line-height:${lineHeight}}
   .section{margin-top:${sectionSpacing}px}
   .section h2{font-size:${Math.max(bodySize+1,11)}px;margin:0 0 4px;text-transform:uppercase;border-bottom:1px solid ${border};padding-bottom:3px;color:${accent}}
   .photos{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:6px}
   .photo{height:125px;border:1px solid ${border};overflow:hidden;background:${bg}}
   .photo img{width:100%;height:100%;object-fit:cover;display:block}
   .participant-table{width:100%;border-collapse:collapse;margin-top:5px}
   .participant-table th,.participant-table td{border:1px solid ${tableBorderCss};padding:${tablePadding}px;font-size:${tableFontSize}px;text-align:left;vertical-align:top;line-height:${lineHeight};background:${bg}}
   .participant-table th{background:${tableHeadBg};color:${tableHeadText}}
   .footer{margin-top:${sectionSpacing}px;font-size:${Math.max(bodySize-2,7)}px;color:${text};border-top:1px solid ${border};padding-top:5px}
   .page2{page-break-before:always}
   @media print{html,body{background:${bg}}.no-print{display:none!important}.page2{page-break-before:always}}
   </style></head><body>
   <div class="head">${logoHtml}<div class="school">${esc(ekAppName())}</div><div class="sub">Sistem Pengurusan Kokurikulum Sekolah</div><div class="title">Laporan Aktiviti Kokurikulum</div></div>
   <div class="meta"><b>Aktiviti</b><span>${esc(a.NAMA_AKTIVITI||'-')}</span><b>Tarikh</b><span>${rpxDate(a.TARIKH)}</span><b>Hari</b><span>${esc(a.HARI||'-')}</span><b>Masa</b><span>${esc(a.MASA||'-')}</span><b>Tempat</b><span>${esc(a.TEMPAT||'-')}</span><b>Peringkat</b><span>${esc(a.PERINGKAT||'-')}</span></div>
   <div class="section"><h2>Objektif</h2><div class="box">${esc(a.OBJEKTIF||'-')}</div></div>
   <div class="section"><h2>Aktiviti / Pelaksanaan</h2><div class="box">${esc(a.AKTIVITI||'-')}</div></div>
   <div class="section"><h2>Impak</h2><div class="box">${esc(a.IMPAK||'-')}</div></div>
   <div class="section"><h2>Dokumentasi Bergambar</h2><div class="photos">${photos||'<div>Tiada foto.</div>'}</div></div>
   <div class="footer">Disediakan melalui ${esc(ekAppName())} · ${new Date().toLocaleString('ms-MY')}</div>
   <div class="page2"><div class="section"><h2>Senarai Peserta Aktiviti</h2><table class="participant-table"><thead><tr><th>Bil.</th><th>Nama Murid</th><th>NO. KP</th><th>Ting.</th><th>Kelas</th><th>Peranan</th></tr></thead><tbody>${participantRows||'<tr><td colspan="6">Tiada peserta.</td></tr>'}</tbody></table></div></div>
   <script>window.onload=function(){window.focus();window.print()}<\/script></body></html>`);
   w.document.close();
 }catch(e){showToast(e.message||String(e),'error')}
}




/* =========================================================
   TETAPAN MASTER FRONTEND
========================================================= */
function tsToken(){return EK && EK.token ? EK.token : '';}
function tsJson(x){try{return typeof x==='string'?JSON.parse(x):x;}catch(e){return x;}}
function tsEsc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function tsGetSettings(rows){const o={};(rows||[]).forEach(function(r){o[String(r.KEY||'').toUpperCase()]=r.VALUE==null?'':r.VALUE;});return o;}
function renderTetapanPage(){
  const target=document.getElementById('page-tetapan');
  if(!target)return;
  const role=EK.user&&EK.user.ROLE?String(EK.user.ROLE).toUpperCase():'';
  if(role!=='ADMIN'){target.innerHTML='<div class="ts-card"><h3>Akses ditolak</h3><p>Menu Tetapan hanya boleh diakses oleh ADMIN.</p></div>';return;}
  target.innerHTML=`
    <div class="ts-wrap">
      <div class="ts-head"><div><h1 class="ts-title">Tetapan Sistem</h1><p class="ts-sub">Urus identiti sistem, paparan, keselamatan dan pengguna ${ekAppName()}.</p></div><div class="ts-pill"><i class="fa-solid fa-shield-halved"></i>&nbsp; ADMIN</div></div>
      <div class="ts-tabs">
        <button class="ts-tab active" type="button" data-ts-tab="system">Sistem</button>
        <button class="ts-tab" type="button" data-ts-tab="appearance">Paparan</button>
        <button class="ts-tab" type="button" data-ts-tab="report-theme"><i class="fa-solid fa-file-lines"></i>&nbsp; Tema Laporan</button>
        <button class="ts-tab" type="button" data-ts-tab="factory-reset"><i class="fa-solid fa-triangle-exclamation"></i>&nbsp; Reset Data</button>
        <button class="ts-tab" type="button" data-ts-tab="security">Keselamatan</button>
        <button class="ts-tab" type="button" data-ts-tab="users">Pengguna</button>
      </div>
      <div class="ts-panel active" data-ts-panel="system">
        <div class="ts-section-title"><div><h2>Konfigurasi Sistem</h2><p>Semua tetapan asas identiti sekolah dan operasi ${ekAppName()} diurus dari sini.</p></div><span class="ts-badge"><i class="fa-solid fa-gear"></i> SISTEM</span></div>
        <div class="ts-grid">
          <div class="ts-card ts-card-wide"><h3>Identiti Sistem & Sekolah</h3><p>Maklumat ini digunakan pada header, halaman dan dokumen yang dijana oleh sistem.</p><div class="ts-row"><div class="ts-field"><label>Nama Sistem *</label><input id="tsAppName" type="text" maxlength="80" placeholder="e-KOSSTA"></div><div class="ts-field"><label>Nama Sekolah *</label><input id="tsSchoolName" type="text" maxlength="150" placeholder="Nama sekolah"></div></div><div class="ts-row"><div class="ts-field"><label>Kod Sekolah</label><input id="tsSchoolCode" type="text" maxlength="30" placeholder="Contoh: JEAxxxx"></div><div class="ts-field"><label>Nama Singkatan</label><input id="tsSchoolShort" type="text" maxlength="50" placeholder="Contoh: STTA"></div></div><div class="ts-row"><div class="ts-field"><label>Telefon Sekolah</label><input id="tsSchoolPhone" type="text" maxlength="30"></div><div class="ts-field"><label>Email Sekolah</label><input id="tsSchoolEmail" type="email" maxlength="120"></div></div><div class="ts-field"><label>Alamat Sekolah</label><textarea id="tsSchoolAddress" rows="3" maxlength="300" placeholder="Alamat penuh sekolah"></textarea></div><div class="ts-field">
  <label>Logo Sekolah</label>
  <div class="ts-logo-box">
    <div class="ts-logo-preview" id="tsLogoPreview">
      <i class="fa-solid fa-school"></i>
    </div>
    <div class="ts-logo-info">
      <strong id="tsLogoFileName">Belum ada logo</strong>
      <small class="ts-help">Logo disimpan dalam Google Drive sistem dan boleh digunakan oleh modul dokumen / Surat Kebenaran.</small>
      <div class="ts-logo-actions">
        <form id="tsLogoForm" class="ts-logo-form">
          <input type="hidden" name="token" id="tsLogoToken">
          <input id="tsLogoFile" name="logoFile" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" hidden>
          <button type="button" class="ts-btn primary small" onclick="document.getElementById('tsLogoFile').click()">
            <i class="fa-solid fa-upload"></i> Pilih & Upload Logo
          </button>
          <button type="button" class="ts-btn danger small" id="tsLogoDeleteBtn" onclick="tsDeleteLogo()" hidden>
            <i class="fa-solid fa-trash"></i> Padam Logo
          </button>
        </form>
      </div>
      <div class="ts-status" id="tsLogoStatus"></div>
    </div>
  </div>
  <input id="tsSchoolLogo" type="hidden" value="">
</div></div>
          <div class="ts-card"><h3>Tahun & Operasi</h3><p>Tetapan asas yang digunakan oleh modul kokurikulum.</p><div class="ts-form"><div class="ts-row"><div class="ts-field"><label>Tahun Sistem *</label><input id="tsCurrentYear" type="number" min="2020" max="2100" step="1"></div><div class="ts-field"><label>Jumlah Minggu Sekolah</label><input id="tsSchoolWeeks" type="number" min="1" max="60" step="1"></div></div><div class="ts-row"><div class="ts-field"><label>Had Muat Naik (MB)</label><input id="tsMaxUpload" type="number" min="1" max="100" step="1"></div><div class="ts-field"><label>Mula Minggu Sekolah</label><select id="tsSystemWeekStart"><option value="MONDAY">Isnin</option><option value="SUNDAY">Ahad</option></select></div></div><div class="ts-field"><label>Status Sistem</label><select id="tsSystemStatusMode"><option value="AKTIF">AKTIF</option><option value="PENYELENGGARAAN">PENYELENGGARAAN</option></select></div><div class="ts-actions"><button class="ts-btn primary" type="button" onclick="tsSaveSystem()"><i class="fa-solid fa-floppy-disk"></i> Simpan Semua Tetapan Sistem</button></div><div id="tsSystemStatus" class="ts-status"></div></div></div>
          <div class="ts-card"><h3>Sesi Semasa</h3><p>Maklumat akaun yang sedang mengurus tetapan.</p><div class="ts-note">ID pengguna: <strong>${tsEsc(EK.user&&EK.user.USER_ID||'-')}</strong><br>Nama: <strong>${tsEsc(EK.user&&EK.user.NAMA||'-')}</strong><br>Email: <strong>${tsEsc(EK.user&&EK.user.EMAIL||'-')}</strong><br>Peranan: <strong>${tsEsc(role)}</strong></div><div class="ts-actions"><button class="ts-btn" type="button" onclick="navigateTo('dashboard')"><i class="fa-solid fa-gauge"></i> Kembali Dashboard</button></div></div>
          <div class="ts-card">
            <h3>Akses Pantas Dashboard</h3>
            <p>Pilih shortcut yang hendak dipaparkan pada Dashboard. Tetapan ini tidak mengubah menu Sidebar atau modul sistem.</p>
            <div id="tsQuickAccessGrid" class="ts-quick-grid">
              <div class="ts-note">Memuatkan tetapan Akses Pantas...</div>
            </div>
            <div class="ts-actions" style="margin-top:14px">
              <button class="ts-btn primary" type="button" onclick="tsSaveQuickAccess()"><i class="fa-solid fa-floppy-disk"></i> Simpan Akses Pantas</button>
              <button class="ts-btn" type="button" onclick="tsResetQuickAccess()">Tetapan Asal</button>
            </div>
            <div id="tsQuickAccessStatus" class="ts-status"></div>
          </div>
        </div>
      </div>
      <div class="ts-panel" data-ts-panel="appearance">
        <div class="ts-grid">
          <div class="ts-card"><h3>Tema</h3><p>Tema aplikasi boleh ditukar antara Light dan Dark.</p><div class="ts-row"><div class="ts-field"><label>Tema Lalai</label><select id="tsTheme"><option value="light">Light</option><option value="dark">Dark</option></select></div><div class="ts-field"><label>Mula Minggu Sekolah</label><select id="tsWeekStart"><option value="MONDAY">Isnin</option><option value="SUNDAY">Ahad</option></select></div></div><div class="ts-actions"><button class="ts-btn primary" type="button" onclick="tsSaveAppearance()"><i class="fa-solid fa-palette"></i> Simpan Paparan</button><button class="ts-btn" type="button" onclick="tsPreviewTheme()">Pratonton Tema</button></div><div id="tsAppearanceStatus" class="ts-status"></div></div>
          <div class="ts-card"><h3>Nota Paparan</h3><p>Perubahan tema disimpan pada pelayar untuk pengalaman pengguna semasa. Tetapan tema lalai disimpan sebagai konfigurasi sistem.</p><div class="ts-check"><input id="tsCompactInfo" type="checkbox" disabled><span>Reka bentuk BENTO dikekalkan sebagai reka bentuk utama sistem.</span></div></div>
        </div>
      </div>
      <div class="ts-panel" data-ts-panel="report-theme">
        <div class="ts-section-title">
          <div>
            <h2>Tema Laporan</h2>
            <p>Tetapkan rupa laporan A4 yang digunakan oleh modul Laporan. Tetapan ini tidak mengubah data laporan.</p>
          </div>
          <span class="ts-badge"><i class="fa-solid fa-palette"></i> LAPORAN</span>
        </div>
        <div class="rte-wrap" style="margin-top:14px">
          <div class="rte-card">
            <h3>Konfigurasi Template</h3>
            <p>Ubah nilai di sebelah kiri dan lihat hasilnya terus pada pratonton A4.</p>
            <div class="rte-grid">
              <div class="rte-field"><label>Latar</label><input id="rteBackground" type="color" value="#FFFFFF"></div>
              <div class="rte-field"><label>Accent</label><input id="rteAccent" type="color" value="#5B3FD0"></div>
              <div class="rte-field"><label>Warna Teks</label><input id="rteText" type="color" value="#1F2937"></div>
              <div class="rte-field"><label>Warna Border</label><input id="rteBorder" type="color" value="#D7DCE8"></div>
              <div class="rte-field"><label>Font</label><select id="rteFont"><option>Arial</option><option>Calibri</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option></select></div>
              <div class="rte-field"><label>Alignment Tajuk</label><select id="rteAlign"><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></div>
              <div class="rte-field"><label>Saiz Tajuk</label><input id="rteTitleSize" type="number" min="12" max="32" step="1" value="18"></div>
              <div class="rte-field"><label>Saiz Isi</label><input id="rteBodySize" type="number" min="8" max="18" step="1" value="10"></div>
              <div class="rte-field"><label>Margin Atas</label><input id="rteMarginTop" type="number" min="18" max="90" value="36"></div>
              <div class="rte-field"><label>Margin Kanan</label><input id="rteMarginRight" type="number" min="18" max="90" value="36"></div>
              <div class="rte-field"><label>Margin Bawah</label><input id="rteMarginBottom" type="number" min="18" max="90" value="36"></div>
              <div class="rte-field"><label>Margin Kiri</label><input id="rteMarginLeft" type="number" min="18" max="90" value="36"></div>
              <div class="rte-field"><label>Jarak Seksyen</label><input id="rteSectionSpacing" type="number" min="4" max="40" value="12"></div>
              <div class="rte-field"><label>Lebar Logo</label><input id="rteLogoWidth" type="number" min="30" max="180" value="70"></div>
              <div class="rte-field"><label>Jarak Baris (Line Spacing)</label><select id="rteLineHeight"><option value="1">1.0 — Rapat</option><option value="1.15">1.15 — Standard</option><option value="1.3">1.3 — Selesa</option><option value="1.5">1.5 — 1.5 Spacing</option><option value="1.75">1.75 — Luas</option><option value="2">2.0 — Double</option></select></div>
              <div class="rte-field"><label>Warna Header Jadual</label><select id="rteTableStyle"><option value="none">Tiada warna</option><option value="accent">Accent</option><option value="soft">Kelabu lembut</option></select></div>
              <div class="rte-field"><label>Border Jadual</label><select id="rteTableBorder"><option value="on">Ada border</option><option value="off">Tiada border</option></select></div>
              <div class="rte-field"><label>Padding Sel Jadual</label><input id="rteTablePadding" type="number" min="2" max="12" step="1" value="5"></div>
              <div class="rte-field"><label>Saiz Teks Jadual</label><input id="rteTableFontSize" type="number" min="7" max="16" step="0.5" value="9"></div>
            </div>
            <div class="rte-actions">
              <button class="rte-btn primary" type="button" onclick="rteSave()"><i class="fa-solid fa-floppy-disk"></i> Simpan Tema</button>
              <button class="rte-btn" type="button" onclick="rteReset()"><i class="fa-solid fa-rotate-left"></i> Tetapan Asal</button>
              <button class="rte-btn" type="button" onclick="rteLoad()"><i class="fa-solid fa-rotate"></i> Muat Semula</button>
            </div>
            <div id="rteStatus" class="rte-status"></div>
          </div>
          <div class="rte-card">
            <h3>Pratonton A4</h3>
            <p>Pratonton ini menunjukkan gaya asas template laporan. Data sebenar laporan kekal seperti biasa.</p>
            <div class="rte-preview-shell">
              <div id="rteA4" class="rte-a4">
                <div id="rteA4Inner" class="rte-a4-inner">
                  <img id="rteLogo" class="rte-preview-logo" alt="Logo sekolah" style="display:none">
                  <h2 id="rtePreviewTitle" class="rte-preview-title">LAPORAN AKTIVITI</h2>
                  <div id="rtePreviewLine" class="rte-preview-line"></div>
                  <div class="rte-preview-section"><h4>Nama Aktiviti</h4><p id="rtePreviewActivity">Mesyuarat Agong Rumah Sukan</p></div>
                  <div class="rte-preview-section"><h4>Objektif</h4><p>Memberi peluang kepada murid melibatkan diri secara aktif dalam aktiviti kokurikulum sekolah.</p></div>
                  <div class="rte-preview-section"><h4>Aktiviti / Pelaksanaan</h4><p>Aktiviti dilaksanakan mengikut perancangan dan penglibatan peserta direkodkan dalam sistem.</p></div>
                  <div class="rte-preview-section"><h4>Impak Aktiviti</h4><p>Meningkatkan penglibatan, kerjasama dan pengalaman murid dalam aktiviti kokurikulum.</p></div>
                  <table class="rte-preview-table"><thead><tr><th>Bil.</th><th>Peserta</th><th>Peranan</th></tr></thead><tbody><tr><td>1</td><td>Contoh Murid</td><td>Peserta</td></tr><tr><td>2</td><td>Contoh Murid</td><td>AJK</td></tr></tbody></table>
                  <div class="rte-mini">Pratonton template • ${ekAppName()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="ts-panel" data-ts-panel="factory-reset">
        <div class="ts-section-title">
          <div>
            <h2>Factory Reset Data</h2>
            <p>Fungsi keselamatan untuk ADMIN membersihkan data operasi yang tersalah isi tanpa menyentuh data master dan konfigurasi sistem.</p>
          </div>
          <span class="ts-badge ts-danger-badge"><i class="fa-solid fa-triangle-exclamation"></i> ADMIN SAHAJA</span>
        </div>

        <div class="fr-warning">
          <div class="fr-warning-icon"><i class="fa-solid fa-shield-halved"></i></div>
          <div>
            <strong>Amaran penting</strong>
            <p>Reset ini tidak boleh dibatalkan. Header sheet dikekalkan. Fail dalam Google Drive juga <b>tidak dipadam</b>. Sebelum reset data sebenar, pastikan backup telah dibuat.</p>
          </div>
        </div>

        <div class="fr-grid">
          <div class="ts-card fr-card">
            <div class="fr-card-head"><div><h3>Data Murid & Rekod Berkaitan</h3><p>Murid, sejarah, penempatan, AJK, kehadiran, peserta, pencapaian, PAJSK dan rekod surat.</p></div><span id="frStudentCount" class="fr-count">0</span></div>
            <div id="frStudentBreakdown" class="fr-breakdown">Memuatkan...</div>
            <button class="ts-btn danger" type="button" onclick="frReset('STUDENT')"><i class="fa-solid fa-user-xmark"></i> Reset Data Murid</button>
          </div>

          <div class="ts-card fr-card">
            <div class="fr-card-head"><div><h3>Aktiviti & Laporan</h3><p>Aktiviti, peserta aktiviti, pencapaian, laporan, galeri, surat dan kalendar.</p></div><span id="frActivityCount" class="fr-count">0</span></div>
            <div id="frActivityBreakdown" class="fr-breakdown">Memuatkan...</div>
            <button class="ts-btn danger" type="button" onclick="frReset('ACTIVITY')"><i class="fa-solid fa-calendar-xmark"></i> Reset Aktiviti & Laporan</button>
          </div>

          <div class="ts-card fr-card fr-card-wide">
            <div class="fr-card-head"><div><h3>Factory Reset — Semua Data Operasi</h3><p>Membersihkan semua data operasi yang boleh diisi semula. Data master dan keselamatan sistem kekal.</p></div><span id="frAllCount" class="fr-count danger">0</span></div>
            <div id="frAllBreakdown" class="fr-breakdown">Memuatkan...</div>
            <button class="ts-btn danger fr-big-reset" type="button" onclick="frReset('ALL_OPERATIONAL')"><i class="fa-solid fa-power-off"></i> FACTORY RESET SEMUA DATA OPERASI</button>
          </div>

          <div class="ts-card fr-card fr-protected fr-card-wide">
            <h3><i class="fa-solid fa-lock"></i> Data Yang TIDAK BOLEH Dipadam</h3>
            <p>Factory Reset sengaja melindungi data berikut:</p>
            <div class="fr-protected-list">
              <span>SETTINGS</span><span>USERS</span><span>GURU</span><span>UNIT</span><span>PAJSK_CONFIG</span><span>IMPORT_LOG</span><span>AUDIT_LOG</span>
            </div>
            <div class="fr-note">Ini memastikan konfigurasi sistem, akaun pengguna, master guru/unit, sejarah import dan jejak audit tidak hilang.</div>
          </div>
        </div>

        <div class="ts-card fr-confirm-card">
          <h3>Pengesahan Reset</h3>
          <p>Ayat pengesahan ini boleh ditetapkan sendiri oleh ADMIN. Semasa reset, ADMIN mesti menaip ayat yang dipaparkan dengan tepat.</p>
          <div class="fr-confirm-config">
            <div class="ts-field">
              <label>Ayat Pengesahan Factory Reset</label>
              <input id="frConfirmationPhrase" class="ts-input" type="text" maxlength="160" autocomplete="off" placeholder="SAYA FAHAM DAN SETUJU UNTUK MEMADAM DATA">
              <small id="frPhraseHint" class="fr-phrase-hint">Memuatkan ayat pengesahan...</small>
            </div>
            <div class="ts-actions" style="margin-top:10px">
              <button class="ts-btn primary" type="button" onclick="frSaveConfirmationPhrase()"><i class="fa-solid fa-floppy-disk"></i> Simpan Ayat</button>
              <button class="ts-btn" type="button" onclick="frResetConfirmationPhrase()"><i class="fa-solid fa-rotate-left"></i> Guna Ayat Lalai</button>
            </div>
          </div>
          <div class="fr-confirm-divider"></div>
          <p>Untuk menjalankan reset, taip tepat ayat pengesahan yang ditetapkan:</p>
          <div class="fr-confirm-target" id="frConfirmationTarget">Memuatkan...</div>
          <div class="fr-confirm-row">
            <input id="frConfirmation" class="ts-input" type="text" autocomplete="off" placeholder="Taip ayat pengesahan di sini">
            <button class="ts-btn" type="button" onclick="frLoadStatus()"><i class="fa-solid fa-arrows-rotate"></i> Semak Data</button>
          </div>
          <div id="frStatus" class="ts-status"></div>
        </div>
      </div>
      <div class="ts-panel" data-ts-panel="security">
        <div class="ts-grid">
          <div class="ts-card"><h3>Tukar Kata Laluan Saya</h3><p>Gunakan kata laluan minimum 8 aksara.</p><div class="ts-form"><div class="ts-field"><label>Kata Laluan Lama</label><input id="tsOldPass" type="password" autocomplete="current-password"></div><div class="ts-field"><label>Kata Laluan Baharu</label><input id="tsNewPass" type="password" autocomplete="new-password"></div><div class="ts-field"><label>Sahkan Kata Laluan Baharu</label><input id="tsConfirmPass" type="password" autocomplete="new-password"></div><div class="ts-actions"><button class="ts-btn primary" type="button" onclick="tsChangePassword()"><i class="fa-solid fa-key"></i> Tukar Kata Laluan</button></div><div id="tsPasswordStatus" class="ts-status"></div></div></div>
          <div class="ts-card"><h3>Keselamatan Akaun</h3><p>Pengurusan kata laluan pengguna dilakukan melalui tab Pengguna.</p><div class="ts-note">Jangan kongsi kata laluan admin. Untuk pengguna baharu, gunakan ID pengguna yang unik dan kata laluan sekurang-kurangnya 8 aksara.</div><div class="ts-actions"><button class="ts-btn danger" type="button" onclick="tsResetAdminPassword()">Reset Password Admin</button></div><div class="ts-status">Fungsi reset menggunakan mekanisme backend sedia ada.</div></div>
        </div>
      </div>
      <div class="ts-panel" data-ts-panel="users">
        <div class="ts-grid">
          <div class="ts-card"><h3>Tambah / Kemaskini Pengguna</h3><p>Admin boleh mengurus pengguna dan peranan.</p><div class="ts-form"><div class="ts-row"><div class="ts-field"><label>ID Pengguna</label><input id="tsUserId" type="text"></div><div class="ts-field"><label>Nama</label><input id="tsUserName" type="text"></div></div><div class="ts-row"><div class="ts-field"><label>Email</label><input id="tsUserEmail" type="email"></div><div class="ts-field"><label>Role</label><select id="tsUserRole"><option value="GURU">GURU</option><option value="ADMIN">ADMIN</option></select></div></div><div class="ts-row"><div class="ts-field"><label>Status</label><select id="tsUserStatus"><option value="AKTIF">AKTIF</option><option value="TIDAK AKTIF">TIDAK AKTIF</option></select></div><div class="ts-field"><label>Kata Laluan <span style="font-weight:400">(wajib pengguna baharu)</span></label><input id="tsUserPass" type="password"></div></div><div class="ts-actions"><button class="ts-btn primary" type="button" onclick="tsSaveUser()"><i class="fa-solid fa-user-plus"></i> Simpan Pengguna</button><button class="ts-btn" type="button" onclick="tsClearUserForm()">Kosongkan</button></div><div id="tsUserStatusMsg" class="ts-status"></div></div></div>
          <div class="ts-card"><h3>Senarai Pengguna</h3><p>Pengguna yang didaftarkan dalam sistem.</p><div class="ts-table-wrap"><table class="ts-table"><thead><tr><th>ID</th><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Tindakan</th></tr></thead><tbody id="tsUsersBody"><tr><td colspan="6">Memuatkan...</td></tr></tbody></table></div></div>
        </div>
      </div>
    </div>`;
  document.querySelectorAll('[data-ts-tab]').forEach(function(btn){btn.addEventListener('click',function(){const tab=btn.dataset.tsTab;document.querySelectorAll('[data-ts-tab]').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('[data-ts-panel]').forEach(x=>x.classList.toggle('active',x.dataset.tsPanel===tab));if(tab==='users')tsLoadUsers();if(tab==='report-theme')rteLoad();});});
  tsLoadSettings();
  document.querySelectorAll('#page-tetapan #rteBackground,#page-tetapan #rteAccent,#page-tetapan #rteText,#page-tetapan #rteBorder,#page-tetapan #rteFont,#page-tetapan #rteAlign,#page-tetapan #rteTitleSize,#page-tetapan #rteBodySize,#page-tetapan #rteMarginTop,#page-tetapan #rteMarginRight,#page-tetapan #rteMarginBottom,#page-tetapan #rteMarginLeft,#page-tetapan #rteSectionSpacing,#page-tetapan #rteLogoWidth,#page-tetapan #rteLineHeight,#page-tetapan #rteTableStyle,#page-tetapan #rteTableBorder,#page-tetapan #rteTablePadding,#page-tetapan #rteTableFontSize').forEach(function(e){e.addEventListener('input',rtePreview);e.addEventListener('change',rtePreview);});
  const logoInput=document.getElementById('tsLogoFile');
  if(logoInput){
    logoInput.addEventListener('change',function(){
      if(this.files&&this.files[0]) tsUploadLogo();
    });
  }
}

/* =========================================================
   REPORT THEME ENGINE — FRONTEND
========================================================= */
let RTE_THEME = null;
let RTE_LOGO_DATA = '';

function rteDefault(){
  return {background:'#FFFFFF',accent:'#5B3FD0',text:'#1F2937',border:'#D7DCE8',fontFamily:'Arial',titleAlign:'center',titleSize:18,bodySize:10,marginTop:36,marginRight:36,marginBottom:36,marginLeft:36,sectionSpacing:12,logoWidth:70,lineHeight:1.35,tableStyle:'none',tableBorder:'on',tableHeaderColor:'#FFFFFF',tableHeaderTextColor:'#1F2937',tableCellPadding:5,tableFontSize:9};
}
function rteNum(v,d,min,max){var n=Number(v);if(!isFinite(n))n=d;return Math.max(min,Math.min(max,n));}
function rteThemeFromForm(){
  return {
    background:document.getElementById('rteBackground').value,
    accent:document.getElementById('rteAccent').value,
    text:document.getElementById('rteText').value,
    border:document.getElementById('rteBorder').value,
    fontFamily:document.getElementById('rteFont').value,
    titleAlign:document.getElementById('rteAlign').value,
    titleSize:rteNum(document.getElementById('rteTitleSize').value,18,12,32),
    bodySize:rteNum(document.getElementById('rteBodySize').value,10,8,18),
    marginTop:rteNum(document.getElementById('rteMarginTop').value,36,18,90),
    marginRight:rteNum(document.getElementById('rteMarginRight').value,36,18,90),
    marginBottom:rteNum(document.getElementById('rteMarginBottom').value,36,18,90),
    marginLeft:rteNum(document.getElementById('rteMarginLeft').value,36,18,90),
    sectionSpacing:rteNum(document.getElementById('rteSectionSpacing').value,12,4,40),
    logoWidth:rteNum(document.getElementById('rteLogoWidth').value,70,30,180),
    lineHeight:rteNum(document.getElementById('rteLineHeight').value,1.35,1,2),
    tableStyle:document.getElementById('rteTableStyle').value,
    tableBorder:document.getElementById('rteTableBorder').value,
    tableHeaderColor:'#FFFFFF',
    tableHeaderTextColor:'#1F2937',
    tableCellPadding:rteNum(document.getElementById('rteTablePadding').value,5,2,12),
    tableFontSize:rteNum(document.getElementById('rteTableFontSize').value,9,7,16)
  };
}
function rteSetForm(t){
  t=Object.assign(rteDefault(),t||{});
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
  set('rteBackground',t.background);set('rteAccent',t.accent);set('rteText',t.text);set('rteBorder',t.border);
  set('rteFont',t.fontFamily);set('rteAlign',t.titleAlign);set('rteTitleSize',t.titleSize);set('rteBodySize',t.bodySize);
  set('rteMarginTop',t.marginTop);set('rteMarginRight',t.marginRight);set('rteMarginBottom',t.marginBottom);set('rteMarginLeft',t.marginLeft);
  set('rteSectionSpacing',t.sectionSpacing);set('rteLogoWidth',t.logoWidth);set('rteLineHeight',t.lineHeight);set('rteTableStyle',t.tableStyle||'none');set('rteTableBorder',t.tableBorder||'on');set('rteTablePadding',t.tableCellPadding||5);set('rteTableFontSize',t.tableFontSize||9);
  RTE_THEME=t;rtePreview();
}
function rtePreview(){
  const t=rteThemeFromForm();
  const a4=document.getElementById('rteA4'), inner=document.getElementById('rteA4Inner'), title=document.getElementById('rtePreviewTitle'), line=document.getElementById('rtePreviewLine'), logo=document.getElementById('rteLogo');
  if(!a4||!inner)return;
  a4.style.background=t.background;a4.style.color=t.text;a4.style.fontFamily=t.fontFamily;
  inner.style.padding=t.marginTop+'px '+t.marginRight+'px '+t.marginBottom+'px '+t.marginLeft+'px';
  inner.style.lineHeight=t.lineHeight;
  inner.style.fontSize=t.bodySize+'px';
  title.style.fontFamily=t.fontFamily;title.style.fontSize=t.titleSize+'px';title.style.textAlign=t.titleAlign;color=t.text;
  line.style.background=t.accent;
  document.querySelectorAll('#rteA4 .rte-preview-section h4').forEach(e=>{e.style.color=t.accent;e.style.marginBottom=(t.sectionSpacing/2)+'px';});
  document.querySelectorAll('#rteA4 .rte-preview-section').forEach(e=>{e.style.marginTop=t.sectionSpacing+'px';});
  const table=document.querySelector('#rteA4 .rte-preview-table');
  if(table){
    table.style.borderCollapse='collapse';
    table.querySelectorAll('th,td').forEach(e=>{e.style.borderColor=t.tableBorder==='off'?'transparent':t.border;e.style.borderWidth=t.tableBorder==='off'?'0':'1px';e.style.padding=t.tableCellPadding+'px';e.style.fontSize=t.tableFontSize+'px';e.style.lineHeight=t.lineHeight;});
    table.querySelectorAll('th').forEach(e=>{e.style.background=t.tableStyle==='accent'?t.accent:(t.tableStyle==='soft'?'#F1F3F7':'transparent');e.style.color=t.tableStyle==='accent'?'#FFFFFF':t.text;});
  }
  line.style.marginBottom=t.sectionSpacing+'px';
  logo.style.maxWidth=t.logoWidth+'px';
  if(RTE_LOGO_DATA){logo.src=RTE_LOGO_DATA;logo.style.display='block';}else{logo.style.display='none';}
}
async function rteLoadLogo(){
  try{
    const d=tsJson(await server('getSchoolLogoDataUrl',tsToken()))||{};
    RTE_LOGO_DATA=d.dataUrl||'';
    rtePreview();
  }catch(e){RTE_LOGO_DATA='';rtePreview();}
}
async function rteLoad(){
  const status=document.getElementById('rteStatus');
  if(status)status.textContent='Memuatkan tema laporan...';
  try{
    const t=tsJson(await server('getReportTheme',tsToken()))||rteDefault();
    rteSetForm(t);
    await rteLoadLogo();
    if(status)status.textContent='Tema laporan semasa telah dimuatkan.';
  }catch(e){
    rteSetForm(rteDefault());
    if(status)status.textContent=e.message||String(e);
  }
}
async function rteSave(){
  const status=document.getElementById('rteStatus'), btn=document.querySelector('[onclick="rteSave()"]');
  try{
    if(btn)btn.disabled=true;
    const t=rteThemeFromForm();
    const saved=tsJson(await server('saveReportTheme',tsToken(),t))||t;
    rteSetForm(saved);
    if(status)status.textContent='Tema laporan berjaya disimpan.';
    showToast('Tema laporan berjaya disimpan.','success');
  }catch(e){
    if(status)status.textContent=e.message||String(e);
    showToast(e.message||String(e),'error');
  }finally{if(btn)btn.disabled=false;}
}
async function rteReset(){
  if(!confirm('Tetapkan semula tema laporan kepada tetapan asal?'))return;
  const status=document.getElementById('rteStatus');
  try{
    const t=tsJson(await server('resetReportTheme',tsToken()))||rteDefault();
    rteSetForm(t);await rteLoadLogo();
    if(status)status.textContent='Tema laporan telah dikembalikan kepada tetapan asal.';
    showToast('Tema laporan ditetapkan semula.','success');
  }catch(e){if(status)status.textContent=e.message||String(e);showToast(e.message||String(e),'error');}
}

async function tsLoadSettings(){try{const rows=tsJson(await server('getSettings',tsToken()))||[];const s=tsGetSettings(rows);applyAppNameFromSettings(s);const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v==null?'':v;};set('tsAppName',s.APP_NAME||'e-KOSSTA');set('tsSchoolName',s.SCHOOL_NAME||'');set('tsSchoolCode',s.SCHOOL_CODE||'');set('tsSchoolShort',s.SCHOOL_SHORT||'');set('tsSchoolPhone',s.SCHOOL_PHONE||'');set('tsSchoolEmail',s.SCHOOL_EMAIL||'');set('tsSchoolAddress',s.SCHOOL_ADDRESS||'');set('tsSchoolLogo',s.SCHOOL_LOGO||'');tsLoadSchoolLogo();set('tsCurrentYear',s.CURRENT_YEAR||new Date().getFullYear());set('tsSchoolWeeks',s.SCHOOL_WEEKS||42);set('tsMaxUpload',s.MAX_UPLOAD_MB||10);set('tsSystemWeekStart',s.WEEK_START||'MONDAY');set('tsSystemStatusMode',s.SYSTEM_STATUS||'AKTIF');tsLoadQuickAccess();const th=document.getElementById('tsTheme'),ws=document.getElementById('tsWeekStart');if(th)th.value=(s.THEME==='dark'?'dark':'light');if(ws)ws.value=s.WEEK_START||'MONDAY';}catch(e){showToast(e.message||String(e),'error');}}
const TS_QUICK_OPTIONS=[
  {key:'murid',label:'Murid',desc:'Pengurusan data murid',icon:'fa-users'},
  {key:'guru',label:'Guru',desc:'Pengurusan data guru',icon:'fa-user-tie'},
  {key:'unit',label:'Unit',desc:'Unit kokurikulum',icon:'fa-layer-group'},
  {key:'kehadiran',label:'Kehadiran',desc:'Rekod kehadiran',icon:'fa-calendar-check'},
  {key:'aktiviti',label:'Aktiviti',desc:'Aktiviti & acara',icon:'fa-calendar-days'},
  {key:'pencapaian',label:'Pencapaian',desc:'Rekod pencapaian',icon:'fa-trophy'},
  {key:'laporan',label:'Laporan',desc:'Laporan aktiviti',icon:'fa-file-lines'}
];
const TS_QUICK_DEFAULTS=TS_QUICK_OPTIONS.map(function(x){return x.key;});
function tsRenderQuickAccessSettings(keys){
  const box=document.getElementById('tsQuickAccessGrid');
  if(!box)return;
  const active=new Set(Array.isArray(keys)&&keys.length?keys:TS_QUICK_DEFAULTS);
  box.innerHTML=TS_QUICK_OPTIONS.map(function(opt){
    const checked=active.has(opt.key);
    return '<label class="ts-quick-option '+(checked?'':'off')+'">'+
      '<input type="checkbox" class="ts-quick-check" value="'+tsEsc(opt.key)+'" '+(checked?'checked':'')+' onchange="this.closest(\'.ts-quick-option\').classList.toggle(\'off\',!this.checked)">'+
      '<span class="ts-q-icon"><i class="fa-solid '+tsEsc(opt.icon)+'"></i></span>'+
      '<span><strong>'+tsEsc(opt.label)+'</strong><small>'+tsEsc(opt.desc)+'</small></span></label>';
  }).join('');
}
async function tsLoadQuickAccess(){
  try{
    const keys=tsJson(await server('getDashboardQuickAccess',tsToken()));
    tsRenderQuickAccessSettings(Array.isArray(keys)&&keys.length?keys:TS_QUICK_DEFAULTS);
  }catch(e){
    tsRenderQuickAccessSettings(TS_QUICK_DEFAULTS);
    const st=document.getElementById('tsQuickAccessStatus');
    if(st)st.textContent='Tetapan Akses Pantas belum disimpan. Sistem menggunakan tetapan asal.';
  }
}
async function tsSaveQuickAccess(){
  const st=document.getElementById('tsQuickAccessStatus');
  try{
    const keys=Array.from(document.querySelectorAll('.ts-quick-check:checked')).map(function(el){return el.value;});
    if(!keys.length)throw new Error('Pilih sekurang-kurangnya satu shortcut.');
    await server('saveDashboardQuickAccess',tsToken(),keys);
    tsRenderQuickAccessSettings(keys);
    applyDashboardQuickAccess(keys);
    loadDashboardQuickAccess();
    if(st)st.textContent='Akses Pantas Dashboard berjaya disimpan.';
    showToast('Akses Pantas Dashboard disimpan.','success');
  }catch(e){
    if(st)st.textContent=e.message||String(e);
    showToast(e.message||String(e),'error');
  }
}
function tsResetQuickAccess(){
  tsRenderQuickAccessSettings(TS_QUICK_DEFAULTS);
  const st=document.getElementById('tsQuickAccessStatus');
  if(st)st.textContent='Tetapan asal dipilih. Klik Simpan Akses Pantas untuk menyimpannya.';
}
function applyDashboardQuickAccess(keys){
  const active=new Set(Array.isArray(keys)&&keys.length?keys:TS_QUICK_DEFAULTS);
  document.querySelectorAll('.quick-item[data-quick-key]').forEach(function(item){
    const show=active.has(String(item.dataset.quickKey||''));
    item.hidden=!show;
    item.style.display=show?'':'none';
  });
}
function loadDashboardQuickAccess(){
  const token=EK&&EK.token?EK.token:'';
  if(!token){applyDashboardQuickAccess(TS_QUICK_DEFAULTS);return;}
  server('getDashboardQuickAccess',token).then(function(keys){applyDashboardQuickAccess(tsJson(keys));}).catch(function(){applyDashboardQuickAccess(TS_QUICK_DEFAULTS);});
}

async function loadSidebarSchoolLogo(){
  const box=document.getElementById('sidebarSchoolLogo');
  if(!box)return;
  try{
    const data=tsJson(await server('getSchoolLogoDataUrl',tsToken()))||{};
    if(data.exists && data.dataUrl){
      box.innerHTML='<img src="'+tsEsc(data.dataUrl)+'" alt="Logo Sekolah">';
    }else{
      box.innerHTML='<i class="fa-solid fa-school"></i>';
    }
  }catch(e){
    box.innerHTML='<i class="fa-solid fa-school"></i>';
    console.warn('LOGO SIDEBAR:',e);
  }
}

async function tsLoadSchoolLogo(){
  const status=document.getElementById('tsLogoStatus');
  try{
    const data=tsJson(await server('getSchoolLogo',tsToken()))||{};
    const preview=document.getElementById('tsLogoPreview');
    const name=document.getElementById('tsLogoFileName');
    const del=document.getElementById('tsLogoDeleteBtn');
    const urlInput=document.getElementById('tsSchoolLogo');
    if(data.exists && data.fileUrl){
      if(preview) preview.innerHTML='<img src="'+tsEsc(data.fileUrl)+'" alt="Logo Sekolah">';
      if(name) name.textContent=data.fileName||'Logo Sekolah';
      if(del) del.hidden=false;
      if(urlInput) urlInput.value=data.fileUrl||'';
      if(status) status.textContent='Logo sekolah telah disimpan dalam sistem.';
    }else{
      if(preview) preview.innerHTML='<i class="fa-solid fa-school"></i>';
      if(name) name.textContent='Belum ada logo';
      if(del) del.hidden=true;
      if(urlInput) urlInput.value='';
      if(status) status.textContent='Belum ada logo sekolah.';
    }
  }catch(e){
    if(status) status.textContent=e.message||String(e);
  }
}

function tsUploadLogo(){
  const input=document.getElementById('tsLogoFile');
  const form=document.getElementById('tsLogoForm');
  const status=document.getElementById('tsLogoStatus');
  const tokenInput=document.getElementById('tsLogoToken');
  if(!input||!form)return;
  if(!input.files||!input.files[0])return;
  const file=input.files[0];
  if(file.size>5*1024*1024){
    if(status)status.textContent='Saiz logo terlalu besar. Maksimum 5MB.';
    input.value='';
    return;
  }
  const allowed=['image/png','image/jpeg','image/jpg','image/webp'];
  if(allowed.indexOf((file.type||'').toLowerCase())<0){
    if(status)status.textContent='Format tidak disokong. Gunakan PNG, JPG, JPEG atau WEBP.';
    input.value='';
    return;
  }
  if(tokenInput) tokenInput.value=tsToken();
  if(status)status.textContent='Sedang memuat naik logo...';
  input.disabled=true;
  google.script.run
    .withSuccessHandler(function(result){
      input.disabled=false;
      input.value='';
      const data=tsJson(result)||{};
      if(status)status.textContent='Logo sekolah berjaya dimuat naik.';
      tsLoadSchoolLogo();
      showToast('Logo sekolah berjaya dimuat naik.','success');
    })
    .withFailureHandler(function(error){
      input.disabled=false;
      input.value='';
      const msg=error&&error.message?error.message:String(error);
      if(status)status.textContent=msg;
      showToast(msg,'error');
    })
    .uploadSchoolLogo(form);
}

async function tsDeleteLogo(){
  if(!confirm('Padam logo sekolah yang sedang digunakan?'))return;
  const status=document.getElementById('tsLogoStatus');
  try{
    await server('deleteSchoolLogo',tsToken());
    await tsLoadSchoolLogo();
    if(status)status.textContent='Logo sekolah telah dipadam.';
    showToast('Logo sekolah dipadam.','success');
  }catch(e){
    if(status)status.textContent=e.message||String(e);
    showToast(e.message||String(e),'error');
  }
}

async function tsSaveSystem(){try{const val=id=>{const e=document.getElementById(id);return e?e.value.trim():'';};const data={APP_NAME:val('tsAppName'),SCHOOL_NAME:val('tsSchoolName'),SCHOOL_CODE:val('tsSchoolCode'),SCHOOL_SHORT:val('tsSchoolShort'),SCHOOL_PHONE:val('tsSchoolPhone'),SCHOOL_EMAIL:val('tsSchoolEmail'),SCHOOL_ADDRESS:val('tsSchoolAddress'),SCHOOL_LOGO:val('tsSchoolLogo'),CURRENT_YEAR:val('tsCurrentYear'),SCHOOL_WEEKS:val('tsSchoolWeeks'),MAX_UPLOAD_MB:val('tsMaxUpload'),WEEK_START:document.getElementById('tsSystemWeekStart').value,SYSTEM_STATUS:document.getElementById('tsSystemStatusMode').value};if(!data.APP_NAME||!data.SCHOOL_NAME)throw new Error('Nama sistem dan nama sekolah wajib diisi.');await server('saveSettings',tsToken(),data);applyAppNameFromSettings({APP_NAME:data.APP_NAME});document.getElementById('tsSystemStatus').textContent='Semua tetapan sistem berjaya disimpan.';showToast('Semua tetapan sistem disimpan.','success');}catch(e){document.getElementById('tsSystemStatus').textContent=e.message||String(e);showToast(e.message||String(e),'error');}}
async function tsSaveAppearance(){try{const theme=document.getElementById('tsTheme').value;const week=document.getElementById('tsWeekStart').value;await server('saveSettings',tsToken(),{THEME:theme,WEEK_START:week});localStorage.setItem('ekossta_theme',theme);EK.theme=theme;document.documentElement.classList.toggle('dark-mode-active',theme==='dark');updateThemeIcon();document.getElementById('tsAppearanceStatus').textContent='Tetapan paparan berjaya disimpan.';showToast('Tetapan paparan disimpan.','success');}catch(e){document.getElementById('tsAppearanceStatus').textContent=e.message||String(e);showToast(e.message||String(e),'error');}}
function tsPreviewTheme(){const next=document.getElementById('tsTheme').value==='dark'?'light':'dark';document.getElementById('tsTheme').value=next;document.documentElement.classList.toggle('dark-mode-active',next==='dark');EK.theme=next;updateThemeIcon();}
async function tsChangePassword(){try{const oldP=document.getElementById('tsOldPass').value,newP=document.getElementById('tsNewPass').value,con=document.getElementById('tsConfirmPass').value;if(newP!==con)throw new Error('Pengesahan kata laluan tidak sepadan.');await server('changePassword',tsToken(),oldP,newP);['tsOldPass','tsNewPass','tsConfirmPass'].forEach(id=>document.getElementById(id).value='');document.getElementById('tsPasswordStatus').textContent='Kata laluan berjaya ditukar.';showToast('Kata laluan berjaya ditukar.','success');}catch(e){document.getElementById('tsPasswordStatus').textContent=e.message||String(e);showToast(e.message||String(e),'error');}}
async function tsResetAdminPassword(){if(!confirm('Reset kata laluan admin kepada kata laluan lalai backend?'))return;try{await server('resetAdminPassword');showToast('Kata laluan admin telah direset mengikut fungsi backend sedia ada.','success');}catch(e){showToast(e.message||String(e),'error');}}
async function tsLoadUsers(){const body=document.getElementById('tsUsersBody');if(!body)return;try{const rows=tsJson(await server('listUsers',tsToken()))||[];if(!rows.length){body.innerHTML='<tr><td colspan="6">Tiada pengguna.</td></tr>';return;}body.innerHTML=rows.map(function(u){const status=String(u.STATUS||'').toUpperCase();return `<tr><td><strong>${tsEsc(u.USER_ID)}</strong></td><td>${tsEsc(u.NAMA)}</td><td>${tsEsc(u.EMAIL||'-')}</td><td>${tsEsc(u.ROLE||'-')}</td><td><span class="ts-pill ${status==='AKTIF'?'ok':'off'}">${tsEsc(status||'-')}</span></td><td><button class="ts-btn small" type="button" onclick='tsEditUser(${JSON.stringify(u).replace(/'/g,"&#39;")})'>Edit</button></td></tr>`;}).join('');}catch(e){body.innerHTML=`<tr><td colspan="6">${tsEsc(e.message||String(e))}</td></tr>`;}}
function tsEditUser(u){document.getElementById('tsUserId').value=u.USER_ID||'';document.getElementById('tsUserId').readOnly=true;document.getElementById('tsUserName').value=u.NAMA||'';document.getElementById('tsUserEmail').value=u.EMAIL||'';document.getElementById('tsUserRole').value=u.ROLE||'GURU';document.getElementById('tsUserStatus').value=u.STATUS||'AKTIF';document.getElementById('tsUserPass').value='';document.getElementById('tsUserStatusMsg').textContent='Mod kemaskini: '+(u.USER_ID||'');}
function tsClearUserForm(){['tsUserId','tsUserName','tsUserEmail','tsUserPass'].forEach(id=>document.getElementById(id).value='');document.getElementById('tsUserId').readOnly=false;document.getElementById('tsUserRole').value='GURU';document.getElementById('tsUserStatus').value='AKTIF';document.getElementById('tsUserStatusMsg').textContent='';}
async function tsSaveUser(){try{const data={USER_ID:document.getElementById('tsUserId').value.trim(),NAMA:document.getElementById('tsUserName').value.trim(),EMAIL:document.getElementById('tsUserEmail').value.trim(),ROLE:document.getElementById('tsUserRole').value,STATUS:document.getElementById('tsUserStatus').value,PASSWORD:document.getElementById('tsUserPass').value};if(!data.USER_ID||!data.NAMA)throw new Error('ID pengguna dan nama wajib.');await server('saveUser',tsToken(),data);document.getElementById('tsUserStatusMsg').textContent='Pengguna berjaya disimpan.';showToast('Pengguna berjaya disimpan.','success');tsClearUserForm();tsLoadUsers();}catch(e){document.getElementById('tsUserStatusMsg').textContent=e.message||String(e);showToast(e.message||String(e),'error');}}



/* SISTEM MASTER FRONTEND — IMPORT / BACKUP / AUDIT */
let SYX_IMPORT_ROWS=[],SYX_IMPORT_HEADERS=[],SYX_IMPORT_FILE='',SYX_BACKUPS=[],SYX_AUDIT=[];
function syxTok(){return typeof getMuridSessionToken==='function'?getMuridSessionToken():(window.EK&&EK.token)||'';}
function syxJson(v){try{return typeof v==='string'?JSON.parse(v):v;}catch(e){return v||[];}}
function syxEsc(v){return typeof escapeHtml==='function'?escapeHtml(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
function syxDate(v){if(!v)return '-';var d=new Date(v);return isNaN(d.getTime())?syxEsc(v):d.toLocaleString('ms-MY',{dateStyle:'medium',timeStyle:'short'});}
function syxNum(v){return Number(v||0).toLocaleString('ms-MY');}
function syxCsvLine(line){var out=[],cur='',q=false;for(var i=0;i<line.length;i++){var ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(ch===','&&!q){out.push(cur);cur='';}else cur+=ch;}out.push(cur);return out;}
function syxParseCsv(text){var lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/);if(!lines.length||!lines[0].trim())return {headers:[],rows:[]};var headers=syxCsvLine(lines[0]).map(function(x){return x.trim();}),rows=[];for(var i=1;i<lines.length;i++){if(!lines[i].trim())continue;var vals=syxCsvLine(lines[i]),o={};headers.forEach(function(h,j){o[h]=vals[j]===undefined?'':vals[j];});rows.push(o);}return {headers:headers,rows:rows};}
function syxNormalizeStudentRow(row){var a={NO_KP:['NO_KP','NO KP','NOKP','NO. KP','NO KAD PENGENALAN','IC'],NAMA:['NAMA','NAMA MURID','NAMA PELAJAR'],JANTINA:['JANTINA'],TINGKATAN:['TINGKATAN','TINGKAT','TING','FORM'],KELAS:['KELAS','NAMA KELAS'],TAHUN:['TAHUN','YEAR'],STATUS:['STATUS'],EMAIL:['EMAIL','EMEL'],UNIT:['UNIT','UNIT BERUNIFORM','UNIFORM'],KELAB:['KELAB','KELAB & PERSATUAN','KELAB/PERSATUAN','PERSATUAN'],SUKAN:['SUKAN','SUKAN/PERMAINAN','PERMAINAN'],RUMAH:['RUMAH','RUMAH SUKAN']},o={};Object.keys(a).forEach(function(k){var h=Object.keys(row).find(function(x){return a[k].includes(String(x).trim().toUpperCase());});if(h)o[k]=String(row[h]).trim();});return o;}
function renderImportPage(){var c=document.getElementById('page-import');if(!c)return;c.innerHTML='<div class="syx-module"><div class="syx-head"><div><div class="syx-kicker">Sistem</div><h1 class="syx-title">Import Data</h1><p class="syx-sub">Import data murid secara pukal melalui CSV dengan pratonton dan rekod log.</p></div></div><div class="syx-grid"><div class="syx-card"><h3>Pilih Fail CSV</h3><p>NO_KP dan NAMA wajib. Header biasa dikesan automatik. Fail KOKO boleh membawa UNIT, KELAB, SUKAN dan RUMAH SUKAN.</p><input id="syxImportFile" type="file" accept=".csv,text/csv" hidden style="display:none !important;position:absolute !important;width:1px !important;height:1px !important;opacity:0 !important;pointer-events:none !important;" onchange="syxReadImportFile(event)"><label for="syxImportFile" class="syx-drop"><i class="fa-solid fa-file-csv"></i><b>Klik untuk pilih fail CSV</b><span id="syxFileName">Belum ada fail dipilih.</span></label><div id="syxImportStatus" class="syx-status" style="margin-top:12px">Sedia menerima fail.</div></div><div class="syx-card"><h3>Sahkan & Import</h3><p>Rekod NO_KP akan dikemas kini atau ditambah. UNIT, KELAB, SUKAN dan RUMAH SUKAN akan dipautkan automatik ke Penempatan.</p><label class="syx-check"><input id="syxConfirmImport" type="checkbox"> Saya telah semak pratonton.</label><div class="syx-actions" style="margin-top:14px"><button class="syx-btn primary" onclick="syxDoImport()">Import</button><button class="syx-btn" onclick="syxClearImport()">Kosongkan</button></div></div></div><div class="syx-card"><h3>Pratonton</h3><p id="syxPreviewMeta">Belum ada data.</p><div id="syxPreview"><div class="syx-empty">Pilih fail untuk melihat data.</div></div></div><div class="syx-card"><h3>Log Import</h3><p>Sejarah import data.</p><div id="syxImportLogs"><div class="syx-empty">Memuatkan...</div></div></div><div class="syx-card" style="border:1px solid rgba(220,38,38,.25)"><h3 style="color:#dc2626">Pembersihan Data Untuk Ujian</h3><p>ADMIN boleh padam seorang murid atau semua data murid dan rekod berkaitan supaya import boleh diuji semula dari keadaan kosong.</p><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:14px"><input id="syxDeleteNoKp" class="syx-input" type="text" placeholder="Masukkan NO_KP murid" style="min-width:260px"><button class="syx-btn" onclick="syxDeleteOneMurid()">Padam Seorang Murid</button><button class="syx-btn" style="color:#dc2626;border-color:rgba(220,38,38,.35)" onclick="syxDeleteAllMurid()">Padam Semua Data Murid</button></div><div id="syxDeleteStatus" class="syx-status" style="margin-top:12px">UNIT master, AKTIVITI, IMPORT_LOG dan AUDIT_LOG tidak akan dipadam.</div></div></div>';syxLoadImportLogs();}
async function syxReadImportFile(e){var f=e.target.files&&e.target.files[0];if(!f)return;SYX_IMPORT_FILE=f.name;document.getElementById('syxFileName').textContent=f.name;try{var p=syxParseCsv(await f.text());SYX_IMPORT_HEADERS=p.headers;SYX_IMPORT_ROWS=p.rows.map(syxNormalizeStudentRow);var valid=SYX_IMPORT_ROWS.filter(function(x){return x.NO_KP&&x.NAMA;}).length;var st=document.getElementById('syxImportStatus');st.className='syx-status '+(valid===SYX_IMPORT_ROWS.length?'ok':'err');st.textContent=syxNum(SYX_IMPORT_ROWS.length)+' baris dibaca · '+syxNum(valid)+' sah.';syxRenderImportPreview();}catch(err){document.getElementById('syxImportStatus').className='syx-status err';document.getElementById('syxImportStatus').textContent=err.message||String(err);}}
function syxRenderImportPreview(){var c=document.getElementById('syxPreview');document.getElementById('syxPreviewMeta').textContent=syxNum(SYX_IMPORT_ROWS.length)+' rekod · Header: '+SYX_IMPORT_HEADERS.join(', ')+' · Pemetaan: Murid + Unit + Kelab + Sukan + Rumah Sukan';var rows=SYX_IMPORT_ROWS.slice(0,50),html='<div class="syx-table-wrap"><table class="syx-table"><thead><tr><th>NO_KP</th><th>NAMA</th><th>TINGKATAN</th><th>KELAS</th><th>UNIT</th><th>KELAB</th><th>SUKAN</th><th>RUMAH</th></tr></thead><tbody>';rows.forEach(function(r){html+='<tr><td>'+syxEsc(r.NO_KP||'')+'</td><td>'+syxEsc(r.NAMA||'')+'</td><td>'+syxEsc(r.TINGKATAN||'')+'</td><td>'+syxEsc(r.KELAS||'')+'</td><td>'+syxEsc(r.UNIT||'-')+'</td><td>'+syxEsc(r.KELAB||'-')+'</td><td>'+syxEsc(r.SUKAN||'-')+'</td><td>'+syxEsc(r.RUMAH||'-')+'</td></tr>';});html+='</tbody></table></div>';c.innerHTML=rows.length?html:'<div class="syx-empty">Tiada rekod.</div>'; }
async function syxDoImport(){if(!SYX_IMPORT_ROWS.length)return showToast('Sila pilih fail CSV dahulu.','error');if(!document.getElementById('syxConfirmImport').checked)return showToast('Sila sahkan pratonton data.','error');var bad=SYX_IMPORT_ROWS.filter(function(r){return !r.NO_KP||!r.NAMA;});if(bad.length)return showToast(bad.length+' rekod tidak mempunyai NO_KP/NAMA.','error');var btn=document.querySelector('#page-import .syx-btn.primary');var st=document.getElementById('syxImportStatus');try{if(btn){btn.disabled=true;btn.dataset.oldText=btn.textContent;btn.textContent='Memproses...';}st.className='syx-status';st.textContent='1/4 · Menghantar '+syxNum(SYX_IMPORT_ROWS.length)+' rekod secara pukal...';await new Promise(function(resolve){setTimeout(resolve,30);});st.textContent='2/4 · Memproses murid, unit dan penempatan...';var r=syxJson(await server('bulkImportMurid',syxTok(),SYX_IMPORT_ROWS,SYX_IMPORT_FILE));st.textContent='3/4 · Menyimpan log dan mengemas kini paparan...';await syxLoadImportLogs();st.className='syx-status ok';var dur=r.DURATION_MS?(' · '+(Number(r.DURATION_MS)/1000).toFixed(1)+'s'):'';st.textContent='4/4 · Selesai · '+syxNum(r.BERJAYA)+' diproses · '+syxNum(r.SKIP||0)+' tidak diulang · '+syxNum(r.GAGAL)+' gagal · '+syxNum(r.PENEMPATAN_BAHARU||0)+' penempatan baharu'+dur;showToast('Bulk import selesai.','success');}catch(e){st.className='syx-status err';st.textContent='Import gagal: '+(e.message||String(e));showToast(e.message||String(e),'error');}finally{if(btn){btn.disabled=false;btn.textContent=btn.dataset.oldText||'Import';}}}

async function syxDeleteOneMurid(){var input=document.getElementById('syxDeleteNoKp');var noKp=(input&&input.value||'').trim();var st=document.getElementById('syxDeleteStatus');if(!noKp){showToast('Masukkan NO_KP murid dahulu.','error');return;}if(!confirm('Padam terus murid '+noKp+' dan semua rekod berkaitan murid ini?'))return;try{st.className='syx-status';st.textContent='Sedang memadam...';var r=syxJson(await server('deleteOneMuridData',syxTok(),noKp));st.className='syx-status ok';st.textContent='Dipadam: '+(r.NAMA||noKp)+' · '+noKp;input.value='';showToast('Data murid berjaya dipadam.','success');}catch(e){st.className='syx-status err';st.textContent='Gagal: '+(e.message||String(e));showToast(e.message||String(e),'error');}}
async function syxDeleteAllMurid(){var first=prompt('AMARAN: Ini akan memadam SEMUA data murid dan rekod berkaitan untuk tujuan ujian.\n\nTaip tepat: PADAM SEMUA DATA MURID');if(first!=='PADAM SEMUA DATA MURID'){if(first!==null)showToast('Pengesahan tidak sepadan.','error');return;}if(!confirm('Pengesahan terakhir: padam SEMUA data murid sekarang?\n\nUNIT master, AKTIVITI, IMPORT_LOG dan AUDIT_LOG dikekalkan.'))return;var st=document.getElementById('syxDeleteStatus');try{st.className='syx-status';st.textContent='Sedang membersihkan semua data murid...';var r=syxJson(await server('deleteAllMuridData',syxTok(),'PADAM SEMUA DATA MURID'));st.className='syx-status ok';st.textContent='Semua data murid dan rekod berkaitan telah dipadam. Sedia untuk import semula.';showToast('Semua data murid berjaya dipadam.','success');}catch(e){st.className='syx-status err';st.textContent='Gagal: '+(e.message||String(e));showToast(e.message||String(e),'error');}}
function syxClearImport(){SYX_IMPORT_ROWS=[];SYX_IMPORT_HEADERS=[];SYX_IMPORT_FILE='';var f=document.getElementById('syxImportFile');if(f)f.value='';document.getElementById('syxFileName').textContent='Belum ada fail dipilih.';document.getElementById('syxPreviewMeta').textContent='Belum ada data.';document.getElementById('syxPreview').innerHTML='<div class="syx-empty">Pilih fail untuk melihat data.</div>';document.getElementById('syxConfirmImport').checked=false;}
async function syxLoadImportLogs(){var c=document.getElementById('syxImportLogs');if(!c)return;try{var rows=syxJson(await server('getImportLogs',syxTok(),100))||[],html='<div class="syx-table-wrap"><table class="syx-table"><thead><tr><th>Tarikh</th><th>Jenis</th><th>Fail</th><th>Jumlah</th><th>Berjaya</th><th>Gagal</th><th>Oleh</th></tr></thead><tbody>';rows.forEach(function(r){html+='<tr><td>'+syxDate(r.CREATED_AT)+'</td><td><span class="syx-pill">'+syxEsc(r.JENIS)+'</span></td><td>'+syxEsc(r.NAMA_FAIL||'-')+'</td><td>'+syxNum(r.JUMLAH)+'</td><td>'+syxNum(r.BERJAYA)+'</td><td>'+syxNum(r.GAGAL)+'</td><td>'+syxEsc(r.CREATED_BY||'-')+'</td></tr>';});html+='</tbody></table></div>';c.innerHTML=rows.length?html:'<div class="syx-empty">Tiada log import.</div>';}catch(e){c.innerHTML='<div class="syx-status err">'+syxEsc(e.message||String(e))+'</div>';}}
function renderBackupPage(){var c=document.getElementById('page-backup');if(!c)return;c.innerHTML='<div class="syx-module"><div class="syx-head"><div><div class="syx-kicker">Sistem</div><h1 class="syx-title">Backup</h1><p class="syx-sub">Salinan semua sheet ' + ekAppName() + ' ke Google Drive.</p></div><div class="syx-actions"><button class="syx-btn" onclick="syxLoadBackups()">Segar</button><button class="syx-btn primary" onclick="syxCreateBackup()">Backup Sekarang</button></div></div><div class="syx-kpis"><div class="syx-kpi"><b id="syxBackupCount">0</b><span>Jumlah backup</span></div><div class="syx-kpi"><b>CSV</b><span>Format salinan</span></div><div class="syx-kpi"><b>Drive</b><span>Penyimpanan</span></div><div class="syx-kpi"><b>ADMIN</b><span>Akses</span></div></div><div class="syx-card"><h3>Sejarah Backup</h3><p>Setiap backup menghasilkan folder bertarikh dalam folder ' + ekAppName() + '.</p><div id="syxBackupList"><div class="syx-empty">Memuatkan...</div></div></div></div>';syxLoadBackups();}
async function syxCreateBackup(){if(!confirm('Buat backup semua data sekarang?'))return;try{var r=syxJson(await server('backupDatabase',syxTok()));showToast('Backup berjaya: '+(r.name||'Selesai'),'success');syxLoadBackups();}catch(e){showToast(e.message||String(e),'error');}}
async function syxLoadBackups(){var c=document.getElementById('syxBackupList');if(!c)return;try{var rows=syxJson(await server('listBackups',syxTok(),100))||[];document.getElementById('syxBackupCount').textContent=syxNum(rows.length);var html='';rows.forEach(function(r){html+='<div class="syx-item"><div class="syx-item-main"><div class="syx-item-title">'+syxEsc(r.name)+'</div><div class="syx-item-meta">'+syxDate(r.createdAt)+' · '+syxNum(r.files||0)+' fail CSV</div></div>'+(r.url?'<a class="syx-link" href="'+syxEsc(r.url)+'" target="_blank" rel="noopener">Buka Folder</a>':'')+'</div>';});c.innerHTML=rows.length?html:'<div class="syx-empty">Tiada backup.</div>';}catch(e){c.innerHTML='<div class="syx-status err">'+syxEsc(e.message||String(e))+'</div>';}}
function renderAuditPage(){var c=document.getElementById('page-audit');if(!c)return;c.innerHTML='<div class="syx-module"><div class="syx-head"><div><div class="syx-kicker">Sistem</div><h1 class="syx-title">Audit Log</h1><p class="syx-sub">Rekod tindakan pengguna dalam sistem.</p></div><button class="syx-btn" onclick="syxLoadAudit()">Segar</button></div><div class="syx-kpis"><div class="syx-kpi"><b id="syxAuditTotal">0</b><span>Rekod</span></div><div class="syx-kpi"><b id="syxAuditCreate">0</b><span>Create / Import</span></div><div class="syx-kpi"><b id="syxAuditUpdate">0</b><span>Update</span></div><div class="syx-kpi"><b id="syxAuditOther">0</b><span>Lain-lain</span></div></div><div class="syx-card"><div class="syx-filter"><div class="syx-field"><label>Carian</label><input id="syxAuditSearch" placeholder="User / modul / record" oninput="syxFilterAudit()"></div><div class="syx-field"><label>Action</label><select id="syxAuditAction" onchange="syxFilterAudit()"><option value="">Semua</option><option>CREATE</option><option>UPDATE</option><option>DELETE</option><option>IMPORT</option><option>UPLOAD</option><option>BACKUP</option><option>VERIFY</option><option>LOGIN</option><option>LOGOUT</option></select></div><div class="syx-field"><label>Modul</label><select id="syxAuditModule" onchange="syxFilterAudit()"><option value="">Semua</option></select></div><button class="syx-btn" onclick="syxResetAuditFilter()">Reset</button></div></div><div class="syx-card"><div id="syxAuditTable"><div class="syx-empty">Memuatkan...</div></div></div><div id="syxAuditModal" style="display:none"></div></div>';syxLoadAudit();}
async function syxLoadAudit(){try{SYX_AUDIT=syxJson(await server('getAudit',syxTok(),500))||[];var sel=document.getElementById('syxAuditModule');sel.innerHTML='<option value="">Semua</option>';[...new Set(SYX_AUDIT.map(function(x){return x.MODULE;}).filter(Boolean))].sort().forEach(function(x){sel.innerHTML+='<option value="'+syxEsc(x)+'">'+syxEsc(x)+'</option>';});syxFilterAudit();}catch(e){document.getElementById('syxAuditTable').innerHTML='<div class="syx-status err">'+syxEsc(e.message||String(e))+'</div>';}}
function syxFilterAudit(){var q=(document.getElementById('syxAuditSearch')?.value||'').toUpperCase(),a=(document.getElementById('syxAuditAction')?.value||'').toUpperCase(),m=(document.getElementById('syxAuditModule')?.value||'').toUpperCase();var rows=SYX_AUDIT.filter(function(r){return(!a||String(r.ACTION).toUpperCase()===a)&&(!m||String(r.MODULE).toUpperCase()===m)&&(!q||[r.USER_ID,r.ACTION,r.MODULE,r.RECORD_ID,r.DETAIL].join(' ').toUpperCase().includes(q));});document.getElementById('syxAuditTotal').textContent=syxNum(rows.length);document.getElementById('syxAuditCreate').textContent=syxNum(rows.filter(function(r){return ['CREATE','IMPORT'].includes(String(r.ACTION).toUpperCase());}).length);document.getElementById('syxAuditUpdate').textContent=syxNum(rows.filter(function(r){return String(r.ACTION).toUpperCase()==='UPDATE';}).length);document.getElementById('syxAuditOther').textContent=syxNum(rows.filter(function(r){return !['CREATE','IMPORT','UPDATE'].includes(String(r.ACTION).toUpperCase());}).length);var c=document.getElementById('syxAuditTable'),html='<div class="syx-table-wrap"><table class="syx-table"><thead><tr><th>Tarikh</th><th>User</th><th>Action</th><th>Modul</th><th>Record</th><th></th></tr></thead><tbody>';rows.forEach(function(r,i){html+='<tr><td>'+syxDate(r.CREATED_AT)+'</td><td>'+syxEsc(r.USER_ID||'SYSTEM')+'</td><td><span class="syx-pill">'+syxEsc(r.ACTION)+'</span></td><td>'+syxEsc(r.MODULE)+'</td><td>'+syxEsc(r.RECORD_ID||'-')+'</td><td><button class="syx-btn small" onclick="syxShowAudit('+i+')">Lihat</button></td></tr>';});html+='</tbody></table></div>';c.innerHTML=rows.length?html:'<div class="syx-empty">Tiada rekod sepadan.</div>';window.SYX_AUDIT_FILTERED=rows;}
function syxResetAuditFilter(){document.getElementById('syxAuditSearch').value='';document.getElementById('syxAuditAction').value='';document.getElementById('syxAuditModule').value='';syxFilterAudit();}
function syxShowAudit(i){var r=(window.SYX_AUDIT_FILTERED||[])[i];if(!r)return;var b=document.getElementById('syxAuditModal');b.className='syx-modal';b.style.display='flex';b.innerHTML='<div class="syx-dialog"><div class="syx-dialog-head"><b>Butiran Audit</b><button class="syx-close" onclick="this.closest(\'.syx-modal\').style.display=\'none\'">×</button></div><div class="syx-item"><div class="syx-item-main"><div class="syx-item-title">'+syxEsc(r.ACTION)+' · '+syxEsc(r.MODULE)+'</div><div class="syx-item-meta">'+syxDate(r.CREATED_AT)+' · '+syxEsc(r.USER_ID||'SYSTEM')+'</div></div></div><div class="syx-log-detail">'+syxEsc(r.DETAIL||'Tiada butiran')+'</div></div>';}

/* =========================================================
   PATCH SURAT KEBENARAN + BUANG SLIP/KALENDAR
   Berdasarkan Index asal.
   Modul lain dikekalkan.
========================================================= */

async function openActivityPermissionLetter(activityId) {
  try {
    if (!activityId) {
      showToast('ID aktiviti tidak sah.', 'error');
      return;
    }

    const d = ckParse(await server(
      'getPermissionLetterEditorData',
      getMuridSessionToken(),
      activityId
    )) || {};

    const peserta = d.peserta || [];
    const activity = d.activity || {};
    const school = d.school || {};
    const template = d.template || '';
    SLTR_STATE.activity = activity;
    SLTR_STATE.school = school;
    SLTR_STATE.logoDataUrl = d.logoDataUrl || '';
    SLTR_STATE.lineHeight = 1.3;

    if (!peserta.length) {
      showToast('Tiada peserta berdaftar untuk aktiviti ini.', 'warning');
      return;
    }

    const nama = activity.NAMA_AKTIVITI || 'Aktiviti';
    const teruskan = window.confirm(
      'JANA SURAT KEBENARAN\n\n' +
      'Aktiviti: ' + nama + '\n' +
      'Jumlah peserta: ' + peserta.length + '\n\n' +
      'Surat akan dijana untuk cetakan menggunakan template yang ditetapkan ADMIN.\n\n' +
      'Teruskan?'
    );
    if (!teruskan) return;

    const w = window.open('', '_blank');
    if (!w) {
      showToast('Popup disekat oleh browser. Benarkan pop-up untuk ' + ekAppName() + '.', 'warning');
      return;
    }

    const base = template || '<p>Template surat belum ditetapkan.</p>';
    const pages = peserta.map(function(p) {
      return sltrReplace(base, activity, p, school);
    }).join('<div class="sltr-break"></div>');

    const css = '<style>' +
      '@page{size:A4;margin:0}' +
      'html,body{margin:0;padding:0;background:#eee;color:#111;font-family:Arial,sans-serif}' +
      '.sltr-print-page{box-sizing:border-box;width:210mm;min-height:297mm;padding:18mm;background:#fff;margin:0 auto;page-break-after:always;font-size:11pt;line-height:1.3}' +
      '.sltr-print-page:last-child{page-break-after:auto}' +
      '.sltr-print-page table{width:100%;border-collapse:collapse;margin:10px 0}' +
      '.sltr-print-page th,.sltr-print-page td{border:1px solid #777;padding:6px;vertical-align:top}' +
      '.sltr-print-page th{background:transparent;color:#111}' +
      '.sltr-print-page p{margin:0 0 8px}' +
      '.sltr-print-page img{max-width:100%}' +
      '.sltr-break{display:none}' +
      '@media print{body{background:#fff}.sltr-print-page{margin:0;box-shadow:none}}' +
      '</style>';

    const wrapped = pages.split('<div class="sltr-break"></div>').map(function(x) {
      return '<div class="sltr-print-page">' + x + '</div>';
    }).join('');

    w.document.open();
    w.document.write('<!doctype html><html><head><title>Surat Kebenaran - ' +
      escapeHtml(nama) + '</title>' + css + '</head><body>' + wrapped + '</body></html>');
    w.document.close();
    setTimeout(function(){ w.focus(); w.print(); }, 600);

    showToast('Surat kebenaran sedia untuk dicetak.', 'success');
  } catch (e) {
    console.error('openActivityPermissionLetter:', e);
    showToast(e.message || 'Gagal menjana surat kebenaran.', 'error');
  }
}

async function openPermissionLetterTemplateEditor(activityId) {
  try {
    if (getMuridCurrentRole() !== 'ADMIN') {
      showToast('Hanya ADMIN boleh mengedit template Surat Kebenaran.', 'error');
      return;
    }
    if (!activityId) {
      showToast('ID aktiviti tidak sah.', 'error');
      return;
    }
    sltrBuildModal();
    const status = document.getElementById('sltrStatus');
    if (status) status.textContent = 'Memuatkan template...';
    const d = ckParse(await server(
      'getPermissionLetterEditorData',
      getMuridSessionToken(),
      activityId
    )) || {};
    sltrDataCache = d;
    SLTR_STATE.activity = d.activity || {};
    SLTR_STATE.peserta = d.peserta || [];
    SLTR_STATE.school = d.school || {};
    SLTR_STATE.logoDataUrl = d.logoDataUrl || '';
    SLTR_STATE.lineHeight = 1.3;
    document.getElementById('sltrModal').classList.add('open');
    await sltrLoad();
  } catch (e) {
    showToast(e.message || 'Gagal membuka editor template surat.', 'error');
  }
}





let SLTR_STATE={activity:null,peserta:[],template:'',school:{},logoDataUrl:'',lineHeight:1.35,tableBorder:true};
let sltrDataCache=null;
function sltrFmtDate(v){try{return v?new Date(v).toLocaleDateString('ms-MY',{day:'2-digit',month:'2-digit',year:'numeric'}):'-';}catch(e){return v||'-';}}
function sltrActivityMap(a,p,s){return {'SEKOLAH':s.name||'', 'ALAMAT_SEKOLAH':s.address||'', 'TELEFON_SEKOLAH':s.phone||'', 'EMAIL_SEKOLAH':s.email||'', 'NAMA_MURID':p.NAMA||'', 'NO_KP':p.NO_KP||'', 'KELAS':p.KELAS||'', 'TINGKATAN':p.TINGKATAN||'', 'AKTIVITI':a.NAMA_AKTIVITI||'', 'TARIKH':sltrFmtDate(a.TARIKH), 'MASA':a.MASA||'', 'TEMPAT':a.TEMPAT||'', 'PERINGKAT':a.PERINGKAT||'', 'ANJURAN':a.NO_GURU||''};}
function sltrReplace(html,a,p,s){let out=String(html||'');const m=sltrActivityMap(a,p,s);Object.keys(m).forEach(k=>{out=out.replace(new RegExp('{{\\s*'+k+'\\s*}}','g'),function(){return m[k];});});if(SLTR_STATE.logoDataUrl&&!/<img[^>]+data-logo="school"/i.test(out)){out='<div style="text-align:center;margin-bottom:8px"><img data-logo="school" src="'+SLTR_STATE.logoDataUrl+'" style="max-width:70px;max-height:80px;object-fit:contain"></div>'+out;}return out;}
function sltrSelectedTable(){const sel=window.getSelection();if(!sel||!sel.anchorNode)return null;let el=sel.anchorNode.nodeType===1?sel.anchorNode:sel.anchorNode.parentElement;return el?el.closest('table'):null;}
function sltrApplyLineHeight(v){SLTR_STATE.lineHeight=Number(v)||1.35;const ed=document.getElementById('sltrEditor');if(ed)ed.style.lineHeight=SLTR_STATE.lineHeight;}
function sltrSetZoom(v){const ed=document.getElementById('sltrEditor');if(!ed)return;ed.style.transform='scale('+Number(v||1)+')';ed.style.transformOrigin='top center';}
function sltrTableColorNone(){const t=sltrSelectedTable();if(!t){showToast('Klik dahulu dalam jadual.','warning');return;}t.querySelectorAll('th,td').forEach(c=>{c.style.background='transparent';c.style.color='#111';});}
function sltrTableBorder(on){const t=sltrSelectedTable();if(!t){showToast('Klik dahulu dalam jadual.','warning');return;}t.querySelectorAll('th,td').forEach(c=>{c.style.border=on?'1px solid #777':'0 solid transparent';});SLTR_STATE.tableBorder=on;}
function sltrAddRow(){const t=sltrSelectedTable();if(!t){showToast('Klik dahulu dalam jadual.','warning');return;}const body=t.tBodies[0]||t.createTBody();const cols=(t.rows[0]&&t.rows[0].cells.length)||2;const tr=body.insertRow(-1);for(let i=0;i<cols;i++){const td=tr.insertCell(-1);td.innerHTML='Teks';td.style.border=SLTR_STATE.tableBorder?'1px solid #777':'0 solid transparent';td.style.padding='6px';}sltrSelectTable(t);}
function sltrDeleteRow(){const t=sltrSelectedTable();if(!t){showToast('Klik dahulu dalam jadual.','warning');return;}const sel=window.getSelection();let el=sel&&sel.anchorNode?(sel.anchorNode.nodeType===1?sel.anchorNode:sel.anchorNode.parentElement):null;const tr=el&&el.closest('tr');if(tr)tr.remove();else if(t.rows.length)t.deleteRow(t.rows.length-1);sltrSelectTable(t);}
function sltrAddTable(){const ed=document.getElementById('sltrEditor');if(!ed)return;ed.focus();document.execCommand('insertHTML',false,'<table class="sltr-table" style="width:100%"><tbody><tr><td>Bil.</td><td>Maklumat</td><td>Butiran</td></tr><tr><td>1</td><td>Item</td><td>Butiran</td></tr></tbody></table><p><br></p>');const t=ed.querySelector('table:last-of-type');if(t)sltrSelectTable(t);}
function sltrSelectTable(t){document.querySelectorAll('#sltrEditor table').forEach(x=>x.classList.remove('sltr-selected-table'));if(!t)return;t.classList.add('sltr-selected-table');sltrShowTableHandles(t);}
function sltrClearTableHandles(){document.querySelectorAll('.sltr-table-handle,.sltr-table-resize').forEach(x=>x.remove());document.querySelectorAll('#sltrEditor table').forEach(x=>x.classList.remove('sltr-selected-table'));}
function sltrShowTableHandles(t){sltrClearTableHandles();if(!t)return;const ed=document.getElementById('sltrEditor');if(!ed)return;const er=ed.getBoundingClientRect(),tr=t.getBoundingClientRect();const scrollLeft=ed.scrollLeft,scrollTop=ed.scrollTop;const tableLeft=tr.left-er.left+scrollLeft,tableTop=tr.top-er.top+scrollTop;const tableWidth=t.offsetWidth,tableHeight=t.offsetHeight;
 const cells=t.rows[0]?Array.from(t.rows[0].cells):[];if(cells.length>1){let x=0;for(let i=0;i<cells.length-1;i++){x+=cells[i].offsetWidth;const h=document.createElement('div');h.className='sltr-table-handle';h.style.left=(tableLeft+x-2)+'px';h.style.top=tableTop+'px';h.style.height=tableHeight+'px';h.title='Tarik untuk ubah lebar lajur';h.dataset.col=i;h.dataset.table='1';h.addEventListener('pointerdown',sltrStartColumnResize);ed.appendChild(h);}}
 const r=document.createElement('div');r.className='sltr-table-resize';r.style.left=(tableLeft+tableWidth-6)+'px';r.style.top=(tableTop+tableHeight-6)+'px';r.title='Tarik untuk ubah saiz jadual';r.addEventListener('pointerdown',sltrStartTableResize);ed.appendChild(r);}
function sltrStartColumnResize(e){e.preventDefault();e.stopPropagation();const t=sltrSelectedTable();if(!t)return;const idx=Number(e.currentTarget.dataset.col||0);const startX=e.clientX;const startW=t.offsetWidth;const firstRow=t.rows[0];const startWidths=Array.from(firstRow.cells).map(c=>c.offsetWidth);function move(ev){const dx=ev.clientX-startX;const min=45;let nw=Math.max(min,startWidths[idx]+dx);const next=Math.max(min,startWidths[idx+1]-dx);const total=startWidths[idx]+startWidths[idx+1];if(nw>total-min)nw=total-min;firstRow.cells[idx].style.width=nw+'px';firstRow.cells[idx+1].style.width=(total-nw)+'px';Array.from(t.rows).forEach(row=>{if(row.cells[idx])row.cells[idx].style.width=nw+'px';if(row.cells[idx+1])row.cells[idx+1].style.width=(total-nw)+'px';});sltrShowTableHandles(t);}function up(){document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);}document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);}
function sltrStartTableResize(e){e.preventDefault();e.stopPropagation();const t=sltrSelectedTable();if(!t)return;const startX=e.clientX,startY=e.clientY,startW=t.offsetWidth,startH=t.offsetHeight;function move(ev){const nw=Math.max(180,startW+(ev.clientX-startX));const nh=Math.max(40,startH+(ev.clientY-startY));t.style.width=nw+'px';t.style.height=nh+'px';sltrShowTableHandles(t);}function up(){document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);}document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);}
function sltrInitTableInteractions(){const ed=document.getElementById('sltrEditor');if(!ed||ed.dataset.tableInit==='1')return;ed.dataset.tableInit='1';ed.addEventListener('click',function(e){const t=e.target.closest('table');if(t)sltrSelectTable(t);else sltrClearTableHandles();});ed.addEventListener('scroll',function(){const t=sltrSelectedTable();if(t)sltrShowTableHandles(t);});window.addEventListener('resize',function(){const t=sltrSelectedTable();if(t)sltrShowTableHandles(t);});}
function sltrExec(cmd,val){const ed=document.getElementById('sltrEditor');if(!ed)return;ed.focus();document.execCommand(cmd,false,val||null);}
function sltrInsertToken(tok){const ed=document.getElementById('sltrEditor');if(!ed)return;ed.focus();document.execCommand('insertText',false,'{{'+tok+'}}');}
function sltrBuildModal(){if(document.getElementById('sltrModal'))return;const modal=document.createElement('div');modal.id='sltrModal';modal.className='sltr-modal';modal.innerHTML='<div class="sltr-dialog"><div class="sltr-head"><div><h2>Editor Surat Kebenaran</h2><small>Editor A4 seperti Word — KHAS ADMIN. Teks dan sel jadual boleh diedit terus.</small></div><button class="sltr-close" onclick="sltrClose()">×</button></div><div class="sltr-toolbar"><button class="sltr-tool" onclick="sltrExec(\'bold\')"><b>B</b></button><button class="sltr-tool" onclick="sltrExec(\'italic\')"><i>I</i></button><button class="sltr-tool" onclick="sltrExec(\'underline\')"><u>U</u></button><select class="sltr-select" onchange="sltrExec(\'fontName\',this.value)"><option>Arial</option><option>Calibri</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option></select><select class="sltr-select" onchange="sltrExec(\'fontSize\',this.value)"><option value="2">10</option><option value="3" selected>12</option><option value="4">14</option><option value="5">18</option><option value="6">24</option></select><button class="sltr-tool" onclick="sltrExec(\'justifyLeft\')">Kiri</button><button class="sltr-tool" onclick="sltrExec(\'justifyCenter\')">Tengah</button><button class="sltr-tool" onclick="sltrExec(\'justifyRight\')">Kanan</button><button class="sltr-tool" onclick="sltrExec(\'justifyFull\')">Justify</button><span class="sltr-sep"></span><select class="sltr-select" onchange="sltrApplyLineHeight(this.value)"><option value="1">1.0</option><option value="1.15">1.15</option><option value="1.3" selected>1.3</option><option value="1.5">1.5</option><option value="1.75">1.75</option><option value="2">2.0</option></select><span class="sltr-sep"></span><button class="sltr-tool" onclick="sltrAddTable()">+ Jadual</button><button class="sltr-tool" onclick="sltrAddRow()">+ Baris</button><button class="sltr-tool" onclick="sltrDeleteRow()">− Baris</button><button class="sltr-tool" onclick="sltrTableColorNone()">Jadual Tiada Warna</button><button class="sltr-tool" onclick="sltrTableBorder(true)">Border</button><button class="sltr-tool" onclick="sltrTableBorder(false)">Tiada Border</button><span class="sltr-sep"></span><span class="sltr-a4-info">A4 210 × 297 mm</span><select class="sltr-select" title="Zum paparan A4" onchange="sltrSetZoom(this.value)"><option value="0.75">75%</option><option value="0.85">85%</option><option value="0.9">90%</option><option value="1" selected>100%</option><option value="1.1">110%</option></select><span class="sltr-status" id="sltrStatus"></span></div><div class="sltr-body"><aside class="sltr-side"><h3>Placeholder</h3><p>Klik token untuk memasukkannya pada kedudukan kursor.</p><div class="sltr-token-list">'+['SEKOLAH','ALAMAT_SEKOLAH','NAMA_MURID','NO_KP','KELAS','TINGKATAN','AKTIVITI','TARIKH','MASA','TEMPAT','PERINGKAT','ANJURAN'].map(function(x){return '<button class="sltr-token" onclick="sltrInsertToken(\''+x+'\')">{{'+x+'}}</button>';}).join('')+'</div><hr style="border:0;border-top:1px solid var(--border);margin:14px 0"><p><b>Tip:</b> Klik sel jadual dahulu sebelum menggunakan kawalan jadual.</p></aside><main class="sltr-canvas"><div id="sltrEditor" class="sltr-page" contenteditable="true" spellcheck="false"></div></main></div><div class="sltr-foot"><div class="left"><button class="sltr-btn" onclick="sltrReset()">Tetapan Asal</button><button class="sltr-btn" onclick="sltrLoad()">Muat Semula</button><button class="sltr-btn primary" onclick="sltrSave()">Simpan Template</button></div><div class="right"><button class="sltr-btn success" onclick="sltrPrint()"><i class="fa-solid fa-print"></i> Pratonton / Cetak</button><button class="sltr-btn" onclick="sltrClose()">Tutup</button></div></div></div>';document.body.appendChild(modal);}
async function sltrLoad(){const ed=document.getElementById('sltrEditor');if(!ed)return;ed.innerHTML=(sltrDataCache&&sltrDataCache.template)||'<p>Template kosong.</p>';ed.style.lineHeight=SLTR_STATE.lineHeight;sltrInitTableInteractions();sltrClearTableHandles();const st=document.getElementById('sltrStatus');if(st)st.textContent='A4 sebenar 210 × 297 mm • Template dimuatkan.';}
async function openActivityPermissionLetter(activityId){try{sltrBuildModal();const status=document.getElementById('sltrStatus');if(status)status.textContent='Memuatkan editor...';const d=ckParse(await server('getPermissionLetterEditorData',getMuridSessionToken(),activityId))||{};sltrDataCache=d;SLTR_STATE.activity=d.activity||{};SLTR_STATE.peserta=d.peserta||[];SLTR_STATE.school=d.school||{};SLTR_STATE.logoDataUrl=d.logoDataUrl||'';SLTR_STATE.lineHeight=1.35;document.getElementById('sltrModal').classList.add('open');await sltrLoad();}catch(e){showToast(e.message||String(e),'error');}}
function sltrClose(){const m=document.getElementById('sltrModal');if(m)m.classList.remove('open');}
async function sltrSave(){if(getMuridCurrentRole()!=='ADMIN'){showToast('Hanya ADMIN boleh menyimpan template surat.','error');return;}try{const ed=document.getElementById('sltrEditor');if(!ed)return;const html=ed.innerHTML;const d=ckParse(await server('savePermissionLetterTemplate',getMuridSessionToken(),html))||{};sltrDataCache=Object.assign({},sltrDataCache,{template:d.html||html});const st=document.getElementById('sltrStatus');if(st)st.textContent='Template berjaya disimpan.';showToast('Template surat berjaya disimpan.','success');}catch(e){showToast(e.message||String(e),'error');}}
async function sltrReset(){if(getMuridCurrentRole()!=='ADMIN'){showToast('Hanya ADMIN boleh menetapkan semula template surat.','error');return;}if(!confirm('Tetapkan semula template surat kepada template asal?'))return;try{const d=ckParse(await server('resetPermissionLetterTemplate',getMuridSessionToken()))||{};sltrDataCache=Object.assign({},sltrDataCache,{template:d.html||''});await sltrLoad();showToast('Template surat dikembalikan kepada asal.','success');}catch(e){showToast(e.message||String(e),'error');}}
function sltrPrint(){const ed=document.getElementById('sltrEditor');if(!ed)return;const base=ed.innerHTML;const pages=SLTR_STATE.peserta.length?SLTR_STATE.peserta.map(function(p){return sltrReplace(base,SLTR_STATE.activity,p,SLTR_STATE.school);}).join('<div class="sltr-break"></div>'):sltrReplace(base,SLTR_STATE.activity,{},SLTR_STATE.school);const w=window.open('','_blank');if(!w){showToast('Popup disekat oleh browser.','warning');return;}const css='<style>@page{size:A4;margin:0}body{margin:0;background:#fff;color:#111;font-family:Arial,sans-serif}.sltr-print-page{box-sizing:border-box;width:210mm;min-height:297mm;padding:18mm;page-break-after:always;font-size:11pt;line-height:'+SLTR_STATE.lineHeight+'}.sltr-print-page:last-child{page-break-after:auto}.sltr-print-page table{border-collapse:collapse;margin:10px 0;table-layout:fixed}.sltr-print-page th,.sltr-print-page td{border:1px solid #777;padding:6px;vertical-align:top;overflow-wrap:anywhere}.sltr-print-page th{background:transparent}.sltr-print-page p{margin:0 0 8px}.sltr-print-page img{max-width:100%}.sltr-break{display:none}</style>';const wrapped=pages.split('<div class="sltr-break"></div>').map(function(x){return '<div class="sltr-print-page">'+x+'</div>';}).join('');w.document.open();w.document.write('<!doctype html><html><head><title>Surat Kebenaran</title>'+css+'</head><body>'+wrapped+'</body></html>');w.document.close();setTimeout(function(){w.focus();w.print();},500);}



let FR_CONFIRMATION_PHRASE='';
function frEsc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function frRenderBreakdown(id,tables){const el=document.getElementById(id);if(!el)return;const obj=tables||{};const keys=Object.keys(obj);el.innerHTML=keys.length?keys.map(function(k){return '<span><b>'+frEsc(k)+'</b>: '+Number(obj[k]||0)+'</span>';}).join(''):'Tiada rekod.';}
function frSetPhraseUI(phrase){FR_CONFIRMATION_PHRASE=String(phrase||'').trim();const cfg=document.getElementById('frConfirmationPhrase'),target=document.getElementById('frConfirmationTarget'),hint=document.getElementById('frPhraseHint');if(cfg)cfg.value=FR_CONFIRMATION_PHRASE;if(target)target.textContent=FR_CONFIRMATION_PHRASE||'Belum ditetapkan';if(hint)hint.textContent='Ayat semasa: '+(FR_CONFIRMATION_PHRASE||'Belum ditetapkan')+'. Hanya ADMIN boleh mengubahnya.';}
async function frLoadConfirmationPhrase(){try{const d=tsJson(await server('getFactoryResetConfirmation',tsToken()))||{};frSetPhraseUI(d.phrase||'');}catch(e){const h=document.getElementById('frPhraseHint');if(h)h.textContent=e.message||String(e);}}
async function frSaveConfirmationPhrase(){const input=document.getElementById('frConfirmationPhrase');const phrase=String(input?input.value:'').trim();if(!phrase){showToast('Sila masukkan ayat pengesahan.','warning');return;}if(phrase.length<8){showToast('Ayat pengesahan mesti sekurang-kurangnya 8 aksara.','warning');return;}if(phrase.length>160){showToast('Ayat pengesahan maksimum 160 aksara.','warning');return;}if(!confirm('Simpan ayat pengesahan baharu ini?'))return;try{const d=tsJson(await server('saveFactoryResetConfirmation',tsToken(),phrase))||{};frSetPhraseUI(d.phrase||phrase);showToast('Ayat pengesahan berjaya disimpan.','success');}catch(e){showToast(e.message||String(e),'error');}}
async function frResetConfirmationPhrase(){const phrase='SAYA FAHAM DAN SETUJU UNTUK MEMADAM DATA';if(!confirm('Gunakan semula ayat pengesahan lalai ini?'))return;try{const d=tsJson(await server('saveFactoryResetConfirmation',tsToken(),phrase))||{};frSetPhraseUI(d.phrase||phrase);showToast('Ayat pengesahan dikembalikan kepada lalai.','success');}catch(e){showToast(e.message||String(e),'error');}}
async function frLoadStatus(){
  try{
    const d=tsJson(await server('getFactoryResetStatus',tsToken()))||{};
    const st=d.student||{},ac=d.activity||{},al=d.allOperational||{};
    const a=document.getElementById('frStudentCount'),b=document.getElementById('frActivityCount'),c=document.getElementById('frAllCount');
    if(a)a.textContent=Number(st.total||0);if(b)b.textContent=Number(ac.total||0);if(c)c.textContent=Number(al.total||0);
    frRenderBreakdown('frStudentBreakdown',st.tables);frRenderBreakdown('frActivityBreakdown',ac.tables);frRenderBreakdown('frAllBreakdown',al.tables);
    const status=document.getElementById('frStatus');if(status)status.textContent='Data semasa telah disemak. Reset tidak akan menyentuh data yang dilindungi.';
    await frLoadConfirmationPhrase();
  }catch(e){const st=document.getElementById('frStatus');if(st)st.textContent=e.message||String(e);showToast(e.message||String(e),'error');}
}
async function frReset(mode){
  const input=document.getElementById('frConfirmation');
  const confirmation=input?String(input.value||'').trim():'';
  if(!FR_CONFIRMATION_PHRASE)await frLoadConfirmationPhrase();
  if(confirmation!==FR_CONFIRMATION_PHRASE){showToast('Pengesahan tidak sepadan. Taip tepat ayat yang dipaparkan.','warning');if(input)input.focus();return;}
  const labels={STUDENT:'DATA MURID & REKOD BERKAITAN',ACTIVITY:'AKTIVITI & LAPORAN',ALL_OPERATIONAL:'SEMUA DATA OPERASI'};
  const label=labels[mode]||mode;
  if(!confirm('AMARAN TERAKHIR\n\nAnda akan memadam '+label+'.\n\nData ini tidak boleh dipulihkan melalui sistem.\n\nTeruskan?'))return;
  try{
    const status=document.getElementById('frStatus');if(status)status.textContent='Sedang menjalankan reset...';
    const d=tsJson(await server('factoryResetData',tsToken(),mode,confirmation))||{};
    if(status)status.textContent='Reset berjaya. '+Number(d.total||0)+' rekod telah dipadam. Data master, akaun, audit dan import log dikekalkan.';
    if(input)input.value='';showToast('Factory Reset berjaya dijalankan.','success');await frLoadStatus();
  }catch(e){const st=document.getElementById('frStatus');if(st)st.textContent=e.message||String(e);showToast(e.message||String(e),'error');}
}


/* =========================================================
   e-KOSSTA V2.5 FINAL PATCH — SURAT KEBENARAN
   ---------------------------------------------------------
   PATCH MODE:
   - Jana Surat terus memanggil generator bulk.
   - Tidak memanggil editor/template sebelum jana.
   - Editor Template kekal fungsi berasingan.
   - Mengelakkan ralat getSetting_ ketika klik Jana Surat.
   ========================================================= */

async function generatePermissionLettersBulkUI(activityId) {
  try {
    if (!activityId) {
      showToast('ID aktiviti tidak sah.', 'error');
      return;
    }

    const pesertaCheck = await server(
      'getPermissionLetterPreview',
      getMuridSessionToken(),
      activityId
    );
    const preview = ckParse(pesertaCheck) || {};
    const jumlah = Array.isArray(preview.peserta) ? preview.peserta.length : 0;

    if (!jumlah) {
      showToast('Tiada peserta berdaftar. Daftarkan peserta terlebih dahulu.', 'warning');
      return;
    }

    const teruskan = window.confirm(
      'JANA SURAT KEBENARAN\n\n' +
      'Jumlah peserta: ' + jumlah + '\n\n' +
      'Sistem akan menghasilkan satu PDF dengan satu halaman A4 bagi setiap peserta.\n\n' +
      'Teruskan?'
    );

    if (!teruskan) return;

    showToast('Sedang menjana surat untuk semua peserta...', 'info');

    const raw = await server(
      'generatePermissionLettersBulk',
      getMuridSessionToken(),
      activityId
    );
    const result = ckParse(raw) || {};

    if (!result.fileUrl) {
      throw new Error(result.message || 'PDF surat tidak berjaya dijana.');
    }

    showToast(
      'Surat berjaya dijana untuk ' +
      String(result.jumlahPeserta || jumlah) +
      ' peserta.',
      'success'
    );

    const w = window.open(result.fileUrl, '_blank');
    if (!w) {
      showToast(
        'PDF telah dijana tetapi popup browser disekat. Benarkan popup untuk membuka PDF.',
        'warning'
      );
    }
  } catch (e) {
    console.error('generatePermissionLettersBulkUI:', e);
    showToast(e.message || 'Gagal menjana surat kebenaran.', 'error');
  }
}

/* OVERRIDE TERAKHIR: butang Jana Surat tidak lagi membuka editor. */
async function openActivityPermissionLetter(activityId) {
  return generatePermissionLettersBulkUI(activityId);
}
