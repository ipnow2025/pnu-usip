"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Scale, FileText, AlertTriangle, CheckCircle, ExternalLink, Calendar, DollarSign } from "lucide-react"
import { useBasePathRouter } from "@/lib/func"

// 변호사 전용 대시보드 데이터
const attorneyDashboardData = {
  caseload: {
    total: 15,
    attorneyReview: 4,
    usptoFiling: 6,
    oaResponse: 3,
    registered: 2,
  },
  urgentCases: [
    {
      id: "case001",
      patentTitle: "AI 기반 영상 인식 시스템",
      type: "OA Response",
      deadline: "2024-02-15",
      daysLeft: 12,
      priority: "high",
    },
    {
      id: "case002",
      patentTitle: "친환경 배터리 소재",
      type: "USPTO Filing",
      deadline: "2024-02-20",
      daysLeft: 17,
      priority: "medium",
    },
  ],
  recentFilings: [
    {
      id: "filing001",
      patentTitle: "스마트 IoT 센서 네트워크",
      applicationNumber: "17/123,456",
      filedDate: "2024-01-18",
      status: "Filed",
    },
    {
      id: "filing002",
      patentTitle: "바이오 의료기기 제어",
      applicationNumber: "17/123,457",
      filedDate: "2024-01-16",
      status: "Under Review",
    },
  ],
  monthlyStats: {
    filings: 8,
    oaResponses: 5,
    registrations: 3,
    revenue: 45000,
  },
}

export function AttorneyDashboard() {
  const router = useBasePathRouter()

  const handleCardClick = (path: string) => {
    router.push(path)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600"
      case "medium":
        return "text-yellow-600"
      default:
        return "text-green-600"
    }
  }

  return (
    <div className="space-y-8">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">변호사 대시보드</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">USPTO 출원 및 법무 업무 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => handleCardClick("/filing?filter=all")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">담당 케이스</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attorneyDashboardData.caseload.total}</div>
            <p className="text-xs text-muted-foreground">총 담당 특허</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => handleCardClick("/filing?tab=attorney-review")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">검토 대기</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{attorneyDashboardData.caseload.attorneyReview}</div>
            <p className="text-xs text-muted-foreground">변호사 검토 필요</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => handleCardClick("/filing?tab=uspto-filing")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">출원 진행</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{attorneyDashboardData.caseload.usptoFiling}</div>
            <p className="text-xs text-muted-foreground">USPTO 출원 중</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => handleCardClick("/filing?tab=oa-response")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OA 대응</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{attorneyDashboardData.caseload.oaResponse}</div>
            <p className="text-xs text-muted-foreground">Office Action 대응</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => handleCardClick("/filing?tab=uspto-registration")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">등록 완료</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{attorneyDashboardData.caseload.registered}</div>
            <p className="text-xs text-muted-foreground">USPTO 등록</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 긴급 케이스 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>긴급 케이스</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCardClick("/filing?filter=urgent")}
                className="text-red-600 hover:text-red-700"
              >
                전체보기 <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <CardDescription>마감일이 임박한 케이스</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attorneyDashboardData.urgentCases.map((case_) => (
                <div
                  key={case_.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => handleCardClick(`/filing/${case_.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-sm">{case_.patentTitle}</p>
                      <Badge variant="outline" className={getPriorityColor(case_.priority)}>
                        {case_.type}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{case_.deadline}</span>
                      </div>
                      <span className={`text-xs font-medium ${getPriorityColor(case_.priority)}`}>
                        D-{case_.daysLeft}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 최근 출원 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>최근 출원</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCardClick("/filing?tab=uspto-filing")}
                className="text-blue-600 hover:text-blue-700"
              >
                전체보기 <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <CardDescription>최근 USPTO 출원 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attorneyDashboardData.recentFilings.map((filing) => (
                <div
                  key={filing.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => handleCardClick(`/filing/${filing.id}`)}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{filing.patentTitle}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500 font-mono">{filing.applicationNumber}</span>
                      <span className="text-xs text-gray-500">{filing.filedDate}</span>
                    </div>
                  </div>
                  <Badge variant={filing.status === "Filed" ? "default" : "secondary"}>{filing.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 월간 통계 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span>이번 달 성과</span>
          </CardTitle>
          <CardDescription>월간 업무 성과 및 수익 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{attorneyDashboardData.monthlyStats.filings}</div>
              <p className="text-sm text-gray-600">출원 건수</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{attorneyDashboardData.monthlyStats.oaResponses}</div>
              <p className="text-sm text-gray-600">OA 대응</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {attorneyDashboardData.monthlyStats.registrations}
              </div>
              <p className="text-sm text-gray-600">등록 완료</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${attorneyDashboardData.monthlyStats.revenue.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">수임료</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 빠른 액션 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
          <CardDescription>자주 사용하는 법무 업무에 빠르게 접근하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => handleCardClick("/filing?tab=attorney-review")}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">서류 검토</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => handleCardClick("/filing?tab=uspto-filing")}
            >
              <Scale className="h-6 w-6" />
              <span className="text-sm">USPTO 출원</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => handleCardClick("/filing?tab=oa-response")}
            >
              <AlertTriangle className="h-6 w-6" />
              <span className="text-sm">OA 대응</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => handleCardClick("/costs")}
            >
              <DollarSign className="h-6 w-6" />
              <span className="text-sm">비용 관리</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
