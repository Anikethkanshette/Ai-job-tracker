import { FiX } from 'react-icons/fi';

export default function SmartApplyModal({ job, onClose, onSubmit }) {
    if (!job) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                        Did you apply?
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <FiX className="w-6 h-6" />
                    </button>
                </div>

                <p className="text-gray-700 mb-6">
                    Did you apply to <strong>{job.title}</strong> at <strong>{job.company}</strong>?
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => onSubmit('applied')}
                        className="w-full btn-primary py-3"
                    >
                        Yes, I Applied
                    </button>
                    <button
                        onClick={() => onSubmit('browsing')}
                        className="w-full btn-secondary py-3"
                    >
                        No, Just Browsing
                    </button>
                    <button
                        onClick={() => onSubmit('applied_earlier')}
                        className="w-full btn-secondary py-3"
                    >
                        Applied Earlier
                    </button>
                </div>
            </div>
        </div>
    );
}
