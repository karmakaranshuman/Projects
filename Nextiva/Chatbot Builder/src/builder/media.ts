import houseDusk from '../assets/media/house-dusk.jpg';
import houseGarage from '../assets/media/house-garage.jpg';
import houseModern from '../assets/media/house-modern.jpg';
import kitchen from '../assets/media/kitchen.jpg';
import type { MediaItem } from './types';
import { uid } from './uid';

export const MEDIA_ACCEPT = 'image/*,video/*';

/** The gallery from the Figma example: 11 items, three of them videos. */
export function sampleGallery(): MediaItem[] {
  const image = (src: string, name: string): MediaItem => ({ id: uid('media'), kind: 'image', src, name });
  const video = (): MediaItem => ({ id: uid('media'), kind: 'video', src: houseDusk, name: 'House tour.mp4', duration: '2:40' });
  return [
    image(kitchen, 'Kitchen.jpg'),
    video(),
    image(houseModern, 'Front view.jpg'),
    image(houseGarage, 'Garage.jpg'),
    video(),
    image(houseModern, 'Entrance.jpg'),
    image(houseGarage, 'Driveway.jpg'),
    image(kitchen, 'Island.jpg'),
    image(houseModern, 'Evening.jpg'),
    video(),
    image(kitchen, 'Dining.jpg'),
  ];
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Grabs a poster frame and the length of a local video file. */
function readVideo(url: string): Promise<{ poster: string; duration: string }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const done = (poster = '') => resolve({ poster, duration: formatDuration(video.duration) });
    video.muted = true;
    video.preload = 'auto';
    video.src = url;
    video.onerror = () => done();
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, video.duration / 2 || 0);
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      done(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
}

/** Turns picked or dropped files into gallery items; anything that is not an image or video is skipped. */
export async function filesToMedia(files: Iterable<File>): Promise<MediaItem[]> {
  const items: MediaItem[] = [];
  for (const file of files) {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('image/')) {
      items.push({ id: uid('media'), kind: 'image', src: url, name: file.name });
    } else if (file.type.startsWith('video/')) {
      const { poster, duration } = await readVideo(url);
      items.push({ id: uid('media'), kind: 'video', src: poster, videoSrc: url, name: file.name, duration });
    } else {
      URL.revokeObjectURL(url);
    }
  }
  return items;
}
