import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patentId } = await params

    // 번역 완료 파일들 조회
    const translationFiles = await prisma.$queryRaw`
      SELECT * FROM us_patents_translation_files 
      WHERE patentId = ${patentId} AND isCompletion = true
      ORDER BY uploadedAt DESC
    `

    // 파일 정보 파싱
    const parsedFiles = (translationFiles as any[]).map(file => {
      let files = []
      try {
        files = JSON.parse(file.files)
      } catch (error) {
        console.error("파일 정보 파싱 오류:", error)
        files = []
      }

      return {
        id: file.id,
        patentId: file.patentId,
        section: file.section,
        comment: file.comment,
        files: files,
        isCompletion: file.isCompletion,
        translatedTitleUS: file.translatedTitleUS,
        uploadedAt: file.uploadedAt,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt
      }
    })

    return NextResponse.json({
      success: true,
      data: parsedFiles
    })

  } catch (error) {
    console.error("번역 파일 조회 오류:", error)
    return NextResponse.json(
      { error: "번역 파일 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
} 