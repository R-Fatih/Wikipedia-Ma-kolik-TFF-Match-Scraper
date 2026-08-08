/**
 * Match Model - Represents match data from TFF
 */
class Match {
    constructor() {
        this.tffId = 0;
        this.homeId = '';
        this.awayId = '';
        this.homeName = '';
        this.awayName = '';
        this.stadiumId = '';
        this.stadiumName = '';
        this.referee = '';
        this.referee2 = '';
        this.referee3 = '';
        this.referee4 = '';
        this.referee5 = '';
        this.referee6 = '';
        this.referee7 = '';
        this.homeMS = 0;
        this.awayMS = 0;
        this.isScoreSet = false;
        this.date = new Date();
        this.hasKnownTime = false;
        this.isDefaultWin = false;
    }

    /**
     * Create Match from TFF data
     */
    static fromTFFData(data) {
        const match = new Match();
        Object.assign(match, data);
        return match;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.Match = Match;
}
