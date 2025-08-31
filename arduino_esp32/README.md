This folder includes examples for Arduino ESP32 -- particularly Adafruit ESP32 Feather board (https://www.adafruit.com/product/5477). For smaller form factor Seeedstudio Xiao (https://wiki.seeedstudio.com/XIAO_ESP32C3_Getting_Started/) is also a good microcontroller to use.

## Installing Boards for Arduino IDE

Go to Preferences.

In "Additional Boards Manager URLs" add the urls for respective boards:

```bash
https://espressif.github.io/arduino-esp32/package_esp32_index.json (for Adafruit ESP32 Feather)

https://jihulab.com/esp-mirror/espressif/arduino-esp32.git (for Seeedstudio Xiao)
```

For any other microcontrollers, this is where you can add urls for their firmware.

Then Go to Boards Manager.

```bash
install "esp32" by Espressif Systems.
```

## Register your board on Cornell Wifi
[Instruction](../redrover.md)

## List of examples
- gpt-esp32: chat with Open AI GPT model through serial monitor
- led-esp32: chat agent responding with RGB light
