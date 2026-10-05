Product Requirements Document (PRD)
1. Document Overview
Nama Produk: QuickTailor CV

Versi Dokumen: 1.0.0 (MVP Phase)

Status: Ready for Implementation

Format Berkas: Markdown (PRD.md)

2. Problem Statement & Konteks Produk
Kesenjangan Kualifikasi Kata Kunci: Riset industri terhadap resume menunjukkan bahwa rata-rata deskripsi lowongan memuat puluhan kata kunci kualifikasi inti, tetapi pelamar kerja pada umumnya hanya mencantumkan sekitar 51% kata kunci teknis dan 28% keterampilan lunak yang disyaratkan.

Tingkat Respons Panggilan Kerja: Dokumen yang mencatatkan tingkat kecocokan kata kunci di atas 70% terhadap kualifikasi lowongan mendapatkan panggilan wawancara hingga 5,8 kali lipat lebih tinggi dibandingkan dokumen dengan kecocokan di bawah 40%.

Beban Waktu Pelamar: Mengubah resume secara manual (tailoring) membutuhkan waktu 30 hingga 60 menit per lamaran, memicu kelelahan operasional dan mendorong pelamar kembali menyebarkan resume umum yang tidak efektif.

Ketiadaan Solusi Hibrida Terjangkau: Alat global mematok biaya langganan bulanan mahal ($29 hingga $49,95 per bulan) dan umumnya hanya menyediakan audit pasif tanpa rekonstruksi kalimat instan. Sementara itu, platform lokal yang ada masih berbasis pengisian profil statis tanpa fitur penyesuaian otomatis per teks lowongan kerja.

3. Product Goals & Metrik Keberhasilan (OKRs)
3.1. Sasaran Produk
Memfasilitasi transformasi dari Master CV menjadi CV yang disesuaikan (Tailored CV) per lowongan kerja dalam waktu singkat.

Menjamin format berkas hasil ekspor terbebas dari kesalahan parsing pada sistem ATS enterprise (Workday, Taleo, Greenhouse, iCIMS).

Menyediakan model akses mikro berbasis pembayaran lokal instan (QRIS) yang sesuai dengan daya beli talenta Indonesia.

3.2. Metrik Kunci (KPIs)
Time to First Tailored CV: Kurang dari atau sama dengan 60 detik dari input data lowongan hingga berkas siap unduh.

Match Rate Enhancement: Meningkatkan skor kecocokan kata kunci resume dari rata-rata di bawah 45% menjadi minimal 75% terhadap deskripsi lowongan.

Free-to-Paid Conversion Rate: Minimal 5% pengguna gratis beralih membeli token ekspor berbayar via QRIS.

Parsing Integrity Rate: 100% keteruraian teks pada simulasi pembacaan sistem ATS berformat sekuensial linear.

4. Profil Target Pengguna (User Personas)
Fresh Graduate & Entry-Level Jobseeker: Lulusan baru yang membutuhkan penataan pengalaman organisasi, magang Kampus Merdeka/MSIB, dan proyek akademis agar terbaca formal dan lolos seleksi administratif BUMN maupun korporat swasta.

Active Career Transitioner / Mid-Level: Profesional yang ingin melamar ke berbagai posisi spesifik dengan menyesuaikan penekanan keterampilan teknis tanpa perlu menulis ulang resume dari nol setiap hari.

5. Prinsip Desain & Rekayasa Produk
Local-First & Data Privacy: Data riwayat hidup disimpan di memori peramban lokal (IndexedDB) secara bawaan; pengguna tidak dipaksa mendaftar akun di awal untuk mencoba fitur.

Deterministic Transparency: Skor kesesuaian dihitung menggunakan formula gabungan matematis dan kedekatan semantik, bukan representasi angka acak AI.

Strict Single-Column Architecture: Meniadakan seluruh elemen tabel tersembunyi, kolom ganda, ikon grafis, dan kotak teks guna mencegah teks teracak saat diproses oleh algoritma penyaring.

6. Spesifikasi Fungsional MVP
Modul 1: Manajemen Master CV
Formulir modular: Kontak Pribadi, Ringkasan Eksekutif, Riwayat Pekerjaan, Riwayat Pendidikan, Portofolio & Proyek, serta Taksonomi Keterampilan.

Lokalisasi parser: Mendukung rekognisi program magang bersertifikat (MSIB/Kampus Merdeka), organisasi kemahasiswaan, dan skor IPK skala 4.00.

Impor berkas: Mendukung impor riwayat dari format teks terstruktur atau format JSON Resume baku.

Modul 2: JD Extractor & Keyword Gap Analyzer
Bidang input teks deskripsi pekerjaan yang adaptif terhadap kombinasi Bahasa Indonesia dan istilah teknis Bahasa Inggris (code-switching).

Ekstraksi hierarkis berbasis AI:

Keahlian Teknis & Alat Kerja (Hard Skills) — bobot 50%.

Domain Pengetahuan & Tanggung Jawab Peran — bobot 30%.

Kompetensi Perilaku Kerja (Soft Skills) — bobot 20%.

Komponen visual celah kata kunci: Label hijau untuk kata kunci yang sudah terpenuhi, label merah untuk kualifikasi yang hilang, dan label kuning untuk padanan sinonim.

Modul 3: ATS Match Scoring Engine
Skor kesesuaian dihitung secara transparan menggunakan formula:

Score = (0.50 * ExactMatchRate) + (0.30 * SemanticProximity) + (0.20 * FormatQualityScore)

50% dihitung dari rasio irisan langsung kata kunci resume terhadap total kata kunci pada deskripsi lowongan.

30% dihitung dari kedekatan semantik kosinus antara pengalaman pelamar dan konteks peran target.

20% dihitung dari evaluasi kualitas struktural (keabsahan penamaan judul bagian, format tanggal standar, dan keberadaan metrik hasil terukur).

Modul 4: AI Metric-Driven Bullet Rewriter
Mesin penyusun kalimat berbasis metode Google XYZ (Accomplished [X] measured by [Y] by doing [Z]) dan metodologi STAR.

Restrukturisasi butir pengalaman kerja secara instan dengan menanamkan kata kunci lowongan secara kontekstual.

Safety Guardrails: Instruksi ketat melarang model bahasa mengarang data atau mencantumkan sertifikasi fiktif di luar data input pengguna.

Kontrol interaktif: Antarmuka menyediakan tombol Accept, Edit, dan Reject untuk setiap butir saran AI.

Modul 5: Reactive Side-by-Side Canvas
Layar terpisah (split-screen): Panel formulir editor di sisi kiri dan pratinjau lembar CV waktu nyata di sisi kanan.

Tata letak ramah ATS: Format satu kolom linear (single-column), margin minimal 0,75 inci, jenis huruf baku (Inter, Arial, Roboto), serta penamaan bagian konvensional (Experience, Education, Skills, Summary).

Modul 6: Client-Side Dual Export Engine
Ekspor PDF Linear: Kompilasi dokumen langsung di peramban menggunakan pustaka @react-pdf/renderer tanpa overhead server, menghasilkan struktur teks digital murni yang terbaca sekuensial dari kiri ke kanan.

Ekspor OpenXML DOCX: Pustaka docx menghasilkan dokumen biner Word asli dengan penandaan judul semantik (Heading 1, Heading 2) dan poin daftar asli untuk menjamin keteruraian pada portal ATS warisan seperti Oracle Taleo.

Modul 7: Monetisasi Mikro & Gateway Pembayaran
Freemium Access: Pembuatan Master CV tanpa batas, skor kesesuaian gratis, dan ekspor dokumen pratinjau bertanda air (watermarked).

Skema Transaksi Mikro:

Penyesuaian Tunggal (Pay-per-Tailor): Rp 10.000 hingga Rp 15.000 per dokumen lowongan kerja (ekspor PDF & DOCX bersih tanpa tanda air).

Paket Bundel "Siap Melamar": Rp 49.000 untuk 10 token penyesuaian lowongan plus draf surat lamaran (Cover Letter) terintegrasi.

Saluran pembayaran: Integrasi kode QRIS dinamis yang mendukung GoPay, OVO, ShopeePay, DANA, dan aplikasi perbankan lokal.

7. Tumpukan Teknologi & Arsitektur Sistem
Lapisan Sistem	Pilihan Teknologi	Justifikasi Teknis
Frontend Framework	Next.js (App Router), TypeScript, Tailwind CSS	Rendering reaktif, pemrosesan formulir dengan tipe data terstruktur, dan komponen UI modular.
State Management	Zustand	Pengelolaan state terpusat yang ringan untuk sinkronisasi editor formulir dan kanvas dokumen tanpa beban render berlebih.
Local Storage	IndexedDB (idb-keyval)	Pendekatan local-first; data pelamar tersimpan di peramban pengguna untuk menjaga privasi dan menghemat panggilan database.
Model AI / LLM	Gemini 1.5 Flash / GPT-4o-mini via OpenRouter	Latensi generasi rendah, efisiensi biaya token inferensi, dan konsistensi keluaran skema JSON.
Engine PDF	@react-pdf/renderer	Rendering berkas PDF langsung di sisi klien, meniadakan kebutuhan peladen Puppeteer.
Engine DOCX	docx (npm package)	Pembuatan struktur biner OpenXML langsung di memori browser klien.
Database & Auth	Supabase (PostgreSQL & GoTrue)	Sinkronisasi multi-perangkat opsional, manajemen autentikasi akun, dan pencatatan transaksi token.
Payment Gateway	Midtrans / Xendit	Pembuatan kode QRIS dinamis dan penerimaan notifikasi webhook pembayaran seketika.
8. Standar Kepatuhan Parsing ATS (Anti-Parsing-Failure Rules)
Peniadaan Elemen Visual Kompleks: Dilarang menggunakan grafik persentase keterampilan (skill bars), diagram lingkaran, atau ikon gambar pada riwayat pengalaman.

Eliminasi Kotak Teks & Tabel Bertingkat: Data tidak boleh diletakkan di dalam tabel tata letak atau text box karena elemen tersebut diabaikan oleh parser XML sistem ATS.

Standarisasi Header Kontak: Nama, nomor telepon, alamat email, domisili, dan tautan profil LinkedIn wajib diletakkan di badan teratas halaman dokumen, bukan di area Header atau Footer berkas.

Format Penanggalan Konsisten: Riwayat pekerjaan dan pendidikan menggunakan format tanggal seragam: MM/YYYY - MM/YYYY atau Month YYYY - Present.

Dukungan Akronim Ganda: Menuliskan singkatan bersama kepanjangannya secara eksplisit (contoh: Search Engine Optimization (SEO)) guna mengantisipasi perbedaan metode pencarian rekruter.

9. Struktur Model Data (JSON Schema)
{
"resumeProfile": {
"contact": {
"fullName": "string",
"email": "string",
"phone": "string",
"location": "string",
"linkedinUrl": "string",
"portfolioUrl": "string"
},
"summary": "string",
"workExperience": [
{
"id": "uuid",
"company": "string",
"role": "string",
"startDate": "MM/YYYY",
"endDate": "MM/YYYY | Present",
"isCurrent": true,
"bulletPoints": [
"string"
]
}
],
"education": [
{
"id": "uuid",
"institution": "string",
"degree": "string",
"fieldOfStudy": "string",
"gpa": "string",
"graduationDate": "YYYY"
}
],
"skills": {
"hardSkills": ["string"],
"softSkills": ["string"],
"tools": ["string"]
}
},
"jobTarget": {
"jobTitle": "string",
"companyName": "string",
"rawDescription": "string",
"extractedKeywords": {
"requiredHardSkills": ["string"],
"domainKeywords": ["string"],
"softSkills": ["string"]
}
},
"matchAnalytics": {
"overallScore": 0,
"matchedKeywords": ["string"],
"missingKeywords": ["string"],
"formatCheckPassed": true
}
}

10. Alur Interaksi Pengguna (User Flow)
Langkah 1 (Akses Instan): Pengguna membuka aplikasi dan langsung diarahkan ke dasbor editor tanpa rintangan formulir pendaftaran.

Langkah 2 (Penyusunan Profil): Pengguna melengkapi data riwayat karier pada formulir atau menempelkan teks resume sebelumnya.

Langkah 3 (Input Lowongan Target): Pengguna menempelkan teks kualifikasi pekerjaan dari portal lowongan.

Langkah 4 (Analisis Kesenjangan & Skor): Sistem memproses data, menyajikan skor kesesuaian, dan menyorot kata kunci yang belum terpenuhi.

Langkah 5 (Restrukturisasi AI): Pengguna memilih butir pengalaman kerja yang ingin dioptimalkan, lalu menerima atau mengubah draf kalimat yang diajukan AI.

Langkah 6 (Pembayaran Transaksi Mikro): Pengguna memindai kode QRIS dinamis untuk mendapatkan hak unduh dokumen bebas tanda air.

Langkah 7 (Ekspor Dokumen): Berkas diunduh dalam format PDF linear atau berkas DOCX bersih.

11. Roadmap Eksekusi Pengembangan
Fase	Durasi	Target Utama	Luaran Kunci
Sprint 1	2 Minggu	Pondasi Frontend & Local-First Store	Antarmuka editor formulir, store Zustand, integrasi IndexedDB, dan kanvas pratinjau reaktif berdampingan.
Sprint 2	2 Minggu	Modul Ekstraksi & Mesin Penilaian	Pipeline ekstraksi kata kunci lowongan via LLM JSON mode dan implementasi formula penilaian deterministik.
Sprint 3	2 Minggu	AI Bullet Rewriter & Ekspor Klien	Rekonstruksi kalimat formula Google XYZ dan kompilasi ekspor PDF/DOCX langsung di peramban.
Sprint 4	2 Minggu	Gerbang Pembayaran & Validasi ATS	Integrasi QRIS dinamis (Midtrans/Xendit) serta pengujian berkas hasil ekspor pada pengurai Workday dan Taleo.
12. Manajemen Risiko & Mitigasi
Pencegahan Halusinasi AI: Membatasi instruksi model bahasa hanya untuk memformat ulang dan memperjelas data riwayat yang telah dimasukkan pengguna tanpa menambahkan keahlian atau angka hasil yang tidak ada.

Pengendalian Biaya Inferensi Token: Memanfaatkan model berbiaya rendah (Gemini 1.5 Flash / GPT-4o-mini), membatasi panjang teks masukan, dan mengimplementasikan caching sesi di sisi klien.

Kompatibilitas Format Dokumen: Menyediakan opsi unduhan ganda (PDF linear untuk lamaran langsung via email/Greenhouse, dan DOCX OpenXML untuk portal korporat besar seperti Workday dan Taleo).