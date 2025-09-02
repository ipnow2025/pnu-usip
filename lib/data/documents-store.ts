import { mockDocumentPreparations } from "@/lib/mock-data"
import type { DocumentPreparation } from "@/lib/types"

class DocumentsStore {
  private documents: Map<string, DocumentPreparation> = new Map()

  constructor() {
    this.initializeData()
  }

  private initializeData() {
    // mockDocumentPreparations 데이터를 저장
    mockDocumentPreparations.forEach((doc) => {
      this.documents.set(doc.id, doc)
    })
  }

  getAll(): DocumentPreparation[] {
    return Array.from(this.documents.values())
  }

  getById(id: string): DocumentPreparation | undefined {
    return this.documents.get(id)
  }

  getByPatentId(patentId: string): DocumentPreparation | undefined {
    return Array.from(this.documents.values()).find((doc) => doc.patentId === patentId)
  }

  create(document: Omit<DocumentPreparation, "id" | "createdAt" | "updatedAt">): DocumentPreparation {
    const newDocument: DocumentPreparation = {
      ...document,
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.documents.set(newDocument.id, newDocument)
    return newDocument
  }

  update(id: string, updates: Partial<DocumentPreparation>): DocumentPreparation | null {
    const document = this.documents.get(id)
    if (!document) return null

    const updated = {
      ...document,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    this.documents.set(id, updated)
    return updated
  }

  delete(id: string): boolean {
    return this.documents.delete(id)
  }

  // 상태별 필터링
  getByStatus(status: string): DocumentPreparation[] {
    return Array.from(this.documents.values()).filter((doc) => doc.overallStatus === status)
  }

  // 특허별 서류 준비 상태 확인
  getDocumentStatusByPatentId(patentId: string): {
    completed: number
    total: number
    progress: number
  } {
    const document = this.getByPatentId(patentId)
    if (!document) return { completed: 0, total: 0, progress: 0 }

    const essentialDocs = document.documents.filter((doc) => doc.type !== "OTHER")
    const completedDocs = essentialDocs.filter(
      (doc) =>
        doc.status === "COMPLETED" || doc.status === "TRANSLATION_LINKED",
    )

    return {
      completed: completedDocs.length,
      total: essentialDocs.length,
      progress: essentialDocs.length > 0 ? Math.round((completedDocs.length / essentialDocs.length) * 100) : 0,
    }
  }
}

// 싱글톤 인스턴스
export const documentsStore = new DocumentsStore()
