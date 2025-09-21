'use client'
import React, { useState, useCallback, useEffect } from 'react';

const SerialConnection = React.forwardRef(({ 
  onDataReceived, 
  onConnectionChange, 
  baudRate = 115200,
  className = '',
  style = {}
}, ref) => {
  // Serial API states
  const [port, setPort] = useState(null);
  const [reader, setReader] = useState(null);
  const [writer, setWriter] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messageBuffer, setMessageBuffer] = useState('');

  // Check if Web Serial API is supported
  const isWebSerialSupported = () => {
    return 'serial' in navigator;
  };

  // Read data from Arduino
  const readSerialData = useCallback(async (reader) => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('Serial reader done');
          break;
        }
        
        // Convert Uint8Array to string
        const data = new TextDecoder().decode(value);
        
        // Add new data to buffer
        setMessageBuffer(prev => {
          const updatedBuffer = prev + data;
          
          // Check for complete messages (ending with newline)
          const lines = updatedBuffer.split('\n');
          
          // Process complete lines (all but the last one)
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (line.length > 0) {
              console.log('Arduino message:', line);
              // Notify parent component about complete message
              onDataReceived?.(line, line);
            }
          }
          
          // Return the last incomplete line as the new buffer
          return lines[lines.length - 1];
        });
      }
    } catch (error) {
      console.error('Error reading serial data:', error);
      console.error('Error reading data from Arduino');
    }
  }, [onDataReceived]);

  // Connect to the selected serial port
  const connectToSerial = useCallback(async (portToUse = null) => {
    try {
      const targetPort = portToUse || port;
      if (!targetPort) {
        console.error('Please select a serial port first.');
        return;
      }

      await targetPort.open({ baudRate });
      
      const writer = targetPort.writable.getWriter();
      const reader = targetPort.readable.getReader();
      
      setWriter(writer);
      setReader(reader);
      setIsConnected(true);
      
      // Notify parent component about connection change
      onConnectionChange?.(true);
      
      // Start reading data from Arduino
      readSerialData(reader);
      
      console.log('Connected to serial port');
    } catch (error) {
      console.error('Error connecting to serial port:', error);
      console.error('Failed to connect to serial port. Make sure the Arduino is connected and the port is not in use.');
    }
  }, [port, baudRate, onConnectionChange, readSerialData]);

  // Request access to serial ports and automatically connect
  const requestSerialPort = useCallback(async () => {
    try {
      if (!isWebSerialSupported()) {
        console.error('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
        return;
      }
      const port = await navigator.serial.requestPort();
      setPort(port);
      console.log('Selected port:', port);
      
      // Automatically connect after port selection
      await connectToSerial(port);
      
      return port;
    } catch (error) {
      console.error('Error requesting serial port:', error);
      
      // Handle different types of errors
      if (error.name === 'NotFoundError') {
        console.error('No port selected. Please make sure to select a valid serial port from the dialog.');
      } else if (error.name === 'SecurityError') {
        console.error('Permission denied. Please allow access to serial ports.');
      } else if (error.name === 'NotSupportedError') {
        console.error('Web Serial API is not supported. Please use Chrome or Edge browser.');
      } else {
        console.error(`Failed to select serial port: ${error.message}`);
      }
    }
  }, [connectToSerial]);

  // Send data to Arduino
  const sendToArduino = useCallback(async (data) => {
    try {
      if (!writer || !isConnected) {
        console.error('Not connected to Arduino. Please connect first.');
        return false;
      }

      const encoder = new TextEncoder();
      const message = data + '\n';
      const encoded = encoder.encode(message);
      await writer.write(encoded);
      console.log('Sent to Arduino:', data);
      return true;
    } catch (error) {
      console.error('Error sending data to Arduino:', error);
      console.error('Error sending data to Arduino');
      return false;
    }
  }, [writer, isConnected]);

  // Disconnect from serial port
  const disconnectSerial = useCallback(async () => {
    try {
      if (reader) {
        await reader.cancel();
        setReader(null);
      }
      if (writer) {
        await writer.close();
        setWriter(null);
      }
      if (port) {
        await port.close();
        setPort(null);
      }
      setIsConnected(false);
      setMessageBuffer('');
      
      // Notify parent component about disconnection
      onConnectionChange?.(false);
      
      console.log('Disconnected from serial port');
    } catch (error) {
      console.error('Error disconnecting from serial port:', error);
      console.error('Error disconnecting from serial port');
    }
  }, [reader, writer, port, onConnectionChange]);

  // Expose sendToArduino function to parent component
  React.useImperativeHandle(ref, () => ({
    sendToArduino,
    isConnected
  }));

  return (
    <div className={className} style={style}>
      {/* Serial Connection Controls */}
      <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        marginBottom: '10px',
        flexWrap: 'wrap'
      }}>
        {!isConnected ? (
          <button
            onClick={requestSerialPort}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Connect to Arduino
          </button>
        ) : (
          <button
            onClick={disconnectSerial}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Disconnect
          </button>
        )}
        <div style={{
          color: 'white',
          fontSize: '14px',
          marginLeft: '10px'
        }}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

    </div>
  );
});

SerialConnection.displayName = 'SerialConnection';

export default SerialConnection;
