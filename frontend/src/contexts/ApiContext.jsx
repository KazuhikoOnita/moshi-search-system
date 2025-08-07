import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

const ApiContext = createContext();

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}

export function ApiProvider({ children }) {
  const { user } = useAuth();
  const API_BASE = import.meta.env.VITE_API_BASE || process.env.REACT_APP_API_BASE || 'http://localhost:8787';

  const apiCall = async (endpoint, options = {}) => {
    const url = `${API_BASE}/api${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  };

  const searchExams = async (params) => {
    return apiCall('/search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  };

  const getExamDetail = async (examId) => {
    try {
      const encodedId = encodeURIComponent(examId);
      return apiCall(`/exam/${encodedId}`);
    } catch (error) {
      console.error('Error fetching exam detail:', examId, error);
      throw error;
    }
  };

  const getImageUrl = (fileId) => {
    try {
      const encodedId = encodeURIComponent(fileId);
      return `${API_BASE}/api/images?id=${encodedId}`;
    } catch (error) {
      console.error('Error encoding file ID:', fileId, error);
      return '#'; // fallback
    }
  };

  const value = {
    searchExams,
    getExamDetail,
    getImageUrl,
    apiCall,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}