# Nihongo Quest

Aplikasi belajar bahasa Jepang pribadi dengan **React + Vite, JavaScript, Tailwind CSS, React Router, dan Lucide React**. Versi pertama menyelesaikan alur 46 hiragana dasar. Semua progres awal adalah nol; tidak ada login atau data contoh pengguna.

## Instalasi dan menjalankan

Gunakan Node.js **22.12 atau lebih baru** (Node 22 LTS disarankan).

```sh
npm install
npm run dev
```

Buka URL yang dicetak Vite, biasanya **http://127.0.0.1:5173/**. Gunakan alamat dan browser yang sama setiap kali belajar karena localStorage terpisah per origin. `localhost` dan `127.0.0.1` memiliki progres berbeda.

```sh
npm run build
npm run preview
```

Build produksi berada di `dist/`. Preview biasanya tersedia di **http://127.0.0.1:4173/**. Jika Apache XAMPP aktif dan proyek berada di `C:\xampp\htdocs\japaneselearn`, hasil build bisa dibuka di **http://localhost/japaneselearn/dist/**. `base: './'` dan HashRouter mendukung hosting dalam subfolder dan refresh halaman tanpa aturan rewrite Apache.

Halaman sumber di root proyek perlu dijalankan melalui Vite; untuk Apache gunakan folder hasil build `dist`. Gunakan ekspor/impor untuk memindahkan progres dari alamat development ke alamat produksi.

## Fitur

- Dashboard XP, level, streak, akurasi, penguasaan, misi harian, dan aktivitas terakhir.
- Peta lengkap 46 hiragana dalam susunan gojūon; kelompok Y, W, dan ん tidak memiliki karakter buatan untuk sel kosong.
- Kartu belajar per kelompok dengan contoh kata berbahasa Jepang dan arti Indonesia.
- Kuis 10 soal dengan tiga bentuk: kana ke romaji, romaji ke kana, dan ketik romaji.
- Kanvas latihan menulis untuk 46 hiragana: mode meniru contoh dengan pola bantu, serta uji hafalan 10 soal dari romaji tanpa contoh. Mendukung mouse, sentuhan, pena, dan keyboard; tersedia urungkan dan hapus.
- Tombol Periksa tulisan memberikan hasil perkiraan bentuk, lalu menampilkan hiragana yang benar. Contoh tulisan tangan memakai pola goresan KanjiVG yang disertakan dalam aplikasi, sehingga latihan tidak perlu mengirim gambar ke layanan lain.
- Latihan umum dari kana yang telah diperkenalkan atau pernah dijawab. Latihan adaptif memprioritaskan kana dengan akurasi di bawah 70%, atau review jika tidak ada kelemahan.
- Hasil, riwayat, progres per kelompok, ekspor JSON, impor tervalidasi, dan reset dengan konfirmasi.
- Sidebar desktop dan navigasi bawah pada mobile; focus state, label form, dialog native, dan reduced motion.

## Struktur folder

```text
src/
  main.jsx                 # Entry point dan React Router
  styles.css               # Tailwind, tema, komponen, dan breakpoint
  components/
    Layout.jsx             # Sidebar, topbar, navigasi mobile
    ui.jsx                 # Progress bar, badge, dialog, empty state
    HandwritingCanvas.jsx  # Pointer/keyboard, goresan, pola bantu, hapus/urungkan
  context/
    ProgressContext.jsx    # State React dan penulisan localStorage
  data/
    kana.js                # 46 kana, kelompok, romaji, alternatif, contoh
    hiraganaStrokes.js      # Pola goresan KanjiVG dan titik referensi lokal
  lib/
    progress.js            # XP, streak, status, kuis, adaptif, validasi
    handwriting.js         # Perbandingan bentuk tulisan secara lokal
  pages/
    Dashboard.jsx
    Hiragana.jsx
    Learn.jsx
    Writing.jsx              # Meniru contoh dan 10 soal hafalan dengan kanvas
    Quiz.jsx
    Results.jsx
    Difficult.jsx
    Progress.jsx
    Settings.jsx
tests/
  progress.test.js         # Pengujian logika tanpa browser
  handwriting.test.js      # Bentuk benar/salah, variasi tulisan, dan coretan
public/
  favicon.svg
  kanjivg-license.txt         # Sumber, atribusi, dan lisensi pola goresan
```

## Cara kerja progres

Data disimpan sebagai satu snapshot berversi (`version: 1`) di localStorage dengan kunci `nihongo-quest.progress.v1`. Snapshot memuat statistik 46 kana, XP, tanggal aktivitas, misi per tanggal, riwayat pelajaran, hasil kuis, serta sesi kuis aktif. Data kosong memulai progres nol; data rusak atau penyimpanan yang ditolak menghasilkan pemberitahuan dan tetap memungkinkan aplikasi berjalan.

- **Baru:** belum diperkenalkan dan belum memiliki jawaban.
- **Dipelajari:** pernah diperkenalkan atau dijawab, tetapi belum memenuhi penguasaan.
- **Dikuasai:** minimal 5 jawaban dan rasio benar minimal 80%. Status dapat turun jika akurasi menurun.
- Jumlah “sudah dipelajari” pada dashboard mencakup kana dikuasai. Tiga kategori pada halaman progres saling terpisah.
- Akurasi keseluruhan dihitung dari seluruh jawaban benar dibagi seluruh jawaban, bukan rata-rata persentase setiap kana. Tanpa jawaban, nilainya 0%.

Pengenalan pertama memberikan **2 XP sekali per kana**. Jawaban benar memberikan **2 XP**, langsung tersimpan. Sesi yang diselesaikan memberikan **10 XP**, dengan tambahan **10 XP** jika sempurna. Kuis sempurna menghasilkan 40 XP. Jawaban sesi yang ditinggalkan tetap tercatat, tanpa bonus penyelesaian. Level = `floor(XP / 100) + 1`.

Jawaban dikunci melalui pemeriksaan ID sesi, ID soal, indeks, dan jumlah jawaban. Bonus diberikan dalam aksi finalisasi, bukan saat halaman hasil dirender. Refresh dapat melanjutkan sesi aktif atau membuka hasil tanpa menggandakan XP.

Misi kelompok selesai ketika huruf terakhir dalam kelompok diperkenalkan pertama kali. Misi latihan menghitung jawaban hari ini, termasuk jawaban salah. Tanggal menggunakan `Intl.DateTimeFormat` dengan zona **Asia/Jakarta**. Streak dihitung dari hari berurutan; streak kemarin tetap terlihat hari ini, tetapi satu hari penuh yang terlewat mereset rangkaian.

Adaptif hanya menganggap kana dengan riwayat dan akurasi di bawah 70% sebagai sulit. Tanpa riwayat jawaban, pengguna diarahkan ke kelompok vokal dan kuis pertama. Bobot `1 + (1 - akurasi) × 4` membuat huruf lemah lebih sering terpilih. Pilihan pengecoh berasal dari kana yang sudah dipelajari. Kuis kelompok hanya menggunakan kelompok yang dipilih; jumlah pilihan menyesuaikan ukuran kelompok. `wo` menerima `o` untuk jawaban ketik, dan `o` tidak dipakai sebagai pengecoh dalam soal romaji untuk を.

### Latihan menulis

Buka **Latihan Menulis** di navigasi atau **Tulis huruf ini** pada kartu belajar. Pilih kelompok huruf, atau semua 46 hiragana. Mode **Meniru contoh** memperlihatkan contoh tulisan tangan dan pola tipis yang bisa dimatikan. Mode **Uji hafalan** mengacak 10 soal romaji, menyembunyikan contoh sampai jawaban diperiksa, lalu menampilkan hasil sesi dan huruf yang dapat dilatih ulang.

Pemeriksaan berlangsung sepenuhnya di browser dengan membandingkan bentuk dan goresan terhadap referensi lokal, termasuk kandidat hiragana lain. Ini bantuan latihan berbasis kemiripan, bukan OCR atau penilaian kaligrafi: variasi tulisan tangan bisa salah dinilai. Tulisan kosong, titik kecil, dan coretan yang tidak sesuai tidak otomatis mendapat hasil benar. Latihan menulis tidak menambah XP, akurasi, atau penguasaan pada progres utama. Hasil menulis hanya berlaku selama sesi halaman; refresh atau pindah halaman memulai ulang latihan ini. Progres belajar dan kuis yang sudah ada tetap tersimpan seperti sebelumnya.

Keyboard pada kanvas: tombol panah memindahkan pena, spasi mulai/akhiri goresan, Enter mengakhiri goresan, Shift + panah untuk langkah kecil, dan Ctrl/Cmd + Z untuk urungkan. Panduan gambar berasal dari [KanjiVG](https://kanjivg.tagaini.net/) dengan atribusi dan lisensi **CC BY-SA 3.0** dalam `public/kanjivg-license.txt`.

## Cadangan dan validasi

Pengaturan menyediakan ekspor seluruh snapshot ke JSON. Impor memeriksa versi, semua ID kana, hitungan bilangan bulat, tanggal, struktur soal, pilihan unik, hasil, dan konsistensi XP. File maksimal 5 MB. Impor invalid tidak mengubah progres; impor valid meminta konfirmasi penggantian. Reset juga meminta konfirmasi. Ekspor dulu sebelum menghapus data browser atau pindah perangkat.

## Verifikasi

```sh
npm test
npm run build
```

Pengujian otomatis mencakup inventory kana, progres nol, XP satu kali, penguasaan, penguncian soal, kuis sempurna/tidak sempurna, kelompok kecil, alternatif romaji, pemilihan berbobot, batas tengah malam Jakarta, streak, level, pemulihan sesi, serta impor data rusak.

Pengujian menulis mencakup semua 46 pola benar, 2.070 pasangan huruf salah, sketsa sederhana yang ditulis manual, variasi ukuran/posisi/arah, goresan kosong/kecil/hilang, coretan, variasi pointer, dan regresi huruf mirip れ/わ. Alur browser menulis juga diperiksa: contoh tersembunyi pada soal, muncul setelah pemeriksaan, satu sesi 10 soal sampai hasil, tulisan く yang mendapat Benar, masukan pointer dan keyboard, urungkan/hapus, pola bantu, serta kanvas persegi tanpa overflow pada layar 360 px dan 320 px.

Alur browser diperiksa pada desktop dan mobile: belajar → kuis dengan ketiga variasi → hasil → dashboard/progres; refresh pada kartu, sesi aktif, dan hasil; latihan adaptif; tombol ekspor; dialog reset dan pembatalan. Pengujian browser menggunakan origin terpisah sehingga preview pengguna tetap berawal dari nol.

Validasi impor dan round trip cadangan diuji otomatis. Uji unggah file melalui browser tidak diselesaikan karena pemeriksaan izin menolak unggah file ke preview lokal; fungsi impor tetap diimplementasikan dengan pemilih file dan konfirmasi penggantian.

Katakana, kosakata sebagai modul, grammar, kanji, SRS, dan roadmap JLPT berada di luar versi pertama.

Referensi inventory kana: [Japan Foundation — Irodori Hiragana](https://www2.jpfbj.cn/irodori/resources/pdf/X_Hiragana_All.pdf). Setup mengikuti [Vite](https://vite.dev/guide/) dan [Tailwind CSS untuk Vite](https://tailwindcss.com/docs/installation/using-vite).
#   s a g i r i - s t u d y  
 