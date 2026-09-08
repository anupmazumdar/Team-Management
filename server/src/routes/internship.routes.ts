import { Router, Request, Response } from 'express';
import { InternshipPeriod } from '@prisma/client';
import { prisma } from '../config/db.js';
import { authenticateToken, requireTeamRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

export const internshipRouter = Router();

internshipRouter.use(authenticateToken);

interface MilestoneItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

// Get 6-month internship roadmap for team
internshipRouter.get('/:teamId', requireTeamRole(['admin', 'lead', 'member']), async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    const periods = await prisma.internshipPeriod.findMany({
      where: { teamId },
      orderBy: { monthNumber: 'asc' },
    });

    // Compute overall statistics across all 6 months
    const totalMilestones = periods.reduce((acc: number, p: InternshipPeriod) => {
      const ms = Array.isArray(p.milestones) ? (p.milestones as unknown as MilestoneItem[]) : [];
      return acc + ms.length;
    }, 0);

    const completedMilestones = periods.reduce((acc: number, p: InternshipPeriod) => {
      const ms = Array.isArray(p.milestones) ? (p.milestones as unknown as MilestoneItem[]) : [];
      return acc + ms.filter((m: MilestoneItem) => m.completed).length;
    }, 0);

    const overallPercentage = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    return res.json({
      periods,
      stats: {
        totalMilestones,
        completedMilestones,
        overallPercentage,
      },
    });
  } catch (err) {
    console.error('Get internship roadmap error:', err);
    return res.status(500).json({ error: 'Failed to fetch internship roadmap.' });
  }
});

// Update period milestones / progress (lead or admin only)
internshipRouter.put('/:teamId/:periodId', requireTeamRole(['admin', 'lead']), async (req: Request, res: Response) => {
  try {
    const { teamId, periodId } = req.params;
    const { milestones, completionPercentage, status, monthTitle } = req.body;

    const period = await prisma.internshipPeriod.findFirst({
      where: { id: periodId, teamId },
    });

    if (!period) {
      return res.status(404).json({ error: 'Internship period not found.' });
    }

    // Auto-calculate completion percentage from milestones if provided
    let calculatedPercentage = completionPercentage;
    if (milestones && Array.isArray(milestones) && completionPercentage === undefined) {
      const msList = milestones as MilestoneItem[];
      const completedCount = msList.filter((m: MilestoneItem) => m.completed).length;
      calculatedPercentage = msList.length > 0 ? Math.round((completedCount / msList.length) * 100) : 0;
    }

    // Determine status automatically if complete
    let determinedStatus = status || period.status;
    if (calculatedPercentage === 100) {
      determinedStatus = 'COMPLETED';
    } else if (calculatedPercentage > 0 && determinedStatus === 'UPCOMING') {
      determinedStatus = 'IN_PROGRESS';
    }

    const updated = await prisma.internshipPeriod.update({
      where: { id: periodId },
      data: {
        ...(milestones !== undefined ? { milestones } : {}),
        ...(calculatedPercentage !== undefined ? { completionPercentage: calculatedPercentage } : {}),
        ...(determinedStatus ? { status: determinedStatus } : {}),
        ...(monthTitle ? { monthTitle } : {}),
      },
    });

    await logActivity({
      teamId,
      actorId: req.user!.id,
      action: 'INTERNSHIP_PROGRESS_UPDATED',
      details: {
        monthNumber: period.monthNumber,
        monthTitle: updated.monthTitle,
        completionPercentage: updated.completionPercentage,
        status: updated.status,
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error('Update internship period error:', err);
    return res.status(500).json({ error: 'Failed to update internship period.' });
  }
});
