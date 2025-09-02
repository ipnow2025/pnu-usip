import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// 사용자 업데이트 스키마
const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  nameEn: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().optional().or(z.literal("")),
  role: z.enum(['PATENT_MANAGER', 'INVENTOR', 'US_ATTORNEY', 'EXTERNAL_REVIEWER']).optional(),
  organization: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  addressKr: z.string().optional(),
  addressEn: z.string().optional(),
})

// GET: 특정 사용자 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id)
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 사용자 ID입니다.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id.toString(),
        memberId: user.memberId,
        memberIdx: user.memberIdx,
        name: user.name,
        nameEn: user.nameEn,
        email: user.email,
        role: mapRoleToDisplay(user.role),
        organization: user.organization,
        department: user.department,
        phone: user.phone,
        mobile: user.mobile,
        status: user.status === 'ACTIVE' ? '활성' : '비활성',
        addressKr: user.addressKr,
        addressEn: user.addressEn,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }
    })
  } catch (error) {
    console.error('사용자 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT: 사용자 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id)
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 사용자 ID입니다.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    const validatedData = updateUserSchema.parse(body)

    // 빈 문자열을 null로 변환
    const cleanedData = {
      ...validatedData,
      email: validatedData.email === "" ? null : validatedData.email,
      nameEn: validatedData.nameEn === "" ? null : validatedData.nameEn,
      organization: validatedData.organization === "" ? null : validatedData.organization,
      department: validatedData.department === "" ? null : validatedData.department,
      phone: validatedData.phone === "" ? null : validatedData.phone,
      mobile: validatedData.mobile === "" ? null : validatedData.mobile,
      addressKr: validatedData.addressKr === "" ? null : validatedData.addressKr,
      addressEn: validatedData.addressEn === "" ? null : validatedData.addressEn,
    }

    // 비밀번호 해싱 (비밀번호가 제공된 경우)
    let updateData: any = { ...cleanedData }
    if (cleanedData.password && cleanedData.password.trim().length >= 6) {
      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(cleanedData.password, saltRounds)
      updateData.password = hashedPassword
    } else if (cleanedData.password === "") {
      // 빈 문자열인 경우 비밀번호 필드를 업데이트에서 제외 (기존 비밀번호 유지)
      delete updateData.password
    } else if (cleanedData.password !== undefined && cleanedData.password.trim().length < 6) {
      // 비밀번호가 제공되었지만 유효하지 않은 경우
      return NextResponse.json(
        { success: false, error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      )
    } else {
      // 비밀번호가 제공되지 않으면 업데이트에서 제외
      delete updateData.password
    }

    // undefined 값들을 제거하여 Prisma가 해당 필드를 업데이트하지 않도록 함
    const finalUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    const user = await prisma.user.update({
      where: { id: userId },
      data: finalUpdateData
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id.toString(),
        memberId: user.memberId,
        memberIdx: user.memberIdx,
        name: user.name,
        nameEn: user.nameEn,
        email: user.email,
        role: mapRoleToDisplay(user.role),
        organization: user.organization,
        department: user.department,
        phone: user.phone,
        mobile: user.mobile,
        status: user.status === 'ACTIVE' ? '활성' : '비활성',
        addressKr: user.addressKr,
        addressEn: user.addressEn,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors)
      return NextResponse.json(
        { 
          success: false,
          error: '입력 데이터가 올바르지 않습니다.', 
          details: error.errors 
        },
        { status: 400 }
      )
    }

    console.error('사용자 수정 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: 사용자 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id)
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 사용자 ID입니다.' },
        { status: 400 }
      )
    }

    // 사용자 존재 확인
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 사용자 삭제
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      success: true,
      message: '사용자가 성공적으로 삭제되었습니다.'
    })
  } catch (error) {
    console.error('사용자 삭제 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 역할 매핑 함수
function mapRoleToDisplay(role: string): string {
  const roleMap: { [key: string]: string } = {
    'PATENT_MANAGER': '관리자',
    'INVENTOR': '발명자',
    'US_ATTORNEY': '변호사',
    'EXTERNAL_REVIEWER': '외부 검토자'
  }
  return roleMap[role] || role
} 