"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Mail, Phone, Building, Shield, Globe, MapPin, Check, X, Loader2 } from "lucide-react"
import { checkMemberIdDuplicate } from "@/lib/api/users"

interface UserFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (userData: any) => void
  user?: {
    id: string
    name?: string
    nameEn?: string
    email?: string
    role?: string
    department?: string
    organization?: string
    phone?: string
    mobile?: string
    status?: string
    addressKr?: string
    addressEn?: string
    memberId?: string
    memberIdx?: string
  }
  mode: "create" | "edit"
}

const organizationByRole = {
  관리자: "부산대학교 산학협력단",
  발명자: "부산대학교",
  변호사: "AGORA LLC",
  "외부 검토자": "아이티엘",
}

export function UserFormModal({ isOpen, onClose, onSubmit, user, mode }: UserFormModalProps) {
  const [formData, setFormData] = useState({
    memberId: "",
    name: "",
    nameEn: "",
    email: "",
    password: "",
    role: "",
    department: "",
    organization: "",
    phone: "",
    mobile: "",
    status: "활성",
    addressKr: "",
    addressEn: "",
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  
  // 중복 확인 상태
  const [duplicateCheck, setDuplicateCheck] = useState<{
    checked: boolean
    isDuplicate: boolean
    message: string
    loading: boolean
  }>({
    checked: false,
    isDuplicate: false,
    message: "",
    loading: false
  })

  useEffect(() => {
    if (mode === "edit" && user) {
      setFormData({
        memberId: user.memberId || "",
        name: user.name || "",
        nameEn: user.nameEn || "",
        email: user.email || "",
        password: "",
        role: user.role || "",
        department: user.department || "",
        organization: user.organization || "",
        phone: user.phone || "",
        mobile: user.mobile || "",
        status: user.status || "활성",
        addressKr: user.addressKr || "",
        addressEn: user.addressEn || "",
      })
    } else if (mode === "create") {
      setFormData({
        memberId: "",
        name: user?.name || "",
        nameEn: "",
        email: "",
        password: "",
        role: user?.role || "",
        department: "",
        organization: "",
        phone: "",
        mobile: "",
        status: "활성",
        addressKr: "",
        addressEn: "",
      })
    }
    // 폼이 열릴 때마다 에러와 중복 확인 상태 초기화
    setErrors({})
    setDuplicateCheck({
      checked: false,
      isDuplicate: false,
      message: "",
      loading: false
    })
  }, [mode, user, isOpen])

  const handleRoleChange = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      role,
      organization: organizationByRole[role as keyof typeof organizationByRole] || "",
    }))
    // 역할 변경 시 에러 제거
    if (errors.role) {
      setErrors(prev => ({ ...prev, role: "" }))
    }
  }

  const handleMemberIdChange = (value: string) => {
    setFormData((prev) => ({ ...prev, memberId: value }))
    if (errors.memberId) {
      setErrors(prev => ({ ...prev, memberId: "" }))
    }
    // 회원 ID 변경 시 중복 확인 상태 초기화
    setDuplicateCheck({
      checked: false,
      isDuplicate: false,
      message: "",
      loading: false
    })
  }

  const handleDuplicateCheck = async () => {
    if (!formData.memberId.trim()) {
      setErrors(prev => ({ ...prev, memberId: "회원 ID를 입력한 후 중복 확인을 해주세요." }))
      return
    }

    setDuplicateCheck(prev => ({ ...prev, loading: true }))
    
    try {
      const result = await checkMemberIdDuplicate(formData.memberId.trim())
      
      setDuplicateCheck({
        checked: true,
        isDuplicate: result.isDuplicate,
        message: result.message,
        loading: false
      })
      
      // 중복 확인 완료 후 에러 상태 업데이트
      if (result.isDuplicate) {
        setErrors(prev => ({ ...prev, memberId: "이미 사용 중인 회원 ID입니다." }))
      } else {
        setErrors(prev => ({ ...prev, memberId: "" }))
      }
    } catch (error) {
      console.error('Duplicate check error:', error)
      setDuplicateCheck({
        checked: true,
        isDuplicate: false,
        message: "중복 확인 중 오류가 발생했습니다.",
        loading: false
      })
      setErrors(prev => ({ ...prev, memberId: "중복 확인 중 오류가 발생했습니다." }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    // 필수 필드 검증 (수정 모드에서는 회원 ID 검증 건너뛰기)
    if (mode === "create") {
      if (!formData.memberId.trim()) {
        newErrors.memberId = "회원 ID를 입력해주세요."
      } else if (!duplicateCheck.checked) {
        newErrors.memberId = "회원 ID 중복 확인을 해주세요."
      } else if (duplicateCheck.isDuplicate) {
        newErrors.memberId = "이미 사용 중인 회원 ID입니다."
      }
    }

    if (!formData.name.trim()) {
      newErrors.name = "이름을 입력해주세요."
    }

    // 비밀번호 검증
    if (mode === "create" && !formData.password.trim()) {
      newErrors.password = "비밀번호를 입력해주세요."
    } else if (formData.password.trim() && formData.password.length < 6) {
      newErrors.password = "비밀번호는 최소 6자 이상이어야 합니다."
    }

    if (!formData.role) {
      newErrors.role = "역할을 선택해주세요."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    onSubmit(formData)
    onClose()
  }

  const isInventor = formData.role === "발명자"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden mx-auto my-4">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {mode === "create" ? "새 사용자 추가" : "사용자 정보 수정"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6 pb-4">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">기본 정보</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="memberId" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    회원 ID {mode === "create" && "*"}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="memberId"
                      value={formData.memberId}
                      onChange={(e) => handleMemberIdChange(e.target.value)}
                      placeholder="회원 ID를 입력하세요"
                      className={`${errors.memberId ? "border-red-500" : ""} ${mode === "edit" ? "bg-gray-100 text-gray-600" : ""}`}
                      disabled={mode === "edit"}
                    />
                    {mode === "create" && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleDuplicateCheck}
                        disabled={duplicateCheck.loading || !formData.memberId.trim()}
                        className="whitespace-nowrap"
                      >
                        {duplicateCheck.loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "중복확인"
                        )}
                      </Button>
                    )}
                  </div>
                  {errors.memberId && (
                    <p className="text-sm text-red-500">{errors.memberId}</p>
                  )}
                  {duplicateCheck.checked && (
                    <div className={`flex items-center gap-2 text-sm ${
                      duplicateCheck.isDuplicate ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {duplicateCheck.isDuplicate ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      <span>{duplicateCheck.message}</span>
                    </div>
                  )}
                  {mode === "edit" && (
                    <p className="text-xs text-gray-500">회원 ID는 수정할 수 없습니다.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    이름 *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                      if (errors.name) {
                        setErrors(prev => ({ ...prev, name: "" }))
                      }
                    }}
                    placeholder="사용자 이름을 입력하세요"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    이메일
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="이메일을 입력하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    비밀번호 {mode === "create" && "*"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder={mode === "create" ? "비밀번호를 입력하세요 (최소 6자)" : "변경하지 않으려면 비워두세요"}
                    className={errors.password ? "border-red-500" : ""}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                  {mode === "edit" && (
                    <p className="text-xs text-gray-500">비밀번호를 변경하지 않으려면 비워두세요.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    역할 *
                  </Label>
                  <Select value={formData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger className={errors.role ? "border-red-500" : ""}>
                      <SelectValue placeholder="역할을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="관리자">관리자</SelectItem>
                      <SelectItem value="발명자">발명자</SelectItem>
                      <SelectItem value="변호사">변호사</SelectItem>
                      <SelectItem value="외부 검토자">외부 검토자</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-red-500">{errors.role}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    상태
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="활성">활성</SelectItem>
                      <SelectItem value="비활성">비활성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 발명자 전용 필드 */}
            {isInventor && (
              <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  발명자 추가 정보 (DECLARATION 서류용)
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nameEn" className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <Globe className="h-4 w-4" />
                      영문 이름
                    </Label>
                    <Input
                      id="nameEn"
                      value={formData.nameEn}
                      onChange={(e) => setFormData((prev) => ({ ...prev, nameEn: e.target.value }))}
                      placeholder="영문 이름을 입력하세요 (예: John Doe)"
                      className="bg-white dark:bg-gray-800"
                    />
                    <p className="text-xs text-green-600 dark:text-green-400">DECLARATION 서류에 사용됩니다</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressKr" className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <MapPin className="h-4 w-4" />
                      주소(한글)
                    </Label>
                    <Input
                      id="addressKr"
                      value={formData.addressKr}
                      onChange={(e) => setFormData((prev) => ({ ...prev, addressKr: e.target.value }))}
                      placeholder="한글 주소를 입력하세요 (예: 부산광역시 금정구 부산대학로 63번길 2)"
                      className="bg-white dark:bg-gray-800"
                    />
                    <p className="text-xs text-green-600 dark:text-green-400">DECLARATION 서류에 사용됩니다</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressEn" className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <Globe className="h-4 w-4" />
                      주소(영문)
                    </Label>
                    <Input
                      id="addressEn"
                      value={formData.addressEn}
                      onChange={(e) => setFormData((prev) => ({ ...prev, addressEn: e.target.value }))}
                      placeholder="영문 주소를 입력하세요 (예: 2, Busandaehak-ro 63beon-gil, Geumjeong-gu, Busan, Republic of Korea)"
                      className="bg-white dark:bg-gray-800"
                    />
                    <p className="text-xs text-green-600 dark:text-green-400">DECLARATION 서류에 사용됩니다</p>
                  </div>
                </div>
              </div>
            )}

            {/* 소속 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">소속 정보</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organization" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    소속기관
                  </Label>
                  <Input
                    id="organization"
                    value={formData.organization}
                    onChange={(e) => setFormData((prev) => ({ ...prev, organization: e.target.value }))}
                    placeholder="소속기관을 입력하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    부서
                  </Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="부서를 입력하세요"
                  />
                </div>
              </div>
            </div>

            {/* 연락처 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">연락처 정보</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    연락처
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="연락처를 입력하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    핸드폰
                  </Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mobile: e.target.value }))}
                    placeholder="핸드폰 번호를 입력하세요"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            type="submit"
            variant="outline"
            className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
            onClick={handleSubmit}
          >
            {mode === "create" ? "추가" : "수정"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
