"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { formatViews } from "@/lib/utils";
import {
  toggleASMREnhancer,
  isASMREnhancerActive,
} from "@/lib/asmr-enhancer";

// Load YouTube IFrame API once
let ytApiReady = false;
let ytApiLoading = false;
const ytApiCallbacks: Array<() => void> = [];

function loadYouTubeAPI(callback: () => void) {
  if (ytApiReady) {
    callback();
    return;
  }
  ytApiCallbacks.push(callback);
  if (ytApiLoading) return;
  ytApiLoading = true;

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);

  (window as any).onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    ytApiCallbacks.forEach((cb) => cb());
    ytApiCallbacks.length = 0;
  };
}

interface VideoCardProps {
  videoId: string;
  title: string;
  channelTitle: string;
  viewCount: number;
  isLiked: boolean;
  soundUnlocked: boolean;
  source: "youtube" | "tiktok";
  embedUrl?: string;
  onLike: (videoId: string) => void;
  onUnlike: (videoId: string) => void;
  onAdClick: () => void;
  onWatched: (videoId: string) => void;
  isActive: boolean;
  onUnlockSound: () => void;
  onNavigateUp: () => void;
  onNavigateDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function VideoCard({
  videoId,
  title,
  channelTitle,
  viewCount,
  isLiked,
  soundUnlocked,
  source,
  embedUrl,
  onLike,
  onUnlike,
  onAdClick,
  onWatched,
  isActive,
  onUnlockSound,
  onNavigateUp,
  onNavigateDown,
  isFirst,
  isLast,
}: VideoCardProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeId = `player-${source}-${videoId}`;
  const [showInfo, setShowInfo] = useState(true);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [enhancerActive, setEnhancerActive] = useState(false);
  const [tiktokLoaded, setTiktokLoaded] = useState(false);
  const lastTapRef = useRef(0);
  const initializedRef = useRef(false);

  // Track watched when active
  useEffect(() => {
    if (isActive) {
      onWatched(videoId);
    }
  }, [isActive, videoId, onWatched]);

  // Sync enhancer state
  useEffect(() => {
    setEnhancerActive(isASMREnhancerActive());
  }, [isActive]);

  // === YouTube Player Initialization ===
  useEffect(() => {
    if (source !== "youtube") return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    loadYouTubeAPI(() => {
      if (!document.getElementById(iframeId)) return;

      try {
        const player = new (window as any).YT.Player(iframeId, {
          videoId,
          playerVars: {
            autoplay: isActive ? 1 : 0,
            mute: 1,
            loop: 1,
            playlist: videoId,
            playsinline: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            fs: 0,
            disablekb: 1,
            iv_load_policy: 3,
          },
          events: {
            onReady: () => {
              setPlayerReady(true);
              if (soundUnlocked && isActive) {
                player.unMute();
                player.setVolume(100);
                player.playVideo();
              }
            },
            onStateChange: (event: any) => {
              if (event.data === (window as any).YT.PlayerState.ENDED) {
                player.playVideo();
              }
            },
          },
        });

        playerRef.current = player;
      } catch (err) {
        console.error("YT Player init error:", err);
      }
    });

    return () => {
      try {
        if (playerRef.current?.destroy) {
          playerRef.current.destroy();
        }
      } catch {}
    };
  }, [videoId, iframeId, source]);

  // === TikTok Player — reset when video or active state changes ===
  useEffect(() => {
    if (source !== "tiktok") return;
    if (isActive) {
      // Becoming active — reset loading state so iframe re-renders fresh
      setTiktokLoaded(false);
    }
    initializedRef.current = false;
  }, [videoId, source, isActive]);

  // Play/pause based on active state (YouTube only)
  useEffect(() => {
    if (source !== "youtube" || !playerRef.current || !playerReady) return;
    try {
      if (isActive) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {}
  }, [isActive, playerReady, source]);

  // Handle sound unlock (YouTube only)
  useEffect(() => {
    if (source !== "youtube" || !playerRef.current || !playerReady || !soundUnlocked) return;
    try {
      playerRef.current.unMute();
      playerRef.current.setVolume(100);
      if (isActive) {
        playerRef.current.playVideo();
      }
    } catch {}
  }, [soundUnlocked, playerReady, isActive, source]);

  // Handle click to unlock sound
  const handleContainerClick = useCallback(() => {
    if (!soundUnlocked) {
      onUnlockSound();
      if (source === "youtube" && playerRef.current && playerReady) {
        try {
          playerRef.current.unMute();
          playerRef.current.setVolume(100);
          playerRef.current.playVideo();
        } catch {}
      }
    }
  }, [soundUnlocked, onUnlockSound, playerReady, source]);

  // ASMR Enhancer toggle
  const handleToggleEnhancer = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const nowActive = toggleASMREnhancer(() => {
        if (source === "youtube" && playerRef.current && playerReady) {
          try { playerRef.current.setVolume(100); } catch {}
        }
      });
      setEnhancerActive(nowActive);
    },
    [playerReady, source]
  );

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isLiked) { onLike(videoId); }
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 800);
    }
    lastTapRef.current = now;
  }, [isLiked, onLike, videoId]);

  const handleLikeToggle = () => {
    if (isLiked) { onUnlike(videoId); } else { onLike(videoId); }
  };

  const handleShare = () => {
    const url = source === "tiktok"
      ? `https://www.tiktok.com/@video/${videoId}`
      : `https://youtube.com/shorts/${videoId}`;
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
    }
  };

  return (
    <div className="relative h-screen w-full snap-start flex-shrink-0 bg-black overflow-hidden">
      {/* === GOLDEN ORNAMENTAL FRAME === */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-[6px] bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700 shadow-lg" />
        <div className="absolute bottom-0 left-0 right-0 h-[6px] bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700 shadow-lg" />
        <div className="absolute top-0 bottom-0 left-0 w-[6px] bg-gradient-to-b from-amber-700 via-yellow-400 to-amber-700 shadow-lg" />
        <div className="absolute top-0 bottom-0 right-0 w-[6px] bg-gradient-to-b from-amber-700 via-yellow-400 to-amber-700 shadow-lg" />

        {/* Corner ornaments */}
        <div className="absolute top-0 left-0 w-10 h-10">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-amber-400 rounded-tl-lg" />
          <div className="absolute top-1 left-1 w-5 h-5 border-t-[2px] border-l-[2px] border-yellow-300/60 rounded-tl-md" />
          <span className="absolute top-0.5 left-1 text-[10px] text-amber-300/80">✦</span>
        </div>
        <div className="absolute top-0 right-0 w-10 h-10">
          <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-amber-400 rounded-tr-lg" />
          <div className="absolute top-1 right-1 w-5 h-5 border-t-[2px] border-r-[2px] border-yellow-300/60 rounded-tr-md" />
          <span className="absolute top-0.5 right-1 text-[10px] text-amber-300/80">✦</span>
        </div>
        <div className="absolute bottom-0 left-0 w-10 h-10">
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-amber-400 rounded-bl-lg" />
          <div className="absolute bottom-1 left-1 w-5 h-5 border-b-[2px] border-l-[2px] border-yellow-300/60 rounded-bl-md" />
          <span className="absolute bottom-0.5 left-1 text-[10px] text-amber-300/80">✦</span>
        </div>
        <div className="absolute bottom-0 right-0 w-10 h-10">
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-amber-400 rounded-br-lg" />
          <div className="absolute bottom-1 right-1 w-5 h-5 border-b-[2px] border-r-[2px] border-yellow-300/60 rounded-br-md" />
          <span className="absolute bottom-0.5 right-1 text-[10px] text-amber-300/80">✦</span>
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 left-[3px] text-amber-400/50 text-xs">❧</div>
        <div className="absolute top-1/2 -translate-y-1/2 right-[3px] text-amber-400/50 text-xs">❧</div>
      </div>

      {/* Inner subtle gold glow */}
      <div className="absolute inset-[6px] z-20 pointer-events-none border border-amber-500/10 shadow-[inset_0_0_30px_rgba(251,191,36,0.05)]" />

      {/* ASMR Enhancer glow */}
      {enhancerActive && isActive && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute inset-0 border-[3px] border-purple-500/30 animate-pulse" />
        </div>
      )}

      {/* === PLAYER: YouTube or TikTok === */}
      <div
        ref={containerRef}
        className="absolute inset-[6px] flex items-center justify-center cursor-pointer"
        onClick={(e) => {
          handleContainerClick();
          handleDoubleTap();
        }}
      >
        {source === "youtube" ? (
          /* YouTube Player */
          <div id={iframeId} className="h-full w-full" />
        ) : isActive ? (
          /* TikTok Player — ONLY rendered when active (fixes audio leak) */
          <div className="h-full w-full relative overflow-hidden bg-black">
            {/* 
              AGGRESSIVE CROP: Scale iframe up 115% and center it.
              This crops out ALL TikTok UI elements:
              - Header bar (top ~55px)
              - Username & description (bottom ~100px)  
              - Like/share/comment buttons (right ~50px)
              - Watermark overlay
              Only the pure video content remains visible.
            */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "115%",
                height: "115%",
                transform: "translate(-50%, -50%)",
                overflow: "hidden",
              }}
            >
              <iframe
                key={videoId}
                id={iframeId}
                src={`${embedUrl || `https://www.tiktok.com/embed/v2/${videoId}`}?autoplay=1&mute=0&sound=1&related=0&repeat=1`}
                style={{
                  border: "none",
                  borderRadius: "0",
                  width: "100%",
                  height: "100%",
                  pointerEvents: "auto",
                }}
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture;"
                allowFullScreen
                title={title}
                onLoad={() => setTiktokLoaded(true)}
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Thick black edge masks — guarantee no TikTok UI leaks */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-black z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-black z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 bottom-0 w-2 bg-black z-10 pointer-events-none" />
            <div className="absolute top-0 left-0 bottom-0 w-2 bg-black z-10 pointer-events-none" />

            {/* Loading overlay */}
            {!tiktokLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-3 border-pink-500 border-t-transparent" />
                  <span className="text-white/50 text-xs">TikTok</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Inactive TikTok — render BLACK SCREEN only (no iframe = no audio leak) */
          <div className="h-full w-full bg-black" />
        )}
      </div>

      {/* Sound unlock overlay */}
      {!soundUnlocked && isActive && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-[1px] cursor-pointer"
          onClick={handleContainerClick}
        >
          <div className="flex flex-col items-center gap-4 animate-bounce">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/15 backdrop-blur-md border-2 border-white/30 shadow-2xl">
              <span className="text-5xl">🔇</span>
            </div>
            <div className="text-center px-6">
              <p className="text-white text-lg font-bold drop-shadow-lg">اضغط لتشغيل الصوت</p>
              <p className="text-white/60 text-sm mt-1">Tap to enable sound 🔊</p>
            </div>
          </div>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-20" />
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20" />

      {/* Double-tap heart */}
      {doubleTapHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <span className="text-7xl animate-ping text-red-500 drop-shadow-lg">❤️</span>
        </div>
      )}

      {/* === NAVIGATION ARROWS === */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onNavigateUp(); }}
          disabled={isFirst}
          className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 ${
            isFirst ? "bg-white/5 text-white/20 cursor-not-allowed"
              : "bg-white/10 text-white/80 hover:bg-amber-500/30 hover:text-amber-200 active:scale-90 shadow-lg border border-white/10"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4L4 10M10 4L16 10M10 4V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onNavigateDown(); }}
          disabled={isLast}
          className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 ${
            isLast ? "bg-white/5 text-white/20 cursor-not-allowed"
              : "bg-white/10 text-white/80 hover:bg-amber-500/30 hover:text-amber-200 active:scale-90 shadow-lg border border-white/10"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 16L4 10M10 16L16 10M10 16V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Source badge */}
      <div className="absolute top-16 left-4 z-20">
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
          source === "tiktok"
            ? "bg-pink-500/30 text-pink-200 border border-pink-400/30"
            : "bg-red-500/30 text-red-200 border border-red-400/30"
        }`}>
          <span>{source === "tiktok" ? "🎵" : "▶️"}</span>
          <span>{source === "tiktok" ? "TikTok" : "YouTube"}</span>
        </div>
      </div>

      {/* Video info overlay */}
      <div className={`absolute bottom-20 left-4 right-20 z-20 transition-opacity duration-300 ${showInfo ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
            {channelTitle.charAt(0).toUpperCase()}
          </div>
          <span className="text-white font-semibold text-sm truncate max-w-[200px]">{channelTitle}</span>
          {enhancerActive && (
            <div className="flex items-center gap-1 rounded-full bg-purple-500/30 border border-purple-400/40 px-2 py-0.5">
              <span className="text-[10px]">✨</span>
              <span className="text-[10px] text-purple-200 font-bold">ASMR Boost</span>
            </div>
          )}
        </div>
        <p className="text-white/90 text-sm leading-relaxed line-clamp-2 max-w-[280px]">{title}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-white/50 text-xs">{formatViews(viewCount)} مشاهدة</span>
          <span className="text-white/30 text-xs">•</span>
          <span className="text-white/50 text-xs">#ASMR</span>
        </div>
      </div>

      {/* Right action buttons */}
      <div className="absolute bottom-28 right-3 z-20 flex flex-col items-center gap-5">
        {/* Like */}
        <button onClick={(e) => { e.stopPropagation(); handleLikeToggle(); }} className="flex flex-col items-center gap-1 transition-transform active:scale-125">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md transition-all ${isLiked ? "bg-red-500/30 shadow-lg shadow-red-500/30" : "bg-white/10"}`}>
            <span className={`text-xl ${isLiked ? "drop-shadow-lg" : ""}`}>{isLiked ? "❤️" : "🤍"}</span>
          </div>
          <span className="text-[10px] text-white/70 font-medium">إعجاب</span>
        </button>

        {/* ASMR Enhancer */}
        <button onClick={handleToggleEnhancer} className="flex flex-col items-center gap-1 transition-transform active:scale-125">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md transition-all duration-500 ${
            enhancerActive ? "bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/50 animate-pulse-glow" : "bg-white/10 hover:bg-purple-500/20"
          }`}>
            <span className={`text-xl transition-transform ${enhancerActive ? "animate-bounce" : ""}`}>✨</span>
          </div>
          <span className={`text-[10px] font-bold transition-colors ${enhancerActive ? "text-purple-300" : "text-white/70"}`}>
            {enhancerActive ? "مفعّل ✨" : "تحسين الصوت"}
          </span>
        </button>

        {/* Ad */}
        <button onClick={(e) => { e.stopPropagation(); onAdClick(); }} className="flex flex-col items-center gap-1 transition-transform active:scale-125">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/40">
            <span className="text-xl">🔒</span>
          </div>
          <span className="text-[10px] text-orange-300 font-bold">افتح</span>
        </button>

        {/* Share */}
        <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="flex flex-col items-center gap-1 transition-transform active:scale-125">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            <span className="text-xl">↗️</span>
          </div>
          <span className="text-[10px] text-white/70 font-medium">مشاركة</span>
        </button>

        {/* Toggle info */}
        <button onClick={(e) => { e.stopPropagation(); setShowInfo((p) => !p); }} className="flex flex-col items-center gap-1 transition-transform active:scale-125">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            <span className="text-sm">{showInfo ? "👁" : "👁‍🗨"}</span>
          </div>
        </button>
      </div>

      {/* Spinning music disc */}
      <div className="absolute bottom-8 right-4 z-20">
        <div className={`h-10 w-10 rounded-full border-2 border-white/30 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg ${isActive ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }}>
          <div className="h-4 w-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
        </div>
      </div>
    </div>
  );
}
