-- =====================================================
-- 특허관리시스템 데이터베이스 스키마
-- =====================================================

-- 1. 사용자 테이블
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    role ENUM('PATENT_MANAGER', 'INVENTOR', 'US_ATTORNEY', 'EXTERNAL_REVIEWER') NOT NULL,
    organization VARCHAR(200),
    department VARCHAR(200),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    status ENUM('활성', '비활성') DEFAULT '활성',
    address_kr TEXT,
    address_en TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL
);

-- 2. 특허 기본정보 테이블
CREATE TABLE patents (
    id VARCHAR(50) PRIMARY KEY,
    management_number VARCHAR(50) UNIQUE NOT NULL, -- PNU-2024-001
    title TEXT NOT NULL,
    title_en TEXT,
    application_number VARCHAR(50), -- 한국 출원번호
    us_application_number VARCHAR(50), -- 미국 출원번호
    us_registration_number VARCHAR(50), -- 미국 등록번호
    pct_application_number VARCHAR(50), -- PCT 출원번호
    filing_date DATE NOT NULL,
    application_type ENUM('provisional', 'regular'), -- 가출원/진출원
    registration_number VARCHAR(50), -- 한국 등록번호
    status ENUM('NO_PROGRESS', 'TRANSLATING', 'TRANSLATION_REVIEW', 'DOCUMENT_PREP', 'ATTORNEY_REVIEW', 'USPTO_FILING', 'OA_RESPONSE', 'USPTO_REGISTERED') DEFAULT 'NO_PROGRESS',
    pct_filed BOOLEAN DEFAULT FALSE,
    pct_filing_date DATE,
    uspto_eligible BOOLEAN DEFAULT TRUE,
    due_date DATE,
    priority ENUM('HIGH', 'MEDIUM', 'LOW') DEFAULT 'MEDIUM',
    notes TEXT,
    created_by VARCHAR(50),
    assigned_to VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- 3. 특허-발명자 관계 테이블 (다대다)
CREATE TABLE patent_inventors (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    inventor_order INT NOT NULL, -- 발명자 순서
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_patent_inventor (patent_id, user_id)
);

-- 4. 우선권 특허 테이블
CREATE TABLE priority_patents (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    filing_date DATE,
    application_number VARCHAR(50),
    priority_order INT NOT NULL, -- 우선권 순서
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE
);

-- 5. 우선권 특허-발명자 관계 테이블
CREATE TABLE priority_patent_inventors (
    id VARCHAR(50) PRIMARY KEY,
    priority_patent_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    inventor_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (priority_patent_id) REFERENCES priority_patents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 6. 번역 테이블
CREATE TABLE translations (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    original_text TEXT,
    translated_text TEXT,
    edited_text TEXT, -- 편집된 번역문
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    progress INT DEFAULT 0, -- 0-100
    translator VARCHAR(100), -- AI Engine 또는 사용자명
    reviewer VARCHAR(50), -- 검토자 ID
    ai_confidence DECIMAL(3,2), -- AI 신뢰도 0.00-1.00
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer) REFERENCES users(id)
);

-- 7. 번역 파일 테이블
CREATE TABLE translation_files (
    id VARCHAR(50) PRIMARY KEY,
    translation_id VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_category ENUM('ORIGINAL', 'TRANSLATED', 'REVIEWED', 'FINAL') NOT NULL,
    uploaded_by VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    checksum VARCHAR(255),
    FOREIGN KEY (translation_id) REFERENCES translations(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 8. 서류 준비 테이블
CREATE TABLE document_preparations (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    overall_status ENUM('NOT_STARTED', 'DRAFT_WRITING', 'UNDER_REVIEW', 'SIGNATURE_PENDING', 'FINAL_REVIEW', 'COMPLETED') DEFAULT 'NOT_STARTED',
    translation_status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'LINKED') DEFAULT 'NOT_STARTED',
    ready_for_filing BOOLEAN DEFAULT FALSE,
    filing_triggered BOOLEAN DEFAULT FALSE,
    assigned_attorney VARCHAR(50),
    translation_completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_attorney) REFERENCES users(id)
);

-- 9. 서류 항목 테이블
CREATE TABLE document_items (
    id VARCHAR(50) PRIMARY KEY,
    document_preparation_id VARCHAR(50) NOT NULL,
    document_type ENUM('DECLARATION', 'ADS', 'IDS', 'ASSIGNMENT', 'SPECIFICATION', 'DRAWINGS', 'IDS_ATTACHMENTS', 'OTHER') NOT NULL,
    status ENUM('DRAFT_WRITING', 'UNDER_REVIEW', 'SIGNATURE_PENDING', 'SIGNATURE_COMPLETED', 'FINAL_REVIEW', 'COMPLETED', 'TRANSLATION_PENDING', 'TRANSLATION_LINKED', 'UPLOAD_PENDING') DEFAULT 'DRAFT_WRITING',
    linked_translation_id VARCHAR(50), -- 명세서의 경우 번역 연결
    assigned_to VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (document_preparation_id) REFERENCES document_preparations(id) ON DELETE CASCADE,
    FOREIGN KEY (linked_translation_id) REFERENCES translations(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- 10. 서류 파일 테이블
CREATE TABLE document_files (
    id VARCHAR(50) PRIMARY KEY,
    document_item_id VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    upload_type ENUM('ATTORNEY_DRAFT', 'USER_FINAL') DEFAULT 'USER_FINAL',
    uploaded_by VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    is_template BOOLEAN DEFAULT FALSE,
    checksum VARCHAR(255),
    is_validated BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (document_item_id) REFERENCES document_items(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 11. 출원 정보 테이블
CREATE TABLE filings (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    filing_type ENUM('ATTORNEY_REVIEW', 'USPTO_FILING', 'OA_RESPONSE', 'USPTO_REGISTRATION') NOT NULL,
    status ENUM('PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PREPARING', 'FILED', 'PENDING_RECEIPT', 'RECEIVED', 'IN_PROGRESS', 'RESPONDED', 'ALLOWED', 'REGISTERED', 'ABANDONED') DEFAULT 'PENDING_REVIEW',
    document_preparation_id VARCHAR(50),
    documents_ready BOOLEAN DEFAULT FALSE,
    document_completed_at TIMESTAMP NULL,
    us_application_number VARCHAR(50),
    us_filing_date DATE,
    us_registration_number VARCHAR(50),
    us_registration_date DATE,
    law_firm VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
    FOREIGN KEY (document_preparation_id) REFERENCES document_preparations(id)
);

-- 12. 출원 서류 테이블
CREATE TABLE filing_documents (
    id VARCHAR(50) PRIMARY KEY,
    filing_id VARCHAR(50),
    change_id VARCHAR(50), -- 변경사항 관련
    misc_doc_id VARCHAR(50), -- 기타서류 관련
    category ENUM('USPTO_FILING_DOCS', 'OA_RECEIVED_DOCS', 'OA_RESPONSE_DOCS', 'USPTO_REGISTRATION_DOCS', 'POST_FILING_DOCS', 'CHANGE_DOCS') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_by VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    FOREIGN KEY (filing_id) REFERENCES filings(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 13. 변경사항 테이블
CREATE TABLE filing_changes (
    id VARCHAR(50) PRIMARY KEY,
    filing_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    change_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (filing_id) REFERENCES filings(id) ON DELETE CASCADE
);

-- 14. 기타서류 테이블
CREATE TABLE misc_documents (
    id VARCHAR(50) PRIMARY KEY,
    filing_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (filing_id) REFERENCES filings(id) ON DELETE CASCADE
);

-- 15. OA 히스토리 테이블
CREATE TABLE oa_histories (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    oa_sequence INT NOT NULL,
    oa_number VARCHAR(100),
    oa_received_date DATE,
    oa_deadline DATE,
    oa_type VARCHAR(200), -- 직접입력
    status ENUM('RECEIVED', 'IN_PROGRESS', 'RESPONDED', 'COMPLETED') DEFAULT 'RECEIVED',
    response_date DATE,
    law_firm VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE
);

-- 16. OA 서류 테이블
CREATE TABLE oa_documents (
    id VARCHAR(50) PRIMARY KEY,
    oa_history_id VARCHAR(50) NOT NULL,
    category ENUM('OA_RECEIVED_DOCS', 'OA_RESPONSE_DOCS') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_by VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    FOREIGN KEY (oa_history_id) REFERENCES oa_histories(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 17. 코멘트 테이블 (통합)
CREATE TABLE comments (
    id VARCHAR(50) PRIMARY KEY,
    entity_type ENUM('PATENT', 'TRANSLATION', 'DOCUMENT_ITEM', 'FILING', 'OA_HISTORY') NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    document_type ENUM('DECLARATION', 'ADS', 'IDS', 'ASSIGNMENT', 'SPECIFICATION', 'DRAWINGS', 'IDS_ATTACHMENTS', 'OTHER'), -- 서류 코멘트용
    content TEXT NOT NULL,
    author_id VARCHAR(50) NOT NULL,
    parent_id VARCHAR(50), -- 답글용
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_edited BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES comments(id)
);

-- 18. 특허 원본 파일 테이블 (특허 등록시 업로드되는 파일들)
CREATE TABLE patent_files (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_category ENUM('SPECIFICATION', 'DRAWINGS', 'CLAIMS', 'ABSTRACT', 'OTHER') DEFAULT 'OTHER',
    uploaded_by VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 19. 워크플로우 전환 이력 테이블
CREATE TABLE workflow_transitions (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    from_stage ENUM('NO_PROGRESS', 'TRANSLATING', 'TRANSLATION_REVIEW', 'DOCUMENT_PREP', 'ATTORNEY_REVIEW', 'USPTO_FILING', 'OA_RESPONSE', 'USPTO_REGISTERED') NOT NULL,
    to_stage ENUM('NO_PROGRESS', 'TRANSLATING', 'TRANSLATION_REVIEW', 'DOCUMENT_PREP', 'ATTORNEY_REVIEW', 'USPTO_FILING', 'OA_RESPONSE', 'USPTO_REGISTERED') NOT NULL,
    triggered_by VARCHAR(50) NOT NULL,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auto_triggered BOOLEAN DEFAULT FALSE,
    related_entity_id VARCHAR(50), -- Translation ID, DocumentPreparation ID 등
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
    FOREIGN KEY (triggered_by) REFERENCES users(id)
);

-- 인덱스 생성
CREATE INDEX idx_patents_status ON patents(status);
CREATE INDEX idx_patents_management_number ON patents(management_number);
CREATE INDEX idx_patent_inventors_patent_id ON patent_inventors(patent_id);
CREATE INDEX idx_translations_patent_id ON translations(patent_id);
CREATE INDEX idx_translations_status ON translations(status);
CREATE INDEX idx_document_preparations_patent_id ON document_preparations(patent_id);
CREATE INDEX idx_filings_patent_id ON filings(patent_id);
CREATE INDEX idx_oa_histories_patent_id ON oa_histories(patent_id);
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
