export const metadata = {
  title: 'Banano (BAN) Representative Network Visualization',
  description:
    'Interactive 3D visualization of the Banano (BAN) representative network. Explore real-time node distribution, voting weight, and network health of the Banano digital currency ecosystem.',
  keywords: [
    'Banano',
    'BAN',
    'Banano Digital Currency',
    'Banano Cryptocurrency',
    'Banano Network',
    'Banano Representatives',
    'BAN Network',
    'Banano Nodes',
    'Digital Currency',
    'Digital Money',
    'Meme Cryptocurrency',
    'Feeless Transactions',
    'Instant Payments',
    'Fun Cryptocurrency',
    'Potassium-rich Cryptocurrency',
    'Monkey Money',
    'Eco-Friendly Cryptocurrency',
    'Folding@Home Rewards',
    'Community Cryptocurrency'
  ],
  openGraph: {
    title: 'Banano (BAN) Network Visualization',
    description:
      'Explore the Banano (BAN) representative network in an interactive 3D visualization. View real-time node distribution and voting weight.',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://media1.tenor.com/m/nF-Dj_7JpX4AAAAd/memes-meme.gif',
        width: 640,
        height: 360,
        alt: 'Banano Network Visualization'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Banano (BAN) Network Visualization',
    description:
      'Interactive 3D visualization of the Banano (BAN) representative network',
    images: ['https://media1.tenor.com/m/nF-Dj_7JpX4AAAAd/memes-meme.gif']
  }
};

export default function BananoLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
