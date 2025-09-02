import { mockFilings } from "@/lib/mock-data"
import type { Filing } from "@/lib/types"

export class FilingsStore {
  private static filings = mockFilings

  static getAll(): Filing[] {
    return this.filings
  }

  static getById(id: string): Filing | undefined {
    return this.filings.find((filing) => filing.id === id)
  }

  static getByPatentId(patentId: string): Filing | undefined {
    return this.filings.find((filing) => filing.patentId === patentId)
  }

  static create(filing: Omit<Filing, "id" | "createdAt" | "updatedAt">): Filing {
    const newFiling: Filing = {
      ...filing,
      id: `filing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.filings.push(newFiling)
    return newFiling
  }

  static update(id: string, updates: Partial<Filing>): Filing | null {
    const index = this.filings.findIndex((filing) => filing.id === id)
    if (index === -1) return null

    this.filings[index] = {
      ...this.filings[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    return this.filings[index]
  }

  static delete(id: string): boolean {
    const index = this.filings.findIndex((filing) => filing.id === id)
    if (index === -1) return false

    this.filings.splice(index, 1)
    return true
  }

  // 상태별 필터링
  static getByStatus(status: string): Filing[] {
    return this.filings.filter((filing) => filing.status === status)
  }

  // 타입별 필터링
  static getByType(type: string): Filing[] {
    return this.filings.filter((filing) => filing.type === type)
  }

  // 출원 대기 중인 특허들
  static getPendingFilings(): Filing[] {
    return this.filings.filter((filing) => filing.type === "ATTORNEY_REVIEW" && filing.status === "PENDING_REVIEW")
  }

  // 출원 완료된 특허들
  static getCompletedFilings(): Filing[] {
    return this.filings.filter((filing) => filing.status === "FILED" || filing.status === "REGISTERED")
  }
}
