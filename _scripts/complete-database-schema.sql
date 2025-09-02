-- =====================================================
-- 완전한 데이터베이스 스키마 (현재 구현 상태)
-- =====================================================

-- 1. 사용자 관리 테이블
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    email VARCHAR(255),
    role ENUM('PATENT_MANAGER', 'INVENTOR', 'US_ATTORNEY', 'EXTERNAL_REVIEWER') NOT NULL,
    organization VARCHAR(200),
    department VARCHAR(100),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    address_kr TEXT,
    address_en TEXT,
    status VARCHAR(20) DEFAULT '활성',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_users_role (role),
    INDEX idx_users_email (email),
    INDEX idx_users_status (status)
);

-- 2. 특허 기본 정보 테이블
CREATE TABLE patents (
    id VARCHAR(50) PRIMARY KEY,
    management_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_en VARCHAR(500),
    application_number VARCHAR(50),
    us_application_number VARCHAR(50),
    us_registration_number VARCHAR(50),
    pct_application_number VARCHAR(50),
    filing_date DATE NOT NULL,
    status ENUM('NO_PROGRESS', 'TRANSLATING', 'TRANSLATION_REVIEW', 'DOCUMENT_PREP', 'ATTORNEY_REVIEW', 'USPTO_FILING', 'OA_RESPONSE', 'USPTO_REGISTERED') DEFAULT 'NO_PROGRESS',
    pct_filed BOOLEAN DEFAULT FALSE,
    uspto_eligible BOOLEAN DEFAULT TRUE,
    priority ENUM('HIGH', 'MEDIUM', 'LOW') DEFAULT 'MEDIUM',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    assigned_to VARCHAR(50),
    
    INDEX idx_patents_status (status),
    INDEX idx_patents_management_number (management_number),
    INDEX idx_patents_filing_date (filing_date),
    INDEX idx_patents_priority (priority),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- 3. 특허-발명자 관계 테이블
CREATE TABLE patent_inventors (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    inventor_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_patent_inventor (patent_id, user_id),
    INDEX idx_patent_inventors_patent (patent_id),
    INDEX idx_patent_inventors_user (user_id),
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. 우선권 특허 테이블
CREATE TABLE priority_patents (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    filing_date DATE NOT NULL,
    application_number VARCHAR(50) NOT NULL,
    priority_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_priority_patents_patent (patent_id),
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE
);

-- 5. 우선권 특허-발명자 관계 테이블
CREATE TABLE priority_patent_inventors (
    id VARCHAR(50) PRIMARY KEY,
    priority_patent_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    inventor_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_priority_patent_inventor (priority_patent_id, user_id),
    FOREIGN KEY (priority_patent_id) REFERENCES priority_patents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 6. 번역 관리 테이블
CREATE TABLE translations (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'REVIEW_REQUIRED') DEFAULT 'NOT_STARTED',
    translator_id VARCHAR(50),
    reviewer_id VARCHAR(50),
    translation_start_date TIMESTAMP NULL,
    translation_end_date TIMESTAMP NULL,
    review_start_date TIMESTAMP NULL,
    review_end_date TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    
    UNIQUE KEY unique_patent_translation (patent_id),
    INDEX idx_translations_status (status),
    INDEX idx_translations_translator (translator_id),
    INDEX idx_translations_reviewer (reviewer_id),
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
    FOREIGN KEY (translator_id) REFERENCES users(id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 7. 번역 파일 테이블
CREATE TABLE translation_files (
    id VARCHAR(50) PRIMARY KEY,
    translation_id VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type ENUM('ORIGINAL', 'TRANSLATED', 'REVIEWED') NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_translation_files_translation (translation_id),
    INDEX idx_translation_files_type (file_type),
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_patent_document_prep (patent_id),
    INDEX idx_document_preparations_status (overall_status),
    INDEX idx_document_preparations_attorney (assigned_attorney),
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_attorney) REFERENCES users(id)
);

-- 9. 서류 항목 테이블
CREATE TABLE document_items (
    id VARCHAR(50) PRIMARY KEY,
    document_preparation_id VARCHAR(50) NOT NULL,
    type ENUM('DECLARATION', 'ADS', 'IDS', 'ASSIGNMENT', 'SPECIFICATION', 'DRAWINGS', 'IDS_ATTACHMENTS', 'OTHER') NOT NULL,
    status ENUM('DRAFT_WRITING', 'UNDER_REVIEW', 'SIGNATURE_PENDING', 'SIGNATURE_COMPLETED', 'FINAL_REVIEW', 'COMPLETED', 'TRANSLATION_PENDING', 'TRANSLATION_LINKED', 'UPLOAD_PENDING') DEFAULT 'DRAFT_WRITING',
    linked_translation_id VARCHAR(50),
    assigned_to VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_document_items_prep (document_preparation_id),
    INDEX idx_document_items_type (type),
    INDEX idx_document_items_status (status),
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
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    version INT DEFAULT 1,
    upload_type ENUM('ATTORNEY_DRAFT', 'USER_FINAL') DEFAULT 'ATTORNEY_DRAFT',
    is_template BOOLEAN DEFAULT FALSE,
    is_validated BOOLEAN DEFAULT FALSE,
    checksum VARCHAR(64),
    uploaded_by VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_document_files_item (document_item_id),
    INDEX idx_document_files_type (file_type),
    INDEX idx_document_files_version (version),
    FOREIGN KEY (document_item_id) REFERENCES document_items(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 11. 출원 정보 테이블
CREATE TABLE filings (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    type ENUM('ATTORNEY_REVIEW', 'USPTO_FILING', 'OA_RESPONSE', 'USPTO_REGISTRATION') NOT NULL,
    status ENUM('PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PREPARING', 'FILED', 'PENDING_RECEIPT', 'RECEIVED', 'IN_PROGRESS', 'RESPONDED', 'ALLOWED', 'REGISTERED', 'ABANDONED') DEFAULT 'PENDING_REVIEW',
    document_preparation_id VARCHAR(50),
    documents_ready BOOLEAN DEFAULT FALSE,
    document_completed_at TIMESTAMP NULL,
    us_application_number VARCHAR(50),
    us_filing_date DATE,
    us_registration_number VARCHAR(50),
    us_registration_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_patent_filing_type (patent_id, type),
    INDEX idx_filings_patent (patent_id),
    INDEX idx_filings_type (type),
    INDEX idx_filings_status (status),
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
    FOREIGN KEY (document_preparation_id) REFERENCES document_preparations(id)
);

-- 12. 출원 서류 테이블
CREATE TABLE filing_documents (
    id VARCHAR(50) PRIMARY KEY,
    filing_id VARCHAR(50),
    change_id VARCHAR(50),
    misc_doc_id VARCHAR(50),
    category ENUM('USPTO_FILING_DOCS', 'OA_RECEIVED_DOCS', 'OA_RESPONSE_DOCS', 'USPTO_REGISTRATION_DOCS', 'POST_FILING_DOCS', 'CHANGE_DOCS') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    version INT DEFAULT 1,
    uploaded_by VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_filing_documents_filing (filing_id),
    INDEX idx_filing_documents_change (change_id),
    INDEX idx_filing_documents_misc (misc_doc_id),
    INDEX idx_filing_documents_category (category),
    FOREIGN KEY (filing_id) REFERENCES filings(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 13. 변경사항 테이블
CREATE TABLE filing_changes (
    id VARCHAR(50) PRIMARY KEY,
    filing_id VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_filing_changes_filing (filing_id),
    INDEX idx_filing_changes_date (date),
    FOREIGN KEY (filing_id) REFERENCES filings(id) ON DELETE CASCADE
);

-- 14. 기타서류 테이블
CREATE TABLE misc_documents (
    id VARCHAR(50) PRIMARY KEY,
    filing_id VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_misc_documents_filing (filing_id),
    FOREIGN KEY (filing_id) REFERENCES filings(id) ON DELETE CASCADE
);

-- 15. OA 히스토리 테이블
CREATE TABLE oa_histories (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    oa_sequence INT NOT NULL,
    oa_number VARCHAR(50),
    oa_received_date DATE NOT NULL,
    oa_deadline DATE NOT NULL,
    oa_type VARCHAR(100) NOT NULL,
    status ENUM('RECEIVED', 'IN_PROGRESS', 'RESPONDED', 'COMPLETED') DEFAULT 'RECEIVED',
    response_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_oa_histories_patent (patent_id),
    INDEX idx_oa_histories_sequence (oa_sequence),
    INDEX idx_oa_histories_status (status),
    INDEX idx_oa_histories_deadline (oa_deadline),
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE
);

-- 16. OA 서류 테이블
CREATE TABLE oa_documents (
    id VARCHAR(50) PRIMARY KEY,
    oa_history_id VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    document_type ENUM('OA_RECEIVED', 'OA_RESPONSE', 'OA_SUPPORTING') NOT NULL,
    uploaded_by VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_oa_documents_history (oa_history_id),
    INDEX idx_oa_documents_type (document_type),
    FOREIGN KEY (oa_history_id) REFERENCES oa_histories(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 17. 통합 코멘트 시스템 테이블
CREATE TABLE comments (
    id VARCHAR(50) PRIMARY KEY,
    entity_id VARCHAR(50) NOT NULL,
    entity_type ENUM('PATENT', 'TRANSLATION', 'DOCUMENT', 'FILING', 'OA') NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR(50) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    author_role VARCHAR(50) NOT NULL,
    parent_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_edited BOOLEAN DEFAULT FALSE,
    
    INDEX idx_comments_entity (entity_id, entity_type),
    INDEX idx_comments_author (author_id),
    INDEX idx_comments_parent (parent_id),
    INDEX idx_comments_created (created_at),
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 18. 특허 원본 파일 테이블
CREATE TABLE patent_files (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    category ENUM('SPECIFICATION', 'CLAIMS', 'DRAWINGS', 'ABSTRACT', 'OTHER') NOT NULL,
    version INT DEFAULT 1,
    uploaded_by VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_patent_files_patent (patent_id),
    INDEX idx_patent_files_category (category),
    INDEX idx_patent_files_type (file_type),
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 19. 워크플로우 전환 이력 테이블
CREATE TABLE workflow_transitions (
    id VARCHAR(50) PRIMARY KEY,
    patent_id VARCHAR(50) NOT NULL,
    from_stage VARCHAR(50) NOT NULL,
    to_stage VARCHAR(50) NOT NULL,
    triggered_by VARCHAR(50) NOT NULL,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auto_triggered BOOLEAN DEFAULT FALSE,
    related_entity_id VARCHAR(50),
    
    INDEX idx_workflow_transitions_patent (patent_id),
    INDEX idx_workflow_transitions_stage (from_stage, to_stage),
    INDEX idx_workflow_transitions_triggered (triggered_at),
    FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
    FOREIGN KEY (triggered_by) REFERENCES users(id)
);
