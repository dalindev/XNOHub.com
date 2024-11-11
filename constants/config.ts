// Environment-specific configurations
export const ENV_CONFIG = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
} as const;

// Application configurations
export const APP_CONFIG = {
  // Simulation settings
  simulation: {
    interval: Number(process.env.NEXT_PUBLIC_SIMULATION_INTERVAL_MS) || 100
  },

  // Debug & development features
  debug: {
    frameRateDisplay: process.env.NEXT_PUBLIC_FRAME_RATE_DISPLAY === 'true',
    useSampleData: process.env.NEXT_PUBLIC_USE_SAMPLE_DATA === 'true'
  },

  // WebSocket settings
  websocket: {
    urls: {
      nano: process.env.NEXT_PUBLIC_WS_URL,
      banano: process.env.NEXT_PUBLIC_BANANO_WS_URL
    }
  },

  // Donation accounts
  donations: {
    nano:
      process.env.NEXT_PUBLIC_NANO_DONATION_ACCOUNT ??
      'nano_1osom16ctb773i6zi5fnepfro7bcmr5yqxb4qnmtzxkmdg88o4x6obmchzna',
    banano:
      process.env.NEXT_PUBLIC_BANANO_DONATION_ACCOUNT ??
      'ban_3asy4p6ejhku5ae3kxbh8unioyrtpghm8teaf9uhee6mm6xqhdaj1a19hr7t'
  }
} as const;

// Type-safe way to access nested config
export type AppConfig = typeof APP_CONFIG;
