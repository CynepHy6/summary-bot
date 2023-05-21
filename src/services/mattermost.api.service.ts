import Client from "https://cdn.skypack.dev/-/@mattermost/client@v7.10.0-EsAv9w5r3ibkv7QGOIbO/dist=es2019,mode=imports/optimized/@mattermost/client.js";
import {
  MattermostClient,
  Post,
  Thread,
  ThreadInfo,
  Users,
} from "../interfaces.ts";

export class MattermostApiService {
  private client: MattermostClient;

  constructor(token: string, host: string) {
    this.client = new Client.Client4();
    this.client.setToken(token);
    this.client.setUrl(host);
  }

  async getPostThread(postId: string): Promise<Thread> {
    return await this.client.getPostThread(postId);
  }

  async getThreadInfo(
    postId: string,
    trigger: string,
  ): Promise<ThreadInfo> {
    const { order, posts } = await this.getPostThread(postId);
    const userIds: string[] = [];
    const allPosts = order.map((postId: string) => posts[postId])
      .map(({ message, create_at, id, channel_id, props, user_id }) => {
        if (!userIds.includes(user_id)) {
          userIds.push(user_id);
        }
        return { message, create_at, id, channel_id, props, user_id };
      })
      .filter((post) =>
        !(post.message.includes(trigger) || post.props?.from_bot === "true")
      )
      .sort((a, b) => a.create_at - b.create_at);

    const users = await this.getUsersByIds(userIds);

    const content: string[] = [];
    let lastUserId: string | undefined = undefined;
    let message: string | undefined = undefined;
    for (let i = 0; i < allPosts.length; i++) {
      const post = allPosts[i];
      if (lastUserId !== post.user_id) {
        if (message) {
          content.push(message);
          message = undefined;
        }
        lastUserId = post.user_id;
        message = users[post.user_id].nickname + ": " + post.message;
      } else {
        message = `${message}. ${post.message}`;
      }

      if (i === allPosts.length - 1) {
        content.push(message);
      }
    }

    const { id: rootId, channel_id: channelId } = allPosts[0];

    return { channelId, rootId, content: content.join("\n") };
  }

  async getUsersByIds(userIds: string[]): Promise<Users> {
    const usersArr = await this.client.getProfilesByIds(userIds);

    return usersArr.reduce(
      (users, user) => ({ ...users, [user.id]: user }),
      {} as Users,
    );
  }

  async createThreadReply(
    channelId: string,
    rootId: string,
    message: string,
  ): Promise<Post> {
    const post = await this.client.createPost({
      channel_id: channelId,
      message,
      root_id: rootId,
    });

    return post;
  }

  async getMe(): Promise<void> {
    return await this.client.getMe();
  }

  async createThreadReplyStream(
    channelId: string,
    rootId: string,
    stream: AsyncGenerator<string>,
    maxRate = 5,
  ): Promise<void> {
    let replyId: string | undefined = undefined;

    const message = [];
    let count = 0;
    for await (const token of stream) {
      message.push(token);
      count++;
      if (count > maxRate) {
        count = 0;
        replyId = await this.updateOrCreateThreadReply(
          channelId,
          rootId,
          message.join(""),
          replyId,
        );
      }
    }

    await this.updateOrCreateThreadReply(
      channelId,
      rootId,
      message.join(""),
      replyId,
    );
  }

  private async updateOrCreateThreadReply(
    channelId: string,
    rootId: string,
    message: string,
    replyId?: string,
  ): Promise<string> {
    if (!replyId) {
      const reply = await this.createThreadReply(channelId, rootId, message);
      return reply.id;
    }
    await this.client.patchPost({
      channel_id: channelId,
      id: replyId,
      message: message,
    });

    return replyId;
  }
}
