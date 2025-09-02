"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, User, FileText, Clock, AlertTriangle, Download, Eye, Languages, ExternalLink, BookOpen, Trash2, Edit, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { PriorityPatentModal } from "./priority-patent-modal"
import { patentsApi } from "@/lib/api/patents"
import { toast } from "sonner"
import { getS3Url } from "@/lib/getS3Url"

interface PatentDetailModalProps {
  patent: any
  isOpen: boolean
  onClose: () => void
  onStatusChange?: (patentId: string, newStatus: string) => void
}

const statusLabels = {
  NO_PROGRESS: "진행 없음",
  TRANSLATING: "번역중",
  TRANSLATION_REVIEW: "번역검토",
  DOCUMENT_PREP: "서류준비",
  ATTORNEY_REVIEW: "변호사검토",
  USPTO_FILING: "USPTO출원",
  OA_RESPONSE: "OA대응",
  USPTO_REGISTERED: "USPTO등록",
}

const statusColors = {
  NO_PROGRESS: "bg-gray-100 text-gray-800",
  TRANSLATING: "bg-blue-100 text-blue-800",
  TRANSLATION_REVIEW: "bg-yellow-100 text-yellow-800",
  DOCUMENT_PREP: "bg-purple-100 text-purple-800",
  ATTORNEY_REVIEW: "bg-orange-100 text-orange-800",
  USPTO_FILING: "bg-indigo-100 text-indigo-800",
  OA_RESPONSE: "bg-red-100 text-red-800",
  USPTO_REGISTERED: "bg-green-100 text-green-800",
}

export function PatentDetailModal({ patent, isOpen, onClose }: PatentDetailModalProps) {
  const [previewFile, setPreviewFile] = useState<any>(null)
  const [isPriorityPatentModalOpen, setIsPriorityPatentModalOpen] = useState(false)
  const [editingPriorityPatent, setEditingPriorityPatent] = useState<any>(null)
  
  // 실제 데이터 로딩을 위한 상태 추가
  const [documents, setDocuments] = useState<any[]>([])
  const [translationData, setTranslationData] = useState<any>(null)
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [loadingTranslation, setLoadingTranslation] = useState(false)
  
  // 에러 상태 관리
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [translationError, setTranslationError] = useState<string | null>(null)
  
  // 특허 데이터 새로고침 상태
  const [patentData, setPatentData] = useState(patent || null)
  
  const router = useRouter()

  // 문서 데이터 로드 함수 (patent-form-modal.tsx와 동일한 패턴)
  const loadDocuments = async (patentId: string) => {
    if (!patentId) return
    
    setLoadingDocuments(true)
    setDocumentError(null)
    try {
      const docs = await patentsApi.getDocuments(patentId)
      setDocuments(docs)
    } catch (error) {
      console.error('문서 로드 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '문서를 불러오는데 실패했습니다.'
      setDocumentError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoadingDocuments(false)
    }
  }

  // 번역 데이터 로드 함수
  const loadTranslationData = async (patentId: string) => {
    if (!patentId) return
    
    setLoadingTranslation(true)
    setTranslationError(null)
    try {
      // 실제 번역 API 호출 (구현 필요)
      // const translation = await translationsApi.getByPatentId(patentId)
      // setTranslationData(translation)
      setTranslationData(null) // 임시로 null 설정
    } catch (error) {
      console.error('번역 데이터 로드 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '번역 데이터를 불러오는데 실패했습니다.'
      setTranslationError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoadingTranslation(false)
    }
  }

  // 특허 데이터 새로고침 함수 (우선권 특허 변경 시 사용)
  const refreshPatentData = async () => {
    if (!patent?.id) return
    
    try {
      // 실제 특허 데이터를 다시 로드 (우선권 특허 정보 포함)
      const updatedPatent = await patentsApi.getById(patent.id)
      if (updatedPatent) {
        setPatentData(updatedPatent)
        toast.success('특허 정보가 업데이트되었습니다.')
      }
    } catch (error) {
      console.error('특허 데이터 새로고침 실패:', error)
      toast.error('특허 정보 업데이트에 실패했습니다.')
    }
  }

  // 우선권 특허 모달이 닫힐 때 호출되는 함수
  const handlePriorityPatentModalClose = () => {
    setIsPriorityPatentModalOpen(false)
    setEditingPriorityPatent(null)
    // 우선권 특허 정보가 변경되었을 수 있으므로 특허 데이터 새로고침
    refreshPatentData()
  }

  // 우선권 특허 삭제 함수
  const handlePriorityPatentDelete = async (priorityPatent: any) => {
    if (!priorityPatent.id) return

    if (!confirm('이 우선권 특허를 삭제하시겠습니까?')) return

    try {
      await patentsApi.deletePriorityPatent(patent.id, priorityPatent.id)
      toast.success('우선권 특허가 삭제되었습니다.')
      // 특허 데이터 새로고침
      refreshPatentData()
    } catch (error) {
      console.error('우선권 특허 삭제 오류:', error)
      toast.error('우선권 특허 삭제에 실패했습니다.')
    }
  }

  // 데이터 로딩 useEffect - 모달이 열리고 특허 정보가 있을 때 실행
  useEffect(() => {
    if (isOpen && patent?.id) {
      // 문서 데이터 로드
      loadDocuments(patent.id)
      
      // 번역 데이터 로드
      loadTranslationData(patent.id)
    }
  }, [isOpen, patent?.id])

  // 모달이 닫힐 때 데이터 초기화
  useEffect(() => {
    if (!isOpen) {
      setDocuments([])
      setTranslationData(null)
      setLoadingDocuments(false)
      setLoadingTranslation(false)
      setDocumentError(null)
      setTranslationError(null)
    }
  }, [isOpen])

  // 특허 데이터 동기화
  useEffect(() => {
    setPatentData(patent || null)
  }, [patent])

  if (!patent) return null

  // 발명자 정보 처리 함수 (patent-form-modal.tsx와 동일한 로직)
  const getInventorsList = (inventors: any) => {
    if (!inventors) return []
    
    if (Array.isArray(inventors)) {
      return inventors.map((inv: any) => typeof inv === "string" ? inv : inv.name)
    } else if (typeof inventors === "string") {
      try {
        const parsed = JSON.parse(inventors)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }

  // 진행률 계산 (상태 기반)
  const getProgressPercentage = (status: string) => {
    const statusOrder = [
      "NO_PROGRESS",
      "TRANSLATING",
      "TRANSLATION_REVIEW",
      "DOCUMENT_PREP",
      "ATTORNEY_REVIEW",
      "USPTO_FILING",
      "OA_RESPONSE",
      "USPTO_REGISTERED",
    ]
    const currentIndex = statusOrder.indexOf(status)
    return ((currentIndex + 1) / statusOrder.length) * 100
  }

  // 타임라인 데이터 생성 (상태 변경 이력)
  const generateTimeline = (patent: any) => {
    const timeline = []
    const statusOrder = [
      "NO_PROGRESS",
      "TRANSLATING",
      "TRANSLATION_REVIEW",
      "DOCUMENT_PREP",
      "ATTORNEY_REVIEW",
      "USPTO_FILING",
      "OA_RESPONSE",
      "USPTO_REGISTERED",
    ]

    const currentIndex = statusOrder.indexOf(patent.status)

    // 현재 상태까지의 이력 생성
    for (let i = 0; i <= currentIndex; i++) {
      const status = statusOrder[i]
      const isCompleted = i < currentIndex
      const isCurrent = i === currentIndex

      // OA_RESPONSE의 경우 여러 건으로 표시
      if (status === "OA_RESPONSE" && (isCompleted || isCurrent)) {
        timeline.push({
          status: "OA_RESPONSE_1",
          label: "OA-1 대응",
          date: "2024-02-01",
          isCompleted: isCompleted,
          isCurrent: isCurrent && i === currentIndex,
          description: "1차 Office Action 대응 완료",
        })

        // 현재 상태가 OA_RESPONSE이고 여러 OA가 있다고 가정
        if (isCurrent) {
          timeline.push({
            status: "OA_RESPONSE_2",
            label: "OA-2 대응",
            date: "진행중",
            isCompleted: false,
            isCurrent: true,
            description: "2차 Office Action 대응 진행중",
          })
        }
      } else {
        timeline.push({
          status,
          label: statusLabels[status as keyof typeof statusLabels],
          date: isCompleted ? "2024-01-15" : isCurrent ? "진행중" : "대기중",
          isCompleted,
          isCurrent,
          description: isCompleted ? "완료됨" : isCurrent ? "진행중" : "대기중",
        })
      }
    }

    return timeline
  }

  // 통합 파일 데이터 가져오기
  const getIntegratedFiles = (patentId: string) => {
    return documents.filter((f) => f.patentId === patentId)
  }

  // 문서 타입별로 분류하는 함수 (patent-form-modal.tsx와 동일한 로직)
  const getDocumentsByType = (type: string) => {
    return documents.filter(doc => doc.type === type)
  }

  // 파일 크기 포맷팅 함수
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 문서 타입별 한국어 라벨
  const documentTypeLabels = {
    SPECIFICATION: "명세서",
    CLAIMS: "청구범위", 
    ABSTRACT: "요약서",
    DRAWINGS: "도면",
    ADS: "출원서",
    OATH_DECLARATION: "선언서",
    IDS: "정보공개문서",
    ASSIGNMENT: "양도서",
    OTHER: "기타"
  }

  // 파일 미리보기
  const handlePreview = (file: any) => {
    setPreviewFile({
      id: file.id,
      name: file.fileName,
      type: file.fileType || 'application/pdf',
      size: file.fileSize,
      uploadedBy: file.uploadedBy || '시스템',
      uploadedAt: file.createdAt,
      category: file.type,
      source: '서류 관리',
      description: `${documentTypeLabels[file.type as keyof typeof documentTypeLabels] || '기타'} 문서`
    })
  }

  // 파일 다운로드 - 실제 API 사용으로 변경
  const handleDownload = async (file: any) => {
    if (!patent.id) return
    
    try {
      // 데이터베이스에서 가져온 실제 filePath 사용
      const s3Url = getS3Url(file.filePath)
      
      // /api/file API를 통해 파일 가져오기
      const response = await fetch(`/api/file?url=${encodeURIComponent(s3Url)}`)
      
      if (!response.ok) {
        throw new Error('파일을 가져올 수 없습니다.')
      }
      
      const { type, arrayBuffer } = await response.json()
      
      const blob = new Blob([Uint8Array.from(arrayBuffer)], { type })
      const downloadUrl = window.URL.createObjectURL(blob)
      
      // 다운로드 실행
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = file.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 메모리 정리
      window.URL.revokeObjectURL(downloadUrl)
      
      toast.success('파일 다운로드를 시작합니다.')
    } catch (error) {
      console.error('파일 다운로드 실패:', error)
      toast.error('파일 다운로드에 실패했습니다.')
    }
  }

  // 문서 삭제 함수 추가
  const handleDeleteDocument = async (documentId: string) => {
    if (!patent.id) return
    
    const isConfirmed = window.confirm('정말 삭제하시겠습니까? 파일이 삭제되면 복구할 수 없습니다.')
    if (!isConfirmed) return
    
    try {
      await patentsApi.deleteDocument(patent.id, documentId)
      // 문서 목록에서 제거
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      toast.success('문서가 삭제되었습니다.')
    } catch (error) {
      console.error('문서 삭제 실패:', error)
      toast.error('문서 삭제에 실패했습니다.')
    }
  }

  const timeline = generateTimeline(patent)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 pb-4 px-6 pt-6 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl truncate pr-4">{patent?.title}</DialogTitle>
          </div>
        </DialogHeader>

        {/* 전체 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="space-y-6 p-6">
          {/* 기본 정보 */}
            <div>
              <div className="grid grid-cols-1 gap-4">
              {/* 기본 정보 카드 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">기본 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {patent.managementNumber && (
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">관리번호: {patent.managementNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">출원번호: {patent.applicationNumber}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">출원일: {patent.filingDate}</span>
                  </div>
                  {patent.usRegistrationNumber && (
                  <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">등록번호: {patent.usRegistrationNumber}</span>
                  </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">발명자: {getInventorsList(patentData?.inventors || patent?.inventors).join(", ") || "정보 없음"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      출원 유형: {patent.pctFiled ? "가출원 (PCT)" : "진출원"}
                    </span>
                  </div>
                  {/* 메모/노트가 있는 경우 */}
                  {patent.notes && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-gray-500">메모</span>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{patent.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 우선권/PCT 정보 카드 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">우선권/PCT 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <span className="text-sm font-medium">PCT 출원 여부</span>
                    <Badge variant={patent.pctFiled ? "default" : "secondary"}>
                      {patent.pctFiled ? "예" : "아니오"}
                    </Badge>
                  </div>
                  {patent.pctFiled && (
                    <>
                      {patent.pctApplicationNumber && (
                        <div className="text-sm">
                          <span className="text-gray-500">PCT 출원번호:</span>
                          <span className="ml-2">{patent.pctApplicationNumber}</span>
                        </div>
                      )}
                      {patent.pctFilingDate && (
                        <div className="text-sm">
                          <span className="text-gray-500">PCT 출원일:</span>
                          <span className="ml-2">{patent.pctFilingDate}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="text-sm">
                    <span className="text-gray-500">우선권 특허:</span>
                    <span className="ml-2">
                      {patentData?.priorityPatents && patentData.priorityPatents.length > 0 
                        ? `${patentData.priorityPatents.length}건`
                        : "없음"
                      }
                    </span>
                  </div>
                  {/* 우선권 특허 상세 정보 */}
                  {patentData?.priorityPatents && patentData.priorityPatents.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <span className="text-sm font-medium text-gray-700">우선권 특허 목록</span>
                      {patentData.priorityPatents.map((pp: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                          <div className="font-medium truncate">{pp.title || "제목 없음"}</div>
                          <div className="text-gray-600">
                            {pp.applicationNumber} ({pp.filingDate})
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 진행 상황 카드 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">진행 상황</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">현재 상태</span>
                    <Badge className={statusColors[patent.status as keyof typeof statusColors]}>
                      {statusLabels[patent.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>전체 진행률</span>
                      <span>{Math.round(getProgressPercentage(patent.status))}%</span>
                    </div>
                    <Progress value={getProgressPercentage(patent.status)} />
                  </div>
                  {patent.dueDate && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">마감일: {patent.dueDate}</span>
                    </div>
                  )}
                  {patent.daysLeft && (
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-medium text-red-600">D-{patent.daysLeft}</span>
                    </div>
                  )}
                  {/* 최종 업데이트 정보 */}
                  {patent.updatedAt && (
                    <div className="text-xs text-gray-500">
                      최종 업데이트: {patent.updatedAt}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">상태는 시스템에서 자동으로 업데이트됩니다</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 탭 컨텐츠 */}
            <div>
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>개요</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>진행상황</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>서류</span>
                  {documents.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-blue-800 text-xs">
                      {documents.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="priority" className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>우선권</span>
                  {patentData?.priorityPatents && patentData.priorityPatents.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-blue-800 text-xs">
                      {patentData.priorityPatents.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="mt-4">
                {/* 개요 탭 - 핵심 정보 요약 */}
                <TabsContent value="overview" className="m-0">
                    <div className="space-y-6">
                      {/* 핵심 진행 상황 */}
                      <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            <span>핵심 현황</span>
                          </CardTitle>
                          <CardDescription>중요한 정보와 진행 상황을 한눈에 확인하세요</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 진행률 */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">전체 진행률</span>
                                <span className="text-sm text-gray-600">{Math.round(getProgressPercentage(patent.status))}%</span>
                              </div>
                              <Progress value={getProgressPercentage(patent.status)} className="h-3" />
                              <div className="text-xs text-gray-500">
                                현재 상태: <span className="font-medium">{statusLabels[patent.status as keyof typeof statusLabels]}</span>
                              </div>
                            </div>
                            
                            {/* 중요 일정 */}
                            <div className="space-y-3">
                              <div className="text-sm font-medium">중요 일정</div>
                              {patent.dueDate ? (
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm">마감일: {patent.dueDate}</span>
                                  </div>
                                  {patent.daysLeft && (
                                    <div className={`flex items-center space-x-2 px-2 py-1 rounded-md ${
                                      parseInt(patent.daysLeft) <= 30 ? 'bg-red-50 text-red-700' : 
                                      parseInt(patent.daysLeft) <= 60 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'
                                    }`}>
                                      <AlertTriangle className="h-4 w-4" />
                                      <span className="text-sm font-medium">D-{patent.daysLeft}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">마감일이 설정되지 않았습니다</div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 빠른 작업 */}
                      <Card>
                        <CardHeader>
                          <CardTitle>빠른 작업</CardTitle>
                          <CardDescription>자주 사용하는 기능에 빠르게 접근하세요</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <Button 
                              variant="outline" 
                              className="h-16 flex flex-col items-center space-y-2"
                              onClick={() => {
                                router.push(`/translations?patentId=${patent.id}`)
                                onClose()
                              }}
                            >
                              <Languages className="h-5 w-5" />
                              <span className="text-xs">번역 관리</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              className="h-16 flex flex-col items-center space-y-2"
                              onClick={() => {
                                router.push(`/documents?patentId=${patent.id}&force=true`)
                                onClose()
                              }}
                            >
                              <FileText className="h-5 w-5" />
                              <span className="text-xs">서류 업로드</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 최근 활동 */}
                      <Card>
                        <CardHeader>
                          <CardTitle>최근 활동</CardTitle>
                          <CardDescription>이 특허의 최근 변경사항입니다</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <div className="flex-1">
                                <div className="text-sm font-medium">상태 업데이트</div>
                                <div className="text-xs text-gray-600">
                                  {statusLabels[patent.status as keyof typeof statusLabels]}로 변경됨
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">{patent.updatedAt || "최근"}</div>
                            </div>
                            
                            {documents.length > 0 && (
                              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium">문서 업로드</div>
                                  <div className="text-xs text-gray-600">
                                    {documents.length}개의 문서가 등록됨
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500">최근</div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                </TabsContent>

                <TabsContent value="timeline" className="m-0">
                    <div className="space-y-6">
                      {/* 전체 진행률 */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <span>전체 진행 현황</span>
                          </CardTitle>
                          <CardDescription>USPTO 출원부터 등록까지의 전체 진행 과정</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-semibold">진행률</span>
                              <span className="text-2xl font-bold text-blue-600">{Math.round(getProgressPercentage(patent.status))}%</span>
                            </div>
                            <Progress value={getProgressPercentage(patent.status)} className="h-4" />
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>시작</span>
                              <span className="font-medium">현재: {statusLabels[patent.status as keyof typeof statusLabels]}</span>
                              <span>완료</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 상세 타임라인 */}
                      <Card>
                        <CardHeader>
                          <CardTitle>상세 진행 단계</CardTitle>
                          <CardDescription>각 단계별 세부 진행 상황 (자동 기록)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                          {timeline.map((item, index) => (
                              <div key={index} className="relative">
                                <div className="flex items-start space-x-4">
                                  <div className="relative">
                                    <div
                                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                        item.isCompleted 
                                          ? "bg-green-500 border-green-500" 
                                          : item.isCurrent 
                                            ? "bg-blue-500 border-blue-500" 
                                            : "bg-white border-gray-300"
                                      }`}
                                    >
                                      {item.isCompleted && (
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                      )}
                                      {item.isCurrent && (
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                      )}
                                    </div>
                                    {index < timeline.length - 1 && (
                                      <div className={`absolute top-6 left-3 w-0.5 h-8 ${
                                        item.isCompleted ? "bg-green-300" : "bg-gray-200"
                                      }`}></div>
                                    )}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-medium text-lg ${
                                      item.isCurrent ? "text-blue-600" : item.isCompleted ? "text-green-600" : "text-gray-500"
                                    }`}>
                                  {item.label}
                                </div>
                                    <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                                    <div className="flex items-center space-x-2 mt-2">
                                      <Badge variant={
                                        item.isCompleted ? "default" : item.isCurrent ? "destructive" : "secondary"
                                      }>
                                        {item.isCompleted ? "완료" : item.isCurrent ? "진행중" : "대기"}
                                      </Badge>
                                      <span className="text-xs text-gray-500">{item.date}</span>
                              </div>
                                  </div>
                                </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    </div>
                </TabsContent>

                <TabsContent value="priority" className="m-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>우선권 특허 관리</CardTitle>
                      <CardDescription>
                        이 특허의 우선권을 주장하는 특허들을 관리합니다
                        {patentData?.priorityPatents && patentData.priorityPatents.length > 0 && (
                          <span className="ml-2">({patentData.priorityPatents.length}건)</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {patentData?.priorityPatents && patentData.priorityPatents.length > 0 ? (
                        <div className="space-y-4">
                          {patentData.priorityPatents.map((priorityPatent: any, index: number) => (
                            <div key={priorityPatent.id || index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-900">{priorityPatent.title}</h4>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingPriorityPatent(priorityPatent)
                                      setIsPriorityPatentModalOpen(true)
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePriorityPatentDelete(priorityPatent)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">출원번호:</span> {priorityPatent.applicationNumber || "미정"}
                                </div>
                                <div>
                                  <span className="font-medium">출원일:</span> {priorityPatent.filingDate ? new Date(priorityPatent.filingDate).toLocaleDateString('ko-KR') : "미정"}
                                </div>
                              </div>
                              {priorityPatent.inventors && priorityPatent.inventors.length > 0 && (
                                <div className="mt-3">
                                  <span className="font-medium text-sm text-gray-600">발명자:</span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {priorityPatent.inventors.map((inventor: string, inventorIndex: number) => (
                                      <Badge key={inventorIndex} variant="outline" className="text-xs">
                                        {inventor}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <h3 className="text-lg font-medium mb-2">등록된 우선권 특허가 없습니다</h3>
                          <p className="text-sm mb-4">이 특허의 우선권을 주장하는 특허들을 추가해주세요.</p>
                        </div>
                      )}
                      
                      <div className="mt-6 flex justify-center">
                        <Button
                          onClick={() => {
                            setEditingPriorityPatent(null)
                            setIsPriorityPatentModalOpen(true)
                          }}
                          className="flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>우선권 특허 추가</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="documents" className="m-0">
                    <Card>
                      <CardHeader>
                        <CardTitle>문서 타입별 서류 관리</CardTitle>
                        <CardDescription>
                          특허 출원 서류를 문서 타입별로 분류하여 관리 ({documents.length}개 파일)
                          {loadingDocuments && " - 로딩 중..."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {loadingDocuments ? (
                          <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
                            <p className="text-lg font-medium text-gray-600">문서를 불러오는 중...</p>
                            <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
                                    </div>
                        ) : documentError ? (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <AlertTriangle className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">문서 로드 실패</h3>
                            <p className="text-sm text-gray-600 mb-4">{documentError}</p>
                            <Button 
                              variant="outline" 
                              onClick={() => loadDocuments(patent.id)}
                              className="flex items-center space-x-2"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span>다시 시도</span>
                            </Button>
                          </div>
                        ) : documents.length > 0 ? (
                          // 문서 타입별로 분류해서 표시
                          Object.entries(documentTypeLabels).map(([type, label]) => {
                            const typeDocuments = getDocumentsByType(type)
                            if (typeDocuments.length === 0) return null
                            
                            return (
                              <div key={type} className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-lg font-semibold text-gray-800">{label}</h3>
                                  <Badge variant="outline">{typeDocuments.length}개</Badge>
                                </div>
                                <div className="grid gap-3">
                                  {typeDocuments.map((doc) => (
                                    <div 
                                      key={doc.id} 
                                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                                        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-900 truncate">
                                            {doc.fileName}
                                          </div>
                                          <div className="text-sm text-gray-500 flex items-center space-x-4">
                                            <span>{formatFileSize(doc.fileSize)}</span>
                                            <span>•</span>
                                            <span>v{doc.version || 1}</span>
                                            <span>•</span>
                                            <span>{doc.createdAt}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => handleDownload(doc)}
                                          className="text-green-600 hover:text-green-800"
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                        
                                        <Button 
                                           variant="ghost" 
                                           size="sm" 
                                           onClick={() => handleDeleteDocument(doc.id)}
                                           className="text-red-600 hover:text-red-800"
                                         >
                                           <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-medium mb-2">업로드된 서류가 없습니다</h3>
                            <p className="text-sm">특허 출원에 필요한 서류들을 업로드해주세요.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
          </div>
        </div>
      </DialogContent>

      {/* 파일 미리보기 모달 */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl w-full h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{previewFile?.name}</span>
              <Button variant="outline" size="sm" onClick={() => handleDownload(previewFile)}>
                <Download className="h-4 w-4 mr-2" />
                다운로드
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
            {previewFile?.type?.startsWith("image/") ? (
              <img
                src={`/placeholder.svg?height=400&width=600&text=${encodeURIComponent(previewFile.name)}`}
                alt={previewFile.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : previewFile?.type === "application/pdf" ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <FileText className="h-16 w-16 text-blue-500 mb-4" />
                <p className="text-lg font-medium mb-2">PDF 문서</p>
                <p className="text-gray-600 mb-4">{previewFile.name}</p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>크기: {(previewFile.size / 1024).toFixed(1)} KB</p>
                  <p>업로드자: {previewFile.uploadedBy}</p>
                  <p>출처: {previewFile.source}</p>
                </div>
                <Button
                  className="mt-4"
                  onClick={() =>
                    window.open(
                      `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(previewFile.name)}`,
                      "_blank",
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-2" />새 탭에서 열기
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">{previewFile?.name}</p>
                <p className="text-gray-600 mb-2">파일 형식: {previewFile?.type || "알 수 없음"}</p>
                <p className="text-gray-600 mb-4">
                  크기: {previewFile ? (previewFile.size / 1024).toFixed(1) + " KB" : "알 수 없음"}
                </p>
                <div className="space-y-1 text-sm text-gray-500 mb-4">
                  <p>업로드자: {previewFile?.uploadedBy}</p>
                  <p>출처: {previewFile?.source}</p>
                  <p>설명: {previewFile?.description}</p>
                </div>
                <p className="text-gray-500 mb-4">이 파일 형식은 미리보기를 지원하지 않습니다</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 우선권 특허 관리 모달 */}
      <PriorityPatentModal
        isOpen={isPriorityPatentModalOpen}
        onClose={handlePriorityPatentModalClose}
        patentId={patent.id}
        initialEditingPatent={editingPriorityPatent}
      />
    </Dialog>
  )
}
