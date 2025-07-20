# 🌍 Nano Network Explorer - Interactive 3D Globe Visualization

<div align="center">

## Demo Video

<div style="width: 100%">

[https://github.com/user-attachments/assets/d2efe6c6-585b-4553-aec3-240edbd930b5](https://github.com/user-attachments/assets/d2efe6c6-585b-4553-aec3-240edbd930b5)

</div>

<div style="width: 100%">

[https://github.com/user-attachments/assets/85398eb2-74d7-41c8-815d-9c462db9a7f2](https://github.com/user-attachments/assets/f377d055-db28-400e-bda5-c91cf8df37ef)

</div>

<div style="width: 100%">

[https://github.com/user-attachments/assets/fdd6f818-8279-4f0f-9d59-22bf28de70d7](https://github.com/user-attachments/assets/d6e1cf94-6aea-43b7-9752-b63e58cf6416)

</div>

## Sponsors

<img src="https://benture.io/assets/img/logo.svg" alt="Benture" width="200"/>

[Benture.io](https://benture.io) - A remote job board specializing in AI and tech positions.

</div>

---

## 📖 About This Project

This web application visualizes cryptocurrency networks on an interactive 3D globe. Watch real-time transactions fly across the world with SpaceX-inspired animations. Currently supporting both Nano and Banano networks.

### Features
- **Real-time Network Visualization**
  - Live transaction tracking across the globe
  - Real-time node location mapping
  - Network activity monitoring
  - Built-in mock data support for instant testing
- **Advanced 3D Globe Features**
  - Dynamic day/night cycle simulation
  - Realistic moving cloud layers
  - Interactive 3D globe interface
- **SpaceX-Inspired Animations**
  - Falcon Heavy rocket launches
  - Orbiting Starlink satellites
  - Multiple camera perspectives:
    - Free-roaming POV
    - Rocket chase camera
    - First-person view from rocket looking back at Earth
- **Multi-Network Support**
  - Nano network visualization
  - Banano network visualization
  - Easy adaptation for other networks
- **Highly Customizable**
  - Configurable transaction arcs (height, speed, duration, length)
  - Adjustable animation parameters
  - Flexible network integration

### Network Adaptation
This visualization can be easily adapted to other networks in two steps:
1. Update WebSocket connections and data interfaces
2. Configure node lists and related network logic

Mock data is included out of the box, allowing you to run and test the visualization without any external configuration.

---

## 💫 Supported Networks

### What is Nano?

[Nano](https://nano.org) is a sustainable digital currency and payment protocol designed to be accessible and lightweight, with a focus on removing inefficiencies present in other cryptocurrencies. Also known as "Nano Currency" or "Nano Crypto", Nano started development in 2014 (originally called RaiBlocks/XRB) and is one of the first Directed Acyclic Graph (DAG) based blockchains, utilizing a unique block-lattice architecture. In January 2018, RaiBlocks was rebranded to Nano to make it more user-friendly and better reflect its fast, efficient nature.

#### Key Features and Benefits:

- **Fee-less Transactions**: Nano operates with zero fees for all transactions, making it ideal for microtransactions.
- **Instant Payments**: Transactions are processed in under 1 second (0.35 seconds on average), providing a seamless user experience.
- **Energy Efficient**: Nano is eco-friendly, using minimal energy compared to traditional crypto networks.
- **Hardware-Bound Scalability**: Unlike traditional blockchains that face protocol-level bottlenecks, Nano's performance scales directly with:
  - Hardware I/O capabilities
  - Network bandwidth improvements
  - Database technology advancements
  - CPU/GPU processing power
- **Advanced Architecture**: The block-lattice design allows for asynchronous updates, where each account has its own blockchain, enabling parallel processing and eliminating traditional blockchain bottlenecks.
- **Future-Proof Design**: By being bound only by hardware limitations rather than protocol constraints, Nano naturally becomes faster as technology improves, making it a future-proof solution for digital payments.
- **Fair Distribution**: Nano was distributed freely through a captcha-based faucet system from 2015 to 2017, ensuring fair access to everyone. No ICO, no pre-mine, and no insider advantages.

### What is Banano?

[Banano](https://banano.cc) is a feeless, instant cryptocurrency forked from Nano in 2018. While maintaining all of Nano's technical benefits, Banano adds a fun, meme-driven approach to cryptocurrency. The project is known for being the #1 contributor to [Folding@Home](https://foldingathome.org/), helping medical research with over 2,500 years of computational work.

---

## 🚀 Getting Started

### Prerequisites

Before running the application, make sure you have pnpm installed:
```bash
npm install -g pnpm
```

### Setup

1. Clone the repository
2. (Optional) Copy `.env.local.example` to `.env.local` if you want to use live data:
```env
# Mock data is included by default - no configuration needed for testing!
# For live data, configure these:

NEXT_PUBLIC_USE_SAMPLE_DATA=false  # Set to true to use mock data

# Nano
NEXT_PUBLIC_WS_URL=wss://example-nano-node.com/ws
NEXT_PUBLIC_NANO_DONATION_ACCOUNT=nano_1youraddress...

# Banano
NEXT_PUBLIC_BANANO_WS_URL=wss://example-banano-node.com/ws
NEXT_PUBLIC_BANANO_DONATION_ACCOUNT=ban_1youraddress...
```

### Quick Start (with mock data)
```bash
pnpm install
pnpm dev  # Mock data works out of the box!
```
Visit `/` for Nano visualization or `/banano` for Banano visualization

### Development with Live Data
After configuring `.env.local`:
```bash
pnpm install
pnpm dev
```

### Production
```bash
pnpm build
pnpm start
```

---

## 📜 License & Credits

### License
This project is licensed under the MIT License. See the LICENSE file for more details.

### 3D Model Credits
- "SpaceX Falcon Heavy" (https://skfb.ly/o6zpZ) by AllThingsSpace is licensed under Creative Commons Attribution
- "Starlink Spacex Satellite" (https://skfb.ly/ouZrO) by Malacodart is licensed under Creative Commons Attribution

---

## 📫 Contact

X (Twitter): [@dalinhuang](https://x.com/dalinhuang)

## Social Media Images

The following image assets are required for social media sharing:

- `public/og-image.png`: OpenGraph image (1200x630px)
  - Format: PNG/JPEG
  - Max size: 8MB
  - Used by: Facebook, LinkedIn, Discord

- `public/twitter-card.png`: Twitter card image (1200x600px)
  - Format: PNG
  - Max size: 5MB
  - Used by: Twitter/X

- `public/xno-preview.gif`: Animated preview (800x400px)
  - Format: GIF
  - Max size: 5MB
  - Used as alternative preview

Image requirements:
- Keep file sizes optimized
- Include logo and relevant visualization
- Use clear, high-contrast visuals
- Test with Twitter Card Validator and Facebook Sharing Debugger
