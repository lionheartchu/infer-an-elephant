'use client'
import React, {useEffect, useImperativeHandle, useState, useRef} from 'react';
import { Buffer } from 'buffer';
import WavEncoder from 'wav-encoder'; // You'll need to install this package

type Props = {
    onAudioRecorded?: (audioBase64: string) => void,
    microphoneDeviceId?: string,
}

export type SpeechRecorderComponentHandle = {
    startListening: () => void;
}

const loadScript = (src: string) => {
    return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
    });
};

let myvad: any; // Declare myvad as a global variable

const SpeechRecorderComponent = React.forwardRef<SpeechRecorderComponentHandle, Props>((props, ref) => {
    const listening = useRef<boolean>(false);
    const recording = useRef<boolean>(false);
    const audioChunks = useRef<Blob[]>([]);
    const mediaRecorder = useRef<MediaRecorder | null>(null);

    useEffect(() => {
        const loadVAD = async () => {
            try {
                // Stop the previous instance of myvad if it exists
                if (myvad) {
                    myvad.stop();
                }

                await loadScript('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/ort.js');
                await loadScript('https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.19/dist/bundle.min.js');

                myvad = await (window as any).vad.MicVAD.new({
                    onSpeechStart: () => {
                        console.log("Speech start detected");
                    },
                    onSpeechEnd: (audio: Float32Array) => {
                        console.log("Speech end detected");
                        if (listening.current && recording.current) stopRecording();
                    }
                });

                myvad.start();
            } catch (error) {
                console.error('Error loading VAD scripts:', error);
            }
        };

        loadVAD();

        return () => {
            if (myvad) {
                myvad.stop(); // Ensure VAD is stopped
            }
            if (mediaRecorder.current) {
                mediaRecorder.current.stop();
            }
        };
    }, []); // Empty dependency array to run only once on mount

    const startListening = async () => {
        listening.current = true;
        if (!recording.current) startRecording();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: props.microphoneDeviceId ? { exact: props.microphoneDeviceId } : undefined }
            });

            // Create an AudioContext and connect it to the stream
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);

            source.connect(processor);
            processor.connect(audioContext.destination);

            let audioData: Float32Array[] = [];

            processor.onaudioprocess = (e) => {
                const channelData = e.inputBuffer.getChannelData(0);
                audioData.push(new Float32Array(channelData));
            };

            recording.current = true;

            // Store the cleanup function
            const stopRecording = () => {
                source.disconnect();
                processor.disconnect();
                audioContext.close();
                recording.current = false;
                listening.current = false;

                // Convert audio data to WAV
                const mergedData = mergeBuffers(audioData, audioData.length * 4096);
                const wavData = {
                    sampleRate: audioContext.sampleRate,
                    channelData: [mergedData]
                };

                WavEncoder.encode(wavData).then((buffer: ArrayBuffer) => {
                    const audioBase64 = Buffer.from(buffer).toString('base64');
                    if (props.onAudioRecorded) props.onAudioRecorded(audioBase64);
                });

                audioData = []; // Clear the audio data
            };

            // Store the stopRecording function for later use
            mediaRecorder.current = { stop: stopRecording } as any;
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    };

    // Helper function to merge audio buffers
    const mergeBuffers = (bufferArray: Float32Array[], recLength: number): Float32Array => {
        const result = new Float32Array(recLength);
        let offset = 0;
        for (let i = 0; i < bufferArray.length; i++) {
            result.set(bufferArray[i], offset);
            offset += bufferArray[i].length;
        }
        return result;
    };

    const stopRecording = () => {
        if (mediaRecorder.current) {
            mediaRecorder.current.stop();
            recording.current = false;
            listening.current = false;
        }
    };

    useImperativeHandle(ref, () => ({
        startListening,
    }));

    return (
        <div className="absolute top-0 left-0 text-white">
        </div>
    );
});

export default SpeechRecorderComponent;
