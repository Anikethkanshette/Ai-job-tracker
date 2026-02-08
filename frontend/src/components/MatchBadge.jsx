export default function MatchBadge({ score, explanation }) {
    const getColorClass = () => {
        if (score >= 70) return 'bg-match-high text-white';
        if (score >= 40) return 'bg-match-medium text-white';
        return 'bg-match-low text-white';
    };

    const getLabel = () => {
        if (score >= 70) return 'High Match';
        if (score >= 40) return 'Medium Match';
        return 'Low Match';
    };

    return (
        <div className="group relative inline-block">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getColorClass()}`}>
                {score}% · {getLabel()}
            </div>

            {explanation && (
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 w-80">
                    <div className="bg-gray-900 text-white text-sm rounded-lg p-4 shadow-xl">
                        <p className="font-semibold mb-2">Match Analysis:</p>
                        {explanation.matchingSkills?.length > 0 && (
                            <div className="mb-2">
                                <span className="font-medium">Matching Skills: </span>
                                {explanation.matchingSkills.join(', ')}
                            </div>
                        )}
                        {explanation.relevantExperience && (
                            <div className="mb-2">
                                <span className="font-medium">Experience: </span>
                                {explanation.relevantExperience}
                            </div>
                        )}
                        {explanation.reasoning && (
                            <div className="text-gray-300 text-xs mt-2">
                                {explanation.reasoning}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
