// Аудио-плеер для Quiz Made by GappSheRVIP777
import { Howl } from 'howler';

let bgMusic = null;
let currentVolume = 0.05;

export function playUfoSound(soundPath) {
  try {
    const snd = new Howl({ src: [soundPath], volume: 0.8, format: ['mp3', 'wav'] });
    snd.play();
    return snd;
  } catch (e) {
    return null;
  }
}

export function startBackgroundMusic(musicPath, volume = 0.05) {
  stopBackgroundMusic();
  currentVolume = volume;
  try {
    bgMusic = new Howl({
      src: [musicPath],
      volume: currentVolume,
      loop: true,
      format: ['mp3', 'wav'],
    });
    bgMusic.play();
  } catch (e) {
    // ignore
  }
}

export function setMusicVolume(volume) {
  currentVolume = Math.max(0, Math.min(1, volume));
  if (bgMusic) bgMusic.volume(currentVolume);
}

export function getMusicVolume() {
  return currentVolume;
}

export function stopBackgroundMusic() {
  if (bgMusic) {
    bgMusic.stop();
    bgMusic.unload();
    bgMusic = null;
  }
}
