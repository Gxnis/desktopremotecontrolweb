const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static('client/dist'));

// Room management - simplified
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Create room
  socket.on('create-room', () => {
    const roomCode = uuidv4().substring(0, 6).toUpperCase();
    rooms.set(roomCode, {
      host: socket.id,
      viewers: [],
      active: true,
      controlEnabled: false
    });
    
    socket.join(roomCode);
    socket.emit('room-created', { roomCode });
    console.log('Room created:', roomCode);
  });

  // Join room
  socket.on('join-room', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    
    socket.join(roomCode);
    room.viewers.push(socket.id);
    socket.emit('room-joined', { roomCode });
    console.log('Viewer joined room:', roomCode);
  });

  // WebRTC signaling - simplified
  socket.on('signal', ({ roomCode, data }) => {
    const room = rooms.get(roomCode);
    if (room) {
      socket.to(roomCode).emit('signal', { data, senderId: socket.id });
    }
  });

  // Remote control
  socket.on('remote-control', ({ roomCode, type, data }) => {
    const room = rooms.get(roomCode);
    if (room && room.controlEnabled && socket.id !== room.host) {
      io.to(room.host).emit('remote-control', { type, data });
    }
  });

  // Toggle control
  socket.on('toggle-control', ({ roomCode, enabled }) => {
    const room = rooms.get(roomCode);
    if (room && socket.id === room.host) {
      room.controlEnabled = enabled;
      io.to(roomCode).emit('control-toggled', { enabled });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    for (const [code, room] of rooms.entries()) {
      if (room.host === socket.id) {
        rooms.delete(code);
        io.to(code).emit('host-disconnected');
        break;
      }
      if (room.viewers.includes(socket.id)) {
        room.viewers = room.viewers.filter(id => id !== socket.id);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
