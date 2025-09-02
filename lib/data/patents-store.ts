import { mockPatents, mockUsers } from "@/lib/mock-data"
import type { User, PatentStatus } from "@/lib/types"

// SQL 스키마 기반 인터페이스 정의
interface PatentRecord {
  id: string
  management_number: string
  title: string
  title_en?: string
  application_number?: string
  us_application_number?: string
  us_registration_number?: string
  pct_application_number?: string
  filing_date: string
  status: PatentStatus
  pct_filed: boolean
  uspto_eligible: boolean
  priority: "HIGH" | "MEDIUM" | "LOW"
  notes?: string
  created_at: string
  updated_at: string
  created_by: string
  assigned_to?: string
}

interface PatentInventorRecord {
  id: string
  patent_id: string
  user_id: string
  inventor_order: number
  created_at: string
}

// 메모리 저장소
class PatentsStore {
  private patents: Map<string, PatentRecord> = new Map()
  private patentInventors: Map<string, PatentInventorRecord> = new Map()

  constructor() {
    this.initializeData()
  }

  private initializeData() {
    // mockPatents 데이터를 PatentRecord 형식으로 변환하여 저장
    mockPatents.forEach((patent) => {
      const patentRecord: PatentRecord = {
        id: patent.id,
        management_number: patent.managementNumber,
        title: patent.title,
        title_en: patent.titleEn,
        application_number: patent.applicationNumber,
        us_application_number: patent.usApplicationNumber,
        us_registration_number: patent.usRegistrationNumber,
        pct_application_number: patent.pctApplicationNumber,
        filing_date: patent.filingDate,
        status: patent.status,
        pct_filed: patent.pctFiled,
        uspto_eligible: patent.usptoEligible,
        priority: patent.priority,
        created_at: patent.createdAt,
        updated_at: patent.updatedAt,
        created_by: patent.createdBy,
        assigned_to: patent.assignedTo,
      }

      this.patents.set(patent.id, patentRecord)

      // 발명자 관계 생성
      patent.inventors.forEach((inventorName, index) => {
        // 발명자 이름으로 사용자 ID 찾기
        const user = mockUsers.find((u) => u.name === inventorName)
        if (user) {
          const inventorId = `pi_${patent.id}_${user.id}_${index}`
          this.patentInventors.set(inventorId, {
            id: inventorId,
            patent_id: patent.id,
            user_id: user.id,
            inventor_order: index + 1,
            created_at: patent.createdAt,
          })
        }
      })
    })
  }

  // 기본 CRUD 작업
  create(data: {
    managementNumber: string
    title: string
    applicationNumber?: string
    filingDate: string
    status?: PatentStatus
    pctFiled: boolean
    priority?: "HIGH" | "MEDIUM" | "LOW"
    notes?: string
    createdBy: string
    inventors: string[] // user IDs
  }): PatentRecord {
    const id = `patent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    const patent: PatentRecord = {
      id,
      management_number: data.managementNumber,
      title: data.title,
      application_number: data.applicationNumber,
      filing_date: data.filingDate,
      status: data.status || "NO_PROGRESS",
      pct_filed: data.pctFiled,
      uspto_eligible: true,
      priority: data.priority || "MEDIUM",
      notes: data.notes,
      created_at: now,
      updated_at: now,
      created_by: data.createdBy,
    }

    this.patents.set(id, patent)

    // 발명자 관계 생성
    data.inventors.forEach((userId, index) => {
      const inventorId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      this.patentInventors.set(inventorId, {
        id: inventorId,
        patent_id: id,
        user_id: userId,
        inventor_order: index + 1,
        created_at: now,
      })
    })

    return patent
  }

  getById(id: string): PatentRecord | null {
    return this.patents.get(id) || null
  }

  getAll(filters?: {
    status?: PatentStatus
    search?: string
    createdBy?: string
  }): PatentRecord[] {
    let results = Array.from(this.patents.values())

    if (filters?.status) {
      results = results.filter((p) => p.status === filters.status)
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase()
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.management_number.toLowerCase().includes(search) ||
          (p.application_number && p.application_number.toLowerCase().includes(search)),
      )
    }

    if (filters?.createdBy) {
      results = results.filter((p) => p.created_by === filters.createdBy)
    }

    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  update(id: string, data: Partial<PatentRecord>): PatentRecord | null {
    const patent = this.patents.get(id)
    if (!patent) return null

    const updated = {
      ...patent,
      ...data,
      updated_at: new Date().toISOString(),
    }

    this.patents.set(id, updated)
    return updated
  }

  delete(id: string): boolean {
    // 관련 데이터도 함께 삭제
    const patentInventorIds = Array.from(this.patentInventors.values())
      .filter((pi) => pi.patent_id === id)
      .map((pi) => pi.id)

    patentInventorIds.forEach((piId) => this.patentInventors.delete(piId))

    return this.patents.delete(id)
  }

  // 관계형 데이터 조회 (SQL JOIN과 동일)
  getPatentWithInventors(patentId: string): (PatentRecord & { inventors: User[] }) | null {
    const patent = this.patents.get(patentId)
    if (!patent) return null

    // 발명자 정보 조회
    const inventorRelations = Array.from(this.patentInventors.values())
      .filter((pi) => pi.patent_id === patentId)
      .sort((a, b) => a.inventor_order - b.inventor_order)

    const inventors: User[] = inventorRelations.map((rel) => {
      const user = mockUsers.find((u) => u.id === rel.user_id)
      return (
        user || {
          id: rel.user_id,
          name: `Unknown User (${rel.user_id})`,
          email: "",
          role: "INVENTOR" as const,
          department: undefined,
          createdAt: rel.created_at,
          nameEn: undefined,
          addressKr: undefined,
          addressEn: undefined,
        }
      )
    })

    return {
      ...patent,
      inventors,
    }
  }

  getPatentsWithInventors(): Array<PatentRecord & { inventors: User[] }> {
    return Array.from(this.patents.keys())
      .map((id) => this.getPatentWithInventors(id))
      .filter(Boolean) as Array<PatentRecord & { inventors: User[] }>
  }

  // 통계 조회
  getStatsByStatus(): Record<PatentStatus, number> {
    const stats: Record<PatentStatus, number> = {
      NO_PROGRESS: 0,
      TRANSLATING: 0,
      TRANSLATION_REVIEW: 0,
      DOCUMENT_PREP: 0,
      ATTORNEY_REVIEW: 0,
      USPTO_FILING: 0,
      OA_RESPONSE: 0,
      USPTO_REGISTERED: 0,
    }

    Array.from(this.patents.values()).forEach((patent) => {
      stats[patent.status]++
    })

    return stats
  }
}

// 싱글톤 인스턴스
export const patentsStore = new PatentsStore()
