import { Socket } from "./Socket";

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
     * @param {RTCConfiguration} config 
     * @param {string} webSocketURL
     * @param {string} topic 
     */
    constructor(config, webSocketURL, topic = "/comm/sdp") {
        this.#peerConnection = new RTCPeerConnection(config);
        this.#webSocket = new Socket({
            url: webSocketURL,
            username: "",
            password: "",
            reconnect: true,
        });
        this.#topic = topic;
        this.#init();
    }

    #init() {
        console.info("web RTC initialization complete ... OK");
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
                        console.log(data.offer);

                        // Handle incoming offer
                        await this.#peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

                        // Create and send an SDP answer
                        const answer = await this.#peerConnection.createAnswer();
                        await this.#peerConnection.setLocalDescription(answer);

                        this.#webSocket.publish(this.#topic, "call", { type: "answer", answer });


                        // send(JSON.stringify({ type: "answer", answer }));
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
     * @param {MediaStream} mediaStream 
     */
    async startStream(mediaStream) {
        this.#mediaStream = mediaStream;
        mediaStream.getTracks().forEach((track) => {
            this.#peerConnection.addTrack(track, mediaStream);
        });

        const offer = await this.#peerConnection.createOffer();
        await this.#peerConnection.setLocalDescription(offer);

        // Send the offer to the signaling server
        // this.#webSocket.send(JSON.stringify({ type: "offer", offer }));
        this.#webSocket.publish(this.#topic, "call", { type: "offer", offer });
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
}

export { WebRTC };