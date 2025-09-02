import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patentId = searchParams.get("patentId")

    if (!patentId) {
      return NextResponse.json({ error: "특허 ID가 필요합니다." }, { status: 400 })
    }

    // 특허의 출원 파일 목록 조회
    const files = await prisma.$queryRaw`
      SELECT 
        id,
        patent_id as patentId,
        file_name as fileName,
        original_file_name as originalFileName,
        CAST(file_size AS CHAR) as fileSize,
        file_type as fileType,
        uploaded_by as uploadedBy,
        file_key as fileKey,
        uploaded_at as uploadedAt
      FROM us_patents_filing_files 
      WHERE patent_id = ${patentId}
      ORDER BY uploaded_at DESC
    `

    return NextResponse.json({
      files: files
    })
  } catch (error) {
    console.error("파일 목록 조회 오류:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
  }
} 