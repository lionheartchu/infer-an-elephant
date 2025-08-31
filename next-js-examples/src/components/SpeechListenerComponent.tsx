'use client'
import React, {useEffect, useImperativeHandle, useState, useRef} from 'react';

type Props = {
    onSpeechInterim?: (s: string) => void,
    onSpeechEnd?: (s: string) => void
    onDemand: boolean,
    languages?: string[], // New prop for multiple languages
}

export type SpeechListenerComponentHandle = {
    listenOnce: () => void;
    listening: (b: boolean) => void;
}

var recognition = null;
var mic_muted = false;

const SpeechListenerComponent  = React.forwardRef<SpeechListenerComponentHandle, Props> ((props, ref) => {
    const [talking, setTalking] = useState(false);
    const [speech, setSpeech] = useState('');
    const disconnected = useRef<boolean>(true);
    const listening = useRef<boolean>(false);
    const listen_once = useRef<boolean>(false);

    const onSpeechEnd = async (s: string) => {
        if((listening.current || props.onDemand) && s.trim().length > 0) {
            if(props.onSpeechEnd) props.onSpeechEnd(s);
            setTimeout(() => setSpeech(''), 300);
        }
        setTalking(false);
        if(props.onDemand && listen_once.current) {
            listening.current = false;
            listen_once.current = false;
            recognition!.stop();
        }
    }

    const onSpeechInterim = async (s: string)=> {
        if(listening.current || props.onDemand) {
            if(props.onSpeechInterim) props.onSpeechInterim(s);
            setSpeech(s);
        }
        setTalking(true);
    }

    useEffect(() => {
        if(disconnected.current) {
            // Setting up speech recognition
            // @ts-ignore
            recognition = new (window.SpeechRecognition || (window as any).webkitSpeechRecognition)();
            // recognition.continuous = true; // todo: hacky?
            recognition.interimResults = true;

            const defaultLanguages = ['en-US'];
            recognition.lang = props.languages?.join(',') || defaultLanguages.join(',');

            recognition.onresult = (event: any) => {
                let transcript = '';
                for(let i = 0; i < event.results.length; i++) {
                    transcript = transcript + ((i==0) ? '' : ' ') + event.results[i][0].transcript;
                }
    
                if(event.results[event.results.length - 1].isFinal) {
                    if(!mic_muted) onSpeechEnd(transcript);
                }
                else {
                    if(!mic_muted) onSpeechInterim(transcript);
                }
            };
            
            if(!props.onDemand) {
                recognition.start();
                recognition!.addEventListener('end', () => {
                    console.log('speech recognition service reconnecting');
                    try{
                        recognition!.start();
                    }
                    catch(e) {
                        console.log(e);
                    }
                });
                disconnected.current = true; // todo: don't remember why
            }

            return () => {
                recognition!.stop()
            }
        }
    }, []);

    useImperativeHandle(ref, () => ({
        listenOnce() {
            listen_once.current = true;
            listening.current = true;
            recognition!.start();
        },
        listening(b: boolean) {
            console.log('listening', b);
            listening.current = b; // todo: can't make state work :p
            setTalking(false);
        }
    }));
         
    return (
        <div className="absolute top-0 left-0 text-white">
        </div>
    );
});

export default SpeechListenerComponent;
