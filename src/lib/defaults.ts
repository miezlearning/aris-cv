import type { JobTarget, MatchAnalytics, ResumeProfile } from "@/types/resume";

export const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

/**
 * Profil awal kosong dengan ID deterministik (aman untuk SSR/hydration)
 * dan tanpa nilai default "Present" agar pratinjau tidak merender elemen yatim.
 */
export const emptyResumeProfile = (): ResumeProfile => ({
  experienceLevel: "fresh_graduate",
  contact: {
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    linkedinUrl: "",
    portfolioUrl: ""
  },
  summary: "",
  workExperience: [],
  education: [
    {
      id: "edu-initial",
      institution: "",
      degree: "",
      fieldOfStudy: "",
      gpa: "",
      graduationDate: "",
      thesisTitle: "",
      relevantCoursework: [],
      achievements: ""
    }
  ],
  projects: [],
  organizations: [],
  certificationItems: [],
  skills: {
    hardSkills: [],
    softSkills: [],
    tools: [],
    groups: []
  },
  certifications: []
});

/** Profil contoh Fresh Graduate / Belum Pernah Bekerja Penuh Waktu */
export const sampleFreshGradProfile = (): ResumeProfile => ({
  experienceLevel: "fresh_graduate",
  contact: {
    fullName: "Nadia Kusuma",
    headline: "Lulusan Teknik Informatika | Junior Web & IT Support",
    email: "nadia.kusuma@example.com",
    phone: "+62 813-4567-8910",
    location: "Semarang, Jawa Tengah",
    linkedinUrl: "linkedin.com/in/nadia-kusuma-ti",
    portfolioUrl: "github.com/nadiakusuma"
  },
  summary:
    "Lulusan S1 Teknik Informatika (IPK 3.74/4.00) dengan pengalaman magang MSIB sebagai Junior Web Developer dan asisten laboratorium jaringan. Terbiasa membangun antarmuka web dengan React dan TypeScript, mengelola basis data SQL, serta menangani troubleshooting perangkat keras dan jaringan lokal.",
  workExperience: [
    {
      id: "fg-work-1",
      role: "Frontend Web Intern (MSIB)",
      company: "PT Mitra Sehat Digital",
      type: "internship",
      location: "Semarang",
      startDate: "Aug 2024",
      endDate: "Dec 2024",
      isCurrent: false,
      bulletPoints: [
        "Mengembangkan 6 modul antarmuka pendaftaran pasien menggunakan React.js dan TypeScript yang memangkas waktu input data petugas hingga 25%.",
        "Mengintegrasikan RESTful API internal bersama tim backend dan menulis dokumentasi komponen untuk 4 anggota tim."
      ]
    }
  ],
  education: [
    {
      id: "fg-edu-1",
      institution: "Universitas Diponegoro",
      degree: "S1",
      fieldOfStudy: "Teknik Informatika",
      gpa: "3.74/4.00",
      graduationDate: "2025",
      thesisTitle: "Sistem Informasi Antrean dan Rekam Medis Klinik Berbasis Web",
      relevantCoursework: ["Basis Data", "Jaringan Komputer", "Rekayasa Perangkat Lunak", "Sistem Informasi"],
      achievements: "Finalis Lomba Pengembangan Aplikasi Kampus 2024"
    }
  ],
  projects: [
    {
      id: "fg-proj-1",
      name: "Aplikasi Inventaris dan Peminjaman Alat Laboratorium",
      role: "Full-Stack Developer",
      context: "Proyek Tugas Akhir",
      period: "Jan 2025 - May 2025",
      technologies: ["Next.js", "PostgreSQL", "REST API", "Tailwind CSS"],
      url: "github.com/nadiakusuma/lab-inventaris",
      bulletPoints: [
        "Membangun sistem pelacakan 180+ perangkat laboratorium menggunakan Next.js dan PostgreSQL untuk menggantikan pencatatan manual di spreadsheet.",
        "Merancang fitur rekap laporan peminjaman bulanan otomatis dalam format Excel dan PDF bagi kepala laboratorium."
      ]
    },
    {
      id: "fg-proj-2",
      name: "Simulasi Jaringan Lokal dan Monitoring Tiket Helpdesk",
      role: "Asisten Praktikum",
      context: "Proyek Mata Kuliah Jaringan",
      period: "Sep 2023 - Dec 2023",
      technologies: ["LAN/WAN", "Mikrotik", "MySQL", "Troubleshooting Hardware"],
      bulletPoints: [
        "Mengonfigurasi topologi LAN/WAN sederhana serta menangani troubleshooting koneksi dan printer untuk 35 komputer ruang praktikum."
      ]
    }
  ],
  organizations: [
    {
      id: "fg-org-1",
      organization: "Himpunan Mahasiswa Teknik Informatika",
      role: "Koordinator Divisi Akademik & Pelatihan",
      period: "Feb 2023 - Jan 2024",
      bulletPoints: [
        "Mengkoordinasikan 4 seri lokakarya pemrograman web dan penggunaan Git yang diikuti 160 peserta mahasiswa lintas angkatan.",
        "Menyusun jadwal mentor sebaya dan materi modul belajar bersama 6 pengurus divisi."
      ]
    }
  ],
  certificationItems: [
    { id: "fg-cert-1", name: "Belajar Dasar Pemrograman Web & JavaScript", issuer: "Dicoding Indonesia", year: "2024" },
    { id: "fg-cert-2", name: "Junior Network Administrator (VSGA)", issuer: "Kominfo / BNSP", year: "2024" }
  ],
  skills: {
    hardSkills: [
      "HTML",
      "CSS",
      "JavaScript",
      "TypeScript",
      "React.js",
      "Next.js",
      "SQL",
      "REST API",
      "Jaringan LAN/WAN",
      "Troubleshooting Hardware"
    ],
    tools: ["Microsoft Excel", "Microsoft Word", "Git", "GitHub", "MySQL", "PostgreSQL", "VS Code", "Figma"],
    softSkills: ["Komunikasi", "Kerja Tim", "Teliti", "Pemecahan Masalah", "Manajemen Waktu"]
  },
  certifications: []
});

/** Profil contoh untuk kandidat berpengalaman (2+ tahun) */
export const sampleDemoProfile = (): ResumeProfile => ({
  experienceLevel: "experienced",
  contact: {
    fullName: "Budi Pratama",
    headline: "Software Engineer | Full-Stack Developer | Cloud & Web Systems",
    email: "budi.pratama@example.com",
    phone: "+62 812-3456-7890",
    location: "Jakarta, Indonesia",
    linkedinUrl: "linkedin.com/in/budipratama-dev",
    portfolioUrl: "github.com/budipratama"
  },
  summary:
    "Lulusan Teknik Informatika dengan pengalaman 3+ tahun mengembangkan aplikasi web berskala enterprise dan integrasi sistem. Berpengalaman membangun platform mikroservis, optimasi query database, dan kolaborasi lintas fungsi dengan fokus keandalan serta performa sistem.",
  workExperience: [
    {
      id: "exp-demo-1",
      role: "Senior Full Stack Developer",
      company: "PT Inovasi Digital Nusantara",
      type: "fulltime",
      location: "Jakarta",
      startDate: "Jan 2024",
      endDate: "Present",
      isCurrent: true,
      bulletPoints: [
        "Merancang arsitektur web platform terpusat menggunakan Next.js dan Node.js yang memproses lebih dari 50.000 transaksi harian dengan latensi di bawah 200ms.",
        "Mengembangkan integrasi notifikasi real-time via WhatsApp Business API dan webhook untuk alur revisi dokumen internal.",
        "Mengoptimalkan query PostgreSQL dan Redis caching sehingga beban server turun hingga 40%."
      ]
    },
    {
      id: "exp-demo-2",
      role: "Full-Stack Developer",
      company: "Dinas Komunikasi dan Informatika",
      type: "fulltime",
      location: "Bandung",
      startDate: "Apr 2023",
      endDate: "Dec 2023",
      isCurrent: false,
      bulletPoints: [
        "Memimpin pengembangan aplikasi pelaporan infrastruktur publik berbasis peta GIS yang digunakan oleh lebih dari 100.000 warga.",
        "Bekerja sama erat dengan pemangku kepentingan pemerintahan untuk memastikan kepatuhan regulasi privasi data dan standar keamanan.",
        "Mengembangkan fitur antarmuka dan API menggunakan Laravel, React.js, Tailwind CSS, dan MySQL."
      ]
    },
    {
      id: "exp-demo-3",
      role: "Software Engineering Intern",
      company: "PT Solusi Teknologi Bersama",
      type: "internship",
      location: "Yogyakarta",
      startDate: "Aug 2022",
      endDate: "Jan 2023",
      isCurrent: false,
      bulletPoints: [
        "Membangun modul dashboard analitik internal menggunakan React.js dan Tailwind CSS untuk visualisasi metrik performa operasional tim.",
        "Menulis unit testing dan integration testing dengan coverage 85%, mengurangi regresi bug saat rilis produksi."
      ]
    }
  ],
  education: [
    {
      id: "edu-demo-1",
      degree: "S1",
      fieldOfStudy: "Teknik Informatika",
      institution: "Universitas Indonesia",
      graduationDate: "2023",
      gpa: "3.82/4.00",
      thesisTitle: "",
      relevantCoursework: [],
      achievements: ""
    }
  ],
  projects: [
    {
      id: "proj-demo-1",
      name: "Sistem Monitoring Antrean Layanan Terpadu",
      role: "Lead Developer",
      context: "Proyek Mandiri",
      period: "2023",
      technologies: ["TypeScript", "Next.js", "PostgreSQL"],
      bulletPoints: [
        "Membangun prototipe portal antrean multi-loket dengan pembaruan status waktu nyata dan ekspor laporan harian."
      ]
    }
  ],
  organizations: [
    {
      id: "org-demo-1",
      organization: "Komunitas Open Source Indonesia",
      role: "Maintainer & Mentor",
      period: "Jan 2021 - Present",
      bulletPoints: [
        "Menyelenggarakan lokakarya pemrograman bulanan dan menyusun pedoman kontribusi kode bagi kontributor baru."
      ]
    }
  ],
  certificationItems: [
    { id: "cert-demo-1", name: "AWS Certified Cloud Practitioner", issuer: "Amazon Web Services", year: "2024" },
    { id: "cert-demo-2", name: "Google Cloud Associate Cloud Engineer", issuer: "Google Cloud", year: "2023" }
  ],
  skills: {
    hardSkills: [
      "TypeScript",
      "JavaScript",
      "Python",
      "SQL",
      "Next.js",
      "React.js",
      "Node.js",
      "Laravel",
      "REST API",
      "PostgreSQL",
      "MySQL"
    ],
    tools: ["Git", "Docker", "CI/CD", "Redis", "AWS", "Google Cloud Platform", "Tailwind CSS"],
    softSkills: ["Leadership", "Team Collaboration", "Analytical Problem Solving", "Agile/Scrum"]
  },
  certifications: []
});

export const emptyJobTarget = (): JobTarget => ({
  jobTitle: "",
  companyName: "",
  rawDescription: "",
  extractedKeywords: {
    requiredHardSkills: [],
    domainKeywords: [],
    softSkills: []
  },
  normalized: undefined
});

export const emptyAnalytics = (): MatchAnalytics => ({
  hasAnalyzed: false,
  detectedLanguage: "id",
  overallScore: 0,
  exactMatchRate: 0,
  semanticProximity: 0,
  formatQualityScore: 0,
  matchedKeywords: [],
  semanticKeywords: [],
  missingKeywords: [],
  formatCheckPassed: false,
  keywordMatches: [],
  breakdown: {
    hardSkillsScore: 0,
    educationAndDomainScore: 0,
    structureAndImpactScore: 0,
    softSkillsScore: 0,
    weights: {
      hardSkills: 0.55,
      educationAndDomain: 0.25,
      structureAndImpact: 0.15,
      softSkills: 0.05
    }
  },
  qualificationMatches: [],
  administrativeItems: [],
  implicitSuggestions: [],
  formatChecks: []
});
