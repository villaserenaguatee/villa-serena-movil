const fs = require('node:fs');
const config = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
const projectId = config.extra?.eas?.projectId;
const errors = [];
if (!projectId || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(projectId)) errors.push('Falta un projectId de Expo válido. Ejecuta eas init.');
if (!fs.existsSync('google-services.json')) errors.push('Falta google-services.json de Firebase en la raíz de la app.');
else {
  try {
    const firebase = JSON.parse(fs.readFileSync('google-services.json', 'utf8'));
    if (!firebase.client?.some(client => client.client_info?.android_client_info?.package_name === 'gt.villaserena.app')) errors.push('google-services.json no contiene la app gt.villaserena.app.');
  } catch { errors.push('google-services.json no es un JSON válido.'); }
}
if (errors.length) { errors.forEach(error => console.error(error)); process.exitCode = 1; }
else console.log('Configuración local lista. Comprueba las credenciales FCM v1 en EAS antes de compilar.');
