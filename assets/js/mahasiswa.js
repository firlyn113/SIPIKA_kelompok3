/* ============================================================
   SIPIKA — mahasiswa.js
   Interaksi JavaScript DOM & Events untuk role MAHASISWA.
   Halaman: dashboard.html, pengajuan.html, riwayat.html

   Ketentuan yang diikuti (Master Guideline SIPIKA):
   - Durasi dihitung dari selisih tanggal+jam (bukan hitungan hari kalender).
   - Alur validasi mengikuti durasi:
       < 24 jam  : Dosen → Admin Jurusan
       = 24 jam  : Dosen → Ketua Jurusan/Sekjur → Admin Jurusan
       > 24 jam  : Dosen → Ketua Jurusan/Sekjur → BAAK → Admin Jurusan
   - Data dummy hanya milik role Mahasiswa (key localStorage ber-namespace
     "sipika_mahasiswa_*"). Tidak ada sinkronisasi dengan role lain.
   - Mahasiswa hanya mengajukan dan melihat riwayatnya sendiri; keputusan
     validator tidak disimulasikan di sini.

   Bergantung pada: assets/js/common.js (namespace SIPIKA)
   ============================================================ */
(function () {
  'use strict';

  const U = window.SIPIKA;

  /* ============================================================
     1. KONSTANTA
     ============================================================ */

  const KEY_PENGAJUAN = 'sipika_mahasiswa_pengajuan';
  const KEY_NOTIF = 'sipika_mahasiswa_notifikasi';
  const KEY_FLASH = 'sipika_mahasiswa_flash'; // sessionStorage

  const PROFIL = { nama: 'Firly Nurrohman', nim: '250115042' };

  const MS_PER_JAM = 60 * 60 * 1000;
  const BATAS_SATU_HARI_MS = 24 * MS_PER_JAM;

  const MAKS_UKURAN_BUKTI = 2 * 1024 * 1024; // 2 MB
  const EKSTENSI_BUKTI = ['pdf', 'png', 'jpg', 'jpeg'];
  const MIN_ALASAN = 10;
  const MAKS_ALASAN = 500;

  /** Tahap validator. `status` = status pengajuan saat menunggu tahap tsb. */
  const PERAN = {
    dosen: { label: 'Dosen', singkat: 'Dosen', status: 'Menunggu Validasi Dosen' },
    kajur: { label: 'Ketua Jurusan / Sekjur', singkat: 'Kajur', status: 'Menunggu Validasi Ketua Jurusan/Sekjur' },
    baak: { label: 'BAAK', singkat: 'BAAK', status: 'Menunggu Validasi BAAK' },
    admin: { label: 'Admin Jurusan', singkat: 'Admin', status: 'Menunggu Admin Jurusan' }
  };

  const KATEGORI = {
    kurang: { label: '< 1 Hari', alur: ['dosen', 'admin'] },
    tepat: { label: '= 1 Hari', alur: ['dosen', 'kajur', 'admin'] },
    lebih: { label: '> 1 Hari', alur: ['dosen', 'kajur', 'baak', 'admin'] }
  };

  /* ============================================================
     2. PERHITUNGAN DURASI & ALUR
     ============================================================ */

  /**
   * Menghitung durasi dari tanggal+jam mulai dan selesai.
   * Mengembalikan { ok: true, selisihMs, durasiJam, kategori } atau
   * { ok: false, alasan: 'kosong' | 'tidak-valid' | 'urutan' }.
   */
  function hitungDurasi(tanggalMulai, tanggalSelesai) {
    if (!tanggalMulai || !tanggalSelesai) return { ok: false, alasan: 'kosong' };

    const waktuMulai = new Date(tanggalMulai);
    const waktuSelesai = new Date(tanggalSelesai);
    if (isNaN(waktuMulai.getTime()) || isNaN(waktuSelesai.getTime())) {
      return { ok: false, alasan: 'tidak-valid' };
    }

    const selisihMs = waktuSelesai - waktuMulai;
    if (selisihMs <= 0) return { ok: false, alasan: 'urutan' };

    const durasiJam = selisihMs / MS_PER_JAM;

    let kunci;
    if (selisihMs < BATAS_SATU_HARI_MS) kunci = 'kurang';
    else if (selisihMs === BATAS_SATU_HARI_MS) kunci = 'tepat';
    else kunci = 'lebih';

    return {
      ok: true,
      selisihMs: selisihMs,
      durasiJam: durasiJam,
      kunci: kunci,
      kategori: KATEGORI[kunci].label,
      alur: KATEGORI[kunci].alur.slice()
    };
  }

  /** 6.5 jam → '6 jam 30 menit'; 26 jam → '26 jam (1 hari 2 jam)'. */
  function formatDurasi(selisihMs) {
    const totalMenit = Math.round(selisihMs / 60000);
    const jam = Math.floor(totalMenit / 60);
    const menit = totalMenit % 60;

    const bagian = [];
    if (jam > 0) bagian.push(jam + ' jam');
    if (menit > 0) bagian.push(menit + ' menit');
    let teks = bagian.join(' ') || '0 menit';

    if (jam >= 24) {
      const hari = Math.floor(jam / 24);
      const sisaJam = jam % 24;
      let ekuivalen = hari + ' hari';
      if (sisaJam > 0) ekuivalen += ' ' + sisaJam + ' jam';
      if (menit > 0) ekuivalen += ' ' + menit + ' menit';
      teks += ' (' + ekuivalen + ')';
    }
    return teks;
  }

  function namaAlur(alur) {
    return alur.map(function (k) { return PERAN[k].label; }).join(' → ');
  }

  /* ============================================================
     3. DATA DUMMY (localStorage khusus Mahasiswa)
     ============================================================ */

  /** Melengkapi atribut turunan agar selalu konsisten dengan durasi. */
  function lengkapiPengajuan(dasar) {
    const hasil = hitungDurasi(dasar.tanggalMulai, dasar.tanggalSelesai);
    return Object.assign({
      nim: PROFIL.nim,
      nama: PROFIL.nama,
      durasiJam: Number(hasil.durasiJam.toFixed(2)),
      kategoriDurasi: hasil.kategori,
      alurValidasi: hasil.alur
    }, dasar);
  }

  function dataAwal() {
    return [
      {
        kodeTiket: 'SPK-2026-001', jenisIzin: 'Tugas Kampus / Lomba',
        tanggalMulai: '2026-09-10T08:00', tanggalSelesai: '2026-09-12T17:00',
        alasan: 'Mengikuti lomba karya tulis tingkat regional mewakili program studi.',
        dokumen: 'surat-tugas-lomba.pdf',
        tahapSelesai: 0, status: 'Ditolak',
        catatanPenolakan: 'Surat tugas belum ditandatangani pihak jurusan. Silakan ajukan ulang.',
        diajukanPada: '2026-09-09T10:15:00'
      },
      {
        kodeTiket: 'SPK-2026-002', jenisIzin: 'Izin Alasan Penting',
        tanggalMulai: '2026-09-13T08:00', tanggalSelesai: '2026-09-15T16:00',
        alasan: 'Menghadiri acara keluarga inti di luar kota.',
        dokumen: 'surat-keterangan-keluarga.pdf',
        tahapSelesai: 4, status: 'Disetujui',
        diajukanPada: '2026-09-12T09:00:00'
      },
      {
        kodeTiket: 'SPK-2026-003', jenisIzin: 'Izin Alasan Penting',
        tanggalMulai: '2026-09-18T10:00', tanggalSelesai: '2026-09-18T14:00',
        alasan: 'Mengurus dokumen kependudukan yang harus dilakukan langsung.',
        dokumen: 'bukti-antrean-dukcapil.jpg',
        tahapSelesai: 1, status: 'Menunggu Admin Jurusan',
        diajukanPada: '2026-09-17T15:40:00'
      },
      {
        kodeTiket: 'SPK-2026-004', jenisIzin: 'Sakit',
        tanggalMulai: '2026-09-22T08:00', tanggalSelesai: '2026-09-23T08:00',
        alasan: 'Demam tinggi dan disarankan istirahat penuh oleh dokter.',
        dokumen: 'surat-dokter.pdf',
        tahapSelesai: 2, status: 'Menunggu Admin Jurusan',
        diajukanPada: '2026-09-21T19:30:00'
      },
      {
        kodeTiket: 'SPK-2026-005', jenisIzin: 'Izin Alasan Penting',
        tanggalMulai: '2026-10-20T08:00', tanggalSelesai: '2026-10-21T08:00',
        alasan: 'Mendampingi anggota keluarga yang menjalani tindakan medis.',
        dokumen: 'surat-rumah-sakit.pdf',
        tahapSelesai: 1, status: 'Menunggu Validasi Ketua Jurusan/Sekjur',
        diajukanPada: '2026-10-19T20:05:00'
      },
      {
        kodeTiket: 'SPK-2026-006', jenisIzin: 'Sakit',
        tanggalMulai: '2026-11-03T13:00', tanggalSelesai: '2026-11-03T16:00',
        alasan: 'Sakit kepala berat sehingga tidak dapat mengikuti perkuliahan sore.',
        dokumen: 'surat-dokter-klinik.pdf',
        tahapSelesai: 0, status: 'Menunggu Validasi Dosen',
        diajukanPada: '2026-11-03T08:30:00'
      }
    ].map(lengkapiPengajuan);
  }

  function muatPengajuan() {
    const tersimpan = U.storage.baca(KEY_PENGAJUAN, null);
    if (Array.isArray(tersimpan)) return tersimpan;

    // Belum ada / rusak → isi data awal untuk role ini saja
    const awal = dataAwal();
    U.storage.tulis(KEY_PENGAJUAN, awal);
    return awal;
  }

  function simpanPengajuan(data) {
    return U.storage.tulis(KEY_PENGAJUAN, data);
  }

  function urutkanTerbaru(data) {
    return data.slice().sort(function (a, b) {
      return new Date(b.diajukanPada) - new Date(a.diajukanPada);
    });
  }

  function buatKodeTiket(data) {
    const prefix = 'SPK-' + new Date().getFullYear() + '-';
    let maks = 0;
    data.forEach(function (item) {
      if (item.kodeTiket && item.kodeTiket.indexOf(prefix) === 0) {
        const n = parseInt(item.kodeTiket.slice(prefix.length), 10);
        if (n > maks) maks = n;
      }
    });
    return prefix + String(maks + 1).padStart(3, '0');
  }

  /* ---------- Flash message antar-halaman ---------- */

  function setFlash(pesan) {
    try { sessionStorage.setItem(KEY_FLASH, pesan); } catch (err) { /* abaikan */ }
  }

  function ambilFlash() {
    try {
      const pesan = sessionStorage.getItem(KEY_FLASH);
      if (pesan) sessionStorage.removeItem(KEY_FLASH);
      return pesan;
    } catch (err) {
      return null;
    }
  }

  /* ============================================================
     4. NOTIFIKASI (khusus Mahasiswa)
     ============================================================ */

  function notifAwal() {
    const sekarang = Date.now();
    function lalu(menit) { return new Date(sekarang - menit * 60000).toISOString(); }
    return [
      { id: 'n-awal-1', kodeTiket: 'SPK-2026-005', pesan: 'telah divalidasi Dosen. Menunggu Ketua Jurusan/Sekjur.', waktu: lalu(10), dibaca: false },
      { id: 'n-awal-2', kodeTiket: 'SPK-2026-003', pesan: 'telah divalidasi Dosen. Menunggu Admin Jurusan.', waktu: lalu(60), dibaca: false },
      { id: 'n-awal-3', kodeTiket: 'SPK-2026-006', pesan: 'berhasil dikirim dan menunggu validasi Dosen.', waktu: lalu(180), dibaca: true }
    ];
  }

  function muatNotif() {
    const tersimpan = U.storage.baca(KEY_NOTIF, null);
    if (Array.isArray(tersimpan)) return tersimpan;
    const awal = notifAwal();
    U.storage.tulis(KEY_NOTIF, awal);
    return awal;
  }

  function tambahNotif(kodeTiket, pesan) {
    const daftar = muatNotif();
    daftar.unshift({
      id: 'n-' + Date.now(),
      kodeTiket: kodeTiket,
      pesan: pesan,
      waktu: new Date().toISOString(),
      dibaca: false
    });
    U.storage.tulis(KEY_NOTIF, daftar.slice(0, 20));
  }

  function initNotifikasi() {
    const tombol = document.getElementById('notifBtn');
    const dropdown = document.getElementById('notifDropdown');
    const tandaiSemua = document.getElementById('markReadBtn');
    const badge = document.getElementById('notifBadge');
    if (!tombol || !dropdown || !badge) return;
    const daftarEl = dropdown.querySelector('.notif-list');

    // Aksesibilitas: lonceng dapat dioperasikan dengan keyboard
    tombol.setAttribute('role', 'button');
    tombol.setAttribute('tabindex', '0');
    tombol.setAttribute('aria-haspopup', 'true');
    tombol.setAttribute('aria-expanded', 'false');

    function render() {
      const daftar = muatNotif();
      const belumDibaca = daftar.filter(function (n) { return !n.dibaca; }).length;

      badge.textContent = belumDibaca > 9 ? '9+' : String(belumDibaca);
      badge.style.display = belumDibaca > 0 ? '' : 'none';
      tombol.title = belumDibaca > 0 ? belumDibaca + ' notifikasi baru' : 'Tidak ada notifikasi baru';

      daftarEl.innerHTML = '';
      if (daftar.length === 0) {
        const kosong = U.buatElemen('li', 'notif-item', 'Belum ada notifikasi.');
        kosong.style.cursor = 'default';
        daftarEl.appendChild(kosong);
        return;
      }

      daftar.forEach(function (n) {
        const li = U.buatElemen('li', 'notif-item' + (n.dibaca ? '' : ' unread'));
        li.dataset.id = n.id;

        const isi = document.createElement('div');
        const kode = U.buatElemen('strong', '', n.kodeTiket);
        isi.appendChild(kode);
        isi.appendChild(document.createTextNode(' ' + n.pesan));

        li.appendChild(isi);
        li.appendChild(U.buatElemen('div', 'time', U.waktuRelatif(n.waktu)));
        daftarEl.appendChild(li);
      });
    }

    function setBuka(buka) {
      dropdown.classList.toggle('show', buka);
      tombol.setAttribute('aria-expanded', String(buka));
    }

    tombol.addEventListener('click', function (e) {
      e.stopPropagation();
      setBuka(!dropdown.classList.contains('show'));
    });
    tombol.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setBuka(!dropdown.classList.contains('show'));
      }
    });

    // Klik di dalam dropdown tidak menutupnya; klik di luar menutup
    dropdown.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { setBuka(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setBuka(false);
    });

    // Klik satu notifikasi → tandai sudah dibaca
    daftarEl.addEventListener('click', function (e) {
      const item = e.target.closest('.notif-item');
      if (!item || !item.dataset.id) return;
      const daftar = muatNotif();
      daftar.forEach(function (n) { if (n.id === item.dataset.id) n.dibaca = true; });
      U.storage.tulis(KEY_NOTIF, daftar);
      render();
    });

    if (tandaiSemua) {
      tandaiSemua.setAttribute('role', 'button');
      tandaiSemua.setAttribute('tabindex', '0');
      const tandai = function () {
        const daftar = muatNotif();
        const adaBaru = daftar.some(function (n) { return !n.dibaca; });
        daftar.forEach(function (n) { n.dibaca = true; });
        U.storage.tulis(KEY_NOTIF, daftar);
        render();
        if (adaBaru) U.toast('Semua notifikasi ditandai sudah dibaca.', 'success');
      };
      tandaiSemua.addEventListener('click', tandai);
      tandaiSemua.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tandai(); }
      });
    }

    render();
  }

  /* ============================================================
     5. PROFIL (modal)
     ============================================================ */

  function initProfil() {
    const link = document.getElementById('link-profil');
    if (!link) return;

    link.addEventListener('click', function (e) {
      e.preventDefault();
      const total = muatPengajuan().length;
      U.bukaModal({
        judul: 'Profil Mahasiswa',
        body:
          '<dl class="kv">' +
          '<dt>Nama</dt><dd>' + U.escapeHtml(PROFIL.nama) + '</dd>' +
          '<dt>NIM</dt><dd>' + U.escapeHtml(PROFIL.nim) + '</dd>' +
          '<dt>Peran</dt><dd>Mahasiswa</dd>' +
          '<dt>Total pengajuan</dt><dd>' + total + '</dd>' +
          '</dl>' +
          '<p class="hint" style="margin-top:12px;">Data profil adalah data dummy untuk keperluan prototype.</p>',
        aksi: [{ label: 'Tutup', varian: 'secondary' }]
      });
    });
  }

  /* ============================================================
     6. KOMPONEN TAMPILAN BERSAMA
     ============================================================ */

  function kelompokStatus(status) {
    if (status === 'Ditolak') return 'ditolak';
    if (status === 'Disetujui' || status === 'Selesai Diarsipkan') return 'disetujui';
    return 'proses';
  }

  function kelasBadge(status) {
    if (status === 'Ditolak') return 'badge-ditolak';
    if (status === 'Disetujui') return 'badge-disetujui';
    if (status === 'Selesai Diarsipkan') return 'badge-info';
    return 'badge-menunggu';
  }

  function htmlBadgeStatus(status) {
    return '<span class="badge ' + kelasBadge(status) + '">' + U.escapeHtml(status) + '</span>';
  }

  /**
   * Menyusun daftar tahap (termasuk Mahasiswa) beserta kondisinya
   * berdasarkan alurValidasi + tahapSelesai + status pengajuan.
   * state: 'completed' | 'pending' | 'rejected' | 'idle'
   */
  function susunTahap(item) {
    const tahap = [{ kunci: 'mahasiswa', label: 'Mahasiswa', singkat: 'Mhs', state: 'completed', sub: 'Mengajukan' }];
    const ditolak = item.status === 'Ditolak';

    item.alurValidasi.forEach(function (kunci, i) {
      const info = PERAN[kunci];
      const t = { kunci: kunci, label: info.label, singkat: info.singkat, state: 'idle', sub: 'Belum diproses' };

      if (i < item.tahapSelesai) {
        t.state = 'completed';
        if (kunci === 'admin') t.sub = item.status === 'Selesai Diarsipkan' ? 'Diarsipkan' : 'Disetujui';
        else t.sub = 'Disetujui';
      } else if (i === item.tahapSelesai) {
        if (ditolak) {
          t.state = 'rejected';
          t.sub = 'Ditolak';
        } else {
          t.state = 'pending';
          t.sub = kunci === 'admin' ? 'Menunggu Pengarsipan' : 'Menunggu Validasi';
        }
      }
      tahap.push(t);
    });
    return tahap;
  }

  const SIMBOL = { completed: '\u2713', pending: '\u2026', rejected: '\u2715' };

  /** Stepper horizontal (memakai kelas .stepper/.step global). */
  function buatStepper(tahap) {
    const stepper = U.buatElemen('div', 'stepper');
    tahap.forEach(function (t, i) {
      const step = U.buatElemen('div', 'step ' + (t.state === 'idle' ? '' : t.state));
      step.appendChild(U.buatElemen('div', 'line'));
      step.appendChild(U.buatElemen('div', 'dot', SIMBOL[t.state] || String(i + 1)));
      step.appendChild(U.buatElemen('div', 'label', t.label));
      if (t.sub) step.appendChild(U.buatElemen('div', 'sub', t.sub));
      stepper.appendChild(step);
    });
    return stepper;
  }

  /** Teks ringkas progres untuk kolom tabel: Dosen (✓) → Kajur (⏳) → Admin */
  function teksProgres(item) {
    return susunTahap(item).slice(1).map(function (t) {
      const tanda = { completed: ' (✓)', pending: ' (⏳)', rejected: ' (✕)', idle: '' }[t.state];
      return t.singkat + tanda;
    }).join(' → ');
  }

  function tampilkanBannerFlash(containerId, judul) {
    const pesan = ambilFlash();
    const container = document.getElementById(containerId);
    if (pesan && container) {
      U.banner(container, { tipe: 'success', judul: judul, pesan: pesan });
    }
  }

  /* ============================================================
     7. HALAMAN: DASHBOARD
     ============================================================ */

  function initDashboard() {
    const data = muatPengajuan();

    // Statistik
    const hitung = { proses: 0, disetujui: 0, ditolak: 0 };
    data.forEach(function (item) { hitung[kelompokStatus(item.status)] += 1; });

    document.getElementById('stat-total').textContent = data.length;
    document.getElementById('stat-proses').textContent = hitung.proses;
    document.getElementById('stat-setuju').textContent = hitung.disetujui;
    document.getElementById('stat-tolak').textContent = hitung.ditolak;

    // Kartu statistik dapat diklik → membuka riwayat dengan filter terkait
    document.querySelectorAll('.stat-card[data-filter]').forEach(function (kartu) {
      const buka = function () {
        const filter = kartu.dataset.filter;
        window.location.href = 'riwayat.html' + (filter === 'semua' ? '' : '?status=' + filter);
      };
      kartu.style.cursor = 'pointer';
      kartu.setAttribute('role', 'link');
      kartu.setAttribute('tabindex', '0');
      kartu.addEventListener('click', buka);
      kartu.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') buka();
      });
    });

    // Pengajuan terbaru (3 teratas)
    const tbody = document.getElementById('recent-body');
    if (tbody) {
      const terbaru = urutkanTerbaru(data).slice(0, 3);
      if (terbaru.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Belum ada pengajuan. Klik "Buat Pengajuan Baru" untuk memulai.</td></tr>';
      } else {
        tbody.innerHTML = terbaru.map(function (item) {
          return '<tr>' +
            '<td><strong>' + U.escapeHtml(item.kodeTiket) + '</strong></td>' +
            '<td>' + U.escapeHtml(item.jenisIzin) + '</td>' +
            '<td>' + U.escapeHtml(item.kategoriDurasi) + '</td>' +
            '<td>' + htmlBadgeStatus(item.status) + '</td>' +
            '</tr>';
        }).join('');
      }
    }

    tampilkanBannerFlash('feedback-banner', 'Berhasil!');

    // Reset data demo (hanya data milik role Mahasiswa)
    const btnReset = document.getElementById('btn-reset-demo');
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        U.bukaModal({
          judul: 'Reset Data Demo?',
          body: '<p>Seluruh pengajuan dan notifikasi <strong>role Mahasiswa</strong> akan dikembalikan ke data awal. Data role lain tidak terpengaruh.</p>',
          aksi: [
            { label: 'Batal', varian: 'secondary' },
            {
              label: 'Ya, Reset', varian: 'danger',
              onClick: function () {
                U.storage.hapus(KEY_PENGAJUAN);
                U.storage.hapus(KEY_NOTIF);
                setFlash('Data demo Mahasiswa dikembalikan ke kondisi awal.');
                window.location.reload();
              }
            }
          ]
        });
      });
    }
  }

  /* ============================================================
     8. HALAMAN: FORM PENGAJUAN
     ============================================================ */

  function initPengajuan() {
    const form = document.getElementById('form-pengajuan');
    if (!form) return;

    const alertForm = document.getElementById('form-alert');
    const btnSubmit = document.getElementById('btnSubmit');
    const durasiInfo = document.getElementById('durasi-info');
    const stepperWadah = document.getElementById('stepper-preview');
    const counterAlasan = document.getElementById('alasan-counter');
    const infoBukti = document.getElementById('bukti-info');

    const bidang = {
      jenis: { el: document.getElementById('jenis'), err: document.getElementById('err-jenis') },
      mulai: { el: document.getElementById('tgl-mulai'), err: document.getElementById('err-tgl-mulai') },
      selesai: { el: document.getElementById('tgl-selesai'), err: document.getElementById('err-tgl-selesai') },
      alasan: { el: document.getElementById('alasan'), err: document.getElementById('err-alasan') },
      bukti: { el: document.getElementById('bukti'), err: document.getElementById('err-bukti') }
    };

    const hariIni = U.tanggalLokal();
    let sudahCoba = false;       // sudah pernah menekan "Kirim"
    const tersentuh = new Set(); // bidang yang sudah pernah di-blur

    // Tanggal tidak boleh mundur: batas minimal = awal hari ini
    bidang.mulai.el.min = hariIni + 'T00:00';
    bidang.selesai.el.min = hariIni + 'T00:00';

    /* ---------- Aturan validasi per bidang ---------- */

    const aturan = {
      jenis: function () {
        return bidang.jenis.el.value ? '' : 'Pilih jenis perizinan.';
      },
      mulai: function () {
        const v = bidang.mulai.el.value;
        if (!v) return 'Tanggal dan jam mulai wajib diisi.';
        if (isNaN(new Date(v).getTime())) return 'Tanggal dan jam mulai tidak valid.';
        if (v.slice(0, 10) < hariIni) return 'Tanggal mulai tidak boleh kurang dari hari ini.';
        return '';
      },
      selesai: function () {
        const v = bidang.selesai.el.value;
        if (!v) return 'Tanggal dan jam selesai wajib diisi.';
        if (isNaN(new Date(v).getTime())) return 'Tanggal dan jam selesai tidak valid.';
        if (v.slice(0, 10) < hariIni) return 'Tanggal selesai tidak boleh kurang dari hari ini.';
        const mulai = bidang.mulai.el.value;
        if (mulai && !isNaN(new Date(mulai).getTime()) && new Date(v) <= new Date(mulai)) {
          return 'Waktu selesai harus lebih akhir daripada waktu mulai.';
        }
        return '';
      },
      alasan: function () {
        const panjang = bidang.alasan.el.value.trim().length;
        if (panjang === 0) return 'Alasan ketidakhadiran wajib diisi.';
        if (panjang < MIN_ALASAN) return 'Alasan terlalu singkat (minimal ' + MIN_ALASAN + ' karakter).';
        return '';
      },
      bukti: function () {
        const file = bidang.bukti.el.files[0];
        if (!file) return 'Bukti pendukung wajib diunggah.';
        const ekstensi = file.name.split('.').pop().toLowerCase();
        if (EKSTENSI_BUKTI.indexOf(ekstensi) === -1) return 'Format berkas harus PDF, JPG, atau PNG.';
        if (file.size > MAKS_UKURAN_BUKTI) return 'Ukuran berkas melebihi 2 MB.';
        return '';
      }
    };

    function tampilkanError(nama, pesan) {
      const { el, err } = bidang[nama];
      if (pesan) {
        el.classList.add('field-error');
        el.setAttribute('aria-invalid', 'true');
        err.textContent = pesan;
        err.style.display = 'block';
      } else {
        el.classList.remove('field-error');
        el.removeAttribute('aria-invalid');
        err.textContent = '';
        err.style.display = 'none';
      }
    }

    /** Validasi satu bidang. `tampil` = apakah pesan ditampilkan di layar. */
    function validasi(nama, tampil) {
      const pesan = aturan[nama]();
      if (tampil) tampilkanError(nama, pesan);
      return pesan;
    }

    function bolehTampilkan(nama) {
      return sudahCoba || tersentuh.has(nama) || bidang[nama].el.value !== '';
    }

    /* ---------- Pratinjau durasi & alur ---------- */

    function perbaruiPratinjau() {
      const hasil = hitungDurasi(bidang.mulai.el.value, bidang.selesai.el.value);
      stepperWadah.innerHTML = '';

      if (!hasil.ok) {
        const pesan = {
          kosong: 'Isi tanggal dan jam mulai serta selesai untuk menghitung durasi dan alur validasi secara otomatis.',
          'tidak-valid': 'Tanggal atau jam yang dimasukkan tidak valid.',
          urutan: 'Waktu selesai harus lebih akhir daripada waktu mulai.'
        }[hasil.alasan];
        durasiInfo.innerHTML = '<strong>Durasi:</strong> <span class="text-muted">belum dapat dihitung.</span> ' + U.escapeHtml(pesan);
        stepperWadah.appendChild(U.buatElemen('p', 'text-sm text-muted', 'Alur persetujuan akan tampil setelah durasi valid.'));
        return null;
      }

      durasiInfo.innerHTML =
        '<strong>Durasi:</strong> ' + U.escapeHtml(formatDurasi(hasil.selisihMs)) +
        ' &nbsp;·&nbsp; <strong>Kategori:</strong> <span class="badge badge-info">' + U.escapeHtml(hasil.kategori) + '</span>' +
        '<br><strong>Alur:</strong> Mahasiswa → ' + U.escapeHtml(namaAlur(hasil.alur));

      const tahap = [{ label: 'Mahasiswa', state: 'active' }].concat(
        hasil.alur.map(function (k) { return { label: PERAN[k].label, state: 'idle' }; })
      );
      stepperWadah.appendChild(buatStepper(tahap));
      return hasil;
    }

    function sinkronkanTanggal() {
      // Waktu selesai tidak boleh sebelum waktu mulai
      const mulai = bidang.mulai.el.value;
      bidang.selesai.el.min = (mulai && mulai >= hariIni + 'T00:00') ? mulai : hariIni + 'T00:00';

      perbaruiPratinjau();
      if (bolehTampilkan('mulai')) validasi('mulai', true);
      if (bolehTampilkan('selesai')) validasi('selesai', true);
    }

    /* ---------- Pasang event ---------- */

    bidang.jenis.el.addEventListener('change', function () { validasi('jenis', true); });
    bidang.jenis.el.addEventListener('blur', function () { tersentuh.add('jenis'); });

    ['mulai', 'selesai'].forEach(function (nama) {
      bidang[nama].el.addEventListener('input', sinkronkanTanggal);
      bidang[nama].el.addEventListener('change', sinkronkanTanggal);
      bidang[nama].el.addEventListener('blur', function () {
        tersentuh.add(nama);
        sinkronkanTanggal();
      });
    });

    bidang.alasan.el.addEventListener('input', function () {
      const panjang = bidang.alasan.el.value.length;
      counterAlasan.textContent = panjang + ' / ' + MAKS_ALASAN + ' karakter';
      if (sudahCoba || tersentuh.has('alasan')) validasi('alasan', true);
    });
    bidang.alasan.el.addEventListener('blur', function () {
      tersentuh.add('alasan');
      validasi('alasan', true);
    });

    bidang.bukti.el.addEventListener('change', function () {
      const file = bidang.bukti.el.files[0];
      infoBukti.textContent = file
        ? 'Berkas dipilih: ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)'
        : 'Format berkas: PDF, JPG, PNG (Maks. 2MB)';
      validasi('bukti', true);
    });

    /* ---------- Submit ---------- */

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      sudahCoba = true;
      alertForm.innerHTML = '';

      const urutan = ['jenis', 'mulai', 'selesai', 'alasan', 'bukti'];
      const bermasalah = urutan.filter(function (nama) { return validasi(nama, true) !== ''; });

      if (bermasalah.length > 0) {
        U.banner(alertForm, {
          tipe: 'danger',
          judul: 'Formulir belum lengkap.',
          pesan: 'Periksa ' + bermasalah.length + ' isian yang ditandai merah.'
        });
        bidang[bermasalah[0]].el.focus();
        return;
      }

      const hasil = hitungDurasi(bidang.mulai.el.value, bidang.selesai.el.value);
      if (!hasil.ok) return; // pengaman; seharusnya sudah tertangkap validasi

      bukaKonfirmasi(hasil);
    });

    function bukaKonfirmasi(hasil) {
      const file = bidang.bukti.el.files[0];
      const ringkasan = {
        jenis: bidang.jenis.el.value,
        mulai: bidang.mulai.el.value,
        selesai: bidang.selesai.el.value,
        alasan: bidang.alasan.el.value.trim(),
        dokumen: file.name
      };

      const body =
        '<p class="hint" style="margin-bottom:12px;">Periksa kembali data pengajuan sebelum dikirim.</p>' +
        '<dl class="kv">' +
        '<dt>Jenis Izin</dt><dd>' + U.escapeHtml(ringkasan.jenis) + '</dd>' +
        '<dt>Mulai</dt><dd>' + U.escapeHtml(U.formatWaktu(ringkasan.mulai)) + '</dd>' +
        '<dt>Selesai</dt><dd>' + U.escapeHtml(U.formatWaktu(ringkasan.selesai)) + '</dd>' +
        '<dt>Durasi</dt><dd>' + U.escapeHtml(formatDurasi(hasil.selisihMs)) +
        ' <span class="badge badge-info">' + U.escapeHtml(hasil.kategori) + '</span></dd>' +
        '<dt>Alur Validasi</dt><dd>' + U.escapeHtml(namaAlur(hasil.alur)) + '</dd>' +
        '<dt>Alasan</dt><dd>' + U.escapeHtml(ringkasan.alasan) + '</dd>' +
        '<dt>Dokumen</dt><dd>' + U.escapeHtml(ringkasan.dokumen) + '</dd>' +
        '</dl>';

      U.bukaModal({
        judul: 'Konfirmasi Pengajuan',
        body: body,
        aksi: [
          { label: 'Periksa Lagi', varian: 'secondary' },
          {
            label: 'Ya, Kirim Pengajuan', varian: 'primary',
            tetapBuka: true,
            onClick: function (tombol) {
              tombol.disabled = true; // cegah klik ganda
              kirimPengajuan(ringkasan, hasil, tombol);
            }
          }
        ]
      });
    }

    function kirimPengajuan(ringkasan, hasil, tombolKonfirmasi) {
      const data = muatPengajuan();
      const pengajuan = {
        kodeTiket: buatKodeTiket(data),
        nim: PROFIL.nim,
        nama: PROFIL.nama,
        jenisIzin: ringkasan.jenis,
        tanggalMulai: ringkasan.mulai,
        tanggalSelesai: ringkasan.selesai,
        alasan: ringkasan.alasan,
        dokumen: ringkasan.dokumen,
        durasiJam: Number(hasil.durasiJam.toFixed(2)),
        kategoriDurasi: hasil.kategori,
        alurValidasi: hasil.alur,
        tahapSelesai: 0,
        status: PERAN.dosen.status, // Dosen selalu validator pertama
        diajukanPada: new Date().toISOString()
      };

      data.unshift(pengajuan);
      if (!simpanPengajuan(data)) {
        tombolKonfirmasi.disabled = false;
        U.tutupModal();
        U.banner(alertForm, {
          tipe: 'danger',
          judul: 'Gagal menyimpan.',
          pesan: 'Penyimpanan browser tidak tersedia. Pengajuan belum terkirim.'
        });
        return;
      }

      tambahNotif(pengajuan.kodeTiket, 'berhasil dikirim dan menunggu validasi Dosen.');
      setFlash('Pengajuan izin dengan kode ' + pengajuan.kodeTiket + ' berhasil dikirim dan menunggu validasi Dosen.');
      window.location.href = 'riwayat.html';
    }

    // Keadaan awal
    counterAlasan.textContent = '0 / ' + MAKS_ALASAN + ' karakter';
    perbaruiPratinjau();
  }

  /* ============================================================
     9. HALAMAN: RIWAYAT
     ============================================================ */

  function initRiwayat() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    const data = urutkanTerbaru(muatPengajuan());
    const inputCari = document.getElementById('filter-search');
    const selectKategori = document.getElementById('filter-kategori');
    const wadahChip = document.getElementById('filter-chips');
    const infoHasil = document.getElementById('hasil-info');
    const selectLacak = document.getElementById('lacak-select');
    const wadahLacak = document.getElementById('lacak-stepper');
    const ringkasLacak = document.getElementById('lacak-ringkas');

    tampilkanBannerFlash('alert-container', 'Pengajuan berhasil!');

    const CHIP = [
      { kunci: 'semua', label: 'Semua' },
      { kunci: 'proses', label: 'Diproses' },
      { kunci: 'disetujui', label: 'Disetujui' },
      { kunci: 'ditolak', label: 'Ditolak' }
    ];

    // Status awal dapat datang dari kartu statistik dashboard (?status=...)
    const paramStatus = new URLSearchParams(window.location.search).get('status');
    const filter = {
      status: CHIP.some(function (c) { return c.kunci === paramStatus; }) ? paramStatus : 'semua',
      kategori: '',
      kata: ''
    };

    /* ---------- Chip filter status ---------- */

    function jumlahStatus(kunci) {
      if (kunci === 'semua') return data.length;
      return data.filter(function (i) { return kelompokStatus(i.status) === kunci; }).length;
    }

    function renderChip() {
      wadahChip.innerHTML = '';
      CHIP.forEach(function (c) {
        const btn = U.buatElemen('button', 'chip-filter' + (filter.status === c.kunci ? ' active' : ''),
          c.label + ' (' + jumlahStatus(c.kunci) + ')');
        btn.type = 'button';
        btn.dataset.status = c.kunci;
        btn.setAttribute('aria-pressed', String(filter.status === c.kunci));
        wadahChip.appendChild(btn);
      });
    }

    /* ---------- Tabel ---------- */

    function terapkanFilter() {
      const kata = filter.kata.trim().toLowerCase();
      return data.filter(function (item) {
        if (filter.status !== 'semua' && kelompokStatus(item.status) !== filter.status) return false;
        if (filter.kategori && item.kategoriDurasi !== filter.kategori) return false;
        if (kata) {
          const gudang = [item.kodeTiket, item.jenisIzin, item.status, item.dokumen].join(' ').toLowerCase();
          if (gudang.indexOf(kata) === -1) return false;
        }
        return true;
      });
    }

    function renderTabel() {
      const hasil = terapkanFilter();

      if (data.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Belum ada riwayat pengajuan izin. ' +
          '<a href="pengajuan.html">Ajukan izin sekarang</a>.</td></tr>';
        infoHasil.textContent = '';
        return;
      }

      if (hasil.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Tidak ada pengajuan yang cocok dengan pencarian atau filter. ' +
          '<a href="#" id="link-reset-filter">Reset filter</a></td></tr>';
        infoHasil.textContent = 'Menampilkan 0 dari ' + data.length + ' pengajuan';
        return;
      }

      tbody.innerHTML = hasil.map(function (item, i) {
        return '<tr>' +
          '<td>' + (i + 1) + '</td>' +
          '<td><strong>' + U.escapeHtml(item.kodeTiket) + '</strong></td>' +
          '<td>' + U.escapeHtml(item.jenisIzin) + '</td>' +
          '<td style="white-space:nowrap;">' + U.escapeHtml(U.formatWaktu(item.tanggalMulai)) +
          '<br><span class="hint">s.d. ' + U.escapeHtml(U.formatWaktu(item.tanggalSelesai)) + '</span></td>' +
          '<td>' + U.escapeHtml(formatDurasi(item.durasiJam * MS_PER_JAM)) +
          '<br><span class="badge badge-info">' + U.escapeHtml(item.kategoriDurasi) + '</span></td>' +
          '<td>' + htmlBadgeStatus(item.status) + '</td>' +
          '<td style="font-size:.85rem;color:#4b5563;">' + U.escapeHtml(teksProgres(item)) + '</td>' +
          '<td><button type="button" class="btn btn-secondary btn-sm" data-kode="' + U.escapeHtml(item.kodeTiket) + '">Detail</button></td>' +
          '</tr>';
      }).join('');

      infoHasil.textContent = 'Menampilkan ' + hasil.length + ' dari ' + data.length + ' pengajuan';
    }

    function resetFilter() {
      filter.status = 'semua';
      filter.kategori = '';
      filter.kata = '';
      inputCari.value = '';
      selectKategori.value = '';
      renderChip();
      renderTabel();
    }

    /* ---------- Event filter ---------- */

    inputCari.addEventListener('input', function () {
      filter.kata = inputCari.value;
      renderTabel();
    });

    selectKategori.addEventListener('change', function () {
      filter.kategori = selectKategori.value;
      renderTabel();
    });

    wadahChip.addEventListener('click', function (e) {
      const btn = e.target.closest('.chip-filter');
      if (!btn) return;
      filter.status = btn.dataset.status;
      renderChip();
      renderTabel();
    });

    tbody.addEventListener('click', function (e) {
      const reset = e.target.closest('#link-reset-filter');
      if (reset) {
        e.preventDefault();
        resetFilter();
        return;
      }
      const btn = e.target.closest('button[data-kode]');
      if (!btn) return;
      const item = data.find(function (i) { return i.kodeTiket === btn.dataset.kode; });
      if (item) bukaDetail(item);
    });

    /* ---------- Modal detail ---------- */

    function bukaDetail(item) {
      const tahap = susunTahap(item);

      const timeline = U.buatElemen('ul', 'timeline');
      tahap.forEach(function (t) {
        const li = document.createElement('li');
        const kelasDot = { completed: '', pending: ' pending', rejected: ' rejected', idle: ' idle' }[t.state];
        li.appendChild(U.buatElemen('div', 'tdot' + kelasDot, SIMBOL[t.state] || '·'));
        const isi = U.buatElemen('div', 'tcontent');
        isi.appendChild(U.buatElemen('strong', '', t.label));
        isi.appendChild(U.buatElemen('div', 'when', t.sub));
        li.appendChild(isi);
        timeline.appendChild(li);
      });

      let catatan = '';
      if (item.status === 'Ditolak') {
        const penolak = PERAN[item.alurValidasi[item.tahapSelesai]];
        catatan =
          '<div class="sipika-banner danger" style="margin:14px 0 0;"><span><strong>Ditolak oleh ' +
          U.escapeHtml(penolak ? penolak.label : 'validator') + '.</strong> ' +
          U.escapeHtml(item.catatanPenolakan || 'Tidak ada catatan.') + '</span></div>';
      }

      const body = document.createElement('div');
      body.innerHTML =
        '<dl class="kv">' +
        '<dt>Kode Tiket</dt><dd><strong>' + U.escapeHtml(item.kodeTiket) + '</strong></dd>' +
        '<dt>Status</dt><dd>' + htmlBadgeStatus(item.status) + '</dd>' +
        '<dt>Nama / NIM</dt><dd>' + U.escapeHtml(item.nama) + ' / ' + U.escapeHtml(item.nim) + '</dd>' +
        '<dt>Jenis Izin</dt><dd>' + U.escapeHtml(item.jenisIzin) + '</dd>' +
        '<dt>Mulai</dt><dd>' + U.escapeHtml(U.formatWaktu(item.tanggalMulai)) + '</dd>' +
        '<dt>Selesai</dt><dd>' + U.escapeHtml(U.formatWaktu(item.tanggalSelesai)) + '</dd>' +
        '<dt>Durasi</dt><dd>' + U.escapeHtml(formatDurasi(item.durasiJam * MS_PER_JAM)) +
        ' <span class="badge badge-info">' + U.escapeHtml(item.kategoriDurasi) + '</span></dd>' +
        '<dt>Alasan</dt><dd>' + U.escapeHtml(item.alasan) + '</dd>' +
        '</dl>' +
        '<div class="doc-preview" style="margin-top:14px;"><span>📄</span><span>' +
        U.escapeHtml(item.dokumen) + '</span></div>' +
        catatan +
        '<h3 style="margin:18px 0 12px;">Status Validasi</h3>';
      body.appendChild(timeline);

      U.bukaModal({
        judul: 'Detail Pengajuan',
        body: body,
        lebar: '600px',
        aksi: [{ label: 'Tutup', varian: 'secondary' }]
      });
    }

    /* ---------- Pelacakan status ---------- */

    function renderLacak(kode) {
      const item = data.find(function (i) { return i.kodeTiket === kode; });
      wadahLacak.innerHTML = '';
      ringkasLacak.innerHTML = '';
      if (!item) return;

      wadahLacak.appendChild(buatStepper(susunTahap(item)));
      ringkasLacak.innerHTML =
        htmlBadgeStatus(item.status) + ' &nbsp;·&nbsp; ' +
        U.escapeHtml(item.jenisIzin) + ' &nbsp;·&nbsp; ' +
        U.escapeHtml(formatDurasi(item.durasiJam * MS_PER_JAM)) +
        ' <span class="badge badge-info">' + U.escapeHtml(item.kategoriDurasi) + '</span>';
    }

    function isiSelectLacak() {
      selectLacak.innerHTML = '';
      data.forEach(function (item) {
        const opt = document.createElement('option');
        opt.value = item.kodeTiket;
        opt.textContent = item.kodeTiket + ' — ' + item.jenisIzin + ' (' + item.status + ')';
        selectLacak.appendChild(opt);
      });
      selectLacak.addEventListener('change', function () { renderLacak(selectLacak.value); });
    }

    /* ---------- Render awal ---------- */

    selectKategori.value = '';
    renderChip();
    renderTabel();

    if (data.length === 0) {
      selectLacak.disabled = true;
      wadahLacak.appendChild(U.buatElemen('p', 'text-sm text-muted', 'Belum ada pengajuan yang dapat dilacak.'));
    } else {
      isiSelectLacak();
      renderLacak(data[0].kodeTiket); // pengajuan terbaru
    }
  }

  /* ============================================================
     10. PENGENDALI HALAMAN
     ============================================================ */

  document.addEventListener('DOMContentLoaded', function () {
    initNotifikasi();
    initProfil();

    const halaman = document.body.dataset.page;
    if (halaman === 'dashboard') initDashboard();
    else if (halaman === 'pengajuan') initPengajuan();
    else if (halaman === 'riwayat') initRiwayat();
  });
})();
