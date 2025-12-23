/**
 * PlayerName - Resolves player names from Wikidata using Maçkolik ID (P2458)
 */
class PlayerName {
    constructor() {
        this.cache = new Map();
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
            // Query Wikidata for entity with Maçkolik ID (P2458)
            const sparqlQuery = `SELECT ?item WHERE { ?item wdt:P2458 "${id}" . }`;
            const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;

            const response = await fetch(sparqlUrl, {
                headers: {
                    'User-Agent': 'WikipediaMatchScraper/1.0'
                }
            });

            if (!response.ok) throw new Error('SPARQL query failed');

            const data = await response.json();

            if (!data.results.bindings.length) {
                this.cache.set(id, id.toString());
                return id.toString();
            }

            const entityUrl = data.results.bindings[0].item.value;
            const qid = entityUrl.replace('http://www.wikidata.org/entity/', '');

            // Get entity details
            const entityResponse = await fetch(
                `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&format=json&origin=*`
            );

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
                name = id.toString();
            }

            // Format name with disambiguation if needed
            const formattedName = this.formatName(name);
            this.cache.set(id, formattedName);
            return formattedName;

        } catch (error) {
            console.error(`Error fetching player name for ID ${id}:`, error);
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
    window.PlayerName = PlayerName;
}
