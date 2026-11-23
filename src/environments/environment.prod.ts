export const environment = {
  production: true,
  // Asistente de IA. `requiresPlan`: cuando exista el plan de pago, ponerlo en true y conectar AiAccessService.hasPaidPlan().
  ai: { requiresPlan: false, baseUrl: '' },
  // Servicio Medical directo (sin pasar por el gateway), para alergias, desparasitación y esterilización mientras el gateway no
  // publique /api/allergies, /api/dewormings y /api/pets/{id}/clinical-*. Ej. 'https://<medical>.run.app' (sin /api). Vacío = gateway.
  // El servicio tiene que permitir CORS desde http://localhost:8100.
  medicalUrl: '',
  // Calendar (citas: pedir, mis citas, cancelar, reprogramar) es un servicio aparte del gateway. Con /api y sin barra final.
  // Ej. 'https://calendar-microservice-20369076707.us-central1.run.app/api'. Vacío = gateway (hoy no publica esas rutas).
  // En el navegador necesita CORS desde http://localhost:8100; en móvil nativo no.
  calendarUrl: '',
  apiUrl: 'https://pets-api-gateway-20369076707.us-central1.run.app/api', // cámbialo cuando tengan dominio real
  // Key de navegador restringida por dominio a Maps JavaScript API y Places API (New).
  // mapId: Map ID "MyAnimaLog Web" con el estilo de la app (se edita en Google Cloud, sin redesplegar).
  googleMaps: {
    apiKey: 'AIzaSyBY6Wc5EYmk4i9B4NewAz7X10scnRN6plE',
    mapId: 'e2b9dc397cc68605f7024cf8',
  },

};
