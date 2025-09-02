-- Users table
-- 사용자 테이블 생성 (실제 운영 환경용)
CREATE TABLE IF NOT EXISTS us_patents_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    memberId VARCHAR(255) UNIQUE NOT NULL,
    memberIdx VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    nameEn VARCHAR(255),
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    role ENUM('PATENT_MANAGER', 'INVENTOR', 'US_ATTORNEY', 'EXTERNAL_REVIEWER') NOT NULL,
    organization VARCHAR(255),
    department VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    addressKr TEXT,
    addressEn TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Patents table
CREATE TABLE us_patents_patents (
    id VARCHAR(255) PRIMARY KEY,
    managementNumber VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    titleEn VARCHAR(500),
    applicationNumber VARCHAR(255) UNIQUE,
    usApplicationNumber VARCHAR(255),
    usRegistrationNumber VARCHAR(255),
    pctApplicationNumber VARCHAR(255),
    filingDate DATE,
    pctFiled BOOLEAN DEFAULT FALSE,
    pctFilingDate DATE,
    usptoEligible BOOLEAN DEFAULT FALSE,
    dueDate DATE,
    status ENUM('NO_PROGRESS', 'TRANSLATING', 'TRANSLATION_REVIEW', 'DOCUMENT_PREP', 'ATTORNEY_REVIEW', 'USPTO_FILING', 'OA_RESPONSE', 'USPTO_REGISTERED') DEFAULT 'NO_PROGRESS',
    priority ENUM('HIGH', 'MEDIUM', 'LOW') DEFAULT 'MEDIUM',
    notes TEXT,
    inventors TEXT,
    inventorId INT NOT NULL,
    managerId INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Priority Patents table
CREATE TABLE us_patents_priority_patents (
    id VARCHAR(255) PRIMARY KEY,
    patentId VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    applicationNumber VARCHAR(255),
    filingDate DATE,
    inventors TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Translations table
CREATE TABLE us_patents_translations (
    id VARCHAR(255) PRIMARY KEY,
    patentId VARCHAR(255) NOT NULL,
    originalText LONGTEXT NOT NULL,
    translatedText LONGTEXT,
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED', 'APPROVED') DEFAULT 'PENDING',
    translatorId INT,
    reviewerId INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Translation Files table
CREATE TABLE us_patents_translation_files (
    id VARCHAR(255) PRIMARY KEY,
    patentId VARCHAR(255) NOT NULL,
    section VARCHAR(50) NOT NULL, -- "translation" 또는 "review"
    comment TEXT,
    files TEXT NOT NULL, -- JSON 형태로 파일 정보 저장
    isCompletion BOOLEAN DEFAULT FALSE, -- 번역 완료 여부
    translatedTitleUS VARCHAR(500), -- 번역완료 특허명(US)
    uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE us_patents_reviews (
    id VARCHAR(255) PRIMARY KEY,
    patentId VARCHAR(255) NOT NULL,
    translationId VARCHAR(255),
    reviewerId INT NOT NULL,
    content TEXT NOT NULL,
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE us_patents_documents (
    id VARCHAR(255) PRIMARY KEY,
    patentId VARCHAR(255) NOT NULL,
    type ENUM('ADS', 'SPECIFICATION', 'CLAIMS', 'ABSTRACT', 'DRAWINGS', 'OATH_DECLARATION', 'IDS', 'ASSIGNMENT', 'OTHER') NOT NULL,
    fileName VARCHAR(500) NOT NULL,
    filePath VARCHAR(1000) NOT NULL,
    fileSize INT,
    version INT DEFAULT 1,
    status ENUM('DRAFT', 'REVIEW', 'APPROVED', 'SUBMITTED') DEFAULT 'DRAFT',
    uploadedBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- OA Responses table
CREATE TABLE us_patents_oa_responses (
    id VARCHAR(255) PRIMARY KEY,
    patentId VARCHAR(255) NOT NULL,
    oaNumber VARCHAR(255) NOT NULL,
    receivedDate DATE NOT NULL,
    responseDate DATE,
    content LONGTEXT NOT NULL,
    status ENUM('RECEIVED', 'IN_PROGRESS', 'RESPONDED', 'FINAL') DEFAULT 'RECEIVED',
    handlerId INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Costs table
CREATE TABLE us_patents_costs (
    id VARCHAR(255) PRIMARY KEY,
    patentId VARCHAR(255) NOT NULL,
    type ENUM('TRANSLATION', 'ATTORNEY_FEE', 'USPTO_FEE', 'OA_RESPONSE', 'OTHER') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    description TEXT,
    status ENUM('PENDING', 'REQUESTED', 'APPROVED', 'PAID') DEFAULT 'PENDING',
    paidBy INT,
    paidDate DATE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Document Preparation Files table (필수 서류 리스트용)
CREATE TABLE us_patents_document_preparation_files (
    id VARCHAR(255) PRIMARY KEY,
    patentId VARCHAR(255) NOT NULL,
    documentType ENUM('DECLARATION', 'ADS', 'IDS', 'ASSIGNMENT', 'SPECIFICATION', 'DRAWINGS', 'IDS_ATTACHMENTS', 'OTHER') NOT NULL,
    uploadType ENUM('ATTORNEY_DRAFT', 'USER_FINAL') NOT NULL,
    fileName VARCHAR(500) NOT NULL,
    originalFileName VARCHAR(500) NOT NULL,
    filePath VARCHAR(1000) NOT NULL,
    fileKey VARCHAR(1000), -- S3 파일 키
    fileSize INT NOT NULL,
    fileType VARCHAR(100) NOT NULL,
    uploadedBy VARCHAR(255) NOT NULL,
    status ENUM('NOT_UPLOADED', 'ATTORNEY_UPLOADED', 'USER_UPLOADED', 'COMPLETED', 'TRANSLATION_WAITING', 'TRANSLATION_LINKED') DEFAULT 'NOT_UPLOADED',
    linkedTranslationId VARCHAR(255), -- 번역 연결 ID
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Document Preparation table (전체 서류 준비 상태 관리)
CREATE TABLE us_patents_document_preparations (
    id VARCHAR(255) PRIMARY KEY,
    patentId VARCHAR(255) NOT NULL UNIQUE,
    overallStatus ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'NOT_STARTED',
    translationStatus ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'NOT_STARTED',
    linkedTranslationIds TEXT, -- JSON 배열로 번역 ID들 저장
    readyForFiling BOOLEAN DEFAULT FALSE,
    filingTriggered BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Document Comments table (서류별 코멘트 관리)
CREATE TABLE us_patents_document_comments (
    id VARCHAR(255) PRIMARY KEY,
    patentId VARCHAR(255) NOT NULL,
    documentType ENUM('DECLARATION', 'ADS', 'IDS', 'ASSIGNMENT', 'SPECIFICATION', 'DRAWINGS', 'IDS_ATTACHMENTS', 'OTHER') NOT NULL,
    content TEXT NOT NULL,
    authorId INT NOT NULL,
    authorName VARCHAR(255) NOT NULL,
    authorRole ENUM('PATENT_MANAGER', 'INVENTOR', 'US_ATTORNEY', 'EXTERNAL_REVIEWER') NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_patent_document (patentId, documentType),
    INDEX idx_author (authorId)
);

-- USPTO 출원 파일 관리 테이블
CREATE TABLE us_patents_filing_files (
    id VARCHAR(36) PRIMARY KEY,
    patent_id VARCHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    file_key VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_patent_id (patent_id),
    INDEX idx_uploaded_at (uploaded_at),
    INDEX idx_file_key (file_key)
);
