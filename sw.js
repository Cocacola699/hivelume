/* Hivelume alerts. A closed window can only play the Windows or phone notification sound. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function show(data, force) {
  if (!force) {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (list.some((client) => client.visibilityState === 'visible')) return;
  }
  const id = String(data.tag || 'dm').slice(0, 80);
  const title = data.title || 'Hivelume';
  const opts = {
    body: data.body || 'New message',
    tag: 'hive-' + id,
    renotify: true,
    silent: false,
    timestamp: Date.now(),
    data: { url: data.url || '/', id }
  };
  try {
    await self.registration.showNotification(title, opts);
  } catch (e) {
    await self.registration.showNotification(title, {
      body: opts.body,
      tag: opts.tag,
      data: opts.data
    });
  }
}

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(show(data, true));
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.t !== 'note') return;
  event.waitUntil(show(data, false));
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
