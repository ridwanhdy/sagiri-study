# Nihongo Quest

Aplikasi belajar bahasa Jepang berbahasa Indonesia yang berfokus pada **46 hiragana dasar**. Belajar melalui kartu, kuis, dan latihan menulis, lalu pantau XP, streak, serta penguasaan setiap huruf.

Aplikasi berjalan di browser tanpa akun atau database. Progres disimpan secara lokal; pengguna baru mulai dengan **0 XP dan level 1**.

## Fitur

- Dashboard berisi XP, level, streak, akurasi, penguasaan, misi harian, dan aktivitas terakhir.
- Peta 46 hiragana dalam susunan gojūon, termasuk kelompok Y, W, dan ん.
- Kartu belajar per kelompok dengan romaji, contoh kata Jepang, dan arti Indonesia.
- Kuis 10 soal dengan tiga bentuk: kana ke romaji, romaji ke kana, dan ketik romaji.
- Latihan umum untuk huruf yang sudah dipelajari dan latihan adaptif untuk huruf yang masih sulit.
- Kanvas menulis dengan mode **Meniru contoh** dan **Uji hafalan**, pola bantu, pemeriksaan bentuk, urungkan, dan hapus. Mendukung mouse, sentuhan, pena, serta keyboard.
- Hasil kuis, riwayat, progres per kelompok, dan cadangan JSON melalui ekspor/impor.
- Tampilan responsif dengan sidebar desktop, navigasi bawah pada mobile, serta dukungan fokus keyboard dan reduced motion.

## Teknologi

React 19, Vite 7, JavaScript, Tailwind CSS 4, React Router 7 dengan `HashRouter`, dan Lucide React. Pengujian menggunakan test runner bawaan Node.js.

## Instalasi dan menjalankan

Siapkan **Node.js 22.12 atau lebih baru** dari rilis yang didukung Vite, beserta npm. Jalankan perintah berikut dari root proyek, yaitu folder yang memuat `package.json`:

```sh
npm ci
npm run dev
```

`npm ci` memasang dependensi sesuai `package-lock.json`. Buka URL yang dicetak Vite, biasanya [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

### Perintah proyek

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan server development pada `127.0.0.1`. |
| `npm test` | Menjalankan pengujian logika progres dan pemeriksaan tulisan. |
| `npm run build` | Membuat build produksi di folder `dist/`. |
| `npm run preview` | Meninjau hasil build secara lokal pada `127.0.0.1`. |

Untuk meninjau build produksi:

```sh
npm run build
npm run preview
```

Preview biasanya tersedia di [http://127.0.0.1:4173/](http://127.0.0.1:4173/). Ikuti URL di terminal jika port tersebut sedang digunakan.

### Menjalankan melalui XAMPP

Jika proyek berada di `C:\xampp\htdocs\japaneselearn`:

1. Jalankan `npm run build` dari folder proyek.
2. Aktifkan Apache melalui XAMPP.
3. Buka [http://localhost/japaneselearn/dist/](http://localhost/japaneselearn/dist/).

Apache menyajikan file statis dari `dist/`. Konfigurasi Vite `base: './'` dan `HashRouter` mendukung hosting dalam subfolder serta refresh halaman tanpa aturan rewrite Apache. Untuk mengembangkan kode sumber, gunakan `npm run dev`; bangun ulang aplikasi setelah mengubah kode yang akan disajikan Apache.

## Mulai belajar

1. Pilih **Mulai Belajar** di dashboard atau pilih kelompok di **Peta Hiragana**.
2. Baca kartu dan klik **Sudah Saya Kenal** untuk mencatat pengenalan huruf. Membuka kartu saja belum menambah progres.
3. Setelah semua huruf kelompok dikenali, pilih **Mulai kuis kelompok**. Ulangi latihan melalui **Huruf Sulit** sesuai kebutuhan.
4. Gunakan **Latihan Menulis** atau tombol **Tulis huruf ini** pada kartu untuk melatih bentuk huruf. Pantau hasil belajar di **Progres Saya**.

## Progres dan penyimpanan

Progres disimpan sebagai snapshot `version: 1` di `localStorage` dengan kunci `nihongo-quest.progress.v1`. Data mencakup statistik kana, XP, tanggal aktivitas, misi harian, riwayat pelajaran, hasil kuis, dan sesi kuis aktif.

Gunakan **browser dan origin yang sama** untuk melanjutkan belajar. Origin mencakup protokol, hostname, dan port: `localhost` dan `127.0.0.1`, serta port development dan preview, memiliki penyimpanan terpisah. Gunakan ekspor/impor untuk memindahkan progres antaralamat atau perangkat. Jika penyimpanan rusak atau ditolak browser, aplikasi menampilkan pemberitahuan dan tetap dapat digunakan.

### Status dan akurasi

| Status | Syarat |
| --- | --- |
| Baru | Belum diperkenalkan dan belum pernah dijawab. |
| Dipelajari | Pernah diperkenalkan atau dijawab, tetapi belum memenuhi syarat penguasaan. |
| Dikuasai | Minimal 5 jawaban dengan rasio benar minimal 80%. |

Status penguasaan dapat turun jika akurasi menurun. Jumlah "sudah dipelajari" pada dashboard mencakup huruf yang dikuasai; tiga kategori pada halaman progres dihitung terpisah. Akurasi keseluruhan dihitung dari total jawaban benar dibagi total jawaban, bukan rata-rata persentase setiap kana. Tanpa jawaban, akurasi bernilai 0%.

### XP dan level

| Aktivitas | XP |
| --- | --- |
| Mengenali kana pertama kali | +2, sekali per kana |
| Menjawab soal kuis dengan benar | +2 per jawaban |
| Menyelesaikan sesi 10 soal | +10 |
| Menyelesaikan kuis sempurna | Tambahan +10 |

Kuis sempurna menghasilkan **40 XP**. Jawaban pada sesi yang ditinggalkan tetap tercatat, tanpa bonus penyelesaian. Level dihitung dengan `floor(XP / 100) + 1`.

Jawaban tersimpan langsung dan dikunci agar tidak dihitung dua kali. Bonus diberikan saat sesi selesai. Refresh dapat melanjutkan kuis aktif atau membuka hasil tanpa menggandakan XP.

### Misi harian, streak, dan latihan adaptif

- Misi mengenali satu kelompok selesai ketika huruf terakhir yang belum dikenali dalam kelompok diperkenalkan pertama kali.
- Misi latihan menghitung 10 jawaban hari ini, termasuk jawaban salah.
- Tanggal aktivitas dan streak mengikuti zona **Asia/Jakarta**. Streak kemarin tetap terlihat hari ini; melewatkan satu hari penuh memutus rangkaian.
- Latihan adaptif memprioritaskan kana yang pernah dijawab dan memiliki akurasi di bawah 70%. Bobot `1 + (1 - akurasi) × 4` membuat huruf yang lebih lemah lebih sering dipilih. Jika tidak ada huruf sulit, latihan menjadi review huruf yang sudah dipelajari.
- Tanpa riwayat jawaban, latihan adaptif mengarahkan pengguna ke kelompok vokal dan kuis pertama. Kuis kelompok hanya memakai huruf dari kelompok tersebut; jumlah pilihan menyesuaikan ukuran kelompok.
- Untuk jawaban ketik, `wo` menerima `o`. Alternatif `o` tidak dijadikan pilihan pengecoh dalam soal kana ke romaji untuk を.

## Latihan menulis

Pilih satu kelompok atau semua 46 hiragana di halaman **Latihan Menulis**:

- **Meniru contoh:** contoh tulisan tangan dan pola tipis ditampilkan. Pola bantu dapat dimatikan.
- **Uji hafalan:** jawab 10 soal romaji dengan menulis hiragana. Contoh disembunyikan sampai tulisan diperiksa, lalu hasil sesi menampilkan huruf yang dapat dilatih ulang.

Tombol **Periksa tulisan** membandingkan bentuk dan jumlah goresan dengan referensi lokal, termasuk kandidat hiragana lain. Urutan dan arah goresan tidak dinilai secara ketat. Pemeriksaan berjalan sepenuhnya di browser tanpa mengirim gambar ke layanan lain.

Hasil merupakan perkiraan kemiripan, bukan OCR atau penilaian kaligrafi; variasi tulisan tangan dapat salah dinilai. Gunakan contoh untuk memeriksa kembali. Tulisan kosong, titik kecil, goresan yang kurang, dan coretan tidak otomatis dinilai benar.

**Latihan menulis belum menambah XP, akurasi, atau penguasaan pada progres utama.** Hasil menulis berlaku selama sesi halaman; refresh atau pindah halaman memulai ulang sesi tersebut.

### Keyboard pada kanvas

Fokuskan kanvas dengan klik atau tombol Tab sebelum menggunakan kontrol berikut:

| Tombol | Fungsi |
| --- | --- |
| Panah | Memindahkan pena. |
| Shift + panah | Memindahkan pena dengan langkah kecil. |
| Spasi | Memulai atau mengakhiri goresan. |
| Enter | Mengakhiri goresan. |
| Escape | Membatalkan goresan yang sedang aktif. |
| Ctrl/Cmd + Z | Mengurungkan goresan terakhir. |

## Cadangan dan pemulihan

Buka **Pengaturan** untuk mengelola data:

- **Ekspor JSON** mengunduh seluruh snapshot progres sebagai cadangan.
- **Impor JSON** menerima file maksimal 5 MB. Aplikasi memeriksa versi, ID kana, hitungan, tanggal, soal, hasil, dan konsistensi XP. File yang tidak valid tidak mengubah progres; file valid meminta konfirmasi sebelum mengganti data saat ini.
- **Reset progres** meminta konfirmasi sebelum menghapus progres dari browser.

Ekspor cadangan sebelum menghapus data browser, mengganti origin, atau pindah perangkat.

## Struktur proyek

```text
src/
  main.jsx                 # Entry point dan rute aplikasi
  styles.css               # Tailwind, tema, komponen, dan breakpoint
  components/
    Layout.jsx             # Sidebar, topbar, dan navigasi mobile
    ui.jsx                 # Progress bar, badge, dialog, dan empty state
    HandwritingCanvas.jsx  # Input pointer/keyboard dan kontrol kanvas
  context/
    ProgressContext.jsx    # State React dan penyimpanan localStorage
  data/
    kana.js                # 46 kana, kelompok, romaji, dan contoh kata
    hiraganaStrokes.js      # Pola KanjiVG dan titik referensi lokal
  lib/
    progress.js            # XP, streak, kuis, adaptif, dan validasi
    handwriting.js         # Pemeriksaan kemiripan tulisan
  pages/
    Dashboard.jsx
    Hiragana.jsx
    Learn.jsx
    Writing.jsx
    Quiz.jsx
    Results.jsx
    Difficult.jsx
    Progress.jsx
    Settings.jsx
tests/
  progress.test.js          # Pengujian logika progres
  handwriting.test.js       # Pengujian pola, variasi tulisan, dan coretan
public/
  favicon.svg
  kanjivg-license.txt       # Atribusi dan lisensi pola goresan
package.json               # Dependensi dan perintah npm
package-lock.json          # Versi dependensi untuk npm ci
vite.config.js             # Plugin React/Tailwind dan base relatif
```

## Pengujian

```sh
npm test
npm run build
```

Pengujian progres mencakup inventaris 46 kana, progres awal, XP, penguasaan, penguncian jawaban, hasil kuis, kelompok kecil, alternatif romaji, pemilihan adaptif, tanggal Jakarta, streak, level, pemulihan sesi, dan validasi cadangan.

Pengujian tulisan mencakup 46 pola benar, 2.070 pasangan huruf salah, sketsa manual, variasi ukuran/posisi/urutan goresan, goresan kosong/kecil/hilang, coretan, variasi titik pointer, serta regresi huruf mirip れ/わ. Pengujian ini berjalan melalui Node.js; tampilan dan interaksi browser perlu diperiksa secara manual.

Cakupan aplikasi saat ini adalah hiragana dasar. Katakana, modul kosakata, grammar, kanji, SRS, dan roadmap JLPT belum tersedia.

## Referensi dan atribusi

- Inventaris kana: [Japan Foundation — Irodori Hiragana](https://www2.jpfbj.cn/irodori/resources/pdf/X_Hiragana_All.pdf).
- Pola goresan: [KanjiVG](https://kanjivg.tagaini.net/), karya Ulrich Apel dan kontributor KanjiVG. Data pola dan turunannya menggunakan **CC BY-SA 3.0**; atribusi, sumber, dan teks lisensi tersedia di [public/kanjivg-license.txt](public/kanjivg-license.txt).
- Dokumentasi alat: [Vite](https://vite.dev/guide/) dan [Tailwind CSS untuk Vite](https://tailwindcss.com/docs/installation/using-vite).
