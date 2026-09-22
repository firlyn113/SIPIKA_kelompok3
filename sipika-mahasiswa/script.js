// Data Dummy Awal
const dummyRiwayat = [
    {
        id: "SPK-2026-001",
        jenis: "Sakit",
        tgl: "22 Sept 2026",
        durasiText: "< 1 Hari (4 Jam)",
        durasiType: "lt1",
        status: "Diproses Dosen",
        isApproved: false,
        steps: ["Mahasiswa (Selesai)", "Dosen (Diproses)", "Admin Jurusan (Menunggu)"]
    },
    {
        id: "SPK-2026-002",
        jenis: "Izin Alasan Penting",
        tgl: "20 Sept 2026",
        durasiText: "= 1 Hari",
        durasiType: "eq1",
        status: "Selesai (Disetujui)",
        isApproved: true,
        steps: ["Mahasiswa (Selesai)", "Dosen (Selesai)", "Ketua Jurusan / Sekjur (Selesai)", "Admin Jurusan (Selesai)"]
    },
    {
        id: "SPK-2026-003",
        jenis: "Tugas Kampus / Lomba",
        tgl: "15 Sept 2026",
        durasiText: "> 1 Hari (3 Hari)",
        durasiType: "gt1",
        status: "Selesai (Disetujui)",
        isApproved: true,
        steps: ["Mahasiswa (Selesai)", "Dosen (Selesai)", "Ketua Jurusan / Sekjur (Selesai)", "BAAK (Selesai)", "Admin Jurusan (Selesai)"]
    }
];

document.addEventListener("DOMContentLoaded", () => {
    updateDashboardStats();
});

function updateDashboardStats() {
    const totalPengajuan = dummyRiwayat.length;
    const disetujui = dummyRiwayat.filter(item => item.isApproved || item.status.includes("Disetujui")).length;
    const sedangDiproses = totalPengajuan - disetujui;

    const statCards = document.querySelectorAll('.stat-num');
    if (statCards.length >= 3) {
        statCards[0].innerText = totalPengajuan;  
        statCards[1].innerText = sedangDiproses;   
        statCards[2].innerText = disetujui;       
    }
}

function switchTab(tabId, event) {
    if(event) event.preventDefault();

    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`page-${tabId}`).classList.add('active');

    const titleMap = {
        'dashboard': 'Dashboard Mahasiswa',
        'pengajuan': 'Form Pengajuan Izin Ketidakhadiran',
        'riwayat': 'Riwayat & Status Perizinan'
    };
    document.getElementById('page-title').innerText = titleMap[tabId] || 'Portal Mahasiswa';

    if(tabId === 'riwayat') {
        renderRiwayatTable();
    } else if(tabId === 'dashboard') {
        updateDashboardStats(); 
    }
}

function calculateWorkflow() {
    const tglMulai = document.getElementById('tgl_mulai').value;
    const tglSelesai = document.getElementById('tgl_selesai').value;
    const display = document.getElementById('workflow-display');
    const badgeContainer = document.getElementById('duration-badge-container');

    if (!tglMulai || !tglSelesai) return;

    const start = new Date(tglMulai);
    const end = new Date(tglSelesai);
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    let steps = [];
    let badgeText = "";

    if (daysDiff <= 1 || isNaN(daysDiff)) {
        if (start.getTime() === end.getTime()) {
            steps = ["Mahasiswa", "Dosen", "Ketua Jurusan / Sekjur", "Admin Jurusan"];
            badgeText = "Durasi: = 1 Hari";
        } else {
            steps = ["Mahasiswa", "Dosen", "Admin Jurusan"];
            badgeText = "Durasi: < 1 Hari";
        }
    } else {
        steps = ["Mahasiswa", "Dosen", "Ketua Jurusan / Sekjur", "BAAK", "Admin Jurusan"];
        badgeText = `Durasi: ${daysDiff} Hari (> 1 Hari)`;
    }

    let html = "";
    steps.forEach((step, idx) => {
        const isFirst = idx === 0;
        html += `
            <div class="step-item">
                <div class="step-circle ${isFirst ? 'active' : ''}">${idx + 1}</div>
                <span class="step-label">${step}</span>
            </div>
        `;
        if (idx < steps.length - 1) {
            html += `<div class="step-line"></div>`;
        }
    });

    display.innerHTML = html;
    badgeContainer.innerHTML = `<span class="badge badge-warning" style="margin-top:10px; display:inline-block;">${badgeText}</span>`;
}

// AI Assistant
function generateAiReason() {
    const jenis = document.getElementById('jenis_izin').value;
    const textarea = document.getElementById('alasan');

    if (!jenis) {
        alert("Silakan pilih Jenis Perizinan terlebih dahulu.");
        return;
    }

    if (jenis === "Sakit") {
        textarea.value = "Dengan hormat, saya memohon izin tidak dapat mengikuti kegiatan perkuliahan dikarenakan kondisi kesehatan yang kurang baik (sakit). Bersama surat pengajuan ini, saya lampirkan surat keterangan istirahat dari dokter.";
    } else if (jenis === "Izin Alasan Penting") {
        textarea.value = "Dengan hormat, saya mengajukan perizinan ketidakhadiran perkuliahan dikarenakan ada keperluan keluarga yang mendesak dan tidak dapat ditinggalkan.";
    } else {
        textarea.value = "Dengan hormat, saya mengajukan izin ketidakhadiran dikarenakan ditugaskan untuk mewakili perguruan tinggi dalam kegiatan kompetisi/lomba.";
    }
}

function checkAiDocument() {
    const feedback = document.getElementById('ai-doc-feedback');
    feedback.innerHTML = `
        <p class="text-sm text-gray" style="margin-top:4px;">
            <i class="fa-solid fa-robot text-blue"></i> <em>SIPIKA AI Verification: Format berkas valid & keterbacaan dokumen baik.</em>
        </p>
    `;
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const jenis = document.getElementById('jenis_izin').value;
    const tglMulai = document.getElementById('tgl_mulai').value;
    const tglSelesai = document.getElementById('tgl_selesai').value;
    
    const dateObj = new Date(tglMulai);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    const formattedDate = dateObj.toLocaleDateString('id-ID', options);

    const start = new Date(tglMulai);
    const end = new Date(tglSelesai);
    const daysDiff = Math.ceil((end - start) / (1000 * 3600 * 24)) + 1;
    
    let durasiLabel = "< 1 Hari";
    if (daysDiff === 1) durasiLabel = "= 1 Hari";
    else if (daysDiff > 1) durasiLabel = `> 1 Hari (${daysDiff} Hari)`;

    const newId = `SPK-2026-00${dummyRiwayat.length + 1}`;

    dummyRiwayat.unshift({
        id: newId,
        jenis: jenis,
        tgl: formattedDate,
        durasiText: durasiLabel,
        status: "Diproses Dosen",
        isApproved: false,
        steps: ["Mahasiswa (Selesai)", "Dosen (Diproses)", "Admin Jurusan (Menunggu)"]
    });

    updateDashboardStats();

    alert("Pengajuan berhasil dikirim! Kode Tiket: " + newId);
    
    document.getElementById('form-izin').reset();
    
    switchTab('riwayat');
}

function renderRiwayatTable() {
    const tbody = document.getElementById('table-riwayat-body');
    if (!tbody) return;
    
    tbody.innerHTML = "";

    dummyRiwayat.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.id}</strong></td>
            <td>${item.jenis}</td>
            <td>${item.tgl}</td>
            <td><span class="badge badge-warning">${item.durasiText}</span></td>
            <td><span class="badge badge-success">${item.status}</span></td>
            <td>
                <button class="btn btn-primary" style="padding: 4px 8px; font-size:11px;" onclick="showDetail('${item.id}')">
                    <i class="fa-solid fa-eye"></i> Detail Progress
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function showDetail(ticketId) {
    const item = dummyRiwayat.find(r => r.id === ticketId);
    if (!item) return;

    const modal = document.getElementById('modal-detail');
    const modalBody = document.getElementById('modal-body-content');

    let stepsHtml = item.steps.map(s => `<li style="margin-bottom:8px;">${s}</li>`).join('');

    modalBody.innerHTML = `
        <p><strong>Kode Tiket:</strong> ${item.id}</p>
        <p><strong>Jenis Izin:</strong> ${item.jenis}</p>
        <p style="margin-bottom:12px;"><strong>Durasi:</strong> ${item.durasiText}</p>
        <hr style="margin:12px 0; border:0; border-top:1px solid #E2E8F0;">
        <h4 style="font-size:14px; margin-bottom:8px;">Tracking Approval Sequential:</h4>
        <ol style="padding-left:20px; font-size:13px;">
            ${stepsHtml}
        </ol>
    `;

    modal.style.display = "flex";
}

function closeModal() {
    document.getElementById('modal-detail').style.display = "none";
}