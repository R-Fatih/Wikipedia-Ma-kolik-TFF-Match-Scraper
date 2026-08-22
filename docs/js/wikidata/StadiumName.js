/**
 * StadiumName - Resolves stadium names from Wikidata using TFF stadium ID (P7402)
 */
class StadiumName {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Get stadium name from Wikidata by TFF stadium ID
     * @param {number} id - TFF stadium ID
     * @returns {Promise<string>} - Stadium name for Wikipedia
     */
    async getStadiumName(id) {
        // Check cache first
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }

        try {
            // Use api.php search instead of SPARQL for better performance and rate limit handling
            const searchUrl = `https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=haswbstatement:P7402=${id}&format=json&origin=*`;

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

            // Try to get Turkish Wikipedia article title first, then English, then label
            let name = null;

            if (entity.sitelinks?.trwiki?.title) {
                name = entity.sitelinks.trwiki.title;
            } else if (entity.sitelinks?.enwiki?.title) {
                name = entity.sitelinks.enwiki.title;
            } else if (entity.labels?.tr?.value) {
                name = entity.labels.tr.value;
            } else {
                name = id.toString();
            }

            // Format name with disambiguation if needed
            const formattedName = this.formatName(name);
            this.cache.set(id, formattedName);
            return formattedName;

        } catch (error) {
            console.error(`Error fetching stadium name for ID ${id}:`, error);
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
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.StadiumName = StadiumName;
}
