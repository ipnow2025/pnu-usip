/* lib/data-adapter.ts
 * 브라우저(로컬스토리지) vs. 서버(인메모리) 모두 지원하는 단일 어댑터
 */
type User = {
  id: string
  name: string
  role: string
  email?: string
  organization?: string
  department?: string
  phone?: string
  mobile?: string
  status?: string
  addressKr?: string
  addressEn?: string
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────
//  내부 인-메모리 mock (SSR / API Route 용)
// ─────────────────────────────────────────
let memoryUsers: User[] = []

function seedMemoryUsers() {
  if (memoryUsers.length) return

  // mockUsers에서 데이터 가져오기
  const { mockUsers } = require("@/lib/mock-data")
  memoryUsers = [...mockUsers]
}

// ─────────────────────────────────────────
//  도움 함수
// ─────────────────────────────────────────
const isBrowser = typeof window !== "undefined"

function getAllUsersFromStore(): User[] {
  if (isBrowser) {
    return JSON.parse(localStorage.getItem("users") || "[]")
  }
  // 서버에서는 인-메모리 mock 사용
  seedMemoryUsers()
  return memoryUsers
}

function persistUserToStore(user: User) {
  if (isBrowser) {
    const users = getAllUsersFromStore()
    users.push(user)
    localStorage.setItem("users", JSON.stringify(users))
  } else {
    memoryUsers.push(user)
  }
}

// ─────────────────────────────────────────
//  Export 되는 dataAdapter
// ─────────────────────────────────────────
export const dataAdapter = {
  /* 사용자 목록 조회 */
  async getUsers({ page = 1, limit = 10, search = "" } = {}) {
    const all = getAllUsersFromStore()
    const filtered = search.trim()
      ? all.filter((u) => u.name.includes(search) || u.email?.includes(search) || u.organization?.includes(search))
      : all

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit
    const users = filtered.slice(start, start + limit)

    return { success: true, users, pagination: { page, limit, total, totalPages } }
  },

  /* 사용자 생성 */
  async createUser(data: Omit<User, "id" | "createdAt" | "updatedAt">) {
    const newUser: User = {
      id: `user_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    persistUserToStore(newUser)
    return { success: true, user: newUser }
  },

  /* 이름(및 선택적 role) 검색 */
  async searchUsers(name: string, role?: string) {
    const all = getAllUsersFromStore()
    let list = all.filter((u) => u.name.includes(name))
    if (role) list = list.filter((u) => u.role === role)
    return { success: true, users: list }
  },

  // ===== 특허 관리 =====
  async getPatents(params: { page?: number; limit?: number; search?: string; status?: string } = {}) {
    const { page = 1, limit = 10, search = "", status } = params

    const patentsStore = {
      getAll: () => [
        { id: "patent_1", title: "Patent 1", titleEn: "Patent 1 EN", managementNumber: "12345", status: "active" },
        { id: "patent_2", title: "Patent 2", titleEn: "Patent 2 EN", managementNumber: "67890", status: "inactive" },
      ],
      getById: (id: string) => {
        const patents = patentsStore.getAll()
        return patents.find((patent) => patent.id === id)
      },
      create: (patentData: any) => {
        const patents = patentsStore.getAll()
        const newPatent = { id: `patent_${Date.now()}`, ...patentData, status: "active" }
        patents.push(newPatent)
        return newPatent
      },
    }

    let patents = patentsStore.getAll()

    // 검색 필터링
    if (search.trim()) {
      patents = patents.filter(
        (patent) =>
          patent.title.toLowerCase().includes(search.toLowerCase()) ||
          patent.titleEn?.toLowerCase().includes(search.toLowerCase()) ||
          patent.managementNumber.toLowerCase().includes(search.toLowerCase()),
      )
    }

    // 상태 필터링
    if (status && status !== "all") {
      patents = patents.filter((patent) => patent.status === status)
    }

    // 페이징
    const total = patents.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const paginatedPatents = patents.slice(startIndex, startIndex + limit)

    return {
      success: true,
      patents: paginatedPatents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  },

  async getPatentById(id: string) {
    const patentsStore = {
      getAll: () => [
        { id: "patent_1", title: "Patent 1", titleEn: "Patent 1 EN", managementNumber: "12345", status: "active" },
        { id: "patent_2", title: "Patent 2", titleEn: "Patent 2 EN", managementNumber: "67890", status: "inactive" },
      ],
      getById: (id: string) => {
        const patents = patentsStore.getAll()
        return patents.find((patent) => patent.id === id)
      },
      create: (patentData: any) => {
        const patents = patentsStore.getAll()
        const newPatent = { id: `patent_${Date.now()}`, ...patentData, status: "active" }
        patents.push(newPatent)
        return newPatent
      },
    }

    const patent = patentsStore.getById(id)
    if (!patent) {
      return { success: false, error: "특허를 찾을 수 없습니다." }
    }
    return { success: true, patent }
  },

  async createPatent(patentData: any) {
    const patentsStore = {
      getAll: () => [
        { id: "patent_1", title: "Patent 1", titleEn: "Patent 1 EN", managementNumber: "12345", status: "active" },
        { id: "patent_2", title: "Patent 2", titleEn: "Patent 2 EN", managementNumber: "67890", status: "inactive" },
      ],
      getById: (id: string) => {
        const patents = patentsStore.getAll()
        return patents.find((patent) => patent.id === id)
      },
      create: (patentData: any) => {
        const patents = patentsStore.getAll()
        const newPatent = { id: `patent_${Date.now()}`, ...patentData, status: "active" }
        patents.push(newPatent)
        return newPatent
      },
    }

    const newPatent = patentsStore.create(patentData)
    return { success: true, patent: newPatent }
  },

  // ===== 문서 관리 =====
  async getDocuments(patentId?: string) {
    const documentsStore = {
      getAll: () => [
        { id: "doc_1", title: "Document 1", patentId: "patent_1" },
        { id: "doc_2", title: "Document 2", patentId: "patent_2" },
      ],
      getByPatentId: (patentId: string) => {
        const documents = documentsStore.getAll()
        return documents.filter((doc: any) => doc.patentId === patentId)
      },
    }

    if (patentId) {
      const documents = documentsStore.getByPatentId(patentId)
      return { success: true, documents }
    }

    const documents = documentsStore.getAll()
    return { success: true, documents }
  },

  // ===== 번역 관리 =====
  async getTranslations(status?: string) {
    const translationsStore = {
      getAll: () => [
        { id: "trans_1", title: "Translation 1", status: "active" },
        { id: "trans_2", title: "Translation 2", status: "inactive" },
      ],
    }

    let translations = translationsStore.getAll()

    if (status && status !== "all") {
      translations = translations.filter((t) => t.status === status)
    }

    return { success: true, translations }
  },

  // ===== 출원 관리 =====
  async getFilings(status?: string) {
    const filingsStore = {
      getAll: () => [
        { id: "filing_1", title: "Filing 1", status: "active" },
        { id: "filing_2", title: "Filing 2", status: "inactive" },
      ],
    }

    let filings = filingsStore.getAll()

    if (status && status !== "all") {
      filings = filings.filter((f) => f.status === status)
    }

    return { success: true, filings }
  },
}
