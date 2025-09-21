'use client'
import React, { useEffect, useRef, useState } from "react";
import SerialConnection from "@/components/SerialConnection";

export default function Home() {  
  const speechRef = useRef(null);

  const [gptResponse, setGptResponse] = useState(''); // Add state for GPT-4 response
  const [showDialog, setShowDialog] = useState(false); // State to control dialog visibility
  const [inputText, setInputText] = useState(''); // State for text input
  const [isSerialConnected, setIsSerialConnected] = useState(false); // Track serial connection
  const serialRef = useRef(null); // Reference to serial component
  
  useEffect(() => {
    if(gptResponse) {
      setShowDialog(true); // Show dialog when we have a response
    }
  }, [gptResponse]);

  const sendToOpenAI = async (prompt) => {

    const dataToSend = {
      model: (process.env.LLM_HOST.includes('openai.com') ? '':'openai.') + 'gpt-4o-mini',
      messages: [
        {
          role: "user",
          content: [
            {
              "type": "text",
              "text":  prompt
            },
          ]
        }
      ]
    };

    try {
      const llm_host = process.env.LLM_HOST + '/v1/chat/completions';
      const response = await fetch(llm_host, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(dataToSend)
      });
      const responseData = await response.json();
      console.log('Response from', llm_host, ":", responseData.choices[0].message.content);
      setGptResponse(responseData.choices[0].message.content); // Update state with GPT-4 response
    } catch (error) {
      console.error('Error sending data to GPT-4:', error);
    }
  };

  const DialogBox = () => {
    return (
      <div style={{
        position: 'absolute',
        top: '73%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '70vw',
        background: 'transparent',
        fontSize: '20px',
        color: 'white',
        zIndex: 1000,
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, wordWrap: 'break-word' }}>{gptResponse}</p>
      </div>
    );
  };

  // Handle serial data received from Arduino
  const handleSerialData = (newData, fullData) => {
    // Process Arduino data with AI if it contains meaningful content
    if (newData.trim().length > 0) {
      console.log('Arduino:', newData);
      // Uncomment to enable AI processing of Arduino data
      // sendToOpenAI(`Arduino sent: ${newData}`);
    }
  };

  // Handle serial connection changes
  const handleSerialConnection = (connected) => {
    setIsSerialConnected(connected);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {      
      // Also send to Arduino if connected
      if (isSerialConnected && serialRef.current) {
        serialRef.current.sendToArduino(inputText.trim());
      }
      else {
        // Send to AI
        sendToOpenAI(inputText.trim());
      }
      
      setInputText(''); // Clear input after sending
    }
  };
  return (
    <main className="flex flex-grow flex-col items-center" style={{paddingTop: '0vh', paddingBottom: '0vh'}}>

      {showDialog && <DialogBox />}

      {/* Serial Connection Component */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90vw',
        zIndex: 100
      }}>
        <SerialConnection
          ref={serialRef}
          onDataReceived={handleSerialData}
          onConnectionChange={handleSerialConnection}
          baudRate={115200}
        />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isSerialConnected ? "Type message for AI and Arduino..." : "Type message for AI..."}
          style={{
            position: 'absolute',
            top: '85%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90vw',
            padding: '12px 14px',
            fontSize: '16px',
            border: '1px solid white',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            outline: 'none',
            textAlign: 'left',
          }}
        />
      </form>
    </main>
  );
}
