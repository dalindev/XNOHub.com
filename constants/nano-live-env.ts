// For more websockets, see https://publicnodes.somenano.com/
export const NANO_LIVE_ENV = {
  production: true,
  network: 'live',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? '',
  donationAccount:
    process.env.NEXT_PUBLIC_NANO_DONATION_ACCOUNT ??
    'nano_1osom16ctb773i6zi5fnepfro7bcmr5yqxb4qnmtzxkmdg88o4x6obmchzna'
};
