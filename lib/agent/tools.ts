import type { ProjectStage } from "@/lib/types";

export interface ToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  items?: { type: string; properties?: Record<string, ToolParameter>; required?: string[] };
  properties?: Record<string, ToolParameter>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required: string[];
  };
  costTier: "free" | "low" | "medium" | "high";
}

const SHOT_TYPE_ENUM = ["extreme_close_up", "close_up", "medium_close_up", "medium", "medium_wide", "wide", "extreme_wide", "establishing", "insert", "cutaway", "two_shot", "over_shoulder"] as const;
const CAMERA_ANGLE_ENUM = ["eye_level", "high_angle", "low_angle", "birds_eye", "worms_eye", "dutch", "pov", "over_shoulder"] as const;
const CAMERA_MOVEMENT_ENUM = ["static", "pan", "tilt", "dolly_in", "dolly_out", "truck", "crane", "handheld", "steadicam", "whip_pan", "zoom", "push_in", "pull_out", "arc"] as const;
const SHOT_FOCUS_ENUM = ["deep_focus", "shallow_focus", "soft_focus", "tilt_shift_v", "tilt_shift_h"] as const;
const CAMERA_MECHANISM_ENUM = ["tripod", "handheld", "gimbal", "steadicam", "crane", "drone"] as const;
const KEY_LIGHT_ENUM = ["key_light", "fill_light", "backlight", "high_key", "low_key", "natural", "golden_hour", "blue_hour", "neon", "silhouette", "chiaroscuro", "soft_diffused", "hard_dramatic"] as const;

const SHARED_SHOT_PARAMS: Record<string, ToolParameter> = {
  shotType: { type: "string", description: "Framing of the shot", enum: [...SHOT_TYPE_ENUM] },
  cameraAngle: { type: "string", description: "Camera angle", enum: [...CAMERA_ANGLE_ENUM] },
  cameraMovement: { type: "string", description: "Camera movement", enum: [...CAMERA_MOVEMENT_ENUM] },
  shotFocus: { type: "string", description: "Focus/depth of field style", enum: [...SHOT_FOCUS_ENUM] },
  cameraMechanism: { type: "string", description: "Camera stabilization/rig", enum: [...CAMERA_MECHANISM_ENUM] },
  keyLight: { type: "string", description: "Key lighting mood", enum: [...KEY_LIGHT_ENUM] },
  colorGrade: { type: "string", description: "Color grading style, e.g. 'teal-orange film look', 'warm golden tones', 'cold desaturated'" },
  cameraModel: { type: "string", description: "Camera body ID, e.g. 'arri_alexa35', 'red_komodo'" },
  lensType: { type: "string", description: "Lens family ID, e.g. 'prime', 'anamorphic'" },
  focalLength: { type: "string", description: "Focal length ID, e.g. '35mm', '85mm'" },
  cinemaAspectRatio: { type: "string", description: "Cinema aspect ratio, e.g. '2.39:1', '1.85:1'" },
};

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "generate_image",
    description: "Generate an image using Kling AI. Always uses 1K resolution and kling-v2 model for cost efficiency. Provide a detailed English cinematic prompt.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Detailed English cinematic prompt. Include subject, environment, lighting, color palette, camera/lens, mood. Do NOT exceed 400 words.",
        },
        aspect_ratio: {
          type: "string",
          description: "Aspect ratio for the image",
          enum: ["16:9", "9:16", "1:1", "4:3", "3:4"],
        },
      },
      required: ["prompt"],
    },
    costTier: "medium",
  },
  {
    name: "add_shots",
    description: "Add new shots to the project vision board. Each shot must have a rich English prompt and full cinematography metadata. When adding shots to an existing scene, check the SHOTS section of project state for the scene's established colorGrade and keyLight, and use the SAME values to maintain continuity.",
    parameters: {
      type: "object",
      properties: {
        shots: {
          type: "array",
          description: "Array of shot objects to add. Each must have all relevant cinematic fields.",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short title for the shot (in Persian is fine)" },
              description: { type: "string", description: "Visual description of the shot content (Persian)" },
              prompt: { type: "string", description: "Detailed English image-generation prompt for this shot. Include: subject/action, location/environment, lighting quality, color grade, camera body, lens, focal length, mood, film texture. 50-150 words." },
              sceneNumber: { type: "number", description: "Scene number. IMPORTANT: Check existing shots to use the correct scene number." },
              dialogueText: { type: "string", description: "Dialogue spoken in this shot" },
              notes: { type: "string", description: "Director notes" },
              ...SHARED_SHOT_PARAMS,
            },
            required: ["title", "description"],
          },
        },
        insertAfterShotId: {
          type: "number",
          description: "Optional: ID of an existing shot. New shots will be inserted immediately after this shot in the sequence. If omitted, shots are appended at the end.",
        },
      },
      required: ["shots"],
    },
    costTier: "free",
  },
  {
    name: "update_shot",
    description: "Modify an existing shot's parameters. Provide the shot ID and only the fields to change. Reference the SHOTS list in project state to get correct shot IDs. Can update cinematography, prompts, color grade, lighting, etc.",
    parameters: {
      type: "object",
      properties: {
        shotId: { type: "number", description: "ID of the shot to update (from project state SHOTS list)" },
        title: { type: "string", description: "Updated title" },
        description: { type: "string", description: "Updated visual description" },
        prompt: { type: "string", description: "Updated English image-generation prompt" },
        sceneNumber: { type: "number", description: "Move to a different scene number" },
        dialogueText: { type: "string", description: "Dialogue text" },
        notes: { type: "string", description: "Director notes" },
        ...SHARED_SHOT_PARAMS,
      },
      required: ["shotId"],
    },
    costTier: "free",
  },
  {
    name: "delete_shot",
    description: "Delete a shot permanently from the project. Use with caution — only when the user explicitly asks to delete/remove a shot. Provide the shot ID from the project state SHOTS list.",
    parameters: {
      type: "object",
      properties: {
        shotId: { type: "number", description: "ID of the shot to delete (from project state SHOTS list)" },
      },
      required: ["shotId"],
    },
    costTier: "free",
  },
  {
    name: "update_director_brief",
    description: "Update the director brief / vision board settings. Change film style, texture, lighting philosophy, camera body, lens, or other visual DNA parameters.",
    parameters: {
      type: "object",
      properties: {
        filmStyle: { type: "string", description: "Film style preset ID or custom value" },
        filmTexture: { type: "string", description: "Film texture preset ID or custom value" },
        colorScience: { type: "string", description: "Color science / color grading approach" },
        lightingPhilosophy: { type: "string", description: "Lighting philosophy preset ID or custom value" },
        overallMood: { type: "string", description: "Overall mood of the project" },
        referenceFilms: { type: "string", description: "Reference film preset ID or custom value" },
        era: { type: "string", description: "Time period / era setting" },
        visualStyle: { type: "string", description: "Visual style description" },
        cameraBody: { type: "string", description: "Camera body model ID" },
        lensFamily: { type: "string", description: "Lens family type ID" },
        baseAspectRatio: { type: "string", description: "Base aspect ratio for the project" },
      },
      required: [],
    },
    costTier: "free",
  },
  {
    name: "generate_storyboard",
    description: "Auto-generate a storyboard from the project's script. Creates shots based on the narrative with appropriate cinematography.",
    parameters: {
      type: "object",
      properties: {
        shotCount: { type: "number", description: "Target number of shots to generate. Defaults to auto-detect from script." },
      },
      required: [],
    },
    costTier: "low",
  },
  {
    name: "update_narrative",
    description: "Update the project's narrative content. CRITICAL: When adding to existing script/idea/logline, ALWAYS set append=true and provide only the NEW text to add — do NOT send the full existing content back. When replacing entirely (rare), set append=false.",
    parameters: {
      type: "object",
      properties: {
        idea: { type: "string", description: "New idea text to add or replace" },
        logline: { type: "string", description: "New logline text to add or replace" },
        script: { type: "string", description: "New script text to add or replace" },
        append: {
          type: "boolean",
          description: "If true, text is APPENDED (default). If false, content is REPLACED. Default is true.",
        },
      },
      required: [],
    },
    costTier: "free",
  },
  {
    name: "create_element",
    description: "Create a new project element: character, location, or prop.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the element" },
        type: {
          type: "string",
          description: "Type of element",
          enum: ["character", "location", "property"],
        },
        description: { type: "string", description: "Detailed description of the element for prompts" },
      },
      required: ["name", "type", "description"],
    },
    costTier: "free",
  },
  {
    name: "answer",
    description: "Provide a pure text response with no action. Use for questions, advice, analysis, or feedback.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The response text in Persian (Farsi)" },
      },
      required: ["text"],
    },
    costTier: "free",
  },
];

const STAGE_TOOL_MAP: Record<ProjectStage, string[]> = {
  narrative: ["answer", "update_narrative", "create_element", "generate_image"],
  director_brief: ["answer", "update_director_brief", "create_element", "generate_image"],
  vision: ["answer", "add_shots", "update_shot", "delete_shot", "create_element", "generate_image", "update_director_brief"],
  storyboard: ["answer", "generate_storyboard", "add_shots", "update_shot", "delete_shot", "generate_image", "create_element"],
  assembly: ["answer", "update_shot", "delete_shot", "generate_image"],
  export: ["answer", "generate_image"],
};

export function getToolsForStage(stage: ProjectStage): ToolDefinition[] {
  const allowedNames = STAGE_TOOL_MAP[stage] || STAGE_TOOL_MAP.vision;
  return AGENT_TOOLS.filter(t => allowedNames.includes(t.name));
}

export function getToolSchemaJSON(tools: ToolDefinition[]): string {
  return JSON.stringify(
    tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
    null,
    2
  );
}
