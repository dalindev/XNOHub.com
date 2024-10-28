// For more websockets, ask in banano discord
export const BANANO_LIVE_ENV = {
  production: true,
  network: 'live',
  wsUrl: process.env.NEXT_PUBLIC_BANANO_WS_URL ?? '',
  donationAccount:
    process.env.NEXT_PUBLIC_BANANO_DONATION_ACCOUNT ??
    'ban_3asy4p6ejhku5ae3kxbh8unioyrtpghm8teaf9uhee6mm6xqhdaj1a19hr7t'
};
