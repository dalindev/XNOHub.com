import { IRepData, IRepOnline } from '@/types/index';

const topCitiesGeo = [
  { lat: -25.7461, lon: 28.1881 }, // Capital city of South Africa (administrative capital)
  { lat: -53.1638, lon: -70.9171 }, // Chile
  { lat: 37.5665, lon: 126.978 }, // South Korea
  { lat: 30.0444, lon: 31.2357 }, // Cairo, Egypt
  { lat: 35.6762, lon: 139.6503 }, // Tokyo, Japan
  { lat: 55.7558, lon: 37.6173 }, // Moscow, Russia
  { lat: 31.2304, lon: 121.4737 }, // Shanghai, China
  { lat: -33.8688, lon: 151.2093 }, // Sydney, Australia
  { lat: 19.4326, lon: -99.1332 }, // Mexico City, Mexico
  { lat: -23.5505, lon: -46.6333 }, // São Paulo, Brazil
  { lat: 25.2048, lon: 55.2708 }, // Dubai, UAE
  { lat: 1.3521, lon: 103.8198 }, // Singapore
  { lat: 41.0082, lon: 28.9784 }, // Istanbul, Turkey
  { lat: 28.6139, lon: 77.209 }, // New Delhi, India
  { lat: 59.9139, lon: 10.7522 }, // Oslo, Norway
  { lat: 59.3293, lon: 18.0686 }, // Stockholm, Sweden
  { lat: 55.6761, lon: 12.5683 }, // Copenhagen, Denmark
  { lat: -22.9068, lon: -43.1729 }, // Rio de Janeiro, Brazil
  { lat: 52.3676, lon: 4.9041 }, // Amsterdam, Netherlands
  { lat: 48.2082, lon: 16.3738 }, // Vienna, Austria
  { lat: 53.3498, lon: -6.2603 }, // Dublin, Ireland
  { lat: 50.8503, lon: 4.3517 }, // Brussels, Belgium
  { lat: 45.4215, lon: -75.6972 }, // Ottawa, Canada
  { lat: -41.2865, lon: 174.7762 }, // Wellington, New Zealand
  { lat: 38.7223, lon: -9.1393 }, // Lisbon, Portugal
  { lat: 35.6892, lon: 51.389 }, // Tehran, Iran
  { lat: 37.9838, lon: 23.7275 }, // Athens, Greece
  { lat: 50.0755, lon: 14.4378 }, // Prague, Czech Republic
  { lat: 60.1695, lon: 24.9354 }, // Helsinki, Finland
  { lat: 47.4979, lon: 19.0402 }, // Budapest, Hungary
  { lat: 64.1265, lon: -21.8174 }, // Reykjavik, Iceland
  { lat: 13.7563, lon: 100.5018 }, // Bangkok, Thailand
  { lat: 33.8688, lon: 151.2093 }, // Sydney, Australia
  { lat: -37.8136, lon: 144.9631 }, // Melbourne, Australia
  { lat: -31.9505, lon: 115.8605 }, // Perth, Australia
  { lat: -27.4698, lon: 153.0251 }, // Brisbane, Australia
  { lat: 43.6532, lon: -79.3832 }, // Toronto, Canada
  { lat: 49.2827, lon: -123.1207 }, // Vancouver, Canada
  { lat: 45.5017, lon: -73.5673 }, // Montreal, Canada
  { lat: 51.0486, lon: -114.0708 }, // Calgary, Canada
  { lat: 33.6844, lon: 73.0479 }, // Islamabad, Pakistan
  { lat: 14.5995, lon: 120.9842 }, // Manila, Philippines
  { lat: 3.139, lon: 101.6869 }, // Kuala Lumpur, Malaysia
  { lat: 1.3521, lon: 103.8198 } // Singapore
];

// First, we need to import both datasets
const principalsGeoInfo = [
  {
    rep_address:
      'nano_1ba7uuq9kt68jzzw51a5kt577xtzaq37cnj8otqbhhnkgjyhwu91wtsjacez',
    latitude: 51.2192,
    longitude: 4.3917,
    alias: '『Node Geass』'
  },
  {
    rep_address:
      'nano_1artnod3zc5e4rrra73ii4698t7pfiqt4c445efd499psaxyjae5bhm9susp',
    latitude: 49.4331,
    longitude: 11.0374,
    alias: 'Art Node'
  },
  {
    rep_address:
      'nano_1tipnanogsu7q59pnie3qfc4w378wm43fg4ksqc8wmnnfnizrq1xrpt5geho',
    latitude: 50.4777,
    longitude: 12.3649,
    alias: 'TipNano ⛲'
  },
  {
    rep_address:
      'nano_3o5oeefdnrha7x7styp1tnmefen7fnrooy4jgnfb1otws54yf7uqfuxmojoy',
    latitude: 37.3931,
    longitude: -121.962,
    alias: 'scoin.cool'
  },
  {
    rep_address:
      'nano_15gfawgrsc6tkkm5p1gy749tkibchu73st1ojs3knz6rd3ejfcgt7rj5cmx9',
    latitude: 50.4777,
    longitude: 12.3649,
    alias: 'validierung.cc 🇩🇪'
  },
  {
    rep_address:
      'nano_1banexkcfuieufzxksfrxqf6xy8e57ry1zdtq9yn7jntzhpwu4pg4hajojmq',
    latitude: 52.3803,
    longitude: 4.6422,
    alias: 'Nanswap'
  },
  {
    rep_address:
      'nano_1sw898hgeexgrsq8x16wdadwdrs3obn418z6x98parb5tymz879mu89qndju',
    latitude: 37.3931,
    longitude: -121.962,
    alias: 'VINO Community Rep'
  },
  {
    rep_address:
      'nano_19qo4gtzpoyqf6zzezbcuazcsxtqtdin5qbtk8jkoz4fdmq4ssagn3u1odhz',
    latitude: 51.5095,
    longitude: -0.0955,
    alias: 'TRUSTABLE - NN2'
  },
  {
    rep_address:
      'nano_15zntj4a8r6bkihei788ciy1jgc5wnskan1gpgn8e8jku3r4qhr7rwifitir',
    latitude: 37.3372,
    longitude: -121.798,
    alias: "paypur's node"
  },
  {
    rep_address:
      'nano_16k5pimotz9zehjk795wa4qcx54mtusk8hc5mdsjgy57gnhbj3hj6zaib4ic',
    latitude: 51.5095,
    longitude: -0.0955,
    alias: 'NanoWallet Bot'
  },
  {
    rep_address:
      'nano_1bko7zpcow7w6e11az8tnxdnyszgkt61miwuo9i9pom3czdzxqknpiuc7tdb',
    latitude: 22.6148,
    longitude: 120.3139,
    alias: 'jserv 🇹🇼🐧'
  },
  {
    rep_address:
      'nano_16u1uufyoig8777y6r8iqjtrw8sg8maqrm36zzcm95jmbd9i9aj5i8abr8u5',
    latitude: 51.5095,
    longitude: -0.0955,
    alias: null
  },
  {
    rep_address:
      'nano_1ac8snzjkwniynpe3nsshf34iwe46rpjo3tjqtdntktjhqsp5sdndqworgwe',
    latitude: 48.6667,
    longitude: 2.569,
    alias: null
  },
  {
    rep_address:
      'nano_139tfuxmn4xne7kac8gy46rzg3tj8dcahyjjrexk9pc8udh3i1cjxs1h5rme',
    latitude: 52.352,
    longitude: 4.9392,
    alias: 'mimenode-old'
  },
  {
    rep_address:
      'nano_14mp1ua4oi45rxosft3d8qe4g6a1u1srma59jg85ax6s8zuwhi4yzgdnqhz3',
    latitude: 1.3242,
    longitude: 103.7897,
    alias: 'NanoSG - DeckardCain 🇸🇬'
  },
  {
    rep_address:
      'nano_3ciiorjr88nd9xdperhj6u4bmxqxgkariohi1inuqad4b8urr9bgpirgbmqy',
    latitude: 41.8874,
    longitude: -87.6318,
    alias: "Drowzee's Nano Node"
  },
  {
    rep_address:
      'nano_3zx7rus19yr5qi5zmkawnzo5ehxr7i73xqghhondhfrzftgstgk4gxbubwfq',
    latitude: 28.5436,
    longitude: -81.3738,
    alias: 'Nanorlando City Node'
  },
  {
    rep_address:
      'nano_1xj15k5naemt7rno1udawcazo5esjsuajosziopeayk93o8t71hwecfsux4p',
    latitude: 37.389154,
    longitude: -121.966532,
    alias: 'xnofor.life'
  },
  {
    rep_address:
      'nano_3robocazheuxet5ju1gtif4cefkhfbupkykc97hfanof859ie9ajpdfhy3ez',
    latitude: 33.6416,
    longitude: -117.6898,
    alias: 'FynCom'
  },
  {
    rep_address:
      'nano_1cafe95a81ko3mq3oin4wnubsbw9z3w3tw5a95u47897wxy96r1zj9hxu1wb',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'nanocafe.cc'
  },
  {
    rep_address:
      'nano_1xnopay1bfmyx5eit8ut4gg1j488kt8bjukijerbn37jh3wdm81y6mxjg8qj',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'XNOPay - Node 1'
  },
  {
    rep_address:
      'nano_1m1afmq54gum53md3dm3o9arctwn8buwqk8kynxszh468qmm3kn7sawmgihz',
    latitude: 52.3759,
    longitude: 4.8975,
    alias: 'UrbaNano [NL]'
  },
  {
    rep_address:
      'nano_1crpaybw8jip7fm98fzfxnjajb55ty76oyzmpfwe9s66u4aod37tm3kxba8q',
    latitude: 46.5697,
    longitude: 6.8209,
    alias: 'CRPay'
  },
  {
    rep_address:
      'nano_3bsnis6ha3m9cepuaywskn9jykdggxcu8mxsp76yc3oinrt3n7gi77xiggtm',
    latitude: 50.4777,
    longitude: 12.3649,
    alias: 'CryptoVision Nano Node'
  },
  {
    rep_address:
      'nano_385dyw65hwqtp7pm5igh9ekmaai7qg61tp4mcdine7su3jt69uypa7o9umm8',
    latitude: 50.4777,
    longitude: 12.3649,
    alias: 'Brainroot Nano Node [DE]'
  },
  {
    rep_address:
      'nano_1wcxcjbwnnsdpee3d9i365e8bcj1uuyoqg9he5zjpt3r57dnjqe3gdc184ck',
    latitude: 45.9305,
    longitude: 10.6293,
    alias: 'NANO ITALIA'
  },
  {
    rep_address:
      'nano_318uu1tsbios3kp4dts5b6zy1y49uyb88jajfjyxwmozht8unaxeb43keork',
    latitude: 55.4044,
    longitude: 11.3353,
    alias: 'ScandiNode 🌐 Green, fast & capable! '
  },
  {
    rep_address:
      'nano_1zuksmn4e8tjw1ch8m8fbrwy5459bx8645o9euj699rs13qy6ysjhrewioey',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'nanowallets.guide'
  },
  {
    rep_address:
      'nano_1ninja7rh37ehfp9utkor5ixmxyg8kme8fnzc4zty145ibch8kf5jwpnzr3r',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'My Nano Ninja'
  },
  {
    rep_address:
      'nano_1awsn43we17c1oshdru4azeqjz9wii41dy8npubm4rg11so7dx3jtqgoeahy',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'Nano Foundation #6'
  },
  {
    rep_address:
      'nano_1ec5optppmndqsb3rxu1qa4hpo39957s7mfqycpbd547jga4768o6xz8gfie',
    latitude: 52.3759,
    longitude: 4.8975,
    alias: 'NanoBank'
  },
  {
    rep_address:
      'nano_1just1zdsnke856mu5pmed1qdkzk6adh3d13iiqr3so66sr8pbcnh15bdjda',
    latitude: 49.405,
    longitude: 11.1617,
    alias: 'Nonna'
  },
  {
    rep_address:
      'nano_1kd4h9nqaxengni43xy9775gcag8ptw8ddjifnm77qes1efuoqikoqy5sjq3',
    latitude: 50.7887,
    longitude: -1.1475,
    alias: 'NanoQuake'
  },
  {
    rep_address:
      'nano_3zapp5z141qpjipsb1jnjdmk49jwqy58i6u6wnyrh6x7woajeyme85shxewt',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'Nalli | [Fast 💨 - Dedicated 💻 - Green 🍀]'
  },
  {
    rep_address:
      'nano_1x7biz69cem95oo7gxkrw6kzhfywq4x5dupw4z1bdzkb74dk9kpxwzjbdhhs',
    latitude: 49.4423,
    longitude: 11.0191,
    alias: 'NanoCrawler / meltingice'
  },
  {
    rep_address:
      'nano_15nt4cis8ac184q9mj7bedww9ay9zh5jk5k7sj9ypmz44twjcpz3cn6oijir',
    latitude: 47.6645,
    longitude: 8.0051,
    alias: 'Kedrin'
  },
  {
    rep_address:
      'nano_16d45ow3tsj1y3z9n4satwzxgj6qiue1ggxbwbrj3b33qr58bzchkpsffpx4',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: '1NANO Community'
  },
  {
    rep_address:
      'nano_3uaydiszyup5zwdt93dahp7mri1cwa5ncg9t4657yyn3o4i1pe8sfjbimbas',
    latitude: 49.4622,
    longitude: 11.072,
    alias: 'NANO Voting 🌍'
  },
  {
    rep_address:
      'nano_3chartsi6ja8ay1qq9xg3xegqnbg1qx76nouw6jedyb8wx3r4wu94rxap7hg',
    latitude: 49.405,
    longitude: 11.1617,
    alias: 'Nano Charts 📊'
  },
  {
    rep_address:
      'nano_1natrium1o3z5519ifou7xii8crpxpk8y65qmkih8e8bpsjri651oza8imdd',
    latitude: 50.4777,
    longitude: 12.3649,
    alias: 'Natrium'
  },
  {
    rep_address:
      'nano_3o7uzba8b9e1wqu5ziwpruteyrs3scyqr761x7ke6w1xctohxfh5du75qgaj',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'NANO TipBot'
  },
  {
    rep_address:
      'nano_18shbirtzhmkf7166h39nowj9c9zrpufeg75bkbyoobqwf1iu3srfm9eo3pz',
    latitude: 49.405,
    longitude: 11.1617,
    alias: '1. High Performance Server 🚀 - DE'
  },
  {
    rep_address:
      'nano_1mime3jd7dbnshd6zw1gjqax5zit31h6y1x6pczfuz7au33ftacjib5cc1ez',
    latitude: 52.356838,
    longitude: 4.914212,
    alias: 'mimenode'
  },
  {
    rep_address:
      'nano_3abuqtbaotp9myn6ihb6mg96hf7jnapuddydf6ytgd174t4phg86nnq4cmxj',
    latitude: 40.8364,
    longitude: -74.1403,
    alias: 'Puddy'
  },
  {
    rep_address:
      'nano_3afmp9hx6pp6fdcjq96f9qnoeh1kiqpqyzp7c18byaipf48t3cpzmfnhc1b7',
    latitude: 49.405,
    longitude: 11.1617,
    alias: '⋰·⋰FastFeeless.com⋰·⋰'
  },
  {
    rep_address:
      'nano_1oenixj4qtpfcembga9kqwggkb87wooicfy5df8nhdywrjrrqxk7or4gz15b',
    latitude: 49.405,
    longitude: 11.1617,
    alias: 'Redeemfor.me 🛍️🛒 —  Luckynano.com 🎰💰'
  },
  {
    rep_address:
      'nano_3strnmn7h9b7oghxa6h9ckrpf5r454fsobpicixps6xwiwc5q4hat7wjbpqz',
    latitude: 52.4743,
    longitude: 13.4359,
    alias: 'nano.strnmn.me 🌿'
  },
  {
    rep_address:
      'nano_18bpu81x4oyqsjjsyaeb7ek4rag1bw8gerhaiumookzc4t5prrm4d7zg56ww',
    latitude: 51.5095,
    longitude: -0.0955,
    alias: 'Nano Node London'
  },
  {
    rep_address:
      'nano_3pg8khw8gs94c1qeq9741n99ubrut8sj3n9kpntim1rm35h4wdzirofazmwt',
    latitude: 48.9966,
    longitude: 8.4756,
    alias: 'Yakamoz Node - nano.trade'
  },
  {
    rep_address:
      'nano_33ad5app7jeo6jfe9ure6zsj8yg7knt6c1zrr5yg79ktfzk5ouhmpn6p5d7p',
    latitude: 40.793,
    longitude: -74.0247,
    alias: 'warai'
  },
  {
    rep_address:
      'nano_34amtofxstsfyqcgphp8piij9u33widykq9wbz6ysjpxhbgmqu8btu1eexer',
    latitude: 50.6974,
    longitude: 3.178,
    alias: '❤️❤️ Nanolove ❤️❤️'
  },
  {
    rep_address:
      'nano_3n7ky76t4g57o9skjawm8pprooz1bminkbeegsyt694xn6d31c6s744fjzzz',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'humble_nano_finland 🇫🇮'
  },
  {
    rep_address:
      'nano_1hza3f7wiiqa7ig3jczyxj5yo86yegcmqk3criaz838j91sxcckpfhbhhra1',
    latitude: 52.356838,
    longitude: 4.914212,
    alias: 'Nano Foundation #8'
  },
  {
    rep_address:
      'nano_1ota8bpwwawmc8ksdz4ezzrb3afbdeipk1n7rbeguhm4muy1r649uzw5moon',
    latitude: 50.4777,
    longitude: 12.3649,
    alias: 'Moonstruck.dev 🌙'
  },
  {
    rep_address:
      'nano_1iuz18n4g4wfp9gf7p1s8qkygxw7wx9qfjq6a9aq68uyrdnningdcjontgar',
    latitude: 49.4423,
    longitude: 11.0191,
    alias: 'NanoTicker'
  },
  {
    rep_address:
      'nano_3msc38fyn67pgio16dj586pdrceahtn75qgnx7fy19wscixrc8dbb3abhbw6',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'gr0vity'
  },
  {
    rep_address:
      'nano_1my1snode8rwccjxkckjirj65zdxo6g5nhh16fh6sn7hwewxooyyesdsmii3',
    latitude: 51.4757,
    longitude: 6.8448,
    alias: 'My1s Nano Node'
  },
  {
    rep_address:
      'nano_3oxhohaxp9ceobppkhp7wahauxd4zgyz4fhxfniyp4mb9opq4upfnaccswo7',
    latitude: 50.4777,
    longitude: 12.3649,
    alias: null
  },
  {
    rep_address:
      'nano_1u7anedrbmqx4gr8x44r6k4egg9nhi75yb1qsz63e5ykhz3mx3r3jw463r3t',
    latitude: 40.8364,
    longitude: -74.1403,
    alias: 'PixelStix'
  },
  {
    rep_address:
      'nano_1nk9zdf1otddxhxfqimjdkmbtq17yzf3z6giz1as7x1huyug8er1ukeqpqpe',
    latitude: 50.6974,
    longitude: 3.178,
    alias: 'FEES? OMEGALUL'
  },
  {
    rep_address:
      'nano_1bj5cf9hkgkcspmn15day8cyn3hyaciufbba4rqmbnkmbdpjdmo9pwyatjoi',
    latitude: 35.616978,
    longitude: 139.745521,
    alias: 'Huobi Representative'
  },
  {
    rep_address:
      'nano_3ekb6tp8ixtkibimyygepgkwckzhds9basxd5zfue4efjnxaan77gsnanick',
    latitude: 40.2459,
    longitude: -74.2813,
    alias: 'Nanick'
  },
  {
    rep_address:
      'nano_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou',
    latitude: 48.9966,
    longitude: 8.4756,
    alias: 'Nano Foundation #2'
  },
  {
    rep_address:
      'nano_34zuxqdsucurhjrmpc4aixzbgaa4wjzz6bn5ryn56emc9tmd3pnxjoxfzyb6',
    latitude: 48.9966,
    longitude: 8.4756,
    alias: 'Nano Germany 🇩🇪'
  },
  {
    rep_address:
      'nano_3kc8wwut3u8g1kwa6x4drkzu346bdbyqzsn14tmabrpeobn8igksfqkzajbb',
    latitude: 41.4951,
    longitude: -81.4657,
    alias: 'AnarkNode V23'
  },
  {
    rep_address:
      'nano_3hd4ezdgsp15iemx7h81in7xz5tpxi43b6b41zn3qmwiuypankocw3awes5k',
    latitude: 12.906231,
    longitude: 77.587838,
    alias: 'Nano Foundation #5'
  },
  {
    rep_address:
      'nano_16d3mdshcfqayyx8rd9ioimjiicrma743qpd86ohfs9kdzgejmnba1zifo8m',
    latitude: 50.4777,
    longitude: 12.3649,
    alias: 'nanoble'
  },
  {
    rep_address:
      'nano_1b9wguhh39at8qtm93oghd6r4f4ubk7zmqc9oi5ape6yyz4s1gamuwn3jjit',
    latitude: 51.8686,
    longitude: -2.2446,
    alias: 'TRUSTABLE - NN1'
  },
  {
    rep_address:
      'nano_3o5dcp6kjish9xuu51akx1d8bp4pytk4diput3s8dkt7cktnmcg96aoi1cbw',
    latitude: 56.1919,
    longitude: 15.8412,
    alias: 'NanoIsByUs'
  },
  {
    rep_address:
      'nano_3dmtrrws3pocycmbqwawk6xs7446qxa36fcncush4s1pejk16ksbmakis78m',
    latitude: 33.844,
    longitude: -84.4784,
    alias: 'Nano Foundation #4'
  },
  {
    rep_address:
      'nano_3g6ue89jij6bxaz3hodne1c7gzgw77xawpdz4p38siu145u3u17c46or4jeu',
    latitude: 40.8364,
    longitude: -74.1403,
    alias: 'Madora'
  },
  {
    rep_address:
      'nano_1xckpezrhg56nuokqh6t1stjca67h37jmrp9qnejjkfgimx1msm9ehuaieuq',
    latitude: 19.0748,
    longitude: 72.8856,
    alias: 'Flying Amigos 🇮🇳'
  },
  {
    rep_address:
      'nano_1ebq356ex7n5efth49o1p31r4fmuuoara5tmwduarg7b9jphyxsatr3ja6g8',
    latitude: 40.8364,
    longitude: -74.1403,
    alias: 'Upstart Hosting'
  },
  {
    rep_address:
      'nano_1fe17w13stn8rqos3nxmupoez9sne4pc4njmr1fbz9nci6obnng6jatton5q',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'nano-no.de 🌍🚀🌑'
  },
  {
    rep_address:
      'nano_375pi67f4i4ag5rudoziza86z715bepsmp1r6ri4domt7ct6tk67mjsxtebm',
    latitude: 45.2521,
    longitude: -73.9123,
    alias: 'Nanovert'
  },
  {
    rep_address:
      'nano_37imps4zk1dfahkqweqa91xpysacb7scqxf3jqhktepeofcxqnpx531b3mnt',
    latitude: 45.849868,
    longitude: -119.632159,
    alias: 'Kraken'
  },
  {
    rep_address:
      'nano_3mhrc9czyfzzok7xeoeaknq6w5ok9horo7d4a99m8tbtbyogg8apz491pkzt',
    latitude: 40.793,
    longitude: -74.0247,
    alias: 'nanotps.com'
  },
  {
    rep_address:
      'nano_1wenanoqm7xbypou7x3nue1isaeddamjdnc3z99tekjbfezdbq8fmb659o7t',
    latitude: 49.4617,
    longitude: 11.0731,
    alias: 'WeNano'
  },
  {
    rep_address:
      'nano_35btiz1mgfwp95c3ckazmzbp5gepduxtijuijd9xebeau8u1gsbea41smjca',
    latitude: 45.526,
    longitude: -122.9874,
    alias: 'Atomic Wallet'
  },
  {
    rep_address:
      'nano_3u7d5iohy14swyhxhgfm9iq4xa9yibhcgnyj697uwhicp14dhx4woik5e9ek',
    latitude: 49.405,
    longitude: 11.1617,
    alias: 'NANO Skynode 🏔️'
  },
  {
    rep_address:
      'nano_3f1owhubic8wa8rfmj5x6w9ore9btbtju5eampghs3y9ere6q6u96jraoo5s',
    latitude: 60.1719,
    longitude: 24.9347,
    alias: 'Flowhub'
  },
  {
    rep_address:
      'nano_1isgusmnf1xe45iyjtfxw4qiai36zxdituu7gpni1trtj5ojyujobq13bjah',
    latitude: 40.793,
    longitude: -74.0247,
    alias: 'Noli Me Tangere'
  },
  {
    rep_address:
      'nano_31xitw55kb3ko8yaz3439hqaqpibxa9shx76suaa3no786do3hjuz8dy6izw',
    latitude: 37.3417,
    longitude: -121.9753,
    alias: 'nano.lol'
  },
  {
    rep_address:
      'nano_3kqdiqmqiojr1aqqj51aq8bzz5jtwnkmhb38qwf3ppngo8uhhzkdkn7up7rp',
    latitude: 37.389154,
    longitude: -121.966532,
    alias: 'ARaiNode'
  },
  {
    rep_address:
      'nano_3power3gwb43rs7u9ky3rsjp6fojftejceexfkf845sfczyue4q3r1hfpr3o',
    latitude: 53.4563,
    longitude: -113.5803,
    alias: 'PowerNode'
  },
  {
    rep_address:
      'nano_1anrzcuwe64rwxzcco8dkhpyxpi8kd7zsjc1oeimpc3ppca4mrjtwnqposrs',
    latitude: -33.8979,
    longitude: 151.1897,
    alias: 'Nano Foundation #7'
  },
  {
    rep_address:
      'nano_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4',
    latitude: 35.6893,
    longitude: 139.6899,
    alias: 'Nano Foundation #1'
  },
  {
    rep_address:
      'nano_1j78msn5omp8jrjge8txwxm4x3smusa1cojg7nuk8fdzoux41fqeeogg5aa1',
    latitude: -15.7623,
    longitude: -48.2873,
    alias: 'NanoBrasil 🇧🇷'
  },
  {
    rep_address:
      'nano_3jwrszth46rk1mu7rmb4rhm54us8yg1gw3ipodftqtikf5yqdyr7471nsg1k',
    latitude: 35.616978,
    longitude: 139.745521,
    alias: 'Binance'
  },
  {
    rep_address:
      'nano_1niabkx3gbxit5j5yyqcpas71dkffggbr6zpd3heui8rpoocm5xqbdwq44oh',
    latitude: 35.6893,
    longitude: 139.6899,
    alias: 'KuCoin'
  },
  {
    rep_address:
      'nano_37ortkby6k68z8tkk8g63ndbp8wjbmofhn56oyxb4rm6s3x51pkpiwcnpgmq',
    latitude: 49.405,
    longitude: 11.1617,
    alias: 'Ӿ Makonode 🦈'
  },
  {
    rep_address:
      'nano_3pnanopr3d5g7o45zh3nmdkqpaqxhhp3mw14nzr41smjz8xsrfyhtf9xac77',
    latitude: 49.4797,
    longitude: 8.6639,
    alias: 'PlayNANO Representative'
  },
  {
    rep_address:
      'nano_1ookerz3adg5rxc4zwwoshim5yyyihf6dpogjihwwq6ksjpq7ea4fuam5mmc',
    latitude: 40.793,
    longitude: -74.0247,
    alias: 'NanoLooker'
  },
  {
    rep_address:
      'nano_11pb5aa6uirs9hoqsg4swnzyehoiqowj94kdpthwkhwufmtd6a11xx35iron',
    latitude: 34.0485,
    longitude: -118.2529,
    alias: ' 🔐 IronClad 🔐 ➡ Reliable node built to last'
  },
  {
    rep_address:
      'nano_3i3dqy5xs98ewtk9ejfpxfwbsscejc6njz9hk5ia1446gdkxpxkjeeia719n',
    latitude: 39.8744,
    longitude: -84.3287,
    alias: 'Buckeye Nano Node'
  },
  {
    rep_address:
      'nano_3ktybzzy14zxgb6osbhcc155pwk7osbmf5gbh5fo73bsfu9wuiz54t1uozi1',
    latitude: 53.406105,
    longitude: -6.229773,
    alias: 'Kappture'
  },
  {
    rep_address:
      'nano_1tk8h3yzkibbsti8upkfa69wqafz6mzfzgu8bu5edaay9k7hidqdunpr4tb6',
    latitude: 49.0959,
    longitude: 12.4819,
    alias: 'RsNano.com - Nano Rust Port'
  },
  {
    rep_address:
      'nano_1fnx59bqpx11s1yn7i5hba3ot5no4ypy971zbkp5wtium3yyafpwhhwkq8fc',
    latitude: 48.9966,
    longitude: 8.4756,
    alias: "NiF's Node - nano.nifni.net"
  },
  {
    rep_address:
      'nano_3ngt59dc7hbsjd1dum1bw9wbb87mbtuj4qkwcruididsb5rhgdt9zb4w7kb9',
    latitude: 52.3716,
    longitude: 4.8883,
    alias: 'Wirex'
  },
  {
    rep_address:
      'nano_396sch48s3jmzq1bk31pxxpz64rn7joj38emj4ueypkb9p9mzrym34obze6c',
    latitude: 51.5033,
    longitude: -0.6894,
    alias: 'SupeNode'
  },
  {
    rep_address:
      'nano_1jtx5p8141zjtukz4msp1x93st7nh475f74odj8673qqm96xczmtcnanos1o',
    latitude: 59.955,
    longitude: 10.859,
    alias: 'NanOslo 🐯'
  }
];

// Updated mergeRepsData function with proper types
export function mergeRepsData({
  onlineData
}: {
  onlineData: IRepOnline[];
}): IRepData[] {
  const geoMap = new Map<string, { latitude: number; longitude: number }>(
    principalsGeoInfo.map((item) => [
      item.rep_address,
      { latitude: item.latitude, longitude: item.longitude }
    ])
  );

  let availableCities = [...topCitiesGeo];

  const mergedData: IRepData[] = onlineData.map((rep) => {
    const geoData = geoMap.get(rep.account);
    if (geoData) {
      return { ...rep, ...geoData };
    } else if (availableCities.length > 0) {
      const cityGeo = availableCities.shift()!; // Non-null assertion as we've checked length
      return {
        ...rep,
        latitude: cityGeo.lat,
        longitude: cityGeo.lon,
        assigned_city: true
      };
    }
    return rep as IRepData; // Type assertion as it might lack lat/long
  });

  return mergedData;
}
