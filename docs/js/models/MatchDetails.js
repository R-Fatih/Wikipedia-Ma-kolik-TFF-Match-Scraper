/**
 * MatchDetails Model - Holds formatted match information for Wikipedia output
 */
class MatchDetails {
    constructor() {
        this.mDetail = '';
        this.tur = '';
        this.tarih = '';
        this.zaman = '';
        this.takim1 = '';
        this.sonuc = '';
        this.takim2 = '';
        this.stadyum = '';
        this.yer = '';
        this.seyirci = '';
        this.hakem = '';
        this.yardimciHakemler = '';
        this.dorduncuHakem = '';
        this.besinciHakem = '';
        this.rapor = '';
        this.goller1 = '';
        this.goller2 = '';
        this.bg = '';
    }

    /**
     * Generate Wikipedia format output (with VAR referees)
     */
    toString() {
        return `${this.mDetail} = 
{{Kapanabilir futbol maçı kutusu
|tarih             = ${this.tarih}
|zaman             = ${this.zaman}
|tur               = ${this.tur}
|takım1            = ${this.takim1}
|sonuç             = ${this.sonuc}
|rapor             = ${this.rapor}
|takım2            = ${this.takim2}
|goller1           = 
${this.goller1}
|goller2           = 
${this.goller2}
|stadyum           = ${this.stadyum}
|yer               = ${this.yer}
|seyirci           = ${this.seyirci}
|hakem             = ${this.hakem}
|yardımcıhakemler  = ${this.yardimciHakemler}
|dördüncühakem     = ${this.dorduncuHakem}
|beşincihakem      = ${this.besinciHakem}
|bg                = {{{2|B}}}
}}`;
    }

    /**
     * Generate Wikipedia format output (without VAR referees)
     */
    toString2() {
        return `${this.mDetail} = 
{{Kapanabilir futbol maçı kutusu
|tarih             = ${this.tarih}
|zaman             = ${this.zaman}
|tur               = ${this.tur}
|takım1            = ${this.takim1}
|sonuç             = ${this.sonuc}
|rapor             = ${this.rapor}
|takım2            = ${this.takim2}
|goller1           = 
${this.goller1}
|goller2           = 
${this.goller2}
|stadyum           = ${this.stadyum}
|yer               = ${this.yer}
|seyirci           = ${this.seyirci}
|hakem             = ${this.hakem}
|yardımcıhakemler  = ${this.yardimciHakemler}
|dördüncühakem     = ${this.dorduncuHakem}
|bg                = {{{2|B}}}
}}`;
    }

    /**
     * Get output based on VAR setting
     */
    getOutput(includeVAR = true) {
        return includeVAR ? this.toString() : this.toString2();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MatchDetails = MatchDetails;
}
