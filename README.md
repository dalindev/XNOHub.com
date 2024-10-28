# Nano Network Globe Visualization

## Demo Video


https://github.com/user-attachments/assets/85398eb2-74d7-41c8-815d-9c462db9a7f2



https://github.com/user-attachments/assets/fdd6f818-8279-4f0f-9d59-22bf28de70d7




## Overview

Nano Network Globe Visualization is a web application that allows you to visualize the Nano network on a globe. It uses a custom websocket client to connect to the Nano network and receive real-time data. The data is then visualized on a globe using a custom 3D globe library.

The application now also supports Banano network visualization at the `/banano` route!

## Prerequisites

Before running the application, make sure you have pnpm installed. If you don't have pnpm, you can install it using npm:
```bash
npm install -g pnpm
```

## Setup

Before running the application, you need to set up your environment variables:

1. Copy the `.env.local.example` file and rename it to `.env.local`:
2. Open the `.env.local` file and update the variables:
   - `NEXT_PUBLIC_USE_SAMPLE_DATA`: Set to `true` to use sample data for development, or `false` to use live data.
   
   For Nano:
   - `NEXT_PUBLIC_WS_URL`: Set this to the Nano Websocket URL you want to connect to.
   - `NEXT_PUBLIC_NANO_DONATION_ACCOUNT`: Set this to your Nano donation account address.
   
   For Banano:
   - `NEXT_PUBLIC_BANANO_WS_URL`: Set this to the Banano Websocket URL.
   - `NEXT_PUBLIC_BANANO_DONATION_ACCOUNT`: Set this to your Banano donation account address.

Example `.env.local` file:
```
NEXT_PUBLIC_USE_SAMPLE_DATA=false

# Nano
NEXT_PUBLIC_WS_URL=wss://example-nano-node.com/ws
NEXT_PUBLIC_NANO_DONATION_ACCOUNT=nano_1youraddress...

# Banano
NEXT_PUBLIC_BANANO_WS_URL=wss://example-banano-node.com/ws
NEXT_PUBLIC_BANANO_DONATION_ACCOUNT=ban_1youraddress...
```

## How to run

1. Clone the repository
2. Run `pnpm install`
3. Run `pnpm dev`
4. Visit `/` for Nano visualization or `/banano` for Banano visualization

## Production

1. Run `pnpm build`
2. Run `pnpm start`

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
