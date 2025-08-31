import os
import time
import ssl
import binascii
import wifi
import vectorio
import socketpool
import adafruit_requests
import displayio
from jpegio import JpegDecoder
from adafruit_display_text import label, wrap_text_to_lines
import terminalio
import adafruit_pycamera
import usb_cdc

# scale for displaying returned text from OpenAI
text_scale = 2

# OpenAI key and prompts from settings.toml
openai_api_key = os.getenv("OPENAI_API_KEY")
prompt = "how many people are in this image?"

def main():
    # Add serial console setup
    serial = usb_cdc.console
    
    # Setup display and camera first
    global requests, palette, pycam, decoder
    pool = socketpool.SocketPool(wifi.radio)
    requests = adafruit_requests.Session(pool, ssl.create_default_context())
    
    # Create palette for display
    palette = displayio.Palette(1)
    palette[0] = 0x000000
    
    # Initialize camera and display components
    pycam = setup_camera()
        
    # Connect to WiFi
    setup_wifi(serial)
    
    # ui state
    view = False

    # Main loop
    while True:
        handle_camera_loop(pycam, view)

def setup_wifi(serial):
    serial.write(b'\n')
    serial.write(f"MAC Address: {[hex(i) for i in wifi.radio.mac_address]}\n".encode())
    serial.write(b"Connecting to WiFi\n")

    ssid = "RedRover"
    password = ""

    if password is None or password.strip() == "":
        serial.write(b"Connecting to open network...\n")
        wifi.radio.connect(ssid)
    else:
        serial.write(b"Connecting with password...\n")
        wifi.radio.connect(ssid, password)
    
    serial.write(b"Connected to WiFi\n")

def setup_camera():
    # create a palette for the display
    palette = displayio.Palette(1)
    palette[0] = 0x000000

    pycam = adafruit_pycamera.PyCamera()  # Use our custom class instead
    
    pycam.mode = 0
    pycam.resolution = 1
    pycam.effect = 0

    # Setup bottom bar with prompt label
    rect = vectorio.Rectangle(pixel_shader=palette, width=240, height=20, x=0, y=0)
    prompt_txt = label.Label(
        terminalio.FONT, text=open_ai_prompt, color=0xFF0055, x=10, y=15, scale=2
    )
    pycam._botbar.append(rect)
    pycam._botbar.append(prompt_txt)
    pycam.display.refresh()
    
    return pycam

def handle_camera_loop(pycam, view):
    pycam.keys_debounce()

    if pycam.shutter.long_press:
        pycam.autofocus()      

    if pycam.shutter.short_count:
        try:
            pycam.display_message("snap", color=0x00DD00)
            pycam.capture_jpeg()
            pycam.live_preview_mode()
        except TypeError as exception:
            pycam.display_message("Failed", color=0xFF0000)
            time.sleep(0.5)
            pycam.live_preview_mode()
        except RuntimeError as exception:
            pycam.display_message("Error\nNo SD Card", color=0xFF0000)
            time.sleep(0.5)
        all_images = [
        f"/sd/{filename}"
        for filename in os.listdir("/sd")
        if filename.lower().endswith(".jpg")
        ]
        all_images.sort(key=lambda f: int(''.join(filter(str.isdigit, f))))
        the_image = all_images[-1]
        pycam.display_message("thinking...", color=0x00DD00)
        send_img(the_image, open_ai_prompt)
        view = True  

    if pycam.ok.fell:
        if view:
            pycam.splash.pop()
            pycam.splash.pop()
            pycam.display.refresh()
            view = False

# encode jpeg to base64 for OpenAI
def encode_image(image_path):
    with open(image_path, 'rb') as image_file:
        image_data = image_file.read()
        base64_encoded_data = binascii.b2a_base64(image_data).decode('utf-8').rstrip()
        return base64_encoded_data

# view returned text on MEMENTO screen
def view_text(the_text):
    rectangle = vectorio.Rectangle(pixel_shader=palette, width=240, height=240, x=0, y=0)
    pycam.splash.append(rectangle)
    the_text = "\n".join(wrap_text_to_lines(the_text, 20))
    if prompt_index == 1:
        the_text = the_text.replace("*", "\n")
    text_area = label.Label(terminalio.FONT, text=the_text,
                            color=0xFFFFFF, x=2, y=10, scale=text_scale)
    pycam.splash.append(text_area)
    pycam.display.refresh()

# send image to OpenAI, print the returned text and save it as a text file
def send_img(img, prompt):
    base64_image = encode_image(img)
    headers = {
      "Content-Type": "application/json",
      "Authorization": f"Bearer {openai_api_key}"
    }
    payload = {
      "model": "gpt-4o-mini",
      "messages": [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": f"{prompt}"
            },
            {
              "type": "image_url",
              "image_url": {
                "url": f"data:image/jpeg;base64,{base64_image}"
              }
            }
          ]
        }
      ],
      "max_tokens": 300
    }
    response = requests.post("https://api.openai.com/v1/chat/completions",
                             headers=headers, json=payload)
    json_openai = response.json()
    response_text = json_openai['choices'][0]['message']['content']
    print(response_text)
        
    view_text(response_text)

# view images on sd card to re-send to OpenAI
def load_image(bit, file):
    bit.fill(0b00000_000000_00000)  # fill with a middle grey
    decoder.open(file)
    decoder.decode(bit, scale=0, x=0, y=0)
    pycam.blit(bit, y_offset=32)
    pycam.display.refresh()

if __name__ == "__main__":
    main()
