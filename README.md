# Remote Desktop - Screen Sharing Application

A web-based remote desktop application that allows you to share your screen and control it remotely using secure room codes. Similar to PS Portal for PC.

## Features

- **Room-based Access**: Create rooms with unique 6-character codes
- **Screen Sharing**: Real-time screen sharing using WebRTC
- **Remote Control**: Viewers can control the host's mouse and keyboard
- **Session Management**: Hosts can activate/deactivate rooms at any time
- **Modern UI**: Beautiful dark theme with smooth animations
- **Secure**: Rooms are only accessible while active

## Architecture

- **Backend**: Node.js with Express and Socket.IO
- **Frontend**: React with Vite
- **Styling**: TailwindCSS
- **Real-time Communication**: WebRTC for video, Socket.IO for signaling and control

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Install dependencies**:
```bash
npm install
```

This will automatically install both backend and frontend dependencies.

### Running the Application

**Local Development:**

1. Build the frontend:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

3. Open your browser to `http://localhost:3000`

The application now runs on a single port - the server serves both the backend API/WebSocket and the frontend.

## Deployment on Render

This application is configured for easy deployment on Render:

1. Push your code to a GitHub repository
2. Create a new Web Service on Render
3. Connect your repository
4. Render will automatically detect the `render.yaml` configuration
5. The build command `npm run build` will build the frontend
6. The start command `npm start` will run the integrated server
7. Your app will be available at `https://your-app-name.onrender.com`

The `render.yaml` file includes:
- Automatic build configuration
- Port configuration (10000 for Render)
- Node.js environment setup

## Usage

### As a Host (Sharing your screen)

1. Click "Create New Room"
2. A unique 6-character code will be generated
3. Share this code with the person you want to give access to
4. Your screen will start being shared automatically
5. Use the "Active/Inactive" button to control when the room is accessible

### As a Viewer (Controlling a remote screen)

1. Enter the room code provided by the host
2. Click "Join"
3. Wait for the host's screen to appear
4. Click on the video to focus
5. Use your mouse and keyboard to control the remote screen

### Stopping Screen Sharing

- **Host**: Click the browser's "Stop Sharing" button that appears when screen sharing starts
- **Host**: Use the "Active/Inactive" button to temporarily disable access
- **Viewer**: Simply close the browser tab

## Security Notes

- Room codes are randomly generated and unique
- Rooms are only accessible while marked as "active" by the host
- Screen sharing requires explicit permission from the host
- The application runs locally - ensure your network is secure if exposing to the internet

## Troubleshooting

**Screen sharing not working:**
- Ensure you're using a modern browser (Chrome, Firefox, Edge)
- Check browser permissions for screen sharing
- Make sure both devices are on the same network or accessible

**Remote control not working:**
- Click on the video area to ensure it has focus
- Check that the room is marked as "active"
- Verify both devices have a stable internet connection

**Connection issues:**
- Ensure the backend server is running on port 3000
- Check that Socket.IO is properly connected (green indicator in UI)
- Verify the room code is correct

## Technology Stack

- **Backend**: Express, Socket.IO, UUID
- **Frontend**: React, Vite, Socket.IO Client, Lucide React
- **Styling**: TailwindCSS
- **Real-time**: WebRTC, Socket.IO

## License

MIT
