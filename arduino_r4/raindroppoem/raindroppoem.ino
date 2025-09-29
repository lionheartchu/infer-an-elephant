//---------------------------
//IMPORTANT:In this demo, you need to tilt the rain sensor to ensure water droplets can slide off.
//---------------------------

#include <WiFiS3.h>

// WiFi credentials
const char* wifi_ssid = "RedRover";
const char* wifi_password = "";

// OpenAI API configuration
String openaiKey = "";

// Sensor configuration
int currentReading;
int previousReading = 0;
const int THRESHOLD = 50;  // Difference threshold for raindrop detection
const int NUM_READINGS = 10;
const int READING_DELAY = 50;

// Poem tracking
String currentPoem = "";
int raindropCount = 0;

// ChatGPT
String model = "openai.gpt-4o-mini";
WiFiSSLClient client;

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    ; // wait for serial port to connect
  }
  delay(100);
  
  pinMode(A0, INPUT);
  
  initWiFi();
  
  // Take initial reading
  previousReading = getAverageReading();
  Serial.println("Rain poem generator ready...");
  Serial.println("Waiting for raindrops to create poetry...");
}

void loop() {
  // Get filtered sensor reading
  currentReading = getAverageReading();
  
  // Calculate difference from previous reading
  int difference = abs(currentReading - previousReading);
  
  // Serial.print("Current: ");
  // Serial.print(currentReading);
  // Serial.print(" | Previous: ");
  // Serial.print(previousReading);
  // Serial.print(" | Difference: ");
  // Serial.println(difference);
  
  // Check for raindrop (significant change)
  if (difference > THRESHOLD) {
    raindropCount++;
    Serial.println("🌧️ RAINDROP DETECTED! Generating poem fragment...");
    
    // Generate poem fragment based on difference value
    String fragment = generatePoemFragment(difference);
    
    if (fragment.length() > 0) {
      currentPoem += fragment;
      Serial.println("Added: " + fragment);
      Serial.println("Current poem:");
      Serial.println(currentPoem);
      Serial.println("---");
    }
  }
  
  previousReading = currentReading;
  delay(100); // Small delay before next cycle
}

void initWiFi() {
  Serial.print("Connecting to ");
  Serial.println(wifi_ssid);
  delay(200);

  if (strlen(wifi_password) > 0) {
    WiFi.begin(wifi_ssid, wifi_password);
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
    printWifiStatus();
    delay(200);
  } else {
    Serial.println("Failed to connect to WiFi");
  }
}

void printWifiStatus() {
  // WiFi status printing - kept minimal for sensor application
}

int getAverageReading() {
  long sum = 0;
  for (int i = 0; i < NUM_READINGS; i++) {
    sum += analogRead(A0);
    delay(READING_DELAY);
  }
  return sum / NUM_READINGS;
}

String generatePoemFragment(int difference) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return "";
  }
  
  // Create prompt based on difference value
  String prompt = createPrompt(difference);
  
  // Call OpenAI API
  String fragment = openAI_chat(prompt);
  
  // Add spacing/line breaks based on raindrop count
  if (raindropCount % random(3, 6) == 0) {
    fragment += "\n";
  } else {
    fragment += " ";
  }
  
  return fragment;
}

String createPrompt(int difference) {
  // Use the difference value to influence the prompt
  String intensity;
  String mood;
  
  if (difference < 70) {
    intensity = "soft";
    mood = "delightful";
  } if (difference < 120) {
    intensity = "gentle";
    mood = "peaceful";
  } else if (difference < 180) {
    intensity = "poetic";
    mood = "contemplative";
  } else {
    intensity = "dreamy";
    mood = "dramatic";
  }
  
  // Array of prompt variations
  String prompts[] = {
    "Generate only one " + intensity + " rain-inspired word with a " + mood + " feeling. Just the word, no explanation:",
    "Create one short " + mood + " phrase " + intensity + ". Maximum 4 words:",
    "One poetic word that captures " + intensity + ".",
    "A brief " + mood + " expression about droplets. Maximum 3 words:",
    "Single evocative word for " + intensity + " precipitation feeling " + mood + ":",
    "Generate one random noun or adjective that frequently apper in poems"
  };
  
  return prompts[random(0, 6)];
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
    
    // Create a simple single-message request for poem fragments
    String request = "{\"model\":\"" + model + "\",\"messages\":[{\"role\": \"user\", \"content\":\"" + message + "\"}],\"temperature\":0.8}";

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
          
          // Unescape the special characters
          content.replace("\\n", "\n");  // Convert "\n" to actual newlines
          content.replace("\\\"", "\""); // Convert escaped quotes to actual quotes
          content.replace("\\\\", "\\"); // Convert double backslashes to single
          
          // Clean up the response (remove extra whitespace, quotes, etc.)
          content.trim();
          if (content.startsWith("\"")) content = content.substring(1);
          if (content.endsWith("\"")) content = content.substring(0, content.length() - 1);
          
          return content;
        }
      }
    }
    
    return "..."; // Fallback - just add ellipsis if parsing fails
  } else {
    Serial.println("Failed to connect to OpenAI!");
    return "~"; // Fallback character for connection failures
  }
}