import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { AuthService } from './auth-service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class VideoChatService {
  
  private hubUrl = environment.apiUrl + 'hubs/video';
  public hubConnection?: HubConnection;
  private authService = inject(AuthService);
  public offerReceived = new BehaviorSubject<{senderId: string, offer: RTCSessionDescriptionInit}|null>(null);
  public answerReceived = new BehaviorSubject<{senderId: string, answer: RTCSessionDescription}|null>(null);
  public iceCandidateReceived = new BehaviorSubject<{senderId: string, candidate: RTCIceCandidate}|null>(null);

  public peerConnection!: RTCPeerConnection;

  public incomingCall = false;
  public isCallActive = false;
  public remoteUserId = '';


    

  startConnection(){
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(this.hubUrl,{
        accessTokenFactory: () => this.authService.getAccessToken!
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .catch((err)=> console.error("SignalRConnectionError",err));

    this.hubConnection.on("ReceiveOffer",(sendId: string, offerStr: string)=>{
      const offer = JSON.parse(offerStr) as RTCSessionDescriptionInit;
      this.incomingCall = true;
      this.remoteUserId = sendId;
      this.offerReceived.next({senderId: sendId, offer: offer});
    });
    
    this.hubConnection.on("ReceiveAnswer",(sendId: string, answerStr: string)=>{
      const answer = JSON.parse(answerStr) as RTCSessionDescription;
      this.answerReceived.next({senderId: sendId, answer: answer});
    });

    this.hubConnection.on("ReceiveIceCandidate",(sendId, candidate)=>{
      this.iceCandidateReceived.next({senderId: sendId, candidate: JSON.parse(candidate)});
    
    })
  }

  sendOffer(receiverId: string, offer:RTCSessionDescriptionInit){
    this.hubConnection?.invoke("SendOffer",receiverId,JSON.stringify(offer));
  }

  sendAnswer(receiverId: string, answer: RTCSessionDescriptionInit){
    this.hubConnection?.invoke("SendAnswer", receiverId, JSON.stringify(answer));
  }

  sendIceCandidate(receiverId: string, candidate: RTCIceCandidate){
    this.hubConnection?.invoke("SendIceCandidate", receiverId, JSON.stringify(candidate));
  }

  sendEndCall(receiverId: string){
    this.hubConnection?.invoke("EndCall",receiverId);
  }

}
