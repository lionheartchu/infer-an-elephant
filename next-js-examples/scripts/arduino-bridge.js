// scripts/arduino-bridge.js
const { SerialPort, ReadlineParser } = require('serialport');
const WebSocket = require('ws');

// TODO: 把这里改成你 Arduino 实际的串口，比如 /dev/tty.usbmodem1101
const SERIAL_PATH = '/dev/cu.usbmodemF412FA703D182';
const SERIAL_BAUD = 115200;

// 开一个本地 WebSocket 服务器给前端连
const WS_PORT = 3001;
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', () => {
  console.log('WS client connected');
});

// 串口
const port = new SerialPort({ path: SERIAL_PATH, baudRate: SERIAL_BAUD });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

parser.on('data', (line) => {
  line = line.trim();
  console.log('SERIAL:', line);

  // 只处理 CARD:xxxx 这种行
  const m = line.match(/^CARD:(.+)$/);
  if (!m) return;

  const id = m[1]; // 比如 "ele_back" / "ele_tail_fur"
  const payload = JSON.stringify({ type: 'card', id });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

port.on('open', () => {
  console.log('Serial port opened:', SERIAL_PATH);
});

port.on('error', (err) => {
  console.error('Serial error:', err);
});
