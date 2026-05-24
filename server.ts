/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import {GoogleGenAI, Type} from '@google/genai';
import {DBState, Tenant, Review, ReviewReply, ActivityLog, User, AIConfig, NotificationConfigs} from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to JSON Database store
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
const DB_FILE = isVercel 
  ? path.join('/tmp', 'db_store.json')
  : path.join(process.cwd(), 'db_store.json');

// Helper to generate IDs
const uuid = () => Math.random().toString(36).substring(2, 11);

// Initialize database with premium seed data
const getInitialState = (): DBState => {
  const ownerId = 'user-owner-1';
  const reviewerId = 'user-reviewer-1';

  const defaultUsers: User[] = [
    {
      id: ownerId,
      name: 'Budi Santoso',
      email: 'owner@test.com',
      role: 'owner',
      createdAt: new Date().toISOString(),
    },
    {
      id: reviewerId,
      name: 'Siti Rahma',
      email: 'reviewer@test.com',
      role: 'reviewer',
      createdAt: new Date().toISOString(),
    }
  ];

  const defaultTenants: Tenant[] = [
    {
      id: 'tenant-1',
      ownerId,
      name: 'Warung Makan Sederhana',
      slug: 'warung-makan-sederhana',
      category: 'restoran',
      description: 'Restoran keluarga khalayak ramai yang menghidangkan masakan rumahan autentik dengan bumbu rempah tradisi nusantara.',
      address: 'Jl. Malioboro No. 42, Sleman, Yogyakarta',
      phone: '081234567890',
      website: 'https://warungsederhana.co.id',
      openingHours: 'Senin - Minggu: 08:00 - 21:00',
      coverImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=600&q=80',
      avgRating: 4.0,
      totalReviews: 2,
      aiConfig: {
        brandTone: 'friendly',
        language: 'id',
        customContext: 'Kami menyajikan makanan segar setiap harinya. Ada promosi potongan harga 20% khusus hari Senin untuk menu Ayam Bakar. Menyediakan area lesehan nyaman dan jaringan internet gratis.',
        replyGuidelines: 'Gunakan kata sapaan sopan seperti Kak atau Kakak. Tawarkan solusi kompensasi voucher gratis jika ada komplain kebersihan/keterlambatan. Jangan pernah sebut restoran kompetitor.',
        strengths: 'Rasa gurih tradisional penyajian cepat, harga merakyat, parkir luas aman, bahan baku halal bersertifikat.',
        supportContact: 'WhatsApp Customer Care: 0812-9988-7766'
      },
      notificationConfigs: {
        telegramEnabled: true,
        telegramChatId: '1064424022',
        telegramBotToken: '8790574809:AAGlbQ7-ed62hEaQdej0u0tm1IPxm0hlNdY',
        whatsappEnabled: false,
        whatsappNumber: '6281299887766',
        whatsappApiKey: 'WHAPI_KEY_MOCK',
        discordEnabled: true,
        discordWebhookUrl: 'https://discord.com/api/webhooks/1507953025732579349/JHhZITP0Pbvp3TOitO-QeDiO8SqsXbRUlfHT2zXT2jlfDt9D6CgBPL_ET9IyFvOEDRF7',
        notifyOnRatingBelow: 5,
        aiAutoReply: true
      },
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'tenant-2',
      ownerId,
      name: 'Klinik Sehat Bersama',
      slug: 'klinik-sehat-bersama',
      category: 'klinik',
      description: 'Klinik kesehatan umum modern yang menyediakan layanan rawat jalan, laboratorium lengkap, serta konsultasi tumbuh kembang anak.',
      address: 'Ruko Kebayoran Square Blok A-03, Jakarta Selatan',
      phone: '021-7223344',
      website: 'https://kliniksehatbersama.com',
      openingHours: 'Senin - Sabtu: 07:00 - 20:00',
      coverImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
      avgRating: 4.5,
      totalReviews: 2,
      aiConfig: {
        brandTone: 'professional',
        language: 'id',
        customContext: 'Memiliki 3 dokter spesialis berpengalaman. Menggunakan digital health record agar antrean transparan. Menyediakan apotik internal dengan obat-obatan lengkap terjangkau.',
        replyGuidelines: 'Sapa menggunakan nama lengkap pasien atau panggilan hormat Bapak/Ibu. Mohon maaf atas keterlambatan antrean jika terjadi kendala operasional. Jaga kerahasiaan medis pasien.',
        strengths: 'Sistem antrean tertib, kehigienisan ruang tunggu teruji, dokter ramah komunikatif, harga terjangkau masyarakat.',
        supportContact: 'Layanan Pengaduan Pasien: 021-7223344 (Ext 102) atau email: cs@kliniksehatbersama.com'
      },
      notificationConfigs: {
        telegramEnabled: false,
        telegramChatId: '',
        telegramBotToken: '',
        whatsappEnabled: false,
        whatsappNumber: '',
        whatsappApiKey: '',
        discordEnabled: true,
        discordWebhookUrl: 'https://discord.com/api/webhooks/1507953025732579349/JHhZITP0Pbvp3TOitO-QeDiO8SqsXbRUlfHT2zXT2jlfDt9D6CgBPL_ET9IyFvOEDRF7',
        notifyOnRatingBelow: 3,
        aiAutoReply: false
      },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const defaultReviews: Review[] = [
    {
      id: 'review-1',
      tenantId: 'tenant-1',
      reviewerName: 'Siti Rahma',
      rating: 5,
      comment: 'Masakan rendang di Warung Makan Sederhana ini enak sekali bumbunya betul-betul meresap, harganya juga ramah di kantong.',
      sentimentScore: 92,
      sentimentLabel: 'positive',
      topics: ['makanan', 'harga'],
      isCrisis: false,
      notifiedAt: null,
      repliedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 10000).toISOString()
    },
    {
      id: 'review-2',
      tenantId: 'tenant-1',
      reviewerName: 'Andi Wijaya',
      rating: 3,
      comment: 'Rasa ayam bakar lumayan gurih tapi pelayanan siang ini agak lambat karena antrean yang sangat padat. Semoga bisa dipercepat.',
      sentimentScore: 55,
      sentimentLabel: 'neutral',
      topics: ['pelayanan', 'ayam bakar'],
      isCrisis: false,
      notifiedAt: null,
      repliedAt: null,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'review-3',
      tenantId: 'tenant-2',
      reviewerName: 'Rina Herawati',
      rating: 5,
      comment: 'Klinik super wangi dan ber-AC dingin sekali. Dokternya ramah dalam membimbing anak saya saat diperiksa.',
      sentimentScore: 95,
      sentimentLabel: 'very_positive',
      topics: ['kebersihan', 'dokter', 'pelayanan'],
      isCrisis: false,
      notifiedAt: null,
      repliedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'review-4',
      tenantId: 'tenant-2',
      reviewerName: 'Hendra Saputra',
      rating: 4,
      comment: 'Apoteker kurang senyum waktu serah obat, tapi untungnya dokternya sangat detail dan edukatif.',
      sentimentScore: 78,
      sentimentLabel: 'positive',
      topics: ['pelayanan', 'dokter', 'apotek'],
      isCrisis: false,
      notifiedAt: null,
      repliedAt: null,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    }
  ];

  const defaultReplies: ReviewReply[] = [
    {
      id: 'reply-1',
      reviewId: 'review-1',
      content: 'Terima kasih banyak Kak Siti Rahma atas ulasan positifnya! Senang sekali bumbu rendang khas kami cocok di lidah Kakak. Kami tunggu kunjungan berikutnya ya!',
      isAiGenerated: true,
      aiDraft: 'Terima kasih Kak Siti Rahma atas ulasan positifnya! Senang sekali masakan tradisional nusantara kami disukai. Kami tunggu kedatangan Kakak kembali.',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'reply-2',
      reviewId: 'review-3',
      content: 'Terima kasih Ibu Rina Herawati atas kunjungannya ke Klinik Sehat Bersama. Kami berkomitmen menjaga kenyamanan ruangan dan keramahan dokter demi kesembuhan si kecil.',
      isAiGenerated: true,
      aiDraft: 'Terima kasih atas kepercayaannya Ibu Rina Herawati. Semoga putra/putri senantiasa sehat selalu.',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const defaultLogs: ActivityLog[] = [
    {
      id: 'log-1',
      tenantId: 'tenant-1',
      tenantName: 'Warung Makan Sederhana',
      eventType: 'tenant_created',
      channel: 'system',
      payload: 'Tenant Warung Makan Sederhana berhasil didaftarkan ke sistem.',
      status: 'success',
      errorMessage: null,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'log-2',
      tenantId: 'tenant-2',
      tenantName: 'Klinik Sehat Bersama',
      eventType: 'tenant_created',
      channel: 'system',
      payload: 'Tenant Klinik Sehat Bersama berhasil didaftarkan ke sistem.',
      status: 'success',
      errorMessage: null,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'log-3',
      tenantId: 'tenant-2',
      tenantName: 'Klinik Sehat Bersama',
      eventType: 'review_received',
      channel: 'system',
      payload: 'Review baru diterima dari Hendra Saputra dengan rating 4 ⭐.',
      status: 'success',
      errorMessage: null,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    }
  ];

  return {
    users: defaultUsers,
    tenants: defaultTenants,
    reviews: defaultReviews,
    replies: defaultReplies,
    logs: defaultLogs
  };
};

// Database persistence helpers
const readDB = (): DBState => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      if (isVercel) {
        // Seed the temp file from the project root db_store.json
        const seedPath = path.join(process.cwd(), 'db_store.json');
        if (fs.existsSync(seedPath)) {
          console.log(`[Vercel DB Init] Seeding /tmp/db_store.json from ${seedPath}`);
          const contents = fs.readFileSync(seedPath, 'utf-8');
          fs.writeFileSync(DB_FILE, contents);
          return JSON.parse(contents);
        }
      }
      const initial = getInitialState();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON DB, fallback to memory', error);
    return getInitialState();
  }
};

const writeDB = (state: DBState) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error writing JSON DB', error);
  }
};

// Lazy initialize Gemini API Client
let apiInstance: GoogleGenAI | null = null;
function getGemini() {
  let key = process.env.GEMINI_API_KEY;
  if (!key || key === '' || key.includes('MY_GEMINI_API_KEY') || key.includes('placeholder')) {
    key = 'AIzaSyBe6YklputUxDEzLhdxS4UArsm9EBrA0nU';
  }
  if (!apiInstance) {
    apiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return apiInstance;
}

// Global active user session mocking (Defaulted to Owner Budi Santoso)
let currentUserSession: User = readDB().users[0];

// Midleware helper to simulate Auth
const getAuthUser = () => {
  return currentUserSession;
};

// AI SENTIMENT ANALYSIS HELPER
async function analyzeReviewWithGemini(reviewText: string, rating: number, businessName: string, category: string) {
  const gemini = getGemini();
  if (!gemini) {
    // Elegant fallback simulation
    let sentimentLabel: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' = 'neutral';
    let sentimentScore = 50;
    let isCrisis = false;
    let topics = ['umum'];

    if (rating <= 2) {
      sentimentLabel = rating === 1 ? 'very_negative' : 'negative';
      sentimentScore = rating === 1 ? 15 : 30;
      isCrisis = true;
      topics = ['komplain', 'krisis', 'pelayanan'];
    } else if (rating === 3) {
      sentimentLabel = 'neutral';
      sentimentScore = 55;
      topics = ['masukan', 'saran'];
    } else {
      sentimentLabel = rating === 5 ? 'very_positive' : 'positive';
      sentimentScore = rating === 5 ? 95 : 80;
      topics = ['rekomendasi', 'apresiasi'];
    }

    const keywords = ['makanan', 'bersih', 'lambat', 'dingin', 'mahal', 'dokter', 'apotek', 'kamar', 'pelayanan'];
    keywords.forEach(keyword => {
      if (reviewText.toLowerCase().includes(keyword)) {
        topics.push(keyword);
      }
    });

    return {
      sentimentScore,
      sentimentLabel,
      detectedTopics: Array.from(new Set(topics)),
      isCrisis,
      summary: `Pelanggan memberikan rating ${rating} bintang dengan keluhan atau masukan mengenai ${topics.join(', ')}.`
    };
  }

  try {
    const systemPrompt = `Kamu adalah analis review bisnis profesional.
Analisis review pelanggan ini dan kembalikan feedback dalam format JSON murni.
Format respons JSON harus mengikuti tipe schema ini:
{
  "sentiment_score": number (skala 0-100),
  "sentiment_label": string (harus salah satu dari: "very_negative", "negative", "neutral", "positive", "very_positive"),
  "detected_topics": string[] (array topik seperti: "makanan", "pelayanan", "harga", "kebersihan", "fasilitas", dll),
  "is_crisis": boolean (true jika rating <= 2 DAN isinya sangat marah, mengancam viral, atau merusak reputasi serius),
  "summary": string (ringkasan 1 kalimat dalam Bahasa Indonesia yang objektif)
}`;

    const prompt = `Nama usaha: ${businessName}
Kategori: ${category}
Rating: ${rating}/5
Review tertulis: "${reviewText}"`;

    const response = await gemini.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment_score: {type: Type.NUMBER, description: 'Sentiment score from 0 to 100'},
            sentiment_label: {type: Type.STRING, description: 'One of very_negative, negative, neutral, positive, very_positive'},
            detected_topics: {
              type: Type.ARRAY,
              items: {type: Type.STRING},
              description: 'Array of detected topics'
            },
            is_crisis: {type: Type.BOOLEAN, description: 'True if review has severe reputational damage potential'},
            summary: {type: Type.STRING, description: '1-sentence summary in Indonesian'}
          },
          required: ['sentiment_score', 'sentiment_label', 'detected_topics', 'is_crisis', 'summary']
        }
      }
    });

    const body = JSON.parse(response.text || '{}');
    return {
      sentimentScore: body.sentiment_score ?? 50,
      sentimentLabel: body.sentiment_label ?? 'neutral',
      detectedTopics: body.detected_topics ?? ['umum'],
      isCrisis: body.is_crisis ?? (rating <= 2),
      summary: body.summary ?? 'Analisis berhasil dilakukan.'
    };
  } catch (error) {
    console.error('Gemini sentiment analysis failed, falling back:', error);
    return {
      sentimentScore: rating <= 2 ? 25 : (rating === 3 ? 50 : 85),
      sentimentLabel: (rating <= 2 ? 'negative' : (rating === 3 ? 'neutral' : 'positive')) as any,
      detectedTopics: ['analisis_gagal'],
      isCrisis: rating <= 2,
      summary: 'Gagal menganalisis via AI, menggunakan fallback sistem default.'
    };
  }
}

// AI REPLY GENERATION HELPER
async function generateAiReply(review: Review, tenant: Tenant) {
  const gemini = getGemini();
  const rulePromptTemplate = `Anda adalah AI Customer Service Assistant untuk sebuah bisnis.

Gunakan data tenant berikut sebagai konteks utama:

Nama usaha: ${tenant.name}
Kategori usaha: ${tenant.category}
Deskripsi usaha: ${tenant.description}
Keunggulan usaha: ${tenant.aiConfig.strengths}
Gaya bahasa: ${tenant.aiConfig.brandTone}
Aturan balasan: ${tenant.aiConfig.replyGuidelines}
Kontak penyelesaian masalah: ${tenant.aiConfig.supportContact}

Data review:
Nama reviewer: ${review.reviewerName}
Rating: ${review.rating}
Isi review: ${review.comment}

Tugas Anda:
1. Buat balasan review yang sopan, profesional, dan manusiawi.
2. Jika rating 1 atau 2, gunakan nada empatik, minta maaf secara wajar, dan arahkan reviewer untuk penyelesaian masalah ke kontak yang tertera.
3. Jika rating 3, jawab secara netral dan apresiatif.
4. Jika rating 4 atau 5, jawab dengan ucapan terima kasih dan apresiasi sebesar-besarnya.
5. Jangan menyalahkan reviewer dalam kondisi apapun.
6. Jangan membuat janji diskon atau kompensasi berlebih yang tidak ada di data tenant.
7. Maksimal 120 kata.
8. Gunakan bahasa Indonesia natural.`;

  if (!gemini) {
    // Super smart local preview fallback generator for full fidelity
    const reviewer = review.reviewerName;
    const tone = tenant.aiConfig.brandTone;
    const support = tenant.aiConfig.supportContact;
    
    let answer = '';
    if (review.rating <= 2) {
      if (tone === 'friendly' || tone === 'casual') {
        answer = `Halo Kak ${reviewer}, salam hangat dari tim ${tenant.name}. Kami memohon maaf yang sebesar-besarnya atas ketidaknyamanan Kakak mengenai hal ini. Masukan Kakak sangat berharga untuk perbaikan pelayanan kami agar lebih cepat dan prima. Silakan hubungi kami di ${support} agar kami bisa memberikan solusi langsung atau kompensasi kenyamanan. Terima kasih Kak!`;
      } else {
        answer = `Selamat siang Bapak/Ibu ${reviewer}, kami dari pihak manajemen ${tenant.name} memohon maaf yang sedalam-dalamnya atas pengalaman kurang menyenangkan yang Bapak/Ibu alami. Setiap masukan pasien/pelanggan adalah prioritas evaluasi staf kami. Mohon kesediaan Bapak/Ibu menghubungi tim CS kami di ${support} guna penyelesaian masalah secara mendalam. Terima kasih atas masukan berharga ini.`;
      }
    } else if (review.rating === 3) {
      answer = `Halo Kak/Bapak/Ibu ${reviewer}, terima kasih banyak atas ulasan dan rating netral yang diberikan untuk ${tenant.name}. Kami sangat mengapresiasi rekomendasi objektif serta catatan catatan krusial yang diberikan. Kami akan terus berbenah meningkatkan mutu ${tenant.category} kami. Sampai jumpa kembali!`;
    } else {
      answer = `Halo Kak ${reviewer}, terima kasih banyak atas bintang dan review yang luar biasa! Tim ${tenant.name} sangat senang membaca kepuasan Kakak terhadap keunggulan kami seperti ${tenant.aiConfig.strengths}. Ulasan ini akan terus membakar semangat kami untuk menyajikan layanan/produk terbaik. Sehat selalu!`;
    }
    return answer;
  }

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: rulePromptTemplate,
    });
    return response.text?.trim() || 'Internal AI generator returned empty response.';
  } catch (error) {
    console.error('Error generating AI reply, falling back:', error);
    return `Halo Kak/Bapak/Ibu ${review.reviewerName}, kami mengapresiasi ulasan rating ${review.rating} yang Anda berikan untuk ${tenant.name}. Kami berkomitmen memberikan kualitas terbaik. Silakan hubungi unit layanan kami di ${tenant.aiConfig.supportContact} untuk feedback lebih lanjut. Terima kasih!`;
  }
}

// MULTI-CHANNEL SERVICE
async function dispatchMultiChannelNotifications(review: Review, tenant: Tenant, analysis: any) {
  const conf = tenant.notificationConfigs;
  const ratingThreshold = conf.notifyOnRatingBelow;

  // Rule: trigger if rating is less than or equal to threshold OR if it's a critical state
  // Disabled filter on user request so notification works for every single new comment ("tiap kali Ada Yang Comment")
  console.log(`Bypassing rating check to notify for review: ${review.reviewerName} (${review.rating} stars)`);

  const messageText = `🚨 *NOTIFICATION ALERT - REPUTATION SHIELD*
----------------------------------------
Usaha/Tenant: *${tenant.name}*
Reviewer Name: *${review.reviewerName}*
Rating Gmaps: *${'⭐'.repeat(review.rating)}* (${review.rating}/5)
Review Content: "${review.comment}"

🤖 AI Sentiment: *${analysis.sentimentLabel.toUpperCase()}* (${analysis.sentimentScore}/100)
📌 Detected Topics: ${analysis.detectedTopics.join(', ')}
🔥 Crisis Alert Level: *${analysis.isCrisis ? 'YA (Tinggi)' : 'TIDAK'}*

💡 *Rekomendasi Respons AI CS:*
_Memproses draf balasan empati..._
 
Lihat & Kirim di Dashboard Guard:
https://ais-dev-xawuyec6m3v2ic6urdf5jw-930230131845.asia-southeast1.run.app/dashboard/tenants/${tenant.id}`;

  const db = readDB();

  // 1. IN-APP notification logging (Always stored)
  db.logs.push({
    id: uuid(),
    tenantId: tenant.id,
    tenantName: tenant.name,
    eventType: 'review_received',
    channel: 'system',
    payload: `Review NEGATIF terdeteksi untuk ${tenant.name}. Dari ${review.reviewerName} (Rating ${review.rating}).`,
    status: 'success',
    errorMessage: null,
    createdAt: new Date().toISOString()
  });

  // 2. DISCORD Webhook integration (We will call the requested live Discord webhook directly!)
  if (conf.discordEnabled && conf.discordWebhookUrl) {
    try {
      const payload = {
        username: "Reputation Shield Bot",
        avatar_url: "https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&w=150&q=80",
        embeds: [{
          title: `Crisis Alert: Review Negatif Terdeteksi di ${tenant.name}!`,
          description: `Krisis reputasi terdeteksi! Segera respon kepuasan pelanggan agar sentimen negatif tidak merugikan brand.`,
          color: review.rating <= 2 ? 16711680 : 16776960, // Merah untuk krisis, kuning untuk netral
          fields: [
            { name: "Tenant", value: tenant.name, inline: true },
            { name: "Reviewer", value: review.reviewerName, inline: true },
            { name: "Rating", value: `${review.rating} / 5 ⭐`, inline: true },
            { name: "Review Komentar", value: `"${review.comment}"` },
            { name: "Sentimen AI", value: `${analysis.sentimentLabel} (${analysis.sentimentScore}/100)`, inline: true },
            { name: "Topik Isu", value: analysis.detectedTopics.join(', '), inline: true },
            { name: "Langkah Penyelesaian", value: `Hubungi: ${tenant.aiConfig.supportContact}` }
          ],
          timestamp: new Date().toISOString()
        }]
      };

      const response = await fetch(conf.discordWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const succ = response.status === 204 || response.status === 200;
      db.logs.push({
        id: uuid(),
        tenantId: tenant.id,
        tenantName: tenant.name,
        eventType: 'notification_sent',
        channel: 'discord',
        payload: `Berhasil mengirim alert review negatif ke Discord Webhook untuk ${tenant.name}.`,
        status: succ ? 'success' : 'failed',
        errorMessage: succ ? null : `HTTP Status: ${response.status}`,
        createdAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Discord webhook fetch dispatch error:', err);
      db.logs.push({
        id: uuid(),
        tenantId: tenant.id,
        tenantName: tenant.name,
        eventType: 'notification_sent',
        channel: 'discord',
        payload: `Gagal mengirim alert review ke Discord.`,
        status: 'failed',
        errorMessage: err.message,
        createdAt: new Date().toISOString()
      });
    }
  }

  // 3. TELEGRAM Integration (Real Bot API call)
  if (conf.telegramEnabled) {
    const token = conf.telegramBotToken || '8790574809:AAGlbQ7-ed62hEaQdej0u0tm1IPxm0hlNdY';
    const chatId = conf.telegramChatId || '1064424022';
    if (token && chatId) {
      try {
        const starSymbols = '⭐'.repeat(review.rating);
        const headerText = review.rating <= 2 
          ? `🚨 *REPUTATION SHIELD CRISIS ALERT*` 
          : (review.rating === 3 ? `⚠️ *REPUTATION FEEDBACK INCOMING*` : `✨ *NEW REPUTATION REVIEW RECEIVED*`);
        
        const textMessage = `${headerText}\n` +
          `----------------------------------------\n` +
          `🏢 *Usaha/Tenant:* ${tenant.name}\n` +
          `👤 *Reviewer:* ${review.reviewerName}\n` +
          `⭐ *Rating:* ${starSymbols} (${review.rating}/5)\n` +
          `💬 *Ulasan:* "${review.comment}"\n\n` +
          `🤖 *Sentimen AI:* ${analysis.sentimentLabel.toUpperCase()} (${analysis.sentimentScore}/100)\n` +
          `📌 *Topik Isu:* ${analysis.detectedTopics.join(', ')}\n` +
          `🔥 *Level Krisis:* ${analysis.isCrisis ? 'YA (Tinggi)' : 'TIDAK'}\n\n` +
          `📞 *Kontak Penanganan:* ${tenant.aiConfig.supportContact}\n` +
          `🔗 *Dashboard:* https://ais-pre-xawuyec6m3v2ic6urdf5jw-930230131845.asia-southeast1.run.app/dashboard/tenants/${tenant.id}`;

        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: textMessage,
            parse_mode: 'Markdown'
          })
        });

        const succ = response.status === 200 || response.ok;
        const respData = await response.json().catch(() => ({}));

        db.logs.push({
          id: uuid(),
          tenantId: tenant.id,
          tenantName: tenant.name,
          eventType: 'notification_sent',
          channel: 'telegram',
          payload: succ 
            ? `Berhasil mengirimkan alert SOS ke Telegram Chat ID: ${chatId}.`
            : `Gagal mengirim ke Telegram Chat ID: ${chatId}. Telegram Res: ${JSON.stringify(respData)}`,
          status: succ ? 'success' : 'failed',
          errorMessage: succ ? null : `HTTP Status: ${response.status}`,
          createdAt: new Date().toISOString()
        });
      } catch (err: any) {
        console.error('Telegram fetch dispatch error:', err);
        db.logs.push({
          id: uuid(),
          tenantId: tenant.id,
          tenantName: tenant.name,
          eventType: 'notification_sent',
          channel: 'telegram',
          payload: `Gagal mengirimkan alert ke Telegram (Koneksi error).`,
          status: 'failed',
          errorMessage: err.message,
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  // 4. WHATSAPP Simulation logging
  if (conf.whatsappEnabled) {
    db.logs.push({
      id: uuid(),
      tenantId: tenant.id,
      tenantName: tenant.name,
      eventType: 'notification_sent',
      channel: 'whatsapp',
      payload: `Berhasil mengirimkan WhatsApp alert ke nomor target: ${conf.whatsappNumber}.`,
      status: 'success',
      errorMessage: null,
      createdAt: new Date().toISOString()
    });
  }

  writeDB(db);
}

// MULTI-CHANNEL REPLY NOTIFICATION SERVICE ("tiap kali AI membalas")
async function dispatchMultiChannelReplyNotifications(reply: { content: string, isAiGenerated: boolean }, review: Review, tenant: Tenant) {
  const conf = tenant.notificationConfigs;

  // 1. DISCORD Webhook integration for AI replies
  if (conf.discordEnabled && conf.discordWebhookUrl) {
    try {
      const payload = {
        username: "Reputation Shield Bot",
        avatar_url: "https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&w=150&q=80",
        embeds: [{
          title: `💬 AI Auto-Response Dipublikasikan!`,
          description: `Sistem secara otomatis membalas ulasan masuk dari *${review.reviewerName}* menggunakan asisten cerdas Gemini.`,
          color: 3066993, // Green color for replies
          fields: [
            { name: "🎯 Usaha/Tenant", value: tenant.name, inline: true },
            { name: "👤 Reviewer", value: review.reviewerName, inline: true },
            { name: "⭐ Rating", value: `${'⭐'.repeat(review.rating)} (${review.rating}/5)`, inline: true },
            { name: "💬 Komentar Pelanggan", value: `"${review.comment}"` },
            { name: "🤖 Balasan AI Otomatis", value: `"${reply.content}"` }
          ],
          timestamp: new Date().toISOString()
        }]
      };

      await fetch(conf.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err: any) {
      console.error('Discord reply webhook trigger error:', err);
    }
  }

  // 2. TELEGRAM Integration for AI replies (Real Bot API call)
  if (conf.telegramEnabled) {
    const token = conf.telegramBotToken || '8790574809:AAGlbQ7-ed62hEaQdej0u0tm1IPxm0hlNdY';
    const chatId = conf.telegramChatId || '1064424022';
    if (token && chatId) {
      try {
        const textMessage = `✅ *AI AUTO-RESPONSE PUBLISHED*\n` +
          `----------------------------------------\n` +
          `🏢 *Usaha/Tenant:* ${tenant.name}\n` +
          `👤 *Penerima:* ${review.reviewerName} (${'⭐'.repeat(review.rating)}/5)\n\n` +
          `💬 *Ulasan Pelanggan:* "${review.comment}"\n\n` +
          `🤖 *Balasan AI:* "${reply.content}"\n\n` +
          `🔮 _Ulasan telah otomatis dijawab secara instan tanpa perlu campur tangan._\n` +
          `🔗 *Dashboard:* https://ais-pre-xawuyec6m3v2ic6urdf5jw-930230131845.asia-southeast1.run.app/dashboard/tenants/${tenant.id}`;

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: textMessage,
            parse_mode: 'Markdown'
          })
        });
      } catch (err: any) {
        console.error('Telegram reply dispatch error:', err);
      }
    }
  }
}

// API ENDPOINTS

// 1. Auth Endpoint
app.post('/api/auth/register', (req, res) => {
  const {name, email, password} = req.body;
  const db = readDB();

  const exists = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({error: 'Email sudah terdaftar.'});
  }

  const newUser: User = {
    id: 'user-' + uuid(),
    name: name || 'User Baru',
    email: email.toLowerCase(),
    role: 'owner',
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  currentUserSession = newUser;
  res.json({success: true, user: newUser});
});

app.post('/api/auth/login', (req, res) => {
  const {email, password} = req.body;
  const db = readDB();

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({error: 'Email atau Password salah.'});
  }

  // Plain login mock
  currentUserSession = user;
  res.json({success: true, user});
});

app.get('/api/auth/me', (req, res) => {
  res.json({user: currentUserSession});
});

app.post('/api/auth/logout', (req, res) => {
  // Reset session to default seed user to avoid empty states
  const db = readDB();
  currentUserSession = db.users[0];
  res.json({success: true});
});

// Switch active mockup role for simulation testing
app.post('/api/auth/switch-user', (req, res) => {
  const {role} = req.body;
  const db = readDB();
  const target = db.users.find(u => u.role === role);
  if (target) {
    currentUserSession = target;
    return res.json({success: true, user: target});
  }
  res.status(404).json({error: 'User role target not found.'});
});

// 2. Tenant Endpoints
app.get('/api/tenants', (req, res) => {
  const user = getAuthUser();
  const db = readDB();
  // Filter tenants belonging only to the logged-in owner
  const userTenants = db.tenants.filter(t => t.ownerId === user.id);
  res.json({tenants: userTenants});
});

app.get('/api/tenants/public', (req, res) => {
  const db = readDB();
  res.json({tenants: db.tenants});
});

app.post('/api/tenants', (req, res) => {
  const user = getAuthUser();
  if (user.role !== 'owner') {
    return res.status(403).json({error: 'Hanya pemilik bisnis yang bisa mendaftarkan unit usaha.'});
  }

  const {name, category, description, address, phone, website, openingHours, coverImage, strengths, supportContact} = req.body;
  if (!name || !category) {
    return res.status(400).json({error: 'Nama usaha dan kategori wajib diisi.'});
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const db = readDB();

  // Create standard template AI configs and notification configs
  const newTenant: Tenant = {
    id: 'tenant-' + uuid(),
    ownerId: user.id,
    name,
    slug,
    category,
    description: description || 'Usaha lokal terpercaya.',
    address: address || 'Alamat Lokasi Usaha',
    phone: phone || '',
    website: website || '',
    openingHours: openingHours || '08:00 - 20:00',
    coverImage: coverImage || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
    avgRating: 0,
    totalReviews: 0,
    aiConfig: {
      brandTone: 'friendly',
      language: 'id',
      customContext: description || 'Melayani pelanggan segenap hati.',
      replyGuidelines: 'Sapa pelanggan dengan ramah. Sebutkan keunggulan produk.',
      strengths: strengths || 'Layanan prima, bahan premium, lokasi strategis.',
      supportContact: supportContact || phone || 'Email Customer Support'
    },
    notificationConfigs: {
      telegramEnabled: true,
      telegramChatId: '1064424022',
      telegramBotToken: '8790574809:AAGlbQ7-ed62hEaQdej0u0tm1IPxm0hlNdY',
      whatsappEnabled: false,
      whatsappNumber: '',
      whatsappApiKey: '',
      discordEnabled: true,
      discordWebhookUrl: 'https://discord.com/api/webhooks/1507953025732579349/JHhZITP0Pbvp3TOitO-QeDiO8SqsXbRUlfHT2zXT2jlfDt9D6CgBPL_ET9IyFvOEDRF7',
      notifyOnRatingBelow: 5,
      aiAutoReply: true
    },
    createdAt: new Date().toISOString()
  };

  db.tenants.push(newTenant);

  // Log activity
  db.logs.push({
    id: uuid(),
    tenantId: newTenant.id,
    tenantName: newTenant.name,
    eventType: 'tenant_created',
    channel: 'system',
    payload: `Pendaftaran tenant baru "${newTenant.name}" berhasil dilakukan.`,
    status: 'success',
    errorMessage: null,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.json({success: true, tenant: newTenant});
});

app.get('/api/tenants/:id', (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === req.params.id);
  if (!tenant) {
    return res.status(404).json({error: 'Tenant tidak ditemukan.'});
  }
  res.json({tenant});
});

app.get('/api/tenants/by-slug/:slug', (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.slug === req.params.slug);
  if (!tenant) {
    return res.status(404).json({error: 'Tenant tidak ditemukan.'});
  }
  res.json({tenant});
});

app.put('/api/tenants/:id', (req, res) => {
  const user = getAuthUser();
  const db = readDB();
  const idx = db.tenants.findIndex(t => t.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({error: 'Tenant tidak ditemukan.'});
  }

  // Authorization check (tenant owned by this user only)
  if (db.tenants[idx].ownerId !== user.id) {
    return res.status(403).json({error: 'Akses ditolak. Ini bukan tenant Anda.'});
  }

  db.tenants[idx] = {
    ...db.tenants[idx],
    ...req.body,
    id: req.params.id, // prevent id change
    ownerId: user.id // prevent owner change
  };

  db.logs.push({
    id: uuid(),
    tenantId: req.params.id,
    tenantName: db.tenants[idx].name,
    eventType: 'config_updated',
    channel: 'system',
    payload: `Owner memperbarui informasi dasar tenant ${db.tenants[idx].name}.`,
    status: 'success',
    errorMessage: null,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.json({success: true, tenant: db.tenants[idx]});
});

app.delete('/api/tenants/:id', (req, res) => {
  const user = getAuthUser();
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === req.params.id);

  if (!tenant) {
    return res.status(404).json({error: 'Tenant tidak ditemukan.'});
  }

  if (tenant.ownerId !== user.id) {
    return res.status(403).json({error: 'Akses ditolak.'});
  }

  db.tenants = db.tenants.filter(t => t.id !== req.params.id);
  db.reviews = db.reviews.filter(r => r.tenantId !== req.params.id);

  db.logs.push({
    id: uuid(),
    tenantId: req.params.id,
    tenantName: tenant.name,
    eventType: 'config_updated',
    channel: 'system',
    payload: `Owner menghapus permanen tenant ${tenant.name}.`,
    status: 'success',
    errorMessage: null,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.json({success: true});
});

// Configure AI Context Per Tenant
app.put('/api/tenants/:id/ai-config', (req, res) => {
  const user = getAuthUser();
  const db = readDB();
  const idx = db.tenants.findIndex(t => t.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({error: 'Tenant tidak ditemukan.'});
  }

  if (db.tenants[idx].ownerId !== user.id) {
    return res.status(403).json({error: 'Akses ditolak.'});
  }

  db.tenants[idx].aiConfig = {
    ...db.tenants[idx].aiConfig,
    ...req.body
  };

  db.logs.push({
    id: uuid(),
    tenantId: req.params.id,
    tenantName: db.tenants[idx].name,
    eventType: 'config_updated',
    channel: 'system',
    payload: `Konfigurasi konteks AI untuk tenant "${db.tenants[idx].name}" diperbarui.`,
    status: 'success',
    errorMessage: null,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.json({success: true, aiConfig: db.tenants[idx].aiConfig});
});

// Configure Notification Channels & Credentials
app.put('/api/tenants/:id/notification-config', (req, res) => {
  const user = getAuthUser();
  const db = readDB();
  const idx = db.tenants.findIndex(t => t.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({error: 'Tenant tidak ditemukan.'});
  }

  if (db.tenants[idx].ownerId !== user.id) {
    return res.status(403).json({error: 'Akses ditolak.'});
  }

  db.tenants[idx].notificationConfigs = {
    ...db.tenants[idx].notificationConfigs,
    ...req.body
  };

  db.logs.push({
    id: uuid(),
    tenantId: req.params.id,
    tenantName: db.tenants[idx].name,
    eventType: 'config_updated',
    channel: 'system',
    payload: `Perubahan konfigurasi notifikasi multi-channel dilakukan untuk tenant ${db.tenants[idx].name}.`,
    status: 'success',
    errorMessage: null,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.json({success: true, notificationConfigs: db.tenants[idx].notificationConfigs});
});

// Manual Test Notification Trigger
app.post('/api/tenants/:id/notification-config/test', async (req, res) => {
  const user = getAuthUser();
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === req.params.id);

  if (!tenant) {
    return res.status(404).json({error: 'Tenant tidak ditemukan.'});
  }

  if (tenant.ownerId !== user.id) {
    return res.status(403).json({error: 'Akses ditolak.'});
  }

  // Build a simulated testing review
  const testReview: Review = {
    id: 'test-review-id',
    tenantId: tenant.id,
    reviewerName: 'Reviewer Simulasi (Tes)',
    rating: 1,
    comment: 'Layanan terburuk yang pernah saya rasakan di tempat ini. Saya sangat jengkel!',
    sentimentScore: 12,
    sentimentLabel: 'very_negative',
    topics: ['simulasi', 'uji_coba'],
    isCrisis: true,
    notifiedAt: null,
    repliedAt: null,
    createdAt: new Date().toISOString()
  };

  try {
    await dispatchMultiChannelNotifications(testReview, tenant, {
      sentimentLabel: 'very_negative',
      sentimentScore: 12,
      detectedTopics: ['tes', 'alert_monitoring'],
      isCrisis: true
    });
    res.json({success: true, message: 'Notifikasi test berhasil dikirim ke saluran aktif.'});
  } catch (error: any) {
    res.status(500).json({error: 'Gagal mengirim test: ' + error.message});
  }
});

// 3. Reviews Endpoints & Webhook ingestion
app.get('/api/tenants/:id/reviews', (req, res) => {
  const db = readDB();
  const tenantReviews = db.reviews.filter(r => r.tenantId === req.params.id);
  const reviewsWithReplies = tenantReviews.map(review => {
    const reply = db.replies.find(rep => rep.reviewId === review.id);
    return {
      ...review,
      reply: reply || undefined
    };
  });
  res.json({reviews: reviewsWithReplies});
});

app.post('/api/tenants/:id/reviews', async (req, res) => {
  const {reviewerName, rating, comment} = req.body;
  if (!reviewerName || !rating || !comment) {
    return res.status(400).json({error: 'Nama, rating, dan komentar tidak boleh kosong.'});
  }

  const db = readDB();
  const tenant = db.tenants.find(t => t.id === req.params.id);
  if (!tenant) {
    return res.status(404).json({error: 'Tenant tidak ditemukan.'});
  }

  // System sentiment analysis using Gemini (async inside the request for simplicty and live reactive feed update)
  const analysis = await analyzeReviewWithGemini(comment, Number(rating), tenant.name, tenant.category);

  const newReview: Review = {
    id: 'review-' + uuid(),
    tenantId: tenant.id,
    reviewerName,
    rating: Number(rating),
    comment,
    sentimentScore: analysis.sentimentScore,
    sentimentLabel: analysis.sentimentLabel,
    topics: analysis.detectedTopics,
    isCrisis: analysis.isCrisis,
    notifiedAt: new Date().toISOString(),
    repliedAt: null,
    createdAt: new Date().toISOString()
  };

  // Append review
  db.reviews.push(newReview);

  // Update Tenant aggregate star calculation
  const siblings = db.reviews.filter(r => r.tenantId === tenant.id);
  const totalStar = siblings.reduce((acc, r) => acc + r.rating, 0);
  tenant.totalReviews = siblings.length;
  tenant.avgRating = parseFloat((totalStar / siblings.length).toFixed(1));

  // Log sentiment checked event
  db.logs.push({
    id: uuid(),
    tenantId: tenant.id,
    tenantName: tenant.name,
    eventType: 'sentiment_analyzed',
    channel: 'system',
    payload: `Aktivasi Gemini menganut sentimen: ${analysis.sentimentLabel.toUpperCase()} (Score: ${analysis.sentimentScore}/100) mengenai review ${reviewerName}.`,
    status: 'success',
    errorMessage: null,
    createdAt: new Date().toISOString()
  });

  // Save DB immediately to ensure notifications write works
  writeDB(db);

  // Multi-Channel Instant Alert Dispatch
  await dispatchMultiChannelNotifications(newReview, tenant, analysis);

  // If auto-reply is ON, automatically generate AI response and publish without requiring verification draft
  if (tenant.notificationConfigs.aiAutoReply) {
    try {
      const generatedAnswer = await generateAiReply(newReview, tenant);
      const newReply: ReviewReply = {
        id: 'reply-' + uuid(),
        reviewId: newReview.id,
        content: generatedAnswer,
        isAiGenerated: true,
        aiDraft: generatedAnswer,
        createdAt: new Date().toISOString()
      };

      // Refresh DB state
      const dbFresh = readDB();
      dbFresh.replies.push(newReply);
      const revIdx = dbFresh.reviews.findIndex(r => r.id === newReview.id);
      if (revIdx !== -1) {
        dbFresh.reviews[revIdx].repliedAt = new Date().toISOString();
      }

      dbFresh.logs.push({
        id: uuid(),
        tenantId: tenant.id,
        tenantName: tenant.name,
        eventType: 'reply_sent',
        channel: 'system',
        payload: `Sistem mempublikasikan Auto-Reply otomatis karena toggle Auto-Reply aktif.`,
        status: 'success',
        errorMessage: null,
        createdAt: new Date().toISOString()
      });

      writeDB(dbFresh);
      newReview.repliedAt = newReply.createdAt;

      // Dispatch auto reply notification alert instantly to Telegram & Discord
      await dispatchMultiChannelReplyNotifications(newReply, newReview, tenant);
    } catch (aiErr: any) {
      console.error('Auto reply execution failed:', aiErr);
    }
  }

  res.json({success: true, review: newReview});
});

app.get('/api/reviews/:reviewId', (req, res) => {
  const db = readDB();
  const review = db.reviews.find(r => r.id === req.params.reviewId);
  if (!review) {
    return res.status(404).json({error: 'Review tidak ditemukan.'});
  }
  const tenant = db.tenants.find(t => t.id === review.tenantId);
  const reply = db.replies.find(r => r.reviewId === review.id);

  res.json({review, tenant, reply});
});

// Generate AI draft draft for reviews manually
app.post('/api/reviews/:reviewId/ai-draft', async (req, res) => {
  const user = getAuthUser();
  const db = readDB();
  const review = db.reviews.find(r => r.id === req.params.reviewId);
  if (!review) {
    return res.status(404).json({error: 'Review tidak ditemukan.'});
  }

  const tenant = db.tenants.find(t => t.id === review.tenantId);
  if (!tenant) {
    return res.status(404).json({error: 'Tenant tidak valid.'});
  }

  if (tenant.ownerId !== user.id) {
    return res.status(403).json({error: 'Akses ditolak.'});
  }

  try {
    const draft = await generateAiReply(review, tenant);

    db.logs.push({
      id: uuid(),
      tenantId: tenant.id,
      tenantName: tenant.name,
      eventType: 'reply_drafted',
      channel: 'system',
      payload: `Draft balasan AI berhasil diformulasikan untuk review: "${review.reviewerName}".`,
      status: 'success',
      errorMessage: null,
      createdAt: new Date().toISOString()
    });
    writeDB(db);

    res.json({success: true, draft});
  } catch (err: any) {
    res.status(500).json({error: err.message});
  }
});

// Publish a confirmation/manual reply to a review
app.post('/api/reviews/:reviewId/reply', (req, res) => {
  const {content, isAiGenerated, aiDraft} = req.body;
  if (!content) {
    return res.status(400).json({error: 'Isi balasan tidak boleh kosong.'});
  }

  const user = getAuthUser();
  const db = readDB();
  const review = db.reviews.find(r => r.id === req.params.reviewId);

  if (!review) {
    return res.status(404).json({error: 'Review tidak ditemukan.'});
  }

  const tenant = db.tenants.find(t => t.id === review.tenantId);
  if (!tenant || tenant.ownerId !== user.id) {
    return res.status(403).json({error: 'Akses ditolak.'});
  }

  // Remove existing reply if any
  db.replies = db.replies.filter(r => r.reviewId !== review.id);

  const newReply: ReviewReply = {
    id: 'reply-' + uuid(),
    reviewId: review.id,
    content,
    isAiGenerated: isAiGenerated || false,
    aiDraft: aiDraft || null,
    createdAt: new Date().toISOString()
  };

  db.replies.push(newReply);
  review.repliedAt = newReply.createdAt;

  db.logs.push({
    id: uuid(),
    tenantId: tenant.id,
    tenantName: tenant.name,
    eventType: 'reply_sent',
    channel: 'system',
    payload: `Owner membalas ulasan dari ${review.reviewerName} (Moted AI: ${isAiGenerated ? 'Ya' : 'Tidak'}).`,
    status: 'success',
    errorMessage: null,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.json({success: true, reply: newReply});
});

// 4. System Action logs
app.get('/api/tenants/:id/logs', (req, res) => {
  const db = readDB();
  const user = getAuthUser();
  const tenant = db.tenants.find(t => t.id === req.params.id);

  if (!tenant) {
    return res.status(404).json({error: 'Tenant tidak ditemukan.'});
  }

  if (tenant.ownerId !== user.id) {
    return res.status(403).json({error: 'Akses ditolak.'});
  }

  const tenantLogs = db.logs.filter(l => l.tenantId === req.params.id).reverse();
  res.json({logs: tenantLogs});
});

// Summary overview statistics for Dashboard
app.get('/api/dashboard/stats', (req, res) => {
  const user = getAuthUser();
  const db = readDB();

  const userTenants = db.tenants.filter(t => t.ownerId === user.id);
  const tenantIds = userTenants.map(t => t.id);

  const reviews = db.reviews.filter(r => tenantIds.includes(r.tenantId));
  const unresponded = reviews.filter(r => !r.repliedAt);
  const negative = reviews.filter(r => r.rating <= 2);

  // Sorting reviews by time
  const recentReviews = [...reviews].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentNegative = [...negative].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const recentLogs = db.logs.filter(l => tenantIds.includes(l.tenantId))
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  res.json({
    totalTenants: userTenants.length,
    totalReviews: reviews.length,
    avgRating: userTenants.length > 0 ? parseFloat((userTenants.reduce((acc, t) => acc + t.avgRating, 0) / userTenants.length).toFixed(1)) : 0,
    unrespondedCount: unresponded.length,
    recentReviews,
    recentNegative,
    recentLogs
  });
});

// RESET Simulator database API
app.post('/api/simulator/reset', (req, res) => {
  const state = getInitialState();
  writeDB(state);
  currentUserSession = state.users[0];
  res.json({success: true, message: 'Database simulator berhasil di-reset ke kondisi awal.'});
});

// Setup Vite Dev server or Serve static files
const startServer = async () => {
  if (isVercel) {
    console.log('[Reputation Shield Server] In Vercel serverless environment. Skipping TCP listen.');
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Reputation Shield Server] Online on http://localhost:${PORT}`);
  });
};

startServer().catch(err => {
  console.error('Server failed to start:', err);
});

export default app;
