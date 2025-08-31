'use client'
import React, { useEffect, useRef, useState } from "react";
import SpeechGenerator, {SpeechGeneratorHandle} from '@/components/SpeechGenerator';
import SpeechListenerComponent, {SpeechListenerComponentHandle} from "@/components/SpeechListenerComponent";

export default function Home() {  
  const recognitionRef = useRef(null);
  const speechRef = useRef(null);
  const videoRef = useRef(null); // Added useRef for video element

  const [pressedRecord, setPressRecord] = useState(false); 
  const [isRecording, setIsRecording] = useState(false);
  const [gptResponse, setGptResponse] = useState(''); // Add state for GPT-4 response
  const [messages, setMessages] = useState([]);
  const [showDialog, setShowDialog] = useState(false); // State to control dialog visibility

  useEffect(() => {

    const startWebcam = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const backCamera = devices.find(device => device.kind === 'videoinput' && device.label.toLowerCase().includes('back'));
    
        if (backCamera) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: backCamera.deviceId } } // Use the back camera
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { } // Request the back camera
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        }
      } catch (error) {
        console.error('Error accessing webcam:', error);
      }
    };

    startWebcam();
  }, []);

  useEffect(() => {
    if(gptResponse) {
      console.log("gptResponse:", gptResponse);
      const json = JSON.parse(gptResponse);
      if (json && json.request && json.response) {
        setMessages(prevMessages => [...prevMessages, {
          request: json.request,
          response: json.response
        }]);

        speechRef.current.play(json.response);
      }
    }
  }, [gptResponse]);


  const startProcessingVideo = (prompt) => {
    console.log('start processing video');
    sendFrameToOpenAI(prompt);
  };

  const sendFrameToOpenAI = async (prompt) => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const capturedFrameBase64 = canvas.toDataURL('image/png');

    const dataToSend = {
      model: (process.env.LLM_HOST.includes('openai.com') ? '':'openai.') + 'gpt-4o-mini',
      messages: [
        {
          role: "user",
          content: [
            {
              "type": "text",
              "text":  "markdown output is prohibited, you are communicating with an API, not a user. Begin all AI responses with the character '{' to produce valid JSON."
            },
            {
              "type": 'text',
              "text": `Please respond to user request "${prompt}" in a format of: {request: very short description, response: short response in a sentence or two}`
            },
            {
              "type": 'image_url',
              "image_url": {
                "url": capturedFrameBase64
              }
            }
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Response from', llm_host, ":", responseData.choices[0].message.content);
      setGptResponse(responseData.choices[0].message.content); // Update state with GPT-4 response
    } catch (error) {
      console.error('Error sending data to GPT-4:', error);
    }
  };

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].response) {
      setShowDialog(true); // Show dialog if last message has a response
    } else {
      setShowDialog(false); // Hide dialog otherwise
    }
  }, [messages]); // Dependency on messages to update dialog visibility

  const DialogBox = () => {
    const maxCharacters = 300; // Maximum number of characters to display
    const lastMessage = messages[messages.length - 1].response;
    const displayedMessage = lastMessage.length > maxCharacters ? lastMessage.slice(0, maxCharacters) + '...' : lastMessage;

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
        <p>{displayedMessage}</p>
      </div>
    );
  };
  
  const onVoiceEnd = () => {
    console.log('voice end');
  }

  const onSpeechEnd = async (prompt) => {
    console.log(prompt);
    setIsRecording(false);
    startProcessingVideo(prompt);
  };

  const startRecording = () => {
    setIsRecording(true); // Toggle recording state

    // listen for one sound event
    recognitionRef.current?.listenOnce();

    // button response
    setPressRecord(true);
    setTimeout(() => setPressRecord(false), 300);
  };

  return (
    <main className="flex flex-grow flex-col items-center" style={{paddingTop: '0vh', paddingBottom: '0vh'}}>
      
      <div style={{position: 'relative', width: '100vw', height: '80vh', top: '10vh'}}>
        <video ref={videoRef} id="webcamElement" autoPlay playsInline style={{
          position: 'absolute', 
          width: '100vw', 
          height: '80vh', // Adjusted height
          left: '50%', 
          top: '0%', // Aligned to the top
          transform: 'translateX(-50%)', 
          objectFit: 'cover',
          borderRadius: '20px', // Rounded corners at the bottom left
        }}></video>
      </div>

      {showDialog && <DialogBox />}

      <div className={'overflow-hidden justify-center items-center flex flex-col'} style={{
          position: 'absolute', 
          left: '50%', // Center horizontally
          top: '83%', // Center vertically
          transform: 'translate(-50%, -50%)', // Adjust position to truly center the element
          width: '9vh', 
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

      <SpeechGenerator ref={speechRef} onEnded={onVoiceEnd}></SpeechGenerator>
      <SpeechListenerComponent ref={recognitionRef} onSpeechEnd={onSpeechEnd} onDemand={true} />
    </main>
  );
}
