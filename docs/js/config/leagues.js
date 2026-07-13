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
     },
     tff2lig2526beyaz: {
         id: 'tff2lig2526beyaz',
         name: 'TFF 2. Lig 2025-26 (Beyaz)',
         shortName: '2. Lig (Beyaz)',
         dataFile: 'data/2l2526beyaz.txt',
         matchesPerWeek: 9,
         totalWeeks: 38,
         season: '2025-26'
     },
     tff2lig2526kırmızı: {
         id: 'tff2lig2526kırmızı',
         name: 'TFF 2. Lig 2025-26 (Kırmızı)',
         shortName: '2. Lig (Kırmızı)',
         dataFile: 'data/2l2526kırmızı.txt',
         matchesPerWeek: 9,
         totalWeeks: 34,
         season: '2025-26'
     },
      tff1lig2526pof: {
         id: 'tff1lig2526',
         name: 'TFF 1. Lig 2025-26 Play-Off',
         shortName: '1. Lig POF',
         dataFile: 'data/1l2526_pof.txt',
         matchesPerWeek: 5,
         totalWeeks: 1,
         season: '2025-26'
     },
    stsl2627: {
        id: 'stsl2627',
        name: 'Süper Lig 2026-27',
        shortName: 'Süper Lig',
        dataFile: 'data/stsl2627.txt',
        matchesPerWeek: 9,
        totalWeeks: 34,
        season: '2026-27'
    },
    tff12627: {
        id: 'tff12627',
        name: '1. Lig 2026-27',
        shortName: '1. Lig',
        dataFile: 'data/1l2627.txt',
        matchesPerWeek: 10,
        totalWeeks: 38,
        season: '2026-27'
    },
    tff22627kırmızı: {
        id: 'tff22627kırmızı',
        name: '2. Lig 2026-27  (Kırmızı)',
        shortName: '2. Lig  (Kırmızı)',
        dataFile: 'data/2l2627kırmızı.txt',
        matchesPerWeek: 8,
        totalWeeks: 34,
        season: '2026-27'
    },
    tff22627beyaz: {
        id: 'tff22627beyaz',
        name: '2. Lig 2026-27  (Beyaz)',
        shortName: '2. Lig  (Beyaz)',
        dataFile: 'data/2l2627beyaz.txt',
        matchesPerWeek: 9,
        totalWeeks: 34,
        season: '2026-27'
    },
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.LEAGUES = LEAGUES;
}
