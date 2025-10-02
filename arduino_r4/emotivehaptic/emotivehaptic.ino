#include <WiFiS3.h>

// WiFi credentials
const char* wifi_ssid = "RedRover";
const char* wifi_password = "";

// OpenAI API Key
String openaiKey = "";

// Haptic motor pin (PWM capable pin)
const int HAPTIC_PIN = 10;  // Change this to your actual haptic motor pin

// ChatGPT with emotion instruction
String role = "You are a helpful assistant. Always end your response with your emotional state as a number from 0-100 in this exact format: [EMOTION:XX] where XX is the number. 0 means very unhappy/sad, 50 is neutral, 100 means very happy/excited.";
String model = "openai.gpt-4o-mini";
String system_content = "{\"role\": \"system\", \"content\":\""+ role +"\"}";
String historical_messages = system_content;

WiFiSSLClient client;

void setup() 
{
  Serial.begin(115200);
  while (!Serial) {
    ; // wait for serial port to connect
  }
  delay(1000);
  
  // initialize WiFi
  initWiFi();

  // initialize haptic motor pin
  pinMode(HAPTIC_PIN, OUTPUT);
  analogWrite(HAPTIC_PIN, 0); // Start with motor off
  
  Serial.println("Type to ask openai. The AI will respond with haptic feedback based on its emotional state!");
}

void loop()
{
  if(Serial.available()){
    String val = Serial.readStringUntil('\n');
    val.trim();

    Serial.print("user: ");
    Serial.println(val);
    Serial.print("ai: ");
    
    String aiResponse = openAI_chat(val);
    
    // Extract emotion value and clean response
    int emotionValue = extractEmotion(aiResponse);
    String cleanResponse = removeEmotionTag(aiResponse);
    
    Serial.println(cleanResponse);
    Serial.print("emotion level: ");
    Serial.print(emotionValue);
    Serial.println("/100");
    
    // Apply haptic feedback based on emotion
    applyHapticFeedback(emotionValue);
  }  
}

// Extract emotion value from AI response
int extractEmotion(String response) {
  int emotionIndex = response.indexOf("[EMOTION:");
  if (emotionIndex >= 0) {
    int startNum = emotionIndex + 9; // Length of "[EMOTION:"
    int endBracket = response.indexOf("]", startNum);
    if (endBracket > startNum) {
      String emotionStr = response.substring(startNum, endBracket);
      emotionStr.trim();
      int emotion = emotionStr.toInt();
      
      // Validate emotion range
      if (emotion < 0) emotion = 0;
      if (emotion > 100) emotion = 100;
      
      return emotion;
    }
  }
  
  // Default to neutral if no emotion tag found
  return 50;
}

// Remove emotion tag from response for clean display
String removeEmotionTag(String response) {
  int emotionIndex = response.indexOf("[EMOTION:");
  if (emotionIndex >= 0) {
    int endBracket = response.indexOf("]", emotionIndex);
    if (endBracket >= 0) {
      String cleanResponse = response.substring(0, emotionIndex) + 
                           response.substring(endBracket + 1);
      cleanResponse.trim();
      return cleanResponse;
    }
  }
  return response;
}

// Apply haptic feedback based on emotion level
void applyHapticFeedback(int emotionLevel) {
  int intensity = map(emotionLevel, 0, 100, 160, 255); // Minimum 50 for noticeable vibration
  
  // Map emotion to vibration pattern
  if (emotionLevel <= 20) {
    for (int i = 0; i < 4; i++) {
      analogWrite(HAPTIC_PIN, intensity);
      delay(400);
      analogWrite(HAPTIC_PIN, 0);
      delay(1500);
    }
  }
  else if (emotionLevel <= 40) {
    analogWrite(HAPTIC_PIN, intensity);
    delay(600);
    analogWrite(HAPTIC_PIN, 0);
    delay(1000);
    analogWrite(HAPTIC_PIN, intensity);
    delay(600);
    analogWrite(HAPTIC_PIN, 0);
    delay(1000);
  }
  else if (emotionLevel <= 60) {
    analogWrite(HAPTIC_PIN, intensity);
    delay(400);
    analogWrite(HAPTIC_PIN, 0);
    delay(200);
    analogWrite(HAPTIC_PIN, intensity);
    delay(400);
    analogWrite(HAPTIC_PIN, 0);
    delay(200);
  }
  else if (emotionLevel <= 80) {
    for (int i = 0; i < 10; i++) {
      analogWrite(HAPTIC_PIN, intensity);
      delay(150);
      analogWrite(HAPTIC_PIN, 0);
      delay(100);
    }
  }
  else {
    for (int i = 0; i < 8; i++) {
      analogWrite(HAPTIC_PIN, intensity);
      delay(100);
      analogWrite(HAPTIC_PIN, 0);
      delay(60);
    }
  }
  
  // Ensure motor is off after pattern
  analogWrite(HAPTIC_PIN, 0);
}


// *************************************************************
// Don't worry about the code below this line
// *************************************************************

void initWiFi() {
  Serial.print("Connecting to ");
  Serial.println(wifi_ssid);
  delay(200);

  if (strlen(wifi_password) > 0){
    WiFi.begin(wifi_ssid, wifi_password);
  }
  else{
    WiFi.begin(wifi_ssid);
  }

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected");
    delay(200);
  } else {
    Serial.println("Failed to connect to WiFi");
  }
}

String openAI_chat(String message) { 
  const char* server = "api.ai.it.cornell.edu";
  const int httpsPort = 443;

  if (client.connect(server, httpsPort)) {
    Serial.println("connected to api.ai.it.cornell.edu");

    // Properly escape JSON special characters
    message.replace("\\", "\\\\");
    message.replace("\"", "\\\"");
    message.replace("\n", "\\n");
    
    String user_content = "{\"role\": \"user\", \"content\":\"" + message + "\"}";
    historical_messages += ", " + user_content;
    
    String request = "{\"model\":\"" + model + "\",\"messages\":[" + historical_messages + "]}";

    // HTTP request
    client.println("POST /v1/chat/completions HTTP/1.1");
    client.println("Host: api.ai.it.cornell.edu");
    client.println("Authorization: Bearer " + openaiKey);
    client.println("Content-Type: application/json; charset=utf-8");
    client.println("Content-Length: " + String(request.length()));
    client.println("Connection: close");
    client.println();
    client.print(request);

    // Wait for response (with timeout)
    unsigned long timeout = millis();
    while (client.connected() && millis() - timeout < 10000) {
      if (client.available()) {
        break;
      }
      delay(10);
    }

    // Read the response
    String response = "";
    timeout = millis();
    
    // Skip HTTP headers
    while (client.connected() && millis() - timeout < 10000) {
      if (client.available()) {
        String line = client.readStringUntil('\n');
        if (line == "\r") {
          break;
        }
        timeout = millis();
      }
    }
    
    // Read the body
    timeout = millis();
    while (client.connected() && millis() - timeout < 10000) {
      if (client.available()) {
        response += client.readStringUntil('\n');
        timeout = millis();
      } else if (!client.available() && millis() - timeout > 1000) {
        break;
      }
    }
    
    client.stop();
    
    // Extract content from the JSON response
    int contentIndex = response.indexOf("\"content\"");
    if (contentIndex > 0) {
      int startQuote = response.indexOf("\"", contentIndex + 10);
      if (startQuote > 0) {
        int endQuote = response.indexOf("\"", startQuote + 1);
        if (endQuote > 0) {
          String content = response.substring(startQuote + 1, endQuote);
          
          // Unescape the special characters
          content.replace("\\n", "\n");
          content.replace("\\\"", "\"");
          content.replace("\\\\", "\\");
          
          // Add to history - keep the escaped version for JSON
          String escapedContent = content;
          escapedContent.replace("\\", "\\\\");
          escapedContent.replace("\"", "\\\"");
          escapedContent.replace("\n", "\\n");
          String assistant_content = "{\"role\": \"assistant\", \"content\":\"" + escapedContent + "\"}";
          historical_messages += ", " + assistant_content;
          
          return content;
        }
      }
    }
    
    return "Error: Couldn't parse response. Raw response (truncated): " + 
           response.substring(0, min(200, (int)response.length())) + "...";
  } else {
    Serial.println("Failed to connect!");
    return "OpenAI Connection failed";
  }
}

void openAI_chat_reset() {
  historical_messages = system_content;
}