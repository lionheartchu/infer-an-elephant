import { Server } from "socket.io";

export default function SocketHandler(req, res) {
  if (res.socket.server.io) {
    console.log("socket already set up");
    res.end();
    return;
  }

  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  io.on("connection", (socket) => {
    socket.on('chat', (msg) => {
        console.log('chat:', msg);
        io.emit('chat', msg);
    });
    console.log('new connection');
    io.emit('new', 'new connection');
  });

  console.log("setting up socket");
  res.end();
}