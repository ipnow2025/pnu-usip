// 사용자 권한 관리 유틸리티 (수정된 권한 체계)
export type UserRole = "PATENT_MANAGER" | "INVENTOR" | "US_ATTORNEY" | "EXTERNAL_REVIEWER"

export interface Permission {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canCreate: boolean
  canApprove: boolean
  canChangeStatus: boolean
}

// 역할별 권한 정의 (수정된 번역관리 권한)
export const rolePermissions: Record<UserRole, Record<string, Permission>> = {
  PATENT_MANAGER: {
    translations: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canCreate: true,
      canApprove: true,
      canChangeStatus: true,
    },
    documents: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canCreate: true,
      canApprove: true,
      canChangeStatus: true,
    },
    filing: { canView: true, canEdit: true, canDelete: true, canCreate: true, canApprove: true, canChangeStatus: true },
    patents: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canCreate: true,
      canApprove: true,
      canChangeStatus: true,
    },
    users: { canView: true, canEdit: true, canDelete: true, canCreate: true, canApprove: true, canChangeStatus: true },
    costs: { canView: true, canEdit: true, canDelete: true, canCreate: true, canApprove: true, canChangeStatus: true },
  },
  // 아이티엘 (US_ATTORNEY로 가정) - 특허관리자와 동일한 권한
  US_ATTORNEY: {
    translations: {
      canView: true,
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canApprove: true,
      canChangeStatus: true,
    },
    documents: {
      canView: true,
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canApprove: true,
      canChangeStatus: true,
    },
    filing: {
      canView: true,
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canApprove: true,
      canChangeStatus: true,
    },
    patents: {
      canView: true,
      canEdit: true,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    },
    users: {
      canView: false,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    },
    costs: {
      canView: true,
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canApprove: false,
      canChangeStatus: false,
    },
  },
  INVENTOR: {
    translations: {
      canView: true,
      canEdit: true,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    }, // 자신의 특허만
    documents: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    },
    filing: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    },
    patents: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    },
    users: {
      canView: false,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    },
    costs: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    },
  },
  EXTERNAL_REVIEWER: {
    translations: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canApprove: true,
      canChangeStatus: false,
    },
    documents: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    },
    filing: {
      canView: false,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    },
    patents: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    },
    users: {
      canView: false,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    },
    costs: {
      canView: false,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    },
  },
}

// 현재 사용자의 권한 확인
export function getUserPermission(userRole: UserRole, resource: string): Permission {
  return (
    rolePermissions[userRole]?.[resource] || {
      canView: false,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canApprove: false,
      canChangeStatus: false,
    }
  )
}

// 현재 사용자 역할 가져오기 (개발용 - 기본값을 PATENT_MANAGER로 변경)
export function getCurrentUserRole(): UserRole {
  if (typeof window === "undefined") return "PATENT_MANAGER"

  const member = localStorage.getItem("member")
  if (!member) return "PATENT_MANAGER" // 기본값을 관리자로 변경

  try {
    const memberData = JSON.parse(member)
    return memberData.role || "PATENT_MANAGER"
  } catch {
    return "PATENT_MANAGER"
  }
}

// 현재 사용자 정보 가져오기
export function getCurrentUser() {
  if (typeof window === "undefined") {
    // 서버 사이드에서는 기본값 반환
    return { 
      userId: 6,
      memberName: "부산대관리자", 
      role: "PATENT_MANAGER" 
    }
  }

  const member = localStorage.getItem("member")
  if (!member) {
    // 기본값 반환
    return { 
      userId: 6,
      memberName: "부산대관리자", 
      role: "PATENT_MANAGER" 
    }
  }

  try {
    const userData = JSON.parse(member)
    // 실제 사용자 데이터 구조에 맞게 반환
    return {
      userId: userData.userId || 6,
      memberName: userData.memberName || userData.name || "부산대관리자",
      role: userData.role || "PATENT_MANAGER"
    }
  } catch {
    return { 
      userId: 6,
      memberName: "부산대관리자", 
      role: "PATENT_MANAGER" 
    }
  }
}

// 역할 변경 함수 (개발용)
export function setUserRole(role: UserRole, name?: string) {
  if (typeof window === "undefined") return

  const userData = {
    name: name || roleLabels[role],
    role: role,
  }

  localStorage.setItem("member", JSON.stringify(userData))
  window.location.reload() // 페이지 새로고침으로 변경사항 적용
}

// 특허별 접근 권한 확인 (발명자는 자신의 특허만 접근 가능)
export function canAccessPatent(patent: any): boolean {
  const userRole = getCurrentUserRole()
  const currentUser = getCurrentUser()

  if (!currentUser) return false

  // 특허 관리자와 아이티엘(변호사)는 모든 특허 접근 가능
  if (userRole === "PATENT_MANAGER" || userRole === "US_ATTORNEY") {
    return true
  }

  // 발명자는 자신이 발명자로 등록된 특허만 접근 가능
  if (userRole === "INVENTOR") {
    if (Array.isArray(patent.inventors)) {
      return patent.inventors.includes(currentUser.memberName)
    }
    return patent.inventor === currentUser.memberName
  }

  // 외부 검토자는 할당된 특허만 접근 가능
  if (userRole === "EXTERNAL_REVIEWER") {
    return patent.assignedReviewer === currentUser.memberName
  }

  return false
}

// 사용자가 접근 가능한 특허 목록 필터링
export function filterAccessiblePatents(patents: any[]): any[] {
  const userRole = getCurrentUserRole()

  // 특허 관리자와 아이티엘(변호사)는 모든 특허 접근 가능
  if (userRole === "PATENT_MANAGER" || userRole === "US_ATTORNEY") {
    return patents
  }

  // 발명자와 외부 검토자는 접근 가능한 특허만 필터링
  return patents.filter(canAccessPatent)
}

// 권한 체크 헬퍼 함수들
export function canViewResource(resource: string): boolean {
  const role = getCurrentUserRole()
  return getUserPermission(role, resource).canView
}

export function canEditResource(resource: string): boolean {
  const role = getCurrentUserRole()
  return getUserPermission(role, resource).canEdit
}

export function canDeleteResource(resource: string): boolean {
  const role = getCurrentUserRole()
  return getUserPermission(role, resource).canDelete
}

export function canCreateResource(resource: string): boolean {
  const role = getCurrentUserRole()
  return getUserPermission(role, resource).canCreate
}

export function canApproveResource(resource: string): boolean {
  const role = getCurrentUserRole()
  return getUserPermission(role, resource).canApprove
}

export function canChangeStatusResource(resource: string): boolean {
  const role = getCurrentUserRole()
  return getUserPermission(role, resource).canChangeStatus
}

// 역할 표시명
export const roleLabels: Record<UserRole, string> = {
  PATENT_MANAGER: "특허 관리자",
  INVENTOR: "발명자",
  US_ATTORNEY: "아이티엘", // 변경: 미국 변호사 → 아이티엘
  EXTERNAL_REVIEWER: "외부 검토자",
}
