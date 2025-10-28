import type { AppConfig } from './lib/types';

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'Bosch Invented for Life',
  pageTitle: 'Allion.ai Voice Agent',
  pageDescription: 'Mechanics Trusted Co-pilot',

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,

  logo: '/bosch_logo_embedded.svg',
  accent: '#002cf2',
  logoDark: '/bosch_logo_embedded.svg',
  accentDark: '#1fd5f9',
  startButtonText: 'Start call',
};
