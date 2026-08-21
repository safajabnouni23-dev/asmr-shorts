"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import OnboardingModal from "@/components/OnboardingModal";
import Toast from "@/components/Toast";
import VideoCard from "@/components/VideoCard";
import {
  generateDeviceId,
  getStoredDeviceId,
  storeDeviceId,
  getStoredGender,
  storeGender,
  addWatchedId,
  getWatchedIds,
} from "@/lib/utils";

interface VideoData {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  viewCount: number;
  source: "youtube" | "dailymotion";
  embedUrl?: string;
}

interface ToastState {
  visible: boolean;
  message: string;
  type: "success" | "error" | "info";
}

export default function Home() {
  // Onboarding state
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [deviceId, setDeviceId] = useState<string>("");
  const [gender, setGender] = useState<string>("");

  // Sound state — starts muted to bypass browser autoplay policy
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundActivatedRef = useRef(false);

  // Video feed state
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [dmPage, setDmPage] = useState(1); // Dailymotion page counter
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fetchError, setFetchError] = useState(false);

  // Interaction state
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });

  // Refs for stable access in callbacks
  const feedRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Load watched IDs from localStorage on mount — persists across sessions
  const watchedRef = useRef<Set<string>>(new Set(getWatchedIds()));
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const nextPageTokenRef = useRef<string | null>(null);
  const dmPageRef = useRef(1);
  const deviceIdRef = useRef("");
  const fetchInProgressRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { dmPageRef.current = dmPage; }, [dmPage]);
  useEffect(() => { nextPageTokenRef.current = nextPageToken; }, [nextPageToken]);
  useEffect(() => { deviceIdRef.current = deviceId; }, [deviceId]);

  // Show toast helper
  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ visible: true, message, type });
    },
    []
  );

  // === Sound activation on first user interaction ===
  const activateSound = useCallback(() => {
    if (soundActivatedRef.current) return;
    soundActivatedRef.current = true;
    setSoundEnabled(true);
  }, []);

  // Check onboarding status on mount
  useEffect(() => {
    const init = async () => {
      let did = getStoredDeviceId();
      const storedGender = getStoredGender();

      if (!did) {
        did = generateDeviceId();
        storeDeviceId(did);
      }

      setDeviceId(did);

      if (!storedGender) {
        // First time ever — show onboarding
        setNeedsOnboarding(true);
        return;
      }

      // Returning user — use stored gender IMMEDIATELY, no server check needed
      setGender(storedGender);
      setNeedsOnboarding(false);

      // Sync with server in background (non-blocking, never affects UX)
      fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: did, gender: storedGender }),
      }).catch(() => {
        // Silently ignore — user already has access
      });
    };

    init();
  }, []);

  // Handle onboarding selection
  const handleOnboarding = useCallback(
    (selectedGender: "male" | "female") => {
      // Save to localStorage IMMEDIATELY — this is the source of truth
      storeGender(selectedGender);
      storeDeviceId(deviceId || generateDeviceId());
      setGender(selectedGender);
      setNeedsOnboarding(false);

      // Sync with server in background (non-blocking)
      if (deviceId) {
        fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, gender: selectedGender }),
        }).catch(() => {
          // Server sync failed — doesn't matter, localStorage has the data
        });
      }
    },
    [deviceId]
  );

  // === Fetch videos — stable function using refs ===
  const fetchVideos = useCallback(async (pageToken?: string) => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) return;
    if (!deviceIdRef.current) return;
    if (!hasMoreRef.current && !pageToken) return;

    fetchInProgressRef.current = true;
    setLoading(true);

    try {
      // Send recent watched IDs to exclude (limit to last 200 to avoid URL length issues)
      const allWatched = Array.from(watchedRef.current);
      const recentWatched = allWatched.slice(-200);
      const params = new URLSearchParams({
        deviceId: deviceIdRef.current,
        excludeIds: recentWatched.join(","),
        dmPage: String(dmPageRef.current),
      });
      const token = pageToken || nextPageTokenRef.current;
      if (token) params.set("pageToken", token);

      const res = await fetch(`/api/videos?${params.toString()}`);
      const data = await res.json();

      if (data.videos && data.videos.length > 0) {
        setFetchError(false);
        setVideos((prev) => {
          const existingIds = new Set(prev.map((v) => v.videoId));
          const newVideos = data.videos.filter(
            (v: VideoData) => !existingIds.has(v.videoId)
          );
          return [...prev, ...newVideos];
        });
        setNextPageToken(data.nextPageToken);
        if (data.dmPage) setDmPage(data.dmPage);
        // Keep hasMore true as long as either source has more
        if (!data.nextPageToken && !data.dmPage) {
          setHasMore(false);
          hasMoreRef.current = false;
        }
      } else {
        setHasMore(false);
        hasMoreRef.current = false;
      }
    } catch (err) {
      console.error("Failed to fetch videos:", err);
      setFetchError(true);
      showToast("خطأ في تحميل الفيديوهات", "error");
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [showToast]);

  // Initial fetch after onboarding
  useEffect(() => {
    if (needsOnboarding === false && deviceId && videos.length === 0 && !loading) {
      fetchVideos();
    }
  }, [needsOnboarding, deviceId, videos.length, fetchVideos, loading]);

  // Fetch liked videos
  useEffect(() => {
    if (!deviceId) return;
    fetch(`/api/like?deviceId=${deviceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.likedVideoIds) {
          setLikedIds(new Set(data.likedVideoIds));
        }
      })
      .catch(() => {});
  }, [deviceId]);

  // Sync watched to server in background (once, on mount) — non-blocking
  useEffect(() => {
    if (!deviceId) return;
    const localWatched = getWatchedIds();
    if (localWatched.length > 0) {
      fetch("/api/watched", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, videoIds: localWatched.slice(-50) }),
      }).catch(() => {});
    }
  }, [deviceId]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !fetchInProgressRef.current) {
          fetchVideos();
        }
      },
      { root: feedRef.current, rootMargin: "200px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchVideos, videos.length]);

  // IntersectionObserver for active video tracking
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    const videoElements = feed.querySelectorAll("[data-video-index]");
    if (videoElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(
              entry.target.getAttribute("data-video-index") || "0",
              10
            );
            setActiveIndex(index);
          }
        });
      },
      { root: feed, threshold: 0.6 }
    );

    videoElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [videos]);

  // Like handler
  const handleLike = useCallback(
    async (videoId: string) => {
      if (!deviceId) return;
      setLikedIds((prev) => new Set([...prev, videoId]));

      const video = videos.find((v) => v.videoId === videoId);
      try {
        await fetch("/api/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId,
            videoId,
            videoTitle: video?.title || "",
            action: "like",
          }),
        });
      } catch {
        // Silently fail
      }
    },
    [deviceId, videos]
  );

  // Unlike handler
  const handleUnlike = useCallback(
    async (videoId: string) => {
      if (!deviceId) return;
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });

      try {
        await fetch("/api/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId,
            videoId,
            action: "unlike",
          }),
        });
      } catch {
        // Silently fail
      }
    },
    [deviceId]
  );

  // Ad click handler
  const handleAdClick = useCallback(() => {
    const adLink =
      process.env.NEXT_PUBLIC_AD_LINK || "https://omg10.com/4/11606979";
    window.open(adLink, "_blank");
    showToast("تم الفتح بنجاح! 🎉", "success");
  }, [showToast]);

  // Watched handler
  const handleWatched = useCallback((videoId: string) => {
    if (!watchedRef.current.has(videoId)) {
      watchedRef.current.add(videoId);
      addWatchedId(videoId);
    }
  }, []);

  // === Navigation handlers ===
  const handleNavigateUp = useCallback(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const currentIdx = activeIndex;
    if (currentIdx > 0) {
      const targetEl = feed.querySelector(`[data-video-index="${currentIdx - 1}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [activeIndex]);

  const handleNavigateDown = useCallback(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const currentIdx = activeIndex;
    if (currentIdx < videos.length - 1) {
      const targetEl = feed.querySelector(`[data-video-index="${currentIdx + 1}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [activeIndex, videos.length]);

  // Loading screen
  if (needsOnboarding === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-white/60 text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Onboarding modal
  if (needsOnboarding) {
    return (
      <>
        <div className="flex h-screen w-full items-center justify-center bg-black">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
        <OnboardingModal onSelect={handleOnboarding} />
      </>
    );
  }

  // Main feed
  return (
    <div className="relative h-screen w-full bg-black">
      {/* Toast */}
      <Toast
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, visible: false }))}
      />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎧</span>
          <span className="text-white font-bold text-lg">ASMR Shorts</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Sound status indicator */}
          <div
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-500 ${
              soundEnabled
                ? "bg-green-500/20 text-green-300"
                : "bg-white/10 text-white/40"
            }`}
          >
            <span>{soundEnabled ? "🔊" : "🔇"}</span>
            <span>{soundEnabled ? "صوت مفعّل" : "صامت"}</span>
          </div>
          <span className="text-white/50 text-xs">
            {gender === "male" ? "👨" : "👩"}
          </span>
          <span className="text-white/50 text-xs">{videos.length} فيديو</span>
        </div>
      </div>

      {/* Video Feed */}
      {videos.length === 0 && !loading && fetchError ? (
        /* Error screen with retry button */
        <div className="flex h-screen w-full items-center justify-center">
          <div className="flex flex-col items-center gap-4 mx-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <span className="text-3xl">⚠️</span>
            </div>
            <p className="text-white/80 text-sm text-center">
              فشل تحميل الفيديوهات
              <br />
              <span className="text-white/50 text-xs">تأكد من اتصال الإنترنت</span>
            </p>
            <button
              onClick={() => {
                setFetchError(false);
                setLoading(true);
                fetchVideos();
              }}
              className="mt-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 text-sm font-bold text-white shadow-lg active:scale-95 transition-transform"
            >
              إعادة المحاولة 🔄
            </button>
          </div>
        </div>
      ) : videos.length === 0 && !loading ? (
        /* Initial loading */
        <div className="flex h-screen w-full items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
            <p className="text-white/60 text-sm">
              جاري تحميل مقاطع ASMR...
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={feedRef}
          className="h-screen w-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
          style={{ scrollSnapType: "y mandatory" }}
        >
          {videos.map((video, index) => (
            <div key={video.videoId} data-video-index={index}>
              <VideoCard
                videoId={video.videoId}
                title={video.title}
                channelTitle={video.channelTitle}
                viewCount={video.viewCount}
                isLiked={likedIds.has(video.videoId)}
                soundUnlocked={soundEnabled}
                source={video.source || "youtube"}
                embedUrl={video.embedUrl}
                onLike={handleLike}
                onUnlike={handleUnlike}
                onAdClick={handleAdClick}
                onWatched={handleWatched}
                isActive={index === activeIndex}
                onUnlockSound={activateSound}
                onNavigateUp={handleNavigateUp}
                onNavigateDown={handleNavigateDown}
                isFirst={index === 0}
                isLast={index === videos.length - 1}
              />
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex h-32 w-full items-center justify-center bg-black">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-purple-500 border-t-transparent" />
                <p className="text-white/50 text-xs">تحميل المزيد...</p>
              </div>
            </div>
          )}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-1 w-full" />

          {/* End of feed */}
          {!hasMore && videos.length > 0 && (
            <div className="flex h-32 w-full items-center justify-center bg-black">
              <p className="text-white/40 text-sm">
                انتهت المقاطع 🎧 اسحب للتحديث
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
