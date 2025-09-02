export interface User {
  id: string
  memberId?: string
  memberIdx?: string
  name: string
  nameEn?: string
  email?: string
  role: string
  organization?: string
  department?: string
  phone?: string
  mobile?: string
  status: string
  addressKr?: string
  addressEn?: string
  createdAt: string
  updatedAt: string
  lastLogin?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  users: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// 회원 ID 중복 확인
export async function checkMemberIdDuplicate(memberId: string): Promise<{ isDuplicate: boolean; message: string }> {
  try {
    const response = await fetch(`/api/users?checkDuplicate=true&memberId=${encodeURIComponent(memberId)}`)
    
    if (!response.ok) {
      console.error('Duplicate check failed with status:', response.status)
      throw new Error("중복 확인 중 오류가 발생했습니다.")
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || "중복 확인 중 오류가 발생했습니다.")
    }
    
    return {
      isDuplicate: result.isDuplicate,
      message: result.message
    }
  } catch (error) {
    console.error("회원 ID 중복 확인 오류:", error)
    return {
      isDuplicate: false,
      message: "중복 확인 중 오류가 발생했습니다."
    }
  }
}

// 발명자 검색 (발명자만)
export async function searchInventors(name: string): Promise<User[]> {
  if (!name.trim()) return []

  try {
    const response = await fetch(`/api/users?search=${encodeURIComponent(name)}&role=INVENTOR`)

    if (!response.ok) {
      console.warn("searchInventors: API responded with", response.status)
      return []
    }

    const result = await response.json()
    return result.users || []
  } catch (error) {
    console.error("발명자 검색 오류:", error)
    return []
  }
}

// 전체 사용자 검색
export async function searchUsers(name: string): Promise<User[]> {
  if (!name.trim()) return []

  try {
    const response = await fetch(`/api/users?search=${encodeURIComponent(name)}`)
    if (!response.ok) {
      console.warn("searchUsers: API responded with", response.status)
      return []
    }
    const result = await response.json()
    return result.users || []
  } catch (error) {
    console.error("사용자 검색 오류:", error)
    return []
  }
}

// 페이징된 사용자 목록 조회
export async function getUsersPaginated(params: {
  page?: number
  limit?: number
  search?: string
  role?: string
  status?: string
} = {}): Promise<PaginatedResponse<User>> {
  try {
    const searchParams = new URLSearchParams()
    
    if (params.page) searchParams.append('page', params.page.toString())
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.search) searchParams.append('search', params.search)
    if (params.role) searchParams.append('role', params.role)
    if (params.status) searchParams.append('status', params.status)

    const response = await fetch(`/api/users?${searchParams.toString()}`)
    if (!response.ok) {
      throw new Error("사용자 목록 조회 실패")
    }
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error("사용자 목록 조회 오류:", error)
    return {
      success: false,
      users: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      }
    }
  }
}

// 사용자 생성
export async function createUser(userData: {
  memberId: string
  name: string
  role: string
  nameEn?: string
  email?: string
  password?: string
  organization?: string
  department?: string
  phone?: string
  mobile?: string
  status?: string
  addressKr?: string
  addressEn?: string
}): Promise<User | null> {
  try {
    
    // 역할 매핑
    const roleMap: { [key: string]: string } = {
      '관리자': 'PATENT_MANAGER',
      '발명자': 'INVENTOR',
      '변호사': 'US_ATTORNEY',
      '외부 검토자': 'EXTERNAL_REVIEWER'
    }

    // 빈 문자열을 undefined로 변환 (API에서 null로 처리)
    const cleanData = {
      memberId: userData.memberId,
      name: userData.name,
      role: roleMap[userData.role] || userData.role,
      nameEn: userData.nameEn || undefined,
      email: userData.email || undefined,
      password: userData.password || undefined,
      organization: userData.organization || undefined,
      department: userData.department || undefined,
      phone: userData.phone || undefined,
      mobile: userData.mobile || undefined,
      status: userData.status === '활성' ? 'ACTIVE' : 'INACTIVE',
      addressKr: userData.addressKr || undefined,
      addressEn: userData.addressEn || undefined,
    }
    
    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cleanData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('API error response:', errorData)
      throw new Error(errorData.error || "사용자 생성 실패")
    }

    const result = await response.json()
    return result.user || null
  } catch (error) {
    console.error("사용자 생성 오류:", error)
    return null
  }
}

// 사용자 수정
export async function updateUser(userId: string, userData: {
  name?: string
  nameEn?: string
  email?: string
  role?: string
  organization?: string
  department?: string
  phone?: string
  mobile?: string
  status?: string
  addressKr?: string
  addressEn?: string
  password?: string
}): Promise<User | null> {
  try {
    // 역할 매핑
    const roleMap: { [key: string]: string } = {
      '관리자': 'PATENT_MANAGER',
      '발명자': 'INVENTOR',
      '변호사': 'US_ATTORNEY',
      '외부 검토자': 'EXTERNAL_REVIEWER'
    }

    // memberId는 수정에서 제외하고, 빈 문자열을 undefined로 변환
    const { memberId, ...updateData } = userData as any

    const mappedData = {
      ...updateData,
      role: updateData.role ? (roleMap[updateData.role] || updateData.role) : undefined,
      status: updateData.status === '활성' ? 'ACTIVE' : updateData.status === '비활성' ? 'INACTIVE' : undefined,
      // 빈 문자열은 그대로 전송 (API에서 null로 변환)
      nameEn: updateData.nameEn,
      email: updateData.email,
      organization: updateData.organization,
      department: updateData.department,
      phone: updateData.phone,
      mobile: updateData.mobile,
      addressKr: updateData.addressKr,
      addressEn: updateData.addressEn,
      password: updateData.password,
    }

    const response = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mappedData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "사용자 수정 실패")
    }

    const result = await response.json()
    return result.user || null
  } catch (error) {
    console.error("사용자 수정 오류:", error)
    return null
  }
}

// 사용자 삭제
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "사용자 삭제 실패")
    }

    return true
  } catch (error) {
    console.error("사용자 삭제 오류:", error)
    return false
  }
}

// 특정 사용자 조회
export async function getUser(userId: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${userId}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "사용자 조회 실패")
    }

    const result = await response.json()
    return result.user || null
  } catch (error) {
    console.error("사용자 조회 오류:", error)
    return null
  }
}

// 전체 사용자 조회 (기존 함수 - 하위 호환성 유지)
export async function getUsers(): Promise<User[]> {
  try {
    const response = await fetch("/api/users")
    if (!response.ok) {
      throw new Error("사용자 목록 조회 실패")
    }
    const result = await response.json()

    // API 응답 구조에 맞게 수정
    if (result.success && result.users) {
      return result.users
    }

    // 기존 배열 형태 응답도 지원
    return Array.isArray(result) ? result : []
  } catch (error) {
    console.error("사용자 목록 조회 오류:", error)
    return []
  }
}
