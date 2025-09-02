"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Bell, User, Settings } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logout } from "@/lib/func"
import { getCurrentUserRole } from "@/lib/permissions"
import { roleLabels } from "@/lib/permissions"

export function Header() {
  const [currentRole, setCurrentRole] = useState("")

  useEffect(() => {
    setCurrentRole(getCurrentUserRole())
  }, [])

  const handleRoleChange = (newRole: string) => {
    // localStorage에 새 역할 저장
    const member = JSON.parse(localStorage.getItem("member") || "{}")
    member.role = newRole
    localStorage.setItem("member", JSON.stringify(member))

    setCurrentRole(newRole)
    // 페이지 새로고침으로 변경사항 반영
    window.location.reload()
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">특허관리시스템</h2>
        </div>

        <div className="flex items-center space-x-4">
          {/* 알림 */}
          {/* <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </Button> */}

          {/* 테마 토글 */}
          {/* <ThemeToggle /> */}

          {/* 사용자 메뉴 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>관리자</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-900">
              <DropdownMenuItem onClick={logout} className="text-red-600">
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
