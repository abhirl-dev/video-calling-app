import { Socket } from "./Socket";

/**
 * @type {MediaStreamConstraints}
 */
const mediaStreamContraints = {
    video: {
        width: { ideal: 240 },
        height: { ideal: 180 },
        frameRate: {
            ideal: 15,
            max: 15
        },
    },
    audio: {
        sampleRate: 8000,
        channelCount: 1,
    }
};

/**
 * Config for web rtc ice servers in case of network connection
 * failures the rtc will be redirected over google stun server ...
 * {iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]}
 */
class WebRTC {
    /**
     * @type {RTCPeerConnection}
     */
    #peerConnection
    /**
     * @type {Socket}
     */
    #webSocket
    /**
     * @type {MediaStream}
     */
    #mediaStream
    /**
     * @type {string}
     */
    #topic

    /**
     * @type {Map<string, RTCPeerConnection>}
     */
    peerConnections;

    /**
     * @param {RTCConfiguration} config 
     * @param {string} webSocketURL
     * @param {string} topic 
     */
    constructor(config, webSocketURL, topic = "/comm/sdp") {
        this.#peerConnection = new RTCPeerConnection(config);
        this.#webSocket = new Socket({
            url: webSocketURL,
            username: "admin",
            password: "admin",
            reconnect: true,
        });
        this.#topic = topic;
        this.#init();
    }

    #init() {
        console.info("WEB RTC initialization completed ... CONNECTION OK");
        this.#webSocket.subscribe(this.#topic);

        this.#peerConnection.ontrack = (ev => {
            this.onReceiveStream(ev);
        });

        // Handle ICE candidates
        this.#peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.#webSocket.publish(this.#topic, "call", { type: "ice-candidate", candidate: event.candidate });
            }
        };

        // Handle signaling messages
        this.#webSocket.onMessage = async (message) => {
            try {
                const { topic, event, data } = message;

                switch (data.type) {
                    case "offer":
                        // Handle incoming offer
                        await this.#peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

                        // Create and send an SDP answer
                        const answer = await this.#peerConnection.createAnswer();
                        await this.#peerConnection.setLocalDescription(answer);

                        this.#webSocket.publish(this.#topic, "call", { type: "answer", answer });
                        break;

                    case "answer":
                        // Handle incoming answer
                        await this.#peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                        break;

                    case "ice-candidate":
                        // Add incoming ICE candidates
                        if (data.candidate) {
                            await this.#peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                        }
                        break;

                    default:
                        console.error("Unknown message type:", data.type);
                }
            } catch (error) {
                console.error(error);
            }
        };
    }

    /**
     * @param {boolean} [enableAudio=true] 
     * @param {boolean} [enableVideo=true] 
     * @returns {Promise<MediaStream>}
     */
    async getLocalStream(enableAudio = true, enableVideo = true) {
        this.#mediaStream = await navigator.mediaDevices.getUserMedia(mediaStreamContraints);
        this.enableAudio(enableAudio);
        this.enableVideo(enableVideo);
        return this.#mediaStream;
    }

    /**
     * @param {MediaStream} [mediaStream=this.#mediaStream] 
     */
    async startStream(mediaStream = this.#mediaStream) {
        mediaStream.getTracks().forEach((track) => {
            this.#peerConnection.addTrack(track, mediaStream);
        });

        const offer = await this.#peerConnection.createOffer();
        await this.#peerConnection.setLocalDescription(offer);

        // Send the offer to the signaling server
        this.#webSocket.publish(this.#topic, "call", { type: "offer", offer });
    }

    enableAudio(enable = true) {
        this.#mediaStream.getAudioTracks().forEach(track => {
            track.enabled = enable;
        });
    }

    enableVideo(enable = true) {
        this.#mediaStream.getVideoTracks().forEach(track => {
            track.enabled = enable;
        });
    }

    stopStream() {
        this.#webSocket.disconnect();
        if (this.#peerConnection)
            this.#peerConnection.close();
        if (this.#mediaStream)
            this.#mediaStream.getTracks().forEach((track) => track.stop());

        this.onClose("Stream stopped");
    }

    onReceiveStream = ((track = new RTCTrackEvent()) => { });
    onClose = ((message = "") => { });






    //#########################################################
    //################## BETA #################################
    //#########################################################
    /**
     * @param {string} peerId 
     * @param {MediaStream} stream 
     * @returns {Promise<RTCPeerConnection>}
     */
    async createPeerConnection(peerId, stream) {
        const pc = new RTCPeerConnection();
        this.peerConnections[peerId] = pc;

        // Add tracks to peer connection
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.#webSocket.publish(this.#topic, "call", { type: 'candidate', peerId, candidate: event.candidate });
            }
        };

        // Handle incoming remote stream
        pc.ontrack = (event) => {
            const remoteVideo = document.createElement('video');
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.autoplay = true;
            document.getElementById('videos').appendChild(remoteVideo);
        };

        return pc;
    }

    async createOffer(peerId) {
        const pc = await createPeerConnection(peerId, localStream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.#webSocket.publish(this.#topic, "call", { type: 'offer', peerId, offer });
    }
    //#########################################################
    //################## BETA #################################
    //#########################################################
}

export { WebRTC };