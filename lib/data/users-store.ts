import { nanoid } from "nanoid"

/**
 * User 타입 - 프론트엔드에서 이미 사용 중인 필드만 정의
 */
export interface User {
  id: string
  name: string
  role: string
  email?: string
  organization?: string
  status?: string
  createdAt: string
  updatedAt: string
}

/**
 * 간단한 인-메모리 사용자 저장소
 *  • V0 Preview 환경에서는 실제 DB 대신 메모리 사용
 *  • API 라우트마다 같은 인스턴스를 사용하도록 싱글턴 패턴
 */
const users: User[] = [
  {
    id: nanoid(),
    name: "박민수",
    role: "발명자",
    email: "park@pnu.ac.kr",
    organization: "부산대학교",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

/* ----- CRUD 유틸 함수 ----- */
function getAll() {
  return users
}

function searchByName(keyword: string) {
  const lower = keyword.toLowerCase()
  return users.filter((u) => u.name.toLowerCase().includes(lower))
}

function add(user: Omit<User, "id" | "createdAt" | "updatedAt">): User {
  const now = new Date().toISOString()
  const newUser: User = { id: nanoid(), createdAt: now, updatedAt: now, ...user }
  users.push(newUser)
  return newUser
}

// --- public singleton store (keeps the old API shape) ----------------------
export const usersStore = {
  getAll,
  searchByName,
  /** alias for backwards-compatibility */
  create: add,
  /** expose the original add in case you need it elsewhere */
  add,
}
