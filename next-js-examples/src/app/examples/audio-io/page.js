'use client'
import React, { useEffect, useRef, useState } from "react";

import SpeechRecorderComponent from "@/components/SpeechRecorderComponent";

export default function Home() {  
  const recognitionRef = useRef(null);
  const audioRef = useRef(null); // New ref for audio element

  const [pressedRecord, setPressRecord] = useState(false); 
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(''); // New state for audio URL

  const sendToOpenAI = async (audioBase64) => {
    try {
      const llm_host = process.env.LLM_HOST + '/v1/chat/completions';
      const response = await fetch(llm_host, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: (process.env.LLM_HOST.includes('openai.com') ? '':'openai.') + "gpt-4o-audio-preview",
          modalities: ["text", "audio"],
          audio: { voice: "nova", format: "wav" },
          messages: [
            {
              role: "system",
              content: [
                { type: "text", text: "You are talking with a baby. Your responses should mimic the style and sound of the baby feeling like real conversation." },
              ]
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Respond to the sound in the clip." },
                { type: "input_audio", input_audio: { data: audioBase64, format: "wav" }}
              ]
            }
          ]
        })        
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("response from", llm_host, "received.");

      const data = await response.json(); // Parse the JSON response
      const base64Audio = data.choices[0].message.audio.data;
      
      // Convert base64 to Blob
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/wav' });
      
      // Create URL from Blob
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (error) {
      console.error('Error generating audio:', error);
    }
  };

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      
      // Play audio when it's ready
      const playAudio = () => {
        audioRef.current.play().catch(error => console.error('Error playing audio:', error));
      };

      audioRef.current.addEventListener('canplay', playAudio);

      // Cleanup function
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('canplay', playAudio);
        }
        URL.revokeObjectURL(audioUrl);
      };
    }
  }, [audioUrl]);

  const startRecording = () => {
    setIsRecording(true); // Toggle recording state

    // listen for one sound event
    recognitionRef.current?.startListening();

    // button response
    setPressRecord(true);
    setTimeout(() => setPressRecord(false), 300);
  };

  const onAudioRecorded = async (audioBase64) => {
    try {
      await sendToOpenAI(audioBase64);
    } catch (error) {
      console.error('Error sending audio to OpenAI:', error);
    }
  };

  return (
    <main className="flex flex-grow flex-col items-center" style={{paddingTop: '0vh', paddingBottom: '0vh'}}>

      <div className={'overflow-hidden justify-center items-center flex flex-col'} style={{
          position: 'absolute', 
          left: '50%', // Center horizontally
          top: '83%', // Center vertically
          transform: 'translate(-50%, -50%)', // Adjust position to truly center the element
          width: '80vh', 
          height: '9vh'
      }}>
        <button 
            className={'overflow-hidden rounded-full justify-center items-center flex flex-col'} 
            style={{
              width: '9vh', 
              height: '9vh', 
              border: '2px solid white', // White border for the ring
              borderRadius: '50%', // Fully rounded to form a circle
              background: 'transparent', // White background for the button
              opacity: (pressedRecord ? 0.4 : (isRecording ? 0.6 : 0.8)), // Dynamic opacity based on state
              transition: 'opacity .25s ease-in-out'
            }}
            onClick={startRecording}
        >
          <div style={{
            width: '8vh', 
            height: '8vh', 
            borderRadius: '50%', 
            background: 'white', // Black inner circle
            opacity: (pressedRecord ? 0.4 : (isRecording ? 0.6 : 0.8)), // Dynamic opacity based on state
            transition: 'opacity .25s ease-in-out'
          }}></div>
        </button>
      </div>
      
      <audio 
        ref={audioRef} 
        onEnded={() => {
          console.log('Audio playback ended');
        }} 
      />
      <SpeechRecorderComponent
        ref={recognitionRef}
        onAudioRecorded={onAudioRecorded}
      />
    </main>
  );
}
