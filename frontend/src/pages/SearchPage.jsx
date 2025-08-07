import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchForm from '../components/SearchForm';
import ExamList from '../components/ExamList';

export default function SearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchResults, setSearchResults] = useState({ results: [], total: 0 });
  const [searchLoading, setSearchLoading] = useState(false);

  const handleExamSelect = (exam) => {
    navigate(`/exam/${exam.id}`);
  };

  // 安全なURL パラメータ処理 - Base64エンコード使用（修正版）
  const encodeSearchState = (searchConditions) => {
    try {
      const state = {
        k: searchConditions.keyword || '',
        s: Array.isArray(searchConditions.subjects) ? searchConditions.subjects : [],
        e: Array.isArray(searchConditions.examCodes) ? searchConditions.examCodes : []
      };
      
      // 空の値は除外
      const cleanState = Object.entries(state).reduce((acc, [key, value]) => {
        if (value && (typeof value === 'string' ? value.trim() : value.length > 0)) {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      if (Object.keys(cleanState).length === 0) {
        return '';
      }
      
      const jsonString = JSON.stringify(cleanState);
      // TextEncoderを使用して安全にエンコード
      const encoder = new TextEncoder();
      const data = encoder.encode(jsonString);
      const base64 = btoa(String.fromCharCode(...data));
      return encodeURIComponent(base64); // URLセーフにする
    } catch (error) {
      console.error('Error encoding search state:', error);
      return '';
    }
  };

  const decodeSearchState = () => {
    try {
      const urlParams = new URLSearchParams(location.search);
      const encoded = urlParams.get('state');
      
      if (!encoded) {
        return { keyword: '', subjects: [], examCodes: [] };
      }
      
      // URLセーフなBase64をデコード
      const decoded = decodeURIComponent(encoded);
      const binary = atob(decoded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(bytes);
      const state = JSON.parse(jsonString);
      
      return {
        keyword: state.k || '',
        subjects: Array.isArray(state.s) ? state.s : [],
        examCodes: Array.isArray(state.e) ? state.e : []
      };
    } catch (error) {
      console.error('Error decoding search state:', error);
      return { keyword: '', subjects: [], examCodes: [] };
    }
  };

  const handleSearchWithParams = (results, searchConditions) => {
    setSearchResults(results);
    
    // 状態をURLに保存（Base64エンコード使用）
    try {
      const encoded = encodeSearchState(searchConditions);
      const newUrl = encoded 
        ? `${location.pathname}?state=${encoded}`
        : location.pathname;
      
      // pushStateを使用してURLを更新（React Routerを介さない）
      if (newUrl !== `${location.pathname}${location.search}`) {
        window.history.replaceState({}, '', newUrl);
      }
    } catch (error) {
      console.error('Error updating URL:', error);
    }
  };

  const getInitialSearchConditions = () => {
    return decodeSearchState();
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <SearchForm 
        onSearch={handleSearchWithParams}
        onLoading={setSearchLoading}
        onClearSelection={() => {}}
        initialConditions={getInitialSearchConditions()}
      />
      
      <div className="mt-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <ExamList 
            results={searchResults}
            loading={searchLoading}
            onSelectExam={handleExamSelect}
            selectedExamId={null}
          />
        </div>
      </div>
    </div>
  );
}