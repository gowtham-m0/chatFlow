import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat-service';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatBox } from '../chat-box/chat-box';
import { VideoChatService } from '../../services/video-chat-service';
import { MatDialog } from '@angular/material/dialog';
import { VideoChat } from '../video-chat/video-chat';

@Component({
  selector: 'app-chat-window',
  imports: [TitleCasePipe, FormsModule, ChatBox],
  templateUrl: './chat-window.html',
  styles: ``
})
export class ChatWindow {

  @ViewChild('chatBox') chatContainer?: ElementRef;

  chatService = inject(ChatService);
  signalRService = inject(VideoChatService);
  dialog = inject(MatDialog);
  message: string = '';

  sendMessage() {
    if (this.message.trim() === '') return;
    this.chatService.sendMessage(this.message);
    this.message = '';
    this.scrollToBottom();
  }

  closeChat() {
    this.chatService.currentOpenedChat.set(null);
    this.chatService.chatMessages.set([]);
  }

  displayDialog(receiverId: string){
    this.signalRService.remoteUserId = receiverId;
    this.dialog.open(VideoChat,{
      width: "400px",
      height: "600px",
      disableClose: false,
      autoFocus: false
    })
  }

  private scrollToBottom(){
    if(this.chatContainer){
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }
  }
}
