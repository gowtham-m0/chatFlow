import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user';
import { AuthService } from './auth-service';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Message } from '../models/message';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private authService = inject(AuthService);
  private hubUrl = '/hubs/chat';

  onlineUsers = signal<User[]>([]);
  chatMessages = signal<Message[]>([]);
  currentOpenedChat = signal<User | null>(null);
  isLoading = signal<boolean>(true);

  autoScrollEnabled = signal<boolean>(true);


  // Managed typing timeouts per user (prevents overlapping setTimeout flicker)
  private typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  // Debounce timer for outgoing typing notifications
  private typingDebounceTimer?: ReturnType<typeof setTimeout>;

  private hubConnection?: HubConnection;

  startConnection(token: string, senderId?: string) {

    // Block if token is missing
    if (!token) {
      console.warn('ChatService: no access token, skipping SignalR connection');
      return;
    }

    // Block if already connected, connecting, or reconnecting — not just Connected
    if (
      this.hubConnection?.state === HubConnectionState.Connected ||
      this.hubConnection?.state === HubConnectionState.Connecting ||
      this.hubConnection?.state === HubConnectionState.Reconnecting
    ) return;

    if (this.hubConnection) {
      this.hubConnection.off('Notify');
      this.hubConnection.off('NotifyTypingToUser');
      this.hubConnection.off('OnlineUsers');
      this.hubConnection.off('ReceiveMessageList');
      this.hubConnection.off('ReceiveMessage');
      this.hubConnection.off('MessagesRead');
    }


    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${this.hubUrl}?senderId=${senderId || ''}`, {
        // Use a factory so the latest token is always provided (e.g. on reconnect)
        accessTokenFactory: () => this.authService.getAccessToken ?? token,
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('Connection started');
      })
      .catch((error) => {
        console.error('Error starting connection: ', error);
      });

    this.hubConnection!.on('Notify', (user: User)=>{
      Notification.requestPermission().then((result)=>{
        if(result === 'granted'){
          new Notification('Active Now 🟢' , {
            body: user.fullName + " is online",
            icon: user.profileImage
          })
        }
      });
    });

    this.hubConnection!.on('NotifyTypingToUser', (senderUserName)=>{
      // Set typing to true
      this.onlineUsers.update(users=>
        users.map((user)=> user.userName === senderUserName
          ? { ...user, isTyping: true }
          : user
        )
      );

      // Clear any existing timeout for this user before setting a new one
      const existingTimeout = this.typingTimeouts.get(senderUserName);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeout = setTimeout(() => {
        this.onlineUsers.update((users)=>
          users.map((user)=> user.userName === senderUserName
            ? { ...user, isTyping: false }
            : user
          )
        );
        this.typingTimeouts.delete(senderUserName);
      }, 3000);

      this.typingTimeouts.set(senderUserName, timeout);
    });

    this.hubConnection!.on('OnlineUsers', (serverUsers: User[]) => {
      // Preserve existing isTyping state when merging server data
      const currentUsers = this.onlineUsers();
      const typingMap = new Map(currentUsers.map(u => [u.userName, u.isTyping]));

      this.onlineUsers.set(
        serverUsers
          .filter((u) => u.userName !== this.authService.currentLoggedUser?.userName)
          .map(u => ({ ...u, isTyping: typingMap.get(u.userName) || false }))
      );
    });

    this.hubConnection!.on('ReceiveMessageList',(message)=>{
      this.isLoading.update(()=>true);
      this.chatMessages.update((messages) => [...message, ...messages]);
      this.isLoading.update(()=>false);
    });

    this.hubConnection!.on('ReceiveMessage', (message: Message) => {
      const currentChat = this.currentOpenedChat();
      if (currentChat && message.senderId === currentChat.id) {
        // Message is from the currently opened chat — add it to the conversation
        this.chatMessages.update((messages) => [...messages, message]);
      } else {
        // Message is from someone else — increment their unread count in the sidebar
        this.onlineUsers.update(users =>
          users.map(u => u.id === message.senderId
            ? { ...u, unreadCount: (u.unreadCount || 0) + 1 }
            : u
          )
        );

        // Update document title with total unread count
        const totalUnread = this.onlineUsers().reduce((sum, u) => sum + (u.unreadCount || 0), 0);
        document.title = totalUnread > 0 ? `(${totalUnread}) New Messages` : 'Chat';
      }
    });

    // Handle read receipts from the server
    this.hubConnection!.on('MessagesRead', (messageIds: number[]) => {
      this.chatMessages.update(messages =>
        messages.map(msg =>
          messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
        )
      );
    });

  }

  disconnectConnection() {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      this.hubConnection.stop().catch((error) => console.log(error));
    }
  }

  sendMessage(message: string){
    this.chatMessages.update((messages) => [
      ...messages,
      {
        content: message,
        senderId: this.authService.currentLoggedUser!.id,
        receiverId: this.currentOpenedChat()?.id!,
        createdDate: new Date().toISOString(),
        isRead: false,
        id: 0,
      }
    ])

    this.hubConnection?.invoke('SendMessage',{
      receiverId: this.currentOpenedChat()?.id!,
      content: message
    })
    .then((id)=>{
      console.log('Message sent to ', id);
    })
    .catch((error)=>{
      console.log(error);
    })
  }

  status(userName : string | undefined) : string {
    const currentChatUser = this.currentOpenedChat();
    if(!currentChatUser){
      return 'Offline';
    }
    const onlineUsers = this.onlineUsers().find(
      (user) => user.userName === userName
    )

    return onlineUsers?.isTyping ? 'Typing...' : this.isUserOnline();
  }

  isUserOnline(){
    let onlineUser = this.onlineUsers().find(user=>user.userName === this.currentOpenedChat()?.userName);

    return onlineUser?.isOnline ? 'Online' : 'Offline';
  }

  loadMessages(pageNumber: number){
    this.isLoading.update(()=>true);
    console.log(pageNumber);
    this.hubConnection?.invoke('LoadMessages', this.currentOpenedChat()?.id,pageNumber)
    .then()
    .catch()
    .finally(()=>{
      this.isLoading.update(()=>false);
    })
  }

  notifyTyping(){
    // Debounce: only send one typing notification every 2 seconds
    if (this.typingDebounceTimer) return;

    this.hubConnection!.invoke('NotifyTyping', this.currentOpenedChat()?.userName)
    .catch((error)=>{
      console.log(error);
    });

    this.typingDebounceTimer = setTimeout(() => {
      this.typingDebounceTimer = undefined;
    }, 2000);
  }

}
