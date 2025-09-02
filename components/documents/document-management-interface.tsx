"use client"

import { CardDescription } from "@/components/ui/card"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import {
  FileText,
  Upload,
  Download,
  Eye,
  MessageSquare,
  Send,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Link,
  FolderOpen,
  UserCheck,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  Patent,
  DocumentPreparation,
  RequiredDocumentType,
  DocumentItemStatus,
  DocumentComment,
  Translation,
  DocumentFile,
  WorkflowTransition,
} from "@/lib/types"
import { DocumentUploadModal } from "@/features/document/components/document-upload-modal"
import { getCurrentUser } from "@/lib/permissions"
import { getS3Url } from "@/lib/getS3Url"
import { toast } from "sonner"

// 서류 타입별 한글명 - 기타서류 추가
const DOCUMENT_TYPE_NAMES: Record<RequiredDocumentType | 'OTHER', string> = {
  DECLARATION: "Declaration",
  ADS: "ADS (Application Data Sheet)",
  IDS: "IDS (Information Disclosure Statement)",
  ASSIGNMENT: "Assignment",
  SPECIFICATION: "번역 명세서",
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

interface DocumentManagementInterfaceProps {
  selectedPatentIds: string[]
  onClose: () => void
  onStatusUpdate?: (patentId: string, newStatus: string) => void
}

export function DocumentManagementInterface({
  selectedPatentIds,
  onClose,
  onStatusUpdate,
}: DocumentManagementInterfaceProps) {
  const [selectedPatentId, setSelectedPatentId] = useState<string>(selectedPatentIds[0] || "")
  const [patents, setPatents] = useState<Patent[]>([])
  const [documentPreps, setDocumentPreps] = useState<DocumentPreparation[]>([])
  const [availableTranslations, setAvailableTranslations] = useState<Translation[]>([])
  const [comments, setComments] = useState<DocumentComment[]>([])
  const [newComment, setNewComment] = useState("")
  const [selectedCommentDoc, setSelectedCommentDoc] = useState<RequiredDocumentType | 'OTHER'>("DECLARATION")
  const [uploadedFileObjects, setUploadedFileObjects] = useState<{ [key: string]: File }>({}) // 실제 파일 객체 저장
  const [workflowTransitions, setWorkflowTransitions] = useState<WorkflowTransition[]>([])
  const [loading, setLoading] = useState(true)

  // 페이징 상태 추가
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // 문서 업로드 모달 상태
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedDocumentType, setSelectedDocumentType] = useState<RequiredDocumentType | 'OTHER' | null>(null)
  const [selectedUploadType, setSelectedUploadType] = useState<"ATTORNEY_DRAFT" | "USER_FINAL">("USER_FINAL")

  // 특허 기본 정보 상태 추가
  const [patentBasicInfo, setPatentBasicInfo] = useState<any>(null)
  const [basicInfoLoading, setBasicInfoLoading] = useState(false)

  // 번역 파일 상태 추가
  const [translationFiles, setTranslationFiles] = useState<any[]>([])
  const [translationFilesLoading, setTranslationFilesLoading] = useState(false)

  // 문서 파일 상태 추가 - 특허별로 관리
  const [documentFilesByPatent, setDocumentFilesByPatent] = useState<{ [patentId: string]: any[] }>({})
  const [documentFilesLoading, setDocumentFilesLoading] = useState(false)

  // 코멘트 상태
  const [commentsLoading, setCommentsLoading] = useState(false)

  // -----------------------------------------------
  // Defer parent status sync to commit phase
  const prevOverallStatusRef = useRef<string | null>(null)

  useEffect(() => {
    if (!onStatusUpdate) return
    const currentDocPrep = documentPreps.find((dp) => dp.patentId === selectedPatentId)
    if (!currentDocPrep) return

    const currentStatus = currentDocPrep.overallStatus
    if (prevOverallStatusRef.current && prevOverallStatusRef.current !== currentStatus) {
      // Safe: runs after child has committed
      onStatusUpdate(selectedPatentId, currentStatus)
    }
    prevOverallStatusRef.current = currentStatus
  }, [documentPreps, selectedPatentId, onStatusUpdate])
  // -----------------------------------------------

  const currentUser = getCurrentUser()

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // 특허
        const patentsRes = await fetch("/api/patents")
        if (!patentsRes.ok) {
          const errText = await patentsRes.text()
          throw new Error(`특허 데이터 로드 실패 – ${patentsRes.status}: ${errText}`)
        }
        const patentsData = await patentsRes.json()

        // 서류
        const docsRes = await fetch("/api/documents")
        if (!docsRes.ok) {
          const errText = await docsRes.text()
          throw new Error(`서류 데이터 로드 실패 – ${docsRes.status}: ${errText}`)
        }
        const docsData = await docsRes.json()

        // 번역
        const transRes = await fetch("/api/translations")
        if (!transRes.ok) {
          const errText = await transRes.text()
          throw new Error(`번역 데이터 로드 실패 – ${transRes.status}: ${errText}`)
        }
        const transData = await transRes.json()

        setPatents(patentsData.data ?? [])
        setDocumentPreps(docsData.data ?? [])
        setAvailableTranslations(transData.data ?? [])

        // 모든 특허의 파일 데이터를 미리 로드
        const allPatents = patentsData.data ?? []
        const filesByPatent: { [patentId: string]: any[] } = {}
        
        for (const patent of allPatents) {
          try {
            const filesRes = await fetch(`/api/documents/${patent.id}/files`)
            if (filesRes.ok) {
              const filesData = await filesRes.json()
              filesByPatent[patent.id] = filesData.data.files || []
            } else {
              filesByPatent[patent.id] = []
            }
          } catch (error) {
            console.error(`특허 ${patent.id} 파일 로드 실패:`, error)
            filesByPatent[patent.id] = []
          }
        }
        
        setDocumentFilesByPatent(filesByPatent)
      } catch (err) {
        /* eslint-disable no-console */
        console.error("데이터 로드 오류:", err)
        // 실패해도 UI는 뜨도록 빈 배열로 초기화
        setPatents([])
        setDocumentPreps([])
        setAvailableTranslations([])
        setDocumentFilesByPatent({})
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedPatentIds])

  const selectedPatent = patents.find((p) => p.id === selectedPatentId) as Patent & {
    inventors: Inventor[]
  }
  
  // 선택된 특허에 대한 DocumentPreparation이 없으면 기본값 생성
  const selectedDocPrep = documentPreps.find((dp) => dp.patentId === selectedPatentId) || {
    id: `default_${selectedPatentId}`,
    patentId: selectedPatentId,
    documents: [],
    overallStatus: "NOT_STARTED" as const,
    translationStatus: "NOT_STARTED" as const,
    linkedTranslationIds: [],
    readyForFiling: false,
    filingTriggered: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // 특허 선택 시 기본 정보 조회
  useEffect(() => {
    if (selectedPatentId) {
      fetchPatentBasicInfo(selectedPatentId)
      fetchTranslationFiles(selectedPatentId)
      fetchComments(selectedPatentId)
    }
  }, [selectedPatentId])

  // 기본 필수 서류 타입들 정의
  const REQUIRED_DOCUMENT_TYPES: (RequiredDocumentType | 'OTHER')[] = [
    "DECLARATION",
    "ASSIGNMENT",
    "IDS",
    "IDS_ATTACHMENTS",
    "ADS",
    "SPECIFICATION",
    "DRAWINGS",
    "OTHER",
  ]

  // 기본 서류 아이템 생성 함수 추가
  const createDefaultDocumentItem = (type: RequiredDocumentType | 'OTHER'): any => ({
    id: `default_${type}_${selectedPatentId}`,
    type,
    status: type === "SPECIFICATION" ? "TRANSLATION_PENDING" : "NOT_UPLOADED",
    files: [],
    linkedTranslationId: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedTo: undefined,
    comments: [],
  })

  // 특허별 전체 서류 목록 생성 함수 (공통 로직)
  const getAllDocumentsForPatent = (patentId: string) => {
    const docPrep = documentPreps.find((dp) => dp.patentId === patentId)
    
    return REQUIRED_DOCUMENT_TYPES.map((type) => {
      const existingDoc = docPrep?.documents.find((doc) => doc.type === type)
      return existingDoc || createDefaultDocumentItem(type)
    })
  }

  // selectedDocPrep 사용하는 부분에서 전체 서류 목록 생성
  const allDocuments = getAllDocumentsForPatent(selectedPatentId)

  // 특허별 완료 상태 계산 함수 (공통 로직 사용)
  const calculatePatentProgress = (patentId: string) => {
    const allDocsForPatent = getAllDocumentsForPatent(patentId)
    const essentialDocs = allDocsForPatent.filter((doc) => doc.type !== "OTHER")

    if (essentialDocs.length === 0) return 0

    const completedDocs = essentialDocs.filter(
      (doc) =>
        getDocumentStatus(doc, patentId) === "COMPLETED" ||
        getDocumentStatus(doc, patentId) === "USER_UPLOADED" ||
        getDocumentStatus(doc, patentId) === "ATTORNEY_UPLOADED" ||
        getDocumentStatus(doc, patentId) === "TRANSLATION_LINKED",
    ).length

    return Math.round((completedDocs / essentialDocs.length) * 100)
  }

  // 특허별 완료된 서류 개수 계산 함수 (공통 로직)
  const getPatentDocumentCounts = (patentId: string) => {
    const allDocsForPatent = getAllDocumentsForPatent(patentId)
    const essentialDocs = allDocsForPatent.filter((doc) => doc.type !== "OTHER")
    const completedDocs = essentialDocs.filter(
      (doc) =>
        getDocumentStatus(doc, patentId) === "COMPLETED" ||
        getDocumentStatus(doc, patentId) === "USER_UPLOADED" ||
        getDocumentStatus(doc, patentId) === "ATTORNEY_UPLOADED" ||
        getDocumentStatus(doc, patentId) === "TRANSLATION_LINKED",
    ).length

    return {
      completed: completedDocs,
      total: essentialDocs.length,
    }
  }

  // 페이징된 특허 목록 계산 - 최신 생성순 정렬
  const allPatents = patents
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const totalPages = Math.ceil(allPatents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPatents = allPatents.slice(startIndex, endIndex)

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const calculateProgress = () => {
    const essentialDocs = allDocuments.filter((doc) => doc.type !== "OTHER")
    const totalDocs = essentialDocs.length
    const completedDocs = essentialDocs.filter(
      (doc) =>
        getDocumentStatus(doc, selectedPatentId) === "COMPLETED" ||
        getDocumentStatus(doc, selectedPatentId) === "USER_UPLOADED" ||
        getDocumentStatus(doc, selectedPatentId) === "ATTORNEY_UPLOADED" ||
        getDocumentStatus(doc, selectedPatentId) === "TRANSLATION_LINKED",
    ).length

    return totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0
  }

  // 문서 업로드 모달에서 업로드 완료 시 호출되는 함수
  const handleDocumentUpload = async (documentData: any) => {
    try {
      // 업로드 완료 후 해당 특허의 파일 목록 새로고침
      if (selectedPatentId) {
        const response = await fetch(`/api/documents/${selectedPatentId}/files`)
        if (response.ok) {
          const result = await response.json()
          const files = result.data.files || []
          
          setDocumentFilesByPatent(prev => ({
            ...prev,
            [selectedPatentId]: files
          }))
        }
      }
      
      // 성공 메시지 표시
      toast.success('파일이 성공적으로 업로드되었습니다.')
    } catch (error) {
      console.error("업로드 오류:", error)
      toast.error('파일 업로드에 실패했습니다.')
      throw error
    }
  }

  // 문서 업로드 버튼 클릭 핸들러
  const handleUploadClick = (
    documentType: RequiredDocumentType | 'OTHER',
    uploadType: "ATTORNEY_DRAFT" | "USER_FINAL" = "USER_FINAL",
  ) => {
    setSelectedDocumentType(documentType)
    setSelectedUploadType(uploadType)
    setIsUploadModalOpen(true)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 파일 삭제 핸들러
  const handleFileDelete = async (documentType: RequiredDocumentType | 'OTHER', fileId: string) => {
    if (!confirm("파일을 삭제하시겠습니까?")) return

    try {
      // 실제 파일 객체도 삭제
      setUploadedFileObjects((prev) => {
        const newObjects = { ...prev }
        delete newObjects[fileId]
        return newObjects
      })

      // API 호출하여 실제 파일 삭제
      const response = await fetch(`/api/documents/${selectedPatentId}/files/${fileId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('파일 삭제에 실패했습니다.')
      }

      // 해당 특허의 파일 목록 새로고침
      if (selectedPatentId) {
        const filesResponse = await fetch(`/api/documents/${selectedPatentId}/files`)
        if (filesResponse.ok) {
          const result = await filesResponse.json()
          const files = result.data.files || []
          
          setDocumentFilesByPatent(prev => ({
            ...prev,
            [selectedPatentId]: files
          }))
        }
      }

      toast.success('파일이 성공적으로 삭제되었습니다.')
    } catch (error) {
      console.error('파일 삭제 오류:', error)
      toast.error('파일 삭제에 실패했습니다.')
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return

    try {
      const response = await fetch(`/api/documents/${selectedPatentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentType: selectedCommentDoc,
          content: newComment.trim()
        })
      })

      if (!response.ok) {
        throw new Error('코멘트 작성에 실패했습니다.')
      }

      const result = await response.json()
      
      // 새 코멘트를 목록에 추가
      setComments((prev) => [result.data, ...prev])
      setNewComment("")
      
      toast.success('코멘트가 성공적으로 작성되었습니다.')
    } catch (error) {
      console.error('코멘트 작성 오류:', error)
      toast.error('코멘트 작성에 실패했습니다.')
    }
  }

  function getDocumentStatus(doc: any, patentId?: string): string {
    const targetPatentId = patentId || selectedPatentId
    
    if (doc.type === "SPECIFICATION") {
      // 해당 특허의 번역이 완료되었는지 확인
      const patentTranslations = availableTranslations.filter((t) => t.patentId === targetPatentId)
      const hasCompletedTranslation = patentTranslations.some((t) => 
        t.status === "COMPLETED"
      )
      
      if (hasCompletedTranslation) return "TRANSLATION_LINKED"
      return "TRANSLATION_WAITING"
    }

    // 특정 특허의 파일들에서 해당 서류 타입의 파일들을 찾기
    const patentFiles = documentFilesByPatent[targetPatentId] || []
    const filesForThisType = patentFiles.filter((f: any) => f.documentType === doc.type)

    if (filesForThisType.length === 0) {
      return "NOT_UPLOADED"
    }

    // 업로드 타입에 따른 상태 결정
    const hasAttorneyFiles = filesForThisType.some((f: any) => f.uploadType === "ATTORNEY_DRAFT")
    const hasUserFiles = filesForThisType.some((f: any) => f.uploadType === "USER_FINAL")

    if (hasUserFiles && hasAttorneyFiles) return "COMPLETED"
    if (hasUserFiles) return "USER_UPLOADED"
    if (hasAttorneyFiles) return "ATTORNEY_UPLOADED"

    return "NOT_UPLOADED"
  }

  // 미리보기 핸들러 - 바로 새탭에서 열기
  const handlePreview = async (file: DocumentFile) => {

    // 실제 파일 객체가 있는지 확인
    const actualFile = uploadedFileObjects[file.id]

    if (actualFile) {
      try {
        if (actualFile.type === "application/pdf" || actualFile.type.startsWith("image/")) {
          // PDF나 이미지 파일은 새탭에서 바로 열기
          const fileUrl = URL.createObjectURL(actualFile)
          window.open(fileUrl, "_blank")

          // 메모리 정리를 위해 일정 시간 후 URL 해제
          setTimeout(() => {
            URL.revokeObjectURL(fileUrl)
          }, 60000) // 1분 후 정리
        } else if (actualFile.type.includes("text") || actualFile.name.endsWith(".txt")) {
          // 텍스트 파일은 내용을 읽어서 새탭에 표시
          const textContent = await actualFile.text()
          const newWindow = window.open("", "_blank")
          if (newWindow) {
            newWindow.document.write(`
              <html>
                <head><title>${file.originalFileName}</title></head>
                <body style="font-family: monospace; white-space: pre-wrap; padding: 20px;">
                  ${textContent}
                </body>
              </html>
            `)
            newWindow.document.close()
          }
        } else {
          // 기타 파일은 다운로드
          const url = URL.createObjectURL(actualFile)
          const link = document.createElement("a")
          link.href = url
          link.download = file.originalFileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)

          alert(`${file.originalFileName} 파일이 다운로드되었습니다.`)
        }
      } catch (error) {
        console.error("파일 미리보기 오류:", error)
        alert("파일 미리보기 중 오류가 발생했습니다: " + (error as Error).message)
      }
    } else {
      alert("⚠️ 기존 파일은 실제 서버 연동 후 미리보기가 가능합니다.")
    }
  }

  // 다운로드 핸들러
  const handleDownload = (file: DocumentFile) => {
    // 실제 파일 객체가 있는지 확인
    const actualFile = uploadedFileObjects[file.id]

    if (actualFile) {
      // 실제 파일 다운로드
      const url = URL.createObjectURL(actualFile)
      const link = document.createElement("a")
      link.href = url
      link.download = file.originalFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } else {
      // 기존 파일의 경우 (실제 파일 객체가 없음)
      alert(
        `⚠️ ${file.originalFileName}\n\n이 파일은 기존에 업로드된 파일로, 실제 서버 연동 후 다운로드가 가능합니다.\n\n현재는 새로 업로드한 파일만 다운로드할 수 있습니다.`,
      )
    }
  }

  // --- helper: safely read inventor data --------------------
  type Inventor =
    | string
    | {
        id: string
        name: string
        nameEn?: string
        addressKr?: string
        addressEn?: string
      }

  function readInventor(inv: Inventor) {
    if (typeof inv === "string") {
      return {
        name: inv,
        nameEn: undefined,
        addressKr: undefined,
        addressEn: undefined,
      }
    }
    return {
      name: inv.name,
      nameEn: inv.nameEn,
      addressKr: inv.addressKr,
      addressEn: inv.addressEn,
    }
  }

  // 특허 기본 정보 조회 함수
  const fetchPatentBasicInfo = async (patentId: string) => {
    try {
      setBasicInfoLoading(true)
      const response = await fetch(`/api/patents/${patentId}/basic-info`)
      
      if (!response.ok) {
        throw new Error('특허 기본 정보 조회 실패')
      }
      
      const result = await response.json()
      setPatentBasicInfo(result.data)
    } catch (error) {
      console.error('특허 기본 정보 조회 오류:', error)
      setPatentBasicInfo(null)
    } finally {
      setBasicInfoLoading(false)
    }
  }

  // 번역 파일 조회 함수
  const fetchTranslationFiles = async (patentId: string) => {
    try {
      setTranslationFilesLoading(true)
      const response = await fetch(`/api/patents/${patentId}/translation-files`)
      
      if (!response.ok) {
        throw new Error('번역 파일 조회 실패')
      }
      
      const result = await response.json()
      setTranslationFiles(result.data || [])
    } catch (error) {
      console.error('번역 파일 조회 오류:', error)
      setTranslationFiles([])
    } finally {
      setTranslationFilesLoading(false)
    }
  }

  // 코멘트 조회 함수
  const fetchComments = async (patentId: string) => {
    try {
      setCommentsLoading(true)
      const response = await fetch(`/api/documents/${patentId}/comments`)
      
      if (!response.ok) {
        throw new Error('코멘트 조회 실패')
      }
      
      const result = await response.json()
      setComments(result.data || [])
    } catch (error) {
      console.error('코멘트 조회 오류:', error)
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }

  // 서버를 통해 파일을 가져와서 다운로드 URL 생성
  const getDownloadUrl = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(`/api/file?url=${encodeURIComponent(fileUrl)}`)
      
      if (!response.ok) {
        throw new Error('파일을 가져올 수 없습니다.')
      }
      
      const { type, arrayBuffer } = await response.json()
      
      const blob = new Blob([Uint8Array.from(arrayBuffer)], { type })
      const downloadUrl = window.URL.createObjectURL(blob)
      
      // 다운로드 실행
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 메모리 정리
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('파일 다운로드 실패:', error)
      toast.error('파일 다운로드에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!selectedPatent || !selectedDocPrep) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-gray-400" />
              <div>
                <p className="text-gray-600 font-medium">선택된 특허 정보를 찾을 수 없습니다.</p>
                <p className="text-sm text-gray-500 mt-2">선택된 특허 ID: {selectedPatentIds.join(", ")}</p>
                <p className="text-sm text-gray-500">
                  특허 데이터: {patents.length}개, 서류 준비 데이터: {documentPreps.length}개
                </p>
              </div>
              <Button onClick={onClose} className="mt-4">
                돌아가기
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const progress = calculateProgress()
  const currentPatentCounts = getPatentDocumentCounts(selectedPatentId)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* 왼쪽 특허 목록 */}
            <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">서류관리 특허({allPatents.length})</h2>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {/* 특허 목록 */}
                  <div className="space-y-2">
                    {paginatedPatents.map((patent) => {
                      const patentProgress = calculatePatentProgress(patent.id)
                      const patentCounts = getPatentDocumentCounts(patent.id)
                      const isCompleted = patentProgress === 100

                      return (
                        <Card
                          key={patent.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedPatentId === patent.id
                              ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : ""
                          }`}
                          onClick={() => setSelectedPatentId(patent.id)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-xs">
                                  {patent.managementNumber}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={isCompleted ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}
                                >
                                  {isCompleted ? "완료" : "진행중"}
                                </Badge>
                              </div>
                              <h3 className="font-medium text-sm line-clamp-2">{patent.title}</h3>
                              <div className="flex items-center space-x-2">
                                <Progress value={patentProgress} className="h-1 flex-1" />
                                <span className="text-xs text-gray-500">{patentProgress}%</span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <FileText className="h-3 w-3" />
                                <span>
                                  {patentCounts.completed}/{patentCounts.total} 완료
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* 페이징 - 하단 고정 */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      총 {allPatents.length}건 중 {startIndex + 1}-{Math.min(endIndex, allPatents.length)}건
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 px-2"
                      >
                        이전
                      </Button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-8 h-8 p-0 ${
                                currentPage === pageNum
                                  ? "bg-blue-600 text-white"
                                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-8 px-2"
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 오른쪽 서류 관리 영역 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* 특허 기본 정보 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>특허 기본 정보</span>
                      <Badge variant="outline" className="px-3 py-1">
                        {patentBasicInfo?.managementNumber || selectedPatent?.managementNumber || "로딩 중..."}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {basicInfoLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">특허 정보를 불러오는 중...</span>
                      </div>
                    ) : patentBasicInfo ? (
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">특허제목(한)</label>
                            <p className="font-medium">{patentBasicInfo.title}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">특허제목(영)</label>
                            <p className="font-medium">
                              {patentBasicInfo.translationStatus === 'COMPLETED' 
                                ? (patentBasicInfo.titleEn || "번역 필요") 
                                : "번역 완료 대기중"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">출원번호(KR)</label>
                            <p className="font-medium">{patentBasicInfo.applicationNumber || "미정"}</p>
                          </div>
                          {patentBasicInfo.translationStatus === 'COMPLETED' && patentBasicInfo.abstractEn && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">번역된 초록</label>
                              <p className="text-sm text-gray-700 max-h-32 overflow-y-auto">
                                {patentBasicInfo.abstractEn}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">발명자 정보</label>
                            <div className="space-y-2">
                              {patentBasicInfo.inventors && patentBasicInfo.inventors.length > 0 ? (
                                patentBasicInfo.inventors.map((inv: any, idx: number) => {
                                  const { name, nameEn, addressKr, addressEn } = readInventor(inv)

                                  return (
                                    <div key={idx} className="border-l-2 border-blue-200 pl-3">
                                      <p className="font-medium">
                                        {name}
                                        {nameEn ? ` (${nameEn})` : " (영문명 필요)"}
                                      </p>
                                      {addressKr && <p className="text-sm text-gray-600">주소: {addressKr}</p>}
                                      {addressEn && <p className="text-sm text-gray-600">Address: {addressEn}</p>}
                                    </div>
                                  )
                                })
                              ) : (
                                <p className="text-sm text-gray-500">발명자 정보가 없습니다.</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">번역 상태</label>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant="outline" 
                                className={
                                  patentBasicInfo.translationStatus === 'COMPLETED' 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-gray-100 text-gray-800"
                                }
                              >
                                {patentBasicInfo.translationStatus === 'COMPLETED' ? '번역 완료' : '번역 대기'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>특허 정보를 불러올 수 없습니다.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 필수 서류 리스트 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>필수 서류 리스트</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">진행 현황:</span>
                        <Badge variant="outline">
                          {currentPatentCounts.completed}/{currentPatentCounts.total} 완료
                        </Badge>
                      </div>
                    </CardTitle>
                    <CardDescription>USPTO 출원을 위한 필수 서류 준비 현황</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* 2-2-2-2 레이아웃으로 변경 */}
                    <div className="grid grid-cols-2 gap-4">
                      {allDocuments.map((document) => {
                        const status = getDocumentStatus(document)
                        const statusConfig = DOCUMENT_STATUS_CONFIG[status as keyof typeof DOCUMENT_STATUS_CONFIG]
                        const Icon = statusConfig.icon
                        const isOtherDoc = document.type === "OTHER"

                        return (
                          <DocumentCard
                            key={document.id}
                            document={document}
                            status={status}
                            statusConfig={statusConfig}
                            Icon={Icon}
                            onUploadClick={handleUploadClick}
                            onFileDelete={handleFileDelete}
                            availableTranslations={availableTranslations}
                            isOptional={isOtherDoc}
                            onPreview={handlePreview}
                            onDownload={handleDownload}
                            translationFiles={translationFiles}
                            translationFilesLoading={translationFilesLoading}
                            getDownloadUrl={getDownloadUrl}
                            formatFileSize={formatFileSize}
                            documentFiles={(documentFilesByPatent[selectedPatentId] || []).filter(f => f.documentType === document.type)}
                            documentFilesLoading={documentFilesLoading}
                          />
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* 코멘트 시스템 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      서류 코멘트
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 코멘트 작성 */}
                    <div className="space-y-3">
                      <Select value={selectedCommentDoc} onValueChange={(value) => setSelectedCommentDoc(value as any)}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DOCUMENT_TYPE_NAMES).map(([type, name]) => (
                            <SelectItem key={type} value={type}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex space-x-2">
                        <Textarea
                          placeholder="코멘트를 입력하세요..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="flex-1"
                          rows={3}
                        />
                        <Button onClick={handleSubmitComment} disabled={!newComment.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* 코멘트 목록 */}
                    <div className="space-y-4">
                      {commentsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-gray-600">코멘트를 불러오는 중...</span>
                        </div>
                      ) : comments.length > 0 ? (
                        comments.map((comment) => (
                          <div key={comment.id} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{DOCUMENT_TYPE_NAMES[comment.documentType as RequiredDocumentType | 'OTHER']}</Badge>
                                <span className="font-medium">{comment.authorName}</span>
                                <span className="text-sm text-gray-500">({comment.authorRole})</span>
                              </div>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <MessageSquare className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">아직 코멘트가 없습니다</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* 문서 업로드 모달 */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false)
          setSelectedDocumentType(null)
        }}
        onUpload={handleDocumentUpload}
        patentId={selectedPatentId}
        documentType={selectedDocumentType || ""}
        uploadType={selectedUploadType}
      />
    </div>
  )
}

// 개별 서류 카드 컴포넌트 - 파일 목록 항상 표시
function DocumentCard({
  document,
  status,
  statusConfig,
  Icon,
  onUploadClick,
  onFileDelete,
  availableTranslations,
  isOptional = false,
  onPreview,
  onDownload,
  translationFiles = [],
  translationFilesLoading = false,
  getDownloadUrl,
  formatFileSize,
  documentFiles = [],
  documentFilesLoading = false,
}: {
  document: any
  status: string
  statusConfig: any
  Icon: any
  onUploadClick: (documentType: RequiredDocumentType | 'OTHER', uploadType?: "ATTORNEY_DRAFT" | "USER_FINAL") => void
  onFileDelete: (documentType: RequiredDocumentType | 'OTHER', fileId: string) => void
  availableTranslations: Translation[]
  isOptional?: boolean
  onPreview: (file: DocumentFile) => void
  onDownload: (file: DocumentFile) => void
  translationFiles?: any[]
  translationFilesLoading?: boolean
  getDownloadUrl?: (fileUrl: string, fileName: string) => void
  formatFileSize: (bytes: number) => string
  documentFiles?: any[]
  documentFilesLoading?: boolean
}) {
  // 변호사 업로드와 관리자 업로드가 필요한 서류 타입들
  const DUAL_UPLOAD_TYPES = ["DECLARATION", "ADS", "IDS", "ASSIGNMENT"]
  const isDualUpload = DUAL_UPLOAD_TYPES.includes(document.type)

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        statusConfig.bgColor,
        isOptional && "border-dashed border-2 border-gray-300 dark:border-gray-600",
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {isOptional ? (
              <FolderOpen className={cn("h-4 w-4", statusConfig.color)} />
            ) : (
              <Icon className={cn("h-4 w-4", statusConfig.color)} />
            )}
            <span>{DOCUMENT_TYPE_NAMES[document.type as RequiredDocumentType | 'OTHER']}</span>
            {isOptional && (
              <Badge variant="outline" className="text-xs">
                선택
              </Badge>
            )}
          </div>
          <Badge variant="outline" className={cn("text-xs", statusConfig.bgColor, statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 명세서 번역 연결 */}
        {document.type === "SPECIFICATION" && status === "TRANSLATION_LINKED" && (
          <div className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
            <Link className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-800 dark:text-green-200">번역문 연결됨</span>
          </div>
        )}

        {/* 번역 명세서 파일들 표시 */}
        {document.type === "SPECIFICATION" && translationFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-100 text-green-800 text-xs">
                번역 완료 파일
              </Badge>
            </div>
            
            {translationFilesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                <span className="ml-2 text-xs text-gray-600">번역 파일 로딩 중...</span>
              </div>
            ) : (
              translationFiles.map((fileGroup) => (
                <div key={fileGroup.id} className="border border-green-200 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(fileGroup.uploadedAt).toLocaleString()}
                    </span>
                  </div>
                  
                  {fileGroup.translatedTitleUS && (
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className="bg-green-700 text-white text-xs">
                          번역완료 특허명(US)
                        </Badge>
                      </div>
                      <p className="text-green-800 font-medium text-xs">{fileGroup.translatedTitleUS}</p>
                    </div>
                  )}

                  {fileGroup.files && fileGroup.files.length > 0 && (
                    <div className="space-y-1">
                      {fileGroup.files.map((file: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className="text-gray-500">
                              {formatFileSize(file.size)} • {file.type}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                if (file.fileKey && getDownloadUrl) {
                                  const s3Url = getS3Url(file.fileKey)
                                  getDownloadUrl(s3Url, file.name)
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 h-6 px-2"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {fileGroup.comment && (
                    <div className="flex items-start space-x-2 pt-2 border-t border-gray-200">
                      <MessageSquare className="h-3 w-3 text-gray-600 mt-0.5 flex-shrink-0" />
                      <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                        {fileGroup.comment}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 파일 업로드 버튼들 - 서류 타입별 구분 */}
        {document.type !== "SPECIFICATION" && (
          <div className="space-y-2">
            {isDualUpload ? (
              // Declaration, ADS, IDS, Assignment: 변호사 업로드 + 특허관리자 업로드
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => onUploadClick(document.type, "ATTORNEY_DRAFT")}
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  변호사 업로드
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => onUploadClick(document.type, "USER_FINAL")}
                >
                  <Shield className="h-3 w-3 mr-1" />
                  특허관리자 업로드
                </Button>
              </>
            ) : (
              // IDS 부속서류, 도면, 기타서류: 파일 업로드
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => onUploadClick(document.type, "USER_FINAL")}
              >
                <Upload className="h-3 w-3 mr-1" />
                파일 업로드
              </Button>
            )}
          </div>
        )}

        {/* 파일 목록 - 항상 표시 */}
        {documentFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-xs font-medium">{documentFiles.length}개 파일</span>
            </div>

            <div className="space-y-1">
              {documentFiles.map((file: any) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium truncate">{file.originalFileName}</p>
                      {/* 업로드 타입 구분 배지 */}
                      {file.uploadType === "ATTORNEY_DRAFT" ? (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs px-1 py-0">
                          변호사
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-100 text-green-800 text-xs px-1 py-0">
                          특허관리자
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-500">
                      {formatFileSize(file.fileSize)} • {file.uploadedBy}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        if (file.fileKey && getDownloadUrl) {
                          const s3Url = getS3Url(file.fileKey)
                          getDownloadUrl(s3Url, file.originalFileName)
                        }
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFileDelete(document.type, file.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 기존 mock 파일 목록 제거 */}
        {document.files.length > 0 && documentFiles.length === 0 && (
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-xs font-medium">{document.files.length}개 파일</span>
            </div>

            <div className="space-y-1">
              {document.files.map((file: DocumentFile) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium truncate">{file.originalFileName}</p>
                      {/* 업로드 타입 구분 배지 */}
                      {file.uploadType === "ATTORNEY_DRAFT" ? (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs px-1 py-0">
                          변호사
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-100 text-green-800 text-xs px-1 py-0">
                          특허관리자
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-500">
                      {(file.fileSize / 1024).toFixed(1)}KB • {file.uploadedBy}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => onPreview(file)} className="text-xs">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDownload(file)}>
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFileDelete(document.type, file.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
