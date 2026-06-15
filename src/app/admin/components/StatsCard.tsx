"use client";

import type { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
}

export function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div className="stats-card">
      <div className="stats-card__accent" style={{ background: color }} />
      <div className="stats-card__body">
        <div className="stats-card__header">
          <span className="stats-card__title">{title}</span>
          <span className="stats-card__icon" style={{ color }}>{icon}</span>
        </div>
        <span className="stats-card__value">{value.toLocaleString()}</span>
      </div>

      <style jsx global>{`
        .stats-card {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-card-border);
          border-radius: 12px;
          display: flex;
          overflow: hidden;
          transition: box-shadow 0.15s;
        }
        .stats-card:hover {
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }
        .stats-card__accent {
          width: 4px;
          flex-shrink: 0;
        }
        .stats-card__body {
          padding: 1.25rem 1.5rem;
          flex: 1;
        }
        .stats-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .stats-card__title {
          font-family: var(--font-body);
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .stats-card__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.8;
        }
        .stats-card__value {
          font-family: var(--font-heading);
          font-size: 2rem;
          font-weight: 600;
          color: var(--admin-text);
          line-height: 1;
        }
      `}</style>
    </div>
  );
}
