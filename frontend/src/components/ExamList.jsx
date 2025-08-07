import React from 'react';
import { Link } from 'react-router-dom';

export default function ExamList({ results, loading, onSelectExam, selectedExamId }) {
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 border-4 border-gray-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">検索中...</p>
          </div>
        </div>
      </div>
    );
  }

  const { results: exams = [], total = 0 } = results;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">
          検索結果
        </h2>
        <p className="text-sm text-gray-600">
          {total.toLocaleString()}件の問題が見つかりました
        </p>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {exams.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <p className="mb-2">検索条件に一致する問題が見つかりませんでした</p>
            <p className="text-sm">検索条件を変更してお試しください</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {exams.map((exam) => (
              <ExamItem
                key={exam.id}
                exam={exam}
                isSelected={exam.id === selectedExamId}
                onClick={() => onSelectExam(exam)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExamItem({ exam, isSelected, onClick }) {
  const handleMouseDown = (e) => {
    // 左クリック（button 0）でかつ修飾キーが押されていない場合のみカスタム処理
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      onClick();
    }
    // その他の場合（右クリック、中クリック、Ctrl+クリックなど）はLinkのデフォルト動作を実行
  };

  return (
    <Link
      to={`/exam/${exam.id}`}
      className={`block p-4 transition-colors hover:bg-gray-50 ${
        isSelected ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
      }`}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-1 min-w-0">
          {/* Title and ID */}
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {exam.title}
            </h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {exam.id}
            </span>
          </div>

          {/* Preview */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {exam.preview}
          </p>

          {/* Meta info */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>{exam.year}年</span>
            <span>{exam.subject}</span>
            {exam.hasImage && (
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                画像
              </span>
            )}
          </div>

          {/* Tags */}
          {exam.tags && exam.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {exam.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
              {exam.tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{exam.tags.length - 3}個
                </span>
              )}
            </div>
          )}
        </div>

        {/* Open in new tab icon */}
        <div className="flex-shrink-0">
          <svg 
            className="w-5 h-5 text-gray-400 hover:text-primary-600 transition-colors" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </div>
    </Link>
  );
}