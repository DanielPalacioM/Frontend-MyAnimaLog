// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // Asistente de IA. `requiresPlan`: cuando exista el plan de pago, ponerlo en true y conectar AiAccessService.hasPaidPlan().
  ai: { requiresPlan: false, baseUrl: '' },
  // Servicio Medical directo (sin pasar por el gateway), para alergias, desparasitación y esterilización mientras el gateway no
  // publique /api/allergies, /api/dewormings y /api/pets/{id}/clinical-*. Ej. 'https://<medical>.run.app' (sin /api). Vacío = gateway.
  // El servicio tiene que permitir CORS desde http://localhost:8100.
  medicalUrl: '',
  apiUrl: 'https://pets-api-gateway-20369076707.us-central1.run.app/api',
  // Key de navegador restringida por dominio a Maps JavaScript API y Places API (New).
  // mapId: Map ID "MyAnimaLog Web" con el estilo de la app (se edita en Google Cloud, sin redesplegar).
  googleMaps: {
    apiKey: 'AIzaSyBY6Wc5EYmk4i9B4NewAz7X10scnRN6plE',
    mapId: 'e2b9dc397cc68605f7024cf8',
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
