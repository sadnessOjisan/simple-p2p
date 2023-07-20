import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  JOIN_ROOM,
  SET_UP_CAMERA,
  CALL,
  OFFER,
  ANSWER,
  SEND_ICE,
} from "ws-events";

function App() {
  const [room, setRoom] = useState<string | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [peerStream, setPeerStream] = useState<MediaStream | null>(null);
  const [socket, setSocket] = useState<Socket<any, any> | null>(null);

  const [pc, setPc] = useState<RTCPeerConnection | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:3000");
    setSocket(socket);
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: ["stun:stun.l.google.com:19302"],
        },
      ],
    });
    setPc(pc);
    return () => {
      pc.close();
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (room === null || !pc || !socket) {
      return;
    }

    socket.emit(JOIN_ROOM, room);

    socket.on(SET_UP_CAMERA, async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "environment",
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        },
      });
      setMyStream(stream);
      const track = stream.getTracks()[0];
      const senders = pc.getSenders();

      // 同じトラックが既に追加されているかどうかを確認
      const isTrackAlreadyAdded = senders.some(
        (sender) => sender.track === track
      );

      if (!isTrackAlreadyAdded) {
        track && pc.addTrack(track, stream);
      }
    });

    socket.on(CALL, async () => {
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      socket.emit(OFFER, room, offer);
    });

    socket.on(OFFER, async (sdp: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit(ANSWER, room, answer);
    });

    socket.on(ANSWER, async (answer: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(answer);
    });

    pc.onicecandidate = (e) => {
      const ice = e.candidate;
      if (ice === null) {
        return;
      }
      socket.emit(SEND_ICE, room, ice);
    };

    socket.on(SEND_ICE, async (ice: RTCIceCandidate) => {
      await pc.addIceCandidate(ice);
    });

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) {
        throw new Error("stream is not found.");
      }
      setPeerStream(stream);
    };
  }, [room]);

  const myVideoRef = useRef<HTMLVideoElement>(null);
  const peerVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (myStream && myVideoRef.current) {
      myVideoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  useEffect(() => {
    if (peerStream && peerVideoRef.current) {
      peerVideoRef.current.srcObject = peerStream;
    }
  }, [peerStream]);
  return (
    <>
      <div>
        room:{" "}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const room = e.target["room"].value as string;
            setRoom(room);
          }}
        >
          <input name="room" />
          <button>submit</button>
        </form>{" "}
      </div>
      {room && (
        <button
          onClick={async () => {
            if (socket && pc && room) {
              socket.emit("CALL", room);
            }
          }}
        >
          start
        </button>
      )}
      <div style={{ display: "flex" }}>
        <div style={{ width: "50%" }}>
          {peerStream && <video ref={peerVideoRef} autoPlay playsInline />}
        </div>
        <div style={{ width: "50%" }}>
          {myStream && <video ref={myVideoRef} autoPlay playsInline muted />}
        </div>
      </div>
    </>
  );
}

export default App;
