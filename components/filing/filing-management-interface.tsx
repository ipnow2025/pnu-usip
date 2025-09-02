"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import {
  ArrowLeft,
  FileText,
  Upload,
  Download,
  Eye,
  Send,
  AlertCircle,
  Users,
  Plus,
  X,
  Edit,
  Trash2,
  Save,
  Link,
} from "lucide-react"
import { getPatentById } from "@/lib/mock-data"
import { getCurrentUser } from "@/lib/permissions"
import type {
  Patent,
  PatentStatus,
  Filing,
  FilingDocument,
  FilingDocumentCategory,
  OAHistory,
  OAComment,
  FilingChange,
  MiscDocument,
} from "@/lib/types"

// 단계별 한글명
const STAGE_LABELS: Record<string, string> = {
  ALL: "출원관리(전체)",
  ATTORNEY_REVIEW: "변호사 검토",
  USPTO_FILING: "USPTO 출원",
  OA_RESPONSE: "OA 대응",
  USPTO_REGISTERED: "USPTO 등록",
}

// 서류 카테고리별 한글명
const DOCUMENT_CATEGORY_NAMES: Record<FilingDocumentCategory, string> = {
  USPTO_FILING_DOCS: "USPTO 출원서류",
  OA_RECEIVED_DOCS: "OA 접수서류",
  OA_RESPONSE_DOCS: "OA 대응서류",
  USPTO_REGISTRATION_DOCS: "USPTO 등록서류",
  POST_FILING_DOCS: "출원 후 기타서류",
  CHANGE_DOCS: "변경사항 관련서류",
}

interface FilingManagementInterfaceProps {
  selectedPatentIds: string[]
  selectedStage: string
  onClose: () => void
  onStatusUpdate?: (patentId: string, newStatus: PatentStatus) => void
}

export function FilingManagementInterface({
  selectedPatentIds,
  selectedStage,
  onClose,
  onStatusUpdate,
}: FilingManagementInterfaceProps) {
  const [selectedPatentId, setSelectedPatentId] = useState<string>(selectedPatentIds[0] || "")
  const [patents, setPatents] = useState<Patent[]>([])
  const [filingData, setFilingData] = useState<Record<string, Filing>>({})
  const [oaHistories, setOaHistories] = useState<Record<string, OAHistory[]>>({})
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({})
  const [previewFile, setPreviewFile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<string>("info")

  // 편집 상태 관리
  const [editingMiscDoc, setEditingMiscDoc] = useState<string | null>(null)
  const [editingChange, setEditingChange] = useState<string | null>(null)

  // 상태 동기화를 위한 ref
  const prevStatusRef = useRef<Record<string, PatentStatus>>({})

  const currentUser = getCurrentUser()

  useEffect(() => {
    // 선택된 특허들의 데이터 로드
    const patentData = selectedPatentIds.map((id) => getPatentById(id)).filter(Boolean) as Patent[]
    setPatents(patentData)

    // 각 특허별 출원 데이터 초기화
    const initialFilingData: Record<string, Filing> = {}
    const initialOAHistories: Record<string, OAHistory[]> = {}

    patentData.forEach((patent) => {
      initialFilingData[patent.id] = {
        id: `filing_${patent.id}`,
        patentId: patent.id,
        type: "USPTO_FILING",
        status: "IN_PROGRESS",
        usApplicationNumber: patent.usApplicationNumber || "",
        usFilingDate: "",
        usRegistrationNumber: patent.usRegistrationNumber || "",
        usRegistrationDate: "",
        changes: [], // 변경사항 초기화
        miscDocuments: [], // 기타서류 초기화
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        documents: [],
        documentsReady: false,
        documentPreparationId: "",
        documentCompletedAt: "",
      }

      // Mock OA 히스토리 데이터
      initialOAHistories[patent.id] = [
        {
          id: `oa_${patent.id}_1`,
          patentId: patent.id,
          oaSequence: 1,
          oaNumber: "OA-2024-001",
          oaReceivedDate: "2024-01-15",
          oaDeadline: "2024-04-15",
          oaType: "Non-Final Rejection", // 직접입력으로 변경
          status: "RECEIVED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          documents: [],
          comments: [],
        },
      ]
    })

    setFilingData(initialFilingData)
    setOaHistories(initialOAHistories)
  }, [selectedPatentIds])

  // 상태 업데이트 동기화
  useEffect(() => {
    if (!onStatusUpdate) return

    patents.forEach((patent) => {
      const currentStatus = patent.status
      const prevStatus = prevStatusRef.current[patent.id]

      if (prevStatus && prevStatus !== currentStatus) {
        onStatusUpdate(patent.id, currentStatus)
      }
      prevStatusRef.current[patent.id] = currentStatus
    })
  }, [patents, onStatusUpdate])

  const selectedPatent = patents.find((p) => p.id === selectedPatentId)
  const selectedFilingData = filingData[selectedPatentId] || {}
  const selectedOAHistories = oaHistories[selectedPatentId] || []

  // 파일 업로드 핸들러 (수정됨)
  const handleFileUpload = async (
    category: FilingDocumentCategory,
    files: FileList,
    targetId?: string, // changeId 또는 miscDocId
  ) => {
    try {
      // 파일 검증
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name}: 파일 크기가 10MB를 초과합니다.`)
          return
        }
      }

      // 실제 파일 객체 저장
      const newFiles: FilingDocument[] = Array.from(files).map((file, index) => {
        const fileId = `file_${Date.now()}_${index}`

        // 실제 파일 객체 저장
        setUploadedFiles((prev) => ({
          ...prev,
          [fileId]: file,
        }))

        return {
          id: fileId,
          filingId: category === "CHANGE_DOCS" ? undefined : selectedPatentId,
          changeId: category === "CHANGE_DOCS" ? targetId : undefined,
          miscDocId: category === "POST_FILING_DOCS" ? targetId : undefined,
          category,
          fileName: file.name,
          originalFileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          filePath: `/filing/${selectedPatentId}/${file.name}`,
          uploadedBy: currentUser.memberName,
          uploadedAt: new Date().toISOString(),
          version: 1,
        }
      })

      // 출원 데이터 업데이트
      setFilingData((prev) => {
        const updated = { ...prev }
        if (!updated[selectedPatentId]) return prev

        if (category === "CHANGE_DOCS" && targetId) {
          // 변경사항 관련 서류
          updated[selectedPatentId] = {
            ...updated[selectedPatentId],
            changes: updated[selectedPatentId].changes?.map((change) =>
              change.id === targetId ? { ...change, documents: [...change.documents, ...newFiles] } : change,
            ),
          }
        } else if (category === "POST_FILING_DOCS" && targetId) {
          // 기타서류
          updated[selectedPatentId] = {
            ...updated[selectedPatentId],
            miscDocuments: updated[selectedPatentId].miscDocuments?.map((doc) =>
              doc.id === targetId ? { ...doc, files: [...doc.files, ...newFiles] } : doc,
            ),
          }
        } else {
          // 일반 출원 서류
          updated[selectedPatentId] = {
            ...updated[selectedPatentId],
            documents: [...updated[selectedPatentId].documents, ...newFiles],
          }
        }

        return updated
      })

      alert(`${files.length}개 파일이 성공적으로 업로드되었습니다!`)
    } catch (error) {
      console.error("파일 업로드 오류:", error)
      alert("파일 업로드 중 오류가 발생했습니다.")
    }
  }

  // OA 파일 업로드 핸들러 (수정됨)
  const handleOAFileUpload = async (category: FilingDocumentCategory, files: FileList, oaId: string) => {
    try {
      // 파일 검증
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name}: 파일 크기가 10MB를 초과합니다.`)
          return
        }
      }

      // 실제 파일 객체 저장
      const newFiles: FilingDocument[] = Array.from(files).map((file, index) => {
        const fileId = `file_${Date.now()}_${index}`

        // 실제 파일 객체 저장
        setUploadedFiles((prev) => ({
          ...prev,
          [fileId]: file,
        }))

        return {
          id: fileId,
          category,
          fileName: file.name,
          originalFileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          filePath: `/filing/${selectedPatentId}/oa/${file.name}`,
          uploadedBy: currentUser.memberName,
          uploadedAt: new Date().toISOString(),
          version: 1,
        }
      })

      // OA 히스토리 업데이트
      setOaHistories((prev) => ({
        ...prev,
        [selectedPatentId]: prev[selectedPatentId].map((oa) =>
          oa.id === oaId ? { ...oa, documents: [...oa.documents, ...newFiles] } : oa,
        ),
      }))

      alert(`${files.length}개 파일이 성공적으로 업로드되었습니다!`)
    } catch (error) {
      console.error("파일 업로드 오류:", error)
      alert("파일 업로드 중 오류가 발생했습니다.")
    }
  }

  // 파일 미리보기
  const handlePreview = async (file: FilingDocument) => {
    const actualFile = uploadedFiles[file.id]

    if (actualFile) {
      try {
        if (actualFile.type.startsWith("image/")) {
          const imageUrl = URL.createObjectURL(actualFile)
          setPreviewFile({
            id: file.id,
            name: file.originalFileName,
            size: file.fileSize,
            type: file.fileType,
            uploadedAt: new Date(file.uploadedAt),
            uploadedBy: file.uploadedBy,
            previewUrl: imageUrl,
            isRealFile: true,
          })
        } else if (actualFile.type === "application/pdf") {
          // PDF는 새 창에서 열기
          const pdfUrl = URL.createObjectURL(actualFile)
          const newWindow = window.open(pdfUrl, "_blank")
          if (!newWindow) {
            alert("팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.")
          }
          // PDF는 모달로 표시하지 않고 바로 새 창에서 열기
          return
        } else {
          setPreviewFile({
            id: file.id,
            name: file.originalFileName,
            size: file.fileSize,
            type: file.fileType,
            uploadedAt: new Date(file.uploadedAt),
            uploadedBy: file.uploadedBy,
            isRealFile: true,
            actualFile: actualFile,
          })
        }
      } catch (error) {
        console.error("파일 미리보기 오류:", error)
        alert("파일 미리보기 중 오류가 발생했습니다.")
      }
    } else {
      alert("파일을 찾을 수 없습니다.")
    }
  }

  // 파일 다운로드
  const handleDownload = (file: any) => {
    if (file.actualFile) {
      const url = URL.createObjectURL(file.actualFile)
      const link = document.createElement("a")
      link.href = url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  // 출원 정보 저장
  const handleSaveFilingInfo = () => {
    const data = selectedFilingData

    // 기본 정보 저장 (검증 없이)
    setPatents((prev) =>
      prev.map((patent) =>
        patent.id === selectedPatentId
          ? {
              ...patent,
              usApplicationNumber: data.usApplicationNumber,
              usRegistrationNumber: data.usRegistrationNumber,
              updatedAt: new Date().toISOString(),
            }
          : patent,
      ),
    )

    alert("정보가 저장되었습니다.")
  }

  // 변경사항 추가
  const handleAddChange = () => {
    const newChange: FilingChange = {
      id: `change_${Date.now()}`,
      title: "",
      content: "",
      date: new Date().toISOString().split("T")[0],
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setFilingData((prev) => ({
      ...prev,
      [selectedPatentId]: {
        ...prev[selectedPatentId],
        changes: [...(prev[selectedPatentId]?.changes || []), newChange],
      },
    }))

    setEditingChange(newChange.id)
  }

  // 변경사항 삭제
  const handleDeleteChange = (changeId: string) => {
    if (confirm("이 변경사항을 삭제하시겠습니까?")) {
      setFilingData((prev) => ({
        ...prev,
        [selectedPatentId]: {
          ...prev[selectedPatentId],
          changes: prev[selectedPatentId]?.changes?.filter((change) => change.id !== changeId) || [],
        },
      }))
    }
  }

  // 기타서류 추가
  const handleAddMiscDoc = () => {
    const newMiscDoc: MiscDocument = {
      id: `misc_${Date.now()}`,
      title: "",
      description: "",
      files: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setFilingData((prev) => ({
      ...prev,
      [selectedPatentId]: {
        ...prev[selectedPatentId],
        miscDocuments: [...(prev[selectedPatentId]?.miscDocuments || []), newMiscDoc],
      },
    }))

    setEditingMiscDoc(newMiscDoc.id)
  }

  // 기타서류 삭제
  const handleDeleteMiscDoc = (miscDocId: string) => {
    if (confirm("이 기타서류를 삭제하시겠습니까?")) {
      setFilingData((prev) => ({
        ...prev,
        [selectedPatentId]: {
          ...prev[selectedPatentId],
          miscDocuments: prev[selectedPatentId]?.miscDocuments?.filter((doc) => doc.id !== miscDocId) || [],
        },
      }))
    }
  }

  // OA 추가
  const handleAddOA = () => {
    const newOA: OAHistory = {
      id: `oa_${selectedPatentId}_${selectedOAHistories.length + 1}`,
      patentId: selectedPatentId,
      oaSequence: selectedOAHistories.length + 1,
      oaNumber: "",
      oaReceivedDate: "",
      oaDeadline: "",
      oaType: "", // 직접입력
      status: "RECEIVED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documents: [],
      comments: [],
    }

    setOaHistories((prev) => ({
      ...prev,
      [selectedPatentId]: [...(prev[selectedPatentId] || []), newOA],
    }))
  }

  // OA 삭제
  const handleDeleteOA = (oaId: string) => {
    if (confirm("이 OA를 삭제하시겠습니까?")) {
      setOaHistories((prev) => ({
        ...prev,
        [selectedPatentId]: prev[selectedPatentId].filter((oa) => oa.id !== oaId),
      }))
    }
  }

  // OA 대응 완료
  const handleCompleteOAResponse = (oaId: string) => {
    setOaHistories((prev) => ({
      ...prev,
      [selectedPatentId]: prev[selectedPatentId].map((oa) =>
        oa.id === oaId ? { ...oa, status: "COMPLETED" as any, responseDate: new Date().toISOString() } : oa,
      ),
    }))

    // OA 대응 완료 시 특허 상태 변경
    setPatents((prev) =>
      prev.map((patent) =>
        patent.id === selectedPatentId
          ? { ...patent, status: "OA_RESPONSE" as PatentStatus, updatedAt: new Date().toISOString() }
          : patent,
      ),
    )

    alert("OA 대응이 완료되었습니다.")
  }

  if (!selectedPatent) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">선택된 특허 정보를 찾을 수 없습니다.</p>
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
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    돌아가기
                  </Button>
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
                          <Badge variant="outline">
                            {patent.status === "USPTO_REGISTERED" ? "등록완료" : "진행중"}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-sm line-clamp-2">{patent.title}</h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Users className="h-3 w-3" />
                          <span>{patent.inventors.join(", ")}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
                          <Label className="text-sm font-medium text-gray-500">특허제목</Label>
                          <p className="font-medium">{selectedPatent.title}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">발명자</Label>
                          <p className="font-medium">{selectedPatent.inventors.join(", ")}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">현재 상태</Label>
                          <Badge variant="outline" className="ml-2">
                            {selectedPatent.status === "ATTORNEY_REVIEW"
                              ? "변호사 검토"
                              : selectedPatent.status === "USPTO_FILING"
                                ? "USPTO 출원"
                                : selectedPatent.status === "OA_RESPONSE"
                                  ? "OA 대응"
                                  : selectedPatent.status === "USPTO_REGISTERED"
                                    ? "USPTO 등록"
                                    : selectedPatent.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">KR 출원번호</Label>
                          <p className="font-medium font-mono">{selectedPatent.applicationNumber || "미정"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">US 출원번호</Label>
                          <p className="font-medium font-mono">{selectedPatent.usApplicationNumber || "미정"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">US 등록번호</Label>
                          <p className="font-medium font-mono">{selectedPatent.usRegistrationNumber || "미정"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 작업 탭 */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="info">기본 정보</TabsTrigger>
                    <TabsTrigger value="filing">출원 PART</TabsTrigger>
                    <TabsTrigger value="changes">변경사항</TabsTrigger>
                    <TabsTrigger value="registration">등록 PART</TabsTrigger>
                    <TabsTrigger value="oa">OA 대응</TabsTrigger>
                  </TabsList>

                  {/* 기본 정보 탭 */}
                  <TabsContent value="info">
                    <Card>
                      <CardHeader>
                        <CardTitle>통합 출원 정보 입력</CardTitle>
                        <CardDescription>필요한 정보를 선택적으로 입력하세요</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* 출원 정보 */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium border-b pb-2">출원 정보</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="usApplicationNumber">US 출원번호</Label>
                              <Input
                                id="usApplicationNumber"
                                value={selectedFilingData.usApplicationNumber || ""}
                                onChange={(e) =>
                                  setFilingData((prev) => ({
                                    ...prev,
                                    [selectedPatentId]: {
                                      ...prev[selectedPatentId],
                                      usApplicationNumber: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="예: 17/123,456"
                              />
                            </div>
                            <div>
                              <Label htmlFor="usFilingDate">US 출원일</Label>
                              <Input
                                id="usFilingDate"
                                type="date"
                                value={selectedFilingData.usFilingDate || ""}
                                onChange={(e) =>
                                  setFilingData((prev) => ({
                                    ...prev,
                                    [selectedPatentId]: {
                                      ...prev[selectedPatentId],
                                      usFilingDate: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* 서류 준비 연결 정보 */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium border-b pb-2">연결된 서류 준비</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>서류 준비 상태</Label>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="bg-green-100 text-green-800">
                                  {selectedFilingData.documentsReady ? "서류 준비 완료" : "서류 준비 중"}
                                </Badge>
                                {selectedFilingData.documentCompletedAt && (
                                  <span className="text-sm text-gray-500">
                                    {new Date(selectedFilingData.documentCompletedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <Label>서류 준비 ID</Label>
                              <p className="font-mono text-sm">
                                {selectedFilingData.documentPreparationId || "연결 없음"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 등록 정보 */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium border-b pb-2">등록 정보</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="usRegistrationNumber">US 등록번호</Label>
                              <Input
                                id="usRegistrationNumber"
                                value={selectedFilingData.usRegistrationNumber || ""}
                                onChange={(e) =>
                                  setFilingData((prev) => ({
                                    ...prev,
                                    [selectedPatentId]: {
                                      ...prev[selectedPatentId],
                                      usRegistrationNumber: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="예: 11,123,456"
                              />
                            </div>
                            <div>
                              <Label htmlFor="usRegistrationDate">US 등록일</Label>
                              <Input
                                id="usRegistrationDate"
                                type="date"
                                value={selectedFilingData.usRegistrationDate || ""}
                                onChange={(e) =>
                                  setFilingData((prev) => ({
                                    ...prev,
                                    [selectedPatentId]: {
                                      ...prev[selectedPatentId],
                                      usRegistrationDate: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (selectedFilingData.documentPreparationId) {
                                alert(
                                  `✅ 서류 준비 단계와 연결됨\n\nID: ${selectedFilingData.documentPreparationId}\n완료일: ${selectedFilingData.documentCompletedAt ? new Date(selectedFilingData.documentCompletedAt).toLocaleString() : "미완료"}`,
                                )
                              } else {
                                alert("⚠️ 서류 준비 단계와 연결되지 않음")
                              }
                            }}
                          >
                            <Link className="h-4 w-4 mr-2" />
                            연결 상태 확인
                          </Button>
                          <Button onClick={handleSaveFilingInfo}>
                            <Save className="h-4 w-4 mr-2" />
                            정보 저장
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* 출원 PART 탭 */}
                  <TabsContent value="filing">
                    <Card>
                      <CardHeader>
                        <CardTitle>출원 서류 관리</CardTitle>
                        <CardDescription>USPTO 출원 관련 서류를 업로드하고 관리합니다</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* 출원서류 업로드 */}
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                            <div className="text-center">
                              <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                              <div className="space-y-2">
                                <p className="text-sm text-gray-600">출원서류를 드래그하거나 클릭하여 업로드</p>
                                <input
                                  type="file"
                                  multiple
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      handleFileUpload("USPTO_FILING_DOCS", e.target.files)
                                    }
                                  }}
                                  className="hidden"
                                  id="upload-filing-docs"
                                />
                                <label
                                  htmlFor="upload-filing-docs"
                                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                                >
                                  파일 선택
                                </label>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">PDF, DOC, DOCX, JPG, PNG (최대 10MB)</p>
                            </div>
                          </div>

                          {/* 업로드된 파일 목록 */}
                          {selectedFilingData.documents?.filter((doc) => doc.category === "USPTO_FILING_DOCS").length >
                            0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">업로드된 출원서류</h4>
                              <div className="space-y-2">
                                {selectedFilingData.documents
                                  ?.filter((doc) => doc.category === "USPTO_FILING_DOCS")
                                  .map((file) => (
                                    <div
                                      key={file.id}
                                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                    >
                                      <div className="flex items-center space-x-3">
                                        <FileText className="h-4 w-4 text-gray-400" />
                                        <div>
                                          <p className="text-sm font-medium">{file.originalFileName}</p>
                                          <p className="text-xs text-gray-500">
                                            {(file.fileSize / 1024 / 1024).toFixed(2)}MB • {file.uploadedBy} •{" "}
                                            {new Date(file.uploadedAt).toLocaleDateString()}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Button variant="ghost" size="sm" onClick={() => handlePreview(file)}>
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const actualFile = uploadedFiles[file.id]
                                            if (actualFile) {
                                              handleDownload({ ...file, actualFile })
                                            }
                                          }}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* 변경사항 탭 */}
                  <TabsContent value="changes">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>변경사항 관리</span>
                          <Button onClick={handleAddChange} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            변경사항 추가
                          </Button>
                        </CardTitle>
                        <CardDescription>출원 후 발생한 변경사항을 관리합니다</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {selectedFilingData.changes && selectedFilingData.changes.length > 0 ? (
                          <div className="space-y-4">
                            {selectedFilingData.changes.map((change) => (
                              <Card key={change.id} className="border-l-4 border-l-orange-500">
                                <CardHeader>
                                  <CardTitle className="flex items-center justify-between text-base">
                                    {editingChange === change.id ? (
                                      <Input
                                        value={change.title}
                                        onChange={(e) =>
                                          setFilingData((prev) => ({
                                            ...prev,
                                            [selectedPatentId]: {
                                              ...prev[selectedPatentId],
                                              changes: prev[selectedPatentId]?.changes?.map((c) =>
                                                c.id === change.id ? { ...c, title: e.target.value } : c,
                                              ),
                                            },
                                          }))
                                        }
                                        placeholder="변경사항 제목 (예: 출원인 변경, 분할출원 등)"
                                        className="text-base font-semibold"
                                      />
                                    ) : (
                                      <span>{change.title || "제목 없음"}</span>
                                    )}
                                    <div className="flex items-center space-x-2">
                                      {editingChange === change.id ? (
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            setEditingChange(null)
                                            setFilingData((prev) => ({
                                              ...prev,
                                              [selectedPatentId]: {
                                                ...prev[selectedPatentId],
                                                changes: prev[selectedPatentId]?.changes?.map((c) =>
                                                  c.id === change.id
                                                    ? { ...c, updatedAt: new Date().toISOString() }
                                                    : c,
                                                ),
                                              },
                                            }))
                                          }}
                                        >
                                          <Save className="h-4 w-4" />
                                        </Button>
                                      ) : (
                                        <Button variant="ghost" size="sm" onClick={() => setEditingChange(change.id)}>
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="sm" onClick={() => handleDeleteChange(change.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>내용</Label>
                                        {editingChange === change.id ? (
                                          <Textarea
                                            value={change.content}
                                            onChange={(e) =>
                                              setFilingData((prev) => ({
                                                ...prev,
                                                [selectedPatentId]: {
                                                  ...prev[selectedPatentId],
                                                  changes: prev[selectedPatentId]?.changes?.map((c) =>
                                                    c.id === change.id ? { ...c, content: e.target.value } : c,
                                                  ),
                                                },
                                              }))
                                            }
                                            placeholder="변경사항 상세 내용"
                                            rows={3}
                                          />
                                        ) : (
                                          <p className="text-sm p-2 bg-gray-50 rounded">
                                            {change.content || "내용 없음"}
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <Label>일자</Label>
                                        {editingChange === change.id ? (
                                          <Input
                                            type="date"
                                            value={change.date}
                                            onChange={(e) =>
                                              setFilingData((prev) => ({
                                                ...prev,
                                                [selectedPatentId]: {
                                                  ...prev[selectedPatentId],
                                                  changes: prev[selectedPatentId]?.changes?.map((c) =>
                                                    c.id === change.id ? { ...c, date: e.target.value } : c,
                                                  ),
                                                },
                                              }))
                                            }
                                          />
                                        ) : (
                                          <p className="text-sm p-2 bg-gray-50 rounded">{change.date}</p>
                                        )}
                                      </div>
                                    </div>

                                    {/* 관련 서류 */}
                                    <div>
                                      <Label className="text-sm font-medium mb-2 block">관련 서류</Label>
                                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                        <input
                                          type="file"
                                          multiple
                                          accept=".pdf,.doc,.docx"
                                          onChange={(e) => {
                                            if (e.target.files) {
                                              handleFileUpload("CHANGE_DOCS", e.target.files, change.id)
                                            }
                                          }}
                                          className="hidden"
                                          id={`change-docs-${change.id}`}
                                        />
                                        <label
                                          htmlFor={`change-docs-${change.id}`}
                                          className="flex items-center justify-center space-x-2 text-sm text-gray-600 cursor-pointer"
                                        >
                                          <Upload className="h-4 w-4" />
                                          <span>관련 서류 업로드</span>
                                        </label>
                                      </div>

                                      {/* 업로드된 관련 서류 목록 */}
                                      {change.documents && change.documents.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                          {change.documents.map((doc) => (
                                            <div
                                              key={doc.id}
                                              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                                            >
                                              <div className="flex items-center space-x-2">
                                                <FileText className="h-3 w-3 text-gray-400" />
                                                <span className="text-xs">{doc.originalFileName}</span>
                                              </div>
                                              <div className="flex items-center space-x-1">
                                                <Button variant="ghost" size="sm" onClick={() => handlePreview(doc)}>
                                                  <Eye className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    const actualFile = uploadedFiles[doc.id]
                                                    if (actualFile) {
                                                      handleDownload({ ...doc, actualFile })
                                                    }
                                                  }}
                                                >
                                                  <Download className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-600">등록된 변경사항이 없습니다.</p>
                            <Button onClick={handleAddChange} className="mt-4">
                              첫 번째 변경사항 추가
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* 기타서류 관리 */}
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>출원 후 기타서류</span>
                          <Button onClick={handleAddMiscDoc} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            기타서류 추가
                          </Button>
                        </CardTitle>
                        <CardDescription>출원 후 제출하는 기타 서류들을 관리합니다</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {selectedFilingData.miscDocuments && selectedFilingData.miscDocuments.length > 0 ? (
                          <div className="space-y-4">
                            {selectedFilingData.miscDocuments.map((miscDoc) => (
                              <Card key={miscDoc.id} className="border-l-4 border-l-green-500">
                                <CardHeader>
                                  <CardTitle className="flex items-center justify-between text-base">
                                    {editingMiscDoc === miscDoc.id ? (
                                      <Input
                                        value={miscDoc.title}
                                        onChange={(e) =>
                                          setFilingData((prev) => ({
                                            ...prev,
                                            [selectedPatentId]: {
                                              ...prev[selectedPatentId],
                                              miscDocuments: prev[selectedPatentId]?.miscDocuments?.map((doc) =>
                                                doc.id === miscDoc.id ? { ...doc, title: e.target.value } : doc,
                                              ),
                                            },
                                          }))
                                        }
                                        placeholder="기타서류 제목"
                                        className="text-base font-semibold"
                                      />
                                    ) : (
                                      <span>{miscDoc.title || "제목 없음"}</span>
                                    )}
                                    <div className="flex items-center space-x-2">
                                      {editingMiscDoc === miscDoc.id ? (
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            setEditingMiscDoc(null)
                                            setFilingData((prev) => ({
                                              ...prev,
                                              [selectedPatentId]: {
                                                ...prev[selectedPatentId],
                                                miscDocuments: prev[selectedPatentId]?.miscDocuments?.map((doc) =>
                                                  doc.id === miscDoc.id
                                                    ? { ...doc, updatedAt: new Date().toISOString() }
                                                    : doc,
                                                ),
                                              },
                                            }))
                                          }}
                                        >
                                          <Save className="h-4 w-4" />
                                        </Button>
                                      ) : (
                                        <Button variant="ghost" size="sm" onClick={() => setEditingMiscDoc(miscDoc.id)}>
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="sm" onClick={() => handleDeleteMiscDoc(miscDoc.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>내용/설명</Label>
                                      {editingMiscDoc === miscDoc.id ? (
                                        <Textarea
                                          value={miscDoc.description}
                                          onChange={(e) =>
                                            setFilingData((prev) => ({
                                              ...prev,
                                              [selectedPatentId]: {
                                                ...prev[selectedPatentId],
                                                miscDocuments: prev[selectedPatentId]?.miscDocuments?.map((doc) =>
                                                  doc.id === miscDoc.id ? { ...doc, description: e.target.value } : doc,
                                                ),
                                              },
                                            }))
                                          }
                                          placeholder="기타서류 상세 설명"
                                          rows={3}
                                        />
                                      ) : (
                                        <p className="text-sm p-2 bg-gray-50 rounded">
                                          {miscDoc.description || "설명 없음"}
                                        </p>
                                      )}
                                    </div>

                                    {/* 첨부파일 */}
                                    <div>
                                      <Label className="text-sm font-medium mb-2 block">첨부파일</Label>
                                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                        <input
                                          type="file"
                                          multiple
                                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                          onChange={(e) => {
                                            if (e.target.files) {
                                              handleFileUpload("POST_FILING_DOCS", e.target.files, miscDoc.id)
                                            }
                                          }}
                                          className="hidden"
                                          id={`misc-docs-${miscDoc.id}`}
                                        />
                                        <label
                                          htmlFor={`misc-docs-${miscDoc.id}`}
                                          className="flex items-center justify-center space-x-2 text-sm text-gray-600 cursor-pointer"
                                        >
                                          <Upload className="h-4 w-4" />
                                          <span>파일 업로드 (여러 파일 가능)</span>
                                        </label>
                                      </div>

                                      {/* 업로드된 파일 목록 */}
                                      {miscDoc.files && miscDoc.files.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                          {miscDoc.files.map((file) => (
                                            <div
                                              key={file.id}
                                              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                                            >
                                              <div className="flex items-center space-x-2">
                                                <FileText className="h-3 w-3 text-gray-400" />
                                                <div>
                                                  <span className="text-xs font-medium">{file.originalFileName}</span>
                                                  <p className="text-xs text-gray-500">
                                                    {(file.fileSize / 1024 / 1024).toFixed(2)}MB
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex items-center space-x-1">
                                                <Button variant="ghost" size="sm" onClick={() => handlePreview(file)}>
                                                  <Eye className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    const actualFile = uploadedFiles[file.id]
                                                    if (actualFile) {
                                                      handleDownload({ ...file, actualFile })
                                                    }
                                                  }}
                                                >
                                                  <Download className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-600">등록된 기타서류가 없습니다.</p>
                            <Button onClick={handleAddMiscDoc} className="mt-4">
                              첫 번째 기타서류 추가
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* 등록 PART 탭 */}
                  <TabsContent value="registration">
                    <Card>
                      <CardHeader>
                        <CardTitle>등록 서류 관리</CardTitle>
                        <CardDescription>USPTO 등록 관련 서류를 업로드하고 관리합니다</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* 등록서류 업로드 */}
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                            <div className="text-center">
                              <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                              <div className="space-y-2">
                                <p className="text-sm text-gray-600">등록서류를 드래그하거나 클릭하여 업로드</p>
                                <input
                                  type="file"
                                  multiple
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      handleFileUpload("USPTO_REGISTRATION_DOCS", e.target.files)
                                    }
                                  }}
                                  className="hidden"
                                  id="upload-registration-docs"
                                />
                                <label
                                  htmlFor="upload-registration-docs"
                                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                                >
                                  파일 선택
                                </label>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">PDF, DOC, DOCX, JPG, PNG (최대 10MB)</p>
                            </div>
                          </div>

                          {/* 업로드된 파일 목록 */}
                          {selectedFilingData.documents?.filter((doc) => doc.category === "USPTO_REGISTRATION_DOCS")
                            .length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">업로드된 등록서류</h4>
                              <div className="space-y-2">
                                {selectedFilingData.documents
                                  ?.filter((doc) => doc.category === "USPTO_REGISTRATION_DOCS")
                                  .map((file) => (
                                    <div
                                      key={file.id}
                                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                    >
                                      <div className="flex items-center space-x-3">
                                        <FileText className="h-4 w-4 text-gray-400" />
                                        <div>
                                          <p className="text-sm font-medium">{file.originalFileName}</p>
                                          <p className="text-xs text-gray-500">
                                            {(file.fileSize / 1024 / 1024).toFixed(2)}MB • {file.uploadedBy} •{" "}
                                            {new Date(file.uploadedAt).toLocaleDateString()}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Button variant="ghost" size="sm" onClick={() => handlePreview(file)}>
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const actualFile = uploadedFiles[file.id]
                                            if (actualFile) {
                                              handleDownload({ ...file, actualFile })
                                            }
                                          }}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* OA 대응 탭 */}
                  <TabsContent value="oa">
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>OA 대응 히스토리</span>
                            <Button onClick={handleAddOA} size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              OA 추가
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedOAHistories.length > 0 ? (
                            <div className="space-y-4">
                              {selectedOAHistories.map((oa, index) => (
                                <Card key={oa.id} className="border-l-4 border-l-blue-500">
                                  <CardHeader>
                                    <CardTitle className="flex items-center justify-between text-base">
                                      <span>{oa.oaSequence}차 OA</span>
                                      <div className="flex items-center space-x-2">
                                        <Badge variant={oa.status === "COMPLETED" ? "default" : "secondary"}>
                                          {oa.status === "RECEIVED"
                                            ? "접수"
                                            : oa.status === "IN_PROGRESS"
                                              ? "진행중"
                                              : oa.status === "RESPONDED"
                                                ? "대응완료"
                                                : oa.status === "COMPLETED"
                                                  ? "완료"
                                                  : oa.status}
                                        </Badge>
                                        {oa.status !== "COMPLETED" && (
                                          <Button size="sm" onClick={() => handleCompleteOAResponse(oa.id)}>
                                            완료
                                          </Button>
                                        )}
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteOA(oa.id)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div>
                                        <Label htmlFor={`oaNumber-${oa.id}`}>OA 번호</Label>
                                        <Input
                                          id={`oaNumber-${oa.id}`}
                                          value={oa.oaNumber || ""}
                                          onChange={(e) =>
                                            setOaHistories((prev) => ({
                                              ...prev,
                                              [selectedPatentId]: prev[selectedPatentId].map((item) =>
                                                item.id === oa.id ? { ...item, oaNumber: e.target.value } : item,
                                              ),
                                            }))
                                          }
                                          placeholder="OA 번호를 입력하세요"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`oaType-${oa.id}`}>OA 유형</Label>
                                        <Input
                                          id={`oaType-${oa.id}`}
                                          value={oa.oaType}
                                          onChange={(e) =>
                                            setOaHistories((prev) => ({
                                              ...prev,
                                              [selectedPatentId]: prev[selectedPatentId].map((item) =>
                                                item.id === oa.id ? { ...item, oaType: e.target.value } : item,
                                              ),
                                            }))
                                          }
                                          placeholder="예: Non-Final Rejection, Final Rejection 등"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`oaReceivedDate-${oa.id}`}>OA 접수일</Label>
                                        <Input
                                          id={`oaReceivedDate-${oa.id}`}
                                          type="date"
                                          value={oa.oaReceivedDate}
                                          onChange={(e) =>
                                            setOaHistories((prev) => ({
                                              ...prev,
                                              [selectedPatentId]: prev[selectedPatentId].map((item) =>
                                                item.id === oa.id ? { ...item, oaReceivedDate: e.target.value } : item,
                                              ),
                                            }))
                                          }
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`oaDeadline-${oa.id}`}>OA 마감일</Label>
                                        <Input
                                          id={`oaDeadline-${oa.id}`}
                                          type="date"
                                          value={oa.oaDeadline}
                                          onChange={(e) =>
                                            setOaHistories((prev) => ({
                                              ...prev,
                                              [selectedPatentId]: prev[selectedPatentId].map((item) =>
                                                item.id === oa.id ? { ...item, oaDeadline: e.target.value } : item,
                                              ),
                                            }))
                                          }
                                        />
                                      </div>
                                    </div>

                                    {/* OA 관련 서류 */}
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="font-medium text-sm mb-2">OA 접수서류</h4>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                          <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) => {
                                              if (e.target.files) {
                                                handleOAFileUpload("OA_RECEIVED_DOCS", e.target.files, oa.id)
                                              }
                                            }}
                                            className="hidden"
                                            id={`oa-received-${oa.id}`}
                                          />
                                          <label
                                            htmlFor={`oa-received-${oa.id}`}
                                            className="flex items-center justify-center space-x-2 text-sm text-gray-600 cursor-pointer"
                                          >
                                            <Upload className="h-4 w-4" />
                                            <span>OA 접수서류 업로드</span>
                                          </label>
                                        </div>

                                        {/* 업로드된 OA 접수서류 목록 */}
                                        {oa.documents.filter((doc) => doc.category === "OA_RECEIVED_DOCS").length >
                                          0 && (
                                          <div className="mt-2 space-y-2">
                                            {oa.documents
                                              .filter((doc) => doc.category === "OA_RECEIVED_DOCS")
                                              .map((doc) => (
                                                <div
                                                  key={doc.id}
                                                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                                                >
                                                  <div className="flex items-center space-x-2">
                                                    <FileText className="h-3 w-3 text-gray-400" />
                                                    <span className="text-xs">{doc.originalFileName}</span>
                                                  </div>
                                                  <div className="flex items-center space-x-1">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => handlePreview(doc)}
                                                    >
                                                      <Eye className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => {
                                                        const actualFile = uploadedFiles[doc.id]
                                                        if (actualFile) {
                                                          handleDownload({ ...doc, actualFile })
                                                        }
                                                      }}
                                                    >
                                                      <Download className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        )}
                                      </div>

                                      <div>
                                        <h4 className="font-medium text-sm mb-2">OA 대응서류</h4>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                          <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) => {
                                              if (e.target.files) {
                                                handleOAFileUpload("OA_RESPONSE_DOCS", e.target.files, oa.id)
                                              }
                                            }}
                                            className="hidden"
                                            id={`oa-response-${oa.id}`}
                                          />
                                          <label
                                            htmlFor={`oa-response-${oa.id}`}
                                            className="flex items-center justify-center space-x-2 text-sm text-gray-600 cursor-pointer"
                                          >
                                            <Upload className="h-4 w-4" />
                                            <span>OA 대응서류 업로드</span>
                                          </label>
                                        </div>

                                        {/* 업로드된 OA 대응서류 목록 */}
                                        {oa.documents.filter((doc) => doc.category === "OA_RESPONSE_DOCS").length >
                                          0 && (
                                          <div className="mt-2 space-y-2">
                                            {oa.documents
                                              .filter((doc) => doc.category === "OA_RESPONSE_DOCS")
                                              .map((doc) => (
                                                <div
                                                  key={doc.id}
                                                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                                                >
                                                  <div className="flex items-center space-x-2">
                                                    <FileText className="h-3 w-3 text-gray-400" />
                                                    <span className="text-xs">{doc.originalFileName}</span>
                                                  </div>
                                                  <div className="flex items-center space-x-1">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => handlePreview(doc)}
                                                    >
                                                      <Eye className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => {
                                                        const actualFile = uploadedFiles[doc.id]
                                                        if (actualFile) {
                                                          handleDownload({ ...doc, actualFile })
                                                        }
                                                      }}
                                                    >
                                                      <Download className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* OA별 코멘트 */}
                                    <div className="mt-4 pt-4 border-t">
                                      <h4 className="font-medium text-sm mb-2">코멘트</h4>
                                      <div className="space-y-2">
                                        {oa.comments.map((comment) => (
                                          <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-sm font-medium">{comment.authorName}</span>
                                              <span className="text-xs text-gray-500">
                                                {new Date(comment.createdAt).toLocaleString()}
                                              </span>
                                            </div>
                                            <p className="text-sm">{comment.content}</p>
                                          </div>
                                        ))}

                                        <div className="flex space-x-2">
                                          <Input
                                            placeholder="코멘트를 입력하세요..."
                                            onKeyPress={(e) => {
                                              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                                const newComment: OAComment = {
                                                  id: `comment_${Date.now()}`,
                                                  oaHistoryId: oa.id,
                                                  content: e.currentTarget.value.trim(),
                                                  authorId: currentUser.userId,
                                                  authorName: currentUser.memberName,
                                                  authorRole: currentUser.role,
                                                  createdAt: new Date().toISOString(),
                                                }

                                                setOaHistories((prev) => ({
                                                  ...prev,
                                                  [selectedPatentId]: prev[selectedPatentId].map((item) =>
                                                    item.id === oa.id
                                                      ? { ...item, comments: [...item.comments, newComment] }
                                                      : item,
                                                  ),
                                                }))

                                                e.currentTarget.value = ""
                                              }
                                            }}
                                          />
                                          <Button size="sm">
                                            <Send className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                              <p className="text-gray-600">등록된 OA가 없습니다.</p>
                              <Button onClick={handleAddOA} className="mt-4">
                                첫 번째 OA 추가
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* 파일 미리보기 모달 */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{previewFile.name}</span>
                <div className="flex items-center space-x-2">
                  {previewFile.actualFile && (
                    <Button variant="outline" size="sm" onClick={() => handleDownload(previewFile)}>
                      <Download className="h-4 w-4 mr-2" />
                      다운로드
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setPreviewFile(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">파일 크기:</span> {(previewFile.size / 1024 / 1024).toFixed(2)}MB
                </div>
                <div>
                  <span className="font-medium">파일 형식:</span> {previewFile.type}
                </div>
                <div>
                  <span className="font-medium">업로드자:</span> {previewFile.uploadedBy}
                </div>
                <div>
                  <span className="font-medium">업로드일:</span> {previewFile.uploadedAt.toLocaleString()}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                {previewFile.previewUrl && previewFile.type.startsWith("image/") ? (
                  <img
                    src={previewFile.previewUrl || "/placeholder.svg"}
                    alt={previewFile.name}
                    className="max-w-full h-auto mx-auto"
                  />
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">
                      {previewFile.type === "application/pdf"
                        ? "PDF 파일은 새 창에서 열립니다."
                        : "이 파일 형식은 미리보기를 지원하지 않습니다."}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">다운로드하여 확인해주세요.</p>
                    {previewFile.type === "application/pdf" && (
                      <Button
                        className="mt-4"
                        onClick={() => {
                          const pdfUrl = URL.createObjectURL(previewFile.actualFile)
                          window.open(pdfUrl, "_blank")
                        }}
                      >
                        새 창에서 PDF 열기
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
