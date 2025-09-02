"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FileText, Clock, CheckCircle, AlertTriangle, Eye, MessageSquare, ExternalLink } from "lucide-react"
import { useBasePathRouter } from "@/lib/func"

// 발명자 전용 대시보드 데이터
const inventorDashboardData = {
  myPatents: {
    total: 8,
    translating: 2,
    reviewPending: 3,
    completed: 3,
  },
  pendingReviews: [
    {
      id: "rev001",
      patentTitle: "AI 기반 영상 인식 시스템",
      translationProgress: 100,
      requestedAt: "2024-01-16",
      urgent: true,
    },
    {
      id: "rev002",
      patentTitle: "친환경 배터리 소재 조성물",
      translationProgress: 85,
      requestedAt: "2024-01-15",
      urgent: false,
    },
  ],
  recentActivity: [
    {
      id: "act001",
      type: "review_completed",
      patentTitle: "스마트 IoT 센서 네트워크",
      timestamp: "2시간 전",
    },
    {
      id: "act002",
      type: "translation_ready",
      patentTitle: "바이오 의료기기 제어 방법",
      timestamp: "5시간 전",
    },
  ],
}

export function InventorDashboard() {
  const router = useBasePathRouter()

  const handleCardClick = (path: string) => {
    router.push(path)
  }

  return (
    <div className="space-y-8">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">발명자 대시보드</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">내 특허 현황 및 검토 요청 사항</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => handleCardClick("/patents?filter=my")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">내 특허</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventorDashboardData.myPatents.total}</div>
            <p className="text-xs text-muted-foreground">발명자로 등록된 특허</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => handleCardClick("/translations?filter=pending-review")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">검토 대기</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{inventorDashboardData.myPatents.reviewPending}</div>
            <p className="text-xs text-muted-foreground">번역 검토 요청</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => handleCardClick("/translations?filter=in-progress")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">번역 진행중</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inventorDashboardData.myPatents.translating}</div>
            <p className="text-xs text-muted-foreground">번역 작업 중</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => handleCardClick("/patents?filter=completed")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료된 특허</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{inventorDashboardData.myPatents.completed}</div>
            <p className="text-xs text-muted-foreground">검토 완료</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 검토 요청 목록 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-orange-600" />
                <span>검토 요청</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCardClick("/translations?tab=reviews")}
                className="text-orange-600 hover:text-orange-700"
              >
                전체보기 <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <CardDescription>번역 검토가 필요한 특허 목록</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inventorDashboardData.pendingReviews.map((review) => (
                <div
                  key={review.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => handleCardClick(`/translations/${review.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-sm">{review.patentTitle}</p>
                      {review.urgent && <AlertTriangle className="h-3 w-3 text-red-500" />}
                    </div>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">번역 진행률:</span>
                        <Progress value={review.translationProgress} className="w-16 h-2" />
                        <span className="text-xs text-gray-500">{review.translationProgress}%</span>
                      </div>
                      <span className="text-xs text-gray-400">{review.requestedAt}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 최근 활동 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span>최근 활동</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCardClick("/patents")}
                className="text-blue-600 hover:text-blue-700"
              >
                전체보기 <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <CardDescription>내 특허 관련 최근 활동 내역</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inventorDashboardData.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="flex-shrink-0">
                    {activity.type === "review_completed" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.patentTitle}</p>
                    <p className="text-xs text-gray-500">
                      {activity.type === "review_completed" ? "검토가 완료되었습니다" : "번역 검토가 요청되었습니다"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{activity.timestamp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 빠른 액션 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
          <CardDescription>자주 사용하는 기능에 빠르게 접근하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => handleCardClick("/translations?tab=reviews")}
            >
              <MessageSquare className="h-6 w-6" />
              <span className="text-sm">번역 검토</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => handleCardClick("/patents?filter=my")}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">내 특허</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => handleCardClick("/documents")}
            >
              <Eye className="h-6 w-6" />
              <span className="text-sm">서류 확인</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => handleCardClick("/filing")}
            >
              <ExternalLink className="h-6 w-6" />
              <span className="text-sm">출원 현황</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
