// WebRTC setup for browser streaming
export class WebRTCStreamer {
  private peerConnection: RTCPeerConnection | null = null;
  private mediaStream: MediaStream | null = null;

  async initialize(): Promise<void> {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });

    console.log('[WebRTC] Initialized');
  }

  async addVideoTrack(track: MediaStreamTrack): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    if (!this.mediaStream) {
      this.mediaStream = new MediaStream();
    }

    this.mediaStream.addTrack(track);
    this.peerConnection.addTrack(track, this.mediaStream);

    console.log('[WebRTC] Video track added');
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    return offer;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(description);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.addIceCandidate(candidate);
  }

  onIceCandidate(callback: (candidate: RTCIceCandidate | null) => void): void {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    this.peerConnection.onicecandidate = (event) => {
      callback(event.candidate);
    };
  }

  onTrack(callback: (track: MediaStreamTrack) => void): void {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    this.peerConnection.ontrack = (event) => {
      callback(event.track);
    };
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }

  close(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    console.log('[WebRTC] Closed');
  }
}
