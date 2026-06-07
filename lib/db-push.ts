import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

export async function pushSchema() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name text;
  `);
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
  `);
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free';
  `);
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 50;
  `);
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL;
  `);

  await db.execute(sql`
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id varchar REFERENCES users(id) ON DELETE SET NULL;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamp NOT NULL,
      created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id serial PRIMARY KEY,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action text NOT NULL,
      credits_used integer NOT NULL DEFAULT 0,
      metadata jsonb,
      created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await db.execute(sql`
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS kling_element_id text;
  `);
  await db.execute(sql`
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS multi_shot_urls jsonb;
  `);
  await db.execute(sql`
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS angle_images jsonb;
  `);
  await db.execute(sql`
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT CURRENT_TIMESTAMP;
  `);

  await db.execute(sql`
    ALTER TABLE vision_shots ADD COLUMN IF NOT EXISTS location_id integer;
  `);
  await db.execute(sql`
    ALTER TABLE vision_shots ADD COLUMN IF NOT EXISTS character_ids jsonb;
  `);
  await db.execute(sql`
    ALTER TABLE vision_shots ADD COLUMN IF NOT EXISTS prop_ids jsonb;
  `);
  await db.execute(sql`
    ALTER TABLE vision_shots ADD COLUMN IF NOT EXISTS raccord_notes text;
  `);
  await db.execute(sql`
    ALTER TABLE vision_shots ADD COLUMN IF NOT EXISTS transition_from_prev text;
  `);

  await db.execute(sql`
    ALTER TABLE vision_shots ADD COLUMN IF NOT EXISTS lip_sync_status text DEFAULT 'none';
  `);
  await db.execute(sql`
    ALTER TABLE vision_shots ADD COLUMN IF NOT EXISTS lip_sync_task_id text;
  `);
  await db.execute(sql`
    ALTER TABLE vision_shots ADD COLUMN IF NOT EXISTS lip_sync_url text;
  `);
  await db.execute(sql`
    ALTER TABLE vision_shots ADD COLUMN IF NOT EXISTS dialogue_audio_url text;
  `);
  await db.execute(sql`
    ALTER TABLE narratives ADD COLUMN IF NOT EXISTS target_audience text;
  `);
  await db.execute(sql`
    ALTER TABLE narratives ADD COLUMN IF NOT EXISTS duration text;
  `);
  await db.execute(sql`
    ALTER TABLE vision_shots ADD COLUMN IF NOT EXISTS end_frame_url text;
  `);

  await db.execute(sql`
    ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS shot_id integer REFERENCES vision_shots(id) ON DELETE CASCADE;
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_audio_tracks_shot_id ON audio_tracks (shot_id);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS announcements (
      id serial PRIMARY KEY,
      title text NOT NULL,
      body text NOT NULL,
      icon text,
      priority text DEFAULT 'normal',
      active boolean DEFAULT true,
      created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at timestamp DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS announcement_reads (
      id serial PRIMARY KEY,
      announcement_id integer NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      read_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE(announcement_id, user_id)
    );
  `);

  await pool.end();
  return { success: true };
}

pushSchema().then(r => console.log(r)).catch(e => console.error(e));
