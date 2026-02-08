import { FiMapPin, FiBriefcase, FiClock } from 'react-icons/fi';
import MatchBadge from './MatchBadge';
import { useJobStore } from '../store/useJobStore';

export default function JobCard({ job, onApply }) {
    const isJobApplied = useJobStore((state) => state.isJobApplied);
    const applied = isJobApplied(job.id);

    const formatDate = (date) => {
        const d = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    };

    return (
        <div className="card animate-slide-up">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{job.title}</h3>
                    <p className="text-lg text-gray-700 font-medium">{job.company}</p>
                </div>
                {job.matchScore !== undefined && (
                    <MatchBadge score={job.matchScore} explanation={job.matchExplanation} />
                )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                    <FiMapPin className="w-4 h-4" />
                    {job.location}
                </div>
                <div className="flex items-center gap-1">
                    <FiBriefcase className="w-4 h-4" />
                    {job.jobType} · {job.workMode}
                </div>
                <div className="flex items-center gap-1">
                    <FiClock className="w-4 h-4" />
                    {formatDate(job.postedDate)}
                </div>
            </div>

            <p className="text-gray-700 mb-4 line-clamp-3">{job.description}</p>

            <div className="flex flex-wrap gap-2 mb-4">
                {job.skills.slice(0, 5).map((skill, index) => (
                    <span
                        key={index}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                    >
                        {skill}
                    </span>
                ))}
                {job.skills.length > 5 && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        +{job.skills.length - 5} more
                    </span>
                )}
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => onApply(job)}
                    disabled={applied}
                    className={`flex-1 ${applied
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'btn-primary'
                        }`}
                >
                    {applied ? 'Applied' : 'Apply Now'}
                </button>
                <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                >
                    View Details
                </a>
            </div>
        </div>
    );
}
