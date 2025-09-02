import { type NextRequest, NextResponse } from "next/server"
import { dataAdapter } from "@/lib/data-adapter"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name") || ""
    const role = searchParams.get("role") || undefined

    if (!name.trim()) {
      return NextResponse.json({
        success: true,
        users: [],
      })
    }

    const result = await dataAdapter.searchUsers(name, role)
    return NextResponse.json(result)
  } catch (error) {
    console.error("사용자 검색 오류:", error)
    return NextResponse.json(
      {
        success: false,
        error: "사용자 검색 중 오류가 발생했습니다.",
        users: [],
      },
      { status: 500 },
    )
  }
}
