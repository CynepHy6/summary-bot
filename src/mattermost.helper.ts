import { Post } from "./interfaces.ts";

export const getPostsUserIds = (posts: Post[]) =>
  posts.reduce((userIds, { user_id }) => {
    if (!userIds.includes(user_id)) {
      userIds.push(user_id);
    }
    return userIds;
  }, [] as string[]);
