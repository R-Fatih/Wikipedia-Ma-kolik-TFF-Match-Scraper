/**
 * Maçkolik Canlı Sonuçlar Web View & Scraper Controller
 */
class CanliApp {
    constructor() {
        this.mackolikScraper = new MackolikScraper();
        this.wikiFormatter = new WikiFormatter();

        this.teams = [];
        this.currentMatchData = null;
        this.errors = [];

        this.elements = {
            manualMatchId: document.getElementById('manualMatchId'),
            manualScrapeBtn: document.getElementById('manualScrapeBtn'),
            reloadWebviewBtn: document.getElementById('reloadWebviewBtn'),
            webviewStatus: document.getElementById('webviewStatus'),
            mackolikFrame: document.getElementById('mackolikFrame'),
            progressSection: document.getElementById('progressSection'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            progressDetails: document.getElementById('progressDetails'),
            currentMatch: document.getElementById('currentMatch'),
            errorSection: document.getElementById('errorSection'),
            errorList: document.getElementById('errorList'),
            outputSection: document.getElementById('outputSection'),
            matchSummaryBanner: document.getElementById('matchSummaryBanner'),
            combinedOutput: document.getElementById('combinedOutput'),
            copyBtn: document.getElementById('copyBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            missingSection: document.getElementById('missingSection'),
            missingPlayersList: document.getElementById('missingPlayersList'),
            copyMissingBtn: document.getElementById('copyMissingBtn'),
            analyzeMissingBtn: document.getElementById('analyzeMissingBtn'),
            missingAnalysisStatus: document.getElementById('missingAnalysisStatus'),
            toast: document.getElementById('toast')
        };

        this.init();
    }

    async init() {
        this.bindEvents();

        // Load teams database
        try {
            this.teams = await Team.loadTeams();
            console.log(`${this.teams.length} takım yüklendi.`);
        } catch (e) {
            console.warn('Takımlar yüklenemedi, varsayılan eşleşme kullanılacak:', e);
        }

        // Load Maçkolik Canlı Sonuçlar web view
        this.loadWebview();
    }

    bindEvents() {
        // Manual match ID scrape button
        this.elements.manualScrapeBtn.addEventListener('click', () => {
            const rawInput = this.elements.manualMatchId.value.trim();
            const matchId = this.extractMatchId(rawInput);
            if (!matchId) {
                this.showToast('Lütfen geçerli bir Maçkolik Maç ID veya Linki girin', 'warning');
                return;
            }
            this.elements.manualMatchId.value = matchId;
            this.scrapeMatch(matchId);
        });

        // Enter key on manual match ID input
        this.elements.manualMatchId.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.elements.manualScrapeBtn.click();
            }
        });

        // Sample match chip buttons
        document.querySelectorAll('.sample-match-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const matchId = e.currentTarget.getAttribute('data-id');
                if (matchId) {
                    this.elements.manualMatchId.value = matchId;
                    this.scrapeMatch(matchId);
                }
            });
        });

        // Reload webview button
        this.elements.reloadWebviewBtn.addEventListener('click', () => {
            this.loadWebview();
            this.showToast('Web View yenileniyor...', 'info');
        });

        // Copy button
        this.elements.copyBtn.addEventListener('click', () => this.copyOutput());

        // Download button
        this.elements.downloadBtn.addEventListener('click', () => this.downloadOutput());

        // Copy missing IDs
        this.elements.copyMissingBtn.addEventListener('click', () => this.copyMissingIds());

        // Analyze missing IDs
        this.elements.analyzeMissingBtn.addEventListener('click', () => this.analyzeMissingIds());

        // Listen for postMessage from webview iframe
        window.addEventListener('message', (event) => {
            if (event.data && (event.data.type === 'SCRAPE_MACKOLIK_MATCH' || event.data.type === 'MACKOLIK_MATCH_CLICK')) {
                const matchId = event.data.matchId;
                if (matchId) {
                    this.elements.manualMatchId.value = matchId;
                    this.showToast(`Maç ID: ${matchId} seçildi, veriler çekiliyor...`, 'info');
                    this.scrapeMatch(matchId);
                }
            }
        });
    }

    /**
     * Extract numeric Match ID from raw text or Maçkolik link
     * @param {string} input 
     * @returns {string}
     */
    extractMatchId(input) {
        if (!input) return '';
        const match = input.match(/\/Mac\/(\d+)/i) || input.match(/(\d{6,8})/);
        return match ? match[1] : input.trim();
    }

    /**
     * Load Maçkolik Canlı Sonuçlar into Web View iframe via CORS proxy
     */
    loadWebview() {
        this.elements.webviewStatus.textContent = '⚡ Canlı Bağlantı';
        this.elements.webviewStatus.style.background = 'rgba(16, 185, 129, 0.2)';
        this.elements.webviewStatus.style.color = '#10b981';

        const canliUrl = 'https://arsiv.mackolik.com/Canli-Sonuclar';
        const proxyUrl = 'https://tffproxy.arfatihim.workers.dev/?url=' + encodeURIComponent(canliUrl);

        // Load via proxy URL directly (bypasses X-Frame-Options SAMEORIGIN without breaking scripts)
        this.elements.mackolikFrame.src = proxyUrl;
    }

    /**
     * Inject 🚀 Scrape buttons into iframe document
     */
    injectScrapeButtonsToDoc(doc) {
        if (!doc) return;
        const inject = () => {
            // Target match rows by id="row_123456"
            const rows = doc.querySelectorAll('tr[id^="row_"]');
            rows.forEach(row => {
                const matchId = row.id.replace('row_', '').trim();
                if (matchId && !isNaN(matchId) && !row.querySelector('.btn-wiki-scrape-injected')) {
                    const targetCell = row.cells[row.cells.length - 1] || row;
                    const btn = doc.createElement('button');
                    btn.className = 'btn-wiki-scrape-injected';
                    btn.innerHTML = '🚀 Scrape';
                    btn.type = 'button';
                    btn.title = 'Maç ID: ' + matchId;
                    btn.style.cssText = 'background: #10b981; color: #fff; border: none; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; margin-left: 6px; z-index: 9999;';
                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.scrapeMatch(matchId);
                    };
                    targetCell.appendChild(btn);
                }
            });

            // Target match links by href="/Mac/12345/..."
            const links = doc.querySelectorAll('a[href*="/Mac/"]');
            links.forEach(link => {
                const href = link.getAttribute('href') || '';
                const match = href.match(/\/Mac\/(\d+)/);
                if (match && match[1]) {
                    const matchId = match[1];
                    let container = link.closest('tr') || link.parentElement;
                    if (container && !container.querySelector('.btn-wiki-scrape-injected')) {
                        const btn = doc.createElement('button');
                        btn.className = 'btn-wiki-scrape-injected';
                        btn.innerHTML = '🚀 Scrape';
                        btn.type = 'button';
                        btn.title = 'Maç ID: ' + matchId;
                        btn.style.cssText = 'background: #10b981; color: #fff; border: none; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; margin-left: 6px; z-index: 9999;';
                        btn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this.scrapeMatch(matchId);
                        };
                        container.appendChild(btn);
                    }
                }
            });
        };
        setInterval(inject, 1200);
        inject();
    }

    /**
     * Scrape single match by Maçkolik ID (WITHOUT TFF)
     * @param {string|number} matchId 
     */
    async scrapeMatch(matchId) {
        this.clearErrors();
        this.showProgress(true);
        this.elements.currentMatch.textContent = `Maçkolik ID: ${matchId} verileri indiriliyor...`;
        this.elements.outputSection.style.display = 'none';
        this.elements.missingSection.style.display = 'none';

        try {
            // Fetch match details from Maçkolik API
            const matchData = await this.mackolikScraper.getMatchData(matchId);
            this.currentMatchData = matchData;

            this.elements.currentMatch.textContent = `${matchData.homeTeam} vs ${matchData.awayTeam} (${matchData.homeScore ?? '-'} - ${matchData.awayScore ?? '-'}) - Wikipedia kodu oluşturuluyor...`;

            // Format match data using WikiFormatter
            const matchDetails = await this.wikiFormatter.formatMackolikMatch(matchData, this.teams);
            const output = matchDetails.getOutput(true);

            // Set output text
            this.elements.combinedOutput.value = output;

            // Set summary banner
            const scoreText = (matchData.homeScore !== null && matchData.awayScore !== null) 
                ? `${matchData.homeScore} - ${matchData.awayScore}` 
                : 'Skor Yok';
            const htText = matchData.halfTimeScore ? ` (İY: ${matchData.halfTimeScore})` : '';

            this.elements.matchSummaryBanner.innerHTML = `
                <div style="font-size: 1.1rem; color: var(--text-primary);">
                    ⚽ <strong>${matchData.homeTeam}</strong> ${scoreText} <strong>${matchData.awayTeam}</strong>${htText}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                    Maçkolik ID: <code>${matchId}</code> | TFF Verisi Olmadan Scrape Edildi
                </div>
            `;

            // Display output section
            this.elements.outputSection.style.display = 'block';

            // Check missing Wikidata IDs
            this.updateMissingIds();

            this.showToast('Maç datası başarıyla scrape edildi!', 'success');

        } catch (error) {
            console.error('Scrape hatası:', error);
            this.addError(`Maç scrape edilirken hata oluştu: ${error.message}`);
            this.showToast('Scrape hatası: ' + error.message, 'error');
        } finally {
            this.showProgress(false);
        }
    }

    /**
     * Update missing Wikidata player IDs section
     */
    updateMissingIds() {
        const missingPlayers = this.mackolikScraper.playerNameResolver.getMissingIds();
        this.elements.missingPlayersList.innerHTML = '';

        if (missingPlayers.length === 0) {
            this.elements.missingSection.style.display = 'none';
            return;
        }

        this.elements.missingSection.style.display = 'block';

        missingPlayers.forEach(id => {
            const item = document.createElement('div');
            item.className = 'missing-item';
            item.style.cssText = 'display: inline-flex; align-items: center; gap: 8px; background: rgba(51, 65, 85, 0.5); padding: 6px 12px; border-radius: 6px; font-size: 13px; margin: 4px; border: 1px solid var(--border);';
            item.innerHTML = `
                <span>ID: <strong>${id}</strong></span>
                <a href="https://arsiv.mackolik.com/Futbolcu/${id}/" target="_blank" title="Maçkolik'te Gör" style="color: var(--primary); text-decoration: none; font-size: 12px;">🔗 İncele</a>
            `;
            this.elements.missingPlayersList.appendChild(item);
        });
    }

    /**
     * Copy formatted Wikipedia output
     */
    async copyOutput() {
        const text = this.elements.combinedOutput.value;
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Wikipedia kodu panoya kopyalandı!', 'success');
        } catch (e) {
            this.elements.combinedOutput.select();
            document.execCommand('copy');
            this.showToast('Wikipedia kodu panoya kopyalandı!', 'success');
        }
    }

    /**
     * Download formatted Wikipedia output as TXT file
     */
    downloadOutput() {
        const text = this.elements.combinedOutput.value;
        if (!text) return;

        const homeName = (this.currentMatchData?.homeTeam || 'Match').replace(/[^a-zA-Z0-9]/g, '_');
        const awayName = (this.currentMatchData?.awayTeam || 'Data').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${homeName}_vs_${awayName}_Mackolik.txt`;

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Dosya indirildi!', 'success');
    }

    /**
     * Copy missing player IDs to clipboard
     */
    async copyMissingIds() {
        const missingPlayers = this.mackolikScraper.playerNameResolver.getMissingIds();
        if (missingPlayers.length === 0) return;

        const text = missingPlayers.join('\n');
        try {
            await navigator.clipboard.writeText(text);
            this.showToast(`${missingPlayers.length} eksik ID panoya kopyalandı!`, 'success');
        } catch (e) {
            this.showToast('Kopyalama başarısız oldu', 'error');
        }
    }

    /**
     * Analyze missing IDs
     */
    async analyzeMissingIds() {
        const missingIds = this.mackolikScraper.playerNameResolver.getMissingIds();
        if (missingIds.length === 0) return;

        const statusEl = this.elements.missingAnalysisStatus;
        statusEl.style.display = 'block';
        statusEl.textContent = '⏳ Oyuncu detayları Maçkolik\'ten çekiliyor...';

        try {
            const players = [];
            for (let i = 0; i < missingIds.length; i++) {
                const id = missingIds[i];
                statusEl.textContent = `⏳ Oyuncu bilgisi alınıyor (${i + 1}/${missingIds.length}): ID ${id}`;
                const details = await this.mackolikScraper.getPlayerDetails(id);
                players.push(details);
            }

            statusEl.textContent = '⏳ Excel dosyası hazırlanıyor...';

            if (typeof XLSX !== 'undefined') {
                const wsData = [
                    ['Maçkolik ID', 'Adı Soyadı', 'Uyruk', 'Doğum Tarihi', 'Maçkolik URL'],
                    ...players.map(p => [p.id, p.name, p.nationality, p.birthDate, p.url])
                ];
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Eksik Oyuncular');
                XLSX.writeFile(wb, 'Eksik_Wikidata_Oyunculari.xlsx');
                statusEl.textContent = '✅ Excel dosyası indirildi!';
            } else {
                statusEl.textContent = `✅ ${players.length} oyuncu detayları çekildi!`;
            }

            this.showToast('Eksik oyuncu analizi tamamlandı!', 'success');

        } catch (error) {
            console.error('Analiz hatası:', error);
            statusEl.textContent = '❌ Analiz hatası: ' + error.message;
            this.showToast('Analiz hatası: ' + error.message, 'error');
        }
    }

    showProgress(show) {
        this.elements.progressSection.style.display = show ? 'block' : 'none';
    }

    clearErrors() {
        this.errors = [];
        this.elements.errorList.innerHTML = '';
        this.elements.errorSection.style.display = 'none';
    }

    addError(msg) {
        this.errors.push(msg);
        this.elements.errorSection.style.display = 'block';
        const item = document.createElement('div');
        item.className = 'error-item';
        item.textContent = msg;
        this.elements.errorList.appendChild(item);
    }

    showToast(message, type = 'info') {
        const toast = this.elements.toast;
        toast.textContent = message;
        toast.className = `toast toast-${type} show`;
        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
        }, 3000);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.canliApp = new CanliApp();
});
