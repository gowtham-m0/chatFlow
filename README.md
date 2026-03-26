# RealTime Chat Application 💬

A modern, full-stack real-time chat application built with **Angular 18+**, **Tailwind CSS**, and **ASP.NET Core SignalR**. It supports instant private messaging, typing indicators, read receipts, user presence tracking, and high-quality video calling.

## 🚀 Features

- **Real-Time Messaging**: Instant bidirectional communication powered by ASP.NET Core SignalR.
- **Real-Time Video Calling**: Peer-to-peer video and audio chat using WebRTC and SignalR signaling.
- **User Presence**: Live online/offline status tracking for all users.
- **Typing Indicators**: See when someone is actively typing a message.
- **Read Receipts**: Know exactly when your messages have been read.
- **Unread Message Badges**: Keep track of missed messages with localized sidebar badges.
- **Multi-Device Support**: Messages and calls correctly sync across multiple browser tabs/devices.
- **Secure Authentication**: JWT-based authentication via ASP.NET Core Identity.
- **Modern UI**: Sleek, fully responsive user interface built with premium SaaS aesthetics.
- **Smart Camera Handling**: Graceful error handling for missing cameras or denied permissions with a dedicated UI.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Angular 18+
- **Styling**: SCSS & Tailwind CSS
- **Real-Time Messaging**: ASP.NET Core SignalR
- **Video/Audio**: WebRTC (Peer-to-Peer)
- **UI Components**: Angular Material (Dialogs & Icons)

### Backend
- **Framework**: ASP.NET Core 8 Web API
- **Real-Time Server**: Multiple SignalR Hubs (Chat & Video)
- **Database**: SQLite (via Entity Framework Core)
- **Authentication**: ASP.NET Core Identity + JWT Bearer Tokens

---

## ⚙️ Getting Started

### Prerequisites

To run this project locally, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [Angular CLI](https://angular.io/cli)
- [.NET 8 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)

---

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend/API/API
   ```
2. Restore NuGet dependencies:
   ```bash
   dotnet restore
   ```
3. Apply database migrations:
   ```bash
   dotnet ef database update
   ```
4. Run the API:
   ```bash
   dotnet run
   ```
   *The backend starts at `https://localhost:5000`.*

---

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Angular development server:
   ```bash
   ng serve -o
   ```
   *The application opens at `http://localhost:4200/`.*

---

## 📁 Project Structure

```text
RealTime Chat Application/
│
├── frontend/                 # Angular Client
│   ├── src/app/
│   │   ├── components/       
│   │   │   ├── chat-window/  # Main chat interface
│   │   │   ├── video-chat/   # WebRTC Video implementation
│   │   │   └── ...           # Login, Register, Sidebars
│   │   ├── services/         
│   │   │   ├── chat-service.ts
│   │   │   └── video-chat-service.ts
│   │   └── ...
│
└── backend/                  # ASP.NET Core Server
    └── API/API/
        ├── Hubs/             # ChatHub & VideoChatHub
        ├── Controllers/      # API endpoints
        ├── Models/           # AppUser, Message
        └── ...
```

---

## 🐝 Known Limitations / Future Improvements
- **Group Video Calls**: Currently, video calls are 1-on-1.
- **Screen Sharing**: Implement screen sharing within video calls.
- **File Transfers**: Add support for sending large files via WebRTC data channels.

---

*Built with Angular & .NET*
