import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patentId } = await params

    // 특허 기본 정보 조회 (raw query 사용)
    const patents = await prisma.$queryRaw`
      SELECT * FROM us_patents_patents WHERE id = ${patentId}
    `

    if (!Array.isArray(patents) || patents.length === 0) {
      return NextResponse.json(
        { error: "특허를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    const patent = patents[0] as any

    // 번역 완료된 정보만 조회
    const completedTranslations = await prisma.$queryRaw`
      SELECT * FROM us_patents_translations 
      WHERE patentId = ${patentId} AND status = 'COMPLETED'
      ORDER BY createdAt DESC 
      LIMIT 1
    `

    // 번역 완료 파일 정보 조회
    const completionFiles = await prisma.$queryRaw`
      SELECT * FROM us_patents_translation_files 
      WHERE patentId = ${patentId} AND isCompletion = true 
      ORDER BY uploadedAt DESC 
      LIMIT 1
    `

    // 발명자 정보 파싱 (JSON 문자열)
    let inventors = []
    if (patent.inventors) {
      try {
        inventors = JSON.parse(patent.inventors)
      } catch (error) {
        console.error("발명자 정보 파싱 오류:", error)
        inventors = []
      }
    }

    // 번역된 제목 추출 (완료된 번역만)
    let translatedTitle = patent.titleEn || patent.title
    let translatedAbstract = null

    // 번역 완료 파일에서 번역된 제목 추출
    if (Array.isArray(completionFiles) && completionFiles.length > 0) {
      const completionFile = completionFiles[0] as any
      if (completionFile.translatedTitleUS) {
        translatedTitle = completionFile.translatedTitleUS
      }
    }

    // 완료된 번역 정보에서 번역된 내용 추출
    if (Array.isArray(completedTranslations) && completedTranslations.length > 0) {
      const completedTranslation = completedTranslations[0] as any
      if (completedTranslation.translatedText) {
        translatedAbstract = completedTranslation.translatedText
      }
    }

    // 응답 데이터 구성
    const responseData = {
      id: patent.id,
      managementNumber: patent.managementNumber,
      applicationNumber: patent.applicationNumber,
      title: patent.title,
      titleEn: translatedTitle,
      abstract: null, // 원본 초록은 별도 필드가 없음
      abstractEn: translatedAbstract,
      status: patent.status,
      inventors: inventors,
      createdAt: patent.createdAt,
      updatedAt: patent.updatedAt,
      // 번역 상태 정보 (완료된 것만)
      translationStatus: Array.isArray(completedTranslations) && completedTranslations.length > 0 ? 'COMPLETED' : 'NOT_STARTED',
      latestTranslation: Array.isArray(completedTranslations) && completedTranslations.length > 0 ? {
        id: (completedTranslations[0] as any).id,
        status: (completedTranslations[0] as any).status,
        createdAt: (completedTranslations[0] as any).createdAt,
        updatedAt: (completedTranslations[0] as any).updatedAt,
      } : null
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error("특허 기본 정보 조회 오류:", error)
    return NextResponse.json(
      { error: "특허 기본 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
} 