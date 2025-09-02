"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, FileText, X, Download, Eye, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
  fileObject?: File // 실제 파일 객체 추가
  status?: 'uploading' | 'completed' | 'error' // 업로드 상태 추가
}

interface PatentInfo {
  managementNumber: string
  applicationNumber: string
  inventor: string
  titleKR: string
}

interface TranslationFileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  patentId: string
  section: "translation" | "review"
  defaultComment?: string
  patentInfo?: PatentInfo
  isEditMode?: boolean
  existingFiles?: UploadedFile[]
  existingTranslatedTitleUS?: string
  onUploadComplete?: (files: UploadedFile[], comment: string, translatedTitleUS?: string) => void
}

export function TranslationFileUploadModal({
  isOpen,
  onClose,
  title,
  patentId,
  section,
  defaultComment = "",
  patentInfo,
  isEditMode = false,
  existingFiles = [],
  existingTranslatedTitleUS = "",
  onUploadComplete,
}: TranslationFileUploadModalProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [comment, setComment] = useState(defaultComment)
  const [translatedTitleUS, setTranslatedTitleUS] = useState("")
  const [isUploading, setIsUploading] = useState(false)

  // 모달이 열릴 때마다 초기화
  useEffect(() => {
    if (isOpen) {
      setComment(defaultComment)
      if (isEditMode) {
        setFiles([...existingFiles])
        setTranslatedTitleUS(existingTranslatedTitleUS)
      } else {
        setFiles([])
        setTranslatedTitleUS("")
      }
    }
  }, [isOpen, defaultComment, isEditMode, existingTranslatedTitleUS])

  // existingFiles가 변경될 때만 별도로 처리
  useEffect(() => {
    if (isOpen && isEditMode && existingFiles.length > 0) {
      setFiles([...existingFiles])
    }
  }, [isOpen, isEditMode, existingFiles.length])

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

    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      handleFiles(selectedFiles)
    }
  }

  const handleFiles = (fileList: File[]) => {
    const newFiles: UploadedFile[] = fileList.map((file) => ({
      id: `file_${Date.now()}_${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      fileObject: file, // 실제 파일 객체 저장
      status: 'completed' as const,
    }))

    setFiles((prev) => [...prev, ...newFiles])
    toast({
      title: "파일 업로드 완료",
      description: `${fileList.length}개 파일이 추가되었습니다.`,
    })
  }

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handlePreview = (file: UploadedFile) => {
    if (file.url) {
      if (file.type.includes("pdf")) {
        window.open(file.url, "_blank")
      } else if (file.type.includes("image")) {
        window.open(file.url, "_blank")
      } else {
        toast({
          title: "미리보기 불가",
          description: "이 파일 형식은 미리보기를 지원하지 않습니다.",
          variant: "destructive",
        })
      }
    }
  }

  const handleDownload = (file: UploadedFile) => {
    if (file.url) {
      const link = document.createElement("a")
      link.href = file.url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleSubmit = async () => {
    // 번역완료 모달인 경우 파일 업로드 필수
    if (title.includes("번역 완료") && files.length === 0) {
      toast({
        title: "파일 업로드가 필요합니다",
        description: "번역 완료를 위해서는 최소 1개 이상의 파일을 업로드해야 합니다.",
        variant: "destructive",
      })
      return
    }

    // 기존 검증 로직
    if (!title.includes("번역 완료") && files.length === 0 && !comment.trim()) {
      toast({
        title: "파일 또는 코멘트를 입력해주세요",
        description: "최소 1개 이상의 파일을 업로드하거나 코멘트를 입력해야 합니다.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // 실제 File 객체들만 추출
      const actualFiles = files
        .filter(file => file.fileObject)
        .map(file => file.fileObject!)

      // 파일 업로드 완료 콜백 호출
      if (onUploadComplete) {
        await onUploadComplete(files, comment, translatedTitleUS.trim() || undefined)
      }

      toast({
        title: isEditMode ? "수정 완료" : "업로드 완료",
        description: `${section === "translation" ? "번역" : "검토"} ${
          files.length > 0 ? "파일이" : "코멘트가"
        } 성공적으로 ${isEditMode ? "수정" : "업로드"}되었습니다.`,
      })

      // 초기화 및 모달 닫기
      if (!isEditMode) {
        setFiles([])
        setComment("")
        setTranslatedTitleUS("")
      }
      onClose()
    } catch (error) {
      console.error('업로드 실패:', error)
      toast({
        title: "업로드 실패",
        description: "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* 특허 정보 카드 */}
              {patentInfo && title.includes("번역 완료") && (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
                  <h3 className="text-base font-semibold text-white mb-2">특허 기본 정보</h3>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <Label className="text-gray-300 text-xs">관리번호</Label>
                      <p className="text-white font-mono text-sm">{patentInfo.managementNumber}</p>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-xs">출원번호</Label>
                      <p className="text-white font-mono text-sm">{patentInfo.applicationNumber}</p>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-xs">발명자</Label>
                      <p className="text-white text-sm">{patentInfo.inventor}</p>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-xs">특허명(KR)</Label>
                      <p className="text-white text-sm line-clamp-2">{patentInfo.titleKR}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 번역완료 특허명(US) 입력 필드 */}
              {patentInfo && title.includes("번역 완료") && (
                <div className="space-y-2">
                  <Label htmlFor="translatedTitleUS" className="text-white">
                    번역완료 특허명(US) <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="translatedTitleUS"
                    placeholder="영문 특허명을 입력하세요..."
                    value={translatedTitleUS}
                    onChange={(e) => setTranslatedTitleUS(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-400">💡 번역이 완료된 영문 특허명을 정확히 입력해주세요.</p>
                </div>
              )}

              {/* 파일 업로드 영역 */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? "border-blue-400 bg-blue-900/20" : "border-gray-600 hover:border-gray-500"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-white mb-2">
                  파일을 드래그하여 업로드하거나 클릭하여 선택하세요
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  PDF, DOC, DOCX, TXT 파일을 지원합니다 (최대 10MB)
                  {title.includes("번역 완료")
                    ? " • 번역 완료를 위해 파일 업로드는 필수입니다"
                    : " • 파일 없이 코멘트만 입력도 가능합니다"}
                </p>
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                />
                <Button 
                  variant="outline" 
                  className="bg-gray-800 border-gray-600 text-white"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  파일 선택 ({title.includes("번역 완료") ? "필수" : "선택사항"})
                </Button>
              </div>

              {/* 업로드된 파일 목록 */}
              {files.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">업로드된 파일 ({files.length}개)</h3>
                  <ScrollArea className="max-h-60">
                    <div className="space-y-2">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                        >
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-blue-400" />
                            <div>
                              <p className="text-sm font-medium text-white">{file.name}</p>
                              <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreview(file)}
                              className="text-gray-300 hover:text-white"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(file)}
                              className="text-gray-300 hover:text-white"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* 코멘트 입력 */}
              <div className="space-y-2">
                <Label htmlFor="comment" className="text-white">
                  코멘트 {files.length === 0 && <span className="text-red-400">*</span>}
                </Label>
                <Textarea
                  id="comment"
                  placeholder={
                    files.length === 0
                      ? "파일이 없을 경우 코멘트는 필수입니다..."
                      : "파일에 대한 설명이나 특이사항을 입력하세요..."
                  }
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  rows={3}
                />
                <p className="text-xs text-gray-400">
                  💡{" "}
                  {files.length > 0
                    ? "여러 파일을 함께 업로드하면 하나의 그룹으로 묶여서 표시됩니다."
                    : "파일 없이 코멘트만 입력하여 메모를 남길 수 있습니다."}
                </p>
              </div>
            </div>
          </ScrollArea>

          {/* 액션 버튼 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700 bg-gray-900">
            <Button variant="outline" onClick={onClose} className="bg-gray-800 border-gray-600 text-white">
              취소
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  업로드 중...
                </>
              ) : (
                isEditMode ? "수정 완료" : "업로드 완료"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
