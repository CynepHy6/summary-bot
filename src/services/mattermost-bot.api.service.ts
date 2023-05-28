import Client from "https://cdn.skypack.dev/-/@mattermost/client@v7.10.0-EsAv9w5r3ibkv7QGOIbO/dist=es2019,mode=imports/optimized/@mattermost/client.js";
import {
  MattermostClient,
  PaginatedPostOptions,
  Post,
  ThreadInfo,
  User,
  Users,
} from "../interfaces.ts";

export class MattermostBotApiService {
  private client: MattermostClient;
  private maxRate = 5;
  private me?: User;

  constructor(token: string, host: string) {
    this.client = new Client.Client4();
    this.client.setToken(token);
    this.client.setUrl(host);
  }

  async getPostThread(
    postId: string,
    filter?: (post: Post) => boolean,
  ): Promise<Post[]> {
    const defaultOptions: PaginatedPostOptions = {
      fetchThreads: true,
      collapsedThreads: false,
      collapsedThreadsExtended: false,
      fetchAll: true,
    };
    const { order, posts } = await this.client.getPaginatedPostThread(postId, defaultOptions);
    const result = order.map((postId: string) => posts[postId])
      .sort((a, b) => a.create_at - b.create_at);
    if (filter) {
      return result.filter(filter);
    }
    return result;
  }

  setMaxRate(maxRate: number) {
    this.maxRate = maxRate;
  }

  async getThreadInfo(posts: Post[]): Promise<ThreadInfo> {
    const userIds: string[] = [];

    const cleanedPosts = posts.map(
      ({ message, create_at, id, channel_id, props, user_id }) => {
        if (!userIds.includes(user_id)) {
          userIds.push(user_id);
        }
        return { message, create_at, id, channel_id, props, user_id };
      },
    ).filter((post) => !(post.props?.from_bot === "true"));

    const users = await this.getUsersByIds(userIds);

    const content: string[] = [];
    let lastUserId: string | undefined = undefined;
    let message: string | undefined = undefined;
    for (let i = 0; i < cleanedPosts.length; i++) {
      const post = cleanedPosts[i];
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

      if (i === cleanedPosts.length - 1) {
        content.push(message);
      }
    }

    const { id: rootId, channel_id: channelId } = cleanedPosts[0];

    return { channelId, rootId, content: content.join("\n") };
  }

  async cleanupThreadFromMe(posts: Post[] = []): Promise<void> {
    if (!posts.length) {
      return;
    }
    await this.getMe();
    const meId = this.me?.id;
    const mePosts = posts.filter((post) => post.user_id === meId);
    await Promise.all(mePosts.map((post) => this.client.deletePost(post.id)));
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

  async getMe(): Promise<User> {
    if (!this.me) {
      this.me = await this.client.getMe();
    }
    return this.me;
  }

  async createThreadReplyStream(
    channelId: string,
    rootId: string,
    stream: AsyncGenerator<string>,
    prefix?: string,
  ): Promise<void> {
    let replyId: string | undefined = undefined;

    const message = prefix ? [`${prefix}: `] : [];
    let count = 0;
    for await (const token of stream) {
      message.push(token);
      count++;
      if (count > this.maxRate) {
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
