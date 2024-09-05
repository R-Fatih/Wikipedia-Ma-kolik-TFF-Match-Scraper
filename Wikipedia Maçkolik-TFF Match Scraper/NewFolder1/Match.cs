using System;

namespace TFFScraper
{
    public class Match
    {
        public int TFFId { get; set; }
        public string HomeId { get; set; }

        public string AwayId { get; set; }
        public string StadiumId { get; set; }
        public string StadiumName { get; set; }
        public string Referee { get; set; }
        public string Referee2 { get; set; }
        public string Referee3 { get; set; }
        public string Referee4 { get; set; }
        public string Referee5 { get; set; }
        public string Referee6 { get; set; }
        public string Referee7 { get; set; }
        public int HomeMS { get; set; }
        public int AwayMS { get; set; }
        public DateTime Date { get; set; }


    }
}