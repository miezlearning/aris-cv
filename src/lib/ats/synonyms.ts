export type SynonymGroup = {
  id: string;
  canonical: string;
  terms: string[];
  kind: "synonym" | "cross_language" | "education_cluster";
};

export const SYNONYM_GROUPS: SynonymGroup[] = [
  // Education clusters (ID <-> EN & rumpun jurusan)
  {
    id: "edu-cs",
    canonical: "Teknik Informatika / Ilmu Komputer",
    kind: "education_cluster",
    terms: [
      "s1 komputer",
      "sarjana komputer",
      "teknik informatika",
      "ilmu komputer",
      "sistem informasi",
      "teknologi informasi",
      "rekayasa perangkat lunak",
      "manajemen informatika",
      "computer science",
      "informatics",
      "information systems",
      "information technology",
      "software engineering",
      "it",
      "ti",
      "si",
      "rpl",
      "tkj",
      "teknik komputer dan jaringan",
      "teknik komputer"
    ]
  },
  {
    id: "edu-econ",
    canonical: "Akuntansi / Manajemen / Ekonomi",
    kind: "education_cluster",
    terms: [
      "s1 ekonomi",
      "sarjana ekonomi",
      "akuntansi",
      "manajemen",
      "manajemen bisnis",
      "administrasi bisnis",
      "administrasi perkantoran",
      "keuangan",
      "perpajakan",
      "accounting",
      "finance",
      "business administration",
      "management",
      "economics"
    ]
  },
  {
    id: "edu-comm-design",
    canonical: "Desain / Komunikasi",
    kind: "education_cluster",
    terms: [
      "desain komunikasi visual",
      "dkv",
      "ilmu komunikasi",
      "komunikasi",
      "desain grafis",
      "visual communication design",
      "graphic design",
      "communication science",
      "multimedia"
    ]
  },
  {
    id: "edu-health",
    canonical: "Kesehatan / Rekam Medis",
    kind: "education_cluster",
    terms: [
      "rekam medis",
      "rekam medis dan informasi kesehatan",
      "rmik",
      "kesehatan masyarakat",
      "keperawatan",
      "farmasi",
      "administrasi rumah sakit",
      "medical records",
      "health informatics",
      "public health"
    ]
  },

  // Office & Productivity
  {
    id: "office-suite",
    canonical: "Microsoft Office",
    kind: "synonym",
    terms: [
      "ms. office",
      "ms office",
      "microsoft office",
      "ms. excel",
      "ms excel",
      "microsoft excel",
      "excel",
      "ms. word",
      "ms word",
      "microsoft word",
      "word",
      "ms. powerpoint",
      "ms powerpoint",
      "microsoft powerpoint",
      "powerpoint",
      "google workspace",
      "google docs",
      "google sheets",
      "spreadsheet"
    ]
  },
  {
    id: "excel-advanced",
    canonical: "Microsoft Excel (Formula & Olah Data)",
    kind: "synonym",
    terms: ["excel", "ms excel", "ms. excel", "microsoft excel", "vlookup", "xlookup", "pivot table", "pivottable", "spreadsheet", "google sheets"]
  },

  // Frontend & Web Engineering
  {
    id: "react",
    canonical: "React",
    kind: "synonym",
    terms: ["react", "react.js", "reactjs"]
  },
  {
    id: "nextjs",
    canonical: "Next.js",
    kind: "synonym",
    terms: ["next.js", "nextjs"]
  },
  {
    id: "nodejs",
    canonical: "Node.js",
    kind: "synonym",
    terms: ["node.js", "nodejs"]
  },
  {
    id: "vuejs",
    canonical: "Vue.js",
    kind: "synonym",
    terms: ["vue", "vue.js", "vuejs"]
  },
  {
    id: "typescript",
    canonical: "TypeScript",
    kind: "synonym",
    terms: ["typescript", "ts"]
  },
  {
    id: "javascript",
    canonical: "JavaScript",
    kind: "synonym",
    terms: ["javascript", "js", "ecmascript", "es6"]
  },
  {
    id: "rest-api",
    canonical: "RESTful API",
    kind: "synonym",
    terms: ["restful api", "rest api", "backend api", "web api", "api integration", "integrasi api", "http api"]
  },
  {
    id: "tailwind",
    canonical: "Tailwind CSS",
    kind: "synonym",
    terms: ["tailwind", "tailwind css", "tailwindcss"]
  },
  {
    id: "git-vcs",
    canonical: "Git / Version Control",
    kind: "synonym",
    terms: ["git", "github", "gitlab", "bitbucket", "version control", "kontrol versi"]
  },
  {
    id: "sql-db",
    canonical: "SQL / Database Relasional",
    kind: "synonym",
    terms: ["sql", "mysql", "postgresql", "postgres", "mariadb", "sql server", "basis data", "database relasional", "rdbms"]
  },
  {
    id: "ui-ux",
    canonical: "UI/UX Design",
    kind: "synonym",
    terms: ["ui/ux", "ui/ux design", "ui ux", "user interface", "user experience", "desain antarmuka", "product design", "wireframe", "wireframing", "prototyping", "prototype"]
  },
  {
    id: "qa-testing",
    canonical: "Quality Assurance / Testing",
    kind: "synonym",
    terms: ["qa", "quality assurance", "software testing", "manual testing", "automated testing", "unit testing", "pengujian perangkat lunak"]
  },
  {
    id: "devops-docker",
    canonical: "Docker / CI/CD",
    kind: "synonym",
    terms: ["docker", "containerization", "ci/cd", "continuous integration", "github actions"]
  },

  // IT Support, Jaringan, & Rumah Sakit
  {
    id: "simrs",
    canonical: "SIMRS / Rekam Medis Elektronik",
    kind: "cross_language",
    terms: [
      "simrs",
      "sistem informasi manajemen rumah sakit",
      "rekam medis elektronik",
      "rme",
      "emr",
      "ehr",
      "hospital information system",
      "his"
    ]
  },
  {
    id: "networking",
    canonical: "Jaringan Komputer (LAN/WAN)",
    kind: "cross_language",
    terms: [
      "jaringan komputer",
      "computer networking",
      "networking",
      "jaringan",
      "jaringan lan/wan",
      "jaringan lan & wi-fi",
      "lan/wan",
      "lan",
      "wan",
      "mikrotik",
      "cisco",
      "tcp/ip",
      "network troubleshooting",
      "instalasi jaringan"
    ]
  },
  {
    id: "it-support",
    canonical: "IT Support & Troubleshooting",
    kind: "cross_language",
    terms: [
      "it support",
      "helpdesk",
      "it helpdesk & dukungan pengguna",
      "technical support",
      "dukungan teknis",
      "troubleshooting",
      "troubleshooting hardware",
      "troubleshooting hardware & printer",
      "troubleshooting hardware & software",
      "troubleshooting software",
      "perbaikan hardware",
      "perbaikan komputer",
      "maintenance komputer",
      "pemeliharaan perangkat keras",
      "instalasi os"
    ]
  },

  // Data, Project, & Cross-Language
  {
    id: "project-management",
    canonical: "Manajemen Proyek / Project Management",
    kind: "cross_language",
    terms: ["manajemen proyek", "project management", "scrum", "agile", "kanban", "trello", "jira", "pengelolaan proyek"]
  },
  {
    id: "data-analysis",
    canonical: "Analisis Data / Data Analysis",
    kind: "cross_language",
    terms: ["analisis data", "data analysis", "data analytics", "analisa data", "pengolahan data", "olah data", "analytics"]
  },
  {
    id: "data-viz",
    canonical: "Visualisasi Data / Dashboard",
    kind: "cross_language",
    terms: ["visualisasi data", "data visualization", "dashboard", "dasbor", "power bi", "looker studio", "tableau", "google data studio"]
  },
  {
    id: "internship",
    canonical: "Pengalaman Magang / Internship",
    kind: "cross_language",
    terms: ["pengalaman magang", "magang", "internship", "intern", "msib", "kampus merdeka", "praktik kerja lapangan", "pkl"]
  },

  // Warehouse, Admin, Finance, Marketing, HR
  {
    id: "inventory",
    canonical: "Manajemen Stok / Administrasi Gudang",
    kind: "cross_language",
    terms: ["stock opname", "pengelolaan stok", "pencatatan stok", "inventory management", "administrasi gudang", "warehouse management", "wms", "fifo", "fefo", "surat jalan"]
  },
  {
    id: "archive-admin",
    canonical: "Pengarsipan & Administrasi",
    kind: "cross_language",
    terms: ["pengarsipan", "kearsipan", "filing", "document control", "administrasi perkantoran", "office administration", "data entry", "input data"]
  },
  {
    id: "finance-accounting",
    canonical: "Laporan Keuangan & Akuntansi",
    kind: "cross_language",
    terms: [
      "laporan keuangan",
      "financial reporting",
      "akuntansi",
      "accounting",
      "pembukuan",
      "bookkeeping",
      "jurnal",
      "rekonsiliasi bank",
      "bank reconciliation",
      "kas kecil",
      "petty cash",
      "accounts payable",
      "accounts receivable"
    ]
  },
  {
    id: "tax",
    canonical: "Perpajakan / Tax",
    kind: "cross_language",
    terms: ["perpajakan", "tax", "brevet", "brevet a/b", "e-faktur", "efaktur", "spt", "pph", "ppn"]
  },
  {
    id: "seo",
    canonical: "SEO",
    kind: "cross_language",
    terms: ["seo", "search engine optimization", "optimasi mesin pencari"]
  },
  {
    id: "sem",
    canonical: "SEM / Paid Ads",
    kind: "cross_language",
    terms: ["sem", "search engine marketing", "google ads", "meta ads", "facebook ads", "instagram ads", "paid search"]
  },
  {
    id: "social-media",
    canonical: "Manajemen Media Sosial",
    kind: "cross_language",
    terms: ["social media", "media sosial", "social media management", "manajemen konten", "content marketing", "pemasaran digital", "digital marketing"]
  },
  {
    id: "recruitment",
    canonical: "Rekrutmen / Talent Acquisition",
    kind: "cross_language",
    terms: ["rekrutmen", "recruitment", "talent acquisition", "hiring", "screening cv", "interviewing"]
  },
  {
    id: "customer-service",
    canonical: "Layanan Pelanggan / Customer Service",
    kind: "cross_language",
    terms: ["layanan pelanggan", "customer service", "customer support", "customer experience", "penanganan keluhan", "front office", "resepsionis"]
  },

  // Soft Skills & Traits (ID <-> EN)
  {
    id: "teamwork",
    canonical: "Kerja Tim / Teamwork",
    kind: "cross_language",
    terms: ["kerja tim", "kerjasama tim", "kerja sama tim", "kerja sama", "teamwork", "team work", "collaboration", "kolaborasi", "team player"]
  },
  {
    id: "communication",
    canonical: "Komunikasi / Communication",
    kind: "cross_language",
    terms: ["komunikasi", "communication", "komunikatif", "public speaking", "presentasi", "presentation", "interpersonal"]
  },
  {
    id: "detail-oriented",
    canonical: "Teliti / Attention to Detail",
    kind: "cross_language",
    terms: ["teliti", "ketelitian", "detail oriented", "detail-oriented", "attention to detail", "cermat", "akurat"]
  },
  {
    id: "problem-solving",
    canonical: "Pemecahan Masalah / Problem Solving",
    kind: "cross_language",
    terms: ["pemecahan masalah", "problem solving", "analytical thinking", "berpikir analitis", "critical thinking", "berpikir kritis"]
  },
  {
    id: "leadership",
    canonical: "Kepemimpinan / Leadership",
    kind: "cross_language",
    terms: ["kepemimpinan", "leadership", "team lead", "koordinator", "memimpin tim"]
  },
  {
    id: "time-management",
    canonical: "Manajemen Waktu / Time Management",
    kind: "cross_language",
    terms: ["manajemen waktu", "time management", "disiplin", "tepat waktu", "deadline"]
  },
  {
    id: "adaptability",
    canonical: "Adaptif / Adaptability",
    kind: "cross_language",
    terms: ["adaptif", "adaptability", "cepat beradaptasi", "fleksibel", "flexible", "agile mindset"]
  },
  {
    id: "initiative",
    canonical: "Inisiatif / Proaktif",
    kind: "cross_language",
    terms: ["inisiatif", "proaktif", "proactive", "self-starter", "ownership", "mandiri"]
  }
];

export const normalizeForMatch = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, " ")
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .replace(/(^|\s)[./-]+|[./-]+(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Pencocokan kata dengan batas token ketat.
 * Mencegah kecocokan palsu seperti "api" di dalam "rapi"/"tetapi" atau "git" di dalam "digital".
 */
export const containsTermBoundary = (normalizedBody: string, term: string): boolean => {
  const cleanTerm = normalizeForMatch(term);
  if (!cleanTerm) return false;

  const escaped = escapeRegex(cleanTerm).replace(/\s+/g, "\\s+");
  const pattern = new RegExp(`(?:^|[\\s,;:()\\[\\]{}/|"'\\-])${escaped}(?=$|[\\s,;:()\\[\\]{}/|"'\\-.!?])`, "i");
  return pattern.test(normalizedBody);
};

export type SynonymMatchResult = {
  matchedTerm: string;
  kind: SynonymGroup["kind"];
};

export const findSynonymMatch = (normalizedBody: string, keyword: string): SynonymMatchResult | null => {
  const target = normalizeForMatch(keyword);
  if (!target) return null;

  const matchingGroups = SYNONYM_GROUPS.filter((group) =>
    group.terms.some((item) => normalizeForMatch(item) === target)
  );

  for (const group of matchingGroups) {
    for (const candidate of group.terms) {
      const normalizedCandidate = normalizeForMatch(candidate);
      if (normalizedCandidate === target) continue;
      if (containsTermBoundary(normalizedBody, normalizedCandidate)) {
        return { matchedTerm: candidate, kind: group.kind };
      }
    }
  }

  return null;
};

export const getRelatedTerms = (keyword: string): string[] => {
  const target = normalizeForMatch(keyword);
  const terms = new Set<string>();

  for (const group of SYNONYM_GROUPS) {
    if (group.terms.some((item) => normalizeForMatch(item) === target)) {
      for (const term of group.terms) {
        if (normalizeForMatch(term) !== target) terms.add(term);
      }
    }
  }

  return Array.from(terms);
};
