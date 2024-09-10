using IniParser.Model;
using IniParser;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using TFFScraper;
using Wikipedi_Maçkolik_Match_Data;
using Wikipedia_Maçkolik_TFF_Match_Scraper.NewFolder1;
using Wikipedia_Standings;

namespace Wikipedia_Maçkolik_TFF_Match_Scraper
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
        }
        class MatchDetails
        {
            public string MDetail { get; set; }
            public string Tur { get; set; }
            public string Tarih { get; set; }
            public string Zaman { get; set; }
            public string Takim1 { get; set; }
            public string Sonuc { get; set; }
            public string Takim2 { get; set; }
            public string Stadyum { get; set; }
            public string Yer { get; set; }
            public string Seyirci { get; set; }
            public string Hakem { get; set; }
            public string YardimciHakemler { get; set; }
            public string DorduncuHakem { get; set; }
            public string BesinciHakem { get; set; }
            public string Rapor { get; set; }
            public string Goller1 { get; set; }
            public string Goller2 { get; set; }
            public string BG { get; set; }
            public override string ToString()
            {
                return $"{MDetail} = \r\n{{{{Kapanabilir futbol maçı kutusu\r\n|tarih             = {Tarih}\r|zaman             = {Zaman}\r|tur               = {Tur}\r\n|takım1            = {Takim1}\r|sonuç             = {Sonuc}\r|rapor             = {Rapor}\r|takım2            = {Takim2}\r|goller1           = \n{Goller1}\r|goller2           = \n{Goller2}\r|stadyum           = {Stadyum}\r|yer               = {Yer}\r|seyirci           = {Seyirci}\r|hakem             = {Hakem}\r|yardımcıhakemler  = {YardimciHakemler}\r|dördüncühakem     = {DorduncuHakem}\r|beşincihakem      = {BesinciHakem}\r|bg                = {{{{{{2|B}}}}}}\r\n}}}}";
            }
            public string ToString2()
            {
                return $"{MDetail} = \r\n{{{{Kapanabilir futbol maçı kutusu\r\n|tarih             = {Tarih}\r|zaman             = {Zaman}\r|tur               = {Tur}\r\n|takım1            = {Takim1}\r|sonuç             = {Sonuc}\r|rapor             = {Rapor}\r|takım2            = {Takim2}\r|goller1           = \n{Goller1}\r|goller2           = \n{Goller2}\r|stadyum           = {Stadyum}\r|yer               = {Yer}\r|seyirci           = {Seyirci}\r|hakem             = {Hakem}\r|yardımcıhakemler  = {YardimciHakemler}\r|dördüncühakem     = {DorduncuHakem}\r|bg                = {{{{{{2|B}}}}}}\r\n}}}}";
            }
        }
        public async Task<Match> Scrape(string adres)
        {
            List<string> list = new List<string>
            {
                "//*[@id=\"ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_lnkStad\"]",
                    "//*[@id=\"ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl00_lnkHakem\"]",
                    "//*[@id=\"ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl01_lnkHakem\"]",
                    "//*[@id=\"ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl02_lnkHakem\"]",
                     "//*[@id=\"ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl03_lnkHakem\"]",
                    "//*[@id=\"ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl04_lnkHakem\"]",
                    "//*[@id=\"ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl05_lnkHakem\"]",
                     "//*[@id=\"ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_rpt_ctl06_lnkHakem\"]",
                     "//*[@id=\"ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_lblTarih\"]",
                     "//*[@id=\"ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_lnkTakim1\"]",
                     "//*[@id=\"ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_lnkTakim2\"]",
                     "//*[@id=\"ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_lblTakim1Skor\"]"
                     ,"//*[@id=\"ctl00_MPane_m_29_194_ctnr_m_29_194_MacBilgiDisplay1_dtMacBilgisi_Label12\"]"
            };

            Match match = new Match();

            HtmlAgilityPack.HtmlDocument document=null;
            HtmlAgilityPack.HtmlWeb web = new HtmlAgilityPack.HtmlWeb();
            web.AutoDetectEncoding = false;

            web.OverrideEncoding = Encoding.GetEncoding("iso-8859-9");
            web.Timeout = 15000; ;

            trydoc:
            try
            {

           
            document = web.Load($"https://tff.org/Default.aspx?pageID=29&macID={adres}");
            }
            catch (Exception)
            {
                goto trydoc;

            }
            var stad = document.DocumentNode.SelectNodes(list[0]);
            var r1 = document.DocumentNode.SelectNodes(list[1]);
            var r2 = document.DocumentNode.SelectNodes(list[2]);
            var r3 = document.DocumentNode.SelectNodes(list[3]);
            var r4 = document.DocumentNode.SelectNodes(list[4]);
            var r5 = document.DocumentNode.SelectNodes(list[5]);
            var r6 = document.DocumentNode.SelectNodes(list[6]);
            var r7 = document.DocumentNode.SelectNodes(list[7]);
            var date = document.DocumentNode.SelectNodes(list[8]);
            var h = document.DocumentNode.SelectNodes(list[9]);
            var a = document.DocumentNode.SelectNodes(list[10]);
            var hs = document.DocumentNode.SelectNodes(list[11]);
            var ass = document.DocumentNode.SelectNodes(list[12]);
            try
            {
				match.HomeMS = Convert.ToInt32(hs[0].InnerText);
				match.AwayMS = Convert.ToInt32(ass[0].InnerText);
			}
            catch (Exception)
            {


            }
            try
            {

                match.Referee = System.Threading.Thread.CurrentThread.CurrentCulture.TextInfo.ToTitleCase(r1[0].InnerText.Substring(0, (r1[0].InnerText.IndexOf("("))).ToLower());
                match.Referee2 = System.Threading.Thread.CurrentThread.CurrentCulture.TextInfo.ToTitleCase(r2[0].InnerText.Substring(0, (r2[0].InnerText.IndexOf("("))).ToLower());
                match.Referee3 = System.Threading.Thread.CurrentThread.CurrentCulture.TextInfo.ToTitleCase(r3[0].InnerText.Substring(0, (r3[0].InnerText.IndexOf("("))).ToLower());
                match.Referee4 = System.Threading.Thread.CurrentThread.CurrentCulture.TextInfo.ToTitleCase(r4[0].InnerText.Substring(0, (r4[0].InnerText.IndexOf("("))).ToLower());
                match.Referee5 = System.Threading.Thread.CurrentThread.CurrentCulture.TextInfo.ToTitleCase(r5[0].InnerText.Substring(0, (r5[0].InnerText.IndexOf("("))).ToLower());
                match.Referee6 = System.Threading.Thread.CurrentThread.CurrentCulture.TextInfo.ToTitleCase(r6[0].InnerText.Substring(0, (r6[0].InnerText.IndexOf("("))).ToLower());
                match.Referee7 = System.Threading.Thread.CurrentThread.CurrentCulture.TextInfo.ToTitleCase(r7[0].InnerText.Substring(0, (r7[0].InnerText.IndexOf("("))).ToLower());
				
			}
            catch (Exception)
            {


            }
            match.StadiumName = (stad[0].InnerText);
            match.StadiumId = (stad[0].Attributes["href"].Value.Replace("Default.aspx?pageId=394&amp;stadId=", ""));
            match.Date = Convert.ToDateTime(date[0].InnerText.Replace(" - ", " "));
            match.HomeId = (h[0].Attributes["href"].Value.Replace("Default.aspx?pageId=28&amp;kulupId=", ""));
            match.AwayId = (a[0].Attributes["href"].Value.Replace("Default.aspx?pageId=28&amp;kulupId=", ""));
            match.TFFId = Convert.ToInt32(adres);
       




            //try
            //{


            //	match.HomeScore = Convert.ToInt32(skor[0].InnerText.Split('-')[0]);
            //	match.AwayScore = Convert.ToInt32(skor[0].InnerText.Split('-')[1]);
            //}
            //catch (Exception)
            //{

            //}


            return match;
            //for (int i = 0; i < takımlar.Count; i++)
            //{
            //    dataGridView1.Rows.Add(i+1,takımlar[i], puanlar[i]);
            //}
        }
        string adres = "250186", maçkolik = "3946438";

        private void Form1_Load(object sender, EventArgs e)
        {
            Form2 form2 = new Form2();
            form2.Show();
        }

        private async void button1_Click(object sender, EventArgs e)
        {
			var parser = new FileIniDataParser();
			IniData data = parser.ReadFile("settings.ini");

			string setting1 = data["Settings"]["VAR"];
			string setting2 = data["Settings"]["Hafta"];
			string setting3 = data["Settings"]["Start"];
			string setting4 = data["Settings"]["Finish"];
			string setting5 = data["Settings"]["File"];


			string[] strings = File.ReadAllLines(setting5);

            for (int i =Convert.ToInt32(setting3); i < Convert.ToInt32(setting4); i++)
            {
                await Console.Out.WriteLineAsync(i.ToString());

                adres = strings[i].Split(',')[0];
                maçkolik = strings[i].Split(',')[1];

                //Console.WriteLine("adres");
               // Console.WriteLine(string.IsNullOrWhiteSpace(adres));
                StadiumName playerName = new StadiumName();
             StadiumPlace stadiumPlace = new StadiumPlace();
                HttpClient http = new HttpClient();
                Match match = null;
                if (adres != null)
                {
                    match = await Scrape(adres);

                }
                else
                {
                    match = new Match();
                }
                Team[] teams = http.GetFromJsonAsync<Team[]>("https://raw.githubusercontent.com/R-Fatih/Wikipedia-Football/main/teams.json").Result;
                //Console.WriteLine("burdan maçkolk" + maçkolik);
                EventDetails eventDetails = new EventDetails();
                List<RichTextBox> richTextBoxes = eventDetails.Events(maçkolik,richTextBox2);
               // Console.WriteLine("burdan" + richTextBoxes[0].Text);
              //  Console.WriteLine("burdan" + richTextBoxes[1].Text);
                var matchhh=match;
                var matchdetails = new MatchDetails
                {
                    MDetail = adres != null ?"|"+ teams.Where(a => a.TFFId == match.HomeId).ToList()[0].KısaKodu + "-" + teams.Where(a => a.TFFId == match.AwayId).ToList()[0].KısaKodu : "",
					BesinciHakem = match.Referee5 + ", " + match.Referee6 + (match.Referee7 != null ? ", " + match.Referee7 : ""),
					DorduncuHakem = match.Referee4,
                    Hakem = match.Referee,
                    YardimciHakemler = match.Referee2 + ", " + match.Referee3,
                    Rapor = $"[https://tff.org/Default.aspx?pageID=29&macID={adres} Rapor]",
                    Takim1 = adres != null ? "[[" + teams.Where(a => a.TFFId == match.HomeId).ToList()[0].TakımAdı + "]]" : "",
                    Takim2 = adres != null ? "[[" + teams.Where(a => a.TFFId == match.AwayId).ToList()[0].TakımAdı + "]]" : "",
                    Sonuc = match.HomeMS + " - " + match.AwayMS,
                    Tarih = "{{Başlangıç tarihi|" + match.Date.Year + "|" + match.Date.Month + "|" + match.Date.Day + "}}",
                    Zaman = match.Date.Hour == 0 ? "" : match.Date.ToString("t").Replace(":", "."),
                    Stadyum = adres != null ? "[[" + playerName.QID(Convert.ToInt32(match.StadiumId)) + "]]" : "" ,
                    Yer=adres!=null? "[[" + stadiumPlace.QID(Convert.ToInt32(match.StadiumId)) + "]]" : "",
                    Goller1 = richTextBoxes[0].Text,
                    Goller2 = richTextBoxes[1].Text,
                    Tur=((i/Convert.ToInt32(setting2))+1).ToString()
                };
                File.WriteAllText(matchdetails.MDetail.Replace("|","")+".txt", Convert.ToBoolean(setting1) ? matchdetails.ToString():matchdetails.ToString2());
                richTextBox1.AppendText((Convert.ToBoolean(setting1)? matchdetails.ToString():matchdetails.ToString2())+"\n\n");

            }
        }
    }
}
