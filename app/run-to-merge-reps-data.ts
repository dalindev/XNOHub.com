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
  { lat: 1.3521, lon: 103.8198 }, // Singapore
  { lat: 21.0285, lon: 105.8542 }, // Hanoi, Vietnam
  { lat: 10.8231, lon: 106.6297 }, // Ho Chi Minh City, Vietnam
  { lat: -6.2088, lon: 106.8456 }, // Jakarta, Indonesia
  { lat: -8.6524, lon: 115.2193 }, // Bali, Indonesia
  { lat: 4.7109, lon: -74.0721 }, // Bogotá, Colombia
  { lat: -12.0464, lon: -77.0428 }, // Lima, Peru
  { lat: -33.4489, lon: -70.6693 }, // Santiago, Chile
  { lat: -34.9011, lon: -56.1645 }, // Montevideo, Uruguay
  { lat: -25.2867, lon: -57.3333 }, // Asunción, Paraguay
  { lat: -0.1807, lon: -78.4678 }, // Quito, Ecuador
  { lat: -16.5, lon: -68.15 }, // La Paz, Bolivia
  { lat: 9.9281, lon: -84.0907 }, // San José, Costa Rica
  { lat: 13.6929, lon: -89.2182 }, // San Salvador, El Salvador
  { lat: 14.6349, lon: -90.5069 }, // Guatemala City, Guatemala
  { lat: 12.1328, lon: -86.2504 }, // Managua, Nicaragua
  { lat: 15.5, lon: -88.0333 }, // Tegucigalpa, Honduras
  { lat: 8.9824, lon: -79.5199 }, // Panama City, Panama
  { lat: 18.4861, lon: -69.9312 }, // Santo Domingo, Dominican Republic
  { lat: 18.0179, lon: -76.8099 }, // Kingston, Jamaica
  { lat: 25.0343, lon: -77.3963 }, // Nassau, Bahamas
  { lat: 23.1136, lon: -82.3666 }, // Havana, Cuba
  { lat: 10.6918, lon: -61.2225 }, // Port of Spain, Trinidad and Tobago
  { lat: 13.1939, lon: -59.5432 }, // Bridgetown, Barbados
  { lat: 18.4655, lon: -66.1057 }, // San Juan, Puerto Rico
  { lat: 51.1657, lon: 10.4515 }, // Erfurt, Germany
  { lat: 48.1351, lon: 11.582 }, // Munich, Germany
  { lat: 50.1109, lon: 8.6821 }, // Frankfurt, Germany
  { lat: 53.5511, lon: 9.9937 }, // Hamburg, Germany
  { lat: 51.2277, lon: 6.7735 }, // Düsseldorf, Germany
  { lat: 48.7758, lon: 9.1829 }, // Stuttgart, Germany
  { lat: 51.3397, lon: 12.3731 }, // Leipzig, Germany
  { lat: 51.4556, lon: 7.0116 }, // Essen, Germany
  { lat: 51.0504, lon: 13.7373 }, // Dresden, Germany
  { lat: 50.9375, lon: 6.9603 }, // Cologne, Germany
  { lat: 49.4521, lon: 11.0767 }, // Nuremberg, Germany
  { lat: 52.3759, lon: 9.732 }, // Hanover, Germany
  { lat: 43.2965, lon: 5.3698 }, // Marseille, France
  { lat: 45.764, lon: 4.8357 }, // Lyon, France
  { lat: 43.6047, lon: 1.4442 }, // Toulouse, France
  { lat: 43.7102, lon: 7.262 }, // Nice, France
  { lat: 47.2184, lon: -1.5536 }, // Nantes, France
  { lat: 43.3017, lon: -0.3686 }, // Pau, France
  { lat: 47.4739, lon: -0.5515 }, // Angers, France
  { lat: 44.8378, lon: -0.5792 }, // Bordeaux, France
  { lat: 45.1885, lon: 5.7245 }, // Grenoble, France
  { lat: 49.2583, lon: 4.0317 }, // Reims, France
  { lat: 47.322, lon: 5.0415 }, // Dijon, France
  { lat: 43.6108, lon: 3.8767 }, // Montpellier, France
  { lat: 53.4808, lon: -2.2426 }, // Manchester, UK
  { lat: 52.4862, lon: -1.8904 }, // Birmingham, UK
  { lat: 53.8008, lon: -1.5491 }, // Leeds, UK
  { lat: 55.9533, lon: -3.1883 }, // Edinburgh, UK
  { lat: 55.8642, lon: -4.2518 }, // Glasgow, UK
  { lat: 53.4084, lon: -2.9916 }, // Liverpool, UK
  { lat: 51.4545, lon: -2.5879 }, // Bristol, UK
  { lat: 52.6369, lon: -1.1398 }, // Leicester, UK
  { lat: 53.3811, lon: -1.4701 }, // Sheffield, UK
  { lat: 54.9783, lon: -1.6178 }, // Newcastle upon Tyne, UK
  { lat: 52.9548, lon: -1.1581 }, // Nottingham, UK
  { lat: 51.4816, lon: -3.1791 }, // Cardiff, UK
  { lat: 45.4642, lon: 9.19 }, // Milan, Italy
  { lat: 40.8518, lon: 14.2681 }, // Naples, Italy
  { lat: 45.0703, lon: 7.6869 }, // Turin, Italy
  { lat: 44.4056, lon: 8.9463 }, // Genoa, Italy
  { lat: 43.7696, lon: 11.2558 }, // Florence, Italy
  { lat: 45.4408, lon: 12.3155 }, // Venice, Italy
  { lat: 44.4949, lon: 11.3426 }, // Bologna, Italy
  { lat: 38.1157, lon: 13.3615 }, // Palermo, Italy
  { lat: 41.1171, lon: 16.8719 }, // Bari, Italy
  { lat: 45.4387, lon: 10.9916 }, // Verona, Italy
  { lat: 37.5079, lon: 15.083 }, // Catania, Italy
  { lat: 44.6488, lon: 10.9208 }, // Modena, Italy
  { lat: 41.3851, lon: 2.1734 }, // Barcelona, Spain
  { lat: 39.4699, lon: -0.3763 }, // Valencia, Spain
  { lat: 37.3891, lon: -5.9845 }, // Seville, Spain
  { lat: 43.263, lon: -2.935 }, // Bilbao, Spain
  { lat: 37.9838, lon: -1.1299 }, // Murcia, Spain
  { lat: 38.3452, lon: -0.4815 }, // Alicante, Spain
  { lat: 41.6528, lon: -0.881 }, // Zaragoza, Spain
  { lat: 37.1773, lon: -3.5986 }, // Granada, Spain
  { lat: 36.7213, lon: -4.4214 }, // Málaga, Spain
  { lat: 43.3623, lon: -5.8489 }, // Oviedo, Spain
  { lat: 42.8805, lon: -8.5463 }, // Santiago de Compostela, Spain
  { lat: 38.7223, lon: -9.1393 }, // Lisbon, Portugal
  { lat: 41.1579, lon: -8.6291 }, // Porto, Portugal
  { lat: 37.0193, lon: -7.9304 }, // Faro, Portugal
  { lat: 38.5244, lon: -8.8882 }, // Setúbal, Portugal
  { lat: 39.7444, lon: -8.8072 }, // Leiria, Portugal
  { lat: 41.5454, lon: -8.4265 }, // Braga, Portugal
  { lat: 40.2033, lon: -8.4103 }, // Coimbra, Portugal
  { lat: 32.6669, lon: -16.9241 } // Funchal, Portugal
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

const repsOnline = [
  {
    account:
      'nano_37imps4zk1dfahkqweqa91xpysacb7scqxf3jqhktepeofcxqnpx531b3mnt',
    account_formatted: 'Kraken',
    alias: 'Kraken',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 14577941185005791161137184542239257351,
    weight_formatted: '15.08% (\u04fe\u200914,577,941.19)',
    weight_percent: 15.079010346032321
  },
  {
    account:
      'nano_1b9wguhh39at8qtm93oghd6r4f4ubk7zmqc9oi5ape6yyz4s1gamuwn3jjit',
    account_formatted: 'TRUSTABLE - NN1',
    alias: 'TRUSTABLE - NN1',
    is_known_account: true,
    last_telemetry_report: '50 seconds ago',
    node_id:
      'node_3j3kicpdgjd6k4enyoutdm8uq1edtwqw3d4z5eqw8azud86zt48r11c6mn6o',
    node_ip: '[::ffff:154.26.158.112]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 9164255966437545278764387035310019225,
    weight_formatted: '9.48% (\u04fe\u20099,164,255.97)',
    weight_percent: 9.479247362702628
  },
  {
    account:
      'nano_1natrium1o3z5519ifou7xii8crpxpk8y65qmkih8e8bpsjri651oza8imdd',
    account_formatted: 'Natrium',
    alias: 'Natrium',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 6606915502735005316867448961692377786,
    weight_formatted: '6.83% (\u04fe\u20096,606,915.50)',
    weight_percent: 6.8340066650545275
  },
  {
    account:
      'nano_3jwrszth46rk1mu7rmb4rhm54us8yg1gw3ipodftqtikf5yqdyr7471nsg1k',
    account_formatted: 'Binance',
    alias: 'Binance',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 6215357025427030049276571627631932259,
    weight_formatted: '6.43% (\u04fe\u20096,215,357.03)',
    weight_percent: 6.42898964272791
  },
  {
    account:
      'nano_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4',
    account_formatted: 'Nano Foundation #1',
    alias: 'Nano Foundation #1',
    is_known_account: true,
    last_telemetry_report: '20 seconds ago',
    node_id:
      'node_19rjotdhc1s3u4yxwjerneqpxyf8fwz6re39cpm5o5w9genrd3wjmec1scox',
    node_ip: '[::ffff:172.105.228.96]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 5504766646734992802914578056191482593,
    weight_formatted: '5.69% (\u04fe\u20095,504,766.65)',
    weight_percent: 5.693975038394808
  },
  {
    account:
      'nano_3oxhohaxp9ceobppkhp7wahauxd4zgyz4fhxfniyp4mb9opq4upfnaccswo7',
    account_formatted: 'BitGrail Trustee Rep',
    alias: 'BitGrail Trustee Rep',
    is_known_account: true,
    last_telemetry_report: '30 seconds ago',
    node_id:
      'node_1infp36n51cddwfxt8frcu5eatoaunt69g98zmujy8c7p9kecwox4jx4fpic',
    node_ip: '[::ffff:185.123.53.88]:7075',
    node_maker: '0',
    node_uptime: '2 months, 0 weeks',
    node_version: '26.0.0',
    show_weight: true,
    votingweight: 4201556265555356535934809611421529209,
    weight_formatted: '4.35% (\u04fe\u20094,201,556.27)',
    weight_percent: 4.345971052682702
  },
  {
    account:
      'nano_3pczxuorp48td8645bs3m6c3xotxd3idskrenmi65rbrga5zmkemzhwkaznh',
    account_formatted: 'NanoWallet.io',
    alias: 'NanoWallet.io',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 2982628027035306292218042613076876399,
    weight_formatted: '3.09% (\u04fe\u20092,982,628.03)',
    weight_percent: 3.085146133275025
  },
  {
    account:
      'nano_1x7biz69cem95oo7gxkrw6kzhfywq4x5dupw4z1bdzkb74dk9kpxwzjbdhhs',
    account_formatted: 'NanoCrawler / meltingice',
    alias: 'NanoCrawler / meltingice',
    is_known_account: true,
    last_telemetry_report: '40 seconds ago',
    node_id:
      'node_1x9yqazteies3eok478sgyugcbwp4ogekd4wynybz5an9swcestqgsw6zr6r',
    node_ip: '[::ffff:193.228.225.54]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 2399724939808750796845833310573430564,
    weight_formatted: '2.48% (\u04fe\u20092,399,724.94)',
    weight_percent: 2.4822076544132776
  },
  {
    account:
      'nano_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou',
    account_formatted: 'Nano Foundation #2',
    alias: 'Nano Foundation #2',
    is_known_account: true,
    last_telemetry_report: '50 seconds ago',
    node_id:
      'node_3pdbcjytjwpfytbjrn7he3xrotcr9js8rgkgxyxfetpc1h3ty531qiu3peb1',
    node_ip: '[::ffff:94.16.109.134]:7075',
    node_maker: '0',
    node_uptime: '2 months, 0 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 2365937864463669737133834508043933264,
    weight_formatted: '2.45% (\u04fe\u20092,365,937.86)',
    weight_percent: 2.447259258599013
  },
  {
    account:
      'nano_1wcxcjbwnnsdpee3d9i365e8bcj1uuyoqg9he5zjpt3r57dnjqe3gdc184ck',
    account_formatted: 'NANO ITALIA',
    alias: 'NANO ITALIA',
    is_known_account: true,
    last_telemetry_report: '42 seconds ago',
    node_id:
      'node_3siprdgwr94rq638oekgqx8yqerysjej38b5obkokksiouxm7nxs1xsh59o6',
    node_ip: '[::ffff:77.72.193.181]:7075',
    node_maker: '0',
    node_uptime: '4 days, 0 hours',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 2191786082029868625594833648859055832,
    weight_formatted: '2.27% (\u04fe\u20092,191,786.08)',
    weight_percent: 2.2671215768939805
  },
  {
    account:
      'nano_1anrzcuwe64rwxzcco8dkhpyxpi8kd7zsjc1oeimpc3ppca4mrjtwnqposrs',
    account_formatted: 'Nano Foundation #7',
    alias: 'Nano Foundation #7',
    is_known_account: true,
    last_telemetry_report: '49 seconds ago',
    node_id:
      'node_34qdpnc65gwz566rt3xgw33ix75opiddktqxef7sirody93uqg39kz8b35k6',
    node_ip: '[::ffff:45.76.114.63]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 1952172168412862789975693023982208701,
    weight_formatted: '2.02% (\u04fe\u20091,952,172.17)',
    weight_percent: 2.0192717168464975
  },
  {
    account:
      'nano_3chartsi6ja8ay1qq9xg3xegqnbg1qx76nouw6jedyb8wx3r4wu94rxap7hg',
    account_formatted: 'Nano Charts \ud83d\udcca',
    alias: 'Nano Charts \ud83d\udcca',
    is_known_account: true,
    last_telemetry_report: '47 seconds ago',
    node_id:
      'node_3ce3m6dcukqe45u3qpmfn8wxjnyhpdhrg98pp44hcgprdw6rczf3jdps6pco',
    node_ip: '[::ffff:173.249.54.87]:7075',
    node_maker: '0',
    node_uptime: '1 months, 2 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 1924066387190937498757643966549489916,
    weight_formatted: '1.99% (\u04fe\u20091,924,066.39)',
    weight_percent: 1.9901998911030487
  },
  {
    account:
      'nano_3kqdiqmqiojr1aqqj51aq8bzz5jtwnkmhb38qwf3ppngo8uhhzkdkn7up7rp',
    account_formatted: 'ARaiNode',
    alias: 'ARaiNode',
    is_known_account: true,
    last_telemetry_report: '15 seconds ago',
    node_id:
      'node_13rtsqoxf6or31cnutc5cag5a5yia63kxf8nf68m1y4uwfu9rd738yrbc9nx',
    node_ip: '[::ffff:143.198.101.143]:7075',
    node_maker: '0',
    node_uptime: '2 months, 0 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 1896869913279136828625318890704944138,
    weight_formatted: '1.96% (\u04fe\u20091,896,869.91)',
    weight_percent: 1.962068627141479
  },
  {
    account:
      'nano_3ktybzzy14zxgb6osbhcc155pwk7osbmf5gbh5fo73bsfu9wuiz54t1uozi1',
    account_formatted: 'Kappture',
    alias: 'Kappture',
    is_known_account: true,
    last_telemetry_report: '28 seconds ago',
    node_id:
      'node_167wa981kp48q9jgganzndxhzhpuhkif6pgppf8d3s1mzuh7frq144fpobtg',
    node_ip: '[::ffff:54.77.3.59]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 1713341730475001674832279224977894059,
    weight_formatted: '1.77% (\u04fe\u20091,713,341.73)',
    weight_percent: 1.7722322618981816
  },
  {
    account:
      'nano_1tk8h3yzkibbsti8upkfa69wqafz6mzfzgu8bu5edaay9k7hidqdunpr4tb6',
    account_formatted: 'RsNano.com - Nano Rust Port',
    alias: 'RsNano.com - Nano Rust Port',
    is_known_account: true,
    last_telemetry_report: '50 seconds ago',
    node_id:
      'node_16s98fiy4pxwr6wkt49jxpain9yuy64sb8fz4gpreds94ch8soptm1khi6cf',
    node_ip: '[::ffff:50.21.179.40]:7075',
    node_maker: '0',
    node_uptime: '2 months, 0 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 1547483215443825508649094052405666407,
    weight_formatted: '1.60% (\u04fe\u20091,547,483.22)',
    weight_percent: 1.600672901602157
  },
  {
    account:
      'nano_3msc38fyn67pgio16dj586pdrceahtn75qgnx7fy19wscixrc8dbb3abhbw6',
    account_formatted: 'gr0vity',
    alias: 'gr0vity',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 1354820185619163936133082502610988925,
    weight_formatted: '1.40% (\u04fe\u20091,354,820.19)',
    weight_percent: 1.401387708778624
  },
  {
    account:
      'nano_3pg8khw8gs94c1qeq9741n99ubrut8sj3n9kpntim1rm35h4wdzirofazmwt',
    account_formatted: 'Yakamoz Node - nano.trade',
    alias: 'Yakamoz Node - nano.trade',
    is_known_account: true,
    last_telemetry_report: '19 seconds ago',
    node_id:
      'node_13ds417kzo6ixjgqrwswyene9xpga8h4ydknpbfcj6mcbhas7hnthmxrmgyn',
    node_ip: '[::ffff:37.120.164.78]:7075',
    node_maker: '0',
    node_uptime: '1 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 1325954211815665215215168025797590883,
    weight_formatted: '1.37% (\u04fe\u20091,325,954.21)',
    weight_percent: 1.3715295613140865
  },
  {
    account:
      'nano_3patrick68y5btibaujyu7zokw7ctu4onikarddphra6qt688xzrszcg4yuo',
    account_formatted: "Patrick's Self-Hosted Nano Node",
    alias: "Patrick's Self-Hosted Nano Node",
    is_known_account: true,
    last_telemetry_report: '10 seconds ago',
    node_id:
      'node_1zkr5ff3f9qt6tdjf83ox661nrsgfsudt67fhf779ypisysnark7ao1j4oyb',
    node_ip: '[::ffff:136.50.196.102]:7075',
    node_maker: '0',
    node_uptime: '1 months, 0 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 1323188540958567651634087996803402213,
    weight_formatted: '1.37% (\u04fe\u20091,323,188.54)',
    weight_percent: 1.3686688295455438
  },
  {
    account:
      'nano_1ec5optppmndqsb3rxu1qa4hpo39957s7mfqycpbd547jga4768o6xz8gfie',
    account_formatted: 'NanoBank',
    alias: 'NanoBank',
    is_known_account: true,
    last_telemetry_report: '8 seconds ago',
    node_id:
      'node_16xc3tugefom5na7uprcqc6keuwumdi5kxc68s1xwzcems86r9d4gr14pw6x',
    node_ip: '[::ffff:94.237.111.22]:7075',
    node_maker: '0',
    node_uptime: '1 months, 2 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 1270444885165674929150232101171132959,
    weight_formatted: '1.31% (\u04fe\u20091,270,444.89)',
    weight_percent: 1.3141122826850977
  },
  {
    account:
      'nano_1ookerz3adg5rxc4zwwoshim5yyyihf6dpogjihwwq6ksjpq7ea4fuam5mmc',
    account_formatted: 'NanoLooker',
    alias: 'NanoLooker',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 1235718645389840403612759203921519843,
    weight_formatted: '1.28% (\u04fe\u20091,235,718.65)',
    weight_percent: 1.2781924417272263
  },
  {
    account:
      'nano_1iuz18n4g4wfp9gf7p1s8qkygxw7wx9qfjq6a9aq68uyrdnningdcjontgar',
    account_formatted: 'NanoTicker',
    alias: 'NanoTicker',
    is_known_account: true,
    last_telemetry_report: '5 seconds ago',
    node_id:
      'node_3agty88fnhu6m859aoapcijprhicz3wp1p7xqirzmu6qsqnpex5ax8mnne7i',
    node_ip: '[::ffff:93.161.53.161]:7075',
    node_maker: '0',
    node_uptime: '1 weeks, 4 days',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 1219704097720207685786746015034424067,
    weight_formatted: '1.26% (\u04fe\u20091,219,704.10)',
    weight_percent: 1.2616274462362445
  },
  {
    account:
      'nano_1zuksmn4e8tjw1ch8m8fbrwy5459bx8645o9euj699rs13qy6ysjhrewioey',
    account_formatted: 'nanowallets.guide',
    alias: 'nanowallets.guide',
    is_known_account: true,
    last_telemetry_report: '15 seconds ago',
    node_id:
      'node_3nuqqrqktnti85qthoig3thkcfjejfcrtn6wykp51388er9wt3p3f9tdczdm',
    node_ip: '[::ffff:65.21.104.141]:7075',
    node_maker: '0',
    node_uptime: '2 months, 0 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 1119295980386146619273716318739787322,
    weight_formatted: '1.16% (\u04fe\u20091,119,295.98)',
    weight_percent: 1.1577681274962826
  },
  {
    account:
      'nano_1wenanoqm7xbypou7x3nue1isaeddamjdnc3z99tekjbfezdbq8fmb659o7t',
    account_formatted: 'wenanorep',
    alias: 'wenanorep',
    is_known_account: true,
    last_telemetry_report: '49 seconds ago',
    node_id:
      'node_3rwccdksguyyabjf83ja8qmwffqnkuhmcwhrrksre3ypghg5t5hujo1y9s5g',
    node_ip: '[::ffff:78.47.124.255]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 1087479000863998467438057724291767464,
    weight_formatted: '1.12% (\u04fe\u20091,087,479.00)',
    weight_percent: 1.1248575431205248
  },
  {
    account:
      'nano_1jtx5p8141zjtukz4msp1x93st7nh475f74odj8673qqm96xczmtcnanos1o',
    account_formatted: 'NanOslo \ud83d\udc2f',
    alias: 'NanOslo \ud83d\udc2f',
    is_known_account: true,
    last_telemetry_report: '43 seconds ago',
    node_id:
      'node_376y5edak7j8j96qpubcx5yr1zptwpiycczcmm4rfyhcnwjgjiy668o7eohd',
    node_ip: '[::ffff:193.71.191.138]:7075',
    node_maker: '0',
    node_uptime: '5 days, 1 hours',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 975631100415965584700155096817679253,
    weight_formatted: '1.01% (\u04fe\u2009975,631.10)',
    weight_percent: 1.0091652360495786
  },
  {
    account:
      'nano_35btiz1mgfwp95c3ckazmzbp5gepduxtijuijd9xebeau8u1gsbea41smjca',
    account_formatted: 'Atomic Wallet',
    alias: 'Atomic Wallet',
    is_known_account: true,
    last_telemetry_report: '32 seconds ago',
    node_id:
      'node_19scomu6rgygbfuy7eeisnpnnzyuco8c89z6j9tid4mx1np731jocumnmcwo',
    node_ip: '[::ffff:51.81.185.63]:7075',
    node_maker: '0',
    node_uptime: '2 days, 14 hours',
    node_version: '25.1.0',
    show_weight: true,
    votingweight: 965170211676363486691740657488718500,
    weight_formatted: '1.00% (\u04fe\u2009965,170.21)',
    weight_percent: 0.998344788392992
  },
  {
    account:
      'nano_3dmtrrws3pocycmbqwawk6xs7446qxa36fcncush4s1pejk16ksbmakis78m',
    account_formatted: 'Nano Foundation #4',
    alias: 'Nano Foundation #4',
    is_known_account: true,
    last_telemetry_report: '49 seconds ago',
    node_id:
      'node_37anxj1bo9mbdxjagqxpx994frza8erigfmnm54x9qrbuekr3cqn8jgngmo7',
    node_ip: '[::ffff:45.79.207.119]:7075',
    node_maker: '0',
    node_uptime: '1 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 738008831064524519211746702059150452,
    weight_formatted: '0.76% (\u04fe\u2009738,008.83)',
    weight_percent: 0.7633754765406378
  },
  {
    account:
      'nano_1q3hqecaw15cjt7thbtxu3pbzr1eihtzzpzxguoc37bj1wc5ffoh7w74gi6p',
    account_formatted: 'Nano Foundation #3',
    alias: 'Nano Foundation #3',
    is_known_account: true,
    last_telemetry_report: '14 seconds ago',
    node_id:
      'node_1oysj5h37647ifcpq77t7ckm74scbkmoh69psngyb7b8d6zjzxrdko4gpm3e',
    node_ip: '[::ffff:31.171.246.124]:7075',
    node_maker: '0',
    node_uptime: '1 weeks, 2 days',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 729054475074910771993093004164876489,
    weight_formatted: '0.75% (\u04fe\u2009729,054.48)',
    weight_percent: 0.7541133437815675
  },
  {
    account:
      'nano_3strnmn7h9b7oghxa6h9ckrpf5r454fsobpicixps6xwiwc5q4hat7wjbpqz',
    account_formatted: 'nano.strnmn.me \ud83c\udf3f',
    alias: 'nano.strnmn.me \ud83c\udf3f',
    is_known_account: true,
    last_telemetry_report: '1 seconds ago',
    node_id:
      'node_1xyundhizom5xwd4rakf8c3jsq5khjpgskeqh9xyzeazajfzwire5kxhc83b',
    node_ip: '[::ffff:78.47.159.121]:7075',
    node_maker: '0',
    node_uptime: '1 months, 1 weeks',
    node_version: '25.1.0',
    show_weight: true,
    votingweight: 705151872740188280403162509276698937,
    weight_formatted: '0.73% (\u04fe\u2009705,151.87)',
    weight_percent: 0.7293891674847734
  },
  {
    account:
      'nano_3o7uzba8b9e1wqu5ziwpruteyrs3scyqr761x7ke6w1xctohxfh5du75qgaj',
    account_formatted: 'NANO TipBot',
    alias: 'NANO TipBot',
    is_known_account: true,
    last_telemetry_report: '2 seconds ago',
    node_id:
      'node_3ua4baoix6betke3o8f4ty997mztbpo91upb396idm3n5sfkgwetxpb8euxe',
    node_ip: '[::ffff:167.235.149.44]:7075',
    node_maker: '0',
    node_uptime: '2 hours, 46 minutes',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 703261645375252131817776165238644767,
    weight_formatted: '0.73% (\u04fe\u2009703,261.65)',
    weight_percent: 0.7274339697218999
  },
  {
    account:
      'nano_1awsn43we17c1oshdru4azeqjz9wii41dy8npubm4rg11so7dx3jtqgoeahy',
    account_formatted: 'Nano Foundation #6',
    alias: 'Nano Foundation #6',
    is_known_account: true,
    last_telemetry_report: '49 seconds ago',
    node_id:
      'node_36s1qep946tkkbmxgqyaytz6ns3wjueq8ctj3p4sb34z5skt4nyjdwdi64t7',
    node_ip: '[::ffff:193.228.225.50]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 695446364410906464109818929376451850,
    weight_formatted: '0.72% (\u04fe\u2009695,446.36)',
    weight_percent: 0.7193500639753375
  },
  {
    account:
      'nano_33ad5app7jeo6jfe9ure6zsj8yg7knt6c1zrr5yg79ktfzk5ouhmpn6p5d7p',
    account_formatted: 'warai',
    alias: 'warai',
    is_known_account: true,
    last_telemetry_report: '29 seconds ago',
    node_id:
      'node_3fsyygc35mf1digc9sf7g8ymu8f5wpnfxd68krurkc8jjs8dw1qkoj8sxbqy',
    node_ip: '[::ffff:64.23.235.23]:7075',
    node_maker: '0',
    node_uptime: '1 months, 2 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 661456100446296658961817529586886249,
    weight_formatted: '0.68% (\u04fe\u2009661,456.10)',
    weight_percent: 0.6841914955957438
  },
  {
    account:
      'nano_3zapp5z141qpjipsb1jnjdmk49jwqy58i6u6wnyrh6x7woajeyme85shxewt',
    account_formatted: 'nalli',
    alias: 'nalli',
    is_known_account: true,
    last_telemetry_report: '30 seconds ago',
    node_id:
      'node_3w3zw4tg4sx78aj5fg1gy94p4ypykstehh5br38gnadbzpjcpc1t4dbspjqt',
    node_ip: '[::ffff:91.153.7.1]:7075',
    node_maker: '0',
    node_uptime: '1 months, 0 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 655863987335550427922320236922661956,
    weight_formatted: '0.68% (\u04fe\u2009655,863.99)',
    weight_percent: 0.6784071718436452
  },
  {
    account:
      'nano_15nt4cis8ac184q9mj7bedww9ay9zh5jk5k7sj9ypmz44twjcpz3cn6oijir',
    account_formatted: 'kedrin',
    alias: 'kedrin',
    is_known_account: true,
    last_telemetry_report: '39 seconds ago',
    node_id:
      'node_1ncsqn7opcgq8jjbkm6ia65bwqft65umwpdifu99tgisxye6bzobtw3q438o',
    node_ip: '[::ffff:144.76.30.235]:7075',
    node_maker: '0',
    node_uptime: '1 weeks, 0 days',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 612071932347946964090729717765531229,
    weight_formatted: '0.63% (\u04fe\u2009612,071.93)',
    weight_percent: 0.6331099078574737
  },
  {
    account:
      'nano_1hza3f7wiiqa7ig3jczyxj5yo86yegcmqk3criaz838j91sxcckpfhbhhra1',
    account_formatted: 'Nano Foundation #8',
    alias: 'Nano Foundation #8',
    is_known_account: true,
    last_telemetry_report: '9 seconds ago',
    node_id:
      'node_1mjgzapy5c9hambwmepkpmg6u5di163zfocfsqc4pxu658cmmge7zsm1mg5r',
    node_ip: '[::ffff:194.163.141.239]:7075',
    node_maker: '0',
    node_uptime: '2 months, 0 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 595144507484977699749929758095750651,
    weight_formatted: '0.62% (\u04fe\u2009595,144.51)',
    weight_percent: 0.6156006579983142
  },
  {
    account:
      'nano_3afmp9hx6pp6fdcjq96f9qnoeh1kiqpqyzp7c18byaipf48t3cpzmfnhc1b7',
    account_formatted: 'Node will shut down January 2025',
    alias: 'Node will shut down January 2025',
    is_known_account: true,
    last_telemetry_report: '49 seconds ago',
    node_id:
      'node_3r8gbkniabnb9rsezy6zteouu3se7iqs4a93rrnrceue7jb74biy48s6fo6n',
    node_ip: '[::ffff:173.249.53.54]:7075',
    node_maker: '0',
    node_uptime: '1 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 592383077107294929139223761604249543,
    weight_formatted: '0.61% (\u04fe\u2009592,383.08)',
    weight_percent: 0.6127443124618296
  },
  {
    account:
      'nano_375pi67f4i4ag5rudoziza86z715bepsmp1r6ri4domt7ct6tk67mjsxtebm',
    account_formatted: 'Nanovert',
    alias: 'Nanovert',
    is_known_account: true,
    last_telemetry_report: '36 seconds ago',
    node_id:
      'node_1jos9ay3ty1qz4nf9tp6p5nq1nbyqirr6hid781q3887kb5i4eegjoi8hs9j',
    node_ip: '[::ffff:15.235.14.159]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 587782624662584243671949223498612740,
    weight_formatted: '0.61% (\u04fe\u2009587,782.62)',
    weight_percent: 0.6079857344754146
  },
  {
    account:
      'nano_318uu1tsbios3kp4dts5b6zy1y49uyb88jajfjyxwmozht8unaxeb43keork',
    account_formatted: 'ScandiNode \ud83c\udf10 Green, fast & capable! ',
    alias: 'ScandiNode \ud83c\udf10 Green, fast & capable! ',
    is_known_account: true,
    last_telemetry_report: '34 seconds ago',
    node_id:
      'node_36h5ctejhpwsyeqx1fp5qc8gr3cffrojhjk961nduce9b85c53yz4zmomrnm',
    node_ip: '[::ffff:77.33.36.59]:7075',
    node_maker: '0',
    node_uptime: '3 weeks, 6 days',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 585238182309142802737945312533284262,
    weight_formatted: '0.61% (\u04fe\u2009585,238.18)',
    weight_percent: 0.6053538352184817
  },
  {
    account:
      'nano_1kd4h9nqaxengni43xy9775gcag8ptw8ddjifnm77qes1efuoqikoqy5sjq3',
    account_formatted: 'NanoQuake',
    alias: 'NanoQuake',
    is_known_account: true,
    last_telemetry_report: '39 seconds ago',
    node_id:
      'node_1yauxio6jknd9kwohy794kgpdgrcmhri5mo3nkm8bhhjw87b1w1ktu74nj1x',
    node_ip: '[::ffff:88.202.151.14]:7075',
    node_maker: '0',
    node_uptime: '1 weeks, 3 days',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 569575463734777381434170129163553030,
    weight_formatted: '0.59% (\u04fe\u2009569,575.46)',
    weight_percent: 0.5891527617999135
  },
  {
    account:
      'nano_1my1snode8rwccjxkckjirj65zdxo6g5nhh16fh6sn7hwewxooyyesdsmii3',
    account_formatted: 'My1s Nano Node',
    alias: 'My1s Nano Node',
    is_known_account: true,
    last_telemetry_report: '26 seconds ago',
    node_id:
      'node_1my1srepp9jemtjqfz7z1aachjtzpf8nm9hrmkqmn3yyscs1gmoqcxbcrpyx',
    node_ip: '[::ffff:2.59.133.106]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 536852175193912880238793035828324966,
    weight_formatted: '0.56% (\u04fe\u2009536,852.18)',
    weight_percent: 0.5553047169901689
  },
  {
    account:
      'nano_396sch48s3jmzq1bk31pxxpz64rn7joj38emj4ueypkb9p9mzrym34obze6c',
    account_formatted: 'SupeNode',
    alias: 'SupeNode',
    is_known_account: true,
    last_telemetry_report: '2 seconds ago',
    node_id:
      'node_1xq8f5axaagj4b835g6pk9135rnomzmt9a8sm96tqegq4y7mteznbwec7tiy',
    node_ip: '[::ffff:78.129.253.179]:7075',
    node_maker: '0',
    node_uptime: '1 months, 3 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 530623779562022914649478171958678701,
    weight_formatted: '0.55% (\u04fe\u2009530,623.78)',
    weight_percent: 0.5488622405814253
  },
  {
    account:
      'nano_11pb5aa6uirs9hoqsg4swnzyehoiqowj94kdpthwkhwufmtd6a11xx35iron',
    account_formatted:
      ' \ud83d\udd10 IronClad \ud83d\udd10 \u27a1 Reliable node built to last',
    alias:
      ' \ud83d\udd10 IronClad \ud83d\udd10 \u27a1 Reliable node built to last',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 515271021762528828295144532615492366,
    weight_formatted: '0.53% (\u04fe\u2009515,271.02)',
    weight_percent: 0.5329817818279757
  },
  {
    account:
      'nano_1oenixj4qtpfcembga9kqwggkb87wooicfy5df8nhdywrjrrqxk7or4gz15b',
    account_formatted:
      'Redeemfor.me \ud83d\udecd\ufe0f\ud83d\uded2 \u2014  Luckynano.com \ud83c\udfb0\ud83d\udcb0',
    alias:
      'Redeemfor.me \ud83d\udecd\ufe0f\ud83d\uded2 \u2014  Luckynano.com \ud83c\udfb0\ud83d\udcb0',
    is_known_account: true,
    last_telemetry_report: '12 seconds ago',
    node_id:
      'node_3xfq5po69uq7zac5smx6j5cggonprysxq1fohsmf15nhmt3yts4e41141hky',
    node_ip: '[::ffff:173.212.221.138]:7075',
    node_maker: '0',
    node_uptime: '1 days, 20 hours',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 503698460593403607753809914529531673,
    weight_formatted: '0.52% (\u04fe\u2009503,698.46)',
    weight_percent: 0.5210114516294414
  },
  {
    account:
      'nano_1ota8bpwwawmc8ksdz4ezzrb3afbdeipk1n7rbeguhm4muy1r649uzw5moon',
    account_formatted: 'Moonstruck.dev \ud83c\udf19',
    alias: 'Moonstruck.dev \ud83c\udf19',
    is_known_account: true,
    last_telemetry_report: '21 seconds ago',
    node_id:
      'node_1n7rmtpw13aoig89kqyqgoowpi7rh39berioqe196gj9pjh34m38qc196sh8',
    node_ip: '[::ffff:94.130.12.236]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 494667377960397723509508047297807089,
    weight_formatted: '0.51% (\u04fe\u2009494,667.38)',
    weight_percent: 0.5116699549989682
  },
  {
    account:
      'nano_34amtofxstsfyqcgphp8piij9u33widykq9wbz6ysjpxhbgmqu8btu1eexer',
    account_formatted: 'nanolove',
    alias: 'nanolove',
    is_known_account: true,
    last_telemetry_report: '50 seconds ago',
    node_id:
      'node_1j4t5q4o4bkm9cmjc89znifscmym8p9a155qzmjgeycu4m56nub4h4nur5ke',
    node_ip: '[::ffff:37.187.73.169]:7075',
    node_maker: '0',
    node_uptime: '1 months, 0 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 468842680415886628674833835784113948,
    weight_formatted: '0.48% (\u04fe\u2009468,842.68)',
    weight_percent: 0.48495761774126483
  },
  {
    account:
      'nano_3n7ky76t4g57o9skjawm8pprooz1bminkbeegsyt694xn6d31c6s744fjzzz',
    account_formatted: 'humblenano.io \ud83d\udd25',
    alias: 'humblenano.io \ud83d\udd25',
    is_known_account: true,
    last_telemetry_report: '49 seconds ago',
    node_id:
      'node_1r8ab8adwjrcokueoj6ewitw3513k1ys84o33ynoimw6psgrexb64789qm1f',
    node_ip: '[::ffff:5.180.41.8]:7075',
    node_maker: '0',
    node_uptime: '2 months, 0 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 468353264570025847825857023360376143,
    weight_formatted: '0.48% (\u04fe\u2009468,353.26)',
    weight_percent: 0.48445137982264586
  },
  {
    account:
      'nano_1isgusmnf1xe45iyjtfxw4qiai36zxdituu7gpni1trtj5ojyujobq13bjah',
    account_formatted: 'Noli Me Tangere',
    alias: 'Noli Me Tangere',
    is_known_account: true,
    last_telemetry_report: '30 seconds ago',
    node_id:
      'node_1s1s86gp71knxq4uqbazrdq3ht9fjx6doq98ih4shq38kwc5phgzoujprp5m',
    node_ip: '[::ffff:167.99.114.58]:7075',
    node_maker: '0',
    node_uptime: '2 months, 0 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 464528334599161729064904000911689499,
    weight_formatted: '0.48% (\u04fe\u2009464,528.33)',
    weight_percent: 0.4804949803646187
  },
  {
    account:
      'nano_37ortkby6k68z8tkk8g63ndbp8wjbmofhn56oyxb4rm6s3x51pkpiwcnpgmq',
    account_formatted: 'Makonode',
    alias: 'Makonode',
    is_known_account: true,
    last_telemetry_report: '50 seconds ago',
    node_id:
      'node_3qjm5cxzoqa9qss4euzrhpe83wq3hpott1nyemxf3wzqzrsbwygbjrqnbghd',
    node_ip: '[::ffff:213.199.37.39]:7075',
    node_maker: '0',
    node_uptime: '1 months, 3 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 459263938253808126144593122018758221,
    weight_formatted: '0.48% (\u04fe\u2009459,263.94)',
    weight_percent: 0.4750496375723971
  },
  {
    account:
      'nano_3ekb6tp8ixtkibimyygepgkwckzhds9basxd5zfue4efjnxaan77gsnanick',
    account_formatted: 'Nanick',
    alias: 'Nanick',
    is_known_account: true,
    last_telemetry_report: '40 seconds ago',
    node_id:
      'node_19eu4ijd31b35nzn576ixz5taneqzco1r88gw7tho3kb9t3pe74mssydhe7k',
    node_ip: '[::ffff:71.104.25.213]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 406108876650686181919506380674427852,
    weight_formatted: '0.42% (\u04fe\u2009406,108.88)',
    weight_percent: 0.4200675441693949
  },
  {
    account:
      'nano_3u7d5iohy14swyhxhgfm9iq4xa9yibhcgnyj697uwhicp14dhx4woik5e9ek',
    account_formatted: 'NANO Skynode \ud83c\udfd4\ufe0f',
    alias: 'NANO Skynode \ud83c\udfd4\ufe0f',
    is_known_account: true,
    last_telemetry_report: '22 seconds ago',
    node_id:
      'node_1t4gf4me1hnrh9ccjzgb76hdj1bmrgfe7qwebiu98w9zaywza881pffzugwu',
    node_ip: '[::ffff:164.68.121.140]:7075',
    node_maker: '0',
    node_uptime: '4 months, 2 weeks',
    node_version: '25.1.0',
    show_weight: true,
    votingweight: 403894678716064026439191430927463814,
    weight_formatted: '0.42% (\u04fe\u2009403,894.68)',
    weight_percent: 0.4177772404056047
  },
  {
    account:
      'nano_34zuxqdsucurhjrmpc4aixzbgaa4wjzz6bn5ryn56emc9tmd3pnxjoxfzyb6',
    account_formatted: 'Nano Germany \ud83c\udde9\ud83c\uddea',
    alias: 'Nano Germany \ud83c\udde9\ud83c\uddea',
    is_known_account: true,
    last_telemetry_report: '13 seconds ago',
    node_id:
      'node_3mehwjxa8scbg8sqo3uzj6zipcqp7qxeymwta6h89dtctkp4ee3yroiqwzfu',
    node_ip: '[::ffff:116.202.52.114]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 402768542081788879745164629949774781,
    weight_formatted: '0.42% (\u04fe\u2009402,768.54)',
    weight_percent: 0.41661239649906273
  },
  {
    account:
      'nano_3hd4ezdgsp15iemx7h81in7xz5tpxi43b6b41zn3qmwiuypankocw3awes5k',
    account_formatted: 'Nano Foundation #5',
    alias: 'Nano Foundation #5',
    is_known_account: true,
    last_telemetry_report: '43 seconds ago',
    node_id:
      'node_1ezu5m11zzdntakx7fmyjqtbe9sf7k4tp67qh4m5uoezy77817sqo71pizm8',
    node_ip: '[::ffff:81.0.249.225]:7075',
    node_maker: '0',
    node_uptime: '1 months, 0 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 401504136122581293744607234798339989,
    weight_formatted: '0.42% (\u04fe\u2009401,504.14)',
    weight_percent: 0.4153045307107107
  },
  {
    account:
      'nano_1fe17w13stn8rqos3nxmupoez9sne4pc4njmr1fbz9nci6obnng6jatton5q',
    account_formatted: 'nano-no.de \ud83c\udf0d\ud83d\ude80\ud83c\udf11',
    alias: 'nano-no.de \ud83c\udf0d\ud83d\ude80\ud83c\udf11',
    is_known_account: true,
    last_telemetry_report: '44 seconds ago',
    node_id:
      'node_1159gen9e799fq1ucr1yq7cs43r9ch9nkefc6n9jybmsbrwj77u65idfnek3',
    node_ip: '[::ffff:65.109.90.95]:7075',
    node_maker: '0',
    node_uptime: '4 weeks, 1 days',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 388588391906317224082358034248575014,
    weight_formatted: '0.40% (\u04fe\u2009388,588.39)',
    weight_percent: 0.401944849930542
  },
  {
    account:
      'nano_1fnx59bqpx11s1yn7i5hba3ot5no4ypy971zbkp5wtium3yyafpwhhwkq8fc',
    account_formatted: "NiF's Node - nano.nifni.net",
    alias: "NiF's Node - nano.nifni.net",
    is_known_account: true,
    last_telemetry_report: '4 minute(s) ago',
    node_id:
      'node_3agmhrgpks95ade19ashwxa959updw7qmr7fnftgax1rszhsh3oauwknbgq9',
    node_ip: '[::ffff:202.61.238.208]:7075',
    node_maker: '0',
    node_uptime: '1 months, 3 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 380078271788178829806763085915353812,
    weight_formatted: '0.39% (\u04fe\u2009380,078.27)',
    weight_percent: 0.393142222201506
  },
  {
    account:
      'nano_1bj5cf9hkgkcspmn15day8cyn3hyaciufbba4rqmbnkmbdpjdmo9pwyatjoi',
    account_formatted: 'Huobi Representative',
    alias: 'Huobi Representative',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 371404083252453564328742107324220123,
    weight_formatted: '0.38% (\u04fe\u2009371,404.08)',
    weight_percent: 0.38416988673837704
  },
  {
    account:
      'nano_3tta9pdxr4djdcm6r3c7969syoirj3dunrtynmmi8n1qtxzk9iksoz1gxdrh',
    account_formatted: 'humblenano.africa \ud83c\uddff\ud83c\udde6',
    alias: 'humblenano.africa \ud83c\uddff\ud83c\udde6',
    is_known_account: true,
    last_telemetry_report: '19 seconds ago',
    node_id:
      'node_3hir1dehiyesr5367dupza9tffwhiqkufsi768gq7ip3o5c78q3k1qt99f7e',
    node_ip: '[::ffff:102.165.20.242]:7075',
    node_maker: '0',
    node_uptime: '2 months, 0 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 294336388838698540125765615128811202,
    weight_formatted: '0.30% (\u04fe\u2009294,336.39)',
    weight_percent: 0.3044532417977899
  },
  {
    account:
      'nano_15zntj4a8r6bkihei788ciy1jgc5wnskan1gpgn8e8jku3r4qhr7rwifitir',
    account_formatted: 'Paypur_node',
    alias: 'Paypur_node',
    is_known_account: true,
    last_telemetry_report: '9 seconds ago',
    node_id:
      'node_1ub3awctg89qmd898ajxw4eee4gsu8nugrs3593bsuk3cyccgoea43wuuhwc',
    node_ip: '[::ffff:76.102.14.5]:7075',
    node_maker: '0',
    node_uptime: '1 months, 3 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 282458566612342762384873514381838441,
    weight_formatted: '0.29% (\u04fe\u2009282,458.57)',
    weight_percent: 0.2921671581892367
  },
  {
    account:
      'nano_1banexkcfuieufzxksfrxqf6xy8e57ry1zdtq9yn7jntzhpwu4pg4hajojmq',
    account_formatted: 'Nanswap',
    alias: 'Nanswap',
    is_known_account: true,
    last_telemetry_report: '30 seconds ago',
    node_id:
      'node_1qmpzuo43ryzowctwg8fd9rwx5d5p7dhqz6d3g7qqbdbxuztby1kctuf4nas',
    node_ip: '[::ffff:51.15.19.228]:7075',
    node_maker: '0',
    node_uptime: '6 days, 13 hours',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 271003967537003194986584006329515452,
    weight_formatted: '0.28% (\u04fe\u2009271,003.97)',
    weight_percent: 0.28031884464655665
  },
  {
    account:
      'nano_3i3dqy5xs98ewtk9ejfpxfwbsscejc6njz9hk5ia1446gdkxpxkjeeia719n',
    account_formatted: 'Buckeye Nano Node',
    alias: 'Buckeye Nano Node',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 244429854604949787198480275408825993,
    weight_formatted: '0.25% (\u04fe\u2009244,429.85)',
    weight_percent: 0.2528313332926751
  },
  {
    account:
      'nano_3abuqtbaotp9myn6ihb6mg96hf7jnapuddydf6ytgd174t4phg86nnq4cmxj',
    account_formatted: 'Puddy',
    alias: 'Puddy',
    is_known_account: true,
    last_telemetry_report: '49 seconds ago',
    node_id:
      'node_3zgfxcjxdew9nma99m9m57z7apewainjynd7iyqs5z1s6a68rpmneomb7qog',
    node_ip: '[::ffff:104.131.169.14]:7075',
    node_maker: '0',
    node_uptime: '2 days, 17 hours',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 235386977293529795225044555808365183,
    weight_formatted: '0.24% (\u04fe\u2009235,386.98)',
    weight_percent: 0.2434776365802028
  },
  {
    account:
      'nano_1gemini56efw4qrfzfcc71cky1wj7a6673fu5ue5afyyz55zb1cxkj8rkr1n',
    account_formatted: "MajorChump's Node",
    alias: "MajorChump's Node",
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 213098550154100860179235861840903091,
    weight_formatted: '0.22% (\u04fe\u2009213,098.55)',
    weight_percent: 0.2204231174840549
  },
  {
    account:
      'nano_16d45ow3tsj1y3z9n4satwzxgj6qiue1ggxbwbrj3b33qr58bzchkpsffpx4',
    account_formatted: '1NANO Community',
    alias: '1NANO Community',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 212092648136609240949678582386066191,
    weight_formatted: '0.22% (\u04fe\u2009212,092.65)',
    weight_percent: 0.21938264086692794
  },
  {
    account:
      'nano_1j78msn5omp8jrjge8txwxm4x3smusa1cojg7nuk8fdzoux41fqeeogg5aa1',
    account_formatted: 'NanoBrasil \ud83c\udde7\ud83c\uddf7',
    alias: 'NanoBrasil \ud83c\udde7\ud83c\uddf7',
    is_known_account: true,
    last_telemetry_report: '17 seconds ago',
    node_id:
      'node_3okt58nz48e1xfbk36xwnzjf1cazdsihe64149kzcdg5yzd5zydyz1pnahou',
    node_ip: '[::ffff:177.66.167.199]:7075',
    node_maker: '0',
    node_uptime: '2 weeks, 4 days',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 209401191213808798436727290039285669,
    weight_formatted: '0.22% (\u04fe\u2009209,401.19)',
    weight_percent: 0.2165986738945168
  },
  {
    account:
      'nano_3pnanopr3d5g7o45zh3nmdkqpaqxhhp3mw14nzr41smjz8xsrfyhtf9xac77',
    account_formatted: 'PlayNANO Representative',
    alias: 'PlayNANO Representative',
    is_known_account: true,
    last_telemetry_report: '24 seconds ago',
    node_id:
      'node_3msckd1zua8ajy8a1jbsb88os4e8ngkzc3b5nx73aq5o4tmgfpoqa1cej1a7',
    node_ip: '[::ffff:94.130.238.161]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 184660801459430641089420554138444757,
    weight_formatted: '0.19% (\u04fe\u2009184,660.80)',
    weight_percent: 0.19100791396918157
  },
  {
    account:
      'nano_16u1uufyoig8777y6r8iqjtrw8sg8maqrm36zzcm95jmbd9i9aj5i8abr8u5',
    account_formatted: 'nano_16u1uuf...r8u5',
    alias: 'nano_16u1uuf...r8u5',
    is_known_account: false,
    last_telemetry_report: '31 seconds ago',
    node_id:
      'node_1xim7rtqk7nps48oo64tnxun4unt9qm5zpi8hu4scp4y9mmucpyr68q13rhx',
    node_ip: '[::ffff:139.162.199.142]:7075',
    node_maker: '0',
    node_uptime: '6 hours, 42 minutes',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 183741964217708570492176426409432781,
    weight_formatted: '0.19% (\u04fe\u2009183,741.96)',
    weight_percent: 0.19005749469540253
  },
  {
    account:
      'nano_3kc9wsf9y4y9r3k9yj1d5da53ytjepcf993bcto17xh1s691wyc6im9xaodr',
    account_formatted: 'nano_3kc9wsf...aodr',
    alias: 'nano_3kc9wsf...aodr',
    is_known_account: false,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 149975049906500000000000102000000000,
    weight_formatted: '0.16% (\u04fe\u2009149,975.05)',
    weight_percent: 0.15512995288476525
  },
  {
    account:
      'nano_3kc8wwut3u8g1kwa6x4drkzu346bdbyqzsn14tmabrpeobn8igksfqkzajbb',
    account_formatted: 'AnarkNode',
    alias: 'AnarkNode',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 144770941969415292296003701394019879,
    weight_formatted: '0.15% (\u04fe\u2009144,770.94)',
    weight_percent: 0.14974697071812826
  },
  {
    account:
      'nano_14mp1ua4oi45rxosft3d8qe4g6a1u1srma59jg85ax6s8zuwhi4yzgdnqhz3',
    account_formatted: 'NanoSG (Node - Deckard Cain) \ud83c\uddf8\ud83c\uddec',
    alias: 'NanoSG (Node - Deckard Cain) \ud83c\uddf8\ud83c\uddec',
    is_known_account: true,
    last_telemetry_report: '47 seconds ago',
    node_id:
      'node_3cxu7exgc6kfcdikubsponqoie3uu91ewtbakb6jptdrq9w4xz76fb3tfxrt',
    node_ip: '[::ffff:27.125.159.130]:7075',
    node_maker: '0',
    node_uptime: '3 weeks, 5 days',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 136757293417298171349624930033678517,
    weight_formatted: '0.14% (\u04fe\u2009136,757.29)',
    weight_percent: 0.14145787914522978
  },
  {
    account:
      'nano_1k5fqb5q6t44tsd13ziny66w6mxbya6x397g7tkz7hnkcpppofuojzs7qmik',
    account_formatted: 'nano_1k5fqb5...qmik',
    alias: 'nano_1k5fqb5...qmik',
    is_known_account: false,
    last_telemetry_report: '50 seconds ago',
    node_id:
      'node_136je5ezn6xqa1g8e44e5ffyip47kr7z3kjtftnn9byb7qsykz6x8jgnrrux',
    node_ip: '[::ffff:89.58.8.22]:7075',
    node_maker: '0',
    node_uptime: '9 months, 1 weeks',
    node_version: '25.1.0',
    show_weight: true,
    votingweight: 134850575048708037899730669200010113,
    weight_formatted: '0.14% (\u04fe\u2009134,850.58)',
    weight_percent: 0.13948562355426108
  },
  {
    account:
      'nano_1niabkx3gbxit5j5yyqcpas71dkffggbr6zpd3heui8rpoocm5xqbdwq44oh',
    account_formatted: 'KuCoin',
    alias: 'KuCoin',
    is_known_account: true,
    last_telemetry_report: '49 seconds ago',
    node_id:
      'node_31ix95taoixuy89nxtew73y98xt6ymphac5wgy746k6pdwq7xnyzj97njoag',
    node_ip: '[::ffff:95.216.114.224]:7075',
    node_maker: '0',
    node_uptime: '1 days, 20 hours',
    node_version: '27.0.100',
    show_weight: true,
    votingweight: 131010957935349341114843312334054719,
    weight_formatted: '0.14% (\u04fe\u2009131,010.96)',
    weight_percent: 0.1355140321311396
  },
  {
    account:
      'nano_3f1owhubic8wa8rfmj5x6w9ore9btbtju5eampghs3y9ere6q6u96jraoo5s',
    account_formatted: 'Flowhub',
    alias: 'Flowhub',
    is_known_account: true,
    last_telemetry_report: '3 seconds ago',
    node_id:
      'node_1nxz4df93hyogss794ytpxw8mfmbg87gwnaog7b6kr4occoixeb1ffuc6fzu',
    node_ip: '[::ffff:95.216.37.186]:7075',
    node_maker: '0',
    node_uptime: '2 months, 0 weeks',
    node_version: '27.0.99',
    show_weight: true,
    votingweight: 128842453667039415097926747623752865,
    weight_formatted: '0.13% (\u04fe\u2009128,842.45)',
    weight_percent: 0.1332709926043446
  },
  {
    account:
      'nano_3g6ue89jij6bxaz3hodne1c7gzgw77xawpdz4p38siu145u3u17c46or4jeu',
    account_formatted: 'Madora',
    alias: 'Madora',
    is_known_account: true,
    last_telemetry_report: '9 seconds ago',
    node_id:
      'node_38d87w3o99k5npubbypz1ywzxwbqb93eeenrn6q78yq6yfs6wnz36kui3re5',
    node_ip: '[::ffff:159.65.161.206]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 124052911700486960624508197403936443,
    weight_formatted: '0.13% (\u04fe\u2009124,052.91)',
    weight_percent: 0.1283168257607656
  },
  {
    account:
      'nano_1sw898hgeexgrsq8x16wdadwdrs3obn418z6x98parb5tymz879mu89qndju',
    account_formatted: 'VINO Community Rep',
    alias: 'VINO Community Rep',
    is_known_account: true,
    last_telemetry_report: '25 seconds ago',
    node_id:
      'node_1w4pqu4wuoqndq8g6u15io33rcdw61ywmkjmquec7f1ed8yj3e5qha9tfakm',
    node_ip: '[::ffff:143.198.59.250]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 122870342194251701383229945278707156,
    weight_formatted: '0.13% (\u04fe\u2009122,870.34)',
    weight_percent: 0.127093609286428
  },
  {
    account:
      'nano_3fg3hi6b4ptj5y5ss4a3cwarbzahaeazzs6mjf18t1cqm3pmetgtgrtafafp',
    account_formatted: 'nano_3fg3hi6...fafp',
    alias: 'nano_3fg3hi6...fafp',
    is_known_account: false,
    last_telemetry_report: '40 seconds ago',
    node_id:
      'node_371ow6e41e3efsms3ondeibr7nsxuauzmh4ehctrknrfapwx6btk369d8636',
    node_ip: '[::ffff:144.76.17.146]:7075',
    node_maker: '0',
    node_uptime: '19 hours, 38 minutes',
    node_version: '27.0.100',
    show_weight: true,
    votingweight: 121766786123567890000000000000000000,
    weight_formatted: '0.13% (\u04fe\u2009121,766.79)',
    weight_percent: 0.1259521220766714
  },
  {
    account:
      'nano_1m1afmq54gum53md3dm3o9arctwn8buwqk8kynxszh468qmm3kn7sawmgihz',
    account_formatted: 'UrbaNano [NL]',
    alias: 'UrbaNano [NL]',
    is_known_account: true,
    last_telemetry_report: '13 seconds ago',
    node_id:
      'node_3igieossp7dws76rz6mhgs1wgyst6hu1io593b8gf149bj4ox7s4jfgzzog3',
    node_ip: '[::ffff:45.137.89.184]:7075',
    node_maker: '0',
    node_uptime: '2 months, 0 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 103225000240751946758603656049982240,
    weight_formatted: '0.11% (\u04fe\u2009103,225.00)',
    weight_percent: 0.10677302280519999
  },
  {
    account:
      'nano_3o5oeefdnrha7x7styp1tnmefen7fnrooy4jgnfb1otws54yf7uqfuxmojoy',
    account_formatted: 'scoin.cool',
    alias: 'scoin.cool',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 86979081037287193445740226579537669,
    weight_formatted: '0.09% (\u04fe\u200986,979.08)',
    weight_percent: 0.0899687031388662
  },
  {
    account:
      'nano_3bsnis6ha3m9cepuaywskn9jykdggxcu8mxsp76yc3oinrt3n7gi77xiggtm',
    account_formatted: 'CryptoVision Nano Node',
    alias: 'CryptoVision Nano Node',
    is_known_account: true,
    last_telemetry_report: '2 seconds ago',
    node_id:
      'node_16hemg7fpbhpfsu63587izjkmt5gmpd5bzky4f717bt8fh89wcpszspeoyeg',
    node_ip: '[::ffff:188.40.212.66]:7075',
    node_maker: '0',
    node_uptime: '2 months, 1 weeks',
    node_version: '26.1.0',
    show_weight: true,
    votingweight: 82050691740204356276155936649442293,
    weight_formatted: '0.08% (\u04fe\u200982,050.69)',
    weight_percent: 0.08487091654082282
  },
  {
    account:
      'nano_16k5pimotz9zehjk795wa4qcx54mtusk8hc5mdsjgy57gnhbj3hj6zaib4ic',
    account_formatted: 'NanoWallet Bot',
    alias: 'NanoWallet Bot',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 41190447909133341012030690413136570,
    weight_formatted: '0.04% (\u04fe\u200941,190.45)',
    weight_percent: 0.04260623515331327
  },
  {
    account:
      'nano_1ac8snzjkwniynpe3nsshf34iwe46rpjo3tjqtdntktjhqsp5sdndqworgwe',
    account_formatted: 'nano_1ac8snz...rgwe',
    alias: 'nano_1ac8snz...rgwe',
    is_known_account: false,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 23875428373881838795162926874459812,
    weight_formatted: '0.02% (\u04fe\u200923,875.43)',
    weight_percent: 0.02469606831971691
  },
  {
    account:
      'nano_1tipnanogsu7q59pnie3qfc4w378wm43fg4ksqc8wmnnfnizrq1xrpt5geho',
    account_formatted: 'TipNano \u26f2',
    alias: 'TipNano \u26f2',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 18509512964014503103316025607175850,
    weight_formatted: '0.02% (\u04fe\u200918,509.51)',
    weight_percent: 0.019145717076391348
  },
  {
    account:
      'nano_3grayknbwtrjdsbdgsjbx4fzds7eufjqghzu6on57aqxte7fhhh14gxbdz61',
    account_formatted: 'Gray',
    alias: 'Gray',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 16090036202503664796259275226695017,
    weight_formatted: '0.02% (\u04fe\u200916,090.04)',
    weight_percent: 0.016643078695854335
  },
  {
    account:
      'nano_1xnopay1bfmyx5eit8ut4gg1j488kt8bjukijerbn37jh3wdm81y6mxjg8qj',
    account_formatted: 'XNOPay.com - 1',
    alias: 'XNOPay.com - 1',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 10363082961299970000152250878893266,
    weight_formatted: '0.01% (\u04fe\u200910,363.08)',
    weight_percent: 0.010719280123791461
  },
  {
    account:
      'nano_1bko7zpcow7w6e11az8tnxdnyszgkt61miwuo9i9pom3czdzxqknpiuc7tdb',
    account_formatted: 'jserv \ud83c\uddf9\ud83c\uddfc\ud83d\udc27',
    alias: 'jserv \ud83c\uddf9\ud83c\uddfc\ud83d\udc27',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 8776504166354548232836821639096449,
    weight_formatted: '0.01% (\u04fe\u20098,776.50)',
    weight_percent: 0.009078167859709569
  },
  {
    account:
      'nano_3ngt59dc7hbsjd1dum1bw9wbb87mbtuj4qkwcruididsb5rhgdt9zb4w7kb9',
    account_formatted: 'Wirex',
    alias: 'Wirex',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 4723079263915340903605803889370898,
    weight_formatted: '0.00% (\u04fe\u20094,723.08)',
    weight_percent: 0.004885419702403735
  },
  {
    account:
      'nano_3robocazheuxet5ju1gtif4cefkhfbupkykc97hfanof859ie9ajpdfhy3ez',
    account_formatted: 'FynCom',
    alias: 'FynCom',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 2529799754312298284728935485088605,
    weight_formatted: '0.00% (\u04fe\u20092,529.80)',
    weight_percent: 0.002616753366236744
  },
  {
    account:
      'nano_15gfawgrsc6tkkm5p1gy749tkibchu73st1ojs3knz6rd3ejfcgt7rj5cmx9',
    account_formatted: 'VF Validierung \ud83c\udde9\ud83c\uddea',
    alias: 'VF Validierung \ud83c\udde9\ud83c\uddea',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 2491734938301306779630550955789246,
    weight_formatted: '0.00% (\u04fe\u20092,491.73)',
    weight_percent: 0.002577380196379266
  },
  {
    account:
      'nano_3hn3r6bnnmcy39gu6fgtisgnqh384gmt5mnh71a5xo4cb1d38ps16p8sg5c3',
    account_formatted: 'Twister32',
    alias: 'Twister32',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: true,
    votingweight: 1181004067153121488381699586281683,
    weight_formatted: '0.00% (\u04fe\u20091,181.00)',
    weight_percent: 0.0012215972283949844
  },
  {
    account:
      'nano_3ewhro1uzpbgjztkc5t3yawcqw7mz4acp519m4b7qw14t58t67gndaxswxad',
    account_formatted: 'PagCripto.com.br Representative',
    alias: 'PagCripto.com.br Representative',
    is_known_account: true,
    last_telemetry_report: 'Unknown',
    node_id: null,
    node_ip: '',
    node_maker: null,
    node_uptime: 'Unknown',
    node_version: 'Unknown',
    show_weight: false,
    votingweight: 451646680796471116756785161623435,
    weight_formatted: '0',
    weight_percent: 0
  }
];

import {
  ICityGeo,
  IPrincipalGeoInfo,
  IRepData,
  IRepOnline
} from '@/types/index';

// Updated mergeRepsData function with proper types
function mergeRepsData(
  geoInfo: IPrincipalGeoInfo[],
  onlineData: IRepOnline[],
  citiesGeo: ICityGeo[]
): IRepData[] {
  const geoMap = new Map<string, { latitude: number; longitude: number }>(
    geoInfo.map((item) => [
      item.rep_address,
      { latitude: item.latitude, longitude: item.longitude }
    ])
  );

  let availableCities = [...citiesGeo];

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

// Usage remains the same, but now with type safety
const mergedData = mergeRepsData(principalsGeoInfo, repsOnline, topCitiesGeo);

// TypeScript will now infer the correct types for these filters
const totalAccounts = mergedData.length;
const accountsWithOriginalGeo = mergedData.filter(
  (rep) => 'latitude' in rep && !rep.assigned_city
).length;
const accountsWithAssignedGeo = mergedData.filter(
  (rep) => rep.assigned_city
).length;
const accountsWithoutGeo = mergedData.filter(
  (rep) => !('latitude' in rep)
).length;

console.log(`Online Reps number:`, repsOnline.length);
console.log(`Total accounts: ${totalAccounts}`);
console.log(`Accounts with original geo data: ${accountsWithOriginalGeo}`);
console.log(`Accounts with assigned geo data: ${accountsWithAssignedGeo}`);
console.log(`Accounts without geo data: ${accountsWithoutGeo}`);
