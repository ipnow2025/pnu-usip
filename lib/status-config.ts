// 상태 표시 설정 및 전환 규칙
import type { PatentStatus, StatusTransition, StatusDisplayConfig } from "./types"

// 상태별 표시 라벨 설정
export const STATUS_DISPLAY_CONFIG: StatusDisplayConfig[] = [
  {
    status: "NO_PROGRESS",
    translationLabel: "번역대기",
    documentLabel: "", // 서류관리에서 표시 안함
    filingLabel: "", // USPTO 출원에서 표시 안함
  },
  {
    status: "TRANSLATING",
    translationLabel: "번역검토",
    documentLabel: "", // 서류관리에서 표시 안함
    filingLabel: "", // USPTO 출원에서 표시 안함
  },
  {
    status: "DOCUMENT_PREP",
    translationLabel: "번역완료",
    documentLabel: "서류준비",
    filingLabel: "", // USPTO 출원에서 표시 안함
  },
  {
    status: "ATTORNEY_REVIEW",
    translationLabel: "", // 번역관리에서 표시 안함
    documentLabel: "서류완료",
    filingLabel: "출원진행",
  },
  {
    status: "USPTO_FILING",
    translationLabel: "", // 번역관리에서 표시 안함
    documentLabel: "", // 서류관리에서 표시 안함
    filingLabel: "출원완료",
  },
]

// 상태 전환 규칙
export const STATUS_TRANSITIONS: StatusTransition[] = [
  {
    from: "NO_PROGRESS",
    to: "TRANSLATING",
    trigger: "FILE_UPLOAD",
    autoTransition: true,
  },
  {
    from: "TRANSLATING",
    to: "DOCUMENT_PREP",
    trigger: "TRANSLATION_COMPLETE_BUTTON",
    autoTransition: false,
  },
  {
    from: "DOCUMENT_PREP",
    to: "ATTORNEY_REVIEW",
    trigger: "ALL_REQUIRED_DOCS_UPLOADED",
    autoTransition: true,
  },
  {
    from: "ATTORNEY_REVIEW",
    to: "USPTO_FILING",
    trigger: "APPLICATION_NUMBER_ENTERED",
    autoTransition: true,
  },
]

// 필수 서류 목록
export const REQUIRED_DOCUMENTS = [
  "DECLARATION",
  "ADS",
  "IDS",
  "ASSIGNMENT",
  "SPECIFICATION",
  "DRAWINGS",
  "IDS_ATTACHMENTS",
] as const

// 페이지별 표시 상태 필터
export const PAGE_STATUS_FILTERS = {
  translation: ["NO_PROGRESS", "TRANSLATING", "DOCUMENT_PREP"],
  document: ["DOCUMENT_PREP", "ATTORNEY_REVIEW"],
  filing: ["ATTORNEY_REVIEW", "USPTO_FILING"],
} as const

// 상태별 표시 라벨 가져오기 함수
export function getStatusLabel(status: PatentStatus, context: "translation" | "document" | "filing"): string {
  const config = STATUS_DISPLAY_CONFIG.find((c) => c.status === status)
  if (!config) return status

  switch (context) {
    case "translation":
      return config.translationLabel
    case "document":
      return config.documentLabel
    case "filing":
      return config.filingLabel
    default:
      return status
  }
}

// 페이지별 필터링된 상태 가져오기
export function getPageStatuses(page: keyof typeof PAGE_STATUS_FILTERS): PatentStatus[] {
  return PAGE_STATUS_FILTERS[page] as unknown as PatentStatus[]
}

// 상태 전환 가능 여부 확인
export function canTransitionStatus(from: PatentStatus, to: PatentStatus): boolean {
  return STATUS_TRANSITIONS.some((t) => t.from === from && t.to === to)
}

// 다음 상태 가져오기
export function getNextStatus(currentStatus: PatentStatus): PatentStatus | null {
  const transition = STATUS_TRANSITIONS.find((t) => t.from === currentStatus)
  return transition ? transition.to : null
}
