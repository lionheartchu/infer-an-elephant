void setup() 
{
  Serial.begin(115200);
  while (!Serial) {
    ; // wait for serial port to connect
  }
  delay(10);
}

void loop()
{
  if(Serial.available()){
    String val = Serial.readStringUntil('\n');
    val.trim();

    Serial.print("user: ");
    Serial.println(val);
  }  
}