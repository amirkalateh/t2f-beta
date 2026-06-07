// Tex2Film - Cinematic Frames Library
// Professional sample frames for showcasing AI video generation capabilities

export interface CinematicFrame {
  id: string;
  src: string;
  alt: string;
  category: 'character' | 'landscape' | 'urban' | 'mood' | 'action';
  aspectRatio: '16:9' | '1:1' | '9:16';
  mood: string;
}

export const cinematicFrames: CinematicFrame[] = [
  {
    id: 'water-ripples',
    src: '/frames/fx-studio-image-1767703131840_1767713197599.png',
    alt: 'Water ripples with forest reflections',
    category: 'landscape',
    aspectRatio: '16:9',
    mood: 'contemplative',
  },
  {
    id: 'boots-grass',
    src: '/frames/fx-studio-image-1767703136062_1767713197613.png',
    alt: 'Vintage boots in tall grass',
    category: 'mood',
    aspectRatio: '16:9',
    mood: 'nostalgic',
  },
  {
    id: 'person-wheat-field',
    src: '/frames/fx-studio-image-1767703137002_1767713197613.png',
    alt: 'Person contemplating in wheat field',
    category: 'character',
    aspectRatio: '1:1',
    mood: 'introspective',
  },
  {
    id: 'man-field-profile',
    src: '/frames/fx-studio-image-1767703138590_1767713197613.png',
    alt: 'Man profile in tall grass',
    category: 'character',
    aspectRatio: '16:9',
    mood: 'dramatic',
  },
  {
    id: 'person-horizon',
    src: '/frames/fx-studio-image-1767703139544_1767713197613.png',
    alt: 'Person walking through grassland against sky',
    category: 'landscape',
    aspectRatio: '16:9',
    mood: 'epic',
  },
  {
    id: 'man-tv-dark',
    src: '/frames/fx-studio-image-1767711496298_1767713197614.png',
    alt: 'Man watching TV in dark room',
    category: 'mood',
    aspectRatio: '16:9',
    mood: 'noir',
  },
  {
    id: 'car-rain-bokeh',
    src: '/frames/fx-art-1767281807623_1767713197614.png',
    alt: 'Man in car with rain and city lights bokeh',
    category: 'urban',
    aspectRatio: '16:9',
    mood: 'cinematic',
  },
  {
    id: 'woman-purple-light',
    src: '/frames/fx-art-1767281800380_1767713197614.png',
    alt: 'Woman with purple neon lighting',
    category: 'character',
    aspectRatio: '16:9',
    mood: 'cyberpunk',
  },
  {
    id: 'cyberpunk-city',
    src: '/frames/fx-art-1767282647876_1767713197614.png',
    alt: 'Cyberpunk city street with neon signs',
    category: 'urban',
    aspectRatio: '16:9',
    mood: 'cyberpunk',
  },
  {
    id: 'dark-alley-neon',
    src: '/frames/fx-art-1767282676220_1767713197615.png',
    alt: 'Person in dark alley with red and teal lighting',
    category: 'urban',
    aspectRatio: '1:1',
    mood: 'noir',
  },
  {
    id: 'rain-portrait',
    src: '/frames/fx-art-1767282683866_1767713197615.png',
    alt: 'Person in rain with purple and blue lighting',
    category: 'character',
    aspectRatio: '1:1',
    mood: 'emotional',
  },
];

export const cinematicVideos = [
  {
    id: 'cyberpunk-scene',
    src: '/frames/fx-art-1767282673082_1767713197614.mp4',
    poster: '/frames/fx-art-1767282647876_1767713197614.png',
    alt: 'Cyberpunk city scene video',
    duration: '5s',
  },
];

// Get frames by category
export function getFramesByCategory(category: CinematicFrame['category']): CinematicFrame[] {
  return cinematicFrames.filter(f => f.category === category);
}

// Get frames by mood
export function getFramesByMood(mood: string): CinematicFrame[] {
  return cinematicFrames.filter(f => f.mood === mood);
}

// Get featured frames for hero sections
export function getFeaturedFrames(count: number = 3): CinematicFrame[] {
  const featured = ['car-rain-bokeh', 'cyberpunk-city', 'rain-portrait'];
  return cinematicFrames.filter(f => featured.includes(f.id)).slice(0, count);
}

// Get random frames for variety
export function getRandomFrames(count: number = 3): CinematicFrame[] {
  const shuffled = [...cinematicFrames].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
