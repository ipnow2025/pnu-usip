import type {
  Translation,
  DocumentPreparation,
  Filing,
  PatentStatus,
  WorkflowTransition,
  StageCompletionCriteria,
  DocumentItem,
} from "./types"

// 워크플로우 자동 전환 서비스
export class WorkflowService {
  // 단계별 완료 조건 정의
  private static readonly STAGE_CRITERIA: StageCompletionCriteria[] = [
    {
      stage: "TRANSLATING",
      requiredConditions: { translationCompleted: true },
      nextStage: "TRANSLATION_REVIEW",
      autoTransition: true,
    },
    {
      stage: "TRANSLATION_REVIEW",
      requiredConditions: { reviewCompleted: true, approvalReceived: true },
      nextStage: "DOCUMENT_PREP",
      autoTransition: true,
    },
    {
      stage: "DOCUMENT_PREP",
      requiredConditions: { documentsUploaded: true, reviewCompleted: true },
      nextStage: "ATTORNEY_REVIEW",
      autoTransition: true,
    },
    {
      stage: "ATTORNEY_REVIEW",
      requiredConditions: { approvalReceived: true },
      nextStage: "USPTO_FILING",
      autoTransition: false, // 수동 승인 필요
    },
  ]

  // 1. 번역 완료 → 서류 준비 자동 전환
  static async onTranslationCompleted(
    patentId: string,
    translationId: string,
    completedTranslations: Translation[],
  ): Promise<{
    shouldCreateDocumentPrep: boolean
    documentPrepData?: Partial<DocumentPreparation>
    statusUpdate?: PatentStatus
  }> {
    // 해당 특허의 모든 번역이 완료되었는지 확인
    const patentTranslations = completedTranslations.filter((t) => t.patentId === patentId)
    const allCompleted = patentTranslations.every((t) => t.status === "COMPLETED")

    if (!allCompleted) {
      return { shouldCreateDocumentPrep: false }
    }

    // 서류 준비 데이터 생성
    const documentPrepData: Partial<DocumentPreparation> = {
      patentId,
      translationStatus: "COMPLETED",
      linkedTranslationIds: patentTranslations.map((t) => t.id),
      translationCompletedAt: new Date().toISOString(),
      readyForFiling: false,
      filingTriggered: false,
      overallStatus: "NOT_STARTED",
      documents: this.createDefaultDocuments(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return {
      shouldCreateDocumentPrep: true,
      documentPrepData,
      statusUpdate: "DOCUMENT_PREP",
    }
  }

  // 2. 서류 준비 완료 → 출원 준비 자동 전환
  static async onDocumentPreparationCompleted(documentPrep: DocumentPreparation): Promise<{
    shouldCreateFiling: boolean
    filingData?: Partial<Filing>
    statusUpdate?: PatentStatus
  }> {
    // 필수 서류가 모두 완료되었는지 확인
    const essentialDocs = documentPrep.documents
    const allDocsCompleted = essentialDocs.every(
      (doc) =>
        doc.status === "COMPLETED" || doc.status === "USER_UPLOADED" || doc.status === "ATTORNEY_UPLOADED" || doc.status === "TRANSLATION_LINKED",
    )

    if (!allDocsCompleted) {
      return { shouldCreateFiling: false }
    }

    // 출원 데이터 생성
    const filingData: Partial<Filing> = {
      patentId: documentPrep.patentId,
      type: "ATTORNEY_REVIEW",
      status: "PENDING_REVIEW",
      documentPreparationId: documentPrep.id,
      documentsReady: true,
      documentCompletedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documents: [],
    }

    return {
      shouldCreateFiling: true,
      filingData,
      statusUpdate: "ATTORNEY_REVIEW",
    }
  }

  // 3. 상태 전환 이력 생성
  static createTransitionRecord(
    patentId: string,
    fromStage: PatentStatus,
    toStage: PatentStatus,
    triggeredBy: string,
    autoTriggered = true,
    relatedEntityId?: string,
  ): WorkflowTransition {
    return {
      id: `transition_${Date.now()}`,
      patentId,
      fromStage,
      toStage,
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      autoTriggered,
      relatedEntityId,
    }
  }

  // 4. 기본 서류 목록 생성
  private static createDefaultDocuments(): DocumentItem[] {
    return [
      {
        id: "declaration",
        type: "DECLARATION",
        status: "NOT_UPLOADED",
        files: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
      },
      {
        id: "ads",
        type: "ADS",
        status: "NOT_UPLOADED",
        files: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
      },
      {
        id: "ids",
        type: "IDS",
        status: "NOT_UPLOADED",
        files: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
      },
      {
        id: "assignment",
        type: "ASSIGNMENT",
        status: "NOT_UPLOADED",
        files: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
      },
      {
        id: "specification",
        type: "SPECIFICATION",
        status: "TRANSLATION_WAITING",
        files: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
      },
      {
        id: "drawings",
        type: "DRAWINGS",
        status: "NOT_UPLOADED",
        files: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
      },
      {
        id: "ids_attachments",
        type: "IDS_ATTACHMENTS",
        status: "NOT_UPLOADED",
        files: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
      },
    ]
  }

  // 5. 다음 단계 자동 생성 여부 확인
  static shouldAutoTransition(
    currentStage: PatentStatus,
    conditions: any,
  ): { shouldTransition: boolean; nextStage?: PatentStatus } {
    const criteria = this.STAGE_CRITERIA.find((c) => c.stage === currentStage)
    if (!criteria || !criteria.autoTransition) {
      return { shouldTransition: false }
    }

    // 조건 확인
    const meetsConditions = Object.entries(criteria.requiredConditions).every(
      ([key, required]) => !required || conditions[key],
    )

    return {
      shouldTransition: meetsConditions,
      nextStage: criteria.nextStage,
    }
  }

  // 6. 알림 메시지 생성
  static generateNotificationMessage(transition: WorkflowTransition, patentTitle: string): string {
    const stageNames = {
      NO_PROGRESS: "진행 없음",
      TRANSLATING: "번역 중",
      TRANSLATION_REVIEW: "번역 검토",
      DOCUMENT_PREP: "서류 준비",
      ATTORNEY_REVIEW: "변호사 검토",
      USPTO_FILING: "USPTO 출원",
      OA_RESPONSE: "OA 대응",
      USPTO_REGISTERED: "USPTO 등록",
    }

    return `📋 ${patentTitle}\n${stageNames[transition.fromStage]} → ${stageNames[transition.toStage]} 단계로 ${transition.autoTriggered ? "자동" : "수동"} 전환되었습니다.`
  }
}

// 상태 동기화 헬퍼
export class StatusSyncHelper {
  // 번역 상태 → 특허 상태 동기화
  static syncTranslationToPatent(translations: Translation[], patentId: string): PatentStatus {
    const patentTranslations = translations.filter((t) => t.patentId === patentId)

    if (patentTranslations.length === 0) return "NO_PROGRESS"

    const hasInProgress = patentTranslations.some((t) => t.status === "IN_PROGRESS")
    const allCompleted = patentTranslations.every((t) => t.status === "COMPLETED")

    if (hasInProgress) return "TRANSLATING"
    if (allCompleted) return "DOCUMENT_PREP"

    return "TRANSLATING"
  }

  // 서류 상태 → 특허 상태 동기화
  static syncDocumentToPatent(documentPrep: DocumentPreparation): PatentStatus {
    switch (documentPrep.overallStatus) {
      case "NOT_STARTED":
      case "DRAFT_WRITING":
      case "UNDER_REVIEW":
      case "SIGNATURE_PENDING":
      case "FINAL_REVIEW":
        return "DOCUMENT_PREP"
      case "COMPLETED":
        return "ATTORNEY_REVIEW"
      default:
        return "DOCUMENT_PREP"
    }
  }

  // 출원 상태 → 특허 상태 동기화
  static syncFilingToPatent(filing: Filing): PatentStatus {
    switch (filing.status) {
      case "PENDING_REVIEW":
      case "IN_REVIEW":
        return "ATTORNEY_REVIEW"
      case "APPROVED":
      case "PREPARING":
      case "FILED":
        return "USPTO_FILING"
      case "RECEIVED":
      case "IN_PROGRESS":
        return "OA_RESPONSE"
      case "REGISTERED":
        return "USPTO_REGISTERED"
      default:
        return "ATTORNEY_REVIEW"
    }
  }
}
