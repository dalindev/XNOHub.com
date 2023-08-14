import { Card, Title, Text } from '@tremor/react';
import Test from './three-scence';

export const dynamic = 'force-dynamic';

interface Rep {
  rep_address: string;
  est_payment: string | null;
  donation_address: string | null;
  weight: number;
  delegators: number;
  uptime: string;
  synced: number;
  website: string | null;
  latitude: number;
  longitude: number;
  alias: string;
  uptime_over: {
    week: number;
    day: number;
  };
  score: number;
  donation: string | null;
  lastVoted: string;
}

async function fetchData(): Promise<Rep[] | null> {
  const body = {
    action: 'reps'
  };

  const response = await fetch('https://rpc.nano.to', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    cache: 'force-cache',
    body: JSON.stringify(body)
  });

  const data = await response.json();
  console.log(data);
  return data;
}

export default async function IndexPage({}: {}) {
  // const data = fetchData();const myGlobe = Globe();

  return (
    <main className="p-4 md:p-10 mx-auto h-full w-full">
      <Title>XNO Globe</Title>
      <div className="flex justify-center items-center h-full w-full">
        <Test />
      </div>
    </main>
  );
}
