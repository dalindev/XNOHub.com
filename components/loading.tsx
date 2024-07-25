import React from 'react';
import Image from 'next/image';

const GifLoader = () => {
  return (
    <div className="flex flex-col justify-center items-center h-screen">
      <Image
        src="/xno_currencies.gif"
        alt="Loading..."
        width={800}
        height={262}
        className="w-1/2 h-auto"
      />
      <div className="text-[30px] w-full text-center m-10">
        Loading... Ӿ ...
      </div>
    </div>
  );
};

export default GifLoader;
