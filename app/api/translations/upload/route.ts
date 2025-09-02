import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST: 번역 파일 업로드
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patentId, section, comment, files, isCompletion, translatedTitleUS } = body

    if (!patentId) {
      return NextResponse.json({ success: false, error: "Patent ID is required" }, { status: 400 })
    }

    // 특허 존재 확인
    const patent = await prisma.patent.findUnique({
      where: { id: patentId }
    })

    if (!patent) {
      return NextResponse.json({ success: false, error: "Patent not found" }, { status: 404 })
    }

    // 번역 레코드 확인 또는 생성
    let translation = await prisma.translation.findFirst({
      where: { patentId }
    })

    if (!translation) {
      translation = await prisma.translation.create({
        data: {
          patentId,
          originalText: patent.title,
          translatedText: null,
          status: 'IN_PROGRESS',
        }
      })
    }

    // 파일 업로드 처리 (실제 구현은 Document 테이블과 연동 필요)
    // 현재는 Mock 응답 반환
    const uploadedGroup = {
      id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patentId,
      section,
      comment,
      files: files || [],
      isCompletion: isCompletion || false,
      translatedTitleUS,
      uploadedAt: new Date().toISOString(),
    }

    // 번역 완료인 경우 번역 상태 업데이트
    if (isCompletion) {
      await prisma.translation.update({
        where: { id: translation.id },
        data: {
          status: 'COMPLETED',
          translatedText: translatedTitleUS || patent.title,
        }
      })

      // 특허 상태도 업데이트
      await prisma.patent.update({
        where: { id: patentId },
        data: {
          status: 'DOCUMENT_PREP'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: uploadedGroup,
    })
  } catch (error) {
    console.error("Translation upload error:", error)
    return NextResponse.json({ success: false, error: "Failed to upload translation files" }, { status: 500 })
  }
} 