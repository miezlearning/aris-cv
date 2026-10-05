# Sunghyun Sans

UI sudah memakai font stack `Sunghyun Sans`, lalu fallback ke Arial dan Helvetica.

Jika kamu punya file font Sunghyun Sans dalam format `woff2`, taruh di folder ini dan ubah `@font-face` di `src/app/globals.css` agar memuat file tersebut, misalnya:

```css
@font-face {
  font-family: "Sunghyun Sans";
  src: url("/fonts/SunghyunSans.woff2") format("woff2");
  font-display: swap;
}
```

Preview CV tetap memakai Arial karena dokumen export harus ramah ATS.
