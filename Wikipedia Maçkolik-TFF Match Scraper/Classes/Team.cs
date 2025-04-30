using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Wikipedia_Standings
{
	public class Team
	{
		// Root myDeserializedClass = JsonConvert.DeserializeObject<List<Root>>(myJsonResponse);
		
			public string TakımAdı { get; set; }

			public string KısaKodu { get; set; }

			public string MaçkolikId { get; set; }
        public string TFFId { get; set; }


    }
}
