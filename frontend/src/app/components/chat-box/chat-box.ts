import { Component, inject, ElementRef, ViewChild, AfterViewChecked, DoCheck, viewChild } from '@angular/core';
import { ChatService } from '../../services/chat-service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth-service';
import { DatePipe, TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-chat-box',
  imports: [MatProgressSpinnerModule, DatePipe, TitleCasePipe],
  templateUrl: './chat-box.html',
  styles: `
    .chat-box {
      scroll-behavior: smooth;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;
    }

    .chat-box::-webkit-scrollbar { width: 4px; }
    .chat-box::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.06);
      border-radius: 10px;
    }
    .chat-box::-webkit-scrollbar-track { background: transparent; }
    .chat-box::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.12);
    }
  `,
})
export class ChatBox implements AfterViewChecked, DoCheck{

  @ViewChild('chatBox' , {read: ElementRef}) public chatBox?: ElementRef;


  chatService = inject(ChatService);
  authService = inject(AuthService);
  private pageNumber = 1;
  private currentChatUserId: string | null = null;

  ngDoCheck(): void {
    const openChat = this.chatService.currentOpenedChat();
    if (openChat && openChat.id !== this.currentChatUserId) {
      this.currentChatUserId = openChat.id;
      this.pageNumber = 1;
    } else if (!openChat) {
      this.currentChatUserId = null;
      this.pageNumber = 1;
    }
  }

  loadMoreMesage(){
    this.pageNumber++;
    this.chatService.loadMessages(this.pageNumber);
    this.scrollToTop();
  }

  ngAfterViewChecked(): void {
    if(this.chatService.autoScrollEnabled()){
      this.scrollToBottom();
    }
  }

  scrollToBottom(){
    this.chatService.autoScrollEnabled.set(true);
    this.chatBox!.nativeElement.scrollTo({
      top: this.chatBox!.nativeElement.scrollHeight,
      behavior: 'smooth'
    
    })
  }

  scrollToTop(){
    this.chatService.autoScrollEnabled.set(false);
    this.chatBox!.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth'
    
    })
  }

}
