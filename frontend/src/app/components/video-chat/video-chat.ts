import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { VideoChatService } from '../../services/video-chat-service';
import { MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-video-chat',
  imports: [MatIconModule],
  templateUrl: './video-chat.html',
  styles: `
    .no-camera-overlay {
      background: radial-gradient(ellipse at center, #1a1d26 0%, #0d0f14 100%);
    }
    .pulse-ring {
      animation: pulse-ring 2s ease-out infinite;
    }
    @keyframes pulse-ring {
      0%   { transform: scale(0.9); opacity: 0.6; }
      50%  { transform: scale(1.05); opacity: 0.3; }
      100% { transform: scale(0.9); opacity: 0.6; }
    }
  `,
})
export class VideoChat implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  private peerConnection!: RTCPeerConnection;
  signalRService = inject(VideoChatService);
  private dialogRef: MatDialogRef<VideoChat> = inject(MatDialogRef);

  /** True when the browser cannot access any camera */
  cameraUnavailable = false;
  cameraErrorMessage = '';

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // startConnection is now idempotent — safe to call every time the dialog opens
    this.signalRService.startConnection();
    this.setupPeerConnection();
    this.setupSignalListeners();
    this.startLocalVideo();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  // ─── SignalR listeners ──────────────────────────────────────────────────────

  setupSignalListeners() {
    // Register 'CallEnded' directly on the hub connection if it exists
    this.signalRService.hubConnection?.on('CallEnded', () => {
      this.endCall();
    });

    const answerSub = this.signalRService.answerReceived.subscribe(async data => {
      if (data) {
        try {
          // Only process if peer connection is in the right state
          if (
            this.peerConnection.signalingState === 'have-local-offer' ||
            this.peerConnection.signalingState === 'have-remote-pranswer'
          ) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
        } catch (e) {
          console.error('Error setting remote description (answer):', e);
        }
      }
    });

    const iceSub = this.signalRService.iceCandidateReceived.subscribe(async data => {
      if (data) {
        try {
          // Only add ICE candidates once remote description is set
          if (this.peerConnection.remoteDescription) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    });

    this.subscriptions.push(answerSub, iceSub);
  }

  // ─── Call controls ──────────────────────────────────────────────────────────

  declineCall() {
    this.signalRService.incomingCall = false;
    this.signalRService.isCallActive = false;
    this.signalRService.sendEndCall(this.signalRService.remoteUserId);
    this._stopLocalStream();
    this.dialogRef.close();
  }

  async acceptCall() {
    this.signalRService.incomingCall = false;
    this.signalRService.isCallActive = true;

    const offer = this.signalRService.offerReceived.getValue()?.offer;
    if (!offer) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.signalRService.sendAnswer(this.signalRService.remoteUserId, answer);
    } catch (e) {
      console.error('Error accepting call:', e);
    }
  }

  async startCall() {
    this.signalRService.incomingCall = false;
    this.signalRService.isCallActive = true;

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.signalRService.sendOffer(this.signalRService.remoteUserId, offer);
    } catch (e) {
      console.error('Error starting call:', e);
    }
  }

  async endCall() {
    this._stopLocalStream();

    if (this.remoteVideo?.nativeElement) {
      this.remoteVideo.nativeElement.srcObject = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.signalRService.isCallActive = false;
    this.signalRService.incomingCall = false;
    this.signalRService.sendEndCall(this.signalRService.remoteUserId);
    this.signalRService.remoteUserId = '';

    this.dialogRef.close();
  }

  /** Close dialog when camera is unavailable — no active call to clean up. */
  closeDialog() {
    this.dialogRef.close();
  }

  // ─── Peer connection ────────────────────────────────────────────────────────

  setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    });

    this.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        this.signalRService.sendIceCandidate(this.signalRService.remoteUserId, event.candidate);
      }
    };

    this.peerConnection.ontrack = event => {
      if (this.remoteVideo?.nativeElement && event.streams[0]) {
        this.remoteVideo.nativeElement.srcObject = event.streams[0];
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('PeerConnection state:', this.peerConnection.connectionState);
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log('Signaling state:', this.peerConnection.signalingState);
    };
  }

  async startLocalVideo() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      if (this.localVideo?.nativeElement) {
        this.localVideo.nativeElement.srcObject = stream;
        // CRITICAL: mute local playback so you don't hear yourself
        this.localVideo.nativeElement.muted = true;
        this.localVideo.nativeElement.volume = 0;
      }

      stream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, stream);
      });
    } catch (err: any) {
      console.error('Camera/mic access error:', err);
      this.cameraUnavailable = true;

      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.cameraErrorMessage = 'No camera or microphone was found on this device.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.cameraErrorMessage = 'Camera and microphone access was denied. Please allow access in your browser settings.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        this.cameraErrorMessage = 'Your camera is already in use by another application.';
      } else {
        this.cameraErrorMessage = 'Video call is not available on this device.';
      }
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private _stopLocalStream() {
    const videoEl = this.localVideo?.nativeElement;
    if (videoEl) {
      const stream = videoEl.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      videoEl.srcObject = null;
    }
  }
}
