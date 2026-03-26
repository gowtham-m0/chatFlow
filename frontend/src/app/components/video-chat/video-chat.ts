import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import {  VideoChatService } from '../../services/video-chat-service';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-video-chat',
  imports: [MatIconModule],
  templateUrl: './video-chat.html',
  styles: ``,
})
export class VideoChat implements OnInit{


  @ViewChild("localVideo") localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild("remoteVideo") remoteVideo!: ElementRef<HTMLVideoElement>;

  private peerConnection!: RTCPeerConnection;
  signalRService = inject(VideoChatService);
  private dialogRef : MatDialogRef<VideoChat> = inject(MatDialogRef);



  ngOnInit(): void {
      this.setupPeerConnection();
      this.startLocalVideo();
      this.signalRService.startConnection();
      this.setupSignalListerners();
  }

  setupSignalListerners(){

    this.signalRService.hubConnection?.on('CallEnded',()=>{
      // Task Todo endcall();
    })

    this.signalRService.answerReceived.subscribe(async(data)=>{
      if(data){
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    })

    this.signalRService.iceCandidateReceived.subscribe(async(data)=>{
      if(data){
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    })

  }

  declineCall(){
    this.signalRService.incomingCall = false;
    this.signalRService.isCallActive = false;
    this.signalRService.sendEndCall(this.signalRService.remoteUserId);
    this.dialogRef.close();
  }

  async acceptCall(){
    this.signalRService.incomingCall = false;
    this.signalRService.isCallActive = true;

    let offer = await this.signalRService.offerReceived.getValue()?.offer;

    if(offer){
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      let answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.signalRService.sendAnswer(this.signalRService.remoteUserId, offer);

    }

  }

  async startCall(){
    this.signalRService.incomingCall = false;
    this.signalRService.isCallActive = true;

    let offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.signalRService.sendOffer(this.signalRService.remoteUserId, offer);

  }

  setupPeerConnection(){
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{urls: 'stun:stun.l.google.com:19302'},{
        urls: 'stun.stun.services.mozilla.com'
      }]
    });
    this.peerConnection.onicecandidate = (event)=>{
      if(event.candidate){
        this.signalRService.sendIceCandidate(this.signalRService.remoteUserId, event.candidate);
      }
    }

    this.peerConnection.ontrack = (event)=>{
      this.remoteVideo.nativeElement.srcObject = event.streams[0];
    }
  }

  async startLocalVideo(){
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })

    this.localVideo.nativeElement.srcObject = stream;

    stream.getTracks()
      .forEach((track)=>{
        this.peerConnection.addTrack(track,stream);
      })
  }

  async endCall(){
    if(this.peerConnection){
      this.dialogRef.close();
      this.signalRService.isCallActive = false;
      this.signalRService.incomingCall = false;
      this.signalRService.remoteUserId = '';
      this.peerConnection.close();
      this.peerConnection = new RTCPeerConnection();
      this.localVideo.nativeElement.srcObject = null;
    }
    const stream = this.localVideo.nativeElement.srcObject as MediaStream;

    if(stream){
      stream.getTracks().forEach((track)=>{
        track.stop();
      });
      this.localVideo.nativeElement.srcObject = null;
    }

    this.signalRService.sendEndCall(this.signalRService.remoteUserId);
  }

}
