import { create } from 'zustand';

// CENTRAL FILTER STATE - Critical for AI assistant integration
export const useFilterStore = create((set, get) => ({
    filters: {
        role: '',
        skills: [],
        datePosted: 'any',
        jobType: 'any',
        workMode: 'any',
        location: '',
        matchScore: 'all'
    },

    // Update filters (partial updates supported)
    updateFilters: (partialFilters) => {
        set((state) => ({
            filters: {
                ...state.filters,
                ...partialFilters
            }
        }));
    },

    // Reset all filters to default
    resetFilters: () => {
        set({
            filters: {
                role: '',
                skills: [],
                datePosted: 'any',
                jobType: 'any',
                workMode: 'any',
                location: '',
                matchScore: 'all'
            }
        });
    },

    // Apply filters to job list (client-side filtering)
    applyFilters: (jobs) => {
        const { filters } = get();

        return jobs.filter(job => {
            // Role filter
            if (filters.role && !job.title.toLowerCase().includes(filters.role.toLowerCase())) {
                return false;
            }

            // Skills filter
            if (filters.skills.length > 0) {
                const hasMatchingSkill = filters.skills.some(skill =>
                    job.skills.some(jobSkill =>
                        jobSkill.toLowerCase().includes(skill.toLowerCase())
                    )
                );
                if (!hasMatchingSkill) return false;
            }

            // Date posted filter
            if (filters.datePosted !== 'any') {
                const now = new Date();
                const jobDate = new Date(job.postedDate);
                const daysDiff = (now - jobDate) / (1000 * 60 * 60 * 24);

                switch (filters.datePosted) {
                    case '24h':
                        if (daysDiff > 1) return false;
                        break;
                    case 'week':
                        if (daysDiff > 7) return false;
                        break;
                    case 'month':
                        if (daysDiff > 30) return false;
                        break;
                }
            }

            // Job type filter
            if (filters.jobType !== 'any' && job.jobType !== filters.jobType) {
                return false;
            }

            // Work mode filter
            if (filters.workMode !== 'any' && job.workMode !== filters.workMode) {
                return false;
            }

            // Location filter
            if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) {
                return false;
            }

            // Match score filter (applied after jobs have match scores)
            if (filters.matchScore !== 'all' && job.matchScore !== undefined) {
                if (filters.matchScore === 'high' && job.matchScore < 70) {
                    return false;
                }
                if (filters.matchScore === 'medium' && (job.matchScore < 40 || job.matchScore >= 70)) {
                    return false;
                }
            }

            return true;
        });
    }
}));

// Expose filter store globally for AI assistant access
if (typeof window !== 'undefined') {
    window.filterStore = useFilterStore;
}
