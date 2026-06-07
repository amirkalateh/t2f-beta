export interface PresetEntry {
  id: string;
  label: string;
  labelEn: string;
  image: string;
  promptTag: string;
}

export const FILM_STYLE_PRESETS: PresetEntry[] = [
  { id: "pop_art", label: "پاپ آرت", labelEn: "Pop Art", image: "/Preset/Style Film/Pop Art.jpg", promptTag: "pop art style, bold colors, graphic design, Andy Warhol inspired" },
  { id: "origami", label: "اوریگامی", labelEn: "Origami", image: "/Preset/Style Film/Origami.jpg", promptTag: "origami paper art style, folded paper aesthetic, delicate paper craft" },
  { id: "claymation", label: "کلیمیشن", labelEn: "Claymation", image: "/Preset/Style Film/Claymation.jpg", promptTag: "claymation style, stop-motion clay animation, handmade tactile look" },
  { id: "low_poly", label: "لوپلی", labelEn: "Low Poly", image: "/Preset/Style Film/Low poly .jpg", promptTag: "low poly 3D style, geometric faceted surfaces, minimal polygon art" },
  { id: "black_and_white", label: "سیاه و سفید", labelEn: "Black and White", image: "/Preset/Style Film/Black and White.jpg", promptTag: "black and white, monochrome, classic film noir tonality" },
  { id: "pixar_render", label: "پیکسار رندر", labelEn: "Pixar Render", image: "/Preset/Style Film/Pixar Render.jpg", promptTag: "Pixar 3D animation style, CGI render, vibrant cartoon realism" },
  { id: "lego", label: "لگو", labelEn: "LEGO", image: "/Preset/Style Film/LEGO.png", promptTag: "LEGO minifigure world, plastic brick construction aesthetic, studded LEGO surfaces, minifigure proportions, bright saturated primary colors, toy-scale environment built from LEGO bricks" },
  { id: "anime", label: "انیمه ژاپنی", labelEn: "Anime (Japanese)", image: "/Preset/Style Film/Anime.png", promptTag: "anime style, Japanese animation aesthetic, cel-shaded lighting, expressive large eyes, dynamic dramatic composition, vibrant saturated colors, Studio Ghibli inspired visual richness, clean linework with painterly backgrounds" },
  { id: "real", label: "واقعی", labelEn: "Real", image: "/Preset/Style Film/Real .jpg", promptTag: "photorealistic, real photography, cinematic realism" },
];

export const TEXTURE_PRESETS: PresetEntry[] = [
  { id: "clean_digital", label: "دیجیتال تمیز", labelEn: "Clean Digital Texture", image: "/Preset/Texture_Film/Clean Digital Texture.jpg", promptTag: "clean digital texture, sharp and pristine, modern digital cinema" },
  { id: "subtle_film_grain", label: "گرین نرم فیلم", labelEn: "Subtle Film Grain", image: "/Preset/Texture_Film/Subtle Film Grain.jpg", promptTag: "subtle film grain, fine 35mm grain texture, gentle analog feel" },
  { id: "heavy_film_grain", label: "گرین سنگین فیلم", labelEn: "Heavy Film Grain", image: "/Preset/Texture_Film/Heavy Film Grain.jpg", promptTag: "heavy film grain, coarse 16mm grain, gritty raw texture" },
  { id: "vintage_analog", label: "وینتیج / آنالوگ", labelEn: "Vintage / Analog Texture", image: "/Preset/Texture_Film/Vintage : Analog Texture.jpg", promptTag: "vintage analog texture, retro film stock, faded colors, light leaks" },
  { id: "soft_cinematic", label: "سینمایی نرم", labelEn: "Soft Cinematic Texture", image: "/Preset/Texture_Film/Soft Cinematic Texture.jpg", promptTag: "soft cinematic texture, gentle diffusion, smooth filmic quality" },
  { id: "dreamy_diffused", label: "رویایی / پخش", labelEn: "Dreamy / Diffused Texture", image: "/Preset/Texture_Film/Dreamy : Diffused Texture.jpg", promptTag: "dreamy diffused texture, ethereal soft glow, halation effect" },
];

export const LIGHTING_PRESETS_VISUAL: PresetEntry[] = [
  { id: "naturalistic", label: "طبیعی", labelEn: "Naturalistic Lighting", image: "/Preset/Lighting philosofy/Naturalistic Lighting.jpg", promptTag: "naturalistic lighting, natural ambient light sources, realistic illumination" },
  { id: "high_key", label: "روشن", labelEn: "High-Key Lighting", image: "/Preset/Lighting philosofy/High-Key Lighting.jpg", promptTag: "high-key lighting, bright and even, minimal shadows, upbeat mood" },
  { id: "low_key", label: "تاریک", labelEn: "Low-Key Lighting", image: "/Preset/Lighting philosofy/Low-Key Lighting.jpg", promptTag: "low-key lighting, dramatic shadows, moody dark atmosphere" },
  { id: "motivated", label: "انگیزشی", labelEn: "Motivated Lighting", image: "/Preset/Lighting philosofy/Motivated Lighting.jpg", promptTag: "motivated lighting, light motivated by visible sources in the scene" },
  { id: "chiaroscuro", label: "کیاروسکورو", labelEn: "Chiaroscuro Lighting", image: "/Preset/Lighting philosofy/Chiaroscuro Lighting.jpg", promptTag: "chiaroscuro lighting, dramatic contrast between light and shadow, Caravaggio inspired" },
  { id: "soft", label: "نرم", labelEn: "Soft Lighting", image: "/Preset/Lighting philosofy/Soft Lighting.jpg", promptTag: "soft lighting, diffused gentle illumination, flattering and warm" },
  { id: "hard", label: "سخت", labelEn: "Hard Lighting", image: "/Preset/Lighting philosofy/Hard Lighting.jpg", promptTag: "hard lighting, sharp defined shadows, high contrast, punchy" },
  { id: "expressionistic", label: "اکسپرسیونیستی", labelEn: "Expressionistic Lighting", image: "/Preset/Lighting philosofy/Expressionistic Lighting.jpg", promptTag: "expressionistic lighting, stylized dramatic shadows, emotional and theatrical" },
  { id: "rim_backlighting", label: "ریم / بک‌لایت", labelEn: "Rim / Backlighting", image: "/Preset/Lighting philosofy/Rim : Backlighting.jpg", promptTag: "rim lighting and backlighting, glowing edges, silhouette separation" },
];

export const REFERENCE_FILM_PRESETS: PresetEntry[] = [
  { id: "ref_01", label: "مکس دیوانه", labelEn: "Mad Max: Fury Road", image: "/Preset/Refrence film/01.jpg", promptTag: "visual style of Mad Max Fury Road, desert wasteland, high-octane action cinematography" },
  { id: "ref_02", label: "گرند بوداپست", labelEn: "The Grand Budapest Hotel", image: "/Preset/Refrence film/02.jpg", promptTag: "visual style of The Grand Budapest Hotel, Wes Anderson symmetry, pastel color palette" },
  { id: "ref_03", label: "ماتریکس", labelEn: "The Matrix", image: "/Preset/Refrence film/03.jpg", promptTag: "visual style of The Matrix, green-tinted cyberpunk, dark leather and neon" },
  { id: "ref_04", label: "بلید رانر ۲۰۴۹", labelEn: "Blade Runner 2049", image: "/Preset/Refrence film/04.jpg", promptTag: "visual style of Blade Runner 2049, Roger Deakins cinematography, hazy amber and cold blue" },
  { id: "ref_05", label: "جوکر", labelEn: "Joker", image: "/Preset/Refrence film/05.jpg", promptTag: "visual style of Joker, gritty urban realism, desaturated moody tones, character-driven" },
];
