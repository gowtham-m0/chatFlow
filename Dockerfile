# -------- ANGULAR BUILD STAGE --------
FROM node:20 AS angular-build
WORKDIR /app/frontend

# Copy frontend and install dependencies
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

# Copy the rest of the frontend source and build for production
COPY frontend/ ./
RUN npm run build -- --configuration production


# -------- .NET BUILD STAGE --------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy backend solution and restore
COPY backend/ ./backend/
WORKDIR /src/backend/API
RUN dotnet restore

# Publish the .NET app
RUN dotnet publish API/API.csproj -c Release -o /app/publish

# Copy Angular build output into the published wwwroot
COPY --from=angular-build /app/frontend/dist/frontend/browser/ /app/publish/wwwroot/


# -------- RUNTIME STAGE --------
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

COPY --from=build /app/publish .

# PORT is injected by Render at runtime; the app reads it via Environment.GetEnvironmentVariable("PORT")
EXPOSE 10000

ENTRYPOINT ["dotnet", "API.dll"]
