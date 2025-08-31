#include <WiFi.h>
#include <WiFiClientSecure.h>

// WiFi credentials
const char* wifi_ssid = "RedRover"; // wifi name
const char* wifi_pass = ""; // wifi password

// OpenAI API Key
String openaiKey = ""; // Set your OpenAI API Key here

// ChatGPT Prompts
String role = "You are a helpful assistant.";
String model = "gpt-4o-mini";
String system_content = "{\"role\": \"system\", \"content\":\""+ role +"\"}";
String historical_messages = system_content;

WiFiClientSecure client;

void setup() 
{
  Serial.begin(115200);
  delay(10);
  
  initWiFi();
  Serial.println("type to ask openai.");
}

void loop()
{
  if(Serial.available()){
    String val = Serial.readStringUntil('\n'); // get user input in serial terminal
    val.trim();

    Serial.print("user: ");
    Serial.println(val);
    Serial.print("ai: ");
    Serial.println(openAI_chat(val)); // call open ai and print response
  }  
}

// set up WiFi
void initWiFi() {
  Serial.print("Connecting to ");
  Serial.println(wifi_ssid);

  // Initialize WiFi in Station mode
  WiFi.mode(WIFI_STA);
  delay(100);  // Give WiFi some time to initialize
  
  // Print MAC Address
  Serial.print("MAC Address: ");
  Serial.println(WiFi.macAddress());

  if (strlen(wifi_pass) > 0) {
    WiFi.begin(wifi_ssid, wifi_pass); // when there is password
  } else {
    WiFi.begin(wifi_ssid); // when there is no password
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

// call open AI, don't need to change this function
String openAI_chat(String message) { 
  const char* server = "api.openai.com";
  const int httpsPort = 443;

  client.setInsecure(); // For simplicity, skip certificate validation

  Serial.println("\nStarting SSL connection test...");
  Serial.print("Attempting OpenAI connection... ");
  if (client.connect(server, httpsPort)) {
    Serial.println("connected to api.openai.com");

    message.replace("\"","'");
    String user_content = "{\"role\": \"user\", \"content\":\""+ message+"\"}";
    historical_messages += ", "+user_content;
    String request = "{\"model\":\""+model+"\",\"messages\":[" + historical_messages + "]}";

    // HTTP request
    client.println("POST /v1/chat/completions HTTP/1.1");
    client.println("Host: api.openai.com");
    client.println("Authorization: Bearer " + openaiKey);
    client.println("Content-Type: application/json; charset=utf-8");
    client.println("Content-Length: " + String(request.length()));
    client.println("Connection: close");
    client.println();
    for (int i = 0; i < request.length(); i += 1024) {
      client.print(request.substring(i, i + 1024));
    }

    String getResponse="", Feedback="";
    bool state = false;
    int waitTime = 20000;   // timeout 20 seconds
    long startTime = millis();

    while ((startTime + waitTime) > millis()) {
      delay(100);      
      while (client.available()) {
          char c = client.read();
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
          client.stop();
          String assistant_content = "{\"role\": \"assistant\", \"content\":\""+ getResponse+"\"}";
          historical_messages += ", "+assistant_content;
          Serial.println("");
          return getResponse;
       }
    }
    client.stop();
    Serial.println(Feedback);
    return "error";
  } else {
    Serial.println("Failed!");
    return "OpenAI Connection failed";
  }
}

void openAI_chat_reset() {
  historical_messages = system_content;
}
