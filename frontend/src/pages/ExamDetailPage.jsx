import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';

export default function ExamDetailPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { getExamDetail } = useApi();
  const { user } = useAuth();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    fetchExamDetail();
  }, [examId, user]);

  const fetchExamDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getExamDetail(examId);
      setExam(data);
    } catch (err) {
      console.error('Failed to fetch exam detail:', err);
      setError(err.message || '問題の詳細を取得できませんでした');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="text-center">
              <div className="text-red-600 mb-4">⚠️ エラー</div>
              <p className="text-gray-700 mb-4">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                検索画面に戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="text-center">
              <p className="text-gray-700 mb-4">問題が見つかりませんでした</p>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                検索画面に戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-4">
          <button
            onClick={() => navigate('/')}
            className="text-primary-600 hover:text-primary-700 flex items-center"
          >
            ← 検索画面に戻る
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {exam.title || `問題 ${exam.id}`}
                </h1>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="px-2 py-1 bg-gray-100 rounded">
                    {exam.year}年 {exam.examType}
                  </span>
                  {exam.subject && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {exam.subject}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">問題ID</div>
                <div className="font-mono text-lg">{exam.id}</div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {exam.questionImage ? (
              <div className="mb-6">
                <img 
                  src={exam.questionImage ? encodeURI(exam.questionImage) : ''} 
                  alt="問題画像"
                  className="max-w-full h-auto rounded-lg shadow-sm"
                  onError={(e) => {
                    console.error('Image load error:', e);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">問題文</h2>
                <div className="prose max-w-none">
                  <div 
                    className="text-gray-700"
                    dangerouslySetInnerHTML={{ __html: exam.questionText }}
                  />
                </div>
              </div>
            )}

            {exam.choices && exam.choices.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">選択肢</h2>
                <div className="space-y-2">
                  {exam.choices.map((choice, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg border ${
                        exam.answer && exam.answer.toLowerCase() === choice.label 
                          ? 'bg-green-50 border-green-300'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <span className="font-semibold mr-2">
                        {choice.label}.
                      </span>
                      <div 
                        className="inline"
                        dangerouslySetInnerHTML={{ 
                          __html: typeof choice === 'string' ? choice : choice.text 
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-3">解答・解説</h2>
              
              {exam.answer && (
                <div className="mb-4">
                  <span className="font-semibold">正答: </span>
                  <span className="text-green-600 font-bold text-lg">
                    {exam.answer}
                  </span>
                </div>
              )}

              {exam.explanation && (
                <div className="mb-4">
                  <h3 className="font-semibold text-md mb-2">解法の要点</h3>
                  <div 
                    className="prose max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: exam.explanation }}
                  />
                </div>
              )}

              {exam.majorFindings && (
                <div className="mb-4">
                  <h3 className="font-semibold text-md mb-2">主要所見</h3>
                  <div 
                    className="prose max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: exam.majorFindings }}
                  />
                </div>
              )}

              {exam.imageDiagnosis && (
                <div className="mb-4">
                  <h3 className="font-semibold text-md mb-2">画像診断</h3>
                  <div 
                    className="prose max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: exam.imageDiagnosis }}
                  />
                </div>
              )}

              {exam.points && (
                <div className="mb-4">
                  <h3 className="font-semibold text-md mb-2">ポイント</h3>
                  <div 
                    className="prose max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: exam.points }}
                  />
                </div>
              )}

              {exam.diagnosis && (
                <div className="mb-4">
                  <h3 className="font-semibold text-md mb-2">診断</h3>
                  <div className="text-gray-700">{exam.diagnosis}</div>
                </div>
              )}

              {exam.allChoiceExplanation && (
                <div className="mb-4">
                  <h3 className="font-semibold text-md mb-2">選択肢解説（全体）</h3>
                  <div 
                    className="prose max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: exam.allChoiceExplanation }}
                  />
                </div>
              )}

              {exam.choiceExplanations && Object.keys(exam.choiceExplanations).length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-md mb-2">選択肢解説（個別）</h3>
                  <div className="space-y-3">
                    {Object.entries(exam.choiceExplanations)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([choiceLabel, explanation]) => (
                      <div key={choiceLabel} className="border-l-4 border-gray-300 pl-4">
                        <div className="font-medium text-sm mb-1">選択肢 {choiceLabel}:</div>
                        <div 
                          className="text-gray-700 text-sm"
                          dangerouslySetInnerHTML={{ __html: explanation }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!exam.explanation && !exam.majorFindings && !exam.imageDiagnosis && 
               !exam.points && !exam.diagnosis && !exam.allChoiceExplanation &&
               (!exam.choiceExplanations || Object.keys(exam.choiceExplanations).length === 0) && (
                <p className="text-gray-500">解説はありません</p>
              )}
            </div>

            {exam.keywords && (
              <div className="border-t pt-6 mt-6">
                <h2 className="text-lg font-semibold mb-3">キーワード</h2>
                <div className="flex flex-wrap gap-2">
                  {exam.keywords.split(',').map((keyword, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {keyword.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {exam.sourceUrl && (
              <div className="border-t pt-6 mt-6">
                <a 
                  href={exam.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary-600 hover:text-primary-700"
                >
                  <span className="mr-2">📄</span>
                  元のスプレッドシートを開く
                  <span className="ml-1">↗</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}