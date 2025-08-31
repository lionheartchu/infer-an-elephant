'use client'
import React from "react";
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleButtonClick = () => {
    router.push('/examples/vision');
  };

  return (
    <main className="flex flex-grow flex-col items-center" style={{paddingTop: '0vh'}}>
      <button 
          className={'absolute overflow-hidden bottom-0 mb-20 rounded-full justify-center items-center flex flex-col'} 
          style={{left: '50%', transform: 'translateX(-50%)', width: '9vh', height: '9vh', 
          backgroundColor: '#4262F033',                             
                  transition: 'opacity .25s ease-in-out'}}
          onClick={handleButtonClick}
      >
        <span>Start</span>
      </button>
    </main>
  );
}
