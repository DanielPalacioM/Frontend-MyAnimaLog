// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: 'https://pets-api-gateway-20369076707.us-central1.run.app/api',
  // Key de navegador restringida por dominio a Maps JavaScript API y Places API (New).
  // mapId: 'DEMO_MAP_ID' mientras se crea el Map ID con el estilo de la app.
  googleMaps: {
    apiKey: 'AIzaSyBY6Wc5EYmk4i9B4NewAz7X10scnRN6plE',
    mapId: 'DEMO_MAP_ID',
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
