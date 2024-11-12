import React from 'react';

const GifLoader = () => {
  return (
    <div className="flex flex-col justify-center items-center h-screen">
      <img
        src="/xno_currencies_mini.gif"
        alt="Loading..."
        width={800}
        height={262}
        className="w-[90%] lg:w-1/2 h-auto"
      />
      <div className="text-[20px] w-full text-center m-10">
        Connecting to NanoCurrency Network... 💰
      </div>
    </div>
  );
};

export default GifLoader;
