import { Redis } from "ioredis";
import { getRandomName } from "./name-generator";

export default class RedisService{
    
    private redis: Redis

    constructor(redis: Redis){
        this.redis = redis;
    }

    async getUserLastUrl(userId: string): Promise<string>{
        return this.redis.get(`user:${userId}:lasturl`);
    };

    async addUser(userId: string): Promise<number>{
        return this.redis.hset(`user:${userId}`, "name", getRandomName(userId));
    }

    async removeUser(userId: string): Promise<number>{
        return this.redis.srem("users", userId);
    }

    async trackUserOnWebpage(userId: string, url: string): Promise<number>{
        return this.redis.sadd(`url:${url}`, `user:${userId}`);
    }

    async untrackUserFromWebpage(userId: string, lastUrl: string): Promise<number>{
        return this.redis.srem(`url:${lastUrl}`, `user:${userId}`);
    }

    async addWebpageToUserWebpages(userId: string, url: string){
        return this.redis.sadd(`user:${userId}:urls`, url);
    }

    async clearUserWebpages(userId: string): Promise<number>{ //TODO: wrap this in a promise instead
        let urls = await this.redis.smembers(`user:${userId}:urls`);
        let result: number = 0; //number of srems that failed
        for(let i = 0; i < urls.length; i++){
            let url = urls[i];
            result += await this.untrackUserFromWebpage(userId, url) == 0 ? 1 : 0;
        }
        return result;
    }

    async numUsersOnWebpage(url: string): Promise<number>{
        return this.redis.scard(`url:${url}`);
    }

    async listUsersOnWebpage(url: string): Promise<string[]>{
        return this.redis.smembers(`url:${url}`);
    }

    async addRoomToUser(userId: string, url: string): Promise<number>{
        return this.redis.sadd(`${userId}:rooms`, `room:${url}`);
    }

    async deleteUserRooms(userId: string){
        return this.redis.del(`${userId}:rooms`);
    }

    async setUserRoomTab(userId: string, url: string, tabId: string): Promise<number>{
        return this.redis.hset(`${userId}:rooms:tabs`, `room:${url}`, tabId);
    }

    async deleteUserRoomTabs(userId: string){
        return this.redis.del(`${userId}:rooms:tabs`);
    }
}