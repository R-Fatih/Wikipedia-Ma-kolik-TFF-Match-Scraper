/**
 * Team Model - Represents team data
 */
class Team {
    constructor(data = {}) {
        this.takımAdı = data.TakımAdı || data.takımAdı || '';
        this.kısaKodu = data.KısaKodu || data.kısaKodu || '';
        this.maçkolikId = data.MaçkolikId || data.maçkolikId || '';
        this.tffId = data.TFFId || data.tffId || '';
    }

    /**
     * Find team by TFF ID
     */
    static findByTFFId(teams, tffId) {
        return teams.find(t => t.tffId === tffId || t.TFFId === tffId);
    }

    /**
     * Load teams from JSON URL
     */
    static async loadTeams(url = 'https://raw.githubusercontent.com/R-Fatih/Wikipedia-Football/main/teams.json') {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load teams');
            const data = await response.json();
            return data.map(t => new Team(t));
        } catch (error) {
            console.error('Error loading teams:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.Team = Team;
}
