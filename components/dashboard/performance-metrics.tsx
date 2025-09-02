"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown } from "lucide-react"

interface PerformanceMetricsProps {
  data: {
    current: number
    previous: number
    target: number
    label: string
    icon: React.ReactNode
    color: string
  }[]
}

export function PerformanceMetrics({ data }: PerformanceMetricsProps) {
  const getPerformanceChange = (current: number, previous: number) => {
    if (previous === 0) return { value: "0", isPositive: true }
    const change = ((current - previous) / previous) * 100
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change >= 0,
    }
  }

  const getTargetStatus = (current: number, target: number) => {
    const percentage = (current / target) * 100
    if (percentage >= 100) return { status: "달성", color: "text-green-600" }
    if (percentage >= 80) return { status: "양호", color: "text-blue-600" }
    if (percentage >= 60) return { status: "주의", color: "text-orange-600" }
    return { status: "위험", color: "text-red-600" }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {data.map((metric, index) => {
        const change = getPerformanceChange(metric.current, metric.previous)
        const targetStatus = getTargetStatus(metric.current, metric.target)

        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.current}</div>

              {/* 전월 대비 변화 */}
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {change.isPositive ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
                )}
                <span className={change.isPositive ? "text-green-600" : "text-red-600"}>{change.value}%</span>
                <span className="ml-1">vs 지난달</span>
              </div>

              {/* 목표 대비 진행률 */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>목표 달성률</span>
                  <span className={targetStatus.color}>{targetStatus.status}</span>
                </div>
                <Progress value={(metric.current / metric.target) * 100} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">목표: {metric.target}건</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
