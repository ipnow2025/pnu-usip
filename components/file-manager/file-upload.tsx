"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, File, FileText, ImageIcon, Download, Eye, Trash2, X, CheckCircle, AlertCircle } from "lucide-react"

interface FileItem {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: Date
  uploadedBy: string
  url?: string
  status: "uploading" | "completed" | "error"
  progress?: number
  fileObject?: File // 실제 파일 객체 (방금 업로드한 경우)
  previewUrl?: string // 미리보기용 URL
  textContent?: string // 텍스트 파일 내용
}

interface FileUploadProps {
  patentId: string
  files: FileItem[]
  onFileUpload: (files: File[]) => void
  onFileDelete: (fileId: string) => void
  onFileDownload: (file: FileItem) => void
  canUpload: boolean
  canDelete: boolean
}

export function FileUpload({
  patentId,
  files,
  onFileUpload,
  onFileDelete,
  onFileDownload,
  canUpload,
  canDelete,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0 && canUpload) {
      onFileUpload(droppedFiles)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      onFileUpload(selectedFiles)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (type.includes("pdf")) return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const getFileTypeColor = (type: string) => {
    if (type.startsWith("image/")) return "bg-green-100 text-green-800"
    if (type.includes("pdf")) return "bg-red-100 text-red-800"
    if (type.includes("word") || type.includes("document")) return "bg-blue-100 text-blue-800"
    return "bg-gray-100 text-gray-800"
  }

  const handlePreview = async (file: FileItem) => {
    // 일단 클릭이 되는지 확인
    alert(`미리보기 클릭됨: ${file.name}`)
    console.log("미리보기 시도:", file.name, file.type)

    // 무조건 모달을 열어보기
    setPreviewFile(file)
  }

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 생성된 Object URL들 정리
      if (previewFile?.previewUrl && previewFile.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewFile.previewUrl)
      }
    }
  }, [previewFile])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>파일 관리</span>
          <Badge variant="outline">{files.length}개 파일</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 파일 업로드 영역 */}
        {canUpload && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium mb-1">파일을 드래그하거나 클릭하여 업로드</p>
            <p className="text-xs text-gray-500 mb-3">PDF, DOC, DOCX, 이미지 파일 지원</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              파일 선택
            </Button>
          </div>
        )}

        {/* 파일 목록 */}
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex-shrink-0">{getFileIcon(file.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{file.uploadedBy}</span>
                    <span>•</span>
                    <span>{file.uploadedAt.toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Badge className={getFileTypeColor(file.type)}>
                    {file.type.split("/")[1]?.toUpperCase() || "FILE"}
                  </Badge>
                </div>
              </div>

              {/* 파일 상태 및 진행률 */}
              <div className="flex items-center space-x-2 ml-4">
                {file.status === "uploading" && (
                  <div className="flex items-center space-x-2">
                    <Progress value={file.progress || 0} className="w-16" />
                    <span className="text-xs text-gray-500">{file.progress || 0}%</span>
                  </div>
                )}
                {file.status === "completed" && <CheckCircle className="h-4 w-4 text-green-600" />}
                {file.status === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
              </div>

              {/* 액션 버튼들 */}
              <div className="flex items-center space-x-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    alert("버튼 클릭됨!")
                    handlePreview(file)
                  }}
                  title="미리보기"
                  className="hover:bg-gray-100"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onFileDownload(file)} title="다운로드">
                  <Download className="h-4 w-4" />
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileDelete(file.id)}
                    className="text-red-600 hover:text-red-700"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {files.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <File className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">업로드된 파일이 없습니다</p>
          </div>
        )}
      </CardContent>

      {/* 파일 미리보기 모달 */}
      <Dialog open={previewFile !== null} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl w-full h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{previewFile?.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setPreviewFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
            {previewFile?.type.startsWith("image/") ? (
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={
                    previewFile.previewUrl ||
                    previewFile.url ||
                    `/placeholder.svg?height=400&width=600&text=${encodeURIComponent("이미지 파일") || "/placeholder.svg"}`
                  }
                  alt={previewFile.name}
                  className="max-w-full max-h-full object-contain rounded"
                  onError={(e) => {
                    console.log("이미지 로드 실패, 플레이스홀더로 대체")
                    e.currentTarget.src = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent("이미지를 불러올 수 없습니다")}`
                  }}
                />
              </div>
            ) : previewFile?.type === "application/pdf" ? (
              <div className="w-full h-full">
                {previewFile.previewUrl ? (
                  <iframe src={previewFile.previewUrl} className="w-full h-full border-0" title={previewFile.name} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <FileText className="h-16 w-16 text-red-500 mb-4" />
                    <p className="text-lg font-medium mb-2">PDF 문서</p>
                    <p className="text-gray-600 mb-4">{previewFile.name}</p>
                    <p className="text-sm text-gray-500 mb-4">크기: {formatFileSize(previewFile.size)}</p>
                    <Button onClick={() => previewFile && onFileDownload(previewFile)}>
                      <Download className="h-4 w-4 mr-2" />
                      다운로드하여 보기
                    </Button>
                  </div>
                )}
              </div>
            ) : previewFile?.textContent ? (
              <div className="w-full h-full p-4 overflow-auto">
                <div className="bg-white dark:bg-gray-900 rounded border p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{previewFile.textContent}</pre>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">{previewFile?.name}</p>
                <p className="text-gray-600 mb-2">파일 형식: {previewFile?.type || "알 수 없음"}</p>
                <p className="text-gray-600 mb-4">
                  크기: {previewFile ? formatFileSize(previewFile.size) : "알 수 없음"}
                </p>
                <p className="text-gray-500 mb-4">이 파일 형식은 미리보기를 지원하지 않습니다</p>
                <Button onClick={() => previewFile && onFileDownload(previewFile)}>
                  <Download className="h-4 w-4 mr-2" />
                  다운로드
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
