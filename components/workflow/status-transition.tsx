"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ChevronRight, Check, ArrowLeft, MessageSquare, AlertTriangle } from "lucide-react"
import { getStatusLabel, getNextStatus, canTransitionStatus } from "@/lib/status-config"
import type { PatentStatus } from "@/lib/types"

interface StatusTransitionProps {
  currentStatus: PatentStatus
  patentId: string
  onStatusChange: (newStatus: PatentStatus, comment?: string) => void
  userRole: string
  canEdit: boolean
}

const statusFlow = [
  { key: "NO_PROGRESS", label: "번역대기", color: "bg-gray-100 text-gray-800" },
  { key: "TRANSLATING", label: "번역검토", color: "bg-blue-100 text-blue-800" },
  { key: "TRANSLATION_REVIEW", label: "번역 검토", color: "bg-yellow-100 text-yellow-800" },
  { key: "DOCUMENT_PREP", label: "번역완료", color: "bg-green-100 text-green-800" },
  { key: "ATTORNEY_REVIEW", label: "서류완료", color: "bg-orange-100 text-orange-800" },
  { key: "USPTO_FILING", label: "출원완료", color: "bg-indigo-100 text-indigo-800" },
  { key: "OA_RESPONSE", label: "OA 대응", color: "bg-red-100 text-red-800" },
  { key: "USPTO_REGISTERED", label: "USPTO 등록", color: "bg-purple-100 text-purple-800" },
]

// 역할별 접근 가능한 상태 정의
const roleAccessibleSteps = {
  PATENT_MANAGER: statusFlow.map((s) => s.key), // 모든 단계
  INVENTOR: ["TRANSLATING"], // 번역검토만
  US_ATTORNEY: ["ATTORNEY_REVIEW", "USPTO_FILING"], // 법무 관련
  EXTERNAL_REVIEWER: ["TRANSLATING"], // 번역 작업만
}

export function StatusTransition({
  currentStatus,
  patentId,
  onStatusChange,
  userRole,
  canEdit,
}: StatusTransitionProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [targetStatus, setTargetStatus] = useState<PatentStatus | "">("")
  const [comment, setComment] = useState("")
  const [isReverting, setIsReverting] = useState(false)

  const currentIndex = statusFlow.findIndex((s) => s.key === currentStatus)
  const nextStatus = getNextStatus(currentStatus)
  const prevStatus = currentIndex > 0 ? (statusFlow[currentIndex - 1].key as PatentStatus) : null

  const accessibleSteps = roleAccessibleSteps[userRole as keyof typeof roleAccessibleSteps] || []

  const canMoveToNext = nextStatus && (userRole === "PATENT_MANAGER" || accessibleSteps.includes(nextStatus))

  const canRevert = prevStatus && canEdit && canTransitionStatus(currentStatus, prevStatus)

  const handleStatusTransition = (newStatus: PatentStatus, revert = false) => {
    setTargetStatus(newStatus)
    setIsReverting(revert)
    setShowConfirmDialog(true)
  }

  const confirmStatusChange = () => {
    if (targetStatus) {
      onStatusChange(targetStatus as PatentStatus, comment.trim() || undefined)
      setShowConfirmDialog(false)
      setComment("")
      setTargetStatus("")
      setIsReverting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>진행 상태</span>
          <Badge className={statusFlow[currentIndex]?.color}>{getStatusLabel(currentStatus, "translation")}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 상태 진행 바 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {statusFlow.map((status, index) => (
              <div key={status.key} className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentIndex ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {index < currentIndex ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className="text-xs mt-1 text-center">{status.label}</span>
              </div>
            ))}
          </div>
          <div className="relative">
            <div className="absolute top-0 left-0 h-1 bg-gray-200 w-full rounded"></div>
            <div
              className="absolute top-0 left-0 h-1 bg-blue-600 rounded transition-all duration-300"
              style={{ width: `${(currentIndex / (statusFlow.length - 1)) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center justify-between">
          <div>
            {canRevert && prevStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusTransition(prevStatus, true)}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>이전 단계로</span>
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!canEdit && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <AlertTriangle className="h-4 w-4" />
                <span>상태 변경 권한이 없습니다</span>
              </div>
            )}

            {canMoveToNext && canEdit && nextStatus && (
              <Button onClick={() => handleStatusTransition(nextStatus)} className="flex items-center space-x-2">
                <span>{getStatusLabel(nextStatus, "translation")} 완료</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 현재 단계 안내 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">현재 단계: {getStatusLabel(currentStatus, "translation")}</p>
              <p className="text-blue-700 mt-1">{getStepDescription(currentStatus, userRole)}</p>
            </div>
          </div>
        </div>
      </CardContent>

      {/* 상태 변경 확인 다이얼로그 */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isReverting ? "이전 단계로 되돌리기" : "다음 단계로 진행"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span>현재:</span>
              <Badge className={statusFlow[currentIndex]?.color}>{getStatusLabel(currentStatus, "translation")}</Badge>
              <ChevronRight className="h-4 w-4" />
              <span>변경:</span>
              <Badge className={statusFlow.find((s) => s.key === targetStatus)?.color}>
                {targetStatus ? getStatusLabel(targetStatus as PatentStatus, "translation") : ""}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">코멘트 (선택사항)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="상태 변경에 대한 코멘트를 입력하세요..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              취소
            </Button>
            <Button onClick={confirmStatusChange}>{isReverting ? "되돌리기" : "진행하기"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function getStepDescription(status: PatentStatus, userRole: string): string {
  const descriptions = {
    NO_PROGRESS: "새 특허가 등록되었습니다. 번역 작업을 시작할 수 있습니다.",
    TRANSLATING: "번역 작업이 진행 중입니다. 번역이 완료되면 다음 단계로 진행하세요.",
    TRANSLATION_REVIEW: "번역이 완료되었습니다. 번역 내용을 검토해주세요.",
    DOCUMENT_PREP: "번역이 완료되었습니다. 필수 서류를 준비해주세요.",
    ATTORNEY_REVIEW: "서류 준비가 완료되었습니다. USPTO 출원을 진행합니다.",
    USPTO_FILING: "USPTO 출원이 완료되었습니다. 축하합니다!",
    OA_RESPONSE: "OA(Office Action)가 발행되었습니다. 대응이 필요합니다.",
    USPTO_REGISTERED: "USPTO 등록이 완료되었습니다. 특허가 성공적으로 등록되었습니다!",
  }

  return descriptions[status] || "진행 상황을 확인하세요."
}
