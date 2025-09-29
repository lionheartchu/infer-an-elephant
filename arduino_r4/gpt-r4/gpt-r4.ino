#include <WiFiS3.h>
#include <WiFiClientSecure.h>

// WiFi credentials
const char* wifi_ssid = "RedRover";
const char* wifi_pass = "";

// OpenAI API Key
String openaiKey = "";  // Set your OpenAI API Key here

// ChatGPT
String role = "You are a helpful assistant.";
String model = "openai.gpt-4o-mini";
String system_content = "{\"role\": \"system\", \"content\":\""+ role +"\"}";
String historical_messages = system_content;

WiFiClientSecure client;

void setup() 
{
  Serial.begin(115200);
  while (!Serial) {
    ; // wait for serial port to connect
  }
  delay(10);
  
  initWiFi();
  Serial.println("type to ask openai.");
}

void loop()
{
  if(Serial.available()){
    String val = Serial.readStringUntil('\n');
    val.trim();

    Serial.print("user: ");
    Serial.println(val);
    Serial.print("ai: ");
    Serial.println(openAI_chat(val));
  }  
}

void initWiFi() {
  Serial.print("Connecting to ");
  Serial.println(wifi_ssid);

  // Print MAC address
  byte mac[6];
  WiFi.macAddress(mac);
  Serial.print("MAC Address: ");
  for (int i = 0; i < 6; i++) {
    Serial.print(mac[i], HEX);
    if (i < 5) Serial.print(":");
  }
  Serial.println();

  if(strlen(wifi_pass) > 0) {
    WiFi.begin(wifi_ssid, wifi_pass);
  } else {
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
  } else {
    Serial.println("Failed to connect to WiFi");
  }
}

String openAI_chat(String message) { 
  const char* server = "api.openai.com";
  const int httpsPort = 443;

  client.setInsecure(); // For simplicity, skip certificate validation

  Serial.println("\nStarting SSL connection test...");
  Serial.print("Attempting OpenAI connection... ");
  if (client.connect(server, httpsPort)) {
    Serial.println("connected to api.openai.com");

    // Properly escape JSON special characters
    message.replace("\\", "\\\\");
    message.replace("\"", "\\\"");
    message.replace("\n", "\\n");
    
    String user_content = "{\"role\": \"user\", \"content\":\"" + message + "\"}";
    historical_messages += ", " + user_content;    
    String request = "{\"model\":\"" + model + "\",\"messages\":[" + historical_messages + "]}";

    // HTTP request
    client.println("POST /v1/chat/completions HTTP/1.1");
    client.println("Host: api.openai.com");
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
        // Data is available to read
        break;
      }
      delay(10); // Small delay to prevent overwhelming the CPU
    }

    // Read the response
    String response = "";
    timeout = millis();
    
    // Skip HTTP headers
    while (client.connected() && millis() - timeout < 10000) {
      if (client.available()) {
        String line = client.readStringUntil('\n');
        if (line == "\r") {
          // Headers are complete
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
        // If no data for 1 second, assume we're done
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
          
          // Unescape the special characters - IMPORTANT FIX
          content.replace("\\n", "\n");  // Convert "\n" to actual newlines
          content.replace("\\\"", "\""); // Convert escaped quotes to actual quotes
          content.replace("\\\\", "\\"); // Convert double backslashes to single
          
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
