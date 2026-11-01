/* Pengaturan situs.
   Selama apiKey masih "ISI_...", web jalan di MODE DEMO (data cuma di browser).
   Cara mengisinya ada di README.md. */

window.SITE_CONFIG = {
  title: 'Pohon Keluarga'   // ganti, misalnya "Keluarga Besar Hasan Basri"
};

// Salin dari Firebase Console > Project settings > Your apps > Web app.
// Nilai ini memang boleh publik; yang melindungi data adalah firestore.rules.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAYtvsSSvysFc1BlM9R_XBIZSVj9ynVO9I",
  authDomain: "pohon-keluarga-f7309.firebaseapp.com",
  projectId: "pohon-keluarga-f7309",
  appId: "1:561030177080:web:82b893698171115a8d61cd"
};
