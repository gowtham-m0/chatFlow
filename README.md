# RealTime Chat Application 💬

A modern, full-stack real-time chat application built with **Angular 18+**, **Tailwind CSS**, and **ASP.NET Core SignalR**. It supports instant private messaging, typing indicators, read receipts, and user presence tracking (online/offline status).

## 🚀 Features

- **Real-Time Messaging**: Instant bidirectional communication powered by ASP.NET Core SignalR.
- **User Presence**: Live online/offline status tracking for all users.
- **Typing Indicators**: See when someone is actively typing a message.
- **Read Receipts**: Know exactly when your messages have been read.
- **Unread Message Badges**: Keep track of missed messages with localized sidebar badges.
- **Multi-Device Support**: Messages correctly sync across multiple browser tabs/devices.
- **Secure Authentication**: JWT-based authentication via ASP.NET Core Identity.
- **Modern UI**: Sleek, fully responsive user interface built using SCSS and modern design principles.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Angular 18+
- **Styling**: SCSS & Tailwind CSS
- **Real-Time Client**: `@microsoft/signalr`
- **Routing**: Angular Router (Standalone components)

### Backend
- **Framework**: ASP.NET Core 8 Web API
- **Real-Time Server**: SignalR Hubs
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
3. Apply database migrations (SQLite database will be created automatically):
   ```bash
   dotnet ef database update
   ```
4. Run the API:
   ```bash
   dotnet run
   ```
   *The backend will start at `https://localhost:5000` (or the port specified in your `launchSettings.json`).*

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
   *The application will automatically open in your default browser at `http://localhost:4200/`.*

---

## 📁 Project Structure

```text
RealTime Chat Application/
│
├── frontend/                 # Angular Client
│   ├── src/app/
│   │   ├── components/       # UI Components (chat, login, register, sidebar)
│   │   ├── models/           # TypeScript interfaces
│   │   ├── services/         # SignalR ChatService and AuthService
│   │   └── guards/           # Route protection guards
│   └── package.json
│
└── backend/                  # ASP.NET Core Server
    └── API/API/
        ├── Hubs/             # SignalR ChatHub implementation
        ├── Controllers/      # API endpoints (AccountEndpoint)
        ├── Models/           # EF Core Entities (AppUser, Message)
        ├── DTO/              # Data Transfer Objects
        └── Data/             # AppDbContext
```

---

## 🔒 Authentication Flow
The application requires user registration before utilizing the chat. 
1. **Register** using an email, username, password, and a profile picture. Profile pictures are uploaded and stored in the backend static files directory.
2. **Login** returns a JWT token which is stored in `localStorage` and sent with every HTTP request and SignalR connection.

---

## 🐝 Known Limitations / Future Improvements
- Add Group Chat functionality.
- Implement file and image sending within chats.
- Replace SQLite with PostgreSQL or SQL Server for production deployments.

---

*Built with Angular & .NET*
