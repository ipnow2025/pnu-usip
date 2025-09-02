import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patentId: string }> }
) {
  try {
    const { patentId } = await params

    // 특허의 모든 문서 파일 조회 (raw query 사용)
    const files = await prisma.$queryRaw`
      SELECT * FROM us_patents_document_preparation_files 
      WHERE patentId = ${patentId} 
      ORDER BY createdAt DESC
    `

    // DocumentPreparation 정보도 함께 조회 (raw query 사용)
    const documentPrep = await prisma.$queryRaw`
      SELECT * FROM us_patents_document_preparations 
      WHERE patentId = ${patentId}
    `

    return NextResponse.json({
      success: true,
      data: {
        files: Array.isArray(files) ? files : [],
        documentPreparation: Array.isArray(documentPrep) && documentPrep.length > 0 ? documentPrep[0] : null
      }
    })

  } catch (error) {
    console.error("문서 파일 조회 오류:", error)
    return NextResponse.json(
      { error: "문서 파일 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
} 