"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { PatentDetailModal } from "@/features/patent/components/patent-detail-modal"
import { PatentFormModal } from "@/features/patent/components/patent-form-modal"
import {
  Plus,
  Search,
  Eye,
  Edit,
  Calendar,
  AlertTriangle,
  FileText,
  Languages,
  CheckCircle,
  XCircle,
  FolderOpen,
  Send,
  Clock,
} from "lucide-react"
import { goToInternalUrl, getUserId, isLoggedIn, formatDate } from "@/lib/func"
import { getCurrentUserRole, filterAccessiblePatents } from "@/lib/permissions"

// API 연결
import { patentsApi, type PatentWithInventors } from "@/lib/api/patents"

// 마감일 계산 함수
const calculateDueDate = (filingDate: string, pctFiled: boolean): string => {
  try {
    const filing = new Date(filingDate)
    if (isNaN(filing.getTime())) {
      return "2025-12-31" // 기본값
    }

    if (pctFiled) {
      // PCT 출원: 30개월 후
      filing.setMonth(filing.getMonth() + 30)
    } else {
      // KR 특허: 12개월 후
      filing.setMonth(filing.getMonth() + 12)
    }
    return filing.toISOString().split("T")[0]
  } catch (error) {
    return "2025-12-31" // 오류 시 기본값
  }
}

// D-Day 계산 함수 수정
const calculateDaysLeft = (dueDate: string): number => {
  try {
    const today = new Date()
    const due = new Date(dueDate)
    if (isNaN(due.getTime())) {
      return 365 // 기본값
    }
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  } catch (error) {
    return 365 // 오류 시 기본값
  }
}

export default function PatentsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [searchInput, setSearchInput] = useState("") // 검색 입력값 (실제 검색은 버튼 클릭 시)
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedPatent, setSelectedPatent] = useState<any>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingPatent, setEditingPatent] = useState<any>(null)
  const [patents, setPatents] = useState<PatentWithInventors[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [updatingDueDates, setUpdatingDueDates] = useState(false)

  // 페이징 상태 추가
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(10)

  const statusLabels = {
    NO_PROGRESS: "번역대기",
    TRANSLATING: "번역중",
    TRANSLATION_REVIEW: "번역검토",
    DOCUMENT_PREP: "서류준비",
    FILING_COMPLETE: "출원완료",
  }

  const statusColors = {
    NO_PROGRESS: "bg-gray-100 text-gray-800",
    TRANSLATING: "bg-blue-100 text-blue-800",
    TRANSLATION_REVIEW: "bg-yellow-100 text-yellow-800",
    DOCUMENT_PREP: "bg-purple-100 text-purple-800",
    USPTO_FILING: "bg-indigo-100 text-indigo-800",
    OA_RESPONSE: "bg-red-100 text-red-800",
    USPTO_REGISTERED: "bg-green-100 text-green-800",
    FILING_COMPLETE: "bg-pink-100 text-pink-800",
  }

  // 상태별 페이지 연결 매핑
  const statusPageMapping = {
    NO_PROGRESS: "/translations",
    TRANSLATING: "/translations",
    TRANSLATION_REVIEW: "/translations",
    DOCUMENT_PREP: "/documents",
    USPTO_FILING: "/filing",
    OA_RESPONSE: "/filing",
    USPTO_REGISTERED: "/filing",
    FILING_COMPLETE: "/filing",
  }

  useEffect(() => {
    const uid = getUserId()
    setUserId(uid)
    setUserRole(getCurrentUserRole())
    if (!isLoggedIn()) {
      goToInternalUrl("/login")
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // 특허 데이터와 통계 데이터를 병렬로 로드 (페이징 적용)
        const [patentsData, statsData] = await Promise.all([
          patentsApi.getAll({ 
            page: currentPage, 
            limit: itemsPerPage,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            search: searchTerm || undefined
          }), 
          patentsApi.getStats()
        ])

        // 마감일을 실시간 계산
        const patentsWithDueDate = patentsData.data.map((patent) => {
          const dueDate = calculateDueDate(patent.filingDate, patent.pctFiled)
          const daysLeft = calculateDaysLeft(dueDate)
          return {
            ...patent,
            dueDate,
            daysLeft,
          }
        })

        setPatents(patentsWithDueDate)
        setStats(statsData)
        
        // 페이징 정보 설정
        setTotalItems(patentsData.pagination?.total || 0)
        setTotalPages(patentsData.pagination?.totalPages || 1)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      loadData()
    }
  }, [userId, currentPage, itemsPerPage, statusFilter, searchTerm])

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleViewDetails = (patent: any) => {
    setSelectedPatent(patent)
    setIsDetailModalOpen(true)
  }

  const handleEditPatent = (patent: any) => {
    setEditingPatent(patent)
    setIsFormModalOpen(true)
  }

  const handleAddPatent = () => {
    setEditingPatent(null)
    setIsFormModalOpen(true)
  }

  const handleStatusClick = (status: string) => {
    const targetUrl = statusPageMapping[status as keyof typeof statusPageMapping]
    if (targetUrl) {
      goToInternalUrl(targetUrl)
    }
  }

  const handleUpdateDueDates = async () => {
    try {
      setUpdatingDueDates(true)
      const result = await patentsApi.updateDueDates()
      
      // 성공 메시지 표시
      alert(result.message)
      
      // 데이터 새로고침
      const [patentsData, statsData] = await Promise.all([
        patentsApi.getAll({ page: currentPage, limit: itemsPerPage }),
        patentsApi.getStats()
      ])

      const patentsWithDueDate = patentsData.data.map((patent) => {
        const dueDate = calculateDueDate(patent.filingDate, patent.pctFiled)
        const daysLeft = calculateDaysLeft(dueDate)
        return {
          ...patent,
          dueDate,
          daysLeft,
        }
      })

      setPatents(patentsWithDueDate)
      setStats(statsData)
      setTotalItems(patentsData.pagination?.total || 0)
      setTotalPages(patentsData.pagination?.totalPages || 1)
    } catch (error) {
      console.error('마감일 업데이트 오류:', error)
      alert('마감일 업데이트 중 오류가 발생했습니다.')
    } finally {
      setUpdatingDueDates(false)
    }
  }

  const handlePatentSubmit = async (patentData: any) => {
    
    // 출원유형을 PCT 여부로 변환
    const pctFiled = patentData.applicationType === "provisional"
    
    let result
    if (editingPatent) {
      // 특허 수정
      const updateData = {
        managementNumber: patentData.managementNumber,
        title: patentData.title,
        applicationNumber: patentData.applicationNumber,
        usRegistrationNumber: patentData.registrationNumber, // 등록번호 매핑
        filingDate: patentData.filingDate,
        pctFiled: pctFiled, // 출원유형을 PCT 여부로 변환
        pctApplicationNumber: patentData.pctApplicationNumber,
        pctFilingDate: patentData.pctFilingDate,
        status: patentData.status || 'NO_PROGRESS',
        priority: patentData.priority || 'MEDIUM',
        notes: patentData.notes,
        inventorId: 1, // 기본값 - 실제로는 선택된 발명자 ID 사용
        managerId: 1, // 기본값 - 실제로는 현재 로그인한 사용자 ID 사용
        inventors: patentData.inventors || [], // 발명자 목록
        priorityPatents: patentData.priorityPatents || [], // 우선권 특허 목록
      }
      
      result = await patentsApi.update(editingPatent.id, updateData)
    } else {
      // 새 특허 생성
      const createData = {
        title: patentData.title,
        applicationNumber: patentData.applicationNumber,
        usRegistrationNumber: patentData.registrationNumber, // 등록번호 매핑
        filingDate: patentData.filingDate,
        pctFiled: pctFiled, // 출원유형을 PCT 여부로 변환
        pctApplicationNumber: patentData.pctApplicationNumber,
        pctFilingDate: patentData.pctFilingDate,
        status: patentData.status || 'NO_PROGRESS',
        priority: patentData.priority || 'MEDIUM',
        notes: patentData.notes,
        inventorId: 1, // 기본값 - 실제로는 선택된 발명자 ID 사용
        managerId: 1, // 기본값 - 실제로는 현재 로그인한 사용자 ID 사용
        inventors: patentData.inventors || [], // 발명자 목록
        priorityPatents: patentData.priorityPatents || [], // 우선권 특허 목록
      }
      
      result = await patentsApi.create(createData)
    }

    // 성공 시에만 데이터 새로고침 및 모달 닫기
    const [patentsData, statsData] = await Promise.all([
      patentsApi.getAll({ page: currentPage, limit: itemsPerPage }),
      patentsApi.getStats()
    ])

    // 데이터베이스에서 가져온 마감일을 사용하고 D-Day만 계산
    const patentsWithDueDate = patentsData.data.map((patent) => {
      const dueDate = calculateDueDate(patent.filingDate, patent.pctFiled)
      const daysLeft = calculateDaysLeft(dueDate)
      return {
        ...patent,
        dueDate,
        daysLeft,
      }
    })

    setPatents(patentsWithDueDate)
    setStats(statsData)
    setTotalItems(patentsData.pagination?.total || 0)
    setTotalPages(patentsData.pagination?.totalPages || 1)
    setIsFormModalOpen(false)
    
    return result
  }

  // 수정된 카드 클릭 핸들러 - 6개 상태
  const handleCardClick = (filterType: string) => {
    switch (filterType) {
      case "all":
        setStatusFilter("all")
        break
      case "translation-waiting":
        setStatusFilter("NO_PROGRESS")
        break
      case "translation-progress":
        setStatusFilter("TRANSLATING")
        break
      case "translation-review":
        setStatusFilter("TRANSLATION_REVIEW")
        break
      case "document-prep":
        setStatusFilter("DOCUMENT_PREP")
        break
      case "filing-complete":
        setStatusFilter("FILING_COMPLETE")
        break
    }
  }

  // 마감일 임박 특허 계산 (90일 이내)
  const urgentPatents = patents.filter((patent) => (patent.daysLeft ?? 0) <= 90 && (patent.daysLeft ?? 0) > 0)
  const overduePatents = patents.filter((patent) => (patent.daysLeft ?? 0) <= 0)

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">특허 데이터를 불러오는 중...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-600 mb-4">⚠️ 오류 발생</div>
              <p className="text-gray-600">{error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                다시 시도
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!userId) {
    return <div className="min-h-screen flex items-center justify-center">로딩중...</div>
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">특허 관리</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">USPTO 출원 대상 특허 관리 및 진행 상황 추적</p>
              </div>
              <div className="flex items-center space-x-3">
                {/* <Button
                  onClick={handleUpdateDueDates}
                  variant="outline"
                  disabled={updatingDueDates}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  {updatingDueDates ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                      업데이트 중...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      마감일 업데이트
                    </>
                  )}
                </Button> */}
                <Button
                  onClick={handleAddPatent}
                  variant="outline"
                  className="border border-primary flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>새 특허 등록</span>
                </Button>
              </div>
            </div>

            {/* 수정된 Stats Cards - 6개 상태 표시 */}
            {/* <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <Card
                className="hover:shadow-md transition-shadow duration-300 cursor-pointer"
                onClick={() => handleCardClick("all")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">전체특허</p>
                      <p className="text-2xl font-bold">{stats?.total || patents.length}</p>
                    </div>
                    <FileText className="h-6 w-6 text-gray-600" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-md transition-shadow duration-300 cursor-pointer"
                onClick={() => handleCardClick("translation-waiting")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">번역대기</p>
                      <p className="text-2xl font-bold">{stats?.noProgress || 0}</p>
                    </div>
                    <Clock className="h-6 w-6 text-gray-600" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-md transition-shadow duration-300 cursor-pointer"
                onClick={() => handleCardClick("translation-progress")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">번역중</p>
                      <p className="text-2xl font-bold">{stats?.translating || 0}</p>
                    </div>
                    <Languages className="h-6 w-6 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-md transition-shadow duration-300 cursor-pointer"
                onClick={() => handleCardClick("translation-review")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">번역검토</p>
                      <p className="text-2xl font-bold">{stats?.translationReview || 0}</p>
                    </div>
                    <Languages className="h-6 w-6 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-md transition-shadow duration-300 cursor-pointer"
                onClick={() => handleCardClick("document-prep")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">서류준비</p>
                      <p className="text-2xl font-bold">{stats?.docCompleteFilingReady || 0}</p>
                    </div>
                    <FolderOpen className="h-6 w-6 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-md transition-shadow duration-300 cursor-pointer"
                onClick={() => handleCardClick("filing-complete")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">출원완료</p>
                      <p className="text-2xl font-bold">{stats?.filingComplete || 0}</p>
                    </div>
                    <Send className="h-6 w-6 text-indigo-600" />
                  </div>
                </CardContent>
              </Card>
            </div> */}

            {/* 마감일 알림 카드 */}
            {(urgentPatents.length > 0 || overduePatents.length > 0) && (
              <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold text-orange-800 dark:text-orange-200">마감일 알림</h3>
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300">
                    {overduePatents.length > 0 && <p className="mb-1">⚠️ 마감일 초과: {overduePatents.length}건</p>}
                    {urgentPatents.length > 0 && <p>🔔 마감일 임박 (90일 이내): {urgentPatents.length}건</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative flex">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="특허명, 출원번호, 발명자, 관리번호로 검색..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-10"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            setSearchTerm(searchInput)
                            setCurrentPage(1) // 검색 시 첫 페이지로 이동
                          }
                        }}
                      />
                      <Button
                        onClick={() => {
                          setSearchTerm(searchInput)
                          setCurrentPage(1) // 검색 시 첫 페이지로 이동
                        }}
                        className="bg-blue-600 text-white ml-2 border-blue-600 hover:bg-blue-700"
                        variant="outline"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        검색
                      </Button>
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="상태 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Patents Table */}
            <Card>
              <CardHeader>
                <CardTitle>특허 목록</CardTitle>
                <CardDescription>총 {totalItems}건의 특허</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>관리번호</TableHead>
                      <TableHead>특허명</TableHead>
                      <TableHead>출원번호</TableHead>
                      <TableHead>발명자</TableHead>
                      <TableHead>출원일</TableHead>
                      <TableHead>PCT 여부</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>마감일</TableHead>
                      <TableHead>D-Day</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patents.map((patent) => (
                      <TableRow key={patent.id}>
                        <TableCell className="font-mono text-sm font-medium">{patent.managementNumber}</TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="font-medium truncate" title={patent.title}>
                              {patent.title}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{patent.applicationNumber || "미정"}</TableCell>
                        <TableCell>{patent.inventors.map(inv => inv.name).join(", ")}</TableCell>
                        <TableCell>{formatDate(patent.filingDate)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {patent.pctFiled ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="ml-1 text-sm">{patent.pctFiled ? "예" : "아니오"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${statusColors[patent.status as keyof typeof statusColors]} cursor-pointer hover:opacity-80`}
                            onClick={() => handleStatusClick(patent.status)}
                          >
                            {statusLabels[patent.status as keyof typeof statusLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{patent.dueDate}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className={`flex items-center space-x-2 ${
                              (patent.daysLeft ?? 0) <= 0
                                ? "text-red-700 font-bold"
                                : (patent.daysLeft ?? 0) < 90
                                  ? "text-red-600"
                                  : (patent.daysLeft ?? 0) < 180
                                    ? "text-yellow-600"
                                    : "text-green-600"
                            }`}
                          >
                            {(patent.daysLeft ?? 0) <= 0 && <AlertTriangle className="h-4 w-4" />}
                            {(patent.daysLeft ?? 0) < 90 && (patent.daysLeft ?? 0) > 0 && <AlertTriangle className="h-4 w-4" />}
                            <span className="font-medium">
                              {(patent.daysLeft ?? 0) <= 0 ? `초과 ${Math.abs(patent.daysLeft ?? 0)}일` : `D-${patent.daysLeft ?? 0}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(patent)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditPatent(patent)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      총 {totalItems}건 중 {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)}건
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
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
                              className="w-8 h-8 p-0"
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
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Modals */}
      <PatentDetailModal
        patent={selectedPatent}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />

      <PatentFormModal
        patent={editingPatent}
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handlePatentSubmit}
      />
    </div>
  )
}
