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
  "mandiri"
];

const hasIndonesianMarkers = (text: string): boolean => {
  const norm = normalizeForMatch(text);
  if (!norm) return false;
  return INDONESIAN_MARKERS.some((marker) => containsTermBoundary(norm, marker));
};

const shouldSkipTranslation = (text: string): boolean => {
  const clean = text.trim();
  if (!clean) return true;
  if (hasIndonesianMarkers(clean)) return false;
  return detectLanguage(clean) === "en";
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
  return replaceBoundaryPhrases(period, PERIOD_PAIRS).replace(/\s*[–—]\s*/g, " - ");
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
  ["pelatihan", "Training"],
  ["sertifikasi", "Certification"]
];

const capitalizeFirst = (value: string): string =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

const cleanEnglishText = (value: string): string =>
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

  return capitalizeFirst(cleanEnglishText(result));
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
