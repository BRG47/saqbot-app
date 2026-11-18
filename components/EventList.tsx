"use client";

import { eventWhen, useUpcomingEvents } from "../lib/client/events";
import { Stars } from "./ui";

export function EventList({ limit }: { limit?: number }) {
  const { data, isLoading } = useUpcomingEvents();
  const events = (data ?? []).slice(0, limit);
  return (
    <div className="panel" style={{ gap: 0 }}>
      <div className="row" style={{ paddingBottom: 4 }}>
        <h2 className="display" style={{ fontSize: 22 }}>Upcoming 5-star events</h2>
        <span className="tiny">Next 7 days</span>
      </div>
      {isLoading && <p className="small">Checking the calendar…</p>}
      {!isLoading && events.length === 0 && <p className="small">No big scheduled events this week. Quiet streets.</p>}
      {events.map((e) => (
        <div key={e.id} className="list-row">
          <span className="stack" style={{ gap: 0 }}>
            <strong style={{ fontSize: 15 }}>{e.title}</strong>
            <span className="tiny">{[e.detail, eventWhen(e.startsAt)].filter(Boolean).join(", ")}</span>
          </span>
          <Stars level={e.stars} size={15} />
        </div>
      ))}
      <p className="tiny" style={{ marginTop: 10 }}>
        Stars rate each event type by how much BTC has moved around it in the past. History is a guide to how loud it gets, not which way it goes.
      </p>
    </div>
  );
}
