// 전역 상태 관리를 위한 간단한 스토어
import type { Patent } from "./types"
import { mockPatents } from "./mock-data"

class PatentStore {
  private patents: Patent[] = [...mockPatents]
  private listeners: (() => void)[] = []

  getPatents(): Patent[] {
    return [...this.patents]
  }

  getPatent(id: string): Patent | undefined {
    return this.patents.find((p) => p.id === id)
  }

  updatePatent(id: string, updates: Partial<Patent>): void {
    const index = this.patents.findIndex((p) => p.id === id)
    if (index !== -1) {
      this.patents[index] = { ...this.patents[index], ...updates }
      this.notifyListeners()
    }
  }

  updatePatentTranslation(id: string, titleEn: string, abstractEn: string): void {
    const index = this.patents.findIndex((p) => p.id === id)
    if (index !== -1) {
      this.patents[index] = {
        ...this.patents[index],
        titleEn,
        status: "TRANSLATION_REVIEW", // 자동으로 검토 중 상태로 변경
        updatedAt: new Date().toISOString().split("T")[0], // YYYY-MM-DD 형식
      }
      // 상태 변경 후 즉시 알림
      this.notifyListeners()
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener())
  }
}

export const patentStore = new PatentStore()
