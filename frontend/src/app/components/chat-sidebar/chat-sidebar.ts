import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { ChatService } from '../../services/chat-service';
import { User } from '../../models/user';
import { TypingIndicator } from '../typing-indicator/typing-indicator';

@Component({
  selector: 'app-chat-sidebar',
  imports: [TitleCasePipe, TypingIndicator],
  templateUrl: './chat-sidebar.html',
})
export class ChatSidebar implements OnInit {

  authService = inject(AuthService);
  chatService = inject(ChatService);
  router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
    this.chatService.disconnectConnection();
  }

  ngOnInit(): void {
    this.chatService.startConnection(this.authService.getAccessToken ?? '', this.authService.currentLoggedUser?.id);

  }

  openChatWindow(user: User) {
    this.chatService.currentOpenedChat.set(user);
    this.chatService.chatMessages.set([]);
    this.chatService.isLoading.set(true);
    this.chatService.onlineUsers.update(users =>
      users.map(u => u.id === user.id ? { ...u, unreadCount: 0 } : u)
    );
    // Reset document title since user is reading messages now
    const totalUnread = this.chatService.onlineUsers().reduce((sum, u) => sum + (u.unreadCount || 0), 0);
    document.title = totalUnread > 0 ? `(${totalUnread}) New Messages` : 'Chat';
    this.chatService.loadMessages(1);
  }
}
