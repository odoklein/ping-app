import { NextRequest, NextResponse } from "next/server";
import { isParisTaskReminderSlot, sendTaskReminderDigests } from "@/lib/tasks/reminder-service";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    if (!isParisTaskReminderSlot(new Date())) {
      return NextResponse.json({ success: true, skipped: "Outside the 08:30 Europe/Paris weekday delivery slot" });
    }
    return NextResponse.json({ success: true, ...(await sendTaskReminderDigests()) });
  } catch (error) {
    console.error("Task reminder cron error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
