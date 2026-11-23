import type { AdministrativeItem } from "@/types/resume";

export type AdminRule = {
  id: string;
  subType: AdministrativeItem["subType"];
  label: string;
  pattern: RegExp;
  /** Token pendek atau pola kata yang ikut dibersihkan dari korpus skill agar tidak bocor sebagai hard skill. */
  stripPattern?: RegExp;
};

export const ADMIN_RULES: AdminRule[] = [
  // Berkas & Dokumen (document)
  {
    id: "doc-ktp",
    subType: "document",
    label: "Fotokopi / Scan KTP",
    pattern: /\b(?:fc\.?\s*|fotokopi\s+|foto\s+copy\s+|scan\s+)?e?-?ktp\b/i,
    stripPattern: /\b(?:fc\.?\s*|fotokopi\s+|foto\s+copy\s+|scan\s+)?e?-?ktp\b/gi
  },
  {
    id: "doc-kk",
    subType: "document",
    label: "Fotokopi Kartu Keluarga (KK)",
    pattern: /\b(?:fc\.?\s*|fotokopi\s+|foto\s+copy\s+)?(?:kartu keluarga|kk)\b/i,
    stripPattern: /\b(?:fc\.?\s*|fotokopi\s+|foto\s+copy\s+)?(?:kartu keluarga|kk)\b/gi
  },
  {
    id: "doc-skck",
    subType: "document",
    label: "SKCK Aktif",
    pattern: /\bskck(?:\s+aktif)?\b/i,
    stripPattern: /\bskck(?:\s+aktif)?\b/gi
  },
  {
    id: "doc-npwp",
    subType: "document",
    label: "NPWP",
    pattern: /\bnpwp\b/i,
    stripPattern: /\bnpwp\b/gi
  },
  {
    id: "doc-ijazah",
    subType: "document",
    label: "Fotokopi / Scan Ijazah Terakhir",
    pattern: /\b(?:fc\.?\s*|fotokopi\s+|foto\s+copy\s+|scan\s+|legalisir\s+)?ijazah(?:\s+terakhir)?\b/i,
    stripPattern: /\b(?:fc\.?\s*|fotokopi\s+|foto\s+copy\s+|scan\s+|legalisir\s+)?ijazah(?:\s+terakhir)?\b/gi
  },
  {
    id: "doc-transkrip",
    subType: "document",
    label: "Transkrip Nilai",
    pattern: /\b(?:fc\.?\s*|fotokopi\s+|scan\s+)?transkrip(?:\s+nilai)?\b/i,
    stripPattern: /\b(?:fc\.?\s*|fotokopi\s+|scan\s+)?transkrip(?:\s+nilai)?\b/gi
  },
  {
    id: "doc-pas-foto",
    subType: "document",
    label: "Pas Foto Terbaru",
    pattern: /\bpas\s*foto(?:\s*(?:terbaru|berwarna|3x4|4x6|2x3))?\b/i,
    stripPattern: /\bpas\s*foto(?:\s*(?:terbaru|berwarna|3x4|4x6|2x3))?\b/gi
  },
  {
    id: "doc-surat-lamaran",
    subType: "document",
    label: "Surat Lamaran Kerja & CV Terbaru",
    pattern: /\b(?:surat lamaran(?:\s+kerja)?|daftar riwayat hidup)\b/i,
    stripPattern: /\b(?:surat lamaran(?:\s+kerja)?|daftar riwayat hidup)\b/gi
  },
  {
    id: "doc-sehat",
    subType: "document",
    label: "Surat Keterangan Sehat / Bebas Narkoba",
    pattern: /\b(?:surat\s+(?:keterangan\s+)?(?:sehat|dokter|bebas\s+narkoba)|skbn|mcu)\b/i,
    stripPattern: /\b(?:surat\s+(?:keterangan\s+)?(?:sehat|dokter|bebas\s+narkoba)|skbn|mcu)\b/gi
  },
  {
    id: "doc-paklaring",
    subType: "document",
    label: "Paklaring / Surat Keterangan Pengalaman Kerja",
    pattern: /\b(?:paklaring|surat\s+(?:keterangan\s+)?pengalaman\s+kerja|surat\s+referensi)\b/i,
    stripPattern: /\b(?:paklaring|surat\s+(?:keterangan\s+)?pengalaman\s+kerja|surat\s+referensi)\b/gi
  },
  {
    id: "doc-bpjs",
    subType: "document",
    label: "Kartu BPJS Kesehatan / Ketenagakerjaan",
    pattern: /\b(?:kartu\s+)?bpjs(?:\s+(?:kesehatan|ketenagakerjaan))?\b/i,
    stripPattern: /\b(?:kartu\s+)?bpjs(?:\s+(?:kesehatan|ketenagakerjaan))?\b/gi
  },
  {
    id: "doc-vaksin",
    subType: "document",
    label: "Sertifikat Vaksin",
    pattern: /\bsertifikat\s+vaksin(?:\s+covid(?:-?19)?)?\b/i,
    stripPattern: /\bsertifikat\s+vaksin(?:\s+covid(?:-?19)?)?\b/gi
  },
  {
    id: "doc-str-sip",
    subType: "document",
    label: "STR / SIP Aktif (Profesi Kesehatan)",
    pattern: /\b(?:str|sip)(?:\s+aktif)?\b/i,
    stripPattern: /\b(?:str|sip)(?:\s+aktif)?\b/gi
  },

  // Demografi (demographic)
  {
    id: "demo-usia",
    subType: "demographic",
    label: "Batas Usia Pelamar",
    pattern: /\b(?:usia|umur|age)\s*(?:maksimal|maks\.?|max\.?|minimal|min\.?|antara)?\s*\d{2}(?:\s*(?:-|s\.?d\.?|hingga|sampai)\s*\d{2})?\s*(?:tahun|thn|th|years)?\b/i
  },
  {
    id: "demo-gender",
    subType: "demographic",
    label: "Persyaratan Jenis Kelamin",
    pattern: /\b(?:pria\s*(?:\/|atau)?\s*wanita|laki-laki\s*(?:\/|atau)?\s*perempuan|khusus\s+(?:pria|wanita|laki-laki|perempuan)|(?:male|female)\s+only)\b/i
  },
  {
    id: "demo-marital",
    subType: "demographic",
    label: "Status Pernikahan",
    pattern: /\b(?:belum\s+menikah|single|status\s+pernikahan)\b/i
  },

  // Fisik (physical)
  {
    id: "phys-height",
    subType: "physical",
    label: "Syarat Tinggi / Berat Badan",
    pattern: /\b(?:tinggi\s+badan|berat\s+badan)\b[^\n.;]*/i
  },
  {
    id: "phys-appearance",
    subType: "physical",
    label: "Tidak Buta Warna / Berpenampilan Menarik",
    pattern: /\b(?:tidak\s+buta\s+warna|berpenampilan\s+menarik|good\s+looking|tidak\s+bertato|bebas\s+tato)\b/i
  },

  // Logistik & Mobilitas (logistics)
  {
    id: "log-sim",
    subType: "logistics",
    label: "Kepemilikan SIM / Kendaraan Pribadi",
    pattern: /\b(?:memiliki\s+)?sim\s*(?:a|b|b1|b2|c)(?:\s*(?:\/|dan|,)\s*(?:a|b|c))*\b|\bkendaraan\s+pribadi\b/i,
    stripPattern: /\bsim\s*(?:a|b|b1|b2|c)(?:\s*(?:\/|dan|,)\s*(?:a|b|c))*\b/gi
  },
  {
    id: "log-domisili",
    subType: "logistics",
    label: "Syarat Domisili / Penempatan",
    pattern: /\b(?:domisili|berdomisili|bersedia\s+ditempatkan)\b[^\n.;]*/i
  },
  {
    id: "log-shift",
    subType: "logistics",
    label: "Ketersediaan Shift / Lembur / Gabung Segera",
    pattern: /\b(?:bersedia\s+(?:bekerja\s+)?(?:shift|lembur|rolling|dinas\s+luar|bergabung\s+segera)|join\s+immediately)\b/i
  }
];

export type HardSkillEntry = {
  label: string;
  terms: string[];
};

export const HARD_SKILL_TAXONOMY: HardSkillEntry[] = [
  // Office & Productivity
  { label: "Microsoft Office", terms: ["ms. office", "ms office", "microsoft office"] },
  { label: "Microsoft Excel", terms: ["excel", "ms excel", "ms. excel", "microsoft excel", "vlookup", "xlookup", "pivot table", "pivottable"] },
  { label: "Microsoft Word", terms: ["ms word", "ms. word", "microsoft word"] },
  { label: "Microsoft PowerPoint", terms: ["powerpoint", "ms powerpoint", "ms. powerpoint", "microsoft powerpoint"] },
  { label: "Google Workspace", terms: ["google workspace", "google sheets", "google docs", "spreadsheet"] },

  // Web & Software Engineering
  { label: "HTML", terms: ["html", "html5"] },
  { label: "CSS", terms: ["css", "css3"] },
  { label: "JavaScript", terms: ["javascript", "js"] },
  { label: "TypeScript", terms: ["typescript", "ts"] },
  { label: "React.js", terms: ["react.js", "reactjs", "react"] },
  { label: "Next.js", terms: ["next.js", "nextjs"] },
  { label: "Vue.js", terms: ["vue.js", "vuejs", "vue"] },
  { label: "Angular", terms: ["angular"] },
  { label: "Node.js", terms: ["node.js", "nodejs"] },
  { label: "Express.js", terms: ["express.js", "expressjs"] },
  { label: "Tailwind CSS", terms: ["tailwind css", "tailwindcss", "tailwind"] },
  { label: "PHP", terms: ["php"] },
  { label: "Laravel", terms: ["laravel"] },
  { label: "Python", terms: ["python"] },
  { label: "Java", terms: ["java"] },
  { label: "Spring Boot", terms: ["spring boot"] },
  { label: "Go (Golang)", terms: ["golang"] },
  { label: "C#", terms: ["c#"] },
  { label: ".NET", terms: [".net", "asp.net"] },
  { label: "Flutter", terms: ["flutter", "dart"] },
  { label: "React Native", terms: ["react native"] },
  { label: "RESTful API", terms: ["restful api", "rest api", "backend api", "web api"] },
  { label: "GraphQL", terms: ["graphql"] },
  { label: "SQL", terms: ["sql"] },
  { label: "MySQL", terms: ["mysql"] },
  { label: "PostgreSQL", terms: ["postgresql", "postgres"] },
  { label: "MongoDB", terms: ["mongodb"] },
  { label: "Redis", terms: ["redis"] },
  { label: "Git", terms: ["git", "github", "gitlab"] },
  { label: "Docker", terms: ["docker"] },
  { label: "Kubernetes", terms: ["kubernetes"] },
  { label: "CI/CD", terms: ["ci/cd", "github actions"] },
  { label: "AWS", terms: ["aws", "amazon web services"] },
  { label: "Google Cloud Platform", terms: ["gcp", "google cloud"] },
  { label: "Microsoft Azure", terms: ["azure"] },
  { label: "Unit & Automated Testing", terms: ["unit testing", "automated testing", "jest", "playwright", "cypress", "selenium"] },
  { label: "Quality Assurance (QA)", terms: ["quality assurance", "qa", "manual testing", "software testing"] },

  // IT Support, Networking, & Hospital IT
  { label: "SIMRS / Rekam Medis Elektronik", terms: ["simrs", "sistem informasi manajemen rumah sakit", "rekam medis elektronik", "rme", "emr"] },
  { label: "Jaringan LAN/WAN", terms: ["lan/wan", "jaringan komputer", "jaringan lan", "mikrotik", "cisco", "tcp/ip", "instalasi jaringan"] },
  { label: "Troubleshooting Hardware & Software", terms: ["troubleshooting", "troubleshooting hardware", "perbaikan komputer", "maintenance komputer", "hardware troubleshooting"] },
  { label: "IT Helpdesk & Technical Support", terms: ["helpdesk", "it support", "technical support"] },
  { label: "Windows & Linux Administration", terms: ["windows server", "linux", "active directory", "mikrotik"] },
  { label: "CCTV & IP PBX", terms: ["cctv", "pabx", "ip pbx", "printer sharing"] },

  // Data, BI & AI
  { label: "Data Analysis", terms: ["data analysis", "analisis data", "analisa data", "data analytics", "pengolahan data"] },
  { label: "Data Visualization", terms: ["data visualization", "visualisasi data", "dashboard"] },
  { label: "Power BI", terms: ["power bi"] },
  { label: "Tableau", terms: ["tableau"] },
  { label: "Looker Studio", terms: ["looker studio", "google data studio"] },
  { label: "Machine Learning", terms: ["machine learning", "scikit-learn", "tensorflow", "pytorch"] },
  { label: "Statistics", terms: ["statistik", "statistika", "statistics", "spss", "r programming"] },

  // Admin, Gudang, Operasional, ERP
  { label: "Administrasi Gudang & Stock Opname", terms: ["stock opname", "administrasi gudang", "warehouse management", "inventory management", "pengelolaan stok", "wms"] },
  { label: "Pengarsipan & Document Control", terms: ["pengarsipan", "kearsipan", "document control", "filing"] },
  { label: "Data Entry", terms: ["data entry", "input data"] },
  { label: "SAP / ERP", terms: ["sap", "erp", "odoo", "oracle"] },
  { label: "Supply Chain & Logistics", terms: ["supply chain", "logistik", "logistics", "procurement", "purchasing", "surat jalan"] },

  // Keuangan, Akuntansi & Pajak
  { label: "Laporan Keuangan", terms: ["laporan keuangan", "financial reporting", "pembukuan", "bookkeeping"] },
  { label: "Akuntansi & Jurnal", terms: ["akuntansi", "accounting", "jurnal umum", "rekonsiliasi bank", "bank reconciliation"] },
  { label: "Software Akuntansi (Accurate/Zahir/MYOB)", terms: ["accurate", "zahir", "myob", "jurnal.id", "mekari jurnal"] },
  { label: "Perpajakan (Brevet / e-Faktur)", terms: ["perpajakan", "brevet", "e-faktur", "efaktur", "spt", "pph", "ppn"] },

  // Digital Marketing, Design & Content
  { label: "UI/UX Design", terms: ["ui/ux", "ui ux", "user research", "wireframe", "wireframing", "prototype", "prototyping"] },
  { label: "Figma", terms: ["figma"] },
  { label: "Canva", terms: ["canva"] },
  { label: "Adobe Photoshop / Illustrator", terms: ["photoshop", "illustrator", "adobe premiere", "capcut", "coreldraw"] },
  { label: "SEO", terms: ["seo", "search engine optimization"] },
  { label: "SEM / Paid Ads", terms: ["sem", "search engine marketing", "google ads", "meta ads", "facebook ads", "tiktok ads"] },
  { label: "Google Analytics", terms: ["google analytics", "ga4"] },
  { label: "Digital Marketing", terms: ["digital marketing", "pemasaran digital", "content marketing"] },
  { label: "Social Media Management", terms: ["social media", "media sosial", "social media management"] },
  { label: "Copywriting", terms: ["copywriting", "content writing", "penulisan konten"] },

  // HR, Project, & Customer Service
  { label: "Project Management", terms: ["project management", "manajemen proyek", "scrum", "agile", "jira", "trello"] },
  { label: "HRIS & Payroll", terms: ["hris", "payroll", "penggajian", "talenta", "mekari talenta"] },
  { label: "Recruitment & Talent Acquisition", terms: ["recruitment", "rekrutmen", "talent acquisition", "screening cv"] },
  { label: "CRM (Salesforce/HubSpot)", terms: ["crm", "salesforce", "hubspot"] },
  { label: "Customer Service", terms: ["customer service", "customer support", "layanan pelanggan", "front office"] }
];

export const SOFT_SKILL_TAXONOMY: HardSkillEntry[] = [
  { label: "Komunikasi", terms: ["komunikasi", "communication", "komunikatif", "presentasi", "public speaking"] },
  { label: "Kerja Tim", terms: ["kerja tim", "kerjasama tim", "kerja sama", "teamwork", "team work", "kolaborasi", "collaboration"] },
  { label: "Teliti & Cermat", terms: ["teliti", "ketelitian", "detail oriented", "detail-oriented", "attention to detail", "cermat"] },
  { label: "Pemecahan Masalah", terms: ["pemecahan masalah", "problem solving", "analytical thinking", "berpikir analitis", "critical thinking"] },
  { label: "Kepemimpinan", terms: ["kepemimpinan", "leadership", "koordinator", "team lead"] },
  { label: "Manajemen Waktu", terms: ["manajemen waktu", "time management", "disiplin", "tepat waktu"] },
  { label: "Adaptif & Cepat Belajar", terms: ["adaptif", "adaptability", "cepat beradaptasi", "fleksibel", "fast learner"] },
  { label: "Inisiatif & Mandiri", terms: ["inisiatif", "proaktif", "proactive", "ownership", "mandiri"] },
  { label: "Cekatan & Tahan Tekanan", terms: ["cekatan", "tanggap", "bekerja di bawah tekanan", "work under pressure"] },
  { label: "Jujur & Bertanggung Jawab", terms: ["jujur", "integritas", "integrity", "bertanggung jawab", "amanah"] },
  { label: "Negosiasi & Stakeholder Management", terms: ["negosiasi", "negotiation", "stakeholder management"] }
];

export type DomainTemplate = {
  domain: string;
  triggers: RegExp;
  competencies: Array<{ skill: string; reason: string }>;
};

export const IMPLICIT_DOMAIN_TEMPLATES: DomainTemplate[] = [
  {
    domain: "IT Rumah Sakit / Kesehatan",
    triggers: /\b(?:it\s+(?:rumah\s+sakit|rs|rsud|rsia|klinik|hospital)|simrs|rekam\s+medis\s+elektronik|it\s+support\s+rumah\s+sakit)\b/i,
    competencies: [
      { skill: "Troubleshooting Hardware & Printer", reason: "Dibutuhkan untuk menangani kendala PC, printer gelang/label, dan perangkat loket harian." },
      { skill: "Jaringan LAN/WAN & Wi-Fi", reason: "Koneksi antar-unit layanan medis (IGD, poli, farmasi, kasir) bergantung pada jaringan lokal yang stabil." },
      { skill: "SIMRS / Rekam Medis Elektronik", reason: "Sistem informasi rumah sakit adalah aplikasi inti yang dikelola tim IT fasilitas kesehatan." },
      { skill: "IT Helpdesk & Dukungan Pengguna", reason: "Tim IT RS rutin membantu tenaga medis dan staf administrasi saat terjadi kendala sistem." },
      { skill: "SQL / Basis Data Dasar", reason: "Umumnya dipakai untuk pengecekan data pasien, antrean, dan penarikan laporan operasional." }
    ]
  },
  {
    domain: "Admin Gudang & Logistik",
    triggers: /\b(?:admin(?:istrasi)?\s+gudang|warehouse\s+admin|staf\s+gudang|inventory\s+admin|logistik)\b/i,
    competencies: [
      { skill: "Stock Opname & Pencatatan Stok", reason: "Tugas inti admin gudang untuk memastikan kesesuaian stok fisik dan catatan sistem." },
      { skill: "Microsoft Excel (VLOOKUP & PivotTable)", reason: "Dipakai harian untuk rekap keluar-masuk barang dan laporan selisih stok." },
      { skill: "Administrasi Surat Jalan & Delivery Order", reason: "Dokumen standar penerimaan dan pengiriman barang di gudang." },
      { skill: "Pengelolaan FIFO / FEFO", reason: "Metode perputaran barang agar produk tidak kedaluwarsa atau menumpuk." },
      { skill: "Sistem Inventory / WMS / ERP", reason: "Banyak gudang memakai software inventory atau modul gudang ERP untuk pencatatan transaksi." }
    ]
  },
  {
    domain: "Staf Administrasi & Perkantoran",
    triggers: /\b(?:staf\s+administrasi|admin(?:istrasi)?\s+(?:kantor|umum|operasional)|general\s+admin|office\s+admin)\b/i,
    competencies: [
      { skill: "Microsoft Office (Word, Excel, PowerPoint)", reason: "Alat kerja harian untuk surat-menyurat, rekap tabel, dan materi rapat." },
      { skill: "Pengarsipan Dokumen Fisik & Digital", reason: "Memudahkan pencarian kontrak, invoice, dan dokumen operasional kantor." },
      { skill: "Data Entry & Rekapitulasi Laporan", reason: "Keakuratan pencatatan data transaksi, absensi, dan laporan berkala." },
      { skill: "Korespondensi Email & Notulensi Rapat", reason: "Mendukung komunikasi internal antar divisi maupun dengan mitra eksternal." }
    ]
  },
  {
    domain: "Staf Keuangan & Akuntansi",
    triggers: /\b(?:staf\s+keuangan|finance\s+staff|accounting\s+staff|staf\s+akuntansi|akuntan|kasir\s+administrasi)\b/i,
    competencies: [
      { skill: "Pembukuan & Jurnal Akuntansi", reason: "Fondasi pencatatan transaksi harian perusahaan secara rapi dan seimbang." },
      { skill: "Microsoft Excel (Formula Keuangan)", reason: "Wajib untuk rekonsiliasi data, arus kas, dan laporan keuangan." },
      { skill: "Rekonsiliasi Bank & Pengelolaan Kas Kecil", reason: "Memastikan saldo rekening dan kas operasional cocok dengan bukti transaksi." },
      { skill: "Software Akuntansi (Accurate / Zahir / SAP)", reason: "Perusahaan lokal umumnya memakai Accurate, Zahir, atau modul keuangan ERP." },
      { skill: "Dasar Perpajakan (e-Faktur / PPh / PPN)", reason: "Sering melekat pada posisi finance dan accounting di Indonesia." }
    ]
  },
  {
    domain: "Digital Marketing & Media Sosial",
    triggers: /\b(?:digital\s+marketing|social\s+media|content\s+creator|pemasaran\s+digital)\b/i,
    competencies: [
      { skill: "Manajemen Konten Media Sosial", reason: "Perencanaan kalender konten, penjadwalan unggahan, dan interaksi audiens." },
      { skill: "Copywriting", reason: "Menulis takarir (caption), naskah iklan, dan pesan kampanye yang jelas." },
      { skill: "Meta Ads / Google Ads", reason: "Pengelolaan kampanye iklan berbayar dan pemantauan biaya akuisisi." },
      { skill: "Google Analytics / Insight Media Sosial", reason: "Membaca jangkauan, klik, dan tingkat konversi konten." },
      { skill: "Canva / Desain Konten Dasar", reason: "Produksi visual harian untuk kebutuhan media sosial dan promosi." }
    ]
  },
  {
    domain: "Customer Service & Front Office",
    triggers: /\b(?:customer\s+service|customer\s+support|front\s+office|layanan\s+pelanggan|resepsionis|cs\s+online)\b/i,
    competencies: [
      { skill: "Penanganan Keluhan Pelanggan", reason: "Menyelesaikan kendala pelanggan secara tenang dan sesuai SOP." },
      { skill: "Komunikasi Multi-Kanal (Chat, Telepon, Tatap Muka)", reason: "Respons cepat dan sopan di WhatsApp bisnis, marketplace, maupun loket." },
      { skill: "Pencatatan Tiket & CRM", reason: "Mendokumentasikan riwayat pertanyaan dan status penyelesaian masalah pelanggan." },
      { skill: "Microsoft Office & Data Entry", reason: "Rekap laporan harian pertanyaan atau pesanan pelanggan." }
    ]
  },
  {
    domain: "HR & Personalia",
    triggers: /\b(?:human\s+resources|hrd|hr\s+staff|staf\s+hr|personalia|talent\s+acquisition|rekrutmen)\b/i,
    competencies: [
      { skill: "Administrasi Rekrutmen & Screening CV", reason: "Menyaring kandidat, menjadwalkan wawancara, dan mengelola pipeline pelamar." },
      { skill: "Pengelolaan Data Karyawan (HRIS)", reason: "Pembaruan database kontrak, cuti, dan absensi karyawan." },
      { skill: "Administrasi BPJS & Kehadiran", reason: "Proses pendaftaran dan pelaporan kepesertaan serta rekap lembur." },
      { skill: "Dasar Penggajian (Payroll)", reason: "Menghitung komponen gaji, tunjangan, dan potongan secara akurat." }
    ]
  },
  {
    domain: "Software / Web Developer",
    triggers: /\b(?:software\s+engineer|web\s+developer|frontend|backend|full\s*-?stack|programmer|it\s+developer)\b/i,
    competencies: [
      { skill: "Git & Version Control", reason: "Standar kolaborasi kode dan pengelolaan riwayat perubahan di tim engineering." },
      { skill: "RESTful API", reason: "Pertukaran data antara antarmuka aplikasi dan layanan backend." },
      { skill: "SQL / Basis Data Relasional", reason: "Penyimpanan dan kueri data aplikasi secara terstruktur." },
      { skill: "Unit & Automated Testing", reason: "Menjaga fitur tidak rusak saat ada pembaruan kode." }
    ]
  },
  {
    domain: "Data Analyst / Business Intelligence",
    triggers: /\b(?:data\s+analyst|business\s+intelligence|analis\s+data|data\s+analytics)\b/i,
    competencies: [
      { skill: "SQL", reason: "Pengambilan dan agregasi data langsung dari basis data perusahaan." },
      { skill: "Microsoft Excel / Spreadsheet", reason: "Analisis cepat, pivot table, dan pembersihan dataset ukuran menengah." },
      { skill: "Visualisasi Data (Power BI / Looker Studio / Tableau)", reason: "Menyajikan tren dan KPI dalam dasbor yang mudah dibaca manajemen." },
      { skill: "Data Cleaning & Statistik Dasar", reason: "Memastikan data bebas duplikasi dan siap dianalisis." }
    ]
  },
  {
    domain: "UI/UX & Desain Grafis",
    triggers: /\b(?:ui\/?ux|product\s+designer|graphic\s+designer|desainer\s+grafis)\b/i,
    competencies: [
      { skill: "Figma", reason: "Alat standar industri untuk merancang wireframe, UI, dan prototipe interaktif." },
      { skill: "Wireframing & Prototyping", reason: "Menguji alur pengguna sebelum masuk ke tahap pengembangan." },
      { skill: "User Research & Usability Testing", reason: "Memvalidasi kemudahan penggunaan antarmuka berdasarkan umpan balik pengguna." }
    ]
  }
];
