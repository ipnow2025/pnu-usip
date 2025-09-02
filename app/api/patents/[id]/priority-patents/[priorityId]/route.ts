import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

// 우선권 특허 수정 스키마
const updatePriorityPatentSchema = z.object({
  title: z.string().min(1, "우선권 특허 제목은 필수입니다").optional(),
  applicationNumber: z.string().optional(),
  filingDate: z.string().optional().transform(val => val ? new Date(val) : null),
  inventors: z.array(z.string()).optional(),
})

// GET: 특정 우선권 특허 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string, priorityId: string }> }) {
  try {
    const { priorityId } = await params
    const priorityPatent = await (prisma as any).priorityPatent.findUnique({
      where: { id: priorityId }
    })

    if (!priorityPatent) {
      return NextResponse.json({ success: false, error: "Priority patent not found" }, { status: 404 })
    }

    // 발명자 정보 파싱
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
    })
  } catch (error) {
    console.error("Priority patent GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch priority patent" }, { status: 500 })
  }
}

// PUT: 우선권 특허 수정
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string, priorityId: string }> }) {
  try {
    const { priorityId } = await params
    const body = await request.json()
    const validatedData = updatePriorityPatentSchema.parse(body)

    // 발명자 정보를 JSON으로 저장
    const updateData: any = { ...validatedData }
    if (validatedData.inventors) {
      updateData.inventors = JSON.stringify(validatedData.inventors)
    }

    const updatedPriorityPatent = await (prisma as any).priorityPatent.update({
      where: { id: priorityId },
      data: updateData
    })

    // 발명자 정보 파싱하여 반환
    let inventors = []
    if (updatedPriorityPatent.inventors) {
      try {
        const parsedInventors = JSON.parse(updatedPriorityPatent.inventors)
        inventors = Array.isArray(parsedInventors) ? parsedInventors : []
      } catch (e) {
        inventors = []
      }
    }

    const priorityPatentWithInventors = {
      ...updatedPriorityPatent,
      inventors: inventors
    }

    return NextResponse.json({
      success: true,
      data: priorityPatentWithInventors,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: '입력 데이터가 올바르지 않습니다.', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Priority patent PUT error:", error)
    return NextResponse.json({ success: false, error: "Failed to update priority patent" }, { status: 500 })
  }
}

// DELETE: 우선권 특허 삭제
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string, priorityId: string }> }) {
  try {
    const { priorityId } = await params
    const deletedPriorityPatent = await (prisma as any).priorityPatent.delete({
      where: { id: priorityId }
    })

    return NextResponse.json({
      success: true,
      message: "Priority patent deleted successfully",
      data: deletedPriorityPatent
    })
  } catch (error) {
    console.error("Priority patent DELETE error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete priority patent" }, { status: 500 })
  }
} 