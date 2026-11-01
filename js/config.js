/* Pengaturan situs.
   Selama apiKey masih "ISI_...", web jalan di MODE DEMO (data cuma di browser).
   Cara mengisinya ada di README.md. */

window.SITE_CONFIG = {
  title: 'Pohon Keluarga'   // ganti, misalnya "Keluarga Besar Hasan Basri"
};

// Salin dari Firebase Console > Project settings > Your apps > Web app.
// Nilai ini memang boleh publik; yang melindungi data adalah firestore.rules.
window.FIREBASE_CONFIG = {
  apiKey: 'ISI_API_KEY',
  authDomain: 'ISI_PROJECT_ID.firebaseapp.com',
  projectId: 'ISI_PROJECT_ID',
  appId: 'ISI_APP_ID'
};
