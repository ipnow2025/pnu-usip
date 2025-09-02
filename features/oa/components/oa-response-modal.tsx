"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, FileText, Clock, CheckCircle } from "lucide-react"

interface OAResponseModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (oaData: any) => void
  patentId?: string
  oaResponse?: any
}

export function OAResponseModal({ isOpen, onClose, onSubmit, patentId, oaResponse }: OAResponseModalProps) {
  const [formData, setFormData] = useState({
    oaNumber: oaResponse?.oaNumber || "",
    receivedDate: oaResponse?.receivedDate || "",
    responseDeadline: oaResponse?.responseDeadline || "",
    oaType: oaResponse?.oaType || "",
    rejectedClaims: oaResponse?.rejectedClaims || "",
    oaContent: oaResponse?.oaContent || "",
    responseStrategy: oaResponse?.responseStrategy || "",
    responseContent: oaResponse?.responseContent || "",
    status: oaResponse?.status || "RECEIVED",
    handlerId: oaResponse?.handlerId || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      patentId,
    })
    onClose()
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const calculateDaysLeft = (deadline: string) => {
    if (!deadline) return null
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysLeft = calculateDaysLeft(formData.responseDeadline)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>{oaResponse ? "OA 대응 수정" : "새 OA 등록"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <Tabs defaultValue="oa-info" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="oa-info">OA 정보</TabsTrigger>
              <TabsTrigger value="analysis">분석 및 전략</TabsTrigger>
              <TabsTrigger value="response">대응 내용</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 mt-4">
              <TabsContent value="oa-info" className="h-full m-0">
                <ScrollArea className="h-full">
                  <form onSubmit={handleSubmit} className="space-y-6 pr-4">
                    {/* OA 기본 정보 */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Office Action 기본 정보</CardTitle>
                        <CardDescription>USPTO로부터 받은 OA의 기본 정보를 입력하세요.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="oaNumber">OA 번호 *</Label>
                            <Input
                              id="oaNumber"
                              value={formData.oaNumber}
                              onChange={(e) => handleInputChange("oaNumber", e.target.value)}
                              placeholder="예: OA-2024-001"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="oaType">OA 유형</Label>
                            <Select
                              value={formData.oaType}
                              onValueChange={(value) => handleInputChange("oaType", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="OA 유형을 선택하세요" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NON_FINAL">Non-Final Rejection</SelectItem>
                                <SelectItem value="FINAL">Final Rejection</SelectItem>
                                <SelectItem value="RESTRICTION">Restriction Requirement</SelectItem>
                                <SelectItem value="ALLOWANCE">Notice of Allowance</SelectItem>
                                <SelectItem value="OTHER">기타</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="receivedDate">수신일 *</Label>
                            <Input
                              id="receivedDate"
                              type="date"
                              value={formData.receivedDate}
                              onChange={(e) => handleInputChange("receivedDate", e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="responseDeadline">응답 마감일 *</Label>
                            <Input
                              id="responseDeadline"
                              type="date"
                              value={formData.responseDeadline}
                              onChange={(e) => handleInputChange("responseDeadline", e.target.value)}
                              required
                            />
                            {daysLeft !== null && (
                              <div
                                className={`text-sm flex items-center space-x-1 ${
                                  daysLeft < 30 ? "text-red-600" : daysLeft < 60 ? "text-yellow-600" : "text-green-600"
                                }`}
                              >
                                <Clock className="h-4 w-4" />
                                <span>{daysLeft > 0 ? `${daysLeft}일 남음` : `${Math.abs(daysLeft)}일 지연`}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="rejectedClaims">거절된 청구항</Label>
                          <Input
                            id="rejectedClaims"
                            value={formData.rejectedClaims}
                            onChange={(e) => handleInputChange("rejectedClaims", e.target.value)}
                            placeholder="예: Claims 1-5, 8-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="oaContent">OA 내용</Label>
                          <Textarea
                            id="oaContent"
                            value={formData.oaContent}
                            onChange={(e) => handleInputChange("oaContent", e.target.value)}
                            placeholder="Office Action의 주요 내용을 입력하세요..."
                            rows={6}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </form>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="analysis" className="h-full m-0">
                <ScrollArea className="h-full">
                  <Card>
                    <CardHeader>
                      <CardTitle>OA 분석 및 대응 전략</CardTitle>
                      <CardDescription>Office Action에 대한 분석과 대응 전략을 수립하세요.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="responseStrategy">대응 전략</Label>
                        <Textarea
                          id="responseStrategy"
                          value={formData.responseStrategy}
                          onChange={(e) => handleInputChange("responseStrategy", e.target.value)}
                          placeholder="OA에 대한 대응 전략을 상세히 기술하세요..."
                          rows={8}
                        />
                      </div>

                      {/* OA 분석 도구 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border-blue-200 bg-blue-50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">거절 이유 분석</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>신규성 (35 U.S.C. 102)</span>
                                <Badge variant="outline">해당</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span>진보성 (35 U.S.C. 103)</span>
                                <Badge variant="outline">해당</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span>명세서 기재 (35 U.S.C. 112)</span>
                                <Badge variant="secondary">미해당</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span>이중 특허</span>
                                <Badge variant="secondary">미해당</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-green-200 bg-green-50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">대응 옵션</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="amend-claims" />
                                <label htmlFor="amend-claims">청구항 보정</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="add-claims" />
                                <label htmlFor="add-claims">청구항 추가</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="argument" />
                                <label htmlFor="argument">논증 제출</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="interview" />
                                <label htmlFor="interview">심사관 면담</label>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="response" className="h-full m-0">
                <ScrollArea className="h-full">
                  <Card>
                    <CardHeader>
                      <CardTitle>대응 내용 작성</CardTitle>
                      <CardDescription>Office Action에 대한 구체적인 대응 내용을 작성하세요.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="handlerId">담당 변호사</Label>
                          <Select
                            value={formData.handlerId}
                            onValueChange={(value) => handleInputChange("handlerId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="담당 변호사를 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="attorney001">John Smith (AGORA LLC)</SelectItem>
                              <SelectItem value="attorney002">Sarah Johnson (AGORA LLC)</SelectItem>
                              <SelectItem value="attorney003">Michael Brown (AGORA LLC)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="status">처리 상태</Label>
                          <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RECEIVED">수신됨</SelectItem>
                              <SelectItem value="IN_PROGRESS">진행중</SelectItem>
                              <SelectItem value="RESPONDED">응답완료</SelectItem>
                              <SelectItem value="FINAL">최종</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="responseContent">대응서 내용</Label>
                        <Textarea
                          id="responseContent"
                          value={formData.responseContent}
                          onChange={(e) => handleInputChange("responseContent", e.target.value)}
                          placeholder="Office Action에 대한 상세한 대응 내용을 작성하세요..."
                          rows={12}
                          className="font-mono text-sm"
                        />
                      </div>

                      {/* 대응 히스토리 */}
                      <Card className="border-gray-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">대응 히스토리</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-start space-x-3 p-3 border rounded">
                              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <span className="font-medium text-sm">첫 번째 OA 대응 완료</span>
                                  <span className="text-xs text-gray-500">2024-01-10</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">청구항 1-3 보정 및 진보성 논증 제출</p>
                              </div>
                            </div>

                            <div className="flex items-start space-x-3 p-3 border rounded bg-yellow-50">
                              <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <span className="font-medium text-sm">Final OA 수신</span>
                                  <span className="text-xs text-gray-500">2024-01-15</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  추가 거절 이유 제시, RCE 또는 Appeal 검토 필요
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="button" variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            템플릿 사용
          </Button>
          <Button onClick={handleSubmit}>{oaResponse ? "수정" : "등록"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
