/**
 * TFFScraper - Scrapes match data from TFF.org
 * Uses CORS proxy for cross-origin requests
 */
class TFFScraper {
    constructor() {
        // CORS proxy options - custom worker should be first for Turkish encoding support
        // IMPORTANT: Replace 'YOUR_WORKER_NAME' with your Cloudflare Worker subdomain
        // Example: 'https://tff-proxy.your-name.workers.dev/?url='
        this.customProxyUrl = "https://tffproxy.arfatihim.workers.dev/"; // Set your Cloudflare Worker URL here

        // Fallback proxies (may have encoding issues)
        this.proxyUrls = [
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        this.currentProxyIndex = 0;
        this.timeout = 20000;
    }

    /**
     * Get current proxy URL
     */
    getProxyUrl() {
        return this.proxyUrls[this.currentProxyIndex];
    }

    /**
     * Switch to next proxy
     */
    switchProxy() {
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyUrls.length;
    }

    /**
     * Scrape match data from TFF website
     * @param {string} macId - TFF match ID
     * @returns {Promise<Match>} - Match object with scraped data
     */
    async scrape(macId) {
        const match = new Match();
        match.tffId = parseInt(macId);

        const tffUrl = `https://tff.org/Default.aspx?pageID=29&macID=${macId}`;

        let html = null;

        // Try custom Cloudflare Worker proxy first (best encoding support)
        if (this.customProxyUrl) {
            try {
                const proxyUrl = this.customProxyUrl + "?url=" + encodeURIComponent(tffUrl);
                const response = await this.fetchWithTimeout(proxyUrl, this.timeout);

                if (response.ok) {
                    // Custom proxy returns UTF-8, so use text() directly
                    html = await response.text();
                    console.log('Using custom Cloudflare Worker proxy');
                }
            } catch (error) {
                console.warn('Custom proxy failed:', error.message);
            }
        }

        // Fallback to public proxies if custom didn't work
        if (!html) {
            let attempts = 0;
            const maxAttempts = this.proxyUrls.length * 2;

            while (!html && attempts < maxAttempts) {
                try {
                    const proxyUrl = this.getProxyUrl() + encodeURIComponent(tffUrl);
                    const response = await this.fetchWithTimeout(proxyUrl, this.timeout);

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    // Get response as ArrayBuffer and decode with proper charset
                    const buffer = await response.arrayBuffer();
                    html = this.decodeResponse(buffer, response);
                } catch (error) {
                    console.warn(`Proxy ${this.currentProxyIndex} failed:`, error.message);
                    this.switchProxy();
                    attempts++;
                }
            }
        }

        if (!html) {
            throw new Error('Tüm proxy bağlantıları başarısız oldu');
        }

        // Fix common Turkish character encoding issues
        html = this.fixTurkishChars(html);

        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // XPath selectors from original C# code
        const selectors = {
            stadium: '#ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_lnkStad',
            referee1: '#ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl00_lnkHakem',
            referee2: '#ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl01_lnkHakem',
            referee3: '#ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl02_lnkHakem',
            referee4: '#ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl03_lnkHakem',
            referee5: '#ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl04_lnkHakem',
            referee6: '#ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl05_lnkHakem',
            referee7: '#ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl06_lnkHakem',
            date: '#ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_lblTarih',
            homeTeam: '#ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_lnkTakim1',
            awayTeam: '#ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_lnkTakim2',
            homeScore: '#ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_lblTakim1Skor',
            awayScore: '#ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_Label12'
        };

        // Extract stadium
        const stadiumEl = doc.querySelector(selectors.stadium);
        if (stadiumEl) {
            match.stadiumName = stadiumEl.textContent.trim();
            const stadHref = stadiumEl.getAttribute('href') || '';
            match.stadiumId = this.extractId(stadHref, 'stadId=');
        }

        // Extract referees
        match.referee = this.extractRefereeName(doc.querySelector(selectors.referee1));
        match.referee2 = this.extractRefereeName(doc.querySelector(selectors.referee2));
        match.referee3 = this.extractRefereeName(doc.querySelector(selectors.referee3));
        match.referee4 = this.extractRefereeName(doc.querySelector(selectors.referee4));
        match.referee5 = this.extractRefereeName(doc.querySelector(selectors.referee5));
        match.referee6 = this.extractRefereeName(doc.querySelector(selectors.referee6));
        match.referee7 = this.extractRefereeName(doc.querySelector(selectors.referee7));

        // Extract date
        const dateEl = doc.querySelector(selectors.date);
        if (dateEl) {
            const dateStr = dateEl.textContent.trim().replace(' - ', ' ');
            match.date = this.parseDate(dateStr);
        }

        // Extract teams
        const homeTeamEl = doc.querySelector(selectors.homeTeam);
        if (homeTeamEl) {
            const href = homeTeamEl.getAttribute('href') || '';
            match.homeId = this.extractId(href, 'kulupId=');
        }

        const awayTeamEl = doc.querySelector(selectors.awayTeam);
        if (awayTeamEl) {
            const href = awayTeamEl.getAttribute('href') || '';
            match.awayId = this.extractId(href, 'kulupId=');
        }

        // Extract scores
        const homeScoreEl = doc.querySelector(selectors.homeScore);
        const awayScoreEl = doc.querySelector(selectors.awayScore);

        if (homeScoreEl) {
            match.homeMS = parseInt(homeScoreEl.textContent.trim()) || 0;
        }
        if (awayScoreEl) {
            match.awayMS = parseInt(awayScoreEl.textContent.trim()) || 0;
        }

        // Check for default win (hükmen)
        if (!match.referee && !match.referee2) {
            if ((match.homeMS === 3 && match.awayMS === 0) || (match.awayMS === 3 && match.homeMS === 0)) {
                match.isDefaultWin = true;
            }
        }

        return match;
    }

    /**
     * Extract referee name and convert to title case
     */
    extractRefereeName(el) {
        if (!el) return '';

        let text = el.textContent.trim();

        // Remove "(İL)" or similar suffixes
        const parenIndex = text.indexOf('(');
        if (parenIndex > 0) {
            text = text.substring(0, parenIndex).trim();
        }

        // Convert to title case (Turkish)
        return this.toTitleCaseTurkish(text);
    }

    /**
     * Turkish title case conversion
     * Properly handles Turkish I/ı and İ/i letter pairs
     */
    toTitleCaseTurkish(str) {
        // First convert to Turkish lowercase
        const lowerStr = this.toLowerCaseTurkish(str);

        // Then capitalize first letter of each word
        return lowerStr.split(' ').map(word => {
            if (!word) return word;
            const firstChar = word.charAt(0);
            const upperChar = this.toUpperCaseTurkishChar(firstChar);
            return upperChar + word.slice(1);
        }).join(' ');
    }

    /**
     * Convert string to Turkish lowercase
     */
    toLowerCaseTurkish(str) {
        let result = '';
        for (const char of str) {
            if (char === 'I') {
                result += 'ı'; // Turkish dotless I becomes dotless ı
            } else if (char === 'İ') {
                result += 'i'; // Turkish dotted İ becomes dotted i
            } else {
                result += char.toLowerCase();
            }
        }
        return result;
    }

    /**
     * Convert single character to Turkish uppercase
     */
    toUpperCaseTurkishChar(char) {
        if (char === 'i') {
            return 'İ'; // Turkish dotted i becomes dotted İ
        } else if (char === 'ı') {
            return 'I'; // Turkish dotless ı becomes dotless I
        } else {
            return char.toUpperCase();
        }
    }

    /**
     * Extract ID from URL parameter
     */
    extractId(href, param) {
        if (!href) return '';
        const decoded = href.replace(/&amp;/g, '&');
        const match = decoded.match(new RegExp(param + '(\\d+)'));
        return match ? match[1] : '';
    }

    /**
     * Parse Turkish date format
     */
    parseDate(dateStr) {
        try {
            // Format: "15.08.2024 20:30" or similar
            const parts = dateStr.split(' ');
            const dateParts = parts[0].split('.');
            const timeParts = parts[1] ? parts[1].split(':') : ['0', '0'];

            return new Date(
                parseInt(dateParts[2]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[0]),
                parseInt(timeParts[0]),
                parseInt(timeParts[1])
            );
        } catch (e) {
            return new Date();
        }
    }

    /**
     * Fetch with timeout
     */
    async fetchWithTimeout(url, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Decode response with proper charset detection
     * TFF uses Windows-1254 or ISO-8859-9 (Turkish encoding)
     */
    decodeResponse(buffer, response) {
        // Force ISO-8859-9 (Turkish) first since TFF uses it
        const encodingsToTry = ['iso-8859-9', 'windows-1254', 'utf-8'];

        for (const encoding of encodingsToTry) {
            try {
                const decoder = new TextDecoder(encoding);
                const text = decoder.decode(buffer);

                // Check if it has Turkish characters (good sign)
                const hasTurkish = /[ıİğĞüÜşŞöÖçÇ]/.test(text);
                const hasReplacementChar = text.includes('');

                if (hasTurkish && !hasReplacementChar) {
                    console.log(`Successfully decoded with ${encoding}`);
                    return text;
                }
            } catch (e) {
                console.warn(`Decoding with ${encoding} failed:`, e.message);
            }
        }

        // Last resort: decode as ISO-8859-9 anyway
        try {
            return new TextDecoder('iso-8859-9').decode(buffer);
        } catch (e) {
            return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
        }
    }

    /**
     * Fix common Turkish character encoding issues (mojibake)
     */
    fixTurkishChars(text) {
        // If we see replacement characters, the encoding is broken at proxy level
        // Nothing we can do except log it
        if (text.includes('')) {
            console.warn('Encoding issue: replacement characters detected');
        }

        // Common mojibake fixes for Turkish characters
        // When UTF-8 is misinterpreted as ISO-8859-1
        const replacements = {
            'Ä±': 'ı', 'Ä°': 'İ',
            'Ã¶': 'ö', 'Ã–': 'Ö',
            'Ã¼': 'ü', 'Ãœ': 'Ü',
            'ÅŸ': 'ş', 'Åž': 'Ş',
            'ÄŸ': 'ğ', 'Äž': 'Ğ',
            'Ã§': 'ç', 'Ã‡': 'Ç',
            // ISO-8859-1 byte sequences
            'Ã½': 'ı', 'Ãº': 'ü',
            'Ã¾': 'ş', 'Ã°': 'ğ',
            // Double encoding
            'Ã„Â±': 'ı', 'Ã„Â°': 'İ',
        };

        let result = text;
        for (const [bad, good] of Object.entries(replacements)) {
            result = result.split(bad).join(good);
        }

        return result;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TFFScraper = TFFScraper;
}
