// For more websockets, see https://publicnodes.somenano.com/
export const NANO_LIVE_ENV = {
  production: true,
  network: 'live',
  // wsUrl: 'wss://node.somenano.com/websocket',
  // wsUrl: 'wss://rainstorm.city/websocket',
  // wsUrl: 'wss://bitrequest.app:8010/websocket',
  // wsUrl: 'wss://nanoslo.0x.no/websocket',
  wsUrl: 'ws://localhost:8080/websocket',

  // wsUrl: 'wss://node.somenano.com/repeater',
  rpcUrl: 'https://nanoproxy.numsu.dev/proxy',
  principalsUrl: 'https://nanobrowse.com/api/reps_online',
  explorerUrl: 'https://nanolooker.com',
  repInfoUrl: 'https://mynano.ninja',
  donationAccount:
    'nano_1osom16ctb773i6zi5fnepfro7bcmr5yqxb4qnmtzxkmdg88o4x6obmchzna'
};
