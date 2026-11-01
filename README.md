# Pohon Keluarga

Web silsilah keluarga. Siapa saja bisa **melihat** pohonnya, tapi hanya **admin yang sudah login** yang bisa menambah, mengubah, dan menghapus anggota.

- Halaman publik: `index.html`
- Halaman admin (login + form): `admin.html`
- Umur dihitung otomatis dari tanggal lahir setiap halaman dibuka, jadi naik sendiri tiap ulang tahun. Kalau ada tanggal wafat, umur dihitung sampai tanggal itu.
- Pasangan digambar berdampingan, anak di bawahnya, saudara berjajar ke samping, dan begitu terus sampai cucu, cicit, dst.

Web ini statis (HTML, CSS, JavaScript), jadi bisa di-hosting gratis di GitHub Pages. Data disimpan di Firebase Firestore (gratis untuk pemakaian sekecil ini), karena GitHub Pages tidak bisa menyimpan data.

## Coba dulu tanpa Firebase (mode demo)

Selama `js/config.js` belum diisi, web jalan di **mode demo**: data cuma tersimpan di browser kamu sendiri.

1. Buka `admin.html` (klik dua kali pun bisa).
2. Masuk dengan `admin@demo.local` / `demo123`.
3. Klik **Isi data contoh**, lalu buka `index.html` untuk melihat pohonnya.

Mode demo hanya untuk mencoba. Supaya semua orang melihat data yang sama, pasang Firebase di bawah.

## Pasang Firebase (sekali saja, sekitar 10 menit)

1. Buka <https://console.firebase.google.com>, klik **Create a project**, beri nama bebas. Google Analytics boleh dimatikan.
2. Di halaman project, klik ikon **Web** (`</>`), beri nama app, lalu **Register app**. Salin isi `firebaseConfig` ke `js/config.js` (`apiKey`, `authDomain`, `projectId`, `appId`).
3. Menu **Build > Authentication > Get started > Sign-in method**, aktifkan **Email/Password**.
4. Masih di Authentication, tab **Users > Add user**. Isi email dan kata sandi admin. Setelah dibuat, **salin kolom User UID** akun itu.
5. Menu **Build > Firestore Database > Create database**. Pilih lokasi terdekat (misalnya `asia-southeast2` Jakarta), mulai dalam **production mode**.
6. Di Firestore, tab **Rules**. Tempel isi `firestore.rules`, ganti `GANTI_DENGAN_UID_ADMIN` dengan UID dari langkah 4, lalu **Publish**.
7. Kalau nanti login muncul error `unauthorized-domain`, buka **Authentication > Settings > Authorized domains** dan tambahkan `USERNAME.github.io`.

Setelah itu `js/config.js` yang sudah terisi mematikan mode demo otomatis.

### Kenapa aman walau `apiKey` kelihatan di GitHub

`apiKey` Firebase memang bukan rahasia; fungsinya hanya mengenali project. Yang menjaga data adalah **rules** di langkah 6: semua orang boleh membaca, tapi menulis hanya untuk satu UID admin. Jangan bagikan kata sandi admin.

Hanya buat satu akun di Authentication. Akun lain tidak akan bisa menulis walaupun berhasil mendaftar, karena rules mengecek UID.

## Deploy ke GitHub Pages

1. Buat repo baru di GitHub, lalu unggah semua isi folder ini (`index.html`, `admin.html`, `css/`, `js/`, dst.).
2. Repo > **Settings > Pages**. Source: **Deploy from a branch**, branch `main`, folder `/ (root)`, **Save**.
3. Tunggu 1-2 menit. Link web muncul di halaman yang sama (`https://USERNAME.github.io/NAMA-REPO/`). Halaman admin ada di `.../admin.html`.

## Cara memakai (admin)

1. Buka `admin.html` dan masuk.
2. Tambahkan orang yang paling atas dulu, misalnya kakek: **Posisi di pohon = Paling atas**.
3. Tambahkan pasangannya: **Pasangan dari…** lalu pilih kakek.
4. Tambahkan anak-anaknya: **Anak dari…** lalu pilih kakek (atau neneknya, hasilnya sama). Setelah menambah satu anak, posisi di pohon tetap terpilih supaya kamu bisa langsung menambah saudaranya.
5. Untuk cucu: **Anak dari…** lalu pilih orang tuanya. Begitu juga seterusnya.
6. Sudah wafat? Isi **Tanggal wafat**. Kosongkan kalau masih hidup.

Aturan: satu orang punya satu pasangan, dan anak otomatis ikut pasangan orang tuanya. Menghapus seseorang ikut menghapus pasangan dan seluruh keturunannya (ada konfirmasi dulu).

Judul halaman bisa diganti di `js/config.js` (`title`).

## Menjalankan di komputer sendiri

Klik dua kali `index.html` sudah cukup untuk mode demo. Kalau Firebase sudah terpasang dan login bermasalah saat dibuka lewat `file://`, jalankan server lokal:

```
python3 -m http.server 8000
```

lalu buka <http://localhost:8000>.

## Tes

```
node tests/test-logic.js
```

Mengecek hitungan umur (termasuk lahir 29 Februari), susunan pohon (pasangan, anak, cucu, tidak ada kartu bertumpuk), dan aturan hubungan keluarga.

## Struktur file

| File | Isi |
| --- | --- |
| `index.html`, `js/tree.js` | Halaman publik dan penggambar pohon |
| `admin.html`, `js/admin.js` | Login dan form admin |
| `js/tree-logic.js` | Hitung umur, susunan pohon, validasi |
| `js/db.js` | Penyimpanan data (Firebase atau mode demo) |
| `js/config.js` | Pengaturan Firebase dan judul |
| `firestore.rules` | Aturan: baca untuk semua, tulis hanya admin |
| `css/style.css` | Tampilan |
