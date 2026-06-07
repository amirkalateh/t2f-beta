import { NextResponse } from "next/server";

export function parseProjectId(id: string): number | null {
  if (!/^\d+$/.test(id)) return null;
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function invalidProjectIdResponse() {
  return NextResponse.json(
    { error: "شناسه پروژه نامعتبر است", code: "INVALID_PROJECT_ID", detail: null },
    { status: 400 }
  );
}
