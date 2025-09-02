// =====================================================
// API 엔드포인트 구조 정의
// =====================================================

export interface ApiEndpoints {
  // 사용자 관리
  users: {
    list: "GET /api/users"
    create: "POST /api/users"
    get: "GET /api/users/:id"
    update: "PUT /api/users/:id"
    delete: "DELETE /api/users/:id"
    search: "GET /api/users/search?name=:name"
  }

  // 특허 관리
  patents: {
    list: "GET /api/patents"
    create: "POST /api/patents"
    get: "GET /api/patents/:id"
    update: "PUT /api/patents/:id"
    delete: "DELETE /api/patents/:id"
    uploadFiles: "POST /api/patents/:id/files"
    getFiles: "GET /api/patents/:id/files"
    deleteFile: "DELETE /api/patents/:id/files/:fileId"
  }

  // 번역 관리
  translations: {
    list: "GET /api/translations"
    create: "POST /api/translations"
    get: "GET /api/translations/:id"
    update: "PUT /api/translations/:id"
    delete: "DELETE /api/translations/:id"
    uploadFile: "POST /api/translations/:id/files"
    getFiles: "GET /api/translations/:id/files"
    deleteFile: "DELETE /api/translations/:id/files/:fileId"
    getByPatent: "GET /api/patents/:patentId/translations"
  }

  // 서류 관리
  documents: {
    getByPatent: "GET /api/patents/:patentId/documents"
    updatePreparation: "PUT /api/patents/:patentId/documents"
    uploadFile: "POST /api/patents/:patentId/documents/:documentType/files"
    getFiles: "GET /api/patents/:patentId/documents/:documentType/files"
    deleteFile: "DELETE /api/patents/:patentId/documents/:documentType/files/:fileId"
    addComment: "POST /api/patents/:patentId/documents/comments"
    getComments: "GET /api/patents/:patentId/documents/comments"
  }

  // 출원 관리
  filings: {
    getByPatent: "GET /api/patents/:patentId/filing"
    update: "PUT /api/patents/:patentId/filing"
    uploadFile: "POST /api/patents/:patentId/filing/files"
    getFiles: "GET /api/patents/:patentId/filing/files"
    deleteFile: "DELETE /api/patents/:patentId/filing/files/:fileId"

    // 변경사항
    addChange: "POST /api/patents/:patentId/filing/changes"
    updateChange: "PUT /api/patents/:patentId/filing/changes/:changeId"
    deleteChange: "DELETE /api/patents/:patentId/filing/changes/:changeId"

    // 기타서류
    addMiscDoc: "POST /api/patents/:patentId/filing/misc-docs"
    updateMiscDoc: "PUT /api/patents/:patentId/filing/misc-docs/:miscDocId"
    deleteMiscDoc: "DELETE /api/patents/:patentId/filing/misc-docs/:miscDocId"

    // OA 관리
    addOA: "POST /api/patents/:patentId/oa"
    updateOA: "PUT /api/patents/:patentId/oa/:oaId"
    deleteOA: "DELETE /api/patents/:patentId/oa/:oaId"
    uploadOAFile: "POST /api/patents/:patentId/oa/:oaId/files"
    addOAComment: "POST /api/patents/:patentId/oa/:oaId/comments"
  }

  // 파일 관리
  files: {
    upload: "POST /api/files/upload"
    download: "GET /api/files/:fileId/download"
    preview: "GET /api/files/:fileId/preview"
    delete: "DELETE /api/files/:fileId"
  }

  // 대시보드
  dashboard: {
    stats: "GET /api/dashboard/stats"
    recentActivities: "GET /api/dashboard/activities"
    urgentItems: "GET /api/dashboard/urgent"
    translationProgress: "GET /api/dashboard/translation-progress"
    filingProgress: "GET /api/dashboard/filing-progress"
  }
}

// 요청/응답 타입 정의
export interface ApiRequest {
  // 사용자 생성
  createUser: {
    name: string
    nameEn?: string
    email?: string
    role: "PATENT_MANAGER" | "INVENTOR" | "US_ATTORNEY" | "EXTERNAL_REVIEWER"
    organization?: string
    department?: string
    phone?: string
    mobile?: string
    addressKr?: string
    addressEn?: string
  }

  // 특허 생성
  createPatent: {
    managementNumber: string
    title: string
    applicationNumber: string
    applicationType: "provisional" | "regular"
    filingDate: string
    registrationNumber?: string
    inventors: string[] // 발명자 ID 배열
    priorityPatents?: {
      title: string
      filingDate: string
      applicationNumber: string
      inventors: string[] // 발명자 ID 배열
    }[]
    pctFiled: boolean
    pctApplicationNumber?: string
    pctFilingDate?: string
    notes?: string
    files?: File[] // 업로드 파일들
  }

  // 번역 생성
  createTranslation: {
    patentId: string
    originalText: string
    translatedText?: string
    translator?: string
  }

  // 서류 파일 업로드
  uploadDocumentFile: {
    patentId: string
    documentType: string
    uploadType: "ATTORNEY_DRAFT" | "USER_FINAL"
    file: File
  }
}

export interface ApiResponse {
  // 표준 응답 형식
  success: boolean
  data?: any
  error?: string
  message?: string
}
