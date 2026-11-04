/* ============================================================
   SIPIKA — common.js
   Interaksi umum yang dipakai bersama semua role:
   sidebar responsif, modal, toast, banner, helper storage/format.

   Catatan integrasi:
   - Semua fungsi berada di namespace global `SIPIKA` agar tidak
     bentrok dengan script role lain.
   - File ini tidak menyimpan data apa pun. Data tiap role disimpan
     oleh file role masing-masing dengan key localStorage sendiri.
   - Gaya komponen tambahan (toast, banner) disisipkan lewat JS
     sehingga style.css global tidak perlu diubah.
   ============================================================ */
(function (global) {
  'use strict';

  const SIPIKA = global.SIPIKA || {};

  /* ---------- Helper dasar ---------- */

  /** Mengamankan teks sebelum disisipkan ke innerHTML. */
  SIPIKA.escapeHtml = function (teks) {
    return String(teks == null ? '' : teks)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /** Membuat elemen dengan class dan teks opsional. */
  SIPIKA.buatElemen = function (tag, className, teks) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (teks !== undefined) el.textContent = teks;
    return el;
  };

  /* ---------- Storage aman (try/catch) ---------- */

  SIPIKA.storage = {
    baca: function (key, fallback) {
      try {
        const raw = global.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    },
    tulis: function (key, nilai) {
      try {
        global.localStorage.setItem(key, JSON.stringify(nilai));
        return true;
      } catch (err) {
        return false;
      }
    },
    hapus: function (key) {
      try {
        global.localStorage.removeItem(key);
      } catch (err) { /* abaikan */ }
    }
  };

  /* ---------- Gaya tambahan (toast + banner) ---------- */

  function sisipkanGaya() {
    if (document.getElementById('sipika-common-style')) return;
    const style = document.createElement('style');
    style.id = 'sipika-common-style';
    style.textContent = [
      '.sipika-toast-wrap{position:fixed;right:20px;bottom:20px;z-index:2000;display:flex;flex-direction:column;gap:10px;max-width:calc(100vw - 40px);}',
      '.sipika-toast{background:var(--surface);color:var(--ink);border:1px solid var(--border);border-left:4px solid var(--primary);border-radius:var(--radius);padding:11px 14px;font-size:.85rem;box-shadow:0 10px 20px -6px rgba(15,23,42,.25);min-width:240px;max-width:360px;animation:sipikaToastIn .2s ease-out;}',
      '.sipika-toast.success{border-left-color:var(--success);}',
      '.sipika-toast.danger{border-left-color:var(--danger);}',
      '.sipika-toast.warning{border-left-color:var(--warning);}',
      '.sipika-toast.keluar{opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;}',
      '@keyframes sipikaToastIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}',
      '.sipika-banner{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px 16px;border-radius:8px;margin-bottom:20px;border-left:4px solid var(--success);background:var(--success-soft);color:#065F46;font-size:.88rem;}',
      '.sipika-banner.danger{border-left-color:var(--danger);background:var(--danger-soft);color:#991B1B;}',
      '.sipika-banner.warning{border-left-color:var(--warning);background:var(--warning-soft);color:#92400E;}',
      '.sipika-banner button{background:none;border:none;color:inherit;font-weight:700;cursor:pointer;font-size:1rem;line-height:1;padding:0 2px;}',
      '.sipika-modal-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;margin-top:18px;}',
      '.modal-header h2{margin:0;}',
      '@media (prefers-reduced-motion: reduce){.sipika-toast{animation:none;}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ---------- Toast ---------- */

  SIPIKA.toast = function (pesan, tipe, durasiMs) {
    sisipkanGaya();
    let wrap = document.querySelector('.sipika-toast-wrap');
    if (!wrap) {
      wrap = SIPIKA.buatElemen('div', 'sipika-toast-wrap');
      wrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(wrap);
    }
    const toast = SIPIKA.buatElemen('div', 'sipika-toast ' + (tipe || 'info'), pesan);
    toast.setAttribute('role', 'status');
    wrap.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('keluar');
      setTimeout(function () { toast.remove(); }, 300);
    }, durasiMs || 3200);
  };

  /* ---------- Banner (alert di dalam halaman) ---------- */

  /**
   * Menampilkan banner yang dapat ditutup di dalam container.
   * opsi: { tipe: 'success'|'danger'|'warning', judul, pesan }
   */
  SIPIKA.banner = function (container, opsi) {
    sisipkanGaya();
    if (!container) return null;
    container.innerHTML = '';

    const banner = SIPIKA.buatElemen('div', 'sipika-banner ' + (opsi.tipe || 'success'));
    banner.setAttribute('role', opsi.tipe === 'danger' ? 'alert' : 'status');

    const teks = SIPIKA.buatElemen('span');
    if (opsi.judul) {
      const strong = SIPIKA.buatElemen('strong', '', opsi.judul);
      teks.appendChild(strong);
      teks.appendChild(document.createTextNode(' '));
    }
    teks.appendChild(document.createTextNode(opsi.pesan || ''));

    const tutup = SIPIKA.buatElemen('button', '', '✕');
    tutup.type = 'button';
    tutup.setAttribute('aria-label', 'Tutup pemberitahuan');
    tutup.addEventListener('click', function () { banner.remove(); });

    banner.appendChild(teks);
    banner.appendChild(tutup);
    container.appendChild(banner);
    return banner;
  };

  /* ---------- Modal ---------- */

  let modalAktif = null;

  SIPIKA.tutupModal = function () {
    if (!modalAktif) return;
    const { overlay, pemicu, onTutup } = modalAktif;
    modalAktif = null;
    overlay.remove();
    document.body.style.overflow = '';
    if (pemicu && typeof pemicu.focus === 'function') pemicu.focus();
    if (typeof onTutup === 'function') onTutup();
  };

  /**
   * Membuka modal memakai kelas .modal-overlay / .modal-content global.
   * opsi: {
   *   judul, body (Node atau string HTML), lebar (mis. '640px'),
   *   aksi: [{ label, varian: 'primary'|'secondary'|'danger', onClick, tetapBuka }],
   *   onTutup
   * }
   * Mengembalikan { tutup, elemen, ... }.
   */
  SIPIKA.bukaModal = function (opsi) {
    sisipkanGaya();
    SIPIKA.tutupModal();

    const overlay = SIPIKA.buatElemen('div', 'modal-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    const idJudul = 'sipika-modal-judul';
    overlay.setAttribute('aria-labelledby', idJudul);

    const konten = SIPIKA.buatElemen('div', 'modal-content');
    if (opsi.lebar) konten.style.maxWidth = opsi.lebar;

    const header = SIPIKA.buatElemen('div', 'modal-header');
    const judul = SIPIKA.buatElemen('h2', '', opsi.judul || '');
    judul.id = idJudul;
    const btnX = SIPIKA.buatElemen('button', 'modal-close', '✕');
    btnX.type = 'button';
    btnX.setAttribute('aria-label', 'Tutup');
    btnX.addEventListener('click', SIPIKA.tutupModal);
    header.appendChild(judul);
    header.appendChild(btnX);
    konten.appendChild(header);

    const body = SIPIKA.buatElemen('div', 'sipika-modal-body');
    if (opsi.body instanceof Node) body.appendChild(opsi.body);
    else body.innerHTML = opsi.body || '';
    konten.appendChild(body);

    const tombolAksi = [];
    if (opsi.aksi && opsi.aksi.length) {
      const bar = SIPIKA.buatElemen('div', 'sipika-modal-actions');
      opsi.aksi.forEach(function (a) {
        const btn = SIPIKA.buatElemen('button', 'btn btn-' + (a.varian || 'secondary'), a.label);
        btn.type = 'button';
        btn.addEventListener('click', function () {
          if (typeof a.onClick === 'function') a.onClick(btn);
          if (!a.tetapBuka) SIPIKA.tutupModal();
        });
        bar.appendChild(btn);
        tombolAksi.push(btn);
      });
      konten.appendChild(bar);
    }

    overlay.appendChild(konten);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) SIPIKA.tutupModal();
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.classList.add('show');

    modalAktif = { overlay: overlay, pemicu: document.activeElement, onTutup: opsi.onTutup };

    // Fokus awal: tombol aksi terakhir (utama), jika tidak ada → tombol tutup
    (tombolAksi[tombolAksi.length - 1] || btnX).focus();

    return { tutup: SIPIKA.tutupModal, elemen: overlay, tombol: tombolAksi };
  };

  /* Esc menutup modal; Tab dijaga agar tetap di dalam modal */
  document.addEventListener('keydown', function (e) {
    if (!modalAktif) return;
    if (e.key === 'Escape') {
      SIPIKA.tutupModal();
      return;
    }
    if (e.key === 'Tab') {
      const fokusable = modalAktif.overlay.querySelectorAll('button, [href], input, select, textarea');
      if (!fokusable.length) return;
      const pertama = fokusable[0];
      const terakhir = fokusable[fokusable.length - 1];
      if (e.shiftKey && document.activeElement === pertama) {
        e.preventDefault();
        terakhir.focus();
      } else if (!e.shiftKey && document.activeElement === terakhir) {
        e.preventDefault();
        pertama.focus();
      }
    }
  });

  /* ---------- Sidebar responsif ---------- */

  SIPIKA.initSidebar = function () {
    const sidebar = document.querySelector('.sidebar');
    const scrim = document.querySelector('.scrim');
    const hamburger = document.querySelector('.hamburger');
    if (!sidebar || !hamburger) return;

    function buka() {
      sidebar.classList.add('open');
      if (scrim) scrim.classList.add('show');
      hamburger.setAttribute('aria-expanded', 'true');
    }
    function tutup() {
      sidebar.classList.remove('open');
      if (scrim) scrim.classList.remove('show');
      hamburger.setAttribute('aria-expanded', 'false');
    }

    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.addEventListener('click', function () {
      if (sidebar.classList.contains('open')) tutup();
      else buka();
    });
    if (scrim) scrim.addEventListener('click', tutup);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') tutup();
    });
    // Menu ditutup otomatis setelah memilih tautan (tampilan mobile)
    sidebar.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', tutup);
    });
    // Jika layar diperlebar, pastikan keadaan terbuka direset
    global.addEventListener('resize', function () {
      if (global.innerWidth > 768) tutup();
    });
  };

  /* ---------- Format tanggal/waktu ---------- */

  function dua(n) { return String(n).padStart(2, '0'); }

  /** '2026-09-22T08:00' → '22/09/2026 08:00' */
  SIPIKA.formatWaktu = function (isoLokal) {
    const d = new Date(isoLokal);
    if (isNaN(d.getTime())) return '-';
    return dua(d.getDate()) + '/' + dua(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + dua(d.getHours()) + ':' + dua(d.getMinutes());
  };

  /** Tanggal lokal hari ini dalam format YYYY-MM-DD (tanpa bug zona waktu toISOString). */
  SIPIKA.tanggalLokal = function (d) {
    d = d || new Date();
    return d.getFullYear() + '-' + dua(d.getMonth() + 1) + '-' + dua(d.getDate());
  };

  /** Waktu relatif sederhana: '10 menit yang lalu', 'Kemarin', dst. */
  SIPIKA.waktuRelatif = function (iso) {
    const selisihMenit = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (isNaN(selisihMenit)) return '';
    if (selisihMenit < 1) return 'Baru saja';
    if (selisihMenit < 60) return selisihMenit + ' menit yang lalu';
    const jam = Math.floor(selisihMenit / 60);
    if (jam < 24) return jam + ' jam yang lalu';
    const hari = Math.floor(jam / 24);
    if (hari === 1) return 'Kemarin';
    return hari + ' hari yang lalu';
  };

  global.SIPIKA = SIPIKA;

  document.addEventListener('DOMContentLoaded', function () {
    SIPIKA.initSidebar();
  });
})(window);
