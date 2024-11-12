import React from 'react';

const GifLoader = () => {
  return (
    <div className="flex flex-col justify-center items-center h-screen">
      <img
        src="https://media1.tenor.com/m/nF-Dj_7JpX4AAAAd/memes-meme.gif"
        alt="Loading..."
        width={640}
        height={360}
        className="w-1/2 h-auto"
      />
      <div className="text-[30px] w-full text-center m-10">
        Connecting to Banano... 🍌🍌🍌
      </div>
    </div>
  );
};

export default GifLoader;
