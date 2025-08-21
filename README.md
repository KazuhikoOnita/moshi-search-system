# 機能関連図
## 92機能の相互関係と統合フロー

---

## 🔄 全体機能関連図

```mermaid
graph TB
    subgraph "認証基盤（4機能）"
        AUTH1[17.ログイン機能<br/>mediLink認証]
        AUTH2[18.教員用ログイン]
        AUTH3[19.パスワードリセット]
        AUTH4[20.セッション管理SSO]
        
        AUTH1 --> AUTH4
        AUTH2 --> AUTH4
        AUTH3 --> AUTH1
    end
    
    subgraph "TAO試験エンジン（16機能）"
        subgraph "問題管理（5機能）"
            Q1[1.問題作成]
            Q2[2.問題編集]
            Q3[3.カテゴリ管理]
            Q4[4.問題プール]
            Q5[5.画像管理]
            
            Q1 --> Q4
            Q2 --> Q4
            Q3 --> Q4
            Q5 --> Q1
            Q5 --> Q2
        end
        
        subgraph "試験実施（6機能）"
            E1[6.問題表示]
            E2[7.解答入力]
            E3[8.タイマー]
            E4[9.ナビゲーション]
            E5[10.中断・再開]
            E6[11.見直しフラグ]
            
            Q4 --> E1
            E1 --> E2
            E3 --> E1
            E4 --> E1
            E5 --> E2
            E6 --> E2
        end
        
        subgraph "採点（5機能）"
            S1[12.自動採点]
            S2[13.採点ロジック]
            S3[14.基本結果表示]
            S4[15.詳細結果表示]
            S5[16.合否判定]
            
            E2 --> S1
            S2 --> S1
            S1 --> S3
            S1 --> S5
        end
    end
    
    AUTH4 --> E1
    
    subgraph "成績処理（9機能）"
        R1[27.個人成績表示]
        R2[28.偏差値計算]
        R3[29.順位表示]
        R4[30.分野別分析]
        R5[31.弱点診断]
        R6[32.学習推奨AI]
        R7[33.成績推移]
        R8[34.PDF出力]
        R9[35.詳細結果表示]
        
        S3 --> R1
        S1 --> R2
        R2 --> R3
        R2 --> R9
        R3 --> R9
        R1 --> R4
        R4 --> R5
        R5 --> R6
        R1 --> R7
        R9 --> R8
    end
    
    subgraph "復習機能（6機能）"
        REV1[21.間違い抽出]
        REV2[22.ブックマーク]
        REV3[23.詳細解説]
        REV4[24.関連リンク]
        REV5[25.学習履歴]
        REV6[26.復習モード]
        
        R5 --> REV1
        REV1 --> REV6
        REV1 --> REV3
        REV3 --> REV4
        REV2 --> REV6
        REV6 --> REV5
    end
    
    subgraph "教員機能（6機能）"
        T1[36.学校別集計]
        T2[37.クラス分析]
        T3[38.生徒管理]
        T4[39.CSV登録]
        T5[40.教員レポート]
        T6[41.Excel出力]
        
        AUTH2 --> T3
        T3 --> T1
        T3 --> T2
        T4 --> T3
        T1 --> T5
        T2 --> T5
        T5 --> T6
    end
    
    subgraph "バッチ処理（5機能）"
        B1[42.成績集計<br/>Lambda+Fargate]
        B2[43.メール送信<br/>Lambda]
        B3[44.PDF生成<br/>Lambda/Fargate]
        B4[45.データエクスポート]
        B5[46.日次集計]
        
        S1 --> B1
        B1 --> R2
        B1 --> R3
        R9 --> B2
        R8 --> B3
        B1 --> B4
        B5 --> B4
    end
    
    subgraph "データ基盤（5機能）"
        D1[47.DB接続]
        D2[48.キャッシュRedis]
        D3[49.ログ管理]
        D4[50.エラー監視]
        D5[51.ファイルS3]
        
        B1 --> D1
        D1 --> D2
        B3 --> D5
        Q5 --> D5
    end
    
    subgraph "新規開発（16機能）"
        N1[60.BigQueryパイプライン]
        N2[61.AI学習推奨]
        N3[62.リアルタイム分析]
        N4[63.動画解説]
        N5[64.mediLink ID統合]
        N6[65.SSO実装]
        N7[66.復習API]
        N8[67.分析ダッシュボード]
        N9[68.通知システム]
        N10[69.マイクロサービス]
        N11[70.教員ポータル]
        N12[71.ダイナミックリンク]
        N13[72.モバイル統合]
        
        B4 --> N1
        R6 --> N2
        B1 --> N3
        REV3 --> N4
        AUTH1 --> N5
        N5 --> N6
        REV6 --> N7
        N1 --> N8
        B2 --> N9
        T3 --> N11
        REV4 --> N12
        N12 --> N13
    end
    
    style AUTH1 fill:#99ff99
    style E1 fill:#ffcc99
    style S1 fill:#ff9999
    style R2 fill:#99ccff
    style B1 fill:#ffff99
    style N1 fill:#ff99ff
```

---

## 🔗 主要な統合フロー

### 1️⃣ 試験実施フロー

```mermaid
graph LR
    subgraph "試験準備"
        A1[mediLink認証] --> A2[試験一覧]
        A2 --> A3[試験選択]
    end
    
    subgraph "TAO実施"
        A3 --> B1[問題表示]
        B1 --> B2[解答入力]
        B2 --> B3[一時保存]
        B3 --> B4[試験終了]
    end
    
    subgraph "即時処理"
        B4 --> C1[自動採点]
        C1 --> C2[点数表示]
        C2 --> C3[Lambda起動]
        C3 --> C4[基本集計]
    end
    
    subgraph "バッチ処理"
        C4 --> D1[全員終了待ち]
        D1 --> D2[Fargate起動]
        D2 --> D3[偏差値計算]
        D3 --> D4[順位計算]
        D4 --> D5[詳細結果生成]
    end
    
    subgraph "復習誘導"
        D5 --> E1[弱点分析]
        E1 --> E2[復習コンテンツ]
        E2 --> E3[ダイナミックリンク]
        E3 --> E4[mediLink内学習]
    end
    
    style A1 fill:#99ff99
    style B1 fill:#ffcc99
    style C1 fill:#ff9999
    style D2 fill:#99ccff
    style E3 fill:#ff99ff
```

---

## 🔄 データフロー図

```mermaid
graph TB
    subgraph "入力層"
        U1[学生] --> I1[試験解答]
        U2[教員] --> I2[生徒登録CSV]
        U3[管理者] --> I3[問題作成]
    end
    
    subgraph "処理層"
        I1 --> P1[TAO採点エンジン]
        P1 --> P2[Lambda即時処理]
        P2 --> P3[Fargate統計処理]
        
        I2 --> P4[CSV処理統合]
        P4 --> P5[生徒DB更新]
        
        I3 --> P6[TAO問題管理]
        P6 --> P7[問題プール]
    end
    
    subgraph "データ層"
        P2 --> D1[(統合DB)]
        P3 --> D2[(BigQuery)]
        P5 --> D1
        P7 --> D3[(TAO DB)]
        
        D1 --> D4[データパイプライン]
        D3 --> D4
        D4 --> D2
    end
    
    subgraph "出力層"
        D1 --> O1[個人成績]
        D2 --> O2[統計分析]
        D2 --> O3[教員レポート]
        D2 --> O4[ダッシュボード]
        
        O1 --> O5[mediLink復習]
        O2 --> O6[AI学習推奨]
        O3 --> O7[Excel出力]
    end
    
    style P1 fill:#ffcc99
    style P2 fill:#99ff99
    style P3 fill:#99ccff
    style D2 fill:#ff99ff
```

---

## 🏗️ システム統合マップ

```mermaid
graph TB
    subgraph "削除対象（17機能）"
        DEL1[シリアル認証]
        DEL2[答案インポート]
        DEL3[マークシート]
        DEL4[請求書発行]
        DEL5[見積書作成]
        DEL6[重複認証×5]
        
        DEL1 -.->|移行| AUTH1[mediLink認証]
        DEL4 -.->|移行| EXT1[経理システム]
        DEL5 -.->|移行| EXT2[Salesforce]
    end
    
    subgraph "統合対象（8機能）"
        INT1[バッチ×6]
        INT2[DB×6]
        INT3[PDF生成×6]
        INT4[メール×6]
        INT5[CSV処理×6]
        INT6[エラー×6]
        INT7[監視×6]
        INT8[ライセンス×6]
        
        INT1 -->|統合| NEW1[統合バッチ]
        INT2 -->|統合| NEW2[統合DB]
        INT3 -->|統合| NEW3[共通PDF]
        INT4 -->|統合| NEW4[統合メール]
        INT8 -->|活用| NEW5[mediLink既存]
    end
    
    subgraph "新規構築（16機能）"
        BUILD1[BigQueryパイプライン]
        BUILD2[AI学習推奨]
        BUILD3[教員ポータル]
        BUILD4[ダイナミックリンク]
        BUILD5[モバイル統合]
        
        NEW2 --> BUILD1
        BUILD1 --> BUILD2
        AUTH1 --> BUILD3
        BUILD4 --> BUILD5
    end
    
    style DEL1 fill:#ffcccc
    style INT1 fill:#ffffcc
    style BUILD1 fill:#ccffcc
```

---

## 📊 機能依存関係マトリックス

### 高依存度機能（他機能への影響大）

```mermaid
graph LR
    subgraph "コア機能"
        C1[mediLink認証] --> C2[20+機能に影響]
        C3[TAO採点] --> C4[15+機能に影響]
        C5[統合DB] --> C6[30+機能に影響]
        C7[Lambda処理] --> C8[10+機能に影響]
    end
    
    subgraph "影響範囲"
        C2 --> I1[全ユーザー機能]
        C4 --> I2[成績・分析系]
        C6 --> I3[全データ処理]
        C8 --> I4[リアルタイム系]
    end
```

### 機能グループ間の関係

```mermaid
graph TB
    subgraph "Layer 1: 基盤"
        L1A[認証・SSO]
        L1B[DB・ストレージ]
        L1C[監視・ログ]
    end
    
    subgraph "Layer 2: コア"
        L2A[TAO試験]
        L2B[成績処理]
        L2C[バッチ処理]
    end
    
    subgraph "Layer 3: 応用"
        L3A[復習機能]
        L3B[教員機能]
        L3C[分析機能]
    end
    
    subgraph "Layer 4: 統合"
        L4A[mediLink連携]
        L4B[モバイル]
        L4C[AI機能]
    end
    
    L1A --> L2A
    L1B --> L2A
    L1B --> L2B
    L1C --> L2C
    
    L2A --> L3A
    L2B --> L3B
    L2B --> L3C
    
    L3A --> L4A
    L3B --> L4B
    L3C --> L4C
    
    style L1A fill:#ffcccc
    style L2A fill:#ffffcc
    style L3A fill:#ccffcc
    style L4A fill:#ccccff
```

---

## 🎯 クリティカルパス

```mermaid
graph LR
    subgraph "Phase 1"
        P1A[認証統合] --> P1B[TAO環境]
        P1B --> P1C[基本統合]
    end
    
    subgraph "Phase 2"
        P1C --> P2A[データ移行]
        P2A --> P2B[LTI統合]
        P2B --> P2C[採点連携]
    end
    
    subgraph "Phase 3"
        P2C --> P3A[成績処理]
        P3A --> P3B[バッチ移行]
        P3B --> P3C[分析機能]
    end
    
    subgraph "Phase 4"
        P3C --> P4A[復習連携]
        P4A --> P4B[モバイル統合]
        P4B --> P4C[最適化]
    end
    
    style P1A fill:#ff9999
    style P2B fill:#ffcc99
    style P3A fill:#99ff99
    style P4B fill:#99ccff
```

---

## ✅ 機能関連の要点

### 最重要な統合ポイント

1. **認証基盤（影響：全機能）**
   - mediLink認証が全ての起点
   - SSO実装で全システム連携

2. **TAO採点（影響：成績系15機能）**
   - 採点データが後続処理の基盤
   - Lambda/Fargateへの連携が鍵

3. **統合DB（影響：30機能）**
   - 6DB→1DBで全データ統合
   - BigQueryパイプラインへの入口

4. **ダイナミックリンク（影響：学習系10機能）**
   - 復習機能とコンテンツ連携
   - mediLinkエコシステムの要

---

最終更新: 2025-08-20
作成者: Claude Code Assistant
