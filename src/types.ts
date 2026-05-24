/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AIConfig {
  brandTone: 'formal' | 'friendly' | 'casual' | 'professional';
  language: string; // e.g. "id" or "en"
  customContext: string; // info promo, kebijakan, dll.
  replyGuidelines: string; // aturan reply: "jangan sebut kompetitor", dsb.
  strengths: string; // keunggulan usaha
  supportContact: string; // kontak penyelesaian masalah
}

export interface NotificationConfigs {
  telegramEnabled: boolean;
  telegramChatId: string;
  telegramBotToken: string;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  whatsappApiKey: string;
  discordEnabled: boolean;
  discordWebhookUrl: string;
  notifyOnRatingBelow: number; // default 3, trigger if rating <= notifyOnRatingBelow
  aiAutoReply: boolean; // auto-reply without approval
}

export interface Tenant {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  category: string; // restoran | klinik | hotel | toko | cafe | dll.
  description: string;
  address: string;
  phone: string;
  website: string;
  openingHours: string;
  coverImage: string;
  avgRating: number;
  totalReviews: number;
  aiConfig: AIConfig;
  notificationConfigs: NotificationConfigs;
  createdAt: string;
}

export interface Review {
  id: string;
  tenantId: string;
  reviewerName: string;
  rating: number; // 1-5
  comment: string;
  sentimentScore: number; // 0-100 diisi oleh Gemini
  sentimentLabel: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  topics: string[];
  isCrisis: boolean;
  notifiedAt: string | null;
  repliedAt: string | null;
  createdAt: string;
  reply?: ReviewReply;
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  content: string;
  isAiGenerated: boolean;
  aiDraft: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  tenantId: string;
  tenantName: string;
  eventType: 'review_received' | 'sentiment_analyzed' | 'notification_sent' | 'reply_sent' | 'reply_drafted' | 'config_updated' | 'tenant_created';
  channel: 'telegram' | 'whatsapp' | 'gmail' | 'discord' | 'system' | null;
  payload: string; // Deskripsi detail
  status: 'success' | 'failed' | 'pending';
  errorMessage: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'reviewer';
  createdAt: string;
}

export interface DBState {
  users: User[];
  tenants: Tenant[];
  reviews: Review[];
  replies: ReviewReply[];
  logs: ActivityLog[];
}
