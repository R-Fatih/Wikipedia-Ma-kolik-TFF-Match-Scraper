/**
 * Wikipedia Match Scraper - Main Application Controller
 * Updated with League and Week Selection
 */
class App {
    constructor() {
        // Services
        this.tffScraper = new TFFScraper();
        this.mackolikScraper = new MackolikScraper();
        this.wikiFormatter = new WikiFormatter();

        // State
        this.teams = [];
        this.matchData = []; // Match data loaded from file
        this.selectedLeague = null;
        this.isRunning = false;
        this.shouldStop = false;
        this.matchOutputs = [];
        this.errors = [];
        this.weekSelectionType = 'single'; // 'single' or 'range'

        // DOM Elements
        this.elements = {
            leagueSelect: document.getElementById('leagueSelect'),
            leagueInfo: document.getElementById('leagueInfo'),
            singleWeekBtn: document.getElementById('singleWeekBtn'),
            rangeWeekBtn: document.getElementById('rangeWeekBtn'),
            singleWeekGroup: document.getElementById('singleWeekGroup'),
            rangeWeekGroup: document.getElementById('rangeWeekGroup'),
            weekSlider: document.getElementById('weekSlider'),
            singleWeek: document.getElementById('singleWeek'),
            startWeek: document.getElementById('startWeek'),
            endWeek: document.getElementById('endWeek'),
            weekSummaryText: document.getElementById('weekSummaryText'),
            varEnabled: document.getElementById('varEnabled'),
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            progressSection: document.getElementById('progressSection'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            progressDetails: document.getElementById('progressDetails'),
            currentMatch: document.getElementById('currentMatch'),
            errorSection: document.getElementById('errorSection'),
            errorList: document.getElementById('errorList'),
            missingSection: document.getElementById('missingSection'),
            missingPlayersList: document.getElementById('missingPlayersList'),
            copyMissingBtn: document.getElementById('copyMissingBtn'),
            outputSection: document.getElementById('outputSection'),
            combinedOutput: document.getElementById('combinedOutput'),
            matchOutputs: document.getElementById('matchOutputs'),
            copyBtn: document.getElementById('copyBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            toast: document.getElementById('toast')
        };

        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        // Populate league dropdown
        this.populateLeagues();

        // Bind event handlers
        this.bindEvents();

        // Load settings from localStorage
        this.loadSettings();

        // Load teams
        try {
            this.showToast('Takımlar yükleniyor...', 'info');
            this.teams = await Team.loadTeams();
            this.showToast(`${this.teams.length} takım yüklendi`, 'success');
        } catch (error) {
            this.showToast('Takımlar yüklenemedi: ' + error.message, 'error');
        }
    }

    /**
     * Populate leagues dropdown
     */
    populateLeagues() {
        this.elements.leagueSelect.innerHTML = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Lig Seçin --';
        this.elements.leagueSelect.appendChild(defaultOption);

        for (const key in LEAGUES) {
            const league = LEAGUES[key];
            const option = document.createElement('option');
            option.value = key;
            option.textContent = league.name;
            this.elements.leagueSelect.appendChild(option);
        }
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // League selection
        this.elements.leagueSelect.addEventListener('change', (e) => this.onLeagueChange(e.target.value));

        // Week type toggle
        this.elements.singleWeekBtn.addEventListener('click', () => this.setWeekType('single'));
        this.elements.rangeWeekBtn.addEventListener('click', () => this.setWeekType('range'));

        // Week slider and inputs
        this.elements.weekSlider.addEventListener('input', (e) => {
            this.elements.singleWeek.value = e.target.value;
            this.updateWeekSummary();
        });

        this.elements.singleWeek.addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if (this.selectedLeague) {
                val = Math.max(1, Math.min(val, this.selectedLeague.totalWeeks));
            }
            e.target.value = val;
            this.elements.weekSlider.value = val;
            this.updateWeekSummary();
        });

        this.elements.startWeek.addEventListener('change', () => this.updateWeekSummary());
        this.elements.endWeek.addEventListener('change', () => this.updateWeekSummary());

        // Start button
        this.elements.startBtn.addEventListener('click', () => this.start());

        // Stop button
        this.elements.stopBtn.addEventListener('click', () => this.stop());

        // Copy button
        this.elements.copyBtn.addEventListener('click', () => this.copyOutput());

        // Copy missing IDs button
        this.elements.copyMissingBtn.addEventListener('click', () => this.copyMissingIds());

        // Download button
        this.elements.downloadBtn.addEventListener('click', () => this.downloadOutput());

        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Save settings on change
        this.elements.varEnabled.addEventListener('change', () => this.saveSettings());
    }

    /**
     * Handle league change
     */
    async onLeagueChange(leagueId) {
        if (!leagueId) {
            this.selectedLeague = null;
            this.elements.leagueInfo.innerHTML = '';
            this.elements.startBtn.disabled = true;
            return;
        }

        this.selectedLeague = LEAGUES[leagueId];

        // Update league info
        this.elements.leagueInfo.innerHTML = `
            <div class="league-info-item">
                <span>📅</span>
                <span>Sezon: <strong>${this.selectedLeague.season}</strong></span>
            </div>
            <div class="league-info-item">
                <span>🏟️</span>
                <span>Toplam: <strong>${this.selectedLeague.totalWeeks} hafta</strong></span>
            </div>
            <div class="league-info-item">
                <span>⚽</span>
                <span>Haftalık: <strong>${this.selectedLeague.matchesPerWeek} maç</strong></span>
            </div>
        `;

        // Update week selector max values
        this.elements.weekSlider.max = this.selectedLeague.totalWeeks;
        this.elements.singleWeek.max = this.selectedLeague.totalWeeks;
        this.elements.startWeek.max = this.selectedLeague.totalWeeks;
        this.elements.endWeek.max = this.selectedLeague.totalWeeks;

        // Load match data
        try {
            this.showToast('Maç verileri yükleniyor...', 'info');
            await this.loadMatchData();
            this.showToast(`${this.matchData.length} maç yüklendi`, 'success');
            this.elements.startBtn.disabled = false;
        } catch (error) {
            this.showToast('Maç verileri yüklenemedi: ' + error.message, 'error');
            this.elements.startBtn.disabled = true;
        }

        this.updateWeekSummary();
        this.saveSettings();
    }

    /**
     * Load match data from file
     */
    async loadMatchData() {
        const response = await fetch(this.selectedLeague.dataFile);
        if (!response.ok) throw new Error('Dosya okunamadı');

        const text = await response.text();
        this.matchData = text.trim().split('\n').map(line => {
            const parts = line.trim().split(',');
            return {
                tffId: parts[0].trim(),
                mackolikId: parts[1]?.trim() || ''
            };
        });
    }

    /**
     * Set week selection type
     */
    setWeekType(type) {
        this.weekSelectionType = type;

        // Update buttons
        this.elements.singleWeekBtn.classList.toggle('active', type === 'single');
        this.elements.rangeWeekBtn.classList.toggle('active', type === 'range');

        // Show/hide groups
        this.elements.singleWeekGroup.style.display = type === 'single' ? 'block' : 'none';
        this.elements.rangeWeekGroup.style.display = type === 'range' ? 'block' : 'none';

        this.updateWeekSummary();
    }

    /**
     * Update week summary text
     */
    updateWeekSummary() {
        if (!this.selectedLeague) {
            this.elements.weekSummaryText.textContent = '-';
            return;
        }

        const matchesPerWeek = this.selectedLeague.matchesPerWeek;

        if (this.weekSelectionType === 'single') {
            const week = parseInt(this.elements.singleWeek.value);
            this.elements.weekSummaryText.textContent = `${week}. Hafta (${matchesPerWeek} maç)`;
        } else {
            const startWeek = parseInt(this.elements.startWeek.value);
            const endWeek = parseInt(this.elements.endWeek.value);
            const weeks = Math.max(0, endWeek - startWeek + 1);
            const totalMatches = weeks * matchesPerWeek;
            this.elements.weekSummaryText.textContent = `${startWeek}. - ${endWeek}. Hafta (${weeks} hafta, ${totalMatches} maç)`;
        }
    }

    /**
     * Calculate start and end indices from week selection
     */
    getMatchIndices() {
        if (!this.selectedLeague) return { start: 0, end: 0 };

        const matchesPerWeek = this.selectedLeague.matchesPerWeek;

        if (this.weekSelectionType === 'single') {
            const week = parseInt(this.elements.singleWeek.value);
            const start = (week - 1) * matchesPerWeek;
            const end = start + matchesPerWeek;
            return { start, end, startWeek: week, endWeek: week };
        } else {
            const startWeek = parseInt(this.elements.startWeek.value);
            const endWeek = parseInt(this.elements.endWeek.value);
            const start = (startWeek - 1) * matchesPerWeek;
            const end = endWeek * matchesPerWeek;
            return { start, end, startWeek, endWeek };
        }
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('matchScraperSettings') || '{}');

        if (settings.varEnabled !== undefined) {
            this.elements.varEnabled.checked = settings.varEnabled;
        }

        if (settings.leagueId && LEAGUES[settings.leagueId]) {
            this.elements.leagueSelect.value = settings.leagueId;
            this.onLeagueChange(settings.leagueId);
        }

        if (settings.weekType) {
            this.setWeekType(settings.weekType);
        }

        if (settings.singleWeek) {
            this.elements.singleWeek.value = settings.singleWeek;
            this.elements.weekSlider.value = settings.singleWeek;
        }

        if (settings.startWeek) {
            this.elements.startWeek.value = settings.startWeek;
        }

        if (settings.endWeek) {
            this.elements.endWeek.value = settings.endWeek;
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        const settings = {
            varEnabled: this.elements.varEnabled.checked,
            leagueId: this.elements.leagueSelect.value,
            weekType: this.weekSelectionType,
            singleWeek: parseInt(this.elements.singleWeek.value),
            startWeek: parseInt(this.elements.startWeek.value),
            endWeek: parseInt(this.elements.endWeek.value)
        };
        localStorage.setItem('matchScraperSettings', JSON.stringify(settings));
    }

    /**
     * Start scraping process
     */
    async start() {
        if (this.isRunning || !this.selectedLeague) return;

        // Get indices
        const { start, end, startWeek, endWeek } = this.getMatchIndices();

        if (start >= end || start >= this.matchData.length) {
            this.showToast('Geçersiz hafta seçimi', 'error');
            return;
        }

        const actualEnd = Math.min(end, this.matchData.length);
        const includeVAR = this.elements.varEnabled.checked;
        const matchesPerWeek = this.selectedLeague.matchesPerWeek;

        // Save settings
        this.saveSettings();

        // Reset state
        this.isRunning = true;
        this.shouldStop = false;
        this.matchOutputs = [];
        this.errors = [];

        // Update UI
        this.elements.startBtn.style.display = 'none';
        this.elements.stopBtn.style.display = 'inline-flex';
        this.elements.stopBtn.disabled = false;
        this.elements.progressSection.style.display = 'block';
        this.elements.errorSection.style.display = 'none';
        this.elements.errorList.innerHTML = '';
        this.elements.missingSection.style.display = 'none';
        this.elements.missingPlayersList.innerHTML = '';
        this.elements.outputSection.style.display = 'none';

        // Clear missing IDs from resolver
        this.mackolikScraper.playerNameResolver.clearCache();

        let combinedOutput = '';
        let currentWeek = -1;

        for (let i = start; i < actualEnd; i++) {
            if (this.shouldStop) {
                break;
            }

            // Update progress
            const progress = ((i - start) / (actualEnd - start)) * 100;
            this.updateProgress(progress, i - start, actualEnd - start);

            // Get match data
            const match = this.matchData[i];
            const tffId = match.tffId;
            const mackolikId = match.mackolikId;

            // Calculate week number
            const weekNumber = Math.floor(i / matchesPerWeek) + 1;

            // Add week header if new week
            if (weekNumber !== currentWeek) {
                currentWeek = weekNumber;
                combinedOutput += `<!-- ${weekNumber}. Hafta -->\n`;
            }

            this.elements.currentMatch.textContent = `İşleniyor: ${i + 1}/${actualEnd} - TFF=${tffId}`;

            try {
                // Scrape TFF data
                let matchObj;
                try {
                    matchObj = await this.tffScraper.scrape(tffId);

                    // Find team names and update progress display
                    const homeTeam = Team.findByTffId(this.teams, matchObj.homeId);
                    const awayTeam = Team.findByTffId(this.teams, matchObj.awayId);
                    const homeName = homeTeam?.takımAdı || matchObj.homeId;
                    const awayName = awayTeam?.takımAdı || matchObj.awayId;
                    this.elements.currentMatch.innerHTML = `İşleniyor: <strong>${homeName}</strong> vs <strong>${awayName}</strong> (${i + 1}/${actualEnd})`;
                } catch (error) {
                    this.addError(`TFF hatası (${tffId}): ${error.message}`);
                    matchObj = new Match();
                    matchObj.tffId = parseInt(tffId);
                }

                // Get Maçkolik events
                let events = { homeGoals: '', awayGoals: '' };
                if (mackolikId) {
                    try {
                        events = await this.mackolikScraper.getMatchEvents(mackolikId);
                    } catch (error) {
                        this.addError(`Maçkolik hatası (${mackolikId}): ${error.message}`);
                    }
                }

                // Format for Wikipedia
                const matchDetails = await this.wikiFormatter.formatMatch(
                    matchObj,
                    this.teams,
                    events,
                    weekNumber,
                    includeVAR
                );

                const output = matchDetails.getOutput(includeVAR);

                this.matchOutputs.push({
                    tffId,
                    mackolikId,
                    output,
                    mDetail: matchDetails.mDetail
                });

                combinedOutput += output + '\n\n';

            } catch (error) {
                this.addError(`Genel hata (${tffId}): ${error.message}`);
            }
        }

        // Finish
        this.isRunning = false;
        this.elements.startBtn.style.display = 'inline-flex';
        this.elements.stopBtn.style.display = 'none';

        if (!this.shouldStop) {
            this.updateProgress(100, actualEnd - start, actualEnd - start);
        }

        this.elements.currentMatch.textContent = this.shouldStop ? 'Durduruldu' : 'Tamamlandı!';

        // Show output
        this.elements.combinedOutput.value = combinedOutput.trim();
        this.renderIndividualOutputs();
        this.elements.outputSection.style.display = 'block';

        // Show missing IDs if any
        this.renderMissingIds();

        this.showToast(
            this.shouldStop
                ? 'İşlem durduruldu'
                : `${this.matchOutputs.length} maç işlendi`,
            this.shouldStop ? 'warning' : 'success'
        );
    }

    /**
     * Stop scraping process
     */
    stop() {
        this.shouldStop = true;
        this.elements.stopBtn.disabled = true;
        this.elements.currentMatch.textContent = 'Durduruluyor...';
    }

    /**
     * Update progress bar
     */
    updateProgress(percent, current, total) {
        this.elements.progressFill.style.width = `${percent}%`;
        this.elements.progressText.textContent = `${Math.round(percent)}%`;
        this.elements.progressDetails.textContent = `${current} / ${total} maç`;
    }

    /**
     * Add error to list
     */
    addError(message) {
        this.errors.push(message);
        this.elements.errorSection.style.display = 'block';

        const errorItem = document.createElement('div');
        errorItem.className = 'error-item';
        errorItem.textContent = message;
        this.elements.errorList.appendChild(errorItem);
    }

    /**
     * Render individual match outputs
     */
    renderIndividualOutputs() {
        this.elements.matchOutputs.innerHTML = '';

        for (const match of this.matchOutputs) {
            const item = document.createElement('div');
            item.className = 'match-output-item';
            item.innerHTML = `
                <div class="match-output-header">
                    <span>${match.mDetail.replace('|', '')}</span>
                    <button class="btn btn-secondary" onclick="app.copyIndividual('${match.tffId}')">
                        📋 Kopyala
                    </button>
                </div>
                <textarea readonly>${match.output}</textarea>
            `;
            this.elements.matchOutputs.appendChild(item);
        }
    }

    /**
     * Render missing Wikidata IDs
     */
    renderMissingIds() {
        const missingPlayers = this.mackolikScraper.playerNameResolver.getMissingIds();

        if (missingPlayers.length === 0) {
            this.elements.missingSection.style.display = 'none';
            return;
        }

        this.elements.missingSection.style.display = 'block';
        this.elements.missingPlayersList.innerHTML = '';

        for (const id of missingPlayers) {
            const item = document.createElement('span');
            item.className = 'missing-id-item';
            item.innerHTML = `<a href="https://arsiv.mackolik.com/Futbolcu/${id}/" target="_blank">${id}</a>`;
            this.elements.missingPlayersList.appendChild(item);
        }
    }

    /**
     * Copy missing IDs to clipboard
     */
    async copyMissingIds() {
        const missingPlayers = this.mackolikScraper.playerNameResolver.getMissingIds();

        if (missingPlayers.length === 0) {
            this.showToast('Eksik ID yok', 'info');
            return;
        }

        const text = `Wikidata'da Bulunamayan Maçkolik Oyuncu ID'leri:\n${missingPlayers.join('\n')}`;

        try {
            await navigator.clipboard.writeText(text);
            this.showToast('ID\'ler panoya kopyalandı', 'success');
        } catch (error) {
            this.showToast('Kopyalama başarısız', 'error');
        }
    }

    /**
     * Switch tab
     */
    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}Tab`);
        });
    }

    /**
     * Copy combined output
     */
    async copyOutput() {
        try {
            await navigator.clipboard.writeText(this.elements.combinedOutput.value);
            this.showToast('Panoya kopyalandı', 'success');
        } catch (error) {
            this.showToast('Kopyalama başarısız', 'error');
        }
    }

    /**
     * Copy individual match output
     */
    async copyIndividual(tffId) {
        const match = this.matchOutputs.find(m => m.tffId === tffId);
        if (match) {
            try {
                await navigator.clipboard.writeText(match.output);
                this.showToast('Panoya kopyalandı', 'success');
            } catch (error) {
                this.showToast('Kopyalama başarısız', 'error');
            }
        }
    }

    /**
     * Download output as file
     */
    downloadOutput() {
        const content = this.elements.combinedOutput.value;
        const leagueName = this.selectedLeague?.shortName || 'matches';
        const { startWeek, endWeek } = this.getMatchIndices();
        const weekInfo = startWeek === endWeek ? `hafta${startWeek}` : `hafta${startWeek}-${endWeek}`;

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${leagueName}_${weekInfo}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Dosya indirildi', 'success');
    }

    /**
     * Show toast notification
     */
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

        icon.textContent = icons[type] || icons.info;
        msg.textContent = message;

        toast.className = `toast ${type} show`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});
