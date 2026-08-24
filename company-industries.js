(() => {
  const supplementalCompanies = [
    ["Berg Propulsion", "Transport & Logistics", "Marine propulsion systems", "Mattias Hansson", "Senior Global Sales Manager"],
    ["Kapacity.io / EnergyHub", "Energy & Climate", "Building energy flexibility software", "", ""],
    ["Stealth Startup", "Startups & Venture", "Venture studio / pre-seed startups", "", ""],
    ["NTEX", "Transport & Logistics", "Freight and logistics", "Tobias Rindevall", ""],
    ["Qualisys", "Technology & SaaS", "Motion-capture technology", "Fredrik Müller", ""],
    ["Qred", "Financial Services", "SME lending fintech", "Jason Francis", "Co-founder & Head of Strategic Partnerships"],
    ["CtrlPrint", "Technology & SaaS", "Corporate reporting software", "Jonas Karlsson", "CEO"],
    ["Profoto", "Consumer & Retail", "Professional photography lighting", "Anders Hedebark", ""],
    ["Nordiska Kök", "Consumer & Retail", "Premium kitchen design", "Johan Lundkvist", "Co-founder"],
    ["Fortex International", "Industrial & Safety", "Paper and board trading", "Robin Ekström; Evelina Celec", "Initial contact; HR Manager"],
    ["Aura Light", "Industrial & Safety", "Professional lighting systems", "Rasmus Andersson", ""],
    ["Salinity", "Industrial & Safety", "Salt products and distribution", "Marit Börjesson", "CEO, Salinity Group"],
    ["Auctionet", "Consumer & Retail", "Online auction marketplace", "Oskar Törnvall", ""],
    ["Aceve", "Technology & SaaS", "Construction SaaS", "Claus Thorsgaard", ""],
    ["Wallenius SOL", "Transport & Logistics", "Maritime freight and logistics", "Jonas Wåhlin", ""],
    ["Nimbus Group", "Consumer & Retail", "Leisure boats", "Johan Inden", ""],
    ["Lexit Group", "Technology & SaaS", "Digitalisation and automation services", "Petter Lagström", ""],
    ["Jetpak", "Transport & Logistics", "Express logistics", "Kenneth Marx", ""],
    ["Hecksher", "Transport & Logistics", "Freight forwarding and logistics", "Patrik Rossberger", "Managing Director"],
    ["Flowscape Solutions", "Technology & SaaS", "Workplace software", "Fredrik Landberg", ""],
    ["Storyals", "Technology & SaaS", "Workplace learning software", "Adrian Leufvén", "COO & Business Development Manager"],
    ["Ferroman", "Industrial & Safety", "Process-industry equipment and services", "Håvard Hansen", ""],
    ["Nordic Fastening Group", "Industrial & Safety", "Fasteners and industrial components", "Jesper Johnsson", ""],
    ["Safe at Site", "Industrial & Safety", "Worksite safety technology", "Ted Sundberg", ""],
    ["Conaxess Trade", "Consumer & Retail", "Consumer-goods distribution", "Martin Swanström", ""],
    ["Retriever", "Technology & SaaS", "Media monitoring and analysis", "Robert Söderling", ""],
    ["Galatea", "Consumer & Retail", "Beverage distribution", "Fredrik Olin", ""],
    ["Orrefors Kosta Boda", "Consumer & Retail", "Premium glassware and design", "Remco Snoeck", ""],
    ["Witre Manutan", "Industrial & Safety", "Workplace and industrial equipment", "Lars Karjalainen", ""],
    ["Nord-Lock Group", "Industrial & Safety", "Bolting systems", "Christoffer Karlsson", ""],
    ["GOT Design", "Industrial & Safety", "Engineering and product development", "Niklas Bodin", ""],
    ["Stena RoRo", "Transport & Logistics", "RoRo shipping", "Per Westling", ""],
    ["Jaktia", "Consumer & Retail", "Hunting and fishing retail", "Sebastian Slettengren", ""],
    ["Lammhults Design Group", "Consumer & Retail", "Design furniture", "Susanna Hilleskog", ""],
    ["Sirocco Group", "Technology & SaaS", "CRM and business software consulting", "Laith Al-Hashimi", ""],
    ["Textalk", "Technology & SaaS", "Digital platforms and e-commerce software", "Jens", ""],
    ["Svedbergs Group", "Consumer & Retail", "Bathroom products", "Per-Arne Andersson", "CEO"],
    ["Modular Finance", "Technology & SaaS", "Investor-relations software and financial data", "Johannes Wellmann", ""],
    ["360Player", "Technology & SaaS", "Sports club management software", "Leo", ""],
    ["PMC Hydraulics", "Industrial & Safety", "Hydraulic systems", "Mikael Lundgren", "CEO"],
    ["SmartCraft", "Technology & SaaS", "Construction software", "Jeremias Jansson", "CEO"],
    ["NJIE Foods", "Consumer & Retail", "Food and beverages", "Assan Njie", ""],
    ["OpenAI", "Technology & SaaS", "Artificial intelligence platform", "", ""],
    ["Harvey", "Technology & SaaS", "Legal AI software", "", ""],
    ["Harness", "Technology & SaaS", "AI software delivery platform", "", ""],
    ["Proxify", "Technology & SaaS", "Software talent platform", "Noelia Jiménez Almansa", "Senior Talent Acquisition Specialist"],
    ["Extenda Retail", "Technology & SaaS", "Retail software", "Wim Kroes", ""],
    ["SweGreen", "Energy & Climate", "Agtech and vertical farming", "Marcin Malinowski", "Sales Manager"],
    ["ScanBox", "Industrial & Safety", "Insulated food-transport equipment", "Johan Olsson", ""],
    ["PODAB", "Industrial & Safety", "Professional laundry equipment", "Roberth Carlsson", ""],
    ["Fagerberg", "Industrial & Safety", "Valves and process equipment", "Patrik Jansson", ""],
    ["Bolon", "Consumer & Retail", "Design flooring", "Annica Eklund", ""],
    ["MITAB", "Consumer & Retail", "Contract and design furniture", "Peter Torstensson", "CEO"],
    ["Österbergs Förpackningsmaskiner", "Industrial & Safety", "Packaging machinery", "Sofia Zachrisson", "CEO"],
    ["TengTools", "Industrial & Safety", "Professional hand tools", "Stian Strøm", "CEO"],
    ["Milleteknik", "Industrial & Safety", "Backup power systems", "Denis Vandija", ""],
    ["Petbuddy Group", "Consumer & Retail", "Pet care products", "Johanna", ""],
    ["ElectroHeat", "Industrial & Safety", "Industrial heating systems", "Lisa Lundström", ""],
    ["PiiGAB", "Industrial & Safety", "Energy metering and industrial communication", "Daniel Andersson", ""],
    ["Learnifier", "Technology & SaaS", "Learning platform", "Mattias Borg", ""],
    ["Humly", "Technology & SaaS", "Workplace technology", "Anders Karlsson", ""],
    ["Kodiak Hub", "Technology & SaaS", "Supplier relationship management software", "Malin Schmidt", ""],
    ["Netmore Group", "Telecommunications", "IoT connectivity", "Andreas Stenhager", ""],
    ["Centuri", "Technology & SaaS", "Governance and document-management software", "Jonas Ljungwald", ""],
    ["Occtoo", "Technology & SaaS", "Experience data platform", "Niclas Mollin", ""],
    ["IDUN Minerals", "Consumer & Retail", "Cosmetics and beauty", "Caroline Thunstedt", "CEO"],
    ["Fameco", "Industrial & Safety", "Fasteners and industrial C-parts", "Fredrik Schultz", ""],
    ["BAUX", "Industrial & Safety", "Acoustic building materials", "Fredrik Franzon", "CEO & Co-founder"],
    ["Embellence Group", "Consumer & Retail", "Interior design brands", "Johan Andgren", ""],
    ["Tingstad", "Consumer & Retail", "B2B workplace supplies", "Mats Karlsson", ""],
    ["Nordic Knots", "Consumer & Retail", "Premium rugs", "Fabian", ""],
    ["CAIA Cosmetics", "Consumer & Retail", "Cosmetics and beauty", "Kieran", ""],
    ["Steamery", "Consumer & Retail", "Clothing-care products", "Raphael", ""],
    ["Aarke", "Consumer & Retail", "Premium home appliances", "Anders", ""],
    ["SteelTech", "Industrial & Safety", "Foodservice and industrial machinery", "Peter Göransson", ""],
    ["Berlex", "Industrial & Safety", "Road safety and traffic systems", "Madeleine Fritz", "Sales Director"],
    ["ETP Transmission", "Industrial & Safety", "Mechanical power-transmission components", "Niclas Rosberg", ""],
    ["Provexa", "Industrial & Safety", "Industrial surface treatment", "Staffan Marklund", "Group CEO"],
    ["Better Shelter", "Nonprofit & Humanitarian", "Humanitarian shelter systems", "Glenn Jusnes", "Head of Partnerships"],
    ["PetroBio", "Energy & Climate", "Industrial combustion and bioenergy systems", "Daniel Persson", ""],
    ["Corona Control", "Industrial & Safety", "Industrial control systems", "Lennart Pihl", ""],
    ["Lingio", "Technology & SaaS", "Learning software", "Yashar", ""],
    ["Bryntum", "Technology & SaaS", "Project scheduling software", "Mats", ""],
    ["Matting", "Industrial & Safety", "Ergonomic workplace and mat products", "Henrik Botha", ""],
    ["Metrum Sweden", "Energy & Climate", "Power-quality measurement systems", "Ola", ""],
    ["Walley", "Financial Services", "Payments fintech", "Josef", ""],
    ["Hultdins", "Industrial & Safety", "Forestry equipment", "Tobias Bodenlundberg", ""],
    ["Aura Cloud", "Technology & SaaS", "Core banking software", "Tommi", ""],
    ["Easyfairs Nordic", "Business Services", "Trade shows and events", "Henrik Johansson", ""],
    ["Hultsteins", "Transport & Logistics", "Transport refrigeration systems", "Fredrik Mouchard", "Managing Director"],
    ["St1 Biokraft", "Energy & Climate", "Biogas and biomethane", "Sohrab Moshiri", ""],
    ["QleanAir", "Industrial & Safety", "Indoor air-cleaning systems", "Sofie Lundgren", "Region Manager Nordics, Poland and Export"],
    ["GreenIron", "Energy & Climate", "Low-carbon metals technology", "Tanja Ilic", ""],
    ["REAC Group", "Industrial & Safety", "Electromechanical motion systems", "Erik Ahnberg", ""],
    ["TORNUM", "Industrial & Safety", "Grain handling and storage systems", "Jerker Söderholm", ""],
    ["Younium", "Technology & SaaS", "Subscription management software", "Martin Kaver", ""],
    ["Billogram", "Financial Services", "Billing and payments software", "Sören Steckmest", ""],
    ["Voyado", "Technology & SaaS", "Retail CRM and customer-experience software", "Erica Sandelin Ekelund", ""],
    ["Funnel", "Technology & SaaS", "Marketing data software", "Fredrik", ""],
    ["Bannerflow", "Technology & SaaS", "Creative management platform", "Daniel Angvik", ""],
    ["Mavenoid", "Technology & SaaS", "Product support software", "Gintautas Miliauskas", ""],
    ["Hem", "Consumer & Retail", "Design furniture", "Petrus", ""],
    ["Mockberg", "Consumer & Retail", "Jewellery and accessories", "Charlie", ""],
    ["String Furniture", "Consumer & Retail", "Design furniture", "Jens", ""],
    ["Aritco", "Industrial & Safety", "Lift and elevator systems", "Ida Lindvall", "CCO"],
    ["Ingrid", "Technology & SaaS", "Delivery-experience software", "Madelén Menning", ""],
    ["Stora Enso", "Industrial & Safety", "Renewable packaging and biomaterials", "Daniel Örengård", "Head of Commercial Corrugated Sweden"],
    ["beqom", "HR Technology", "Compensation and HR software", "", ""]
  ];

  const csvCell = (value) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  const header = "company,sector_group,industry_sector,employee_band,employee_estimate,verified_date,contact_name,contact_title,contact_email";
  const extraCsv = supplementalCompanies.map(([company, sector, industry, contactName, contactTitle]) =>
    [company, sector, industry, "", "", "24 Aug 2026", contactName, contactTitle, ""].map(csvCell).join(",")
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
      const merged = `${baseText.trimEnd()}\n${extraCsv}\n`;
      return new Response(merged, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (_error) {
      return response;
    }
  };

  window.companyIndustryCoverage = {
    supplementalCount: supplementalCompanies.length,
    verifiedDate: "24 Aug 2026",
    header,
  };
})();