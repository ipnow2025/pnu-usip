import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as any
    const translatorId = searchParams.get("translatorId")
    const reviewerId = searchParams.get("reviewerId")
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const skip = (page - 1) * limit

    // 실제 데이터베이스에서 번역 데이터 조회
    const whereClause: any = {}
    
    if (status) {
      whereClause.status = status
    }
    if (translatorId) {
      whereClause.translatorId = parseInt(translatorId)
    }
    if (reviewerId) {
      whereClause.reviewerId = parseInt(reviewerId)
    }

    // 번역이 있는 특허들 조회
    const translations = await prisma.translation.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 번역이 없는 특허들 조회 (번역 대기 상태)
    const allPatents = await prisma.patent.findMany({
      where: {
        status: {
          in: ['NO_PROGRESS', 'TRANSLATING', 'TRANSLATION_REVIEW']
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    // 번역이 있는 특허 ID들
    const translatedPatentIds = new Set(translations.map(t => t.patentId))
    
    // 번역이 없는 특허들에 대해 기본 번역 레코드 생성
    const untranslatedPatents = allPatents.filter(p => !translatedPatentIds.has(p.id))
    
    const defaultTranslations = untranslatedPatents.map(patent => ({
      id: `default_${patent.id}`,
      patentId: patent.id,
      originalText: patent.title,
      translatedText: null,
      status: 'NOT_STARTED' as const,
      translatorId: null,
      reviewerId: null,
      createdAt: patent.createdAt,
      updatedAt: patent.updatedAt,
      patent: {
        id: patent.id,
        title: patent.title,
        managementNumber: (patent as any).managementNumber,
        applicationNumber: patent.applicationNumber,
        status: patent.status,
        createdAt: patent.createdAt,
        updatedAt: patent.updatedAt,
      }
    }))

    // 번역 데이터에 특허 정보 추가
    const translationsWithPatents = await Promise.all(
      translations.map(async (translation) => {
        const patent = await prisma.patent.findUnique({
          where: { id: translation.patentId }
        })
        
        return {
          ...translation,
          patent: patent ? {
            id: patent.id,
            title: patent.title,
            managementNumber: (patent as any).managementNumber,
            applicationNumber: patent.applicationNumber,
            status: patent.status,
            createdAt: patent.createdAt,
            updatedAt: patent.updatedAt,
          } : null
        }
      })
    )

    // 모든 번역 데이터를 합치고 정렬
    const allTranslations = [...translationsWithPatents, ...defaultTranslations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // 페이징 적용
    const total = allTranslations.length
    const paginatedTranslations = allTranslations.slice(skip, skip + limit)

    return NextResponse.json({
      success: true,
      data: paginatedTranslations,
      total: total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Translations GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch translations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.patentId) {
      return NextResponse.json({ success: false, error: "Patent ID is required" }, { status: 400 })
    }

    // 특허 존재 확인
    const patent = await prisma.patent.findUnique({
      where: { id: body.patentId }
    })

    if (!patent) {
      return NextResponse.json({ success: false, error: "Patent not found" }, { status: 404 })
    }

    // 기존 번역 확인
    const existingTranslation = await prisma.translation.findFirst({
      where: { patentId: body.patentId }
    })

    if (existingTranslation) {
      return NextResponse.json({ success: false, error: "Translation already exists for this patent" }, { status: 400 })
    }

    // 새 번역 생성
    const translation = await prisma.translation.create({
      data: {
        patentId: body.patentId,
        originalText: patent.title,
        translatedText: null,
        translatorId: body.translatorId ? parseInt(body.translatorId) : null,
        reviewerId: body.reviewerId ? parseInt(body.reviewerId) : null,
      }
    })

    // 특허 정보 포함하여 반환
    const translationWithPatent = {
      ...translation,
      patent: {
        id: patent.id,
        title: patent.title,
        managementNumber: (patent as any).managementNumber,
        applicationNumber: patent.applicationNumber,
        status: patent.status,
        createdAt: patent.createdAt,
        updatedAt: patent.updatedAt,
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: translationWithPatent,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Translations POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to create translation" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, translatedText, translatorId, reviewerId } = body

    if (!id) {
      return NextResponse.json({ success: false, error: "Translation ID is required" }, { status: 400 })
    }

    // 번역 레코드 존재 확인
    const existingTranslation = await prisma.translation.findUnique({
      where: { id }
    })

    if (!existingTranslation) {
      return NextResponse.json({ success: false, error: "Translation not found" }, { status: 404 })
    }

    // 번역 업데이트
    const updatedTranslation = await prisma.translation.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(translatedText && { translatedText }),
        ...(translatorId && { translatorId: parseInt(translatorId) }),
        ...(reviewerId && { reviewerId: parseInt(reviewerId) }),
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
        managementNumber: (patent as any).managementNumber,
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
    console.error("Translation PUT error:", error)
    return NextResponse.json({ success: false, error: "Failed to update translation" }, { status: 500 })
  }
}
