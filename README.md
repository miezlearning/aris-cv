# QuickTailor CV

Website generator CV ATS berdasarkan `PRD.md`, dengan UI doodle art berbasis Tailwind dan daisyUI. UI memakai font stack Sunghyun Sans dengan fallback aman.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Fitur MVP

- Editor Master CV lokal tanpa login.
- Penyimpanan IndexedDB melalui Zustand dan `idb-keyval`.
- Input deskripsi lowongan dengan ekstraksi kata kunci Bahasa Indonesia dan English technical terms.
- Skor kecocokan transparan: exact match, semantic proximity, dan kualitas format.
- Saran bullet berbasis Google XYZ dan STAR tanpa membuat data baru.
- Preview CV satu kolom yang ramah ATS.
- Export PDF dan DOCX sisi klien. Export pratinjau memakai watermark, export bersih memakai token lokal testing.
- UI doodle art memakai daisyUI sebagai component layer, lalu diberi sistem visual sketchbook khusus.
- Workspace bertab untuk mengurangi scroll panjang, dengan live preview sticky yang lebih lega.

Integrasi LLM dan QRIS dinamis belum disambungkan ke provider. Area tersebut diberi label jelas di UI agar tidak terlihat seperti layanan produksi.
