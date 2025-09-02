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
import { Plus, X, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/func"
import { patentsApi, type PriorityPatentData } from "@/lib/api/patents"

interface PriorityPatentModalProps {
  isOpen: boolean
  onClose: () => void
  patentId: string
  initialEditingPatent?: PriorityPatentData | null
}

export function PriorityPatentModal({ isOpen, onClose, patentId, initialEditingPatent }: PriorityPatentModalProps) {
  const [priorityPatents, setPriorityPatents] = useState<PriorityPatentData[]>([])
  const [loading, setLoading] = useState(false)
  const [editingPatent, setEditingPatent] = useState<PriorityPatentData | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState<PriorityPatentData>({
    title: "",
    applicationNumber: "",
    filingDate: "",
    inventors: [""]
  })

  // 우선권 특허 목록 로드
  const loadPriorityPatents = async () => {
    try {
      setLoading(true)
      const data = await patentsApi.getPriorityPatents(patentId)
      setPriorityPatents(data)
    } catch (error) {
      console.error('우선권 특허 로드 오류:', error)
      toast.error('우선권 특허 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      title: "",
      applicationNumber: "",
      filingDate: "",
      inventors: [""]
    })
    setEditingPatent(null)
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('우선권 특허 제목을 입력해주세요.')
      return
    }

    try {
      if (editingPatent?.id) {
        // 수정
        await patentsApi.updatePriorityPatent(patentId, editingPatent.id, formData)
        toast.success('우선권 특허가 수정되었습니다.')
      } else {
        // 생성
        await patentsApi.createPriorityPatent(patentId, formData)
        toast.success('우선권 특허가 추가되었습니다.')
      }

      setIsFormOpen(false)
      resetForm()
      loadPriorityPatents()
    } catch (error) {
      console.error('우선권 특허 저장 오류:', error)
      toast.error('우선권 특허 저장에 실패했습니다.')
    }
  }

  // 수정 모드 시작
  const handleEdit = (patent: PriorityPatentData) => {
    setEditingPatent(patent)
    setFormData({
      title: patent.title,
      applicationNumber: patent.applicationNumber || "",
      filingDate: patent.filingDate || "",
      inventors: patent.inventors.length > 0 ? patent.inventors : [""]
    })
    setIsFormOpen(true)
  }

  // 삭제
  const handleDelete = async (patent: PriorityPatentData) => {
    if (!patent.id) return

    if (!confirm('이 우선권 특허를 삭제하시겠습니까?')) return

    try {
      await patentsApi.deletePriorityPatent(patentId, patent.id)
      toast.success('우선권 특허가 삭제되었습니다.')
      loadPriorityPatents()
    } catch (error) {
      console.error('우선권 특허 삭제 오류:', error)
      toast.error('우선권 특허 삭제에 실패했습니다.')
    }
  }

  // 발명자 추가/제거
  const addInventor = () => {
    setFormData(prev => ({
      ...prev,
      inventors: [...prev.inventors, ""]
    }))
  }

  const removeInventor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      inventors: prev.inventors.filter((_, i) => i !== index)
    }))
  }

  const updateInventor = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      inventors: prev.inventors.map((inv, i) => i === index ? value : inv)
    }))
  }

  useEffect(() => {
    if (isOpen) {
      loadPriorityPatents()
      
      // initialEditingPatent가 전달된 경우 편집 모드로 시작
      if (initialEditingPatent) {
        setEditingPatent(initialEditingPatent)
        setFormData({
          title: initialEditingPatent.title,
          applicationNumber: initialEditingPatent.applicationNumber || "",
          filingDate: initialEditingPatent.filingDate || "",
          inventors: initialEditingPatent.inventors.length > 0 ? initialEditingPatent.inventors : [""]
        })
        setIsFormOpen(true)
      } else {
        // 새로운 추가 모드인 경우 폼 초기화
        resetForm()
        setIsFormOpen(false)
      }
    }
  }, [isOpen, patentId, initialEditingPatent])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>우선권 특허 관리</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <ScrollArea className="h-full w-full pr-4">
            <div className="space-y-4">
              {/* 우선권 특허 목록 */}
              <Card>
                <CardHeader>
                  <CardTitle>우선권 특허 목록</CardTitle>
                  <CardDescription>이 특허의 우선권을 주장하는 특허들을 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">로딩 중...</p>
                    </div>
                  ) : priorityPatents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>등록된 우선권 특허가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {priorityPatents.map((patent) => (
                        <div key={patent.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{patent.title}</h4>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(patent)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(patent)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">출원번호:</span> {patent.applicationNumber || "미정"}
                            </div>
                            <div>
                              <span className="font-medium">출원일:</span> {patent.filingDate ? formatDate(patent.filingDate) : "미정"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 우선권 특허 추가/수정 폼 */}
              {isFormOpen && (
                <Card>
                  <CardHeader>
                    <CardTitle>{editingPatent ? "우선권 특허 수정" : "우선권 특허 추가"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">우선권 특허 제목 *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="우선권 특허의 제목을 입력하세요"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="applicationNumber">출원번호</Label>
                          <Input
                            id="applicationNumber"
                            value={formData.applicationNumber}
                            onChange={(e) => setFormData(prev => ({ ...prev, applicationNumber: e.target.value }))}
                            placeholder="10-2024-0001234"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="filingDate">출원일</Label>
                          <Input
                            id="filingDate"
                            type="date"
                            value={formData.filingDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, filingDate: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>발명자</Label>
                        {formData.inventors.map((inventor, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Input
                              value={inventor}
                              onChange={(e) => updateInventor(index, e.target.value)}
                              placeholder={`발명자 ${index + 1}`}
                            />
                            {formData.inventors.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeInventor(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
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

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsFormOpen(false)
                            resetForm()
                          }}
                        >
                          취소
                        </Button>
                        <Button type="submit">
                          {editingPatent ? "수정" : "추가"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsFormOpen(true)
              resetForm()
            }}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>우선권 특허 추가</span>
          </Button>
          <Button onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 