"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Search, ChevronDown, ChevronUp, X, Star, Filter } from "lucide-react"
import { mockPatents } from "@/lib/mock-data"
import type { Patent } from "@/lib/types"

interface AdvancedPatentSearchProps {
  onSearchResults: (patents: Patent[]) => void
  onFavoriteToggle: (patentId: string) => void
  favorites: string[]
}

export function AdvancedPatentSearch({ onSearchResults, onFavoriteToggle, favorites }: AdvancedPatentSearchProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    status: "",
    inventor: "",
    year: "",
    pctFiled: "",
    usptoEligible: "",
  })
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  // 검색 실행
  const executeSearch = () => {
    let results = mockPatents

    // 텍스트 검색
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      results = results.filter(
        (patent) =>
          patent.title.toLowerCase().includes(term) ||
          patent.managementNumber.toLowerCase().includes(term) ||
          patent.inventors.some((inventor) => inventor.toLowerCase().includes(term)) ||
          patent.applicationNumber?.toLowerCase().includes(term),
      )
    }

    // 필터 적용
    if (filters.status) {
      results = results.filter((patent) => patent.status === filters.status)
    }

    if (filters.inventor) {
      results = results.filter((patent) =>
        patent.inventors.some((inventor) => inventor.toLowerCase().includes(filters.inventor.toLowerCase())),
      )
    }

    if (filters.year) {
      results = results.filter((patent) => patent.filingDate.startsWith(filters.year))
    }

    if (filters.pctFiled) {
      results = results.filter((patent) => patent.pctFiled === (filters.pctFiled === "true"))
    }

    if (filters.usptoEligible) {
      results = results.filter((patent) => patent.usptoEligible === (filters.usptoEligible === "true"))
    }

    onSearchResults(results)
    updateActiveFilters()
  }

  // 활성 필터 업데이트
  const updateActiveFilters = () => {
    const active: string[] = []
    if (searchTerm.trim()) active.push(`검색: "${searchTerm}"`)
    if (filters.status) active.push(`상태: ${getStatusLabel(filters.status)}`)
    if (filters.inventor) active.push(`발명자: ${filters.inventor}`)
    if (filters.year) active.push(`연도: ${filters.year}`)
    if (filters.pctFiled) active.push(`PCT: ${filters.pctFiled === "true" ? "출원" : "미출원"}`)
    if (filters.usptoEligible) active.push(`USPTO: ${filters.usptoEligible === "true" ? "가능" : "불가"}`)
    setActiveFilters(active)
  }

  // 필터 초기화
  const clearFilters = () => {
    setSearchTerm("")
    setFilters({
      status: "",
      inventor: "",
      year: "",
      pctFiled: "",
      usptoEligible: "",
    })
    setActiveFilters([])
    onSearchResults(mockPatents)
  }

  // 개별 필터 제거
  const removeFilter = (filterKey: string) => {
    if (filterKey === "searchTerm") {
      setSearchTerm("")
    } else {
      setFilters((prev) => ({ ...prev, [filterKey]: "" }))
    }
  }

  // 즐겨찾기 필터
  const showFavorites = () => {
    const favoritePatents = mockPatents.filter((patent) => favorites.includes(patent.id))
    onSearchResults(favoritePatents)
    setActiveFilters(["즐겨찾기"])
  }

  // 상태 라벨 변환
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      NO_PROGRESS: "진행 없음",
      TRANSLATING: "번역중",
      TRANSLATION_REVIEW: "번역검토",
      DOCUMENT_PREP: "서류준비",
      ATTORNEY_REVIEW: "변호사검토",
      USPTO_FILING: "USPTO출원",
      OA_RESPONSE: "OA대응",
      USPTO_REGISTERED: "USPTO등록",
    }
    return labels[status] || status
  }

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      executeSearch()
    }
  }

  useEffect(() => {
    executeSearch()
  }, [filters])

  // 초기 로드 시 전체 특허 표시
  useEffect(() => {
    onSearchResults(mockPatents)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>특허 검색</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={showFavorites} className="text-yellow-600">
              <Star className="h-4 w-4 mr-1" />
              즐겨찾기 ({favorites.length})
            </Button>
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  고급검색
                  {isAdvancedOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 기본 검색 */}
        <div className="flex space-x-2">
          <Input
            placeholder="특허명, 관리번호, 발명자, 출원번호로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={executeSearch}>
            <Search className="h-4 w-4 mr-2" />
            검색
          </Button>
        </div>

        {/* 고급 검색 옵션 */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-2 block">상태</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NO_PROGRESS">진행 없음</SelectItem>
                    <SelectItem value="TRANSLATING">번역중</SelectItem>
                    <SelectItem value="TRANSLATION_REVIEW">번역검토</SelectItem>
                    <SelectItem value="DOCUMENT_PREP">서류준비</SelectItem>
                    <SelectItem value="ATTORNEY_REVIEW">변호사검토</SelectItem>
                    <SelectItem value="USPTO_FILING">USPTO출원</SelectItem>
                    <SelectItem value="OA_RESPONSE">OA대응</SelectItem>
                    <SelectItem value="USPTO_REGISTERED">USPTO등록</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">발명자</label>
                <Input
                  placeholder="발명자명"
                  value={filters.inventor}
                  onChange={(e) => setFilters((prev) => ({ ...prev, inventor: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">출원연도</label>
                <Select
                  value={filters.year}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, year: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="연도 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2021">2021</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">PCT 출원</label>
                <Select
                  value={filters.pctFiled}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, pctFiled: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="PCT 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">출원</SelectItem>
                    <SelectItem value="false">미출원</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">USPTO 출원 가능</label>
                <Select
                  value={filters.usptoEligible}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, usptoEligible: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="USPTO 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">가능</SelectItem>
                    <SelectItem value="false">불가</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* 활성 필터 표시 */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500">활성 필터:</span>
            {activeFilters.map((filter, index) => (
              <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                <span>{filter}</span>
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={() => {
                    if (filter.startsWith("검색:")) removeFilter("searchTerm")
                    else if (filter.startsWith("상태:")) removeFilter("status")
                    else if (filter.startsWith("발명자:")) removeFilter("inventor")
                    else if (filter.startsWith("연도:")) removeFilter("year")
                    else if (filter.startsWith("PCT:")) removeFilter("pctFiled")
                    else if (filter.startsWith("USPTO:")) removeFilter("usptoEligible")
                  }}
                />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-600">
              <X className="h-4 w-4 mr-1" />
              전체 초기화
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
