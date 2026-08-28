import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Monitor, Wifi, WifiOff, Copy, Check, Play, Maximize, Minimize, Shield, ShieldOff } from 'lucide-react';
import './App.css';

function App() {
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [allowControl, setAllowControl] = useState(false);
  
  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const roomCodeRef = useRef('');

  useEffect(() => {
    socketRef.current = io(window.location.origin);
    
    socketRef.current.on('connect', () => {
      setIsConnected(true);
      console.log('Connected');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current.on('room-created', ({ roomCode: code }) => {
      setRoomCode(code);
      roomCodeRef.current = code;
      setIsHost(true);
      setStatus('Room created! Click "Start Sharing"');
    });

    socketRef.current.on('room-joined', ({ roomCode: code }) => {
      setRoomCode(code);
      roomCodeRef.current = code;
      setIsHost(false);
      setStatus('Connected to room. Waiting for screen share...');
    });

    socketRef.current.on('signal', ({ data, senderId }) => {
      if (!peerRef.current && !isHost) {
        setupViewerPeer();
      }
      
      if (peerRef.current) {
        if (data.type === 'offer') {
          peerRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
            .then(() => peerRef.current.createAnswer())
            .then(answer => peerRef.current.setLocalDescription(answer))
            .then(() => {
              socketRef.current.emit('signal', { 
                roomCode: roomCodeRef.current, 
                data: { type: 'answer', sdp: peerRef.current.localDescription } 
              });
            });
        } else if (data.type === 'answer') {
          peerRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else if (data.type === 'candidate') {
          peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      }
    });

    socketRef.current.on('host-disconnected', () => {
      setError('Host disconnected');
      setRoomCode('');
      setIsHost(false);
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    });

    socketRef.current.on('control-toggled', ({ enabled }) => {
      setAllowControl(enabled);
      setStatus(enabled ? 'Remote control enabled' : 'Remote control disabled');
    });

    socketRef.current.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const createRoom = () => {
    socketRef.current.emit('create-room');
  };

  const joinRoom = () => {
    if (inputCode.trim()) {
      socketRef.current.emit('join-room', { roomCode: inputCode.trim().toUpperCase() });
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleControl = () => {
    socketRef.current.emit('toggle-control', { roomCode: roomCodeRef.current, enabled: !allowControl });
  };

  const startScreenShare = async () => {
    try {
      setStatus('Starting screen share...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always", frameRate: 30 },
        audio: false
      });
      
      localStreamRef.current = stream;
      setIsSharing(true);
      
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      peerRef.current = peerConnection;
      
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
      
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('signal', { 
            roomCode: roomCodeRef.current, 
            data: { type: 'candidate', candidate: event.candidate } 
          });
        }
      };
      
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      socketRef.current.emit('signal', { 
        roomCode: roomCodeRef.current, 
        data: { type: 'offer', sdp: offer } 
      });
      
      setStatus('Screen sharing active');
      
      stream.getVideoTracks()[0].onended = () => {
        setIsSharing(false);
        setStatus('Screen sharing stopped');
      };
      
    } catch (err) {
      setError('Failed to start screen share: ' + err.message);
      setIsSharing(false);
    }
  };

  const setupViewerPeer = () => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    peerRef.current = peerConnection;
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('signal', { 
          roomCode: roomCodeRef.current, 
          data: { type: 'candidate', candidate: event.candidate } 
        });
      }
    };
    
    peerConnection.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
        setStatus('Screen share connected');
      }
    };
    
    peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onmessage = (e) => {
        const { type, data } = JSON.parse(e.data);
        if (type === 'mouse-move' && allowControl) {
          // Handle remote mouse
        }
      };
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Monitor className="w-10 h-10" />
            Remote Desktop
          </h1>
          <p className="text-gray-400">Screen sharing with room codes</p>
        </div>

        <div className="flex justify-center mb-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {!roomCode ? (
          <div className="max-w-md mx-auto">
            <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
              <div className="space-y-6">
                <button
                  onClick={createRoom}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl"
                >
                  Create Room
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800/50 text-gray-400">or join</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="Room code"
                    className="flex-1 bg-gray-700 border border-gray-600 text-white px-4 py-3 rounded-xl uppercase"
                    maxLength={6}
                  />
                  <button
                    onClick={joinRoom}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500/20 px-4 py-2 rounded-lg">
                    <span className="text-purple-400 font-mono text-2xl">{roomCode}</span>
                  </div>
                  {isHost && (
                    <button
                      onClick={copyCode}
                      className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {isHost && !isSharing && (
                    <button
                      onClick={startScreenShare}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                    >
                      <Play className="w-5 h-5" />
                      Start Sharing
                    </button>
                  )}
                  
                  {isHost && (
                    <button
                      onClick={toggleControl}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        allowControl ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-white'
                      }`}
                    >
                      {allowControl ? <Shield className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
                      {allowControl ? 'Control On' : 'Control Off'}
                    </button>
                  )}
                </div>
              </div>

              {status && (
                <div className="mb-6 p-4 bg-gray-700/30 rounded-lg">
                  <p className="text-gray-300">{status}</p>
                </div>
              )}

              <div className="bg-black rounded-xl overflow-hidden aspect-video">
                {isHost ? (
                  <div className="h-full flex items-center justify-center">
                    {isSharing ? (
                      <div className="text-center">
                        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-green-400">Screen sharing active</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Monitor className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">Click "Start Sharing"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
