import type { ConfigContext, ExpoConfig } from 'expo/config';
import { existsSync } from 'node:fs';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Villa Serena',
  slug: 'villa-serena-movil',
  android: {
    ...config.android,
    package: 'gt.villaserena.app',
    // El archivo se agrega localmente al vincular Firebase; no bloquea Expo Go.
    ...(existsSync('./google-services.json') ? { googleServicesFile: './google-services.json' } : {}),
  },
});
