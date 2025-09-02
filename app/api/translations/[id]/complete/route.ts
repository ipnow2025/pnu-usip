import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// PUT: 번역 완료 처리
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // 번역 레코드 존재 확인
    const existingTranslation = await prisma.translation.findUnique({
      where: { id }
    })

    if (!existingTranslation) {
      return NextResponse.json({ success: false, error: "Translation not found" }, { status: 404 })
    }

    // 번역 완료 처리
    const updatedTranslation = await prisma.translation.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        translatedText: body.translatedTitleUS || existingTranslation.originalText,
      }
    })

    // 특허 상태도 업데이트 (번역 완료 -> 서류 준비 단계로)
    await prisma.patent.update({
      where: { id: existingTranslation.patentId },
      data: {
        status: 'DOCUMENT_PREP'
      }
    })

    // 특허 정보 포함하여 반환
    const patent = await prisma.patent.findUnique({
      where: { id: updatedTranslation.patentId }
    })

    const translationWithPatent = {
      ...updatedTranslation,
      patent: patent ? {
        id: patent.id,
        title: patent.title,
        applicationNumber: patent.applicationNumber,
        status: patent.status,
        createdAt: patent.createdAt,
        updatedAt: patent.updatedAt,
      } : null
    }

    return NextResponse.json({
      success: true,
      data: translationWithPatent,
    })
  } catch (error) {
    console.error("Translation complete error:", error)
    return NextResponse.json({ success: false, error: "Failed to complete translation" }, { status: 500 })
  }
} 