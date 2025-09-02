"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Languages, FileText, Clock, CheckCircle, ExternalLink, Target } from "lucide-react"
import { useBasePathRouter } from "@/lib/func"

// 외부검토자 전용 대시보드 데이터
const reviewerDashboardData = {
  assignments: {
    total: 12,
    pending: 3,
    inProgress: 4,
    completed: 5,
  },
  currentTasks: [
    {
      id: "task001",
      patentTitle: "AI 기반 영상 인식 시스템",
      type: "Translation",
      progress: 75,
      deadline: "2024-02-10",
      daysLeft: 7,
      priority: "high",
    },
    {
      id: "task002",
      patentTitle: "친환경 배터리 소재",
      type: "Review",
      progress: 30,
      deadline: "2024-02-15",
      daysLeft: 12,
      priority: "medium",
    },
  ],
  weeklyStats: {
    translationsCompleted: 8,
    reviewsCompleted: 5,
    averageQuality: 4.8,
    onTimeDelivery: 95,
  },
}

export function ExternalReviewerDashboard() {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">검토자 대시보드</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">할당된 번역 및 검토 업무 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => handleCardClick("/translations?filter=assigned")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">할당된 작업</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewerDashboardData.assignments.total}</div>
            <p className="text-xs text-muted-foreground">총 할당 작업</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => handleCardClick("/translations?filter=pending")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대기 중</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{reviewerDashboardData.assignments.pending}</div>
            <p className="text-xs text-muted-foreground">시작 대기</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => handleCardClick("/translations?filter=in-progress")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">진행 중</CardTitle>
            <Languages className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{reviewerDashboardData.assignments.inProgress}</div>
            <p className="text-xs text-muted-foreground">작업 진행 중</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => handleCardClick("/translations?filter=completed")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{reviewerDashboardData.assignments.completed}</div>
            <p className="text-xs text-muted-foreground">완료된 작업</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 현재 작업 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Languages className="h-5 w-5 text-blue-600" />
                <span>현재 작업</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCardClick("/translations?filter=my-tasks")}
                className="text-blue-600 hover:text-blue-700"
              >
                전체보기 <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <CardDescription>진행 중인 번역 및 검토 작업</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reviewerDashboardData.currentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => handleCardClick(`/translations/${task.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-sm">{task.patentTitle}</p>
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.type}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">진행률:</span>
                        <Progress value={task.progress} className="w-16 h-2" />
                        <span className="text-xs text-gray-500">{task.progress}%</span>
                      </div>
                      <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        D-{task.daysLeft}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 주간 성과 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>주간 성과</span>
            </CardTitle>
            <CardDescription>이번 주 작업 성과 및 품질 지표</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {reviewerDashboardData.weeklyStats.translationsCompleted}
                </div>
                <p className="text-sm text-gray-600">번역 완료</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {reviewerDashboardData.weeklyStats.reviewsCompleted}
                </div>
                <p className="text-sm text-gray-600">검토 완료</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {reviewerDashboardData.weeklyStats.averageQuality}
                </div>
                <p className="text-sm text-gray-600">평균 품질</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {reviewerDashboardData.weeklyStats.onTimeDelivery}%
                </div>
                <p className="text-sm text-gray-600">정시 완료율</p>
              </div>
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
              onClick={() => handleCardClick("/translations?filter=pending")}
            >
              <Clock className="h-6 w-6" />
              <span className="text-sm">새 작업</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => handleCardClick("/translations?filter=in-progress")}
            >
              <Languages className="h-6 w-6" />
              <span className="text-sm">진행 중 작업</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => handleCardClick("/translations?filter=completed")}
            >
              <CheckCircle className="h-6 w-6" />
              <span className="text-sm">완료된 작업</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col space-y-2"
              onClick={() => handleCardClick("/translations?tab=comparison")}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">번역 비교</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
