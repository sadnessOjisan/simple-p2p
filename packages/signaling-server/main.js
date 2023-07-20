import express from "express";
const app = express();
import http from "http";
const server = http.createServer(app);
import { Server } from "socket.io";
import {
  JOIN_ROOM,
  SET_UP_CAMERA,
  CALL,
  OFFER,
  ANSWER,
  SEND_ICE,
} from "ws-events";
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on(
    "JOIN_ROOM",
    (
      /** @type string */
      roomId
    ) => {
      socket.join(roomId);
      socket.emit("SET_UP_CAMERA");
    }
  );

  socket.on(
    OFFER,
    (
      /** @type string */
      roomId,
      /** @type  RTCSessionDescriptionInit*/
      sdp
    ) => {
      io.to(roomId).except(socket.id).emit(OFFER, sdp);
    }
  );

  socket.on(
    ANSWER,
    (
      /** @type string */
      roomId,
      /** @type  RTCSessionDescriptionInit*/
      sdp
    ) => {
      io.to(roomId).except(socket.id).emit(ANSWER, sdp);
    }
  );

  socket.on(
    "SEND_ICE",
    (
      /** @type string */
      roomId,
      /** @type  RTCIceCandidate*/
      ice
    ) => {
      io.to(roomId).except(socket.id).emit(SEND_ICE, ice);
    }
  );

  socket.on(
    CALL,
    (
      /** @type string */
      roomId
    ) => {
      io.to(roomId).except(socket.id).emit(CALL);
    }
  );
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
