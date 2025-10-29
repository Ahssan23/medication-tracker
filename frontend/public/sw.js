// public/sw.js
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Reminder', body: 'Time!' };
  const options = { body: data.body, data: { url: data.url } };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
