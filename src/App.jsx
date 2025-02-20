import { useState, useRef, useEffect } from 'react'
import { WebRTC } from './js/WebRTC';
import './App.css'
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa';

const URL = Object.freeze({
  dev: import.meta.env.VITE_WS_URL_DEV,
  prod: import.meta.env.VITE_WSS_URL_PROD
})

/**
 * @type {WebRTC}
 */
var webRtc;
/**
 * @type {MediaStream}
 */
var localStream;

function App() {
  const [onCall, setOnCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [stremVideo, setStreamVideo] = useState(false);

  const localVideo = useRef();
  const remoteVideo = useRef();

  useEffect(() => {
    _onInit();
    // setTimeout(() => {
    //     _startCall();
    // }, 500);

    return () => {
      webRtc.stopStream();
    };
  }, [])

  function _onInit() {
    webRtc = new WebRTC(
      {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }
        ]
      },
      URL.prod,
    );

    webRtc.onReceiveStream = (track) => {
      remoteVideo.current.srcObject = track.streams[0];
    }

    setTimeout(() => {
      _startCall();
    }, 3000);

    // webRtc.onClose = (e) => {
    //     localVideo.current.srcObject = null;
    //     remoteVideo.current.srcObject = null;
    // };
  }

  // function _onBack() {
  //   webRtc.stopStream();
  //   localVideo.current.srcObject = null;
  //   remoteVideo.current.srcObject = null;
  //   onBackClick();
  // }

  // function _onHang() {
  //   onHangUp();
  //   _onBack();
  //   setOnCall(false);
  // }

  async function _startCall() {
    setOnCall(true);
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !muted;
    });
    localStream.getVideoTracks().forEach(track => {
      track.enabled = !stremVideo;
    });
    localVideo.current.srcObject = localStream; // Play local video
    webRtc.startStream(localStream);
  }

  function _toogleAudio() {
    setMuted(!muted);

    localStream.getAudioTracks().forEach(track => {
      track.enabled = muted;
    })
  }

  function _toogleVideo() {
    setStreamVideo(!stremVideo);

    localStream.getVideoTracks().forEach(track => {
      track.enabled = stremVideo;
    })
  }

  return (
    <div className="container">

      <video className="video-1" ref={remoteVideo} autoPlay playsInline></video>

      <video className="video-2" ref={localVideo} autoPlay playsInline muted></video>

      <div className='controls' >
        <div className='floating-button' onClick={_toogleAudio}>
          {
            muted
              ? <FaMicrophoneSlash color='#FFF' size={20} />
              : <FaMicrophone color='#FFF' size={20} />
          }
        </div>

        <div className='floating-button' onClick={_toogleVideo}>
          {
            !stremVideo
              ? <FaVideo color='#FFF' size={20} />
              : <FaVideoSlash color='#FFF' size={20} />
          }
        </div>
      </div>
    </div>
  )
}

export default App
