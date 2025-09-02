"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Clock, FileText, Scale } from "lucide-react"
import { useBasePathRouter } from "@/lib/func"

interface UrgentAlert {
  id: string
  type: "OA_DEADLINE" | "REVIEW_OVERDUE" | "FILING_DEADLINE" | "DOCUMENT_MISSING"
  title: string
  description: string
  daysLeft?: number
  priority: "CRITICAL" | "HIGH" | "MEDIUM"
  patentId: string
  actionUrl: string
}

interface UrgentAlertsProps {
  alerts: UrgentAlert[]
}

export function UrgentAlerts({ alerts }: UrgentAlertsProps) {
  const router = useBasePathRouter()

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "OA_DEADLINE":
        return <Clock className="h-4 w-4 text-red-600" />
      case "REVIEW_OVERDUE":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case "FILING_DEADLINE":
        return <Scale className="h-4 w-4 text-purple-600" />
      case "DOCUMENT_MISSING":
        return <FileText className="h-4 w-4 text-blue-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200"
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getDaysLeftColor = (daysLeft?: number) => {
    if (!daysLeft) return "text-gray-600"
    if (daysLeft < 0) return "text-red-600"
    if (daysLeft < 7) return "text-orange-600"
    return "text-green-600"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span>긴급 알림</span>
        </CardTitle>
        <CardDescription>즉시 조치가 필요한 항목들</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>긴급 처리가 필요한 항목이 없습니다.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${getPriorityColor(alert.priority)}`}
                onClick={() => router.push(alert.actionUrl)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2 flex-1">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs mt-1">{alert.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      {alert.priority}
                    </Badge>
                    {alert.daysLeft !== undefined && (
                      <div className={`text-xs font-bold ${getDaysLeftColor(alert.daysLeft)}`}>
                        {alert.daysLeft < 0 ? `${Math.abs(alert.daysLeft)}일 지연` : `D-${alert.daysLeft}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {alerts.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => router.push("/filing/uspto-status?tab=bottlenecks")}
            >
              모든 알림 보기
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
