/* Hivelume desktop alerts for direct messages */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (list.some((c) => c.visibilityState === 'visible')) return;
    await self.registration.showNotification(data.title || 'Hivelume', {
      body: data.body || 'New message',
      tag: data.tag || 'hivelume',
      renotify: true,
      silent: false,
      data: { url: '/' }
    });
  })());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      await c.focus();
      return;
    }
    await self.clients.openWindow('/');
  })());
});
