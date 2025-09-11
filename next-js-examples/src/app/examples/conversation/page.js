'use client'
import React, { useEffect, useRef, useState } from "react";
import SpeechGenerator, {SpeechGeneratorHandle} from '@/components/SpeechGenerator';
import { log } from '@/components/log';

export default function Home() {  
  const speechRef = useRef(null);

  const [gptResponse, setGptResponse] = useState(''); // Add state for GPT-4 response
  const [showDialog, setShowDialog] = useState(false); // State to control dialog visibility
  const [inputText, setInputText] = useState(''); // State for text input

  useEffect(() => {
    if(gptResponse) {
      // add assistant message to log
      log.addMessage({
          role: "assistant",
          content: [{ "type": "text", "text": gptResponse }]
      });

      speechRef.current.play(gptResponse);
      setShowDialog(true); // Show dialog when we have a response
    }
  }, [gptResponse]);

  const sendToOpenAI = async (prompt) => {
    // Add only the user message to log
      log.addMessage({
        role: "user",
        content: [{ "type": "text", "text": prompt }]
      });

    // get previous messages
    const previousMessages = log.getMessagesByRole(['user', 'assistant']);

    const dataToSend = {
      model: (process.env.LLM_HOST.includes('openai.com') ? '':'openai.') + 'gpt-4o-mini',
      messages: [
        {
          role: "system",
          content: "You are a fortune teller. You will read more that what the user asks for. Keep the response short and concise, below 50 words."
        },
        ...previousMessages,
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
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '70vw',
        maxHeight: '40vh',
        overflowY: 'auto',
        background: 'rgba(0, 0, 0, 0.8)',
        fontSize: '18px',
        color: 'white',
        zIndex: 1000,
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, wordWrap: 'break-word' }}>{gptResponse}</p>
      </div>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      if(inputText.trim() === '/history') {
        console.log(log.getMessagesByRole(['user', 'assistant']));
      }
      else {
        sendToOpenAI(inputText.trim());
      }
    }
    setInputText(''); // Clear input after sending
  };

  return (
    <main className="flex flex-grow flex-col items-center" style={{paddingTop: '0vh', paddingBottom: '0vh'}}>

      {showDialog && <DialogBox />}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type and press Enter..."
          style={{
            position: 'absolute',
            top: '75%',
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
      
      <SpeechGenerator ref={speechRef} onEnded={() => console.log('voice end')}></SpeechGenerator>
    </main>
  );
} 