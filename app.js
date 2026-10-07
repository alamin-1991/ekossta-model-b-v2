
/* =========================================================
   e-KOSSTA V2.5 PATCH — RESTORE JANA SURAT + TEMPLATE DEFAULT
   PATCH MODE:
   - Tidak ubah modul lain.
   - Pulihkan butang "Jana Surat Kebenaran" kepada generator bulk.
   - Editor Template menggunakan template surat asal jika SETTINGS kosong.
   - Paparan editor kekal A4 210 x 297 mm.
   ========================================================= */

async function generatePermissionLettersBulkUI(activityId) {
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
    const nama = activity.NAMA_AKTIVITI || 'Aktiviti';

    if (!peserta.length) {
      showToast('Tiada peserta berdaftar untuk aktiviti ini.', 'warning');
      return;
    }

    const teruskan = window.confirm(
      'JANA SURAT KEBENARAN\n\n' +
      'Aktiviti: ' + nama + '\n' +
      'Jumlah peserta: ' + peserta.length + '\n\n' +
      'Sistem akan menghasilkan SATU PDF dengan satu halaman A4 bagi setiap peserta.\n\n' +
      'Teruskan?'
    );

    if (!teruskan) return;

    showToast('Sedang menjana surat untuk semua peserta...', 'info');

    const result = ckParse(await server(
      'generatePermissionLettersBulk',
      getMuridSessionToken(),
      activityId
    )) || {};

    if (!result.fileUrl) {
      throw new Error('PDF surat tidak berjaya dijana.');
    }

    showToast(
      'Surat berjaya dijana untuk ' +
      String(result.jumlahPeserta || peserta.length) +
      ' peserta.',
      'success'
    );

    /* Sama seperti fungsi Jana Surat sebelum ini:
       buka PDF yang telah dijana. Pengguna boleh Print / Save as PDF. */
    const w = window.open(result.fileUrl, '_blank');

    if (!w) {
      showToast(
        'PDF telah dijana tetapi popup disekat. Benarkan popup browser untuk membuka PDF.',
        'warning'
      );
    }
  } catch (e) {
    console.error('generatePermissionLettersBulkUI:', e);
    showToast(e.message || 'Gagal menjana surat kebenaran.', 'error');
  }
}

/*
 * Override fungsi lama.
 * Butang "Jana Surat Kebenaran" mesti memanggil generator,
 * BUKAN membuka editor template.
 */
async function openActivityPermissionLetter(activityId) {
  return generatePermissionLettersBulkUI(activityId);
}

/*
 * Pastikan editor mendapat template sebenar.
 * Jika SURAT_TEMPLATE_HTML belum pernah disimpan,
 * ambil template default daripada backend.
 */
async function sltrLoad() {
  const ed = document.getElementById('sltrEditor');
  if (!ed) return;

  let html = String(
    (sltrDataCache && sltrDataCache.template) || ''
  ).trim();

  if (!html) {
    try {
      const d = ckParse(await server(
        'getPermissionLetterTemplate',
        getMuridSessionToken()
      )) || {};

      html = String(d.html || '').trim();

      if (sltrDataCache) {
        sltrDataCache.template = html;
      }
    } catch (e) {
      console.warn('Template backend tidak dapat dimuat:', e);
    }
  }

  if (!html) {
    html =
      '<div style="text-align:center;font-weight:700;font-size:15px">{{SEKOLAH}}</div>' +
      '<p style="text-align:center;font-weight:700;font-size:14px">' +
      'SURAT AKUAN KEBENARAN WARIS MENYERTAI AKTIVITI KOKURIKULUM' +
      '</p>' +
      '<p>Saya <u>………………………………………………</u> No Kad Pengenalan: ' +
      '<u>………………………………………………</u></p>' +
      '<p>Beralamat di <u>…………………………………………………………………………</u></p>' +
      '<p>No. Telefon: <u>……………………………………</u></p>' +
      '<p>mengaku adalah waris kepada murid bernama di bawah:</p>' +
      '<table class="sltr-table"><tbody>' +
      '<tr><td>Nama Murid</td><td>{{NAMA_MURID}}</td></tr>' +
      '<tr><td>No. Kad Pengenalan</td><td>{{NO_KP}}</td></tr>' +
      '<tr><td>Kelas</td><td>{{KELAS}}</td></tr>' +
      '<tr><td>Sekolah</td><td>{{SEKOLAH}}</td></tr>' +
      '</tbody></table>' +
      '<p>Saya dengan ini memberi kebenaran bertulis saya kepada anak / jagaan saya untuk menyertai:</p>' +
      '<table class="sltr-table"><tbody>' +
      '<tr><td>Program</td><td>{{AKTIVITI}}</td></tr>' +
      '<tr><td>Tarikh</td><td>{{TARIKH}}</td></tr>' +
      '<tr><td>Masa</td><td>{{MASA}}</td></tr>' +
      '<tr><td>Tempat</td><td>{{TEMPAT}}</td></tr>' +
      '<tr><td>Peringkat</td><td>{{PERINGKAT}}</td></tr>' +
      '</tbody></table>' +
      '<p>2. Saya difahamkan bahawa soal keselamatan dan disiplin sentiasa diberi perhatian sewajarnya oleh Guru / Pegawai / Urusetia yang telah diamanahkan. Sekiranya kesihatan anak / jagaan saya terganggu dalam masa latihan / program / perjalanan, maka saya membenarkan pihak berkenaan menguruskan bagi pihak saya untuk mendapatkan rawatan perubatan.</p>' +
      '<p>3. Saya dengan ini mengakui bahawa pelajar di atas ADA / TIDAK ADA* mengidap penyakit kronik / berjangkit. Nyatakan (jika ada): ……………………………………………………………………………</p>' +
      '<p>Tarikh: ......................................................</p>' +
      '<p>Tandatangan Ibu Bapa / Penjaga / Waris: ......................................................</p>' +
      '<p style="font-weight:700">PENGAKUAN SAKSI</p>' +
      '<p>Saya dengan ini memperakukan bahawa sepanjang pengetahuan saya, segala keterangan di atas adalah benar.</p>' +
      '<p>Tarikh: ......................................................</p>' +
      '<p>Tandatangan Saksi: ......................................................</p>' +
      '<p>Nama: ......................................................</p>' +
      '<p>No. Kad Pengenalan: ......................................................</p>' +
      '<p>Disahkan oleh Pengetua / Guru Besar: ...................................................... / Cop rasmi</p>';
  }

  ed.innerHTML = html;
  ed.style.lineHeight = Number(SLTR_STATE.lineHeight || 1.35);

  sltrInitTableInteractions();
  sltrClearTableHandles();

  const st = document.getElementById('sltrStatus');
  if (st) {
    st.textContent = 'A4 sebenar 210 × 297 mm • Template dimuatkan.';
  }
}

/*
 * Editor Template kekal berasingan daripada Jana Surat.
 * Fungsi ini sengaja dinamakan berbeza supaya tidak berlaku lagi
 * pertindihan nama fungsi.
 */
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
    SLTR_STATE.lineHeight = 1.35;

    document.getElementById('sltrModal').classList.add('open');

    await sltrLoad();
  } catch (e) {
    console.error('openPermissionLetterTemplateEditor:', e);
    showToast(
      e.message || 'Gagal membuka editor template surat.',
      'error'
    );
  }
}
