import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import Login from './pages/Login';
import ResumeUpload from './pages/ResumeUpload';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import AIAssistant from './components/AIAssistant';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, verifyToken } = useAuthStore();

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Resume required route wrapper
function ResumeRequiredRoute({ children }) {
  const { user } = useAuthStore();

  if (!user?.hasResume) {
    return <Navigate to="/resume-upload" replace />;
  }

  return children;
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/resume-upload"
          element={
            <ProtectedRoute>
              <ResumeUpload />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ResumeRequiredRoute>
                <Dashboard />
              </ResumeRequiredRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/applications"
          element={
            <ProtectedRoute>
              <ResumeRequiredRoute>
                <Applications />
              </ResumeRequiredRoute>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* AI Assistant - Available on all protected pages */}
      <ProtectedRoute>
        <AIAssistant />
      </ProtectedRoute>
    </>
  );
}

export default App;
