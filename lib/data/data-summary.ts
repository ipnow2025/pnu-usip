// =====================================================
// 현재 메모리 저장소 데이터 요약
// =====================================================

export interface DataSummary {
  users: {
    total: number
    byRole: Record<string, number>
  }
  patents: {
    total: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
  }
  translations: {
    total: number
    byStatus: Record<string, number>
  }
  documents: {
    total: number
    byStatus: Record<string, number>
  }
  filings: {
    total: number
    byStatus: Record<string, number>
    byType: Record<string, number>
  }
  files: {
    total: number
    byCategory: Record<string, number>
    totalSize: number
  }
}

// 현재 목업 데이터 현황
export const currentDataSummary: DataSummary = {
  users: {
    total: 4, // 기본 1명 + 추가 3명
    byRole: {
      INVENTOR: 4,
      PATENT_MANAGER: 0,
      US_ATTORNEY: 0,
      EXTERNAL_REVIEWER: 0,
    },
  },
  patents: {
    total: 3,
    byStatus: {
      NO_PROGRESS: 0,
      TRANSLATING: 1, // PNU-2024-001
      TRANSLATION_REVIEW: 0,
      DOCUMENT_PREP: 1, // PNU-2024-002
      ATTORNEY_REVIEW: 0,
      USPTO_FILING: 1, // PNU-2024-003
      OA_RESPONSE: 0,
      USPTO_REGISTERED: 0,
    },
    byPriority: {
      HIGH: 2, // PNU-2024-001, PNU-2024-003
      MEDIUM: 1, // PNU-2024-002
      LOW: 0,
    },
  },
  translations: {
    total: 2,
    byStatus: {
      NOT_STARTED: 0,
      IN_PROGRESS: 1, // PNU-2024-001
      COMPLETED: 1, // PNU-2024-002
      REVIEW_REQUIRED: 0,
    },
  },
  documents: {
    total: 2, // 2개 특허에 대한 서류 준비
    byStatus: {
      NOT_STARTED: 0,
      DRAFT_WRITING: 0,
      UNDER_REVIEW: 1, // PNU-2024-002
      SIGNATURE_PENDING: 1, // PNU-2024-003
      FINAL_REVIEW: 0,
      COMPLETED: 0,
    },
  },
  filings: {
    total: 1,
    byStatus: {
      PENDING_REVIEW: 0,
      IN_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
      PREPARING: 0,
      FILED: 1, // PNU-2024-003
      PENDING_RECEIPT: 0,
      RECEIVED: 0,
      IN_PROGRESS: 0,
      RESPONDED: 0,
      ALLOWED: 0,
      REGISTERED: 0,
      ABANDONED: 0,
    },
    byType: {
      ATTORNEY_REVIEW: 0,
      USPTO_FILING: 1, // PNU-2024-003
      OA_RESPONSE: 0,
      USPTO_REGISTRATION: 0,
    },
  },
  files: {
    total: 8, // 번역파일 4개 + 서류파일 4개 (예상)
    byCategory: {
      TRANSLATION_FILES: 4,
      DOCUMENT_FILES: 4,
      FILING_DOCUMENTS: 0,
      OA_DOCUMENTS: 0,
      PATENT_FILES: 0,
    },
    totalSize: 8388608, // 약 8MB (1MB * 8파일)
  },
}

// 데이터 관계 매핑
export const dataRelationships = {
  // 특허별 관련 데이터
  patent_001: {
    title: "인공지능 기반 특허 분석 시스템",
    status: "TRANSLATING",
    inventors: ["김철수", "이영희"],
    translation: "진행중",
    documents: "미시작",
    filing: "미시작",
  },
  patent_002: {
    title: "블록체인 기반 데이터 보안 시스템",
    status: "DOCUMENT_PREP",
    inventors: ["이영희", "박민수", "김철수"],
    translation: "완료",
    documents: "검토중",
    filing: "미시작",
  },
  patent_003: {
    title: "IoT 센서 네트워크 최적화 방법",
    status: "USPTO_FILING",
    inventors: ["박민수", "김철수", "이영희"],
    translation: "완료",
    documents: "서명대기",
    filing: "출원완료",
    oa: "1차 OA 대응중",
  },
}

// SQL 쿼리 예시 (실제 DB 연결 시 사용)
export const sampleQueries = {
  // 특허와 발명자 정보 조회
  getPatentsWithInventors: `
    SELECT 
      p.id, p.management_number, p.title, p.status, p.priority,
      GROUP_CONCAT(u.name ORDER BY pi.inventor_order) as inventors
    FROM patents p
    LEFT JOIN patent_inventors pi ON p.id = pi.patent_id
    LEFT JOIN users u ON pi.user_id = u.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `,

  // 번역 진행 현황 조회
  getTranslationProgress: `
    SELECT 
      p.management_number, p.title, t.status, t.translator_id, t.reviewer_id,
      DATEDIFF(NOW(), t.translation_start_date) as days_in_progress
    FROM translations t
    JOIN patents p ON t.patent_id = p.id
    WHERE t.status IN ('IN_PROGRESS', 'REVIEW_REQUIRED')
    ORDER BY days_in_progress DESC
  `,

  // 서류 준비 현황 조회
  getDocumentPreparationStatus: `
    SELECT 
      p.management_number, p.title, dp.overall_status,
      COUNT(di.id) as total_items,
      SUM(CASE WHEN di.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_items
    FROM document_preparations dp
    JOIN patents p ON dp.patent_id = p.id
    LEFT JOIN document_items di ON dp.id = di.document_preparation_id
    GROUP BY dp.id
    ORDER BY p.management_number
  `,

  // OA 대응 현황 조회
  getOAResponseStatus: `
    SELECT 
      p.management_number, p.title, oh.oa_sequence, oh.oa_type,
      oh.oa_received_date, oh.oa_deadline, oh.status,
      DATEDIFF(oh.oa_deadline, NOW()) as days_left
    FROM oa_histories oh
    JOIN patents p ON oh.patent_id = p.id
    WHERE oh.status IN ('RECEIVED', 'IN_PROGRESS')
    ORDER BY oh.oa_deadline ASC
  `,
}
