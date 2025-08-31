Arduino Nano and some other lines can be used with Edge Impulse: https://edgeimpulse.com/

You can run machine learning models trained on Edge Impulse. This is quite neat since you can collect different sensor data from your Arduino and train a model to run on your Arduino board. It requires a bit of setup 

1. setting up an arduino to collect data, 
2. training a model using the collected data
3. downloading the model and deploying it on your Arduino board. 

It looks complicated but once you have it going, it is a simple click through process.

Here is a list of compatible boards: https://docs.edgeimpulse.com/docs/readme/for-beginners

Arduino Nano RP2040 is useful since it has both Wifi and BLE, but needs some extra configurations. The files in this folder is what is needed to flash your RP2040 with. For detailed instructions, please see: https://docs.edgeimpulse.com/docs/edge-ai-hardware/mcu/raspberry-pi-pico