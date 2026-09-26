document.addEventListener('DOMContentLoaded', () => {
    // === Pengajuan Form Logic ===
    const tglMulai = document.getElementById('tgl-mulai');
    const tglSelesai = document.getElementById('tgl-selesai');
    const workflowPreview = document.getElementById('workflow-preview');
    const stepperContainer = document.getElementById('stepper-container');
    const durasiLabel = document.getElementById('durasi-label');

    function calculateDuration(start, end) {
        if (!start || !end) return null;
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diffTime = d2 - d1;
        if (diffTime < 0) return 0;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
        return diffDays;
    }

    function renderStepper(days) {
        stepperContainer.innerHTML = '';
        
        let steps = [];
        if (days === 1) { 
            // Simplified logic: treat 1 day difference as = 1 hari. 
            // In a real app we might distinguish < 1 hari (hours) via another field.
            steps = [
                { label: 'Mahasiswa', id: 1 },
                { label: 'Dosen', id: 2 },
                { label: 'Ketua Jurusan / Sekjur', id: 3 },
                { label: 'Admin Jurusan', id: 4 }
            ];
            durasiLabel.textContent = '= 1 Hari';
        } else if (days > 1) {
            steps = [
                { label: 'Mahasiswa', id: 1 },
                { label: 'Dosen', id: 2 },
                { label: 'Ketua Jurusan / Sekjur', id: 3 },
                { label: 'BAAK', id: 4 },
                { label: 'Admin Jurusan', id: 5 }
            ];
            durasiLabel.textContent = `> 1 Hari (${days} Hari)`;
        }

        steps.forEach((step, idx) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = `step ${idx === 0 ? 'active' : ''}`;
            stepDiv.innerHTML = `
                <div class="step-circle">${step.id}</div>
                <div class="step-label">${step.label}</div>
            `;
            stepperContainer.appendChild(stepDiv);
        });

        workflowPreview.style.display = 'block';
    }

    if (tglMulai && tglSelesai) {
        const updateStepper = () => {
            const days = calculateDuration(tglMulai.value, tglSelesai.value);
            if (days !== null && days > 0) {
                renderStepper(days);
            } else if (days === 0) {
                workflowPreview.style.display = 'none';
                alert('Tanggal Selesai tidak boleh mendahului Tanggal Mulai');
            }
        };
        tglMulai.addEventListener('change', updateStepper);
        tglSelesai.addEventListener('change', updateStepper);
    }

    // AI Button Mocks
    const btnAiReason = document.getElementById('btn-ai-reason');
    const alasanInput = document.getElementById('alasan');
    if (btnAiReason && alasanInput) {
        btnAiReason.addEventListener('click', () => {
            const jenis = document.getElementById('jenis').value;
            let mockReason = "Dengan hormat, saya memohon izin untuk tidak mengikuti perkuliahan dikarenakan ";
            if (jenis === 'Sakit') mockReason += "kondisi kesehatan saya yang tidak memungkinkan (sakit). Saya telah melampirkan surat keterangan dokter.";
            else if (jenis === 'Izin Alasan Penting') mockReason += "adanya keperluan keluarga yang sangat mendesak dan tidak dapat ditinggalkan.";
            else if (jenis === 'Tugas Kampus / Lomba') mockReason += "saya mewakili institusi dalam perlombaan tingkat nasional sesuai dengan surat tugas terlampir.";
            else mockReason += "alasan pribadi. (Mohon lengkapi jenis perizinan terlebih dahulu).";
            
            alasanInput.value = mockReason;
        });
    }

    const btnAiDoc = document.getElementById('btn-ai-doc');
    const docStatus = document.getElementById('doc-status');
    const docInput = document.getElementById('bukti');
    if (btnAiDoc && docStatus && docInput) {
        btnAiDoc.addEventListener('click', () => {
            if (docInput.files.length > 0) {
                docStatus.style.display = 'inline-flex';
                setTimeout(() => { docStatus.style.display = 'none'; }, 3000);
            } else {
                alert('Pilih file terlebih dahulu sebelum cek AI.');
            }
        });
    }

    // Form submit mock
    const formPengajuan = document.getElementById('form-pengajuan');
    if (formPengajuan) {
        formPengajuan.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Pengajuan berhasil dikirim! Menunggu validasi Dosen.');
            window.location.href = 'riwayat.html';
        });
    }

    // === Riwayat Modal Logic ===
    const detailBtns = document.querySelectorAll('.btn-detail');
    const modal = document.getElementById('detail-modal');
    const modalClose = document.getElementById('btn-close-modal');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');

    if (modal) {
        detailBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                modalTitle.textContent = `Detail Progress Tiket: ${id}`;
                
                let timelineHTML = '';
                if (id === 'SPK-2026-001') { // = 1 Hari, Menunggu Admin
                    timelineHTML = `
                        <div class="timeline">
                            <div class="timeline-item done">
                                <div class="timeline-title">Diajukan oleh Mahasiswa</div>
                                <div class="timeline-time">22/09/2026 08:00</div>
                            </div>
                            <div class="timeline-item done">
                                <div class="timeline-title">Disetujui Dosen</div>
                                <div class="timeline-time">22/09/2026 09:15</div>
                            </div>
                            <div class="timeline-item done">
                                <div class="timeline-title">Disetujui Ketua Jurusan / Sekjur</div>
                                <div class="timeline-time">22/09/2026 13:00</div>
                            </div>
                            <div class="timeline-item active">
                                <div class="timeline-title">Menunggu Cetak Surat Admin Jurusan</div>
                                <div class="timeline-time">Dalam proses</div>
                            </div>
                        </div>
                    `;
                } else if (id === 'SPK-2026-002') { // > 1 Hari, Disetujui
                    timelineHTML = `
                         <div class="timeline">
                            <div class="timeline-item done">
                                <div class="timeline-title">Diajukan oleh Mahasiswa</div>
                                <div class="timeline-time">13/09/2026 10:00</div>
                            </div>
                            <div class="timeline-item done">
                                <div class="timeline-title">Disetujui Dosen</div>
                                <div class="timeline-time">13/09/2026 11:30</div>
                            </div>
                            <div class="timeline-item done">
                                <div class="timeline-title">Disetujui Ketua Jurusan / Sekjur</div>
                                <div class="timeline-time">14/09/2026 09:00</div>
                            </div>
                            <div class="timeline-item done">
                                <div class="timeline-title">Disetujui BAAK</div>
                                <div class="timeline-time">14/09/2026 14:00</div>
                            </div>
                            <div class="timeline-item done">
                                <div class="timeline-title">Surat Selesai Dicetak Admin Jurusan</div>
                                <div class="timeline-time">15/09/2026 08:30</div>
                            </div>
                        </div>
                    `;
                } else { // < 1 Hari, Menunggu Admin
                    timelineHTML = `
                        <div class="timeline">
                            <div class="timeline-item done">
                                <div class="timeline-title">Diajukan oleh Mahasiswa</div>
                                <div class="timeline-time">18/09/2026 12:00</div>
                            </div>
                            <div class="timeline-item done">
                                <div class="timeline-title">Disetujui Dosen</div>
                                <div class="timeline-time">18/09/2026 12:45</div>
                            </div>
                            <div class="timeline-item active">
                                <div class="timeline-title">Menunggu Cetak Surat Admin Jurusan</div>
                                <div class="timeline-time">Dalam proses</div>
                            </div>
                        </div>
                    `;
                }
                
                modalBody.innerHTML = timelineHTML;
                modal.classList.add('active');
            });
        });

        modalClose.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
});
