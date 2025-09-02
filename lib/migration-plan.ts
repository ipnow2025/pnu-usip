// =====================================================
// 목업 데이터 → 실제 API 마이그레이션 계획
// =====================================================

export interface MigrationPlan {
  // 1단계: 기본 CRUD API 구현
  phase1: {
    priority: "HIGH"
    tasks: ["사용자 CRUD API 구현", "특허 CRUD API 구현", "파일 업로드/다운로드 API 구현", "기본 데이터 시딩"]
    estimatedDays: 3
  }

  // 2단계: 번역 시스템 API
  phase2: {
    priority: "HIGH"
    tasks: ["번역 CRUD API 구현", "번역 파일 관리 API", "번역 상태 관리 API"]
    estimatedDays: 2
  }

  // 3단계: 서류 관리 API
  phase3: {
    priority: "MEDIUM"
    tasks: ["서류 준비 API 구현", "서류별 파일 관리 API", "서류 상태 관리 API", "코멘트 시스템 API"]
    estimatedDays: 3
  }

  // 4단계: 출원 관리 API
  phase4: {
    priority: "MEDIUM"
    tasks: ["출원 정보 API 구현", "변경사항 관리 API", "기타서류 관리 API", "OA 대응 API"]
    estimatedDays: 3
  }

  // 5단계: 대시보드 및 통계 API
  phase5: {
    priority: "LOW"
    tasks: ["대시보드 통계 API", "활동 로그 API", "워크플로우 전환 API"]
    estimatedDays: 2
  }
}

// 기존 코드에서 변경해야 할 부분들
export interface CodeChanges {
  // 1. Mock 데이터 제거
  removeMockData: ["lib/mock-data.ts 파일 제거", "lib/store.ts 파일 제거"]

  // 2. API 클라이언트 함수 생성
  createApiClients: [
    "lib/api/users.ts",
    "lib/api/patents.ts",
    "lib/api/translations.ts",
    "lib/api/documents.ts",
    "lib/api/filings.ts",
    "lib/api/files.ts",
  ]

  // 3. 컴포넌트에서 API 호출로 변경
  updateComponents: [
    "app/users/page.tsx - API 호출로 변경",
    "app/patents/page.tsx - API 호출로 변경",
    "app/translations/page.tsx - API 호출로 변경",
    "components/documents/document-management-interface.tsx - API 호출로 변경",
    "components/filing/filing-management-interface.tsx - API 호출로 변경",
  ]

  // 4. 파일 업로드 시스템 구현
  fileUploadSystem: [
    "파일 저장소 설정 (로컬/클라우드)",
    "파일 업로드 API 구현",
    "파일 미리보기/다운로드 API",
    "파일 보안 및 접근 제어",
  ]
}
