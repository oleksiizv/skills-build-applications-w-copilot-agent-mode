import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStatusError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function expectValidId(value: string, label: string) {
  if (!mongoose.isValidObjectId(value)) {
    throw getStatusError(`${label} must be a valid Mongo ObjectId`, 400);
  }
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!isObject(input)) {
    throw getStatusError('Activity payload is required', 400);
  }

  const userId = String(input.userId ?? '');
  const teamId = String(input.teamId ?? '');
  const type = String(input.type ?? '').trim();
  const minutesValue = Number(input.minutes);

  if (!userId || !teamId || !type || !Number.isFinite(minutesValue) || minutesValue <= 0) {
    throw getStatusError('Activity requires userId, teamId, type, and positive minutes', 400);
  }

  try {
    expectValidId(userId, 'userId');
    expectValidId(teamId, 'teamId');
  } catch (error) {
    if (error instanceof Error && 'status' in (error as object)) {
      throw error;
    }
    throw getStatusError('Activity references must be valid IDs', 400);
  }

  const user = await User.findById(userId);
  const team = await Team.findById(teamId);

  if (!user || !team) {
    throw getStatusError('Activity references must match an existing user and team', 400);
  }

  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes: minutesValue,
    points: minutesValue,
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!isObject(input)) {
    throw getStatusError('Team payload is required', 400);
  }

  const name = String(input.name ?? '').trim();
  const mascot = String(input.mascot ?? '').trim();
  const members = Array.isArray(input.members) ? input.members.map((member) => String(member)) : [];

  if (!name) {
    throw getStatusError('Team name is required', 400);
  }

  if (!mascot) {
    throw getStatusError('Team mascot is required', 400);
  }

  const team = await Team.create({
    name,
    mascot,
    members: members.map((member) => member),
  });

  return team.toObject();
}

export async function getLeaderboard() {
  const rows = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);

  const teamIds = rows.map((row) => row._id);
  const teams = await Team.find({ _id: { $in: teamIds } }).lean();
  const byId = new Map(teams.map((team) => [team._id.toString(), team.name]));

  return rows.map((row, index) => ({
    teamName: byId.get(row._id.toString()) ?? 'Unknown team',
    totalPoints: row.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim() }).lean();
  if (!user) {
    throw getStatusError('User not found', 404);
  }

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const preferredFocus = recentActivity?.type ?? user.fitnessGoal;
  const workoutMatches = await Workout.find({ focus: { $in: [preferredFocus, user.fitnessGoal] } }).sort({ minutes: -1 }).lean();

  if (workoutMatches.length === 0) {
    return [];
  }

  const recommendations = workoutMatches.map((workout) => ({
    ...workout,
    reason: recentActivity
      ? `Based on your recent ${recentActivity.type} activity, this ${workout.focus} workout fits your current pattern.`
      : `Your fitness goal is ${user.fitnessGoal}, so this ${workout.focus} workout matches your plan.`,
  }));

  return recommendations;
}

export { User };
