(() => {
  const normalisedCompanies = [
    ["Consat Telematics", "Transport & Logistics", "Public transport technology", "51 to 200", "Around 70 employees", "Pär Thuresson", "Chief Executive Officer", "par.thuresson@consat.se"],
    ["Enwa Water Technology", "Energy & Climate", "Water-treatment technology", "", "", "John Jessen", "Chief Operating Officer", "john.jessen@enwa.com"],
    ["Westpay", "Financial Services", "Payment technology", "11 to 50", "Around 56 employees", "Sten Karlsson", "Chief Executive Officer", "sten.karlsson@westpay.se"],
    ["Talurit", "Industrial & Safety", "Industrial lifting and wire-rope systems", "", "", "Victor Lindh", "CEO & Head of Sales", "victor.lindh@talurit.se"],
    ["Ebeco", "Industrial & Safety", "Heating technology", "11 to 50", "Around 73 employees", "Kristian Larsson", "Export Sales Manager", "kristian.larsson@ebeco.com"],
    ["JOAB", "Automotive", "Commercial vehicle equipment", "201 to 500", "Around 250 employees", "Björn Svedrin", "Sales Manager - Construction / Northern Region & Export", "bjorn.svedrin@joab.se"],
    ["Parakey", "Technology & SaaS", "Mobile access-control technology", "11 to 50", "Around 32 employees", "Johan Svärd", "Chief Commercial Officer", "johan@parakey.co"],
    ["AGVE", "Industrial & Safety", "Automated guided vehicles", "", "", "Ulf Baumgardt", "Director Sales & Marketing", "ulf.baumgardt@agve.se"],
    ["Twiceme Technology", "Technology & SaaS", "Digital safety technology", "", "", "Christian Connolly", "CEO", "christian.connolly@twiceme.com"],
    ["Midsummer", "Energy & Climate", "Thin-film solar technology", "", "", "Eric Jaremalm", "Chief Executive Officer", "eric.jaremalm@midsummer.se"],
    ["SolidSport", "Technology & SaaS", "Sports streaming platform", "", "", "Andreas Westerlind", "Chief Commercial Officer", "awesterlind@solidsport.com"],
    ["Ecoride e-bikes", "Consumer & Retail", "Electric bicycles", "", "", "Martin Walleräng", "Founder & CEO", "martin@ecoride.com"],
    ["VANBRUUN", "Consumer & Retail", "Jewellery retail", "", "", "Victor Halvarsson", "CEO & Founder", "victor@vanbruun.com"],
    ["Litium", "Technology & SaaS", "Digital commerce platform", "", "", "Andreas Granath", "Chief Commercial Officer", "andreas.granath@litium.com"],
    ["Centiglobe", "Financial Services", "Cross-border payments", "", "", "Sofi Håkanson", "Chief Growth Officer", "sofi.hakanson@centiglobe.com"],
    ["Flowbox", "Technology & SaaS", "Commerce marketing SaaS", "", "", "Mads Wedderkopp", "Chief Revenue Officer", "mads.wedderkopp@getflowbox.com"],
    ["Vertiseit", "Technology & SaaS", "In-store experience technology", "201 to 500", "Around 270 employees", "Johan Lind", "Chief Executive Officer", "johan.lind@vertiseit.com"],
    ["Phyron AI", "Technology & SaaS", "Automotive retail AI", "", "", "Mattias Kellquist", "Founder & CEO", "mattias.kellquist@phyron.com"],
    ["Pronomic", "Industrial & Safety", "Material-handling equipment", "", "", "Niklas Palm", "Vice President Sales and Marketing", "niklas.palm@pronomic.com"],
    ["Duschprodukter Group", "Consumer & Retail", "Bathroom products and wholesale distribution", "", "", "Peter Lindenhall", "Sales Manager", "peter.lindenhall@dpsgroup.se"],
    ["Sysarb", "HR Technology", "Pay-transparency SaaS", "", "", "Timmy Lundin", "Chief Commercial Officer", "timmy.lundin@sysarb.com"],
    ["Sleep Cycle", "Healthcare", "Digital health and wellness", "", "", "Peter Alsterberg", "Chief Commercial Officer", "peter.alsterberg@sleepcycle.com"],
    ["Allgon Group", "Industrial & Safety", "Industrial wireless control", "", "", "Linda Nyquist-Evenrud", "Group CEO", "l.nyquist-evenrud@allgon.com"],
    ["Micvac", "Industrial & Safety", "Food packaging technology", "", "", "Michael Bogdanski", "CEO", "michael.bogdanski@micvac.com"],
    ["Ongoing Warehouse", "Technology & SaaS", "Warehouse management SaaS", "", "", "Karl Henke", "Head of Sales", "karl.henke@ongoingwarehouse.com"],
    ["ChargeNode", "Energy & Climate", "EV charging platform", "", "", "Annika Abraham", "CEO", "annika.abraham@chargenode.eu"],
    ["Froda", "Financial Services", "Embedded finance", "", "", "Olle Lundin", "CEO & Co-founder", "olle@froda.se"],
    ["Focus Nordic AB", "Consumer & Retail", "Premium imaging distribution", "", "", "Mikael Westheimer", "Chief Executive Officer", "mikael.westheimer@focusnordic.dk"],
    ["VITEC ENERGY AB", "Technology & SaaS", "Energy software", "", "", "Kristoffer Roger", "Business Development", "kristoffer.roger@vitecsoftware.com"],
    ["FlexQube", "Industrial & Safety", "Industrial logistics solutions", "", "", "Anders Fogelberg", "CEO", "anders.fogelberg@flexqube.com"],
    ["Axkid", "Consumer & Retail", "Premium child safety products", "", "", "Anton Wall", "Vice President & Commercial Director", "anton.wall@axkid.com"],
    ["Sitoo", "Technology & SaaS", "Retail SaaS", "", "", "Jens Levin", "Co-founder & CEO", "jens.levin@sitoo.com"],
    ["Mynt", "Financial Services", "Corporate cards and expense management", "", "", "Baltsar Sahlin", "CEO & Co-founder", "baltsar.sahlin@mynt.com"]
  ];

  const csvCell = (value) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  const rows = normalisedCompanies.map(([company, sector, industry, band, estimate, contactName, contactTitle, email]) =>
    [company, sector, industry, band, estimate, "24 Aug 2026", contactName, contactTitle, email].map(csvCell).join(",")
  ).join("\n");

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await nativeFetch(input, init);
    const url = typeof input === "string" ? input : (input?.url || "");
    if (!response.ok || !/(^|\/)data\/companies\.csv(?:$|[?#])/.test(url)) return response;

    try {
      const baseText = await response.clone().text();
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      headers.delete("content-encoding");
      return new Response(`${baseText.trimEnd()}\n${rows}\n`, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (_error) {
      return response;
    }
  };
})();