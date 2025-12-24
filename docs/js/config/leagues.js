/**
 * Leagues Configuration
 * Add new leagues here as they become available
 */
const LEAGUES = {
    stsl2526: {
        id: 'stsl2526',
        name: 'Süper Lig 2025-26',
        shortName: 'Süper Lig',
        dataFile: 'data/stsl2526.txt',
        matchesPerWeek: 9,
        totalWeeks: 34,
        season: '2025-26'
    },
     tff1lig2526: {
         id: 'tff1lig2526',
         name: 'TFF 1. Lig 2025-26',
         shortName: '1. Lig',
         dataFile: 'data/1l2526.txt',
         matchesPerWeek: 10,
         totalWeeks: 38,
         season: '2025-26'
     }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.LEAGUES = LEAGUES;
}
