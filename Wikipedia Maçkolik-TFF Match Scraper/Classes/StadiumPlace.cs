using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace Wikipedia_Maçkolik_TFF_Match_Scraper.NewFolder1
{
    public class StadiumPlace
    {
        // 30 Büyükşehir İl isimleri
        private static readonly HashSet<string> BuyuksehirIller = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Adana", "Ankara", "Antalya", "Aydın", "Balıkesir",
            "Bursa", "Denizli", "Diyarbakır", "Erzurum", "Eskişehir",
            "Gaziantep", "Hatay", "İstanbul", "İzmir", "Kahramanmaraş",
            "Kayseri", "Kocaeli", "Konya", "Malatya", "Manisa",
            "Mardin", "Mersin", "Muğla", "Ordu", "Sakarya",
            "Samsun", "Şanlıurfa", "Tekirdağ", "Trabzon", "Van"
        };

        /// <summary>
        /// Bir ismi Wikipedia wikilink formatına çevirir.
        /// Parantez varsa pipe ile kısaltılmış halini ekler.
        /// Örn: "Ümraniye" → "[[Ümraniye]]"
        /// Örn: "Muğla (il)" → "[[Muğla (il)|Muğla]]"
        /// </summary>
        private static string CleanName(string name)
        {
            if (string.IsNullOrEmpty(name)) return "";
            name = name.Trim();
            if (name.Contains(","))
            {
                name = name.Substring(0, name.IndexOf(",")).Trim();
            }
            if (name.Contains("("))
            {
                name = name.Substring(0, name.IndexOf("(")).Trim();
            }
            return name;
        }

        /// <summary>
        /// Bir ismi Wikipedia wikilink formatına çevirir.
        /// Parantez veya virgül varsa pipe ile kısaltılmış halini ekler.
        /// Örn: "Ümraniye" → "[[Ümraniye]]"
        /// Örn: "Muğla (il)" → "[[Muğla (il)|Muğla]]"
        /// Örn: "Bodrum, Muğla" → "[[Bodrum, Muğla|Bodrum]]"
        /// </summary>
        private static string FormatWikiLink(string name)
        {
            if (string.IsNullOrEmpty(name)) return "";
            name = name.Trim();
            string baseName = CleanName(name);
            if (!string.Equals(baseName, name, StringComparison.Ordinal) && !string.IsNullOrEmpty(baseName))
            {
                return "[[" + name + "|" + baseName + "]]";
            }
            else
            {
                return "[[" + name + "]]";
            }
        }

        private static bool IsBuyuksehir(string ilName)
        {
            if (string.IsNullOrEmpty(ilName)) return false;
            string cleanName = CleanName(ilName);
            return BuyuksehirIller.Contains(cleanName);
        }

        /// <summary>
        /// TFF stadyum ID'si üzerinden Wikidata SPARQL ile ilçe ve il bilgisini çeker.
        /// P131 zincirini takip ederek stadyumun bulunduğu ilçe ve ili tespit eder.
        /// 
        /// Büyükşehir illerde:          [[İlçe]], [[İl]]
        /// Büyükşehir olmayan illerde:   [[İl]]
        /// </summary>
        public async Task<string> QID(int id)
        {
            HttpClient httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Add("User-Agent", "PostmanRuntime/7.34.0");
            httpClient.Timeout = TimeSpan.FromSeconds(30);

            try
            {
                // SPARQL sorgusu: P7402 ile stadyumu bul, P131 zincirinden il (Q48336) ve ilçe (Q1147395 veya Q149621) bul.
                // Türkçe Vikipedi makale adını (schema:name) öncelikli alır.
                string sparqlQuery =
                    "SELECT ?ilceName ?ilName WHERE { " +
                    $"?stadium wdt:P7402 \"{id}\" . " +
                    "  ?stadium wdt:P131+ ?il . " +
                    "  ?il wdt:P31 wd:Q48336 . " +
                    "  OPTIONAL { " +
                    "    ?ilWP schema:about ?il ; " +
                    "          schema:isPartOf <https://tr.wikipedia.org/> ; " +
                    "          schema:name ?ilArticle . " +
                    "  } " +
                    "  OPTIONAL { ?il rdfs:label ?ilLabelTr . FILTER(LANG(?ilLabelTr) = \"tr\") } " +
                    "  OPTIONAL { " +
                    "    ?stadium wdt:P131+ ?ilce . " +
                    "    ?ilce wdt:P31 ?ilceType . " +
                    "    FILTER(?ilceType IN (wd:Q1147395, wd:Q149621, wd:Q3957, wd:Q515, wd:Q48336)) " +
                    "    FILTER(?ilce != ?il) " +
                    "    OPTIONAL { " +
                    "      ?ilceWP schema:about ?ilce ; " +
                    "              schema:isPartOf <https://tr.wikipedia.org/> ; " +
                    "              schema:name ?ilceArticle . " +
                    "    } " +
                    "    OPTIONAL { ?ilce rdfs:label ?ilceLabelTr . FILTER(LANG(?ilceLabelTr) = \"tr\") } " +
                    "  } " +
                    "  BIND(COALESCE(?ilArticle, ?ilLabelTr) AS ?ilName) " +
                    "  BIND(COALESCE(?ilceArticle, ?ilceLabelTr) AS ?ilceName) " +
                    "} LIMIT 1";

                string encodedQuery = Uri.EscapeDataString(sparqlQuery);
                string url = $"https://query.wikidata.org/sparql?query={encodedQuery}&format=json";

                string jsonResponse = await httpClient.GetStringAsync(url);
                JObject result = JObject.Parse(jsonResponse);
                var bindings = result["results"]?["bindings"];

                if (bindings == null || !bindings.HasValues)
                {
                    Console.WriteLine("SPARQL: Stadın yeri bulunamadı -- {0}", id);
                    return id.ToString();
                }

                var binding = bindings[0];

                string ilName = binding["ilName"]?["value"]?.ToString();
                string ilceName = binding["ilceName"]?["value"]?.ToString();

                if (string.IsNullOrEmpty(ilName))
                {
                    Console.WriteLine("SPARQL: İl bilgisi bulunamadı -- {0}", id);
                    return id.ToString();
                }

                string cleanIlce = CleanName(ilceName);
                string cleanIl = CleanName(ilName);

                // Büyükşehir illerde ilçe + il formatı (ancak ilçe adı il adı ile aynı değilse), diğerlerinde sadece il
                if (!string.IsNullOrEmpty(ilceName) && !string.Equals(cleanIlce, cleanIl, StringComparison.OrdinalIgnoreCase) && IsBuyuksehir(ilName))
                {
                    return FormatWikiLink(ilceName) + ", " + FormatWikiLink(ilName);
                }
                else
                {
                    return FormatWikiLink(ilName);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("SPARQL: Stadın yeri çekilirken hata -- {0}: {1}", id, ex.Message);
                return id.ToString();
            }
        }
    }
}
