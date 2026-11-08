/* Hivelume alerts. A closed window can only play the Windows or phone notification sound. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function looking(client) {
  if (typeof client.focused === 'boolean') return client.focused;
  return client.visibilityState === 'visible';
}

async function show(data) {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (list.some(looking)) return;
  const id = String(data.tag || 'dm').slice(0, 80);
  await self.registration.showNotification(data.title || 'Hivelume', {
    body: data.body || 'New message',
    icon: '/icon.svg',
    tag: 'hive-' + id + '-' + Date.now(),
    renotify: true,
    silent: false,
    timestamp: Date.now(),
    vibrate: [220, 90, 220, 90, 320],
    data: { url: data.url || '/', id }
  });
}

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(show(data));
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.t !== 'note') return;
  event.waitUntil(show(data));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/';
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of list) {
      await client.focus();
      client.postMessage({ t: 'open', id: data.id || '' });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
