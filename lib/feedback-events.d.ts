import type { Context } from '@deepseek-ai/cordis';
import type { FeedbackNotifications } from './feedback-notifications.js';
/** 仅电脑原页面使用；沿用 Connection 的 Cookie、Host/Origin 校验。 */
export declare function registerFeedbackEvents(ctx: Context, notifications: FeedbackNotifications): () => Promise<void>;
