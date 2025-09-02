// 통합 타입 정의 - 새로운 상태 스키마
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department?: string
  organization?: string
  phone?: string
  mobile?: string
  status?: string
  createdAt: string
  updatedAt?: string
  lastLoginAt?: string
  // 발명자 영문 정보 추가
  nameEn?: string
  addressKr?: string
  addressEn?: string
}

export type UserRole = "PATENT_MANAGER" | "INVENTOR" | "US_ATTORNEY" | "EXTERNAL_REVIEWER"

export interface Patent {
  id: string
  managementNumber: string // PNU-2024-001 형식
  title: string
  titleEn?: string // 번역된 제목
  applicationNumber?: string // 한국 출원번호
  usApplicationNumber?: string // 미국 출원번호
  usRegistrationNumber?: string // 미국 등록번호
  pctApplicationNumber?: string // PCT 출원번호 추가
  filingDate: string
  inventors: string[] // 발명자 배열
  status: PatentStatus
  pctFiled: boolean
  usptoEligible: boolean
  dueDate?: string
  priority: "HIGH" | "MEDIUM" | "LOW"
  createdAt: string
  updatedAt: string
  createdBy: string
  assignedTo?: string // 담당자
}

// 새로운 5개 상태 정의
export type PatentStatus =
  | "NO_PROGRESS" // 번역대기: 새 특허 등록 후 번역 시작 전
  | "TRANSLATING" // 번역검토: 첫 번째 파일 업로드 ~ 번역완료 버튼 클릭 전
  | "TRANSLATION_REVIEW" // 번역 검토
  | "DOCUMENT_PREP" // 번역완료/서류준비: 번역완료 버튼 클릭 후 ~ 필수 서류 모두 업로드 전
  | "ATTORNEY_REVIEW" // 서류완료/출원진행: 필수 서류 모두 업로드 후 ~ 출원번호 입력 전
  | "USPTO_FILING" // 출원완료: 출원번호 입력 후
  | "OA_RESPONSE" // OA 대응
  | "USPTO_REGISTERED" // USPTO 등록

// 상태 전환 트리거 정의
export interface StatusTransition {
  from: PatentStatus
  to: PatentStatus
  trigger: "FILE_UPLOAD" | "TRANSLATION_COMPLETE_BUTTON" | "ALL_REQUIRED_DOCS_UPLOADED" | "APPLICATION_NUMBER_ENTERED"
  autoTransition: boolean
}

// 필수 서류 타입 정의
export type RequiredDocumentType =
  | "DECLARATION"
  | "ADS"
  | "IDS"
  | "ASSIGNMENT"
  | "SPECIFICATION"
  | "DRAWINGS"
  | "IDS_ATTACHMENTS"

export interface Translation {
  id: string
  patentId: string
  originalText: string
  translatedText: string
  editedText?: string // 편집된 번역문
  status: TranslationStatus
  progress: number // 0-100
  translator?: string // 번역자 (AI 또는 사용자)
  reviewer?: string // 검토자
  reviewerId?: string // 검토자 ID
  translationStartDate?: string // 번역 시작일
  translationEndDate?: string // 번역 완료일
  reviewStartDate?: string // 검토 시작일
  reviewEndDate?: string // 검토 완료일
  aiConfidence?: number // AI 신뢰도
  createdAt: string
  updatedAt: string
  completedAt?: string
  createdBy?: string
}

export type TranslationStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"

// 번역 편집 이력 타입 추가
export interface TranslationEditHistory {
  id: string
  translationId: string
  userId: string
  userName: string
  userRole: UserRole
  timestamp: string
  changes: EditChange[]
}

export interface EditChange {
  field: "title" | "abstract" | "claims" | "description"
  changeType: "ADD" | "MODIFY" | "DELETE"
  beforeContent: string
  afterContent: string
  changeDescription: string
  originalKorean?: string // 한글 원문 추가
}

// 번역 세션 (다중 번역 결과 관리)
export interface TranslationSession {
  id: string
  userId: string
  patentIds: string[]
  status: "IN_PROGRESS" | "COMPLETED"
  createdAt: string
  completedAt?: string
  results: TranslationResult[]
}

export interface TranslationResult {
  patentId: string
  originalTitle: string
  translatedTitle: string
  originalAbstract: string
  translatedAbstract: string
  status: "COMPLETED" | "ERROR"
  aiEngine: string
  completedAt: string
}

// 서류 관리 시스템 타입 정의
export interface DocumentPreparation {
  id: string
  patentId: string
  documents: DocumentItem[]
  overallStatus: DocumentOverallStatus
  // 번역 연결 정보 추가
  translationStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "LINKED"
  linkedTranslationIds: string[] // 연결된 번역 ID들
  translationCompletedAt?: string
  // 출원 연결 정보 추가
  readyForFiling: boolean
  filingTriggered: boolean
  createdAt: string
  updatedAt: string
  assignedAttorney?: string
}

export type DocumentOverallStatus =
  | "NOT_STARTED" // 출원준비
  | "DRAFT_WRITING" // 변호사 초안
  | "UNDER_REVIEW" // 파일 검토
  | "SIGNATURE_PENDING" // 서명파일 등록
  | "FINAL_REVIEW" // 최종확인
  | "COMPLETED" // 완료

export interface DocumentItem {
  id: string
  type: RequiredDocumentType | "OTHER"
  status: DocumentItemStatus
  files: DocumentFile[]
  linkedTranslationId?: string // 명세서의 경우 번역 연결
  createdAt: string
  updatedAt: string
  assignedTo?: string
  comments: DocumentComment[]
}

export type DocumentItemStatus =
  | "NOT_UPLOADED"
  | "ATTORNEY_UPLOADED"
  | "USER_UPLOADED"
  | "COMPLETED"
  | "TRANSLATION_WAITING"
  | "TRANSLATION_LINKED"
  | "UNDER_REVIEW"

export interface DocumentFile {
  id: string
  fileName: string
  originalFileName: string
  fileSize: number
  fileType: string
  filePath: string
  version: number
  uploadedBy: string
  uploadedAt: string
  isTemplate: boolean
  uploadType?: "ATTORNEY_DRAFT" | "USER_FINAL" // 업로드 타입 구분
  checksum?: string
  isValidated?: boolean
}

export interface DocumentComment {
  id: string
  documentType: RequiredDocumentType | "OTHER"
  content: string
  authorId: string
  authorName: string
  authorRole: UserRole
  createdAt: string
  updatedAt?: string
  parentId?: string
  replies?: DocumentComment[]
}

export interface Document {
  id: string
  patentId: string
  fileName: string
  fileType: string
  fileSize: number
  filePath: string
  uploadedBy: string
  uploadedAt: string
  category: DocumentCategory
  status: DocumentStatus
  version: number
}

export type DocumentCategory =
  | "SPECIFICATION"
  | "CLAIMS"
  | "DRAWINGS"
  | "ABSTRACT"
  | "TRANSLATION"
  | "LEGAL_DOCUMENT"
  | "OTHER"

export type DocumentStatus = "UPLOADED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED"

// USPTO 출원 관련 타입 정의 (간소화)
export interface Filing {
  id: string
  patentId: string
  type: FilingType
  status: FilingStatus
  // 서류 준비 연결 정보 추가
  documentPreparationId?: string
  documentsReady: boolean
  documentCompletedAt?: string
  // 기존 필드들...
  usApplicationNumber?: string // US 출원번호
  usFilingDate?: string // US 출원일
  usRegistrationNumber?: string // US 등록번호
  usRegistrationDate?: string // US 등록일
  // 변경사항 관리 (새로 추가)
  changes?: FilingChange[]
  // 기타서류 관리 (새로 추가)
  miscDocuments?: MiscDocument[]
  createdAt: string
  updatedAt: string
  documents: FilingDocument[] // 출원 관련 서류
}

// 변경사항 타입 (새로 추가)
export interface FilingChange {
  id: string
  title: string // 항목명 (예: 출원인 변경, 분할출원 등)
  content: string // 내용
  date: string // 일자
  documents: FilingDocument[] // 관련서류
  createdAt: string
  updatedAt: string
}

// 기타서류 타입 (새로 추가)
export interface MiscDocument {
  id: string
  title: string // 제목
  description: string // 내용/설명
  files: FilingDocument[] // 첨부파일들
  createdAt: string
  updatedAt: string
}

export type FilingType = "ATTORNEY_REVIEW" | "USPTO_FILING"

export type FilingStatus =
  | "PENDING_REVIEW"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PREPARING"
  | "FILED"
  | "PENDING_RECEIPT"
  | "RECEIVED"
  | "IN_PROGRESS"
  | "RESPONDED"
  | "ALLOWED"
  | "REGISTERED"
  | "ABANDONED"

// 출원 관련 서류 타입
export interface FilingDocument {
  id: string
  filingId?: string // Filing과 연결
  changeId?: string // FilingChange와 연결
  miscDocId?: string // MiscDocument와 연결
  category: FilingDocumentCategory
  fileName: string
  originalFileName: string
  fileSize: number
  fileType: string
  filePath: string
  uploadedBy: string
  uploadedAt: string
  version: number
}

export type FilingDocumentCategory =
  | "USPTO_FILING_DOCS" // USPTO 출원서류
  | "OA_RECEIVED_DOCS" // OA 접수서류
  | "OA_RESPONSE_DOCS" // OA 대응서류
  | "USPTO_REGISTRATION_DOCS" // USPTO 등록서류
  | "POST_FILING_DOCS" // 출원 후 기타서류
  | "CHANGE_DOCS" // 변경사항 관련서류

export interface Comment {
  id: string
  entityId: string // patentId, translationId 등
  entityType: "PATENT" | "TRANSLATION" | "DOCUMENT" | "FILING"
  content: string
  authorId: string
  authorName: string
  authorRole: UserRole
  parentId?: string // 답글인 경우
  createdAt: string
  updatedAt?: string
  isEdited: boolean
}

export interface Activity {
  id: string
  type: ActivityType
  entityId: string
  entityType: "PATENT" | "TRANSLATION" | "DOCUMENT" | "FILING"
  title: string
  description: string
  userId: string
  userName: string
  userRole: UserRole
  timestamp: string
  urgent: boolean
}

export type ActivityType =
  | "PATENT_CREATED"
  | "STATUS_CHANGED"
  | "TRANSLATION_COMPLETED"
  | "REVIEW_REQUESTED"
  | "DOCUMENT_UPLOADED"
  | "FILING_SUBMITTED"
  | "COMMENT_ADDED"

// 대시보드 통계 타입
export interface DashboardStats {
  totalPatents: number
  inProgress: number
  completed: number
  registered: number
  statusCounts: Record<
    PatentStatus,
    {
      total: number
      inProgress: number
      completed: number
      pending: number
    }
  >
}

// 번역 진행 현황
export interface TranslationProgress {
  patentId: string
  patentTitle: string
  status: TranslationStatus
  progress: number
  translator?: string
  reviewer?: string
  dueDate?: string
  urgent: boolean
  updatedAt: string
}

// 긴급 처리 항목
export interface UrgentItem {
  id: string
  type: "REVIEW_OVERDUE" | "FILING_DEADLINE" | "DOCUMENT_MISSING"
  patentId: string
  patentTitle: string
  description: string
  deadline?: string
  daysLeft?: number
  assignedTo?: string
  priority: "HIGH" | "CRITICAL"
}

// 워크플로우 상태 관리
export interface WorkflowTransition {
  id: string
  patentId: string
  fromStage: PatentStatus
  toStage: PatentStatus
  triggeredBy: string
  triggeredAt: string
  autoTriggered: boolean
  relatedEntityId?: string // Translation ID, DocumentPreparation ID 등
}

// 단계별 완료 조건
export interface StageCompletionCriteria {
  stage: PatentStatus
  requiredConditions: {
    translationCompleted?: boolean
    documentsUploaded?: boolean
    reviewCompleted?: boolean
    approvalReceived?: boolean
  }
  nextStage: PatentStatus
  autoTransition: boolean
}

// 상태별 표시 함수 타입
export interface StatusDisplayConfig {
  status: PatentStatus
  translationLabel: string
  documentLabel: string
  filingLabel: string
}

// OA 관련 타입 추가
export interface OAHistory {
  id: string
  patentId: string
  oaSequence: number
  oaNumber: string
  oaReceivedDate: string
  oaDeadline: string
  oaType: string
  status: "RECEIVED" | "IN_PROGRESS" | "RESPONDED" | "COMPLETED"
  responseDate?: string
  createdAt: string
  updatedAt: string
  documents: FilingDocument[]
  comments: OAComment[]
}

export interface OAComment {
  id: string
  oaHistoryId: string
  content: string
  authorId: string
  authorName: string
  authorRole: UserRole
  createdAt: string
}
