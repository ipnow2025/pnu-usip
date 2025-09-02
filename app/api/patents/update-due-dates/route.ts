import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 마감일 계산 함수
function calculateDueDate(filingDate: Date, pctFiled: boolean): Date {
  const dueDate = new Date(filingDate)
  
  if (pctFiled) {
    // PCT 출원: 30개월 후
    dueDate.setMonth(dueDate.getMonth() + 30)
  } else {
    // KR 특허: 12개월 후
    dueDate.setMonth(dueDate.getMonth() + 12)
  }
  
  return dueDate
}

// POST: 기존 특허 데이터의 마감일 업데이트
export async function POST(request: NextRequest) {
  try {
    // 마감일이 없거나 null인 특허들을 찾기
    const patentsWithoutDueDate = await prisma.patent.findMany({
      where: {
        OR: [
          { dueDate: null },
          { dueDate: undefined }
        ],
        filingDate: {
          not: null
        }
      }
    })

    if (patentsWithoutDueDate.length === 0) {
      return NextResponse.json({
        success: true,
        message: "업데이트할 특허가 없습니다.",
        updatedCount: 0
      })
    }

    // 각 특허의 마감일 업데이트
    const updatePromises = patentsWithoutDueDate.map(async (patent) => {
      const dueDate = calculateDueDate(patent.filingDate!, patent.pctFiled)
      
      return prisma.patent.update({
        where: { id: patent.id },
        data: { dueDate }
      })
    })

    const updatedPatents = await Promise.all(updatePromises)

    return NextResponse.json({
      success: true,
      message: `${updatedPatents.length}건의 특허 마감일이 업데이트되었습니다.`,
      updatedCount: updatedPatents.length,
      updatedPatents: updatedPatents.map(patent => ({
        id: patent.id,
        title: patent.title,
        filingDate: patent.filingDate,
        pctFiled: patent.pctFiled,
        dueDate: patent.dueDate
      }))
    })

  } catch (error) {
    console.error('마감일 업데이트 오류:', error)
    return NextResponse.json(
      { success: false, error: '마감일 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// GET: 마감일 업데이트가 필요한 특허 목록 조회
export async function GET() {
  try {
    const patentsWithoutDueDate = await prisma.patent.findMany({
      where: {
        OR: [
          { dueDate: null },
          { dueDate: undefined }
        ],
        filingDate: {
          not: null
        }
      },
      select: {
        id: true,
        title: true,
        filingDate: true,
        pctFiled: true,
        dueDate: true
      }
    })

    // 계산된 마감일도 함께 반환
    const patentsWithCalculatedDueDate = patentsWithoutDueDate.map(patent => {
      const calculatedDueDate = calculateDueDate(patent.filingDate!, patent.pctFiled)
      return {
        ...patent,
        calculatedDueDate
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        patents: patentsWithCalculatedDueDate,
        count: patentsWithCalculatedDueDate.length
      }
    })

  } catch (error) {
    console.error('마감일 업데이트 대상 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '마감일 업데이트 대상 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 