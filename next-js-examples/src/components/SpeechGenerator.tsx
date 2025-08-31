'use client'
import React, {useEffect, useState, useImperativeHandle} from 'react';

type Props = {
    onEnded: () => void,
}

const use_voice = true;
const default_voice = "nova" // OpenAI default voice

export type SpeechGeneratorHandle = {
    play: (text: string) => void;
    setVoice: (v: string) => void;
}

async function textToSpeech(voice: string, apiKey: string, message: string): Promise<Response> {
    const url = process.env.LLM_HOST + '/v1/audio/speech';
    const body = {
        model: (process.env.LLM_HOST!.includes('openai.com') ? 'tts-1':'openai.tts'),
        input: message,
        voice: voice,
    };
    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return response;
    } catch (error) {
        console.error('Fetch error: ', error);
        throw error;
    }
}

const SpeechGenerator = React.forwardRef<SpeechGeneratorHandle, Props> ((props, ref) => {
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const [voice, setVoice] = useState<string>(default_voice);

    const onEnded = async() => {
        props.onEnded();
        setAudioSrc(null);
    }

    useImperativeHandle(ref, () => ({
        async play(text: string) {
            if(use_voice) {
                if(text.length > 0) {
                    const fetchAudio = async () => {
                        try {
                            if (!process.env.OPENAI_API_KEY) return
                            const response = await textToSpeech(voice, process.env.OPENAI_API_KEY, text);
                            if (!response.ok) {
                                throw new Error('Failed response received');
                            }
            
                            const blob = await response.blob();
                            const objectURL = URL.createObjectURL(blob);
                            setAudioSrc(objectURL);
                        } catch (error) {
                            console.error('Fetch failed with ', error);
                        }
                    };
            
                    fetchAudio().then();

                    // Clean up the object URL on component unmount
                    return () => {
                        if (audioSrc) URL.revokeObjectURL(audioSrc);
                    };
                }
            }
            else {
                setTimeout(() => onEnded(), 1000)
            }

        },
        setVoice(v: string) {
            console.log('setting voice:', v);
            setVoice(v);
        }
      }));
    

    useEffect(() => {
    }, []);

    return (
        <div className="text-white"> 
            {/*<div>
                <Typography variant="h2">{text}</Typography>
            </div>*/}
            {audioSrc && (
                // todo: note this won't actually autoplay unless you interact with the UI first
                <audio src={audioSrc} onEnded={onEnded} autoPlay style={{display: 'none'}}>
                    Your browser does not support the audio tag.
                </audio>
            )}
        </div>
    )
});

export default SpeechGenerator
