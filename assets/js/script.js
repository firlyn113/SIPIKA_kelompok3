/* ============================================================
   SIPIKA — Shared JavaScript Utilities
   Sidebar toggle, active nav, helpers
   ============================================================ */

// ---------- Sidebar Active Link + Mobile Toggle ----------
function initShell() {
  // Highlight active nav link
  const fullPath = location.pathname.split("/").pop() || "dashboard.html";
  const pathNoExt = fullPath.replace(/\.html$/, "");
  document.querySelectorAll(".nav-list a[data-page]").forEach(a => {
    const p = a.dataset.page;
    if (p === fullPath || p === pathNoExt || p + ".html" === fullPath) {
      a.classList.add("active");
    }
  });

  // Mobile hamburger toggle
  const burger = document.querySelector(".hamburger");
  const sidebar = document.querySelector(".sidebar");
  const scrim = document.querySelector(".scrim");
  if (burger && sidebar && scrim) {
    burger.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      scrim.classList.toggle("show");
    });
    scrim.addEventListener("click", () => {
      sidebar.classList.remove("open");
      scrim.classList.remove("show");
    });
  }
}

// ---------- Status Helpers ----------
function statusInfo(status) {
  switch (status) {
    case "menunggu_dosen": return { text: "Menunggu Validasi Dosen", cls: "badge-menunggu" };
    case "menunggu_kajur": return { text: "Menunggu Validasi Ketua Jurusan / Sekjur", cls: "badge-menunggu" };
    case "menunggu_baak": return { text: "Menunggu Validasi BAAK", cls: "badge-menunggu" };
    case "menunggu_admin": return { text: "Menunggu Admin Jurusan", cls: "badge-menunggu" };
    case "disetujui": return { text: "Disetujui", cls: "badge-disetujui" };
    case "ditolak": return { text: "Ditolak", cls: "badge-ditolak" };
    case "diajukan": return { text: "Diajukan", cls: "badge-info" };
    default: return { text: status, cls: "" };
  }
}

function badgeHTML(status) {
  const s = statusInfo(status);
  return `<span class="badge ${s.cls}">${s.text}</span>`;
}

function durasiLabel(kat) {
  return kat === "<1" ? "< 1 hari" : kat === "=1" ? "= 1 hari" : "> 1 hari";
}

// ---------- Workflow Steps Builder ----------
function buildSteps(p) {
  const steps = [
    { key: "mhs", label: "Mahasiswa", state: "completed", sub: p.tanggal }
  ];

  // Dosen
  steps.push({
    key: "dosen", label: "Dosen",
    state: p.validasi.dosen
      ? (p.validasi.dosen.status === "ditolak" ? "rejected" : "completed")
      : (p.status === "menunggu_dosen" ? "pending" : ""),
    sub: p.validasi.dosen ? p.validasi.dosen.tanggal : ""
  });

  // Ketua Jurusan / Sekjur — only for =1 and >1
  if (p.durasiKategori === "=1" || p.durasiKategori === ">1") {
    steps.push({
      key: "ketua", label: "Ketua Jurusan / Sekjur",
      state: p.validasi.ketua
        ? (p.validasi.ketua.status === "ditolak" ? "rejected" : "completed")
        : (p.status === "menunggu_kajur" ? "pending" : ""),
      sub: p.validasi.ketua ? p.validasi.ketua.tanggal : ""
    });
  }

  // BAAK — only for >1
  if (p.durasiKategori === ">1") {
    steps.push({
      key: "baak", label: "BAAK",
      state: p.validasi.baak
        ? (p.validasi.baak.status === "ditolak" ? "rejected" : "completed")
        : (p.status === "menunggu_baak" ? "pending" : ""),
      sub: p.validasi.baak ? p.validasi.baak.tanggal : ""
    });
  }

  // Admin Jurusan
  const adminState = p.status === "menunggu_admin" ? "pending"
    : p.status === "disetujui" ? "completed"
    : p.status === "ditolak" ? "" : "";
  steps.push({
    key: "admin", label: "Admin Jurusan",
    state: adminState,
    sub: p.status === "menunggu_admin" ? "Menunggu" : (p.diprosesAdmin ? p.diprosesAdmin.tanggal : "")
  });

  return steps;
}

function stepperHTML(steps) {
  return `<div class="stepper">${steps.map(s => `
    <div class="step ${s.state}">
      <div class="line"></div>
      <div class="dot">${s.state === "completed" ? "&#10003;" : s.state === "rejected" ? "&#10005;" : "&hellip;"}</div>
      <div class="label">${s.label}</div>
      <div class="sub">${s.sub || ""}</div>
    </div>`).join("")}</div>`;
}

// ---------- Shared Dummy Data ----------
const SIPIKA_DATA = [
  {
    id: 1,
    nim: "250115042",
    nama: "Firly Nurrohman",
    prodi: "D4 Teknologi Rekayasa Perangkat Lunak",
    alasan: "Sakit",
    tanggal: "22/09/2026",
    durasiKategori: "=1",
    durasiLabel: "1 hari",
    dokumen: "Surat Dokter.pdf",
    status: "menunggu_admin",
    validasi: {
      dosen: { status: "disetujui", oleh: "Dosen Wali Kelas 2B", tanggal: "22/09/2026" },
      ketua: { status: "disetujui", oleh: "Sekjur TRPL", tanggal: "22/09/2026" },
      baak: null
    },
    ai: { kelengkapan: "Lengkap", konsistensi: "Konsisten", rekomendasi: "Dokumen pendukung sesuai dengan data pengajuan." }
  },
  {
    id: 2,
    nim: "250315778",
    nama: "Rahull",
    prodi: "D4 Teknologi Rekayasa Perangkat Lunak",
    alasan: "Izin Keperluan Keluarga",
    tanggal: "13/09/2026",
    durasiKategori: ">1",
    durasiLabel: "2 hari",
    dokumen: "Surat Izin Keluarga.pdf",
    status: "disetujui",
    validasi: {
      dosen: { status: "disetujui", oleh: "Dosen Wali Kelas 2B", tanggal: "13/09/2026" },
      ketua: { status: "disetujui", oleh: "Sekjur TRPL", tanggal: "14/09/2026" },
      baak: { status: "disetujui", oleh: "Staf BAAK", tanggal: "15/09/2026" }
    },
    ai: { kelengkapan: "Lengkap", konsistensi: "Konsisten", rekomendasi: "Durasi pada surat sesuai dengan tanggal pengajuan." },
    diprosesAdmin: { oleh: "Admin Jurusan TRPL", tanggal: "15/09/2026" }
  },
  {
    id: 3,
    nim: "250122015",
    nama: "Salsabila Putri",
    prodi: "D4 Teknologi Rekayasa Perangkat Lunak",
    alasan: "Izin Pulang Cepat (Keperluan Mendesak)",
    tanggal: "18/09/2026",
    durasiKategori: "<1",
    durasiLabel: "Kurang dari 1 hari",
    dokumen: "Surat Izin Orang Tua.pdf",
    status: "menunggu_admin",
    validasi: {
      dosen: { status: "disetujui", oleh: "Dosen Pengampu MK", tanggal: "18/09/2026" },
      ketua: null,
      baak: null
    },
    ai: { kelengkapan: "Lengkap", konsistensi: "Konsisten", rekomendasi: "Data pengajuan sesuai untuk kategori kurang dari 1 hari." }
  },
  {
    id: 4,
    nim: "250133090",
    nama: "Ahmad Fauzan",
    prodi: "D4 Teknologi Rekayasa Perangkat Lunak",
    alasan: "Keperluan Keluarga (Duka)",
    tanggal: "10/09/2026",
    durasiKategori: ">1",
    durasiLabel: "3 hari",
    dokumen: "Surat Keterangan RT.pdf",
    status: "disetujui",
    validasi: {
      dosen: { status: "disetujui", oleh: "Dosen Wali Kelas 2B", tanggal: "10/09/2026" },
      ketua: { status: "disetujui", oleh: "Sekjur TRPL", tanggal: "11/09/2026" },
      baak: { status: "disetujui", oleh: "Staf BAAK", tanggal: "12/09/2026" }
    },
    ai: { kelengkapan: "Lengkap", konsistensi: "Konsisten", rekomendasi: "Seluruh dokumen pendukung telah diverifikasi." },
    diprosesAdmin: { oleh: "Admin Jurusan TRPL", tanggal: "12/09/2026" }
  },
  {
    id: 5,
    nim: "250144067",
    nama: "Dewi Anggraini",
    prodi: "D4 Teknologi Rekayasa Perangkat Lunak",
    alasan: "Sakit",
    tanggal: "08/09/2026",
    durasiKategori: "=1",
    durasiLabel: "1 hari",
    dokumen: "Surat Dokter.pdf",
    status: "ditolak",
    validasi: {
      dosen: { status: "disetujui", oleh: "Dosen Wali Kelas 2B", tanggal: "08/09/2026" },
      ketua: { status: "ditolak", oleh: "Sekjur TRPL", tanggal: "09/09/2026", catatan: "Surat dokter tidak mencantumkan tanggal periksa." },
      baak: null
    },
    ai: { kelengkapan: "Tidak Lengkap", konsistensi: "Perlu Ditinjau", rekomendasi: "Tanggal pada dokumen tidak terbaca / tidak sesuai." }
  },
  {
    id: 6,
    nim: "250155023",
    nama: "Bagas Saputra",
    prodi: "D4 Teknologi Rekayasa Perangkat Lunak",
    alasan: "Izin Kegiatan Organisasi",
    tanggal: "05/09/2026",
    durasiKategori: "<1",
    durasiLabel: "Kurang dari 1 hari",
    dokumen: "Surat Tugas UKM.pdf",
    status: "disetujui",
    validasi: {
      dosen: { status: "disetujui", oleh: "Dosen Pengampu MK", tanggal: "05/09/2026" },
      ketua: null,
      baak: null
    },
    ai: { kelengkapan: "Lengkap", konsistensi: "Konsisten", rekomendasi: "Surat tugas sesuai dengan agenda organisasi kampus." },
    diprosesAdmin: { oleh: "Admin Jurusan TRPL", tanggal: "05/09/2026" }
  }
];

// Auto-init on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  initShell();
});
