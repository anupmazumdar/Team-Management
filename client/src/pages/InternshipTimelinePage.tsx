import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { InternshipPeriod } from '../types';
import { InternshipTracker } from '../components/internship/InternshipTracker';

export const InternshipTimelinePage: React.FC = () => {
  const { activeTeam } = useAuth();
  const [periods, setPeriods] = useState<InternshipPeriod[]>([]);
  const [stats, setStats] = useState<{
    totalMilestones: number;
    completedMilestones: number;
    overallPercentage: number;
  }>({ totalMilestones: 0, completedMilestones: 0, overallPercentage: 0 });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRoadmap = async () => {
    if (!activeTeam) return;
    setLoading(true);
    try {
      const res = await api.get(`/internship/${activeTeam.teamId}`);
      setPeriods(res.data?.periods || []);
      setStats(res.data?.stats || { totalMilestones: 0, completedMilestones: 0, overallPercentage: 0 });
    } catch (err) {
      console.error('Failed to load internship roadmap:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, [activeTeam?.teamId]);

  return (
    <div className="space-y-6">
      <InternshipTracker
        periods={periods}
        stats={stats}
        onUpdate={fetchRoadmap}
      />
    </div>
  );
};
