// app/page.tsx
import { Suspense } from 'react';
import ThreeSceneClient from './three-scene-client';
import { Rep } from '@/types/index';

export const dynamic = 'force-dynamic';

// async function fetchData(): Promise<Rep[] | null> {
//   const body = {
//     action: 'reps'
//   };

//   const response = await f        <ThreeScene data={data as Rep[]} />   method: 'POST',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     cache: 'force-cache',
//     body: JSON.stringify(body)
//   });

//   const data = await response.json();
//   console.log(data);
//   return data;
// }

const data: Rep[] = [
  {
    rep_address:
      'nano_1oenixj4qtpfcembga9kqwggkb87wooicfy5df8nhdywrjrrqxk7or4gz15b',
    est_payment: null,
    donation_address: null,
    weight: 6.12,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://redeemfor.me',
    latitude: 49.405,
    longitude: 11.1617,
    alias: 'Redeemfor.me 🛍️🛒 —  Luckynano.com 🎰💰',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_3strnmn7h9b7oghxa6h9ckrpf5r454fsobpicixps6xwiwc5q4hat7wjbpqz',
    est_payment: null,
    donation_address:
      'nano_3strnmn7h9b7oghxa6h9ckrpf5r454fsobpicixps6xwiwc5q4hat7wjbpqz',
    weight: 8.15,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://nano.strnmn.me',
    latitude: 52.4743,
    longitude: 13.4359,
    alias: 'nano.strnmn.me 🌿',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_3strnmn7h9b7oghxa6h9ckrpf5r454fsobpicixps6xwiwc5q4hat7wjbpqz',
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_18bpu81x4oyqsjjsyaeb7ek4rag1bw8gerhaiumookzc4t5prrm4d7zg56ww',
    est_payment: null,
    donation_address:
      'nano_18bpu81x4oyqsjjsyaeb7ek4rag1bw8gerhaiumookzc4t5prrm4d7zg56ww',
    weight: 6.33,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'http://nanonode.uk',
    latitude: 51.5095,
    longitude: -0.0955,
    alias: 'Nano Node London',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_18bpu81x4oyqsjjsyaeb7ek4rag1bw8gerhaiumookzc4t5prrm4d7zg56ww',
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_3pg8khw8gs94c1qeq9741n99ubrut8sj3n9kpntim1rm35h4wdzirofazmwt',
    est_payment: null,
    donation_address:
      'nano_1ixztwxgroasquc9ekw5bnortekeghqtt1kxri6bh4ukyt4ik7fru6ippu7j',
    weight: 3.69,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://node.nano.trade',
    latitude: 48.9966,
    longitude: 8.4756,
    alias: 'Yakamoz Node - nano.trade',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_1ixztwxgroasquc9ekw5bnortekeghqtt1kxri6bh4ukyt4ik7fru6ippu7j',
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_33ad5app7jeo6jfe9ure6zsj8yg7knt6c1zrr5yg79ktfzk5ouhmpn6p5d7p',
    est_payment: null,
    donation_address:
      'nano_33ad5app7jeo6jfe9ure6zsj8yg7knt6c1zrr5yg79ktfzk5ouhmpn6p5d7p',
    weight: 6.88,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://warai.me',
    latitude: 40.793,
    longitude: -74.0247,
    alias: 'warai',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_33ad5app7jeo6jfe9ure6zsj8yg7knt6c1zrr5yg79ktfzk5ouhmpn6p5d7p',
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_34amtofxstsfyqcgphp8piij9u33widykq9wbz6ysjpxhbgmqu8btu1eexer',
    est_payment: null,
    donation_address:
      'nano_34amtofxstsfyqcgphp8piij9u33widykq9wbz6ysjpxhbgmqu8btu1eexer',
    weight: 4.9,
    delegators: 591,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 50.6974,
    longitude: 3.178,
    alias: '❤️❤️ Nanolove ❤️❤️',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_34amtofxstsfyqcgphp8piij9u33widykq9wbz6ysjpxhbgmqu8btu1eexer',
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_3n7ky76t4g57o9skjawm8pprooz1bminkbeegsyt694xn6d31c6s744fjzzz',
    est_payment: null,
    donation_address:
      'nano_3fq1wt45hpe9a6phqh3ht5y9xusa46z1mszduw6nq47opcxhfa71cnfo1maa',
    weight: 6.39,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://uptime.humblenano.io',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'humble_nano_finland 🇫🇮',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_3fq1wt45hpe9a6phqh3ht5y9xusa46z1mszduw6nq47opcxhfa71cnfo1maa',
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_1hza3f7wiiqa7ig3jczyxj5yo86yegcmqk3criaz838j91sxcckpfhbhhra1',
    est_payment: null,
    donation_address: null,
    weight: 5.67,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 52.356838,
    longitude: 4.914212,
    alias: 'Nano Foundation #8',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_1ota8bpwwawmc8ksdz4ezzrb3afbdeipk1n7rbeguhm4muy1r649uzw5moon',
    est_payment: null,
    donation_address:
      'nano_18ce51c3zpa11ddr4ngcb11b8af4ubm7w6r76ufqypusykpz9uybjar8pdk8',
    weight: 6.09,
    delegators: 381,
    uptime: 'good',
    synced: 100,
    website: 'https://moonstruck.dev/',
    latitude: 50.4777,
    longitude: 12.3649,
    alias: 'Moonstruck.dev 🌙',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_18ce51c3zpa11ddr4ngcb11b8af4ubm7w6r76ufqypusykpz9uybjar8pdk8',
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_1iuz18n4g4wfp9gf7p1s8qkygxw7wx9qfjq6a9aq68uyrdnningdcjontgar',
    est_payment: null,
    donation_address:
      'nano_1gur37mt5cawjg5844bmpg8upo4hbgnbbuwcerdobqoeny4ewoqshowfakfo',
    weight: 1.25,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://nanoticker.info',
    latitude: 49.4423,
    longitude: 11.0191,
    alias: 'NanoTicker',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_1gur37mt5cawjg5844bmpg8upo4hbgnbbuwcerdobqoeny4ewoqshowfakfo',
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_3msc38fyn67pgio16dj586pdrceahtn75qgnx7fy19wscixrc8dbb3abhbw6',
    est_payment: null,
    donation_address: null,
    weight: 3.46,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'gr0vity',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_1my1snode8rwccjxkckjirj65zdxo6g5nhh16fh6sn7hwewxooyyesdsmii3',
    est_payment: null,
    donation_address:
      'nano_3xin68k391aepgwprg7tj4fts1qy49ximuci9bhehpojc9pzpkej9g6zbgym',
    weight: 1.18,
    delegators: 620,
    uptime: 'good',
    synced: 100,
    website: 'https://nanode.my1.dev',
    latitude: 51.4757,
    longitude: 6.8448,
    alias: 'My1s Nano Node',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_3xin68k391aepgwprg7tj4fts1qy49ximuci9bhehpojc9pzpkej9g6zbgym',
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_3oxhohaxp9ceobppkhp7wahauxd4zgyz4fhxfniyp4mb9opq4upfnaccswo7',
    est_payment: null,
    donation_address: null,
    weight: 4.2,
    delegators: 22,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 50.4777,
    longitude: 12.3649,
    alias: null,
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_1u7anedrbmqx4gr8x44r6k4egg9nhi75yb1qsz63e5ykhz3mx3r3jw463r3t',
    est_payment: null,
    donation_address:
      'nano_1u7anedrbmqx4gr8x44r6k4egg9nhi75yb1qsz63e5ykhz3mx3r3jw463r3t',
    weight: 1.49,
    delegators: 370,
    uptime: 'good',
    synced: 100,
    website: 'https://pixelstix.com',
    latitude: 40.8364,
    longitude: -74.1403,
    alias: 'PixelStix',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_1u7anedrbmqx4gr8x44r6k4egg9nhi75yb1qsz63e5ykhz3mx3r3jw463r3t',
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_1nk9zdf1otddxhxfqimjdkmbtq17yzf3z6giz1as7x1huyug8er1ukeqpqpe',
    est_payment: null,
    donation_address:
      'nano_3shrydersd7kpbmkhrd3bnqece5j86s34q7zjq5wtf3f5kqintzks5m93zz8',
    weight: 1.7,
    delegators: 135,
    uptime: 'good',
    synced: 100,
    website: 'https://shrynode.me',
    latitude: 50.6974,
    longitude: 3.178,
    alias: 'FEES? OMEGALUL',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_3shrydersd7kpbmkhrd3bnqece5j86s34q7zjq5wtf3f5kqintzks5m93zz8',
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_1bj5cf9hkgkcspmn15day8cyn3hyaciufbba4rqmbnkmbdpjdmo9pwyatjoi',
    est_payment: null,
    donation_address: null,
    weight: 9.37,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 35.616978,
    longitude: 139.745521,
    alias: 'Huobi Representative',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_3ekb6tp8ixtkibimyygepgkwckzhds9basxd5zfue4efjnxaan77gsnanick',
    est_payment: null,
    donation_address:
      'nano_3spt91b7apeywmmxadpwwreop9mfyf3ja8b47e3o9se7igqy4p7gtzhmphxc',
    weight: 3.04,
    delegators: 513,
    uptime: 'good',
    synced: 100,
    website: 'http://www.nanick.cc/',
    latitude: 40.2459,
    longitude: -74.2813,
    alias: 'Nanick',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_3spt91b7apeywmmxadpwwreop9mfyf3ja8b47e3o9se7igqy4p7gtzhmphxc',
    lastVoted: '2023-09-28T04:52:13.719Z'
  },
  {
    rep_address:
      'nano_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou',
    est_payment: null,
    donation_address: null,
    weight: 2.08,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 48.9966,
    longitude: 8.4756,
    alias: 'Nano Foundation #2',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_34zuxqdsucurhjrmpc4aixzbgaa4wjzz6bn5ryn56emc9tmd3pnxjoxfzyb6',
    est_payment: null,
    donation_address:
      'nano_34zuxqdsucurhjrmpc4aixzbgaa4wjzz6bn5ryn56emc9tmd3pnxjoxfzyb6',
    weight: 3.04,
    delegators: 422,
    uptime: 'good',
    synced: 100,
    website: 'https://www.nanonode.de',
    latitude: 48.9966,
    longitude: 8.4756,
    alias: 'Nano Germany 🇩🇪',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_34zuxqdsucurhjrmpc4aixzbgaa4wjzz6bn5ryn56emc9tmd3pnxjoxfzyb6',
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_3kc8wwut3u8g1kwa6x4drkzu346bdbyqzsn14tmabrpeobn8igksfqkzajbb',
    est_payment: null,
    donation_address:
      'nano_3kc8wwut3u8g1kwa6x4drkzu346bdbyqzsn14tmabrpeobn8igksfqkzajbb',
    weight: 1.62,
    delegators: 402,
    uptime: 'good',
    synced: 100,
    website: 'https://node.nanodrop.io',
    latitude: 41.4951,
    longitude: -81.4657,
    alias: 'AnarkNode V23',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_3kc8wwut3u8g1kwa6x4drkzu346bdbyqzsn14tmabrpeobn8igksfqkzajbb',
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_3hd4ezdgsp15iemx7h81in7xz5tpxi43b6b41zn3qmwiuypankocw3awes5k',
    est_payment: null,
    donation_address: null,
    weight: 5.41,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 12.906231,
    longitude: 77.587838,
    alias: 'Nano Foundation #5',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_16d3mdshcfqayyx8rd9ioimjiicrma743qpd86ohfs9kdzgejmnba1zifo8m',
    est_payment: null,
    donation_address: null,
    weight: 3.81,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://nanoble.org',
    latitude: 50.4777,
    longitude: 12.3649,
    alias: 'nanoble',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_1b9wguhh39at8qtm93oghd6r4f4ubk7zmqc9oi5ape6yyz4s1gamuwn3jjit',
    est_payment: null,
    donation_address: null,
    weight: 1.6,
    delegators: 60,
    uptime: 'good',
    synced: 100,
    website: 'http://www.trustable.finance',
    latitude: 51.8686,
    longitude: -2.2446,
    alias: 'TRUSTABLE - NN1',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_3o5dcp6kjish9xuu51akx1d8bp4pytk4diput3s8dkt7cktnmcg96aoi1cbw',
    est_payment: null,
    donation_address:
      'nano_1icpcff36i9qdx1cqj5qcdn53kfms4834t7xt5iezzq3c8ktazpnx4ponubp',
    weight: 1.27,
    delegators: 49,
    uptime: 'good',
    synced: 100,
    website: 'https://nano.is-by.us/',
    latitude: 56.1919,
    longitude: 15.8412,
    alias: 'NanoIsByUs',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_1icpcff36i9qdx1cqj5qcdn53kfms4834t7xt5iezzq3c8ktazpnx4ponubp',
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_3dmtrrws3pocycmbqwawk6xs7446qxa36fcncush4s1pejk16ksbmakis78m',
    est_payment: null,
    donation_address: null,
    weight: 7.33,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 33.844,
    longitude: -84.4784,
    alias: 'Nano Foundation #4',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_3g6ue89jij6bxaz3hodne1c7gzgw77xawpdz4p38siu145u3u17c46or4jeu',
    est_payment: null,
    donation_address: null,
    weight: 3.99,
    delegators: 265,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 40.8364,
    longitude: -74.1403,
    alias: 'Madora',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_1xckpezrhg56nuokqh6t1stjca67h37jmrp9qnejjkfgimx1msm9ehuaieuq',
    est_payment: null,
    donation_address:
      'nano_1xckpezrhg56nuokqh6t1stjca67h37jmrp9qnejjkfgimx1msm9ehuaieuq',
    weight: 3.63,
    delegators: 467,
    uptime: 'good',
    synced: 100,
    website: 'https://nano.flyingamigos.com',
    latitude: 19.0748,
    longitude: 72.8856,
    alias: 'Flying Amigos 🇮🇳',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_1xckpezrhg56nuokqh6t1stjca67h37jmrp9qnejjkfgimx1msm9ehuaieuq',
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_1ebq356ex7n5efth49o1p31r4fmuuoara5tmwduarg7b9jphyxsatr3ja6g8',
    est_payment: null,
    donation_address: null,
    weight: 4.27,
    delegators: 579,
    uptime: 'good',
    synced: 100,
    website: 'https://upst-art.net/',
    latitude: 40.8364,
    longitude: -74.1403,
    alias: 'Upstart Hosting',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_1fe17w13stn8rqos3nxmupoez9sne4pc4njmr1fbz9nci6obnng6jatton5q',
    est_payment: null,
    donation_address:
      'nano_38pyhgukmkqkbe87myusad1xpbnqjgrkgiahwdei1n61s47j6h3sfs187mp3',
    weight: 1.76,
    delegators: 285,
    uptime: 'good',
    synced: 100,
    website: 'https://nano-no.de',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'nano-no.de 🌍🚀🌑',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_38pyhgukmkqkbe87myusad1xpbnqjgrkgiahwdei1n61s47j6h3sfs187mp3',
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_375pi67f4i4ag5rudoziza86z715bepsmp1r6ri4domt7ct6tk67mjsxtebm',
    est_payment: null,
    donation_address: null,
    weight: 5.57,
    delegators: 802,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 45.2521,
    longitude: -73.9123,
    alias: 'Nanovert',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_37imps4zk1dfahkqweqa91xpysacb7scqxf3jqhktepeofcxqnpx531b3mnt',
    est_payment: null,
    donation_address: null,
    weight: 1.12,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 45.849868,
    longitude: -119.632159,
    alias: 'Kraken',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_3mhrc9czyfzzok7xeoeaknq6w5ok9horo7d4a99m8tbtbyogg8apz491pkzt',
    est_payment: null,
    donation_address: null,
    weight: 1.96,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://nanotps.com',
    latitude: 40.793,
    longitude: -74.0247,
    alias: 'nanotps.com',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_1wenanoqm7xbypou7x3nue1isaeddamjdnc3z99tekjbfezdbq8fmb659o7t',
    est_payment: null,
    donation_address: null,
    weight: 1.06,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 49.4617,
    longitude: 11.0731,
    alias: 'WeNano',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_35btiz1mgfwp95c3ckazmzbp5gepduxtijuijd9xebeau8u1gsbea41smjca',
    est_payment: null,
    donation_address: null,
    weight: 1.02,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 45.526,
    longitude: -122.9874,
    alias: 'Atomic Wallet',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_3u7d5iohy14swyhxhgfm9iq4xa9yibhcgnyj697uwhicp14dhx4woik5e9ek',
    est_payment: null,
    donation_address: null,
    weight: 1.34,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://nanoskynode.com',
    latitude: 49.405,
    longitude: 11.1617,
    alias: 'NANO Skynode 🏔️',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_3f1owhubic8wa8rfmj5x6w9ore9btbtju5eampghs3y9ere6q6u96jraoo5s',
    est_payment: null,
    donation_address: null,
    weight: 6.4,
    delegators: 81,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'Flowhub',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_1isgusmnf1xe45iyjtfxw4qiai36zxdituu7gpni1trtj5ojyujobq13bjah',
    est_payment: null,
    donation_address:
      'nano_3s9aznsmfx1x1jtod7yrms114ho4cgde3bwhjegs9qgbazn1wrp899oyn7hz',
    weight: 2.89,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://noli-me-tangere.scheler.io',
    latitude: 40.793,
    longitude: -74.0247,
    alias: 'Noli Me Tangere',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_3s9aznsmfx1x1jtod7yrms114ho4cgde3bwhjegs9qgbazn1wrp899oyn7hz',
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_31xitw55kb3ko8yaz3439hqaqpibxa9shx76suaa3no786do3hjuz8dy6izw',
    est_payment: null,
    donation_address: null,
    weight: 5.55,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'http://nano.lol',
    latitude: 37.3417,
    longitude: -121.9753,
    alias: 'nano.lol',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_3kqdiqmqiojr1aqqj51aq8bzz5jtwnkmhb38qwf3ppngo8uhhzkdkn7up7rp',
    est_payment: null,
    donation_address: null,
    weight: 1.44,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://arainode.com',
    latitude: 37.389154,
    longitude: -121.966532,
    alias: 'ARaiNode',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_3power3gwb43rs7u9ky3rsjp6fojftejceexfkf845sfczyue4q3r1hfpr3o',
    est_payment: null,
    donation_address:
      'nano_3fomwexu6e7n3hzxnqd99qaoqt5zkwnrtyspkj4wreibrt4kumwkiaase1ij',
    weight: 1.36,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://powernode.cc',
    latitude: 53.4563,
    longitude: -113.5803,
    alias: 'PowerNode',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_3fomwexu6e7n3hzxnqd99qaoqt5zkwnrtyspkj4wreibrt4kumwkiaase1ij',
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_1anrzcuwe64rwxzcco8dkhpyxpi8kd7zsjc1oeimpc3ppca4mrjtwnqposrs',
    est_payment: null,
    donation_address: null,
    weight: 4.22,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: -33.8979,
    longitude: 151.1897,
    alias: 'Nano Foundation #7',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4',
    est_payment: null,
    donation_address: null,
    weight: 4.45,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://nano.org',
    latitude: 35.6893,
    longitude: 139.6899,
    alias: 'Nano Foundation #1',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.720Z'
  },
  {
    rep_address:
      'nano_1j78msn5omp8jrjge8txwxm4x3smusa1cojg7nuk8fdzoux41fqeeogg5aa1',
    est_payment: null,
    donation_address: null,
    weight: 1.61,
    delegators: 587,
    uptime: 'good',
    synced: 100,
    website: 'http://nanobrasil.io',
    latitude: -15.7623,
    longitude: -48.2873,
    alias: 'NanoBrasil 🇧🇷',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.721Z'
  },
  {
    rep_address:
      'nano_3jwrszth46rk1mu7rmb4rhm54us8yg1gw3ipodftqtikf5yqdyr7471nsg1k',
    est_payment: null,
    donation_address: null,
    weight: 1.19,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 35.616978,
    longitude: 139.745521,
    alias: 'Binance',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.721Z'
  },
  {
    rep_address:
      'nano_1niabkx3gbxit5j5yyqcpas71dkffggbr6zpd3heui8rpoocm5xqbdwq44oh',
    est_payment: null,
    donation_address: null,
    weight: 4.96,
    delegators: 1019,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 35.6893,
    longitude: 139.6899,
    alias: 'KuCoin',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.721Z'
  },
  {
    rep_address:
      'nano_37ortkby6k68z8tkk8g63ndbp8wjbmofhn56oyxb4rm6s3x51pkpiwcnpgmq',
    est_payment: null,
    donation_address: null,
    weight: 4.63,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://nanomakonode.com',
    latitude: 49.405,
    longitude: 11.1617,
    alias: 'Ӿ Makonode 🦈',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.721Z'
  },
  {
    rep_address:
      'nano_3pnanopr3d5g7o45zh3nmdkqpaqxhhp3mw14nzr41smjz8xsrfyhtf9xac77',
    est_payment: null,
    donation_address: null,
    weight: 1.02,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://playnano.online',
    latitude: 49.4797,
    longitude: 8.6639,
    alias: 'PlayNANO Representative',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.721Z'
  },
  {
    rep_address:
      'nano_1ookerz3adg5rxc4zwwoshim5yyyihf6dpogjihwwq6ksjpq7ea4fuam5mmc',
    est_payment: null,
    donation_address: null,
    weight: 5.02,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://nanolooker.com/',
    latitude: 40.793,
    longitude: -74.0247,
    alias: 'NanoLooker',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.721Z'
  },
  {
    rep_address:
      'nano_11pb5aa6uirs9hoqsg4swnzyehoiqowj94kdpthwkhwufmtd6a11xx35iron',
    est_payment: null,
    donation_address:
      'nano_3f4qc1rd87gcq89a5x8wfon189ygypiie7sozac64rxop4soycxi5yrfghnh',
    weight: 1.23,
    delegators: 245,
    uptime: 'good',
    synced: 100,
    website: 'https://ironclad.nodenano.com',
    latitude: 34.0485,
    longitude: -118.2529,
    alias: ' 🔐 IronClad 🔐 ➡ Reliable node built to last',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_3f4qc1rd87gcq89a5x8wfon189ygypiie7sozac64rxop4soycxi5yrfghnh',
    lastVoted: '2023-09-28T04:52:13.721Z'
  },
  {
    rep_address:
      'nano_3i3dqy5xs98ewtk9ejfpxfwbsscejc6njz9hk5ia1446gdkxpxkjeeia719n',
    est_payment: null,
    donation_address:
      'nano_3err59dfdzg7zaurxgcjm7qw3trk814gx1sqhxn6pj8yq1nbt9unb3h8audi',
    weight: 2.21,
    delegators: 912,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 39.8744,
    longitude: -84.3287,
    alias: 'Buckeye Nano Node',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_3err59dfdzg7zaurxgcjm7qw3trk814gx1sqhxn6pj8yq1nbt9unb3h8audi',
    lastVoted: '2023-09-28T04:52:13.721Z'
  },
  {
    rep_address:
      'nano_3ktybzzy14zxgb6osbhcc155pwk7osbmf5gbh5fo73bsfu9wuiz54t1uozi1',
    est_payment: null,
    donation_address: null,
    weight: 9.28,
    delegators: 1008,
    uptime: 'good',
    synced: 100,
    website: 'https://www.kappture.co.uk',
    latitude: 53.406105,
    longitude: -6.229773,
    alias: 'Kappture',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.721Z'
  },
  {
    rep_address:
      'nano_1tk8h3yzkibbsti8upkfa69wqafz6mzfzgu8bu5edaay9k7hidqdunpr4tb6',
    est_payment: null,
    donation_address:
      'nano_1iawmcfwmmdyr7xmnordt71gpnhnao8rsk4nywq5khtmedocaj6bafk4fb8h',
    weight: 1.28,
    delegators: 370,
    uptime: 'good',
    synced: 100,
    website: 'https://rsnano.com',
    latitude: 49.0959,
    longitude: 12.4819,
    alias: 'RsNano.com - Nano Rust Port',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation:
      'nano_1iawmcfwmmdyr7xmnordt71gpnhnao8rsk4nywq5khtmedocaj6bafk4fb8h',
    lastVoted: '2023-09-28T04:52:13.721Z'
  },
  {
    rep_address:
      'nano_1fnx59bqpx11s1yn7i5hba3ot5no4ypy971zbkp5wtium3yyafpwhhwkq8fc',
    est_payment: null,
    donation_address: null,
    weight: 4.62,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://nano.nifni.net',
    latitude: 48.9966,
    longitude: 8.4756,
    alias: "NiF's Node - nano.nifni.net",
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.721Z'
  },
  {
    rep_address:
      'nano_3ngt59dc7hbsjd1dum1bw9wbb87mbtuj4qkwcruididsb5rhgdt9zb4w7kb9',
    est_payment: null,
    donation_address: null,
    weight: 5.7,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: null,
    latitude: 52.3716,
    longitude: 4.8883,
    alias: 'Wirex',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.721Z'
  },
  {
    rep_address:
      'nano_396sch48s3jmzq1bk31pxxpz64rn7joj38emj4ueypkb9p9mzrym34obze6c',
    est_payment: null,
    donation_address: null,
    weight: 5.37,
    delegators: 1024,
    uptime: 'good',
    synced: 100,
    website: 'https://nanoissuperior.co.uk',
    latitude: 51.5033,
    longitude: -0.6894,
    alias: 'SupeNode',
    uptime_over: { week: 100, day: 100 },
    score: 100,
    donation: null,
    lastVoted: '2023-09-28T04:52:13.721Z'
  }
];

export default async function Page() {
  // const data = await getData();
  const serverTime = new Date();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ThreeSceneClient data={data} serverDateTime={serverTime} />
    </Suspense>
  );
}
