## Registering Arduino to Cornell Redrover network.

In order to have your Arduino connect to Cornell network, you need to register your board.

Here is the link: https://dnsdb.cit.cornell.edu/dnsdb-cgi/mycomputers.cgi (only accessible on campus or using VPN).

In order to register a device, you need its MAC address. Below are sample code for getting MAC address from your Arduino. You can include it in setup() function for example.

For ESP32
```bash
  // Initialize WiFi in Station mode
  WiFi.mode(WIFI_STA);
  delay(100);  // Optional: Give WiFi some time to initialize
  
  // Print MAC Address
  Serial.print("MAC Address: ");
  Serial.println(WiFi.macAddress());
```

For Arduino R4
```bash
  // Print MAC address
  byte mac[6];
  WiFi.macAddress(mac);
  Serial.print("MAC Address: ");
  for (int i = 0; i < 6; i++) {
    Serial.print(mac[i], HEX);
    if (i < 5) Serial.print(":");
  }
  Serial.println();
```