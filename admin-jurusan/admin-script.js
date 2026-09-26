/* ============================================================
   SIPIKA — Admin Jurusan
   ============================================================ */

function tahapSaatIni(p) {
  if (p.status === "ditolak") return "Berhenti — Ditolak";
  if (p.status === "disetujui") return "Selesai — Admin Jurusan";
  return "Admin Jurusan";
}

// ---------- Dashboard ----------
function initDashboard() {
  const grid = document.querySelector("[data-stat-grid]");
  if (!grid) return;
  const total = SIPIKA_DATA.length;
  const menunggu = SIPIKA_DATA.filter(p => p.status === "menunggu_admin").length;
  const disetujui = SIPIKA_DATA.filter(p => p.status === "disetujui").length;
  const ditolak = SIPIKA_DATA.filter(p => p.status === "ditolak").length;

  grid.innerHTML = `
    <div class="stat-card">
      <div class="label">Total Pengajuan <span class="dummy-tag">dummy</span></div>
      <div class="value">${total}</div>
    </div>
    <div class="stat-card warning">
      <div class="label">Menunggu Admin Jurusan</div>
      <div class="value">${menunggu}</div>
    </div>
    <div class="stat-card success">
      <div class="label">Disetujui</div>
      <div class="value">${disetujui}</div>
    </div>
    <div class="stat-card danger">
      <div class="label">Ditolak</div>
      <div class="value">${ditolak}</div>
    </div>`;

  const tbody = document.querySelector("[data-recent-table]");
  if (tbody) {
    tbody.innerHTML = SIPIKA_DATA.slice(0, 5).map(p => `
      <tr>
        <td>${p.nim}</td>
        <td>${p.nama}</td>
        <td>${durasiLabel(p.durasiKategori)}</td>
        <td>${badgeHTML(p.status)}</td>
        <td>${tahapSaatIni(p)}</td>
        <td><a class="btn btn-secondary btn-sm" href="detail-pengajuan.html?id=${p.id}">Lihat Detail</a></td>
      </tr>`).join("");
  }
}

// ---------- Data Perizinan ----------
function initDataPerizinan() {
  const tbody = document.querySelector("[data-perizinan-table]");
  if (!tbody) return;
  tbody.innerHTML = SIPIKA_DATA.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.nim}</td>
      <td>${p.nama}</td>
      <td>${p.prodi}</td>
      <td>${p.alasan}</td>
      <td>${p.tanggal}</td>
      <td>${durasiLabel(p.durasiKategori)}</td>
      <td>${badgeHTML(p.status)}</td>
      <td>${tahapSaatIni(p)}</td>
      <td>
        <a class="btn btn-secondary btn-sm" href="detail-pengajuan.html?id=${p.id}">Lihat Detail</a>
        <a class="btn btn-secondary btn-sm" href="riwayat.html">Riwayat</a>
      </td>
    </tr>`).join("");
}

// ---------- Menunggu Admin ----------
function initMenungguAdmin() {
  const list = document.querySelector("[data-menunggu-list]");
  if (!list) return;
  const items = SIPIKA_DATA.filter(p => p.status === "menunggu_admin");
  if (items.length === 0) {
    list.innerHTML = `<p class="hint">Tidak ada pengajuan yang menunggu Admin Jurusan saat ini.</p>`;
    return;
  }
  list.innerHTML = items.map(p => `
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>${p.nama} <span class="dummy-tag">${p.nim}</span></h3>
          <div class="hint">${p.alasan} &middot; ${durasiLabel(p.durasiKategori)} &middot; diajukan ${p.tanggal}</div>
        </div>
        <a class="btn btn-primary btn-sm" href="detail-pengajuan.html?id=${p.id}">Lihat Detail</a>
      </div>
      ${stepperHTML(buildSteps(p))}
    </div>`).join("");
}

// ---------- Rekap ----------
function initRekap() {
  const tbody = document.querySelector("[data-rekap-table]");
  if (!tbody) return;

  function render(filterDurasi, filterStatus) {
    const rows = SIPIKA_DATA.filter(p => {
      const okDurasi = filterDurasi === "semua" || p.durasiKategori === filterDurasi;
      const okStatus = filterStatus === "semua" || p.status === filterStatus;
      return okDurasi && okStatus;
    });
    tbody.innerHTML = rows.length ? rows.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.nim}</td>
        <td>${p.nama}</td>
        <td>${p.prodi}</td>
        <td>${p.alasan}</td>
        <td>${durasiLabel(p.durasiKategori)}</td>
        <td>${p.tanggal}</td>
        <td>${badgeHTML(p.status)}</td>
        <td>${p.status === "ditolak" ? "Ditolak saat validasi" : p.status === "disetujui" ? "Lengkap &amp; final" : "Proses berjalan"}</td>
      </tr>`).join("") : `<tr class="empty-row"><td colspan="9">Tidak ada data untuk filter ini.</td></tr>`;
  }

  let curDurasi = "semua", curStatus = "semua";
  document.querySelectorAll("[data-filter-durasi]").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-filter-durasi]").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      curDurasi = chip.dataset.filterDurasi;
      render(curDurasi, curStatus);
    });
  });
  document.querySelectorAll("[data-filter-status]").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-filter-status]").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      curStatus = chip.dataset.filterStatus;
      render(curDurasi, curStatus);
    });
  });

  render(curDurasi, curStatus);
}

// ---------- Riwayat ----------
function initRiwayat() {
  const wrap = document.querySelector("[data-riwayat-list]");
  if (!wrap) return;
  wrap.innerHTML = SIPIKA_DATA.map(p => {
    const events = [\`Mahasiswa mengajukan (\${p.tanggal})\`];
    if (p.validasi.dosen) events.push(\`Dosen \${p.validasi.dosen.status === "ditolak" ? "menolak" : "memvalidasi"} (\${p.validasi.dosen.tanggal})\`);
    if (p.validasi.ketua) events.push(\`Ketua Jurusan / Sekjur \${p.validasi.ketua.status === "ditolak" ? "menolak" : "memvalidasi"} (\${p.validasi.ketua.tanggal})\`);
    if (p.validasi.baak) events.push(\`BAAK memvalidasi (\${p.validasi.baak.tanggal})\`);
    if (p.status === "disetujui") events.push(\`Admin Jurusan menerima &amp; mengarsipkan (\${p.diprosesAdmin ? p.diprosesAdmin.tanggal : "-"})\`);
    if (p.status === "menunggu_admin") events.push(\`Menunggu diproses Admin Jurusan\`);

    return \`
      <div class="panel">
        <div class="panel-head">
          <h3>\${p.nama} <span class="dummy-tag">\${p.nim}</span></h3>
          \${badgeHTML(p.status)}
        </div>
        <ul class="timeline">
          \${events.map((e, i) => \`
            <li>
              <div class="tdot \${i === events.length - 1 && p.status === 'menunggu_admin' ? 'pending' : ''}">\${i + 1}</div>
              <div class="tcontent"><div>\${e}</div></div>
            </li>\`).join("")}
        </ul>
      </div>\`;
  }).join("");
}

// ---------- Detail Pengajuan ----------
function initDetail() {
  const container = document.querySelector("[data-detail-container]");
  if (!container) return;

  const select = document.querySelector("[data-detail-select]");
  select.innerHTML = SIPIKA_DATA.map(p => \`<option value="\${p.id}">\${p.nim} — \${p.nama}</option>\`).join("");

  function renderDetail(id) {
    const p = SIPIKA_DATA.find(x => x.id === Number(id)) || SIPIKA_DATA[0];
    select.value = p.id;

    const validasiRows = [];
    validasiRows.push({ label: "Dosen", data: p.validasi.dosen });
    if (p.durasiKategori === "=1" || p.durasiKategori === ">1") validasiRows.push({ label: "Ketua Jurusan / Sekjur", data: p.validasi.ketua });
    if (p.durasiKategori === ">1") validasiRows.push({ label: "BAAK", data: p.validasi.baak });

    container.innerHTML = \`
      <div class="panel">
        <div class="panel-head">
          <h2>Detail Pengajuan</h2>
          \${badgeHTML(p.status)}
        </div>
        \${stepperHTML(buildSteps(p))}
      </div>

      <div class="detail-grid">
        <div>
          <div class="panel">
            <h3>Informasi Mahasiswa</h3>
            <dl class="kv">
              <dt>NIM</dt><dd>\${p.nim}</dd>
              <dt>Nama</dt><dd>\${p.nama}</dd>
              <dt>Program Studi</dt><dd>\${p.prodi}</dd>
            </dl>
          </div>
          <div class="panel">
            <h3>Informasi Pengajuan</h3>
            <dl class="kv">
              <dt>Alasan</dt><dd>\${p.alasan}</dd>
              <dt>Tanggal</dt><dd>\${p.tanggal}</dd>
              <dt>Durasi</dt><dd>\${durasiLabel(p.durasiKategori)} (\${p.durasiLabel})</dd>
            </dl>
            <div class="doc-preview" style="margin-top:10px;">&#128196; \${p.dokumen} <span class="dummy-tag">preview statis</span></div>
          </div>
          <div class="panel">
            <h3>Riwayat Validasi</h3>
            \${validasiRows.map(r => \`
              <div class="kv" style="margin-bottom:10px;">
                <dt>\${r.label}</dt>
                <dd>\${r.data ? \`\${badgeHTML(r.data.status === "ditolak" ? "ditolak" : "disetujui")} &middot; \${r.data.oleh}, \${r.data.tanggal}\${r.data.catatan ? \`<br><span class="hint">Catatan: \${r.data.catatan}</span>\` : ""}\` : \`<span class="hint">Belum sampai tahap ini</span>\`}</dd>
              </div>\`).join("")}
          </div>
        </div>

        <div>
          <div class="ai-panel">
            <h3>&#129302; AI Verification Assistant</h3>
            <div class="ai-check"><span>Kelengkapan Dokumen</span><strong>\${p.ai.kelengkapan}</strong></div>
            <div class="ai-check"><span>Konsistensi Data</span><strong>\${p.ai.konsistensi}</strong></div>
            <p style="margin-top:10px;"><strong>Rekomendasi:</strong> \${p.ai.rekomendasi}</p>
            <div class="ai-note">Rekomendasi AI bukan keputusan final — keputusan tetap berada pada Dosen, Ketua Jurusan / Sekjur, BAAK, dan pencatatan akhir oleh Admin Jurusan.</div>
          </div>

          <div class="panel" style="margin-top:16px;">
            <h3>Aksi Admin Jurusan</h3>
            <p class="hint">Simulasi tampilan saja — belum tersambung ke database.</p>
            <button class="btn btn-primary btn-sm" onclick="alert('Simulasi: data ditandai sudah diarsipkan.')">Tandai Selesai Diarsipkan</button>
            <button class="btn btn-secondary btn-sm" onclick="alert('Simulasi: rekap diunduh (dummy).')">Unduh Rekap</button>
          </div>
        </div>
      </div>\`;
  }

  select.addEventListener("change", () => renderDetail(select.value));

  const params = new URLSearchParams(location.search);
  const startId = params.get("id") || SIPIKA_DATA[0].id;
  renderDetail(startId);
}

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
  initDataPerizinan();
  initMenungguAdmin();
  initRekap();
  initRiwayat();
  initDetail();
});
