import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ApiProvider } from './contexts/ApiContext';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import SearchPage from './pages/SearchPage';
import ExamDetailPage from './pages/ExamDetailPage';
import { useAuth } from './contexts/AuthContext';

function AppContent() {
  const { user, loading } = useAuth();

  // Handle URL token on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      localStorage.setItem('auth_token', token);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.reload();
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/exam/:examId" element={<ExamDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ApiProvider>
          <AppContent />
        </ApiProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;