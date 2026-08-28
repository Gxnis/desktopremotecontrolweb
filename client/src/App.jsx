import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Monitor, Wifi, WifiOff, Copy, Check, Power, PowerOff, Maximize, Minimize, Shield, ShieldOff, Play } from 'lucide-react';
import './App.css';

function App() {
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [allowControl, setAllowControl] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [previousRoomCode, setPreviousRoomCode] = useState('');
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  const videoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const roomCodeRef = useRef(null);
  const iceCandidatesRef = useRef([]);

  useEffect(() => {
    // Initialize socket inside useEffect
    socketRef.current = io(window.location.origin, {
      transports: ['polling']
    });
    
    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.log('Socket connection error:', error);
      setError('Connection error: ' + error.message);
    });

    socketRef.current.on('room-created', ({ roomCode: code }) => {
      setRoomCode(code);
      roomCodeRef.current = code;
      setIsHost(true);
      setStatus('Room created! Share this code to allow access. Click "Start Sharing" to begin.');
    });

    socketRef.current.on('room-joined', ({ roomCode: code }) => {
      console.log('Room joined with code:', code);
      setRoomCode(code);
      roomCodeRef.current = code;
      setIsHost(false);
      setStatus('Connected to room. Waiting for screen share...');
      setupViewerConnection();
    });

    socketRef.current.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    socketRef.current.on('offer', async ({ offer, senderId }) => {
      if (!isHost) {
        await handleOffer(offer);
      }
    });

    socketRef.current.on('answer', async ({ answer }) => {
      if (isHost && peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Host remote description set');
        // Add any stored ICE candidates
        while (iceCandidatesRef.current.length > 0) {
          const candidate = iceCandidatesRef.current.shift();
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('Stored ICE candidate added after remote description');
          } catch (err) {
            console.error('Error adding stored ICE candidate:', err);
          }
        }
      }
    });

    socketRef.current.on('ice-candidate', async ({ candidate }) => {
      if (peerConnectionRef.current) {
        try {
          if (peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('ICE candidate added immediately');
          } else {
            // Store candidate for later when remote description is set
            iceCandidatesRef.current.push(candidate);
            console.log('ICE candidate stored for later, total stored:', iceCandidatesRef.current.length);
          }
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    socketRef.current.on('room-deactivated', () => {
      setIsActive(false);
      setStatus('Room has been deactivated by host');
    });

    socketRef.current.on('room-activated', () => {
      setIsActive(true);
      setStatus('Room has been reactivated');
    });

    socketRef.current.on('control-enabled', () => {
      setAllowControl(true);
      setStatus('Remote control enabled');
    });

    socketRef.current.on('control-disabled', () => {
      setAllowControl(false);
      setStatus('Remote control disabled');
    });

    socketRef.current.on('host-disconnected', () => {
      setError('Host disconnected');
      setRoomCode('');
      setIsHost(false);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
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

  const toggleRoom = () => {
    if (isActive) {
      socketRef.current.emit('deactivate-room', { roomCode });
    } else {
      socketRef.current.emit('activate-room', { roomCode });
    }
    setIsActive(!isActive);
  };

  const toggleControl = () => {
    socketRef.current.emit('toggle-control', { roomCode, enabled: !allowControl });
    setAllowControl(!allowControl);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (videoRef.current) {
        videoRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(err => {
          console.error('Fullscreen error:', err);
        });
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(err => {
          console.error('Exit fullscreen error:', err);
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      console.log('Starting screen share for room:', roomCode);
      setIsSharing(true);
      setStatus('Starting screen share...');
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          cursor: "always",
          frameRate: { ideal: 30, max: 60 },
          width: { ideal: 1920, max: 2560 },
          height: { ideal: 1080, max: 1440 }
        },
        audio: false
      });
      
      localStreamRef.current = stream;
      console.log('Screen share stream obtained');
      
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      peerConnectionRef.current = peerConnection;
      console.log('Peer connection created');
      
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
      console.log('Tracks added to peer connection');
      
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('ICE candidate generated');
          socketRef.current.emit('ice-candidate', { roomCode, candidate: event.candidate });
        }
      };
      
      peerConnection.onconnectionstatechange = () => {
        console.log('Host connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setStatus('Screen sharing active - connected to viewer');
        } else if (peerConnection.connectionState === 'disconnected') {
          setStatus('Screen sharing disconnected');
        }
      };
      
      const offer = await peerConnection.createOffer();
      console.log('Offer created');
      await peerConnection.setLocalDescription(offer);
      console.log('Local description set');
      
      socketRef.current.emit('offer', { roomCode, offer });
      console.log('Offer sent to server');
      setStatus('Screen sharing active - waiting for viewer...');
      
      stream.getVideoTracks()[0].onended = () => {
        console.log('Screen sharing stopped by user');
        setIsSharing(false);
        setStatus('Screen sharing stopped');
      };
      
    } catch (err) {
      console.error('Error starting screen share:', err);
      setIsSharing(false);
      setError('Failed to start screen share: ' + err.message);
      setStatus('Failed to start screen share');
    }
  };

  const setupViewerConnection = async () => {
    try {
      const currentRoomCode = roomCodeRef.current;
      console.log('Setting up viewer connection for room:', currentRoomCode);
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      peerConnectionRef.current = peerConnection;
      console.log('Viewer peer connection created');
      
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Viewer ICE candidate generated for room:', currentRoomCode);
          socketRef.current.emit('ice-candidate', { roomCode: currentRoomCode, candidate: event.candidate });
        }
      };
      
      peerConnection.ontrack = (event) => {
        console.log('Viewer received track', event.streams[0]);
        console.log('Track kind:', event.track.kind);
        console.log('Stream tracks:', event.streams[0].getTracks());
        
        if (videoRef.current) {
          console.log('Video ref exists, setting srcObject');
          videoRef.current.srcObject = event.streams[0];
          
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded, dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            console.log('Video element dimensions:', videoRef.current.offsetWidth, 'x', videoRef.current.offsetHeight);
            console.log('Video element display:', window.getComputedStyle(videoRef.current).display);
            console.log('Video element visibility:', window.getComputedStyle(videoRef.current).visibility);
            console.log('Video element opacity:', window.getComputedStyle(videoRef.current).opacity);
            setVideoLoaded(true);
          };
          
          videoRef.current.onplay = () => {
            console.log('Video started playing');
            setVideoLoaded(true);
          };
          
          videoRef.current.onerror = (e) => {
            console.error('Video error:', e);
            console.error('Video error code:', videoRef.current.error?.code);
            console.error('Video error message:', videoRef.current.error?.message);
          };
          
          videoRef.current.play().then(() => {
            console.log('Video play() succeeded');
            setVideoLoaded(true);
            setStatus('Screen share connected');
          }).catch(err => {
            console.error('Video play() error:', err);
            setStatus('Screen share connected (video may need interaction)');
          });
        } else {
          console.error('Video ref does not exist!');
        }
      };
      
      peerConnection.onconnectionstatechange = () => {
        console.log('Viewer connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setStatus('Screen share connected');
        } else if (peerConnection.connectionState === 'disconnected') {
          setStatus('Screen share disconnected');
        }
      };
      
    } catch (err) {
      console.error('Error setting up viewer:', err);
      setError('Failed to connect to screen share');
    }
  };

  const handleOffer = async (offer) => {
    try {
      const currentRoomCode = roomCodeRef.current;
      console.log('Handling offer for room:', currentRoomCode);
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Viewer remote description set');
      
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      console.log('Viewer local description set');
      
      console.log('Sending answer for room:', currentRoomCode);
      socketRef.current.emit('answer', { roomCode: currentRoomCode, answer });
      
      // Add any stored ICE candidates
      while (iceCandidatesRef.current.length > 0) {
        const candidate = iceCandidatesRef.current.shift();
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('Stored ICE candidate added after remote description (viewer)');
        } catch (err) {
          console.error('Error adding stored ICE candidate (viewer):', err);
        }
      }
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  const sendMouseMove = (e) => {
    if (!isHost && allowControl && videoRef.current) {
      const rect = videoRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      socketRef.current.emit('mouse-move', { roomCode, x, y });
    }
  };

  const sendMouseClick = (e) => {
    if (!isHost && allowControl && videoRef.current) {
      const rect = videoRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      socketRef.current.emit('mouse-click', { roomCode, button: e.button, x, y });
    }
  };

  const sendKeyboard = (e) => {
    if (!isHost && allowControl) {
      socketRef.current.emit('keyboard', { roomCode, key: e.key, keyCode: e.keyCode });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Monitor className="w-10 h-10" />
            Remote Desktop
          </h1>
          <p className="text-gray-400">Share your screen remotely with secure room codes</p>
        </div>

        {/* Connection Status */}
        <div className="flex justify-center mb-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {/* Main Content */}
        {!roomCode ? (
          <div className="max-w-md mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">
              <div className="space-y-6">
                <button
                  onClick={createRoom}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Create New Room
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800/50 text-gray-400">or join existing</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="Enter room code"
                    className="flex-1 bg-gray-700/50 border border-gray-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
                    maxLength={6}
                  />
                  <button
                    onClick={joinRoom}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">
              {/* Room Info */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500/20 px-4 py-2 rounded-lg">
                    <span className="text-purple-400 font-mono text-2xl font-bold">{roomCode}</span>
                  </div>
                  {isHost && (
                    <button
                      onClick={copyCode}
                      className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
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
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <Play className="w-5 h-5" />
                      Start Sharing
                    </button>
                  )}
                  
                  {isHost && (
                    <button
                      onClick={toggleControl}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        allowControl 
                          ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      {allowControl ? <Shield className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
                      {allowControl ? 'Control On' : 'Control Off'}
                    </button>
                  )}
                  
                  {isHost && (
                    <button
                      onClick={toggleRoom}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                    >
                      {isActive ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
                      {isActive ? 'Active' : 'Inactive'}
                    </button>
                  )}
                  
                  {!isHost && (
                    <button
                      onClick={toggleFullscreen}
                      className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                      {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </button>
                  )}
                </div>
              </div>

              {/* Status */}
              {status && (
                <div className="mb-6 p-4 bg-gray-700/30 rounded-lg">
                  <p className="text-gray-300">{status}</p>
                </div>
              )}

              {/* Video/Screen Area */}
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                {isHost ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      {isSharing ? (
                        <>
                          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-green-400 font-semibold">Screen sharing active</p>
                          <p className="text-gray-500 text-sm mt-2">Your screen is visible to viewers</p>
                        </>
                      ) : (
                        <>
                          <Monitor className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400">Click "Start Sharing" to begin</p>
                          <p className="text-gray-500 text-sm mt-2">Your screen will be shared with viewers</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                      onMouseMove={sendMouseMove}
                      onMouseDown={sendMouseClick}
                      onKeyDown={sendKeyboard}
                      tabIndex={0}
                      style={{ display: 'block' }}
                    />
                    <div 
                      id="video-overlay" 
                      className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${videoLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    >
                      <div className="text-center">
                        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-300">Waiting for host to start sharing...</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
                {!isActive && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <p className="text-white text-xl font-semibold">Room is inactive</p>
                  </div>
                )}

              {/* Instructions */}
              <div className="mt-6 p-4 bg-gray-700/30 rounded-lg">
                <p className="text-gray-400 text-sm">
                  {isHost 
                    ? 'Your screen is being shared. Viewers can see and control your screen while the room is active.'
                    : 'You can control the remote screen using your mouse and keyboard. Click on the video to focus.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
