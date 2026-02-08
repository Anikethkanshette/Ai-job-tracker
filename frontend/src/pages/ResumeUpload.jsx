import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiFile, FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';

export default function ResumeUpload() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [analysis, setAnalysis] = useState(null);

    const navigate = useNavigate();
    const updateUser = useAuthStore((state) => state.updateUser);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (selectedFile) => {
        const validTypes = ['application/pdf', 'text/plain'];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Please upload a PDF or TXT file');
            return;
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB');
            return;
        }

        setFile(selectedFile);
        setError('');
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            await api.post('/resume/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Update user state
            updateUser({ hasResume: true });

            // Start analyzing resume
            setAnalyzing(true);
            const analysisResponse = await api.get('/resume/analyze');
            setAnalysis(analysisResponse.data.analysis);
            setAnalyzing(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to upload resume');
            setAnalyzing(false);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
            {/* Analyzing Loading State */}
            {analyzing && (
                <div className="flex items-center justify-center min-h-screen p-4">
                    <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Your Resume</h2>
                        <p className="text-gray-600">We're extracting your skills and finding the best job matches for you...</p>
                    </div>
                </div>
            )}

            {/* Analysis Results View */}
            {analysis && !analyzing && (
                <div className="flex items-center justify-center min-h-screen p-4">
                    <div className="max-w-2xl w-full">
                        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
                            {/* Success Header */}
                            <div className="text-center mb-8">
                                <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Analysis Complete!</h1>
                                <p className="text-gray-600">Here's what we learned about your career profile</p>
                            </div>

                            {/* Summary */}
                            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Profile</h2>
                                <p className="text-gray-700 mb-4">{analysis.summary}</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Experience Level</p>
                                        <p className="text-lg font-semibold text-primary-600 capitalize">
                                            {analysis.experienceLevel}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Years of Experience</p>
                                        <p className="text-lg font-semibold text-primary-600">
                                            {analysis.yearsOfExperience}+ years
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Key Skills */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Key Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.keySkills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Strengths */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Strengths</h3>
                                <ul className="space-y-2">
                                    {analysis.topStrengths.map((strength, index) => (
                                        <li key={index} className="flex items-start">
                                            <span className="text-green-500 mr-2">✓</span>
                                            <span className="text-gray-700">{strength}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Recommended Roles */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Recommended Job Roles</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {analysis.recommendedRoles.map((role, index) => (
                                        <div
                                            key={index}
                                            className="border border-primary-200 bg-primary-50 rounded-lg p-3 text-center"
                                        >
                                            <p className="text-gray-900 font-medium">{role}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Industry Fit */}
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Best Industries for You</h3>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.industryFit.map((industry, index) => (
                                        <span
                                            key={index}
                                            className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium"
                                        >
                                            {industry}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Continue Button */}
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-full btn-primary py-3 text-lg flex items-center justify-center gap-2"
                            >
                                <span>Explore Job Matches</span>
                                <FiArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Form View */}
            {!analysis && !analyzing && (
                <div className="flex items-center justify-center min-h-screen p-4">
                    <div className="max-w-2xl w-full">
                        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    Upload Your Resume
                                </h1>
                                <p className="text-gray-600">
                                    We'll analyze your resume to find the best job matches for you
                                </p>
                            </div>

                            <div
                                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${dragActive
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-300 hover:border-primary-400'
                                    }`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                {file ? (
                                    <div className="space-y-4">
                                        <FiFile className="w-16 h-16 text-primary-600 mx-auto" />
                                        <div>
                                            <p className="text-lg font-medium text-gray-900">{file.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {(file.size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setFile(null)}
                                            className="text-sm text-primary-600 hover:text-primary-700"
                                        >
                                            Choose different file
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <FiUpload className="w-16 h-16 text-gray-400 mx-auto" />
                                        <div>
                                            <p className="text-lg font-medium text-gray-700 mb-2">
                                                Drag and drop your resume here
                                            </p>
                                            <p className="text-sm text-gray-500 mb-4">
                                                or
                                            </p>
                                            <label className="btn-primary cursor-pointer inline-block">
                                                Browse Files
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept=".pdf,.txt"
                                                    onChange={handleChange}
                                                />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Supported formats: PDF, TXT (Max 10MB)
                                        </p>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {file && (
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="w-full mt-6 btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploading ? 'Uploading...' : 'Upload Resume'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
