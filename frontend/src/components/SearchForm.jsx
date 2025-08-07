import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../contexts/ApiContext';

export default function SearchForm({ onSearch, onLoading, onClearSelection, initialConditions = {} }) {
  const { searchExams } = useApi();
  const [keyword, setKeyword] = useState(initialConditions.keyword || '');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [subjects, setSubjects] = useState(initialConditions.subjects || []);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(true);
  const years = Array.from({ length: 8 }, (_, i) => 2024 - i);

  const examOptions = [
    { year: 2025, exams: [{ code: 'DR2506', name: 'プレ' }] },
    { year: 2024, exams: [
      { code: 'DR2404', name: 'CBT' },
      { code: 'DR2406', name: 'プレ' },
      { code: 'DR2401', name: '医師1' },
      { code: 'DR2402', name: '医師2' },
      { code: 'DR2403', name: '医師3' }
    ]},
    { year: 2023, exams: [
      { code: 'DR2306', name: 'プレ' },
      { code: 'DR2301', name: '医師1' },
      { code: 'DR2302', name: '医師2' },
      { code: 'DR2303', name: '医師3' }
    ]},
    { year: 2022, exams: [
      { code: 'DR2201', name: '医師1' },
      { code: 'DR2202', name: '医師2' },
      { code: 'DR2203', name: '医師3' }
    ]},
    { year: 2021, exams: [
      { code: 'DR2106', name: 'プレ' },
      { code: 'DR2101', name: '医師1' },
      { code: 'DR2102', name: '医師2' }
    ]},
    { year: 2020, exams: [
      { code: 'DR2006', name: 'プレ' },
      { code: 'DR2001', name: '医師1' }
    ]},
    { year: 2019, exams: [
      { code: 'DR1901', name: '医師1' }
    ]},
    { year: 2018, exams: [
      { code: 'DR1804', name: 'CBT' },
      { code: 'DR1801', name: '医師1' }
    ]}
  ];

  const allExamCodes = examOptions.flatMap(yearGroup => 
    yearGroup.exams.map(exam => exam.code)
  );
  
  // デフォルトで全ての模試を選択（初期条件があればそれを使用）
  const [selectedExams, setSelectedExams] = useState(
    initialConditions.examCodes && initialConditions.examCodes.length > 0 
      ? initialConditions.examCodes 
      : allExamCodes
  );

  // 分野オプションは模試の種類によって動的に変更
  const subjectOptions = useMemo(() => {
    const selectedExamTypes = selectedExams.map(code => code.slice(-2));
    
    // CBTが含まれているかチェック
    const hasCBT = selectedExamTypes.includes('04');
    
    if (hasCBT && selectedExamTypes.length === 1) {
      // CBTのみの場合
      return ['A', 'B', 'C', 'D', 'E', 'F', '多肢', '4連問'];
    } else if (hasCBT) {
      // CBTと他が混在する場合
      return [
        '消化管', '肝・胆・膵', '循環器', '代謝・内分泌', '腎', '免疫・膠原病',
        '血液', '感染症', '呼吸器', '神経', '中毒', '救急', '麻酔科', '眼科',
        '耳鼻咽喉科', '整形外科', '精神科', '皮膚科', '泌尿器科', '放射線科',
        '小児科', '産科', '婦人科', '乳腺外科', '老年医学', '公衆衛生', '医学総論',
        'A', 'B', 'C', 'D', 'E', 'F', '多肢', '4連問'
      ];
    } else {
      // 医師国試・プレのみの場合
      return [
        '消化管', '肝・胆・膵', '循環器', '代謝・内分泌', '腎', '免疫・膠原病',
        '血液', '感染症', '呼吸器', '神経', '中毒', '救急', '麻酔科', '眼科',
        '耳鼻咽喉科', '整形外科', '精神科', '皮膚科', '泌尿器科', '放射線科',
        '小児科', '産科', '婦人科', '乳腺外科', '老年医学', '公衆衛生', '医学総論'
      ];
    }
  }, [selectedExams]);

  // initialConditionsが変更された時にstateを更新
  useEffect(() => {
    try {
      if (initialConditions.keyword !== undefined) {
        setKeyword(initialConditions.keyword || '');
      }
      if (Array.isArray(initialConditions.subjects)) {
        setSubjects(initialConditions.subjects);
      }
      if (Array.isArray(initialConditions.examCodes) && initialConditions.examCodes.length > 0) {
        setSelectedExams(initialConditions.examCodes);
      }
    } catch (error) {
      console.error('Error processing initial conditions:', error);
    }
  }, [initialConditions]);

  // Initial search on mount
  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = async (page = 1) => {
    try {
      onLoading(true);
      onClearSelection();

      const params = {
        keyword: keyword.trim(),
        subjects: subjects.length > 0 ? subjects : undefined,
        examCodes: selectedExams.length > 0 && selectedExams.length < allExamCodes.length ? selectedExams : undefined,
        page,
        pageSize: 20,
      };
      
      console.log('Sending search params:', params);

      const results = await searchExams(params);
      
      // 検索条件も一緒にコールバックに渡す
      const searchConditions = {
        keyword: keyword.trim(),
        subjects: subjects.length > 0 ? subjects : [],
        examCodes: selectedExams.length > 0 && selectedExams.length < allExamCodes.length ? selectedExams : []
      };
      
      onSearch(results, searchConditions);
    } catch (error) {
      console.error('Search error:', error);
      alert(`検索エラー: ${error.message}`);
    } finally {
      onLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSubjectChange = (subject) => {
    setSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleExamChange = (examCode) => {
    setSelectedExams(prev => 
      prev.includes(examCode)
        ? prev.filter(code => code !== examCode)
        : [...prev, examCode]
    );
  };

  const handleSelectAllExams = () => {
    if (selectedExams.length === allExamCodes.length) {
      setSelectedExams([]);
    } else {
      setSelectedExams(allExamCodes);
    }
  };

  const handleSelectYearExams = (year) => {
    const yearExams = examOptions.find(y => y.year === year)?.exams.map(e => e.code) || [];
    const allYearExamsSelected = yearExams.every(code => selectedExams.includes(code));
    
    if (allYearExamsSelected) {
      setSelectedExams(prev => prev.filter(code => !yearExams.includes(code)));
    } else {
      setSelectedExams(prev => [...new Set([...prev, ...yearExams])]);
    }
  };


  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      {/* Basic Search */}
      <div className="flex space-x-3 mb-3">
        <div className="flex-1">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="キーワードを入力（分野、単元、年度など）"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>
        <button
          onClick={() => handleSearch()}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors text-sm"
        >
          🔍 検索
        </button>
      </div>

      {/* Advanced Search */}
      {isAdvancedOpen && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-md">
          {/* Exam Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">検索対象</label>
              <button
                onClick={handleSelectAllExams}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                {selectedExams.length === allExamCodes.length ? '□ すべて解除' : '☑ すべて選択'} ({selectedExams.length}/{allExamCodes.length})
              </button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
              {examOptions.map(yearGroup => (
                <div key={yearGroup.year} className="pb-1 border-b border-gray-100 last:border-0">
                  <div className="flex items-center mb-1">
                    <button
                      onClick={() => handleSelectYearExams(yearGroup.year)}
                      className="text-xs font-semibold text-gray-800 hover:text-primary-600"
                    >
                      {yearGroup.year}年
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 ml-2">
                    {yearGroup.exams.map(exam => (
                      <label key={exam.code} className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={selectedExams.includes(exam.code)}
                          onChange={() => handleExamChange(exam.code)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-3 h-3"
                        />
                        <span className="ml-1 text-gray-700">
                          {exam.name}（{exam.code}）
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分野</label>
            <div className="grid grid-cols-4 gap-x-3 gap-y-1 max-h-32 overflow-y-auto">
              {subjectOptions.map(subject => (
                <label key={subject} className="flex items-center text-xs">
                  <input
                    type="checkbox"
                    checked={subjects.includes(subject)}
                    onChange={() => handleSubjectChange(subject)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-3 h-3"
                  />
                  <span className="ml-1 text-gray-700 truncate">{subject}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}