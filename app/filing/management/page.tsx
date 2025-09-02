"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Upload, Users, Save, FileText, Download, Trash2, Edit, ChevronLeft, ChevronRight } from "lucide-react"
import { getCurrentUser } from "@/lib/permissions"
import type { Patent, PatentStatus } from "@/lib/types"

// 단계별 한글명
const STAGE_LABELS: Record<string, string> = {
  ALL: "출원관리(전체)",
  ATTORNEY_REVIEW: "변호사 검토",
  USPTO_FILING: "USPTO 출원",
  OA_RESPONSE: "OA 대응",
  USPTO_REGISTERED: "USPTO 등록",
}

interface FilingManagementProps {
  selectedPatentIds?: string[]
  selectedStage?: string
  onClose?: () => void
  onStatusUpdate?: (patentId: string, newStatus: PatentStatus) => void
}

interface FilingFile {
  id: string
  patentId: string
  fileName: string
  originalFileName: string
  fileSize: number
  fileType: string
  uploadedBy: string
  uploadedAt: string
  fileKey: string
}

export default function FilingManagementPage() {
  const selectedStage = "ALL"
  const onClose = () => {}

  const [selectedPatentId, setSelectedPatentId] = useState<string>("")
  const [patents, setPatents] = useState<Patent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filingInfo, setFilingInfo] = useState({
    usApplicationNumber: "",
    usFilingDate: "",
  })
  const [uploadedFilingFiles, setUploadedFilingFiles] = useState<FilingFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalPatents, setTotalPatents] = useState(0)
  const patentsPerPage = 10

  const currentUser = getCurrentUser()

  // Load patents with pagination
  useEffect(() => {
    const loadPatents = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/patents?section=filing&page=${currentPage}&limit=${patentsPerPage}`)
        if (response.ok) {
          const data = await response.json()
          const patentData = data.data || []
          setPatents(patentData)
          setTotalPages(data.totalPages || 1)
          setTotalPatents(data.total || 0)
          
          // 특허 데이터가 있지만 선택된 특허가 없으면 첫 번째 특허를 선택
          if (patentData.length > 0 && !selectedPatentId) {
            setSelectedPatentId(patentData[0].id)
          }
        } else {
          setError(`API 호출 실패: ${response.status}`)
        }
      } catch (error) {
        console.error("특허 데이터 로드 실패:", error)
        setError("특허 데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }

    loadPatents()
  }, [currentPage])

  // Load filing files for selected patent
  useEffect(() => {
    const loadFilingFiles = async () => {
      if (!selectedPatentId) {
        setUploadedFilingFiles([])
        return
      }

      try {
        const response = await fetch(`/api/filing-files?patentId=${selectedPatentId}`)
        if (response.ok) {
          const data = await response.json()
          setUploadedFilingFiles(data.files || [])
        } else {
          console.error("파일 목록 로드 실패:", response.status)
          setUploadedFilingFiles([])
        }
      } catch (error) {
        console.error("파일 목록 로드 실패:", error)
        setUploadedFilingFiles([])
      }
    }

    loadFilingFiles()
  }, [selectedPatentId])

  useEffect(() => {
    const selectedPatent = patents.find((p) => p.id === selectedPatentId)
    if (selectedPatent) {
      setFilingInfo({
        usApplicationNumber: selectedPatent.usApplicationNumber || "",
        usFilingDate: selectedPatent.filingDate ? selectedPatent.filingDate.split('T')[0] : "",
      })
    }
  }, [selectedPatentId, patents])

  const selectedPatent = patents.find((p) => p.id === selectedPatentId)

  // 출원 상태 확인 함수
  const getFilingStatus = (patent: Patent) => {
    return patent.usApplicationNumber ? "출원완료" : "출원진행중"
  }

  // USPTO 출원증명서류 업로드 핸들러
  const handleFilingFileUpload = async (files: FileList) => {
    if (!selectedPatentId) {
      alert("특허를 먼저 선택해주세요.")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("patentId", selectedPatentId)
      
      Array.from(files).forEach((file) => {
        if (file.size <= 10 * 1024 * 1024) { // 10MB 제한
          formData.append("files", file)
        }
      })

      const response = await fetch("/api/filing-files/upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        // 파일 목록 새로고침
        const filesResponse = await fetch(`/api/filing-files?patentId=${selectedPatentId}`)
        if (filesResponse.ok) {
          const filesData = await filesResponse.json()
          setUploadedFilingFiles(filesData.files || [])
        }
        alert("파일이 성공적으로 업로드되었습니다.")
      } else {
        const errorData = await response.json()
        alert(`업로드 실패: ${errorData.error || "알 수 없는 오류"}`)
      }
    } catch (error) {
      console.error("파일 업로드 실패:", error)
      alert("파일 업로드 중 오류가 발생했습니다.")
    } finally {
      setUploading(false)
    }
  }

  // 파일 다운로드 (서버 API 사용)
  const handleFileDownload = async (file: FilingFile) => {
    try {
      const response = await fetch(`/api/file?fileKey=${encodeURIComponent(file.fileKey)}`)
      
      if (response.ok) {
        const data = await response.json()
        
        // ArrayBuffer를 Blob으로 변환
        const blob = new Blob([new Uint8Array(data.arrayBuffer)], { type: data.type })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = file.originalFileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        alert("파일 다운로드에 실패했습니다.")
      }
    } catch (error) {
      console.error("파일 다운로드 실패:", error)
      alert("파일 다운로드 중 오류가 발생했습니다.")
    }
  }

  // 파일 삭제
  const handleFileDelete = async (fileId: string) => {
    if (!confirm("이 파일을 삭제하시겠습니까?")) {
      return
    }

    try {
      const response = await fetch(`/api/filing-files/${fileId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setUploadedFilingFiles((prev) => prev.filter((file) => file.id !== fileId))
        alert("파일이 삭제되었습니다.")
      } else {
        alert("파일 삭제에 실패했습니다.")
      }
    } catch (error) {
      console.error("파일 삭제 실패:", error)
      alert("파일 삭제 중 오류가 발생했습니다.")
    }
  }

  // 정보 저장
  const handleSave = async () => {
    if (!selectedPatentId) {
      alert("특허를 먼저 선택해주세요.")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/patents/${selectedPatentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usApplicationNumber: filingInfo.usApplicationNumber,
          filingDate: filingInfo.usFilingDate ? new Date(filingInfo.usFilingDate).toISOString() : null,
        }),
      })

      if (response.ok) {
        // 특허 목록 새로고침
        const patentsResponse = await fetch(`/api/patents?section=filing&page=${currentPage}&limit=${patentsPerPage}`)
        if (patentsResponse.ok) {
          const data = await patentsResponse.json()
          setPatents(data.data || [])
          
          // 선택된 특허 정보도 업데이트
          const updatedPatent = data.data?.find((p: Patent) => p.id === selectedPatentId)
          if (updatedPatent) {
            setFilingInfo({
              usApplicationNumber: updatedPatent.usApplicationNumber || "",
              usFilingDate: updatedPatent.filingDate ? updatedPatent.filingDate.split('T')[0] : "",
            })
          }
        }
        alert("정보가 저장되었습니다.")
      } else {
        alert("저장에 실패했습니다.")
      }
    } catch (error) {
      console.error("저장 실패:", error)
      alert("저장 중 오류가 발생했습니다.")
    } finally {
      setSaving(false)
    }
  }

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  // 로딩 상태 처리
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">특허 데이터를 불러오는 중...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // 에러 상태 처리
  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={onClose} className="mt-4">
                돌아가기
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // 특허가 없는 경우
  if (patents.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">출원 관리할 특허가 없습니다.</p>
              <Button onClick={onClose} className="mt-4">
                돌아가기
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // 선택된 특허가 없는 경우
  if (!selectedPatent) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">선택된 특허 정보를 찾을 수 없습니다.</p>
              <Button onClick={onClose} className="mt-4">
                돌아가기
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* 왼쪽 특허 목록 */}
            <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">{STAGE_LABELS[selectedStage]}</h2>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {patents.map((patent) => (
                  <Card
                    key={patent.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedPatentId === patent.id ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""
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
                            className={
                              getFilingStatus(patent) === "출원완료"
                                ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700"
                                : "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700"
                            }
                          >
                            {getFilingStatus(patent)}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-sm line-clamp-2">{patent.title}</h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <Users className="h-3 w-3" />
                          <span>
                            {Array.isArray(patent.inventors) 
                              ? patent.inventors.map((inv: any) => 
                                  typeof inv === 'string' ? inv : inv.name
                                ).join(", ")
                              : "발명자 정보 없음"
                            }
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      총 {totalPatents}개 중 {((currentPage - 1) * patentsPerPage) + 1}-{Math.min(currentPage * patentsPerPage, totalPatents)}개
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 오른쪽 작업 영역 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* 특허 기본 정보 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>특허 기본 정보</span>
                      <Badge variant="outline" className="px-3 py-1">
                        {selectedPatent.managementNumber}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">특허제목</Label>
                          <p className="font-medium">{selectedPatent.title}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">발명자</Label>
                          <p className="font-medium">
                            {Array.isArray(selectedPatent.inventors) 
                              ? selectedPatent.inventors.map((inv: any) => 
                                  typeof inv === 'string' ? inv : inv.name
                                ).join(", ")
                              : selectedPatent.inventors 
                                ? (() => {
                                    try {
                                      const parsed = JSON.parse(selectedPatent.inventors)
                                      return Array.isArray(parsed) ? parsed.join(", ") : selectedPatent.inventors
                                    } catch {
                                      return selectedPatent.inventors
                                    }
                                  })()
                                : "발명자 정보 없음"
                            }
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">현재 상태</Label>
                          <Badge variant="outline" className="ml-2">
                            {selectedPatent.status === "NO_PROGRESS"
                              ? "번역 대기"
                              : selectedPatent.status === "TRANSLATING"
                                ? "번역 진행중"
                                : selectedPatent.status === "DOCUMENT_PREP"
                                  ? "서류 준비"
                                  : selectedPatent.status === "ATTORNEY_REVIEW"
                                    ? "변호사 검토"
                                    : selectedPatent.status === "USPTO_FILING"
                                      ? "USPTO 출원"
                                      : selectedPatent.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">KR 출원번호</Label>
                          <p className="font-medium font-mono">{selectedPatent.applicationNumber || "미정"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">KR 출원일</Label>
                          <p className="font-medium font-mono">
                            {selectedPatent.filingDate 
                              ? new Date(selectedPatent.filingDate).toLocaleDateString('ko-KR')
                              : "미정"
                            }
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">US 출원번호</Label>
                          <p className="font-medium font-mono">{selectedPatent.usApplicationNumber || "미정"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* USPTO 출원정보 */}
                <Card>
                  <CardHeader>
                    <CardTitle>USPTO 출원 정보 입력</CardTitle>
                    <CardDescription>USPTO 출원 관련 정보를 입력하세요</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="usApplicationNumber">US 출원번호</Label>
                        <Input
                          id="usApplicationNumber"
                          value={filingInfo.usApplicationNumber}
                          onChange={(e) => setFilingInfo((prev) => ({ ...prev, usApplicationNumber: e.target.value }))}
                          placeholder="예: 17/123,456"
                        />
                      </div>
                      <div>
                        <Label htmlFor="usFilingDate">US 출원일</Label>
                        <Input
                          id="usFilingDate"
                          type="date"
                          value={filingInfo.usFilingDate}
                          onChange={(e) => setFilingInfo((prev) => ({ ...prev, usFilingDate: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* USPTO 출원증명서류 업로드 */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">USPTO 출원증명서류</Label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                        <div className="text-center">
                          <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">USPTO 출원증명서류를 업로드하세요</p>
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => {
                                if (e.target.files) {
                                  handleFilingFileUpload(e.target.files)
                                }
                              }}
                              className="hidden"
                              id="upload-filing-files"
                              disabled={uploading}
                            />
                            <label
                              htmlFor="upload-filing-files"
                              className={`inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                                uploading ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                            >
                              {uploading ? "업로드 중..." : "파일 선택"}
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">PDF, DOC, DOCX (최대 10MB)</p>
                        </div>
                      </div>

                      {/* 업로드된 파일 목록 */}
                      {uploadedFilingFiles.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">업로드된 파일</h4>
                          <div className="space-y-2">
                            {uploadedFilingFiles.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <div className="flex items-center space-x-3">
                                  <FileText className="h-4 w-4 text-gray-400" />
                                  <div>
                                    <p className="text-sm font-medium">{file.originalFileName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {(file.fileSize / 1024 / 1024).toFixed(2)}MB • {file.uploadedBy} •{" "}
                                      {new Date(file.uploadedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleFileDownload(file)}
                                    title="다운로드"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleFileDelete(file.id)}
                                    title="삭제"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="border border-gray-300 dark:border-gray-600"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "저장 중..." : "저장"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
