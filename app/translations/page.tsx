"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { TranslationFileUploadModal } from "@/components/translation/translation-file-upload-modal"
import { translationsApi } from "@/lib/api/translations"
import { getS3Url } from "@/lib/getS3Url"
import { toast } from "sonner"
import { Bot, FileText, CheckCircle, Upload, MessageSquare, Clock, AlertCircle } from "lucide-react"

interface Patent {
  id: string
  managementNumber: string
  applicationNumber: string
  inventors: string[]
  title: string
  titleEn?: string
  status: string
  createdAt: string
  updatedAt: string
}

interface Translation {
  id: string
  patentId: string
  status: string
  translatedTitle?: string
  translatedAbstract?: string
  aiEngine?: string
  createdAt: string
  updatedAt: string
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
  fileObject?: File
  filePath?: string
  fileKey?: string
}

interface UploadGroup {
  id: string
  patentId: string
  uploadedAt: string
  comment?: string
  files: UploadedFile[]
  section: "translation" | "review"
  isCompletion?: boolean
  translatedTitleUS?: string
}

type TranslationStatus = "번역대기" | "번역검토" | "번역완료"

function TranslationsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [patents, setPatents] = useState<Patent[]>([])
  const [translations, setTranslations] = useState<Translation[]>([])
  const [selectedPatentId, setSelectedPatentId] = useState<string>("")
  const [translationUploadOpen, setTranslationUploadOpen] = useState(false)
  const [reviewUploadOpen, setReviewUploadOpen] = useState(false)
  const [completionUploadOpen, setCompletionUploadOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<UploadGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 페이징 상태 추가
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(10)

  // 특허별로 업로드 그룹들을 관리
  const [patentUploadGroups, setPatentUploadGroups] = useState<Record<string, UploadGroup[]>>({})
  const [patentCompletionStatus, setPatentCompletionStatus] = useState<Record<string, boolean>>({})

  // 선택된 특허의 문서 관리
  const [selectedPatentDocuments, setSelectedPatentDocuments] = useState<any[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // 번역 데이터 로드 (특허 정보 포함) - 페이징 적용
        const translationsResponse = await fetch(`/api/translations?page=${currentPage}&limit=${itemsPerPage}`)
        if (!translationsResponse.ok) {
          throw new Error("번역 데이터 로드 실패")
        }
        const translationsData = await translationsResponse.json()

        // 번역 데이터에서 특허 정보 추출 (API 응답에 patent 객체가 포함됨)
        const patentsFromTranslations = (translationsData.data || [])
          .filter((translation: any) => translation.patent)
          .map((translation: any) => ({
            id: translation.patent.id,
            title: translation.patent.title,
            managementNumber: translation.patent.managementNumber,
            applicationNumber: translation.patent.applicationNumber,
            inventors: [], // 실제 데이터베이스에는 inventors 필드가 없으므로 빈 배열
            status: translation.patent.status,
            createdAt: translation.patent.createdAt,
            updatedAt: translation.patent.updatedAt,
          }))

        setPatents(patentsFromTranslations)
        setTranslations(translationsData.data || [])
        
        // 페이징 정보 설정
        setTotalItems(translationsData.total || 0)
        setTotalPages(translationsData.pagination?.totalPages || 1)

        // URL 파라미터에서 특허 ID 확인
        const patentIdFromUrl = searchParams.get('patentId')
        
        if (patentsFromTranslations.length > 0) {
          // URL에 patentId가 있고 해당 특허가 존재하면 그것을 선택, 아니면 첫 번째 선택
          if (patentIdFromUrl && patentsFromTranslations.some((p: Patent) => p.id === patentIdFromUrl)) {
            setSelectedPatentId(patentIdFromUrl)
          } else {
            setSelectedPatentId(patentsFromTranslations[0].id)
          }

          // 실제 번역 파일 데이터 로드
          await loadTranslationFiles(patentsFromTranslations)
          
          // 선택된 특허의 원본 문서도 로드
          const selectedId = patentIdFromUrl && patentsFromTranslations.some((p: Patent) => p.id === patentIdFromUrl) 
            ? patentIdFromUrl 
            : patentsFromTranslations[0].id
          await loadPatentDocuments(selectedId)
        }
      } catch (err) {
        console.error("데이터 로드 오류:", err)
        setError(err instanceof Error ? err.message : "데이터 로드 중 오류가 발생했습니다")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [searchParams, currentPage, itemsPerPage])

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

  // 기존 파일들의 S3 메타데이터 업데이트
  const updateFileMetadata = async (files: any[]) => {
    for (const file of files) {
      if (file.fileKey && file.name) {
        try {
          await fetch('/api/translations/files/update-metadata', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileKey: file.fileKey,
              fileName: file.name
            })
          })
        } catch (error) {
          console.error('메타데이터 업데이트 실패:', error)
        }
      }
    }
  }

  // 실제 번역 파일 데이터 로드
  const loadTranslationFiles = async (patents: Patent[]) => {
    const allGroups: Record<string, UploadGroup[]> = {}
    const completionStatus: Record<string, boolean> = {}

    try {
      // 각 특허별로 번역 파일 데이터 로드
      for (const patent of patents) {
        try {
          const translationFiles = await translationsApi.getFilesByPatentId(patent.id)
          
          // API 응답을 UploadGroup 형태로 변환
          const groups = translationFiles.map(file => ({
            id: file.id,
            patentId: file.patentId,
            uploadedAt: file.uploadedAt,
            comment: file.comment,
            files: file.files,
            section: file.section,
            isCompletion: file.isCompletion,
            translatedTitleUS: file.translatedTitleUS,
          })) as UploadGroup[]

          allGroups[patent.id] = groups
          
          // 각 그룹의 파일들에 대해 메타데이터 업데이트
          for (const group of groups) {
            await updateFileMetadata(group.files)
          }
          
          // 완료 상태 확인
          completionStatus[patent.id] = groups.some(group => group.isCompletion)
        } catch (error) {
          console.error(`특허 ${patent.id}의 번역 파일 로드 실패:`, error)
          // 에러가 발생해도 다른 특허들은 계속 로드
          allGroups[patent.id] = []
          completionStatus[patent.id] = false
        }
      }

      setPatentUploadGroups(allGroups)
      setPatentCompletionStatus(completionStatus)
    } catch (error) {
      console.error('번역 파일 로드 중 전체 오류:', error)
      // 전체 에러 시 빈 상태로 설정
      setPatentUploadGroups({})
      setPatentCompletionStatus({})
    }
  }

  const currentPatent = patents.find((p) => p.id === selectedPatentId)
  const currentTranslation = translations.find((t) => t.patentId === selectedPatentId)

  // 특허의 번역 상태 계산
  const getPatentTranslationStatus = (patentId: string): TranslationStatus => {
    // 번역 완료 상태가 있으면 우선
    if (patentCompletionStatus[patentId]) {
      return "번역완료"
    }

    // 번역 목록에서 상태 확인
    const translation = translations.find(t => t.patentId === patentId)
    if (translation?.status === 'COMPLETED') {
      return "번역완료"
    }

    // 업로드 그룹이 있으면 번역검토
    const groups = patentUploadGroups[patentId] || []
    if (groups.length > 0) {
      return "번역검토"
    }

    return "번역대기"
  }

  // 상태별 배지 스타일
  const getStatusBadge = (status: TranslationStatus) => {
    switch (status) {
      case "번역대기":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <Clock className="h-3 w-3 mr-1" />
            번역대기
          </Badge>
        )
      case "번역검토":
        return (
          <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            번역검토
          </Badge>
        )
      case "번역완료":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            번역완료
          </Badge>
        )
    }
  }

  const handlePatentSelect = async (patentId: string) => {
    setSelectedPatentId(patentId)
    
    // 해당 특허의 번역 파일들을 다시 로드
    if (patentId && !patentUploadGroups[patentId]) {
      try {
        const patent = patents.find(p => p.id === patentId)
        if (patent) {
          await loadTranslationFiles([patent])
        }
      } catch (error) {
        console.error('특허 선택 시 번역 파일 로드 실패:', error)
      }
    }

    // 해당 특허의 문서들을 로드
    await loadPatentDocuments(patentId)
  }

  // 특허 문서 로드 함수
  const loadPatentDocuments = async (patentId: string) => {
    try {
      setDocumentsLoading(true)
      const response = await fetch(`/api/patents/${patentId}/documents`)
      if (!response.ok) {
        throw new Error('문서 로드 실패')
      }
      const data = await response.json()
      setSelectedPatentDocuments(data.data || [])
    } catch (error) {
      console.error('특허 문서 로드 실패:', error)
      setSelectedPatentDocuments([])
    } finally {
      setDocumentsLoading(false)
    }
  }

  const handleTranslationComplete = async () => {
    if (!selectedPatentId) return
    
    // 번역 완료 파일 업로드 팝업 열기
    setCompletionUploadOpen(true)
  }

  const handleEditCompletionFile = (group: UploadGroup) => {
    setEditingGroup(group)
    setCompletionUploadOpen(true)
  }

  const handleFileUploadComplete = async (
    files: UploadedFile[],
    comment: string,
    section: "translation" | "review",
    isCompletion = false,
    translatedTitleUS?: string,
  ) => {
    if (!selectedPatentId) return

    try {
      // 실제 File 객체들만 추출
      const actualFiles = files
        .filter(file => file.fileObject)
        .map(file => file.fileObject!)

      // 실제 API 호출로 파일 업로드
      const uploadData: {
        patentId: string
        section: "translation" | "review"
        comment?: string
        files: File[]
        isCompletion?: boolean
        translatedTitleUS?: string
      } = {
        patentId: selectedPatentId,
        section: section,
        comment: comment.trim() || undefined,
        files: actualFiles,
        isCompletion: isCompletion,
        translatedTitleUS: translatedTitleUS,
      }

      const uploadedGroup = await translationsApi.uploadFiles(uploadData)

      // 업로드된 그룹을 UI에 반영
      const newGroup: UploadGroup = {
        id: uploadedGroup.id,
        patentId: uploadedGroup.patentId,
        uploadedAt: uploadedGroup.uploadedAt,
        comment: uploadedGroup.comment,
        files: uploadedGroup.files,
        section: uploadedGroup.section as "translation" | "review",
        isCompletion: uploadedGroup.isCompletion,
        translatedTitleUS: uploadedGroup.translatedTitleUS,
      }

      if (editingGroup) {
        // 편집 모드인 경우 기존 그룹 업데이트
        setPatentUploadGroups((prev) => ({
          ...prev,
          [selectedPatentId]: (prev[selectedPatentId] || []).map((group) =>
            group.id === editingGroup.id ? newGroup : group,
          ),
        }))
        setEditingGroup(null)
      } else {
        // 새 업로드인 경우 추가
        setPatentUploadGroups((prev) => ({
          ...prev,
          [selectedPatentId]: [...(prev[selectedPatentId] || []), newGroup],
        }))
      }

      // 번역 완료 상태 업데이트
      if (isCompletion) {
        // 번역 파일 업로드 API에서 이미 번역 상태를 업데이트하므로 추가 API 호출 불필요
        
        setPatentCompletionStatus((prev) => ({
          ...prev,
          [selectedPatentId]: true,
        }))
        
        // 번역 목록에서 해당 특허의 상태도 업데이트
        setTranslations(prev => prev.map(translation => 
          translation.patentId === selectedPatentId 
            ? { ...translation, status: 'COMPLETED' }
            : translation
        ))
      }

      toast.success('파일이 성공적으로 업로드되었습니다.')
    } catch (error) {
      console.error('파일 업로드 실패:', error)
      toast.error('파일 업로드에 실패했습니다. 다시 시도해주세요.')
      throw error // 에러를 다시 던져서 모달에서 처리할 수 있도록 함
    }
  }

  // 현재 선택된 특허의 업로드 그룹들을 섹션별로 분리
  const currentPatentGroups = selectedPatentId ? patentUploadGroups[selectedPatentId] || [] : []
  const translationGroups = currentPatentGroups
    .filter((group) => group.section === "translation")
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
  const reviewGroups = currentPatentGroups
    .filter((group) => group.section === "review")
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 모달 props 메모이제이션으로 무한 루프 방지
  const completionModalProps = useMemo(() => ({
    existingFiles: editingGroup?.files || [],
    existingTranslatedTitleUS: editingGroup?.translatedTitleUS || "",
    defaultComment: editingGroup?.comment || "검토 완료된 번역 완료 파일입니다.",
    patentInfo: currentPatent
      ? {
          managementNumber: currentPatent.managementNumber,
          applicationNumber: currentPatent.applicationNumber || "NULL",
          inventor: "발명자 정보 없음",
          titleKR: currentPatent.title,
        }
      : undefined,
  }), [editingGroup?.files, editingGroup?.translatedTitleUS, editingGroup?.comment, currentPatent?.managementNumber, currentPatent?.applicationNumber, currentPatent?.title])

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedPatentId("") // 페이지 변경 시 선택된 특허 초기화
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-foreground">데이터를 불러오는 중...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>다시 시도</Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (patents.length === 0) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">번역할 특허가 없습니다</h3>
              <p className="text-muted-foreground mb-4">특허 관리에서 새 특허를 등록해주세요.</p>
              <Button onClick={() => router.push("/patents")}>특허 관리로 이동</Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 flex overflow-hidden bg-background">
          {/* 왼쪽 사이드바 - 번역 결과 목록 */}
          <div className="w-80 bg-card border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">번역관리 ({totalItems}건)</h2>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {patents.map((patent) => {
                  const isSelected = selectedPatentId === patent.id
                  const status = getPatentTranslationStatus(patent.id)
                  const translation = translations.find((t) => t.patentId === patent.id)

                  return (
                    <Card
                      key={patent.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : ""
                      }`}
                      onClick={() => handlePatentSelect(patent.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {patent.managementNumber}
                            </Badge>
                            {getStatusBadge(status)}
                          </div>
                          <h3 className="font-medium text-sm line-clamp-2">{patent.title}</h3>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <Bot className="h-3 w-3" />
                            <span>{translation?.aiEngine || "NOW AI"}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    총 {totalItems}건 중 {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)}건
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="bg-card border-border text-foreground hover:bg-accent disabled:opacity-50"
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
                                ? "bg-primary text-primary-foreground"
                                : "bg-card border-border text-foreground hover:bg-accent"
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
                      className="bg-card border-border text-foreground hover:bg-accent disabled:opacity-50"
                    >
                      다음
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 메인 번역 결과 영역 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 헤더 */}
            <div className="p-4 bg-card border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <h1 className="text-xl font-bold text-foreground">특허 명세서 번역</h1>
                    {currentPatent && (
                      <p className="text-sm text-muted-foreground">
                        {currentPatent.title} - {currentPatent.applicationNumber || '출원번호 없음'}
                      </p>
                    )}
                  </div>
                </div>
                {currentPatent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTranslationComplete}
                    disabled={getPatentTranslationStatus(selectedPatentId) === "번역완료"}
                    className="bg-green-700 border-green-500 text-green-100 hover:bg-green-600 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    번역완료
                  </Button>
                )}
              </div>
            </div>

            {/* 번역 결과 - 좌우 분할 */}
            {currentPatent ? (
              <div className="flex-1 flex overflow-hidden">
                {/* 특허 명세서 번역 */}
                <div className="w-1/2 flex flex-col border-r border-border">
                  <div className="p-4 bg-green-900 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bot className="h-5 w-5 text-green-400" />
                        <h3 className="font-semibold text-white">특허 명세서 번역</h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTranslationUploadOpen(true)}
                        className="bg-green-800 border-green-600 text-green-200 hover:bg-green-700"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        파일 업로드
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-4">
                      {/* 원본 문서 섹션 */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          원본 특허 명세서
                        </h4>
                        {documentsLoading ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                            <p className="text-sm text-muted-foreground mt-2">문서를 불러오는 중...</p>
                          </div>
                        ) : selectedPatentDocuments.length > 0 ? (
                          <div className="space-y-2">
                            {selectedPatentDocuments
                              .filter(doc => ['SPECIFICATION'].includes(doc.type))
                              .map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-3 bg-card border border-border rounded">
                                  <div className="flex items-center space-x-3">
                                    <FileText className="h-5 w-5 text-green-600 flex-none" />
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{doc.fileName}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {doc.type} • {formatFileSize(doc.fileSize)}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (doc.filePath) {
                                        const s3Url = getS3Url(doc.filePath)
                                        
                                        // 서버를 통해 파일을 가져와서 다운로드
                                        getDownloadUrl(s3Url, doc.fileName)
                                      } else {
                                        console.error('파일 경로가 없습니다')
                                      }
                                    }}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    보기
                                  </Button>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">원본 특허 명세서가 없습니다.</p>
                          </div>
                        )}
                      </div>

                      {/* 번역 파일 섹션 */}
                      <div>
                        <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center">
                          <Bot className="h-4 w-4 mr-2" />
                          번역 파일
                        </h4>
                        {translationGroups.length === 0 ? (
                          <div className="text-center py-12">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground flex-none" />
                            <p className="text-muted-foreground">업로드된 번역 파일이 없습니다.</p>
                            <p className="text-sm text-muted-foreground mt-2">파일 업로드 버튼을 클릭하여 파일을 추가하세요.</p>
                          </div>
                        ) : (
                          translationGroups.map((group) => (
                            <Card
                              key={group.id}
                              className={`bg-card mb-2  ${
                                group.isCompletion
                                  ? "border-4 border-green-600 shadow-xl shadow-green-600/30 ring-2 ring-green-700/50"
                                  : "border-green-700"
                              }`}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  {group.isCompletion && (
                                    <div className="flex items-center justify-between">
                                      <Badge className="bg-green-700 text-white border-green-600">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        번역완료
                                      </Badge>
                                      <div className="flex items-center space-x-2">
                                        <div className="text-xs text-muted-foreground">
                                          {new Date(group.uploadedAt).toLocaleString("ko-KR")}
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditCompletionFile(group)}
                                          className="text-green-600 hover:text-green-700 h-6 px-2"
                                        >
                                          수정
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {!group.isCompletion && (
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(group.uploadedAt).toLocaleString("ko-KR")}
                                    </div>
                                  )}

                                  {group.files.length > 0 && (
                                    <div className="space-y-2">
                                      {group.files.map((file) => (
                                        <div 
                                          key={file.id} 
                                          className="flex items-center justify-between p-2 bg-accent rounded cursor-pointer hover:bg-accent/80 transition-colors"
                                          onClick={() => {
                                            if (file.fileKey) {
                                              const s3Url = getS3Url(file.fileKey)
                                              
                                              // 서버를 통해 파일을 가져와서 다운로드
                                              getDownloadUrl(s3Url, file.name)
                                            } else if (file.url) {
                                              getDownloadUrl(file.url, file.name)
                                            } else {
                                              console.error('파일 경로가 없습니다')
                                            }
                                          }}
                                        >
                                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {group.comment && (
                                    <div
                                      className={`flex items-start space-x-2 ${group.files.length > 0 ? "pt-2 border-t border-border" : ""}`}
                                    >
                                      <MessageSquare className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                      <pre className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                                        {group.comment}
                                      </pre>
                                    </div>
                                  )}

                                  {group.isCompletion && group.translatedTitleUS && (
                                    <div className="bg-green-950/30 border border-green-700 rounded p-3 mt-2">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <Badge className="bg-green-700 text-white border-green-600 text-xs">
                                          번역완료 특허명(US)
                                        </Badge>
                                      </div>
                                      <p className="text-green-300 font-medium">{group.translatedTitleUS}</p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                {/* 관리자 / 발명자 번역 검토 */}
                <div className="w-1/2 flex flex-col">
                  <div className="p-4 bg-blue-900 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-blue-400" />
                        <h3 className="font-semibold text-white">관리자 / 발명자 번역 검토</h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewUploadOpen(true)}
                        className="bg-blue-800 border-blue-600 text-blue-200 hover:bg-blue-700"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        파일 업로드
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-4">
                      {reviewGroups.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">업로드된 검토 파일이 없습니다.</p>
                          <p className="text-sm text-muted-foreground mt-2">파일 업로드 버튼을 클릭하여 파일을 추가하세요.</p>
                        </div>
                      ) : (
                        reviewGroups.map((group) => (
                          <Card key={group.id} className="bg-card border-blue-600">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="text-xs text-muted-foreground">
                                  {new Date(group.uploadedAt).toLocaleString("ko-KR")}
                                </div>

                                {group.files.length > 0 && (
                                  <div className="space-y-2">
                                    {group.files.map((file) => (
                                      <div 
                                        key={file.id} 
                                        className="flex items-center justify-between p-2 bg-accent rounded cursor-pointer hover:bg-accent/80 transition-colors"
                                        onClick={() => {
                                          if (file.fileKey) {
                                            const s3Url = getS3Url(file.fileKey)
                                            
                                            // 서버를 통해 파일을 가져와서 다운로드
                                            getDownloadUrl(s3Url, file.name)
                                          } else if (file.url) {
                                            getDownloadUrl(file.url, file.name)
                                          } else {
                                            console.error('파일 경로가 없습니다')
                                          }
                                        }}
                                      >
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                          <FileText className="h-5 w-5 text-blue-400 flex-shrink-0" />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {group.comment && (
                                  <div
                                    className={`flex items-start space-x-2 ${group.files.length > 0 ? "pt-2 border-t border-border" : ""}`}
                                  >
                                    <MessageSquare className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <pre className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                                      {group.comment}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">특허를 선택해주세요.</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 파일 업로드 모달들 */}
      <TranslationFileUploadModal
        isOpen={translationUploadOpen}
        onClose={() => setTranslationUploadOpen(false)}
        title="특허 명세서 번역 파일 업로드"
        patentId={selectedPatentId}
        section="translation"
        onUploadComplete={(files, comment) => handleFileUploadComplete(files, comment, "translation")}
      />

      <TranslationFileUploadModal
        isOpen={reviewUploadOpen}
        onClose={() => setReviewUploadOpen(false)}
        title="관리자 / 발명자 번역 검토 파일 업로드"
        patentId={selectedPatentId}
        section="review"
        onUploadComplete={(files, comment) => handleFileUploadComplete(files, comment, "review")}
      />

      <TranslationFileUploadModal
        isOpen={completionUploadOpen}
        onClose={() => {
          setCompletionUploadOpen(false)
          setEditingGroup(null)
        }}
        title={editingGroup ? "번역 완료 파일 수정" : "번역 완료 파일 업로드"}
        patentId={selectedPatentId}
        section="translation"
        defaultComment={completionModalProps.defaultComment}
        isEditMode={!!editingGroup}
        existingFiles={completionModalProps.existingFiles}
        existingTranslatedTitleUS={completionModalProps.existingTranslatedTitleUS}
        patentInfo={completionModalProps.patentInfo}
        onUploadComplete={(files, comment, translatedTitleUS) =>
          handleFileUploadComplete(files, comment, "translation", true, translatedTitleUS)
        }
      />
    </div>
  )
}

export default function TranslationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TranslationsPageContent />
    </Suspense>
  )
}
