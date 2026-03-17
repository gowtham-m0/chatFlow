using API.Data;
using API.DTO;
using API.Extensions;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;

namespace API.Hubs
{
    [Authorize]
    public class ChatHub(UserManager<AppUser> userManager, AppDbContext context) : Hub
    {
        // username -> user info
        public static readonly ConcurrentDictionary<string, OnlineUserDTO> onlineUsers = new();

        // username -> multiple connections (multiple tabs/devices)
        private static readonly ConcurrentDictionary<string, HashSet<string>> connections = new();

        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            var receiverId = httpContext?.Request.Query["receiverId"].ToString();

            var userName = Context.User!.Identity!.Name!;
            var currentUser = await userManager.FindByNameAsync(userName);

            var connectionId = Context.ConnectionId;

            // Track multiple connections
            connections.AddOrUpdate(
                userName,
                new HashSet<string> { connectionId },
                (key, existing) =>
                {
                    existing.Add(connectionId);
                    return existing;
                });

            if (!onlineUsers.ContainsKey(userName))
            {
                var user = new OnlineUserDTO
                {
                    Id = currentUser!.Id,
                    ConnectionId = connectionId,
                    UserName = userName,
                    ProfileImage = currentUser.ProfileImage,
                    FullName = currentUser.FullName,
                };

                onlineUsers.TryAdd(userName, user);

                await Clients.AllExcept(connectionId)
                    .SendAsync("Notify", currentUser);
            }

            if (!string.IsNullOrEmpty(receiverId))
                await LoadMessages(receiverId);

            await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var username = Context.User!.Identity!.Name!;

            if (connections.TryGetValue(username, out var userConnections))
            {
                userConnections.Remove(Context.ConnectionId);

                if (userConnections.Count == 0)
                {
                    connections.TryRemove(username, out _);
                    onlineUsers.TryRemove(username, out _);
                }
            }

            await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
        }

        public async Task LoadMessages(string recipientId, int pageNumber = 1)
        {
            int pageSize = 10;

            var username = Context.User!.Identity!.Name;
            var currentUser = await userManager.FindByNameAsync(username!);

            if (currentUser is null) return;

            var messages = await context.Messages
                .Where(x =>
                    (x.ReceiverId == currentUser.Id && x.SenderId == recipientId) ||
                    (x.SenderId == currentUser.Id && x.ReceiverId == recipientId))
                .OrderByDescending(x => x.CreatedDate)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .OrderBy(x => x.CreatedDate)
                .Select(x => new MessageResponseDTO
                {
                    Id = x.Id,
                    Content = x.Content,
                    CreatedDate = x.CreatedDate,
                    ReceiverId = x.ReceiverId,
                    SenderId = x.SenderId,
                    IsRead = x.IsRead
                })
                .ToListAsync();

            // Convert UTC dates to local time after query materialization
            foreach (var msg in messages)
                msg.CreatedDate = msg.CreatedDate.ToLocalTime();

            // Mark messages as read
            var ids = messages.Select(x => x.Id).ToList();

            var msgs = await context.Messages
                .Where(x => ids.Contains(x.Id) && x.ReceiverId == currentUser.Id)
                .ToListAsync();

            foreach (var msg in msgs)
                msg.IsRead = true;

            await context.SaveChangesAsync();

            await Clients.User(currentUser.Id)
                .SendAsync("ReceiveMessageList", messages);

            // Send updated user list to the caller so their unread counts refresh
            await Clients.Caller.SendAsync("OnlineUsers", await GetAllUsers(currentUser.Id));

            // Notify the original senders that their messages have been read
            var senderIds = msgs.Select(x => x.SenderId).Distinct().ToList();
            foreach (var senderId in senderIds)
            {
                if (senderId == null) continue;
                var senderUser = await userManager.FindByIdAsync(senderId);
                if (senderUser?.UserName != null && connections.TryGetValue(senderUser.UserName, out var senderConns))
                {
                    var readMessageIds = msgs.Where(m => m.SenderId == senderId).Select(m => m.Id).ToList();
                    foreach (var conn in senderConns)
                    {
                        await Clients.Client(conn).SendAsync("MessagesRead", readMessageIds);
                    }
                }
            }
        }

        public async Task SendMessage(MessageRequestDTO message)
        {
            var senderUserName = Context.User!.Identity!.Name;
            var recipientId = message.ReceiverId;

            var sender = await userManager.FindByNameAsync(senderUserName!);
            var receiver = await userManager.FindByIdAsync(recipientId);

            if (sender == null || receiver == null) return;

            var newMsg = new Message
            {
                Sender = sender,
                Receiver = receiver,
                SenderId = sender.Id,
                ReceiverId = receiver.Id,
                Content = message.Content,
                IsRead = false,
                CreatedDate = DateTime.UtcNow
            };

            context.Messages.Add(newMsg);
            await context.SaveChangesAsync();

            var responseMsg = new MessageResponseDTO
            {
                Id = newMsg.Id,
                Content = newMsg.Content,
                CreatedDate = newMsg.CreatedDate.ToLocalTime(),
                ReceiverId = newMsg.ReceiverId,
                SenderId = newMsg.SenderId,
                IsRead = newMsg.IsRead
            };

            // Send to all recipient connections
            if (connections.TryGetValue(receiver.UserName!, out var receiverConns))
            {
                foreach (var conn in receiverConns)
                {
                    await Clients.Client(conn)
                        .SendAsync("ReceiveMessage", responseMsg);
                }
            }

            // Send to sender's other connections (multi-tab support)
            if (connections.TryGetValue(sender.UserName!, out var senderConns))
            {
                foreach (var conn in senderConns)
                {
                    if (conn != Context.ConnectionId)
                        await Clients.Client(conn).SendAsync("ReceiveMessage", responseMsg);
                }
            }

            // Send updated user list to the receiver so their sidebar shows the new unread count
            if (connections.TryGetValue(receiver.UserName!, out var receiverConns2))
            {
                var receiverUsers = await GetAllUsers(receiver.Id);
                foreach (var conn in receiverConns2)
                {
                    await Clients.Client(conn).SendAsync("OnlineUsers", receiverUsers);
                }
            }

        }

        public async Task NotifyTyping(string recipientUserName)
        {
            var senderUserName = Context.User!.Identity!.Name;

            if (senderUserName is null) return;

            if (connections.TryGetValue(recipientUserName, out var conns))
            {
                foreach (var conn in conns)
                {
                    await Clients.Client(conn)
                        .SendAsync("NotifyTypingToUser", senderUserName);
                }
            }
        }

        private async Task<IEnumerable<OnlineUserDTO>> GetAllUsers(string? forUserId = null)
        {
            string userId;
            if (forUserId != null)
            {
                userId = forUserId;
            }
            else
            {
                var username = Context.User!.GetUserName();
                var currentUser = await userManager.FindByNameAsync(username);
                if (currentUser is null) return [];
                userId = currentUser.Id;
            }

            var onlineUsersSet = new HashSet<string>(onlineUsers.Keys);

            var unreadMessages = await context.Messages
                .Where(x => x.ReceiverId == userId && !x.IsRead)
                .GroupBy(x => x.SenderId)
                .Select(g => new { SenderId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.SenderId, x => x.Count);

            var users = await userManager.Users
                .Select(u => new OnlineUserDTO
                {
                    Id = u.Id,
                    UserName = u.UserName,
                    FullName = u.FullName,
                    ProfileImage = u.ProfileImage,
                    IsOnline = onlineUsersSet.Contains(u.UserName!),
                    UnreadCount = unreadMessages.ContainsKey(u.Id)
                        ? unreadMessages[u.Id]
                        : 0
                })
                .OrderByDescending(u => u.IsOnline)
                .ToListAsync();

            return users;
        }
    }
}