/**
 * Proxy de desarrollo (`ionic serve`) hacia Calendar, el servicio de citas.
 * Calendar no manda cabeceras CORS: desde el navegador (http://localhost:8100) se bloquea. El proxy hace la llamada de
 * servidor a servidor y la app usa `/calendar-api` (ver `calendarUrl` en `environment.ts`). En el celular (Capacitor) no
 * hace falta: usa la URL completa de `environment.prod.ts`.
 * Para probar contra el servicio local: CALENDAR_TARGET=http://localhost:3000 ionic serve   (su base ya es `/api`)
 */
const https = require('node:https');

const calendarTarget = process.env.CALENDAR_TARGET;

module.exports = {
  '/calendar-api': {
    target: calendarTarget ?? 'https://calendar-microservice-20369076707.us-central1.run.app',
    secure: !calendarTarget || calendarTarget.startsWith('https'),
    changeOrigin: true,
    agent: new https.Agent({ keepAlive: false }),
    pathRewrite: { '^/calendar-api': '/api' },
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.removeHeader('origin');
        proxyReq.removeHeader('referer');
      });
    },
  },
};
