import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { z } from "zod"

// 특허 업데이트 스키마
const updatePatentSchema = z.object({
  managementNumber: z.string().min(1, "관리번호는 필수입니다").optional(),
  title: z.string().min(1, "특허명은 필수입니다").optional(),
  titleEn: z.string().optional(),
  applicationNumber: z.string().optional(),
  usApplicationNumber: z.string().optional(),
  usRegistrationNumber: z.string().optional(),
  pctApplicationNumber: z.string().optional(),
  filingDate: z.string().optional().transform(val => val ? new Date(val) : null),
  pctFiled: z.boolean().optional(),
  pctFilingDate: z.string().optional().transform(val => val ? new Date(val) : null),
  usptoEligible: z.boolean().optional(),
  dueDate: z.string().optional().transform(val => val ? new Date(val) : null),
  status: z.enum(['NO_PROGRESS', 'TRANSLATING', 'TRANSLATION_REVIEW', 'DOCUMENT_PREP', 'ATTORNEY_REVIEW', 'USPTO_FILING', 'OA_RESPONSE', 'USPTO_REGISTERED']).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  notes: z.string().optional(),
  inventorId: z.number().int().positive().optional(),
  managerId: z.number().int().positive().optional(),
  inventors: z.array(z.string()).optional(),
  priorityPatents: z.array(z.object({
    title: z.string().optional(),
    applicationNumber: z.string().optional(),
    filingDate: z.string().optional().transform(val => val ? new Date(val) : null),
    inventors: z.array(z.string()).optional(),
  })).optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const patent = await prisma.patent.findUnique({
      where: { id }
    })

    if (!patent) {
      return NextResponse.json({ success: false, error: "Patent not found" }, { status: 404 })
    }

    // 발명자 정보 가져오기
    const inventor = await prisma.user.findFirst({
      where: { id: patent.inventorId }
    })

    // inventors 컬럼에서 JSON 파싱
    let inventors = []
    if ((patent as any).inventors) {
      try {
        const parsedInventors = JSON.parse((patent as any).inventors)
        inventors = Array.isArray(parsedInventors) ? parsedInventors : []
      } catch (e) {
        inventors = []
      }
    }

    // 우선권 특허 정보 가져오기
    const priorityPatents = await (prisma as any).priorityPatent.findMany({
      where: { patentId: id },
      orderBy: { createdAt: 'asc' }
    })

    const priorityPatentsWithInventors = priorityPatents.map((pp: any) => {
      let ppInventors = []
      if (pp.inventors) {
        try {
          const parsedInventors = JSON.parse(pp.inventors)
          ppInventors = Array.isArray(parsedInventors) ? parsedInventors : []
        } catch (e) {
          ppInventors = []
        }
      }

      return {
        title: pp.title,
        applicationNumber: pp.applicationNumber,
        filingDate: pp.filingDate,
        inventors: ppInventors
      }
    })

    const patentWithInventors = {
      ...patent,
      pctFiled: Boolean(patent.pctFiled),
      usptoEligible: Boolean(patent.usptoEligible),
      inventors: inventors.map((name: string, index: number) => ({
        id: index.toString(),
        name: name,
        email: '',
        role: 'INVENTOR',
        department: ''
      })),
      priorityPatents: priorityPatentsWithInventors
    }

    return NextResponse.json({
      success: true,
      data: patentWithInventors,
    })
  } catch (error) {
    console.error("Patent GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch patent" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = updatePatentSchema.parse(body)

    // 관리번호 중복 확인 (자신 제외)
    if (validatedData.managementNumber) {
      const existingPatent = await prisma.patent.findFirst({
        where: {
          id: { not: id },
          ...(validatedData.managementNumber && { managementNumber: validatedData.managementNumber })
        } as any
      })
      
      if (existingPatent) {
        return NextResponse.json(
          { success: false, error: '이미 존재하는 관리번호입니다.' },
          { status: 400 }
        )
      }
    }

    // 마감일 자동 계산 (출원일이나 PCT 여부가 변경된 경우)
    if (validatedData.filingDate || validatedData.pctFiled !== undefined) {
      const currentPatent = await prisma.patent.findUnique({
        where: { id }
      })
      
      if (currentPatent) {
        const filingDate = validatedData.filingDate || currentPatent.filingDate
        const pctFiled = validatedData.pctFiled !== undefined ? validatedData.pctFiled : currentPatent.pctFiled
        
        if (filingDate) {
          validatedData.dueDate = calculateDueDate(filingDate, pctFiled)
        }
      }
    }

    // 발명자 정보를 JSON으로 저장
    const updateData: any = { ...validatedData }
    if (validatedData.inventors) {
      updateData.inventors = JSON.stringify(validatedData.inventors)
    }

    // priorityPatents를 제거하고 메인 특허 데이터만 추출
    const { priorityPatents: updatePriorityPatents, ...mainUpdateData } = updateData

    const updatedPatent = await prisma.patent.update({
      where: { id },
      data: mainUpdateData as any
    })

    // 우선권 특허 업데이트 (기존 삭제 후 새로 생성)
    if (updatePriorityPatents !== undefined) {
      // 기존 우선권 특허 삭제
      await (prisma as any).priorityPatent.deleteMany({
        where: { patentId: id }
      })

      // 새로운 우선권 특허 생성
      if (updatePriorityPatents.length > 0) {
        for (const priorityPatent of updatePriorityPatents) {
          if ((priorityPatent.title && priorityPatent.title.trim()) || 
              (priorityPatent.applicationNumber && priorityPatent.applicationNumber.trim())) {
            await (prisma as any).priorityPatent.create({
              data: {
                patentId: id,
                title: priorityPatent.title || "",
                applicationNumber: priorityPatent.applicationNumber || "",
                filingDate: priorityPatent.filingDate ? new Date(priorityPatent.filingDate) : null,
                inventors: JSON.stringify(priorityPatent.inventors),
              },
            })
          }
        }
      }
    }

    // 발명자 정보 가져오기
    const inventor = await prisma.user.findFirst({
      where: { id: updatedPatent.inventorId }
    })

    // inventors 컬럼에서 JSON 파싱
    let inventors = []
    if ((updatedPatent as any).inventors) {
      try {
        const parsedInventors = JSON.parse((updatedPatent as any).inventors)
        inventors = Array.isArray(parsedInventors) ? parsedInventors : []
      } catch (e) {
        inventors = []
      }
    }

    // 우선권 특허 정보 가져오기
    const priorityPatents = await (prisma as any).priorityPatent.findMany({
      where: { patentId: id },
      orderBy: { createdAt: 'asc' }
    })

    const priorityPatentsWithInventors = priorityPatents.map((pp: any) => {
      let ppInventors = []
      if (pp.inventors) {
        try {
          const parsedInventors = JSON.parse(pp.inventors)
          ppInventors = Array.isArray(parsedInventors) ? parsedInventors : []
        } catch (e) {
          ppInventors = []
        }
      }

      return {
        title: pp.title,
        applicationNumber: pp.applicationNumber,
        filingDate: pp.filingDate,
        inventors: ppInventors
      }
    })

    const patentWithInventors = {
      ...updatedPatent,
      pctFiled: Boolean(updatedPatent.pctFiled),
      usptoEligible: Boolean(updatedPatent.usptoEligible),
      inventors: inventors.map((name: string, index: number) => ({
        id: index.toString(),
        name: name,
        email: '',
        role: 'INVENTOR',
        department: ''
      })),
      priorityPatents: priorityPatentsWithInventors
    }

    return NextResponse.json({
      success: true,
      data: patentWithInventors,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: '입력 데이터가 올바르지 않습니다.', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Patent PUT error:", error)
    return NextResponse.json({ success: false, error: "Failed to update patent" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = updatePatentSchema.parse(body)

    // 특허 존재 확인
    const existingPatent = await prisma.patent.findUnique({
      where: { id }
    })

    if (!existingPatent) {
      return NextResponse.json({ success: false, error: "Patent not found" }, { status: 404 })
    }

    // 부분 업데이트를 위한 데이터 준비
    const updateData: any = {}
    
    // USPTO 출원 정보 업데이트
    if (validatedData.usApplicationNumber !== undefined) {
      updateData.usApplicationNumber = validatedData.usApplicationNumber
    }
    if (validatedData.filingDate !== undefined) {
      updateData.filingDate = validatedData.filingDate
    }
    if (validatedData.usRegistrationNumber !== undefined) {
      updateData.usRegistrationNumber = validatedData.usRegistrationNumber
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status
    }

    // 특허 업데이트
    const updatedPatent = await prisma.patent.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: updatedPatent,
    })
  } catch (error) {
    console.error("Patent PATCH error:", error)
    return NextResponse.json({ success: false, error: "Failed to update patent" }, { status: 500 })
  }
}

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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const deletedPatent = await prisma.patent.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: "Patent deleted successfully",
      data: deletedPatent
    })
  } catch (error) {
    console.error("Patent DELETE error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete patent" }, { status: 500 })
  }
}
