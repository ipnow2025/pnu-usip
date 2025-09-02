// 프론트엔드에서 사용할 API 클라이언트 함수들
export interface PatentWithInventors {
  id: string
  managementNumber: string
  title: string
  titleEn?: string
  applicationNumber?: string
  usApplicationNumber?: string
  usRegistrationNumber?: string
  pctApplicationNumber?: string
  filingDate: string
  pctFilingDate?: string
  status: string
  pctFiled: boolean
  usptoEligible: boolean
  dueDate?: string
  priority: "HIGH" | "MEDIUM" | "LOW"
  notes?: string
  createdAt: string
  updatedAt: string
  inventorId: number
  managerId: number
  inventors: Array<{
    id: string
    name: string
    email?: string
    role: string
    department?: string
  }>
  // 프론트엔드에서 계산되는 필드들
  daysLeft?: number
}

export interface PatentFilters {
  status?: string
  search?: string
  createdBy?: string
  page?: number
  limit?: number
}

export interface PatentResponse {
  data: PatentWithInventors[]
  total: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreatePatentData {
  managementNumber?: string
  title: string
  titleEn?: string
  applicationNumber?: string
  usApplicationNumber?: string
  usRegistrationNumber?: string
  pctApplicationNumber?: string
  filingDate: string
  pctFilingDate?: string
  status?: string
  pctFiled: boolean
  usptoEligible?: boolean
  dueDate?: string
  priority?: "HIGH" | "MEDIUM" | "LOW"
  notes?: string
  inventorId: number
  managerId: number
  inventors: string[]
  priorityPatents?: Array<{
    title: string
    filingDate: string
    applicationNumber: string
    inventors: string[]
  }>
}

export interface PriorityPatentData {
  id?: string
  title: string
  applicationNumber?: string
  filingDate?: string
  inventors: string[]
}

export interface UpdatePatentData extends Partial<CreatePatentData> {
  id: string
}

// API 클라이언트 함수들
export const patentsApi = {
  // 특허 목록 조회
  async getAll(filters?: PatentFilters): Promise<PatentResponse> {
    const params = new URLSearchParams()
    if (filters?.status) params.append("status", filters.status)
    if (filters?.search) params.append("search", filters.search)
    if (filters?.createdBy) params.append("createdBy", filters.createdBy)
    if (filters?.page) params.append("page", filters.page.toString())
    if (filters?.limit) params.append("limit", filters.limit.toString())

    const response = await fetch(`/api/patents?${params.toString()}`)
    if (!response.ok) {
      throw new Error("Failed to fetch patents")
    }

    const result = await response.json()
    return {
      data: result.data || [],
      total: result.total || 0,
      pagination: result.pagination || {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
      }
    }
  },

  // 특허 생성
  async create(data: CreatePatentData): Promise<PatentWithInventors> {
    const response = await fetch("/api/patents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to create patent")
    }

    const result = await response.json()
    return result.data
  },

  // 특허 상세 조회
  async getById(id: string): Promise<PatentWithInventors | null> {
    const response = await fetch(`/api/patents/${id}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error("Failed to fetch patent")
    }

    const result = await response.json()
    return result.data
  },

  // 특허 수정
  async update(id: string, data: Partial<CreatePatentData>): Promise<PatentWithInventors> {
    const response = await fetch(`/api/patents/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to update patent")
    }

    const result = await response.json()
    return result.data
  },

  // 특허 삭제
  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/patents/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to delete patent")
    }
  },

  // 통계 조회
  async getStats(): Promise<Record<string, number>> {
    const response = await fetch("/api/patents/stats")
    if (!response.ok) {
      throw new Error("Failed to fetch patent stats")
    }

    const result = await response.json()
    return result.data || {}
  },

  // 마감일 업데이트 대상 조회
  async getDueDateUpdateTargets(): Promise<{
    patents: Array<{
      id: string
      title: string
      filingDate: string
      pctFiled: boolean
      dueDate?: string
      calculatedDueDate: string
    }>
    count: number
  }> {
    const response = await fetch("/api/patents/update-due-dates")
    if (!response.ok) {
      throw new Error("Failed to fetch due date update targets")
    }

    const result = await response.json()
    return result.data || { patents: [], count: 0 }
  },

  // 마감일 일괄 업데이트
  async updateDueDates(): Promise<{
    message: string
    updatedCount: number
    updatedPatents: Array<{
      id: string
      title: string
      filingDate: string
      pctFiled: boolean
      dueDate: string
    }>
  }> {
    const response = await fetch("/api/patents/update-due-dates", {
      method: "POST",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to update due dates")
    }

    const result = await response.json()
    return {
      message: result.message,
      updatedCount: result.updatedCount,
      updatedPatents: result.updatedPatents
    }
  },

  // 우선권 특허 관련 API 함수들
  async getPriorityPatents(patentId: string): Promise<PriorityPatentData[]> {
    const response = await fetch(`/api/patents/${patentId}/priority-patents`)
    if (!response.ok) {
      throw new Error("Failed to fetch priority patents")
    }

    const result = await response.json()
    return result.data || []
  },

  async createPriorityPatent(patentId: string, data: PriorityPatentData): Promise<PriorityPatentData> {
    const response = await fetch(`/api/patents/${patentId}/priority-patents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to create priority patent")
    }

    const result = await response.json()
    return result.data
  },

  async updatePriorityPatent(patentId: string, priorityId: string, data: Partial<PriorityPatentData>): Promise<PriorityPatentData> {
    const response = await fetch(`/api/patents/${patentId}/priority-patents/${priorityId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to update priority patent")
    }

    const result = await response.json()
    return result.data
  },

  async deletePriorityPatent(patentId: string, priorityId: string): Promise<void> {
    const response = await fetch(`/api/patents/${patentId}/priority-patents/${priorityId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to delete priority patent")
    }
  },

  // 문서 관련 API 함수들
  async getDocuments(patentId: string): Promise<Array<{
    id: string
    type: string
    fileName: string
    filePath: string
    fileSize: number
    version: number
    status: string
    createdAt: string
  }>> {
    const response = await fetch(`/api/patents/${patentId}/documents`)
    if (!response.ok) {
      throw new Error("Failed to fetch documents")
    }

    const result = await response.json()
    return result.data || []
  },

  async uploadDocument(patentId: string, file: File, type: string): Promise<{
    id: string
    type: string
    fileName: string
    filePath: string
    fileSize: number
    version: number
    status: string
    createdAt: string
  }> {
    // FormData를 사용하여 파일 업로드
    const formData = new FormData()
    formData.append('type', type)
    formData.append('file', file)

    const response = await fetch(`/api/patents/${patentId}/documents`, {
      method: "POST",
      body: formData, // Content-Type은 브라우저가 자동으로 설정
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to upload document")
    }

    const result = await response.json()
    return result.data
  },

  async downloadDocument(patentId: string, documentId: string): Promise<{
    downloadUrl: string
    fileName: string
    fileSize: number
    fileType: string
  }> {
    const response = await fetch(`/api/patents/${patentId}/documents/${documentId}`)
    if (!response.ok) {
      throw new Error("Failed to get document URL")
    }

    const result = await response.json()
    return result.data
  },

  async deleteDocument(patentId: string, documentId: string): Promise<void> {
    const response = await fetch(`/api/patents/${patentId}/documents/${documentId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to delete document")
    }
  },
}
