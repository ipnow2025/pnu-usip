"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { FileText, CheckCircle, Clock, AlertCircle, Link } from "lucide-react"
import type { RequiredDocumentType } from "@/lib/types"
import { DocumentManagementInterface } from "@/components/documents/document-management-interface"

export default function DocumentsPage() {
  const searchParams = useSearchParams()
  const [selectedPatentIds, setSelectedPatentIds] = useState<string[]>([])
  const [showManagement, setShowManagement] = useState(false)
  const [patents, setPatents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPatents = async () => {
      try {
        const response = await fetch("/api/patents?section=document")
        if (response.ok) {
          const data = await response.json()
          const documentReadyPatents = data.data || []

          setPatents(documentReadyPatents)

          // URL 파라미터에서 patentId와 force 확인
          const patentIdFromUrl = searchParams.get('patentId')
          const force = searchParams.get('force') === 'true'

          if (patentIdFromUrl) {
            // URL에 patentId가 있으면 해당 특허를 찾거나 강제로 포함
            const targetPatent = documentReadyPatents.find((p: any) => p.id === patentIdFromUrl)
            
            if (targetPatent) {
              // 해당 특허가 이미 서류 관리 대상에 있으면 선택
              setSelectedPatentIds([patentIdFromUrl])
              setShowManagement(true)
            } else if (force) {
              // force=true이고 해당 특허가 서류 관리 대상에 없으면 해당 특허만 포함
              setSelectedPatentIds([patentIdFromUrl])
              setShowManagement(true)
            } else {
              // force=false이고 해당 특허가 없으면 첫 번째 특허 선택
              if (documentReadyPatents.length > 0) {
                setSelectedPatentIds([documentReadyPatents[0].id])
                setShowManagement(true)
              } else {
                setShowManagement(false)
              }
            }
          } else {
            // URL에 patentId가 없으면 기존 로직
            if (documentReadyPatents.length > 0) {
              setSelectedPatentIds([documentReadyPatents[0].id])
              setShowManagement(true)
            } else {
              setShowManagement(false)
            }
          }
        }
      } catch (error) {
        console.error("특허 데이터 로드 실패:", error)
      } finally {
        setLoading(false)
      }
    }

    loadPatents()
  }, [searchParams])

  const handleStatusUpdate = (patentId: string, newStatus: string) => {
    // 여기서 실제 상태 업데이트 로직 구현
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (showManagement && selectedPatentIds.length > 0) {
    return (
      <DocumentManagementInterface
        selectedPatentIds={selectedPatentIds}
        onClose={() => setShowManagement(false)}
        onStatusUpdate={handleStatusUpdate}
      />
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">서류 관리</h2>
            <p className="text-gray-600 mb-4">
              현재 서류 관리가 필요한 특허가 없습니다.
            </p>
            <Button onClick={() => (window.location.href = "/patents")}>특허 관리로 이동</Button>
          </div>
        </main>
      </div>
    </div>
  )
}

// 서류 타입별 한글명 - 기타서류 추가
const DOCUMENT_TYPE_NAMES: Record<RequiredDocumentType | 'OTHER', string> = {
  DECLARATION: "Declaration",
  ADS: "ADS (Application Data Sheet)",
  IDS: "IDS (Information Disclosure Statement)",
  ASSIGNMENT: "Assignment",
  SPECIFICATION: "명세서",
  DRAWINGS: "도면",
  IDS_ATTACHMENTS: "IDS 부속서류",
  OTHER: "기타서류",
}

// 서류 상태 설정 - 다크 모드 호환
const DOCUMENT_STATUS_CONFIG = {
  NOT_UPLOADED: {
    label: "미업로드",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    icon: Clock,
  },
  ATTORNEY_UPLOADED: {
    label: "변호사 업로드됨",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: FileText,
  },
  USER_UPLOADED: {
    label: "유저 업로드됨",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: CheckCircle,
  },
  COMPLETED: {
    label: "완료",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-200 dark:bg-green-900/40",
    icon: CheckCircle,
  },
  TRANSLATION_WAITING: {
    label: "번역 완료 대기중",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    icon: AlertCircle,
  },
  TRANSLATION_LINKED: {
    label: "번역 연결됨",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: Link,
  },
}
