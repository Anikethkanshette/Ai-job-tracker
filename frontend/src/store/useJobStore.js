import { create } from 'zustand';
import api from '../services/api';

export const useJobStore = create((set, get) => ({
    jobs: [],
    jobsWithMatches: [],
    loading: false,
    error: null,
    applications: [],

    // Fetch jobs and their match scores
    fetchJobsWithMatches: async () => {
        set({ loading: true, error: null });
        try {
            // Fetch all jobs
            const jobsResponse = await api.get('/jobs');
            const jobs = jobsResponse.data.jobs;

            // Fetch match scores for all jobs
            const matchResponse = await api.post('/jobs/match-all');
            const matches = matchResponse.data.matches;

            // Combine jobs with their match data
            const jobsWithMatches = jobs.map(job => {
                const match = matches.find(m => m.jobId === job.id);
                return {
                    ...job,
                    matchScore: match?.score || 0,
                    matchExplanation: match?.explanation || null
                };
            });

            set({
                jobs,
                jobsWithMatches,
                loading: false
            });

            return jobsWithMatches;
        } catch (error) {
            set({
                error: error.response?.data?.error || 'Failed to fetch jobs',
                loading: false
            });
            throw error;
        }
    },

    // Get best matches (top 6-8 jobs by score)
    getBestMatches: () => {
        const { jobsWithMatches } = get();
        return jobsWithMatches
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 8);
    },

    // Fetch applications
    fetchApplications: async () => {
        try {
            const response = await api.get('/applications');
            set({ applications: response.data.applications });
            return response.data.applications;
        } catch (error) {
            console.error('Failed to fetch applications:', error);
            throw error;
        }
    },

    // Create application
    createApplication: async (jobId, jobTitle, company, status = 'applied') => {
        try {
            const response = await api.post('/applications', {
                jobId,
                jobTitle,
                company,
                status
            });

            // Refresh applications list
            await get().fetchApplications();

            return response.data.application;
        } catch (error) {
            console.error('Failed to create application:', error);
            throw error;
        }
    },

    // Update application status
    updateApplicationStatus: async (applicationId, status, note) => {
        try {
            const response = await api.patch(`/applications/${applicationId}`, {
                status,
                note
            });

            // Refresh applications list
            await get().fetchApplications();

            return response.data.application;
        } catch (error) {
            console.error('Failed to update application:', error);
            throw error;
        }
    },

    // Check if job is already applied
    isJobApplied: (jobId) => {
        const { applications } = get();
        return applications.some(app => app.jobId === jobId);
    }
}));
