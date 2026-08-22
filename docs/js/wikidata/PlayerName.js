/**
 * PlayerName - Resolves player names from Wikidata using Maçkolik ID (P2458)
 * Tracks IDs that couldn't be found in Wikidata
 */
class PlayerName {
    constructor() {
        this.cache = new Map();
        this.missingIds = new Set(); // Track IDs not found in Wikidata
    }

    /**
     * Get player name from Wikidata by Maçkolik player ID
     * @param {number} id - Maçkolik player ID
     * @returns {Promise<string>} - Player name for Wikipedia
     */
    async getPlayerName(id) {
        // Check cache first
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }

        try {
            // Use api.php search instead of SPARQL for better performance and rate limit handling
            const searchUrl = `https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=haswbstatement:P2458=${id}&format=json&origin=*`;

            let response;
            let retries = 3;
            let delay = 1000;

            while (retries > 0) {
                response = await fetch(searchUrl, {
                    headers: { 'User-Agent': 'WikipediaMatchScraper/1.0' }
                });

                if (response.ok) break;

                retries--;
                if (retries === 0) throw new Error(`API query failed with status ${response.status}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }

            const data = await response.json();

            if (!data.query || !data.query.search || data.query.search.length === 0) {
                // ID not found in Wikidata - add to missing list
                this.missingIds.add(id);
                this.cache.set(id, id.toString());
                return id.toString();
            }

            const qid = data.query.search[0].title;

            // Get entity details with retry
            let entityResponse;
            retries = 3;
            delay = 1000;

            while (retries > 0) {
                entityResponse = await fetch(
                    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&format=json&origin=*`,
                    { headers: { 'User-Agent': 'WikipediaMatchScraper/1.0' } }
                );

                if (entityResponse.ok) break;

                retries--;
                if (retries === 0) throw new Error(`Entity fetch failed with status ${entityResponse.status}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }

            if (!entityResponse.ok) throw new Error('Entity fetch failed');

            const entityData = await entityResponse.json();
            const entity = entityData.entities[qid];

            // Try to get Turkish Wikipedia article title first
            let name = null;

            if (entity.sitelinks?.trwiki?.title) {
                name = entity.sitelinks.trwiki.title;
            } else if (entity.labels?.tr?.value) {
                name = entity.labels.tr.value;
            } else if (entity.labels?.en?.value) {
                name = entity.labels.en.value;
            } else {
                // Has Wikidata entry but no usable name
                this.missingIds.add(id);
                name = id.toString();
            }

            // Format name with disambiguation if needed
            const formattedName = this.formatName(name);
            this.cache.set(id, formattedName);
            return formattedName;

        } catch (error) {
            console.error(`Error fetching player name for ID ${id}:`, error);
            this.missingIds.add(id);
            this.cache.set(id, id.toString());
            return id.toString();
        }
    }

    /**
     * Format name with disambiguation pipe if contains parentheses
     */
    formatName(name) {
        if (name.includes('(')) {
            const baseName = name.substring(0, name.indexOf('(') - 1);
            return `${name}|${baseName}`;
        }
        return name;
    }

    /**
     * Get list of missing IDs (not found in Wikidata)
     */
    getMissingIds() {
        return Array.from(this.missingIds);
    }

    /**
     * Clear cache and missing IDs
     */
    clearCache() {
        this.cache.clear();
        this.missingIds.clear();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PlayerName = PlayerName;
}
