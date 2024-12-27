import { useState } from 'react';

const ComingSoon = () => {
  return (
    <div className="relative w-[700px]">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover rounded-lg"
      >
        <source src="/BUXspades_web.mp4" type="video/mp4" />
        <source src="/BUXspades.mov" type="video/quicktime" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default ComingSoon; 