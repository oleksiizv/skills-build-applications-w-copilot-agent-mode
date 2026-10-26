import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type ActivityItem = { type: string; minutes: number; points?: number };

export default function Activities() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await getJson<{ activities: ActivityItem[] }>('/api/activities');
        if (!cancelled) {
          setActivities(response.activities ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setActivities([]);
          setError(err instanceof Error ? err.message : 'Unable to load activities');
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
      title="Activities"
      description="Track student activity minutes and points."
      loading={loading}
      error={error}
      emptyMessage="No activities"
      items={activities.map((activity, index) => (
        <li key={`${activity.type}-${index}`}>
          {activity.type} • {activity.minutes} minutes • {activity.points ?? 0} points
        </li>
      ))}
    />
  );
}
