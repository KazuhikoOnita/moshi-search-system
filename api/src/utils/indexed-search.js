import { GoogleDriveDB } from './google-drive.js';

export class IndexedSearchDB extends GoogleDriveDB {
  constructor(accessToken, folderId) {
    super(accessToken, folderId);
    this.fullIndex = null;
    this.indexCreatedAt = null;
    this.INDEX_TTL = 30 * 60 * 1000; // 30分
  }

  async buildIndex(env, userEmail) {
    console.log('Building search index...');
    const startTime = Date.now();
    
    try {
      const spreadsheets = await this.getAllSpreadsheets();
      console.log(`Building index from ${spreadsheets.length} spreadsheets`);
      
      const allExams = [];
      
      // 全データを一度に取得してインデックス化
      for (const spreadsheet of spreadsheets) {
        try {
          const exams = await this.searchInSpreadsheet(
            spreadsheet.id, 
            spreadsheet.name, 
            {} // 全データ取得
          );
          allExams.push(...exams);
        } catch (error) {
          console.error(`Error indexing ${spreadsheet.name}:`, error);
        }
      }
      
      this.fullIndex = allExams;
      this.indexCreatedAt = Date.now();
      
      // インデックスをKVにキャッシュ（6時間）
      const indexKey = `search_index:${userEmail}`;
      await env.EXAM_CACHE.put(indexKey, JSON.stringify({
        exams: allExams,
        createdAt: this.indexCreatedAt
      }), {
        expirationTtl: 21600 // 6時間
      });
      
      console.log(`Index built: ${allExams.length} exams in ${Date.now() - startTime}ms`);
      return allExams;
      
    } catch (error) {
      console.error('Error building index:', error);
      throw error;
    }
  }
  
  async getOrBuildIndex(env, userEmail) {
    // キャッシュからインデックスを取得
    const indexKey = `search_index:${userEmail}`;
    const cachedIndex = await env.EXAM_CACHE.get(indexKey, 'json');
    
    if (cachedIndex && cachedIndex.exams) {
      console.log(`Using cached index: ${cachedIndex.exams.length} exams`);
      this.fullIndex = cachedIndex.exams;
      this.indexCreatedAt = cachedIndex.createdAt;
      return this.fullIndex;
    }
    
    // インデックスが存在しないか古い場合は再構築
    if (!this.fullIndex || !this.indexCreatedAt || 
        (Date.now() - this.indexCreatedAt) > this.INDEX_TTL) {
      return await this.buildIndex(env, userEmail);
    }
    
    return this.fullIndex;
  }
  
  async fastSearch(params, env, userEmail) {
    const startTime = Date.now();
    
    // インデックスを取得
    const allExams = await this.getOrBuildIndex(env, userEmail);
    
    console.log(`Searching in index: ${allExams.length} exams`);
    console.log('Search params:', JSON.stringify(params));
    
    // インデックス内で高速検索
    let filtered = allExams;
    
    // 模試コードフィルタ（最初に適用）
    if (params.examCodes && params.examCodes.length > 0) {
      console.log(`Filtering by exam codes: ${params.examCodes.join(', ')}`);
      filtered = filtered.filter(exam => {
        // exam.idから模試コードを抽出
        // DR2401_001 → DR2401 または DR2401 → DR2401
        const examId = exam.id || '';
        const examCode = examId.includes('_') ? examId.split('_')[0] : examId.match(/^DR\d{4}/)?.[0];
        
        // デバッグ用ログ（最初の5件のみ）
        if (filtered.indexOf(exam) < 5) {
          console.log(`Exam ID: ${examId}, Extracted code: ${examCode}, Matching: ${params.examCodes.includes(examCode)}`);
        }
        
        return examCode && params.examCodes.includes(examCode);
      });
      console.log(`After exam code filter: ${filtered.length} exams`);
    }
    
    // キーワードフィルタ
    if (params.keyword && params.keyword.trim()) {
      const keyword = params.keyword.toLowerCase();
      console.log(`Filtering by keyword: "${keyword}"`);
      filtered = filtered.filter(exam => {
        return exam.title?.toLowerCase().includes(keyword) ||
               exam.questionText?.toLowerCase().includes(keyword) ||
               exam.keywords?.toLowerCase().includes(keyword) ||
               exam.subject?.toLowerCase().includes(keyword) ||
               exam.id?.toLowerCase().includes(keyword) ||
               exam.tags?.some(tag => tag.toLowerCase().includes(keyword));
      });
      console.log(`After keyword filter: ${filtered.length} exams`);
    }
    
    // 年度フィルタ
    if (params.yearFrom) {
      filtered = filtered.filter(exam => exam.year >= parseInt(params.yearFrom));
    }
    if (params.yearTo) {
      filtered = filtered.filter(exam => exam.year <= parseInt(params.yearTo));
    }
    
    // 分野フィルタ
    if (params.subjects && params.subjects.length > 0) {
      console.log(`Filtering by subjects: ${params.subjects.join(', ')}`);
      filtered = filtered.filter(exam => params.subjects.includes(exam.subject));
      console.log(`After subject filter: ${filtered.length} exams`);
    }
    
    // ソート（関連度順 → 年度順）
    if (params.keyword && params.keyword.trim()) {
      filtered.sort((a, b) => {
        const aRelevance = this.calculateRelevance(a, params.keyword);
        const bRelevance = this.calculateRelevance(b, params.keyword);
        if (aRelevance !== bRelevance) return bRelevance - aRelevance;
        return b.year - a.year;
      });
    } else {
      filtered.sort((a, b) => b.year - a.year);
    }
    
    // ページング
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    const result = {
      results: filtered.slice(startIndex, endIndex),
      total: filtered.length,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
      searchTime: Date.now() - startTime
    };
    
    console.log(`Fast search completed: ${result.total} results in ${result.searchTime}ms`);
    return result;
  }
  
  calculateRelevance(exam, keyword) {
    const searchTerm = keyword.toLowerCase();
    let score = 0;
    
    // タイトルマッチ（最優先）
    if (exam.title?.toLowerCase().includes(searchTerm)) {
      score += 10;
    }
    
    // キーワードマッチ
    if (exam.keywords?.toLowerCase().includes(searchTerm)) {
      score += 5;
    }
    
    // 科目マッチ
    if (exam.subject?.toLowerCase().includes(searchTerm)) {
      score += 3;
    }
    
    // 問題文マッチ
    if (exam.questionText?.toLowerCase().includes(searchTerm)) {
      score += 2;
    }
    
    // タグマッチ
    if (exam.tags) {
      for (const tag of exam.tags) {
        if (tag.toLowerCase().includes(searchTerm)) {
          score += 1;
        }
      }
    }
    
    return score;
  }
}