export interface ThreadInfo {
  channelId: string;
  rootId: string;
  content: string;
}

export interface Post {
  id: string;
  create_at: number;
  update_at: number;
  edit_at: number;
  delete_at: number;
  is_pinned: boolean;
  user_id: string;
  channel_id: string;
  root_id: string;
  original_id: string;
  message: string;
  type: string;
  props: { from_bot: string };
  hashtags: string;
  pending_post_id: string;
  reply_count: number;
  last_reply_at: number;
  participants: null;
  metadata: Record<string, unknown>;
}

export interface Thread {
  order: string[];
  posts: { [key: string]: Post };
}

export interface User {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  username: string;
  auth_data: string;
  auth_service: string;
  email: string;
  nickname: string;
  first_name: string;
  last_name: string;
  position: string;
  roles: string;
  props: {
    customStatus: string;
    last_search_pointer: string;
  };
  last_picture_update: number;
  locale: string;
  timezone: {
    automaticTimezone: string;
    manualTimezone: string;
    useAutomaticTimezone: string;
  };
  disable_welcome_email: boolean;
}
export interface Users {
  [key: string]: User;
}

export interface MattermostClient {
  setToken(token: string): void;
  setUrl(host: string): void;
  getPostThread: (postId: string) => Promise<Thread>;
  getThreadInfo: (postId: string, trigger: string) => Promise<ThreadInfo>;
  getProfilesByIds(userIds: string[]): Promise<User[]>;
  createPost(
    options: { channel_id: string; message: string; root_id: string },
  ): Promise<Post>;
  patchPost(options: {
    channel_id: string;
    id: string;
    message?: string;
    file_ids?: string[];
    has_reactions?: boolean;
    props?: string;
  }): Promise<Post>;
}
