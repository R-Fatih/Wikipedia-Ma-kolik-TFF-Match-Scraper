using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace Wikipedi_Maçkolik_Match_Data
{
	public class StadiumName
	{
		public string QID(int id)
		{
			HttpClient httpClient = new HttpClient();
			httpClient.DefaultRequestHeaders.Add("User-Agent", "PostmanRuntime/7.34.0");

			File.WriteAllText("a.txt", $"https://query.wikidata.org/sparql?query=SELECT%20%3Fitem%0AWHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP7402%20\"{id}\"%20.%0A%7D&format=json");
			string myJsonResponse = httpClient.GetStringAsync($"https://query.wikidata.org/sparql?query=SELECT%20%3Fitem%0AWHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP7402%20\"{id}\"%20.%0A%7D&format=json").Result;
			//Match myDeserializedClass = JsonConvert.DeserializeObject<Match>(myJsonResponse);
			try
			{
	JObject jObject = JObject.Parse(myJsonResponse);
			var qid = jObject["results"]["bindings"][0]["item"]["value"].ToString().Replace("http://www.wikidata.org/entity/", "");

			string myJsonResponse2 = httpClient.GetStringAsync($"https://www.wikidata.org/w/api.php?action=wbgetentities&ids=" + jObject["results"]["bindings"][0]["item"]["value"].ToString().Replace("http://www.wikidata.org/entity/", "") + "&format=json").Result;
			JObject jObject2 = JObject.Parse(myJsonResponse2);
			try
			{
				if (jObject2["entities"][qid]["sitelinks"]?["trwiki"]?["title"].ToString() != null)
				{
					var a = jObject2["entities"][qid]["sitelinks"]?["trwiki"]?["title"].ToString();
					if (a.Contains("("))
						return a + "|" + a.Substring(0, a.IndexOf("(") - 1);
					else
						return a;
				}
				else
				{
					var a = jObject2["entities"][qid]["sitelinks"]?["enwiki"]?["title"].ToString();
					if (a.Contains("("))
						return a + "|" + a.Substring(0, a.IndexOf("(") - 1);
					else
						return a;
				}
			}
			catch (Exception)
			{
                if (jObject2["entities"][qid]["labels"]["tr"]["value"].ToString() != null)
                {
                    var a = jObject2["entities"][qid]["labels"]["tr"]["value"].ToString();
                    if (a.Contains("("))
                        return a + "|" + a.Substring(0, a.IndexOf("(") - 1);
                    else
                        return a;
                }

            }

            }
            catch (Exception)
            {


            }
            return id.ToString();
		}
	}
}
