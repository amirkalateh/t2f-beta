# Tex2Film — Architecture Blueprint & Developer Guidance

> **Last updated:** 2026-05-19  
> **Stack:** Next.js 14 (App Router) + React 18 + TypeScript + Tailwind + PostgreSQL + Drizzle ORM + LangGraph (Python) + Kling AI

---

## 0. Concept & Philosophy

### What is Tex2Film?
Tex2Film is an **AI-native film pre-production and generation platform**. It takes a text idea — a sentence, a paragraph, a full script — and transforms it through a disciplined cinematic pipeline into a complete decoupage (shot-by-shot breakdown), then generates the actual images and video frames for each shot using Kling AI. The final output is an editable timeline that can be assembled into a cohesive film sequence.

### Core Design Philosophy

1. **Director-First, Not Prompt-First.** Most AI video tools treat generation as a black box where users throw prompts at a model. Tex2Film inverts this: the AI acts as a *collaborator* under the user's directorial control. Every shot has explicit cinematographic metadata (shot type, angle, movement, lighting, lens, aspect ratio) that the user can override. The AI suggests; the director decides.

2. **Continuity as a First-Class Citizen.** Film is a temporal art form — what matters is not any individual frame, but the *relationship between frames*. The system enforces raccord (continuity) through explicit `raccordNotes` and `transitionFromPrev` fields on every shot. The storyboard AI is trained with 10 cinematic cutting rules (180° rule, match-cuts, cut-on-action, J/L-cuts) so that generated shot lists are narratively coherent, not just visually pretty.

3. **Character Consistency Through Elements.** A film without consistent characters is a slideshow. The element system registers each character as a Kling Element (up to 5 angle images) so the same face, build, and clothing appear across every generated shot. The prompt builder automatically injects character metadata (age, hair, distinguishing features, vibe) into every frame prompt.

4. **Human-in-the-Loop at Every Mutation.** The LangGraph agent does not autonomously write to the database. Every stage (narrative, director brief, shot breakdown, image generation, video generation) produces a *proposal* that the user must approve, reject, or edit before the graph continues. This prevents the "AI went off the rails and ruined my project" problem.

5. **Bilingual by Design.** The UI is primarily in Persian (Farsi) with RTL layout, but all technical identifiers (DB columns, API fields, code) are in English. This makes the codebase accessible to international developers while serving the target audience natively.

### The Tex2Film Mental Model

Think of the system as a **digital film studio** with these departments:
- **Writers' Room** (Narrative stage) — Script development
- **Director's Office** (Director Brief stage) — Cinematic vision document
- **Production Design** (Vision Board + Assets) — Cast, locations, props, lookbook
- **Storyboard Artist** (Storyboard stage) — Shot-by-shot visual plan with cutting rules
- **Editorial** (Assembly stage) — NLE timeline with actual video playback
- **Post-Production** (Export stage) — Render and deliver

The AI agent is the **production coordinator** that moves work between departments, but the human user is always the **executive producer** with final approval authority.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                     │
│   React 18 + Next.js App Router + Tailwind + Framer Motion + Radix      │
│   ───────────────────────────────────────────────────────────────────   │
│   Studio Page (6 stages)  →  Flow Components  →  Video Editor Timeline  │
│   Asset Gallery  →  Element Manager  →  Omni Chat  →  Agent Chat Panel   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS BACKEND (Port 5000)                     │
│   ───────────────────────────────────────────────────────────────────   │
│   App Router API Routes  →  Drizzle ORM  →  PostgreSQL (shared DB)      │
│   Auth (passport-local + JWT)  →  Tier/Credit Limits                    │
│   AI Routes (OpenRouter)  →  Kling Client (image/video/elements)      │
│   Agent Bridge (REST → Python LangGraph agent on port 8000)             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     PYTHON LANGGRAPH AGENT (Port 8000)                  │
│   ───────────────────────────────────────────────────────────────────   │
│   FastAPI  →  LangGraph StateGraph  →  PostgreSQL Checkpointing         │
│   12 Nodes: supervisor → narrative → director_brief → shot_breakdown   │
│   → prompt_builder → kling_image → kling_video → continuity_check      │
│   → assembly_advice → human_feedback → answer                         │
│   LangSmith tracing enabled. Human-in-the-loop gates at every mutation.│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Kling AI API (External)                         │
│   ───────────────────────────────────────────────────────────────────   │
│   Image Generation (v1–v3, O1 Omni)  →  Text2Image + Image2Image        │
│   Video Generation (v1.5–v2.6 Pro/Master)  →  Image2Video             │
│   Element API  →  createElement (up to 5 angle images per character)  │
│   JWT auth with access_key + secret_key. Image ref: image (not url).  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

**Next.js as the Orchestrator:** The frontend and API layer live in one Next.js app because:
- Shared TypeScript types between frontend and backend (`lib/types.ts`, `shared/schema.ts`)
- API routes colocated with the pages that consume them
- Server Components can query the DB directly without an extra network hop
- Vercel Blob for file storage integrates cleanly

**Python LangGraph Agent as a Separate Service:** The AI agent runs as a standalone FastAPI service because:
- LangGraph/LangChain ecosystem is Python-native
- The agent needs long-running SSE streams that would block Next.js's event loop
- PostgreSQL checkpointing requires async Python (asyncpg)
- Isolates AI inference from user-facing request handling
- Can be scaled independently (multiple agent workers, one Next.js frontend)

**Shared PostgreSQL Database:** Both Next.js (via Drizzle ORM) and the Python agent (via asyncpg/LangGraph checkpointing) read from the same PostgreSQL instance. This eliminates sync complexity — the agent writes a shot proposal directly to `vision_shots`, and the Next.js frontend immediately sees it on the next page load.

---

## 2. Database Schema (PostgreSQL)

### 2.1 Conceptual Data Model

The schema is designed around the **film production document hierarchy**:

```
User
  └── Project (a film)
        ├── Narrative (the script)
        ├── VisionBoard (director's lookbook)
        ├── VisionShots[] (the decoupage — shot-by-shot plan)
        ├── Assembly (the edited timeline)
        ├── Assets[] (characters, locations, props)
        ├── AudioTracks[] (music, SFX, dialogue)
        └── OmniChatSessions[] (conversations about the project)
```

Every table references `projects.id` with `ON DELETE CASCADE` so deleting a project cleans up everything. This is a deliberate choice — film projects are self-contained units.

### 2.2 Table Reference

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Auth + billing | `id`, `username`, `password`, `tier` (free/pro/studio/unlimited), `credits` |
| `sessions` | Passport sessions | `id`, `user_id`, `expires_at` |
| `projects` | Film projects | `id`, `user_id`, `title`, `creative_intent`, `style`, `tone`, `aspect_ratio`, `current_stage` |
| `narratives` | Story / script | `project_id`, `idea`, `logline`, `script` |
| `vision_boards` | Director's mood board | `project_id`, `director_brief` (JSONB), `reference_images`, `color_palette`, `mood_keywords` |
| `vision_shots` | **Shot list / decoupage** | `project_id`, `order`, `title`, `prompt`, `shot_type`, `camera_angle`, `camera_movement`, `key_light`, `color_grade`, `camera_model`, `lens_type`, `focal_length`, `cinema_aspect_ratio`, `duration`, `dialogue_text`, `notes`, `scene_number`, `scene_name`, `status`, `generated_image_url`, `generated_video_url`, `kling_task_id`, `location_id`, `character_ids` (JSONB), `prop_ids` (JSONB), `raccord_notes`, `transition_from_prev` |
| `assemblies` | Timeline export | `project_id`, `timeline` (JSONB), `export_settings`, `status`, `export_url` |
| `assets` | Characters / locations / props | `user_id`, `project_id`, `name`, `type` (character/location/property), `media_type`, `file_url`, `image_url`, `thumbnail_url`, `metadata` (JSONB: age, sex, hair, build, clothing, ethnicity, distinguishing, vibe), `kling_element_id`, `multi_shot_urls`, `angle_images` |
| `audio_tracks` | Music / SFX / dialogue | `project_id`, `name`, `url`, `duration`, `type` (sfx/dialogue/narration/music), `volume`, `start_time` |
| `omni_chat_sessions` | Multi-modal chat | `user_id`, `project_id`, `title` |
| `omni_chat_messages` | Chat history | `session_id`, `role`, `content`, `image_generation`, `attached_images`, `tool_results` |
| `usage_logs` | Billing audit | `user_id`, `action`, `credits_used`, `metadata` |
| `agent_run_logs` | Agent telemetry | `thread_id`, `project_id`, `node_name`, `status`, `cost_credits`, `error` |

### 2.3 Schema Design Principles

- **JSONB for flexible arrays:** `character_ids`, `prop_ids`, `metadata`, `timeline`, `director_brief` are all JSONB. This avoids migration pain for nested data that changes frequently. When a field stabilizes, promote it to a proper column (as happened with `location_id`, `raccord_notes`, `transition_from_prev`).
- **Soft delete via CASCADE:** No `deleted_at` columns. Projects are deleted completely when the user deletes them. Film projects are not meant to be "recovered" — they are recreated.
- **Status fields on workflow entities:** `vision_shots.status` (draft|generating|generated|approved|rejected) and `assemblies.status` (draft|rendering|completed) track the lifecycle of producible artifacts.

**Migrations:** Run via `lib/db-push.ts` (tsx runner) or `POST /api/setup`. All new columns use `ADD COLUMN IF NOT EXISTS`.

---

## 3. Production Pipeline (6 Stages)

A project moves sequentially through these stages, tracked in `projects.current_stage`:

### 3.1 Narrative (`narrative-flow.tsx`)

**Concept:** This is the *writers' room*. The user enters a raw idea ("a woman discovers her neighbor is a time traveler") and the AI expands it through three levels of abstraction:
1. **Logline** — One sentence hook (for pitching)
2. **Outline** — Scene-by-scene breakdown (for structure)
3. **Script** — Full dialogue and action lines (for production)

**Why streaming?** Script generation can take 15-30 seconds. Streaming the response word-by-word keeps the user engaged and lets them start reading while the AI is still writing.

- Route: `POST /api/ai/script` (streaming) | `POST /api/ai/script/import`
- Agent node: `narrative_node`

### 3.2 Director Brief (`director-brief-flow.tsx`)

**Concept:** Before shooting a single frame, a real director writes a "director's statement" — a document that answers: *What does this film LOOK like?* The AI generates this based on the script, and the user can override any field.

The brief includes:
- **Film Style:** Cinematic, documentary, art-house, horror, etc.
- **Texture:** Film grain, digital sharpness, vintage softness
- **Color Science:** LUT/emulation preferences (Kodak 2383, Fuji Eterna)
- **Lighting Philosophy:** Naturalistic, high-key studio, chiaroscuro
- **Reference Films:** "Like Blade Runner but warmer" — the AI watches (reads about) these films and extracts visual patterns
- **Camera Body & Lens Family:** ARRI vs RED vs Sony — each has distinct color science
- **Base Aspect Ratio:** 2.39:1 anamorphic vs 1.85:1 spherical

This brief is **inherited by every shot** in the storyboard stage. It is the "visual DNA" of the project.

- Stored in `vision_boards.director_brief`
- Route: `POST /api/ai/director-brief`
- Agent node: `director_brief_node`

### 3.3 Vision Board (`vision-flow.tsx`)

**Concept:** The *production design* phase. Before the storyboard artist draws, the production designer establishes:
- Scene defaults (lighting, camera, lens for an entire scene)
- Asset assignments (which character appears in which shot)
- Location mapping

The Vision Board is **not about individual shots** — it's about *scene-level defaults* that shots inherit. When a new shot is created, it copies the current scene defaults so the user doesn't have to set camera model on every single shot.

- Route: `POST /api/projects/{id}/shots` (create/update shots)

### 3.4 Storyboard (`storyboard-flow.tsx` + Step 4)

**Concept:** The *storyboard artist* takes the script + director brief + scene defaults and draws a shot-by-shot visual plan. In Tex2Film, the AI storyboard generates:
1. **Shot metadata:** Type, angle, movement, lighting, duration, dialogue
2. **Cinematic cutting plan:** `transitionFromPrev` and `raccordNotes` for every shot
3. **Element assignments:** Which characters, locations, and props appear in each shot
4. **Kling-optimized prompts:** The actual text prompt that will be sent to Kling for image generation

**The AI does not just describe shots — it plans the EDIT.** The storyboard is a *decoupage* (French film term for the complete shot plan including cuts and transitions). This is what separates Tex2Film from "AI image generators that make pretty pictures" — it makes *narratively coherent sequences*.

**Critical AI prompt rules:**
- Progressive revelation (every shot shows NEW information)
- No complete gesture repetition across cuts
- Cut-on-action (cut DURING movement)
- Match-cut continuity (subject position / screen direction preserved)
- 180° axis rule enforcement
- J-cuts & L-cuts for overlapping audio-visual transitions
- Emotional rhythm: action = 2-3s, contemplative = 5-7s
- Reveal shots: start with partial frame, then reveal subject
- Counter-movement: alternate camera directions
- Negative space for psychological distance

- Route: `POST /api/ai/storyboard`
- Agent node: `shot_breakdown_node` → `prompt_builder_node`

### 3.5 Assembly (`assembly-flow.tsx`)

**Concept:** The *editorial suite*. An NLE (Non-Linear Editor) timeline where:
- Video tracks hold generated clips
- Audio tracks hold music, SFX, dialogue (TTS-generated)
- Overlay tracks hold titles, graphics
- The preview monitor plays actual video synchronized to the timeline playhead

The timeline is **not just a visual representation** — it is a functional video editor. Video clips are actual `<video>` elements whose `currentTime` is synced to the timeline position. When you scrub, the video scrubs.

- Components: `components/video-editor/timeline.tsx`, `components/video-editor/monitor.tsx`

### 3.6 Export (`export-flow.tsx`)

**Concept:** *Post-production delivery.* Render settings, codec selection, resolution upscaling, watermark application, and export queue management.

---

## 4. LangGraph Agent Architecture

### 4.1 Why LangGraph?

The AI agent is not a single LLM call — it is a **stateful, persistent workflow** that:
1. Remembers what stage the project is in (checkpointed to PostgreSQL)
2. Can be interrupted for human approval and resumed later
3. Routes conditionally based on user intent ("generate shots" vs "just answer my question")
4. Streams events in real-time to the frontend via SSE

LangGraph is the right tool because film production is inherently *stateful and sequential* — you cannot generate shots before you have a script, and you cannot generate video before you have images.

### 4.2 Graph Structure (`agent/graph.py`)

```
START
  │
  ▼
supervisor ──▶ decides stage & next node
  │
  ├──▶ narrative ──▶ human_feedback ──▶ (approved?) ──▶ END
  │
  ├──▶ director_brief ──▶ human_feedback ──▶ (approved?) ──▶ END
  │
  ├──▶ shot_breakdown ──▶ human_feedback ──▶ (approved?) ──▶ END
  │
  ├──▶ prompt_builder ──▶ human_feedback ──▶ (approved?) ──▶ END
  │
  ├──▶ kling_image ──▶ human_feedback ──▶ (approved?) ──▶ END
  │
  ├──▶ kling_video ──▶ human_feedback ──▶ (approved?) ──▶ END
  │
  ├──▶ continuity_check ──▶ END
  │
  ├──▶ assembly_advice ──▶ END
  │
  └──▶ answer ──▶ END
```

### 4.3 Nodes (12 total)

| Node | File | Purpose |
|------|------|---------|
| `supervisor` | `nodes/supervisor.py` | Route planning — decides which stage to execute based on current state + user intent |
| `narrative` | `nodes/narrative.py` | Generate script from idea; writes to `narratives` table |
| `director_brief` | `nodes/director_brief.py` | Generate cinematic vision brief; writes to `vision_boards` |
| `shot_breakdown` | `nodes/shot_breakdown.py` | Create shot list with scene numbers, durations, types; writes to `vision_shots` |
| `prompt_builder` | `nodes/prompt_builder.py` | Build Kling-optimized image prompts from shot metadata + director brief |
| `kling_image` | `nodes/kling_image.py` | Call Kling image2image API; store result in `generated_image_url` |
| `kling_video` | `nodes/kling_video.py` | Call Kling image2video API with element references; store in `generated_video_url` |
| `continuity_check` | `nodes/continuity_check.py` | Verify raccord across shots (screen direction, props, lighting continuity) |
| `assembly_advice` | `nodes/assembly_advice.py` | Suggest timeline edits: pacing, J/L-cuts, music cues |
| `human_feedback` | `nodes/human_feedback.py` | Interrupt node — pauses graph, sends proposal to user, waits for approve/reject/edit |
| `answer` | `nodes/answer.py` | Free-form Q&A about the project (does NOT mutate DB) |

### 4.4 Human-in-the-Loop Gates

Every node that writes to DB or calls AI generation is wrapped with an interrupt:
1. Node runs, produces a proposal (e.g., "Here are 8 shots for Scene 1...")
2. Graph interrupts, state is checkpointed to PostgreSQL
3. SSE stream sends proposal to frontend
4. User clicks **Approve**, **Reject**, or **Edit**
5. `POST /agent/resume/{tid}` continues the graph with user feedback

**Why this matters:** Without gates, an LLM hallucination could overwrite a carefully crafted director brief or generate 50 irrelevant shots. The gates make the AI **propose**, not **impose**.

### 4.5 State Schema (`agent/state.py`)

```python
class FilmProductionState(TypedDict):
    project_id: int
    thread_id: str
    user_id: str
    stage: Literal["narrative", "director_brief", "vision", "storyboard",
                     "assembly", "export", "idle"]
    narrative: NarrativeData | None
    director_brief: DirectorBriefData | None
    shots: list[ShotData]
    assets: list[AssetData]          # characters, locations, props
    current_shot_index: int
    generated_media: list[MediaResult]
    continuity_notes: list[str]
    assembly_plan: AssemblyPlan | None
    messages: list[BaseMessage]       # conversation history
    pending_human_action: HumanAction | None
    auto_pipeline: bool               # if True, supervisor chains stages automatically after approval
```

**Key design decision:** The state is a **flat dictionary**, not nested. This makes it easy to:
- Render in the frontend (just JSON.stringify the state)
- Debug (print the whole state and see everything)
- Checkpoint (LangGraph serializes the dict to PostgreSQL automatically)

### 4.6 FastAPI Endpoints (`agent/server.py`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/agent/run` | POST | Start new run or continue existing; streams SSE events |
| `/agent/resume/{tid}` | POST | Resume after human interrupt with approve/reject/edit |
| `/agent/status/{tid}` | GET | Current graph state snapshot |
| `/agent/history/{tid}` | GET | Full message history |
| `/agent/logs/{project_id}` | GET | Recent run logs from `agent_run_logs` |
| `/agent/health` | GET | Liveness probe |

Security: optional `AGENT_INTERNAL_TOKEN` env var + `X-Agent-Token` header.

### 4.7 Agent-Frontend Communication

The frontend connects to the agent via **Server-Sent Events (SSE)**:
1. Frontend opens `EventSource` to `/api/chat` (Next.js proxy)
2. Next.js forwards to Python agent's `/agent/run`
3. Agent streams events: `{"type": "node_start", "node": "shot_breakdown"}` → `{"type": "proposal", "data": {...}}` → `{"type": "human_interrupt", "message": "Please review..."}`
4. When interrupted, frontend shows approve/reject/edit UI
5. On approval, frontend POSTs to `/agent/resume/{tid}`
6. Agent continues from checkpoint

This SSE pattern is critical because the graph can run for **minutes** (generating 20 shots takes time). HTTP request timeouts would kill a normal REST approach.

---

## 5. Kling AI Integration (`lib/kling/`)

### 5.1 Why Kling?

Kling AI (by Kuaishou) is chosen because:
- **Element API** for character consistency (most competitors don't have this)
- **Image2Video** with motion control (generates video from a single keyframe)
- **Multi-model support** (v1 through v2.6 Pro) for quality/cost tradeoffs
- **JWT auth** that works well in server-to-server environments

### 5.2 Authentication
- JWT signed with HS256 using `KLING_ACCESS_KEY` + `KLING_SECRET_KEY`
- 30-minute expiry, 5-second not-before leeway
- The JWT is generated fresh for every request (no token caching needed)

### 5.3 Image Generation (`lib/kling/client.ts`)

**Models:**
| ID | Tier | Use Case |
|----|------|----------|
| `kling-v3-omni` | Latest | Multi-reference, 1K, highest quality |
| `kling-image-o1` | O1 | Multi-image input, omni capabilities |
| `kling-v3` | High | High consistency, precise detail |
| `kling-v2-1` | Mid | Stable quality |
| `kling-v2` | Standard | General purpose |
| `kling-v1-5` | Legacy | Subject/face reference support |
| `kling-v1` | Classic | Baseline generation |

**Endpoints:**
- `POST /v1/images/generations` — Text2Image
- `POST /v1/images/generations` with `image` field — Image2Image (subject/face ref)

**Reference types:** `subject` (whole figure) or `face` (facial features only)

### 5.4 Video Generation (`lib/kling/client.ts`)

**Models:**
| UI Name | API Model | Mode | Duration |
|---------|-----------|------|----------|
| Kling v2.6 Pro | `kling-v2-6` | `pro` | 5s/10s |
| Kling v2.6 Std | `kling-v2-6` | `std` | 5s/10s |
| Kling v2.5 Turbo | `kling-v2-5` | `turbo` | 5s |
| Kling v2.1 | `kling-v2-1` | `std` | 5s/10s |
| Kling v2 Master | `kling-v2` | `master` | 5s/10s |
| Kling v1.6 | `kling-v1-6` | `std` | 5s/10s |
| Kling v1.5 | `kling-v1-5` | `std` | 5s |
| Kling v1 Pro | `kling-v1` | `pro` | 5s/10s |
| Kling v1 Std | `kling-v1` | `std` | 5s |

**Key mapping:** UI passes `selectedVideoModel` string → backend parses model name + mode from suffix (`-pro`, `-master`, `-turbo`, `-std`)

**Endpoint:** `POST /v1/videos/image2video`

**Critical field mapping:**
```json
{
  "model": "kling-v2-6",
  "mode": "pro",
  "image": "<base64_or_url>",     // NOT "image_url" — the API expects "image"
  "prompt": "...",
  "duration": 5,
  "aspect_ratio": "16:9",
  "cfg_scale": 0.5
}
```

**The `image` vs `image_url` trap:** Kling's image2video endpoint accepts `image` (not `image_url`). This is a common integration bug — the API docs say "image" but intuition says "image_url". Always use `image`.

### 5.5 Element Registration (`lib/kling/client.ts`)

Characters are registered as Kling Elements for consistent appearance across generations:
- `POST /v1/elements` — `createElement` with `name` + up to 5 `images` (frontal + 4 angles)
- Element ID stored in `assets.kling_element_id`
- When generating video, pass `element_id` in the request to maintain character consistency

**Why 5 images?** Kling's element system uses multiple angles to build a 3D-like understanding of the character. Frontal is mandatory; side, 3/4, back, and top-down angles improve consistency in dynamic shots (turning, walking, looking away).

### 5.6 Prompt Builder (`lib/kling/prompt-builder.ts`)

Builds cinematic prompts from shot metadata. The builder follows a **layered composition** strategy:

```
Layer 1: Shot type description (mise-en-scène language)
Layer 2: Camera angle + movement + mechanism
Layer 3: Lighting + color grade
Layer 4: Lens + focal length + aspect ratio
Layer 5: Character references (from metadata JSONB)
Layer 6: Location description
Layer 7: Director brief overlay (film style, texture, color science, era)
```

Example output:
> "medium shot, waist-up framing, subject in clear context with environment, balanced composition. Eye level, static camera on tripod. Natural ambient lighting, golden hour sunlight. Shot on ARRI Alexa Mini LF with spherical lens at 50mm, 2.39:1 anamorphic widescreen. A 25-year-old Persian woman with long dark brown wavy hair, slender athletic build, wearing a vintage 1970s denim jacket. Melancholic but determined expression. Hollywood cinematic look, rich colors, dramatic lighting, film grain."

This layered approach ensures that **no matter how the user tweaks shot settings**, the prompt remains coherent and cinematic.

---

## 6. Studio Page Architecture (`app/studio/[id]/page.tsx`)

### 6.1 Stage Switcher
Renders one of 6 flow components based on `currentStage`:

| Stage | Component | Key Features |
|-------|-----------|--------------|
| `narrative` | `NarrativeFlow` | Idea → Logline → Outline → Script editor |
| `director_brief` | `DirectorBriefFlow` | AI-generated brief + manual override fields |
| `vision` | `VisionFlow` | Scene defaults + shot cards with cinematography dialog |
| `storyboard` | `StoryboardFlow` | AI shot generation (Step 4) + manual shot editor + model selector |
| `assembly` | `AssemblyFlow` | NLE timeline, video preview monitor, TTS, asset library |
| `export` | `ExportFlow` | Render settings, export queue |

### 6.2 Shared State
- `useProject` hook loads project + narrative + vision board + shots + assets
- `useAssets(projectId)` loads characters, locations, props
- `selectedVideoModel` state passed to `handleGenerateVideo`

### 6.3 Asset Panel (Right Sidebar)
- Characters: name + thumbnail + metadata tags + Kling element status
- Locations: name + thumbnail
- Props: name + thumbnail
- Drag-drop into shot cards or timeline

---

## 7. Shot Data Model (`lib/types.ts`)

```typescript
interface Shot {
  id: number;
  projectId: number;
  order: number;
  title: string;
  description?: string | null;
  prompt?: string | null;
  shotType: ShotType;              // extreme_close_up → over_shoulder (13 types)
  cameraAngle: CameraAngle;       // eye_level → pov (8 types)
  cameraMovement: CameraMovement;   // static → arc (14 types)
  keyLight: LightingPreset;         // natural → hard_dramatic (13 presets)
  colorGrade?: string | null;
  cameraModel?: CameraModel | null;
  lensType?: LensType | null;
  focalLength?: FocalLength | null;
  cinemaAspectRatio?: CinemaAspectRatio | null;
  duration: number;                 // seconds (default 3)
  dialogueText?: string | null;
  notes?: string | null;
  sceneNumber?: number | null;
  sceneName?: string | null;
  status: ShotStatus;               // draft | generating | generated | approved | rejected
  generatedImageUrl?: string | null;
  generatedVideoUrl?: string | null;
  klingTaskId?: string | null;
  locationId?: number | null;
  characterIds?: number[] | null;
  propIds?: number[] | null;
  raccordNotes?: string | null;     // Continuity instructions for this shot
  transitionFromPrev?: string | null; // cut | match_cut | dissolve | fade | whip | j_cut | l_cut
}
```

### 7.1 Why So Many Fields?

A shot in Tex2Film is not just "a picture" — it is a **cinematographic instruction** to the AI. Every field maps to a real decision a director makes on set:
- `shotType` — What size? (ECU for emotion, wide for context)
- `cameraAngle` — Where is the camera? (low angle = power, high angle = vulnerability)
- `cameraMovement` — Is the camera moving? (static = contemplation, handheld = chaos)
- `keyLight` — What is the primary light source? (golden hour = romance, neon = urban)
- `cameraModel` — What camera body? (ARRI = warm filmic, RED = sharp digital)
- `lensType` + `focalLength` — What lens? (85mm = portrait compression, 14mm = environmental distortion)
- `cinemaAspectRatio` — What frame shape? (2.39:1 = epic, 4:3 = intimate/retro)

These fields are not decorative — they are **composed into the Kling prompt** by the prompt builder. Changing `cameraModel` from "arri_alexa_mini_lf" to "red_v_raptor" literally changes the color science described in the prompt.

---

## 8. API Routes Reference

### 8.1 Core Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/me` | GET | Current user session |
| `/api/auth/login` | POST | Passport local auth |
| `/api/auth/logout` | POST | Clear session |
| `/api/projects` | GET/POST | List / create projects |
| `/api/projects/{id}` | GET/PUT/DELETE | Project CRUD + shots nested |
| `/api/assets` | GET/POST | Asset CRUD (character/location/property) |
| `/api/media` | GET | Proxy/serve media files |
| `/api/setup` | POST | Push DB schema + seed users |

### 8.2 AI Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ai/script` | POST | Generate/expand script (streaming) |
| `/api/ai/script/import` | POST | Import external script |
| `/api/ai/director-brief` | POST | Generate director brief |
| `/api/ai/storyboard` | POST | Generate full shot list with cinematic rules |
| `/api/ai/storyboard/insert` | POST | Insert a single shot at position |
| `/api/ai/elements` | POST | Analyze + generate character elements |
| `/api/ai/analyze-character` | POST | Extract character metadata from image |
| `/api/ai/end-frame` | POST | Generate end-frame / title card |
| `/api/ai/tts` | POST | Text-to-speech generation |
| `/api/ai/sfx` | POST | Sound effect generation |
| `/api/ai/omni` | POST | Omni-modal AI (chat + image gen) |
| `/api/ai/omni/sessions` | GET/POST | Omni chat session management |
| `/api/generate` | POST | Direct Kling image/video generation |

### 8.3 Agent Bridge Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | Proxy to Python agent SSE stream |
| `/api/agent/{...}` | Various | REST bridge to FastAPI agent endpoints |

---

## 9. Cinematic AI System

### 9.1 The Problem with "Pretty Pictures"

Most AI image/video tools generate beautiful individual frames that make no sense together:
- Shot 1: Character enters from the left
- Shot 2: Same character enters from the right (screen direction broken)
- Shot 3: Character is holding a coffee cup
- Shot 4: Character is not holding a coffee cup (continuity error)

Tex2Film solves this by making the AI **plan the edit** before generating any pixels.

### 9.2 Shot Type Prompts (`lib/kling/prompt-builder.ts`)

Each shot type has a cinematic description used in both:
- The Kling image prompt (to guide the visual generation)
- The storyboard LLM system prompt (to guide shot planning)

Examples:
- **Wide:** "character and world in dialogue, deliberate mise-en-scène, spatial relationship between figure and environment"
- **ECU:** "intimate detail, shallow depth of field isolating texture and emotion, microscopic visual world"
- **Establishing:** "spatial geography established before human presence, audience oriented in the world"
- **Cutaway:** "emotional punctuation or detail magnification, bridging visual gap between shots"
- **OTS:** "subjective spatial anchoring, viewer placed behind one character looking at another"

These descriptions use **film studies terminology** (mise-en-scène, spatial anchoring, emotional punctuation) because Kling's models were trained on diverse visual data and respond well to domain-specific language.

### 9.3 Storyboard LLM Rules (`app/api/ai/storyboard/route.ts`)

The AI is instructed with strict directing rules:

1. **Progressive Revelation** — Each shot must reveal NEW information. Never show the same information twice.
2. **No Gesture Repetition** — If a hand raises in Shot A, Shot B shows the RESULT (hand already up), not the full motion again.
3. **Cut-on-Action** — Cut DURING a movement, not before it starts or after it finishes.
4. **Match-Cut Continuity** — Subject position and screen direction must match across adjacent shots.
5. **180° Rule** — Maintain consistent axis of action. If crossing the axis, use an insert as a "bridge."
6. **J-Cuts & L-Cuts** — Audio leads video (J-cut) or video leads audio (L-cut).
7. **Emotional Rhythm** — Action sequences: 2-3s cuts. Contemplative: 5-7s longer takes.
8. **Reveal Shots** — Start with empty or partial frame, then reveal subject for suspense.
9. **Counter-Movement** — Alternate camera movement directions for visual variety.
10. **Negative Space** — Use empty frame composition for psychological distance or isolation.

### 9.4 Transition Badges (UI)

Shot cards display amber badges for transition types:
- `Cut` — Hard cut (default)
- `Match Cut` — Visual match across scene change
- `Dissolve` — Gradual fade
- `Fade` — Fade in/out
- `Whip` — Whip pan
- `J-Cut` — Audio precedes video
- `L-Cut` — Video precedes audio

These are not just labels — they are **editing instructions**. The assembly AI uses them to suggest audio overlaps and visual pacing.

---

## 10. Asset & Element System

### 10.1 Asset Types

| Type | Stored In | Kling Integration |
|------|-----------|-------------------|
| `character` | `assets` table | `kling_element_id` for consistent video appearance |
| `location` | `assets` table | Used in shot prompts for environmental context |
| `property` | `assets` table | Used in shot `prop_ids` for object placement |

### 10.2 Character Metadata Schema (`assets.metadata` JSONB)

```json
{
  "age": "25",
  "sex": "female",
  "hair": "long dark brown wavy",
  "build": "slender athletic",
  "clothing": "vintage 1970s denim jacket, white t-shirt",
  "ethnicity": "persian",
  "distinguishing": "small scar above left eyebrow, silver ring on right hand",
  "vibe": "melancholic but determined, tired eyes"
}
```

**Field semantics:**
- `age` — Numeric age or range ("mid-30s")
- `sex` — Biological sex for physical description (not gender identity)
- `hair` — Full hair description including color, length, texture, style
- `build` — Body type (slender, athletic, heavyset, etc.)
- `clothing` — Specific garments and era/style
- `ethnicity` — For accurate facial feature representation
- `distinguishing` — Unique identifying marks (scars, tattoos, jewelry)
- `vibe` — Emotional aura — the most important field for performance direction

The `vibe` field is **extracted by the AI** during character analysis (`POST /api/ai/analyze-character`) from the uploaded image. It captures the "energy" of the character — sad, determined, exhausted, playful — and is injected into every shot prompt to maintain emotional continuity.

### 10.3 Element Registration Flow

1. User uploads character images (frontal + up to 4 angle views)
2. `POST /api/ai/analyze-character` extracts metadata from frontal image
3. `POST /api/ai/elements` calls Kling `createElement` with all images
4. Kling returns `element_id` → stored in `assets.kling_element_id`
5. During video generation, pass `element_id` to maintain character consistency

---

## 11. Credit & Tier System

| Tier | Monthly Credits | Max Shots | Max Projects | Features |
|------|-----------------|-----------|--------------|----------|
| `free` | 50 | 10 | 3 | Basic AI, watermarked export |
| `pro` | 200 | 50 | 10 | Full AI, HD export |
| `studio` | 500 | 200 | 50 | 4K export, team sharing |
| `unlimited` | ∞ | ∞ | ∞ | All features, priority queue |

Credit costs:
- Image generation: 5-15 credits (depends on model)
- Video generation: 20-50 credits (depends on duration + model)
- TTS: 2 credits
- SFX: 3 credits
- Storyboard AI: 10 credits

Middleware: `requireAuth` + `checkLimit` in `lib/auth.ts`

---

## 12. Key Conventions & Patterns

### 12.1 File Naming
- Components: PascalCase (`AssemblyFlow.tsx`)
- API routes: kebab-case (`storyboard/route.ts`)
- Lib utilities: camelCase (`prompt-builder.ts`)
- Agent nodes: snake_case (`shot_breakdown.py`)

### 12.2 State Management
- Server state: TanStack Query (`useQuery`, `useMutation`)
- Local UI state: React `useState` + `useCallback`
- Global project state: `useProject` custom hook (fetches from `/api/projects/{id}`)

### 12.3 Bilingual UI
- Primary: Persian (Farsi) — all user-facing labels
- Technical: English — code, DB columns, API field names
- Farsi text uses proper RTL layout with `dir="rtl"` on containers

### 12.4 Video Playback in Timeline
- `<video ref={videoRef}>` inside monitor component
- `useEffect` syncs `video.currentTime` with timeline `currentTime - clip.startTime`
- Play/pause toggled via `video.play()` / `video.pause()`
- Video clips identified by blue badge with `Play` icon in timeline

### 12.5 Image Safety
- `SafeImage` component wraps all `<img>` tags
- Fallback gradient placeholder on load error
- Base64 data URLs supported alongside HTTP URLs

### 12.6 DB Column Naming
- Drizzle ORM uses camelCase in schema (`raccordNotes`) → snake_case in DB (`raccord_notes`)
- JSONB arrays stored as native arrays: `characterIds` → `character_ids jsonb`

---

## 13. Development Checklist

When adding a new feature:

1. **Schema** — Add column to `shared/schema.ts` + run `npx tsx lib/db-push.ts`
2. **Types** — Add to `lib/types.ts` if used in frontend
3. **API** — Add route in `app/api/ai/{feature}/route.ts` or `app/api/{feature}/route.ts`
4. **Agent** — If AI-powered, add node in `agent/nodes/{feature}.py` + wire in `graph.py`
5. **UI** — Add component in `components/flows/` or `components/ui/`
6. **Studio** — Wire into `app/studio/[id]/page.tsx` stage switcher
7. **Auth** — Add credit cost to tier limits in `lib/auth.ts`
8. **Test** — Verify via `GET /api/setup` then reload studio page

---

## 14. Common Pitfalls & Debugging

### 14.1 "Column does not exist" Error
**Symptom:** `DrizzleQueryError: column "x" does not exist`  
**Cause:** Schema updated but DB not migrated.  
**Fix:** `npx tsx lib/db-push.ts` or `POST /api/setup`

### 14.2 Kling "image_url" vs "image" Field
**Symptom:** Video generation fails with 400 Bad Request.  
**Cause:** Using `image_url` instead of `image` in the Kling payload.  
**Fix:** Change payload field to `image`. See `lib/kling/client.ts` line ~260.

### 14.3 LangGraph "Thread not found" Error
**Symptom:** Agent resume fails with thread ID not found.  ┌**Cause:** PostgreSQL checkpoint table (`checkpoints`) was cleared or thread expired.  
**Fix:** The user must start a new run. Checkpoints are durable but not eternal — Replit free tier may restart the DB container.

### 14.4 React "Invalid Hook Call" Warning
**Symptom:** Console warning about hooks called outside component body.  
**Cause:** Usually from a conditional hook or a hook inside a callback.  
**Fix:** Run `npm ls react` to check for duplicate React versions. If two copies exist, dedupe with `npm dedupe`.

### 14.5 "TDZ" Error in AssemblyFlow
**Symptom:** `ReferenceError: Cannot access 'currentClip' before initialization`  
**Cause:** `useEffect` references a variable declared later in the component.  
**Fix:** Move the variable declaration (or the `useEffect`) so the variable is initialized before the hook runs.

---

## 15. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AI_INTEGRATIONS_OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `AI_INTEGRATIONS_OPENROUTER_BASE_URL` | No | Default: `https://openrouter.ai/api/v1` |
| `KLING_ACCESS_KEY` | Yes | Kling API access key (video account) |
| `KLING_SECRET_KEY` | Yes | Kling API secret key (video account) |
| `KLING_IMAGE_ACCESS_KEY` | Yes | Kling API access key (image account) |
| `KLING_IMAGE_SECRET_KEY` | Yes | Kling API secret key (image account) |
| `LANGSMITH_API_KEY` | No | LangSmith tracing (auto-enabled if present) |
| `AGENT_INTERNAL_TOKEN` | No | Optional shared secret for agent API |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob for file storage |

---

*End of blueprint. For questions about specific modules, grep the relevant file using the paths above.*
