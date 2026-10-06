# Design notes

Reading this as: aplikasi web kreatif untuk jobseeker Indonesia yang ingin menyesuaikan CV tanpa merasa sedang memakai dashboard korporat. Arah visual baru: doodle art, sketchbook, sticky notes, panel seperti coretan tangan, dan workspace bertab agar scroll tidak melelahkan. Preview CV tetap bersih karena hasil akhir harus aman untuk ATS.

Dial: ENERGY 3 / RHYTHM 3 / MOTION 2

Keputusan utama:

- Library UI: daisyUI dipakai sebagai lapisan komponen Tailwind yang umum dipakai di GitHub, lalu ditimpa dengan sistem visual doodle agar tidak terasa template.
- Warna: paper, ink, butter, sky, clay, dan moss dipakai seperti alat tulis di meja kerja. Ink tetap dominan supaya kontras teks kuat. Moss adalah satu-satunya warna aksi, sisanya hanya penanda status yang nyata (terpenuhi, serupa, belum ada), bukan hiasan.
- Tipografi: Sunghyun Sans dipakai sebagai font utama UI dengan fallback Arial dan Helvetica. Preview CV tetap memakai Arial agar export aman untuk ATS.
- Layout: workspace dipecah menjadi panel kiri, editor di tengah, dan preview kanan yang sticky mulai lebar xl. Di bawah xl preview dibuka lewat drawer karena dua kolom tidak cukup untuk lembar CV yang terbaca.
- Spacing: editor dibuat seperti lembar kerja dengan sticky-note cards, sementara preview CV diberi frame lebih lega dan tetap linear.
- Cards: sketchy cards dipakai untuk membedakan modul kerja dan memberi identitas visual, bukan untuk mendekorasi semua area secara acak.
- Bahasa: seluruh antarmuka memakai bahasa Indonesia sehari-hari. Istilah teknis hanya muncul di dokumen CV hasil ekspor (Summary, Experience, Education, Skills) karena itu yang dibaca sistem ATS.

Perubahan pada revisi ini:

- Motion naik dari 1 ke 2. Semua elemen bergerak saat masuk layar, transisi tab, dan angka skor naik dari nol. Gerakan loop dan parallax tetap tidak dipakai: halaman ini berisi formulir panjang, jadi gerakan hanya menandai "ini baru muncul" dan "ini hasil barumu", lalu berhenti. Semua gerakan mati total saat pengguna mengaktifkan prefers-reduced-motion.
- Alur 4 langkah di halaman ringkasan bukan template "How It Works". Isinya status asli dari store: persentase data yang terisi, jumlah kata kunci lowongan, jumlah saran yang menunggu keputusan. Langkah yang belum selesai ditandai sebagai titik mulai, karena pengguna awam tidak tahu harus mengisi apa lebih dulu.
- Label teknis diganti. Contoh: "JD extractor dan keyword gap" jadi "Kata kunci dari lowongan", "Taksonomi keterampilan" jadi "Keahlian kamu", "Accept/Edit/Reject" jadi "Pakai saran ini/Lewati". Alasan: pengguna sasaran adalah fresh graduate dan career switcher, bukan perekrut yang paham istilah ATS.
- Setiap kata kunci yang belum ada di CV diberi arahan penempatan, bukan hanya daftar merah. Arahan ini tidak pernah mengklaim pengguna punya keahlian tersebut.
- Preview CV kembali terlihat berdampingan mulai xl, sesuai PRD Modul 5. Alasan: umpan balik langsung saat mengetik adalah cara tercepat pengguna awam memahami kenapa sebuah kalimat perlu diubah.
