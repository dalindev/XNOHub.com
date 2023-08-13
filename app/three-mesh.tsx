import React from 'react';
import ThreeGraticule from './three-graticule';
import ThreeCountries from './three-country';

const ThreeMesh = () => {
  return (
    <mesh>
      <sphereGeometry args={[1, 32]} />
      <meshPhongMaterial color="#191919" transparent={true} opacity={0.8} />
      <ThreeGraticule />
      <ThreeCountries />
    </mesh>
  );
};

export default ThreeMesh;
