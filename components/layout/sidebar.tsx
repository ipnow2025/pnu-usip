"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FileText,
  Languages,
  FileCheck,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { logout } from "@/lib/func"

const navigation = [
  // 대시보드 항목을 삭제해 가볍게 유지합니다.
  { name: "특허 관리", href: "/patents", icon: FileText },
  { name: "번역 관리", href: "/translations", icon: Languages },
  { name: "서류 관리", href: "/documents", icon: FileCheck },
  { name: "USPTO 출원", href: "/filing/management", icon: Building2 },
  { name: "사용자 관리", href: "/users", icon: Users },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div
      className={cn(
        "flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">PNU</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white">특허관리시스템</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">부산대학교</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="p-2">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
                  collapsed && "justify-center",
                )}
              >
                <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className={cn(
            "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20",
            collapsed && "justify-center",
          )}
        >
          <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "로그아웃"}
        </Button>
      </div>
    </div>
  )
}
