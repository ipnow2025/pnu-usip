"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Phone, Building, Calendar, Shield } from "lucide-react"

interface UserDetailModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: string
    name: string
    email: string
    role: string
    department: string
    organization: string
    phone?: string
    mobile?: string
    status: string
    createdAt: string
    lastLogin?: string
  }
}

export function UserDetailModal({ isOpen, onClose, user }: UserDetailModalProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case "관리자":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "변리사":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "발명자":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "직원":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    return status === "활성"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            사용자 상세 정보
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <div className="flex gap-2">
                <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
              </div>
            </div>

            <Separator />
          </div>

          {/* 연락처 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                이메일
              </div>
              <p className="text-sm">{user.email}</p>
            </div>

            {user.phone && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  연락처
                </div>
                <p className="text-sm">{user.phone}</p>
              </div>
            )}

            {user.mobile && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  핸드폰
                </div>
                <p className="text-sm">{user.mobile}</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building className="h-4 w-4" />
                소속기관
              </div>
              <p className="text-sm">{user.organization}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building className="h-4 w-4" />
                부서
              </div>
              <p className="text-sm">{user.department}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Shield className="h-4 w-4" />
                권한
              </div>
              <p className="text-sm">{user.role}</p>
            </div>
          </div>

          <Separator />

          {/* 계정 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                가입일
              </div>
              <p className="text-sm">{user.createdAt}</p>
            </div>

            {user.lastLogin && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  최근 로그인
                </div>
                <p className="text-sm">{user.lastLogin}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
