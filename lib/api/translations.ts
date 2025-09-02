// 번역 관련 API 클라이언트 함수들

import { prisma } from "@/lib/prisma"

export interface TranslationData {
  id: string
  patentId: string
  originalText: string
  translatedText?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REVIEWED' | 'APPROVED'
  translatorId?: number
  reviewerId?: number
  createdAt: string
  updatedAt: string
  patent?: {
    id: string
    title: string
    applicationNumber?: string
    status: string
    createdAt: string
    updatedAt: string
  }
}

export interface TranslationFilters {
  status?: string
  translatorId?: string
  reviewerId?: string
  page?: number
  limit?: number
}

export interface TranslationResponse {
  data: TranslationData[]
  total: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface TranslationFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
}

export interface TranslationUploadGroup {
  id: string
  patentId: string
  section: 'translation' | 'review'
  comment?: string
  files: TranslationFile[]
  isCompletion?: boolean
  translatedTitleUS?: string
  uploadedAt: string
}

export interface CreateTranslationData {
  patentId: string
  translatorId?: number
  reviewerId?: number
}

export interface UpdateTranslationData {
  status?: TranslationData['status']
  translatorId?: number
  reviewerId?: number
  translatedText?: string
}

export interface Translation {
  id: string
  patentId: string
  originalText: string
  translatedText: string | null
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  translatorId: number | null
  reviewerId: number | null
  createdAt: string
  updatedAt: string
}

export interface TranslationFile {
  id: string
  patentId: string
  section: string
  comment?: string
  files: any[]
  isCompletion: boolean
  translatedTitleUS?: string
  uploadedAt: string
}

// API 클라이언트 함수들
export const translationsApi = {
  // 번역 목록 조회
  async getAll(filters?: TranslationFilters): Promise<TranslationResponse> {
    const params = new URLSearchParams()
    if (filters?.status) params.append("status", filters.status)
    if (filters?.translatorId) params.append("translatorId", filters.translatorId)
    if (filters?.reviewerId) params.append("reviewerId", filters.reviewerId)
    if (filters?.page) params.append("page", filters.page.toString())
    if (filters?.limit) params.append("limit", filters.limit.toString())

    const response = await fetch(`/api/translations?${params.toString()}`)
    if (!response.ok) {
      throw new Error("Failed to fetch translations")
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

  // 번역 생성
  async create(data: { patentId: string }): Promise<Translation> {
    const response = await fetch('/api/translations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('번역 생성 실패')
    }

    return response.json()
  },

  // 번역 상태 업데이트
  async update(id: string, data: UpdateTranslationData): Promise<TranslationData> {
    const response = await fetch("/api/translations", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, ...data }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to update translation")
    }

    const result = await response.json()
    return result.data
  },

  // 번역 완료 처리
  async complete(translationId: string, data: { comment: string }): Promise<Translation> {
    const response = await fetch(`/api/translations/${translationId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('번역 완료 처리 실패')
    }

    return response.json()
  },

  // 번역 파일 업로드
  async uploadFiles(data: {
    patentId: string
    section: 'translation' | 'review'
    comment?: string
    files: File[]
    isCompletion?: boolean
    translatedTitleUS?: string
  }): Promise<TranslationFile> {
    // FormData를 사용하여 파일 업로드
    const formData = new FormData()
    formData.append('patentId', data.patentId)
    formData.append('section', data.section)
    if (data.comment) formData.append('comment', data.comment)
    if (data.isCompletion) formData.append('isCompletion', data.isCompletion.toString())
    if (data.translatedTitleUS) formData.append('translatedTitleUS', data.translatedTitleUS)
    
    // 파일들을 FormData에 추가
    data.files.forEach(file => {
      formData.append('files', file)
    })

    const response = await fetch('/api/translations/files', {
      method: 'POST',
      body: formData, // Content-Type은 브라우저가 자동으로 설정
    })

    if (!response.ok) {
      throw new Error('번역 파일 업로드 실패')
    }

    return response.json()
  },

  // 특허별 번역 파일 조회
  async getFilesByPatentId(patentId: string): Promise<TranslationFile[]> {
    const response = await fetch(`/api/translations/files?patentId=${patentId}`)
    
    if (!response.ok) {
      throw new Error('번역 파일 조회 실패')
    }

    const data = await response.json()
    return data.data || []
  },

  // 번역 파일 삭제
  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`/api/translations/file/${fileId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to delete translation file")
    }
  },

  // 특허 ID로 번역 정보 조회
  async getByPatentId(patentId: string): Promise<TranslationData | null> {
    const translations = await this.getAll()
    return translations.data.find(t => t.patentId === patentId) || null
  },
} 