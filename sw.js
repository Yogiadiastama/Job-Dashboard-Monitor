// Nama cache, ganti versinya jika Anda membuat perubahan pada aset yang di-cache
const CACHE_NAME = 'projectflow-pro-cache-v1';

// Daftar file inti yang membentuk "app shell"
const urlsToCache = [
  '/',
  '/index.html',
  '/vite.svg'
];

// Event 'install': membuka cache dan menambahkan app shell ke dalamnya.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Event 'activate': membersihkan cache lama untuk memastikan aplikasi menggunakan versi terbaru.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Event 'fetch': mencegat permintaan jaringan dan menyajikannya dari cache jika tersedia (strategi cache-first).
self.addEventListener('fetch', event => {
  // Biarkan browser menangani permintaan non-GET dan permintaan ke API pihak ketiga (seperti Firebase, Google Fonts, dll.)
  // Ini penting agar fungsionalitas offline Firestore tidak terganggu.
  if (event.request.method !== 'GET' || new URL(event.request.url).hostname !== self.location.hostname) {
    return; // Biarkan browser yang menanganinya
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Jika ada di cache, langsung kembalikan dari cache.
        if (cachedResponse) {
          return cachedResponse;
        }

        // Jika tidak ada di cache, ambil dari jaringan.
        return fetch(event.request).then(
          networkResponse => {
            // Periksa apakah kita menerima respons yang valid
            if (networkResponse && networkResponse.status === 200) {
              // Penting: Kloning respons. Respons adalah stream
              // dan karena kita ingin browser dan cache mengonsumsi respons,
              // kita perlu mengkloningnya agar kita memiliki dua stream.
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(error => {
            // Tangani kesalahan jaringan (misalnya, saat offline)
            console.error('Fetch failed:', error);
            // Anda bisa mengembalikan halaman offline kustom di sini jika ada
        });
      })
  );
});
