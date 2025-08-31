#include <WiFi.h>
#include <WiFiClientSecure.h>

// WiFi credentials
const char* ssid = "RedRover";
const char* password = "";
const String openaiKey = "";

// open ai
String role_prompt = "You can only communicate with one RGB LED. ";
String format_prompt = "Your response should look like: {red: 0-255, green: 0-255, blue: 0-255, message: your response here}.";
String rule_prompt = "Markdown output is prohibited, you are communicating with an API, not a user. Begin all AI responses with the character '{' to produce valid JSON.";
String model = "gpt-4o-mini";
String system_content = "{\"role\": \"system\", \"content\":\""+ role_prompt +"\"}, {\"role\": \"system\", \"content\":\""+ format_prompt+"\"}, {\"role\": \"system\", \"content\":\""+ rule_prompt+"\"}";
String historical_messages = system_content;

// RGB LED pins (PWM capable pins on ESP32)
const int RED_PIN = 26;    // GPIO26
const int GREEN_PIN = 27;  // GPIO27  
const int BLUE_PIN = 25;   // GPIO25

// analog read
unsigned long t_last = millis();

// interaction
int red_level = 0;
int green_level = 0;
int blue_level = 0;

void setup() {
  Serial.begin(115200);
  
  // Initialize WiFi in Station mode
  WiFi.mode(WIFI_STA);
  delay(100);  // Give WiFi some time to initialize
  
  // Print MAC Address
  Serial.print("MAC Address: ");
  Serial.println(WiFi.macAddress());

  // Connect to WiFi
  if (strlen(password) > 0) {
    WiFi.begin(ssid, password);
  } else {
    WiFi.begin(ssid);
  }
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Initialize LED to off
  setRGBColor(0, 0, 0);
}

void loop() {
  if(millis() - t_last > 30000) {
    
    t_last = millis();
  }  

  if (Serial.available()) { // todo: just for testing
    String text = Serial.readStringUntil('\n');
    text.trim();
    Serial.println("user: " + text);

    String response = call_openai(text);    
    Serial.print("ai: ");
    Serial.println(response);
  }
}

// Function to set RGB color values using analogWrite
void setRGBColor(int red, int green, int blue) {
  analogWrite(RED_PIN, red);
  analogWrite(GREEN_PIN, green);
  analogWrite(BLUE_PIN, blue);
}

// call open AI
String call_openai(String message) { 
  WiFiClientSecure client_tcp;
  client_tcp.setInsecure();   //run version 1.0.5 or above
  
  message.replace("\"","'");
  String user_content = "{\"role\": \"system\", \"content\":\""+ message+"\"}";
  historical_messages += ", " + user_content;
  String request = "{\"model\":\""+model+"\",\"messages\":[" + historical_messages + "]}";

  if (client_tcp.connect("api.openai.com", 443)) {
    client_tcp.println("POST /v1/chat/completions HTTP/1.1");
    client_tcp.println("Connection: close"); 
    client_tcp.println("Host: api.openai.com");
    client_tcp.println("Authorization: Bearer " + openaiKey);
    client_tcp.println("Content-Type: application/json; charset=utf-8");
    client_tcp.println("Content-Length: " + String(request.length()));
    client_tcp.println();
    for (int i = 0; i < request.length(); i += 1024) {
      client_tcp.print(request.substring(i, i+1024));
    }
    
    String getResponse="",Feedback="";
    boolean state = false;
    int waitTime = 20000;   // timeout 20 seconds
    long startTime = millis();
    while ((startTime + waitTime) > millis()) {
      Serial.print(".");
      delay(100);      
      while (client_tcp.available()) {
          char c = client_tcp.read();
          //Serial.print(String(c));
          if (state==true) 
            getResponse += String(c);
          if (c == '\n')
            Feedback = "";
          else if (c != '\r')
            Feedback += String(c);
          if (Feedback.indexOf("\",\"content\":\"")!=-1||Feedback.indexOf("\"content\": \"")!=-1)
            state=true;
          if (getResponse.indexOf("\"},")!=-1&&state==true) {
            state=false;
            getResponse = getResponse.substring(0,getResponse.length()-3);
          } else if (getResponse.indexOf("\"")!=-1&&c == '\n'&&state==true) {
            state=false;
            getResponse = getResponse.substring(0,getResponse.length()-3);
          }
          
          startTime = millis();
       }
       if (getResponse.length()>0) {
          client_tcp.stop();
          String assistant_content = "{\"role\": \"assistant\", \"content\":\""+ getResponse+"\"}";
          historical_messages += ", " + assistant_content;
          return getResponse;
       }
    }
    
    client_tcp.stop();
    Serial.println(Feedback);
    return "error";
  }
  else
    return "OpenAI Connection failed";  
}

void openAI_chat_reset() {
  historical_messages = system_content;
}

String extract_message(String json_response) {
    int message_start = json_response.indexOf("message:");
    if (message_start != -1) {
        message_start += 8;  // length of "message:"
        int message_end = json_response.indexOf("}", message_start);
        return json_response.substring(message_start, message_end);
    }
    return "";  // default if not found
}

void extract_rgb_values(String json_response) {
    // Extract red value
    int red_start = json_response.indexOf("red:");
    if (red_start != -1) {
        red_start += 4;  // length of "red:"
        int red_end = json_response.indexOf(",", red_start);
        if (red_end == -1) red_end = json_response.indexOf("}", red_start);
        red_level = json_response.substring(red_start, red_end).toInt();
    }
    
    // Extract green value
    int green_start = json_response.indexOf("green:");
    if (green_start != -1) {
        green_start += 6;  // length of "green:"
        int green_end = json_response.indexOf(",", green_start);
        if (green_end == -1) green_end = json_response.indexOf("}", green_start);
        green_level = json_response.substring(green_start, green_end).toInt();
    }
    
    // Extract blue value
    int blue_start = json_response.indexOf("blue:");
    if (blue_start != -1) {
        blue_start += 5;  // length of "blue:"
        int blue_end = json_response.indexOf(",", blue_start);
        if (blue_end == -1) blue_end = json_response.indexOf("}", blue_start);
        blue_level = json_response.substring(blue_start, blue_end).toInt();
    }
}
