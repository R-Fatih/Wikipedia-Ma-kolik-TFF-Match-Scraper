/**
 * StadiumPlace - Resolves stadium location (ilçe, il) from Wikidata using TFF stadium ID
 * 
 * SPARQL yaklaşımı: P131 zincirini tek sorguda takip ederek ilçe ve il bilgisini çeker.
 * Türkçe Vikipedi makale adını (sitelink) öncelikli olarak alır, böylece "Muğla (il)" gibi
 * başlıklar [[Muğla (il)|Muğla]] veya "Bodrum, Muğla" gibi başlıklar [[Bodrum, Muğla|Bodrum]]
 * şeklinde doğru formatlanır.
 * 
 * Büyükşehir illerde:          [[İlçe]], [[İl]]
 * Büyükşehir olmayan illerde:  [[İl]]
 */
class StadiumPlace {
    constructor() {
        this.cache = new Map();
    }

    /**
     * 30 Büyükşehir İl isimleri
     */
    static BUYUKSEHIR_ILLER = new Set([
        'Adana', 'Ankara', 'Antalya', 'Aydın', 'Balıkesir',
        'Bursa', 'Denizli', 'Diyarbakır', 'Erzurum', 'Eskişehir',
        'Gaziantep', 'Hatay', 'İstanbul', 'İzmir', 'Kahramanmaraş',
        'Kayseri', 'Kocaeli', 'Konya', 'Malatya', 'Manisa',
        'Mardin', 'Mersin', 'Muğla', 'Ordu', 'Sakarya',
        'Samsun', 'Şanlıurfa', 'Tekirdağ', 'Trabzon', 'Van'
    ]);

    /**
     * İsimden parantez içi veya virgülden sonraki eki temizler (örn: "Antalya (il)" → "Antalya", "Bodrum, Muğla" → "Bodrum")
     */
    static cleanName(name) {
        if (!name) return '';
        name = name.trim();
        if (name.includes(',')) {
            name = name.substring(0, name.indexOf(',')).trim();
        }
        if (name.includes('(')) {
            name = name.substring(0, name.indexOf('(')).trim();
        }
        return name;
    }

    /**
     * Bir ismi Wikipedia wikilink formatına çevirir.
     * Parantez veya virgül varsa pipe ile kısaltılmış halini ekler.
     * Örn: "Ümraniye" → "[[Ümraniye]]"
     * Örn: "Muğla (il)" → "[[Muğla (il)|Muğla]]"
     * Örn: "Bodrum, Muğla" → "[[Bodrum, Muğla|Bodrum]]"
     */
    static formatWikiLink(name) {
        if (!name) return '';
        name = name.trim();
        const baseName = StadiumPlace.cleanName(name);
        if (baseName !== name && baseName.length > 0) {
            return `[[${name}|${baseName}]]`;
        }
        return `[[${name}]]`;
    }

    /**
     * Büyükşehir kontrolü (case-insensitive, parantezli ve virgüllü isimleri temizleyerek kontrol eder)
     */
    static isBuyuksehir(ilName) {
        if (!ilName) return false;
        const cleanName = StadiumPlace.cleanName(ilName);
        for (const il of StadiumPlace.BUYUKSEHIR_ILLER) {
            if (il.localeCompare(cleanName, 'tr', { sensitivity: 'base' }) === 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get stadium location (ilçe, il) from Wikidata by TFF stadium ID
     * Tek SPARQL sorgusunda P131 zincirini takip ederek ilçe ve il'i bulur.
     * 
     * @param {number} id - TFF stadium ID
     * @returns {Promise<string>} - Formatted location for Wikipedia (wikilink dahil)
     */
    async getStadiumPlace(id) {
        // Check cache first
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }

        try {
            // SPARQL sorgusu:
            // 1. P7402 ile stadyumu bul
            // 2. P131 zincirindeki il (Q48336) varlığını bul
            // 3. Stadyumun P131 zincirinde ilçe (Q1147395 veya Q149621) seviyesinde olan yeri bul (mahalleleri eler)
            const sparqlQuery = `SELECT ?ilceName ?ilName WHERE {
  ?stadium wdt:P7402 "${id}" .
  ?stadium wdt:P131+ ?il .
  ?il wdt:P31 wd:Q48336 .
  OPTIONAL {
    ?ilWP schema:about ?il ;
          schema:isPartOf <https://tr.wikipedia.org/> ;
          schema:name ?ilArticle .
  }
  OPTIONAL { ?il rdfs:label ?ilLabelTr . FILTER(LANG(?ilLabelTr) = "tr") }
  OPTIONAL {
    ?stadium wdt:P131+ ?ilce .
    ?ilce wdt:P31 ?ilceType .
    FILTER(?ilceType IN (wd:Q1147395, wd:Q149621, wd:Q3957, wd:Q515, wd:Q48336))
    FILTER(?ilce != ?il)
    OPTIONAL {
      ?ilceWP schema:about ?ilce ;
              schema:isPartOf <https://tr.wikipedia.org/> ;
              schema:name ?ilceArticle .
    }
    OPTIONAL { ?ilce rdfs:label ?ilceLabelTr . FILTER(LANG(?ilceLabelTr) = "tr") }
  }
  BIND(COALESCE(?ilArticle, ?ilLabelTr) AS ?ilName)
  BIND(COALESCE(?ilceArticle, ?ilceLabelTr) AS ?ilceName)
} LIMIT 1`;

            const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;

            let response;
            let retries = 3;
            let delay = 1000;

            while (retries > 0) {
                response = await fetch(sparqlUrl, {
                    headers: {
                        'User-Agent': 'WikipediaMatchScraper/1.0',
                        'Accept': 'application/sparql-results+json'
                    }
                });

                if (response.ok) break;

                retries--;
                if (retries === 0) throw new Error(`SPARQL query failed with status ${response.status}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }

            const data = await response.json();
            const bindings = data?.results?.bindings;

            if (!bindings || bindings.length === 0) {
                console.warn(`SPARQL: Stadın yeri bulunamadı -- ${id}`);
                this.cache.set(id, id.toString());
                return id.toString();
            }

            const binding = bindings[0];
            const ilName = binding.ilName?.value;
            const ilceName = binding.ilceName?.value;

            if (!ilName) {
                console.warn(`SPARQL: İl bilgisi bulunamadı -- ${id}`);
                this.cache.set(id, id.toString());
                return id.toString();
            }

            let result;
            const cleanIlce = StadiumPlace.cleanName(ilceName);
            const cleanIl = StadiumPlace.cleanName(ilName);

            // Büyükşehir illerde ilçe + il formatı (ancak ilçe adı il adı ile aynı değilse), diğerlerinde sadece il
            if (ilceName && cleanIlce !== cleanIl && StadiumPlace.isBuyuksehir(ilName)) {
                result = `${StadiumPlace.formatWikiLink(ilceName)}, ${StadiumPlace.formatWikiLink(ilName)}`;
            } else {
                result = StadiumPlace.formatWikiLink(ilName);
            }

            this.cache.set(id, result);
            return result;

        } catch (error) {
            console.error(`SPARQL: Stadın yeri çekilirken hata -- ${id}:`, error);
            this.cache.set(id, id.toString());
            return id.toString();
        }
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
    window.StadiumPlace = StadiumPlace;
}
