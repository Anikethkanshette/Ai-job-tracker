import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { useJobStore } from '../store/useJobStore';

export default function Applications() {
    const [applications, setApplications] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const { fetchApplications, updateApplicationStatus } = useJobStore();

    useEffect(() => {
        loadApplications();
    }, []);

    const loadApplications = async () => {
        setLoading(true);
        try {
            const apps = await fetchApplications();
            setApplications(apps);
        } catch (error) {
            console.error('Failed to load applications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (appId, newStatus) => {
        try {
            await updateApplicationStatus(appId, newStatus);
            await loadApplications();
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'applied':
                return <FiClock className="w-5 h-5 text-blue-600" />;
            case 'interview':
                return <FiClock className="w-5 h-5 text-yellow-600" />;
            case 'offer':
                return <FiCheckCircle className="w-5 h-5 text-green-600" />;
            case 'rejected':
                return <FiXCircle className="w-5 h-5 text-red-600" />;
            default:
                return null;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'applied':
                return 'bg-blue-100 text-blue-800';
            case 'interview':
                return 'bg-yellow-100 text-yellow-800';
            case 'offer':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredApplications = filter === 'all'
        ? applications
        : applications.filter(app => app.status === filter);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                            <FiArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {['all', 'applied', 'interview', 'offer', 'rejected'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg font-medium capitalize ${filter === status
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {status === 'all' ? 'All' : status}
                        </button>
                    ))}
                </div>

                {/* Applications List */}
                {filteredApplications.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg">
                        <p className="text-gray-600">
                            {filter === 'all'
                                ? "You haven't applied to any jobs yet. Start applying from the dashboard!"
                                : `No applications with status "${filter}"`}
                        </p>
                        <Link to="/dashboard" className="btn-primary mt-4 inline-block">
                            Browse Jobs
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredApplications.map((app) => (
                            <div key={app.id} className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                                            {app.jobTitle}
                                        </h3>
                                        <p className="text-lg text-gray-700">{app.company}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(app.status)}
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(app.status)}`}>
                                            {app.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 mb-4">
                                    Applied: {new Date(app.appliedAt).toLocaleDateString()}
                                </div>

                                {/* Timeline */}
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Timeline:</p>
                                    <div className="space-y-2">
                                        {app.timeline.map((event, index) => (
                                            <div key={index} className="flex items-start gap-2 text-sm">
                                                <div className="w-2 h-2 bg-primary-600 rounded-full mt-1.5"></div>
                                                <div>
                                                    <span className="font-medium capitalize">{event.status}</span>
                                                    <span className="text-gray-500 ml-2">
                                                        {new Date(event.date).toLocaleDateString()}
                                                    </span>
                                                    {event.note && (
                                                        <p className="text-gray-600 text-xs mt-1">{event.note}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Status Update */}
                                <div className="flex gap-2">
                                    <select
                                        value={app.status}
                                        onChange={(e) => handleStatusUpdate(app.id, e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    >
                                        <option value="applied">Applied</option>
                                        <option value="interview">Interview</option>
                                        <option value="offer">Offer</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
