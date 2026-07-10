/**
 * WikiFormatter - Creates Wikipedia formatted match output
 */
class WikiFormatter {
    constructor() {
        this.stadiumName = new StadiumName();
        this.stadiumPlace = new StadiumPlace();
    }

    /**
     * Format match data into Wikipedia template
     * @param {Match} match - Match data
     * @param {Team[]} teams - Teams array
     * @param {Object} events - Match events {homeGoals, awayGoals}
     * @param {number} weekNumber - Week number for the match
     * @param {boolean} includeVAR - Include VAR referees
     * @returns {Promise<MatchDetails>}
     */
    async formatMatch(match, teams, events, weekNumber, includeVAR = true) {
        const details = new MatchDetails();

        // Find teams
        const homeTeam = teams.find(t => t.tffId === match.homeId || t.TFFId === match.homeId);
        const awayTeam = teams.find(t => t.tffId === match.awayId || t.TFFId === match.awayId);

        if (!homeTeam || !awayTeam) {
            console.warn('Takım bulunamadı:', match.homeId, match.awayId);
        }

        // MDetail (match identifier)
        const homeCode = homeTeam?.kısaKodu || homeTeam?.KısaKodu || '???';
        const awayCode = awayTeam?.kısaKodu || awayTeam?.KısaKodu || '???';
        details.mDetail = `|${homeCode}-${awayCode}`;

        // Tour (week number)
        details.tur = weekNumber.toString();

        // Date formatting
        const date = match.date instanceof Date ? match.date : new Date(match.date);
        details.tarih = `{{Başlangıç tarihi|${date.getFullYear()}|${date.getMonth() + 1}|${date.getDate()}}}`;

        // Time formatting (HH.MM format)
        if (date.getHours() !== 0) {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            details.zaman = `${hours}.${minutes}`;
        } else {
            details.zaman = '';
        }

        // Teams
        const homeTeamName = homeTeam?.takımAdı || homeTeam?.TakımAdı || match.homeId;
        const awayTeamName = awayTeam?.takımAdı || awayTeam?.TakımAdı || match.awayId;
        details.takim1 = `[[${homeTeamName}]]`;
        details.takim2 = `[[${awayTeamName}]]`;

        // Score
        if (match.isScoreSet) {
            details.sonuc = `${match.homeMS} - ${match.awayMS}`;
            if (match.isDefaultWin) {
                details.sonuc += '<br> (hükmen)';
            }
        } else {
            details.sonuc = '';
        }

        // Report link
        details.rapor = `[https://tff.org/Default.aspx?pageID=29&macID=${match.tffId} Rapor]`;

        // Stadium and location
        if (match.stadiumId) {
            try {
                const stadName = await this.stadiumName.getStadiumName(parseInt(match.stadiumId));
                details.stadyum = `[[${stadName}]]`;
            } catch (e) {
                details.stadyum = match.stadiumName || '';
            }

            try {
                const placeName = await this.stadiumPlace.getStadiumPlace(parseInt(match.stadiumId));
                details.yer = placeName;
            } catch (e) {
                details.yer = '';
            }
        } else {
            details.stadyum = '';
            details.yer = '';
        }

        // Referees
        details.hakem = match.referee || '';
        details.yardimciHakemler = [match.referee2, match.referee3]
            .filter(r => r)
            .join(', ');
        details.dorduncuHakem = match.referee4 || '';

        // VAR referees (5th, 6th, 7th)
        const varReferees = [match.referee5, match.referee6, match.referee7]
            .filter(r => r);
        details.besinciHakem = varReferees.join(', ');

        // Goals
        details.goller1 = events.homeGoals || '';
        details.goller2 = events.awayGoals || '';

        return details;
    }

    /**
     * Generate week header comment
     */
    getWeekHeader(weekNumber) {
        return `<!-- ${weekNumber}. Hafta -->`;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.WikiFormatter = WikiFormatter;
}
