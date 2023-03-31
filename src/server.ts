import express from 'express';
import Redis from 'ioredis';
import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { getRandomName } from './name-generator';
const http = require('http');
const app = express();
const server = http.createServer(app);
const io : Server = new Server<ClientToServerEvents, ServerToClientEvents, SocketData>(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
let redis_client : Redis;

//websocket event interface

interface ServerToClientEvents {

}

interface ClientToServerEvents {
  tabUpdated : (url : string, tabId : number) => void
  disconnect : () => void
}

interface SocketData {
  userName : string
}

if(process.env.REDIS_URL){
    redis_client = new Redis(process.env.REDIS_URL);
}
else{
    redis_client = new Redis({
        host: 'localhost',
        port: 6379
    });
}

let userSockets : Map<string, Socket> = new Map(); //keep track of socket objects, so that we can make them join rooms

io.on('connection', async (socket): Promise<void> => {
  userSockets.set(`user:${socket.id}`, socket);
  console.log("user connected");
  await redis_client.hset(`user:${socket.id}`, "name", getRandomName(socket.id));
  socket.on('disconnect', async () => {
    console.log('user disconnected');
    await redis_client.srem("users", socket.id);
  });
  socket.on('tabUpdated', async (url : string, tabId : number, lastUrl? : string) => {
    if(lastUrl){
      let lastUrl = await redis_client.get(`user:${socket.id}:lastUrl`);
      await redis_client.srem(`url:${lastUrl}`, `user:${socket.id}`);
    }
    await redis_client.sadd(`url:${url}`, `user:${socket.id}`);
    const numUsers : number = await redis_client.scard(`url:${url}`);
    if(numUsers > 1){
      const usersOnWebpage : string[] = await redis_client.smembers(`url:${url}`);
      usersOnWebpage.forEach((user : string) => {
        userSockets.get(user).join(`room:${url}`); //join all users on the webpage to a room
        redis_client.sadd(`${user}:rooms`, `room:${url}`);
        redis_client.hset(`${user}:rooms`, `room:${url}`, tabId);
        redis_client.zrevrange
      });
    }
  });
  socket.on('disconnecting', async () => {
    socket.rooms.forEach((room) => {

    })
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});