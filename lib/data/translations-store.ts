import { mockTranslations, mockPatents } from "@/lib/mock-data"

// SQL 스키마 기반 인터페이스
interface TranslationRecord {
  id: string
  patent_id: string
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "REVIEW_REQUIRED"
  translator_id?: string
  reviewer_id?: string
  translation_start_date?: string
  translation_end_date?: string
  review_start_date?: string
  review_end_date?: string
  notes?: string
  created_at: string
  updated_at: string
  created_by: string
}

interface TranslationFileRecord {
  id: string
  translation_id: string
  file_name: string
  file_path: string
  file_type: "ORIGINAL" | "TRANSLATED" | "REVIEWED"
  file_size: number
  uploaded_by: string
  uploaded_at: string
}

class TranslationsStore {
  private translations: Map<string, TranslationRecord> = new Map()
  private translationFiles: Map<string, TranslationFileRecord> = new Map()

  constructor() {
    this.initializeData()
  }

  private initializeData() {
    // mockTranslations 데이터를 TranslationRecord 형식으로 변환하여 저장
    mockTranslations.forEach((translation) => {
      const translationRecord: TranslationRecord = {
        id: translation.id,
        patent_id: translation.patentId,
        status: this.mapStatus(translation.status),
        translator_id: translation.translator === "AI Engine" ? "ai_engine" : translation.translator,
        reviewer_id: translation.reviewer,
        translation_start_date: translation.createdAt,
        translation_end_date: translation.completedAt,
        created_at: translation.createdAt,
        updated_at: translation.updatedAt,
        created_by: "system",
      }

      this.translations.set(translation.id, translationRecord)
    })
  }

  private mapStatus(status: string): "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "REVIEW_REQUIRED" {
    switch (status) {
      case "PENDING":
        return "NOT_STARTED"
      case "IN_PROGRESS":
        return "IN_PROGRESS"
      case "COMPLETED":
        return "COMPLETED"
      case "UNDER_REVIEW":
        return "REVIEW_REQUIRED"
      default:
        return "NOT_STARTED"
    }
  }

  // 기본 CRUD
  create(data: {
    patentId: string
    translatorId?: string
    reviewerId?: string
    notes?: string
    createdBy: string
  }): TranslationRecord {
    const id = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    const translation: TranslationRecord = {
      id,
      patent_id: data.patentId,
      status: "NOT_STARTED",
      translator_id: data.translatorId,
      reviewer_id: data.reviewerId,
      notes: data.notes,
      created_at: now,
      updated_at: now,
      created_by: data.createdBy,
    }

    this.translations.set(id, translation)
    return translation
  }

  getById(id: string): TranslationRecord | null {
    return this.translations.get(id) || null
  }

  getByPatentId(patentId: string): TranslationRecord | null {
    return Array.from(this.translations.values()).find((t) => t.patent_id === patentId) || null
  }

  getAll(filters?: {
    status?: TranslationRecord["status"]
    translatorId?: string
    reviewerId?: string
  }): TranslationRecord[] {
    let results = Array.from(this.translations.values())

    if (filters?.status) {
      results = results.filter((t) => t.status === filters.status)
    }

    if (filters?.translatorId) {
      results = results.filter((t) => t.translator_id === filters.translatorId)
    }

    if (filters?.reviewerId) {
      results = results.filter((t) => t.reviewer_id === filters.reviewerId)
    }

    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  update(id: string, data: Partial<TranslationRecord>): TranslationRecord | null {
    const translation = this.translations.get(id)
    if (!translation) return null

    const updated = {
      ...translation,
      ...data,
      updated_at: new Date().toISOString(),
    }

    this.translations.set(id, updated)
    return updated
  }

  delete(id: string): boolean {
    // 관련 파일들도 삭제
    const fileIds = Array.from(this.translationFiles.values())
      .filter((f) => f.translation_id === id)
      .map((f) => f.id)

    fileIds.forEach((fileId) => this.translationFiles.delete(fileId))

    return this.translations.delete(id)
  }

  // 번역과 특허 정보 조합 조회
  getTranslationWithPatent(translationId: string) {
    const translation = this.translations.get(translationId)
    if (!translation) return null

    const patent = mockPatents.find((p) => p.id === translation.patent_id)
    const files = this.getFiles(translationId)

    return {
      ...translation,
      patent,
      files,
    }
  }

  getTranslationsWithPatents() {
    return Array.from(this.translations.keys())
      .map((id) => this.getTranslationWithPatent(id))
      .filter(Boolean)
  }

  // 파일 관리
  addFile(data: {
    translationId: string
    fileName: string
    filePath: string
    fileType: TranslationFileRecord["file_type"]
    fileSize: number
    uploadedBy: string
  }): TranslationFileRecord {
    const id = `tf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const file: TranslationFileRecord = {
      id,
      translation_id: data.translationId,
      file_name: data.fileName,
      file_path: data.filePath,
      file_type: data.fileType,
      file_size: data.fileSize,
      uploaded_by: data.uploadedBy,
      uploaded_at: new Date().toISOString(),
    }

    this.translationFiles.set(id, file)
    return file
  }

  getFiles(translationId: string): TranslationFileRecord[] {
    return Array.from(this.translationFiles.values())
      .filter((f) => f.translation_id === translationId)
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
  }

  deleteFile(fileId: string): boolean {
    return this.translationFiles.delete(fileId)
  }

  // 통계
  getStatsByStatus(): Record<TranslationRecord["status"], number> {
    const stats = {
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      REVIEW_REQUIRED: 0,
    }

    Array.from(this.translations.values()).forEach((translation) => {
      stats[translation.status]++
    })

    return stats
  }
}

// 싱글톤 인스턴스
export const translationsStore = new TranslationsStore()
