import type {
  FullProject,
  ProjectStage,
  Narrative,
  VisionBoard,
  Shot,
  Asset,
  DirectorBrief,
} from "@/lib/types";

interface SerializeOptions {
  project: FullProject | null | undefined;
  elements: Asset[];
  currentStage: ProjectStage;
}

function truncate(text: string | null | undefined, maxLen: number): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}

function serializeProjectSection(project: FullProject): string {
  const parts: string[] = [];
  parts.push(`Title: ${project.title}`);
  if (project.style) parts.push(`Style: ${project.style}`);
  if (project.aspectRatio) parts.push(`Aspect Ratio: ${project.aspectRatio}`);
  parts.push(`Current Stage: ${project.currentStage}`);
  if (project.description) parts.push(`Description: ${truncate(project.description, 150)}`);
  return parts.join("\n");
}

function serializeNarrativeSection(narrative: Narrative | null | undefined): string {
  if (!narrative) return "No narrative created yet.";
  const parts: string[] = [];
  if (narrative.idea) parts.push(`Idea: ${truncate(narrative.idea, 300)}`);
  if (narrative.logline) parts.push(`Logline: ${narrative.logline}`);
  if (narrative.script) parts.push(`Script (excerpt):\n${truncate(narrative.script, 800)}`);
  if (narrative.targetAudience) parts.push(`Target Audience: ${narrative.targetAudience}`);
  if (narrative.duration) parts.push(`Duration: ${narrative.duration}`);
  if (parts.length === 0) return "Narrative exists but is empty.";
  return parts.join("\n");
}

function serializeDirectorBrief(brief: DirectorBrief | null | undefined): string {
  if (!brief) return "No director brief set.";
  const fields: string[] = [];
  if (brief.filmStyle) fields.push(`Film Style: ${brief.filmStyle}`);
  if (brief.filmTexture) fields.push(`Texture: ${brief.filmTexture}`);
  if (brief.colorScience) fields.push(`Color Science: ${brief.colorScience}`);
  if (brief.lightingPhilosophy) fields.push(`Lighting Philosophy: ${brief.lightingPhilosophy}`);
  if (brief.overallMood) fields.push(`Mood: ${brief.overallMood}`);
  if (brief.referenceFilms) fields.push(`Reference Films: ${brief.referenceFilms}`);
  if (brief.era) fields.push(`Era: ${brief.era}`);
  if (brief.visualStyle) fields.push(`Visual Style: ${brief.visualStyle}`);
  if (brief.cameraBody) fields.push(`Camera Body: ${brief.cameraBody}`);
  if (brief.lensFamily) fields.push(`Lens Family: ${brief.lensFamily}`);
  if (brief.baseAspectRatio) fields.push(`Base Aspect Ratio: ${brief.baseAspectRatio}`);
  if (fields.length === 0) return "Director brief exists but no presets selected.";
  return fields.join("\n");
}

function formatShotDetail(shot: Shot, elements?: Asset[]): string {
  const lines: string[] = [];

  const title = shot.title || `Shot ${shot.order + 1}`;
  const statusFlags: string[] = [`(${shot.status})`];
  if (shot.generatedImageUrl) statusFlags.push("[img]");
  if (shot.generatedVideoUrl) statusFlags.push("[vid]");

  lines.push(`#${shot.id} | Scene ${shot.sceneNumber ?? "?"} | ${title} ${statusFlags.join("")}`);

  const desc = shot.description || shot.prompt;
  if (desc) lines.push(`  desc: "${truncate(desc, 120)}"`);

  const cineParts: string[] = [];
  if (shot.shotType) cineParts.push(`type=${shot.shotType}`);
  if (shot.cameraAngle && shot.cameraAngle !== "eye_level") cineParts.push(`angle=${shot.cameraAngle}`);
  if (shot.cameraMovement && shot.cameraMovement !== "static") cineParts.push(`move=${shot.cameraMovement}`);
  if (shot.shotFocus && shot.shotFocus !== "deep_focus") cineParts.push(`focus=${shot.shotFocus}`);
  if (shot.cameraMechanism) cineParts.push(`rig=${shot.cameraMechanism}`);
  if (shot.keyLight) cineParts.push(`light=${shot.keyLight}`);
  if (shot.colorGrade) cineParts.push(`color="${shot.colorGrade}"`);
  if (shot.cameraModel) cineParts.push(`cam=${shot.cameraModel}`);
  if (shot.lensType) cineParts.push(`lens=${shot.lensType}`);
  if (shot.focalLength) cineParts.push(`fl=${shot.focalLength}`);
  if (shot.cinemaAspectRatio) cineParts.push(`ratio=${shot.cinemaAspectRatio}`);
  if (cineParts.length > 0) lines.push(`  cine: ${cineParts.join(", ")}`);

  if (elements) {
    const refs: string[] = [];
    if (shot.locationId) {
      const loc = elements.find(e => e.id === shot.locationId);
      if (loc) refs.push(`loc="${loc.name}"`);
    }
    const charIds = (shot.characterIds || []) as number[];
    if (charIds.length > 0) {
      const charNames = charIds.map(id => elements.find(e => e.id === id)?.name).filter(Boolean);
      if (charNames.length > 0) refs.push(`chars=[${charNames.join(", ")}]`);
    }
    const propIds = (shot.propIds || []) as number[];
    if (propIds.length > 0) {
      const propNames = propIds.map(id => elements.find(e => e.id === id)?.name).filter(Boolean);
      if (propNames.length > 0) refs.push(`props=[${propNames.join(", ")}]`);
    }
    if (refs.length > 0) lines.push(`  refs: ${refs.join(", ")}`);
  }

  if (shot.dialogueText) lines.push(`  dialogue: "${truncate(shot.dialogueText, 80)}"`);
  if (shot.notes) lines.push(`  notes: "${truncate(shot.notes, 60)}"`);

  return lines.join("\n");
}

function serializeShotsSection(shots: Shot[], elements?: Asset[]): string {
  if (!shots || shots.length === 0) return "No shots created yet.";

  const draftCount = shots.filter(s => s.status === "draft").length;
  const generatedCount = shots.filter(s => s.status === "generated").length;
  const approvedCount = shots.filter(s => s.status === "approved").length;

  const parts: string[] = [];
  parts.push(`Total: ${shots.length} shots | Draft: ${draftCount}, Generated: ${generatedCount}, Approved: ${approvedCount}`);

  const sceneGroups: Record<string | number, Shot[]> = {};
  for (const shot of shots) {
    const key = shot.sceneNumber ?? "unassigned";
    if (!sceneGroups[key]) sceneGroups[key] = [];
    sceneGroups[key].push(shot);
  }

  const sceneKeys = Object.keys(sceneGroups).sort((a, b) => {
    if (a === "unassigned") return 1;
    if (b === "unassigned") return -1;
    return Number(a) - Number(b);
  });

  if (sceneKeys.length > 1 || (sceneKeys.length === 1 && sceneKeys[0] !== "unassigned")) {
    const sceneSummaries = sceneKeys.map(k => {
      const sceneShots = sceneGroups[k];
      const firstShot = sceneShots[0];
      const anchor: string[] = [];
      if (firstShot.keyLight) anchor.push(`light=${firstShot.keyLight}`);
      if (firstShot.colorGrade) anchor.push(`color="${firstShot.colorGrade}"`);
      if (firstShot.locationId && elements) {
        const loc = elements.find(e => e.id === firstShot.locationId);
        if (loc) anchor.push(`loc="${loc.name}"`);
      }
      const anchorStr = anchor.length > 0 ? ` [${anchor.join(", ")}]` : "";
      return `Scene ${k}: ${sceneShots.length} shots${anchorStr}`;
    });
    parts.push(`Scene Breakdown:\n  ${sceneSummaries.join("\n  ")}`);
  }

  parts.push("\nShot List (all shots with full details):");
  const sortedShots = [...shots].sort((a, b) => a.order - b.order);
  for (const shot of sortedShots) {
    parts.push(formatShotDetail(shot, elements));
  }

  return parts.join("\n");
}

function serializeElementsSection(elements: Asset[]): string {
  if (!elements || elements.length === 0) return "No elements (characters/locations/props) defined.";

  const characters = elements.filter(e => e.type === "character");
  const locations = elements.filter(e => e.type === "location");
  const props = elements.filter(e => e.type === "property");

  const parts: string[] = [];
  parts.push(`Total: ${elements.length} elements`);

  if (characters.length > 0) {
    parts.push(`Characters (${characters.length}):`);
    for (const c of characters) {
      const meta = c.metadata as Record<string, string> | null;
      const details: string[] = [];
      if (c.sex) details.push(c.sex);
      if (c.age) details.push(`age ${c.age}`);
      if (c.description) details.push(truncate(c.description, 80));
      if (meta?.clothing) details.push(`wearing ${meta.clothing}`);
      if (meta?.hair) details.push(`${meta.hair} hair`);
      if (meta?.build) details.push(`${meta.build} build`);
      const hasImg = c.imageUrl ? " [img]" : "";
      parts.push(`  - [id:${c.id}] ${c.name}${hasImg}: ${details.join(", ") || "no description"}`);
    }
  }

  if (locations.length > 0) {
    parts.push(`Locations (${locations.length}):`);
    for (const l of locations) {
      const hasImg = l.imageUrl ? " [img]" : "";
      parts.push(`  - [id:${l.id}] ${l.name}${hasImg}: ${truncate(l.description, 100)}`);
    }
  }

  if (props.length > 0) {
    parts.push(`Props (${props.length}):`);
    for (const p of props) {
      parts.push(`  - [id:${p.id}] ${p.name}: ${truncate(p.description, 80)}`);
    }
  }

  return parts.join("\n");
}

const STAGE_LABELS: Record<ProjectStage, string> = {
  narrative: "Narrative (idea/script writing)",
  director_brief: "Director Brief (visual presets)",
  vision: "Vision Board (shot planning — full CRUD on shots)",
  storyboard: "Storyboard (image generation for shots)",
  assembly: "Assembly (timeline editing)",
  export: "Export (final output)",
};

export function serializeProjectState(options: SerializeOptions): string {
  const { project, elements, currentStage } = options;

  if (!project) {
    return `[PROJECT STATE]\nNo project loaded.\nActive Page: ${STAGE_LABELS[currentStage]}`;
  }

  const sections: string[] = [];

  sections.push("=== PROJECT ===");
  sections.push(serializeProjectSection(project));

  sections.push("\n=== ACTIVE PAGE ===");
  sections.push(STAGE_LABELS[currentStage]);

  sections.push("\n=== NARRATIVE ===");
  sections.push(serializeNarrativeSection(project.narrative));

  sections.push("\n=== DIRECTOR BRIEF ===");
  sections.push(serializeDirectorBrief(project.visionBoard?.directorBrief));

  sections.push("\n=== SHOTS ===");
  sections.push(serializeShotsSection(project.shots, elements));

  sections.push("\n=== ELEMENTS ===");
  sections.push(serializeElementsSection(elements));

  return sections.join("\n");
}
