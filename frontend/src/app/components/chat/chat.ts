import { Component } from '@angular/core';
import { ChatWindow } from '../chat-window/chat-window';
import { ChatSidebar } from '../chat-sidebar/chat-sidebar';
import { ChatRightSidebar } from '../chat-right-sidebar/chat-right-sidebar';

@Component({
  selector: 'app-chat',
  imports: [ChatSidebar, ChatWindow, ChatRightSidebar],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class Chat {

}
