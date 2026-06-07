import type { Shot, Asset, SceneDefaults, DirectorBrief, SceneVisualIdentity } from "@/lib/types";
import {
  CAMERA_MODELS, LENS_TYPES, FOCAL_LENGTHS,
  CINEMATOGRAPHY_PRESETS,
} from "@/lib/constants";
import {
  FILM_STYLE_PRESETS, TEXTURE_PRESETS, LIGHTING_PRESETS_VISUAL, REFERENCE_FILM_PRESETS,
} from "@/lib/preset-data";

const SHOT_TYPE_PROMPTS: Record<string, string> = {
  extreme_close_up: "extreme close-up, intimate detail filling the frame, shallow depth of field isolating texture and emotion",
  close_up: "close-up, tight framing on subject's face and expression, background softly blurred, emotional intensity",
  medium_close_up: "medium close-up, head and shoulders framing, subject dominates the frame, subtle background context",
  medium: "medium shot, waist-up framing, subject in clear context with environment, balanced composition",
  medium_wide: "medium wide shot, subject with visible surroundings, spatial relationships established, narrative depth",
  wide: "wide shot, full body within environment, character and world in dialogue, deliberate mise-en-scène",
  extreme_wide: "extreme wide shot, vast landscape dwarfing any figures, epic scale and isolation, environmental storytelling",
  establishing: "establishing shot, full location revealed, spatial geography established, audience oriented in the world",
  insert: "insert shot, precise detail isolated, object or action given narrative weight, tactile texture",
  cutaway: "cutaway, reaction or contextual detail, emotional punctuation, bridging visual gap between shots",
  two_shot: "two-shot, both subjects framed in balanced composition, spatial and emotional relationship visible",
  over_shoulder: "over-the-shoulder, subjective spatial anchoring, viewer placed behind one character looking at another",
};

const CAMERA_ANGLE_PROMPTS: Record<string, string> = {
  eye_level: "shot at eye level",
  high_angle: "high angle shot, looking down",
  low_angle: "low angle shot, looking up, heroic perspective",
  birds_eye: "bird's eye view, overhead aerial shot",
  worms_eye: "worm's eye view, extreme low angle from ground level",
  dutch: "dutch angle, tilted frame for tension and unease",
  pov: "POV shot, first-person perspective",
  over_shoulder: "over-the-shoulder angle",
};

const CAMERA_MOVEMENT_PROMPTS: Record<string, string> = {
  static: "locked off static camera, absolutely no motion, perfect stable frame",
  pan: "smooth horizontal camera pan across the scene, sweeping lateral motion",
  tilt: "vertical camera tilt, upward or downward revealing motion",
  dolly_in: "slow dramatic dolly-in moving toward the subject, growing intimacy",
  dolly_out: "slow dolly-out retreating from the subject, revealing wider context",
  truck: "lateral tracking shot following parallel to subject movement",
  crane: "dramatic crane movement rising or descending with vertical sweep",
  handheld: "subtle handheld camera micro-movement, organic documentary feel",
  steadicam: "smooth steadicam glide, floating fluid camera movement",
  whip_pan: "fast whip pan with motion blur streaks, energetic snap",
  zoom: "slow zoom in, focal length compression change",
  push_in: "slow steady push in toward subject, contemplative approach",
  pull_out: "slow steady pull back from subject, widening perspective",
  arc: "camera arcing in smooth orbit around the subject, 360 reveal",
};

const SHOT_FOCUS_PROMPTS: Record<string, string> = {
  deep_focus: "deep focus, everything sharp from foreground to background",
  shallow_focus: "shallow depth of field, bokeh background, subject isolated",
  soft_focus: "soft focus, dreamy ethereal quality, romantic atmosphere",
  tilt_shift_v: "tilt-shift vertical, miniature effect",
  tilt_shift_h: "tilt-shift horizontal, selective focus band",
};

const CAMERA_MECHANISM_PROMPTS: Record<string, string> = {
  tripod: "mounted on tripod, stable and precise",
  handheld: "handheld camera, organic natural movement",
  gimbal: "gimbal stabilized, smooth fluid motion",
  steadicam: "steadicam, floating gliding movement",
  crane: "crane mounted, sweeping elevated movement",
  drone: "aerial drone shot, elevated perspective",
};

const LIGHTING_PROMPTS: Record<string, string> = {
  key_light: "key light illumination, primary light source",
  fill_light: "soft fill light, reduced shadows",
  backlight: "backlight, rim lighting from behind the subject",
  high_key: "high-key lighting, bright and even, minimal shadows",
  low_key: "low-key lighting, dramatic shadows, moody atmosphere",
  natural: "natural ambient lighting",
  golden_hour: "golden hour sunlight, warm amber tones, long shadows",
  blue_hour: "blue hour lighting, cool twilight ambiance",
  neon: "neon lighting, vibrant colored light sources, urban glow",
  silhouette: "silhouette lighting, subject backlit against bright background",
  chiaroscuro: "chiaroscuro lighting, dramatic contrast between light and dark",
  soft_diffused: "soft diffused lighting, gentle shadows, flattering illumination",
  hard_dramatic: "hard dramatic lighting, sharp shadows, high contrast",
};

function getCameraModelText(modelId: string): string {
  const model = CAMERA_MODELS.find(m => m.id === modelId);
  if (!model || model.id === "custom") return "";
  return `shot on ${model.labelEn}`;
}

function getLensText(lensId: string): string {
  const lens = LENS_TYPES.find(l => l.id === lensId);
  if (!lens || lens.id === "custom") return "";
  return `${lens.labelEn} lens`;
}

function getFocalLengthText(flId: string): string {
  const fl = FOCAL_LENGTHS.find(f => f.id === flId);
  if (!fl || fl.id === "custom") return "";
  return `${fl.labelEn} focal length`;
}

function getAspectRatioForKling(cinemaAspectRatio?: string | null, projectAspectRatio?: string | null): string {
  const ratio = cinemaAspectRatio || projectAspectRatio || "16:9";

  const klingMap: Record<string, string> = {
    "16:9": "16:9",
    "9:16": "9:16",
    "1:1": "1:1",
    "4:3": "4:3",
    "3:4": "3:4",
    "4:5": "3:4",
    "2.39:1": "16:9",
    "2.35:1": "16:9",
    "1.85:1": "16:9",
    "1.66:1": "16:9",
  };

  return klingMap[ratio] || "16:9";
}

export function mergeSceneDefaults(shot: Shot, sceneDefaults?: Record<string, SceneDefaults> | null): Shot {
  if (!sceneDefaults || !shot.sceneNumber) return shot;
  const sceneKey = String(shot.sceneNumber);
  const defaults = sceneDefaults[sceneKey];
  if (!defaults) return shot;

  return {
    ...shot,
    locationId: shot.locationId ?? defaults.locationId ?? null,
    keyLight: shot.keyLight ?? defaults.keyLight ?? null,
    colorGrade: shot.colorGrade ?? defaults.colorGrade ?? null,
    cameraModel: shot.cameraModel ?? defaults.cameraModel ?? null,
    lensType: shot.lensType ?? defaults.lensType ?? null,
    focalLength: shot.focalLength ?? defaults.focalLength ?? null,
    cameraMovement: shot.cameraMovement ?? defaults.cameraMovement ?? null,
    cameraAngle: shot.cameraAngle ?? defaults.cameraAngle ?? null,
    cinemaAspectRatio: shot.cinemaAspectRatio ?? defaults.cinemaAspectRatio ?? null,
    shotFocus: shot.shotFocus ?? defaults.shotFocus ?? null,
    cameraMechanism: shot.cameraMechanism ?? defaults.cameraMechanism ?? null,
  };
}

export interface PromptContext {
  elements?: Asset[];
  sceneDefaults?: Record<string, SceneDefaults> | null;
  useOmniElementSyntax?: boolean;
  allShots?: Shot[];
  enableContinuity?: boolean;
  directorBrief?: DirectorBrief | null;
  sceneVisualIdentity?: SceneVisualIdentity | null;
}

function buildElementDescriptions(shot: Shot, elements?: Asset[], useOmniSyntax?: boolean): string {
  if (!elements || elements.length === 0) return "";

  const parts: string[] = [];

  if (useOmniSyntax) {
    const registeredElements = elements.filter(e => e.klingElementId);
    if (registeredElements.length > 0) {
      const charIds = (shot.characterIds || []) as number[];
      const propIdsArr = (shot.propIds || []) as number[];
      const allRelevantIds = [...charIds, shot.locationId, ...propIdsArr].filter(Boolean) as number[];

      let objectIndex = 1;
      for (const el of registeredElements) {
        if (allRelevantIds.includes(el.id)) {
          parts.push(`<<<object_${objectIndex}>>>`);
          const elDetails: string[] = [];
          if (el.description) elDetails.push(el.description);
          if (el.type === "character") {
            const elMeta = (el.metadata as Record<string, string> | null) || {};
            if (elMeta.sex || el.sex) elDetails.push(elMeta.sex || el.sex || "");
            if (elMeta.age || el.age) elDetails.push(`age ${elMeta.age || el.age}`);
            if (el.metadata) {
              const meta = el.metadata as Record<string, string>;
              if (meta.hair) elDetails.push(`${meta.hair} hair`);
              if (meta.clothing) elDetails.push(`wearing ${meta.clothing}`);
              if (meta.distinguishing) elDetails.push(meta.distinguishing);
            }
            // Inject active outfit description for consistency
            const outfitDesc = getActiveOutfitDescription(el);
            if (outfitDesc) elDetails.push(`wearing ${outfitDesc}`);
          }
          if (elDetails.length > 0) {
            parts.push(`(${elDetails.join(", ")})`);
          }
          objectIndex++;
        }
      }
    }
  }

  if (shot.locationId) {
    const loc = elements.find(e => e.id === shot.locationId && e.type === "location");
    if (loc) {
      if (!useOmniSyntax || !loc.klingElementId) {
        parts.push(`Setting: ${loc.name}${loc.description ? ` - ${loc.description}` : ""}`);
      }
    }
  }

  const charIds = (shot.characterIds || []) as number[];
  if (charIds.length > 0) {
    const chars = charIds
      .map(cid => elements.find(e => e.id === cid && e.type === "character"))
      .filter(Boolean) as Asset[];
    
    const unregisteredChars = useOmniSyntax
      ? chars.filter(c => !c.klingElementId)
      : chars;

    if (unregisteredChars.length > 0) {
      const charDescs = unregisteredChars.map(c => {
        const details: string[] = [c.name];
        const cMeta = (c.metadata as Record<string, string> | null) || {};
        if (cMeta.sex || c.sex) details.push(cMeta.sex || c.sex || "");
        if (cMeta.age || c.age) details.push(`age ${cMeta.age || c.age}`);
        if (c.description) details.push(c.description);
        if (c.metadata) {
          const meta = c.metadata as Record<string, string>;
          if (meta.hair) details.push(`${meta.hair} hair`);
          if (meta.build) details.push(`${meta.build} build`);
          if (meta.clothing) details.push(`wearing ${meta.clothing}`);
          if (meta.ethnicity) details.push(meta.ethnicity);
          if (meta.distinguishing) details.push(meta.distinguishing);
        }
        const outfitDesc = getActiveOutfitDescription(c);
        if (outfitDesc) details.push(`wearing ${outfitDesc}`);
        return details.join(", ");
      });
      parts.push(`Characters: ${charDescs.join("; ")}`);
    }
  }

  const propIdsArr = (shot.propIds || []) as number[];
  if (propIdsArr.length > 0) {
    const props = propIdsArr
      .map(pid => elements.find(e => e.id === pid && e.type === "property"))
      .filter(Boolean) as Asset[];
    
    const unregisteredProps = useOmniSyntax
      ? props.filter(p => !p.klingElementId)
      : props;

    if (unregisteredProps.length > 0) {
      const propDescs = unregisteredProps.map(p => p.description ? `${p.name} (${p.description})` : p.name);
      parts.push(`Props: ${propDescs.join(", ")}`);
    }
  }

  return parts.join(". ");
}

function getPriorShotsInScene(currentShot: Shot, allShots: Shot[]): Shot[] {
  const priorShots = currentShot.sceneNumber
    ? allShots.filter(s => s.sceneNumber === currentShot.sceneNumber && s.order < currentShot.order)
    : allShots.filter(s => !s.sceneNumber && s.order < currentShot.order);
  return priorShots.sort((a, b) => a.order - b.order);
}

function buildCompactSceneLock(currentShot: Shot, allShots: Shot[], elements?: Asset[]): string {
  const priorShots = getPriorShotsInScene(currentShot, allShots);
  if (priorShots.length === 0) return "";

  const firstShot = priorShots[0];
  const anchors: string[] = [];

  if (firstShot.keyLight) {
    const lp = LIGHTING_PROMPTS[firstShot.keyLight];
    if (lp) anchors.push(lp.split(",")[0].trim());
  }

  const lockedColorGrade = firstShot.colorGrade || currentShot.colorGrade;
  if (lockedColorGrade) anchors.push(lockedColorGrade);

  if (firstShot.locationId && elements) {
    const loc = elements.find(e => e.id === firstShot.locationId);
    if (loc) anchors.push(loc.name);
  }

  const currentCharIds = (currentShot.characterIds || []) as number[];
  if (currentCharIds.length > 0 && elements) {
    const chars = currentCharIds.map(id => elements.find(e => e.id === id)).filter(Boolean) as Asset[];
    for (const c of chars) {
      if (!c.metadata) continue;
      const meta = c.metadata as Record<string, string>;
      const raccord: string[] = [];
      if (meta.clothing) raccord.push(meta.clothing);
      const outfitDesc = getActiveOutfitDescription(c);
      if (outfitDesc) raccord.push(outfitDesc);
      if (meta.hair) raccord.push(`${meta.hair} hair`);
      if (raccord.length > 0) anchors.push(`${c.name}: ${raccord.join(", ")}`);
    }
  }

  if (anchors.length === 0) return "";
  return `[SCENE-LOCK: ${anchors.join(" | ")}]`;
}

function findPresetPromptTag(id: string | null | undefined, presets: { id: string; promptTag: string }[]): string | null {
  if (!id) return null;
  return presets.find(p => p.id === id)?.promptTag || null;
}

function buildDirectorBriefPrompt(brief: DirectorBrief): string {
  const parts: string[] = [];
  
  parts.push("FILM VISUAL DNA (apply to this frame):");

  const styleTag = findPresetPromptTag(brief.filmStyle, FILM_STYLE_PRESETS);
  if (styleTag) parts.push(`film style: ${styleTag}`);

  const textureTag = findPresetPromptTag(brief.filmTexture, TEXTURE_PRESETS);
  if (textureTag) parts.push(`film texture: ${textureTag}`);
  else if (brief.filmTexture) parts.push(`film texture: ${brief.filmTexture}`);

  if (brief.colorScience) parts.push(`color science: ${brief.colorScience}`);

  const lightingTag = findPresetPromptTag(brief.lightingPhilosophy, LIGHTING_PRESETS_VISUAL);
  if (lightingTag) parts.push(`lighting philosophy: ${lightingTag}`);
  else if (brief.lightingPhilosophy) parts.push(`lighting philosophy: ${brief.lightingPhilosophy}`);

  if (brief.visualStyle) parts.push(`visual style: ${brief.visualStyle}`);
  if (brief.era) parts.push(`era/setting: ${brief.era}`);

  const refTag = findPresetPromptTag(brief.referenceFilms, REFERENCE_FILM_PRESETS);
  if (refTag) parts.push(`visual reference: ${refTag}`);
  else if (brief.referenceFilms) parts.push(`visual reference: in the style of ${brief.referenceFilms}`);

  if (brief.overallMood) parts.push(`mood: ${brief.overallMood}`);
  
  if (brief.cameraBody) {
    const camText = getCameraModelText(brief.cameraBody);
    if (camText) parts.push(camText);
  }
  if (brief.lensFamily) {
    const lensText = getLensText(brief.lensFamily);
    if (lensText) parts.push(lensText);
  }
  if (brief.baseAspectRatio) parts.push(`${brief.baseAspectRatio} aspect ratio`);
  
  return parts.join(", ");
}

export function mergeShotWithPrevious(shot: Shot, allShots: Shot[], sceneDefaults?: Record<string, SceneDefaults> | null): Shot {
  let effectiveShot = sceneDefaults ? mergeSceneDefaults(shot, sceneDefaults) : { ...shot };

  // Sort shots by their order field; use array index as fallback for stale data
  const sortedShots = [...allShots].sort((a, b) => (a.order ?? a.id ?? 0) - (b.order ?? b.id ?? 0));
  const shotIndex = sortedShots.findIndex(s => s.id === shot.id);
  if (shotIndex <= 0) return effectiveShot;

  const priorShots = shot.sceneNumber
    ? sortedShots
        .filter(s => s.sceneNumber === shot.sceneNumber)
        .filter(s => (s.order ?? 0) < (shot.order ?? 0))
    : sortedShots
        .filter(s => (s.order ?? 0) < (shot.order ?? 0));

  // If no prior shots by order, fall back to array index
  let prev: Shot | null = null;
  if (priorShots.length > 0) {
    prev = priorShots.sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0];
  } else {
    // Find the shot immediately before this one in the sorted array
    const scenePrev = sortedShots
      .slice(0, shotIndex)
      .reverse()
      .find(s => (shot.sceneNumber ? s.sceneNumber === shot.sceneNumber : true));
    if (scenePrev) prev = scenePrev;
  }

  if (!prev) return effectiveShot;

  effectiveShot = {
    ...effectiveShot,
    locationId: effectiveShot.locationId ?? prev.locationId ?? null,
    keyLight: effectiveShot.keyLight ?? prev.keyLight ?? null,
    colorGrade: effectiveShot.colorGrade ?? prev.colorGrade ?? null,
    cameraModel: effectiveShot.cameraModel ?? prev.cameraModel ?? null,
    lensType: effectiveShot.lensType ?? prev.lensType ?? null,
    focalLength: effectiveShot.focalLength ?? prev.focalLength ?? null,
    cinemaAspectRatio: effectiveShot.cinemaAspectRatio ?? prev.cinemaAspectRatio ?? null,
    cameraMechanism: effectiveShot.cameraMechanism ?? prev.cameraMechanism ?? null,
  };

  return effectiveShot;
}

export function getPreviousShotImages(currentShot: Shot, allShots: Shot[], maxImages: number = 3): string[] {
  // Sort by order, fallback to id for stale data
  const sortedShots = [...allShots].sort((a, b) => (a.order ?? a.id ?? 0) - (b.order ?? b.id ?? 0));
  const shotIndex = sortedShots.findIndex(s => s.id === currentShot.id);
  if (shotIndex <= 0) return [];

  const priorShots = currentShot.sceneNumber
    ? sortedShots.filter(s =>
        s.sceneNumber === currentShot.sceneNumber &&
        (s.order ?? 0) < (currentShot.order ?? 0) &&
        s.generatedImageUrl
      )
    : sortedShots.filter(s =>
        (s.order ?? 0) < (currentShot.order ?? 0) &&
        s.generatedImageUrl
      );

  // If no prior shots by order, fall back to array index
  const images: string[] = [];
  if (priorShots.length > 0) {
    priorShots
      .sort((a, b) => (b.order ?? 0) - (a.order ?? 0))
      .slice(0, maxImages)
      .forEach(s => { if (s.generatedImageUrl) images.push(s.generatedImageUrl); });
  } else {
    // Walk backward from shotIndex, find the nearest shots with images
    for (let i = shotIndex - 1; i >= 0 && images.length < maxImages; i--) {
      const s = sortedShots[i];
      if (s.generatedImageUrl && (currentShot.sceneNumber ? s.sceneNumber === currentShot.sceneNumber : true)) {
        images.push(s.generatedImageUrl);
      }
    }
  }

  return images;
}

export function buildCinematographyPrompt(shot: Shot, context?: PromptContext): string {
  const enableContinuity = context?.enableContinuity !== false;
  const brief = context?.directorBrief;

  const effectiveShot = (enableContinuity && context?.allShots)
    ? mergeShotWithPrevious(shot, context.allShots, context.sceneDefaults)
    : context?.sceneDefaults
      ? mergeSceneDefaults(shot, context.sceneDefaults)
      : shot;

  const parts: string[] = [];

  // 1. SCENE-LOCK prefix — compact visual anchors placed FIRST so image AI weights them highest
  if (enableContinuity && context?.allShots) {
    const sceneLock = buildCompactSceneLock(effectiveShot, context.allShots, context.elements);
    if (sceneLock) parts.push(sceneLock);
  }

  // 2. Scene visual identity — per-scene mood, color, lighting, atmosphere
  const svi = context?.sceneVisualIdentity;
  if (svi) {
    const sviParts: string[] = [];
    if (svi.timeOfDay) sviParts.push(`${svi.timeOfDay} atmosphere`);
    if (svi.colorTemperature) sviParts.push(`${svi.colorTemperature} color temperature`);
    if (svi.mood) sviParts.push(`mood: ${svi.mood}`);
    if (svi.lightingStyle) sviParts.push(`${svi.lightingStyle} lighting`);
    if (svi.dominantColor) sviParts.push(`${svi.dominantColor} dominant color palette`);
    if (svi.atmosphereDescription) sviParts.push(svi.atmosphereDescription);
    if (sviParts.length > 0) {
      parts.push(`[SCENE MOOD: ${sviParts.join(" | ")}]`);
    }
  }

  // 3. Director brief (film-wide visual DNA)
  if (brief && Object.values(brief).some(v => v)) {
    parts.push(buildDirectorBriefPrompt(brief));
  }

  // 4. Shot description
  if (effectiveShot.prompt) {
    parts.push(effectiveShot.prompt);
  } else if (effectiveShot.description) {
    parts.push(effectiveShot.description);
  }

  // 5. Elements (characters, location, props)
  const elementDesc = buildElementDescriptions(
    effectiveShot,
    context?.elements,
    context?.useOmniElementSyntax,
  );
  if (elementDesc) parts.push(elementDesc);

  // 6. Shot framing
  if (effectiveShot.shotType) {
    const shotPrompt = SHOT_TYPE_PROMPTS[effectiveShot.shotType];
    if (shotPrompt) parts.push(shotPrompt);
  }

  // 7. Camera angle
  if (effectiveShot.cameraAngle) {
    const anglePrompt = CAMERA_ANGLE_PROMPTS[effectiveShot.cameraAngle];
    if (anglePrompt) parts.push(anglePrompt);
  }

  // 8. Camera movement — motion is the KEY signal for video AI
  if (effectiveShot.cameraMovement) {
    const movementPrompt = CAMERA_MOVEMENT_PROMPTS[effectiveShot.cameraMovement];
    if (movementPrompt) {
      parts.push(movementPrompt);
      // Add motion emphasis for video generation — tell the AI this MUST animate
      if (effectiveShot.cameraMovement !== "static") {
        parts.push("the entire frame must show visible camera motion throughout the full duration");
      } else {
        parts.push("static locked-off frame, no camera motion whatsoever");
      }
    }
  }

  // 9. Focus style
  if (effectiveShot.shotFocus && effectiveShot.shotFocus !== "deep_focus") {
    const focusPrompt = SHOT_FOCUS_PROMPTS[effectiveShot.shotFocus];
    if (focusPrompt) parts.push(focusPrompt);
  }

  // 10. Camera mechanism
  if (effectiveShot.cameraMechanism) {
    const mechPrompt = CAMERA_MECHANISM_PROMPTS[effectiveShot.cameraMechanism];
    if (mechPrompt) parts.push(mechPrompt);
  }

  // 11. Camera body + lens (shot-level overrides not already in brief)
  const cineParts: string[] = [];
  const shotCamera = effectiveShot.cameraModel;
  const shotLens = effectiveShot.lensType;
  if (shotCamera && shotCamera !== brief?.cameraBody) {
    const camText = getCameraModelText(shotCamera);
    if (camText) cineParts.push(camText);
  }
  if (shotLens && shotLens !== brief?.lensFamily) {
    const lensText = getLensText(shotLens);
    if (lensText) cineParts.push(lensText);
  }
  if (effectiveShot.focalLength) {
    const flText = getFocalLengthText(effectiveShot.focalLength);
    if (flText) cineParts.push(flText);
  }
  if (cineParts.length > 0) parts.push(cineParts.join(", "));

  // 12. Lighting — expressed concisely, consistent with scene-lock
  if (effectiveShot.keyLight) {
    const lightPrompt = LIGHTING_PROMPTS[effectiveShot.keyLight];
    if (lightPrompt) parts.push(lightPrompt);
  }

  // 13. Color grade — explicit, placed before quality suffix
  if (effectiveShot.colorGrade) {
    parts.push(effectiveShot.colorGrade);
  }

  // 14. Quality suffix
  const textureTag = brief?.filmTexture
    ? findPresetPromptTag(brief.filmTexture, TEXTURE_PRESETS) || brief.filmTexture
    : null;
  if (textureTag) {
    parts.push(`${textureTag}, professional cinematography, 8K, photorealistic`);
  } else {
    parts.push("cinematic film still, professional cinematography, 8K, photorealistic");
  }

  return parts.join(". ").replace(/\.\./g, ".").trim();
}

export function buildNegativePrompt(brief?: DirectorBrief | null): string {
  const base = "blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, logo, signature, painting, drawing, sketch, artificial looking";
  const style = brief?.filmStyle;
  // When LEGO or anime is chosen, do NOT ban cartoon/anime/CGI/3D render — those are DESIRED traits
  if (style === "lego" || style === "anime" || style === "pixar_render" || style === "claymation" || style === "low_poly" || style === "animation") {
    return base;
  }
  return base + ", cartoon, anime, illustration, CGI, 3D render";
}

export function getKlingAspectRatio(shot: Shot, projectAspectRatio?: string | null): string {
  return getAspectRatioForKling(shot.cinemaAspectRatio, projectAspectRatio);
}

export function getElementReferenceImages(shot: Shot, elements?: Asset[]): string[] {
  if (!elements || elements.length === 0) return [];

  const urls: string[] = [];

  const charIds = (shot.characterIds || []) as number[];
  for (const cid of charIds) {
    const char = elements.find(e => e.id === cid && e.type === "character");
    if (!char) continue;

    // For close-up shots, prefer face angle images first for the clearest reference
    const isCloseUp = shot.shotType && (shot.shotType.includes("close") || shot.shotType === "insert" || shot.shotType === "extreme_close_up");
    if (isCloseUp && char.angleImages) {
      const faceAngles = [char.angleImages.face, char.angleImages.front, char.angleImages.left, char.angleImages.right, char.angleImages.perspective];
      for (const url of faceAngles) {
        if (url && !urls.includes(url)) urls.push(url);
      }
    }

    if (char.imageUrl && !urls.includes(char.imageUrl)) urls.push(char.imageUrl);

    if (char.angleImages) {
      for (const url of Object.values(char.angleImages)) {
        if (url && !urls.includes(url)) urls.push(url);
      }
    }
  }

  if (shot.locationId) {
    const loc = elements.find(e => e.id === shot.locationId && e.type === "location");
    if (loc?.imageUrl) urls.push(loc.imageUrl);
  }

  const propIdsArr = (shot.propIds || []) as number[];
  for (const pid of propIdsArr) {
    const prop = elements.find(e => e.id === pid && e.type === "property");
    if (prop?.imageUrl) urls.push(prop.imageUrl);
  }

  return urls;
}

export function getElementIdsForShot(shot: Shot, elements?: Asset[]): string[] {
  if (!elements || elements.length === 0) return [];

  const elementIds: string[] = [];
  const charIds = (shot.characterIds || []) as number[];
  const propIdsArr = (shot.propIds || []) as number[];
  const allRelevantIds = [...charIds, shot.locationId, ...propIdsArr].filter(Boolean) as number[];

  for (const el of elements) {
    if (el.klingElementId && allRelevantIds.includes(el.id)) {
      elementIds.push(el.klingElementId);
    }
  }

  return elementIds;
}

export function getSubjectImagesForShot(shot: Shot, elements?: Asset[]): string[] {
  if (!elements || elements.length === 0) return [];

  const urls: string[] = [];
  const charIds = (shot.characterIds || []) as number[];

  for (const cid of charIds) {
    const char = elements.find(e => e.id === cid && e.type === "character");
    if (!char) continue;

    const metadata = (char.metadata as Record<string, unknown>) || {};
    const outfits = (metadata.outfits as Record<string, unknown>[] | null) || [];
    const activeOutfitId = (metadata.activeOutfitId as string | null) || null;
    const activeOutfit = activeOutfitId ? outfits.find(o => o.id === activeOutfitId) : null;

    // For close-up shots, prefer face angle images FIRST so Kling gets the clearest facial reference
    const isCloseUp = shot.shotType && (shot.shotType.includes("close") || shot.shotType === "insert" || shot.shotType === "extreme_close_up");
    if (isCloseUp && char.angleImages) {
      const faceAngles = [char.angleImages.face, char.angleImages.front, char.angleImages.left, char.angleImages.right, char.angleImages.perspective];
      for (const url of faceAngles) {
        if (url && !urls.includes(url)) urls.push(url);
      }
    }

    // If character has an active outfit, use the outfit image as primary reference
    // This ensures the character appears in the correct clothing across shots
    if (activeOutfit?.imageUrl) {
      const outfitUrl = activeOutfit.imageUrl as string;
      if (!urls.includes(outfitUrl)) urls.push(outfitUrl);
    }

    // Then add the main imageUrl (usually a full body / context shot)
    if (char.imageUrl && !urls.includes(char.imageUrl)) {
      urls.push(char.imageUrl);
    }

    // Then add remaining angle images
    if (char.angleImages) {
      for (const url of Object.values(char.angleImages)) {
        if (url && !urls.includes(url)) urls.push(url);
      }
    }
  }

  return urls.slice(0, 8);
}

export function getActiveOutfitDescription(char: Asset): string | null {
  const metadata = (char.metadata as Record<string, unknown>) || {};
  const outfits = (metadata.outfits as Record<string, unknown>[] | null) || [];
  const activeOutfitId = (metadata.activeOutfitId as string | null) || null;
  const activeOutfit = activeOutfitId ? outfits.find(o => o.id === activeOutfitId) : null;
  if (activeOutfit?.description) {
    return activeOutfit.description as string;
  }
  return null;
}

export function getSceneImageForShot(shot: Shot, elements?: Asset[]): string | undefined {
  if (!elements || !shot.locationId) return undefined;
  const loc = elements.find(e => e.id === shot.locationId && e.type === "location");
  return loc?.imageUrl || undefined;
}
