import dbStoreSeed from '../db_store.json';
import { DBState, User, Tenant, Review, ReviewReply, ActivityLog, AIConfig, NotificationConfigs } from './types';

const DB_STORAGE_KEY = 'reputation_shield_db';
const AUTH_USER_KEY = 'reputation_shield_user';

// Simple UUID Client generator
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Local Storage Safe DB handlers
export function getLocalDB(): DBState {
  if (typeof window === 'undefined') return dbStoreSeed as DBState;
  
  const current = localStorage.getItem(DB_STORAGE_KEY);
  if (!current) {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(dbStoreSeed));
    return JSON.parse(JSON.stringify(dbStoreSeed)) as DBState;
  }
  try {
    return JSON.parse(current) as DBState;
  } catch (e) {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(dbStoreSeed));
    return JSON.parse(JSON.stringify(dbStoreSeed)) as DBState;
  }
}

export function saveLocalDB(state: DBState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state));
  }
}

export function getAuthUser(db: DBState): User {
  if (typeof window === 'undefined') return dbStoreSeed.users[0] as User;
  
  const stored = localStorage.getItem(AUTH_USER_KEY);
  if (stored) {
    try {
      const u = JSON.parse(stored) as User;
      const verified = db.users.find(x => x.id === u.id);
      if (verified) return verified;
    } catch (e) {}
  }
  const defaultUser = db.users[0] as User;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(defaultUser));
  return defaultUser;
}

export function saveAuthUser(user: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
}

// Client Side Fallback Sentiment Analyzer
function analyzeSentimentLocal(text: string, rating: number) {
  let sentimentLabel: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' = 'neutral';
  let sentimentScore = 50;
  let isCrisis = false;
  let topics = ['umum'];

  if (rating <= 2) {
    sentimentLabel = rating === 1 ? 'very_negative' : 'negative';
    sentimentScore = rating === 1 ? 12 : 28;
    isCrisis = true;
    topics = ['komplain', 'krisis', 'pelayanan'];
  } else if (rating === 3) {
    sentimentLabel = 'neutral';
    sentimentScore = 52;
    topics = ['masukan', 'saran'];
  } else {
    sentimentLabel = rating === 5 ? 'very_positive' : 'positive';
    sentimentScore = rating === 5 ? 95 : 82;
    topics = ['rekomendasi', 'apresiasi'];
  }

  const keywords = ['makanan', 'bersih', 'lambat', 'dingin', 'mahal', 'dokter', 'apotek', 'kamar', 'pelayanan', 'staf', 'murah', 'enak'];
  keywords.forEach(keyword => {
    if (text.toLowerCase().includes(keyword)) {
      topics.push(keyword);
    }
  });

  return {
    sentimentScore,
    sentimentLabel,
    detectedTopics: Array.from(new Set(topics)),
    isCrisis,
    summary: `Ulasan pelanggan bintang ${rating} mengenai aspek ${topics.slice(0, 3).join(', ')}.`
  };
}

// Client Side Fallback AI Reply Formulator
function generateAiReplyLocal(review: Review, tenant: Tenant): string {
  const reviewer = review.reviewerName;
  const tone = tenant.aiConfig.brandTone;
  const support = tenant.aiConfig.supportContact;
  const strengths = tenant.aiConfig.strengths;

  if (review.rating <= 2) {
    if (tone === 'friendly' || tone === 'casual') {
      return `Halo Kak ${reviewer}, salam hangat dari manajemen ${tenant.name}. Kami memohon maaf yang sebesar-besarnya atas ketidaksengajaan/kendala yang dialami. Masukan Kakak kami terima dengan tangan terbuka untuk evaluasi tim. Silakan hubungi Customer Care kami di ${support} agar kami dapat memberi kompensasi kenyamanan secara instan. Terima kasih banyak Kak!`;
    } else {
      return `Selamat siang Bapak/Ibu ${reviewer}, kami mewakili pimpinan ${tenant.name} memegang komitmen penuh untuk menyajikan pelayanan terbaik. Kami mohon maaf berlebih atas ketidaknyamanan operasional ini. Segala evaluasi akan dipantau intensif oleh staf senior kami. Mohon kesediaan Bapak/Ibu menghubungi kami di ${support} untuk koordinasi langsung. Terima kasih.`;
    }
  } else if (review.rating === 3) {
    return `Halo Kak/Bapak/Ibu ${reviewer}, terima kasih banyak atas ulasan bintang ${review.rating} dan masukan objektifnya untuk ${tenant.name}. Penilaian seimbang Anda sangat bermakna bagi operasional kami untuk meningkatkan kualitas layanan ke depan. Kami harap kunjungan berikutnya Anda mendapatkan pengalaman beralih optimal!`;
  } else {
    return `Halo Kak ${reviewer}, terima kasih atas review bintang 5 yang luar biasa! Tim ${tenant.name} sangat gembira membaca apresiasi Kakak terhadap kualitas utama kami (${strengths}). Kebahagiaan pasien/pelanggan adalah semangat terbesar kami. Kami tunggu kembali kunjungan Kakak ya!`;
  }
}

// Mock Webhook Trigger directly from Browser (handles mode: 'no-cors' just in case)
async function triggerMockWebhook(urlPath: string, payload: any) {
  try {
    await fetch(urlPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      mode: "no-cors"
    });
  } catch (err) {
    console.warn("Simulated webhook HTTP post returned connection warning (expected due to sandbox limits):", err);
  }
}

// Intercept window.fetch entirely for local database fidelity
export function setupMockApiInterceptors() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
    
    // Check if the URL string points to our api routes
    if (!urlStr.includes('/api/')) {
      return originalFetch(input, init);
    }

    const url = new URL(urlStr, window.location.origin);
    const path = url.pathname;
    const method = init?.method?.toUpperCase() || 'GET';
    const bodyData = init?.body ? JSON.parse(init.body as string) : {};

    const db = getLocalDB();
    const currentUser = getAuthUser(db);

    const makeJSONResponse = (data: any, status = 200) => {
      const respInit = {
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        headers: { 'Content-Type': 'application/json' }
      };
      return new Response(JSON.stringify(data), respInit);
    };

    console.log(`[Mock API Interceptor] Intercepted ${method} ${path}`, bodyData);

    try {
      // 1. AUTH ENDPOINTS
      if (path === '/api/auth/me') {
        return makeJSONResponse({ user: currentUser });
      }

      if (path === '/api/auth/login') {
        const { email } = bodyData;
        const matched = db.users.find(u => u.email === email) || currentUser;
        saveAuthUser(matched);
        return makeJSONResponse({ success: true, user: matched });
      }

      if (path === '/api/auth/register') {
        const { name, email, role } = bodyData;
        const newUser: User = {
          id: 'user-' + uuid(),
          name: name || 'User Baru',
          email: email || 'baru@test.com',
          role: role || 'owner',
          createdAt: new Date().toISOString()
        };
        db.users.push(newUser);
        saveLocalDB(db);
        saveAuthUser(newUser);
        return makeJSONResponse({ success: true, user: newUser });
      }

      if (path === '/api/auth/logout') {
        const defaultUser = db.users[0];
        saveAuthUser(defaultUser);
        return makeJSONResponse({ success: true });
      }

      if (path === '/api/auth/switch-user') {
        const { role } = bodyData;
        const target = db.users.find(u => u.role === role);
        if (target) {
          saveAuthUser(target);
          return makeJSONResponse({ success: true, user: target });
        }
        return makeJSONResponse({ error: 'Role user tidak ditemukan.' }, 404);
      }

      // 2. TENANTS READ/WRITE
      if (path === '/api/tenants' && method === 'GET') {
        const userTenants = db.tenants.filter(t => t.ownerId === currentUser.id);
        return makeJSONResponse({ tenants: userTenants });
      }

      if (path === '/api/tenants/public' && method === 'GET') {
        return makeJSONResponse({ tenants: db.tenants });
      }

      if (path === '/api/tenants' && method === 'POST') {
        const tId = 'tenant-' + uuid();
        const { name, category, description, address, phone, website, openingHours, coverImage } = bodyData;
        const newTenant: Tenant = {
          id: tId,
          ownerId: currentUser.id,
          name: name || 'Cabang Baru',
          slug: (name || 'cabang-baru').toLowerCase().replace(/\s+/g, '-'),
          category: category || 'restoran',
          description: description || 'Deskripsi cabang baru',
          address: address || '',
          phone: phone || '',
          website: website || '',
          openingHours: openingHours || 'Senin - Minggu: 09:00 - 21:00',
          coverImage: coverImage || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=600&q=80',
          avgRating: 0,
          totalReviews: 0,
          aiConfig: {
            brandTone: 'friendly',
            language: 'id',
            customContext: `Menyajikan pelayanan terbaik untuk ${name || 'Cabang Baru'}.`,
            replyGuidelines: 'Sapa pelanggan dengan Kak atau Kakak. Ramah tamah dan menawarkan solusi.',
            strengths: 'Lokasi strategis, sanitasi tinggi, pelayanan sigap, harga bersahabat.',
            supportContact: 'WhatsApp Care: ' + (phone || '081234567890')
          },
          notificationConfigs: {
            telegramEnabled: false,
            telegramChatId: '',
            telegramBotToken: '',
            whatsappEnabled: false,
            whatsappNumber: '',
            whatsappApiKey: '',
            discordEnabled: false,
            discordWebhookUrl: '',
            notifyOnRatingBelow: 5,
            aiAutoReply: false
          },
          createdAt: new Date().toISOString()
        };

        db.tenants.push(newTenant);
        db.logs.push({
          id: uuid(),
          tenantId: tId,
          tenantName: newTenant.name,
          eventType: 'tenant_created',
          channel: 'system',
          payload: `Tenant Baru "${newTenant.name}" berhasil ditambahkan ke Reputation Guard.`,
          status: 'success',
          errorMessage: null,
          createdAt: new Date().toISOString()
        });

        saveLocalDB(db);
        return makeJSONResponse({ success: true, tenant: newTenant });
      }

      // Check pattern /api/tenants/:id/reviews
      const reviewsPattern = /^\/api\/tenants\/([^\/]+)\/reviews$/;
      if (reviewsPattern.test(path)) {
        const tenantId = path.match(reviewsPattern)![1];
        if (method === 'GET') {
          const rList = db.reviews.filter(r => r.tenantId === tenantId).map(rev => {
            const repl = db.replies.find(rep => rep.reviewId === rev.id);
            return {
              ...rev,
              reply: repl || undefined
            };
          });
          return makeJSONResponse({ reviews: rList });
        }

        if (method === 'POST') {
          const tenantObj = db.tenants.find(t => t.id === tenantId);
          if (!tenantObj) return makeJSONResponse({ error: 'Tenant tidak ditemukan' }, 404);

          const { reviewerName, rating, comment } = bodyData;
          
          let analysis = analyzeSentimentLocal(comment || '', Number(rating || 5));
          try {
            const semRes = await originalFetch('/api/stateless/analyze-sentiment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                comment: comment || '',
                rating: Number(rating || 5),
                businessName: tenantObj.name,
                category: tenantObj.category
              })
            });
            if (semRes.ok) {
              const semData = await semRes.json();
              if (semData.success && semData.analysis) {
                analysis = semData.analysis;
              }
            }
          } catch (err) {
            console.warn("Fell back to client-side rule-based sentiment on error:", err);
          }

          const newRev: Review = {
            id: 'review-' + uuid(),
            tenantId,
            reviewerName: reviewerName || 'Anonim',
            rating: Number(rating || 5),
            comment: comment || '',
            sentimentScore: analysis.sentimentScore,
            sentimentLabel: analysis.sentimentLabel,
            topics: analysis.detectedTopics,
            isCrisis: analysis.isCrisis,
            notifiedAt: new Date().toISOString(),
            repliedAt: null,
            createdAt: new Date().toISOString()
          };

          db.reviews.push(newRev);

          // Update aggregate stats on tenant
          const siblings = db.reviews.filter(r => r.tenantId === tenantId);
          tenantObj.totalReviews = siblings.length;
          tenantObj.avgRating = parseFloat((siblings.reduce((acc, r) => acc + r.rating, 0) / siblings.length).toFixed(1));

          // Log reception
          db.logs.push({
            id: uuid(),
            tenantId,
            tenantName: tenantObj.name,
            eventType: 'sentiment_analyzed',
            channel: 'system',
            payload: `Sentimen ulasan dinilai: ${analysis.sentimentLabel.toUpperCase()} (Score: ${analysis.sentimentScore}/100) dari reviewer ${reviewerName || 'Anonim'}.`,
            status: 'success',
            errorMessage: null,
            createdAt: new Date().toISOString()
          });

          // Telegram/Discord notification trigger (CORS-free serverless proxy dispatch)
          const conf = tenantObj.notificationConfigs;
          try {
            const notifRes = await originalFetch('/api/stateless/dispatch-notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tenant: tenantObj,
                review: newRev,
                analysis,
                isTest: false
              })
            });
            if (notifRes.ok) {
              const notifData = await notifRes.json();
              if (notifData.success && Array.isArray(notifData.logs)) {
                notifData.logs.forEach((log: any) => {
                  db.logs.push({
                    ...log,
                    id: 'log-' + uuid()
                  });
                });
              }
            }
          } catch (err) {
            console.warn("Failed to dispatch notifications via server-side proxy:", err);
          }

          // AI Auto Reply logic
          if (conf.aiAutoReply) {
            let replyText = generateAiReplyLocal(newRev, tenantObj);
            try {
              const draftRes = await originalFetch('/api/stateless/ai-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  review: newRev,
                  tenant: tenantObj
                })
              });
              if (draftRes.ok) {
                const draftData = await draftRes.json();
                if (draftData.success && draftData.draft) {
                  replyText = draftData.draft;
                }
              }
            } catch (err) {
              console.warn("Fell back to client-side rule auto-reply on error:", err);
            }

            const autoRep: ReviewReply = {
              id: 'reply-' + uuid(),
              reviewId: newRev.id,
              content: replyText,
              isAiGenerated: true,
              aiDraft: replyText,
              createdAt: new Date().toISOString()
            };
            db.replies.push(autoRep);
            newRev.repliedAt = autoRep.createdAt;

            db.logs.push({
              id: uuid(),
              tenantId,
              tenantName: tenantObj.name,
              eventType: 'reply_sent',
              channel: 'system',
              payload: `Sistem otomatis mempublikasikan balasan AI instan (Auto-Reply) untuk ${reviewerName || 'Anonim'}.`,
              status: 'success',
              errorMessage: null,
              createdAt: new Date().toISOString()
            });

            // Also dispatch reply confirmation notification over proxy
            try {
              await originalFetch('/api/stateless/dispatch-notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tenant: tenantObj,
                  review: {
                    ...newRev,
                    comment: `[Owner Auto-Reply]: "${replyText}"`
                  },
                  analysis: null,
                  isTest: false
                })
              });
            } catch (err) {}
          }

          saveLocalDB(db);
          return makeJSONResponse({ success: true, review: newRev });
        }
      }

      // Check pattern /api/tenants/:id/logs
      const logsPattern = /^\/api\/tenants\/([^\/]+)\/logs$/;
      if (logsPattern.test(path)) {
        const tenantId = path.match(logsPattern)![1];
        const tLogs = db.logs.filter(l => l.tenantId === tenantId).reverse();
        return makeJSONResponse({ logs: tLogs });
      }

      // Check pattern /api/tenants/:id/ai-config
      const aiConfigPattern = /^\/api\/tenants\/([^\/]+)\/ai-config$/;
      if (aiConfigPattern.test(path) && method === 'PUT') {
        const tenantId = path.match(aiConfigPattern)![1];
        const tent = db.tenants.find(t => t.id === tenantId);
        if (tent) {
          tent.aiConfig = { ...tent.aiConfig, ...bodyData };
          
          db.logs.push({
            id: uuid(),
            tenantId,
            tenantName: tent.name,
            eventType: 'config_updated',
            channel: 'system',
            payload: `Konfigurasi AI Persona diperbarui. Gaya: ${tent.aiConfig.brandTone.toUpperCase()}.`,
            status: 'success',
            errorMessage: null,
            createdAt: new Date().toISOString()
          });

          saveLocalDB(db);
          return makeJSONResponse({ success: true, aiConfig: tent.aiConfig });
        }
        return makeJSONResponse({ error: 'Tenant tidak ditemukan' }, 404);
      }

      // Check pattern /api/tenants/:id/notification-config
      const notifConfigPattern = /^\/api\/tenants\/([^\/]+)\/notification-config$/;
      if (notifConfigPattern.test(path)) {
        const tenantId = path.match(notifConfigPattern)![1];
        const tent = db.tenants.find(t => t.id === tenantId);
        if (tent) {
          if (method === 'PUT') {
            tent.notificationConfigs = { ...tent.notificationConfigs, ...bodyData };

            db.logs.push({
              id: uuid(),
              tenantId,
              tenantName: tent.name,
              eventType: 'config_updated',
              channel: 'system',
              payload: `Aturan notifikasi multi-saluran diperbarui untuk ${tent.name}.`,
              status: 'success',
              errorMessage: null,
              createdAt: new Date().toISOString()
            });

            saveLocalDB(db);
            return makeJSONResponse({ success: true, notificationConfigs: tent.notificationConfigs });
          }
        }
        return makeJSONResponse({ error: 'Tenant tidak ditemukan' }, 404);
      }

      // Check pattern /api/tenants/:id/notification-config/test
      const testNotifPattern = /^\/api\/tenants\/([^\/]+)\/notification-config\/test$/;
      if (testNotifPattern.test(path) && method === 'POST') {
        const tenantId = path.match(testNotifPattern)![1];
        const tent = db.tenants.find(t => t.id === tenantId);
        if (tent) {
          const testReview = {
            id: 'test-review',
            tenantId,
            reviewerName: 'Unit Pengetesan Sistem',
            rating: 1,
            comment: 'Sistem deteksi eskalasi reputasi otomatis multi-channel aktif!',
            createdAt: new Date().toISOString()
          };

          try {
            const notifRes = await originalFetch('/api/stateless/dispatch-notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tenant: tent,
                review: testReview,
                analysis: null,
                isTest: true
              })
            });
            if (notifRes.ok) {
              const notifData = await notifRes.json();
              if (notifData.success && Array.isArray(notifData.logs)) {
                notifData.logs.forEach((log: any) => {
                  db.logs.push({
                    ...log,
                    id: 'log-' + uuid()
                  });
                });
              }
            }
          } catch (err) {
            console.warn("Failed to dispatch test notification via server-side proxy:", err);
          }

          saveLocalDB(db);
          return makeJSONResponse({ success: true, message: 'Test notification triggered.' });
        }
        return makeJSONResponse({ error: 'Tenant tidak ditemukan' }, 404);
      }

      // Check pattern /api/tenants/:id
      const singleTenantPattern = /^\/api\/tenants\/([^\/]+)$/;
      if (singleTenantPattern.test(path)) {
        const tenantId = path.match(singleTenantPattern)![1];
        const tentObj = db.tenants.find(t => t.id === tenantId);
        if (!tentObj) return makeJSONResponse({ error: 'Tenant tidak ditemukan' }, 404);

        if (method === 'GET') {
          return makeJSONResponse({ tenant: tentObj });
        }

        if (method === 'PUT') {
          const { name, category, description, address, phone, website, openingHours, coverImage } = bodyData;
          tentObj.name = name || tentObj.name;
          tentObj.category = category || tentObj.category;
          tentObj.description = description || tentObj.description;
          tentObj.address = address || tentObj.address;
          tentObj.phone = phone || tentObj.phone;
          tentObj.website = website || tentObj.website;
          tentObj.openingHours = openingHours || tentObj.openingHours;
          tentObj.coverImage = coverImage || tentObj.coverImage;

          db.logs.push({
            id: uuid(),
            tenantId,
            tenantName: tentObj.name,
            eventType: 'config_updated',
            channel: 'system',
            payload: `Profil informasi dasar ${tentObj.name} berhasil dimodifikasi.`,
            status: 'success',
            errorMessage: null,
            createdAt: new Date().toISOString()
          });

          saveLocalDB(db);
          return makeJSONResponse({ success: true, tenant: tentObj });
        }

        if (method === 'DELETE') {
          db.tenants = db.tenants.filter(t => t.id !== tenantId);
          db.reviews = db.reviews.filter(r => r.tenantId !== tenantId);
          db.logs = db.logs.filter(l => l.tenantId !== tenantId);
          saveLocalDB(db);
          return makeJSONResponse({ success: true });
        }
      }

      // Check pattern /api/tenants/by-slug/:slug
      const slugPattern = /^\/api\/tenants\/by-slug\/([^\/]+)$/;
      if (slugPattern.test(path)) {
        const slug = path.match(slugPattern)![1];
        const tentObj = db.tenants.find(t => t.slug === slug);
        if (tentObj) {
          return makeJSONResponse({ tenant: tentObj });
        }
        return makeJSONResponse({ error: 'Slug tidak ditemukan.' }, 404);
      }

      // Check pattern /api/reviews/:id
      const singleReviewPattern = /^\/api\/reviews\/([^\/]+)$/;
      if (singleReviewPattern.test(path)) {
        const reviewId = path.match(singleReviewPattern)![1];
        const rev = db.reviews.find(r => r.id === reviewId);
        if (rev) {
          const tent = db.tenants.find(t => t.id === rev.tenantId);
          const repl = db.replies.find(r => r.reviewId === rev.id);
          return makeJSONResponse({ review: rev, tenant: tent, reply: repl || null });
        }
        return makeJSONResponse({ error: 'Ulasan tidak ditemukan.' }, 404);
      }

      // Check pattern /api/reviews/:id/reply
      const replyReviewPattern = /^\/api\/reviews\/([^\/]+)\/reply$/;
      if (replyReviewPattern.test(path) && method === 'POST') {
        const reviewId = path.match(replyReviewPattern)![1];
        const rev = db.reviews.find(r => r.id === reviewId);
        if (rev) {
          const { content, isAiGenerated, aiDraft } = bodyData;
          const tenantObj = db.tenants.find(t => t.id === rev.tenantId);

          const newRep: ReviewReply = {
            id: 'reply-' + uuid(),
            reviewId,
            content: content || '',
            isAiGenerated: !!isAiGenerated,
            aiDraft: aiDraft || null,
            createdAt: new Date().toISOString()
          };

          // Remove old replies if duplicate exists
          db.replies = db.replies.filter(r => r.reviewId !== reviewId);
          db.replies.push(newRep);
          rev.repliedAt = newRep.createdAt;

          db.logs.push({
            id: uuid(),
            tenantId: rev.tenantId,
            tenantName: tenantObj?.name || 'Cabang',
            eventType: 'reply_sent',
            channel: 'system',
            payload: `Balasan dikirim ke review ${rev.reviewerName}: "${content.substring(0, 40)}..."`,
            status: 'success',
            errorMessage: null,
            createdAt: new Date().toISOString()
          });

          // Push feedback to webhooks as reply notifications
          const replyPushMsg = `💬 **Balasan Ulasan Terkirim** pada **${tenantObj?.name}**!\nUlasan dari: **${rev.reviewerName}**\nBintang: **${'⭐'.repeat(rev.rating)}**\nBalasan Owner: "${newRep.content}"`;
          const conf = tenantObj?.notificationConfigs;
          if (conf && conf.discordEnabled && conf.discordWebhookUrl) {
            triggerMockWebhook(conf.discordWebhookUrl, { content: replyPushMsg });
          }

          saveLocalDB(db);
          return makeJSONResponse({ success: true, reply: newRep });
        }
        return makeJSONResponse({ error: 'Review target tidak ditemukan' }, 404);
      }

      // Check pattern /api/reviews/:id/ai-draft
      const aiDraftPattern = /^\/api\/reviews\/([^\/]+)\/ai-draft$/;
      if (aiDraftPattern.test(path) && method === 'POST') {
        const reviewId = path.match(aiDraftPattern)![1];
        const rev = db.reviews.find(r => r.id === reviewId);
        if (rev) {
          const tenantObj = db.tenants.find(t => t.id === rev.tenantId);
          if (tenantObj) {
            // First: Attempt calling real Gemini secure API routes over HTTP!
            try {
              const res = await originalFetch('/api/stateless/ai-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ review: rev, tenant: tenantObj })
              });
              if (res.ok) {
                const data = await res.json();
                if (data.draft) {
                  db.logs.push({
                    id: uuid(),
                    tenantId: rev.tenantId,
                    tenantName: tenantObj.name,
                    eventType: 'reply_drafted',
                    channel: 'system',
                    payload: `Gemini AI berhasil memformulasikan balasan pangkasan (Live AI).`,
                    status: 'success',
                    errorMessage: null,
                    createdAt: new Date().toISOString()
                  });
                  saveLocalDB(db);
                  return makeJSONResponse({ success: true, draft: data.draft });
                }
              }
            } catch (err) {
              console.warn("Fell back to client-side rule engine formulation on error:", err);
            }

            // Fallback: Use client-side rule reply template generator
            const fallbackDraft = generateAiReplyLocal(rev, tenantObj);
            db.logs.push({
              id: uuid(),
              tenantId: rev.tenantId,
              tenantName: tenantObj.name,
              eventType: 'reply_drafted',
              channel: 'system',
              payload: `Formulasi draf balasan AI terselesaikan via local rule engine.`,
              status: 'success',
              errorMessage: null,
              createdAt: new Date().toISOString()
            });

            saveLocalDB(db);
            return makeJSONResponse({ success: true, draft: fallbackDraft });
          }
        }
        return makeJSONResponse({ error: 'Review atau Tenant tidak valid.' }, 404);
      }

      // GET /api/dashboard/stats
      if (path === '/api/dashboard/stats') {
        const userTenants = db.tenants.filter(t => t.ownerId === currentUser.id);
        const tenantIds = userTenants.map(t => t.id);

        const reviews = db.reviews.filter(r => tenantIds.includes(r.tenantId));
        const unresponded = reviews.filter(r => !r.repliedAt);
        const negative = reviews.filter(r => r.rating <= 2);

        const recentReviews = [...reviews]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        const recentNegative = [...negative]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        const recentLogs = db.logs
          .filter(l => tenantIds.includes(l.tenantId))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);

        const avgRating = userTenants.length > 0
          ? parseFloat((userTenants.reduce((acc, t) => acc + t.avgRating, 0) / userTenants.length).toFixed(1))
          : 0;

        return makeJSONResponse({
          totalTenants: userTenants.length,
          totalReviews: reviews.length,
          avgRating,
          unrespondedCount: unresponded.length,
          recentReviews,
          recentNegative,
          recentLogs
        });
      }

      // POST /api/simulator/reset
      if (path === '/api/simulator/reset') {
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(dbStoreSeed));
        const seedUsers = dbStoreSeed.users[0] as User;
        saveAuthUser(seedUsers);
        return makeJSONResponse({ success: true, message: 'Database simulator berhasil di-reset ke kondisi awal.' });
      }

    } catch (routeErr: any) {
      console.error(`Error processing mock route ${path}:`, routeErr);
      return makeJSONResponse({ error: 'Internal serverless error mock: ' + routeErr.message }, 500);
    }

    // Default: Fallback to real fetch if not explicitly matched above
    return originalFetch(input, init);
  };
}
