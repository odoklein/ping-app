"use client";

import { memo, useMemo } from "react";
import { ArrowRight, CheckCircle2, MessageSquareText, Mic2 } from "lucide-react";
import type { Aggregates, Meeting } from "../_types";
import { meetingStatus } from "../_lib/formatters";
import { Skeleton } from "./shared/Skeleton";
import { AnimatedNumber } from "./shared/AnimatedNumber";

interface IntelligenceStripProps {
  aggregates: Aggregates | null;
  meetings: Meeting[];
  loading: boolean;
  onApplyQuickPreset: (id: string) => void;
}

export const IntelligenceStrip = memo(function IntelligenceStrip({
  aggregates,
  meetings,
  loading,
  onApplyQuickPreset,
}: IntelligenceStripProps) {
  const priorities = useMemo(() => {
    const pending = meetings.filter(
      (meeting) => meetingStatus(meeting) === "upcoming" && meeting.confirmationStatus === "PENDING",
    ).length;
    const withoutFeedback = meetings.filter(
      (meeting) => meetingStatus(meeting) === "past" && !meeting.feedback,
    ).length;
    const withoutAudio = meetings.filter((meeting) => !meeting.callRecordingUrl?.trim()).length;
    return { pending, withoutFeedback, withoutAudio };
  }, [meetings]);

  if (loading) {
    return (
      <section className="rdv-focus-strip" aria-label="Chargement des priorités">
        <Skeleton w={180} h={42} r={10} />
        <Skeleton w={210} h={42} r={10} />
        <Skeleton w={180} h={42} r={10} />
      </section>
    );
  }

  return (
    <section className="rdv-focus-strip" aria-label="Priorités du manager">
      <div className="rdv-focus-intro">
        <span>À traiter</span>
        <strong>
          {priorities.pending > 0
            ? `${priorities.pending} confirmation${priorities.pending > 1 ? "s" : ""} en attente`
            : "Tout est à jour"}
        </strong>
      </div>

      <button type="button" className="rdv-focus-action is-primary" onClick={() => onApplyQuickPreset("to_confirm")}>
        <CheckCircle2 size={18} />
        <span><strong>{priorities.pending}</strong> à confirmer</span>
        <ArrowRight size={15} />
      </button>
      <button type="button" className="rdv-focus-action" onClick={() => onApplyQuickPreset("past_no_feedback")}>
        <MessageSquareText size={18} />
        <span><strong>{priorities.withoutFeedback}</strong> sans feedback</span>
        <ArrowRight size={15} />
      </button>
      <button type="button" className="rdv-focus-action" onClick={() => onApplyQuickPreset("no_audio")}>
        <Mic2 size={18} />
        <span><strong>{priorities.withoutAudio}</strong> sans audio</span>
        <ArrowRight size={15} />
      </button>

      <div className="rdv-focus-metrics">
        <span>
          <strong><AnimatedNumber value={aggregates?.conversionRate ?? 0} />%</strong>
          conversion
        </span>
        <span>
          <strong><AnimatedNumber value={aggregates?.meetingsThisWeek ?? 0} /></strong>
          cette semaine
        </span>
      </div>
    </section>
  );
});
