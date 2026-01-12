import React from 'react';
import QuickSendCard from '../components/dashboard/QuickSend';
import BestPractices from '../components/dashboard/BestPractices';
const SendPage = () => {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 pt-16">
        <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">Flash</span> Message
      </h1>
      <div className="max-w-5xl">
        {/* We are reusing the component we already built! */}
        <QuickSendCard />
        <BestPractices/>
      </div>
    </>
  );
};

export default SendPage;
