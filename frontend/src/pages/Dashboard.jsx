import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLogOut, FiBriefcase } from 'react-icons/fi';
import { useAuthStore } from '../store/useAuthStore';
import { useJobStore } from '../store/useJobStore';
import { useFilterStore } from '../store/useFilterStore';
import JobCard from '../components/JobCard';
import FilterPanel from '../components/FilterPanel';
import SmartApplyModal from '../components/SmartApplyModal';

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [bestMatches, setBestMatches] = useState([]);
    const [applyModalJob, setApplyModalJob] = useState(null);

    const navigate = useNavigate();
    const logout = useAuthStore((state) => state.logout);
    const { jobsWithMatches, fetchJobsWithMatches, getBestMatches, createApplication } = useJobStore();
    const { applyFilters } = useFilterStore();

    useEffect(() => {
        loadJobs();
    }, []);

    useEffect(() => {
        // Apply filters whenever jobs or filters change
        const filtered = applyFilters(jobsWithMatches);
        setFilteredJobs(filtered);
        setBestMatches(getBestMatches());
    }, [jobsWithMatches, applyFilters, getBestMatches]);

    const loadJobs = async () => {
        setLoading(true);
        try {
            await fetchJobsWithMatches();
        } catch (error) {
            console.error('Failed to load jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleApply = (job) => {
        // Open job link in new tab
        window.open(job.applyUrl, '_blank');

        // Show modal after a delay (simulating user returning)
        setTimeout(() => {
            setApplyModalJob(job);
        }, 2000);
    };

    const handleApplyModalSubmit = async (status) => {
        if (status === 'applied' || status === 'applied_earlier') {
            try {
                await createApplication(
                    applyModalJob.id,
                    applyModalJob.title,
                    applyModalJob.company,
                    'applied'
                );
            } catch (error) {
                console.error('Failed to create application:', error);
            }
        }
        setApplyModalJob(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading jobs and analyzing matches...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">AI Job Tracker</h1>
                        <div className="flex items-center gap-4">
                            <Link
                                to="/applications"
                                className="flex items-center gap-2 text-gray-700 hover:text-primary-600"
                            >
                                <FiBriefcase className="w-5 h-5" />
                                <span>My Applications</span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-gray-700 hover:text-red-600"
                            >
                                <FiLogOut className="w-5 h-5" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Filters Sidebar */}
                    <div className="lg:col-span-1">
                        <FilterPanel />
                    </div>

                    {/* Jobs Feed */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Best Matches Section */}
                        {bestMatches.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                    🎯 Best Matches for You
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {bestMatches.slice(0, 6).map((job) => (
                                        <JobCard key={job.id} job={job} onApply={handleApply} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* All Jobs Section */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                All Jobs ({filteredJobs.length})
                            </h2>
                            {filteredJobs.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-lg">
                                    <p className="text-gray-600">No jobs match your filters. Try adjusting them.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {filteredJobs.map((job) => (
                                        <JobCard key={job.id} job={job} onApply={handleApply} />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>

            {/* Smart Apply Modal */}
            {applyModalJob && (
                <SmartApplyModal
                    job={applyModalJob}
                    onClose={() => setApplyModalJob(null)}
                    onSubmit={handleApplyModalSubmit}
                />
            )}
        </div>
    );
}
