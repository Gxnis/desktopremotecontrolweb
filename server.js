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
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
  pingTimeout: 120000,
  pingInterval: 50000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6
});

app.use(express.static('client/dist'));

// Room management
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'at', new Date().toISOString());
  
  socket.on('connect_error', (error) => {
    console.log('Connection error:', socket.id, error);
  });

  // Create a new room
  socket.on('create-room', () => {
    const roomCode = uuidv4().substring(0, 6).toUpperCase();
    rooms.set(roomCode, {
      host: socket.id,
      viewers: [],
      active: true,
      controlEnabled: false,
      createdAt: Date.now()
    });
    
    socket.join(roomCode);
    socket.emit('room-created', { roomCode, isHost: true });
    console.log('Room created:', roomCode, 'by socket:', socket.id);
    console.log('Total rooms:', rooms.size);
  });

  // Join an existing room
  socket.on('join-room', ({ roomCode }) => {
    console.log('Attempting to join room:', roomCode, 'from socket:', socket.id);
    console.log('Current rooms:', Array.from(rooms.keys()));
    
    const room = rooms.get(roomCode);
    
    if (!room) {
      console.log('Room not found:', roomCode);
      socket.emit('error', 'Room not found');
      return;
    }

    if (!room.active) {
      console.log('Room not active:', roomCode);
      socket.emit('error', 'Room is not active');
      return;
    }

    socket.join(roomCode);
    room.viewers.push(socket.id);
    
    socket.emit('room-joined', { roomCode, isHost: false });
    io.to(roomCode).emit('viewer-joined', { viewerId: socket.id });
    console.log('Viewer joined room:', roomCode);
  });

  // Screen sharing data (WebRTC signaling)
  socket.on('offer', ({ roomCode, offer }) => {
    const room = rooms.get(roomCode);
    if (room) {
      socket.to(roomCode).emit('offer', { offer, senderId: socket.id });
    }
  });

  socket.on('answer', ({ roomCode, answer }) => {
    const room = rooms.get(roomCode);
    if (room) {
      socket.to(roomCode).emit('answer', { answer, senderId: socket.id });
    }
  });

  socket.on('ice-candidate', ({ roomCode, candidate }) => {
    const room = rooms.get(roomCode);
    if (room) {
      socket.to(roomCode).emit('ice-candidate', { candidate, senderId: socket.id });
    }
  });

  // Remote control events
  socket.on('mouse-move', ({ roomCode, x, y }) => {
    const room = rooms.get(roomCode);
    if (room && socket.id !== room.host && room.controlEnabled) {
      io.to(room.host).emit('mouse-move', { x, y });
    }
  });

  socket.on('mouse-click', ({ roomCode, button, x, y }) => {
    const room = rooms.get(roomCode);
    if (room && socket.id !== room.host && room.controlEnabled) {
      io.to(room.host).emit('mouse-click', { button, x, y });
    }
  });

  socket.on('keyboard', ({ roomCode, key, keyCode }) => {
    const room = rooms.get(roomCode);
    if (room && socket.id !== room.host && room.controlEnabled) {
      io.to(room.host).emit('keyboard', { key, keyCode });
    }
  });

  // Deactivate room
  socket.on('deactivate-room', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room && socket.id === room.host) {
      room.active = false;
      io.to(roomCode).emit('room-deactivated');
      console.log('Room deactivated:', roomCode);
    }
  });

  // Reactivate room
  socket.on('activate-room', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room && socket.id === room.host) {
      room.active = true;
      io.to(roomCode).emit('room-activated');
      console.log('Room activated:', roomCode);
    }
  });

  // Toggle control permission
  socket.on('toggle-control', ({ roomCode, enabled }) => {
    const room = rooms.get(roomCode);
    if (room && socket.id === room.host) {
      room.controlEnabled = enabled;
      if (enabled) {
        io.to(roomCode).emit('control-enabled');
        console.log('Control enabled for room:', roomCode);
      } else {
        io.to(roomCode).emit('control-disabled');
        console.log('Control disabled for room:', roomCode);
      }
    }
  });

  // Disconnect
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'reason:', reason, 'at', new Date().toISOString());
    
    // Check if host disconnected
    for (const [code, room] of rooms.entries()) {
      if (room.host === socket.id) {
        io.to(code).emit('host-disconnected');
        rooms.delete(code);
        console.log('Room deleted:', code);
        break;
      }
      
      // Remove viewer
      if (room.viewers.includes(socket.id)) {
        room.viewers = room.viewers.filter(id => id !== socket.id);
        io.to(code).emit('viewer-left', { viewerId: socket.id });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
