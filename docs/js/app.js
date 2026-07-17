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
        this.failedMatches = []; // Matches that failed to connect
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
            analyzeMissingBtn: document.getElementById('analyzeMissingBtn'),
            missingAnalysisStatus: document.getElementById('missingAnalysisStatus'),
            failedMatchesSection: document.getElementById('failedMatchesSection'),
            failedMatchesList: document.getElementById('failedMatchesList'),
            retryFailedBtn: document.getElementById('retryFailedBtn'),
            outputSection: document.getElementById('outputSection'),
            combinedOutput: document.getElementById('combinedOutput'),
            matchOutputs: document.getElementById('matchOutputs'),
            copyBtn: document.getElementById('copyBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            byeEnabled: document.getElementById('byeEnabled'),
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

        // Analyze missing IDs and download Excel button
        if (this.elements.analyzeMissingBtn) {
            this.elements.analyzeMissingBtn.addEventListener('click', () => this.analyzeMissingPlayers());
        }

        // Download button
        this.elements.downloadBtn.addEventListener('click', () => this.downloadOutput());

        // Retry failed matches button
        this.elements.retryFailedBtn.addEventListener('click', () => this.retryFailedMatches());

        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Save settings on change
        this.elements.varEnabled.addEventListener('change', () => this.saveSettings());
        if (this.elements.byeEnabled) {
            this.elements.byeEnabled.addEventListener('change', () => this.saveSettings());
        }
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

        if (settings.byeEnabled !== undefined && this.elements.byeEnabled) {
            this.elements.byeEnabled.checked = settings.byeEnabled;
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
            byeEnabled: this.elements.byeEnabled ? this.elements.byeEnabled.checked : false,
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
        this.failedMatches = [];

        // Update UI
        this.elements.startBtn.style.display = 'none';
        this.elements.stopBtn.style.display = 'inline-flex';
        this.elements.stopBtn.disabled = false;
        this.elements.progressSection.style.display = 'block';
        this.elements.errorSection.style.display = 'none';
        this.elements.errorList.innerHTML = '';
        this.elements.failedMatchesSection.style.display = 'none';
        this.elements.failedMatchesList.innerHTML = '';
        this.elements.missingSection.style.display = 'none';
        this.elements.missingPlayersList.innerHTML = '';
        this.elements.outputSection.style.display = 'none';

        // Clear missing IDs from resolver
        this.mackolikScraper.playerNameResolver.clearCache();

        const byeEnabled = this.elements.byeEnabled ? this.elements.byeEnabled.checked : false;
        const isFullSeason = (this.weekSelectionType === 'range' && startWeek === 1 && endWeek === this.selectedLeague.totalWeeks);
        const weeksData = {};

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

            if (!weeksData[weekNumber]) {
                weeksData[weekNumber] = { matches: [], teamsPlayed: new Set() };
            }

            this.elements.currentMatch.textContent = `İşleniyor: ${i + 1}/${actualEnd} - TFF=${tffId}`;

            try {
                // Scrape TFF data
                let matchObj;
                let tffFailed = false;
                try {
                    matchObj = await this.tffScraper.scrape(tffId);

                    // Find team names and update progress display
                    const homeTeam = Team.findByTFFId(this.teams, matchObj.homeId);
                    const awayTeam = Team.findByTFFId(this.teams, matchObj.awayId);
                    const homeName = homeTeam?.takımAdı || matchObj.homeId;
                    const awayName = awayTeam?.takımAdı || matchObj.awayId;
                    this.elements.currentMatch.innerHTML = `İşleniyor: <strong>${homeName}</strong> vs <strong>${awayName}</strong> (${i + 1}/${actualEnd})`;
                } catch (error) {
                    this.addError(`TFF hatası (${tffId}): ${error.message}`);
                    tffFailed = true;
                }

                // If TFF failed, add to failed list and skip
                if (tffFailed) {
                    this.failedMatches.push({
                        index: i,
                        tffId,
                        mackolikId,
                        weekNumber,
                        reason: 'TFF bağlantı hatası'
                    });
                    continue;
                }

                // Record played teams
                weeksData[weekNumber].teamsPlayed.add(matchObj.homeId);
                weeksData[weekNumber].teamsPlayed.add(matchObj.awayId);

                // Get Maçkolik events
                let events = { homeGoals: '', awayGoals: '', homeScore: null, awayScore: null, failed: false };
                if (mackolikId) {
                    try {
                        events = await this.mackolikScraper.getMatchEvents(mackolikId);
                    } catch (error) {
                        this.addError(`Maçkolik hatası (${mackolikId}): ${error.message}`);
                        events.failed = true;
                    }
                }

                // Use Maçkolik scores if available (more reliable)
                if (events.homeScore !== null && events.awayScore !== null) {
                    matchObj.homeMS = events.homeScore;
                    matchObj.awayMS = events.awayScore;
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

                weeksData[weekNumber].matches.push({
                    tffId,
                    mackolikId,
                    output,
                    mDetail: matchDetails.mDetail,
                    date: matchObj.date,
                    hasKnownTime: matchObj.hasKnownTime
                });

            } catch (error) {
                this.addError(`Genel hata (${tffId}): ${error.message}`);
            }
        }

        // Build combined output and individual outputs grouped by week
        let combinedOutput = '';
        this.matchOutputs = [];

        // Detect distinct teams across weeks
        const distinctTeamIds = new Set();
        Object.values(weeksData).forEach(wData => {
            wData.teamsPlayed.forEach(tId => distinctTeamIds.add(tId));
        });

        const sortedWeeks = Object.keys(weeksData).map(Number).sort((a, b) => a - b);
        for (const w of sortedWeeks) {
            combinedOutput += `<!-- ${w}. Hafta -->\n`;
            const wData = weeksData[w];
            wData.matches.sort((firstMatch, secondMatch) => {
                const firstDate = new Date(firstMatch.date);
                const secondDate = new Date(secondMatch.date);

                // Compare calendar days before kick-off times so each week's
                // output remains chronological even when source IDs are not.
                const dayDifference = new Date(
                    firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate()
                ) - new Date(
                    secondDate.getFullYear(), secondDate.getMonth(), secondDate.getDate()
                );
                if (dayDifference !== 0) return dayDifference;

                // Unknown kick-off times are kept in their original relative order.
                if (!firstMatch.hasKnownTime || !secondMatch.hasKnownTime) {
                    return Number(secondMatch.hasKnownTime) - Number(firstMatch.hasKnownTime);
                }

                return firstDate - secondDate;
            });
            for (const m of wData.matches) {
                this.matchOutputs.push(m);
                combinedOutput += m.output + '\n\n';
            }

            // BAY haftası box after last match of week if enabled & full season run
            if (byeEnabled && isFullSeason) {
                let byeTeam = null;
                for (const tId of distinctTeamIds) {
                    if (!wData.teamsPlayed.has(tId)) {
                        byeTeam = Team.findByTFFId(this.teams, tId) || { kısaKodu: 'BAY', TakımAdı: 'BAY' };
                        break;
                    }
                }
                if (byeTeam) {
                    const byeCode = byeTeam.kısaKodu || byeTeam.KısaKodu || 'BAY';
                    const byeOutput = `|${byeCode}-BAY = \n{{Kapanabilir futbol maçı kutusu\n|tarih             = 1\n|zaman             = 1\n|tur               = ${w}\n|takım1            = 1\n|sonuç             = Y\n|takım2            = \n|stadyum           = \n|bg                = \n}}`;
                    this.matchOutputs.push({
                        tffId: `BAY_${w}`,
                        mackolikId: '',
                        output: byeOutput,
                        mDetail: `|${byeCode}-BAY`
                    });
                    combinedOutput += byeOutput + '\n\n';
                }
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

        // Show failed matches if any
        this.renderFailedMatches();

        this.showToast(
            this.shouldStop
                ? 'İşlem durduruldu'
                : `${this.matchOutputs.length} maç işlendi` + (this.failedMatches.length > 0 ? `, ${this.failedMatches.length} başarısız` : ''),
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
     * Render failed matches section
     */
    renderFailedMatches() {
        if (this.failedMatches.length === 0) {
            this.elements.failedMatchesSection.style.display = 'none';
            return;
        }

        this.elements.failedMatchesSection.style.display = 'block';
        this.elements.failedMatchesList.innerHTML = '';

        for (const match of this.failedMatches) {
            const item = document.createElement('div');
            item.className = 'error-item';
            item.innerHTML = `
                <strong>TFF ID: ${match.tffId}</strong>
                ${match.mackolikId ? `| Maçkolik ID: ${match.mackolikId}` : ''}
                | Hafta: ${match.weekNumber}
                | Sebep: ${match.reason}
            `;
            this.elements.failedMatchesList.appendChild(item);
        }
    }

    /**
     * Retry failed matches
     */
    async retryFailedMatches() {
        if (this.isRunning || this.failedMatches.length === 0) return;

        const matchesToRetry = [...this.failedMatches];
        const includeVAR = this.elements.varEnabled.checked;
        const matchesPerWeek = this.selectedLeague.matchesPerWeek;

        // Reset state for retry
        this.isRunning = true;
        this.shouldStop = false;
        this.failedMatches = [];

        // Update UI
        this.elements.retryFailedBtn.disabled = true;
        this.elements.retryFailedBtn.innerHTML = '<span>⏳</span> Deneniyor...';
        this.elements.progressSection.style.display = 'block';

        let retrySuccess = 0;
        let retryFailed = 0;

        for (let j = 0; j < matchesToRetry.length; j++) {
            if (this.shouldStop) break;

            const failedMatch = matchesToRetry[j];
            const { tffId, mackolikId, weekNumber, index } = failedMatch;

            // Update progress
            const progress = ((j + 1) / matchesToRetry.length) * 100;
            this.updateProgress(progress, j + 1, matchesToRetry.length);
            this.elements.currentMatch.textContent = `Tekrar deneniyor: TFF=${tffId} (${j + 1}/${matchesToRetry.length})`;

            try {
                // Scrape TFF data
                const matchObj = await this.tffScraper.scrape(tffId);

                // Find team names
                const homeTeam = Team.findByTFFId(this.teams, matchObj.homeId);
                const awayTeam = Team.findByTFFId(this.teams, matchObj.awayId);
                const homeName = homeTeam?.takımAdı || matchObj.homeId;
                const awayName = awayTeam?.takımAdı || matchObj.awayId;
                this.elements.currentMatch.innerHTML = `Tekrar deneniyor: <strong>${homeName}</strong> vs <strong>${awayName}</strong>`;

                // Get Maçkolik events
                let events = { homeGoals: '', awayGoals: '', homeScore: null, awayScore: null };
                if (mackolikId) {
                    try {
                        events = await this.mackolikScraper.getMatchEvents(mackolikId);
                    } catch (error) {
                        console.warn(`Maçkolik retry hatası (${mackolikId}): ${error.message}`);
                    }
                }

                // Use Maçkolik scores if available
                if (events.homeScore !== null && events.awayScore !== null) {
                    matchObj.homeMS = events.homeScore;
                    matchObj.awayMS = events.awayScore;
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

                // Update combined output
                const currentOutput = this.elements.combinedOutput.value;
                this.elements.combinedOutput.value = currentOutput + (currentOutput ? '\n\n' : '') + output;

                retrySuccess++;
            } catch (error) {
                // Still failed
                this.failedMatches.push({
                    index,
                    tffId,
                    mackolikId,
                    weekNumber,
                    reason: 'TFF bağlantı hatası (tekrar)'
                });
                retryFailed++;
            }
        }

        // Finish retry
        this.isRunning = false;
        this.elements.retryFailedBtn.disabled = false;
        this.elements.retryFailedBtn.innerHTML = '<span>🔄</span> Başarısız Maçları Tekrar Dene';
        this.elements.currentMatch.textContent = `Tamamlandı! ${retrySuccess} başarılı, ${retryFailed} başarısız`;

        // Refresh outputs
        this.renderIndividualOutputs();
        this.renderFailedMatches();

        this.showToast(
            retrySuccess > 0
                ? `${retrySuccess} maç başarıyla işlendi` + (retryFailed > 0 ? `, ${retryFailed} hâlâ başarısız` : '')
                : 'Hiçbir maç işlenemedi',
            retrySuccess > 0 ? 'success' : 'error'
        );
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
     * Analyze missing players on Wikidata and download as Excel file
     */
    async analyzeMissingPlayers() {
        const missingIds = this.mackolikScraper.playerNameResolver.getMissingIds();
        if (!missingIds || missingIds.length === 0) {
            this.showToast('Analiz edilecek bulunamayan oyuncu yok', 'warning');
            return;
        }

        const btn = this.elements.analyzeMissingBtn;
        const statusEl = this.elements.missingAnalysisStatus;
        if (btn) btn.disabled = true;
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.textContent = `Oyuncular analiz ediliyor... (0 / ${missingIds.length})`;
        }

        const results = [];
        for (let i = 0; i < missingIds.length; i++) {
            const id = missingIds[i];
            if (statusEl) {
                statusEl.textContent = `Oyuncular analiz ediliyor... (${i + 1} / ${missingIds.length}: ID ${id})`;
            }

            try {
                const details = await this.mackolikScraper.getPlayerDetails(id);
                results.push(details);
            } catch (error) {
                console.error(`ID ${id} detayları alınamadı:`, error);
                results.push({
                    id: id,
                    name: '-',
                    nationality: '-',
                    birthDate: '-',
                    url: `https://arsiv.mackolik.com/Futbolcu/${id}/`
                });
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (statusEl) {
            statusEl.textContent = 'Analiz tamamlandı! Excel dosyası hazırlanıyor...';
        }

        const filename = `bulunamayan_oyuncular_${new Date().toISOString().slice(0, 10)}.xlsx`;

        if (typeof XLSX !== 'undefined') {
            const headers = ["Maçkolik ID", "Adı", "Milliyeti", "Doğum Tarihi", "Maçkolik Linki"];
            const rows = results.map(r => [
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
        } else {
            let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
            csvContent += "Maçkolik ID,Adı,Milliyeti,Doğum Tarihi,Maçkolik Linki\r\n";
            results.forEach(r => {
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
        }

        if (statusEl) {
            statusEl.textContent = `Tamamlandı! ${results.length} oyuncu Excel olarak indirildi.`;
        }
        if (btn) btn.disabled = false;
        this.showToast(`${results.length} oyuncu analiz edildi ve Excel indirildi`, 'success');
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
