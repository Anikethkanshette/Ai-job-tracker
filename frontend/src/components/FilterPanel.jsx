import { useFilterStore } from '../store/useFilterStore';
import { FiX } from 'react-icons/fi';

export default function FilterPanel() {
    const { filters, updateFilters, resetFilters } = useFilterStore();

    const commonSkills = [
        'JavaScript', 'Python', 'React', 'Node.js', 'Java', 'TypeScript',
        'AWS', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'Go'
    ];

    const toggleSkill = (skill) => {
        const newSkills = filters.skills.includes(skill)
            ? filters.skills.filter(s => s !== skill)
            : [...filters.skills, skill];
        updateFilters({ skills: newSkills });
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Filters</h2>
                <button
                    onClick={resetFilters}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                    Reset All
                </button>
            </div>

            <div className="space-y-6">
                {/* Role Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role / Title
                    </label>
                    <input
                        type="text"
                        value={filters.role}
                        onChange={(e) => updateFilters({ role: e.target.value })}
                        placeholder="e.g. Software Engineer"
                        className="input-field text-sm"
                    />
                </div>

                {/* Skills Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Skills
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {filters.skills.map((skill) => (
                            <span
                                key={skill}
                                className="px-3 py-1 bg-primary-600 text-white rounded-full text-sm flex items-center gap-1"
                            >
                                {skill}
                                <button
                                    onClick={() => toggleSkill(skill)}
                                    className="hover:bg-primary-700 rounded-full p-0.5"
                                >
                                    <FiX className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {commonSkills.filter(s => !filters.skills.includes(s)).map((skill) => (
                            <button
                                key={skill}
                                onClick={() => toggleSkill(skill)}
                                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm"
                            >
                                + {skill}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Posted */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Posted
                    </label>
                    <select
                        value={filters.datePosted}
                        onChange={(e) => updateFilters({ datePosted: e.target.value })}
                        className="input-field text-sm"
                    >
                        <option value="any">Any time</option>
                        <option value="24h">Last 24 hours</option>
                        <option value="week">Last week</option>
                        <option value="month">Last month</option>
                    </select>
                </div>

                {/* Job Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Type
                    </label>
                    <select
                        value={filters.jobType}
                        onChange={(e) => updateFilters({ jobType: e.target.value })}
                        className="input-field text-sm"
                    >
                        <option value="any">Any</option>
                        <option value="full-time">Full-time</option>
                        <option value="part-time">Part-time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                    </select>
                </div>

                {/* Work Mode */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Work Mode
                    </label>
                    <select
                        value={filters.workMode}
                        onChange={(e) => updateFilters({ workMode: e.target.value })}
                        className="input-field text-sm"
                    >
                        <option value="any">Any</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="onsite">Onsite</option>
                    </select>
                </div>

                {/* Location */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                    </label>
                    <input
                        type="text"
                        value={filters.location}
                        onChange={(e) => updateFilters({ location: e.target.value })}
                        placeholder="e.g. San Francisco"
                        className="input-field text-sm"
                    />
                </div>

                {/* Match Score */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Match Score
                    </label>
                    <select
                        value={filters.matchScore}
                        onChange={(e) => updateFilters({ matchScore: e.target.value })}
                        className="input-field text-sm"
                    >
                        <option value="all">All matches</option>
                        <option value="high">High (70%+)</option>
                        <option value="medium">Medium (40-70%)</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
