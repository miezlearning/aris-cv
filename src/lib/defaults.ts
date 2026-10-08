import type { ResumeProfile, JobTarget, MatchAnalytics } from "@/types/resume";

export const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const emptyResumeProfile = (): ResumeProfile => ({
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
  workExperience: [
    {
      id: createId(),
      company: "",
      role: "",
      location: "",
      startDate: "",
      endDate: "Present",
      isCurrent: true,
      bulletPoints: [""]
    }
  ],
  education: [
    {
      id: createId(),
      institution: "",
      degree: "",
      fieldOfStudy: "",
      gpa: "",
      graduationDate: ""
    }
  ],
  skills: {
    hardSkills: [],
    softSkills: [],
    tools: []
  },
  certifications: []
});

/** Profil dummy contoh untuk demonstrasi fitur ATS */
export const sampleDemoProfile = (): ResumeProfile => ({
  contact: {
    fullName: "Budi Pratama",
    headline: "Software Engineer | Full-Stack Developer | Cloud & AI Systems",
    email: "budi.pratama@example.com",
    phone: "+62 812-3456-7890",
    location: "Jakarta, Indonesia",
    linkedinUrl: "linkedin.com/in/budipratama-dev",
    portfolioUrl: "github.com/budipratama"
  },
  summary:
    "Lulusan Teknik Informatika dengan pengalaman 3+ tahun mengembangkan aplikasi web berskala enterprise dan integrasi kecerdasan buatan. Berpengalaman membangun platform mikroservis, otomatisasi alur kerja laboratorium, dan sistem klasifikasi berbasis machine learning. Terbiasa memimpin tim lintas fungsi dan merancang arsitektur sistem yang skalabel serta berkinerja tinggi.",
  workExperience: [
    {
      id: createId(),
      role: "Senior Full Stack Developer",
      company: "PT Inovasi Digital Nusantara",
      location: "Jakarta",
      startDate: "Jan 2024",
      endDate: "Present",
      isCurrent: true,
      bulletPoints: [
        "Merancang arsitektur web platform terpusat menggunakan Next.js dan Node.js yang memproses lebih dari 50.000 transaksi harian dengan latensi di bawah 200ms.",
        "Mengembangkan bot otomatisasi integrasi notifikasi real-time via WhatsApp Business API dan webhook Discord untuk sistem peringatan revisi dokumen.",
        "Mengoptimalkan performa query PostgreSQL dan Redis caching, menurunkan beban server hingga 40%."
      ]
    },
    {
      id: createId(),
      role: "Full-Stack Developer",
      company: "Dinas Komunikasi dan Informatika",
      location: "Bandung",
      startDate: "Apr 2023",
      endDate: "Dec 2023",
      isCurrent: false,
      bulletPoints: [
        "Memimpin pengembangan aplikasi pelaporan infrastruktur publik berbasis peta GIS yang digunakan oleh lebih dari 100.000 warga untuk pemantauan perbaikan fasilitas kota.",
        "Mengintegrasikan model computer vision untuk mengklasifikasi tingkat kerusakan fasilitas secara otomatis dengan akurasi 92%.",
        "Bekerja sama erat dengan stakeholder pemerintahan untuk memastikan kepatuhan regulasi privasi data dan standar keamanan siber.",
        "Menggunakan teknologi: Laravel, React.js, Tailwind CSS, Leaflet.js, MySQL."
      ]
    },
    {
      id: createId(),
      role: "Machine Learning Engineer Cohort",
      company: "Tech Academy Foundation",
      location: "Remote",
      startDate: "Feb 2023",
      endDate: "Jul 2023",
      isCurrent: false,
      bulletPoints: [
        "Membangun model machine learning end-to-end menggunakan Python, Scikit-learn, dan FastAPI untuk deteksi anomali data transaksi keuangan.",
        "Melakukan data preprocessing, feature engineering, serta hyperparameter tuning untuk meningkatkan F1-score model sebesar 15%.",
        "Mempresentasikan hasil proyek capstone dan visualisasi model kepada dewan penguji industri."
      ]
    },
    {
      id: createId(),
      role: "Software Engineering Intern",
      company: "PT Solusi Teknologi Bersama",
      location: "Yogyakarta",
      startDate: "Aug 2022",
      endDate: "Jan 2023",
      isCurrent: false,
      bulletPoints: [
        "Membangun modul dashboard analitik internal menggunakan React.js dan Tailwind CSS untuk visualisasi metrik performa operasional tim.",
        "Menulis unit testing dan integration testing dengan coverage 85%, mengurangi regresi bug saat rilis ke tahap produksi."
      ]
    },
    {
      id: createId(),
      role: "Community Lead & Developer",
      company: "Komunitas Open Source Indonesia",
      location: "Remote",
      startDate: "Jan 2021",
      endDate: "Present",
      isCurrent: true,
      bulletPoints: [
        "Mengelola komunitas teknologi dengan 50.000+ anggota, menyelenggarakan lokakarya pemrograman bulanan, dan memelihara repository open-source.",
        "Merancang pedoman kontribusi kode serta memfasilitasi onboarding bagi kontributor baru."
      ]
    }
  ],
  education: [
    {
      id: createId(),
      degree: "Sarjana Komputer (S.Kom)",
      fieldOfStudy: "Teknik Informatika",
      institution: "Universitas Indonesia",
      graduationDate: "2019 – 2023",
      gpa: "3.82/4.00"
    },
    {
      id: createId(),
      degree: "Sekolah Menengah Kejuruan",
      fieldOfStudy: "Rekayasa Perangkat Lunak",
      institution: "SMK Negeri 1 Jakarta",
      graduationDate: "2016 – 2019",
      gpa: ""
    }
  ],
  skills: {
    hardSkills: [
      "Programming: Python, TypeScript, JavaScript, Go, SQL, PHP, Dart, HTML, CSS",
      "Frameworks & Libraries: Next.js, React.js, Node.js, Laravel, Tailwind CSS, FastAPI, Flutter, Scikit-learn",
      "Database & Cloud: PostgreSQL, MySQL, Redis, Docker, AWS, Google Cloud Platform",
      "Machine Learning & Data: Supervised Learning, Data Preprocessing, Model Evaluation, Feature Engineering, Data Visualization"
    ],
    tools: [
      "Other: Git, CI/CD, DevOps, Microservices Architecture, REST API Design, Testing"
    ],
    softSkills: [
      "Leadership, Team Collaboration, Analytical Problem Solving, Agile/Scrum"
    ]
  },
  certifications: [
    "AWS Certified Cloud Practitioner; Google Cloud Associate Cloud Engineer; Dicoding Indonesia: Belajar Pengembangan Machine Learning & AI; DeepLearning.AI: Supervised Machine Learning"
  ]
});

export const emptyJobTarget = (): JobTarget => ({
  jobTitle: "",
  companyName: "",
  rawDescription: "",
  extractedKeywords: {
    requiredHardSkills: [],
    domainKeywords: [],
    softSkills: []
  }
});

export const emptyAnalytics = (): MatchAnalytics => ({
  overallScore: 0,
  exactMatchRate: 0,
  semanticProximity: 0,
  formatQualityScore: 0,
  matchedKeywords: [],
  semanticKeywords: [],
  missingKeywords: [],
  formatCheckPassed: false,
  keywordMatches: []
});
