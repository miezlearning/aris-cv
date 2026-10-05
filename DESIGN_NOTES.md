# Design notes

Reading this as: aplikasi web kreatif untuk jobseeker Indonesia yang ingin menyesuaikan CV tanpa merasa sedang memakai dashboard korporat. Arah visual baru: doodle art, sketchbook, sticky notes, panel seperti coretan tangan, dan workspace bertab agar scroll tidak melelahkan. Preview CV tetap bersih karena hasil akhir harus aman untuk ATS.

Dial: ENERGY 3 / RHYTHM 3 / MOTION 1

Keputusan utama:

- Library UI: daisyUI dipakai sebagai lapisan komponen Tailwind yang umum dipakai di GitHub, lalu ditimpa dengan sistem visual doodle agar tidak terasa template.
- Warna: paper, ink, butter, sky, clay, dan moss dipakai seperti alat tulis di meja kerja. Ink tetap dominan supaya kontras teks kuat.
- Tipografi: Sunghyun Sans dipakai sebagai font utama UI dengan fallback Arial dan Helvetica. Preview CV tetap memakai Arial agar export aman untuk ATS.
- Layout: workspace dipecah menjadi panel kiri, editor bertab di tengah, dan preview kanan yang sticky. Tujuannya mengurangi scroll vertikal panjang.
- Spacing: editor dibuat seperti lembar kerja dengan sticky-note cards, sementara preview CV diberi frame lebih lega dan tetap linear.
- Cards: sketchy cards dipakai untuk membedakan modul kerja dan memberi identitas visual, bukan untuk mendekorasi semua area secara acak.
- Motion: hanya hover dan focus karena produk berisi formulir panjang. Animasi loop tidak dipakai agar fokus tetap pada data CV.
