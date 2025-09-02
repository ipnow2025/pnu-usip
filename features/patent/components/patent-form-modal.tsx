"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, Plus, X, FileText, Trash2, Download, Check } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/func"
import { patentsApi } from "@/lib/api/patents"
import { getS3Url } from "@/lib/getS3Url"

interface PatentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (patentData: any) => void
  patent?: any
}

interface PriorityPatent {
  title: string
  filingDate: string
  applicationNumber: string
  inventors: string[]
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  fileObject: File
}

interface ExistingDocument {
  id: string
  type: string
  fileName: string
  filePath: string
  fileSize: number
  version: number
  status: string
  createdAt: string
}

export function PatentFormModal({ isOpen, onClose, onSubmit, patent }: PatentFormModalProps) {
  const getInitialFormData = (patent?: any) => {
    
    // 발명자 정보 파싱
    let inventors = [""]
    if (patent?.inventors) {
      if (Array.isArray(patent.inventors)) {
        inventors = patent.inventors.map((inv: any) => typeof inv === "string" ? inv : inv.name)
      } else if (typeof patent.inventors === "string") {
        try {
          const parsedInventors = JSON.parse(patent.inventors)
          inventors = Array.isArray(parsedInventors) ? parsedInventors : [""]
        } catch (e) {
          inventors = [""]
        }
      }
    }
    
    // 발명자가 없으면 빈 문자열로 초기화
    if (inventors.length === 0 || (inventors.length === 1 && inventors[0] === "")) {
      inventors = [""]
    }
    
    // 출원유형 결정 (PCT 여부에 따라)
    const applicationType = patent?.pctFiled ? "provisional" : "regular"
    
    // 우선권 특허 정보 로드
    let priorityPatents: PriorityPatent[] = []
    
    if (patent?.priorityPatents && Array.isArray(patent.priorityPatents)) {
      priorityPatents = patent.priorityPatents.map((pp: any) => {
        return {
          title: pp.title || "",
          filingDate: pp.filingDate ? formatDate(pp.filingDate) : "",
          applicationNumber: pp.applicationNumber || "",
          inventors: Array.isArray(pp.inventors) ? pp.inventors : [""]
        }
      })
    }
        
    return {
      managementNumber: patent?.managementNumber || "",
      applicationNumber: patent?.applicationNumber || "",
      title: patent?.title || "",
      filingDate: patent?.filingDate ? formatDate(patent.filingDate) : "",
      applicationType: applicationType,
      registrationNumber: patent?.usRegistrationNumber || "",
      inventors: inventors,
      priorityPatents: priorityPatents, // 우선권 특허 배열
      pctFiled: !!patent?.pctFiled,
      pctApplicationNumber: patent?.pctApplicationNumber || "",
      pctFilingDate: patent?.pctFilingDate ? formatDate(patent.pctFilingDate) : "",
      notes: patent?.notes || "",
    }
  }

  const [formData, setFormData] = useState(getInitialFormData(patent))

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  
  // 기존 문서 상태 관리
  const [existingDocuments, setExistingDocuments] = useState<ExistingDocument[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  
  // 문서 타입별 파일 상태 관리
  const [documentFiles, setDocumentFiles] = useState<{
    [key: string]: UploadedFile[]
  }>({
    SPECIFICATION: [],
    CLAIMS: [],
    ABSTRACT: [],
    DRAWINGS: [],
    ADS: [],
    OATH_DECLARATION: [],
    IDS: [],
    ASSIGNMENT: [],
    OTHER: []
  })

  // 출원번호 중복 확인 상태
  const [applicationNumberCheck, setApplicationNumberCheck] = useState<{
    checked: boolean
    isDuplicate: boolean
    message: string
    loading: boolean
  }>({
    checked: false,
    isDuplicate: false,
    message: "",
    loading: false
  })

  // 문서 타입별 드래그 상태 관리
  const [dragStates, setDragStates] = useState<{
    [key: string]: boolean
  }>({
    SPECIFICATION: false,
    CLAIMS: false,
    ABSTRACT: false,
    DRAWINGS: false,
    ADS: false,
    OATH_DECLARATION: false,
    IDS: false,
    ASSIGNMENT: false,
    OTHER: false
  })

  // 기존 문서 로드 함수
  const loadExistingDocuments = async (patentId: string) => {
    if (!patentId) return
    
    setLoadingDocuments(true)
    try {
      const documents = await patentsApi.getDocuments(patentId)
      setExistingDocuments(documents)
    } catch (error) {
      console.error('기존 문서 로드 실패:', error)
      toast.error('기존 문서를 불러오는데 실패했습니다.')
    } finally {
      setLoadingDocuments(false)
    }
  }

  // 기존 문서 삭제 함수
  const deleteExistingDocument = async (documentId: string) => {
    if (!patent?.id) return
    
    // 삭제 확인 알림창
    const isConfirmed = window.confirm('정말 삭제하시겠습니까? 파일이 삭제되면 복구할 수 없습니다.')
    if (!isConfirmed) return
    
    try {
      await patentsApi.deleteDocument(patent.id, documentId)
      setExistingDocuments(prev => prev.filter(doc => doc.id !== documentId))
      toast.success('문서가 삭제되었습니다.')
    } catch (error) {
      console.error('문서 삭제 실패:', error)
      toast.error('문서 삭제에 실패했습니다.')
    }
  }

  // 문서 타입별로 기존 문서 그룹화
  const getDocumentsByType = (type: string) => {
    return existingDocuments.filter(doc => doc.type === type)
  }

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    // 관리번호는 자동 생성되므로 검증에서 제외

    if (!formData.title.trim()) {
      newErrors.title = "특허명을 입력해주세요."
    }

    if (!formData.applicationNumber.trim()) {
      newErrors.applicationNumber = "출원번호를 입력해주세요."
    } else if (applicationNumberCheck.checked && applicationNumberCheck.isDuplicate) {
      newErrors.applicationNumber = "이미 등록된 출원번호입니다."
    }

    if (!formData.filingDate) {
      newErrors.filingDate = "출원일을 선택해주세요."
    }

    if (!formData.applicationType) {
      newErrors.applicationType = "출원유형을 선택해주세요."
    }

    // 발명자 검증 (최소 1명)
    const validInventors = formData.inventors.filter((inventor: string) => inventor.trim() !== "")
    if (validInventors.length === 0) {
      newErrors.inventors = "최소 1명의 발명자는 필수입니다."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // 빈 값 제거
    const cleanedData = {
      ...formData,
      inventors: formData.inventors.filter((inventor: string) => inventor.trim() !== ""),
      priorityPatents: formData.priorityPatents
        .map((patent: PriorityPatent) => ({
          ...patent,
          inventors: patent.inventors.filter((inventor: string) => inventor.trim() !== ""),
        }))
        .filter((patent: PriorityPatent) => patent.title.trim() !== "" || patent.applicationNumber.trim() !== ""),
      uploadedFiles,
    }

    try {
      setIsSubmitting(true)
      const result = await onSubmit(cleanedData)
      
      // 특허 생성/수정 후 파일 업로드
      if (uploadedFiles.length > 0) {
        const patentId = patent?.id || (result as any)?.id
        if (patentId) {
          await uploadFilesToS3(patentId)
        }
      }
      
      // 문서 타입별 파일 업로드
      const allDocumentFiles = Object.values(documentFiles).flat()
      if (allDocumentFiles.length > 0) {
        const patentId = patent?.id || (result as any)?.id
        if (patentId) {
          await uploadDocumentFilesToS3(patentId)
        }
      }
      
      toast.success(patent ? "특허 정보가 수정되었습니다." : "새 특허가 등록되었습니다.")
      onClose()
    } catch (error) {
      // 에러 발생 시 팝업을 닫지 않고 에러를 표시
      console.error('특허 등록 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '특허 등록 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // 모달 종료 처리 함수 (배경 클릭 방지)
  const handleOpenChange = (open: boolean) => {
    // 모달이 닫히려고 할 때 (open === false), onClose 호출
    if (!open) {
      onClose()
    }
  }

  const handleArrayChange = (field: string, index: number, value: string) => {
    if (field === "inventors") {
      setFormData((prev) => ({
        ...prev,
        inventors: prev.inventors.map((item: string, i: number) => (i === index ? value : item)),
      }))
    }
  }

  const addInventor = () => {
    setFormData((prev) => ({
      ...prev,
      inventors: [...prev.inventors, ""],
    }))
  }

  const removeInventor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      inventors: prev.inventors.filter((_: string, i: number) => i !== index),
    }))
  }

  // 우선권 특허 관련 함수들
  const addPriorityPatent = () => {
    setFormData((prev) => ({
      ...prev,
      priorityPatents: [
        ...prev.priorityPatents,
        {
          title: "",
          filingDate: "",
          applicationNumber: "",
          inventors: [""],
        },
      ],
    }))
  }

  const removePriorityPatent = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      priorityPatents: prev.priorityPatents.filter((_: PriorityPatent, i: number) => i !== index),
    }))
  }

  const handlePriorityPatentChange = (patentIndex: number, field: keyof PriorityPatent, value: any) => {
    setFormData((prev) => ({
      ...prev,
      priorityPatents: prev.priorityPatents.map((patent: PriorityPatent, i: number) =>
        i === patentIndex ? { ...patent, [field]: value } : patent,
      ),
    }))
  }

  const addPriorityInventor = (patentIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      priorityPatents: prev.priorityPatents.map((patent: PriorityPatent, i: number) =>
        i === patentIndex ? { ...patent, inventors: [...patent.inventors, ""] } : patent,
      ),
    }))
  }

  const removePriorityInventor = (patentIndex: number, inventorIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      priorityPatents: prev.priorityPatents.map((patent: PriorityPatent, i: number) =>
        i === patentIndex
          ? {
              ...patent,
              inventors: patent.inventors.filter((_: string, j: number) => j !== inventorIndex),
            }
          : patent,
      ),
    }))
  }

  const handlePriorityInventorChange = (patentIndex: number, inventorIndex: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      priorityPatents: prev.priorityPatents.map((patent: PriorityPatent, i: number) =>
        i === patentIndex
          ? {
              ...patent,
              inventors: patent.inventors.map((inventor: string, j: number) => (j === inventorIndex ? value : inventor)),
            }
          : patent,
      ),
    }))
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      fileObject: file,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
  }

  // 파일 업로드 처리 함수
  const uploadFilesToS3 = async (patentId: string) => {
    if (uploadedFiles.length === 0) return

    setUploadingFiles(true)
    try {
      for (const file of uploadedFiles) {
        await patentsApi.uploadDocument(patentId, file.fileObject, file.type)
      }
      toast.success('파일이 성공적으로 업로드되었습니다.')
    } catch (error) {
      console.error('파일 업로드 오류:', error)
      toast.error('파일 업로드 중 오류가 발생했습니다.')
      throw error
    } finally {
      setUploadingFiles(false)
    }
  }

  // 문서 타입별 파일 업로드 처리 함수
  const uploadDocumentFilesToS3 = async (patentId: string) => {
    const allFiles = Object.values(documentFiles).flat()
    if (allFiles.length === 0) return

    setUploadingFiles(true)
    try {
      for (const [documentType, files] of Object.entries(documentFiles)) {
        for (const file of files) {
          await patentsApi.uploadDocument(patentId, file.fileObject, documentType)
        }
      }
      toast.success('모든 파일이 성공적으로 업로드되었습니다.')
    } catch (error) {
      console.error('파일 업로드 오류:', error)
      toast.error('파일 업로드 중 오류가 발생했습니다.')
      throw error
    } finally {
      setUploadingFiles(false)
    }
  }

  // 문서 타입별 파일 추가 함수
  const addDocumentFiles = (documentType: string, files: FileList | null) => {
    if (!files) return

    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      fileObject: file,
    }))

    setDocumentFiles(prev => ({
      ...prev,
      [documentType]: [...prev[documentType], ...newFiles]
    }))
  }

  // 문서 타입별 파일 제거 함수
  const removeDocumentFile = (documentType: string, fileId: string) => {
    setDocumentFiles(prev => ({
      ...prev,
      [documentType]: prev[documentType].filter(file => file.id !== fileId)
    }))
  }

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
    handleFileUpload(e.dataTransfer.files)
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  // 파일 다운로드 함수
  const downloadFile = (file: UploadedFile) => {
    const link = document.createElement("a")
    link.href = URL.createObjectURL(file.fileObject)
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // ESC 키 처리를 위한 키보드 이벤트 핸들러
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose()
    }
  }

  // 출원번호 중복 확인 함수
  const checkApplicationNumberDuplicate = async (applicationNumber: string) => {
    if (!applicationNumber.trim()) {
      setApplicationNumberCheck({
        checked: false,
        isDuplicate: false,
        message: "",
        loading: false
      })
      return
    }

    setApplicationNumberCheck(prev => ({ ...prev, loading: true }))
    
    try {
      const response = await fetch(`/api/patents?search=${encodeURIComponent(applicationNumber)}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        const duplicate = result.data.find((patent: any) => 
          patent.applicationNumber === applicationNumber.trim()
        )
        
        setApplicationNumberCheck({
          checked: true,
          isDuplicate: !!duplicate,
          message: duplicate ? "이미 등록된 출원번호입니다." : "사용 가능한 출원번호입니다.",
          loading: false
        })
        
        // 중복인 경우 에러 추가
        if (duplicate) {
          setErrors(prev => ({ ...prev, applicationNumber: "이미 등록된 출원번호입니다." }))
        } else {
          setErrors(prev => ({ ...prev, applicationNumber: "" }))
        }
      }
    } catch (error) {
      console.error('출원번호 중복 확인 오류:', error)
      setApplicationNumberCheck({
        checked: true,
        isDuplicate: false,
        message: "중복 확인 중 오류가 발생했습니다.",
        loading: false
      })
    }
  }

  // 출원번호 변경 핸들러
  const handleApplicationNumberChange = (value: string) => {
    setFormData(prev => ({ ...prev, applicationNumber: value }))
    
    // 에러 제거
    if (errors.applicationNumber) {
      setErrors(prev => ({ ...prev, applicationNumber: "" }))
    }
    
    // 중복 확인 상태 초기화
    setApplicationNumberCheck({
      checked: false,
      isDuplicate: false,
      message: "",
      loading: false
    })
    
    // 디바운스로 중복 확인 (1초 후)
    const timeoutId = setTimeout(() => {
      checkApplicationNumberDuplicate(value)
    }, 1000)
    
    return () => clearTimeout(timeoutId)
  }

  // 문서 타입별 드래그 이벤트 핸들러
  const handleDocumentDragOver = (e: React.DragEvent, documentType: string) => {
    e.preventDefault()
    setDragStates(prev => ({ ...prev, [documentType]: true }))
  }

  const handleDocumentDragLeave = (e: React.DragEvent, documentType: string) => {
    e.preventDefault()
    setDragStates(prev => ({ ...prev, [documentType]: false }))
  }

  const handleDocumentDrop = (e: React.DragEvent, documentType: string) => {
    e.preventDefault()
    setDragStates(prev => ({ ...prev, [documentType]: false }))
    addDocumentFiles(documentType, e.dataTransfer.files)
  }

  useEffect(() => {
    const newFormData = getInitialFormData(patent)
    setFormData(newFormData)
    setErrors({})
    setApplicationNumberCheck({
      checked: false,
      isDuplicate: false,
      message: "",
      loading: false
    })
    
    // 파일 업로드 상태 초기화
    setUploadedFiles([])
    setDocumentFiles({
      SPECIFICATION: [],
      CLAIMS: [],
      ABSTRACT: [],
      DRAWINGS: [],
      ADS: [],
      OATH_DECLARATION: [],
      IDS: [],
      ASSIGNMENT: [],
      OTHER: []
    })
    setDragStates({
      SPECIFICATION: false,
      CLAIMS: false,
      ABSTRACT: false,
      DRAWINGS: false,
      ADS: false,
      OATH_DECLARATION: false,
      IDS: false,
      ASSIGNMENT: false,
      OTHER: false
    })
    
    // 특허 수정 시 기존 문서 로드
    if (patent?.id) {
      loadExistingDocuments(patent.id)
    } else {
      setExistingDocuments([])
    }
  }, [patent, isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden mx-auto my-4"
        onKeyDown={handleKeyDown}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle>{patent ? "특허 정보 수정" : "새 특허 등록"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <ScrollArea className="h-full w-full pr-4">
            <form onSubmit={handleSubmit} className="space-y-6 pb-4">
              {/* 기본 정보 (발명자 정보 포함) */}
              <Card>
                <CardHeader>
                  <CardTitle>기본 정보</CardTitle>
                  <CardDescription>특허의 기본 정보와 발명자 정보를 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {patent && (
                      <div className="space-y-2">
                        <Label htmlFor="managementNumber">관리번호</Label>
                        <Input
                          id="managementNumber"
                          value={formData.managementNumber}
                          disabled={true}
                          className="bg-gray-100 text-gray-600"
                          placeholder="PNU-2024-0001"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="applicationNumber">출원번호 *</Label>
                      <Input
                        id="applicationNumber"
                        value={formData.applicationNumber}
                        onChange={(e) => {
                          handleApplicationNumberChange(e.target.value)
                        }}
                        placeholder="10-2024-0001234"
                        className={errors.applicationNumber ? "border-red-500" : ""}
                        required
                      />
                      {/* {errors.applicationNumber && (
                        <p className="text-sm text-red-500">{errors.applicationNumber}</p>
                      )} */}
                      {applicationNumberCheck.loading && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span>중복 확인 중...</span>
                        </div>
                      )}
                      {applicationNumberCheck.checked && !applicationNumberCheck.loading && (
                        <div className={`flex items-center gap-2 text-sm ${
                          applicationNumberCheck.isDuplicate ? 'text-red-500' : 'text-green-500'
                        }`}>
                          {applicationNumberCheck.isDuplicate ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          <span>{applicationNumberCheck.message}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="applicationType">출원유형 *</Label>
                      <Select
                        value={formData.applicationType}
                        onValueChange={(value) => {
                          handleInputChange("applicationType", value)
                          // 출원유형에 따라 PCT 여부도 업데이트
                          handleInputChange("pctFiled", value === "provisional")
                          if (errors.applicationType) {
                            setErrors(prev => ({ ...prev, applicationType: "" }))
                          }
                        }}
                      >
                        <SelectTrigger className={errors.applicationType ? "border-red-500" : ""}>
                          <SelectValue placeholder="출원유형을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="provisional">가출원</SelectItem>
                          <SelectItem value="regular">진출원</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.applicationType && (
                        <p className="text-sm text-red-500">{errors.applicationType}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">출원명 (발명의 명칭) *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => {
                        handleInputChange("title", e.target.value)
                        if (errors.title) {
                          setErrors(prev => ({ ...prev, title: "" }))
                        }
                      }}
                      placeholder="특허 제목을 입력하세요 (한국어 기준)"
                      className={errors.title ? "border-red-500" : ""}
                      required
                    />
                    {errors.title && (
                      <p className="text-sm text-red-500">{errors.title}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="filingDate">출원일 *</Label>
                      <Input
                        id="filingDate"
                        type="date"
                        value={formData.filingDate}
                        onChange={(e) => {
                          handleInputChange("filingDate", e.target.value)
                          if (errors.filingDate) {
                            setErrors(prev => ({ ...prev, filingDate: "" }))
                          }
                        }}
                        className={errors.filingDate ? "border-red-500" : ""}
                        required
                      />
                      {errors.filingDate && (
                        <p className="text-sm text-red-500">{errors.filingDate}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registrationNumber">등록번호</Label>
                      <Input
                        id="registrationNumber"
                        value={formData.registrationNumber}
                        onChange={(e) => handleInputChange("registrationNumber", e.target.value)}
                        placeholder="등록된 경우만 입력"
                      />
                    </div>
                  </div>

                  {/* 발명자 정보 (기본정보에 포함) */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-semibold">발명자 정보</Label>
                    {formData.inventors.map((inventor: string, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1">
                            <Label htmlFor={`inventor-${index}`}>
                              발명자 {index + 1} {index === 0 && "*"}
                            </Label>
                            <Input
                              id={`inventor-${index}`}
                              value={inventor}
                              onChange={(e) => {
                                handleArrayChange("inventors", index, e.target.value)
                                if (errors.inventors) {
                                  setErrors(prev => ({ ...prev, inventors: "" }))
                                }
                              }}
                              placeholder="발명자 이름을 입력하세요"
                              required={index === 0}
                            />
                          </div>
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeInventor(index)}
                              className="mt-6"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {errors.inventors && (
                      <p className="text-sm text-red-500">{errors.inventors}</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addInventor}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>발명자 추가</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 우선권 특허정보 */}
              <Card>
                <CardHeader>
                  <CardTitle>우선권 특허정보</CardTitle>
                  <CardDescription>원출원 특허에 대한 우선권 특허가 있는 경우 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.priorityPatents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="mb-4">등록된 우선권 특허가 없습니다.</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addPriorityPatent}
                        className="flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>우선권 특허 추가</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {formData.priorityPatents.map((priorityPatent: PriorityPatent, patentIndex: number) => (
                        <div key={patentIndex} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">우선권 특허 {patentIndex + 1}</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePriorityPatent(patentIndex)}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor={`priority-title-${patentIndex}`}>출원명 (발명의 명칭)</Label>
                              <Input
                                id={`priority-title-${patentIndex}`}
                                value={priorityPatent.title}
                                onChange={(e) => handlePriorityPatentChange(patentIndex, "title", e.target.value)}
                                placeholder="우선권 특허의 제목을 입력하세요"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`priority-filing-date-${patentIndex}`}>출원일</Label>
                                <Input
                                  id={`priority-filing-date-${patentIndex}`}
                                  type="date"
                                  value={priorityPatent.filingDate}
                                  onChange={(e) =>
                                    handlePriorityPatentChange(patentIndex, "filingDate", e.target.value)
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`priority-application-number-${patentIndex}`}>출원번호</Label>
                                <Input
                                  id={`priority-application-number-${patentIndex}`}
                                  value={priorityPatent.applicationNumber}
                                  onChange={(e) =>
                                    handlePriorityPatentChange(patentIndex, "applicationNumber", e.target.value)
                                  }
                                  placeholder="우선권 특허의 출원번호를 입력하세요"
                                />
                              </div>
                            </div>

                            {/* 우선권 특허 발명자 정보 */}
                            <div className="space-y-3 pt-2 border-t">
                              <Label className="text-sm font-semibold">발명자 정보</Label>

                              {priorityPatent.inventors.map((inventor: string, inventorIndex: number) => (
                                <div key={inventorIndex} className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <div className="flex-1">
                                      <Input
                                        value={inventor}
                                        onChange={(e) =>
                                          handlePriorityInventorChange(patentIndex, inventorIndex, e.target.value)
                                        }
                                        placeholder={`발명자 ${inventorIndex + 1}`}
                                      />
                                    </div>
                                    {inventorIndex > 0 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removePriorityInventor(patentIndex, inventorIndex)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => addPriorityInventor(patentIndex)}
                                className="flex items-center space-x-2"
                              >
                                <Plus className="h-4 w-4" />
                                <span>발명자 추가</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={addPriorityPatent}
                        className="flex items-center space-x-2 w-full"
                      >
                        <Plus className="h-4 w-4" />
                        <span>우선권 특허 추가</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* PCT 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle>PCT 정보</CardTitle>
                  <CardDescription>PCT 출원 관련 정보를 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>PCT 출원 여부 *</Label>
                    <Select
                      value={formData.pctFiled ? "true" : "false"}
                      onValueChange={(value) => {
                        const pctFiled = value === "true"
                        handleInputChange("pctFiled", pctFiled)
                        // PCT 여부에 따라 출원유형도 업데이트
                        handleInputChange("applicationType", pctFiled ? "provisional" : "regular")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">아니오</SelectItem>
                        <SelectItem value="true">예</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.pctFiled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pctApplicationNumber">PCT 출원번호</Label>
                        <Input
                          id="pctApplicationNumber"
                          value={formData.pctApplicationNumber}
                          onChange={(e) => handleInputChange("pctApplicationNumber", e.target.value)}
                          placeholder="PCT/KR2024/000001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pctFilingDate">PCT 출원일</Label>
                        <Input
                          id="pctFilingDate"
                          type="date"
                          value={formData.pctFilingDate}
                          onChange={(e) => handleInputChange("pctFilingDate", e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 파일 업로드 */}
              <Card>
                <CardHeader>
                  <CardTitle>출원 서류 업로드</CardTitle>
                  <CardDescription>각 문서 타입별로 출원 서류를 업로드하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 명세서 */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">명세서</Label>
                    
                    {/* 기존 문서 표시 */}
                    {getDocumentsByType('SPECIFICATION').length > 0 && (
                      <div className="space-y-2 mb-4">
                        {getDocumentsByType('SPECIFICATION').map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{doc.fileName}</span>
                              <span className="text-xs text-gray-500">({formatFileSize(doc.fileSize)})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    // 데이터베이스에서 가져온 실제 filePath 사용
                                    const s3Url = getS3Url(doc.filePath)
                                    
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
                                    link.download = doc.fileName
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)
                                    
                                    // 메모리 정리
                                    window.URL.revokeObjectURL(downloadUrl)
                                  } catch (error) {
                                    console.error('다운로드 실패:', error)
                                    toast.error('다운로드에 실패했습니다.')
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteExistingDocument(doc.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div 
                      className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                        dragStates.SPECIFICATION 
                          ? "border-blue-400 bg-blue-50" 
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      onDragOver={(e) => handleDocumentDragOver(e, 'SPECIFICATION')}
                      onDragLeave={(e) => handleDocumentDragLeave(e, 'SPECIFICATION')}
                      onDrop={(e) => handleDocumentDrop(e, 'SPECIFICATION')}
                    >
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.tif,.tiff"
                        onChange={(e) => addDocumentFiles('SPECIFICATION', e.target.files)}
                        className="hidden"
                        id="specification-upload"
                      />
                      <label htmlFor="specification-upload" className="cursor-pointer">
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">명세서 파일 업로드</p>
                          <p className="text-xs text-gray-500 mt-1">지원 형식: PDF, DOC, DOCX, TIF, TIFF</p>
                          <p className="text-xs text-blue-500 mt-1">파일을 드래그하여 업로드할 수도 있습니다</p>
                        </div>
                      </label>
                    </div>
                    {documentFiles.SPECIFICATION.length > 0 && (
                      <div className="space-y-2">
                        {documentFiles.SPECIFICATION.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocumentFile('SPECIFICATION', file.id)}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 청구범위 */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">청구범위</Label>
                    
                    {/* 기존 문서 표시 */}
                    {getDocumentsByType('CLAIMS').length > 0 && (
                      <div className="space-y-2 mb-4">
                        {getDocumentsByType('CLAIMS').map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{doc.fileName}</span>
                              <span className="text-xs text-gray-500">({formatFileSize(doc.fileSize)})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    // 데이터베이스에서 가져온 실제 filePath 사용
                                    const s3Url = getS3Url(doc.filePath)
                                    
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
                                    link.download = doc.fileName
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)
                                    
                                    // 메모리 정리
                                    window.URL.revokeObjectURL(downloadUrl)
                                  } catch (error) {
                                    console.error('다운로드 실패:', error)
                                    toast.error('다운로드에 실패했습니다.')
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteExistingDocument(doc.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div 
                      className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                        dragStates.CLAIMS 
                          ? "border-blue-400 bg-blue-50" 
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      onDragOver={(e) => handleDocumentDragOver(e, 'CLAIMS')}
                      onDragLeave={(e) => handleDocumentDragLeave(e, 'CLAIMS')}
                      onDrop={(e) => handleDocumentDrop(e, 'CLAIMS')}
                    >
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.tif,.tiff"
                        onChange={(e) => addDocumentFiles('CLAIMS', e.target.files)}
                        className="hidden"
                        id="claims-upload"
                      />
                      <label htmlFor="claims-upload" className="cursor-pointer">
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">청구범위 파일 업로드</p>
                          <p className="text-xs text-gray-500 mt-1">지원 형식: PDF, DOC, DOCX, TIF, TIFF</p>
                          <p className="text-xs text-blue-500 mt-1">파일을 드래그하여 업로드할 수도 있습니다</p>
                        </div>
                      </label>
                    </div>
                    {documentFiles.CLAIMS.length > 0 && (
                      <div className="space-y-2">
                        {documentFiles.CLAIMS.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocumentFile('CLAIMS', file.id)}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 도면 */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">도면</Label>
                    
                    {/* 기존 문서 표시 */}
                    {getDocumentsByType('DRAWINGS').length > 0 && (
                      <div className="space-y-2 mb-4">
                        {getDocumentsByType('DRAWINGS').map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{doc.fileName}</span>
                              <span className="text-xs text-gray-500">({formatFileSize(doc.fileSize)})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    // 데이터베이스에서 가져온 실제 filePath 사용
                                    const s3Url = getS3Url(doc.filePath)
                                    
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
                                    link.download = doc.fileName
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)
                                    
                                    // 메모리 정리
                                    window.URL.revokeObjectURL(downloadUrl)
                                  } catch (error) {
                                    console.error('다운로드 실패:', error)
                                    toast.error('다운로드에 실패했습니다.')
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteExistingDocument(doc.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div 
                      className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                        dragStates.DRAWINGS 
                          ? "border-blue-400 bg-blue-50" 
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      onDragOver={(e) => handleDocumentDragOver(e, 'DRAWINGS')}
                      onDragLeave={(e) => handleDocumentDragLeave(e, 'DRAWINGS')}
                      onDrop={(e) => handleDocumentDrop(e, 'DRAWINGS')}
                    >
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.tif,.tiff"
                        onChange={(e) => addDocumentFiles('DRAWINGS', e.target.files)}
                        className="hidden"
                        id="drawings-upload"
                      />
                      <label htmlFor="drawings-upload" className="cursor-pointer">
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">도면 파일 업로드</p>
                          <p className="text-xs text-gray-500 mt-1">지원 형식: PDF, DOC, DOCX, TIF, TIFF</p>
                          <p className="text-xs text-blue-500 mt-1">파일을 드래그하여 업로드할 수도 있습니다</p>
                        </div>
                      </label>
                    </div>
                    {documentFiles.DRAWINGS.length > 0 && (
                      <div className="space-y-2">
                        {documentFiles.DRAWINGS.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocumentFile('DRAWINGS', file.id)}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 요약서 */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">요약서</Label>
                    
                    {/* 기존 문서 표시 */}
                    {getDocumentsByType('ABSTRACT').length > 0 && (
                      <div className="space-y-2 mb-4">
                        {getDocumentsByType('ABSTRACT').map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{doc.fileName}</span>
                              <span className="text-xs text-gray-500">({formatFileSize(doc.fileSize)})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    // 데이터베이스에서 가져온 실제 filePath 사용
                                    const s3Url = getS3Url(doc.filePath)
                                    
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
                                    link.download = doc.fileName
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)
                                    
                                    // 메모리 정리
                                    window.URL.revokeObjectURL(downloadUrl)
                                  } catch (error) {
                                    console.error('다운로드 실패:', error)
                                    toast.error('다운로드에 실패했습니다.')
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteExistingDocument(doc.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div 
                      className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                        dragStates.ABSTRACT 
                          ? "border-blue-400 bg-blue-50" 
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      onDragOver={(e) => handleDocumentDragOver(e, 'ABSTRACT')}
                      onDragLeave={(e) => handleDocumentDragLeave(e, 'ABSTRACT')}
                      onDrop={(e) => handleDocumentDrop(e, 'ABSTRACT')}
                    >
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.tif,.tiff"
                        onChange={(e) => addDocumentFiles('ABSTRACT', e.target.files)}
                        className="hidden"
                        id="abstract-upload"
                      />
                      <label htmlFor="abstract-upload" className="cursor-pointer">
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">요약서 파일 업로드</p>
                          <p className="text-xs text-gray-500 mt-1">지원 형식: PDF, DOC, DOCX, TIF, TIFF</p>
                          <p className="text-xs text-blue-500 mt-1">파일을 드래그하여 업로드할 수도 있습니다</p>
                        </div>
                      </label>
                    </div>
                    {documentFiles.ABSTRACT.length > 0 && (
                      <div className="space-y-2">
                        {documentFiles.ABSTRACT.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocumentFile('ABSTRACT', file.id)}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 기타 문서 */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">기타 문서</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 출원서 */}
                      <div className="space-y-2">
                        <Label className="text-sm">출원서</Label>
                        
                        {/* 기존 문서 표시 */}
                        {getDocumentsByType('ADS').length > 0 && (
                          <div className="space-y-1 mb-2">
                            {getDocumentsByType('ADS').map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-1 bg-green-50 border border-green-200 rounded text-xs">
                                <div className="flex items-center space-x-1">
                                  <FileText className="h-3 w-3 text-green-600" />
                                  <span className="truncate">{doc.fileName}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        // 데이터베이스에서 가져온 실제 filePath 사용
                                        const s3Url = getS3Url(doc.filePath)
                                        
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
                                        link.download = doc.fileName
                                        document.body.appendChild(link)
                                        link.click()
                                        document.body.removeChild(link)
                                        
                                        // 메모리 정리
                                        window.URL.revokeObjectURL(downloadUrl)
                                      } catch (error) {
                                        console.error('다운로드 실패:', error)
                                        toast.error('다운로드에 실패했습니다.')
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-800 h-6 w-6 p-0"
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteExistingDocument(doc.id)}
                                    className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div 
                          className={`border-2 border-dashed rounded-lg p-3 transition-colors ${
                            dragStates.ADS 
                              ? "border-blue-400 bg-blue-50" 
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                          onDragOver={(e) => handleDocumentDragOver(e, 'ADS')}
                          onDragLeave={(e) => handleDocumentDragLeave(e, 'ADS')}
                          onDrop={(e) => handleDocumentDrop(e, 'ADS')}
                        >
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.tif,.tiff"
                            onChange={(e) => addDocumentFiles('ADS', e.target.files)}
                            className="hidden"
                            id="ads-upload"
                          />
                          <label htmlFor="ads-upload" className="cursor-pointer">
                            <div className="text-center">
                              <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                              <p className="text-xs text-gray-600">출원서</p>
                              <p className="text-xs text-gray-500">PDF, DOC, DOCX, TIF, TIFF</p>
                              <p className="text-xs text-blue-500">드래그 가능</p>
                            </div>
                          </label>
                        </div>
                        {documentFiles.ADS.length > 0 && (
                          <div className="space-y-1">
                            {documentFiles.ADS.map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-1 bg-blue-50 border border-blue-200 rounded text-xs">
                                <span className="truncate">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeDocumentFile('ADS', file.id)}
                                >
                                  <X className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 선언서 */}
                      <div className="space-y-2">
                        <Label className="text-sm">선언서</Label>
                        
                        {/* 기존 문서 표시 */}
                        {getDocumentsByType('OATH_DECLARATION').length > 0 && (
                          <div className="space-y-1 mb-2">
                            {getDocumentsByType('OATH_DECLARATION').map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-1 bg-green-50 border border-green-200 rounded text-xs">
                                <div className="flex items-center space-x-1">
                                  <FileText className="h-3 w-3 text-green-600" />
                                  <span className="truncate">{doc.fileName}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        // 데이터베이스에서 가져온 실제 filePath 사용
                                        const s3Url = getS3Url(doc.filePath)
                                        
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
                                        link.download = doc.fileName
                                        document.body.appendChild(link)
                                        link.click()
                                        document.body.removeChild(link)
                                        
                                        // 메모리 정리
                                        window.URL.revokeObjectURL(downloadUrl)
                                      } catch (error) {
                                        console.error('다운로드 실패:', error)
                                        toast.error('다운로드에 실패했습니다.')
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-800 h-6 w-6 p-0"
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteExistingDocument(doc.id)}
                                    className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div 
                          className={`border-2 border-dashed rounded-lg p-3 transition-colors ${
                            dragStates.OATH_DECLARATION 
                              ? "border-blue-400 bg-blue-50" 
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                          onDragOver={(e) => handleDocumentDragOver(e, 'OATH_DECLARATION')}
                          onDragLeave={(e) => handleDocumentDragLeave(e, 'OATH_DECLARATION')}
                          onDrop={(e) => handleDocumentDrop(e, 'OATH_DECLARATION')}
                        >
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.tif,.tiff"
                            onChange={(e) => addDocumentFiles('OATH_DECLARATION', e.target.files)}
                            className="hidden"
                            id="oath-upload"
                          />
                          <label htmlFor="oath-upload" className="cursor-pointer">
                            <div className="text-center">
                              <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                              <p className="text-xs text-gray-600">선언서</p>
                              <p className="text-xs text-gray-500">PDF, DOC, DOCX, TIF, TIFF</p>
                              <p className="text-xs text-blue-500">드래그 가능</p>
                            </div>
                          </label>
                        </div>
                        {documentFiles.OATH_DECLARATION.length > 0 && (
                          <div className="space-y-1">
                            {documentFiles.OATH_DECLARATION.map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-1 bg-blue-50 border border-blue-200 rounded text-xs">
                                <span className="truncate">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeDocumentFile('OATH_DECLARATION', file.id)}
                                >
                                  <X className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 정보공개문서 */}
                      <div className="space-y-2">
                        <Label className="text-sm">정보공개문서</Label>
                        
                        {/* 기존 문서 표시 */}
                        {getDocumentsByType('IDS').length > 0 && (
                          <div className="space-y-1 mb-2">
                            {getDocumentsByType('IDS').map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-1 bg-green-50 border border-green-200 rounded text-xs">
                                <div className="flex items-center space-x-1">
                                  <FileText className="h-3 w-3 text-green-600" />
                                  <span className="truncate">{doc.fileName}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        // 데이터베이스에서 가져온 실제 filePath 사용
                                        const s3Url = getS3Url(doc.filePath)
                                        
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
                                        link.download = doc.fileName
                                        document.body.appendChild(link)
                                        link.click()
                                        document.body.removeChild(link)
                                        
                                        // 메모리 정리
                                        window.URL.revokeObjectURL(downloadUrl)
                                      } catch (error) {
                                        console.error('다운로드 실패:', error)
                                        toast.error('다운로드에 실패했습니다.')
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-800 h-6 w-6 p-0"
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteExistingDocument(doc.id)}
                                    className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div 
                          className={`border-2 border-dashed rounded-lg p-3 transition-colors ${
                            dragStates.IDS 
                              ? "border-blue-400 bg-blue-50" 
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                          onDragOver={(e) => handleDocumentDragOver(e, 'IDS')}
                          onDragLeave={(e) => handleDocumentDragLeave(e, 'IDS')}
                          onDrop={(e) => handleDocumentDrop(e, 'IDS')}
                        >
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.tif,.tiff"
                            onChange={(e) => addDocumentFiles('IDS', e.target.files)}
                            className="hidden"
                            id="ids-upload"
                          />
                          <label htmlFor="ids-upload" className="cursor-pointer">
                            <div className="text-center">
                              <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                              <p className="text-xs text-gray-600">정보공개문서</p>
                              <p className="text-xs text-gray-500">PDF, DOC, DOCX, TIF, TIFF</p>
                              <p className="text-xs text-blue-500">드래그 가능</p>
                            </div>
                          </label>
                        </div>
                        {documentFiles.IDS.length > 0 && (
                          <div className="space-y-1">
                            {documentFiles.IDS.map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-1 bg-blue-50 border border-blue-200 rounded text-xs">
                                <span className="truncate">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeDocumentFile('IDS', file.id)}
                                >
                                  <X className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 기타 */}
                      <div className="space-y-2">
                        <Label className="text-sm">기타</Label>
                        
                        {/* 기존 문서 표시 */}
                        {getDocumentsByType('OTHER').length > 0 && (
                          <div className="space-y-1 mb-2">
                            {getDocumentsByType('OTHER').map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-1 bg-green-50 border border-green-200 rounded text-xs">
                                <div className="flex items-center space-x-1">
                                  <FileText className="h-3 w-3 text-green-600" />
                                  <span className="truncate">{doc.fileName}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        // 데이터베이스에서 가져온 실제 filePath 사용
                                        const s3Url = getS3Url(doc.filePath)
                                        
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
                                        link.download = doc.fileName
                                        document.body.appendChild(link)
                                        link.click()
                                        document.body.removeChild(link)
                                        
                                        // 메모리 정리
                                        window.URL.revokeObjectURL(downloadUrl)
                                      } catch (error) {
                                        console.error('다운로드 실패:', error)
                                        toast.error('다운로드에 실패했습니다.')
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-800 h-6 w-6 p-0"
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteExistingDocument(doc.id)}
                                    className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div 
                          className={`border-2 border-dashed rounded-lg p-3 transition-colors ${
                            dragStates.OTHER 
                              ? "border-blue-400 bg-blue-50" 
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                          onDragOver={(e) => handleDocumentDragOver(e, 'OTHER')}
                          onDragLeave={(e) => handleDocumentDragLeave(e, 'OTHER')}
                          onDrop={(e) => handleDocumentDrop(e, 'OTHER')}
                        >
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.tif,.tiff"
                            onChange={(e) => addDocumentFiles('OTHER', e.target.files)}
                            className="hidden"
                            id="other-upload"
                          />
                          <label htmlFor="other-upload" className="cursor-pointer">
                            <div className="text-center">
                              <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                              <p className="text-xs text-gray-600">기타</p>
                              <p className="text-xs text-gray-500">PDF, DOC, DOCX, TIF, TIFF</p>
                              <p className="text-xs text-blue-500">드래그 가능</p>
                            </div>
                          </label>
                        </div>
                        {documentFiles.OTHER.length > 0 && (
                          <div className="space-y-1">
                            {documentFiles.OTHER.map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-1 bg-blue-50 border border-blue-200 rounded text-xs">
                                <span className="truncate">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeDocumentFile('OTHER', file.id)}
                                >
                                  <X className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 추가 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle>추가 정보</CardTitle>
                  <CardDescription>기타 특이사항이나 메모를 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="notes">메모</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      placeholder="추가 메모나 특이사항을 입력하세요"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </form>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            variant="outline"
            disabled={isSubmitting}
            className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "처리 중..." : (patent ? "수정" : "등록")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
