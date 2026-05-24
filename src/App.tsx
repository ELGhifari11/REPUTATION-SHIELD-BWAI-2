/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Building2, 
  MessageSquare, 
  AlertTriangle, 
  Bell, 
  Sliders, 
  Settings, 
  FileText, 
  Send, 
  Cpu, 
  Sparkles, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  User as UserIcon, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Info, 
  ThumbsUp, 
  Star, 
  Share2, 
  ExternalLink, 
  Search, 
  Check, 
  Clock, 
  Volume2, 
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Tenant, Review, ReviewReply, ActivityLog, User, AIConfig, NotificationConfigs, DBState } from './types';

export default function App() {
  // Session states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  // Owners states
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [currentReplyMap, setCurrentReplyMap] = useState<Record<string, ReviewReply>>({});

  // Form states - Tenant creation
  const [showAddTenant, setShowAddTenant] = useState<boolean>(false);
  const [newTenantName, setNewTenantName] = useState<string>('');
  const [newTenantCategory, setNewTenantCategory] = useState<string>('restoran');
  const [newTenantDesc, setNewTenantDesc] = useState<string>('');
  const [newTenantAddress, setNewTenantAddress] = useState<string>('');
  const [newTenantPhone, setNewTenantPhone] = useState<string>('');
  const [newTenantWebsite, setNewTenantWebsite] = useState<string>('');
  const [newTenantHours, setNewTenantHours] = useState<string>('Senin - Minggu: 08:00 - 21:00');
  const [newTenantCover, setNewTenantCover] = useState<string>('');
  const [newTenantStrengths, setNewTenantStrengths] = useState<string>('');
  const [newTenantSupport, setNewTenantSupport] = useState<string>('');

  // AI & Notification Form states (editing)
  const [aiConfigForm, setAiConfigForm] = useState<AIConfig | null>(null);
  const [notifConfigForm, setNotifConfigForm] = useState<NotificationConfigs | null>(null);
  const [basicInfoForm, setBasicInfoForm] = useState<{
    name: string;
    description: string;
    category: string;
    address: string;
    phone: string;
    website: string;
    openingHours: string;
    coverImage: string;
  } | null>(null);

  // Active Tab for settings
  const [settingsTab, setSettingsTab] = useState<'notifications' | 'ai_config' | 'business_info'>('notifications');

  // AI draft generating states
  const [aiDraftLoading, setAiDraftLoading] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>('');
  const [isAiGeneratedReply, setIsAiGeneratedReply] = useState<boolean>(false);

  // Reviewer Perspective states
  const [publicTenants, setPublicTenants] = useState<Tenant[]>([]);
  const [reviewerSelectedPublicTenant, setReviewerSelectedPublicTenant] = useState<Tenant | null>(null);
  const [reviewerName, setReviewerName] = useState<string>('Fauzan Lubis');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('Tempatnya asri sekali dan bumbu satenya luar biasa meresap! Area parkir sangat lega.');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewHistory, setReviewHistory] = useState<Review[]>([]);

  // Testing & Simulation assistance states
  const [showSimulationGuide, setShowSimulationGuide] = useState<boolean>(true);
  const [currentStepId, setCurrentStepId] = useState<string>('TC-001');
  const [filterLogEvent, setFilterLogEvent] = useState<string>('all');
  const [filterLogStatus, setFilterLogStatus] = useState<string>('all');
  const [hoverStar, setHoverStar] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Active Main views: 'dashboard' | 'logs' | 'reviewer_explore'
  const [mainView, setMainView] = useState<'dashboard' | 'logs' | 'reviewer_explore'>('dashboard');

  // Pre-seed sample complaints to inject instantly for fast testing
  const SAMPLE_COMPLAINTS = [
    {
      label: 'Sangat Buruk - Pelayanan Lambat',
      rating: 1,
      text: 'Pelayanan di sini kacau sekali! Saya mengantre hampir satu jam hanya untuk sepiring nasi dingin. Staf sangat cuek dan acuh tak acuh.'
    },
    {
      label: 'Kotor - Sanitasi Rendah',
      rating: 2,
      text: 'Makanan rasanya standar tapi kehigienisan alat makan sangat meragukan. Gelas masih berminyak serta lalat bertebaran di mana-mana.'
    },
    {
      label: 'Obat Mahal - Salah Ambil',
      rating: 2,
      text: 'Pelayanan apoteker judes sekali dan resep obat yang diberikan sempat salah saji kalau saya tidak cek kembali sendiri. Tolong dievaluasi.'
    },
    {
      label: 'Sangat Responsif & Bersih',
      rating: 5,
      text: 'Klinik higienis mumpuni. Area steril, dokter ramah membimbing anak kecil yang takut jarum suntik. Jempol dua!'
    }
  ];

  // Fetch current user and baseline stats
  const fetchSession = async () => {
    try {
      setLoadingUser(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        // If owner, fetch owner stats
        if (data.user.role === 'owner') {
          fetchOwnerData();
        } else {
          fetchPublicTenants();
        }
      }
    } catch (err) {
      console.error(err);
      showError('Gagal memuat sesi autentikasi.');
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchOwnerData = async () => {
    try {
      // 1. Fetch statistics
      const statsRes = await fetch('/api/dashboard/stats');
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setDashboardStats(stats);
      }

      // 2. Fetch tenants list
      const tenantsRes = await fetch('/api/tenants');
      if (tenantsRes.ok) {
        const tData = await tenantsRes.json();
        setTenants(tData.tenants);
        if (tData.tenants.length > 0 && !selectedTenant) {
          // Default to first tenant
          loadTenantDetails(tData.tenants[0].id);
        } else if (selectedTenant) {
          loadTenantDetails(selectedTenant.id);
        }
      }
    } catch (err) {
      console.error(err);
      showError('Gagal memuat data pemilik bisnis.');
    }
  };

  const fetchPublicTenants = async () => {
    try {
      const res = await fetch('/api/tenants/public');
      if (res.ok) {
        const data = await res.json();
        setPublicTenants(data.tenants);
        if (data.tenants.length > 0 && !reviewerSelectedPublicTenant) {
          setReviewerSelectedPublicTenant(data.tenants[0]);
          fetchPublicReviews(data.tenants[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadTenantDetails = async (tenantId: string) => {
    try {
      const tenantRes = await fetch(`/api/tenants/${tenantId}`);
      if (tenantRes.ok) {
        const data = await tenantRes.json();
        setSelectedTenant(data.tenant);
        setAiConfigForm(data.tenant.aiConfig);
        setNotifConfigForm(data.tenant.notificationConfigs);
        setBasicInfoForm({
          name: data.tenant.name,
          description: data.tenant.description,
          category: data.tenant.category,
          address: data.tenant.address,
          phone: data.tenant.phone,
          website: data.tenant.website,
          openingHours: data.tenant.openingHours,
          coverImage: data.tenant.coverImage
        });

        // Fetch logs for this specific tenant
        const logsRes = await fetch(`/api/tenants/${tenantId}/logs`);
        if (logsRes.ok) {
          const lData = await logsRes.json();
          setActivities(lData.logs);
        }

        // Fetch reviews
        const reviewsRes = await fetch(`/api/tenants/${tenantId}/reviews`);
        if (reviewsRes.ok) {
          const rData = await reviewsRes.json();
          const sortedReviews = (rData.reviews || []).sort(
            (a: Review, b: Review) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setReviews(sortedReviews);

          // Default selected review inside detail panel
          if (sortedReviews.length > 0) {
            setSelectedReview(sortedReviews[0]);
            fetchReviewReply(sortedReviews[0].id);
          } else {
            setSelectedReview(null);
            setReplyText('');
          }
        }
      }
    } catch (err) {
      console.error(err);
      showError('Gagal mendaftar info detail outlet.');
    }
  };

  const fetchReviewReply = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          setCurrentReplyMap(prev => ({ ...prev, [reviewId]: data.reply }));
          setReplyText(data.reply.content);
          setIsAiGeneratedReply(data.reply.isAiGenerated);
        } else {
          setReplyText('');
          setIsAiGeneratedReply(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPublicReviews = async (tenantId: string) => {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/reviews`);
      if (res.ok) {
        const data = await res.json();
        const sorted = (data.reviews || []).sort(
          (a: Review, b: Review) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setReviewHistory(sorted);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 5000);
  };

  // Quick helper to convert role
  const handleRoleToggle = async (targetRole: 'owner' | 'reviewer') => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        showSuccess(`Berhasil bertukar peran simulasi menjadi ${targetRole === 'owner' ? 'Pemilik Bisnis' : 'Reviewer Publik'}`);
        if (targetRole === 'owner') {
          setMainView('dashboard');
          fetchOwnerData();
        } else {
          setMainView('reviewer_explore');
          fetchPublicTenants();
        }
      }
    } catch (err) {
      showError('Gagal bertukar sesi simulasi.');
    }
  };

  // Reset database back to seed baseline
  const resetDatabaseEngine = async () => {
    if (!window.confirm('Yakin ingin mereset database simulator kembali ke kondisi default awal? Semua ulasan kustom Anda akan dibersihkan.')) return;
    try {
      const res = await fetch('/api/simulator/reset', { method: 'POST' });
      if (res.ok) {
        showSuccess('Basis data simulator berhasil di-reset sepenuhnya.');
        fetchSession();
      }
    } catch (err) {
      showError('Gagal melakukan reset pangkalan data.');
    }
  };

  // AI draft generating trigger
  const handleGenerateAIDraft = async (reviewId: string) => {
    if (!selectedTenant) return;
    try {
      setAiDraftLoading(true);
      const res = await fetch(`/api/reviews/${reviewId}/ai-draft`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setReplyText(data.draft);
        setIsAiGeneratedReply(true);
        showSuccess('Draft balasan empati berhasil dirumuskan oleh Gemini AI!');
      } else {
        showError(data.error || 'Gagal merumuskan draf AI.');
      }
    } catch (err) {
      showError('Internal server Gemini error.');
    } finally {
      setAiDraftLoading(false);
    }
  };

  // Save/Publish the reply
  const publishReviewReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      showError('Isi teks balasan wajib disediakan.');
      return;
    }
    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyText,
          isAiGenerated: isAiGeneratedReply,
          aiDraft: isAiGeneratedReply ? replyText : null
        })
      });
      if (res.ok) {
        showSuccess('Balasan ulasan berhasil disimpan & dipublikasikan ke publik!');
        loadTenantDetails(selectedTenant!.id);
      }
    } catch (err) {
      showError('Gagal memproses draf balasan.');
    }
  };

  // Save AI Config fields
  const handleSaveAiConfig = async () => {
    if (!selectedTenant || !aiConfigForm) return;
    try {
      const res = await fetch(`/api/tenants/${selectedTenant.id}/ai-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiConfigForm)
      });
      if (res.ok) {
        showSuccess('Preferensi konteks mesin AI berhasil disimpan!');
        loadTenantDetails(selectedTenant.id);
      }
    } catch (err) {
      showError('Gagal menyimpan preferensi AI.');
    }
  };

  // Save Notification toggles & credentials
  const handleSaveNotificationConfig = async () => {
    if (!selectedTenant || !notifConfigForm) return;
    try {
      const res = await fetch(`/api/tenants/${selectedTenant.id}/notification-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifConfigForm)
      });
      if (res.ok) {
        showSuccess('Konfigurasi notifikasi multi-channel berhasil diperbarui!');
        loadTenantDetails(selectedTenant.id);
      }
    } catch (err) {
      showError('Gagal memperbarui integrasi notifikasi.');
    }
  };

  // Test Notification execution
  const triggerNotificationTest = async () => {
    if (!selectedTenant) return;
    try {
      const res = await fetch(`/api/tenants/${selectedTenant.id}/notification-config/test`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('BERHASIL: Notifikasi krisis simulasi (1-star) dikirim ke semua saluran aktif pemilik outlet!');
        loadTenantDetails(selectedTenant.id);
      } else {
        showError(data.error || 'Terjadi gangguan saat memicu notifikasi.');
      }
    } catch (err) {
      showError('Gangguan routing webhook simulator.');
    }
  };

  // Add new business tenant
  const handleCreateTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantCategory) {
      showError('Nama usaha dan kategori mutlak diisi!');
      return;
    }
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTenantName,
          category: newTenantCategory,
          description: newTenantDesc,
          address: newTenantAddress,
          phone: newTenantPhone,
          website: newTenantWebsite,
          openingHours: newTenantHours,
          coverImage: newTenantCover,
          strengths: newTenantStrengths,
          supportContact: newTenantSupport
        })
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Sempurna! Outlet "${newTenantName}" berhasil didaftarkan.`);
        setShowAddTenant(false);
        // Reset forms
        setNewTenantName('');
        setNewTenantCategory('restoran');
        setNewTenantDesc('');
        setNewTenantAddress('');
        setNewTenantPhone('');
        setNewTenantWebsite('');
        setNewTenantHours('Senin - Minggu: 08:00 - 21:00');
        setNewTenantCover('');
        setNewTenantStrengths('');
        setNewTenantSupport('');

        // Reload data
        fetchOwnerData();
      } else {
        showError(data.error || 'Gagal mendaftarkan unit outlet baru.');
      }
    } catch (err) {
      showError('Gagal terhubung dengan server pendaftaran.');
    }
  };

  // Save General Business Info modifications
  const handleSaveBasicInfo = async () => {
    if (!selectedTenant || !basicInfoForm) return;
    try {
      const res = await fetch(`/api/tenants/${selectedTenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basicInfoForm)
      });
      if (res.ok) {
        showSuccess('Informasi profil Google Maps outlet berhasil disunting.');
        loadTenantDetails(selectedTenant.id);
      }
    } catch (err) {
      showError('Gagal mengubah informasi dasar.');
    }
  };

  // Submit client-side review from Reviewer Role
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName) {
      showError('Nama reviewer wajib diisi.');
      return;
    }
    if (!reviewComment) {
      showError('Silakan ketik komentar ulasan Anda.');
      return;
    }
    if (!reviewerSelectedPublicTenant) return;

    try {
      setSubmittingReview(true);
      const res = await fetch(`/api/tenants/${reviewerSelectedPublicTenant.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerName,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('Ulasan Anda berhasil diunggah! Sistem AI Gemini telah selesai menganalisis sentimen, mendeteksi topik, dan mendisparasi notifikasi.');
        // Clear comment box
        setReviewComment('');
        // Reload history
        fetchPublicReviews(reviewerSelectedPublicTenant.id);
      } else {
        showError(data.error || 'Gagal mempublikasikan ulasan.');
      }
    } catch (err) {
      showError('Gangguan ingestion ulasan.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Pre-fill sampler
  const applySampleReviewInput = (sample: typeof SAMPLE_COMPLAINTS[number]) => {
    setReviewRating(sample.rating);
    setReviewComment(sample.text);
    showSuccess('Contoh keluhan simulasi berhasil dimasukkan!');
  };

  // Delete Tenant
  const handleDeleteTenant = async (tenantId: string) => {
    if (!window.confirm('PERINGATAN KRITIS: Anda akan menghapus tenant ini beserta seluruh ulasan pelanggan di dalamnya secara permanen. Lanjutkan?')) return;
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess('Tenant berhasil dihapus.');
        setSelectedTenant(null);
        fetchOwnerData();
      }
    } catch (err) {
      showError('Gagal menghapus tenant.');
    }
  };

  // Render Stars Component
  const renderInteractiveStars = (ratingNum: number, currentSetVal: number, onSetFn?: (num: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= (hoverStar || currentSetVal);
          return (
            <button
              key={star}
              type="button"
              onClick={() => onSetFn && onSetFn(star)}
              onMouseEnter={() => onSetFn && setHoverStar(star)}
              onMouseLeave={() => onSetFn && setHoverStar(0)}
              className={`p-1 transition-transform ${onSetFn ? 'cursor-pointer hover:scale-125' : 'cursor-default'}`}
              disabled={!onSetFn}
            >
              <Star 
                className={`w-6 h-6 ${
                  isFilled 
                    ? 'fill-amber-400 text-amber-400' 
                    : 'text-neutral-400'
                }`} 
              />
            </button>
          );
        })}
      </div>
    );
  };

  // Simple Rating badge styling
  const getRatingSummaryStyles = (rating: number) => {
    if (rating >= 4.5) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (rating >= 3.5) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  // Sentiment label colors
  const getSentimentBadge = (label: string) => {
    switch(label) {
      case 'very_positive':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Sangat Positif</span>;
      case 'positive':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Positif</span>;
      case 'neutral':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">Netral</span>;
      case 'negative':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">Negatif</span>;
      case 'very_negative':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-200 text-rose-950 animate-pulse">KRISIS - Sangat Buruk</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{label}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FBFC] text-neutral-800 font-sans">
      {/* Simulation Guideline Sticky Header */}
      {showSimulationGuide && (
        <div className="bg-gradient-to-r from-teal-900 to-indigo-950 text-white border-b border-indigo-900 py-3.5 px-4 sticky top-0 z-50 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="bg-teal-500 rounded p-1.5 text-slate-900 shrink-0 mt-0.5">
                <Sliders className="w-5 h-5 font-bold" />
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-wide text-teal-300">PANEL SIMULASI & PENGUJIAN AKHIR (E2E)</h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  Gunakan slot kontrol ini untuk menguji fungsionalitas PRD. Anda dapat bertukar peran antara <strong>Pemilik Bisnis (Owner)</strong> untuk mengelola draf AI / konfigurasi, dan <strong>Reviewer Publik</strong> untuk mengirimkan rating bintang buruk (1-2) yang akan memicu analisis sentimen Gemini, menyalakan alarm krisis, serta mengirim sinyal ke Discord secara aktual!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="bg-indigo-900/80 px-3 py-1.5 rounded-lg border border-indigo-700 flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold text-indigo-300">Skenario Aktif:</span>
                <span className="text-xs bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800 text-white font-mono">{currentUser?.role === 'owner' ? 'Owner Dashboard' : 'Reviewer Space'}</span>
              </div>
              <button 
                onClick={() => handleRoleToggle(currentUser?.role === 'owner' ? 'reviewer' : 'owner')}
                className="bg-teal-500 hover:bg-teal-400 text-neutral-950 text-xs font-bold py-1.5 px-3 rounded-md transition-colors flex items-center space-x-1"
                id="role-indicator-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Jadi {currentUser?.role === 'owner' ? 'Reviewer' : 'Owner'}</span>
              </button>
              <button 
                onClick={resetDatabaseEngine}
                className="bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/50 text-rose-200 text-xs font-medium py-1.5 px-3 rounded-md transition-colors flex items-center space-x-1"
                id="reset-simulation-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset DB</span>
              </button>
              <button 
                onClick={() => setShowSimulationGuide(false)}
                className="text-slate-400 hover:text-white text-xs px-2"
                title="Tutup Panel"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Toast Alerts */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-neutral-900 text-white text-xs px-4 py-3 rounded-xl border border-neutral-800 shadow-2xl flex items-center space-x-3 animate-slide-in max-w-sm">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-rose-950 text-rose-100 text-xs px-4 py-3 rounded-xl border border-rose-800 shadow-2xl flex items-center space-x-3 animate-slide-in max-w-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Main Bar Navigation */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40" id="header-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="bg-neutral-900 text-white p-2 rounded-xl">
                <Shield className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-neutral-900">REPUTATION SHIELD</h1>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-none">AI Sentiment & Crisis Guard</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              {currentUser?.role === 'owner' ? (
                <>
                  <button 
                    onClick={() => { setMainView('dashboard'); fetchOwnerData(); }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${mainView === 'dashboard' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
                    id="nav-dashboard"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Dasbor Utama</span>
                  </button>
                  <button 
                    onClick={() => { setMainView('logs'); fetchOwnerData(); }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${mainView === 'logs' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
                    id="nav-logs"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Log Aktivitas</span>
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setMainView('reviewer_explore')}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-neutral-900 text-white flex items-center space-x-1.5"
                  id="nav-reviewer"
                >
                  <MessageSquare className="w-4 h-4 text-teal-300" />
                  <span>Cari Bisnis & Tulis Ulasan</span>
                </button>
              )}
            </nav>

            <div className="flex items-center space-x-4 border-l border-neutral-200 pl-4">
              {/* Premium Interactive Switch Role Button */}
              <button 
                onClick={() => handleRoleToggle(currentUser?.role === 'owner' ? 'reviewer' : 'owner')}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold duration-200 flex items-center gap-1.5 transition-all shadow-sm ${
                  currentUser?.role === 'owner' 
                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/90 border' 
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100/90 border'
                }`}
                title="Ganti Peran Pengguna"
                id="global-switch-role-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ganti Peran: <span className="font-extrabold">{currentUser?.role === 'owner' ? 'Reviewer' : 'Owner'}</span></span>
              </button>

              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-neutral-900">{currentUser?.name || 'Anonim'}</p>
                <p className="text-[10px] text-neutral-500 font-mono capitalize">{currentUser?.role === 'owner' ? '🛡️ Owner Akun' : '✍️ Reviewer Publik'}</p>
              </div>
              <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center border border-neutral-200 font-bold text-slate-800 shrink-0">
                {currentUser?.name ? currentUser.name[0] : 'U'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW 1: OWNER DASHBOARD */}
        {currentUser?.role === 'owner' && mainView === 'dashboard' && (
          <div className="space-y-8 animate-fade-in" id="owner-panel-view">
            
            {/* KPI STATS */}
            {dashboardStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid-cards">
                
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Bisnis/Tenant</p>
                    <p className="text-2xl font-black text-neutral-900 mt-1">{dashboardStats.totalTenants}</p>
                  </div>
                  <div className="bg-teal-50 text-teal-600 p-3 rounded-xl border border-teal-100">
                    <Building2 className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Ulasan/Review</p>
                    <p className="text-2xl font-black text-neutral-900 mt-1">{dashboardStats.totalReviews}</p>
                  </div>
                  <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl border border-indigo-100">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Rerata Rating</p>
                    <div className="flex items-center space-x-1.5 mt-1">
                      <p className="text-2xl font-black text-neutral-900">{dashboardStats.avgRating}</p>
                      <div className="flex items-center text-amber-500">
                        <Star className="w-4 h-4 fill-amber-400" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-50 text-amber-600 p-3 rounded-xl border border-amber-100">
                    <Star className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Belum Dibalas</p>
                    <p className={`text-2xl font-black mt-1 ${dashboardStats.unrespondedCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{dashboardStats.unrespondedCount}</p>
                  </div>
                  <div className={`p-3 rounded-xl border ${dashboardStats.unrespondedCount > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-neutral-50 text-neutral-600 border-neutral-100'}`}>
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                </div>

              </div>
            )}

            {/* TENANTS SELECTION BAR */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="tenant-selector-bar">
              <div className="flex items-center space-x-3">
                <div className="bg-slate-100 text-slate-700 p-2 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase font-black tracking-widest block leading-none">Pilih Tenant Bisnis Aktif</label>
                  <select 
                    value={selectedTenant?.id || ''} 
                    onChange={(e) => loadTenantDetails(e.target.value)}
                    className="mt-1 block w-64 rounded-lg border-neutral-300 bg-white py-1.5 px-2.5 text-xs font-bold text-neutral-900 focus:border-neutral-500 focus:ring-0 shadow-sm"
                    id="tenant-dropdown-selector"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddTenant(true)}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                  id="add-tenant-btn"
                >
                  <Plus className="w-4 h-4 text-teal-400" />
                  <span>Pendaftaran Bisnis Baru</span>
                </button>

                {selectedTenant && (
                  <button
                    onClick={() => handleDeleteTenant(selectedTenant.id)}
                    className="border border-neutral-200 text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-colors"
                    title="Hapus Tenant Terpilih"
                    id="delete-tenant-btn"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* REGISTER NEW TENANT MODAL FORM (INLINE OR POPUP IF SHOWADD=TRUE) */}
            {showAddTenant && (
              <div className="bg-white border border-slate-300 rounded-3xl p-6 shadow-xl relative animate-fade-in" id="add-tenant-block">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-black text-base text-neutral-900">FORM PENDAFTARAN OUTLET TENANT BARU</h3>
                  </div>
                  <button onClick={() => setShowAddTenant(false)} className="text-neutral-400 hover:text-neutral-600 text-sm font-bold">✕ Tutup</button>
                </div>

                <form onSubmit={handleCreateTenantSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Nama Usaha / Outlet (Sesuai Google Maps)*</label>
                      <input 
                        type="text" 
                        required 
                        value={newTenantName} 
                        onChange={(e) => setNewTenantName(e.target.value)} 
                        placeholder="Contoh: Warung Sate Makmur Abadi"
                        className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-neutral-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Kategori Usaha*</label>
                      <select 
                        required 
                        value={newTenantCategory} 
                        onChange={(e) => setNewTenantCategory(e.target.value)} 
                        className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-neutral-50"
                      >
                        <option value="restoran">Restoran & Cafe</option>
                        <option value="klinik">Klinik & Laboratorium Medis</option>
                        <option value="hotel">Hotel & Penginapan</option>
                        <option value="toko">Toko Online & Retail</option>
                        <option value="jasa">Jasa Laundry / Otomotif / Lainnya</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Alamat Lengkap</label>
                      <input 
                        type="text" 
                        value={newTenantAddress} 
                        onChange={(e) => setNewTenantAddress(e.target.value)} 
                        placeholder="Jl. Raya Kebayoran No. 12"
                        className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-neutral-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Telepon</label>
                      <input 
                        type="text" 
                        value={newTenantPhone} 
                        onChange={(e) => setNewTenantPhone(e.target.value)} 
                        placeholder="0812XXXXXXXX"
                        className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-neutral-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Situs Web</label>
                      <input 
                        type="text" 
                        value={newTenantWebsite} 
                        onChange={(e) => setNewTenantWebsite(e.target.value)} 
                        placeholder="https://restosatemakmur.com"
                        className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-neutral-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Jam Operasional</label>
                      <input 
                        type="text" 
                        value={newTenantHours} 
                        onChange={(e) => setNewTenantHours(e.target.value)} 
                        placeholder="Senin - Minggu: 08:00 - 21:00"
                        className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-neutral-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Info Keunggulan Usaha (Konteks Balasan AI)</label>
                      <input 
                        type="text" 
                        value={newTenantStrengths} 
                        onChange={(e) => setNewTenantStrengths(e.target.value)} 
                        placeholder="Misal: Daging sate premium segar, kuah kacang rahasia 3 dekade"
                        className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-neutral-50 animate-pulse"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Kontak Pengaduan Masalah</label>
                      <input 
                        type="text" 
                        value={newTenantSupport} 
                        onChange={(e) => setNewTenantSupport(e.target.value)} 
                        placeholder="Misal: WhatsApp CS : 0812-3322-1100"
                        className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-neutral-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Tautan Foto Utama (Opsional)</label>
                    <input 
                        type="text" 
                        value={newTenantCover} 
                        onChange={(e) => setNewTenantCover(e.target.value)} 
                        placeholder="https://images.unsplash.com/photo-XXX"
                        className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-neutral-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Deskripsi & Profil Bisnis Lengkap</label>
                    <textarea 
                      rows={2}
                      value={newTenantDesc} 
                      onChange={(e) => setNewTenantDesc(e.target.value)} 
                      placeholder="Gambarkan bisnis secara rinci untuk membekali pengetahuan AI cs saat membalas keluhan..."
                      className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-neutral-50"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowAddTenant(false)}
                      className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold py-2 px-5 rounded-xl transition-all"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold py-2 px-6 rounded-xl transition-all shadow-md flex items-center space-x-1"
                    >
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Simpan & Daftarkan</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* DETAILED TENANT WORKSPACE DISPLAY */}
            {selectedTenant ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="tenant-workspace-grid">
                
                {/* LEFT COLUMN: REVIEW INBOX LIST (SIZE: 5) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-neutral-50/70">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-neutral-600" />
                        <h3 className="font-black text-sm text-neutral-900">REVIEW INBOX ({reviews.length})</h3>
                      </div>
                      <span className="text-[10px] bg-neutral-200 text-neutral-800 font-bold px-2 py-0.5 rounded-full">Real-time</span>
                    </div>

                    <div className="divide-y divide-neutral-100 max-h-[550px] overflow-y-auto">
                      {reviews.length === 0 ? (
                        <div className="p-8 text-center text-neutral-400">
                          <MessageSquare className="w-12 h-12 mx-auto text-neutral-300 mb-2" />
                          <p className="text-xs">Belum ada ulasan terdaftar untuk bisnis ini.</p>
                          <p className="text-[10px] text-neutral-400 mt-1">Ubah peran jadi "Reviewer" di atas untuk mengirimkan ulasan pertama!</p>
                        </div>
                      ) : (
                        reviews.map((r) => {
                          const isSelected = selectedReview?.id === r.id;
                          const hasReplied = r.repliedAt;
                          
                          return (
                            <div
                              key={r.id}
                              onClick={() => {
                                setSelectedReview(r);
                                fetchReviewReply(r.id);
                              }}
                              className={`p-4 cursor-pointer hover:bg-neutral-50 transition-all text-left ${isSelected ? 'bg-teal-50/40 border-l-4 border-teal-500' : ''}`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-800">{r.reviewerName}</h4>
                                  <div className="flex items-center space-x-1 mt-0.5">
                                    <div className="flex text-amber-400">
                                      {Array.from({ length: r.rating }).map((_, i) => (
                                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                      ))}
                                    </div>
                                    <span className="text-[10px] text-neutral-500">({r.rating}/5)</span>
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                  <span className="text-[9px] text-neutral-400">{new Date(r.createdAt).toLocaleDateString('id-ID')}</span>
                                  {getSentimentBadge(r.sentimentLabel)}
                                </div>
                              </div>

                              <p className="text-xs text-neutral-600 line-clamp-2 mt-2 leading-relaxed">
                                "{r.comment}"
                              </p>

                              <div className="flex flex-wrap items-center justify-between gap-1.5 mt-3 pt-2.5 border-t border-neutral-100/50">
                                <div className="flex flex-wrap gap-1">
                                  {r.topics.slice(0, 2).map((topic, i) => (
                                    <span key={i} className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200">
                                      {topic}
                                    </span>
                                  ))}
                                  {r.isCrisis && (
                                    <span className="text-[9px] bg-rose-500 text-white font-black px-1.5 py-0.5 rounded shadow-sm animate-pulse">
                                      Krisis 🚨
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-1 text-[10px]">
                                  {hasReplied ? (
                                    <span className="text-emerald-600 font-bold flex items-center space-x-0.5">
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      <span>Terjawab</span>
                                    </span>
                                  ) : (
                                    <span className="text-rose-500 font-semibold flex items-center space-x-0.5 animate-pulse">
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      <span>Perlu Respon</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: DETAIL INSPECTOR & SETTINGS WORKSPACE (SIZE: 8) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  
                  {/* WORKSPACE AREA A: SELECTED REVIEW DETAILED VIEW & AI REPLY GENERATOR */}
                  {selectedReview ? (
                    <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 text-left">
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
                        <div className="flex items-center space-x-2">
                          <Cpu className="w-5 h-5 text-teal-500" />
                          <h3 className="font-black text-sm text-neutral-900 tracking-wide uppercase">ASISTEN BALASAN INSTAN (SENTIMEN AI)</h3>
                        </div>
                        {selectedReview.isCrisis && (
                          <span className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded animate-pulse">ALARM KRISIS AKTIF</span>
                        )}
                      </div>

                      {/* Review details */}
                      <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/60 mb-5 relative">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-slate-700 text-xs">
                              {selectedReview.reviewerName[0]}
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-slate-800">{selectedReview.reviewerName}</h4>
                              <p className="text-[10px] text-neutral-400">Dimasukkan pada {new Date(selectedReview.createdAt).toLocaleString('id-ID')}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 self-start sm:self-center">
                            <span className="text-xs font-bold text-neutral-600">Skor Sentimen: <strong className="text-teal-600 font-mono">{selectedReview.sentimentScore}/100</strong></span>
                            {getSentimentBadge(selectedReview.sentimentLabel)}
                          </div>
                        </div>

                        <div className="mt-3.5 text-xs text-neutral-700 leading-relaxed font-medium bg-white p-3 rounded-lg border border-neutral-200/40">
                          "{selectedReview.comment}"
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <span className="text-[10px] text-neutral-400 font-bold self-center mr-1">Topik Isu Terdeteksi:</span>
                          {selectedReview.topics.map((t, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-700 font-bold border border-slate-200/60 px-2 py-0.5 rounded">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* AI Draft Replying Area */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1 text-xs">
                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="font-bold text-neutral-600">Teknologi Gemini-3.5-Flash (Kontekstual Outlet)</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleGenerateAIDraft(selectedReview.id)}
                            disabled={aiDraftLoading}
                            className={`bg-gradient-to-r from-neutral-900 to-indigo-950 hover:from-neutral-800 hover:to-indigo-900 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition-all flex items-center space-x-1.5 ${aiDraftLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            id="gen-ai-draft-btn"
                          >
                            <Cpu className="w-3.5 h-3.5 text-teal-400 animate-spin-slow" />
                            <span>{aiDraftLoading ? 'Memformulasikan...' : 'Formulasikan Balasan AI'}</span>
                          </button>
                        </div>

                        <div className="relative">
                          <textarea
                            rows={5}
                            value={replyText}
                            onChange={(e) => {
                              setReplyText(e.target.value);
                              setIsAiGeneratedReply(false); // marked as custom edit if typed manually
                            }}
                            placeholder="Gunakan draf balasan AI di atas, atau ketik balasan kustom empatik Anda di sini..."
                            className="block w-full rounded-2xl border-neutral-300 p-4 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 leading-relaxed placeholder:text-neutral-400"
                            id="reply-textarea"
                          />
                          {isAiGeneratedReply && (
                            <span className="absolute bottom-3 right-3 bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200/50 px-2.5 py-1 rounded flex items-center space-x-1">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>Formula AI CS</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <p className="text-[10px] text-neutral-400 leading-normal max-w-md">
                            💡 Jawablah ulasan rating buruk dengan sopan, minta maaf, tawarkan perbaikan tulus, serta sisipkan kontak aduan agar cepat selesai.
                          </p>

                          <button
                            type="button"
                            onClick={() => publishReviewReply(selectedReview.id)}
                            disabled={!replyText.trim()}
                            className={`bg-teal-500 hover:bg-teal-400 text-neutral-950 text-xs font-black py-2.5 px-6 rounded-xl shadow transition-all flex items-center space-x-1.5 ${!replyText.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                            id="publish-reply-btn"
                          >
                            <Send className="w-4 h-4" />
                            <span>Kirim & Terbangkan Balasan</span>
                          </button>
                        </div>

                        {/* Existing Reply under review detail */}
                        {currentReplyMap[selectedReview.id] && (
                          <div className="bg-emerald-50/90 border border-emerald-200/60 p-4 rounded-xl mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-emerald-800 flex items-center space-x-1">
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                <span>Tanggapan Publik Terkini</span>
                              </span>
                              <span className="text-[10px] text-emerald-600 font-mono">Published</span>
                            </div>
                            <p className="text-xs text-neutral-700 leading-relaxed bg-white/75 p-3 rounded-lg border border-emerald-100">
                              "{currentReplyMap[selectedReview.id].content}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* WORKSPACE AREA B: SETTINGS TAB WORKSPACE (3 Tabs) */}
                  <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden text-left" id="settings-tab-workspace">
                    <div className="border-b border-neutral-200 bg-neutral-50/70 p-1 flex">
                      <button 
                        onClick={() => setSettingsTab('notifications')}
                        className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${settingsTab === 'notifications' ? 'bg-white text-neutral-900 border border-neutral-200/50 shadow-sm' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'}`}
                        id="tab-notif"
                      >
                        <Bell className="w-4 h-4 text-indigo-500" />
                        <span>Kanal Notifikasi (Multi-Channel)</span>
                      </button>
                      <button 
                        onClick={() => setSettingsTab('ai_config')}
                        className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${settingsTab === 'ai_config' ? 'bg-white text-neutral-900 border border-neutral-200/50 shadow-sm' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'}`}
                        id="tab-ai-context"
                      >
                        <Cpu className="w-4 h-4 text-emerald-500" />
                        <span>Konteks & Karakter AI</span>
                      </button>
                      <button 
                        onClick={() => setSettingsTab('business_info')}
                        className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${settingsTab === 'business_info' ? 'bg-white text-neutral-900 border border-neutral-200/50 shadow-sm' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'}`}
                        id="tab-business-info"
                      >
                        <Building2 className="w-4 h-4 text-neutral-500" />
                        <span>Profil Lokasi Bisnis</span>
                      </button>
                    </div>

                    <div className="p-6">
                      
                      {/* TAB 1: NOTIFICATION CHANNELS & CREDENTIALS */}
                      {settingsTab === 'notifications' && notifConfigForm && (
                        <div className="space-y-6" id="settings-notif-form">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-neutral-200/60">
                            <div>
                              <h4 className="font-bold text-xs text-neutral-900">UJI COBA NOTIFIKASI DI TEMPAT</h4>
                              <p className="text-[10px] text-neutral-500 mt-1 max-w-md">
                                Pemicu simulasi: Kirim contoh keluhan bintang 1 instan (SOS) untuk menguji keaktifan perlintasan integrasi notifikasi Anda secara langsung.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={triggerNotificationTest}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow transition-colors shrink-0"
                              id="trigger-test-notif-btn"
                            >
                              Kirim Notifikasi Tes
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Discord Channel Integration (ACTUAL) */}
                            <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">DISCORD WEBHOOK (AKTIF JALUR)</span>
                                  <input 
                                    type="checkbox"
                                    checked={notifConfigForm.discordEnabled}
                                    onChange={(e) => setNotifConfigForm({...notifConfigForm, discordEnabled: e.target.checked})}
                                    className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                  />
                                </div>
                                <p className="text-[10px] text-neutral-500 leading-normal mb-3">
                                  Gunakan Webhook ID Discord kustom di bawah ini yang disediakan oleh user untuk dipancarkan alert detailnya.
                                </p>
                              </div>
                              <input 
                                type="text"
                                value={notifConfigForm.discordWebhookUrl}
                                onChange={(e) => setNotifConfigForm({...notifConfigForm, discordWebhookUrl: e.target.value})}
                                placeholder="https://discord.com/api/webhooks/..."
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-[10px] font-mono"
                              />
                            </div>

                            {/* Telegram Bot Simulation */}
                            <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-black text-sky-700 uppercase tracking-widest">TELEGRAM ALERT (BOT API)</span>
                                  <input 
                                    type="checkbox"
                                    checked={notifConfigForm.telegramEnabled}
                                    onChange={(e) => setNotifConfigForm({...notifConfigForm, telegramEnabled: e.target.checked})}
                                    className="rounded border-neutral-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                                  />
                                </div>
                                <p className="text-[10px] text-neutral-500 leading-normal mb-3">
                                  Otomatis memancarkan sinyal krisis ke bot Telegram owner apabila dihidupkan keluhan dengan rating buruk.
                                </p>
                              </div>
                              
                              <div className="space-y-2 mt-2">
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-neutral-400 block">Telegram Bot Token</label>
                                  <input 
                                    type="text"
                                    value={notifConfigForm.telegramBotToken || ''}
                                    onChange={(e) => setNotifConfigForm({...notifConfigForm, telegramBotToken: e.target.value})}
                                    placeholder="Contoh: 8790574809:AAGlbQ7-ed62hEaQdej0u0tm1IPxm0hlNdY"
                                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 text-[10px] font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-neutral-400 block">Telegram Chat ID</label>
                                  <input 
                                    type="text"
                                    value={notifConfigForm.telegramChatId || ''}
                                    onChange={(e) => setNotifConfigForm({...notifConfigForm, telegramChatId: e.target.value})}
                                    placeholder="Contoh: 1064424022"
                                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 text-[10px] font-mono"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* WhatsApp Integration API */}
                            <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">WHATSAPP API ALERT</span>
                                  <input 
                                    type="checkbox"
                                    checked={notifConfigForm.whatsappEnabled}
                                    onChange={(e) => setNotifConfigForm({...notifConfigForm, whatsappEnabled: e.target.checked})}
                                    className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                  />
                                </div>
                                <p className="text-[10px] text-neutral-500 leading-normal mb-3">
                                  Koneksikan gerbang Whapi.cloud endpoint untuk meneruskan draf perbaikan langsung ke nomor CS.
                                </p>
                              </div>
                              <input 
                                type="text"
                                value={notifConfigForm.whatsappNumber}
                                onChange={(e) => setNotifConfigForm({...notifConfigForm, whatsappNumber: e.target.value})}
                                placeholder="628129988XXXX"
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-[10px] font-mono"
                              />
                            </div>

                            {/* Auto Answer Toggle Setup */}
                            <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-black text-teal-800 uppercase tracking-widest">Gemini Auto-Reply Tanpa Verifikasi</span>
                                  <input 
                                    type="checkbox"
                                    checked={notifConfigForm.aiAutoReply}
                                    onChange={(e) => setNotifConfigForm({...notifConfigForm, aiAutoReply: e.target.checked})}
                                    className="rounded border-neutral-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                                  />
                                </div>
                                <p className="text-[10px] text-neutral-500 leading-normal mb-3">
                                  Penting: Apabila tombol aktif, draf balasan AI Gemini langsung dipublikasikan seketika ulasan masuk tanpa disetujui manual.
                                </p>
                              </div>
                              <div className="bg-teal-50 px-2 py-1 rounded text-[9px] text-teal-800 font-bold border border-teal-100">
                                {notifConfigForm.aiAutoReply ? 'MODE AUTO ON: Eksekusi Otomatis Aktif' : 'MODE MANUAL: Harus klik verifikasi di dasbor'}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-neutral-700 block">Kirim Alarm Alert Jika Rating Di Bawah Atau Sama Dengan:</label>
                            <div className="flex items-center space-x-4">
                              <input 
                                type="range" 
                                min="1" 
                                max="5" 
                                value={notifConfigForm.notifyOnRatingBelow}
                                onChange={(e) => setNotifConfigForm({...notifConfigForm, notifyOnRatingBelow: Number(e.target.value)})}
                                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                              />
                              <span className="text-xs font-black bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg">
                                ≤ {notifConfigForm.notifyOnRatingBelow} Bintang
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-end pt-4 border-t border-neutral-100">
                            <button
                              type="button"
                              onClick={handleSaveNotificationConfig}
                              className="bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold py-2 px-6 rounded-xl transition-all shadow-md"
                              id="save-notif-btn"
                            >
                              Simpan Pengaturan Notifikasi
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: AI REPLIER TONE & GUIDELINES CONTEXT */}
                      {settingsTab === 'ai_config' && aiConfigForm && (
                        <div className="space-y-6" id="settings-ai-form">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Gaya Kebahasaan / Nada Bicara AI</label>
                              <select 
                                value={aiConfigForm.brandTone} 
                                onChange={(e) => setAiConfigForm({...aiConfigForm, brandTone: e.target.value as any})}
                                className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50"
                              >
                                <option value="friendly">Friendly & Hangat (Gunakan Kakak/Mba)</option>
                                <option value="professional">Professional & Sopan (Gunakan Bapak/Ibu)</option>
                                <option value="formal">Formal & Tegas (Klinik / Perusahaan Besar)</option>
                                <option value="casual">Casual & Santai (Kafe / Toko Hobi)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Bahasa Pengantar Utama</label>
                              <input 
                                type="text"
                                value={aiConfigForm.language}
                                onChange={(e) => setAiConfigForm({...aiConfigForm, language: e.target.value})}
                                placeholder="id"
                                className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50 font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Daftar Daya Tarik & Kelebihan Utama Usaha</label>
                              <input 
                                type="text"
                                value={aiConfigForm.strengths}
                                onChange={(e) => setAiConfigForm({...aiConfigForm, strengths: e.target.value})}
                                placeholder="Daging segar dipotong dadu, pelayanan di bawah 10 menit, higienis premium"
                                className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Kontak Resmi Untuk Penyelesaian Masalah</label>
                              <input 
                                type="text"
                                value={aiConfigForm.supportContact}
                                onChange={(e) => setAiConfigForm({...aiConfigForm, supportContact: e.target.value})}
                                placeholder="Telegram CS : @makmur_care atau Call : 021-33230"
                                className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Konteks Tambahan Bisnis / Promosi Berlangsung</label>
                            <textarea 
                              rows={2}
                              value={aiConfigForm.customContext}
                              onChange={(e) => setAiConfigForm({...aiConfigForm, customContext: e.target.value})}
                              placeholder="Sedang ada diskon promo sate 15% setiap hari jumat jam 1 s/d jam 3 siang..."
                              className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Panduan / Larangan Khusus Jawab Review</label>
                            <textarea 
                              rows={2}
                              value={aiConfigForm.replyGuidelines}
                              onChange={(e) => setAiConfigForm({...aiConfigForm, replyGuidelines: e.target.value})}
                              placeholder="Jangan sekali-kali menyebut saingan, selalu tawarkan kompensasi tulus, jangan defensif ataupun emosi..."
                              className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50"
                            />
                          </div>

                          <div className="flex justify-end pt-4 border-t border-neutral-100">
                            <button
                              type="button"
                              onClick={handleSaveAiConfig}
                              className="bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold py-2 px-6 rounded-xl transition-all shadow-md"
                              id="save-ai-ctx-btn"
                            >
                              Tanamkan Konteks AI
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TAB 3: GENERAL BUSINESS INFO (GMAPS STYLE) */}
                      {settingsTab === 'business_info' && basicInfoForm && (
                        <div className="space-y-6" id="settings-info-form">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Nama Usaha / Outlet</label>
                              <input 
                                type="text"
                                value={basicInfoForm.name}
                                onChange={(e) => setBasicInfoForm({...basicInfoForm, name: e.target.value})}
                                className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50 font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Kategori Bisnis</label>
                              <input 
                                type="text"
                                value={basicInfoForm.category}
                                onChange={(e) => setBasicInfoForm({...basicInfoForm, category: e.target.value})}
                                className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Nomor Telepon</label>
                              <input 
                                type="text"
                                value={basicInfoForm.phone}
                                onChange={(e) => setBasicInfoForm({...basicInfoForm, phone: e.target.value})}
                                className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Situs Web</label>
                              <input 
                                type="text"
                                value={basicInfoForm.website}
                                onChange={(e) => setBasicInfoForm({...basicInfoForm, website: e.target.value})}
                                className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Jam Operasional</label>
                              <input 
                                type="text"
                                value={basicInfoForm.openingHours}
                                onChange={(e) => setBasicInfoForm({...basicInfoForm, openingHours: e.target.value})}
                                className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Alamat Outlet Sesuai Koordinat</label>
                            <input 
                              type="text"
                              value={basicInfoForm.address}
                              onChange={(e) => setBasicInfoForm({...basicInfoForm, address: e.target.value})}
                              className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Tautan URL Gambar Profil</label>
                            <input 
                              type="text"
                              value={basicInfoForm.coverImage}
                              onChange={(e) => setBasicInfoForm({...basicInfoForm, coverImage: e.target.value})}
                              className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-700 tracking-wide uppercase mb-1">Deskripsi Ringkasan Usaha</label>
                            <textarea 
                              rows={2}
                              value={basicInfoForm.description}
                              onChange={(e) => setBasicInfoForm({...basicInfoForm, description: e.target.value})}
                              className="block w-full rounded-xl border-neutral-300 p-2.5 text-xs bg-slate-50"
                            />
                          </div>

                          <div className="flex justify-end pt-4 border-t border-neutral-100">
                            <button
                              type="button"
                              onClick={handleSaveBasicInfo}
                              className="bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold py-2 px-6 rounded-xl transition-all shadow-md"
                              id="save-profile-btn"
                            >
                              Semburkan Perubahan
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                </div>
              </div>
            ) : null}

          </div>
        )}

        {/* VIEW 2: LOGS LISTING TABLE */}
        {currentUser?.role === 'owner' && mainView === 'logs' && (
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 text-left animate-fade-in" id="activity-logs-block">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4 mb-6">
              <div>
                <h3 className="font-black text-base text-neutral-900 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>SISTEM LOG AKTIVITAS & AUDIT JEJAK (ACTIVITY LOG)</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">Semua proses ingestion ulasan, analisis sentimen, respon chatbot, dan transmisi alert didata secara aman.</p>
              </div>

              {/* Filtering triggers */}
              <div className="flex flex-wrap items-center gap-2">
                <select 
                  value={filterLogEvent} 
                  onChange={(e) => setFilterLogEvent(e.target.value)}
                  className="rounded-lg border-neutral-300 py-1 px-2.5 text-xs font-bold bg-neutral-50 text-neutral-700 focus:outline-none"
                >
                  <option value="all">Semua Jenis Event</option>
                  <option value="review_received">Review Masuk</option>
                  <option value="sentiment_analyzed">Analisis Sentimen</option>
                  <option value="notification_sent">Notifikasi Dikirim</option>
                  <option value="reply_sent">Balasan Terkirim</option>
                  <option value="config_updated">Ganti Config</option>
                </select>

                <select 
                  value={filterLogStatus} 
                  onChange={(e) => setFilterLogStatus(e.target.value)}
                  className="rounded-lg border-neutral-300 py-1 px-2.5 text-xs font-bold bg-neutral-50 text-neutral-700"
                >
                  <option value="all">Semua Status</option>
                  <option value="success">Sukses (Success)</option>
                  <option value="failed">Gagal (Failed)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="min-w-full divide-y divide-neutral-200 text-xs">
                <thead className="bg-neutral-50/80">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-black text-neutral-500 uppercase tracking-wider">Timestamp</th>
                    <th scope="col" className="px-4 py-3 text-left font-black text-neutral-500 uppercase tracking-wider">Outlet / Tenant</th>
                    <th scope="col" className="px-4 py-3 text-left font-black text-neutral-500 uppercase tracking-wider">Event & Saluran</th>
                    <th scope="col" className="px-4 py-3 text-left font-black text-neutral-500 uppercase tracking-wider">Payload Deskripsi</th>
                    <th scope="col" className="px-4 py-3 text-left font-black text-neutral-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-100">
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                        Belum ada riwayat integrasi terekam untuk tenant terpilih saat ini.
                      </td>
                    </tr>
                  ) : (
                    activities
                      .filter(l => {
                        if (filterLogEvent !== 'all' && l.eventType !== filterLogEvent) return false;
                        if (filterLogStatus !== 'all' && l.status !== filterLogStatus) return false;
                        return true;
                      })
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-neutral-400 font-mono">
                            {new Date(log.createdAt).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-bold text-neutral-900">
                            {log.tenantName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-neutral-700 capitalize">{log.eventType.replace(/_/g, ' ')}</span>
                              {log.channel && (
                                <span className={`text-[9px] font-mono font-bold uppercase ${log.channel === 'discord' ? 'text-indigo-600' : log.channel === 'telegram' ? 'text-sky-600' : 'text-neutral-500'}`}>
                                  [Channel: {log.channel}]
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-neutral-600 font-medium">
                            {log.payload}
                            {log.errorMessage && (
                              <p className="text-rose-600 font-mono text-[10px] bg-rose-50 p-1.5 rounded mt-1 border border-rose-100">
                                EROR: {log.errorMessage}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {log.status === 'success' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Sukses
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                Berkelit
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: PUBLIC / REVIEWER EXTRAS */}
        {mainView === 'reviewer_explore' && (
          <div className="space-y-8 animate-fade-in" id="reviewer-panel-view">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* PUBLIC LEFT SIDEBAR: LIST OF PLACES SIMULATOR */}
              <div className="lg:col-span-5 space-y-4 text-left">
                <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-100">
                    <h3 className="font-black text-sm text-neutral-900">TEMUKAN UNIT USAHA OUTLET</h3>
                    <span className="bg-teal-50 text-teal-700 text-[10px] font-black tracking-wider px-2 py-0.5 rounded border border-teal-100">CARI GMAPS</span>
                  </div>

                  <div className="relative mb-4">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari warung, klinik, lokasi hotel..."
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2 px-10 text-xs focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-3">
                    {publicTenants
                      .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((t) => {
                        const isSelected = reviewerSelectedPublicTenant?.id === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              setReviewerSelectedPublicTenant(t);
                              fetchPublicReviews(t.id);
                            }}
                            className={`p-4 rounded-2xl border cursor-pointer hover:border-neutral-300 hover:shadow-sm transition-all text-left ${isSelected ? 'border-teal-500 bg-teal-50/20 ring-1 ring-teal-500' : 'border-neutral-200 bg-white'}`}
                          >
                            <div className="h-24 w-full rounded-xl overflow-hidden mb-3.5 relative">
                              <img 
                                src={t.coverImage} 
                                alt={t.name}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute top-2 left-2 bg-neutral-900/80 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded backdrop-blur">
                                {t.category}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-black text-xs text-neutral-900 leading-tight">{t.name}</h4>
                              <p className="text-[10px] text-neutral-400 font-medium">{t.address}</p>
                              
                              <div className="flex items-center justify-between pt-2 border-t border-neutral-100/60 mt-2">
                                <div className="flex items-center space-x-1 text-xs">
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                                  <strong className="text-neutral-800 font-bold">{t.avgRating || '0.0'}</strong>
                                  <span className="text-neutral-400">({t.totalReviews} ulasan)</span>
                                </div>
                                <span className="text-[10px] font-bold text-neutral-500">{t.openingHours}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* PUBLIC RIGHT: SELECTED PLACE DETAILS & FORM AND HISTORY */}
              {reviewerSelectedPublicTenant && (
                <div className="lg:col-span-12 xl:col-span-7 space-y-6 text-left">
                  
                  {/* HERO BANNER INFORMATION */}
                  <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="h-48 relative">
                      <img 
                        src={reviewerSelectedPublicTenant.coverImage} 
                        alt={reviewerSelectedPublicTenant.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-end p-6">
                        <div className="text-white space-y-1">
                          <span className="bg-teal-400 text-neutral-950 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest">
                            {reviewerSelectedPublicTenant.category}
                          </span>
                          <h2 className="text-lg font-black tracking-tight">{reviewerSelectedPublicTenant.name}</h2>
                          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">{reviewerSelectedPublicTenant.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold border-b border-neutral-100">
                      <div>
                        <span className="text-neutral-400 block font-normal">Hubungi Telepon:</span>
                        <span className="text-neutral-800 mt-0.5 block">{reviewerSelectedPublicTenant.phone || 'Tidak tersedia'}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block font-normal">Situs Resmi:</span>
                        <span className="text-neutral-800 mt-0.5 block">{reviewerSelectedPublicTenant.website || 'Tidak tersedia'}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block font-normal">Jam Operasional:</span>
                        <span className="text-neutral-800 mt-0.5 block">{reviewerSelectedPublicTenant.openingHours}</span>
                      </div>
                    </div>
                  </div>

                  {/* SUBMISSION CRITICAL FORM (Rating 1 - 5 stars) */}
                  <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
                      <MessageSquare className="w-5 h-5 text-teal-600" />
                      <h3 className="font-extrabold text-sm text-neutral-900 tracking-wide uppercase">TULIS ULASAN PELANGGAN BARU (SIMULASI)</h3>
                    </div>

                    {/* Preseed complaints console for fast testing */}
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-5">
                      <div className="flex items-center space-x-1.5 mb-2 text-xs">
                        <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-extrabold text-neutral-700">Papan Shortcut Skenario Ulasan (Sangat Membantu):</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-relaxed mb-3">
                        Klik salah satu tombol resep masukan ulasan buruk di bawah ini untuk mengisi form instan dan menguji deteksi krisis otomatis pemilik bisnis secara aktual.
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {SAMPLE_COMPLAINTS.map((sample, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => applySampleReviewInput(sample)}
                            className="text-[10px] font-bold px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-700 rounded-lg border border-neutral-300/80 shadow-xs flex items-center space-x-1 transition-colors"
                          >
                            <span className="text-rose-500 font-mono">[{sample.rating}⭐]</span>
                            <span>{sample.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">Nama Lengkap Reviewer*</label>
                          <input 
                            type="text" 
                            required
                            value={reviewerName} 
                            onChange={(e) => setReviewerName(e.target.value)} 
                            placeholder="Ketik nama Anda"
                            className="block w-full rounded-xl border-neutral-300 py-2 px-3 text-xs focus:ring-1 focus:ring-teal-500 bg-neutral-50"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">Rating Bintang (1 - 5 Bintang)*</label>
                          <div className="bg-neutral-50 rounded-xl p-1.5 border border-neutral-200/50 inline-block">
                            {renderInteractiveStars(5, reviewRating, (num) => setReviewRating(num))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">Komentar Ulasan Tertulis*</label>
                        <textarea 
                          rows={4}
                          required
                          value={reviewComment} 
                          onChange={(e) => setReviewComment(e.target.value)} 
                          placeholder="Ketik ulasan pengalaman nyata Anda pada bisnis ini secara mendalam..."
                          className="block w-full rounded-xl border-neutral-300 p-3 text-xs bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 leading-relaxed"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className={`bg-neutral-900 hover:bg-neutral-800 text-teal-400 text-xs font-black py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center space-x-2 ${submittingReview ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Send className="w-4 h-4 text-teal-300" />
                          <span>{submittingReview ? 'Mengolah Sentimen...' : 'Kirim Ulasan & Posisikan Alarm'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* PUBLIC PREVIOUS REVIEWS HISTORY */}
                  <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm">
                    <h3 className="font-extrabold text-sm text-neutral-900 border-b border-neutral-100 pb-3 mb-4">
                      RIWAYAT HISTORIS ULASAN PUBLIK ({reviewHistory.length})
                    </h3>

                    <div className="space-y-4">
                      {reviewHistory.length === 0 ? (
                        <p className="text-xs text-neutral-400 py-4 text-center">Belum ada ulasan untuk bisnis ini. Jadilah yang pertama memberikan review!</p>
                      ) : (
                        reviewHistory.map((rh) => (
                          <div key={rh.id} className="border-b border-neutral-100 pb-4 last:border-b-0 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-xs font-black text-slate-800">{rh.reviewerName}</h4>
                                <div className="flex items-center space-x-1 mt-0.5">
                                  <div className="flex text-amber-400">
                                    {Array.from({ length: rh.rating }).map((_, idx) => (
                                      <Star key={idx} className="w-3" />
                                    ))}
                                  </div>
                                  <span className="text-[10px] text-neutral-400">({rh.rating}/5)</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-neutral-400 font-serif">{new Date(rh.createdAt).toLocaleDateString('id-ID')}</span>
                            </div>

                            <p className="text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded border border-neutral-200/40">
                              "{rh.comment}"
                            </p>

                            {/* Replies if exist */}
                            {rh.repliedAt && (
                              <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-lg md:ml-6 mt-2">
                                <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">
                                  {rh.reply?.isAiGenerated ? '✨ Balasan AI Instan:' : 'Jawaban Resmi Pemilik:'}
                                </span>
                                <p className="text-xs text-neutral-700 italic mt-1 font-medium leading-relaxed">
                                  "{rh.reply?.content || 'Kami mengapresiasi masukan tersebut. Terima kasih atas dukungan masukan konstruktif yang diberikan.'}"
                                </p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-neutral-900 text-white border-t border-neutral-800 py-10 mt-20" id="footer-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-neutral-800 pb-8 mb-8">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-teal-400" />
              <div>
                <h3 className="font-extrabold text-sm tracking-wide text-neutral-100">REPUTATION SHIELD</h3>
                <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-bold">Teknologi Gemini Sentiment & Notifikasi Multi-Kanal</p>
              </div>
            </div>

            <div className="text-xs text-neutral-400 space-y-1 text-center sm:text-right">
              <p>Stres Tes Terkonfigurasi: Gmail, Discord Webhook, Telegram Bot API, WhatsApp API</p>
              <p>Integrasi AI: Google Gemini-3.5-Flash (Analisis & Rekomendasi Jawaban)</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500 gap-4">
            <p className="font-medium">© 2026 Reputation Shield. Semua hak cipta dilindungi undang-undang.</p>
            <p className="font-mono">Local UTC Time: 2026-05-24 03:55Z | Powered by Google AI Studio Sandbox Engine</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
