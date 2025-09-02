"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Download, Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface DocumentTemplate {
  type: string
  name: string
  description: string
  required: boolean
  hasTemplate: boolean
}

interface DocumentTemplateManagerProps {
  templates: DocumentTemplate[]
  canUpload: boolean
}

export function DocumentTemplateManager({ templates, canUpload }: DocumentTemplateManagerProps) {
  const [uploadModal, setUploadModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // 템플릿 다운로드 처리
  const handleDownload = async (template: DocumentTemplate) => {
    try {
      // 실제 구현에서는 서버에서 파일을 가져옴
      const response = await fetch(`/api/templates/${template.type}`)

      if (!response.ok) {
        // 템플릿이 없는 경우 기본 템플릿 생성
        const defaultContent = generateDefaultTemplate(template)
        const blob = new Blob([defaultContent], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)

        const a = document.createElement("a")
        a.href = url
        a.download = `${template.type}_template.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "다운로드 완료",
          description: `${template.name} 기본 양식이 다운로드되었습니다.`,
        })
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = `${template.type}_template.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "다운로드 완료",
        description: `${template.name} 양식이 다운로드되었습니다.`,
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "다운로드 실패",
        description: "파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 기본 템플릿 내용 생성
  const generateDefaultTemplate = (template: DocumentTemplate) => {
    const content = `
${template.name} 양식

이 문서는 ${template.description}입니다.

작성 지침:
1. 모든 필수 항목을 작성해주세요.
2. 정확한 정보를 입력해주세요.
3. 서명이 필요한 경우 반드시 서명해주세요.

${
  template.type === "ADS"
    ? `
Application Data Sheet 작성 항목:
- 출원인 정보
- 발명자 정보
- 출원 제목
- 우선권 정보
`
    : ""
}

${
  template.type === "SPECIFICATION"
    ? `
명세서 작성 항목:
- 발명의 명칭
- 기술분야
- 배경기술
- 발명의 내용
- 도면의 간단한 설명
- 발명의 실시를 위한 구체적인 내용
`
    : ""
}

${
  template.type === "CLAIMS"
    ? `
청구항 작성 지침:
- 독립항과 종속항을 명확히 구분
- 기술적 특징을 정확히 기재
- 명확하고 간결한 표현 사용
`
    : ""
}

${
  template.type === "OATH_DECLARATION"
    ? `
선서서/선언서 작성 항목:
- 발명자 성명 (영문)
- 발명자 주소
- 발명자 서명
- 작성 날짜
`
    : ""
}

부산대학교 특허관리시스템
생성일: ${new Date().toLocaleDateString("ko-KR")}
    `
    return content
  }

  // 파일 업로드 처리
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "파일 크기 초과",
          description: "파일 크기는 10MB 이하여야 합니다.",
          variant: "destructive",
        })
        return
      }

      // 파일 형식 확인
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "지원하지 않는 파일 형식",
          description: "PDF, DOC, DOCX 파일만 업로드 가능합니다.",
          variant: "destructive",
        })
        return
      }

      setUploadedFile(file)
    }
  }

  // 업로드 실행
  const handleUpload = async () => {
    if (!uploadedFile || !selectedTemplate) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // 업로드 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 20
        })
      }, 200)

      // FormData 생성
      const formData = new FormData()
      formData.append("file", uploadedFile)
      formData.append("templateType", selectedTemplate.type)

      // 실제 업로드 API 호출
      const response = await fetch("/api/templates/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        setTimeout(() => {
          toast({
            title: "업로드 완료",
            description: `${selectedTemplate.name} 양식이 성공적으로 업로드되었습니다.`,
          })
          setUploadModal(false)
          setUploadedFile(null)
          setSelectedTemplate(null)
          setUploadProgress(0)
          setIsUploading(false)
        }, 500)
      } else {
        throw new Error("Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "업로드 실패",
        description: "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const openUploadModal = (template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setUploadModal(true)
  }

  const closeUploadModal = () => {
    setUploadModal(false)
    setSelectedTemplate(null)
    setUploadedFile(null)
    setUploadProgress(0)
    setIsUploading(false)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.type}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {template.name}
              </CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <div
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                    template.required
                      ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {template.required ? <AlertCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                  {template.required ? "필수" : "선택"}
                </div>
                {template.hasTemplate && (
                  <div className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    양식 있음
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(template)}>
                  <Download className="h-4 w-4 mr-2" />
                  양식 다운로드
                </Button>
                {canUpload ? (
                  <Button size="sm" className="flex-1" onClick={() => openUploadModal(template)}>
                    <Upload className="h-4 w-4 mr-2" />
                    업로드
                  </Button>
                ) : (
                  <Button size="sm" className="flex-1" disabled>
                    <Upload className="h-4 w-4 mr-2" />
                    업로드
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 업로드 모달 */}
      <Dialog open={uploadModal} onOpenChange={closeUploadModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {selectedTemplate?.name} 업로드
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!isUploading ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="file-upload">파일 선택</Label>
                  <Input id="file-upload" type="file" accept=".pdf,.doc,.docx" onChange={handleFileSelect} />
                </div>

                {uploadedFile && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      선택된 파일: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                    </AlertDescription>
                  </Alert>
                )}

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>PDF, DOC, DOCX 파일만 업로드 가능합니다. (최대 10MB)</AlertDescription>
                </Alert>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">파일 업로드 중...</p>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">{Math.round(uploadProgress)}% 완료</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {!isUploading ? (
              <>
                <Button variant="outline" onClick={closeUploadModal}>
                  취소
                </Button>
                <Button onClick={handleUpload} disabled={!uploadedFile}>
                  업로드
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={closeUploadModal}>
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
