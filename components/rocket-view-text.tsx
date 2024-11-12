'use client';

import React from 'react';

interface RocketViewTextProps {
  distanceFromEarth: number;
  EarthRadiusInKm: number;
}

export const RocketViewText: React.FC<RocketViewTextProps> = ({
  distanceFromEarth,
  EarthRadiusInKm
}) => {
  return (
    <div className="absolute bottom-4 left-4 right-4 md:right-auto z-10 bg-black md:bg-opacity-80 p-2 md:p-3 rounded-lg font-mono text-sm md:text-base text-center shadow-lg border-2 border-[#4A90E2] max-w-full md:max-w-[550px]">
      <div className="flex items-center justify-center mb-1 md:mb-2">
        <span
          className="text-lg md:text-xl mr-1 md:mr-2"
          role="img"
          aria-label="Earth"
        >
          🌍
        </span>
        <span className="text-[#4A90E2] text-xs md:text-sm">
          Earth: {(distanceFromEarth * EarthRadiusInKm).toFixed(0)} km (
          {distanceFromEarth.toFixed(1)})
        </span>
      </div>

      <div className="text-sm md:text-base my-1 md:my-2">
        {distanceFromEarth <= 2 && (
          <span className="text-yellow-300">
            &quot;Fast, feeless, green, and ready for liftoff! 🚀&quot;
          </span>
        )}

        {distanceFromEarth > 2 && distanceFromEarth <= 5 && (
          <span className="text-green-400">
            &quot;1 ӾNO = 1 ӾNO, even in space! 👩‍🚀 🛸&quot;
          </span>
        )}

        {distanceFromEarth > 5 && distanceFromEarth <= 10 && (
          <span className="text-blue-300">
            &quot;BROCCOLISH 🥦 All the way to the Mars!&quot;
          </span>
        )}

        {distanceFromEarth > 10 && distanceFromEarth <= 20 && (
          <span className="text-purple-400">
            &quot;Nano: Proof-of-work? We left that back on Earth 🌍&quot;
          </span>
        )}

        {distanceFromEarth > 20 && distanceFromEarth <= 30 && (
          <span className="text-pink-400">
            &quot;The further we go, the smaller our fees get. Oh wait... Nano
            is feeless 😎&quot;
          </span>
        )}

        {distanceFromEarth > 30 && distanceFromEarth <= 100 && (
          <span className="text-orange-400">
            &quot;🚨 Nano speed initiated 🚨. Nano&apos;s block lattice is
            unstoppable! 🌀&quot;
          </span>
        )}

        {distanceFromEarth > 200 && distanceFromEarth <= 350 && (
          <span className="text-pink-400">
            &quot;Not even cosmic inflation can inflate Nano&apos;s supply!
            💥&quot;
          </span>
        )}

        {distanceFromEarth > 350 && distanceFromEarth <= 500 && (
          <span className="text-[#4A90E2] font-bold">
            &quot;Zero fees across the universe, Nano is boundless. 💫 🌌&quot;
          </span>
        )}

        {distanceFromEarth > 500 && distanceFromEarth <= 600 && (
          <span className="text-green-400 font-bold animate-pulse">
            &quot;Nano IS Nano 🗿&quot;
          </span>
        )}

        {distanceFromEarth > 600 && (
          <span className="text-red-500 font-bold animate-pulse">
            &quot;USER-35077: What if ... falls to 2k 💀&quot;
          </span>
        )}
      </div>

      <div className="mt-1 md:mt-2 text-[10px] md:text-xs text-gray-400">
        Fun fact: This Falcon Heavy runs on pure Nano. No fees, no fuel! ⚡
      </div>
    </div>
  );
};
