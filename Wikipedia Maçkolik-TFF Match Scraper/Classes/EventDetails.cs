using Newtonsoft.Json.Linq;
using Wikipedi_Maçkolik_Match_Data;
using System.Windows.Forms;
using System.Collections.Generic;
using System;
using System.Net.Http;
using System.Linq;
using System.Threading.Tasks;
using System.Numerics;
using Wikipedia_Maçkolik_TFF_Match_Scraper;
namespace TFFScraper
{
    public class EventDetails
    {
        public class D
        {
            public string s { get; set; }
            public int p { get; set; }
            public string st { get; set; }
            public string ht { get; set; }
            public string ft { get; set; }
            public string et { get; set; }
            public string pt { get; set; }
            public int time { get; set; }
        }

        public class Match
        {
            public int seq { get; set; }
            public string home { get; set; }
            public string away { get; set; }
            public D d { get; set; }
            public List<List<object>> h { get; set; }
            public List<List<object>> a { get; set; }
            public List<List<object>> e { get; set; }
            public List<string> sv { get; set; }
        }

        // Root myDeserializedClass = JsonConvert.DeserializeObject<Root>(myJsonResponse);
        public class MatchDetail
        {
            public int player_id { get; set; }
            public string player_name { get; set; }
            public int event_id { get; set; }
            public int event_minute { get; set; }
            public int side { get; set; }
            public string event_name { get; set; }
        }
        RichTextBox richTextBox1 = new RichTextBox();
        RichTextBox richTextBox2 = new RichTextBox();
        ListBox listBox1 = new ListBox();
        ListBox listBox2 = new ListBox();
        HttpClient _client = new();

        public async Task<List<RichTextBox>> Events(string adres, RichTextBox richTextBox)
        {
            Console.WriteLine("adressss" + adres);
            _client.Timeout = TimeSpan.FromSeconds(120);
            string myJsonResponse = null;
        trymatchesfrommackolik:
            try
            {

         

             myJsonResponse = await _client.GetStringAsync("https://arsiv.mackolik.com/Match/MatchData.aspx?t=dtl&id=" + adres + "&s=0");

            }
            catch (Exception)
            {
                goto trymatchesfrommackolik;

            }
            Console.WriteLine("okey");

            PlayerName playerName = new PlayerName(richTextBox);

            JObject jObject = JObject.Parse(myJsonResponse);
            GetBySide(jObject, richTextBox1, "1");
            GetBySide(jObject, richTextBox2, "2");

            var list1 = matchDetails.Where(a => a.side == 1).ToList();
            var list2 = matchDetails.Where(a => a.side == 2).ToList();

            // Populate listboxes
            for (int i = 0; i < list1.Count; i++)
            {
                listBox1.Items.Add(list1[i].player_id + "," + list1[i].event_id + "," + list1[i].event_minute);
            }
            for (int i = 0; i < list2.Count; i++)
            {
                listBox2.Items.Add(list2[i].player_id + "," + list2[i].event_id + "," + list2[i].event_minute);
            }

            // Önce her oyuncu için gerçek adları asenkron olarak alalım
            Dictionary<int, string> playerNames1 = new Dictionary<int, string>();
            Dictionary<int, string> playerNames2 = new Dictionary<int, string>();

            // İlk takım için oyuncu adlarını toplama
            foreach (var playerId in list1.Select(p => p.player_id).Distinct())
            {
                string name = await playerName.QID(playerId);
                playerNames1[playerId] = name;
            }

            // İkinci takım için oyuncu adlarını toplama
            foreach (var playerId in list2.Select(p => p.player_id).Distinct())
            {
                string name = await playerName.QID(playerId);
                playerNames2[playerId] = name;
            }

            // Şimdi gruplama işlemini gerçekleştirelim
            await ProcessHomeEvents(list1, playerNames1);
            await ProcessAwayEvents(list2, playerNames2);

            List<RichTextBox> richTextBoxes = new List<RichTextBox>
    {
        richTextBox1,
        richTextBox2
    };

            return richTextBoxes;
        }

        private async Task ProcessHomeEvents(List<MatchDetail> list, Dictionary<int, string> playerNames)
        {
            // Oyuncu ID'sine göre gruplama
            var groupedDetails = list.GroupBy(detail => detail.player_id);
            int count = 0;

            foreach (var group in groupedDetails)
            {
                int playerId = group.Key;
                string playerName = playerNames[playerId];

                var eventText = "* [[" + playerName + "]] ";
                var eventsByEventID = group.GroupBy(detail => detail.event_id);

                foreach (var eventGroup in eventsByEventID)
                {
                    var events = eventGroup.Select(detail => $"{{{detail.event_name}|" +
                        (detail.event_id == 4 ? "1|" : detail.event_id == 5 ? "0|" : "") +
                        $"{detail.event_minute}" + (detail.event_id == 2 ? "|kk" : "") + "}");
                    eventText += string.Join("||", events) + " ";
                }

                // Remove the trailing spaces
                eventText = eventText.TrimEnd();
                count++;
                richTextBox1.AppendText(eventText + (count != groupedDetails.Count() ? "\n" : ""));
            }

            richTextBox1.Text = richTextBox1.Text.Replace("}||{gol", "|").Replace("}||{baspenaltı", "|").Replace("}||{kaçpenaltı", "|");
            richTextBox1.Text = richTextBox1.Text.Replace("{", "{{").Replace("}", "}}");
        }

        private async Task ProcessAwayEvents(List<MatchDetail> list, Dictionary<int, string> playerNames)
        {
            // Oyuncu ID'sine göre gruplama
            var groupedDetails = list.GroupBy(detail => detail.player_id);
            int count = 0;

            foreach (var group in groupedDetails)
            {
                int playerId = group.Key;
                string playerName = playerNames[playerId];

                var eventText = "* ";
                var eventsByEventID = group.GroupBy(detail => detail.event_id);

                foreach (var eventGroup in eventsByEventID)
                {
                    var events = eventGroup.Select(detail => $"{{{detail.event_name}|" +
                        (detail.event_id == 4 ? "1|" : detail.event_id == 5 ? "0|" : "") +
                        $"{detail.event_minute}" + (detail.event_id == 2 ? "|kk" : "") + "}");
                    eventText += string.Join("||", events) + " ";
                }

                // Remove the trailing spaces
                eventText = eventText.TrimEnd();
                count++;
                richTextBox2.AppendText(eventText + " [[" + playerName + "]] " + (count != groupedDetails.Count() ? "\n" : ""));
            }

            richTextBox2.Text = richTextBox2.Text.Replace("}||{gol", "|").Replace("}||{baspenaltı", "|").Replace("}||{kaçpenaltı", "|");
            richTextBox2.Text = richTextBox2.Text.Replace("{", "{{").Replace("}", "}}");
        }

        List<MatchDetail> matchDetails = new List<MatchDetail>();
        private void GetBySide(JObject jObject, RichTextBox richTextBox, string side)
        {
            for (int i = 0; i < jObject["e"].Where(a => a[0].ToString() == side).ToList().Count(); i++)
            {
                if ((jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][4].ToString() != "4"))
                {
                    var even = "";
                    int event_id = 0;
                    if (jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][4].ToString() == "1")
                    {
                        even = "gol";
                        event_id = 0;
                    }
                    if (jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][4].ToString() == "1" &&
                        jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][5]["d"].ToString() == "2")
                    {
                        even = "baspenaltı";
                        event_id = 1;
                    }
                    if (jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][4].ToString() == "1" &&
                        jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][5]["d"].ToString() == "3")
                    {
                        even = "gol"; //kk
                        event_id = 2;
                    }
                    if (jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][4].ToString() == "2")
                    {
                        even = "sarı kart";
                        event_id = 3;
                    }
                    if (jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][4].ToString() == "3" &&
                        jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][5]["d"].ToString() == "1")
                    {
                        even = "kırmızı kart"; //çift sarıdan krımızı
                        event_id = 4;
                    }
                    if (jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][4].ToString() == "3" &&
                        jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][5]["d"].ToString() == "2")
                    {
                        even = "kırmızı kart"; //direk kırmızı
                        event_id = 5;
                    }
                    if (jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][4].ToString() == "7")
                    {
                        even = "kaçpenaltı";
                        event_id = 6;
                    }

                    MatchDetail matchDetail = new MatchDetail
                    {
                        player_id = Convert.ToInt32(jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][2].ToString()),
                        player_name = jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][3].ToString(),
                        event_id = event_id,
                        event_minute = Convert.ToInt32(jObject["e"].Where(a => a[0].ToString() == side).ToList()[i][1]),
                        side = Convert.ToInt32(side),
                        event_name = even
                    };

                    matchDetails.Add(matchDetail);
                }
            }
        }

        // Modeli daha net olması için ekliyorum, dosyanızda eksik olabilir
       
        int playernumb = 0;

    }
}
