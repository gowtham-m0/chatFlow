import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ChatService } from '../../services/chat-service';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatBox } from '../chat-box/chat-box';
import { VideoChatService } from '../../services/video-chat-service';
import { MatDialog } from '@angular/material/dialog';
import { VideoChat } from '../video-chat/video-chat';
import { Subscription } from 'rxjs';
import { ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-chat-window',
  imports: [TitleCasePipe, FormsModule, ChatBox],
  templateUrl: './chat-window.html',
  styles: ``
})
export class ChatWindow implements OnInit, OnDestroy {

  @ViewChild('chatBox') chatContainer?: ElementRef;

  chatService = inject(ChatService);
  signalRService = inject(VideoChatService);
  dialog = inject(MatDialog);
  message: string = '';

  private incomingCallSub?: Subscription;

  ngOnInit(): void {
    // Start the video SignalR connection as soon as the chat page loads
    // so the user is always reachable for incoming calls
    this.signalRService.startConnection();

    // Watch for incoming offers — auto-open the video dialog for the callee
    this.incomingCallSub = this.signalRService.offerReceived.subscribe(data => {
      if (!data) return;

      // Don't re-open if a video dialog is already open
      if (this.dialog.openDialogs.length > 0) return;

      // Open the video modal for the callee — incomingCall flag is already
      // set to true inside the service when the offer arrives
      this.dialog.open(VideoChat, {
        width: '400px',
        height: '600px',
        disableClose: false,
        autoFocus: false,
      });
    });
  }

  ngOnDestroy(): void {
    this.incomingCallSub?.unsubscribe();
  }

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

  displayDialog(receiverId: string) {
    this.signalRService.remoteUserId = receiverId;
    this.dialog.open(VideoChat, {
      width: '400px',
      height: '600px',
      disableClose: false,
      autoFocus: false,
    });
  }

  private scrollToBottom() {
    if (this.chatContainer) {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }
  }
}
