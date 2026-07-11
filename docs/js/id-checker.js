/**
 * ID Checker App - Checks numeric Maçkolik player IDs in Wikipedia text against Wikidata,
 * replaces resolved names, and generates Excel reports for missing players.
 */
class IdCheckerApp {
    constructor() {
        this.playerNameResolver = new PlayerName();
        this.mackolikScraper = new MackolikScraper();
        this.missingPlayersDetails = [];
        this.isRunning = false;

        this.elements = {
            inputText: document.getElementById('inputText'),
            checkIdsBtn: document.getElementById('checkIdsBtn'),
            clearBtn: document.getElementById('clearBtn'),
            statusSection: document.getElementById('statusSection'),
            checkerProgressFill: document.getElementById('checkerProgressFill'),
            checkerProgressText: document.getElementById('checkerProgressText'),
            checkerStatusText: document.getElementById('checkerStatusText'),
            statTotal: document.getElementById('statTotal'),
            statResolved: document.getElementById('statResolved'),
            statMissing: document.getElementById('statMissing'),
            resolvedSection: document.getElementById('resolvedSection'),
            resolvedChips: document.getElementById('resolvedChips'),
            outputSection: document.getElementById('outputSection'),
            outputText: document.getElementById('outputText'),
            copyOutputBtn: document.getElementById('copyOutputBtn'),
            missingSection: document.getElementById('missingSection'),
            missingScrapeStatus: document.getElementById('missingScrapeStatus'),
            missingTableBody: document.getElementById('missingTableBody'),
            downloadExcelBtn: document.getElementById('downloadExcelBtn'),
            toast: document.getElementById('toast')
        };

        this.bindEvents();
    }

    bindEvents() {
        if (this.elements.checkIdsBtn) {
            this.elements.checkIdsBtn.addEventListener('click', () => this.checkAndFixIds());
        }

        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => this.clearAll());
        }

        if (this.elements.copyOutputBtn) {
            this.elements.copyOutputBtn.addEventListener('click', () => this.copyOutputText());
        }

        if (this.elements.downloadExcelBtn) {
            this.elements.downloadExcelBtn.addEventListener('click', () => this.downloadExcel());
        }
    }

    clearAll() {
        if (this.isRunning) return;
        this.elements.inputText.value = '';
        this.elements.outputText.value = '';
        this.elements.statusSection.style.display = 'none';
        this.elements.outputSection.style.display = 'none';
        this.elements.missingSection.style.display = 'none';
        this.missingPlayersDetails = [];
        this.showToast('Girdi ve sonuçlar temizlendi', 'info');
    }

    updateProgress(percent, text) {
        this.elements.checkerProgressFill.style.width = `${percent}%`;
        this.elements.checkerProgressText.textContent = `${Math.round(percent)}%`;
        if (text) {
            this.elements.checkerStatusText.textContent = text;
        }
    }

    async checkAndFixIds() {
        if (this.isRunning) return;

        const text = this.elements.inputText.value.trim();
        if (!text) {
            this.showToast('Lütfen kontrol edilecek Wikipedia metnini yapıştırın', 'warning');
            return;
        }

        this.isRunning = true;
        this.elements.checkIdsBtn.disabled = true;
        this.elements.checkIdsBtn.innerHTML = '<span class="spinner"></span> <span class="btn-text">Kontrol Ediliyor...</span>';

        // Reset UI sections
        this.elements.statusSection.style.display = 'block';
        this.elements.outputSection.style.display = 'none';
        this.elements.missingSection.style.display = 'none';
        this.elements.resolvedSection.style.display = 'none';
        this.elements.resolvedChips.innerHTML = '';
        this.elements.missingTableBody.innerHTML = '';
        this.missingPlayersDetails = [];

        // 1. Detect unique numeric IDs (length >= 4 to catch Maçkolik IDs)
        const idRegex = /\[\[(\d{4,})(?:\|[^\]]*)?\]\]/g;
        const uniqueIds = new Set();
        let match;
        while ((match = idRegex.exec(text)) !== null) {
            uniqueIds.add(match[1]);
        }

        const idsArray = Array.from(uniqueIds);
        this.elements.statTotal.textContent = idsArray.length;
        this.elements.statResolved.textContent = '0';
        this.elements.statMissing.textContent = '0';

        if (idsArray.length === 0) {
            this.updateProgress(100, 'Metinde sorgulanacak sayısal oyuncu ID\'si bulunamadı.');
            this.elements.outputText.value = text;
            this.elements.outputSection.style.display = 'block';
            this.finishRunning();
            this.showToast('Metinde sayısal ID bulunamadı', 'info');
            return;
        }

        // 2. Query Wikidata for each numeric ID
        const resolvedMap = {};
        const stillMissingIds = [];

        for (let i = 0; i < idsArray.length; i++) {
            const id = idsArray[i];
            const progress = ((i + 1) / idsArray.length) * 50; // First 50% for Wikidata SPARQL queries
            this.updateProgress(progress, `Wikidata sorgulanıyor: ID ${id} (${i + 1}/${idsArray.length})`);

            try {
                const resultName = await this.playerNameResolver.getPlayerName(id);
                if (resultName && resultName !== id.toString() && !this.playerNameResolver.missingIds.has(id)) {
                    resolvedMap[id] = resultName;
                } else {
                    stillMissingIds.push(id);
                }
            } catch (err) {
                console.error(`ID ${id} Wikidata sorgu hatası:`, err);
                stillMissingIds.push(id);
            }

            await new Promise(resolve => setTimeout(resolve, 150));
        }

        // 3. Update stats & render chips
        const resolvedCount = Object.keys(resolvedMap).length;
        this.elements.statResolved.textContent = resolvedCount;
        this.elements.statMissing.textContent = stillMissingIds.length;

        if (resolvedCount > 0) {
            this.elements.resolvedSection.style.display = 'block';
            for (const id in resolvedMap) {
                const chip = document.createElement('span');
                chip.className = 'chip chip-success';
                chip.textContent = `${id} ➔ ${resolvedMap[id]}`;
                this.elements.resolvedChips.appendChild(chip);
            }
        }

        // 4. Replace resolved IDs in the text
        let updatedText = text;
        for (const id in resolvedMap) {
            const replacement = resolvedMap[id];
            const pattern = new RegExp(`\\[\\[${id}(?:\\|[^\\]]*)?\\]\\]`, 'g');
            updatedText = updatedText.replace(pattern, `[[${replacement}]]`);
        }

        this.elements.outputText.value = updatedText;
        this.elements.outputSection.style.display = 'block';

        // 5. If there are still missing IDs, scrape their Maçkolik details
        if (stillMissingIds.length > 0) {
            this.elements.missingSection.style.display = 'block';
            this.elements.missingScrapeStatus.textContent = `${stillMissingIds.length} oyuncunun detayları Maçkolik'ten çekiliyor...`;

            for (let j = 0; j < stillMissingIds.length; j++) {
                const mId = stillMissingIds[j];
                const progress = 50 + (((j + 1) / stillMissingIds.length) * 50);
                this.updateProgress(progress, `Maçkolik'ten detay çekiliyor: ID ${mId} (${j + 1}/${stillMissingIds.length})`);

                try {
                    const details = await this.mackolikScraper.getPlayerDetails(mId);
                    this.missingPlayersDetails.push(details);

                    // Add row to table
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${details.id}</strong></td>
                        <td>${details.name || '-'}</td>
                        <td>${details.nationality || '-'}</td>
                        <td>${details.birthDate || '-'}</td>
                        <td><a href="${details.url}" target="_blank" style="color: var(--primary);">Profili Aç ↗</a></td>
                    `;
                    this.elements.missingTableBody.appendChild(tr);
                } catch (e) {
                    console.error(`ID ${mId} Maçkolik detay hatası:`, e);
                    const fallbackDetails = {
                        id: mId,
                        name: '-',
                        nationality: '-',
                        birthDate: '-',
                        url: `https://arsiv.mackolik.com/Futbolcu/${mId}/`
                    };
                    this.missingPlayersDetails.push(fallbackDetails);

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${mId}</strong></td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td><a href="https://arsiv.mackolik.com/Futbolcu/${mId}/" target="_blank" style="color: var(--primary);">Profili Aç ↗</a></td>
                    `;
                    this.elements.missingTableBody.appendChild(tr);
                }

                await new Promise(resolve => setTimeout(resolve, 200));
            }

            this.elements.missingScrapeStatus.textContent = `Analiz tamamlandı! ${stillMissingIds.length} bulunamayan oyuncu listelendi.`;
        }

        this.updateProgress(100, 'Tüm kontroller ve düzenlemeler tamamlandı.');
        this.finishRunning();
        this.showToast('İşlem tamamlandı', 'success');
    }

    finishRunning() {
        this.isRunning = false;
        this.elements.checkIdsBtn.disabled = false;
        this.elements.checkIdsBtn.innerHTML = '<span class="btn-icon">🚀</span> <span class="btn-text">ID\'leri Kontrol Et ve Düzenle</span>';
    }

    async copyOutputText() {
        const text = this.elements.outputText.value;
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Düzenlenmiş metin panoya kopyalandı', 'success');
        } catch (error) {
            this.showToast('Kopyalama başarısız', 'error');
        }
    }

    downloadExcel() {
        if (!this.missingPlayersDetails || this.missingPlayersDetails.length === 0) {
            this.showToast('İndirilecek bulunamayan oyuncu verisi yok', 'warning');
            return;
        }

        const filename = `wikidata_bulunamayan_oyuncular_${new Date().toISOString().slice(0, 10)}.xlsx`;

        if (typeof XLSX !== 'undefined') {
            const headers = ["Maçkolik ID", "Adı", "Milliyeti", "Doğum Tarihi", "Maçkolik Linki"];
            const rows = this.missingPlayersDetails.map(r => [
                r.id,
                r.name || '-',
                r.nationality || '-',
                r.birthDate || '-',
                r.url
            ]);
            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Bulunamayan Oyuncular");
            XLSX.writeFile(workbook, filename);
            this.showToast('Excel raporu indirildi', 'success');
        } else {
            let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
            csvContent += "Maçkolik ID,Adı,Milliyeti,Doğum Tarihi,Maçkolik Linki\r\n";
            this.missingPlayersDetails.forEach(r => {
                const row = [
                    `"${r.id}"`,
                    `"${(r.name || '-').replace(/"/g, '""')}"`,
                    `"${(r.nationality || '-').replace(/"/g, '""')}"`,
                    `"${(r.birthDate || '-').replace(/"/g, '""')}"`,
                    `"${r.url}"`
                ];
                csvContent += row.join(",") + "\r\n";
            });
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", filename.replace('.xlsx', '.csv'));
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showToast('CSV raporu indirildi', 'success');
        }
    }

    showToast(message, type = 'info') {
        const toast = this.elements.toast;
        const icon = toast.querySelector('.toast-icon');
        const msg = toast.querySelector('.toast-message');

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        if (icon) icon.textContent = icons[type] || icons.info;
        if (msg) msg.textContent = message;

        toast.className = `toast ${type} show`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize when DOM is ready
let idCheckerApp;
document.addEventListener('DOMContentLoaded', () => {
    idCheckerApp = new IdCheckerApp();
});
