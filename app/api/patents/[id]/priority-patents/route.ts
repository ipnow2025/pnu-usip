import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

// 우선권 특허 생성/수정 스키마
const priorityPatentSchema = z.object({
  title: z.string().min(1, "우선권 특허 제목은 필수입니다"),
  applicationNumber: z.string().optional(),
  filingDate: z.string().optional().transform(val => val ? new Date(val) : null),
  inventors: z.array(z.string()).optional(),
})

// GET: 특허의 우선권 특허 목록 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const priorityPatents = await (prisma as any).priorityPatent.findMany({
      where: { patentId: id },
      orderBy: { createdAt: 'asc' }
    })

    // 발명자 정보 파싱
    const priorityPatentsWithInventors = priorityPatents.map((patent: any) => {
      let inventors = []
      if (patent.inventors) {
        try {
          const parsedInventors = JSON.parse(patent.inventors)
          inventors = Array.isArray(parsedInventors) ? parsedInventors : []
        } catch (e) {
          inventors = []
        }
      }

      return {
        ...patent,
        inventors: inventors
      }
    })

    return NextResponse.json({
      success: true,
      data: priorityPatentsWithInventors,
    })
  } catch (error) {
    console.error("Priority patents GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch priority patents" }, { status: 500 })
  }
}

// POST: 우선권 특허 생성
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = priorityPatentSchema.parse(body)

    // 발명자 정보를 JSON으로 저장
    const priorityPatentData: any = { ...validatedData }
    if (validatedData.inventors) {
      priorityPatentData.inventors = JSON.stringify(validatedData.inventors)
    }

    const priorityPatent = await (prisma as any).priorityPatent.create({
      data: {
        ...priorityPatentData,
        patentId: id
      }
    })

    // 발명자 정보 파싱하여 반환
    let inventors = []
    if (priorityPatent.inventors) {
      try {
        const parsedInventors = JSON.parse(priorityPatent.inventors)
        inventors = Array.isArray(parsedInventors) ? parsedInventors : []
      } catch (e) {
        inventors = []
      }
    }

    const priorityPatentWithInventors = {
      ...priorityPatent,
      inventors: inventors
    }

    return NextResponse.json({
      success: true,
      data: priorityPatentWithInventors,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: '입력 데이터가 올바르지 않습니다.', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Priority patent POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to create priority patent" }, { status: 500 })
  }
} 