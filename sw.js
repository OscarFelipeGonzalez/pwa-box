// Service Worker para PWA Cascarón
const DB_NAME = 'PWALauncherDB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.includes('/virtual-app/')) {
    event.respondWith(
      (async () => {
        try {
          const parts = url.pathname.split('/virtual-app/')[1].split('/');
          const appId = decodeURIComponent(parts[0]);
          let filePath = parts.slice(1).map(p => decodeURIComponent(p)).join('/');

          if (!filePath || filePath.endsWith('/')) {
            filePath += 'index.html';
          }

          filePath = filePath.split('?')[0].split('#')[0];

          const db = await openDB();
          const tx = db.transaction('files', 'readonly');
          const store = tx.objectStore('files');
          
          const key = `${appId}:${filePath}`;
          const fileRecord = await new Promise((res, rej) => {
            const getReq = store.get(key);
            getReq.onsuccess = () => res(getReq.result);
            getReq.onerror = () => rej(getReq.error);
          });

          if (!fileRecord) {
            return new Response(`Archivo no encontrado en la app local: ${filePath}`, { 
              status: 404,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          }

          return new Response(fileRecord.blob, {
            status: 200,
            headers: {
              'Content-Type': fileRecord.mimeType || 'application/octet-stream',
              'Cache-Control': 'no-store'
            }
          });
        } catch (err) {
          return new Response(`Error interno del Service Worker: ${err.message}`, { 
            status: 500,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
      })()
    );
  }
});
