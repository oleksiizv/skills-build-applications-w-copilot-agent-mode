import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamItem = { name: string; members: string[] };

export default function Teams() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await getJson<{ teams: TeamItem[] }>('/api/teams');
        if (!cancelled) {
          setTeams(response.teams ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setTeams([]);
          setError(err instanceof Error ? err.message : 'Unable to load teams');
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
      title="Teams"
      description="Manage teams and members."
      loading={loading}
      error={error}
      emptyMessage="No teams"
      items={teams.map((team) => (
        <li key={team.name}>
          <strong>{team.name}</strong> • {team.members.join(', ') || 'No members'}
        </li>
      ))}
    />
  );
}
