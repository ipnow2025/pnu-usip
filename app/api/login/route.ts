import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { id, password } = await req.json();
    
    if (!id || !password) {
      return NextResponse.json({ error: '아이디와 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    // 사용자 조회 (memberId로 검색)
    const user = await prisma.user.findFirst({
      where: { memberId: id }
    });

    if (!user) {
      return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    // 비밀번호 검증 (타입 단언 사용)
    const userPassword = (user as any).password;
    if (!userPassword) {
      return NextResponse.json({ error: '사용자 정보가 올바르지 않습니다.' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, userPassword);
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    // 사용자 상태 확인
    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: '비활성화된 계정입니다.' }, { status: 401 });
    }

    // 로그인 성공 시 사용자 정보 반환
    const member = {
      memberId: user.memberId,
      memberIdx: user.memberIdx,
      memberName: user.name,
      memberNameEn: user.nameEn,
      email: user.email,
      role: user.role,
      organization: user.organization,
      department: user.department,
      phone: user.phone,
      mobile: user.mobile,
      status: user.status,
      addressKr: user.addressKr,
      addressEn: user.addressEn,
      userId: user.id
    };

    return NextResponse.json({ ok: true, result: member }, { status: 200 });
  } catch (e) {
    console.error('로그인 오류:', e);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
