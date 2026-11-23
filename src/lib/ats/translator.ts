import type {
  CertificationItem,
  Education,
  OrganizationItem,
  ProjectItem,
  ResumeProfile,
  WorkExperience
} from "@/types/resume";
import { detectLanguage } from "@/lib/ats/normalizer";
import { containsTermBoundary, normalizeForMatch } from "@/lib/ats/synonyms";

const INDONESIAN_MARKERS = [
  "yang",
  "dengan",
  "untuk",
  "menggunakan",
  "memakai",
  "pada",
  "dari",
  "dalam",
  "serta",
  "lulusan",
  "proyek",
  "pengalaman",
  "jaringan",
  "magang",
  "mengembangkan",
  "membangun",
  "merancang",
  "mengelola",
  "menyusun",
  "mengolah",
  "mengkoordinasikan",
  "bekerja",
  "bersama",
  "sebagai",
  "perusahaan",
  "pelatihan",
  "himpunan",
  "mahasiswa",
  "komputer",
  "informatika",
  "sistem",
  "keuangan",
  "gudang",
  "sekarang",
  "studi",
  "skripsi",
  "tugas",
  "komunikasi",
  "kerja tim",
  "teliti",
  "pemecahan masalah",
  "manajemen",
  "perangkat",
  "laporan",
  "rekam medis",
  "rumah sakit",
  "aplikasi",
  "kuliah",
  "mandiri",
  "belajar",
  "pemrograman",
  "dasar",
  "pengembangan",
  "pemrosesan",
  "visualisasi",
  "analisis",
  "alat",
  "keahlian"
];

const ENGLISH_MARKERS = [
  "the",
  "and",
  "with",
  "for",
  "using",
  "that",
  "built",
  "designed",
  "developed",
  "engineered",
  "integrated",
  "managed",
  "coordinated",
  "facilitated",
  "guided",
  "delivered",
  "produced",
  "assisted",
  "implemented",
  "led",
  "practicing",
  "graduate",
  "experience",
  "developer",
  "engineer",
  "intern",
  "assistant",
  "founder",
  "coordinator",
  "staff",
  "community",
  "bachelor",
  "master",
  "diploma",
  "vocational",
  "high school",
  "informatics",
  "software engineering",
  "computer science",
  "university",
  "present",
  "current",
  "programming",
  "frameworks",
  "libraries",
  "database",
  "other",
  "open to",
  "hands on",
  "full time"
];

const hasIndonesianMarkers = (text: string): boolean => {
  const norm = normalizeForMatch(text);
  if (!norm) return false;
  return INDONESIAN_MARKERS.some((marker) => containsTermBoundary(norm, marker));
};

const hasEnglishMarkers = (text: string): boolean => {
  const norm = normalizeForMatch(text);
  if (!norm) return false;
  return ENGLISH_MARKERS.some((marker) => containsTermBoundary(norm, marker));
};

const shouldSkipTranslation = (text: string): boolean => {
  const clean = text.trim();
  if (!clean) return true;
  if (hasIndonesianMarkers(clean)) return false;
  return detectLanguage(clean) === "en";
};

const shouldSkipIndonesianTranslation = (text: string): boolean => {
  const clean = text.trim();
  if (!clean) return true;
  if (hasEnglishMarkers(clean)) return false;
  if (hasIndonesianMarkers(clean)) return true;
  return detectLanguage(clean) === "id";
};

const replaceBoundaryPhrases = (text: string, pairs: Array<[string, string]>): string => {
  let out = text;
  const sorted = [...pairs].sort((a, b) => b[0].length - a[0].length);

  for (const [src, target] of sorted) {
    const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const regex = new RegExp(`(?<![a-z0-9+#])${escaped}(?![a-z0-9+#])`, "gi");
    out = out.replace(regex, target);
  }

  return out;
};

const PERIOD_PAIRS: Array<[string, string]> = [
  ["januari", "Jan"],
  ["februari", "Feb"],
  ["maret", "Mar"],
  ["april", "Apr"],
  ["mei", "May"],
  ["juni", "Jun"],
  ["juli", "Jul"],
  ["agustus", "Aug"],
  ["agust", "Aug"],
  ["agu", "Aug"],
  ["september", "Sep"],
  ["oktober", "Oct"],
  ["okt", "Oct"],
  ["november", "Nov"],
  ["desember", "Dec"],
  ["des", "Dec"],
  ["sekarang", "Present"],
  ["saat ini", "Present"]
];

export const translatePeriodToEnglish = (period: string): string => {
  if (!period.trim()) return period;
  return replaceBoundaryPhrases(period, PERIOD_PAIRS).replace(/\s*[-\u2013\u2014]\s*/g, " - ");
};

const PERIOD_TO_ID_PAIRS: Array<[string, string]> = [
  ["january", "Januari"],
  ["february", "Februari"],
  ["march", "Maret"],
  ["april", "April"],
  ["may", "Mei"],
  ["june", "Juni"],
  ["july", "Juli"],
  ["august", "Agu"],
  ["aug", "Agu"],
  ["september", "Sep"],
  ["october", "Okt"],
  ["oct", "Okt"],
  ["november", "Nov"],
  ["december", "Des"],
  ["dec", "Des"],
  ["present", "Sekarang"],
  ["current", "Sekarang"],
  ["ongoing", "Sekarang"],
  ["now", "Sekarang"]
];

export const translatePeriodToIndonesian = (period: string): string => {
  if (!period.trim()) return period;
  return replaceBoundaryPhrases(period, PERIOD_TO_ID_PAIRS).replace(/\s*[-\u2013\u2014]\s*/g, " - ");
};

const DEGREE_MAP: Array<[string, string]> = [
  ["sarjana komputer (s.kom)", "Bachelor of Computer Science (S.Kom)"],
  ["sarjana komputer", "Bachelor of Computer Science"],
  ["sarjana teknik", "Bachelor of Engineering"],
  ["sarjana ekonomi", "Bachelor of Economics"],
  ["sarjana sains", "Bachelor of Science"],
  ["sarjana pendidikan", "Bachelor of Education"],
  ["sarjana terapan", "Applied Bachelor's Degree"],
  ["sekolah menengah kejuruan", "Vocational High School"],
  ["sekolah menengah atas", "Senior High School"],
  ["diploma iii", "Associate Degree (D3)"],
  ["diploma 3", "Associate Degree (D3)"],
  ["s1", "Bachelor's Degree (S1)"],
  ["d4", "Applied Bachelor's Degree (D4)"],
  ["d3", "Associate Degree (D3)"],
  ["s2", "Master's Degree (S2)"],
  ["smk", "Vocational High School (SMK)"],
  ["sma", "Senior High School (SMA)"],
  ["sarjana", "Bachelor's Degree"]
];

const MAJOR_MAP: Array<[string, string]> = [
  ["teknik komputer dan jaringan", "Computer & Network Engineering"],
  ["rekam medis dan informasi kesehatan", "Medical Records & Health Information"],
  ["desain komunikasi visual", "Visual Communication Design"],
  ["rekayasa perangkat lunak", "Software Engineering"],
  ["administrasi perkantoran", "Office Administration"],
  ["administrasi rumah sakit", "Hospital Administration"],
  ["manajemen informatika", "Informatics Management"],
  ["teknik informatika", "Informatics Engineering"],
  ["kesehatan masyarakat", "Public Health"],
  ["ekonomi pembangunan", "Development Economics"],
  ["keuangan dan perbankan", "Finance & Banking"],
  ["administrasi bisnis", "Business Administration"],
  ["teknologi informasi", "Information Technology"],
  ["manajemen bisnis", "Business Management"],
  ["sistem informasi", "Information Systems"],
  ["teknik industri", "Industrial Engineering"],
  ["teknik komputer", "Computer Engineering"],
  ["ilmu komunikasi", "Communication Science"],
  ["teknik elektro", "Electrical Engineering"],
  ["ilmu komputer", "Computer Science"],
  ["teknik mesin", "Mechanical Engineering"],
  ["teknik sipil", "Civil Engineering"],
  ["keperawatan", "Nursing"],
  ["rekam medis", "Medical Records"],
  ["akuntansi", "Accounting"],
  ["manajemen", "Management"],
  ["statistika", "Statistics"],
  ["matematika", "Mathematics"],
  ["psikologi", "Psychology"],
  ["farmasi", "Pharmacy"],
  ["hukum", "Law"]
];

const COURSEWORK_MAP: Array<[string, string]> = [
  ["algoritma dan struktur data", "Algorithms & Data Structures"],
  ["analisis dan perancangan sistem", "Systems Analysis & Design"],
  ["pemrograman berorientasi objek", "Object-Oriented Programming"],
  ["interaksi manusia dan komputer", "Human-Computer Interaction"],
  ["manajemen sumber daya manusia", "Human Resource Management"],
  ["rekayasa perangkat lunak", "Software Engineering"],
  ["manajemen operasional", "Operations Management"],
  ["manajemen pemasaran", "Marketing Management"],
  ["manajemen keuangan", "Financial Management"],
  ["kecerdasan buatan", "Artificial Intelligence"],
  ["pembelajaran mesin", "Machine Learning"],
  ["keamanan informasi", "Information Security"],
  ["akuntansi keuangan", "Financial Accounting"],
  ["keamanan siber", "Cybersecurity"],
  ["akuntansi biaya", "Cost Accounting"],
  ["jaringan komputer", "Computer Networks"],
  ["sistem informasi", "Information Systems"],
  ["pemrograman web", "Web Development"],
  ["riset pemasaran", "Market Research"],
  ["sistem operasi", "Operating Systems"],
  ["struktur data", "Data Structures"],
  ["basis data", "Database Systems"],
  ["perpajakan", "Taxation"]
];

const GENERAL_PROSE_PAIRS: Array<[string, string]> = [
  // Full sample & common Indonesian CV clauses (longest-first for natural grammar)
  [
    "mengembangkan 6 modul antarmuka pendaftaran pasien menggunakan react.js dan typescript yang memangkas waktu input data petugas hingga",
    "Developed 6 patient registration UI modules using React.js and TypeScript, reducing staff data entry time by up to"
  ],
  [
    "mengintegrasikan restful api internal bersama tim backend dan menulis dokumentasi komponen untuk",
    "Integrated internal RESTful APIs with the backend team and authored component documentation for"
  ],
  [
    "membangun sistem pelacakan 180+ perangkat laboratorium menggunakan next.js dan postgresql untuk menggantikan pencatatan manual di spreadsheet",
    "Built a tracking system for 180+ laboratory devices using Next.js and PostgreSQL to replace manual spreadsheet records"
  ],
  [
    "merancang fitur rekap laporan peminjaman bulanan otomatis dalam format excel dan pdf bagi kepala laboratorium",
    "Designed automated monthly borrowing summary reports in Excel and PDF formats for the head of laboratory"
  ],
  [
    "mengonfigurasi topologi lan/wan sederhana serta menangani troubleshooting koneksi dan printer untuk 35 komputer ruang praktikum",
    "Configured basic LAN/WAN network topologies and resolved connectivity and printer issues for 35 laboratory workstations"
  ],
  [
    "mengkoordinasikan 4 seri lokakarya pemrograman web dan penggunaan git yang diikuti 160 peserta mahasiswa lintas angkatan",
    "Coordinated a 4-part web programming and Git workshop series attended by 160 cross-cohort university students"
  ],
  [
    "menyusun jadwal mentor sebaya dan materi modul belajar bersama 6 pengurus divisi",
    "Prepared peer mentoring schedules and study module materials alongside 6 division committee members"
  ],
  [
    "lulusan s1 teknik informatika",
    "Bachelor of Informatics Engineering graduate"
  ],
  ["lulusan s1", "Bachelor's graduate in"],
  ["ipk", "GPA"],
  [
    "dengan pengalaman magang msib sebagai junior web developer dan asisten laboratorium jaringan",
    "with MSIB internship experience as a Junior Web Developer and networking laboratory assistant"
  ],
  [
    "terbiasa membangun antarmuka web dengan react dan typescript, mengelola basis data sql, serta menangani troubleshooting perangkat keras dan jaringan lokal",
    "Proficient in building web interfaces with React and TypeScript, managing SQL databases, and handling hardware and local network troubleshooting"
  ],
  [
    "dengan pengalaman 3+ tahun mengembangkan aplikasi web berskala enterprise dan integrasi sistem",
    "with 3+ years of experience developing enterprise-scale web applications and system integrations"
  ],
  [
    "berpengalaman membangun platform mikroservis, optimasi query database, dan kolaborasi lintas fungsi dengan fokus keandalan serta performa sistem",
    "Experienced in building microservice platforms, database query optimization, and cross-functional collaboration focused on system reliability and performance"
  ],
  [
    "merancang arsitektur web platform terpusat menggunakan next.js dan node.js yang memproses lebih dari 50.000 transaksi harian dengan latensi di bawah 200ms",
    "Architected a centralized web platform using Next.js and Node.js processing over 50,000 daily transactions with latency under 200ms"
  ],
  [
    "mengembangkan integrasi notifikasi real-time via whatsapp business api dan webhook untuk alur revisi dokumen internal",
    "Developed real-time notification integrations via WhatsApp Business API and webhooks for internal document revision workflows"
  ],
  [
    "mengoptimalkan query postgresql dan redis caching sehingga beban server turun hingga 40%",
    "Optimized PostgreSQL queries and Redis caching, reducing server load by up to 40%"
  ],
  [
    "memimpin pengembangan aplikasi pelaporan infrastruktur publik berbasis peta gis yang digunakan oleh lebih dari 100.000 warga",
    "Led development of a GIS map-based public infrastructure reporting application used by over 100,000 citizens"
  ],
  [
    "bekerja sama erat dengan pemangku kepentingan pemerintahan untuk memastikan kepatuhan regulasi privasi data dan standar keamanan",
    "Collaborated closely with government stakeholders to ensure data privacy regulatory compliance and security standards"
  ],
  [
    "mengembangkan fitur antarmuka dan api menggunakan laravel, react.js, tailwind css, dan mysql",
    "Developed user interface features and APIs using Laravel, React.js, Tailwind CSS, and MySQL"
  ],
  [
    "membangun modul dashboard analitik internal menggunakan react.js dan tailwind css untuk visualisasi metrik performa operasional tim",
    "Built internal analytics dashboard modules using React.js and Tailwind CSS to visualize team operational performance metrics"
  ],
  [
    "menulis unit testing dan integration testing dengan coverage 85%, mengurangi regresi bug saat rilis produksi",
    "Authored unit and integration tests achieving 85% coverage, reducing production release bug regressions"
  ],
  [
    "membangun prototipe portal antrean multi-loket dengan pembaruan status waktu nyata dan ekspor laporan harian",
    "Built a multi-counter queue portal prototype with real-time status updates and daily report exports"
  ],
  [
    "menyelenggarakan lokakarya pemrograman bulanan dan menyusun pedoman kontribusi kode bagi kontributor baru",
    "Organized monthly programming workshops and authored code contribution guidelines for new contributors"
  ],

  // Roles, titles, contexts, orgs, thesis & awards
  ["sistem informasi antrean dan rekam medis klinik berbasis web", "Web-Based Clinic Queue and Medical Records Information System"],
  ["aplikasi inventaris dan peminjaman alat laboratorium", "Laboratory Equipment Inventory and Lending Application"],
  ["simulasi jaringan lokal dan monitoring tiket helpdesk", "Local Area Network Simulation and Helpdesk Ticket Monitoring"],
  ["sistem monitoring antrean layanan terpadu", "Integrated Service Queue Monitoring System"],
  ["finalis lomba pengembangan aplikasi kampus", "Finalist, Campus Application Development Competition"],
  ["himpunan mahasiswa teknik informatika", "Informatics Engineering Student Association"],
  ["koordinator divisi akademik & pelatihan", "Coordinator of Academic & Training Division"],
  ["koordinator divisi akademik dan pelatihan", "Coordinator of Academic & Training Division"],
  ["komunitas open source indonesia", "Indonesian Open Source Community"],
  ["dinas komunikasi dan informatika", "Department of Communication and Informatics"],
  ["proyek mata kuliah jaringan", "Computer Networks Course Project"],
  ["proyek tugas akhir", "Undergraduate Thesis Project"],
  ["proyek mata kuliah", "Academic Course Project"],
  ["proyek kuliah", "Academic Course Project"],
  ["proyek mandiri", "Independent Project"],
  ["asisten laboratorium jaringan", "Networking Laboratory Assistant"],
  ["asisten laboratorium", "Laboratory Assistant"],
  ["asisten praktikum", "Laboratory Teaching Assistant"],
  ["staf it rumah sakit", "Hospital IT Support Staff"],
  ["it rumah sakit", "Hospital IT Support"],
  ["admin gudang", "Warehouse Administrator"],
  ["staf administrasi", "Administrative Staff"],
  ["staf keuangan", "Finance Staff"],
  ["lulusan teknik informatika", "Informatics Engineering Graduate"],
  ["himpunan mahasiswa", "Student Association"],
  ["badan eksekutif mahasiswa", "Student Executive Board"],
  ["studi kasus", "Case Study"],
  ["lulus dengan pujian", "Graduated with Honors"],
  ["penerima beasiswa", "Scholarship Recipient"],
  ["rancang bangun", "Design and Implementation of"],
  ["berbasis web", "Web-Based"],
  ["berbasis mobile", "Mobile-Based"],
  ["berbasis android", "Android-Based"],

  // Action verbs & reusable Indonesian resume vocabulary
  ["bertanggung jawab untuk", "Responsible for"],
  ["bertanggung jawab atas", "Responsible for"],
  ["bekerja sama erat dengan", "Collaborated closely with"],
  ["bekerja sama dengan", "Collaborated with"],
  ["mengkoordinasikan", "Coordinated"],
  ["mengintegrasikan", "Integrated"],
  ["mengoptimalkan", "Optimized"],
  ["mengimplementasikan", "Implemented"],
  ["menyelenggarakan", "Organized"],
  ["mengembangkan", "Developed"],
  ["mengonfigurasi", "Configured"],
  ["mempresentasikan", "Presented"],
  ["memfasilitasi", "Facilitated"],
  ["menggantikan", "replaced"],
  ["menganalisis", "Analyzed"],
  ["meningkatkan", "Improved"],
  ["memelihara", "Maintained"],
  ["memastikan", "Ensured"],
  ["melaksanakan", "Executed"],
  ["menjalankan", "Executed"],
  ["menangani", "Handled"],
  ["membangun", "Built"],
  ["merancang", "Designed"],
  ["mengelola", "Managed"],
  ["mengurangi", "Reduced"],
  ["menurunkan", "Reduced"],
  ["memangkas", "Cut"],
  ["memeriksa", "Audited"],
  ["mendukung", "Supported"],
  ["memimpin", "Led"],
  ["menyusun", "Prepared"],
  ["mengolah", "Processed"],
  ["menulis", "Authored"],
  ["membuat", "Built"],
  ["menggunakan", "using"],
  ["memakai", "using"],
  ["pencatatan stok", "inventory tracking"],
  ["stock opname", "stock opname"],
  ["laporan keuangan", "financial reports"],
  ["laporan harian", "daily reports"],
  ["laporan bulanan", "monthly reports"],
  ["perangkat keras", "hardware"],
  ["perangkat lunak", "software"],
  ["jaringan lokal", "local network"],
  ["basis data", "database"],
  ["rumah sakit", "hospital"],
  ["setiap minggu", "weekly"],
  ["setiap bulan", "monthly"],
  ["setiap hari", "daily"],
  ["di gudang", "in the warehouse"],
  ["anggota tim", "team members"],
  ["untuk", "for"],
  ["dengan", "with"],
  ["bersama", "with"],
  ["serta", "and"],
  ["dan", "and"],
  ["atau", "or"],
  ["lulusan", "Graduate of"]
];

const SKILL_PAIRS: Array<[string, string]> = [
  ["troubleshooting hardware & printer", "Hardware & Printer Troubleshooting"],
  ["troubleshooting hardware & software", "Hardware & Software Troubleshooting"],
  ["troubleshooting hardware", "Hardware Troubleshooting"],
  ["jaringan lan/wan & wi-fi", "LAN/WAN & Wi-Fi Networking"],
  ["jaringan lan/wan", "LAN/WAN Networking"],
  ["jaringan komputer", "Computer Networking"],
  ["it helpdesk & dukungan pengguna", "IT Helpdesk & User Support"],
  ["rekam medis elektronik", "Electronic Medical Records (EMR)"],
  ["sistem informasi manajemen rumah sakit", "Hospital Information Management System (SIMRS)"],
  ["sql / basis data dasar", "SQL / Relational Database Fundamentals"],
  ["stock opname & pencatatan stok", "Stock Opname & Inventory Tracking"],
  ["administrasi gudang & stock opname", "Warehouse Administration & Stock Opname"],
  ["administrasi gudang", "Warehouse Administration"],
  ["administrasi perkantoran", "Office Administration"],
  ["pengarsipan dokumen fisik & digital", "Physical & Digital Document Archiving"],
  ["pengarsipan & document control", "Archiving & Document Control"],
  ["pengarsipan", "Document Archiving"],
  ["laporan keuangan", "Financial Reporting"],
  ["akuntansi & jurnal", "Accounting & General Ledger"],
  ["rekonsiliasi bank", "Bank Reconciliation"],
  ["pembukuan", "Bookkeeping"],
  ["perpajakan", "Taxation"],
  ["manajemen konten media sosial", "Social Media Content Management"],
  ["pemasaran digital", "Digital Marketing"],
  ["layanan pelanggan", "Customer Service"],
  ["manajemen proyek", "Project Management"],
  ["analisis data", "Data Analysis"],
  ["visualisasi data", "Data Visualization"],
  ["pengolahan data", "Data Processing"],
  ["pemecahan masalah", "Problem Solving"],
  ["manajemen waktu", "Time Management"],
  ["kerja tim", "Teamwork"],
  ["kolaborasi tim", "Team Collaboration"],
  ["kolaborasi", "Collaboration"],
  ["komunikasi", "Communication"],
  ["teliti & cermat", "Attention to Detail"],
  ["teliti", "Attention to Detail"],
  ["kepemimpinan", "Leadership"],
  ["adaptif & cepat belajar", "Adaptability & Fast Learning"],
  ["adaptif", "Adaptability"],
  ["inisiatif & mandiri", "Initiative & Ownership"],
  ["inisiatif", "Initiative"],
  ["cekatan & tahan tekanan", "Agility & Stress Resilience"],
  ["cekatan", "Responsiveness"],
  ["jujur & bertanggung jawab", "Integrity & Accountability"]
];

const CERT_PAIRS: Array<[string, string]> = [
  ["belajar dasar pemrograman web & javascript", "Web Programming & JavaScript Fundamentals"],
  ["belajar pengembangan machine learning & ai", "Machine Learning & AI Development"],
  ["belajar pengembangan machine learning", "Machine Learning Development"],
  ["belajar analisis data dengan python", "Data Analysis with Python Fundamentals"],
  ["belajar dasar visualisasi data", "Data Visualization Fundamentals"],
  ["belajar fundamental pemrosesan data", "Fundamental Data Processing"],
  ["belajar dasar ai", "Artificial Intelligence Fundamentals"],
  ["pelatihan", "Training"],
  ["sertifikasi", "Certification"]
];

const EN_DEGREE_TO_ID: Array<[string, string]> = [
  ["vocational high school diploma", "SMK"],
  ["senior high school diploma", "SMA"],
  ["vocational high school", "SMK"],
  ["senior high school", "SMA"],
  ["bachelor of informatics", "S1 Informatika"],
  ["bachelor of computer science", "S1 Ilmu Komputer"],
  ["bachelor of engineering", "S1 Teknik"],
  ["bachelor of economics", "S1 Ekonomi"],
  ["bachelor of science", "S1 Sains"],
  ["bachelor of education", "S1 Pendidikan"],
  ["bachelor's degree (s1)", "S1"],
  ["bachelor's degree", "S1"],
  ["bachelor of", "S1"],
  ["applied bachelor's degree (d4)", "D4"],
  ["applied bachelor's degree", "D4"],
  ["associate degree (d3)", "D3"],
  ["associate degree", "D3"],
  ["master's degree (s2)", "S2"],
  ["master's degree", "S2"],
  ["master of science", "S2 Sains"],
  ["master of", "S2"]
];

const EN_MAJOR_TO_ID: Array<[string, string]> = [
  ["computer & network engineering", "Teknik Komputer dan Jaringan"],
  ["medical records & health information", "Rekam Medis dan Informasi Kesehatan"],
  ["visual communication design", "Desain Komunikasi Visual"],
  ["software engineering", "Rekayasa Perangkat Lunak"],
  ["office administration", "Administrasi Perkantoran"],
  ["hospital administration", "Administrasi Rumah Sakit"],
  ["informatics management", "Manajemen Informatika"],
  ["informatics engineering", "Teknik Informatika"],
  ["information technology", "Teknologi Informasi"],
  ["information systems", "Sistem Informasi"],
  ["computer engineering", "Teknik Komputer"],
  ["computer science", "Ilmu Komputer"],
  ["electrical engineering", "Teknik Elektro"],
  ["industrial engineering", "Teknik Industri"],
  ["mechanical engineering", "Teknik Mesin"],
  ["civil engineering", "Teknik Sipil"],
  ["business administration", "Administrasi Bisnis"],
  ["business management", "Manajemen Bisnis"],
  ["development economics", "Ekonomi Pembangunan"],
  ["finance & banking", "Keuangan dan Perbankan"],
  ["communication science", "Ilmu Komunikasi"],
  ["public health", "Kesehatan Masyarakat"],
  ["informatics", "Informatika"],
  ["accounting", "Akuntansi"],
  ["management", "Manajemen"],
  ["statistics", "Statistika"],
  ["mathematics", "Matematika"],
  ["psychology", "Psikologi"],
  ["pharmacy", "Farmasi"],
  ["nursing", "Keperawatan"],
  ["law", "Hukum"]
];

const EN_COURSEWORK_TO_ID: Array<[string, string]> = [
  ["algorithms & data structures", "Algoritma dan Struktur Data"],
  ["algorithms and data structures", "Algoritma dan Struktur Data"],
  ["systems analysis & design", "Analisis dan Perancangan Sistem"],
  ["object-oriented programming", "Pemrograman Berorientasi Objek"],
  ["human-computer interaction", "Interaksi Manusia dan Komputer"],
  ["software engineering", "Rekayasa Perangkat Lunak"],
  ["artificial intelligence", "Kecerdasan Buatan"],
  ["machine learning", "Pembelajaran Mesin"],
  ["information security", "Keamanan Informasi"],
  ["computer networks", "Jaringan Komputer"],
  ["information systems", "Sistem Informasi"],
  ["web development", "Pemrograman Web"],
  ["operating systems", "Sistem Operasi"],
  ["data structures", "Struktur Data"],
  ["database systems", "Basis Data"],
  ["introduction to database systems", "Pengantar Sistem Basis Data"]
];

const EN_SKILL_CATEGORY_TO_ID: Array<[string, string]> = [
  ["frameworks & libraries", "Framework & Pustaka"],
  ["machine learning & data", "Machine Learning & Data"],
  ["tools & software", "Alat & Perangkat Lunak"],
  ["technical skills", "Keahlian Teknis"],
  ["programming languages", "Bahasa Pemrograman"],
  ["programming", "Pemrograman"],
  ["database", "Basis Data"],
  ["soft skills", "Kompetensi Pendukung"],
  ["other", "Lainnya"]
];

const EN_SKILL_TO_ID: Array<[string, string]> = [
  ["hardware & printer troubleshooting", "Troubleshooting Hardware & Printer"],
  ["hardware & software troubleshooting", "Troubleshooting Hardware & Software"],
  ["hardware troubleshooting", "Troubleshooting Hardware"],
  ["lan/wan & wi-fi networking", "Jaringan LAN/WAN & Wi-Fi"],
  ["lan/wan networking", "Jaringan LAN/WAN"],
  ["computer networking", "Jaringan Komputer"],
  ["it helpdesk & user support", "IT Helpdesk & Dukungan Pengguna"],
  ["electronic medical records", "Rekam Medis Elektronik"],
  ["warehouse administration & stock opname", "Administrasi Gudang & Stock Opname"],
  ["warehouse administration", "Administrasi Gudang"],
  ["office administration", "Administrasi Perkantoran"],
  ["document archiving", "Pengarsipan Dokumen"],
  ["financial reporting", "Laporan Keuangan"],
  ["bank reconciliation", "Rekonsiliasi Bank"],
  ["bookkeeping", "Pembukuan"],
  ["project management", "Manajemen Proyek"],
  ["data visualization", "Visualisasi Data"],
  ["data preprocessing", "Pra-pemrosesan Data"],
  ["model evaluation", "Evaluasi Model"],
  ["data analysis", "Analisis Data"],
  ["data processing", "Pengolahan Data"],
  ["classification", "Klasifikasi"],
  ["full-stack development", "Pengembangan Full-Stack"],
  ["problem solving", "Pemecahan Masalah"],
  ["time management", "Manajemen Waktu"],
  ["team collaboration", "Kolaborasi Tim"],
  ["teamwork", "Kerja Tim"],
  ["communication", "Komunikasi"],
  ["attention to detail", "Teliti & Cermat"],
  ["leadership", "Kepemimpinan"],
  ["adaptability", "Adaptif"],
  ["photography", "Fotografi"],
  ["videography", "Videografi"]
];

const EN_PROSE_TO_ID: Array<[string, string]> = [
  // Multi-word titles & roles
  ["founder & lead developer", "Pendiri & Lead Developer"],
  ["community lead & full-stack developer", "Ketua Komunitas & Full-Stack Developer"],
  ["human resource development staff", "Staf Pengembangan Sumber Daya Manusia"],
  ["laboratory teaching assistant", "Asisten Praktikum Laboratorium"],
  ["machine learning engineer cohort", "Peserta Cohort Machine Learning Engineer"],
  ["library and archives intern", "Magang Perpustakaan dan Kearsipan"],
  ["mobile app developer intern", "Magang Pengembang Aplikasi Mobile"],
  ["software engineering intern", "Magang Rekayasa Perangkat Lunak"],
  ["junior web developer", "Junior Web Developer"],
  ["full-stack developer", "Full-Stack Developer"],
  ["full stack engineer", "Full-Stack Engineer"],
  ["data scientist", "Data Scientist"],
  ["community lead", "Ketua Komunitas"],
  ["association of informatics", "Himpunan Mahasiswa Informatika"],
  ["powered by", "didukung oleh"],
  ["city of", "Kota"],

  // Common summary & CV clauses (longest-first)
  ["open to full-time and project roles in software engineering or machine learning", "Terbuka untuk peran penuh waktu maupun proyek di bidang software engineering atau machine learning"],
  ["open to full-time and project roles in", "Terbuka untuk peran penuh waktu maupun proyek di bidang"],
  ["open to full-time roles in", "Terbuka untuk peran penuh waktu di bidang"],
  ["with hands-on experience in", "yang memiliki pengalaman langsung di bidang"],
  ["informatics graduate of", "Lulusan Informatika dari"],
  ["informatics graduate", "Lulusan Informatika"],
  ["bachelor of informatics", "S1 Informatika"],
  ["led an online community of", "Memimpin komunitas daring beranggotakan"],
  ["led a community of", "Memimpin komunitas beranggotakan"],
  ["designed and built", "Merancang dan membangun"],
  ["built and managed", "Membangun dan mengelola"],
  ["built and led", "Membangun dan memimpin"],
  ["led development of", "Memimpin pengembangan"],
  ["managed a cross-functional team and coordinated directly with", "Mengelola tim lintas fungsi dan berkoordinasi langsung dengan"],
  ["managed a cross-functional team", "Mengelola tim lintas fungsi"],
  ["coordinated directly with", "berkoordinasi langsung dengan"],
  ["government stakeholders", "pemangku kepentingan pemerintahan"],
  ["delivered a capstone project presentation in collaboration with fellow participants", "Menyampaikan presentasi proyek akhir (capstone) bersama sesama peserta"],
  ["in collaboration with", "bekerja sama dengan"],
  ["fellow participants", "rekan peserta"],
  ["facilitated practical sessions for the", "Memfasilitasi sesi praktikum untuk mata kuliah"],
  ["facilitated practical sessions for", "Memfasilitasi sesi praktikum untuk"],
  ["introduction to database systems course", "Pengantar Sistem Basis Data"],
  ["students per class each semester", "mahasiswa per kelas setiap semester"],
  ["with approx.", "dengan sekitar"],
  ["guided students through", "Membimbing mahasiswa dalam"],
  ["to a fully paperless workflow", "menuju alur kerja sepenuhnya tanpa kertas"],
  ["across mobile and pc", "pada perangkat mobile dan PC"],
  ["across mobile and desktop", "pada perangkat mobile dan desktop"],
  ["user verification, revision alerts, and real-time student project showcasing", "verifikasi pengguna, pengingat revisi, serta publikasi proyek mahasiswa secara real-time"],
  ["for user verification", "untuk verifikasi pengguna"],
  ["that lets citizens report road damage and track repairs in real time", "yang memungkinkan warga melaporkan kerusakan jalan dan memantau perbaikan secara real-time"],
  ["improving damage assessment accuracy", "sehingga meningkatkan akurasi penilaian kerusakan"],
  ["to classify the type and severity of road damage", "untuk mengklasifikasikan jenis dan tingkat keparahan kerusakan jalan"],
  ["road damage reporting platform", "platform pelaporan kerusakan jalan"],
  ["paperless laboratory lms", "LMS laboratorium tanpa kertas"],
  ["automated whatsapp and discord bots", "bot WhatsApp dan Discord otomatis"],
  ["whatsapp and discord automation", "otomasi WhatsApp dan Discord"],
  ["3d virtual campus", "kampus virtual 3D"],
  ["covering faculty layouts, landmarks, and spatial optimization", "yang mencakup tata letak fakultas, penanda lokasi, dan optimasi ruang"],
  ["covering supervised and unsupervised learning, data preprocessing, and model evaluation", "yang mencakup supervised dan unsupervised learning, pra-pemrosesan data, dan evaluasi model"],
  ["interactive features and navigation mechanics", "fitur interaktif dan mekanisme navigasi"],
  ["for an intuitive campus tour experience", "untuk pengalaman tur kampus yang intuitif"],
  ["for students interested in", "bagi mahasiswa yang tertarik pada"],
  ["coordinated development sprints for updates, bug fixes, and performance optimization", "mengkoordinasikan sprint pengembangan untuk pembaruan, perbaikan bug, dan optimasi performa"],
  ["streamline archival data entry", "mempercepat penginputan data arsip"],
  ["showcasing the library's profile and services", "yang menampilkan profil serta layanan perpustakaan"],
  ["assisted with organizing physical and digital archives", "membantu penataan arsip fisik dan digital"],
  ["practicing ui layout with widgets and basic state management", "melatih penyusunan antarmuka UI dengan widget serta pengelolaan state dasar"],
  ["managed the overall discord server setup", "mengelola pengaturan server Discord secara menyeluruh"],
  ["designed the community rules and maintained member engagement", "merancang aturan komunitas dan menjaga keterlibatan anggota"],
  ["served additionally as", "bertugas tambahan sebagai"],

  // Action verbs & reusable English CV vocabulary
  ["collaborated closely with", "berkolaborasi erat dengan"],
  ["collaborated with", "berkolaborasi dengan"],
  ["coordinated", "mengkoordinasikan"],
  ["engineered", "merancang"],
  ["implemented", "mengimplementasikan"],
  ["integrated", "mengintegrasikan"],
  ["optimized", "mengoptimalkan"],
  ["organized", "menyelenggarakan"],
  ["developed", "mengembangkan"],
  ["configured", "mengonfigurasi"],
  ["presented", "mempresentasikan"],
  ["facilitated", "memfasilitasi"],
  ["maintained", "memelihara"],
  ["produced", "memproduksi"],
  ["delivered", "menyampaikan"],
  ["analyzed", "menganalisis"],
  ["improved", "meningkatkan"],
  ["reduced", "mengurangi"],
  ["managed", "mengelola"],
  ["designed", "merancang"],
  ["assisted", "membantu"],
  ["authored", "menulis"],
  ["guided", "membimbing"],
  ["built", "membangun"],
  ["led", "memimpin"],
  ["in real time", "secara real-time"],
  ["real-time", "waktu nyata"],
  ["cross-functional team", "tim lintas fungsi"],
  ["custom data input website", "situs web input data kustom"],
  ["simple calculator mobile app", "aplikasi mobile kalkulator sederhana"],
  ["machine learning model", "model machine learning"],
  ["machine learning project", "proyek machine learning"],
  ["full-stack web application", "aplikasi web full-stack"],
  ["full-stack development", "pengembangan full-stack"],
  ["creative tech", "teknologi kreatif"],
  ["capstone project presentation", "presentasi proyek akhir"],
  ["promotional videography project", "proyek videografi promosi"],
  ["centralized lms platform", "platform LMS terpusat"],
  ["members", "anggota"],
  ["using", "menggunakan"],
  ["covering", "yang mencakup"],
  ["from", "sejak"],
  ["with", "dengan"],
  ["for", "untuk"],
  ["and", "dan"]
];

const capitalizeFirst = (value: string): string =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

const cleanTranslatedText = (value: string): string =>
  value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim();

export const translateFieldToEnglish = (
  text: string,
  kind: "prose" | "degree" | "major" | "coursework" | "skill" | "cert" = "prose"
): string => {
  const clean = text.trim();
  if (!clean || shouldSkipTranslation(clean)) return text;

  let result = clean;
  if (kind === "degree") {
    result = replaceBoundaryPhrases(result, DEGREE_MAP);
  } else if (kind === "major") {
    result = replaceBoundaryPhrases(result, MAJOR_MAP);
  } else if (kind === "coursework") {
    result = replaceBoundaryPhrases(result, COURSEWORK_MAP);
  } else if (kind === "skill") {
    result = replaceBoundaryPhrases(result, SKILL_PAIRS);
  } else if (kind === "cert") {
    result = replaceBoundaryPhrases(result, [...CERT_PAIRS, ...GENERAL_PROSE_PAIRS]);
  } else {
    result = replaceBoundaryPhrases(result, [...DEGREE_MAP, ...MAJOR_MAP, ...GENERAL_PROSE_PAIRS]);
  }

  return capitalizeFirst(cleanTranslatedText(result));
};

export const translateFieldToIndonesian = (
  text: string,
  kind: "prose" | "degree" | "major" | "coursework" | "skill" | "skillCategory" | "cert" = "prose"
): string => {
  const clean = text.trim();
  if (!clean || shouldSkipIndonesianTranslation(clean)) return text;

  let result = clean;
  if (kind === "degree") {
    result = replaceBoundaryPhrases(result, [...EN_DEGREE_TO_ID, ...EN_MAJOR_TO_ID]);
  } else if (kind === "major") {
    result = replaceBoundaryPhrases(result, EN_MAJOR_TO_ID);
  } else if (kind === "coursework") {
    result = replaceBoundaryPhrases(result, EN_COURSEWORK_TO_ID);
  } else if (kind === "skillCategory") {
    result = replaceBoundaryPhrases(result, EN_SKILL_CATEGORY_TO_ID);
  } else if (kind === "skill") {
    result = replaceBoundaryPhrases(result, EN_SKILL_TO_ID);
  } else if (kind === "cert") {
    result = replaceBoundaryPhrases(result, [...EN_PROSE_TO_ID]);
  } else {
    result = replaceBoundaryPhrases(result, [...EN_DEGREE_TO_ID, ...EN_MAJOR_TO_ID, ...EN_PROSE_TO_ID]);
  }

  return capitalizeFirst(cleanTranslatedText(result));
};

/**
 * Menerjemahkan seluruh isi profil CV ke bahasa Inggris berstandar industri ATS
 * tanpa mengubah identitas pribadi (nama, email, HP, URL) maupun menambah fakta/angka baru.
 */
export const translateProfileToEnglish = (profile: ResumeProfile): ResumeProfile => {
  const translateBullets = (bullets: string[]) =>
    bullets.map((b) => (b.trim() ? translateFieldToEnglish(b, "prose") : b));

  const workExperience: WorkExperience[] = (profile.workExperience ?? []).map((item) => ({
    ...item,
    role: translateFieldToEnglish(item.role, "prose"),
    company: translateFieldToEnglish(item.company, "prose"),
    startDate: translatePeriodToEnglish(item.startDate),
    endDate: translatePeriodToEnglish(item.endDate),
    bulletPoints: translateBullets(item.bulletPoints ?? [])
  }));

  const education: Education[] = (profile.education ?? []).map((item) => ({
    ...item,
    degree: translateFieldToEnglish(item.degree, "degree"),
    fieldOfStudy: translateFieldToEnglish(item.fieldOfStudy, "major"),
    graduationDate: translatePeriodToEnglish(item.graduationDate),
    thesisTitle: item.thesisTitle ? translateFieldToEnglish(item.thesisTitle, "prose") : item.thesisTitle,
    relevantCoursework: (item.relevantCoursework ?? []).map((c) => translateFieldToEnglish(c, "coursework")),
    achievements: item.achievements ? translateFieldToEnglish(item.achievements, "prose") : item.achievements
  }));

  const projects: ProjectItem[] = (profile.projects ?? []).map((item) => ({
    ...item,
    name: translateFieldToEnglish(item.name, "prose"),
    role: translateFieldToEnglish(item.role, "prose"),
    context: translateFieldToEnglish(item.context, "prose"),
    period: translatePeriodToEnglish(item.period),
    technologies: (item.technologies ?? []).map((t) => translateFieldToEnglish(t, "skill")),
    bulletPoints: translateBullets(item.bulletPoints ?? [])
  }));

  const organizations: OrganizationItem[] = (profile.organizations ?? []).map((item) => ({
    ...item,
    organization: translateFieldToEnglish(item.organization, "prose"),
    role: translateFieldToEnglish(item.role, "prose"),
    period: translatePeriodToEnglish(item.period),
    bulletPoints: translateBullets(item.bulletPoints ?? [])
  }));

  const certificationItems: CertificationItem[] = (profile.certificationItems ?? []).map((item) => ({
    ...item,
    name: translateFieldToEnglish(item.name, "cert"),
    year: translatePeriodToEnglish(item.year)
  }));

  return {
    ...profile,
    contact: {
      ...profile.contact,
      headline: profile.contact?.headline ? translateFieldToEnglish(profile.contact.headline, "prose") : ""
    },
    summary: profile.summary ? translateFieldToEnglish(profile.summary, "prose") : "",
    workExperience,
    education,
    projects,
    organizations,
    certificationItems,
    skills: {
      hardSkills: (profile.skills?.hardSkills ?? []).map((s) => translateFieldToEnglish(s, "skill")),
      tools: (profile.skills?.tools ?? []).map((s) => translateFieldToEnglish(s, "skill")),
      softSkills: (profile.skills?.softSkills ?? []).map((s) => translateFieldToEnglish(s, "skill")),
      groups: (profile.skills?.groups ?? []).map((group) => ({
        ...group,
        category: translateFieldToEnglish(group.category, "prose"),
        items: (group.items ?? []).map((item) => translateFieldToEnglish(item, "skill"))
      }))
    },
    certifications: (profile.certifications ?? []).map((c) => translateFieldToEnglish(c, "cert"))
  };
};

/**
 * Menerjemahkan isi profil CV berbahasa Inggris ke Bahasa Indonesia standar ATS
 * tanpa mengubah identitas pribadi maupun menambah fakta/angka baru.
 */
export const translateProfileToIndonesian = (profile: ResumeProfile): ResumeProfile => {
  const translateBullets = (bullets: string[]) =>
    bullets.map((b) => (b.trim() ? translateFieldToIndonesian(b, "prose") : b));

  const workExperience: WorkExperience[] = (profile.workExperience ?? []).map((item) => ({
    ...item,
    role: translateFieldToIndonesian(item.role, "prose"),
    company: translateFieldToIndonesian(item.company, "prose"),
    startDate: translatePeriodToIndonesian(item.startDate),
    endDate: translatePeriodToIndonesian(item.endDate),
    bulletPoints: translateBullets(item.bulletPoints ?? [])
  }));

  const education: Education[] = (profile.education ?? []).map((item) => ({
    ...item,
    degree: translateFieldToIndonesian(item.degree, "degree"),
    fieldOfStudy: translateFieldToIndonesian(item.fieldOfStudy, "major"),
    graduationDate: translatePeriodToIndonesian(item.graduationDate),
    thesisTitle: item.thesisTitle ? translateFieldToIndonesian(item.thesisTitle, "prose") : item.thesisTitle,
    relevantCoursework: (item.relevantCoursework ?? []).map((c) => translateFieldToIndonesian(c, "coursework")),
    achievements: item.achievements ? translateFieldToIndonesian(item.achievements, "prose") : item.achievements
  }));

  const projects: ProjectItem[] = (profile.projects ?? []).map((item) => ({
    ...item,
    name: translateFieldToIndonesian(item.name, "prose"),
    role: translateFieldToIndonesian(item.role, "prose"),
    context: translateFieldToIndonesian(item.context, "prose"),
    period: translatePeriodToIndonesian(item.period),
    technologies: item.technologies ?? [],
    bulletPoints: translateBullets(item.bulletPoints ?? [])
  }));

  const organizations: OrganizationItem[] = (profile.organizations ?? []).map((item) => ({
    ...item,
    organization: translateFieldToIndonesian(item.organization, "prose"),
    role: translateFieldToIndonesian(item.role, "prose"),
    period: translatePeriodToIndonesian(item.period),
    bulletPoints: translateBullets(item.bulletPoints ?? [])
  }));

  const certificationItems: CertificationItem[] = (profile.certificationItems ?? []).map((item) => ({
    ...item,
    name: translateFieldToIndonesian(item.name, "cert"),
    year: translatePeriodToIndonesian(item.year)
  }));

  return {
    ...profile,
    contact: {
      ...profile.contact,
      headline: profile.contact?.headline ? translateFieldToIndonesian(profile.contact.headline, "prose") : ""
    },
    summary: profile.summary ? translateFieldToIndonesian(profile.summary, "prose") : "",
    workExperience,
    education,
    projects,
    organizations,
    certificationItems,
    skills: {
      hardSkills: (profile.skills?.hardSkills ?? []).map((s) => translateFieldToIndonesian(s, "skill")),
      tools: (profile.skills?.tools ?? []).map((s) => translateFieldToIndonesian(s, "skill")),
      softSkills: (profile.skills?.softSkills ?? []).map((s) => translateFieldToIndonesian(s, "skill")),
      groups: (profile.skills?.groups ?? []).map((group) => ({
        ...group,
        category: translateFieldToIndonesian(group.category, "skillCategory"),
        items: (group.items ?? []).map((item) => translateFieldToIndonesian(item, "skill"))
      }))
    },
    certifications: (profile.certifications ?? []).map((c) => translateFieldToIndonesian(c, "cert"))
  };
};

export const translateProfileDeterministic = (
  profile: ResumeProfile,
  targetLang: "id" | "en"
): ResumeProfile => (targetLang === "en" ? translateProfileToEnglish(profile) : translateProfileToIndonesian(profile));

export const computeProfileContentHash = (profile: ResumeProfile): string =>
  JSON.stringify({
    headline: profile.contact?.headline ?? "",
    summary: profile.summary,
    workExperience: profile.workExperience,
    education: profile.education,
    projects: profile.projects,
    organizations: profile.organizations,
    certificationItems: profile.certificationItems,
    skills: profile.skills
  });
