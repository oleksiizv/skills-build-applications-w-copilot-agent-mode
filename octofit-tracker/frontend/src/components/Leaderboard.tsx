import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardItem = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await getJson<{ leaderboard: LeaderboardItem[] }>('/api/leaderboard');
        if (!cancelled) {
          setLeaderboard(response.leaderboard ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLeaderboard([]);
          setError(err instanceof Error ? err.message : 'Unable to load leaderboard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CapabilityCard
      title="Leaderboard"
      description="Compare team point totals."
      loading={loading}
      error={error}
      emptyMessage="No leaderboard"
      items={leaderboard.map((entry) => (
        <li key={`${entry.teamName}-${entry.rank}`}>
          #{entry.rank} {entry.teamName} — {entry.totalPoints} pts
        </li>
      ))}
    />
  );
}
