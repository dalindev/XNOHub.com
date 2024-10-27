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
// {
//   rep_address:
//     'nano_1ba7uuq9kt68jzzw51a5kt577xtzaq37cnj8otqbhhnkgjyhwu91wtsjacez',
//   latitude: 51.2192,
//   longitude: 4.3917,
//   alias: '『Node Geass』'
// },

const knownBananoAccountNamesMap = {
  ban_1burnbabyburndiscoinferno111111111111111111111111111aj49sw3w: 'Burn',
  ban_3uo1cafr4p5qkyjn57jjuqbmsddds86j6g6tzi4q16ek3xfjumprpb51pmuz:
    'Volcano Burn Pool',
  ban_1uo1cano1bot1a1pha1616161616161616161616161616161616p3s5tifp:
    'Volcano Burn 1',
  ban_1ban116su1fur16uo1cano16su1fur16161616161616161616166a1sf7xw:
    'Volcano Burn 2',
  ban_1111111111111111111111111111111111111111111111111111hifc8npp: 'Genesis',
  ban_1mayorbance1ot1sburnedbananas11111111111111111111111zsqrpxj1:
    'Mayor Bancelot Burn',
  ban_1fundm3d7zritekc8bdt4oto5ut8begz6jnnt7n3tdxzjq3t46aiuse1h7gj:
    'Distribution Fund: 1',
  ban_3fundbxxzrzfy3k9jbnnq8d44uhu5sug9rkh135bzqncyy9dw91dcrjg67wf:
    'Distribution Fund: 3',
  ban_1acaih1rhhczkfayd3iadpjroyfbbrzm1jrkx77qfep7fnuzky7mmwzx4544:
    'Distribution Fund: Acai',
  ban_1app1es6zce5943ydasp5r5ma77cdcqt6be8qz7f88woayuqstzrjjmob4eb:
    'Distribution Fund: Apple',
  ban_3carobzdy3ah8pq1xzn38jkc46ozuu8qfx7eqzr8nyiy5yefwbaua6rkh3of:
    'Distribution Fund: Carob',
  ban_3gojim9wh3t9w5aa8nhjbmkue8mes9frmrhy6wpqb34ikajw8h39hnbbap31:
    'Distribution Fund: Goji',
  ban_1grapemjtr5n684bu1x38th57x3te8qt6xpsyusjyi4s3u1zdoh8s1czfjz4:
    'Distribution Fund: Grape',
  ban_3kiwizqifxokn47pp6fh5jmytoaiaeynjhx4u5r6ug13apx3345enf4mr1ep:
    'Distribution Fund: Kiwi',
  ban_1ycheefobbddbde1p7874ky4ifiwebfuabkyqptunwwk84z3rgzktbqeo9fk:
    'Distribution Fund: Lychee',
  ban_1mangozo4tnfq97hdtu8z9rdjsqnyo33i7o9aohoxsfbpx8kgwhrfu1rggj8:
    'Distribution Fund: Mango',
  ban_1me1onk3a11nw3kou14776fuyxtnmoatuqmpeioybffqx6okd53mo1iqmrym:
    'Distribution Fund: Melon',
  ban_1pearw95xajkzq1nmo6cixo1ugijk6gpm1ifwyegz6un4mt71qb1iw3fhmj4:
    'Distribution Fund: Pear',
  ban_1ce1ery6hqwyqqyh15m4atcoaywd8rycyapjjooqeg7gi149kmatjbb3wiwx:
    'Celery (Dev Salary)',
  ban_1zookix8zpo13go1xrbwcmodjfsr8xw5e18smbmz8mh4orkmd33t8zmescpo:
    'Allowances',
  ban_3bonus9fwjnwjoyawbdbokze51iucgqwtdyk6e4kqdu39rw8nyzmew5ptxoj:
    'Contributor Bonus 3',
  ban_1bonusncatu5rsrctx1djmgrragfwpj4ujsk939utmtdwskhtiourh8997eh:
    'Contributor Bonus 1',
  ban_3cmfundg444o8ynqhqu638dfdh3jrmdykhqa7c9dkymejobb44ok9sdqxgc6:
    'Community Manager Fund',
  ban_1rec1ag4gcf6uxeno9xi8hipjh3ictt6wk1pu4hk5wh5836gfxnd75dfzmsm:
    'Weak Seed Team Reclaim',
  ban_1tw4ttt3ju6whgdgkhcujrznzy6u4smqok34m6zxffnk7cxprnw7sjaqhinu:
    'Twitter Giveaway',
  ban_1gxx3dbrprrh9ycf1p5wo9qgmftppg6z7688njum14aybjkaiweqmwpuu9py:
    'BananoLooker Donation',
  ban_3j8gwrkc7qgx11rrncdw8bzuuo4ojwp3xkawspefm3sbac3s5i6f48dgewfd:
    'BANANO HUB Donation',
  ban_1gbtqa74cexnsm3fpaihi9mo6bo7fha9e5w5go5jphaoqb44ddft36i6utxp:
    'Freerice 6.9 tip',
  ban_1ricex9kie3if1qros9s84joa6hnqd97nqc9fo58ca4ro3b1hnpyujjixoyt:
    'Freerice Donation',
  ban_1xhertod5q3w8o5zuu893epgnyb3f8oobwy81kozs3pyhw3hbmsboqiodmfr:
    'Nanners Donation',
  ban_3r7xbz8u5wj4wgkhmojzq6mmiq7ekawtarnfgwsneeck8ktn6zy58ax3ejkn:
    'F@H Points-to-Banano Calculator Donation',
  ban_3huffb6oj7uppkxu6su9fii943w61gf4cmyzc9tex6izrf6xqaopwdiiib9b:
    'Crypto For The Homeless Donation',
  ban_1gscd7w9bke8ex8hbtyspw5eqamjpdn8xop593w9uhuqmoumk4k7ucht8gs3:
    'TNV Donation',
  ban_3greenxg9oxkaei556wrxwzwdxie4ehmzhmi7fyztofhantxjysntceq5sx5:
    'BananoForest Organization 1',
  ban_3green9hp4hg8ejbpiq5fykktaz3scjoop9nzinq8m8kxu1xi6fi5ds3gwm8:
    'BananoForest Organization 2',
  ban_3greengegg8of5dqjqfzqzkjkkygtaptn39uyja4xncd13eqftcpw4r4xmfb:
    'BananoForest Organization 3',
  ban_3greenp7kzetigfjcfgbis1ad63m4hyyyit9usd1g4byuxg81g79fc8aiwtr:
    'BananoForest Organization 4',
  ban_1o7ija3mdbmpzt8qfnck583tn99fiupgbyzxtbk5h4g6j57a7rawge6yzxqp:
    'Prussia donation',
  ban_3banobotojqz8pkm1uectwb8baqjkfhq38e6fbwdrp51qjnwemepzc4ytowy:
    'Banoboto donation',
  ban_36ik1fxkiihc7rzeb7zg7ttkirynf5fsonx3jcdqarxre9qf5u8qqoo53jt5:
    'i can haz nano donation',
  ban_1upgmfaoycc17cc88u68xeee3qe7ct6remkq3g3t9rqf9nb81ygb6h3xn13i:
    'CSquared donation',
  ban_1dpe11rjii8r4k448gbgfpbg18p8444edayaq4to3hsquha4qhy65cjbtk8b:
    'Legacy Creeper Donation',
  ban_3rs5ne56m63pa77zrgcaj9s9g3g4iusa5w5tcoa1ehpotubarpdwrouu5wjc:
    'BananoGPT deposit',
  ban_3fzpw7pb9xt64qhwi47oa47x9zj713fkshntdk5y7khmn54n18szb7ymybdt:
    'r/banano Test Giveaway Fund (March 2022)',
  ban_3rccbanjyesftqfj3zc5mqn5nd3ai5hqrw4twsz45rk8hq3xu93c4zue4s1f:
    'r/cryptocurrency Giveaway Fund (March 2022)',
  ban_3boost5r4bosii4c3ad6yubf5npmkgm5rb7kecyzmnu337p9bta8kgikb1a4:
    'Booster 2021',
  ban_3he11oi45zcfe3i65wogyikf1569mu1jcf9kj4o7jojpebmmkbhrpf38qrqx:
    'WeChat/Reddit giveaways',
  ban_3matchhw9ksc9xfqdhedfn34n8kw6woxr36gnyoop7jc14j7unw9uknhjk8h:
    'Monkey Match 1',
  ban_3jan54btk13gsutxw6brj1i7e31zip4zj43u4jde7qad3hchx8u1gc6jwxd9:
    'Monkey Match Jan',
  ban_1mar4j94wjqnkourdfw1jwqzsn4a9p6fqfjzrjsyjiym4zixm1ek3bkqk1r7:
    'Monkey Match March',
  ban_1no4g7k51giqnhscpqm153hamoe956958yrr79sggzgy8wriiemx7owh89ka:
    'Monkey Match Nov1',
  ban_1no3g6ho99zjfgujgkyqmmedi4k9u46yxwnf8bchxs4sof1yg334u8yrt4h5:
    'Monkey Match Nov2',
  ban_1no1g31yq9ne9b1uhzge7co6af34qot37ydifagy13cb53ki7dor1yeceg8f:
    'Monkey Match Nov3',
  ban_1boostj3sprinc8n3533zozh7mxg495ct559zawj4f3pqytwp8rw8m18kqte:
    'Booster 2021 rewards',
  ban_1boostrgirszkussnf48y5mnxqqysqxaxp6bpeni8zyfzgyghgsshnubp16c:
    'Booster2 Rewards',
  ban_1boostrke1fzbpxpoxsjfxybye388n4z18pj51ujtocpi9scsnzb1jfx3h9q:
    'Booster3 Rewards',
  ban_1bonusd89osnxs6yeyetshho11pfy5mcqn61q3yyu74k7anidsqansgmxf43:
    'Booster2 Bonus',
  ban_1mi11iitod8i9nm3td8waxfra5hanffcohn8d9e6qsfb78ynb6sr9r3k8f8s:
    'Official Reddit Giveaway',
  ban_1tixkw3trrrbsrpcsmeendfpjy9rssqu7b5naqmixpmrgcaf8nfakupxi9a8:
    'Monkey Web Coding Event Rewards',
  ban_1rp1aceaawpub5zyztzs4tn7gcugm5bc3o6oga16bb18bquqm1bjnoomynze:
    'r/place Contribution Rewards - 2022',
  ban_1dr4qxwjkh4ndua9akjsza46513exot9po57ydy77wobzekhypi1uu4a34tm:
    'Banano NBA Pickem - 2022',
  ban_3f51sihxjn7mzmcpk1548bjofnn834fywtdqnoibcxapiahmo3s6thg35rzc:
    'Banano Monkeybowl 57 prizes',
  ban_3pickempqc4jzaz4b1umjeo544oa6u7i9znhrniiw5p3nioc8f7dzcxchwzs:
    'Banano NFL and NHL Pickem - 2022',
  ban_1cmairy7iqd1ank9b5dturk6uuc7yqkyukgjc9qw974fbmg1ggiykiewswo6:
    'Santa, Halloween and cryptomonKeys connect',
  ban_3191wobykrnzck9oaepxxkkyfkszxmmkaxeftahxpnpez9af5w3sti9dn8wa:
    'Telegram Events',
  ban_11awizjp9r1sfoyy6ruurfuk3wzksu9uug53x7waxuar7jxp71epfxmsqy69:
    'Banano NFL and NHL Pickems - 2023-2024',
  ban_3boostedcoc7i68wjom11xriyrbo37rm6j7rjbwdimfqfi6gcbnfuf9gsqop:
    'Boosted AF Hackathon 2024',
  ban_1anusneesoxyd6ijr6zeman85nnt3fsjiqp18qk1i6npbeknun7cbe3rkdxq:
    '6th Banniversary Birthday Bonus',
  ban_16c58nu7kmays7bmfaq7u4zpf8oady9ydgwkb6pcxegyx3n1nxygix5r4hpi: 'Altilly',
  ban_1gooj14qko1u6md87aga9c53nf4iphyt1ua7x3kq1wnkdh49u5mndqygbr1q:
    'Ataix Hot Wallet',
  ban_36e1qnwo5faf7uapp6gbzzmzt3bgz6a93txuukmr45pmodcy4q7pwaray1u9:
    'Atomars Hot Wallet',
  ban_3iejwmk1n3fqdntwcgudhmddo9bpwa8jzx6g361iq6rzbsrzonekmdus9yj5:
    'Bananoroyale Hot Wallet',
  ban_1banexkcfuieufzxksfrxqf6xy8e57ry1zdtq9yn7jntzhpwu4pg4hajojmq:
    'Banano[.]Exchange exchange',
  ban_3my8jqfurgii17r1rbj5saw34xdm3digq4iwgy7pak8ewa4568d75qs7ht7h:
    'Banano[.]Exchange registration',
  ban_1swapdwa9wwaxh38htsrupc6zfrcojtqz4kd6jssrat6cec1ggfjnnm6hypz:
    'Banano[.]Exchange swap',
  ban_1banfarm4mz9xno94qj64xbkodiawck6s8trxuamr8tga9s5jnx58rc67qzf:
    'ban[.]farm',
  ban_1t8hyu6taczfq3gmdqkwcxc6z4pt3sfwg5m7op488hxjmne55r16tebaoztb:
    'ban[.]farm old',
  ban_1gtkt1ekpazojhxwnym9ur61cz4w7n8yez5yq81id6cb8k63bhwx7axhtsxx:
    'Bitmesh Hot Wallet',
  ban_3a1dokzzuc334kpsedakxz5hw4cauexjori8spcf7pninujry43dxkbam4o6: 'BNswap',
  ban_3wwd51yoxeafubpn84gy7tje7yw6ccqcach9m4yfn46sf15itnysap9dd1xc:
    'Citex Hot Wallet',
  ban_1nrcne47secz1hnm9syepdoob7t1r4xrhdzih3zohb1c3z178edd7b6ygc4x:
    'CoinEx Deposits OLD',
  ban_1w4unoqatatkpsztgdg4zfa4ucqsijsziapqqb7j53wm6e3es8zwgeooywi6:
    'Coinex Deposits NEW',
  ban_1fxc48dynhbjb69uuyue4bsfuymxick8js14synwznduy61g6i9esdeasmem:
    'GJ Hot Wallet',
  ban_3jdj931n6yo6gncyqmcdi6xccfmbbno73f91ma43nmnumcxft1rsqysexek4:
    'HotBit Hot Wallet',
  ban_36eco9trqigca9q4qujeskxmkj5q1kg5bjbh4y8f5n4z6i7n7dwjge1wyw8s: 'JITSwap',
  ban_1oaocnrcaystcdtaae6woh381wftyg4k7bespu19m5w18ze699refhyzu6bo:
    'banano[.]nano[.]trade',
  ban_1waxp1c6c3jnonceb7io7xrmqwuc8ab3fh3wfytoruze97wxkipzaadh33nx:
    'wax[.]banano[.]trade',
  ban_31dhbgirwzd3ce7naor6o94woefws9hpxu4q8uxm1bz98w89zqpfks5rk3ad:
    'Mercatox Cold Wallet',
  ban_3k76rawffjm79qedoc54nhk3edkq5makoyp73b1t6q6j9yjeq633q1xck9g8:
    'Mercatox Hot Wallet',
  ban_1ddaz5y8jk47hkicpi1kc38kg359r74y38gmmq6moiki11gx1g4a9qb4r7c6:
    'moon[.]banano[.]trade',
  ban_3kuyumcu9yj65b51kqu9cbohio9oeysymxt51fxkrg5idw8qaxqpk4yq6nzy:
    'nano[.]trade airdrop',
  ban_3zz761jb16zowd148jb6xpxszgpnk3fw35wnhfatuzah89uruginfdrw8sk7:
    'Nanswap Sending Account',
  ban_3bsco1dfwmwpnnjjqyqb9f7f83gtxsrmgdzdjdz58u6dhga5ajsgtsdz1g8h:
    'wBAN BSC Cold Wallet',
  ban_1wbanktxc5mtnydsjq6doy81wsnn7fw1z7yzw4zzieb6dfkihjtbwzgrxt9i:
    'wBAN BSC Hot Wallet',
  ban_1benisborxg1xdyiszp561t8dtu193cmirdue3gqanwubj8gm5ak87c5j8e7:
    'wBAN BSC Wrap Wallet',
  ban_1po1yco1cnoyymrm3xnf7h9iaway1bg5kqxq3cfb3za98gq73tfmjm4mp11n:
    'wBAN Polygon Cold Wallet',
  ban_3po1yhotz68w6mogy6budr7g8y7gw5wjqhbgc5gt549emeoof9npf315xmn4:
    'wBAN Polygon Hot Wallet',
  ban_3po1ywrp9m967z9xpd9cwwfdg1gteuk4n7dcyoatkgpjgne5yx459wyoyxzj:
    'wBAN Polygon Wrap Wallet',
  ban_3ftmco1d3sogpnq9j8gsa7t95xugtzj116hkudxj1spkw86476pzicua61ek:
    'wBAN Fantom Cold Wallet',
  ban_3ftmhot3nssj1ae3gt4o4ksa6p1wamub3jaet4odjt67wp9wy9ahn83umw81:
    'wBAN Fantom Hot Wallet',
  ban_3ftmwrap5qeirm53wndr6811tbnnraho587awkxn1xgrwfgry97cb4bouiwh:
    'wBAN Fantom Wrap Wallet',
  ban_3ethco1d34b1mmerybpw6pdgi3zt6p7ieb4aqcmbfn8i7af5w43d8ag8s7hk:
    'wBAN Ethereum Cold Wallet',
  ban_3ethhot3otmrcizy8kxkxbfmb3qjswatr4pnixexpdy6u18e1mjgxteynmay:
    'wBAN Ethereum Hot Wallet',
  ban_3ethwrap7kzguicmh3birwszzyg5giw93o7zkrqj7sxbcw8z83ihd3k4hps9:
    'wBAN Ethereum Wrap Wallet',
  ban_3arbc1d3usn8not6ddbegexdi7qdabp4d1g3emcgtirign1c6akjc55bexko:
    'wBAN Arbitrum Cold Wallet',
  ban_1arbhot3nd1ocih46ocoa7xsaqn6u8qrfqaswe3ygg8xmzno5of1zq5sp3r6:
    'wBAN Arbitrum Hot Wallet',
  ban_1arbwrp3rk8us7m7nwox9xbqky59dmeez7k4k7hpettfcay357qx6615xx7w:
    'wBAN Arbitrum Wrap Wallet',
  ban_1wbanhr5jr179uw34793g96qihwmisd6bypp9ofy6yy77hchge96tqmwhq9a: 'wBAN Old',
  ban_3w6yatruhkxgu4bhx1d8zggpwafrq3z7xyrqchuw8h5xa9aqhnrj7mi79mtu:
    'Qbtc Hot Wallet',
  ban_3yafcjcq79cjfm4wio5db6drffmf61jh8cosoijmg3eppzmbxb4kej8t3dze:
    'qtrade Hot Wallet',
  ban_3x1o69xsppjb1d9owsn8x6uqr8a1ttpitsu3yya7iyimaboqhb9urb8x61y8:
    'Txbit Hot Wallet',
  ban_16bfuppfebtmgh1t8ktpk4eq4dyz5m1ztxesznagd916jzk8b87qity3habz:
    'Unnamed Hot Wallet',
  ban_1bujgzb69qr4owkcm3qu35mb843qtwnx4zf8q3myjw1dui7br5k87k84e54d:
    'ViteX Hot Wallet',
  ban_39cbuas38tfnoikkn38d15n94qokaciwx8mhh5ia4n5pqn4e3y9dw4x9jzic: 'ViteX New',
  ban_3hfe17gwpi75ducquep38dcrnits9ffw36dhebuj4ej1adzzsxuq3b3mjcxz:
    'ViteX BAN-001 Wallet',
  ban_3r8txi61ppg5ekw6aa5gsdsk3cj6jpxe3towd4jmxswr8pckgiqs9muneey5:
    'UnionChain',
  ban_1usdc1u6y9ixwx6f66xiezsza5eqsriwhwqzaopuf9musmsgm5pfjfkr7bpu:
    'usdc[.]banano[.]trade',
  ban_1usdt1pyw5edifbk4dezy7rkxocz78kte63ppo1o1kkfdknnc4zqcsb9zqkp:
    'usdt[.]banano[.]trade',
  ban_3bonoyw4qx6ngp5bcg4azyqqb49gunp8je1k898opk1fgp3qf8fbobgr8nbu: 'Bonobo',
  ban_1em9ej7jdcmuhwhwydwohb63xf5bjajzob5hp4x9fzzyhants5jckn684e3f:
    'CryptoFuse.net',
  ban_3xx98po6ws9hjsdmjqr3yhuhqzfhrigoz3xfazykq5acfeehfss81k4mekfk:
    'Nanswap Tipbot',
  ban_3defi9s34k5w63meqg3q9u7ibsx5ihtcctc1146rtjp1w1dw8a578wqno186:
    'Temporary wBAN Wallet',
  ban_14cng4wpbmu5qpmuonsna6zbycwisr7ui73afkgya1gqmiuywhmmes443a3d: 'MEXC',
  ban_3bdrip3ir5d9y3i1qi5z47pwcmd6jm39xzzzxnebrwfyoje63qa5dmnhm8f9:
    'Banano Drip',
  ban_1faucetjuiyuwnz94j4c7s393r95sk5ac7p5usthmxct816osgqh3qd1caet:
    'Banano Faucet',
  ban_3pp1antnfudas6ad44kwpad4jb376cihftskq9ne76hazosi654gjdohriai:
    'Banano Powerplant',
  ban_3runnerrxm74165sfmystpktzsyp7eurixwpk59tejnn8xamn8zog18abrda:
    'Banano Runner',
  ban_3uf1gx114fqm9ppiwp3sw1mywzzr9d8uwhrw9e85zpgdt48eopruqnqpdb68:
    'banano-faucet[.]herokuapp[.]com',
  ban_1kq1zmwjz1fh8mauqhb3u88j7rizcdjic851f7kgmnoishnmcm7m15xkxr1i:
    'banano.vegas',
  ban_3craftbqpyfbr4gdjhdwnrsd4zwr73wg6xojnr61nres8mnbz5x1o6563qxc:
    'BananoCraft',
  ban_1j3rqseffoin7x5z5y1ehaqe1n7todza41kdf4oyga8phps3ea31u39ruchu:
    'Banbucket.ninja',
  ban_16tduo1cu9ydp8ris3o5w4rm96myqics5o8tjw8s13ja8owba6xfpwc8399r:
    'Banroulettecom Hot Wallet',
  ban_1b1ack1188caohzjdj65uarnk4kobzrnr3q3oc3bew5rfkyqxzu81zhjgp1e:
    'Black Monkey',
  ban_3temho9bnim1acqzwwa673yeggeudzo6y857y4t38pmu6jx79amtku8szp3s:
    'Black Monkey Rount 1',
  ban_1boompow14irck1yauquqypt7afqrh8b6bbu5r93pc6hgbqs7z6o99frcuym: 'BoomPoW',
  ban_1crane864e1cn1g3p9mrduf49hp86gfgfosp8rib43smxxuqp3phq1yiu58k:
    'Crane Faucet',
  ban_3disc5557sb9ri99h7czmn6ms5kcfsafnsxekarg1pp9f3a1ik4ndjcb9cod:
    'Discord Beta Rewards',
  ban_1treatf1gc4acpgjqzg9jxthwqnew7gef5wf7mru4ffyeb9ayj61rejzs5st:
    'Discord Halloween',
  ban_1santayq7qgtoar9s9kx9ur5jw6ustty741bxnidanf8miuakju7kqb8imwo:
    'Discord Santa',
  ban_3dnbrpg7abg7fuhryp3jq5r56ka4aijjen6ysxushujq9r69f31ip1dbx3qc:
    'Dungeons and Banano',
  ban_3346kkobb11qqpo17imgiybmwrgibr7yi34mwn5j6uywyke8f7fnfp94uyps:
    'faucet[.]prussia[.]dev',
  ban_3fo1d1ng6mfqumfoojqby13nahaugqbe5n6n3trof4q8kg5amo9mribg4muo: 'Folding',
  ban_1rp3ke75c8a3t5mkzekibo8w4mxzydrie8xzwqmkajfk9ww76f7wzbhd5bmt:
    'getbanano[.]cc',
  ban_1jung1eb3uomk1gsx7w6w7toqrikxm5pgn5wbsg5fpy96ckpdf6wmiuuzpca: 'JungleTV',
  ban_1jtprixunfus5mozkzj5gtfm79b54p3pwnje8snh9ugu998cfk13qceepwn5:
    'JungleTV Prize Faucet',
  ban_1rainrjfauss66rbormm3td5gucnnza41w78qepdmzy15dprgb6qrp6x516h:
    'JungleTV Rain',
  ban_1skiph85moxba9eqzpxejazxcaqfddq8xwsdgjn7yy4t1ano81oncieo6bib:
    'JungleTV Skip',
  ban_3kucodzfu56iiqxa5krw4wk1hqgw15ifzqriiouyp66x4nkaqup4tf53hihc:
    'KuCoin IT AMA',
  ban_3faucb1o9ifundznqw6xn1xkybztz4zfbn4fw95ujfy48ds1ebayzycfsspk:
    'Meme Faucet',
  ban_1monkeyt1x77a1rp9bwtthajb8odapbmnzpyt8357ac8a1bcron34i3r9y66:
    'MonkeyTalks',
  ban_1nice4sy9fgcb8qxbx7nkj9ajc79aapqnayrfk4gow184mgnfm49ncstg36w:
    'NiceBanano',
  ban_1mine1fnjzz84gwapyqhfw1d115zst859pf1u5rzge8hehzjg9ztchokmghb:
    'PowerPlant Old',
  ban_3j67xu1yuhfbezm7myw7bhzekj1mdzjkhhtctrqz5d9sanar8wt6hkgexzwn: 'Volcano',
  ban_1wa1ker54qq93emzpxqkfo5cjfh88qhhx18r4yi3xj6jhbb367ukgkh3d3gw:
    'Walker Cold',
  ban_3hotwkr9xuk8c9eixqafn8jf8oxzwagc8rtrgmuf973s5c96hp4g9ix3jw9c:
    'Walker Hot',
  ban_3eeq61ea33jdds5x37otx51esi8wsnxxjc8spjajyq7pj8h3nodkd19pride:
    'Pronoun Faucet',
  ban_1questzx4ym4ncmswhz3r4upwrxosh1hnic8ry8sbh694r48ajq95d1ckpay:
    'BananoBrowserQuest',
  ban_3sinkoff1yj9z5fougwao1gbjtsmb98u1j5p9kcrndqcc4irdxgzsjbem96e:
    'Banano Forest Faucet',
  ban_3tn9xt9sxbyw9injikki3yis5fbn6m47x37gco5cw6e6x6z7z4639cdgzke6:
    'Perry’s Banano Faucet',
  ban_1sexmes51h4udqk58dt3rbbpkssbircc7giryewd59q3t5fmfe9crbewjk5y:
    'Nord Banano Faucet',
  ban_3x8hzeb8spb6e36y7yjgo6esmeahgphq1mhp545ofouuu5enrne5nzwkdasb:
    'BauCorp Faucet',
  ban_39665maxw96iifne3izma1icdmomxy3o5z35hqzh9s13xw7si4opp5xxyg8g:
    "BananoTime!'s Banano Faucet",
  ban_3byzbsf7tfcbwopqfqd4tw63u78ydnk8hbrqz5u5fh9ywptpwnonfb4bjzi6:
    "K3i's Free Banano Faucet",
  ban_3faubo4bfzexkbodi67c74ut1a6it64chofgobbag87yfmy1x457jbsdccd4:
    'Bonobo Banano Faucet',
  ban_1gori11a7fz3tee6aydqxcehttzbuk93pjsctanfkgqmesa3dmo1cyw89xex:
    'Gorilla Nation',
  ban_33umod1td1x1szyjxj1a4c66j8s5escrii6ptnykz9axcsce93dqguwgwf78:
    'Try Banano!',
  ban_1barre1777qqdcg86788tk6ojy9jmkyb8ridreezbgkhr7btnoqcntejrxhf:
    "Barrel O' Bananos",
  ban_3swiperfi43zpunak44hw6rfbrruwfj1aobm6gwjcbd65sy6b3kjfeunkjxc:
    'Banano Swiper',
  ban_1rxpayorfy18zp5ospz89njtu3akhmyszot4b16z6yxy8tkeffqfkc6r84ok: 'BanRX',
  ban_1picturessx4aedsf59gm6qjkm6e3od4384m1qpfnotgsuoczbmhdb3e1zkh:
    'Banano.pictures',
  ban_19pe1ionxqi6eu1uxs1k3tqxd36rkdjue8f3b5t3sbzwy13jg6z5ujfm76d6:
    'Pelion Vault Faucet',
  ban_1bmcmeowun9kpehd3mx8zjnkda8kg6cdrhw9f6q41jq78sj3gym9zznkd1a6:
    'Black Monkey CryptomonKeys',
  ban_1monkecrqoqr6j6qzhtd9i8x49ujdnoqt7ramt9jmhd543icsrx5accoqtd5:
    'icanhaznano.monke42.link',
  ban_36seefx46pwcpyp6a8kukybamqioam6a7jef88s8esjpubyc8urccebjqgyj:
    'Nanswap Faucet',
  ban_3dybnpbt61kokfk6u8c1uuyyed4apy8349qwb5ip9m71kschfoeukeepfzr7:
    'Nanswap Referral Rewards',
  ban_3jyqzypmcn94dmyp7eb3k85sug1568xwehzx738o5jniaxaf1jpxdakjz96r:
    "CSquared's Faucet",
  ban_3jzi3modbcrfq7gds5nmudstw3kghndqb1k48twhqxds3ytyj4k7cf79q5ij:
    "Banoboto's Future Faucet",
  ban_3w91yp9ufjhpzt98xzddfmnoo8bm51ic3fp3mmx4mqbocqqde7dii1w8g4b6: 'GoBanano',
  ban_3sbqs38uoi9z34z5xeof5y4qjfc41n9rgr4hhhcu5zh5two9xrh4she1n8hs:
    'BananoTime! Giveaway Bot',
  ban_3k1x6ekfwh513bgkzimh53ud5ijq1k4fdcems7otzxomumzt69fh4rca7emy:
    'banfaucet.com',
  ban_1moondripyui11a5bode7q7gf4m9itad7m8gd3e9wu4qortrdpyj9d4ngw5z:
    'Moonano Faucet',
  ban_3ze6byhismfpj8jhuda6fq1a7nkniq7t5soet9k58y3egt3rco66j69fdksg:
    'faucets.app faucet',
  ban_1j6yu5w885996tgmmgsy7j61wuca65oc493j4xx6dn3eh5yrgaf94oseg4ui:
    "Vertical's Ban faucet",
  ban_3f1o95qeeg1zignw11ew5sfaxhzogsj3hzm377xjtmab8hwz535p6f96i5uu:
    'Yet Another BAN Faucet',
  ban_3y3ajo3fnmkczp8q9z6u88oajzazs9c3kpqwus5ponq9ktpfz5oztp8npuk6:
    'banano.design',
  ban_1akutedg199khq5ujhy8a9yaywhwigihja8baoqn6pwjpquiejrkcdpoo1yx:
    'Banano Tree NFT Faucet',
  ban_3mkys1ot6iqq7ebmawpdognrbgzkos6hs765c8xjrp7gnce7akbntouxr4m5:
    'MonkeySlots Cold',
  ban_1s1hot8adygxuj96f35dicnmd47cctazoaiia9uduk731nqt6fuenfax9ckt:
    'MonkeySlots Hot',
  ban_3fww7iebi9xq4a9j4mujxmqtfke1ad6g6ta13fijcxni4scasoyzdxauegj3:
    'MonkeySlots Warm',
  ban_1g3f1hjs4i54ztrkdftartpjc5fi9hi8pq7arggp6k16nbagiw63jnubondf:
    'MEXC Refund Bot',
  ban_3zew7e6kq45zukdgs7qf675ctn5wwa95igozbmhdsojza48mpsbwhjo5a3nu:
    'thefreebananofaucet.com',
  ban_1ncto1yztp7xu98othx6t5qfifo4qag1o6ziuqkkydzu88gqz5wnb5yspke8:
    'BANXNO Faucet',
  ban_1bingof4zqro34ehxrcxnhcikgnh85jjw9axqggcifadj1mc88jsc3ct4di7:
    'JungleTV application: Bingo',
  ban_1uwidgukruggyde49g8kqyztxuw6z38dxhy4jj1ppe4xzjooo4kstwfyqfce:
    'BananoBust',
  ban_3r7xjnq4ywn1sf387xzpgbytwuaa6hgfurd11mx7qagkx1hiuq73ka63hbxz: 'BanLotto',
  ban_1kwin96znfqopi7be3shxcxn8qeruirob885oaya4ix5pkrnpsou4u5qbeaa: 'BanSlots',
  ban_1p3oxrfuqddcb4r7ercjwdnxiyn1bwqspzettum7c8x1awsnd5zqtj5f1d6m:
    'BC.Game Old',
  ban_1rjrdkeo5st74fwka1ww4w8oq9cpb5ncc3fejxtpn59jjic7ex764fwknw4f: 'BC.Game',
  ban_1p1ay3gdxnb5gx69muqjo4zthcgmb5tzarupa7cirykwccp6mzr7eu8jjnh8:
    'PlayBanano',
  ban_1banbet955hwemgsqrb8afycd3nykaqaxsn7iaydcctfrwi3rbb36y17fbcb:
    'Bananobet Hot Wallet',
  ban_3sprts3a8hzysquk4mcy4ct4f6izp1mxtbnybiyrriprtjrn9da9cbd859qf:
    'Banano Sports Pools NFL',
  ban_15sxnajaaztcbeewrs7yyih4teiz4jsxur1j393yi8xhytuza5jty6emdogo:
    'Banano Sports Pools World Cup Match',
  ban_1wu6rxojhgjwy1mzci1jmkm7az7nntf31h6ptuoqmetwp64j3sxo7het6e3m:
    'Banano Sports Pools World Cup Team and Groups',
  ban_1eub1ezmefs1im56oomprzddwhp5s9c6brhx755ftjfjz45uytputarmcwto:
    'Banano Sports Pools MLB playoffs and teams',
  ban_1casino1h3fjnmotzpf5q37sxf6ybwsk6g4nryjd7q9ttupz4fkiousdgaj8:
    'Banano Casino',
  ban_1w5q77ocgfrjn6sqwudfuygtomwyij8ijes3y5g8kaydxsf8f4jpz4n9q9a3:
    'Nanogames Hot Wallet Old',
  ban_1p9a8o8e51ssh8onm8ym7fap91h6grzfzx9xs1yprfqiaj5ae77a61cbpoor:
    'Nanogames Hot Wallet',
  ban_3ei96iz4wj8d17zee1thbtgejkdwq9s1ikgz51jptyank1d3tr3uxjk3tezy:
    'Nanosquares.io Deposit',
  ban_3nuq9s1ot8dzk4i1w1zxejnk6qgbr7zgaw9rxagokbwdxw96z4fbk85girf6:
    'Nanosquares.io Withdrawal',
  ban_1purian887obzya9jjrsz18eiu45dzzgr9q1mh1zg7rw1kybgx5nmr843afb: 'Purian',
  ban_1wirginxksoeggr1u51a797tytmicokwnxxsosmd1q3mapuad4j6hdzeh617: 'not_idol',
  ban_1h11mrypctfiexeo3swn1odo78uazf8oudrbqhcpzqyxjpu7eksrad8t1shg:
    'Randomizer',
  ban_1eska1qx1cd1x7tkbo4wmuofpsq69dekk7h5n6yo967kjq43nhhobrhno95x: 'Eska',
  ban_3f1j9usj4tnotgiu9b9wasba97u7x81me5ztg6e5ted34jycpi9mkio5eng3:
    'MeltingIce',
  ban_1gt4ti4gnzjre341pqakzme8z94atcyuuawoso8gqwdx5m4a77wu1mxxighh:
    'bagend.notellem.win',
  ban_3px37c9f6w361j65yoasrcs6wh3hmmyb6eacpis7dwzp8th4hbb9izgba51j:
    'Banano Italiano - La Giungla',
  ban_1tipbotgges3ss8pso6xf76gsyqnb69uwcxcyhouym67z7ofefy1jz7kepoy:
    'Banano Tipbots',
  ban_3rz8d5n7iodhmyjk8xpc68x87iw96a14fdfazwrfefucmhggw6i1a9nxi9yy:
    'banano-pixels',
  ban_1fnx59bqpx11s1yn7i5hba3ot5no4ypy971zbkp5wtium3yyafpwhhwkq8fc:
    'banano.nifni.net',
  ban_1banbet1hxxe9aeu11oqss9sxwe814jo9ym8c98653j1chq4k4yaxjsacnhc:
    'BananoBet Rep',
  ban_1wha1enz8k8r65k6nb89cxqh6cq534zpixmuzqwbifpnqrsycuegbmh54au6:
    'Bananode.eu',
  ban_1ort4j8gh5pcst7i4mbgtsjsihiwpdrd5fj8mwxdc7hw18n67nanwxzoz45t:
    'Bananorlando City Node',
  ban_3p3sp1ynb5i3qxmqoha3pt79hyk8gxhtr58tk51qctwyyik6hy4dbbqbanan:
    'BananOslo 🍌',
  ban_3batmanuenphd7osrez9c45b3uqw9d9u81ne8xa6m43e1py56y9p48ap69zg: 'batman',
  ban_3cutenodsyi4mtgjyin91zp9k4i3cbkemj8cxfaigskibz4ow68u3yeao8bs: 'boopowo',
  ban_3m8mdu1jxuntoe19wemgohduss3cn7ctxbt41ioh87mfjz9ho8o15yhjas96:
    'Cabbit Node',
  ban_1cake36ua5aqcq1c5i3dg7k8xtosw7r9r7qbbf5j15sk75csp9okesz87nfn: 'Cake',
  ban_3catgir1p6b1edo5trp7fdb8gsxx4y5ffshbphj73zzy5hu678rsry7srh8b: 'CatGirl',
  ban_1creepi89mp48wkyg5fktgap9j6165d8yz6g1fbe5pneinz3by9o54fuq63m:
    'Legacy Creeper',
  ban_1crpaybw8jip7fm98fzfxnjajb55ty76oyzmpfwe9s66u4aod37tm3kxba8q: 'CRPay',
  ban_1hootubxy68fhhrctjmaias148tz91tsse3pq1pgmfedsm3cubhobuihqnxd: 'Eulentier',
  ban_1fomoz167m7o38gw4rzt7hz67oq6itejpt4yocrfywujbpatd711cjew8gjj: 'FOMO',
  ban_3h7xtjwkm65ufoedjei6z7xfmuyfgehq3t7zm5et4osdyha1qn9ewrisyncz:
    'FutureNanners',
  ban_1bananobh5rat99qfgt1ptpieie5swmoth87thi74qgbfrij7dcgjiij94xr: 'Genesis',
  ban_3goobcumtuqe37htu4qwtpkxnjj4jjheyz6e6kke3mro7d8zq5d36yskphqt: 'Goob',
  ban_3grayknbwtrjdsbdgsjbx4fzds7eufjqghzu6on57aqxte7fhhh14gxbdz61: 'Gray',
  ban_3yip4x7tccmayjim1h6mjof46hhjfgukn86gs8ic87b8ig6r9jtptogp8skc: 'Banode01',
  ban_1hentaiqzbhasuyg5tcyhso79ma3wuiektphbnjcekifmawuugdri93trt8f: 'Hentai',
  ban_3pa1m3g79i1h7uijugndjeytpmqbsg6hc19zm8m7foqygwos1mmcqmab91hh:
    'palm.just-dmitry.ru',
  ban_1ka1ium4pfue3uxtntqsrib8mumxgazsjf58gidh1xeo5te3whsq8z476goo: 'Kalium',
  ban_1kawandahui9bbj64a3qejbxayqzqgqgqnp3fefn7x7xuwmizy4ur6zy6n4a: 'kawanda',
  ban_1nannerspntaoqyrtnzjj76joe6yqjcterj6ef3qkdc6kfgswqu3pfaaqphe:
    'nanners.cc',
  ban_339yi5dqeo38rnfo8p6f4q5amxifje7r1mam1ye33f9xr3fy3s1mxyy3pwc3:
    'NeutralGood',
  ban_1bestrep6gq14bt4bi7w446m9knc6matfad7qcii7edeb33iipooh46dotdz:
    'node.banano.ch',
  ban_19potasho7ozny8r1drz3u3hb3r97fw4ndm4hegdsdzzns1c3nobdastcgaa:
    'node.jungletv.live',
  ban_1nunu9z3puk3dehuoh3djesa4psro1mcqoi48pr64jxzf6osm6iqkmjupwfh: 'Nunu',
  ban_1on1ybanskzzsqize1477wximtkdzrftmxqtajtwh4p4tg1w6awn1hq677cp: 'OnlyBans',
  ban_1sebrep1mbkdtdb39nsouw5wkkk6o497wyrxtdp71sm878fxzo1kwbf9k79b:
    'sebrock19.de',
  ban_3tacocatezozswnu8xkh66qa1dbcdujktzmfpdj7ax66wtfrio6h5sxikkep: 'Taco',
  ban_3binance1adje7uwzjmsyxsqxjt8c471i33xo39k94twkipntmrqt1ii5t57:
    'Unofficial Binance Representative 1',
  ban_15gfawgrsc6tkkm5p1gy749tkibchu73st1ojs3knz6rd3ejfcgt7rj5cmx9:
    'VF Validierung 🇩🇪 ',
  ban_1337wcbi9enjxb339ma9w9o87eiz11oix8gxgoxxmkmskddsyc3oo51ma9kh: 'ViNo',
  ban_3nnfzzxp84zj7e7zrbsf65hngs51b76gda179bc4dxr7fkjtbtxq744w6gcx:
    'Woodrisian',
  ban_3srechjntpdomi9dbaksfxkpk4o134kchii8iozd98aa5f3txbej96wb77mg:
    'Yellow Trust',
  ban_3p1anetee7arfx9zbmspwf9c8c5r88wy6zkgwcbt7rndtcqsoj6fzuy11na3:
    'BananoPlanet.cc',
  ban_1gprxwnms1ddqiiwzyfnezzh8iphbbkkyuyuitawtsgnqzqyi8zu8sq9xzja:
    'benisnode.xyz',
  ban_1otahirsy63kwzi6e3578wm1q6d67pgcude31gkd7e31gcktuguuyhdtzton:
    'FI Monke 🐒',
  ban_1kapppaojer1mnhrex1thbr4gpzto5uprz339jbqmms4eqgoe78usx85rjrs: 'Ka',
  ban_1moonanoj76om1e9gnji5mdfsopnr5ddyi6k3qtcbs8nogyjaa6p8j87sgid: 'Moonano',
  ban_177d6g6o3g8tdgqd7ia9aitx5xkrs4o776bnci1exiqstrpwztbgg368gyj8:
    'node.banano.app',
  ban_1heart7e8u4tnyowup9hwchx8tkfaqjiyp67si74gdanziizegf7p37jd6gf: 'one love',
  ban_1mutsny6d7d95w733rah4e5s14nutdtodgjh1wjxoyfnhsxchf9ars1en4a8: 'v23.0',
  ban_1yag3k5uegjz5o3xbek83yibbb75sdne3rjtuuh3ry555pr835781eh9wecy: 'Yag',
  ban_1hoot5p5jibm84pir458nmfnyt8jc3xfsbyfahk5fxwythz8ogkdcy3hdbka:
    'Old Eulentier',
  ban_3tor3b9sh9ufkgsth1dir3hi6bbwqtcc7xn6zbfhu4ofprktxz8ygysx7rq3:
    'Banano Tor',
  ban_1benisgqfid7nuaod79ijaa53knw9nd6gssi6ar6qw5d8bj1j5bg6946smy9: 'Benis',
  ban_3bancat34ba3xkszt3f4wdyx8mih8d7nszi1raoghfmqch78eai3y3jmga1x: 'bananocat',
  ban_3imophzbk9ruq3ju18jyw37376h3wdeon15asw4yj3kfgxs6m1eg7784a4im: 'Tip[.]cc',
  ban_1defi11tou1nbhyp8y4onwsiq5jcur19xe54mcmew1xonnz6e1d1sw74yefu: 'Defi',
  ban_1searchspfypyzyesohcndxhx1w1a1ai1e4o6yi9i6g1e6oj7mgf7cj6o7si:
    'BananoSearch',
  ban_1waxf5j83w7eqqz3kph7u843wh3p5ddf1n48rh4i9m41zhk9nnquzwbnz9pb:
    'waxp.rentals',
  ban_1greenntagzbysqsk3ypbwx1oouojus8gmcawdb4jtu6t3czuacxtznnrues:
    'cryptomonKeys connect linking',
  ban_3ri6m4wbjgrjkxjzobwwjyzfte3xbizifx6icqtb7oipccnpzxcn6p3y6wpq:
    'TIPBOT#9374 Multicoin Discord Tipbot',
  ban_19bantanopcajd8ptfg9aedn8osgrzyrbupte5j4p1je69e5diz8qtc4dopf: 'Bantano',
  ban_3fudcakefr9jyw7b4kfafrgaekmd37ez7q4pmzuo1fd7wo9jo8gsha7z7e1c: 'Fudcake',
  ban_1kirby19w89i35yenyesnz7zqdyguzdb3e819dxrhdegdnsaphzeug39ntxj: 'Kirby',
  ban_1yekta1xn94qdnbmmj1tqg76zk3apcfd31pjmuy6d879e3mr469a4o4sdhd4: 'Yekta',
  ban_1waifusa1tnk3eo7dstc4z9tt7puurh5jyettyj59mis5m86ofiwywahcccm:
    'bananochan',
  ban_3pteraaprhcstp8zhf9fzco6gdwpzqmgm3846azcx4mcarubpozs91rq61bt: 'Ptera',
  ban_1coranoshiqdentfbwkfo7fxzgg1jhz6m33pt9aa8497xxfageuskroocdxa: 'Coranos',
  ban_3renesqym44gjo7oxt9knhtfgh6un9hc4bzgnjrxpku874cb3dqbuyi7oxha: 'RQ',
  ban_1bboss18y784j9rbwgt95uwqamjpsi9oips5syohsjk37rn5ud7ndbjq61ft: 'bbedward',
  ban_1sogg99ytfm53pie7fg7hg9rcfm6668636j4pmcs3y9wbere1dizfxdd7rm8:
    'Soggy Apple Pie',
  ban_15iyp4scse8tbqi6o9u4fw7tu9o467qobx7gdus8i8a576tmphk4rkbshk9g: 'Anemone',
  ban_1fp6xddtgj5yx6z4dj4k6tghjf13jgeki5f6bcejt15515k36jtpdyq14zsa:
    'Wrap-That-Potassium',
  ban_3kxi19xpm9pn51zazmtow1tbohmr1p4n4ttq5ts3x7gmpt4umow8yz8ocjax:
    'just_dmitry',
  ban_3xib4o7ffrxqec94r6k1i4ui8juigggdwrhf37hot1gm7yt3nijxqkhg47qq: 'Turd',
  ban_3fhwek5qdb4mhxe9scj647g36ik7yadc8dq5gkkxec4pcdd4zzf13ri4bnpx: 'Kron',
  ban_3iem376n5xz5yckd54dyszcassxa8tm3spos56t6f7exj8e3xrstmezqq4d3: 'Phantoad',
  ban_3fatj6ubg5zfsxp6z3c7uzm8hqdmy14z61hany3iqjgawr86im3q8iftoops: 'Oops',
  ban_19jrdbibdeakrgcqn6kjnnie7e7ktqzjzhd73tttbqgw5eb9ud9g1o7bqya5:
    'NiceTheBoy',
  ban_1airtunes8qctdtjhnfu5tpegk337rgcgnbtktozg6ttz3hordo6chf5c31r: 'Airtune',
  ban_1ehtttffyimud7izzbmyw3ey3nsxkpjzet4n9htmjcez8themr6ygr57ywr1: 'banano.sh',
  ban_3majicaksqk6bo1tj4xowyrnaseyfwc1si9gkda9ps8gtpc3mp1jjwpucpxo:
    'Majical Node',
  ban_34sce59x8zca8heegpwwkig3r87upqtfgxahmqtpupirs1yhkgwk739aqc8z:
    'Twister32 🇫🇷'
};

const repLocationsMap = {
  ban_3rz8d5n7iodhmyjk8xpc68x87iw96a14fdfazwrfefucmhggw6i1a9nxi9yy: 'Germany',
  ban_1ehtttffyimud7izzbmyw3ey3nsxkpjzet4n9htmjcez8themr6ygr57ywr1:
    'Jungle, NYC',
  ban_3bancat34ba3xkszt3f4wdyx8mih8d7nszi1raoghfmqch78eai3y3jmga1x:
    'Virginia, USA',
  ban_1wha1enz8k8r65k6nb89cxqh6cq534zpixmuzqwbifpnqrsycuegbmh54au6: 'Sweden',
  ban_1ort4j8gh5pcst7i4mbgtsjsihiwpdrd5fj8mwxdc7hw18n67nanwxzoz45t:
    'Bananorlando City',
  ban_3p3sp1ynb5i3qxmqoha3pt79hyk8gxhtr58tk51qctwyyik6hy4dbbqbanan:
    'Oslo, Norway',
  ban_3batmanuenphd7osrez9c45b3uqw9d9u81ne8xa6m43e1py56y9p48ap69zg:
    'Pittsburgh, PA',
  ban_1hootubxy68fhhrctjmaias148tz91tsse3pq1pgmfedsm3cubhobuihqnxd:
    'The Jungle',
  ban_3goobcumtuqe37htu4qwtpkxnjj4jjheyz6e6kke3mro7d8zq5d36yskphqt: 'USA',
  ban_3grayknbwtrjdsbdgsjbx4fzds7eufjqghzu6on57aqxte7fhhh14gxbdz61:
    'PGH,PA,USA',
  ban_3majicaksqk6bo1tj4xowyrnaseyfwc1si9gkda9ps8gtpc3mp1jjwpucpxo: 'France',
  ban_1moonanoj76om1e9gnji5mdfsopnr5ddyi6k3qtcbs8nogyjaa6p8j87sgid:
    'Warsaw, Poland',
  ban_1nannerspntaoqyrtnzjj76joe6yqjcterj6ef3qkdc6kfgswqu3pfaaqphe:
    'Eastern Banano Republic',
  ban_177d6g6o3g8tdgqd7ia9aitx5xkrs4o776bnci1exiqstrpwztbgg368gyj8:
    'Tokyo,Japan',
  ban_19potasho7ozny8r1drz3u3hb3r97fw4ndm4hegdsdzzns1c3nobdastcgaa: 'Portugal',
  ban_1heart7e8u4tnyowup9hwchx8tkfaqjiyp67si74gdanziizegf7p37jd6gf:
    'Düsseldorf, GER',
  ban_3pa1m3g79i1h7uijugndjeytpmqbsg6hc19zm8m7foqygwos1mmcqmab91hh: 'Mordor',
  ban_34sce59x8zca8heegpwwkig3r87upqtfgxahmqtpupirs1yhkgwk739aqc8z:
    'Occitanie, FR',
  ban_3binance1adje7uwzjmsyxsqxjt8c471i33xo39k94twkipntmrqt1ii5t57:
    'Banano Republic',
  ban_15gfawgrsc6tkkm5p1gy749tkibchu73st1ojs3knz6rd3ejfcgt7rj5cmx9: null,
  ban_1yag3k5uegjz5o3xbek83yibbb75sdne3rjtuuh3ry555pr835781eh9wecy:
    'Thunderclouds'
};

const principalsGeoInfo = [
  {
    rep_address:
      'ban_1ka1ium4pfue3uxtntqsrib8mumxgazsjf58gidh1xeo5te3whsq8z476goo',
    weight: 360821342,
    delegatorsCount: 470877,
    fundedDelegatorsCount: 55479,
    alias: 'Kalium',
    votingweight: 360821342,
    weight_formatted: '18.80%',
    location: 'Mountain View, CA, USA', // Guessed based on tech-focused wallet
    latitude: 37.3861,
    longitude: -122.0839
  },
  {
    rep_address:
      'ban_1bananobh5rat99qfgt1ptpieie5swmoth87thi74qgbfrij7dcgjiij94xr',
    weight: 306737435,
    delegatorsCount: 154783,
    fundedDelegatorsCount: 34656,
    alias: 'Genesis',
    votingweight: 306737435,
    weight_formatted: '15.99%',
    location: 'San Francisco, CA, USA', // Guessed as crypto hub
    latitude: 37.7749,
    longitude: -122.4194
  },
  {
    rep_address:
      'ban_1oaocnrcaystcdtaae6woh381wftyg4k7bespu19m5w18ze699refhyzu6bo',
    weight: 113077339,
    delegatorsCount: 3951,
    fundedDelegatorsCount: 137,
    alias: 'banano[.]nano[.]trade',
    votingweight: 113077339,
    weight_formatted: '5.89%',
    location: 'London, UK', // Guessed based on trading focus
    latitude: 51.5074,
    longitude: -0.1278
  },
  {
    rep_address:
      'ban_1fomoz167m7o38gw4rzt7hz67oq6itejpt4yocrfywujbpatd711cjew8gjj',
    weight: 73368808,
    delegatorsCount: 262834,
    fundedDelegatorsCount: 4633,
    alias: 'FOMO',
    votingweight: 73368808,
    weight_formatted: '3.82%',
    location: 'New York, NY, USA', // Guessed based on financial reference
    latitude: 40.7128,
    longitude: -74.006
  },
  {
    rep_address:
      'ban_3tacocatezozswnu8xkh66qa1dbcdujktzmfpdj7ax66wtfrio6h5sxikkep',
    weight: 67521097,
    delegatorsCount: 858,
    fundedDelegatorsCount: 387,
    alias: 'Taco',
    votingweight: 67521097,
    weight_formatted: '3.52%',
    location: 'Mexico City, Mexico', // Guessed based on name
    latitude: 19.4326,
    longitude: -99.1332
  },
  {
    rep_address:
      'ban_19potasho7ozny8r1drz3u3hb3r97fw4ndm4hegdsdzzns1c3nobdastcgaa',
    weight: 67060163,
    delegatorsCount: 2543,
    fundedDelegatorsCount: 1429,
    alias: 'node.jungletv.live',
    votingweight: 67060163,
    weight_formatted: '3.49%',
    location: 'Portugal',
    latitude: 37.0775,
    longitude: -8.6716
  },
  {
    rep_address:
      'ban_3bancat34ba3xkszt3f4wdyx8mih8d7nszi1raoghfmqch78eai3y3jmga1x',
    weight: 66819351,
    delegatorsCount: 786,
    fundedDelegatorsCount: 671,
    alias: 'bananocat',
    votingweight: 66819351,
    weight_formatted: '3.48%',
    location: 'Virginia, USA',
    latitude: 37.4221,
    longitude: -78.6443
  },
  {
    rep_address:
      'ban_1hentaiqzbhasuyg5tcyhso79ma3wuiektphbnjcekifmawuugdri93trt8f',
    weight: 62699932,
    delegatorsCount: 323,
    fundedDelegatorsCount: 166,
    alias: 'Hentai',
    votingweight: 62699932,
    weight_formatted: '3.27%',
    location: 'Tokyo, Japan', // Guessed based on reference
    lat: 35.6762,
    lng: 139.6503
  },
  {
    rep_address:
      'ban_3p3sp1ynb5i3qxmqoha3pt79hyk8gxhtr58tk51qctwyyik6hy4dbbqbanan',
    weight: 61581792,
    delegatorsCount: 3279,
    fundedDelegatorsCount: 560,
    alias: 'BananOslo 🍌',
    votingweight: 61581792,
    weight_formatted: '3.21%',
    location: 'Oslo, Norway',
    latitude: 59.9139,
    longitude: 10.7522
  },
  {
    rep_address:
      'ban_1heart7e8u4tnyowup9hwchx8tkfaqjiyp67si74gdanziizegf7p37jd6gf',
    weight: 60597908,
    delegatorsCount: 229,
    fundedDelegatorsCount: 122,
    alias: 'one love',
    votingweight: 60597908,
    weight_formatted: '3.16%',
    location: 'Düsseldorf, GER',
    latitude: 51.2277,
    longitude: 6.7735
  },
  {
    rep_address:
      'ban_1hootubxy68fhhrctjmaias148tz91tsse3pq1pgmfedsm3cubhobuihqnxd',
    weight: 57730490,
    delegatorsCount: 393,
    fundedDelegatorsCount: 177,
    alias: 'Eulentier',
    votingweight: 57730490,
    weight_formatted: '3.01%',
    location: 'The Jungle',
    latitude: -3.4653,
    longitude: -62.2159
  },
  {
    rep_address:
      'ban_3majicaksqk6bo1tj4xowyrnaseyfwc1si9gkda9ps8gtpc3mp1jjwpucpxo',
    weight: 47862791,
    delegatorsCount: 148,
    fundedDelegatorsCount: 52,
    alias: 'Majical Node',
    votingweight: 47862791,
    weight_formatted: '2.49%',
    location: 'France',
    latitude: 46.2276,
    longitude: 2.2137
  },
  {
    rep_address:
      'ban_1cake36ua5aqcq1c5i3dg7k8xtosw7r9r7qbbf5j15sk75csp9okesz87nfn',
    weight: 36837613,
    delegatorsCount: 288570,
    fundedDelegatorsCount: 9433,
    alias: 'Cake',
    votingweight: 36837613,
    weight_formatted: '1.92%',
    location: 'Paris, France', // Guessed based on culinary association
    latitude: 48.8566,
    longitude: 2.3522
  },
  {
    rep_address:
      'ban_3grayknbwtrjdsbdgsjbx4fzds7eufjqghzu6on57aqxte7fhhh14gxbdz61',
    weight: 32450674,
    delegatorsCount: 87,
    fundedDelegatorsCount: 58,
    alias: 'Gray',
    votingweight: 32450674,
    weight_formatted: '1.69%',
    location: 'PGH,PA,USA',
    latitude: 40.4406,
    longitude: -79.9959
  },
  {
    rep_address:
      'ban_3rz8d5n7iodhmyjk8xpc68x87iw96a14fdfazwrfefucmhggw6i1a9nxi9yy',
    weight: 32296469,
    delegatorsCount: 192,
    fundedDelegatorsCount: 109,
    alias: 'banano-pixels',
    votingweight: 32296469,
    weight_formatted: '1.68%',
    location: 'Germany',
    latitude: 51.1657,
    longitude: 10.4515
  },
  {
    rep_address:
      'ban_3binance1adje7uwzjmsyxsqxjt8c471i33xo39k94twkipntmrqt1ii5t57',
    weight: 29727041,
    delegatorsCount: 191,
    fundedDelegatorsCount: 67,
    alias: 'Unofficial Binance Representative 1',
    votingweight: 29727041,
    weight_formatted: '1.55%',
    location: 'Banano Republic',
    lat: 9.7489, // Using Costa Rica coordinates as a playful reference
    lng: -83.7534
  },
  {
    rep_address:
      'ban_3batmanuenphd7osrez9c45b3uqw9d9u81ne8xa6m43e1py56y9p48ap69zg',
    weight: 26228065,
    delegatorsCount: 5577,
    fundedDelegatorsCount: 1329,
    alias: 'batman',
    votingweight: 26228065,
    weight_formatted: '1.37%',
    location: 'Pittsburgh, PA',
    latitude: 40.4406,
    longitude: -79.9959
  },
  {
    rep_address:
      'ban_3goobcumtuqe37htu4qwtpkxnjj4jjheyz6e6kke3mro7d8zq5d36yskphqt',
    weight: 25985311,
    delegatorsCount: 112,
    fundedDelegatorsCount: 68,
    alias: 'Goob',
    votingweight: 25985311,
    weight_formatted: '1.35%',
    location: 'USA',
    latitude: 39.8283,
    longitude: -98.5795
  },
  {
    rep_address:
      'ban_1creepi89mp48wkyg5fktgap9j6165d8yz6g1fbe5pneinz3by9o54fuq63m',
    weight: 23327049,
    delegatorsCount: 7336,
    fundedDelegatorsCount: 988,
    alias: 'Legacy Creeper',
    votingweight: 23327049,
    weight_formatted: '1.22%',
    location: 'Stockholm, Sweden', // Guessed based on gaming reference
    lat: 59.3293,
    lng: 18.0686
  },
  {
    rep_address:
      'ban_1nannerspntaoqyrtnzjj76joe6yqjcterj6ef3qkdc6kfgswqu3pfaaqphe',
    weight: 21481834,
    delegatorsCount: 331,
    fundedDelegatorsCount: 210,
    alias: 'nanners.cc',
    votingweight: 21481834,
    weight_formatted: '1.12%',
    location: 'Eastern Banano Republic',
    latitude: 14.0583, // Using Caribbean coordinates as a playful reference
    longitude: -61.0242
  },
  {
    rep_address:
      'ban_1wha1enz8k8r65k6nb89cxqh6cq534zpixmuzqwbifpnqrsycuegbmh54au6',
    weight: 20259508,
    delegatorsCount: 1421,
    fundedDelegatorsCount: 553,
    alias: 'Bananode.eu',
    votingweight: 20259508,
    weight_formatted: '1.06%',
    location: 'Sweden',
    latitude: 59.3293,
    longitude: 18.0686
  },
  {
    rep_address:
      'ban_1banbet1hxxe9aeu11oqss9sxwe814jo9ym8c98653j1chq4k4yaxjsacnhc',
    weight: 19254869,
    delegatorsCount: 3089,
    fundedDelegatorsCount: 265,
    alias: 'BananoBet Rep',
    votingweight: 19254869,
    weight_formatted: '1.00%',
    location: null,
    latitude: 59.3293,
    longitude: 18.0686
  },
  {
    rep_address:
      'ban_151sj7ainc3379f37acp9e81qsy9kyfprkb7m6gn56aifeyy1hzdcmquy69b',
    weight: 18256941,
    delegatorsCount: 355,
    fundedDelegatorsCount: 207,
    alias: '',
    votingweight: 18256941,
    weight_formatted: '0.95%',
    location: null,
    latitude: 59.3293,
    longitude: 18.0686
  },
  {
    rep_address:
      'ban_1ort4j8gh5pcst7i4mbgtsjsihiwpdrd5fj8mwxdc7hw18n67nanwxzoz45t',
    weight: 17274484,
    delegatorsCount: 1494,
    fundedDelegatorsCount: 366,
    alias: 'Bananorlando City Node',
    votingweight: 17274484,
    weight_formatted: '0.90%',
    location: 'Bananorlando City'
  },
  {
    rep_address:
      'ban_34sce59x8zca8heegpwwkig3r87upqtfgxahmqtpupirs1yhkgwk739aqc8z',
    weight: 14284130,
    delegatorsCount: 946,
    fundedDelegatorsCount: 214,
    alias: 'Twister32 🇫🇷',
    votingweight: 14284130,
    weight_formatted: '0.74%',
    location: 'Occitanie, FR'
  },
  {
    rep_address:
      'ban_3yip4x7tccmayjim1h6mjof46hhjfgukn86gs8ic87b8ig6r9jtptogp8skc',
    weight: 12286545,
    delegatorsCount: 63,
    fundedDelegatorsCount: 33,
    alias: 'Banode01',
    votingweight: 12286545,
    weight_formatted: '0.64%',
    location: null
  },
  {
    rep_address:
      'ban_1gt4ti4gnzjre341pqakzme8z94atcyuuawoso8gqwdx5m4a77wu1mxxighh',
    weight: 11868307,
    delegatorsCount: 646,
    fundedDelegatorsCount: 383,
    alias: 'bagend.notellem.win',
    votingweight: 11868307,
    weight_formatted: '0.62%',
    location: null
  },
  {
    rep_address:
      'ban_1bestrep6gq14bt4bi7w446m9knc6matfad7qcii7edeb33iipooh46dotdz',
    weight: 11785394,
    delegatorsCount: 155,
    fundedDelegatorsCount: 56,
    alias: 'node.banano.ch',
    votingweight: 11785394,
    weight_formatted: '0.61%',
    location: null, // Dubai
    latitude: 53.3498,
    longitude: -6.2603
  },
  {
    rep_address:
      'ban_3pa1m3g79i1h7uijugndjeytpmqbsg6hc19zm8m7foqygwos1mmcqmab91hh',
    weight: 10193984,
    delegatorsCount: 183,
    fundedDelegatorsCount: 78,
    alias: 'palm.just-dmitry.ru',
    votingweight: 10193984,
    weight_formatted: '0.53%',
    location: 'Mordor',
    latitude: 53.3498,
    longitude: -6.2603
  },
  {
    rep_address:
      'ban_1moonanoj76om1e9gnji5mdfsopnr5ddyi6k3qtcbs8nogyjaa6p8j87sgid',
    weight: 8765612,
    delegatorsCount: 166,
    fundedDelegatorsCount: 103,
    alias: 'Moonano',
    votingweight: 8765612,
    weight_formatted: '0.46%',
    location: 'Warsaw, Poland',
    latitude: 52.2297,
    longitude: 21.0122
  },
  {
    rep_address:
      'ban_1tipbotgges3ss8pso6xf76gsyqnb69uwcxcyhouym67z7ofefy1jz7kepoy',
    weight: 8712902,
    delegatorsCount: 55560,
    fundedDelegatorsCount: 33936,
    alias: 'Banano Tipbots',
    votingweight: 8712902,
    weight_formatted: '0.45%',
    location: null,
    latitude: 59.3293,
    longitude: 18.0686
  },
  {
    rep_address:
      'ban_3catgir1p6b1edo5trp7fdb8gsxx4y5ffshbphj73zzy5hu678rsry7srh8b',
    weight: 8013090,
    delegatorsCount: 585,
    fundedDelegatorsCount: 227,
    alias: 'CatGirl',
    votingweight: 8013090,
    weight_formatted: '0.42%',
    location: null,
    latitude: 59.3293,
    longitude: 18.0686
  },
  {
    rep_address:
      'ban_177d6g6o3g8tdgqd7ia9aitx5xkrs4o776bnci1exiqstrpwztbgg368gyj8',
    weight: 7264195,
    delegatorsCount: 1355,
    fundedDelegatorsCount: 119,
    alias: 'node.banano.app',
    votingweight: 7264195,
    weight_formatted: '0.38%',
    location: 'Tokyo,Japan',
    latitude: 35.6895,
    longitude: 139.7014
  },
  {
    rep_address:
      'ban_15gfawgrsc6tkkm5p1gy749tkibchu73st1ojs3knz6rd3ejfcgt7rj5cmx9',
    weight: 7176851,
    delegatorsCount: 470,
    fundedDelegatorsCount: 229,
    alias: 'VF Validierung 🇩🇪 ',
    votingweight: 7176851,
    weight_formatted: '0.37%',
    location: null,
    latitude: 59.3293,
    longitude: 18.0686
  },
  {
    rep_address:
      'ban_1ehtttffyimud7izzbmyw3ey3nsxkpjzet4n9htmjcez8themr6ygr57ywr1',
    weight: 6169375,
    delegatorsCount: 771,
    fundedDelegatorsCount: 206,
    alias: 'banano.sh',
    votingweight: 6169375,
    weight_formatted: '0.32%',
    location: 'Jungle, NYC',
    latitude: 40.7128,
    longitude: -74.006
  },
  {
    rep_address:
      'ban_3p1anetee7arfx9zbmspwf9c8c5r88wy6zkgwcbt7rndtcqsoj6fzuy11na3',
    weight: 4811725,
    delegatorsCount: 1119,
    fundedDelegatorsCount: 492,
    alias: 'BananoPlanet.cc',
    votingweight: 4811725,
    weight_formatted: '0.25%',
    location: null,
    latitude: 60.1695,
    longitude: 24.9354
  },
  {
    rep_address:
      'ban_3sdnca4cf8qotjgtrj89q9qfbza1b8srfurf4mrak3yq4e89x95ofo7qg8fd',
    weight: 4300456,
    delegatorsCount: 1,
    fundedDelegatorsCount: 1,
    alias: '',
    votingweight: 4300456,
    weight_formatted: '0.22%',
    location: null,
    latitude: 33.8688,
    longitude: 151.2093
  },
  {
    rep_address:
      'ban_3px37c9f6w361j65yoasrcs6wh3hmmyb6eacpis7dwzp8th4hbb9izgba51j',
    weight: 4040494,
    delegatorsCount: 270,
    fundedDelegatorsCount: 147,
    alias: 'Banano Italiano - La Giungla',
    votingweight: 4040494,
    weight_formatted: '0.21%',
    location: null,
    latitude: 41.9028,
    longitude: 12.4964
  },
  {
    rep_address:
      'ban_1banexkcfuieufzxksfrxqf6xy8e57ry1zdtq9yn7jntzhpwu4pg4hajojmq',
    weight: 3286923,
    delegatorsCount: 11003,
    fundedDelegatorsCount: 181,
    alias: 'Banano[.]Exchange exchange',
    votingweight: 3286923,
    weight_formatted: '0.17%',
    location: null,
    latitude: 41.9028,
    longitude: 12.4964
  },
  {
    rep_address:
      'ban_3nnfzzxp84zj7e7zrbsf65hngs51b76gda179bc4dxr7fkjtbtxq744w6gcx',
    weight: 1516224,
    delegatorsCount: 18,
    fundedDelegatorsCount: 16,
    alias: 'Woodrisian',
    votingweight: 1516224,
    weight_formatted: '0.08%',
    location: null,
    latitude: 59.3293,
    longitude: 18.0686
  },
  {
    rep_address:
      'ban_3mbpb9894x4ygp9wwj55rgocdtjp1h9tt8kapmpu7akuwuaradmonaahw49m',
    weight: 1485272,
    delegatorsCount: 49,
    fundedDelegatorsCount: 34,
    alias: '',
    votingweight: 1485272,
    weight_formatted: '0.08%',
    location: null,
    latitude: 1.3521,
    longitude: 103.8198
  }
];
