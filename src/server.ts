import express from 'express';
import Redis from 'ioredis';
import { Server, Socket } from "socket.io";
import { getRandomName } from './name-generator';
import RedisService from './redis_service';
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

let redis_service = new RedisService(redis_client);

let userSockets : InvertedWeakMap<string, Socket> = new InvertedWeakMap(); //keep track of socket objects, so that we can make them join rooms

io.on('connection', async (socket): Promise<void> => {
  let userId = socket.id;
  let namespacedUser = `user:${userId}`;
  userSockets.set(namespacedUser, socket);
  console.log("user connected");
  await redis_service.addUser(userId);
  socket.on('disconnect', async () => {
    console.log('user disconnected');
    await redis_service.removeUser(userId);
  });
  socket.on('tabUpdated', async (url : string, tabId : string, lastUrl? : string) => {
    if(lastUrl){
      let lastUrl = await redis_service.getUserLastUrl(userId);
      await redis_service.untrackUserFromWebpage(userId, lastUrl);
    }
    await redis_service.trackUserOnWebpage(userId, url);
    await redis_service.addWebpageToUserWebpages(userId, url);
    const numUsers : number = await redis_service.numUsersOnWebpage(url);
    if(numUsers > 1){
      const usersOnWebpage : string[] = await redis_service.listUsersOnWebpage(url);
      usersOnWebpage.forEach((user : string) => {
        userSockets.get(user).join(`room:${url}`); //join all users on the webpage to a room
        redis_service.addRoomToUser(userId, url);
        redis_service.setUserRoomTab(userId, url, tabId);
      });
    }
  });
  socket.on('disconnecting', async () => {
    redis_service.deleteUserRooms(userId);
    redis_service.deleteUserRoomTabs(userId);
    redis_service.clearUserWebpages(userId);
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});