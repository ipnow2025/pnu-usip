"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, UserCheck, Shield, X, CheckCircle } from "lucide-react"

interface DocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (documentData: any) => void
  patentId?: string
  documentType?: string
  uploadType?: "ATTORNEY_DRAFT" | "USER_FINAL"
}

const documentTypes = {
  DECLARATION: "Declaration",
  ADS: "ADS (Application Data Sheet)",
  IDS: "IDS (Information Disclosure Statement)",
  ASSIGNMENT: "Assignment",
  SPECIFICATION: "번역 명세서",
  DRAWINGS: "도면",
  IDS_ATTACHMENTS: "IDS 부속서류",
  OTHER: "기타서류",
}

interface UploadedFile {
  id: string
  file: File
  status: "uploading" | "completed" | "error"
  error?: string
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  onUpload,
  patentId,
  documentType = "",
  uploadType = "USER_FINAL",
}: DocumentUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // 완료 버튼 클릭 시 업로드 처리
  const handleComplete = async () => {
    // 선택된 파일이 있으면 먼저 업로드
    if (selectedFiles.length > 0) {
      await handleUploadSelectedFiles()
    }

    // 모든 업로드가 완료되면 모달 닫기
    handleClose()
  }

  const handleUploadSelectedFiles = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)

    try {
      // 선택된 파일들을 업로드 목록에 추가
      const newUploadedFiles: UploadedFile[] = selectedFiles.map((file) => ({
        id: `upload_${Date.now()}_${Math.random()}`,
        file,
        status: "uploading",
      }))

      setUploadedFiles((prev) => [...prev, ...newUploadedFiles])
      setSelectedFiles([]) // 선택된 파일 목록 초기화

      // 각 파일을 순차적으로 업로드
      for (const uploadedFile of newUploadedFiles) {
        try {
          // FormData 생성
          const formData = new FormData()
          formData.append('patentId', patentId || '')
          formData.append('documentType', documentType)
          formData.append('uploadType', uploadType)
          formData.append('file', uploadedFile.file)

          // API 호출
          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || '업로드 실패')
          }

          const result = await response.json()

          // 업로드 성공
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: "completed" as const } : f)),
          )

          // 부모 컴포넌트에 성공 알림
          if (onUpload) {
            onUpload(result.data)
          }
        } catch (error) {
          // 업로드 실패
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id ? { ...f, status: "error" as const, error: (error as Error).message || "업로드 실패" } : f,
            ),
          )
        }
      }
    } catch (error) {
      console.error("업로드 오류:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFiles([])
    setUploadedFiles([])
    onClose()
  }

  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    setSelectedFiles((prev) => [...prev, ...fileArray])
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeUploadedFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
  }

  // 점선 영역 클릭 시 파일 선택 다이얼로그 열기
  const handleDropAreaClick = () => {
    const fileInput = document.getElementById("file-upload-main")
    if (fileInput) {
      fileInput.click()
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 모달 제목 생성
  const getModalTitle = () => {
    const docTypeName = documentTypes[documentType as keyof typeof documentTypes] || documentType
    const uploadTypeName = uploadType === "ATTORNEY_DRAFT" ? "변호사" : "특허관리자"
    return `${docTypeName} - ${uploadTypeName} 업로드`
  }

  // 업로드 타입 아이콘
  const getUploadTypeIcon = () => {
    return uploadType === "ATTORNEY_DRAFT" ? (
      <UserCheck className="h-5 w-5 text-blue-600" />
    ) : (
      <Shield className="h-5 w-5 text-green-600" />
    )
  }

  // 업로드 타입 설명
  const getUploadTypeDescription = () => {
    const docTypeName = documentTypes[documentType as keyof typeof documentTypes] || documentType
    const uploadTypeName = uploadType === "ATTORNEY_DRAFT" ? "변호사" : "특허관리자"
    return `${docTypeName} 서류를 ${uploadTypeName}가 업로드합니다. 여러 파일을 한번에 선택하거나 여러번 나누어 업로드할 수 있습니다.`
  }

  const completedUploads = uploadedFiles.filter((f) => f.status === "completed").length
  const totalUploads = uploadedFiles.length

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getUploadTypeIcon()}
              <span>{getModalTitle()}</span>
            </div>
            {totalUploads > 0 && (
              <Badge variant="outline" className="bg-green-100 text-green-800">
                {completedUploads}/{totalUploads} 완료
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 pr-4">
            {/* 업로드 타입 안내 */}
            <Card
              className={
                uploadType === "ATTORNEY_DRAFT"
                  ? "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800"
                  : "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800"
              }
            >
              <CardHeader className="pb-3">
                <CardTitle
                  className={`text-sm flex items-center space-x-2 ${
                    uploadType === "ATTORNEY_DRAFT"
                      ? "text-blue-800 dark:text-blue-200"
                      : "text-green-800 dark:text-green-200"
                  }`}
                >
                  {getUploadTypeIcon()}
                  <span>{uploadType === "ATTORNEY_DRAFT" ? "변호사 업로드" : "특허관리자 업로드"}</span>
                </CardTitle>
                <CardDescription
                  className={`text-sm ${
                    uploadType === "ATTORNEY_DRAFT"
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-green-700 dark:text-green-300"
                  }`}
                >
                  {getUploadTypeDescription()}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 파일 업로드 영역 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">파일 선택</CardTitle>
                <CardDescription>
                  PDF, DOC, DOCX 파일을 업로드할 수 있습니다. 여러 파일을 한번에 선택 가능합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 숨겨진 파일 입력 */}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  multiple
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                  className="hidden"
                  id="file-upload-main"
                />

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors min-h-[200px] flex flex-col justify-center cursor-pointer ${
                    dragActive
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-950"
                      : selectedFiles.length > 0
                        ? "border-green-400 bg-green-50 dark:bg-green-950"
                        : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={handleDropAreaClick}
                >
                  {selectedFiles.length > 0 ? (
                    <div className="space-y-3">
                      <FileText className="h-12 w-12 text-green-600 mx-auto" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">
                          {selectedFiles.length}개 파일 선택됨
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          총 {formatFileSize(selectedFiles.reduce((acc, file) => acc + file.size, 0))}
                        </p>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-white dark:bg-gray-700 rounded p-2 text-sm"
                            onClick={(e) => e.stopPropagation()} // 파일 항목 클릭 시 파일 선택 다이얼로그가 열리지 않도록
                          >
                            <span className="truncate flex-1">{file.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeSelectedFile(index)
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          multiple
                          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                          className="hidden"
                          id="file-upload-more"
                        />
                        <label htmlFor="file-upload-more">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>파일 추가</span>
                          </Button>
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFiles([])
                          }}
                        >
                          전체 삭제
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-lg font-medium">파일을 드래그하거나 클릭하여 업로드</p>
                        <p className="text-sm text-gray-500">최대 10MB, PDF/DOC/DOCX 형식, 여러 파일 선택 가능</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 업로드된 파일 목록 */}
            {uploadedFiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>업로드 현황</span>
                  </CardTitle>
                  <CardDescription>
                    {completedUploads}개 완료, {uploadedFiles.filter((f) => f.status === "uploading").length}개 진행중,{" "}
                    {uploadedFiles.filter((f) => f.status === "error").length}개 실패
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uploadedFiles.map((uploadedFile) => (
                      <div
                        key={uploadedFile.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium truncate">{uploadedFile.file.name}</p>
                            {uploadedFile.status === "completed" && <CheckCircle className="h-4 w-4 text-green-600" />}
                            {uploadedFile.status === "uploading" && (
                              <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            )}
                            {uploadedFile.status === "error" && <X className="h-4 w-4 text-red-600" />}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{formatFileSize(uploadedFile.file.size)}</span>
                            {uploadedFile.status === "completed" && (
                              <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                                완료
                              </Badge>
                            )}
                            {uploadedFile.status === "uploading" && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">
                                업로드중
                              </Badge>
                            )}
                            {uploadedFile.status === "error" && (
                              <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">
                                실패: {uploadedFile.error}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUploadedFile(uploadedFile.id)}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading}>
            취소
          </Button>
          <Button
            type="button"
            onClick={handleComplete}
            disabled={isUploading}
            className={
              uploadType === "ATTORNEY_DRAFT" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
            }
          >
            {isUploading ? "업로드 중..." : "완료"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
