import { AudioConfig } from "../../core/config/AudioConfig.js";

export class AudioManager {
  constructor() {
    this.bgmAudio = new Audio();
    this.bgmAudio.loop = false;
    this.bgmAudio.volume = AudioConfig.DEFAULT_VOLUME;
    
    this.playlist = AudioConfig.BGM_PLAYLIST;
    this.playableIndices = [...AudioConfig.PLAYABLE_INDICES];
    this.shuffledQueue = [];
    
    this.isPlaying = false;
    this.isMuted = true;
    this.isFirstTrackPlayed = false;
    
    this.onTrackChanged = null;

    this.bgmAudio.addEventListener("ended", () => {
      if (this.isPlaying) {
        if (!this.isFirstTrackPlayed) this.isFirstTrackPlayed = true;
        this.playNextShuffle();
      }
    });

    this.bgmAudio.addEventListener("error", (e) => {
      console.warn("BGM Error:", e);
      if (this.isPlaying) setTimeout(() => this.playNextShuffle(), 1000);
    });
  }

  playNextShuffle() {
    if (this.playableIndices.length === 0) return;

    if (this.shuffledQueue.length === 0) {
      const arr = [...this.playableIndices];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      this.shuffledQueue = arr;
    }

    const nextIndex = this.shuffledQueue.shift();
    this.playTrack(nextIndex);
  }

  playTrack(index) {
    const track = this.playlist[index];
    const url = track.blobUrl || track.url;
    
    this.bgmAudio.src = url;
    
    const playPromise = this.bgmAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (this.isMuted) {
             this.bgmAudio.pause();
             this.isPlaying = false;
          } else {
             this.isPlaying = true;
             if (this.onTrackChanged) this.onTrackChanged(track.title);
          }
        })
        .catch((error) => {
          console.warn("Auto-play prevented:", error);
          this.isPlaying = false;
        });
    }
  }

  startLoopBGM() {
    if (this.isPlaying) return;
    let trackToLoadIndex = !this.isFirstTrackPlayed
      ? 0
      : this.shuffledQueue[0] || 0;
    this.playTrack(trackToLoadIndex);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;

    if (!this.isMuted) {
      this.bgmAudio.volume = AudioConfig.DEFAULT_VOLUME;
      if (this.bgmAudio.paused) {
        if (!this.bgmAudio.src) {
          this.startLoopBGM();
        } else {
          this.bgmAudio.play().catch((e) => console.warn("Resume failed:", e));
        }
      }
      this.isPlaying = true;
    } else {
      this.bgmAudio.pause();
      this.isPlaying = false;
    }
    return !this.isMuted;
  }
}