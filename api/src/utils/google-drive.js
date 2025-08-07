export class GoogleDriveDB {
  constructor(accessToken, folderId) {
    this.accessToken = accessToken;
    this.folderId = folderId;
  }
  
  async getAllSpreadsheets() {
    try {
      console.log('Getting spreadsheets from folder:', this.folderId);
      
      // フォルダ内のすべてのスプレッドシートを取得（共有ドライブ対応）
      const query = `'${this.folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodedQuery}&fields=${encodeURIComponent('files(id,name)')}&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`;
      
      console.log('Drive API URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      console.log('Drive API response status:', response.status);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Drive API error body:', errorBody);
        throw new Error(`Drive API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }
      
      const data = await response.json();
      console.log('Found spreadsheets:', data.files?.length || 0);
      return data.files || [];
      
    } catch (error) {
      console.error('Google Drive error:', error);
      throw error;
    }
  }
  
  async searchInAllSpreadsheets(params) {
    const spreadsheets = await this.getAllSpreadsheets();
    console.log(`Found ${spreadsheets.length} spreadsheets in folder`);
    
    const allResults = [];
    
    // 各スプレッドシートを並列で検索
    const searchPromises = spreadsheets.map(async (spreadsheet) => {
      try {
        const sheetData = await this.searchInSpreadsheet(spreadsheet.id, spreadsheet.name, params);
        return sheetData;
      } catch (error) {
        console.error(`Error searching in ${spreadsheet.name}:`, error);
        return [];
      }
    });
    
    const results = await Promise.all(searchPromises);
    
    // 結果をフラット化
    for (const result of results) {
      allResults.push(...result);
    }
    
    return this.filterAndPaginate(allResults, params);
  }
  
  async searchInSpreadsheet(spreadsheetId, spreadsheetName, params) {
    try {
      console.log(`Searching in spreadsheet: ${spreadsheetName} (${spreadsheetId})`);
      
      const range = 'A1:Z10000';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      console.log(`Spreadsheet ${spreadsheetName} response status:`, response.status);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Failed to fetch spreadsheet ${spreadsheetName}:`, errorBody);
        return [];
      }
    
    const data = await response.json();
    const rows = data.values;
    
    if (!rows || rows.length < 2) {
      return [];
    }
    
    const headers = rows[0];
    const exams = [];
    
    // 各行を試験データに変換
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;
      
      const exam = this.rowToExam(row, headers, spreadsheetName, i + 1);
      if (exam) {
        exams.push(exam);
      }
    }
    
    console.log(`Found ${exams.length} exams in ${spreadsheetName}`);
    return exams;
    } catch (error) {
      console.error(`Error processing spreadsheet ${spreadsheetName}:`, error);
      return [];
    }
  }
  
  async getExamFromAllSpreadsheets(examId) {
    const spreadsheets = await this.getAllSpreadsheets();
    
    // 各スプレッドシートで検索
    for (const spreadsheet of spreadsheets) {
      const exam = await this.getExamFromSpreadsheet(spreadsheet.id, spreadsheet.name, examId);
      if (exam) {
        return exam;
      }
    }
    
    return null;
  }
  
  async getExamFromSpreadsheet(spreadsheetId, spreadsheetName, examId) {
    const range = 'A1:Z10000';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const rows = data.values;
    
    if (!rows || rows.length < 2) {
      return null;
    }
    
    const headers = rows[0];
    
    // 指定されたIDの行を探す
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === examId) {
        return this.rowToExam(row, headers, spreadsheetName, i + 1);
      }
    }
    
    return null;
  }
  
  rowToExam(row, headers, fileName, rowNumber) {
    const exam = {
      id: '',
      fileName: fileName,
      rowNumber: rowNumber,
      year: 2024,
      subject: '',
      subjectCode: '',
      hasImage: false,
      choices: [],
      title: '',
      questionText: '',
      preview: '',
      tags: [],
      keywords: '',
      diagnosis: '',
      answer: '',
      explanation: '',
      // 追加フィールド
      majorFindings: '',
      imageDiagnosis: '',
      points: '',
      allChoiceExplanation: '',
      choiceExplanations: {}
    };
    
    headers.forEach((header, index) => {
      const value = row[index];
      if (!value) return;
      
      switch(header) {
        case '問題ID':
          exam.id = value;
          const yearMatch = value.match(/DR(\d{2})/);
          if (yearMatch) {
            exam.year = 2000 + parseInt(yearMatch[1]);
          }
          break;
          
        case '問題タイトル':
          exam.title = value;
          break;
          
        case '問題文':
          exam.questionText = this.processImagePaths(value);
          exam.preview = String(value).replace(/<[^>]*>/g, '').substring(0, 200) + '...';
          if (String(value).includes('<img') || String(value).includes('EXAM_IMAGE_PATH') || String(value).includes('%EXAM_IMAGE_PATH%')) {
            exam.hasImage = true;
          }
          break;
          
        case '分野':
          exam.subjectCode = value;
          exam.subject = this.getSubjectFromCode(value, exam.id);
          break;
          
        case 'KEYWORD':
          exam.keywords = value;
          if (value) {
            exam.tags = String(value).split(',').map(tag => tag.trim()).filter(tag => tag);
          }
          break;
          
        case '診断':
          exam.diagnosis = value;
          break;
          
        case '正答選択肢':
          exam.answer = value;
          break;
          
        case '解法の要点':
          exam.explanation = this.processImagePaths(value);
          break;
          
        case '主要所見':
          exam.majorFindings = this.processImagePaths(value);
          break;
          
        case '画像診断':
          exam.imageDiagnosis = this.processImagePaths(value);
          break;
          
        case 'ポイント':
          exam.points = this.processImagePaths(value);
          break;
          
        case '選択肢解説all':
          exam.allChoiceExplanation = this.processImagePaths(value);
          break;
      }
      
      // 問題選択肢a-vの処理
      const choiceMatch = header.match(/^問題選択肢([a-v])$/);
      if (choiceMatch) {
        const choiceLabel = choiceMatch[1];
        if (value) {
          exam.choices.push({
            label: choiceLabel,
            text: this.processImagePaths(value)
          });
        }
      }
      
      // 選択肢解説a-vの処理
      const explanationMatch = header.match(/^選択肢解説([a-v])$/);
      if (explanationMatch) {
        const choiceLabel = explanationMatch[1];
        if (value) {
          exam.choiceExplanations[choiceLabel] = this.processImagePaths(value);
        }
      }
      
      // 旧形式の選択肢A-Eもサポート
      if (header.match(/^選択肢[A-E]$/)) {
        const choiceLabel = header.replace('選択肢', '').toLowerCase();
        if (value) {
          exam.choices.push({
            label: choiceLabel,
            text: this.processImagePaths(value)
          });
        }
      }
    });
    
    // 選択肢をラベル順でソート
    exam.choices.sort((a, b) => {
      const order = 'abcdefghijklmnopqrstuvwxyz';
      return order.indexOf(a.label) - order.indexOf(b.label);
    });
    
    if (!exam.title) exam.title = exam.id;
    if (!exam.tags.length) exam.tags = [exam.subject];
    
    return exam;
  }
  
  processImagePaths(text) {
    if (!text) return text;
    
    let processedText = String(text);
    
    // %EXAM_IMAGE_PATH%のバリエーションをすべて処理
    // パターン1: %EXAM_IMAGE_PATH%/filename.jpg
    processedText = processedText.replace(
      /%EXAM_IMAGE_PATH%[\\\/]([^\s<>"']+\.(jpg|jpeg|png|gif|webp))/gi,
      (match, filename) => {
        const encodedFilename = encodeURIComponent(filename);
        return `/api/images?filename=${encodedFilename}`;
      }
    );
    
    // パターン2: 残った%EXAM_IMAGE_PATH%を削除（エラー防止）
    processedText = processedText.replace(/%EXAM_IMAGE_PATH%/g, '/api/images');
    
    // 不正な%文字をエスケープ（単独の%など）
    processedText = processedText.replace(/(?<!%)%(?![0-9A-Fa-f]{2})/g, '%25');
    
    return processedText;
  }
  
  getSubjectFromCode(code, examId = '') {
    const codeNum = parseInt(code);
    
    // CBTの場合 (DR**04)
    if (examId.includes('04')) {
      const cbtMapping = {
        1: 'A',
        2: 'B',
        3: 'C',
        4: 'D',
        5: 'E',
        6: 'F',
        7: '多肢',
        8: '4連問'
      };
      return cbtMapping[codeNum] || '不明';
    }
    
    // 医師国試、プレの場合 (DR**01, DR**02, DR**03, DR**06)
    const medicalMapping = {
      1: '消化管',
      2: '肝・胆・膵',
      3: '循環器',
      4: '代謝・内分泌',
      5: '腎',
      6: '免疫・膠原病',
      7: '血液',
      8: '感染症',
      9: '呼吸器',
      10: '神経',
      11: '中毒',
      12: '救急',
      13: '麻酔科',
      14: '眼科',
      15: '耳鼻咽喉科',
      16: '整形外科',
      17: '精神科',
      18: '皮膚科',
      19: '泌尿器科',
      20: '放射線科',
      21: '小児科',
      22: '産科',
      23: '婦人科',
      24: '乳腺外科',
      25: '老年医学',
      26: '公衆衛生',
      27: '医学総論'
    };
    
    return medicalMapping[codeNum] || '不明';
  }
  
  filterAndPaginate(exams, params) {
    // フィルタリング
    let filtered = exams;
    
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      filtered = filtered.filter(exam => {
        const searchFields = [
          exam.title,
          exam.questionText,
          exam.keywords,
          exam.subject,
          exam.id,
          ...exam.tags
        ].filter(field => field).join(' ').toLowerCase();
        
        return searchFields.includes(keyword);
      });
    }
    
    if (params.yearFrom) {
      filtered = filtered.filter(exam => exam.year >= parseInt(params.yearFrom));
    }
    if (params.yearTo) {
      filtered = filtered.filter(exam => exam.year <= parseInt(params.yearTo));
    }
    
    if (params.subjects && params.subjects.length > 0) {
      filtered = filtered.filter(exam => params.subjects.includes(exam.subject));
    }
    
    // ソート（年度降順）
    filtered.sort((a, b) => b.year - a.year);
    
    // ページング
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
      results: filtered.slice(startIndex, endIndex),
      total: filtered.length,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(filtered.length / pageSize)
    };
  }
}