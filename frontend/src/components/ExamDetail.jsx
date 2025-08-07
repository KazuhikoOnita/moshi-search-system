import React, { useState, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';

export default function ExamDetail({ exam }) {
  const { getExamDetail, getImageUrl } = useApi();
  const [examDetail, setExamDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (exam?.id) {
      fetchExamDetail(exam.id);
    } else {
      setExamDetail(null);
      setError(null);
    }
  }, [exam?.id]);

  const fetchExamDetail = async (examId) => {
    try {
      setLoading(true);
      setError(null);
      const detail = await getExamDetail(examId);
      setExamDetail(detail);
    } catch (error) {
      console.error('Failed to fetch exam detail:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!exam) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium mb-2">問題を選択してください</h3>
          <p className="text-sm">左側の検索結果から問題をクリックすると、詳細がここに表示されます</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 border-4 border-gray-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">問題詳細を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center text-red-600">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium mb-2">エラーが発生しました</h3>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchExamDetail(exam.id)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  const detail = examDetail || exam;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {detail.title}
            </h2>
            <p className="text-sm text-gray-600">{detail.id}</p>
          </div>
          <div className="text-sm text-gray-500">
            {detail.year}年度 • {detail.subject}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="space-y-6">
          {/* Question Text */}
          <section>
            <h3 className="text-md font-medium text-gray-900 mb-3">問題文</h3>
            <div 
              className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg border"
              dangerouslySetInnerHTML={{ 
                __html: detail.fullText || detail.questionText || '問題文が見つかりません' 
              }}
            />
          </section>

          {/* Choices */}
          {detail.choices && detail.choices.length > 0 && (
            <section>
              <h3 className="text-md font-medium text-gray-900 mb-3">選択肢</h3>
              <div className="space-y-2">
                {detail.choices.map((choice) => (
                  <div 
                    key={choice.label}
                    className={`p-3 rounded-lg border ${
                      choice.label === detail.answer 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                        choice.label === detail.answer
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {choice.label}
                      </span>
                      <div className="flex-1">
                        <div 
                          className="text-sm"
                          dangerouslySetInnerHTML={{ __html: choice.text }}
                        />
                        {choice.label === detail.answer && (
                          <div className="mt-1 text-xs text-green-600 font-medium">
                            ✓ 正答
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Answer */}
          {detail.answer && (
            <section>
              <h3 className="text-md font-medium text-gray-900 mb-3">正答</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <span className="text-green-800 font-medium">選択肢 {detail.answer}</span>
              </div>
            </section>
          )}

          {/* Explanation */}
          {detail.explanation && (
            <section>
              <h3 className="text-md font-medium text-gray-900 mb-3">解説</h3>
              <div 
                className="prose prose-sm max-w-none bg-blue-50 p-4 rounded-lg border border-blue-200"
                dangerouslySetInnerHTML={{ __html: detail.explanation }}
              />
            </section>
          )}

          {/* Diagnosis */}
          {detail.diagnosis && (
            <section>
              <h3 className="text-md font-medium text-gray-900 mb-3">診断</h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-purple-800">{detail.diagnosis}</p>
              </div>
            </section>
          )}

          {/* Keywords/Tags */}
          {detail.tags && detail.tags.length > 0 && (
            <section>
              <h3 className="text-md font-medium text-gray-900 mb-3">タグ</h3>
              <div className="flex flex-wrap gap-2">
                {detail.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Meta Information */}
          <section>
            <h3 className="text-md font-medium text-gray-900 mb-3">問題情報</h3>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">年度:</span>
                  <span className="ml-2 font-medium">{detail.year}年</span>
                </div>
                <div>
                  <span className="text-gray-600">科目:</span>
                  <span className="ml-2 font-medium">{detail.subject}</span>
                </div>
                <div>
                  <span className="text-gray-600">難易度:</span>
                  <span className="ml-2">{'★'.repeat(detail.difficulty)}{'☆'.repeat(5 - detail.difficulty)}</span>
                </div>
                {detail.answerRate && (
                  <div>
                    <span className="text-gray-600">正答率:</span>
                    <span className="ml-2 font-medium">{detail.answerRate}%</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}