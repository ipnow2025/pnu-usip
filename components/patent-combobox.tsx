"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { filterAccessiblePatents } from "@/lib/permissions"

interface Patent {
  id: string
  managementNumber: string
  title: string
  status: string
  inventor: string
  applicationNumber?: string
}

interface PatentComboboxProps {
  patents: Patent[]
  selectedPatentId?: string | null
  onPatentSelect: (patentId: string | null) => void
  placeholder?: string
}

export function PatentCombobox({
  patents,
  selectedPatentId,
  onPatentSelect,
  placeholder = "특허를 선택하세요...",
}: PatentComboboxProps) {
  const [open, setOpen] = useState(false)

  // 권한에 따라 접근 가능한 특허만 필터링
  const accessiblePatents = filterAccessiblePatents(patents)

  const selectedPatent = accessiblePatents.find((p) => p.id === selectedPatentId)

  const handleSelect = (patentId: string) => {
    if (patentId === selectedPatentId) {
      onPatentSelect(null)
    } else {
      onPatentSelect(patentId)
    }
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">특허 선택</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[40px] p-3"
          >
            {selectedPatent ? (
              <div className="flex items-center space-x-2 truncate text-left">
                <span className="font-medium">{selectedPatent.managementNumber}</span>
                <span className="text-gray-500">-</span>
                <span className="truncate">{selectedPatent.title}</span>
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
          <Command>
            <CommandInput placeholder="특허명, 관리번호, 발명자, 출원번호로 검색..." />
            <CommandList>
              <CommandEmpty>
                {accessiblePatents.length === 0 ? "접근 가능한 특허가 없습니다." : "검색 결과가 없습니다."}
              </CommandEmpty>
              <CommandGroup>
                {/* 선택 해제 옵션 */}
                <CommandItem onSelect={() => handleSelect("")}>
                  <Check className={cn("mr-2 h-4 w-4", !selectedPatentId ? "opacity-100" : "opacity-0")} />
                  <span className="text-gray-500">선택 해제</span>
                </CommandItem>

                {/* 특허 목록 */}
                {accessiblePatents.map((patent) => (
                  <CommandItem key={patent.id} onSelect={() => handleSelect(patent.id)}>
                    <Check
                      className={cn("mr-2 h-4 w-4", selectedPatentId === patent.id ? "opacity-100" : "opacity-0")}
                    />
                    <div className="flex flex-col space-y-1 flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{patent.managementNumber}</span>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">{patent.status}</span>
                      </div>
                      <div className="text-sm truncate">{patent.title}</div>
                      <div className="text-xs text-gray-500">
                        발명자: {patent.inventor}
                        {patent.applicationNumber && ` | 출원번호: ${patent.applicationNumber}`}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* 선택된 특허 정보 표시 */}
      {selectedPatent && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">현재 선택된 특허</h3>
              <p className="text-sm text-blue-700">
                {selectedPatent.managementNumber} - {selectedPatent.title}
              </p>
              <p className="text-xs text-blue-600">
                발명자: {selectedPatent.inventor}
                {selectedPatent.applicationNumber && ` | 출원번호: ${selectedPatent.applicationNumber}`}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {selectedPatent.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 접근 가능한 특허가 없는 경우 */}
      {accessiblePatents.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">접근 가능한 특허가 없습니다.</p>
        </div>
      )}
    </div>
  )
}
