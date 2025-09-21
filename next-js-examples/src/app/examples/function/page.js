'use client'
import React, { useEffect, useRef, useState } from "react";
import SpeechGenerator, {SpeechGeneratorHandle} from '@/components/SpeechGenerator';

export default function Home() {  
  const speechRef = useRef(null);
  const videoRef = useRef(null); // Added useRef for video element

  const [gptResponse, setGptResponse] = useState(''); // Add state for GPT-4 response
  const [messages, setMessages] = useState([]);
  const [showDialog, setShowDialog] = useState(false); // State to control dialog visibility
  const [inputText, setInputText] = useState(''); // State for text input

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
              "text": `Please respond to user request "${prompt}" in a format of: {request: very short description, response: in number or simple word(s)}`
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
      const responseData = await response.json();
      console.log('Response from', llm_host, ":", responseData.choices[0].message.content);
      setGptResponse(responseData.choices[0].message.content); // Update state with GPT-4 response
    } catch (error) {
      console.error('Error sending data to GPT-4:', error);
    }
  };

  const onVoiceEnd = () => {
    console.log('voice end');
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
    const lastMessage = messages[messages.length - 1];
    const request = lastMessage.request;
    const response = lastMessage.response;
    
    const displayedRequest = request.length > maxCharacters ? request.slice(0, maxCharacters) + '...' : request;
    const displayedResponse = response.length > maxCharacters ? response.slice(0, maxCharacters) + '...' : response;

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
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#4CAF50' }}>Request:</strong>
          <p style={{ margin: '5px 0 0 0', wordWrap: 'break-word' }}>{displayedRequest}</p>
        </div>
        <div>
          <strong style={{ color: '#2196F3' }}>Answer:</strong>
          <p style={{ margin: '5px 0 0 0', wordWrap: 'break-word' }}>{displayedResponse}</p>
        </div>
      </div>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendFrameToOpenAI(inputText.trim());
      setInputText(''); // Clear input after sending
    }
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type and press Enter..."
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
      
      <SpeechGenerator ref={speechRef} onEnded={onVoiceEnd}></SpeechGenerator>
    </main>
  );
}
