"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface Patent {
  id: string
  patentName: string
  managementNumber: string
  inventor: string
}

interface PatentSelectorProps {
  onSelect: (patent: Patent | null) => void
  initialPatent?: Patent | null
}

const PatentSelector: React.FC<PatentSelectorProps> = ({ onSelect, initialPatent }) => {
  const [open, setOpen] = useState(false)
  const [patents, setPatents] = useState<Patent[]>([
    { id: "1", patentName: "특허 A", managementNumber: "MN001", inventor: "홍길동" },
    { id: "2", patentName: "특허 B", managementNumber: "MN002", inventor: "김철수" },
    { id: "3", patentName: "특허 C", managementNumber: "MN003", inventor: "이영희" },
    { id: "4", patentName: "특허 D", managementNumber: "MN004", inventor: "박지성" },
  ])
  const [value, setValue] = useState<Patent | null>(initialPatent || null)

  useEffect(() => {
    if (initialPatent) {
      setValue(initialPatent)
    }
  }, [initialPatent])

  const onValueChange = useCallback(
    (patent: Patent | null) => {
      setValue(patent)
      onSelect(patent)
      setOpen(false)
    },
    [onSelect],
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {value?.patentName || "특허 선택"}
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="특허명, 관리번호, 발명자로 검색..." />
        <CommandList>
          <CommandEmpty>특허를 찾을 수 없습니다.</CommandEmpty>
          <CommandGroup heading="특허 목록">
            {patents.map((patent) => (
              <CommandItem key={patent.id} value={patent.patentName} onSelect={() => onValueChange(patent)}>
                {patent.patentName} ({patent.managementNumber}, {patent.inventor})
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

export default PatentSelector
